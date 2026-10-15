//==================================================
// NODE RENDERER
//==================================================

//--------------------------------------------------
// Poster images load async — cache them by URL so
// we only ever request each one once, and fall back
// to the plain star for a node until its poster (if
// any) has actually finished loading.
//--------------------------------------------------
import { currentView } from "./viewManager.js";
import { graph } from "./graph.js";
import { camera } from "./camera.js";
import { swayOffset } from "./sway.js";
import { project, projectNode, nodeHeight, screenDepth, viewAngles } from "./depth.js";

const posterCache = new Map();

// Which size to use for a poster drawn `screenWidth` CSS
// pixels wide. Picks the smallest TMDB size that still
// looks sharp on this screen (w185 / w500 / original).
//
// This used to be called without a zoom, so every poster
// always loaded TMDB's *original* file (~2000x3000, often
// several MB) even when drawn ~35px wide. With the whole
// mind map on screen at once, all 77 of those downloaded
// and decoded the moment you clicked Enter — the hang.
function sizeFor(screenWidth){

    const px = screenWidth * (window.devicePixelRatio || 1);

    if(px <= 185) return "small";

    if(px <= 500) return "medium";

    return "large";

}

function loadEntry(url, size = ""){

    let entry = posterCache.get(url);

    if(!entry){

        const img = new Image();

        img.decoding = "async";

        entry = {

            img,
            size,
            loaded:false,
            failed:false

        };

        // Only counted as loaded once the browser has fully
        // decoded it, off the main thread (img.decode()).
        // Drawing a not-yet-decoded image onto the canvas makes
        // the browser decode it right there, in the middle of a
        // frame — with dozens of posters appearing at once when
        // you enter the archive, that was the stutter.
        img.onload = ()=>{

            if(img.decode){

                img.decode()
                    .then(()=> { entry.loaded = true; entry.loadedAt = performance.now(); })
                    .catch(()=> { entry.loaded = true; entry.loadedAt = performance.now(); });

            } else {

                entry.loaded = true;
                entry.loadedAt = performance.now();

            }

        };

        img.onerror = ()=> entry.failed = true;

        img.src = url;

        posterCache.set(url, entry);

    }

    return entry;

}

// Start fetching (and decoding) the posters the map will
// need for a view, ahead of time — js/intro.js calls this
// during the fly-through, so they're ready the moment you
// enter instead of all arriving at once.
export function warmPosters(nodes, screenWidth){

    nodes.forEach(n => {

        if(!n.poster || n.isBranch) return;

        if(typeof n.poster === "string") loadEntry(n.poster, "small");

        else {

            const size = n.poster[sizeFor(screenWidth)] ? sizeFor(screenWidth) : "small";

            loadEntry(n.poster[size], size);

        }

    });

}

function getPoster(source, screenWidth){

    if(!source) return null;

    if(typeof source === "string") return loadEntry(source, "small");

    const order = ["small", "medium", "large"];

    let want = order.indexOf(sizeFor(screenWidth));

    // While the camera is still zooming (opening the
    // archive, switching views) don't start fetching bigger
    // sizes: the zoom is about to change again, and when the
    // archive opens close in on the logo, that used to send
    // off for the big version of nearly every poster at
    // once — only to zoom out a moment later. Whatever's
    // already loaded is used meanwhile.
    if(want > 0 && Math.abs(camera.targetZoom - camera.zoom) > camera.zoom * 0.04){

        for(let i = order.length - 1; i >= 0; i--){

            const have = posterCache.get(source[order[i]]);

            if(have && have.loaded && !have.failed) return have;

        }

        want = 0;

    }

    const entry = loadEntry(source[order[want]], order[want]);

    if(entry.loaded && !entry.failed) return entry;

    // Sharper version still on its way (e.g. just zoomed
    // in) — keep showing the best size already loaded
    // instead of flashing back to the placeholder card.
    for(let i = want - 1; i >= 0; i--){

        const fallback = posterCache.get(source[order[i]]);

        if(fallback && fallback.loaded && !fallback.failed) return fallback;

    }

    // Nothing loaded yet: make sure at least the small
    // one is on its way, since it arrives fastest.
    if(want > 0) loadEntry(source.small, "small");

    return entry;

}

// A poster's first appearance on the canvas is its most
// expensive draw (the browser has to hand the whole image
// to the graphics side). When the archive opens, dozens of
// posters appear in the same frame, which stalled it for a
// moment. So only a few posters make their first appearance
// per frame; the rest show their plain card for a frame or
// two longer — too quick to notice.
const NEW_POSTERS_PER_FRAME = 6;

let newPosterBudget = NEW_POSTERS_PER_FRAME;

//--------------------------------------------------
// Letting go of poster copies that aren't being shown
//
// Every size of every poster that's ever been drawn used to
// stay in memory for good — its picture plus a rounded copy.
// With six worlds that's hundreds of large images, and the
// memory pressure made scrolling and zooming sluggish. Now,
// every few seconds, the bigger sizes that haven't been
// drawn for a while are dropped (the small one is kept, so
// a poster never falls back to its blank card). They're
// fetched again — from the browser's cache — if needed.
//--------------------------------------------------

const SWEEP_EVERY = 5000;      // ms between clean-ups
const KEEP_UNUSED = 20000;     // a bigger size unused this long is dropped

let frameNow = 0;
let lastSweep = 0;

function sweepPosters(){

    lastSweep = frameNow;

    posterCache.forEach((entry, url) => {

        if(entry.size === "small" || !entry.loaded) return;

        if(frameNow - (entry.lastDrawn || entry.loadedAt || 0) < KEEP_UNUSED) return;

        entry.rounded = null;
        entry.img.src = "";

        posterCache.delete(url);

    });

    // Placeholder cards at sizes not used lately.
    graph.nodes.forEach(n => {

        const cards = n.placeholderCards;

        if(!cards) return;

        Object.keys(cards).forEach(step => {

            if(frameNow - (cards[step].lastUsed || 0) > KEEP_UNUSED) delete cards[step];

        });

    });

}

export function renderNodes(ctx, camera, nodes){

    newPosterBudget = NEW_POSTERS_PER_FRAME;

    frameNow = performance.now();

    if(frameNow - lastSweep > SWEEP_EVERY) sweepPosters();

    ctx.save();

    // Posters are drawn normally (opaque, over the lines);
    // only the hover glow below is added on as light. This
    // used to be "lighter" for the whole layer with every
    // poster switching back to normal and again — two blend
    // changes per poster, 230+ posters, every frame, which
    // stops the browser batching the drawing together.
    ctx.globalCompositeOperation = "source-over";

    const focus = graph.focus;

    const drawNode = (node, at)=>{

        //----------------------------------
        // Screen Position — with depth and the
        // map's tilt (js/depth.js). `depthScale`
        // shrinks posters that sit further back.
        //----------------------------------

        const x = at.x;

        const y = at.y;

        const depthScale = at.s;

        //----------------------------------
        // Cull offscreen nodes
        //----------------------------------

        // Margin grows with the drawn poster, so big posters
        // (zoomed in, or lifted on hover) don't vanish while
        // part of them is still on screen.
        const cullMargin = Math.max(120, 300 * camera.zoom * depthScale);

        if(

            x < -cullMargin || x > window.innerWidth + cullMargin ||
            y < -cullMargin || y > window.innerHeight + cullMargin

        ) return;

        //----------------------------------
        // Hover lift + watch-list focus
        //----------------------------------

        // 0 → 1 as the mouse settles on this poster (eased in
        // graph.js updateGraph), used to scale it up a little.
        const lift = node.lift || 0;

        const scale = (1 + LIFT_SCALE * lift) * depthScale;

        // "What should I watch before…" (js/upcoming.js):
        // titles outside the list fade right back.
        const inFocus = !focus || focus.ids.has(node.id);

        ctx.save();

        if(!inFocus) ctx.globalAlpha = FOCUS_DIM_ALPHA;

        // Hovering a phase on the mind map: the other phases
        // step back (eased in graph.js, see hoverFade).
        ctx.globalAlpha *= hoverDim(node.phase);

        //----------------------------------
        // Gentle Floating
        //----------------------------------

        const floatX =
            Math.sin(node.pulse*0.7)*2;

        const floatY =
            Math.cos(node.pulse*0.5)*2;

        //----------------------------------
        // Pulsing
        //----------------------------------

        const pulse = 1;
        
        const scaledRadius = node.radius * camera.zoom * depthScale;

        //----------------------------------
        // Glow (tinted per-node colour)
        //----------------------------------

        // Only round the poster under the mouse: a glow behind
        // every poster made the whole map look washed in light.
        if(lift > 0.02){

            const glowRadius = 110 * camera.zoom * 1.6 * depthScale;

            ctx.save();

            ctx.globalCompositeOperation = "lighter";

            ctx.globalAlpha *= Math.min(1, lift) * 3;

            // From one pre-drawn image per colour.
            ctx.drawImage(

                glowSprite(node.colour),

                x + floatX - glowRadius,
                y + floatY - glowRadius,

                glowRadius * 2,
                glowRadius * 2

            );

            ctx.restore();

        }

        //----------------------------------
        // Poster thumbnail (once loaded) or
        // the plain star as a fallback.
        //----------------------------------

        const BASE_POSTER_SIZE = 320;

        const onScreenWidth =
            (currentView === "release" || currentView === "chronology" || currentView === "characters" ? 300 :
             currentView === "complete" ? BASE_POSTER_SIZE + Math.min(node.ring || 0, 4) * 35 :
             BASE_POSTER_SIZE) * camera.zoom * depthScale;

        const poster = getPoster(node.poster, onScreenWidth);
        let posterReady = !!(poster && poster.loaded && !poster.failed);

        if(posterReady && !poster.shown){

            if(newPosterBudget > 0){

                newPosterBudget--;

                poster.shown = true;

            } else {

                posterReady = false;

            }

        }

        // Fade in: a poster cross-fades in over its title card
        // when its picture arrives, instead of popping in.
        if(posterReady) node.posterFade = Math.min(1, (node.posterFade || 0) + POSTER_FADE_STEP);
        else node.posterFade = 0;

        const fade = node.posterFade;

        if (posterReady && fade >= 1) {

        let POSTER_SIZE = BASE_POSTER_SIZE;

        // Timeline layouts always use one size
        if (
            currentView === "release" ||
            currentView === "chronology" ||
            currentView === "characters"
        ) {

            POSTER_SIZE = 300;

        }
        // Complete Universe grows by ring
        else if (currentView === "complete") {

            const posterRing = Math.min(node.ring || 0, 4);

            POSTER_SIZE += posterRing * 35;

        }

        const posterWidth = POSTER_SIZE * camera.zoom * scale;
        const posterHeight = posterWidth * 1.5;

    const left = x + floatX - posterWidth / 2;
    const top = y + floatY - posterHeight / 2;

    ctx.save();

    // Posters need to be fully opaque, not additively
    // blended — otherwise connection lines drawn earlier
    // show straight through the poster art instead of
    // being hidden behind it. Restored back to "lighter"
    // for everything else by the ctx.restore() below.
    ctx.globalCompositeOperation = "source-over";


    //------------------------------------
    // Draw poster: a copy with its corners already
    // rounded (made once, see roundedPoster below).
    // Cutting the corners with a clip on every frame, for
    // every poster, was one of the heaviest parts of
    // drawing the map.
    //------------------------------------

    ctx.drawImage(

        roundedPoster(poster),

        left,

        top,

        posterWidth,

        posterHeight

    );

    ctx.restore();

} else {

            //----------------------------------
            // Placeholder card — same footprint
            // as a real poster (see resolveOverlaps
            // in layout.js, which assumes every node
            // is this size), filled with the node's
            // colour and labeled with its title.
            //
            // A poster that TMDB can't find (an
            // obscure one-shot, an unreleased title
            // with no art yet, a flaky lookup) used
            // to fall back to a small unlabeled star
            // — indistinguishable from an empty spot
            // in the graph. This always shows which
            // title belongs there, so nothing reads
            // as a mystery blank node.
            //----------------------------------

           const BASE_POSTER_SIZE = 320;

            let POSTER_SIZE = BASE_POSTER_SIZE;

            if (
                currentView === "release" ||
                currentView === "chronology" ||
                currentView === "characters"
            ) {

                POSTER_SIZE = 300;

            }
            else if (currentView === "complete") {

                const posterRing = Math.min(node.ring || 0, 4);

                POSTER_SIZE += posterRing * 35;

            }

            const posterWidth = POSTER_SIZE * camera.zoom * scale;
            const posterHeight = posterWidth * 1.5;

            const left = x + floatX - posterWidth / 2;
            const top = y + floatY - posterHeight / 2;

            ctx.save();

            ctx.globalCompositeOperation = "source-over";

            // Fading out under a poster that's fading in.
            if(posterReady) ctx.globalAlpha *= 1 - fade;

            // The card is drawn once into a small picture (per
            // title, per size step) and that picture is reused
            // every frame. Building it on the spot — shape,
            // gradient, clip and word-wrapped title, for every
            // card, every frame — was the slowest part of
            // drawing the map once it held 200+ titles.
            ctx.drawImage(placeholderCard(node, posterWidth), left, top, posterWidth, posterHeight);

            ctx.restore();

            // ...and the poster fading in on top of it.
            if(posterReady){

                ctx.save();

                ctx.globalCompositeOperation = "source-over";
                ctx.globalAlpha *= fade;

                ctx.drawImage(roundedPoster(poster), left, top, posterWidth, posterHeight);

                ctx.restore();

            }

        }

        //----------------------------------
        // Watch-list outline around the poster
        // (hovering only enlarges it — no
        // outline).
        //----------------------------------

        const isGoal = focus && focus.targetId === node.id;

        const markFocus = focus && inFocus;

        if(markFocus){

            const w = onScreenWidth * (1 + LIFT_SCALE * lift);
            const h = w * 1.5;

            ctx.save();

            ctx.globalCompositeOperation = "source-over";

            ctx.beginPath();

            // Corner radius scales down with small posters, or a
            // tiny poster's outline turns into an oval.
            roundedRect(ctx, x + floatX - w/2, y + floatY - h/2, w, h, Math.min(12, w * 0.12));

            // The watch list in white; the title it leads up to
            // in Marvel red.
            const c = isGoal ? "230,36,41" : "255,255,255";

            ctx.shadowColor = `rgba(${c},.9)`;
            ctx.shadowBlur = 14;
            ctx.strokeStyle = `rgba(${c},.95)`;
            ctx.lineWidth = isGoal ? 3 : 2;

            ctx.stroke();

            ctx.restore();

        }

        //----------------------------------
        // Selection ring
        //----------------------------------

        if(node.selected){

            ctx.strokeStyle = `rgba(${node.colour},.9)`;

            ctx.lineWidth = 2;

            ctx.beginPath();

            ctx.arc(x, y, scaledRadius*2.2, 0, Math.PI*2);

            ctx.stroke();

        }

        ctx.restore();

    };

    // Back to front: posters further away are drawn first,
    // so nearer ones overlap them (js/depth.js). The hovered
    // poster is drawn last of all so it lifts over its
    // neighbours instead of tucking under them.
    const hovered = graph.hoverPoster !== null ? nodes[graph.hoverPoster] : null;

    const order = [];

    nodes.forEach(node=>{ if(node !== hovered) order.push({ node, at: projectNode(node) }); });

    order.sort((a, b) => b.at.z - a.at.z);

    // Shadows first, all of them, so no shadow ever lands on
    // top of a poster.
    order.forEach(o => drawShadow(ctx, o.node, focus));

    if(hovered) drawShadow(ctx, hovered, focus);

    order.forEach(o => drawNode(o.node, o.at));

    if(hovered) drawNode(hovered, projectNode(hovered));

    ctx.restore();

}

//--------------------------------------------------
// Poster shadows
//
// Each poster floats above the map (js/depth.js) and casts
// a soft shadow straight down onto it, nudged a little down
// and to the right as if lit from the top left. The higher
// a poster is, the further its shadow falls from it and the
// softer and fainter the shadow gets — that gap is what
// makes the height readable. With the map tilted, the
// shadow lies flat on the surface, so it's squashed with
// it.
//--------------------------------------------------

const SHADOW_ALPHA = 0.55;      // darkness right under a low poster
const SHADOW_FALL_X = 0.35;     // how far it falls, per px of height
const SHADOW_FALL_Y = 0.55;
const SHADOW_SPREAD = 0.0025;   // grows this much wider per px of height
const SHADOW_FADE = 0.004;      // ...and this much fainter

function posterBaseSize(node){

    if(currentView === "release" || currentView === "chronology" || currentView === "characters") return 300;

    if(currentView === "complete") return 320 + Math.min(node.ring || 0, 4) * 35;

    return 320;

}

function drawShadow(ctx, node, focus){

    const height = nodeHeight(node);

    if(height <= 1) return;

    // Height in screen px, as the poster itself is lifted.
    const H = Math.abs(screenDepth(-height));

    // Where it lands on the surface (world units).
    const fall = H / camera.zoom;

    const at = project(node.x + fall * SHADOW_FALL_X, node.y + fall * SHADOW_FALL_Y, 0);

    const w = posterBaseSize(node) * camera.zoom * at.s * (1 + H * SHADOW_SPREAD);

    if(w < 2) return;

    // Lying flat on the tilted map: squashed top to bottom.
    const h = w * 1.5 * Math.max(0.25, Math.cos(viewAngles().pitch));

    // The posters are drawn shifted with the mouse a little
    // more than the map is (js/sway.js); the shadow belongs
    // to the map.
    const mapShift = swayOffset("map");
    const posterShift = swayOffset("posters");

    const x = at.x + mapShift.x - posterShift.x;
    const y = at.y + mapShift.y - posterShift.y;

    // Off screen: skip.
    if(x + w < 0 || x - w > window.innerWidth || y + h < 0 || y - h > window.innerHeight) return;

    let alpha = SHADOW_ALPHA / (1 + H * SHADOW_FADE);

    if(focus && !focus.ids.has(node.id)) alpha *= FOCUS_DIM_ALPHA;

    alpha *= hoverDim(node.phase);

    const sprite = shadowSprite();

    // The sprite has soft padding round the card shape.
    const sw = w * sprite.scaleW;
    const sh = h * sprite.scaleH;

    ctx.save();

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = alpha;

    ctx.drawImage(sprite.canvas, x - sw / 2, y - sh / 2, sw, sh);

    ctx.restore();

}

// One soft, dark card-shaped blur, drawn once and stretched
// to fit every shadow.
let shadowCache = null;

function shadowSprite(){

    if(shadowCache) return shadowCache;

    const cw = 100, ch = 150;       // the card
    const pad = 46;                 // room for the blur

    const canvas = document.createElement("canvas");

    canvas.width = cw + pad * 2;
    canvas.height = ch + pad * 2;

    const c = canvas.getContext("2d");

    // Drawn off to one side so only its blurred shadow lands
    // on the canvas (canvas shadows work in every browser;
    // filter: blur() doesn't in Safari).
    const away = 2000;

    c.shadowColor = "rgba(0,0,0,1)";
    c.shadowBlur = 26;
    c.shadowOffsetX = away;

    c.fillStyle = "#000";
    c.beginPath();
    roundedRect(c, pad - away, pad, cw, ch, 8);
    c.fill();

    shadowCache = {
        canvas,
        scaleW: canvas.width / cw,
        scaleH: canvas.height / ch
    };

    return shadowCache;

}

//--------------------------------------------------
// Pre-drawn pieces
//--------------------------------------------------

// The soft coloured glow behind a poster, one image per
// colour.
const glowSprites = new Map();

function glowSprite(colour){

    let g = glowSprites.get(colour);

    if(g) return g;

    const size = 64;

    g = document.createElement("canvas");
    g.width = g.height = size;

    const c = g.getContext("2d");

    const grad = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    grad.addColorStop(0, `rgba(${colour},0.08)`);
    grad.addColorStop(0.45, `rgba(${colour},0.036)`);
    grad.addColorStop(1, "rgba(0,0,0,0)");

    c.fillStyle = grad;
    c.fillRect(0, 0, size, size);

    glowSprites.set(colour, g);

    return g;

}

// A poster picture with its corners rounded, made once per
// picture. (Very large originals are made at a capped
// size: it's still sharper than the screen ever shows it.)
//
// Capped at 700px wide: a 1000px copy took about 6MB of
// memory per poster, and with 230+ titles across the
// worlds that piled up and slowed everything down.
const ROUND_MAX_W = 700;
const ROUND_CORNER = 0.07;     // corner radius, as a share of the width

function roundedPoster(entry){

    entry.lastDrawn = frameNow;

    if(entry.rounded) return entry.rounded;

    const img = entry.img;

    const scale = Math.min(1, ROUND_MAX_W / (img.naturalWidth || 1));

    const w = Math.max(1, Math.round((img.naturalWidth || 185) * scale));
    const h = Math.max(1, Math.round(w * 1.5));

    const canvas = document.createElement("canvas");

    canvas.width = w;
    canvas.height = h;

    const c = canvas.getContext("2d");

    const r = w * ROUND_CORNER;

    c.beginPath();
    roundedRect(c, 0, 0, w, h, r);
    c.clip();

    c.drawImage(img, 0, 0, w, h);

    entry.rounded = canvas;

    return canvas;

}

//--------------------------------------------------
// Hover lift / focus settings
//--------------------------------------------------

const LIFT_SCALE = 0.12;        // hovered poster grows by up to 12%

const POSTER_FADE_STEP = 0.07;  // per frame: a poster fades in over ~1/4 s

const HOVER_DIM = 0.7;          // how far other phases fade while one is hovered

// 1 for everything normally; less for titles outside the
// hovered phase while a phase is hovered on the mind map.
export function hoverDim(phase){

    const f = graph.hoverFade;

    if(!f || f.amount <= 0.001 || f.phase === null || phase === f.phase) return 1;

    return 1 - HOVER_DIM * f.amount;

}

const FOCUS_DIM_ALPHA = 0.14;   // how faint titles outside a watch list get

//--------------------------------------------------
// Placeholder cards (titles with no poster yet), drawn
// once per title per size step and reused. Size steps go
// up in doublings (32, 64 … 512 px wide), so a card is
// never drawn from a picture much smaller or bigger than
// it appears.
//--------------------------------------------------

const PLACEHOLDER_MIN = 32;
const PLACEHOLDER_MAX = 512;

function placeholderCard(node, screenWidth){

    const step = Math.min(PLACEHOLDER_MAX,
        Math.pow(2, Math.ceil(Math.log2(Math.max(PLACEHOLDER_MIN, screenWidth)))));

    const cache = node.placeholderCards || (node.placeholderCards = {});

    // (Redrawn once the Inter font has arrived, if the first
    // copy had to use a fallback font.)
    const fonts = document.fonts ? document.fonts.status : "";

    const key = step + "|" + node.title + "|" + node.colour + "|" + fonts;

    if(cache[step] && cache[step].key === key){

        cache[step].lastUsed = frameNow;

        return cache[step].canvas;

    }

    const w = step, h = Math.round(step * 1.5);

    const canvas = document.createElement("canvas");

    canvas.width = w;
    canvas.height = h;

    const c = canvas.getContext("2d");

    const lw = Math.max(1, 1.5 * w / 320);

    c.beginPath();
    roundedRect(c, lw / 2, lw / 2, w - lw, h - lw, Math.min(12, w * 0.06));

    const fill = c.createLinearGradient(0, 0, 0, h);
    fill.addColorStop(0, `rgba(${node.colour},.35)`);
    fill.addColorStop(1, `rgba(${node.colour},.14)`);

    c.fillStyle = fill;
    c.fill();

    c.lineWidth = lw;
    c.strokeStyle = `rgba(${node.colour},.8)`;
    c.stroke();

    c.clip();

    // Small icon so it still reads at a glance as "no art
    // yet" rather than a finished poster.
    c.beginPath();
    c.arc(w / 2, h * 0.32, w * 0.04, 0, Math.PI * 2);
    c.fillStyle = `rgba(${node.colour},.5)`;
    c.fill();

    // Title, word-wrapped to fit the card width.
    const fontSize = Math.max(w * 0.041, 9);
    const maxTextWidth = w * 0.82;

    c.font = `600 ${fontSize}px Inter, Arial, sans-serif`;
    c.fillStyle = "rgba(255,255,255,.92)";
    c.textAlign = "center";
    c.textBaseline = "middle";

    const lines = [];
    let line = "";

    node.title.split(" ").forEach(word=>{

        const test = line ? line + " " + word : word;

        if(c.measureText(test).width > maxTextWidth && line){

            lines.push(line);
            line = word;

        } else {

            line = test;

        }

    });

    if(line) lines.push(line);

    const lineHeight = fontSize * 1.25;
    const startY = h * 0.62 - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((l, i) => c.fillText(l, w / 2, startY + i * lineHeight));

    cache[step] = { key, canvas, lastUsed: frameNow };

    return canvas;

}

function roundedRect(ctx, x, y, w, h, r){

    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();

}
//--------------------------------------------------
// Where a node's poster is on screen right now (CSS px),
// the same footprint drawNode uses — so the details card
// can flip out of it (js/flip.js).
//--------------------------------------------------

export function nodeScreenRect(node, camera){

    let size = 320;

    if(currentView === "release" || currentView === "chronology" || currentView === "characters"){

        size = 300;

    } else if(currentView === "complete"){

        size += Math.min(node.ring || 0, 4) * 35;

    }

    const at = projectNode(node);

    const w = size * camera.zoom * at.s * (1 + LIFT_SCALE * (node.lift || 0));
    const h = w * 1.5;

    const x = at.x;
    const y = at.y;

    // (Plus the little shift the mouse gives the posters,
    // js/sway.js.)
    const shift = swayOffset("posters");

    return { left: x - w / 2 + shift.x, top: y - h / 2 + shift.y, width: w, height: h };

}
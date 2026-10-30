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
import { isWatched } from "./watched.js";
import { projectNode, project, viewAngles, focalLength } from "./depth.js";
import { posterSizeFor } from "./posterSize.js";
import { markMapDirty } from "./redraw.js";

// Where the mouse is (for the hovered poster's lean).
let mouseX = -1, mouseY = -1;

window.addEventListener("pointermove", e => {

    if(e.pointerType !== "mouse") return;

    mouseX = e.clientX;
    mouseY = e.clientY;

}, { passive: true });

const LEAN = 0.08;              // how far a hovered poster leans towards the mouse
const LEAN_EASE = 0.18;

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
                    .then(()=> { entry.loaded = true; entry.loadedAt = performance.now(); markMapDirty(); })
                    .catch(()=> { entry.loaded = true; entry.loadedAt = performance.now(); markMapDirty(); });

            } else {

                entry.loaded = true;
                entry.loadedAt = performance.now();

                markMapDirty();

            }

        };

        img.onerror = ()=> { entry.failed = true; markMapDirty(); };

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

// Still to finish last frame: a poster fading in, or one
// held back to the next frame (NEW_POSTERS_PER_FRAME). While
// true, the map keeps being redrawn (js/universe.js).
let settling = false;

export function postersSettling(){

    return settling;

}

// The posters' gentle float. Advances only on frames the map
// is actually drawn, so while it sits still (nothing moving,
// js/universe.js) the float pauses, and carries on smoothly
// from the same spot instead of jumping.
let floatClock = 0;

export function renderNodes(ctx, camera, nodes){

    newPosterBudget = NEW_POSTERS_PER_FRAME;

    settling = false;

    floatClock += 0.02;

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

        // Its details card is open: the poster has lifted off
        // the map into the card (js/movieDetails.js).
        const opened = node.openFade || 0;

        if(opened >= 0.99){

            ctx.restore();

            return;

        }

        ctx.globalAlpha *= 1 - opened;

        // Growing out as the map opens (GROWING in
        // viewManager.js): not there until its turn, then
        // fading in as it flies out along its branch.
        if(node.growHidden){

            ctx.restore();

            return;

        }

        if(node.growStart){

            const grown = Math.min(1, (frameNow - node.growStart) / GROW_FADE_MS);

            ctx.globalAlpha *= grown;

            if(grown >= 1) node.growStart = 0;
            else settling = true;

        }

        //----------------------------------
        // Lean: the hovered poster tips a few
        // degrees, the side under the mouse
        // pressing away, like a card picked up.
        //----------------------------------

        const isHovered = graph.hoverPoster !== null && graph.nodes[graph.hoverPoster] === node;

        let leanX = 0, leanY = 0;

        if(isHovered && mouseX >= 0){

            // (The posters are drawn shifted a little with the
            // mouse, js/sway.js.)
            const shift = swayOffset("posters");

            const half = posterBaseSize(node) * camera.zoom * scale / 2;

            leanX = Math.max(-1, Math.min(1, (mouseX - shift.x - x) / Math.max(1, half)));
            leanY = Math.max(-1, Math.min(1, (mouseY - shift.y - y) / Math.max(1, half * 1.5)));

        }

        node.leanX = (node.leanX || 0) + (leanX - (node.leanX || 0)) * LEAN_EASE;
        node.leanY = (node.leanY || 0) + (leanY - (node.leanY || 0)) * LEAN_EASE;

        if(Math.abs(node.leanX) > 0.002 || Math.abs(node.leanY) > 0.002){

            const lx = node.leanX, ly = node.leanY;

            // Narrower across as it turns side to side, shorter
            // as it tips up or down, and slanted the way it turns.
            ctx.translate(x, y);
            ctx.transform(1 - LEAN * 0.9 * Math.abs(lx), -lx * LEAN * 0.6, -ly * LEAN * 0.5, 1 - LEAN * 0.8 * Math.abs(ly), 0, 0);
            ctx.translate(-x, -y);

        }

        //----------------------------------
        // Gentle Floating
        //----------------------------------

        const floatX =
            Math.sin((node.pulse + floatClock)*0.7)*2;

        const floatY =
            Math.cos((node.pulse + floatClock)*0.5)*2;

        //----------------------------------
        // Pulsing
        //----------------------------------

        const pulse = 1;
        
        const scaledRadius = node.radius * camera.zoom * depthScale;

        //----------------------------------
        // Pin to the ground (see "3D touches")
        //----------------------------------

        const ground = project(node.x, node.y, 0);

        const pinTop = y + floatY + (posterSizeFor(node, currentView) * camera.zoom * scale * 1.5) / 2;

        // How far back this poster is: 0 near the middle of the
        // screen, 1 at the far end (feeds the haze below).
        const haze = Math.min(1, Math.max(0,
            (at.z / focalLength() - HAZE_START) / (HAZE_FULL - HAZE_START)
        )) * HAZE_MAX;

        if(ground.y - pinTop > PIN_MIN_PX){

            ctx.save();

            const fadeBy = 1 - haze;

            const line = ctx.createLinearGradient(0, pinTop, 0, ground.y);

            line.addColorStop(0, `rgba(${node.colour},${PIN_ALPHA * fadeBy})`);
            line.addColorStop(1, `rgba(${node.colour},${PIN_ALPHA * 0.45 * fadeBy})`);

            ctx.strokeStyle = line;
            ctx.lineWidth = Math.max(1, 9 * camera.zoom * depthScale);

            ctx.beginPath();
            ctx.moveTo(x + floatX, pinTop);
            ctx.lineTo(ground.x + floatX, ground.y);
            ctx.stroke();

            // The dot: a glow squashed flat, lying on the map.
            const r = Math.max(2, PIN_DOT * camera.zoom * ground.s);
            const flat = Math.max(0.25, Math.cos(viewAngles().pitch));

            ctx.globalCompositeOperation = "lighter";
            ctx.globalAlpha *= PIN_DOT_ALPHA * fadeBy;

            ctx.drawImage(glowSprite(node.colour), ground.x + floatX - r, ground.y - r * flat, r * 2, r * 2 * flat);

            ctx.restore();

        }

        // The card's edge: towards whichever side you're
        // looking from the least (it turns a little with the
        // look-around, js/depth.js).
        const yaw = viewAngles().yaw;

        const drawEdge = (left, top, w, h) => {

            const t = Math.max(1, w * EDGE_DEPTH);

            const dx = t * Math.max(-1, Math.min(1, 0.55 - yaw * 25));

            ctx.save();

            ctx.globalCompositeOperation = "source-over";

            const [cr, cg, cb] = node.colour.split(",").map(Number);

            ctx.fillStyle = `rgb(${Math.round(cr * EDGE_SHADE)},${Math.round(cg * EDGE_SHADE)},${Math.round(cb * EDGE_SHADE)})`;

            ctx.beginPath();

            roundedRect(ctx, left + dx, top + t, w, h, Math.min(12, w * 0.07));

            ctx.fill();

            ctx.restore();

        };

        // A veil of distance over the poster, once drawn.
        const drawHaze = (left, top, w, h) => {

            if(haze < 0.01) return;

            ctx.save();

            ctx.globalCompositeOperation = "source-over";
            ctx.globalAlpha *= haze;
            ctx.fillStyle = `rgb(${HAZE_COLOUR})`;

            ctx.beginPath();

            roundedRect(ctx, left, top, w, h, Math.min(12, w * 0.07));

            ctx.fill();

            ctx.restore();

        };

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

        const onScreenWidth = posterSizeFor(node, currentView) * camera.zoom * depthScale;

        const poster = getPoster(node.poster, onScreenWidth);
        let posterReady = !!(poster && poster.loaded && !poster.failed);

        if(posterReady && !poster.shown){

            if(newPosterBudget > 0){

                newPosterBudget--;

                poster.shown = true;

            } else {

                posterReady = false;

                settling = true;

            }

        }

        // Fade in: a poster cross-fades in over its title card
        // when its picture arrives, instead of popping in.
        if(posterReady) node.posterFade = Math.min(1, (node.posterFade || 0) + POSTER_FADE_STEP);
        else node.posterFade = 0;

        if(posterReady && node.posterFade < 1) settling = true;

        const fade = node.posterFade;

        if (posterReady && fade >= 1) {

        // (Per view — js/posterSize.js.)
        const posterWidth = posterSizeFor(node, currentView) * camera.zoom * scale;
        const posterHeight = posterWidth * 1.5;

    const left = x + floatX - posterWidth / 2;
    const top = y + floatY - posterHeight / 2;

    drawEdge(left, top, posterWidth, posterHeight);

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

    drawHaze(left, top, posterWidth, posterHeight);

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

            // (Per view — js/posterSize.js.)
            const posterWidth = posterSizeFor(node, currentView) * camera.zoom * scale;
            const posterHeight = posterWidth * 1.5;

            const left = x + floatX - posterWidth / 2;
            const top = y + floatY - posterHeight / 2;

            drawEdge(left, top, posterWidth, posterHeight);

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

            drawHaze(left, top, posterWidth, posterHeight);

        }

        //----------------------------------
        // Watched (js/watched.js): a small red
        // tick in the poster's top-right corner.
        //----------------------------------

        if(isWatched(node.id)){

            const w = onScreenWidth * (1 + LIFT_SCALE * lift);

            if(w >= 28) drawWatchedBadge(ctx, x + floatX + w / 2, y + floatY - w * 0.75, w);

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

    order.forEach(o => drawNode(o.node, o.at));

    if(hovered) drawNode(hovered, projectNode(hovered));

    ctx.restore();

}

// The "watched" tick, tucked into the poster's top-right
// corner (cornerX, cornerY) and sized to the poster.
function drawWatchedBadge(ctx, cornerX, cornerY, posterWidth){

    const r = Math.min(15, posterWidth * 0.1);

    const cx = cornerX - r * 1.35;
    const cy = cornerY + r * 1.35;

    ctx.save();

    ctx.globalCompositeOperation = "source-over";

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#E62429";
    ctx.fill();

    ctx.lineWidth = Math.max(1, r * 0.16);
    ctx.strokeStyle = "rgba(0,0,0,.55)";
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx - r * 0.45, cy + r * 0.02);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.38);
    ctx.lineTo(cx + r * 0.48, cy - r * 0.34);
    ctx.lineWidth = Math.max(1.2, r * 0.24);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#fff";
    ctx.stroke();

    ctx.restore();

}

// How wide a poster is in this view (js/posterSize.js).
function posterBaseSize(node){

    return posterSizeFor(node, currentView);

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

//--------------------------------------------------
// 3D touches (all on the same 2D canvas):
//
//   Pins     — a faint line from each poster straight
//              down to the map's surface, ending in a
//              small glowing dot, so you can see how high
//              it floats.
//   Haze     — posters further back are veiled a little in
//              the deep blue of space, the way distance
//              fades things.
//   Edge     — a thin darker side under each poster, so it
//              reads as a card with some thickness, not a
//              flat sticker. It sits on the side away from
//              where you're looking from.
//--------------------------------------------------

const PIN_ALPHA = 0.7;           // the line
const PIN_DOT = 55;              // dot radius, world units (shrinks with zoom)
const PIN_DOT_ALPHA = 1;
const PIN_MIN_PX = 4;            // no pin when the poster's barely off the ground

const HAZE_COLOUR = "8,13,34";   // deep space blue
const HAZE_START = 0.0;          // from about the middle of the screen back…
const HAZE_FULL = 0.45;          // …to this far back (shares of the focal length)
const HAZE_MAX = 0.5;            // at most this much veil

const EDGE_DEPTH = 0.045;        // card thickness, as a share of its width
const EDGE_SHADE = 0.42;         // how dark the edge is (share of its colour)

const POSTER_FADE_STEP = 0.07;  // per frame: a poster fades in over ~1/4 s

const GROW_FADE_MS = 380;       // a poster growing out fades in over this long

const HOVER_DIM = 0;            // other phases no longer fade while one is hovered
                                // (the hovered phase still shows its name)

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

    const size = posterSizeFor(node, currentView);

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
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

function loadEntry(url){

    let entry = posterCache.get(url);

    if(!entry){

        const img = new Image();

        img.decoding = "async";

        entry = {

            img,
            loaded:false,
            failed:false

        };

        img.onload = ()=> entry.loaded = true;
        img.onerror = ()=> entry.failed = true;

        img.src = url;

        posterCache.set(url, entry);

    }

    return entry;

}

function getPoster(source, screenWidth){

    if(!source) return null;

    if(typeof source === "string") return loadEntry(source);

    const order = ["small", "medium", "large"];

    const want = order.indexOf(sizeFor(screenWidth));

    const entry = loadEntry(source[order[want]]);

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
    if(want > 0) loadEntry(source.small);

    return entry;

}

export function renderNodes(ctx, camera, nodes){

    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    const halfW = window.innerWidth/2;
    const halfH = window.innerHeight/2;

    nodes.forEach(node=>{

        //----------------------------------
        // Screen Position (camera-zoom aware,
        // consistent with the universe engine)
        //----------------------------------

        const x = halfW + (node.x - camera.x) * camera.zoom;

        const y = halfH + (node.y - camera.y) * camera.zoom;

        //----------------------------------
        // Cull offscreen nodes
        //----------------------------------

        if(

            x < -120 || x > window.innerWidth + 120 ||
            y < -120 || y > window.innerHeight + 120

        ) return;

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
        
        const scaledRadius = node.radius * camera.zoom;

        //----------------------------------
        // Outer Glow (tinted per-node colour)
        //----------------------------------

        const glowRadius = 110 * camera.zoom;

        const glow = ctx.createRadialGradient(

            x + floatX,
            y + floatY,

            0,

            x + floatX,
            y + floatY,

            glowRadius

        );

        const glowStrength = 0.08;

        glow.addColorStop(
            0,
            `rgba(${node.colour},${glowStrength})`
        );

        glow.addColorStop(
            0.45,
            `rgba(${node.colour},${glowStrength * 0.45})`
        );

        glow.addColorStop(
            1,
            "rgba(0,0,0,0)"
        );

        ctx.fillStyle = glow;

        ctx.beginPath();

        ctx.arc(

            x + floatX,

            y + floatY,

            glowRadius,

            0,

            Math.PI * 2

        );

        ctx.fill();

        //----------------------------------
        // Poster thumbnail (once loaded) or
        // the plain star as a fallback.
        //----------------------------------

        const BASE_POSTER_SIZE = 320;

        const onScreenWidth =
            (currentView === "release" || currentView === "chronology" || currentView === "characters" ? 300 :
             currentView === "complete" ? BASE_POSTER_SIZE + Math.min(node.ring || 0, 4) * 35 :
             BASE_POSTER_SIZE) * camera.zoom;

        const poster = getPoster(node.poster, onScreenWidth);
        const posterReady = !!(poster && poster.loaded && !poster.failed);

        if (posterReady) {

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

        const posterWidth = POSTER_SIZE * camera.zoom ;
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
    // Rounded rectangle
    //------------------------------------

    const radius = 12;

    ctx.beginPath();

    ctx.moveTo(left + radius, top);

    ctx.lineTo(left + posterWidth - radius, top);

    ctx.quadraticCurveTo(
        left + posterWidth,
        top,
        left + posterWidth,
        top + radius
    );

    ctx.lineTo(
        left + posterWidth,
        top + posterHeight - radius
    );

    ctx.quadraticCurveTo(
        left + posterWidth,
        top + posterHeight,
        left + posterWidth - radius,
        top + posterHeight
    );

    ctx.lineTo(
        left + radius,
        top + posterHeight
    );

    ctx.quadraticCurveTo(
        left,
        top + posterHeight,
        left,
        top + posterHeight - radius
    );

    ctx.lineTo(left, top + radius);

    ctx.quadraticCurveTo(
        left,
        top,
        left + radius,
        top
    );

    ctx.closePath();

    ctx.clip();

    //------------------------------------
    // Draw poster
    //------------------------------------

    ctx.drawImage(

        poster.img,

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

            const distance = Math.hypot(node.x, node.y);

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

            const posterWidth = POSTER_SIZE * camera.zoom ;
            const posterHeight = posterWidth * 1.5;

            const left = x + floatX - posterWidth / 2;
            const top = y + floatY - posterHeight / 2;

            ctx.save();

            ctx.globalCompositeOperation = "source-over";

            const radius = 12;

            ctx.beginPath();
            ctx.moveTo(left + radius, top);
            ctx.lineTo(left + posterWidth - radius, top);
            ctx.quadraticCurveTo(left + posterWidth, top, left + posterWidth, top + radius);
            ctx.lineTo(left + posterWidth, top + posterHeight - radius);
            ctx.quadraticCurveTo(left + posterWidth, top + posterHeight, left + posterWidth - radius, top + posterHeight);
            ctx.lineTo(left + radius, top + posterHeight);
            ctx.quadraticCurveTo(left, top + posterHeight, left, top + posterHeight - radius);
            ctx.lineTo(left, top + radius);
            ctx.quadraticCurveTo(left, top, left + radius, top);
            ctx.closePath();

            const fill = ctx.createLinearGradient(left, top, left, top+posterHeight);
            fill.addColorStop(0, `rgba(${node.colour},.35)`);
            fill.addColorStop(1, `rgba(${node.colour},.14)`);

            ctx.fillStyle = fill;
            ctx.fill();

            ctx.lineWidth = Math.max(1.5 * camera.zoom, 1);
            ctx.strokeStyle = `rgba(${node.colour},.8)`;
            ctx.stroke();

            ctx.clip();

            // Small icon so it still reads at a glance as
            // "no art yet" rather than looking like a
            // finished poster.
            const iconSize = 26 * camera.zoom;

            ctx.beginPath();
            ctx.arc(x + floatX, top + posterHeight*0.32, iconSize*0.5, 0, Math.PI*2);
            ctx.fillStyle = `rgba(${node.colour},.5)`;
            ctx.fill();

            // Title, word-wrapped to fit the card width.
            const maxTextWidth = posterWidth * 0.82;
            const fontSize = Math.max(13 * camera.zoom, 9);

            ctx.font = `600 ${fontSize}px Inter`;
            ctx.fillStyle = "rgba(255,255,255,.92)";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            const words = node.title.split(" ");
            const lines = [];
            let line = "";

            words.forEach(word=>{

                const test = line ? line + " " + word : word;

                if(ctx.measureText(test).width > maxTextWidth && line){

                    lines.push(line);
                    line = word;

                } else {

                    line = test;

                }

            });

            if(line) lines.push(line);

            const lineHeight = fontSize * 1.25;
            const textStartY = (top + posterHeight*0.62) - ((lines.length-1)*lineHeight)/2;

            lines.forEach((l,i)=>{

                ctx.fillText(l, x + floatX, textStartY + i*lineHeight);

            });

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

    });

    ctx.restore();

}
//==================================================
// MOUSE SWAY (the whole site)
//
// The landing page's hero already shifts in layers with the
// mouse (js/parallax.js). This carries the same feel
// through the rest of the site: as the mouse moves, things
// at different depths shift by different amounts, so the
// page reads as a scene you're looking into.
//
//   - Archive: the starfield drifts the opposite way to
//     the mouse (near stars more than far ones), the map
//     and its lines follow the mouse a little, and the
//     posters, floating "above" the map, a little more.
//   - The panel, countdown cards and banners follow it
//     slightly (css/tilt.css, via --mx / --my).
//   - Landing fly-through: the 3D trail's viewpoint shifts
//     with the mouse, so near posters slide past far ones.
//
// Mouse only (not touch), and off with the OS "reduce
// motion" setting. Positions are eased so it always glides.
//==================================================

const EASE = 0.06;

// How far each layer moves (CSS px) with the mouse at the
// edge of the screen.
export const SWAY = {
    stars: 22,        // opposite way, times each star's depth
    map: 12,          // lines, logos, phase names
    posters: 18,      // posters float above the map
    ui: 6             // panel, countdown cards (css)
};

const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const root = document.documentElement;

// -0.5 … 0.5 across the screen, eased.
let targetX = 0, targetY = 0;
let x = 0, y = 0;

let lastCssX = 99, lastCssY = 99;   // (forces the first write)

function enabled(){

    return fine.matches && !reduceMotion.matches;

}

window.addEventListener("pointermove", e => {

    if(e.pointerType !== "mouse" || !enabled()) return;

    targetX = e.clientX / window.innerWidth - 0.5;
    targetY = e.clientY / window.innerHeight - 0.5;

}, { passive: true });

// Mouse leaves the window: settle back to the middle.
document.addEventListener("mouseleave", () => { targetX = targetY = 0; });

// Called once a frame from the render loop (app.js).
export function updateSway(){

    if(!enabled()){

        targetX = targetY = 0;

    }

    x += (targetX - x) * EASE;
    y += (targetY - y) * EASE;

    if(Math.abs(x) < 1e-4 && targetX === 0) x = 0;
    if(Math.abs(y) < 1e-4 && targetY === 0) y = 0;

    // The page's own layers (css/tilt.css). Only written
    // when it has visibly moved, to keep style work down.
    if(Math.abs(x - lastCssX) > 0.0008 || Math.abs(y - lastCssY) > 0.0008){

        lastCssX = x;
        lastCssY = y;

        root.style.setProperty("--mx", x.toFixed(4));
        root.style.setProperty("--my", y.toFixed(4));

    }

}

// Where the mouse sway is right now, -0.5 … 0.5 each way.
export function getSway(){

    return { x, y };

}

// How far a layer is shifted right now, in screen px.
export function swayOffset(layer){

    const amount = SWAY[layer] || 0;

    return { x: x * 2 * amount, y: y * 2 * amount };

}
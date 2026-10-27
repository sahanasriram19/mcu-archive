//==================================================
// MOUSE SWAY (the archive)
//
// Inside the archive, as the mouse moves, things at
// different depths shift by different amounts, so the page
// reads as a scene you're looking into. The landing page
// stays still (see landingShowing below).
//
//   - Archive: the starfield drifts the opposite way to
//     the mouse (near stars more than far ones), the map
//     and its lines follow the mouse a little, and the
//     posters, floating "above" the map, a little more.
//   - The panel, countdown cards and banners follow it
//     slightly (LAYERS below).
//
// The mouse on a computer; tilting the phone on a touch
// screen (PHONE TILT below). Off with the OS "reduce
// motion" setting. Positions are eased so it always glides.
//==================================================

const EASE = 0.06;

// How far each layer moves (CSS px) with the mouse at the
// edge of the screen.
// (About half what it used to be: it was a bit strong.)
export const SWAY = {
    stars: 22,        // opposite way, times each star's depth
    map: 6,           // lines, logos, phase names
    posters: 9,       // posters float above the map
    ui: 3             // panel, countdown cards (css)
};

const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// -0.5 … 0.5 across the screen, eased.
let targetX = 0, targetY = 0;
let x = 0, y = 0;

let lastCssX = 99, lastCssY = 99;   // (forces the first write)

const landing = document.getElementById("landing");

// The landing page (hero and fly-through) doesn't move with
// the mouse or the phone's tilt — only the archive does.
function landingShowing(){

    return !!landing && landing.style.display !== "none" && !landing.classList.contains("leaving");

}

function enabled(){

    return (fine.matches || tiltActive) && !reduceMotion.matches && !landingShowing();

}

// The panel, countdown cards, details card and the other
// controls: while the mouse is over one of them, the map
// stays square on instead of leaning towards the edge of
// the screen where they sit.
const UI_SELECTOR =
    "#view-panel, #countdown, #watch-banner, #movie-details-overlay, " +
    ".character-panel, #movie-search-results, #card-flipper";

// After switching view (usually by clicking in the panel, at
// the far left), the map opens square on, and only starts
// following the mouse again once it has moved this far.
const RESUME_AFTER_PX = 40;

let paused = null;      // { x, y } where the mouse was when paused

window.addEventListener("mcu:view-changed", () => {

    targetX = targetY = 0;

    paused = { x: lastMouseX, y: lastMouseY };

});

let lastMouseX = -1, lastMouseY = -1;

window.addEventListener("pointermove", e => {

    if(e.pointerType !== "mouse") return;

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;

    if(!enabled()) return;

    const overUi = e.target instanceof Element && e.target.closest(UI_SELECTOR);

    if(paused && !overUi && Math.hypot(e.clientX - paused.x, e.clientY - paused.y) > RESUME_AFTER_PX) paused = null;

    if(overUi || paused){

        targetX = targetY = 0;

        return;

    }

    targetX = e.clientX / window.innerWidth - 0.5;
    targetY = e.clientY / window.innerHeight - 0.5;

}, { passive: true });

// Mouse leaves the window: settle back to the middle.
document.addEventListener("mouseleave", () => { targetX = targetY = 0; });

//--------------------------------------------------
// PHONE TILT
//
// On a touch screen there's no mouse to follow, so tilting
// the phone does the same job: lean it left/right or
// towards/away from you and everything sways the same way
// the mouse moves it on a computer (and the archive's map
// turns with it, js/depth.js).
//
// It works from how the phone is held *now* compared with
// a few seconds ago (the resting angle slowly catches up),
// so it settles back whether you're sitting up or lying
// down. iPhones ask permission first; that's requested on
// the first tap, since iOS only allows asking then.
//--------------------------------------------------

const TILT_RANGE = 22;        // degrees of tilt for a full swing
const TILT_STRENGTH = 0.8;    // a little less than the mouse at full stretch
const TILT_SETTLE = 0.015;    // how fast the resting angle catches up, per reading

let tiltActive = false;
let restBeta = null, restGamma = null;

const coarse = window.matchMedia("(hover: none) and (pointer: coarse)");

function onOrientation(e){

    if(e.beta === null || e.gamma === null) return;

    tiltActive = true;

    // Which way is "across" depends on how the phone is
    // turned.
    const angle = (screen.orientation && screen.orientation.angle) || window.orientation || 0;

    let across = e.gamma, along = e.beta;

    if(angle === 90){ across = e.beta; along = -e.gamma; }
    else if(angle === -90 || angle === 270){ across = -e.beta; along = e.gamma; }
    else if(angle === 180){ across = -e.gamma; along = -e.beta; }

    if(restBeta === null){ restGamma = across; restBeta = along; }

    restGamma += (across - restGamma) * TILT_SETTLE;
    restBeta += (along - restBeta) * TILT_SETTLE;

    const clamp = v => Math.max(-0.5, Math.min(0.5, v));

    targetX = clamp((across - restGamma) / TILT_RANGE * 0.5) * TILT_STRENGTH;
    targetY = clamp((along - restBeta) / TILT_RANGE * 0.5) * TILT_STRENGTH;

}

function startTilt(){

    window.addEventListener("deviceorientation", onOrientation);

}

if(coarse.matches && "DeviceOrientationEvent" in window){

    if(typeof DeviceOrientationEvent.requestPermission === "function"){

        // iOS: ask on the first tap.
        const ask = () => {

            DeviceOrientationEvent.requestPermission()
                .then(state => { if(state === "granted") startTilt(); })
                .catch(() => {});

        };

        window.addEventListener("touchend", ask, { once: true });

    } else {

        startTilt();

    }

}

// Called once a frame from the render loop (app.js).
export function updateSway(){

    if(!enabled()){

        targetX = targetY = 0;

    }

    const px = x, py = y;

    x += (targetX - x) * EASE;
    y += (targetY - y) * EASE;

    if(Math.abs(x) < 1e-4 && targetX === 0) x = 0;
    if(Math.abs(y) < 1e-4 && targetY === 0) y = 0;

    // Settled within a hair of the mouse: arrive, so the map
    // can count as still (universe.js).
    if(Math.abs(targetX - x) < 2e-4) x = targetX;
    if(Math.abs(targetY - y) < 2e-4) y = targetY;

    swayMoving = x !== px || y !== py;

    // The page's own layers. Only written when they've
    // visibly moved.
    if(Math.abs(x - lastCssX) > 0.0008 || Math.abs(y - lastCssY) > 0.0008){

        lastCssX = x;
        lastCssY = y;

        moveLayers();

    }

}

//--------------------------------------------------
// The page's own layers, each moved by a few pixels.
//
// Set straight onto just these elements. (This used to
// set two variables on the whole page, which made the
// browser re-check the style of every element on the page
// on every frame the mouse moved — the main cause of the
// lag near the end of the trail.)
//
//   [selector, x px, y px, how]
//   `translate` adds to an element's own transform rather
//   than replacing it; "origin" shifts a 3D stage's
//   viewpoint instead.
//--------------------------------------------------

const LAYERS = [
    ["#view-panel", 6, 6, "translate"],
    ["#countdown", 6, 6, "translate"],
    ["#watch-banner", 4, 4, "translate"]
];

const found = new Map();

function layer(selector){

    let el = found.get(selector);

    if(!el || !el.isConnected){

        el = document.querySelector(selector);

        if(el) found.set(selector, el);

    }

    return el;

}

function moveLayers(){

    for(const [selector, ax, ay, how] of LAYERS){

        const el = layer(selector);

        if(!el) continue;

        const dx = (x * ax).toFixed(1);
        const dy = (y * ay).toFixed(1);

        if(how === "origin"){

            el.style.perspectiveOrigin = `calc(50% + ${dx}px) calc(50% + ${dy}px)`;

        } else {

            el.style.translate = (dx === "0.0" && dy === "0.0") ? "" : `${dx}px ${dy}px`;

        }

    }

}

// Whether the sway moved this frame (read by universe.js).
let swayMoving = false;

export function isSwayMoving(){

    return swayMoving;

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
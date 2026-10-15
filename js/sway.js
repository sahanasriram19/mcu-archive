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
//     slightly (LAYERS below).
//   - Landing fly-through: the 3D trail's viewpoint shifts
//     with the mouse, so near posters slide past far ones.
//
// The mouse on a computer; tilting the phone on a touch
// screen (PHONE TILT below). Off with the OS "reduce
// motion" setting. Positions are eased so it always glides.
//==================================================

const EASE = 0.06;

// How far each layer moves (CSS px) with the mouse at the
// edge of the screen.
export const SWAY = {
    stars: 45,        // opposite way, times each star's depth
    map: 12,          // lines, logos, phase names
    posters: 18,      // posters float above the map
    ui: 6             // panel, countdown cards (css)
};

const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// -0.5 … 0.5 across the screen, eased.
let targetX = 0, targetY = 0;
let x = 0, y = 0;

let lastCssX = 99, lastCssY = 99;   // (forces the first write)

function enabled(){

    return (fine.matches || tiltActive) && !reduceMotion.matches;

}

window.addEventListener("pointermove", e => {

    if(e.pointerType !== "mouse" || !enabled()) return;

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

    x += (targetX - x) * EASE;
    y += (targetY - y) * EASE;

    if(Math.abs(x) < 1e-4 && targetX === 0) x = 0;
    if(Math.abs(y) < 1e-4 && targetY === 0) y = 0;

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
//   than replacing it; the trail's stage shifts its 3D
//   viewpoint instead (against the mouse), so far
//   chapters and posters slide one way and the ones
//   rushing past you the other.
//--------------------------------------------------

const LAYERS = [
    ["#view-panel", 12, 12, "translate"],
    ["#countdown", 12, 12, "translate"],
    [".character-panel", 12, 12, "translate"],
    ["#watch-banner", 8, 8, "translate"],
    ["#intro-end", 14, 10, "translate"],
    // (Was -120, -80: with the mouse near the top, the trail's
    // upper posters and their captions slid off the screen.)
    ["#intro-stage", -60, -36, "origin"]
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

// Where the mouse sway is right now, -0.5 … 0.5 each way.
export function getSway(){

    return { x, y };

}

// How far a layer is shifted right now, in screen px.
export function swayOffset(layer){

    const amount = SWAY[layer] || 0;

    return { x: x * 2 * amount, y: y * 2 * amount };

}
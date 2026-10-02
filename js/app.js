import { camera, updateCamera } from "./camera.js";
import { initialiseUniverse, renderUniverse } from "./universe.js";

import {

    graph,

    worldNodes,

    initialiseGraph,

    updateGraph

} from "./graph.js";

import { updateArchive } from "./archive.js";
import { setView, getCurrentView } from "./viewManager.js";

import "./input.js";
import { initialisePanel } from "../ui/panel.js";
import { initCharacterPanel } from "./characters/panel.js";
import { initUpcoming } from "./upcoming.js";
import { initIntro, setIntroActive } from "./intro.js";
import { initTilt } from "./tilt.js";
import { warmPosters } from "./nodes.js";
import { canWarp, playWarp } from "./warp.js";

//==========================================
// LANDING
//==========================================

const landing = document.getElementById("landing");
const viewport = document.getElementById("viewport");
const button = document.getElementById("enterButton");

let entered = false;

// True while the landing page is showing after having
// entered once (via the "MCU Archive" title). The mind map
// isn't drawn then — the landing page is see-through, so
// it would otherwise show behind it.
let onLanding = false;

// Hide archive until Enter
viewport.style.display = "none";

//----------------------------------

const graphReady = initialiseGraph();

//----------------------------------
// Landing stats — worked out from
// data/mcu.json, so they stay right
// as titles are added.
//----------------------------------

const statsEl = document.getElementById("landing-stats");

// Countdown to the next release (top-right card inside
// the archive) needs the titles loaded first.
graphReady.then(initUpcoming);

// Cards lean towards the mouse (js/tilt.js).
initTilt();

// The landing page's 3D scroll fly-through (js/intro.js),
// built from the MCU titles once they've loaded.
graphReady.then(() => initIntro(worldNodes.mcu, () => enter("complete")));

// Also warm the map's posters a few seconds after load, for
// anyone who skips the flight (see warmPosters in nodes.js).
graphReady.then(() => setTimeout(() => warmPosters(worldNodes.mcu, 40), 3000));

graphReady.then(() => {

    if(!statsEl) return;

    const movies = graph.nodes.filter(n => !n.isBranch);

    const count = type => movies.filter(n => n.type === type).length;

    const years = movies
        .map(n => new Date(n.release).getFullYear())
        .filter(y => !isNaN(y));

    // The Defenders shows (data's "phase 0") aren't a
    // numbered phase, so they don't count here.
    const phases = new Set(movies.map(n => n.phase).filter(p => p !== 0)).size;

    const plural = (n, word) => `<b>${n}</b> ${word}${n === 1 ? "" : "s"}`;

    const stats = [
        plural(count("movie"), "film"),
        `<b>${count("show")}</b> series`,
        plural(count("special"), "special"),
        plural(phases, "phase"),
        years.length ? `<b>${Math.min(...years)}–${Math.max(...years)}</b>` : ""
    ].filter(Boolean);

    statsEl.innerHTML = stats
        .map(html => `<span class="landing-stat">${html}</span>`)
        .join("");

    statsEl.classList.add("ready");

});

//----------------------------------
// The branch preview now sits at the
// end of the fly-through, centred on
// the logo there by CSS (.end-logo).
//----------------------------------

// Matches the fade length in css/landing.css (#landing.leaving).
const LANDING_FADE_MS = 500;

async function enter(viewKey){

    if(landing.classList.contains("leaving")) return;   // already on the way in

    // Fade the landing out while the archive appears behind
    // it, instead of cutting straight across.
    landing.classList.add("leaving");

    onLanding = false;

    // The fly-through stops steering the camera.
    setIntroActive(false);

    if(canWarp()){

        // Hyperspace jump (js/warp.js): the landing rushes
        // away under the streaks, and the archive is set up
        // at the moment of the flash, hidden by the light.
        landing.classList.add("warping");

        await playWarp().peak;

        if(landing.classList.contains("leaving")) landing.style.display = "none";

    } else {

        setTimeout(() => {

            if(landing.classList.contains("leaving")) landing.style.display = "none";

        }, LANDING_FADE_MS);

    }

    viewport.style.display = "block";

    if (!entered) {

        entered = true;

        await graphReady;

        // Let the view choose its own camera.
        setView(viewKey);

        initialisePanel();

    } else {

        // Back from the landing page: the fly-through moved
        // the camera, so frame the current view again.
        setView(getCurrentView());

    }

}

button.addEventListener("click", () => enter("complete"));

// Pressing Enter on the landing page does the same as the
// button (the hint under it says so).
window.addEventListener("keydown", e => {

    if(e.key !== "Enter") return;

    if(landing.style.display === "none" || landing.classList.contains("leaving")) return;

    // A focused button already fires click on Enter.
    if(document.activeElement && document.activeElement.tagName === "BUTTON") return;

    e.preventDefault();

    enter("complete");

});

//----------------------------------
// Manual way back to landing (see
// ui/panel.js — the "MCU Archive"
// title is clickable). A custom event
// rather than an export, since panel.js
// is already imported BY this file —
// exporting something back the other
// way would be a circular import.
//----------------------------------

window.addEventListener("mcu:go-to-landing", () => {

    landing.classList.remove("leaving", "warping");

    onLanding = true;

    landing.style.display = "block";

    // Start the fly-through again from the top.
    setIntroActive(true);

    viewport.style.display = "none";

});

//==========================================
// INITIALISE
//==========================================

initialiseUniverse();

initCharacterPanel();

//==========================================
// LOOP
//==========================================

function loop(){

    // Asked for first, so one bad frame (an error while
    // drawing) can't stop the animation for good.
    requestAnimationFrame(loop);

    updateCamera();

    updateGraph();

    updateArchive();

    renderUniverse(camera, entered && !onLanding);

}

loop();
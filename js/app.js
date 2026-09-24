import { camera, updateCamera } from "./camera.js";
import { initialiseUniverse, renderUniverse } from "./universe.js";

import {

    graph,

    initialiseGraph,

    updateGraph

} from "./graph.js";

import { updateArchive } from "./archive.js";
import { setView } from "./viewManager.js";

import "./input.js";
import { initialisePanel } from "../ui/panel.js";
import { initCharacterPanel } from "./characters/panel.js";

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

graphReady.then(() => {

    if(!statsEl) return;

    const movies = graph.nodes.filter(n => !n.isBranch);

    const count = type => movies.filter(n => n.type === type).length;

    const years = movies
        .map(n => new Date(n.release).getFullYear())
        .filter(y => !isNaN(y));

    const phases = new Set(movies.map(n => n.phase)).size;

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
// Landing branch preview: centre it on
// the logo (not the middle of the
// screen), so the branches grow out
// of the logo the way the mind map
// grows out of the hub. Uses layout
// offsets, not getBoundingClientRect,
// so the card's fade-in slide doesn't
// throw it off.
//----------------------------------

const landingCard = document.getElementById("landing-card");
const landingLogo = landingCard ? landingCard.querySelector("img") : null;
const landingBranches = document.getElementById("landing-branches");

function alignLandingBranches(){

    if(!landingCard || !landingLogo || !landingBranches) return;

    if(!landingLogo.offsetHeight) return;   // image not loaded yet

    const y = landingCard.offsetTop + landingLogo.offsetTop + landingLogo.offsetHeight / 2;

    landingBranches.style.top = y + "px";

}

if(landingLogo){

    if(landingLogo.complete) alignLandingBranches();

    landingLogo.addEventListener("load", alignLandingBranches);

}

window.addEventListener("resize", alignLandingBranches);

// Matches the fade length in css/landing.css (#landing.leaving).
const LANDING_FADE_MS = 500;

async function enter(viewKey){

    // Fade the landing out while the archive appears behind
    // it, instead of cutting straight across.
    landing.classList.add("leaving");

    onLanding = false;

    setTimeout(() => {

        if(landing.classList.contains("leaving")) landing.style.display = "none";

    }, LANDING_FADE_MS);

    viewport.style.display = "block";

    if (!entered) {

        entered = true;

        await graphReady;

        // Let the view choose its own camera.
        setView(viewKey);

        initialisePanel();

    }

}

button.addEventListener("click", () => enter("complete"));

// Pressing Enter on the landing page does the same as the
// button (the hint under it says so).
window.addEventListener("keydown", e => {

    if(e.key !== "Enter") return;

    if(landing.style.display === "none" || landing.classList.contains("leaving")) return;

    // A focused button already fires click on Enter.
    if(document.activeElement === button) return;

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

    landing.classList.remove("leaving");

    onLanding = true;

    landing.style.display = "flex";

    alignLandingBranches();

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

    updateCamera();

    updateGraph();

    updateArchive();

    renderUniverse(camera, entered && !onLanding);

    requestAnimationFrame(loop);

}

loop();
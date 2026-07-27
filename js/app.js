import { camera, updateCamera } from "./camera.js";
import { initialiseUniverse, renderUniverse } from "./universe.js";

import {

    graph,

    initialiseGraph,

    updateGraph

} from "./graph.js";

import { updateArchive } from "./archive.js";
import { setView } from "./viewManager.js";
import { VIEWS } from "./views.js";

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

// Hide archive until Enter
viewport.style.display = "none";

//----------------------------------

const graphReady = initialiseGraph();

async function enter(viewKey){

    landing.style.display = "none";

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

//----------------------------------
// Manual way back to landing (see
// ui/panel.js — the "MCU Archive"
// title is clickable). A custom event
// rather than an export, since panel.js
// is already imported BY this file —
// exporting something back the other
// way would be a circular import.
// Doesn't touch localStorage, so a
// reload still resumes wherever you
// were; this is just a way to see the
// landing screen again within the same
// visit.
//----------------------------------

window.addEventListener("mcu:go-to-landing", () => {

    landing.style.display = "flex";

    viewport.style.display = "none";

});

//----------------------------------
// Reload restore — setView() stashes
// whichever view is active into
// localStorage every time it's called
// (see viewManager.js). If that's set,
// skip the landing screen entirely and
// go straight back to it instead of
// making the person click Enter again.
//----------------------------------

let lastView = null;

try{

    lastView = localStorage.getItem("mcuLastView");

} catch(err){

    // Private browsing / storage disabled — falls back to
    // showing the landing screen as normal.

}

if(lastView && VIEWS.some(v => v.key === lastView)){

    enter(lastView);

}

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

    renderUniverse(camera, entered);

    requestAnimationFrame(loop);

}

loop();
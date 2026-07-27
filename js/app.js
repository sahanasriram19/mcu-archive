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

//----------------------------------
// initialiseGraph() is async
//----------------------------------

const graphReady = initialiseGraph();

async function enter(viewKey){

    landing.style.display = "none";

    viewport.style.display = "block";

    if (!entered) {

        entered = true;

        await graphReady;

        setView(viewKey);

        initialisePanel();

    }

}

button.addEventListener("click", () => enter("complete"));

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

// Initialise the character UI ONCE
initCharacterPanel();

//==========================================
// GAME LOOP
//==========================================

function loop() {

    updateCamera();

    updateGraph();

    updateArchive();

    renderUniverse(camera, entered);

    requestAnimationFrame(loop);

}

loop();
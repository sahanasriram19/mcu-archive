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

// Hide the archive until Enter is pressed
viewport.style.display = "none";

//----------------------------------
// initialiseGraph() is async
//----------------------------------

const graphReady = initialiseGraph();

button.addEventListener("click", async () => {

    landing.style.display = "none";

    viewport.style.display = "block";

    if (!entered) {

        entered = true;

        await graphReady;

        setView("complete");

        initialisePanel();

    }

});

//==========================================
// INITIALISE
//==========================================

initialiseUniverse();

// Initialise character UI once
initCharacterPanel();

//==========================================
// GAME LOOP
//==========================================

function loop(){

    updateCamera();

    updateGraph();

    updateArchive();

    renderUniverse(camera, entered);

    requestAnimationFrame(loop);

}

loop();
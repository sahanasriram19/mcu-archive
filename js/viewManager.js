//==================================================
// VIEW MANAGER
//
// Single entry point for switching how the graph
// is arranged. Called by the panel with just a view
// key — it looks up the recipe in views.js and
// applies layout + edges + camera together.
//==================================================

import {

    graph,
    edgesChain,
    edgesByCharacter,
    edgesMindmap,
    edgesPhaseSpokes,
    edgesTimelineTrail,
    setEdges

} from "./graph.js";

import { LAYOUTS } from "./layout.js";
import { VIEWS } from "./views.js";
import { camera } from "./camera.js";
import { archive } from "./archiveCore.js";
export let currentView = "complete";

function buildEdges(recipe){

    if(recipe.mode === "chain") return edgesChain(recipe.field);

    if(recipe.mode === "characters") return edgesByCharacter();

    if(recipe.mode === "mindmap") return edgesMindmap();

    if(recipe.mode === "phaseSpokes") return edgesPhaseSpokes();

    if(recipe.mode === "timelineTrail") return edgesTimelineTrail();

    return [];

}

export function setView(key){

    const view = VIEWS.find(v=> v.key === key);

    if(!view) return;

    archive.view = key;
    currentView = key;

    // Remembered across reloads (see app.js) so refreshing
    // the page lands back on whatever view was open instead
    // of always resetting to the landing screen.
    try{

        localStorage.setItem("mcuLastView", key);

    } catch(err){

        // Private browsing / storage disabled — not fatal,
        // reload just won't restore the view this time.

    }

    //----------------------------------
    // Layout — nodes ease toward these
    // new targets on their own, every
    // frame, via updateGraph(). Layout
    // always runs before edges, since
    // edges (branch spokes, trail chunks)
    // read the branch nodes layout just
    // registered.
    //----------------------------------

    const layoutFn = LAYOUTS[view.layout];

    if(layoutFn) layoutFn(graph.nodes);

    //----------------------------------
    // Connections for this view
    //----------------------------------

    setEdges(buildEdges(view.edges));

    //----------------------------------
    // Camera — smoothly reframes to
    // show the whole new arrangement.
    //----------------------------------

    camera.targetX = view.camera.x;

    camera.targetY = view.camera.y;

    camera.targetZoom = view.camera.zoom;

}

export function getCurrentView(){

    return archive.view;

}
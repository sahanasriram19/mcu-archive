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

//----------------------------------
// Zoom that makes the laid-out graph
// fill the screen, then pushes in by
// camera.fit (1 = whole map just fits,
// >1 = a bit closer, edges run off
// screen). Works from target positions
// so it's correct before nodes arrive.
//----------------------------------

const POSTER_HALF_W = 160;
const POSTER_HALF_H = 240;

function fitZoom(cam){

    let maxX = 0, maxY = 0;

    graph.nodes.forEach(n=>{

        if(Math.abs(n.targetX) > 50000) return;

        maxX = Math.max(maxX, Math.abs(n.targetX - cam.x) + POSTER_HALF_W);
        maxY = Math.max(maxY, Math.abs(n.targetY - cam.y) + POSTER_HALF_H);

    });

    if(!maxX || !maxY) return cam.zoom;

    const zoom = Math.min(

        window.innerWidth / (maxX * 2),
        window.innerHeight / (maxY * 2)

    ) * cam.fit;

    return Math.min(cam.maxZoom || 0.5, Math.max(cam.minZoom || 0.08, zoom));

}

export function setView(key){

    const view = VIEWS.find(v=> v.key === key);

    if(!view) return;

    archive.view = key;
    currentView = key;

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

    camera.targetZoom = view.camera.fit
        ? fitZoom(view.camera)
        : view.camera.zoom;

}

export function getCurrentView(){

    return archive.view;

}
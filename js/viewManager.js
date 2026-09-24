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
// FIT-TO-SCREEN CAMERA
//
// For views with camera.fit (the Complete MCU mind map):
// works out the zoom that makes the laid-out graph fill
// the screen, then scales it by camera.fit (1 = whole
// map just fits, <1 = a margin, >1 = closer). Works from
// target positions, so it's right before nodes arrive.
//
// Then it keeps posters out from under the view panel:
// if any would land beneath it, the map slides just far
// enough to clear it — sideways when the panel sits on
// the left (desktop) or up when it sits along the bottom
// (phones) — zooming out a touch only if sliding alone
// would push posters off the other edge.
//----------------------------------

const POSTER_HALF_W = 160;
const POSTER_HALF_H = 240;

const PANEL_GAP = 16;      // clear air kept between posters and the panel, px

function visibleNodes(){

    return graph.nodes.filter(n => Math.abs(n.targetX) < 50000);

}

function baseFitZoom(cam, nodes){

    let maxX = 0, maxY = 0;

    nodes.forEach(n=>{

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

function panelRect(){

    const panel = document.getElementById("view-panel");

    if(!panel) return null;

    const r = panel.getBoundingClientRect();

    if(!r.width || !r.height) return null;

    return r;

}

// Screen-space poster boxes for a given camera.
function screenBoxes(nodes, cx, cy, zoom){

    const halfW = window.innerWidth/2;
    const halfH = window.innerHeight/2;

    const bw = POSTER_HALF_W * zoom;
    const bh = POSTER_HALF_H * zoom;

    return nodes.map(n=>{

        const x = halfW + (n.targetX - cx) * zoom;
        const y = halfH + (n.targetY - cy) * zoom;

        return { left: x - bw, right: x + bw, top: y - bh, bottom: y + bh };

    });

}

function hitsPanel(b, r){

    return b.right > r.left - PANEL_GAP && b.left < r.right + PANEL_GAP &&
           b.bottom > r.top - PANEL_GAP && b.top < r.bottom + PANEL_GAP;

}

function fitCamera(cam){

    const nodes = visibleNodes();

    const zoom0 = baseFitZoom(cam, nodes);

    const fallback = { x: cam.x, y: cam.y, zoom: zoom0 };

    const r = panelRect();

    if(!r || !nodes.length) return fallback;

    const W = window.innerWidth;
    const H = window.innerHeight;

    // Which way to slide: away from the side of the screen
    // the panel hugs.
    const panelOnLeft = r.left < W * 0.25 && r.right < W * 0.6;
    const panelAtBottom = !panelOnLeft && r.bottom > H * 0.75;

    if(!panelOnLeft && !panelAtBottom) return fallback;

    // Try the fitted zoom first, then ease out 3% at a time.
    for(let step = 0; step < 12; step++){

        const zoom = zoom0 * Math.pow(0.97, step);

        if(zoom < (cam.minZoom || 0.08)) break;

        const boxes = screenBoxes(nodes, cam.x, cam.y, zoom);

        const blocked = boxes.filter(b => hitsPanel(b, r));

        if(!blocked.length) return { x: cam.x, y: cam.y, zoom };

        if(panelOnLeft){

            const shift = Math.max(...blocked.map(b => r.right + PANEL_GAP - b.left));

            const fits = boxes.every(b => b.right + shift <= W);

            if(fits){

                const moved = boxes.map(b => ({ ...b, left: b.left + shift, right: b.right + shift }));

                if(!moved.some(b => hitsPanel(b, r))){

                    return { x: cam.x - shift / zoom, y: cam.y, zoom };

                }

            }

        } else {

            const shift = Math.max(...blocked.map(b => b.bottom - (r.top - PANEL_GAP)));

            const fits = boxes.every(b => b.top - shift >= 0);

            if(fits){

                const moved = boxes.map(b => ({ ...b, top: b.top - shift, bottom: b.bottom - shift }));

                if(!moved.some(b => hitsPanel(b, r))){

                    return { x: cam.x, y: cam.y + shift / zoom, zoom };

                }

            }

        }

    }

    // Couldn't clear it without shrinking posters to
    // nothing (phones: 77 posters won't fit a 390px screen
    // at a readable size). Instead, centre the map in the
    // open space beside/above the panel rather than behind
    // it, so its middle is what you see first.
    if(panelOnLeft){

        const shift = (r.right + PANEL_GAP) / 2;

        return { x: cam.x - shift / zoom0, y: cam.y, zoom: zoom0 };

    }

    const shift = (H - r.top + PANEL_GAP) / 2;

    return { x: cam.x, y: cam.y + shift / zoom0, zoom: zoom0 };

}

export function setView(key){

    const view = VIEWS.find(v=> v.key === key);

    if(!view) return;

    archive.view = key;
    currentView = key;

    // A hover highlight belongs to the view it was made in.
    graph.hover.nodeIndex = null;
    graph.hover.phase = null;

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

    if(view.camera.fit){

        const fit = fitCamera(view.camera);

        camera.targetX = fit.x;
        camera.targetY = fit.y;
        camera.targetZoom = fit.zoom;

        lastFitAspect = window.innerWidth / Math.max(1, window.innerHeight);

    } else {

        camera.targetX = view.camera.x;
        camera.targetY = view.camera.y;
        camera.targetZoom = view.camera.zoom;

    }

}

export function getCurrentView(){

    return archive.view;

}

//----------------------------------
// RE-FIT ON RESIZE / ROTATE
//
// The mind map's shape (wide on a laptop, tall on a
// phone) and zoom are worked out for the screen at the
// time. When the screen's shape changes noticeably —
// rotating a phone, snapping a window to half the
// screen — the current fit view lays itself out again.
// Small resizes are ignored so a slight window drag
// doesn't throw away where you've panned or zoomed to.
//----------------------------------

let lastFitAspect = null;

const REFIT_ASPECT_CHANGE = 0.12;   // 12% change in width/height ratio

let resizeTimer = null;

window.addEventListener("resize", () => {

    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {

        const view = VIEWS.find(v => v.key === currentView);

        if(!view || !view.camera.fit || lastFitAspect === null) return;

        const aspect = window.innerWidth / Math.max(1, window.innerHeight);

        if(Math.abs(aspect - lastFitAspect) / lastFitAspect < REFIT_ASPECT_CHANGE) return;

        setView(currentView);

    }, 200);

});

//----------------------------------
// MIND MAP CAMERA ACTIONS
// (clicking a phase junction / the logo — see input.js)
//----------------------------------

// Zoom in so one phase's whole branch fills the screen,
// keeping it clear of the view panel.
export function focusPhase(phase){

    const members = graph.nodes.filter(n =>
        n.phase === phase && Math.abs(n.targetX) < 50000
    );

    const branch = graph.branchNodes.find(b => b.key === "phase" + phase);

    if(!members.length) return;

    const xs = members.map(n => n.targetX);
    const ys = members.map(n => n.targetY);

    if(branch){ xs.push(branch.targetX); ys.push(branch.targetY); }

    const minX = Math.min(...xs) - POSTER_HALF_W, maxX = Math.max(...xs) + POSTER_HALF_W;
    const minY = Math.min(...ys) - POSTER_HALF_H, maxY = Math.max(...ys) + POSTER_HALF_H;

    // Screen area not covered by the panel.
    let left = 0, right = window.innerWidth;
    let top = 0, bottom = window.innerHeight;

    const r = panelRect();

    if(r){

        if(r.left < window.innerWidth * 0.25 && r.right < window.innerWidth * 0.6) left = r.right + PANEL_GAP;
        else if(r.bottom > window.innerHeight * 0.75) bottom = r.top - PANEL_GAP;

    }

    const zoom = Math.min(

        (right - left) / (maxX - minX),
        (bottom - top) / (maxY - minY)

    ) * 0.9;

    const z = Math.max(camera.minZoom, Math.min(camera.maxZoom, zoom));

    // Put the phase's centre at the centre of the free area.
    const freeCx = (left + right) / 2 - window.innerWidth / 2;
    const freeCy = (top + bottom) / 2 - window.innerHeight / 2;

    camera.targetX = (minX + maxX) / 2 - freeCx / z;
    camera.targetY = (minY + maxY) / 2 - freeCy / z;
    camera.targetZoom = z;

}

// Back to the default "whole map" framing, without
// re-running the layout.
export function refitView(){

    const view = VIEWS.find(v => v.key === currentView);

    if(!view || !view.camera.fit) return;

    const fit = fitCamera(view.camera);

    camera.targetX = fit.x;
    camera.targetY = fit.y;
    camera.targetZoom = fit.zoom;

}
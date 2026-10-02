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
    setEdges,
    useWorld

} from "./graph.js";

import { getWorld } from "./worlds.js";

import { LAYOUTS } from "./layout.js";
import { VIEWS } from "./views.js";
import { camera } from "./camera.js";
import { archive } from "./archiveCore.js";
import { isCompact, isPortraitPhone, layoutModeKey } from "./responsive.js";
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

// The countdown card (js/upcoming.js), once it's showing.
function countdownRect(){

    const el = document.getElementById("countdown");

    if(!el || !el.classList.contains("ready")) return null;

    const r = el.getBoundingClientRect();

    return r.width && r.height ? r : null;

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

    const panelOnLeft = r.left < W * 0.25 && r.right < W * 0.6;
    const panelAtBottom = !panelOnLeft && r.bottom > H * 0.75;

    if(!panelOnLeft && !panelAtBottom) return fallback;

    //----------------------------------
    // Desktop (panel on the left): the map always stays
    // centred on the logo. If a poster would land under
    // the panel, zoom out a little at a time (up to ~25%)
    // until it clears, rather than sliding the map
    // sideways, which made the view lean to the right.
    //----------------------------------

    if(panelOnLeft){

        const cd = countdownRect();

        const obstacles = cd ? [r, cd] : [r];

        // Zoom out 3% at a time (up to ~35%) until nothing is
        // covered. If that's impossible (small laptop screens),
        // use whichever zoom covered the fewest posters.
        let best = fallback, bestHits = Infinity;

        for(let step = 0; step < 15; step++){

            const zoom = zoom0 * Math.pow(0.97, step);

            if(zoom < (cam.minZoom || 0.08)) break;

            const boxes = screenBoxes(nodes, cam.x, cam.y, zoom);

            // Clear of the panel AND the countdown card in the
            // top-right corner.
            const hits = boxes.filter(b => obstacles.some(o => hitsPanel(b, o))).length;

            if(hits === 0) return { x: cam.x, y: cam.y, zoom };

            if(hits < bestHits){ bestHits = hits; best = { x: cam.x, y: cam.y, zoom }; }

        }

        return best;

    }

    //----------------------------------
    // Phones (panel along the bottom): 77 posters can't
    // fit a phone screen at a readable size, so the map
    // is centred in the open space above the panel
    // instead of behind it.
    //----------------------------------

    for(let step = 0; step < 12; step++){

        const zoom = zoom0 * Math.pow(0.97, step);

        if(zoom < (cam.minZoom || 0.08)) break;

        const boxes = screenBoxes(nodes, cam.x, cam.y, zoom);

        const blocked = boxes.filter(b => hitsPanel(b, r));

        if(!blocked.length) return { x: cam.x, y: cam.y, zoom };

        const shift = Math.max(...blocked.map(b => b.bottom - (r.top - PANEL_GAP)));

        if(boxes.every(b => b.top - shift >= 0)){

            const moved = boxes.map(b => ({ ...b, top: b.top - shift, bottom: b.bottom - shift }));

            if(!moved.some(b => hitsPanel(b, r))) return { x: cam.x, y: cam.y + shift / zoom, zoom };

        }

    }

    const shift = (H - r.top + PANEL_GAP) / 2;

    return { x: cam.x, y: cam.y + shift / zoom0, zoom: zoom0 };

}

//----------------------------------
// PHONE CAMERA
//
// Views with a `phone` setting in views.js use this on
// phone-sized screens instead of their fixed desktop
// camera (which, on a phone, left the timelines showing
// one giant poster and Phases showing scraps of rings).
//
//   axis:   "width" / "height" / "both" — which way the
//           content must fit on screen
//   anchor: "top" / "left" / "center" — where it starts:
//           "top"/"left" put the FIRST title at the edge,
//           so a timeline opens at its beginning and you
//           scroll on from there
//   fit:    scale on top of that (<1 leaves a margin)
//
// The screen area under a bottom panel doesn't count.
//----------------------------------

const EDGE_PAD = 16;   // px between content and the screen edge

const LABEL_HALF_H = 140; // world units above a label's centre to keep on screen

function phoneCamera(cfg){

    const nodes = visibleNodes();

    if(!nodes.length) return null;

    const xs = nodes.map(n => n.targetX);
    const ys = nodes.map(n => n.targetY);

    const minX = Math.min(...xs) - POSTER_HALF_W, maxX = Math.max(...xs) + POSTER_HALF_W;

    // Labels count too (e.g. the section label above the
    // first title of an upright phone timeline).
    const labelYs = graph.branchNodes.filter(b => b.label).map(b => b.targetY - LABEL_HALF_H);

    const minY = Math.min(...ys.map(y => y - POSTER_HALF_H), ...labelYs);
    const maxY = Math.max(...ys) + POSTER_HALF_H;

    const W = window.innerWidth;
    const H = window.innerHeight;

    let top = 0, bottom = H, left = 0, right = W;

    const r = panelRect();

    if(r && r.bottom > H * 0.75) bottom = r.top - PANEL_GAP;

    // Start below the countdown pill across the top.
    const countdown = document.getElementById("countdown");

    if(countdown && countdown.classList.contains("ready")){

        const c = countdown.getBoundingClientRect();

        if(c.height && c.bottom < H * 0.3) top = c.bottom;

    }

    const aw = Math.max(1, right - left);
    const ah = Math.max(1, bottom - top);

    const bw = maxX - minX;
    const bh = maxY - minY;

    let zoom =
        cfg.axis === "width"  ? aw / bw :
        cfg.axis === "height" ? ah / bh :
        Math.min(aw / bw, ah / bh);

    zoom *= cfg.fit || 1;

    zoom = Math.max(camera.minZoom, Math.min(cfg.maxZoom || camera.maxZoom, zoom));

    // Centre of the free area, as an offset from the
    // centre of the screen.
    const freeCx = (left + right) / 2 - W / 2;
    const freeCy = (top + bottom) / 2 - H / 2;

    let x = (minX + maxX) / 2 - freeCx / zoom;
    let y = (minY + maxY) / 2 - freeCy / zoom;

    if(cfg.anchor === "top"){

        y = minY - (top + EDGE_PAD - H / 2) / zoom;

    } else if(cfg.anchor === "left"){

        x = minX - (left + EDGE_PAD - W / 2) / zoom;

    }

    return { x, y, zoom };

}

// A view's camera settings for the current world: views.js
// can give a world its own (e.g. X-Men's Eras view fits the
// screen, while MCU Phases keeps its fixed zoom).
function cameraFor(view){

    const own = view.worlds && view.worlds[getWorld()];

    return (own && own.camera) || view.camera;

}

function phoneCameraConfig(view){

    if(!view.phone || !isCompact()) return null;

    return view.phone[isPortraitPhone() ? "portrait" : "landscape"] || null;

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

    lastLayoutMode = layoutModeKey();

    const phoneCfg = phoneCameraConfig(view);

    const phoneCam = phoneCfg ? phoneCamera(phoneCfg) : null;

    if(phoneCam){

        camera.targetX = phoneCam.x;
        camera.targetY = phoneCam.y;
        camera.targetZoom = phoneCam.zoom;

    } else if(cameraFor(view).fit){

        const fit = fitCamera(cameraFor(view));

        camera.targetX = fit.x;
        camera.targetY = fit.y;
        camera.targetZoom = fit.zoom;

        lastFitAspect = window.innerWidth / Math.max(1, window.innerHeight);

    } else {

        camera.targetX = cameraFor(view).x;
        camera.targetY = cameraFor(view).y;
        camera.targetZoom = cameraFor(view).zoom;

    }

    // Lets the panel keep its active button / phone label in
    // step, however the view was changed.
    window.dispatchEvent(new CustomEvent("mcu:view-changed"));

}

// Switch to another world (see js/worlds.js) and show one
// of its views. Titles of a world you haven't visited yet
// fly out from the centre, like the first time you enter.
export function setWorldView(world, key){

    useWorld(world);

    setView(key);

}

export { getWorld };

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

// Phone portrait / phone landscape / desktop, as of the
// last layout. Rotating a phone changes it, and then every
// view (not just the mind map) lays itself out again, since
// the timelines and Phases use different layouts each way up.
let lastLayoutMode = null;

const REFIT_ASPECT_CHANGE = 0.12;   // 12% change in width/height ratio

let resizeTimer = null;

window.addEventListener("resize", () => {

    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {

        const view = VIEWS.find(v => v.key === currentView);

        if(!view) return;

        if(lastLayoutMode !== null && layoutModeKey() !== lastLayoutMode){

            setView(currentView);

            return;

        }

        if(!cameraFor(view).fit || lastFitAspect === null) return;

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

    frameNodes(members, branch ? [branch] : []);

}

// Frame any set of titles (e.g. a "watch before" list —
// see js/upcoming.js) in the current view.
export function focusNodes(nodes){

    frameNodes(nodes.filter(n => Math.abs(n.targetX) < 50000), []);

}

// Zoom and centre so these nodes (plus any extra points,
// like a phase junction) fill the screen, clear of the
// view panel.
function frameNodes(members, extras){

    if(!members.length) return;

    const xs = members.map(n => n.targetX);
    const ys = members.map(n => n.targetY);

    extras.forEach(p => { xs.push(p.targetX); ys.push(p.targetY); });

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

    // Leave room for the countdown card / focus banner
    // along the top.
    top += TOP_UI_RESERVE;

    const zoom = Math.min(

        (right - left) / (maxX - minX),
        (bottom - top) / (maxY - minY)

    ) * 0.9;

    const z = Math.max(camera.minZoom, Math.min(0.6, zoom));

    // Put the group's centre at the centre of the free area.
    const freeCx = (left + right) / 2 - window.innerWidth / 2;
    const freeCy = (top + bottom) / 2 - window.innerHeight / 2;

    camera.targetX = (minX + maxX) / 2 - freeCx / z;
    camera.targetY = (minY + maxY) / 2 - freeCy / z;
    camera.targetZoom = z;

}

const TOP_UI_RESERVE = 60;   // px

// Back to the default "whole map" framing, without
// re-running the layout.
export function refitView(){

    const view = VIEWS.find(v => v.key === currentView);

    if(!view || !cameraFor(view).fit) return;

    const fit = fitCamera(cameraFor(view));

    camera.targetX = fit.x;
    camera.targetY = fit.y;
    camera.targetZoom = fit.zoom;

}
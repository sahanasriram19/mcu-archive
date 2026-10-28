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
import { REST_PITCH } from "./depth.js";
import { PHASES_POSTER } from "./posterSize.js";
import { markMapDirty } from "./redraw.js";
import { archive } from "./archiveCore.js";
import { isCompact, isPortraitPhone, layoutModeKey } from "./responsive.js";
export let currentView = "complete";

const DEFAULT_MIN_ZOOM = camera.minZoom;
const DEFAULT_MAX_ZOOM = camera.maxZoom;

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

let POSTER_HALF_W = 160;
let POSTER_HALF_H = 240;

// Half a poster's size for the view being framed: the
// Phases view draws its posters bigger (js/posterSize.js).
function setPosterHalf(key){

    const w = key === "phases" ? PHASES_POSTER : 320;

    POSTER_HALF_W = w / 2;
    POSTER_HALF_H = w * 0.75;

}

const PANEL_GAP = 16;      // clear air kept between posters and the panel, px

// The zoom at which every poster just fits on screen (the
// poster spread is laid out in the screen's shape, so it
// also fills it, with little empty space round it), times
// `factor` (above 1 stops a little further in).
function fillZoom(factor, centred = false){

    const nodes = visibleNodes();

    if(!nodes.length) return DEFAULT_MIN_ZOOM;

    // Views that stay centred on the middle of the world (the
    // Complete MCU map, round the Avengers logo): measured
    // out from the centre to whichever side reaches furthest.
    if(centred){

        const reachX = Math.max(...nodes.map(n => Math.abs(n.targetX))) * 2 + 400;
        const reachY = Math.max(...nodes.map(n => Math.abs(n.targetY))) * 2 + 560;

        return Math.min(window.innerWidth / reachX, window.innerHeight / reachY) * factor;

    }

    const xs = nodes.map(n => n.targetX), ys = nodes.map(n => n.targetY);

    // (Plus a poster's size, so the ones at the edges are
    // fully on screen too.)
    const w = Math.max(1, Math.max(...xs) - Math.min(...xs) + 400);
    const h = Math.max(1, Math.max(...ys) - Math.min(...ys) + 560);

    return Math.min(window.innerWidth / w, window.innerHeight / h) * factor;

}

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

    // The combined map: the Avengers logo stays exactly in
    // the middle of the screen, with the four corner maps
    // round it (the zoom is fitted to whichever reaches
    // furthest, the same on every side).
    if(cam.centre) cam = { ...cam, x: 0, y: 0 };

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
    // Phones, combined "Complete MCU" map: fit everything
    // into the space between the countdown pill along the
    // top and the panel along the bottom.
    //----------------------------------

    if(cam.centre){

        const cd = countdownRect();

        const top = cd && cd.bottom < H * 0.3 ? cd.bottom + PANEL_GAP : 0;
        const bottom = r.top - PANEL_GAP;

        // Centred on the Avengers logo, fitted to whichever
        // map reaches furthest from it.
        const reachX = Math.max(...nodes.map(n => Math.abs(n.targetX))) + POSTER_HALF_W;
        const reachY = Math.max(...nodes.map(n => Math.abs(n.targetY))) + POSTER_HALF_H;

        // (phoneFit / phoneMinZoom in views.js: further out
        // on a phone, so every world is on screen at once.)
        const zoom = Math.max(cam.phoneMinZoom || cam.minZoom || 0.02, Math.min(cam.maxZoom || 0.5,
            Math.min(W / (reachX * 2), (bottom - top) / (reachY * 2)) * (cam.phoneFit || cam.fit)));

        const freeCy = (top + bottom) / 2 - H / 2;

        return { x: 0, y: -freeCy / zoom, zoom };

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

    setPosterHalf(key);

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

    // How far you can zoom out by hand: further on the big
    // combined map, the usual limit everywhere else.
    // fillMinZoom (All Posters): stop zooming out at the
    // point where the posters still fill the whole screen,
    // so it always looks like a universe full of them.
    camera.minZoom = cameraFor(view).fillMinZoom
        ? fillZoom(cameraFor(view).fillMinZoom, !!cameraFor(view).centre)
        : (cameraFor(view).userMinZoom || DEFAULT_MIN_ZOOM);

    // Phones open the combined map further out (phoneFit,
    // views.js), so let them zoom out that far by hand too.
    if(isCompact() && cameraFor(view).phoneFit) camera.minZoom *= cameraFor(view).phoneFit * 0.85;

    // ...and how far in (userMaxZoom in views.js; the usual
    // limit where a view doesn't set one).
    camera.maxZoom = cameraFor(view).userMaxZoom || DEFAULT_MAX_ZOOM;

    const phoneCfg = phoneCameraConfig(view);

    const phoneCam = phoneCfg ? phoneCamera(phoneCfg) : null;

    // How the map is tipped and turned: the view's own
    // angle on a computer (the order timelines open turned
    // and tipped further back — views.js), otherwise the
    // usual tilt, square on.
    const angle = !phoneCam ? cameraFor(view) : {};

    camera.targetPitch = angle.pitch ?? REST_PITCH;
    camera.targetSpin = angle.spin ?? 0;

    if(phoneCam){

        camera.targetX = phoneCam.x;
        camera.targetY = phoneCam.y;
        camera.targetZoom = phoneCam.zoom;

    } else if(cameraFor(view).fit){

        const fit = fitCamera(cameraFor(view));

        camera.targetX = fit.x;
        camera.targetY = fit.y;

        // Never start further out than the view lets you zoom.
        camera.targetZoom = Math.max(fit.zoom, camera.minZoom);

        lastFitAspect = window.innerWidth / Math.max(1, window.innerHeight);

    } else {

        camera.targetX = cameraFor(view).x;
        camera.targetY = cameraFor(view).y;
        camera.targetZoom = cameraFor(view).zoom;

    }

    // Where this view opens, zoom-wise: the sky is its deep
    // navy from here in, and turns a lighter blue as you zoom
    // out further (js/universe.js).
    camera.openZoom = camera.targetZoom;

    // Laid out from scratch (entering the archive, or a world
    // seen for the first time)? Then it grows out branch by
    // branch rather than all at once (GROWING below).
    startGrowth();

    // Lets the panel keep its active button / phone label in
    // step, however the view was changed.
    window.dispatchEvent(new CustomEvent("mcu:view-changed"));

}

//----------------------------------
// GROWING
//
// When a map is laid out from scratch — entering the
// archive, entering it again from the landing page, or
// opening a world for the first time — every title starts
// stacked at the logo. Rather than all flying out at once,
// the map grows like a mind map being drawn:
//
//   1. each phase's branch reaches out from the logo in
//      turn, round the circle
//   2. then that phase's titles sprout off it, the inner
//      ring first and the outer ones after (fading in as
//      they go, js/nodes.js) — each one starting from what
//      it hangs off (its branch point, or the inner title its
//      line comes from), so the map grows out branch by
//      branch rather than everything flying from the logo
//   3. on the combined map, the camera starts close in on
//      the Avengers map in the middle while it grows, then
//      slowly pulls back to the whole universe (PULLBACK),
//      each other world growing in turn as it comes into
//      view. Scrolling or dragging during the pull-back
//      leaves the camera to you.
//
// Anything not grown yet stays hidden at the logo (its
// lines, labels and clicks too: connections.js,
// branchNodes.js, nodeHitTest.js). Views that just
// rearrange titles already on screen move as they always
// did. Switching view mid-growth simply lets everything
// carry on to the new layout.
//----------------------------------

const GROW_WORLD_STEP = 350;   // ms between worlds (combined map)
const GROW_PHASE_STEP = 150;   // ms between phases round the circle
const GROW_LEAD = 320;         // ms from a branch starting to its first titles
const GROW_TIER_STEP = 260;    // ms between rings of titles
const GROW_SPREAD = 1750;      // ms across the whole map, for other views

// The combined map's opening pull-back (see 3. above).
const PULLBACK_MS = 3200;      // how long the pull-back takes
const PULLBACK_EARLY = 450;    // starts this long before the middle map's last titles sprout

let growTimers = [];
let growing = [];

function stopGrowth(){

    cameraTween = null;

    growTimers.forEach(clearTimeout);

    growTimers = [];

    growing.forEach(n => { n.growHidden = false; n.growStart = 0; });

    growing = [];

}

//----------------------------------
// PULLBACK
//
// Moves the camera slowly (easing in and out) to `to` —
// zooming evenly, so pulling back from one map to the whole
// universe reads as one steady move — starting after
// `delay` ms. If anything else moves the camera meanwhile
// (you scroll, drag, pick a view, or click a logo), it
// stops and leaves the camera be.
//----------------------------------

let cameraTween = null;

function tweenCamera(to, duration, delay){

    const token = {};

    cameraTween = token;

    // What it last set (or found), to notice anything else
    // moving the camera.
    let mine = { x: camera.targetX, y: camera.targetY, zoom: camera.targetZoom };

    const startAt = performance.now() + delay;

    let from = null;

    const moved = () =>
        camera.targetX !== mine.x || camera.targetY !== mine.y || camera.targetZoom !== mine.zoom;

    const step = now => {

        if(cameraTween !== token) return;

        if(moved()){ cameraTween = null; return; }

        if(now < startAt){ requestAnimationFrame(step); return; }

        if(!from) from = { ...mine };

        const t = Math.min(1, (now - startAt) / duration);

        const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

        camera.targetZoom = from.zoom * Math.pow(to.zoom / from.zoom, e);
        camera.targetX = from.x + (to.x - from.x) * e;
        camera.targetY = from.y + (to.y - from.y) * e;

        mine = { x: camera.targetX, y: camera.targetY, zoom: camera.targetZoom };

        if(t < 1) requestAnimationFrame(step);
        else cameraTween = null;

    };

    requestAnimationFrame(step);

}

function startGrowth(){

    stopGrowth();

    const atLogo = n => n.x === 0 && n.y === 0 && (n.targetX !== 0 || n.targetY !== 0);

    const titles = graph.nodes.filter(n => Math.abs(n.targetX) < 50000);

    const fresh = titles.filter(atLogo);

    // Only when most of the map is starting from scratch.
    if(!fresh.length || fresh.length < titles.length * 0.5) return;

    const branches = graph.branchNodes.filter(atLogo);

    const mindmap = currentView === "complete";

    // When each thing starts (ms from now).
    const when = new Map();

    if(mindmap){

        // Worlds in the order of their logos (the Avengers
        // first), phases in their order round each map.
        const worlds = (graph.hubs || []).map(h => h.world);

        const worldIndex = w => Math.max(0, worlds.indexOf(w));

        const phaseIndex = new Map();

        graph.branchNodes.forEach(b => {

            if(b.phase === null || b.phase === undefined) return;

            const key = (b.world || "") + "|" + b.phase;

            if(!phaseIndex.has(key)) phaseIndex.set(key, [...phaseIndex.keys()].filter(k => k.startsWith((b.world || "") + "|")).length);

        });

        const combined = worlds.length > 1;

        // When each world starts: the one in the middle at
        // once; on the combined map the others wait for the
        // pull-back (set below), then follow one by one.
        let pullStart = 0;

        const worldStart = w => !combined || worldIndex(w) === 0
            ? 0
            : pullStart + (worldIndex(w) - 1) * GROW_WORLD_STEP;

        const branchStart = (world, phase) => {

            const key = (combined ? world || "" : "") + "|" + phase;

            return worldStart(world) + (phaseIndex.get(key) || 0) * GROW_PHASE_STEP;

        };

        const titleStart = n => branchStart(n.world, n.phase) + GROW_LEAD + (n.tier || 0) * GROW_TIER_STEP;

        // The pull-back starts as the middle map's last ring
        // begins to sprout.
        if(combined){

            const middle = fresh.filter(n => worldIndex(n.world) === 0);

            pullStart = Math.max(0, Math.max(0, ...middle.map(titleStart)) - PULLBACK_EARLY);

        }

        // On the combined map, each world grows out of its own
        // logo (not all from the Avengers one in the middle).
        if(worlds.length > 1){

            const hubAt = new Map((graph.hubs || []).map(h => [h.world, h]));

            [...fresh, ...branches].forEach(n => {

                const h = hubAt.get(n.world);

                if(h){ n.x = h.x; n.y = h.y; }

            });

        }

        branches.forEach(b => when.set(b, b.phase === null || b.phase === undefined ? 0 : branchStart(b.world, b.phase)));

        fresh.forEach(n => when.set(n, titleStart(n)));

        // The camera: close in on the middle map first, then
        // slowly back out to the whole universe.
        if(combined){

            const full = { x: camera.targetX, y: camera.targetY, zoom: camera.targetZoom };

            const middleWorld = worlds[0];

            const hub = (graph.hubs || []).find(h => h.world === middleWorld);

            // Centred on its logo (in the middle of the screen,
            // where the jump's logo was), zoomed so the whole
            // map fits either side of it, clear of the panel
            // and the cards along the top.
            const members = graph.nodes.filter(n => n.world === middleWorld && Math.abs(n.targetX) < 50000);

            const cx = hub ? hub.x : 0, cy = hub ? hub.y : 0;

            const reachX = Math.max(1, ...members.map(n => Math.abs(n.targetX - cx))) + POSTER_HALF_W;
            const reachY = Math.max(1, ...members.map(n => Math.abs(n.targetY - cy))) + POSTER_HALF_H;

            const W = window.innerWidth, H = window.innerHeight;

            const r = panelRect();

            let halfW = W / 2, halfH = H / 2 - TOP_UI_RESERVE;

            if(r && r.left < W * 0.25 && r.right < W * 0.6) halfW = W / 2 - (r.right + PANEL_GAP);
            else if(r && r.bottom > H * 0.75) halfH = Math.min(halfH, r.top - PANEL_GAP - H / 2);

            const zoom = Math.min(halfW / reachX, Math.max(1, halfH) / reachY) * 0.95;

            camera.targetX = cx;
            camera.targetY = cy;
            camera.targetZoom = Math.max(camera.minZoom, Math.min(0.6, zoom));

            tweenCamera(full, PULLBACK_MS, pullStart);

        }

    } else {

        // Other views: from the middle outwards.
        const far = Math.max(1, ...fresh.map(n => Math.hypot(n.targetX, n.targetY)));

        fresh.forEach(n => when.set(n, Math.hypot(n.targetX, n.targetY) / far * GROW_SPREAD));

        branches.forEach(b => when.set(b, Math.max(0, Math.hypot(b.targetX, b.targetY) / far * GROW_SPREAD - 150)));

    }

    // What each thing hangs off, from the lines just laid out
    // (a branch point off its logo, a title off its branch
    // point or the inner title before it): it grows out
    // from there when its turn comes.
    const parentOf = new Map();

    const anchor = ref => {

        if(typeof ref === "number") return graph.nodes[ref] || null;

        if(typeof ref !== "string") return null;

        if(ref.startsWith("branch:")) return graph.branchNodes.find(b => "branch:" + b.key === ref) || null;

        if(ref.startsWith("hub")){

            const world = ref.split(":")[1];

            return (world && (graph.hubs || []).find(h => h.world === world)) || (graph.hubs || [])[0] || null;

        }

        return null;

    };

    graph.edges.forEach(edge => {

        const child = anchor(edge.to);

        if(!child || !when.has(child) || parentOf.has(child)) return;

        const parent = anchor(edge.from);

        if(parent && parent !== child) parentOf.set(child, parent);

    });

    // Hold everything at the logo, hidden, until its turn
    // (graph.js doesn't move a title while it's growHidden;
    // where it's going stays as laid out).
    const waves = new Map();

    when.forEach((ms, n) => {

        n.growHidden = true;

        growing.push(n);

        const at = Math.round(ms / 16) * 16;

        if(!waves.has(at)) waves.set(at, []);

        waves.get(at).push(n);

    });

    waves.forEach((list, at) => {

        growTimers.push(setTimeout(() => {

            const now = performance.now();

            list.forEach(n => {

                if(!n.growHidden) return;

                // Start from where its parent is right now.
                const parent = parentOf.get(n);

                if(parent && typeof parent.x === "number"){

                    n.x = parent.x;
                    n.y = parent.y;

                }

                n.growHidden = false;
                n.growStart = n.isBranch ? 0 : now;

            });

            markMapDirty();

        }, at));

    });

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

// Zoom into one world's map on the combined "Complete MCU"
// map (clicking its logo — see input.js).
export function focusWorld(world){

    const hub = graph.hubs.find(h => h.world === world);

    frameNodes(graph.nodes.filter(n => n.world === world && Math.abs(n.targetX) < 50000), hub ? [{ targetX: hub.x, targetY: hub.y }] : []);

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
    camera.targetZoom = Math.max(fit.zoom, camera.minZoom);

}
//----------------------------------
// DEFAULT VIEW
//
// The panel's reset button (ui/panel.js): frames the
// current view the way it opens, at its own default angle
// (setView above) — undoing any tilting, turning, panning
// or zooming.
//----------------------------------

export function resetView(){

    setView(currentView);

}
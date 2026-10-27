//==================================================
//
// UNIVERSE ENGINE V3
//
//==================================================

import { ctx, beginFrame } from "./universe/renderer.js";
import { universe } from "./universe/state.js";

import { drawBackground } from "./universe/background.js";
import { drawNebulas } from "./universe/nebulas.js";
import { drawDust } from "./universe/dust.js";
import { drawStars } from "./universe/stars.js";
import { drawHeroStars } from "./universe/heroStars.js";
import { drawEnergy } from "./universe/energy.js";
import { drawShootingStars } from "./universe/shootingStars.js";

import { generateUniverse } from "./universe/generator.js";

import { renderArchive } from "./archive.js";
import { renderConnections } from "./connections.js";
import { renderBranchNodes } from "./branchNodes.js";
import { renderNodes } from "./nodes.js";
import { renderHub } from "./hub.js";
import { renderGround } from "./ground.js";
import { graph } from "./graph.js";
import { archive } from "./archiveCore.js";
import { getSway, swayOffset, SWAY, isSwayMoving } from "./sway.js";
import { heroShowing } from "./parallax.js";
import { postersSettling } from "./nodes.js";
import { depthMoving } from "./depth.js";
import { getWorld } from "./worlds.js";
import { takeMapDirty, markMapDirty } from "./redraw.js";

//==================================================
// THE MAP LAYER: ONLY REDRAWN WHEN SOMETHING CHANGES
//
// The sky (stars, twinkles, shooting stars) is animated, so
// it's drawn every frame. The map on top of it — every
// poster, shadow, line, logo and label — is by far the most
// work, and most of the time it's sitting perfectly still.
// So it's drawn into its own layer (mapCanvas), and that
// layer is only redrawn while something on it is changing:
//
//   • the camera moving (dragging, zooming, tilting, easing)
//   • posters gliding to a new layout, rising on hover,
//     fading in as their pictures arrive, or lifting out
//     into a details card
//   • the mouse sway settling
//   • a different view, world, highlight or watch list
//   • anything that calls markMapDirty() (js/redraw.js):
//     a picture or logo arriving, a title ticked as watched,
//     fonts loading, the window resizing
//
// Every other frame just lays the last picture of the map
// over the fresh sky. A redraw also happens at least once a
// second, as a safety net. (While still, the posters'
// gentle float pauses too, and carries on where it left
// off.)
//==================================================

const mapCanvas = document.createElement("canvas");
const mapCtx = mapCanvas.getContext("2d");

// Like the main canvas (js/universe/renderer.js), glows are
// measured in real pixels: scaled here so they look the same
// on high-DPI screens.
let mapScale = 1;

const shadowBlurDesc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, "shadowBlur");

Object.defineProperty(mapCtx, "shadowBlur", {
    get(){ return shadowBlurDesc.get.call(this) / mapScale; },
    set(v){ shadowBlurDesc.set.call(this, v * mapScale); }
});

const SAFETY_REDRAW_MS = 1000;

let lastMapKey = "";
let lastMapDraw = 0;

// A short id per object, so a different list (another
// world's titles, a new set of lines) counts as a change.
const ids = new WeakMap();
let nextId = 1;

function idOf(obj){

    if(!obj || typeof obj !== "object") return String(obj);

    if(!ids.has(obj)) ids.set(obj, nextId++);

    return ids.get(obj);

}

// Everything about the map that can change without any of
// it moving.
function mapKey(){

    return [
        ctx.canvas.width, ctx.canvas.height,
        archive.view, getWorld(),
        idOf(graph.nodes), idOf(graph.edges), idOf(graph.branchNodes), idOf(graph.hubs), idOf(graph.focus),
        graph.hover.nodeIndex, graph.hover.phase, graph.hoverPoster
    ].join("|");

}

function mapNeedsDrawing(camera){

    // (Taken first, every frame, so a change is never lost.)
    const flagged = takeMapDirty();

    const key = mapKey();

    const changed = key !== lastMapKey;

    lastMapKey = key;

    return flagged || changed ||
        camera.moving || graph.moving || depthMoving || isSwayMoving() ||
        postersSettling() ||
        // A hovered poster leans towards the mouse.
        graph.hoverPoster !== null ||
        performance.now() - lastMapDraw > SAFETY_REDRAW_MS;

}

window.addEventListener("mcu:watched-changed", markMapDirty);
window.addEventListener("mcu:view-changed", markMapDirty);
window.addEventListener("resize", markMapDirty);

if(document.fonts && document.fonts.addEventListener){

    document.fonts.addEventListener("loadingdone", markMapDirty);

}

// Draws the map into its layer (posters a little above the
// map with the mouse sway, as before).
function drawMap(camera){

    const W = ctx.canvas.width, H = ctx.canvas.height;

    if(mapCanvas.width !== W || mapCanvas.height !== H){

        mapCanvas.width = W;
        mapCanvas.height = H;

    }

    mapScale = W / Math.max(1, window.innerWidth);

    if(typeof mapCtx.reset === "function") mapCtx.reset();
    else {

        mapCtx.setTransform(1, 0, 0, 1, 0, 0);
        mapCtx.globalAlpha = 1;
        mapCtx.globalCompositeOperation = "source-over";
        mapCtx.clearRect(0, 0, W, H);

    }

    mapCtx.setTransform(mapScale, 0, 0, mapScale, 0, 0);

    const c = mapCtx;

    // The map follows the mouse a little, the posters
    // (floating above it) a little more. Clicks allow for
    // this (see swayOffset in nodeHitTest.js / input.js).
    const mapShift = swayOffset("map");
    const posterShift = swayOffset("posters");

    c.save();

    c.translate(mapShift.x, mapShift.y);

    // The faint grid the map lies on (js/ground.js).
    renderGround(c, camera);

    // All Posters should show posters without connection lines.
    if (archive.view !== "scatter") {
        renderConnections(c, camera, graph);
    }

    if (archive.view === "complete") {

        // (The soft glow behind the logo, renderArchive in
        // archive.js, is switched off: the map keeps its glow
        // for the branches. Put the call back to restore it.)
        // renderArchive(c, camera);
        renderHub(c, camera);       // Marvel image

    }

    renderBranchNodes(c, camera, graph.branchNodes);

    c.restore();

    c.save();

    c.translate(posterShift.x, posterShift.y);

    renderNodes(c, camera, graph.nodes);

    c.restore();

    lastMapDraw = performance.now();

}

let generated = false;

// Whether the map was drawn last frame (see drawMap below).
let mapWasShown = false;

let shown = false;

// 0 on the landing hero (where js/parallax.js moves the
// stars itself), easing to 1 everywhere else.
let starSwayMix = 0;

// "Calm": zoomed out in the archive, where far more of the
// sky is on screen at once, the background tones down —
// softer star glows, fewer and fainter drifting specks,
// rarer shooting stars, a fainter nebula — so the map reads
// first and the sky sits back behind it. 0 = as on the
// landing page and zoomed in; 1 = fully calm. Read by
// stars.js, energy.js and shootingStars.js (universe.calm).
const CALM_FROM_ZOOM = 0.2;     // starts calming below this zoom...
const CALM_FULL_ZOOM = 0.08;    // ...fully calm by this one

// How far (screen px) the stars drift at the map's full
// tilt, per radian.
const TILT_STAR_SHIFT = 220;

//==================================================

export function initialiseUniverse(){

    if(generated) return;

    generateUniverse();

    generated = true;

}

//==================================================

export function renderUniverse(camera, entered){

    universe.time++;

    // Clean state + high-DPI scale for this frame. (This used
    // to be canvas.width = ... every frame, which rebuilt the
    // whole canvas buffer 60 times a second.)
    beginFrame();

    drawBackground();

    //==================================================
    // MOUSE SWAY (js/sway.js)
    //
    // The background layers are drawn as if the camera were
    // nudged sideways: every star shifts by its own depth,
    // so near ones slide against far ones, the opposite way
    // to the mouse.
    //==================================================

    starSwayMix += ((heroShowing() ? 0 : 1) - starSwayMix) * 0.05;

    const calmTarget = entered
        ? Math.max(0, Math.min(1, (CALM_FROM_ZOOM - camera.zoom) / (CALM_FROM_ZOOM - CALM_FULL_ZOOM)))
        : 0;

    universe.calm = (universe.calm || 0) + (calmTarget - (universe.calm || 0)) * 0.05;

    const sway = getSway();

    // Tipping the map back (js/depth.js) also turns the
    // view slightly, so the stars drift with it (near ones
    // more than far ones) instead of staying pinned.
    const tilt = (camera.pitch || 0) * TILT_STAR_SHIFT;

    const skyCamera = (starSwayMix > 0.001 || tilt) ? {
        ...camera,
        x: camera.x + sway.x * 2 * SWAY.stars / camera.zoom * starSwayMix,
        y: camera.y + (sway.y * 2 * SWAY.stars * starSwayMix - tilt) / camera.zoom
    } : camera;

    //==================================================
    // ARCHIVE-ONLY NEBULAS
    //
    // Nebulas are intentionally disabled on the landing
    // page because their enlarged low-resolution sprites
    // create the blurry/block-like texture seen there.
    //
    // They fade in/out around the threshold so they don't
    // suddenly pop into existence while zooming.
    //==================================================

    if (entered) {

        const NEBULA_FULL_ZOOM = 0.11;
        const NEBULA_START_ZOOM = 0.19;

        let nebulaAlpha =
            (NEBULA_START_ZOOM - camera.zoom) /
            (NEBULA_START_ZOOM - NEBULA_FULL_ZOOM);

        nebulaAlpha = Math.max(
            0,
            Math.min(1, nebulaAlpha)
        );

        if (nebulaAlpha > 0) {

            ctx.save();

            // (Was 0.55: a bit much behind the zoomed-out map.)
            ctx.globalAlpha = nebulaAlpha * 0.32;

            drawNebulas(skyCamera);

            ctx.restore();

        }

    }

    drawStars(skyCamera);

    // Hero stars switched off: big glowing balls with four
    // spike lines. Like the dust, they're still generated so
    // every other layer's seeded layout stays the same. Put
    // this call back to restore them.
    // drawHeroStars(camera);

    drawEnergy(skyCamera);

    drawShootingStars();

    if(entered){

        // Redraw the map only if something on it changed
        // (see THE MAP LAYER above), then lay it over the sky.
        if(!mapWasShown || mapNeedsDrawing(camera)) drawMap(camera);

        mapWasShown = true;

        ctx.save();

        ctx.setTransform(1, 0, 0, 1, 0, 0);

        ctx.drawImage(mapCanvas, 0, 0);

        ctx.restore();

    } else {

        // Not drawn (landing page, the hyperspace jump): draw
        // it fresh the next time it shows.
        mapWasShown = false;

    }

    // First frame drawn: fade the canvas in (css/world.css).
    if(!shown){

        shown = true;

        ctx.canvas.classList.add("ready");

    }

}
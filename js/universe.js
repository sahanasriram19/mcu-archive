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
import { graph } from "./graph.js";
import { archive } from "./archiveCore.js";
import { getSway, swayOffset, SWAY } from "./sway.js";
import { heroShowing } from "./parallax.js";

let generated = false;

let shown = false;

// 0 on the landing hero (where js/parallax.js moves the
// stars itself), easing to 1 everywhere else.
let starSwayMix = 0;

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

    const sway = getSway();

    const skyCamera = starSwayMix > 0.001 ? {
        ...camera,
        x: camera.x + sway.x * 2 * SWAY.stars / camera.zoom * starSwayMix,
        y: camera.y + sway.y * 2 * SWAY.stars / camera.zoom * starSwayMix
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

            ctx.globalAlpha = nebulaAlpha * 0.55;

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

        // Only Complete MCU has one shared hub in the
        // centre — Phases, the timeline trails, and
        // Character Journeys don't use it at all, so
        // drawing it unconditionally left a stray white
        // circle sitting at world origin in every other
        // view.
        // The map follows the mouse a little, the posters
        // (floating above it) a little more. Clicks allow for
        // this (see swayOffset in nodeHitTest.js / input.js).
        const mapShift = swayOffset("map");
        const posterShift = swayOffset("posters");

        ctx.save();

        ctx.translate(mapShift.x, mapShift.y);

        renderConnections(ctx, camera, graph);

        if (archive.view === "complete") {

            renderArchive(ctx, camera);   // if this is your central glow
            renderHub(ctx, camera);       // Marvel image

        }

        renderBranchNodes(ctx, camera, graph.branchNodes);

        ctx.restore();

        ctx.save();

        ctx.translate(posterShift.x, posterShift.y);

        renderNodes(ctx, camera, graph.nodes);

        ctx.restore();

    }

    // First frame drawn: fade the canvas in (css/world.css).
    if(!shown){

        shown = true;

        ctx.canvas.classList.add("ready");

    }

}
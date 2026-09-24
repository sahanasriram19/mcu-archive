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

let generated = false;

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

    drawNebulas(camera);

    // Dust layer switched off: it drew faint flat discs
    // (8-30px) that read as stray translucent circles once
    // the mind map left open space in the middle. It's still
    // generated (see generator.js), so the seeded random
    // sequence — and therefore every other layer's layout —
    // stays exactly the same. Put this call back to restore it.
    // drawDust(camera);

    drawStars(camera);

    drawHeroStars(camera);

    drawEnergy(camera);

    drawShootingStars();

    if(entered){

        // Only Complete MCU has one shared hub in the
        // centre — Phases, the timeline trails, and
        // Character Journeys don't use it at all, so
        // drawing it unconditionally left a stray white
        // circle sitting at world origin in every other
        // view.
        renderConnections(ctx, camera, graph);

        if (archive.view === "complete") {

            renderArchive(ctx, camera);   // if this is your central glow
            renderHub(ctx, camera);       // Marvel image

        }

        renderBranchNodes(ctx, camera, graph.branchNodes);
        renderNodes(ctx, camera, graph.nodes);



    }

}
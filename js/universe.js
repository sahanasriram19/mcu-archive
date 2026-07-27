//==================================================
//
// UNIVERSE ENGINE V3
//
//==================================================

import { ctx, canvas } from "./universe/renderer.js";
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

    universe.time += 0.0035;

    canvas.width = universe.width;
    canvas.height = universe.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBackground();

    drawNebulas(camera);

    drawDust(camera);

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
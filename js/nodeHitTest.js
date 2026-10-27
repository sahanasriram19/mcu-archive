//==================================================
// NODE HIT TESTING
//
// Mirrors the screen-position math in nodes.js's
// renderNodes (depth and tilt from js/depth.js, poster
// size per view, ring growth for Complete MCU) so a click can be matched back to
// whichever poster is actually drawn under it.
//==================================================

import { swayOffset } from "./sway.js";
import { projectNode } from "./depth.js";
// The same per-view poster sizes nodes.js draws with.
import { posterSizeFor } from "./posterSize.js";

//--------------------------------------------------
// Returns the topmost (last-drawn) movie node whose
// poster rectangle contains the given screen point,
// or null. Branch nodes are skipped — only actual
// movies/shows respond to a click here.
//--------------------------------------------------

export function getNodeAtScreenPoint(screenX, screenY, camera, nodes, currentView){

    // The posters are drawn shifted a little with the mouse
    // (js/sway.js): look where they really are.
    const shift = swayOffset("posters");

    screenX -= shift.x;
    screenY -= shift.y;

    // A small fixed margin covers the ±2px "gentle floating"
    // offset nodes.js applies, so the hit box doesn't feel a
    // few pixels stingier than the poster actually drawn.
    const MARGIN = 6;

    // With depth (js/depth.js) posters can overlap in any
    // order, so the one nearest the camera wins — that's the
    // one drawn on top.
    let best = null;
    let bestZ = Infinity;

    for(let i = nodes.length - 1; i >= 0; i--){

        const node = nodes[i];

        if(node.isBranch) continue;

        const at = projectNode(node);

        const posterWidth = posterSizeFor(node, currentView) * camera.zoom * at.s;
        const posterHeight = posterWidth * 1.5;

        const left = at.x - posterWidth/2 - MARGIN;
        const top = at.y - posterHeight/2 - MARGIN;
        const right = left + posterWidth + MARGIN*2;
        const bottom = top + posterHeight + MARGIN*2;

        if(

            screenX >= left && screenX <= right &&
            screenY >= top && screenY <= bottom

        ){

            // The poster under the mouse is drawn last (lifted
            // over its neighbours), so it keeps the hover.
            if(node.lift > 0.5) return node;

            if(at.z < bestZ){

                bestZ = at.z;
                best = node;

            }

        }

    }

    return best;

}
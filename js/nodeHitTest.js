//==================================================
// NODE HIT TESTING
//
// Mirrors the screen-position math in nodes.js's
// renderNodes (poster size per view, ring growth for
// Complete MCU) so a click can be matched back to
// whichever poster is actually drawn under it.
//==================================================

const BASE_POSTER_SIZE = 320;

function posterSizeFor(node, currentView){

    let size = BASE_POSTER_SIZE;

    if(

        currentView === "release" ||
        currentView === "chronology" ||
        currentView === "characters"

    ){

        size = 300;

    } else if(currentView === "complete"){

        const ring = Math.min(node.ring || 0, 4);

        size += ring * 35;

    }

    return size;

}

//--------------------------------------------------
// Returns the topmost (last-drawn) movie node whose
// poster rectangle contains the given screen point,
// or null. Branch nodes are skipped — only actual
// movies/shows respond to a click here.
//--------------------------------------------------

export function getNodeAtScreenPoint(screenX, screenY, camera, nodes, currentView){

    const halfW = window.innerWidth/2;
    const halfH = window.innerHeight/2;

    // A small fixed margin covers the ±2px "gentle floating"
    // offset nodes.js applies, so the hit box doesn't feel a
    // few pixels stingier than the poster actually drawn.
    const MARGIN = 6;

    for(let i = nodes.length - 1; i >= 0; i--){

        const node = nodes[i];

        if(node.isBranch) continue;

        const x = halfW + (node.x - camera.x) * camera.zoom;
        const y = halfH + (node.y - camera.y) * camera.zoom;

        const posterWidth = posterSizeFor(node, currentView) * camera.zoom;
        const posterHeight = posterWidth * 1.5;

        const left = x - posterWidth/2 - MARGIN;
        const top = y - posterHeight/2 - MARGIN;
        const right = left + posterWidth + MARGIN*2;
        const bottom = top + posterHeight + MARGIN*2;

        if(

            screenX >= left && screenX <= right &&
            screenY >= top && screenY <= bottom

        ){

            return node;

        }

    }

    return null;

}
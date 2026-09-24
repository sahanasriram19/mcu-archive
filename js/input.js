import { camera } from "./camera.js";
import { graph } from "./graph.js";
import { getCurrentView, focusPhase, refitView } from "./viewManager.js";
import { getNodeAtScreenPoint } from "./nodeHitTest.js";
import { showMovieDetails } from "./movieDetails.js";
import { edgeAtScreenPoint } from "./connections.js";

const viewport = document.getElementById("viewport");

const pointers = new Map();
let gestureStartX = 0;
let gestureStartY = 0;
let lastX = 0;
let lastY = 0;
let tapMoved = false;
let pinchDistance = 0;

const CLICK_TOLERANCE = 8;

function isUiTarget(target){

    return !!target.closest(
        "#view-panel, .character-dropdown, .search-container, " +
        "#movie-search-results, #movie-details-overlay, " +
        ".character-panel"
    );

}

function clampZoom(value){

    return Math.max(
        camera.minZoom,
        Math.min(camera.maxZoom, value)
    );

}

function distance(a,b){

    return Math.hypot(
        a.clientX-b.clientX,
        a.clientY-b.clientY
    );

}

function startGesture(e){

    if(isUiTarget(e.target)) return;

    viewport.setPointerCapture?.(e.pointerId);

    pointers.set(e.pointerId, {
        x:e.clientX,
        y:e.clientY
    });

    if(pointers.size === 1){

        gestureStartX = e.clientX;
        gestureStartY = e.clientY;
        lastX = e.clientX;
        lastY = e.clientY;
        tapMoved = false;

    } else if(pointers.size === 2){

        const [a,b] = [...pointers.values()];

        pinchDistance = Math.max(
            1,
            distance(a,b)
        );

    }

}

function moveGesture(e){

    const point = pointers.get(e.pointerId);

    if(!point) return;

    const dx = e.clientX - point.x;
    const dy = e.clientY - point.y;

    point.x = e.clientX;
    point.y = e.clientY;


    //--------------------------------------------------
    // Two-finger pinch zoom
    //--------------------------------------------------

    if(pointers.size === 2){

        const values = [...pointers.values()];

        const currentDistance = Math.max(
            1,
            Math.hypot(
                values[0].x-values[1].x,
                values[0].y-values[1].y
            )
        );

        if(pinchDistance){

            const factor =
                currentDistance / pinchDistance;

            camera.targetZoom = clampZoom(
                camera.targetZoom * factor
            );

        }

        pinchDistance = currentDistance;
        tapMoved = true;

        return;

    }


    //--------------------------------------------------
    // Detect dragging
    //--------------------------------------------------

    if(Math.hypot(
        e.clientX-gestureStartX,
        e.clientY-gestureStartY
    ) > CLICK_TOLERANCE){

        tapMoved = true;

    }


    //--------------------------------------------------
    // Pan camera
    //--------------------------------------------------

    camera.targetX -= dx / camera.zoom;
    camera.targetY -= dy / camera.zoom;

}


//--------------------------------------------------
// MIND MAP TARGETS (Complete MCU only)
//
// Besides posters, two things on the mind map are
// clickable: a phase junction (the point a phase's
// branch splits from) zooms into that phase, and the
// Marvel logo zooms back out to the whole map.
//--------------------------------------------------

const JUNCTION_HIT_WORLD = 130;   // junction hit radius, world units...
const JUNCTION_HIT_MIN_PX = 22;   // ...but never smaller than this on screen

const HUB_HALF_W = 450;           // Marvel logo size, world units (see hub.js)
const HUB_HALF_H = 200;

// `coarse` = a finger rather than a mouse: bigger targets.
function mindmapTargetAt(clientX, clientY, coarse = false){

    if(getCurrentView() !== "complete") return null;

    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;

    const radius = Math.max(coarse ? 30 : JUNCTION_HIT_MIN_PX, JUNCTION_HIT_WORLD * camera.zoom);

    for(const branch of graph.branchNodes){

        if(!branch.key.startsWith("phase")) continue;

        const x = halfW + (branch.x - camera.x) * camera.zoom;
        const y = halfH + (branch.y - camera.y) * camera.zoom;

        if(Math.hypot(clientX - x, clientY - y) <= radius){

            return { type: "junction", phase: branch.phase };

        }

    }

    // A branch line: lights up (and zooms to) the phase it
    // belongs to. A line into a poster counts as that
    // poster's branch; a line into a phase junction counts
    // as the whole phase.
    const edgeIndex = edgeAtScreenPoint(clientX, clientY, camera, graph, coarse ? 14 : 7);

    if(edgeIndex !== -1){

        const edge = graph.edges[edgeIndex];

        if(typeof edge.to === "number"){

            const node = graph.nodes[edge.to];

            return { type: "line", nodeIndex: edge.to, phase: node.phase };

        }

        if(typeof edge.to === "string" && edge.to.startsWith("branch:phase")){

            return { type: "line", nodeIndex: null, phase: Number(edge.to.slice("branch:phase".length)) };

        }

    }

    const hx = halfW + (0 - camera.x) * camera.zoom;
    const hy = halfH + (0 - camera.y) * camera.zoom;

    if(
        Math.abs(clientX - hx) <= HUB_HALF_W * camera.zoom &&
        Math.abs(clientY - hy) <= HUB_HALF_H * camera.zoom
    ){

        return { type: "hub" };

    }

    return null;

}

//--------------------------------------------------
// Hover highlight — mouse only (touch has no hover;
// a tap still opens the poster's details as before).
// Written to graph.hover, which connections.js and
// branchNodes.js read to light up the branch.
//--------------------------------------------------

function clearHover(){

    graph.hover.nodeIndex = null;
    graph.hover.phase = null;

}

function updateHover(e, node, target){

    // Touch/pen: leave the highlight alone. There's no hover
    // on a touchscreen; a tap sets the highlight instead
    // (see endGesture), and dragging mustn't wipe it.
    if(e.pointerType !== "mouse") return;

    if(pointers.size > 0 || getCurrentView() !== "complete"){

        clearHover();

        return;

    }

    if(node && !node.isBranch){

        graph.hover.nodeIndex = graph.nodes.indexOf(node);
        graph.hover.phase = node.phase;

    } else if(target && target.type === "junction"){

        graph.hover.nodeIndex = null;
        graph.hover.phase = target.phase;

    } else if(target && target.type === "line"){

        graph.hover.nodeIndex = target.nodeIndex;
        graph.hover.phase = target.phase;

    } else {

        clearHover();

    }

}

//--------------------------------------------------
// Change cursor depending on what is underneath it.
//
// Project/movie nodes get the clickable hand cursor.
// Branch/category nodes and empty space keep the
// normal cursor.
//--------------------------------------------------

function updateCursor(e){

    const clientX = e.clientX;
    const clientY = e.clientY;

    if(isUiTarget(document.elementFromPoint(clientX, clientY))){

        viewport.style.cursor = "default";

        clearHover();

        return;

    }


    const node = getNodeAtScreenPoint(
        clientX,
        clientY,
        camera,
        graph.nodes,
        getCurrentView()
    );

    const target = (node && !node.isBranch) ? null : mindmapTargetAt(clientX, clientY);

    updateHover(e, node, target);


    if((node && !node.isBranch) || target){

        viewport.style.cursor = "pointer";

    } else {

        viewport.style.cursor = "default";

    }

}


//--------------------------------------------------
// Mouse movement for cursor feedback.
//
// This does NOT fetch movie details. Details are only
// loaded when the user actually clicks a project.
//--------------------------------------------------

viewport.addEventListener("pointermove", e => {

    updateCursor(e);

    moveGesture(e);

});

function endGesture(e){

    const point = pointers.get(e.pointerId);

    if(!point) return;

    const wasSinglePointer = pointers.size === 1;

    const tapX = e.clientX;
    const tapY = e.clientY;

    pointers.delete(e.pointerId);

    if(pointers.size < 2){

        pinchDistance = 0;

    }


    //--------------------------------------------------
    // Open movie details on a click/tap.
    //--------------------------------------------------

    if(
        wasSinglePointer &&
        !tapMoved &&
        !isUiTarget(e.target)
    ){

        const node = getNodeAtScreenPoint(
            tapX,
            tapY,
            camera,
            graph.nodes,
            getCurrentView()
        );


        if(node && !node.isBranch){

            showMovieDetails(node);

        } else {

            const isTouch = e.pointerType !== "mouse";

            const target = mindmapTargetAt(tapX, tapY, isTouch);

            if(target && (target.type === "junction" || target.type === "line")){

                // On touchscreens a tap is the only way to light
                // a branch up, so keep that phase lit while it's
                // zoomed in (until the next tap on empty space).
                if(isTouch){

                    graph.hover.nodeIndex = target.type === "line" ? target.nodeIndex : null;
                    graph.hover.phase = target.phase;

                }

                focusPhase(target.phase);

            }

            else if(target && target.type === "hub"){

                if(isTouch) clearHover();

                refitView();

            }

            else if(isTouch){

                clearHover();

            }

        }

    }

}


//--------------------------------------------------
// Pointer events
//--------------------------------------------------

viewport.addEventListener(
    "pointerdown",
    startGesture
);

viewport.addEventListener(
    "pointerup",
    endGesture
);

viewport.addEventListener(
    "pointercancel",
    e => {

        pointers.delete(e.pointerId);

        pinchDistance = 0;

        tapMoved = true;

    }
);


//--------------------------------------------------
// Reset cursor when leaving the viewport.
//--------------------------------------------------

viewport.addEventListener(
    "pointerleave",
    () => {

        viewport.style.cursor = "default";

        clearHover();

    }
);


//--------------------------------------------------
// Mouse wheel zoom
//--------------------------------------------------

viewport.addEventListener("wheel", e => {

    e.preventDefault();

    const factor =
        e.deltaY > 0
            ? 0.8
            : 1.2;

    camera.targetZoom = clampZoom(
        camera.targetZoom * factor
    );

}, {
    passive:false
});
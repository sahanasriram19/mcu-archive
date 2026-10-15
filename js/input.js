import { camera } from "./camera.js";
import { graph } from "./graph.js";
import { getCurrentView, focusPhase, refitView, focusWorld } from "./viewManager.js";
import { getNodeAtScreenPoint } from "./nodeHitTest.js";
import { showMovieDetails } from "./movieDetails.js";
import { nodeScreenRect } from "./nodes.js";
import { edgeAtScreenPoint } from "./connections.js";
import { swayOffset } from "./sway.js";
import { project, projectNode, MAX_PITCH, REST_PITCH } from "./depth.js";

const viewport = document.getElementById("viewport");

const pointers = new Map();
let gestureStartX = 0;
let gestureStartY = 0;
let lastX = 0;
let lastY = 0;
let tapMoved = false;
let pinchDistance = 0;

const CLICK_TOLERANCE = 8;

//--------------------------------------------------
// TILT (js/depth.js)
//
// The map can be tipped back like a table you look
// across:
//   • mouse: drag with the right button, or Shift + drag
//   • touch: slide two fingers up or down together
//     (spreading them apart still zooms)
//   • keyboard: T lays it flat / tips it back to where it
//     opened (REST_PITCH in depth.js)
//--------------------------------------------------

const TILT_PER_PX = 0.0045;       // radians per px of drag (mouse)
const TILT_PER_PX_TOUCH = 0.006;  // ...and of a two-finger slide

// How far two fingers have to move before we decide
// whether they're pinching or sliding together.
const TWO_FINGER_DECIDE_PX = 14;

let tilting = false;              // this mouse drag tilts rather than pans

let twoFingerMode = null;         // null (undecided) | "pinch" | "tilt"
let twoFingerSpread = 0;          // how much the fingers' distance has changed
let twoFingerSlideX = 0;          // ...and how far they've moved together
let twoFingerSlideY = 0;

function clampPitch(value){

    return Math.max(0, Math.min(MAX_PITCH, value));

}

function isUiTarget(target){

    return !!target.closest(
        "#view-panel, .character-dropdown, .search-container, " +
        "#movie-search-results, #movie-details-overlay, " +
        ".character-panel, #countdown, #watch-banner"
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

        tilting = e.pointerType === "mouse" && (e.button === 2 || e.shiftKey);

    } else if(pointers.size === 2){

        const [a,b] = [...pointers.values()];

        pinchDistance = Math.max(
            1,
            distance(a,b)
        );

        twoFingerMode = null;
        twoFingerSpread = twoFingerSlideX = twoFingerSlideY = 0;

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
    // Two fingers: pinch to zoom, or slide together
    // up/down to tilt. Decided once per gesture, from
    // whichever the fingers start doing, so a pinch
    // doesn't also wobble the tilt.
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

        tapMoved = true;

        if(twoFingerMode === null){

            twoFingerSpread += Math.abs(currentDistance - (pinchDistance || currentDistance));
            twoFingerSlideX += dx / 2;
            twoFingerSlideY += dy / 2;

            const slide = Math.abs(twoFingerSlideY);

            if(twoFingerSpread + slide + Math.abs(twoFingerSlideX) > TWO_FINGER_DECIDE_PX){

                twoFingerMode =
                    slide > twoFingerSpread * 1.5 && slide > Math.abs(twoFingerSlideX)
                        ? "tilt"
                        : "pinch";

            }

        }

        if(twoFingerMode === "tilt"){

            // Each finger reports its own move; half of each
            // is the pair's shared movement.
            camera.targetPitch = clampPitch(camera.targetPitch + (dy / 2) * TILT_PER_PX_TOUCH);

            pinchDistance = currentDistance;

            return;

        }

        if(pinchDistance && twoFingerMode === "pinch"){

            const factor =
                currentDistance / pinchDistance;

            camera.targetZoom = clampZoom(
                camera.targetZoom * factor
            );

        }

        pinchDistance = currentDistance;

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
    // Tilt (right-drag / Shift-drag)
    //--------------------------------------------------

    if(tilting){

        camera.targetPitch = clampPitch(camera.targetPitch + dy * TILT_PER_PX);

        return;

    }


    //--------------------------------------------------
    // Pan camera
    //--------------------------------------------------

    // Tipped back, the map's up/down is squashed on screen,
    // so it moves a little further per pixel to stay under
    // the finger.
    const squash = Math.max(0.4, Math.cos(camera.pitch));

    camera.targetX -= dx / camera.zoom;
    camera.targetY -= dy / (camera.zoom * squash);

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

let lastHubFocus = null;          // world whose map a logo click last zoomed into

const HUB_HALF_W = 450;           // Marvel logo size, world units (see hub.js)
const HUB_HALF_H = 200;

// `coarse` = a finger rather than a mouse: bigger targets.
function mindmapTargetAt(clientX, clientY, coarse = false){

    if(getCurrentView() !== "complete") return null;

    // The map is drawn shifted a little with the mouse
    // (js/sway.js): look where it really is.
    const shift = swayOffset("map");

    clientX -= shift.x;
    clientY -= shift.y;

    for(const branch of graph.branchNodes){

        if(!branch.key.startsWith("phase")) continue;

        // Where it's drawn, with depth and tilt (js/depth.js).
        const at = projectNode(branch);

        const radius = Math.max(coarse ? 30 : JUNCTION_HIT_MIN_PX, JUNCTION_HIT_WORLD * camera.zoom * at.s);

        if(Math.hypot(clientX - at.x, clientY - at.y) <= radius){

            return { type: "junction", phase: branch.phase };

        }

    }

    // A logo: one in the middle of the map, or one per world
    // on the combined "Complete MCU" map. Checked before the
    // lines, which start under the logo.
    const hubs = graph.hubs && graph.hubs.length ? graph.hubs : [{ world: null, x: 0, y: 0 }];

    for(const h of hubs){

        const at = project(h.x, h.y, 0);

        if(
            Math.abs(clientX - at.x) <= HUB_HALF_W * camera.zoom * at.s &&
            Math.abs(clientY - at.y) <= HUB_HALF_H * camera.zoom * at.s
        ){

            return { type: "hub", world: hubs.length > 1 ? h.world : null };

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

// Which poster the mouse is on, in any view — nodes.js
// lifts it. Mouse only; touch has no hover, and dragging
// shouldn't lift whatever passes under the finger.
function updateHoverPoster(e, node){

    if(e.pointerType !== "mouse" || pointers.size > 0){

        graph.hoverPoster = null;

        return;

    }

    graph.hoverPoster = (node && !node.isBranch) ? graph.nodes.indexOf(node) : null;

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

        graph.hoverPoster = null;

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

    updateHoverPoster(e, node);


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

    // A right-button press is for tilting, never a click.
    const wasTilt = tilting || e.button === 2;

    if(pointers.size === 1) tilting = false;

    const tapX = e.clientX;
    const tapY = e.clientY;

    pointers.delete(e.pointerId);

    if(pointers.size < 2){

        pinchDistance = 0;

        twoFingerMode = null;

    }


    //--------------------------------------------------
    // Open movie details on a click/tap.
    //--------------------------------------------------

    if(
        wasSinglePointer &&
        !tapMoved &&
        !wasTilt &&
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

            // The card flips out of this poster (js/flip.js),
            // and back onto wherever it is when it closes.
            showMovieDetails(node, { from: () => nodeScreenRect(node, camera) });

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

                // Combined map: a world's logo zooms into that
                // world's map; clicking it again zooms back out.
                // A single world's logo zooms back out to its map.
                if(target.world && lastHubFocus !== target.world){

                    lastHubFocus = target.world;

                    focusWorld(target.world);

                } else {

                    lastHubFocus = null;

                    refitView();

                }

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

        twoFingerMode = null;

        tilting = false;

        tapMoved = true;

    }
);

//--------------------------------------------------
// Tilt extras
//--------------------------------------------------

// Right-drag tilts the map, so no right-click menu over it.
viewport.addEventListener("contextmenu", e => {

    if(!isUiTarget(e.target)) e.preventDefault();

});

// T: lay the map flat, or tip it back to where it opened.
window.addEventListener("keydown", e => {

    if(e.key !== "t" && e.key !== "T") return;

    if(e.ctrlKey || e.metaKey || e.altKey) return;

    if(viewport.style.display === "none") return;

    // Not while typing (the search box).
    const el = document.activeElement;

    if(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;

    camera.targetPitch = camera.targetPitch > 0.05 ? 0 : REST_PITCH;

});

// Back to the landing page: lay the map flat, so the
// hyperspace jump lines its logo up exactly again on the
// way back in (app.js tips it back once it's through).
window.addEventListener("mcu:go-to-landing", () => {

    camera.pitch = camera.targetPitch = 0;

});


//--------------------------------------------------
// Reset cursor when leaving the viewport.
//--------------------------------------------------

viewport.addEventListener(
    "pointerleave",
    () => {

        viewport.style.cursor = "default";

        clearHover();

        graph.hoverPoster = null;

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
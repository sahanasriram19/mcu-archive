import { camera } from "./camera.js";
import { graph } from "./graph.js";
import { getCurrentView } from "./viewManager.js";
import { getNodeAtScreenPoint } from "./nodeHitTest.js";
import { showMovieDetails } from "./movieDetails.js";

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
// Change cursor depending on what is underneath it.
//
// Project/movie nodes get the clickable hand cursor.
// Branch/category nodes and empty space keep the
// normal cursor.
//--------------------------------------------------

function updateCursor(clientX, clientY){

    if(isUiTarget(document.elementFromPoint(clientX, clientY))){

        viewport.style.cursor = "default";

        return;

    }


    const node = getNodeAtScreenPoint(
        clientX,
        clientY,
        camera,
        graph.nodes,
        getCurrentView()
    );


    if(node && !node.isBranch){

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

    updateCursor(
        e.clientX,
        e.clientY
    );

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
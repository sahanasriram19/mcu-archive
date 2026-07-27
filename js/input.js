import { camera } from "./camera.js";
import { graph } from "./graph.js";
import { getCurrentView } from "./viewManager.js";
import { getNodeAtScreenPoint } from "./nodeHitTest.js";
import { showMovieDetails } from "./movieDetails.js";

const viewport = document.getElementById("viewport");

let dragging = false;

let lastX = 0;
let lastY = 0;

// A mousedown/mouseup pair with barely any movement between
// them is a click, not a drag-to-pan — this is what decides
// which one happened.
let downX = 0;
let downY = 0;

const CLICK_TOLERANCE = 6;

viewport.addEventListener("mousedown", e => {

    dragging = true;

    lastX = e.clientX;
    lastY = e.clientY;

    downX = e.clientX;
    downY = e.clientY;

});

window.addEventListener("mouseup", e => {

    dragging = false;

    const moved = Math.hypot(e.clientX - downX, e.clientY - downY);

    if(moved > CLICK_TOLERANCE) return;

    const node = getNodeAtScreenPoint(

        e.clientX,
        e.clientY,
        camera,
        graph.nodes,
        getCurrentView()

    );

    if(node) showMovieDetails(node);

});

window.addEventListener("mousemove", e => {

    if (!dragging){

        // Not panning — check whether the cursor is sitting
        // over a poster, and swap in a pointer cursor if so,
        // same idea as the close button already does via CSS
        // (posters live on the canvas, not as DOM elements,
        // so that has to happen here in JS instead).
        const hovering = getNodeAtScreenPoint(

            e.clientX,
            e.clientY,
            camera,
            graph.nodes,
            getCurrentView()

        );

        viewport.style.cursor = hovering ? "pointer" : "default";

        return;

    }

    const dx = e.clientX - lastX;

    const dy = e.clientY - lastY;

    camera.targetX -= dx / camera.zoom;

    camera.targetY -= dy / camera.zoom;

    lastX = e.clientX;
    lastY = e.clientY;

});

viewport.addEventListener("wheel", e => {

    e.preventDefault();

    const factor = e.deltaY > 0 ? 0.8 : 1.2;

    camera.targetZoom *= factor;

    camera.targetZoom = Math.max(
        camera.minZoom,
        Math.min(camera.maxZoom, camera.targetZoom)
    );

}, { passive: false });
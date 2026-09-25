//==================================================
// 3D TILT
//
// Cards lean towards the mouse, with a soft light that
// follows it, as if they were real objects on a desk:
//
//   • the countdown cards (top right)
//   • the small posters in "Watch before this"
//   • the big poster in the details card, which drifts
//     a little inside its frame instead of tilting
//
// Mouse only — touch screens have nothing to follow — and
// off when the OS asks for reduced motion. The look lives
// in css/tilt.css; this file only sets four CSS variables
// on whatever is under the pointer:
//
//   --rx, --ry   tilt in degrees
//   --gx, --gy   where the light sits (percent)
//==================================================

const TARGETS = ".countdown-card, .watch-poster, #movie-details-poster";

const MAX_TILT = 10;          // degrees at the card's edge
const POSTER_DRIFT = 10;      // px the details poster drifts

const canHover = window.matchMedia("(hover: hover) and (pointer: fine)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let current = null;

let frame = 0;

let lastEvent = null;

function reset(el){

    el.classList.remove("tilting");

    el.style.removeProperty("--rx");
    el.style.removeProperty("--ry");
    el.style.removeProperty("--px");
    el.style.removeProperty("--py");

}

function apply(){

    frame = 0;

    if(!current || !lastEvent) return;

    const r = current.getBoundingClientRect();

    // -0.5 .. 0.5 across the card
    const nx = (lastEvent.clientX - r.left) / r.width - 0.5;
    const ny = (lastEvent.clientY - r.top) / r.height - 0.5;

    current.style.setProperty("--gx", ((nx + 0.5) * 100).toFixed(1) + "%");
    current.style.setProperty("--gy", ((ny + 0.5) * 100).toFixed(1) + "%");

    if(current.id === "movie-details-poster"){

        // The art moves against the pointer, like looking
        // through a window.
        current.style.setProperty("--px", (-nx * POSTER_DRIFT).toFixed(1) + "px");
        current.style.setProperty("--py", (-ny * POSTER_DRIFT).toFixed(1) + "px");

    } else {

        current.style.setProperty("--rx", (-ny * MAX_TILT).toFixed(2) + "deg");
        current.style.setProperty("--ry", (nx * MAX_TILT).toFixed(2) + "deg");

    }

    current.classList.add("tilting");

}

function onMove(e){

    if(!canHover.matches || reduceMotion.matches || e.pointerType !== "mouse") return;

    const el = e.target instanceof Element ? e.target.closest(TARGETS) : null;

    if(el !== current){

        if(current) reset(current);

        current = el;

    }

    if(!current) return;

    lastEvent = e;

    if(!frame) frame = requestAnimationFrame(apply);

}

export function initTilt(){

    document.addEventListener("pointermove", onMove, { passive: true });

    // Leaving the window: settle whatever was tilted.
    document.addEventListener("pointerleave", () => {

        if(current) reset(current);

        current = null;

    });

    document.documentElement.addEventListener("mouseleave", () => {

        if(current) reset(current);

        current = null;

    });

}
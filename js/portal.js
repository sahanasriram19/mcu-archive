//==================================================
// PORTAL BETWEEN WORLDS
//
// Switching worlds (MCU ↔ X-Men ↔ Spider-Man) flies you
// through a glowing ring in the new world's colour: the
// ring opens in the middle of the screen as the map zooms
// towards it and rushes past you, and the new world's map
// zooms out into view on the other side.
//
// The new world is laid out just as the ring passes the
// edges of the screen (the `swap` callback), while the map
// is zoomed right in. Off with the OS "reduce motion"
// setting.
//==================================================

import { camera } from "./camera.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

// Each world's ring colour (matches its dot in the view
// panel).
const COLOURS = {
    mcu:    "230,36,41",
    xmen:   "250,204,21",
    spider: "70,150,255"
};

const el = document.createElement("div");

el.id = "world-portal";

el.innerHTML = `<div class="wp-ring"></div>`;

document.body.appendChild(el);

const ring = el.querySelector(".wp-ring");

let busy = false;

export function canPortal(){

    return !reduceMotion.matches;

}

// Plays the portal into `world`; calls swap() as the ring
// passes you. Resolves once it has gone.
export async function worldPortal(world, swap){

    if(busy){ swap(); return; }

    busy = true;

    el.style.setProperty("--wc", COLOURS[world] || COLOURS.mcu);

    el.classList.add("show");

    // The map rushes towards the ring.
    camera.targetZoom = Math.min(camera.maxZoom, camera.zoom * 3);

    // The ring opens in the middle, then rushes past the
    // edges of the screen, fading as it goes.
    const ringAnim = ring.animate(
        [
            { transform: "translate(-50%,-50%) scale(.12)", opacity: 0 },
            { transform: "translate(-50%,-50%) scale(1)", opacity: 1, offset: .4 },
            { transform: "translate(-50%,-50%) scale(7)", opacity: 0 }
        ],
        { duration: 750, easing: "cubic-bezier(.5,0,.85,.5)", fill: "forwards" }
    );

    await ringAnim.finished.catch(() => {});

    // Through: lay out the new world...
    swap();

    // ...starting zoomed right in, so it eases out into view.
    camera.zoom = Math.min(camera.maxZoom, camera.targetZoom * 2.2);

    ringAnim.cancel();

    el.classList.remove("show");

    busy = false;

}
//==================================================
//
// ENERGY PARTICLES
//
//==================================================

import { ctx } from "./renderer.js";
import { universe } from "./state.js";

import {

    worldToScreen

} from "./utils.js";

//==================================================

// Halo images, one per colour, drawn once.
const halos = new Map();

function haloFor(colour){

    let h = halos.get(colour);

    if (h) return h;

    const size = 64;

    h = document.createElement("canvas");

    h.width = h.height = size;

    const c = h.getContext("2d");

    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    g.addColorStop(0, `rgba(${colour},1)`);
    g.addColorStop(0.45, `rgba(${colour},0.35)`);
    g.addColorStop(1, "rgba(0,0,0,0)");

    c.fillStyle = g;

    c.fillRect(0, 0, size, size);

    halos.set(colour, h);

    return h;

}

export function drawEnergy(camera) {

    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    const width = universe.width;
    const height = universe.height;

    // Zoomed out (e.g. the Complete MCU map) these glowing
    // specks crowd the screen, so only every other one is
    // drawn there.
    const step = camera.zoom < 0.5 ? 2 : 1;

    for (let i = 0; i < universe.energy.length; i += step) {

        const e = universe.energy[i];

        e.angle += e.speed;

        const x =

            e.x +

            Math.cos(e.angle) * e.orbit;

        const y =

            e.y +

            Math.sin(e.angle * 1.4) * e.orbit;

        const screen = worldToScreen(

            x,

            y,

            camera,

            e.depth,

            width,
            height

        );

        if (

            screen.x < -120 ||
            screen.x > width + 120 ||
            screen.y < -120 ||
            screen.y > height + 120

        ) {
            continue;
        }

        const pulse =

            0.7 +

            Math.sin(e.angle * 4) * 0.3;

        //----------------------------------
        // Glow
        //----------------------------------

        // From one pre-drawn halo per colour, instead of a
        // new gradient per speck per frame.
        const size = e.radius * 28;

        ctx.globalAlpha = e.alpha * pulse;

        ctx.drawImage(haloFor(e.colour), screen.x - size / 2, screen.y - size / 2, size, size);

        ctx.globalAlpha = 1;

        //----------------------------------
        // Core
        //----------------------------------

        ctx.beginPath();

        ctx.arc(

            screen.x,

            screen.y,

            e.radius,

            0,

            Math.PI * 2

        );

        ctx.fillStyle = `rgba(${e.colour},1)`;

        ctx.fill();

    }

    ctx.restore();

}
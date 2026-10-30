//==================================================
//
// ENERGY PARTICLES
//
//==================================================

import { ctx } from "./renderer.js";
import { universe } from "./state.js";

import {

    screenCopies,
    steadyOrder,
    keepFade

} from "./utils.js";
import { CONFIG } from "./config.js";
import { starsHidden, captureExtra } from "./stars.js";

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

// Most glowing specks on screen at once, for a 1400 x 860
// screen (see MAX_STARS_ON_SCREEN in stars.js).
const MAX_SPECKS_ON_SCREEN = 10;

export function drawEnergy(camera) {

    // (The jump into the archive is drawing them, js/warp.js.)
    if (starsHidden()) return;

    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    const width = universe.width;
    const height = universe.height;

    // Zoomed out (e.g. the Complete MCU map) these glowing
    // specks crowd the screen, so only every other one is
    // drawn there.
    // Further out still (the combined MCU map), fewer again,
    // so the field doesn't fill up as more of it shows.
    // Calm (zoomed out in the archive, see universe.js):
    // half as many again, and fainter.
    const calm = universe.calm || 0;

    // (Worked out smoothly, and always keeping the same
    // specks — STEADY THINNING in utils.js — so they don't
    // flicker as you zoom.)
    const zoomThin = camera.zoom < 0.5 ? Math.max(2, 0.1 / camera.zoom) : 1;

    // (Eased in between: at 0.5 zoom the thinning used to jump
    // straight from 1 to 2.)
    const thin = (camera.zoom < 0.5 ? zoomThin : 1 + Math.max(0, Math.min(1, (0.6 - camera.zoom) / 0.1)))
        * (1 + calm);

    const period = CONFIG.WORLD_SIZE * 2;
    const tiles = (width / camera.zoom) * (height / camera.zoom) / (period * period);
    const cap = MAX_SPECKS_ON_SCREEN * (width * height) / (1400 * 860);

    const keep = Math.min(universe.energy.length / thin, cap / Math.max(tiles, 1e-6));

    const order = steadyOrder(universe.energy);

    const count = Math.min(order.length, Math.ceil(keep));

    // Their circling is in world units, so zoomed out (the
    // archive) it shrank to nothing: scaled up to look the
    // same as on the landing page (see stars.js).
    const orbitScale = Math.max(1, 0.28 / Math.max(camera.zoom, 0.001));

    for (let k = 0; k < count; k++) {

        const e = universe.energy[order[k]];

        const shown = keepFade(k, keep);

        if (shown <= 0) continue;

        e.angle += e.speed;

        const x =

            e.x +

            Math.cos(e.angle) * e.orbit * orbitScale;

        const y =

            e.y +

            Math.sin(e.angle * 1.4) * e.orbit * orbitScale;

        for (const screen of screenCopies(x, y, camera, e.depth, width, height, 120, CONFIG.WORLD_SIZE)) {

        const pulse =

            0.7 +

            Math.sin(e.angle * 4) * 0.3;

        //----------------------------------
        // Glow
        //----------------------------------

        // From one pre-drawn halo per colour, instead of a
        // new gradient per speck per frame.
        const size = e.radius * 28;

        // The jump into the archive turns these into coloured
        // streaks too (js/warp.js).
        captureExtra({ x: screen.x, y: screen.y, r: e.radius, rgb: e.colour, glow: size });

        ctx.globalAlpha = e.alpha * pulse * (1 - 0.5 * calm) * shown;

        ctx.drawImage(haloFor(e.colour), screen.x - size / 2, screen.y - size / 2, size, size);

        ctx.globalAlpha = shown;

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

    }

    ctx.restore();

}
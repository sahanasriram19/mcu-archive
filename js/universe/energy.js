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

export function drawEnergy(camera) {

    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    const width = universe.width;
    const height = universe.height;

    for (const e of universe.energy) {

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

        const glow = ctx.createRadialGradient(

            screen.x,

            screen.y,

            0,

            screen.x,

            screen.y,

            e.radius * 14

        );

        glow.addColorStop(
            0,
            `rgba(${e.colour},${e.alpha * pulse})`
        );

        glow.addColorStop(
            0.45,
            `rgba(${e.colour},${e.alpha * 0.25})`
        );

        glow.addColorStop(
            1,
            "rgba(0,0,0,0)"
        );

        ctx.fillStyle = glow;

        ctx.beginPath();

        ctx.arc(

            screen.x,

            screen.y,

            e.radius * 14,

            0,

            Math.PI * 2

        );

        ctx.fill();

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
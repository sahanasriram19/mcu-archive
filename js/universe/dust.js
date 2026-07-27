//==================================================
//
// SPACE DUST
//
//==================================================

import { ctx } from "./renderer.js";
import { universe } from "./state.js";

import {

    worldToScreen

} from "./utils.js";

//==================================================

export function drawDust(camera) {

    ctx.save();

    ctx.globalCompositeOperation = "screen";

    const width = universe.width;
    const height = universe.height;

    for (const dust of universe.dust) {

        dust.angle += dust.speed;

        const screen = worldToScreen(

            dust.x + Math.cos(dust.angle) * 30,
            dust.y + Math.sin(dust.angle) * 30,

            camera,

            dust.depth,

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

        const glow = ctx.createRadialGradient(

            screen.x,

            screen.y,

            0,

            screen.x,

            screen.y,

            dust.radius

        );

        glow.addColorStop(
            0,
            `rgba(255,255,255,${dust.alpha})`
        );

        glow.addColorStop(
            0.5,
            `rgba(180,220,255,${dust.alpha * 0.35})`
        );

        glow.addColorStop(
            1,
            "rgba(255,255,255,0)"
        );

        ctx.fillStyle = glow;

        ctx.beginPath();

        ctx.arc(

            screen.x,

            screen.y,

            dust.radius,

            0,

            Math.PI * 2

        );

        ctx.fill();

    }

    ctx.restore();

}

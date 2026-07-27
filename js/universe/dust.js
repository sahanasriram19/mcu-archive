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

        // A radial gradient here used to be recreated for
        // every one of these particles, every frame — for
        // something this small the visual difference from a
        // gradient is negligible, but the allocation cost
        // (700 CanvasGradient objects, 60 times a second)
        // wasn't. A flat fill does effectively the same job.
        ctx.fillStyle = `rgba(210,230,255,${dust.alpha * 0.8})`;

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
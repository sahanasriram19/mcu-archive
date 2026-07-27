//==================================================
//
// NEBULAS
//
//==================================================

import { ctx } from "./renderer.js";
import { universe } from "./state.js";

import {

    worldToScreen

} from "./utils.js";

//==================================================

export function drawNebulas(camera) {

    ctx.save();

    ctx.globalCompositeOperation = "screen";

    const width = universe.width;
    const height = universe.height;

    for (const n of universe.nebulas) {

        n.angle += n.speed;

        const screen = worldToScreen(

            n.x + Math.cos(n.angle) * 120,
            n.y + Math.sin(n.angle * .8) * 120,

            camera,

            n.depth,

            width,
            height

        );

        if (

            screen.x < -n.radius ||
            screen.x > width + n.radius ||
            screen.y < -n.radius ||
            screen.y > height + n.radius

        ) {
            continue;
        }

        for (let i = 0; i < 7; i++) {

            const offsetX = Math.cos(

                i * 1.3 + n.angle

            ) * n.radius * .18;

            const offsetY = Math.sin(

                i * 1.6 + n.angle

            ) * n.radius * .18;

            // Fixed per-blob variation (was Math.random()
            // called fresh every frame for every one of the
            // ~700 blobs on screen — that constant re-roll
            // was the flicker, independent of reloads).
            const radius = n.radius * (.55 + (i % 4) * 0.05);

            const g = ctx.createRadialGradient(

                screen.x + offsetX,

                screen.y + offsetY,

                0,

                screen.x + offsetX,

                screen.y + offsetY,

                radius

            );

            g.addColorStop(

                0,

                `rgba(${n.colour},${n.alpha})`

            );

            g.addColorStop(

                .45,

                `rgba(${n.colour},${n.alpha * .28})`

            );

            g.addColorStop(

                1,

                "rgba(0,0,0,0)"

            );

            ctx.fillStyle = g;

            ctx.beginPath();

            ctx.arc(

                screen.x + offsetX,

                screen.y + offsetY,

                radius,

                0,

                Math.PI * 2

            );

            ctx.fill();

        }

    }

    ctx.restore();

}

//==================================================
// (Ambient foreground "embers" layer removed — it
// was screen-space and never moved or scaled with
// the camera, which is what read as a flicker along
// the edges while zooming slowly.)
//==================================================
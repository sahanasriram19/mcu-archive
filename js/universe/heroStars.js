//==================================================
//
// HERO STAR RENDERER
//
//==================================================

import { ctx } from "./renderer.js";
import { universe } from "./state.js";

import {

    worldToScreen

} from "./utils.js";

//==================================================

export function drawHeroStars(camera) {

    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    const width = universe.width;
    const height = universe.height;

    for (const star of universe.heroStars) {

        star.twinkle += star.speed;

        const pulse =

            0.85 +

            Math.sin(star.twinkle) * 0.15;

        const screen = worldToScreen(

            star.x,
            star.y,
            camera,
            star.depth,
            width,
            height

        );

        if (

            screen.x < -250 ||
            screen.x > width + 250 ||
            screen.y < -250 ||
            screen.y > height + 250

        ) {
            continue;
        }

        //----------------------------------
        // Large glow
        //----------------------------------

        const glow = ctx.createRadialGradient(

            screen.x,
            screen.y,
            0,

            screen.x,
            screen.y,

            star.glow

        );

        glow.addColorStop(
            0,
            `rgba(255,255,255,${0.16 * pulse})`
        );

        glow.addColorStop(
            0.25,
            `rgba(170,210,255,${0.05 * pulse})`
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

            star.glow,

            0,

            Math.PI * 2

        );

        ctx.fill();

        //----------------------------------
        // Bright centre
        //----------------------------------

        ctx.beginPath();

        ctx.arc(

            screen.x,

            screen.y,

            star.radius,

            0,

            Math.PI * 2

        );

        ctx.fillStyle = star.colour;

        ctx.fill();

        //----------------------------------
        // Four spikes
        //----------------------------------

        ctx.strokeStyle = "#FFFFFF";

        ctx.lineWidth = 0.6;

        ctx.beginPath();

        ctx.moveTo(screen.x - 10, screen.y);

        ctx.lineTo(screen.x + 10, screen.y);

        ctx.moveTo(screen.x, screen.y - 10);

        ctx.lineTo(screen.x, screen.y + 10);

        ctx.stroke();

    }

    ctx.restore();

}
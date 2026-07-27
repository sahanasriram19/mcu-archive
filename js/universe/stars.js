//==================================================
//
// STAR RENDERER
//
//==================================================

import { ctx } from "./renderer.js";
import { universe } from "./state.js";

import {

    worldToScreen,
    clamp

} from "./utils.js";

//==================================================

export function drawStars(camera) {

    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    const width = universe.width;
    const height = universe.height;

    //------------------------------------------
    // Density thinning
    //
    // With ~26,000 stars all additively blended,
    // zooming out puts nearly all of them on screen
    // at once and the overlap washes the screen out
    // white. Rather than fade/tint the whole scene,
    // simply draw fewer of them the further out you
    // are — a stable, index-based skip (not random,
    // so it doesn't shimmer frame to frame).
    //------------------------------------------

    const skip = camera.zoom >= 0.9
        ? 1
        : Math.max(1, Math.round(1 / (camera.zoom * 1.6)));

    const stars = universe.stars;

    for (let idx = 0; idx < stars.length; idx += skip) {

        const star = stars[idx];

        //------------------------------------------
        // Twinkle
        //------------------------------------------

        star.twinkle += star.speed;

        const t = universe.time * 0.00025;

        const worldX =
            star.baseX +
            Math.cos(t + star.driftOffset) *
            star.driftRadius;

        const worldY =
            star.baseY +
            Math.sin(t + star.driftOffset * 1.35) *
            star.driftRadius;

        const screen = worldToScreen(

            worldX,
            worldY,
            camera,
            star.depth,
            width,
            height

        );

        if (

            screen.x < -300 ||
            screen.x > width + 300 ||
            screen.y < -300 ||
            screen.y > height + 300

        ) {
            continue;
        }

        const pulse =

            0.75 +

            Math.sin(

                star.twinkle

            ) * 0.25;

        const radius = clamp(

            star.radius *

            (0.9 + pulse * 0.2),

            0.4,

            3.5

        );

        //------------------------------------------
        // Glow
        //------------------------------------------

        if (radius > 1) {

            const glow = ctx.createRadialGradient(

                screen.x,
                screen.y,
                0,

                screen.x,
                screen.y,

                radius * 10

            );

            glow.addColorStop(
                0,
                `rgba(255,255,255,${0.18 * pulse})`
            );

            glow.addColorStop(
                0.4,
                `rgba(170,210,255,${0.06 * pulse})`
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

                radius * 10,

                0,

                Math.PI * 2

            );

            ctx.fill();

        }

        //------------------------------------------
        // Star Types
        //------------------------------------------

        switch (star.type) {

            //----------------------------------
            // Tiny Dot
            //----------------------------------

            case 0:

                ctx.beginPath();

                ctx.arc(

                    screen.x,
                    screen.y,

                    radius,

                    0,

                    Math.PI * 2

                );

                ctx.fillStyle = star.colour;

                ctx.fill();

                break;

            //----------------------------------
            // Cross Star
            //----------------------------------

            case 1:

                ctx.strokeStyle = star.colour;

                ctx.lineWidth = 0.7;

                ctx.beginPath();

                ctx.moveTo(screen.x - 5, screen.y);

                ctx.lineTo(screen.x + 5, screen.y);

                ctx.moveTo(screen.x, screen.y - 5);

                ctx.lineTo(screen.x, screen.y + 5);

                ctx.stroke();

                ctx.beginPath();

                ctx.arc(

                    screen.x,

                    screen.y,

                    radius,

                    0,

                    Math.PI * 2

                );

                ctx.fillStyle = star.colour;

                ctx.fill();

                break;

            //----------------------------------
            // Diamond Star
            //----------------------------------

            case 2: {

                const d = radius * 3;

                ctx.beginPath();

                ctx.moveTo(screen.x, screen.y - d);

                ctx.lineTo(screen.x + d, screen.y);

                ctx.lineTo(screen.x, screen.y + d);

                ctx.lineTo(screen.x - d, screen.y);

                ctx.closePath();

                ctx.fillStyle = star.colour;

                ctx.fill();

                break;

            }

            //----------------------------------
            // Bright Hero Style
            //----------------------------------

            default:

                ctx.beginPath();

                ctx.arc(

                    screen.x,

                    screen.y,

                    radius + 0.8,

                    0,

                    Math.PI * 2

                );

                ctx.fillStyle = "#FFFFFF";

                ctx.fill();

                ctx.strokeStyle = "#FFFFFF";

                ctx.lineWidth = 0.5;

                ctx.beginPath();

                ctx.moveTo(screen.x - 7, screen.y);

                ctx.lineTo(screen.x + 7, screen.y);

                ctx.moveTo(screen.x, screen.y - 7);

                ctx.lineTo(screen.x, screen.y + 7);

                ctx.stroke();

                break;

        }

    }

    ctx.restore();

}

//==================================================
// LIGHT RAYS
// (available effect from Universe Engine V3 — not
// currently wired into the render loop; call
// drawLightRays() from js/universe.js if you want it)
//==================================================

export function drawLightRays() {

    ctx.save();

    ctx.globalAlpha = .08;

    const width = universe.width;
    const height = universe.height;

    for (let i = 0; i < 7; i++) {

        ctx.save();

        ctx.translate(

            width / 2,

            height / 2

        );

        ctx.rotate(

            universe.time * .01 + i

        );

        const gradient = ctx.createLinearGradient(

            0,

            -1200,

            0,

            1200

        );

        gradient.addColorStop(

            0,

            "rgba(255,255,255,0)"

        );

        gradient.addColorStop(

            .5,

            "rgba(170,210,255,.18)"

        );

        gradient.addColorStop(

            1,

            "rgba(255,255,255,0)"

        );

        ctx.fillStyle = gradient;

        ctx.fillRect(

            -70,

            -1200,

            140,

            2400

        );

        ctx.restore();

    }

    ctx.restore();

}
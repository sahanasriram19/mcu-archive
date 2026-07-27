//==================================================
//
// SHOOTING STARS
//
//==================================================

import { ctx } from "./renderer.js";
import { universe } from "./state.js";

function random(min, max) {

    return Math.random() * (max - min) + min;

}

//==================================================

function spawn(star) {

    const width = universe.width;
    const height = universe.height;

    const edge = Math.floor(Math.random() * 4);

    const speed = random(8, 15);

    star.length = random(90, 150);
    star.thickness = random(2, 3.5);
    star.brightness = random(.7, 1);

    if (edge === 0) {

        // LEFT

        star.x = -400;
        star.y = random(-100, height + 100);

        const angle = random(-25, 25) * Math.PI / 180;

        star.vx = Math.cos(angle) * speed;
        star.vy = Math.sin(angle) * speed;

    }

    else if (edge === 1) {

        // RIGHT

        star.x = width + 400;
        star.y = random(-100, height + 100);

        const angle = Math.PI + random(-25, 25) * Math.PI / 180;

        star.vx = Math.cos(angle) * speed;
        star.vy = Math.sin(angle) * speed;

    }

    else if (edge === 2) {

        // TOP

        star.x = random(-100, width + 100);
        star.y = -400;

        const angle = Math.PI / 2 + random(-25, 25) * Math.PI / 180;

        star.vx = Math.cos(angle) * speed;
        star.vy = Math.sin(angle) * speed;

    }

    else {

        // BOTTOM

        star.x = random(-100, width + 100);
        star.y = height + 400;

        const angle = -Math.PI / 2 + random(-25, 25) * Math.PI / 180;

        star.vx = Math.cos(angle) * speed;
        star.vy = Math.sin(angle) * speed;

    }

    star.active = true;

}

//==================================================

export function drawShootingStars() {

    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    const width = universe.width;
    const height = universe.height;

    universe.shootingStars.forEach(star => {

        //----------------------------------
        // WAIT / SPAWN
        //----------------------------------

        if (!star.active) {

            star.timer--;

            if (star.timer <= 0) {

                spawn(star);

            }

            return;

        }

        //----------------------------------
        // MOVE
        //----------------------------------

        star.x += star.vx;
        star.y += star.vy;

        //----------------------------------
        // OFFSCREEN — only reset after leaving screen
        //----------------------------------

        if (

            star.x < -600 ||
            star.x > width + 600 ||
            star.y < -600 ||
            star.y > height + 600

        ) {

            star.active = false;

            star.timer = random(120, 700);

            return;

        }

        //----------------------------------
        // DIRECTION / TRAIL
        //----------------------------------

        const angle = Math.atan2(

            star.vy,

            star.vx

        );

        const tailX =

            Math.cos(angle) * star.length;

        const tailY =

            Math.sin(angle) * star.length;

        const gradient = ctx.createLinearGradient(

            star.x - tailX,

            star.y - tailY,

            star.x,

            star.y

        );

        gradient.addColorStop(

            0,

            "rgba(255,255,255,0)"

        );

        gradient.addColorStop(

            .35,

            `rgba(170,210,255,${
                star.brightness * .35
            })`

        );

        gradient.addColorStop(

            1,

            `rgba(255,255,255,${
                star.brightness
            })`

        );

        ctx.strokeStyle = gradient;

        ctx.lineWidth = star.thickness;

        ctx.lineCap = "round";

        ctx.beginPath();

        ctx.moveTo(

            star.x - tailX,

            star.y - tailY

        );

        ctx.lineTo(

            star.x,

            star.y

        );

        ctx.stroke();

        //----------------------------------
        // HEAD GLOW
        //----------------------------------

        const glow = ctx.createRadialGradient(

            star.x,

            star.y,

            0,

            star.x,

            star.y,

            14

        );

        glow.addColorStop(

            0,

            "rgba(255,255,255,1)"

        );

        glow.addColorStop(

            .4,

            "rgba(170,220,255,.45)"

        );

        glow.addColorStop(

            1,

            "rgba(0,0,0,0)"

        );

        ctx.fillStyle = glow;

        ctx.beginPath();

        ctx.arc(

            star.x,

            star.y,

            14,

            0,

            Math.PI * 2

        );

        ctx.fill();

    });

    ctx.restore();

}

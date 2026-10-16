//==================================================
//
// STAR RENDERER
//
//==================================================
import { ctx } from "./renderer.js";
import { universe } from "./state.js";

import {

    screenCopies,
    clamp

} from "./utils.js";
import { CONFIG } from "./config.js";

// The landing page's starfield zoom (js/intro.js STAR_ZOOM):
// the stars' drift is set to look right at this zoom.
const LANDING_ZOOM = 0.28;

//==================================================
// Star halo image — the same gradient every bright star
// used to build for itself each frame (white centre, a
// faint blue edge), drawn once and reused.
//==================================================

let glow = null;

function glowSprite(){

    if (glow) return glow;

    const size = 64;

    glow = document.createElement("canvas");

    glow.width = glow.height = size;

    const c = glow.getContext("2d");

    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    g.addColorStop(0, "rgba(255,255,255,0.18)");
    g.addColorStop(0.4, "rgba(170,210,255,0.06)");
    g.addColorStop(1, "rgba(0,0,0,0)");

    c.fillStyle = g;

    c.fillRect(0, 0, size, size);

    return glow;

}

//==================================================

//--------------------------------------------------
// The jump into the archive (js/warp.js) turns the stars
// on screen into its streaks: it asks where they all are
// (captureStars), then hides them here while it draws them
// itself, rushing past.
//--------------------------------------------------

let hidden = false;
let capture = null;          // filled during the next draw
let captureDone = null;

export function setStarsHidden(on){

    hidden = on;

}

// Resolves after the next frame with every star drawn on
// screen: { x, y, r (radius px), colour }.
export function captureStars(){

    capture = [];

    return new Promise(resolve => { captureDone = resolve; });

}

// Most stars on screen at once, for a 1400 x 860 screen
// (scaled to the real one). Zoomed out, the starfield
// repeats like tiles to fill the screen, so without a cap
// the further out you go the more stars pile up.
const MAX_STARS_ON_SCREEN = 50;

export function drawStars(camera) {

    if (hidden) return;

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

    // (The divisor was 1.6; 0.6 draws about a third as
    // many when zoomed out, e.g. on the Complete MCU map.)
    const thin = camera.zoom >= 0.9
        ? 1
        : Math.max(1, Math.round(1 / (camera.zoom * 0.6)));

    // ...and never more than the cap, counting every repeat
    // of the field that's on screen.
    const period = CONFIG.WORLD_SIZE * 2;
    const tiles = (width / camera.zoom) * (height / camera.zoom) / (period * period);
    const cap = MAX_STARS_ON_SCREEN * (width * height) / (1400 * 860);

    const skip = Math.max(thin, Math.ceil(universe.stars.length * tiles / cap));

    // How much bigger the drift is when zoomed further out
    // than the landing page (see driftAmount below).
    const driftScale = Math.max(1, LANDING_ZOOM / Math.max(camera.zoom, 0.001));

    const stars = universe.stars;

    for (let idx = 0; idx < stars.length; idx += skip) {

        const star = stars[idx];

        //------------------------------------------
        // Twinkle
        //------------------------------------------

        star.twinkle += star.speed;

        const t = universe.time * 0.008;

        // The drift is in world units, so it used to shrink to
        // almost nothing in the zoomed-out archive (the stars
        // floated on the landing page but sat still on the
        // map). Scaled up when zoomed out, it looks the same
        // everywhere.
        const driftAmount =
            250 * (0.3 + star.depth) * driftScale;

        const worldX =
            star.baseX +
            Math.cos(t + star.driftOffset) *
            driftAmount;

        const worldY =
            star.baseY +
            Math.sin(t * 0.7 + star.driftOffset * 1.2) *
            driftAmount * 0.6;

        for (const screen of screenCopies(worldX, worldY, camera, star.depth, width, height, 300, CONFIG.WORLD_SIZE)) {

        // Calmer zoomed out in the archive (universe.calm,
        // see universe.js): a gentler twinkle.
        const calm = universe.calm || 0;

        const pulse =

            0.75 +

            Math.sin(

                star.twinkle

            ) * 0.25 * (1 - 0.6 * calm);

        const radius = clamp(

            star.radius *

            (0.9 + pulse * 0.2),

            0.4,

            3.5

        );

        if (capture) capture.push({ x: screen.x, y: screen.y, r: radius, colour: star.colour });


        //------------------------------------------
        // Glow
        //------------------------------------------

        if (radius > 1) {

            // A soft halo, from one pre-drawn image rather than
            // a new gradient per star per frame.
            const size = radius * 20;

            // (Softer halos when calm.)
            ctx.globalAlpha = pulse * (1 - 0.5 * calm);

            ctx.drawImage(glowSprite(), screen.x - size / 2, screen.y - size / 2, size, size);

            ctx.globalAlpha = 1;

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
            // Plain star (was a cross)
            //----------------------------------

            case 1:

                // Was a dot with four thin lines through it;
                // now just the dot.
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

                // (Its four spike lines were removed.)

                break;

        }

        }

    }

    if (capture && captureDone) {

        const found = capture;

        capture = null;

        captureDone(found);

        captureDone = null;

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
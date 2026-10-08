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

// The offscreen image is drawn at 1/16 size: the blobs are
// pure soft gradients, so scaling them back up loses
// nothing you can see.
const SPRITE_SCALE = 16;

// Repaint a nebula's image once its slow drift has moved
// this far (radians) — every few seconds.
const SPRITE_REFRESH = 0.02;

function paintBlobs(target, n, cx, cy, scale){

    for (let i = 0; i < 7; i++) {

        const offsetX = Math.cos(i * 1.3 + n.angle) * n.radius * .18 / scale;
        const offsetY = Math.sin(i * 1.6 + n.angle) * n.radius * .18 / scale;

        // Fixed per-blob variation (Math.random() fresh every
        // frame used to make them flicker).
        const radius = n.radius * (.55 + (i % 4) * 0.05) / scale;

        const g = target.createRadialGradient(
            cx + offsetX, cy + offsetY, 0,
            cx + offsetX, cy + offsetY, radius
        );

        g.addColorStop(0, `rgba(${n.colour},${n.alpha})`);
        g.addColorStop(.45, `rgba(${n.colour},${n.alpha * .28})`);
        g.addColorStop(1, "rgba(0,0,0,0)");

        target.fillStyle = g;

        target.beginPath();
        target.arc(cx + offsetX, cy + offsetY, radius, 0, Math.PI * 2);
        target.fill();

    }

}

function nebulaSprite(n){

    if (n.sprite && Math.abs(n.angle - n.sprite.angle) < SPRITE_REFRESH) {

        return n.sprite;

    }

    // Blobs reach at most .18 + .7 of the radius from the
    // centre.
    const half = Math.ceil(n.radius * 0.9 / SPRITE_SCALE);

    const canvas = n.sprite ? n.sprite.canvas : document.createElement("canvas");

    // (Setting the size also clears it.)
    canvas.width = canvas.height = half * 2;

    const c = canvas.getContext("2d");

    c.globalCompositeOperation = "screen";

    paintBlobs(c, n, half, half, SPRITE_SCALE);

    n.sprite = { canvas, half, angle: n.angle };

    return n.sprite;

}

//==================================================

// The nebulas are drawn into this small screen-shaped
// image first (a quarter of the screen's size each way),
// then stretched over the screen in one go. They're pure
// soft glows, so it looks the same — but it's far less work
// than painting two huge pictures across the whole screen
// every frame, which was the single heaviest thing drawn
// while the archive opened.
const BUFFER_SCALE = 0.25;

let buffer = null;
let bufferCtx = null;

export function drawNebulas(camera) {

    const width = universe.width;
    const height = universe.height;

    const bw = Math.max(1, Math.ceil(width * BUFFER_SCALE));
    const bh = Math.max(1, Math.ceil(height * BUFFER_SCALE));

    if (!buffer) {

        buffer = document.createElement("canvas");
        bufferCtx = buffer.getContext("2d");

    }

    if (buffer.width !== bw || buffer.height !== bh) {

        buffer.width = bw;
        buffer.height = bh;

    } else {

        bufferCtx.setTransform(1, 0, 0, 1, 0, 0);
        bufferCtx.clearRect(0, 0, bw, bh);

    }

    bufferCtx.setTransform(BUFFER_SCALE, 0, 0, BUFFER_SCALE, 0, 0);

    // "lighter" (adds light) rather than "screen": on this
    // dark background they look the same, but "screen" makes
    // the graphics card copy the whole screen for every
    // nebula on every frame.
    bufferCtx.globalCompositeOperation = "lighter";

    let drew = false;

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

        // The seven soft blobs that make up a nebula are
        // painted once into a small offscreen image and then
        // stretched to full size each frame — one drawImage
        // instead of seven screen-sized gradient fills.
        // (They drift so slowly that repainting the image
        // every few seconds is plenty.)
        const sprite = nebulaSprite(n);

        const size = sprite.half * 2 * SPRITE_SCALE;

        bufferCtx.drawImage(

            sprite.canvas,

            screen.x - size / 2,
            screen.y - size / 2,

            size,
            size

        );

        drew = true;

    }

    if (!drew) return;

    // Onto the screen, adding light (the caller's
    // globalAlpha fades the whole layer in and out).
    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    ctx.drawImage(buffer, 0, 0, width, height);

    ctx.restore();

}

//==================================================
// (Ambient foreground "embers" layer removed — it
// was screen-space and never moved or scaled with
// the camera, which is what read as a flicker along
// the edges while zooming slowly.)
//==================================================
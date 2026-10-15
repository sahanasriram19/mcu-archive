//==================================================
// GROUND GRID
//
// A faint grid lying on the map's surface, seen through the
// same perspective as everything else (js/depth.js). It's
// what makes the tilt readable: with the map tipped back
// its lines run off towards the distance and close up, and
// the posters' shadows (nodes.js) have a floor to fall on.
//
// (The page has always had a faint 90px grid in its
// background — #grid in css/background.css — but the
// universe canvas paints over it. This is that grid, moved
// onto the map.)
//
// The grid is pinned to the map, so it pans and zooms with
// it. As you zoom, the spacing doubles or halves to stay
// around GRID_PX on screen, the in-between lines fading so
// it never jumps.
//==================================================

import { project, viewAngles } from "./depth.js";

// Set to false to switch the grid off.
const SHOW_GRID = true;

const GRID_PX = 110;              // rough line spacing on screen
const GRID_COLOUR = "150,185,255";
const GRID_ALPHA = 0.1;           // nearest lines
const SEGMENTS = 18;              // each line is drawn as a short polyline

export function renderGround(ctx, camera){

    if(!SHOW_GRID) return;

    const zoom = camera.zoom;

    if(zoom <= 0) return;

    // Spacing in world units: a power of two near GRID_PX on
    // screen. `t` (0 → 1) is how far it is towards the next
    // doubling; the lines that will drop out fade with it.
    const level = Math.log2(GRID_PX / zoom);
    const base = Math.floor(level);
    const t = level - base;

    const step = Math.pow(2, base);

    const W = window.innerWidth;
    const H = window.innerHeight;

    const { pitch } = viewAngles();

    // How much of the map is on screen. Tipped back, far
    // more of it shows towards the top (it's further away),
    // and the near edge widens.
    const halfW = (W / zoom) * (0.9 + Math.sin(Math.max(0, pitch)) * 1.2);
    const up = (H / zoom) * (0.7 + Math.sin(Math.max(0, pitch)) * 3);
    const down = (H / zoom) * 0.8;

    const minX = Math.floor((camera.x - halfW) / step) * step;
    const maxX = camera.x + halfW;
    const minY = Math.floor((camera.y - up) / step) * step;
    const maxY = camera.y + down;

    // Two paths: lines that stay at the next zoom level, and
    // the in-between ones that are fading out.
    const keep = new Path2D();
    const fade = new Path2D();

    const line = (path, x0, y0, x1, y1) => {

        for(let i = 0; i <= SEGMENTS; i++){

            const k = i / SEGMENTS;

            const p = project(x0 + (x1 - x0) * k, y0 + (y1 - y0) * k, 0);

            if(i === 0) path.moveTo(p.x, p.y);
            else path.lineTo(p.x, p.y);

        }

    };

    const isKept = v => Math.abs(Math.round(v / step)) % 2 === 0;

    for(let x = minX; x <= maxX; x += step){

        line(isKept(x) ? keep : fade, x, minY, x, maxY);

    }

    for(let y = minY; y <= maxY; y += step){

        line(isKept(y) ? keep : fade, minX, y, maxX, y);

    }

    // Fainter towards the distance: from the nearest edge of
    // the screen up to the far end of the grid.
    const far = project(camera.x, minY, 0).y;
    const near = H;

    const shade = alpha => {

        // Flat on: the same all over.
        if(pitch < 0.02 || far >= near) return `rgba(${GRID_COLOUR},${alpha})`;

        const g = ctx.createLinearGradient(0, Math.max(-H, far), 0, near);

        g.addColorStop(0, `rgba(${GRID_COLOUR},0)`);
        g.addColorStop(0.55, `rgba(${GRID_COLOUR},${alpha * 0.55})`);
        g.addColorStop(1, `rgba(${GRID_COLOUR},${alpha})`);

        return g;

    };

    ctx.save();

    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 1;

    ctx.strokeStyle = shade(GRID_ALPHA);
    ctx.stroke(keep);

    if(t < 0.999){

        ctx.strokeStyle = shade(GRID_ALPHA * (1 - t));
        ctx.stroke(fade);

    }

    ctx.restore();

}
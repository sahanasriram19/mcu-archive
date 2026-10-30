//==================================================
// GROUND
//
// The map's surface, without drawing a floor over space:
// each world sits in a soft pool of light lying on the
// surface, as if lit from above, fading out into the dark
// at its edges. Being flat on the surface, a pool turns
// into an oval as the map tips back (js/depth.js) and its
// far side closes up, which is what shows there's a ground
// there at all; it's also what the posters' and lines'
// shadows fall onto. Past its edge it's just the starfield.
//
// On Complete MCU there's one pool per world, centred on
// its logo and sized to its posters. Other views get one
// pool round all their titles. A faint grid lies on the
// floor in each pool (renderGrid below).
//==================================================

import { graph } from "./graph.js";
import { currentView } from "./viewManager.js";
import { project, viewAngles } from "./depth.js";

// Set to false to switch the pools off.
const SHOW_GROUND = true;

const POOL_COLOUR = "70,100,175";   // a deep, slightly lifted navy
const POOL_ALPHA = 0.22;            // brightness at the centre
const POOL_MARGIN = 1.6;            // how far past the posters it reaches (its
                                    // outer part is so faint it just blends away)

// Room for a poster round each title (world units).
const POSTER_HALF_W = 220;
const POSTER_HALF_H = 300;

export function renderGround(ctx, camera){

    if(!SHOW_GROUND) return;

    const pools = poolsFor();

    if(!pools.length) return;

    // Squashed top to bottom as the surface tips back.
    const squash = Math.max(0.2, Math.cos(viewAngles().pitch));

    const sprite = poolSprite();

    ctx.save();

    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = POOL_ALPHA;

    const base = ctx.getTransform();

    for(const pool of pools){

        const at = project(pool.x, pool.y, 0);

        const w = pool.rx * 2 * camera.zoom * at.s;
        const h = pool.ry * 2 * camera.zoom * at.s;

        if(w < 4) continue;

        const reach = Math.max(w, h) / 2;

        if(at.x + reach < 0 || at.x - reach > window.innerWidth || at.y + reach < 0 || at.y - reach > window.innerHeight) continue;

        // Turned with the map (camera.spin), then squashed as
        // the surface tips back.
        ctx.setTransform(base.multiply(new DOMMatrix().translate(at.x, at.y).scale(1, squash).rotate((camera.spin || 0) * 180 / Math.PI)));

        ctx.drawImage(sprite, -w / 2, -h / 2, w, h);

        ctx.setTransform(base);

    }

    ctx.restore();

    if(SHOW_GRID) for(const pool of pools) renderGrid(ctx, camera, pool);

}

//--------------------------------------------------
// FLOOR GRID
//
// A faint square grid lying on the surface under each
// world, fading out towards the edge of its pool of light.
// It's drawn on the surface like everything else here, so
// it tips back and turns with the map: its lines close up
// towards the back, which is what makes the floor read as
// a floor.
//--------------------------------------------------

// Set to false to switch the grid off.
const SHOW_GRID = true;

const GRID_COLOUR = "120,155,235";
const GRID_ALPHA = 0.09;          // at the middle of a pool
const GRID_STEP = 700;            // world units between lines
const GRID_REACH = 0.7;           // how far out it goes, as a share of the pool
const GRID_SEGMENTS = 14;         // pieces per line (each its own fade)
const GRID_MIN_PX = 7;            // too dense on screen below this: skip

function renderGrid(ctx, camera, pool){

    const rx = pool.rx * GRID_REACH, ry = pool.ry * GRID_REACH;

    // Thin the grid out when zoomed far out.
    let step = GRID_STEP;

    while(step * camera.zoom < GRID_MIN_PX && step < GRID_STEP * 16) step *= 2;

    const centre = project(pool.x, pool.y, 0);

    const reach = Math.max(rx, ry) * camera.zoom * centre.s * 1.5;

    if(centre.x + reach < 0 || centre.x - reach > window.innerWidth || centre.y + reach < 0 || centre.y - reach > window.innerHeight) return;

    // Fades out smoothly to nothing at the oval's edge.
    const fade = (x, y) => {

        const d = ((x - pool.x) / rx) ** 2 + ((y - pool.y) / ry) ** 2;

        return d >= 1 ? 0 : (1 - d) * (1 - d);

    };

    ctx.save();

    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = `rgb(${GRID_COLOUR})`;
    ctx.lineWidth = 1;

    const line = (x0, y0, x1, y1) => {

        for(let i = 0; i < GRID_SEGMENTS; i++){

            const t0 = i / GRID_SEGMENTS, t1 = (i + 1) / GRID_SEGMENTS;

            const ax = x0 + (x1 - x0) * t0, ay = y0 + (y1 - y0) * t0;
            const bx = x0 + (x1 - x0) * t1, by = y0 + (y1 - y0) * t1;

            const a = fade((ax + bx) / 2, (ay + by) / 2);

            if(a < 0.02) continue;

            const p = project(ax, ay, 0), q = project(bx, by, 0);

            ctx.globalAlpha = GRID_ALPHA * a;

            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();

        }

    };

    const nx = Math.floor(rx / step), ny = Math.floor(ry / step);

    for(let i = -nx; i <= nx; i++) line(pool.x + i * step, pool.y - ry, pool.x + i * step, pool.y + ry);
    for(let j = -ny; j <= ny; j++) line(pool.x - rx, pool.y + j * step, pool.x + rx, pool.y + j * step);

    ctx.restore();

}

//--------------------------------------------------
// Where the pools go: { x, y, rx, ry } in world units.
//--------------------------------------------------

function poolsFor(){

    // (Titles parked far away are hidden for this view.)
    const nodes = graph.nodes.filter(n => !n.isBranch && Math.abs(n.x) < 50000 && Math.abs(n.y) < 50000);

    if(!nodes.length) return [];

    const hubs = graph.hubs || [];

    if(currentView === "complete" && hubs.length){

        return hubs.map(h => {

            const mine = nodes.filter(n => n.world === h.world);

            return around(h.x, h.y, mine.length ? mine : nodes);

        });

    }

    // Anything else: one pool round everything.
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    nodes.forEach(n => {

        minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
        minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);

    });

    return [around((minX + maxX) / 2, (minY + maxY) / 2, nodes)];

}

function around(x, y, nodes){

    let rx = 0, ry = 0;

    nodes.forEach(n => {

        rx = Math.max(rx, Math.abs(n.x - x));
        ry = Math.max(ry, Math.abs(n.y - y));

    });

    return {
        x, y,
        rx: (rx + POSTER_HALF_W) * POOL_MARGIN,
        ry: (ry + POSTER_HALF_H) * POOL_MARGIN
    };

}

//--------------------------------------------------
// One soft round pool, drawn once and stretched.
//--------------------------------------------------

let sprite = null;

function poolSprite(){

    if(sprite) return sprite;

    const size = 512;

    sprite = document.createElement("canvas");

    sprite.width = sprite.height = size;

    const c = sprite.getContext("2d");

    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    // A smooth bell-shaped falloff, easing all the way down
    // to nothing at the rim with no step anywhere — a sharper
    // drop near the edge used to show as an oval outline
    // round each map.
    const STOPS = 24;

    for(let i = 0; i <= STOPS; i++){

        const t = i / STOPS;

        const bell = Math.exp(-4.2 * t * t);

        // (Pulled to exactly 0 at the rim.)
        const a = (bell - Math.exp(-4.2)) / (1 - Math.exp(-4.2));

        g.addColorStop(t, `rgba(${POOL_COLOUR},${a.toFixed(4)})`);

    }

    c.fillStyle = g;
    c.fillRect(0, 0, size, size);

    return sprite;

}
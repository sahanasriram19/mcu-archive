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
// pool round all their titles.
//==================================================

import { graph } from "./graph.js";
import { currentView } from "./viewManager.js";
import { project, viewAngles } from "./depth.js";

// Set to false to switch the pools off.
const SHOW_GROUND = true;

const POOL_COLOUR = "70,100,175";   // a deep, slightly lifted navy
const POOL_ALPHA = 0.22;            // brightness at the centre
const POOL_MARGIN = 1.2;            // how far past the posters it reaches

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

    for(const pool of pools){

        const at = project(pool.x, pool.y, 0);

        const w = pool.rx * 2 * camera.zoom * at.s;
        const h = pool.ry * 2 * camera.zoom * at.s * squash;

        if(w < 4) continue;

        if(at.x + w / 2 < 0 || at.x - w / 2 > window.innerWidth || at.y + h / 2 < 0 || at.y - h / 2 > window.innerHeight) continue;

        ctx.drawImage(sprite, at.x - w / 2, at.y - h / 2, w, h);

    }

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

    const size = 256;

    sprite = document.createElement("canvas");

    sprite.width = sprite.height = size;

    const c = sprite.getContext("2d");

    const g = c.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);

    g.addColorStop(0, `rgba(${POOL_COLOUR},1)`);
    g.addColorStop(0.45, `rgba(${POOL_COLOUR},0.7)`);
    g.addColorStop(0.8, `rgba(${POOL_COLOUR},0.22)`);
    g.addColorStop(1, `rgba(${POOL_COLOUR},0)`);

    c.fillStyle = g;
    c.fillRect(0, 0, size, size);

    return sprite;

}
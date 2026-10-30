//==================================================
// DEPTH (2.5D)
//
// The archive used to be drawn flat: a world point went
// straight to the screen as (x - camera.x) * zoom. This
// adds two things on top of that, still on the same 2D
// canvas — no 3D library:
//
//   1. Every node has a height above the map's surface.
//      The lines, logos and floor grid (js/ground.js) lie on
//      the surface; the posters float above it. On the mind
//      map the outer rings float
//      a little higher than the inner ones; the other views
//      give each title its own steady height. A hovered
//      poster rises further.
//
//   2. The camera can pitch: the whole map tips back like
//      a table you look across (right-drag / Shift-drag /
//      two-finger swipe / T key — see input.js). The top
//      recedes, the bottom comes towards you. The archive
//      opens already tipped back a little (REST_PITCH).
//
//   3. Look-around: on a mouse, the map turns a few degrees
//      towards the cursor — left/right and up/down — as if
//      you were leaning to look into a model. Because it's a
//      real rotation, nearer things shift against further
//      ones. It rides on the same eased mouse position as
//      the rest of the site's sway (js/sway.js), so it's off
//      on touch screens and with "reduce motion".
//==================================================

import { camera } from "./camera.js";
import { graph } from "./graph.js";
import { currentView } from "./viewManager.js";
import { getSway } from "./sway.js";

//--------------------------------------------------
// Tuning
//--------------------------------------------------

// Focal length, as a share of the larger screen side.
// Smaller = stronger perspective.
const FOCAL = 0.9;

// Depth (in screen px, after zoom) is eased off towards
// this so that zooming right in doesn't stretch it out.
const DEPTH_LIMIT = 420;

// How heights shrink with zoom: screen px = height *
// HEIGHT_SCALE * zoom^HEIGHT_POWER. A power of 1 would shrink
// them exactly like the map (gone on the full view); less
// keeps them showing further out. The scale is set so they
// match the map at zoom 0.3 (about one world filling the
// screen).
const HEIGHT_POWER = 0.7;
const HEIGHT_SCALE = Math.pow(0.3, 1 - HEIGHT_POWER);

// Mind map ("complete"): how high above the surface.
const MAP_JUNCTION = 20;     // phase junctions
const MAP_FLOAT = 170;       // the first ring of posters
const MAP_PER_TIER = 70;     // each ring after that, a little higher
const MAP_JITTER = 150;       // a little per-title variety

// Other views: base + up to `spread` per title.
const VIEW_HEIGHT = {
    // Phases: every poster level, so each ring stays a clean
    // circle on the tilted map.
    phases:     { base: 150, spread: 0 },
    // Timelines: every poster at the same height, so the two
    // rows stay level instead of bobbing up and down into
    // the spine and its labels.
    release:    { base: 150, spread: 0 },
    chronology: { base: 150, spread: 0 },
    characters: { base: 110, spread: 240 },
    scatter:    { base: 120, spread: 800 }    // All Posters: a real volume
};

// How much higher a poster rises while hovered.
const LIFT_RISE = 140;

const DEPTH_EASE = 0.08;     // how fast a node moves to a new depth

export const MAX_PITCH = 0.9;   // radians (~52°)

// How far the map is tipped back when the archive opens
// (and where T returns it to). 0 = flat.
export const REST_PITCH = 0.66; // radians (~38°)

// How far the map can be turned on the spot, either way
// (drag with the right mouse button / Shift, or twist two
// fingers): camera.spin.
export const MAX_SPIN = 0.6;    // radians (~35°)

// Look-around: how far the map turns with the mouse at the
// edge of the screen.
// (About half what it used to be: it was a bit strong.)
const LOOK_YAW = 0.035;         // left/right, radians (~2°)
const LOOK_PITCH = 0.02;        // up/down, radians (~1.1°)

//--------------------------------------------------
// Per-title variety: a steady 0..1 number from its id,
// so it sits at the same depth on every visit.
//--------------------------------------------------

function steady(str){

    let h = 2166136261;

    for(let i = 0; i < str.length; i++){

        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);

    }

    return ((h >>> 0) % 10000) / 10000;

}

// A node's height above the surface for the current view.
// (Stored as node.depth, which is negative for "above":
// depth runs away from you.)
function targetHeight(node){

    const r = node.depthSeed ?? (node.depthSeed = steady(String(node.id || node.key || "")));

    if(currentView === "complete"){

        if(node.isBranch) return MAP_JUNCTION;

        return mindmapPosterHeight(node);

    }

    // Labels and junctions in the other views sit just
    // above the surface, below their posters.
    if(node.isBranch) return 10;

    const v = VIEW_HEIGHT[currentView] || VIEW_HEIGHT.phases;

    return v.base + r * v.spread;

}

// How high a poster floats on the mind map ("complete").
// Exported so layout.js can space the mind map for it: a
// higher poster is drawn further up the screen, so two
// posters that are clear of each other on the flat map can
// still land on top of one another once it's tipped back.
export function mindmapPosterHeight(node){

    const r = node.depthSeed ?? (node.depthSeed = steady(String(node.id || node.key || "")));

    return MAP_FLOAT + (node.tier || 0) * MAP_PER_TIER + (r - 0.5) * MAP_JITTER;

}

// How far up the screen one world unit of height moves a
// poster, compared with one world unit across the map, at a
// given zoom (heights shrink more gently than the map:
// HEIGHT_POWER above).
export function heightToMapScale(zoom){

    return HEIGHT_SCALE * Math.pow(zoom, HEIGHT_POWER - 1);

}

function targetDepth(node){

    return -targetHeight(node);

}

//--------------------------------------------------
// Once a frame (app.js): nodes ease towards their depth
// for the current view, so switching views glides rather
// than popping.
//--------------------------------------------------

// Whether any node was still easing to its depth this frame
// (read by universe.js, like graph.moving).
export let depthMoving = false;

export function updateDepth(){

    depthMoving = false;

    const settle = list => {

        for(const node of list){

            const t = targetDepth(node);

            if(node.depth === undefined) node.depth = t;
            else if(Math.abs(t - node.depth) < 0.05) node.depth = t;
            else {

                node.depth += (t - node.depth) * DEPTH_EASE;

                depthMoving = true;

            }

        }

    };

    settle(graph.nodes);
    settle(graph.branchNodes);

}

//--------------------------------------------------
// World point + depth → screen.
//
// Returns { x, y, s, z }:
//   x, y  screen position (CSS px, before the mouse sway)
//   s     how much to scale anything drawn there (1 = flat)
//   z     distance from the camera, for back-to-front sorting
//--------------------------------------------------

export function focalLength(){

    return Math.max(window.innerWidth, window.innerHeight) * FOCAL;

}

export function project(wx, wy, depth = 0){

    const zoom = camera.zoom;

    let X = (wx - camera.x) * zoom;
    let Y = (wy - camera.y) * zoom;

    // Turntable: turn the map on the spot about the middle
    // of the screen, before it's tipped back.
    const spin = camera.spin || 0;

    if(spin){

        const cs = Math.cos(spin), ss = Math.sin(spin);

        const sx = X * cs - Y * ss;

        Y = X * ss + Y * cs;
        X = sx;

    }

    const D = screenDepth(depth);

    const { pitch: p, yaw } = viewAngles();

    // Tip the map back about the screen's horizontal centre
    // line: its top goes away from you. Anything floating
    // above the surface (D < 0) rises up the screen with it,
    // the way a card standing on a table does as you lean
    // over it.
    const c = Math.cos(p), sn = Math.sin(p);

    const Yr = Y * c + D * sn;
    const Zp = -Y * sn + D * c;

    // ...then turn it about the screen's vertical centre line.
    const cy = Math.cos(yaw), sy = Math.sin(yaw);

    const Xr = X * cy + Zp * sy;

    const F = focalLength();

    // Never closer than this (or the bottom edge would blow
    // up when tipped far back).
    const Zr = Math.max(-F * 0.6, -X * sy + Zp * cy);

    const s = F / (F + Zr);

    return {

        x: window.innerWidth / 2 + Xr * s,
        y: window.innerHeight / 2 + Yr * s,
        s,
        z: Zr

    };

}

// A depth (or height) in world units → screen px, as
// project() uses it: shrinking with zoom (more gently than
// the map), eased off at the far end.
export function screenDepth(depth){

    const D = depth * HEIGHT_SCALE * Math.pow(camera.zoom, HEIGHT_POWER);

    return DEPTH_LIMIT * Math.tanh(D / DEPTH_LIMIT);

}

// The camera's angles right now: the map's tilt plus the
// look-around (the side of the map nearest the mouse dips
// away from you, like pressing on it; the far side comes
// up).
export function viewAngles(){

    const look = getSway();          // -0.5 … 0.5 each way, eased

    return {
        pitch: (camera.pitch || 0) - look.y * 2 * LOOK_PITCH,
        yaw: -look.x * 2 * LOOK_YAW
    };

}

// How high a node is floating right now (world units),
// including the extra rise while it's hovered.
export function nodeHeight(node){

    return -(node.depth || 0) + (node.lift || 0) * LIFT_RISE;

}

// Shorthand for a node (or a hub / anchor with no depth).
export function projectNode(node){

    return project(node.x, node.y, -nodeHeight(node));

}
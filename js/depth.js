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
//      the surface; the posters float above it, each casting
//      a soft shadow down onto it (nodes.js), so you can see
//      how high it is. On the mind map the outer rings float
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
//
// Heights shrink as you zoom out (like a real camera pulling
// away), but more gently than the map itself, so they still
// show on the full view without pulling the posters away
// from their own logos. Posters stay facing
// you (like cards standing on a table), they just get
// smaller and drift with distance.
//
// Everything that draws or hit-tests the map (nodes.js,
// connections.js, hub.js, branchNodes.js, nodeHitTest.js,
// input.js) goes through project() below, so what you
// click is always what you see.
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
    phases:     { base: 120, spread: 240 },
    release:    { base: 110, spread: 260 },
    chronology: { base: 110, spread: 260 },
    characters: { base: 110, spread: 240 },
    scatter:    { base: 120, spread: 800 }    // All Posters: a real volume
};

// How much higher a poster rises while hovered.
const LIFT_RISE = 140;

const DEPTH_EASE = 0.08;     // how fast a node moves to a new depth

export const MAX_PITCH = 0.9;   // radians (~52°)

// How far the map is tipped back when the archive opens
// (and where T returns it to). 0 = flat.
export const REST_PITCH = 0.5;  // radians (~29°)

// How far the map can be turned on the spot, either way
// (drag with the right mouse button / Shift, or twist two
// fingers): camera.spin.
export const MAX_SPIN = 0.6;    // radians (~35°)

// Look-around: how far the map turns with the mouse at the
// edge of the screen.
const LOOK_YAW = 0.08;          // left/right, radians (~4.5°)
const LOOK_PITCH = 0.045;       // up/down, radians (~2.5°)

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

        return MAP_FLOAT + (node.tier || 0) * MAP_PER_TIER + (r - 0.5) * MAP_JITTER;

    }

    // Labels and junctions in the other views sit just
    // above the surface, below their posters.
    if(node.isBranch) return 10;

    const v = VIEW_HEIGHT[currentView] || VIEW_HEIGHT.phases;

    return v.base + r * v.spread;

}

function targetDepth(node){

    return -targetHeight(node);

}

//--------------------------------------------------
// Once a frame (app.js): nodes ease towards their depth
// for the current view, so switching views glides rather
// than popping.
//--------------------------------------------------

export function updateDepth(){

    const ease = list => {

        for(const node of list){

            const t = targetDepth(node);

            if(node.depth === undefined) node.depth = t;
            else node.depth += (t - node.depth) * DEPTH_EASE;

        }

    };

    ease(graph.nodes);
    ease(graph.branchNodes);

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

// Shadows (posters in nodes.js, lines in connections.js):
// lit from the top left, so a shadow lands a little down and
// to the right of whatever casts it, further the higher it is.
const SHADOW_FALL_X = 0.35;     // per px of height
const SHADOW_FALL_Y = 0.55;

// Where the shadow of a point `height` above the surface
// lands on it. Returns the projected point and the height in
// screen px (for how soft/faint to make it).
export function shadowPoint(x, y, height){

    const H = Math.abs(screenDepth(-Math.max(0, height)));

    const fall = H / camera.zoom;

    // The light stays put on screen while the map turns, so
    // the fall direction turns back the other way.
    const spin = camera.spin || 0;
    const cs = Math.cos(spin), ss = Math.sin(spin);

    const fx = SHADOW_FALL_X * cs + SHADOW_FALL_Y * ss;
    const fy = -SHADOW_FALL_X * ss + SHADOW_FALL_Y * cs;

    return { at: project(x + fall * fx, y + fall * fy, 0), H };

}

// Shorthand for a node (or a hub / anchor with no depth).
export function projectNode(node){

    return project(node.x, node.y, -nodeHeight(node));

}
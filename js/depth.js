//==================================================
// DEPTH (2.5D)
//
// The archive used to be drawn flat: a world point went
// straight to the screen as (x - camera.x) * zoom. This
// adds two things on top of that, still on the same 2D
// canvas — no 3D library:
//
//   1. Every node has a depth: how far "behind" the map's
//      surface it sits. On the mind map each logo is the
//      nearest thing, its phase junctions a little behind
//      it, and each ring of posters further back again, so
//      every world reads as a shallow bowl around its logo.
//      The other views get a gentler, steady spread so the
//      posters float at slightly different distances.
//
//   2. The camera can pitch: the whole map tips back like
//      a table you look across (right-drag / Shift-drag /
//      two-finger swipe / T key — see input.js). The top
//      recedes, the bottom comes towards you.
//
// Depth is in world units, so — like a real camera pulling
// away — the full-map view looks almost flat and the depth
// shows more the further in you zoom. Posters stay facing
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

//--------------------------------------------------
// Tuning
//--------------------------------------------------

// Focal length, as a share of the larger screen side.
// Smaller = stronger perspective.
const FOCAL = 1.15;

// Depth (in screen px, after zoom) is eased off towards
// this so that zooming right in doesn't stretch it out.
const DEPTH_LIMIT = 420;

// Mind map ("complete"): world units behind the logo.
const MAP_JUNCTION = 60;     // phase junctions
const MAP_FIRST_TIER = 120;  // the first ring of posters
const MAP_PER_TIER = 90;     // each ring after that
const MAP_JITTER = 40;       // a little per-title variety

// Other views: base + up to `spread` per title.
const VIEW_DEPTH = {
    phases:     { base: 70,  spread: 140 },
    release:    { base: 50,  spread: 170 },
    chronology: { base: 50,  spread: 170 },
    characters: { base: 50,  spread: 150 },
    scatter:    { base: 150, spread: 900 }    // All Posters: a real volume
};

const DEPTH_EASE = 0.08;     // how fast a node moves to a new depth

export const MAX_PITCH = 0.9;   // radians (~52°)

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

function targetDepth(node){

    const r = node.depthSeed ?? (node.depthSeed = steady(String(node.id || node.key || "")));

    if(currentView === "complete"){

        if(node.isBranch) return MAP_JUNCTION;

        return MAP_FIRST_TIER + (node.tier || 0) * MAP_PER_TIER + (r - 0.5) * MAP_JITTER;

    }

    // Labels and junctions in the other views sit just
    // behind the surface, in front of their posters.
    if(node.isBranch) return 30;

    const v = VIEW_DEPTH[currentView] || VIEW_DEPTH.phases;

    return v.base + r * v.spread;

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

    const X = (wx - camera.x) * zoom;
    const Y = (wy - camera.y) * zoom;

    // Depth in screen px, eased off at the far end.
    let D = depth * zoom;

    D = DEPTH_LIMIT * Math.tanh(D / DEPTH_LIMIT);

    // Tip the map back about the screen's horizontal centre
    // line: its top goes away from you, and anything behind
    // the surface rises slightly with it.
    const p = camera.pitch || 0;

    const c = Math.cos(p), sn = Math.sin(p);

    const Yr = Y * c - D * sn;

    const F = focalLength();

    // Never closer than this (or the bottom edge would blow
    // up when tipped far back).
    const Zr = Math.max(-F * 0.6, -Y * sn + D * c);

    const s = F / (F + Zr);

    return {

        x: window.innerWidth / 2 + X * s,
        y: window.innerHeight / 2 + Yr * s,
        s,
        z: Zr

    };

}

// Shorthand for a node (or a hub / anchor with no depth).
export function projectNode(node){

    return project(node.x, node.y, node.depth || 0);

}
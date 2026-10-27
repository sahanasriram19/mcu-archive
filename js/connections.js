import { getCurrentView } from "./viewManager.js";
import { HIGHLIGHT_COLOURS } from "./branchNodes.js";
import { getTimelineOrientation } from "./layout.js";
import { project, nodeHeight, shadowPoint } from "./depth.js";

//==================================================
// CONNECTION RENDERER
//==================================================

// How far the other phases' branches fade while one phase
// is hovered on the mind map.
const HOVER_LINE_DIM = 0;   // other branches stay fully lit while one is hovered

function resolveAnchor(ref, graph){

    if(ref === "hub") return graph.hubs && graph.hubs[0] || { x:0, y:0 };

    // One world's logo on the combined map ("hub:xmen").
    if(typeof ref === "string" && ref.startsWith("hub:")){

        const world = ref.slice("hub:".length);

        return (graph.hubs || []).find(h => h.world === world) || null;

    }

    if(typeof ref === "string" && ref.startsWith("branch:")){

        const key = ref.slice("branch:".length);

        return graph.branchNodes.find(b => b.key === key) || null;

    }

    return graph.nodes[ref] || null;

}

// Control points for a mind-map branch, in world space.
// `center` is the logo the branch grows from (0,0 unless
// it's one of the side maps on the combined view).
function curveControls(from, to, center){

    const cx = center ? center.x : 0;
    const cy = center ? center.y : 0;

    const len = Math.hypot(to.x - from.x, to.y - from.y);

    const outward = (p, fallback)=>{

        const px = p.x - cx, py = p.y - cy;

        const d = Math.hypot(px, py);

        if(d < 1){

            const fx = fallback.x - cx, fy = fallback.y - cy;

            const f = Math.hypot(fx, fy) || 1;

            return [fx / f, fy / f];

        }

        return [px / d, py / d];

    };

    const [fx, fy] = outward(from, to);
    const [tx, ty] = outward(to, to);

    const k = len * 0.42;

    return [

        from.x + fx * k, from.y + fy * k,
        to.x - tx * k,   to.y - ty * k

    ];

}

// A line's points on screen, with depth (js/depth.js): its
// two ends at their own depths, and — for a curve — its
// two control points a third and two thirds of the way
// between them, so a branch slopes smoothly from the logo
// back to its poster.
function depthOf(anchor){

    // (Including the extra rise of a hovered poster, so its
    // line stays attached as it lifts.)
    return -nodeHeight(anchor);

}

//--------------------------------------------------
// LINE SHADOWS
//
// The lines start on the map's surface (at the logo, or the
// timeline's spine) and climb to their floating posters
// (js/depth.js), so each casts a soft shadow onto the
// surface that peels away from it the higher it gets — the
// same light as the posters' shadows (nodes.js).
//--------------------------------------------------

const LINE_SHADOW_ALPHA = 0.22;   // the darker core
const LINE_SHADOW_SOFT = 0.1;     // the wider, softer edge

// Adds one line's shadow to `path`. For a curve, its control
// points are shadowed at heights a third and two thirds of
// the way along.
function addShadow(path, from, to, edge){

    const h0 = nodeHeight(from), h3 = nodeHeight(to);

    if(h0 <= 1 && h3 <= 1) return;

    const a = shadowPoint(from.x, from.y, h0).at;
    const b = shadowPoint(to.x, to.y, h3).at;

    const w = window.innerWidth, h = window.innerHeight;

    if(
        (a.x < 0 && b.x < 0) || (a.x > w && b.x > w) ||
        (a.y < 0 && b.y < 0) || (a.y > h && b.y > h)
    ) return;

    path.moveTo(a.x, a.y);

    if(edge && edge.style === "curve"){

        const [c1x, c1y, c2x, c2y] = curveControls(from, to, edge.center);

        const c1 = shadowPoint(c1x, c1y, h0 + (h3 - h0) / 3).at;
        const c2 = shadowPoint(c2x, c2y, h0 + (h3 - h0) * 2 / 3).at;

        path.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b.x, b.y);

    } else {

        path.lineTo(b.x, b.y);

    }

}

function strokeShadows(ctx, camera, path){

    const z = camera.zoom;

    ctx.save();

    ctx.globalCompositeOperation = "source-over";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.strokeStyle = `rgba(0,0,0,${LINE_SHADOW_SOFT})`;
    ctx.lineWidth = Math.max(5, 24 * z);
    ctx.stroke(path);

    ctx.strokeStyle = `rgba(0,0,0,${LINE_SHADOW_ALPHA})`;
    ctx.lineWidth = Math.max(2, 8 * z);
    ctx.stroke(path);

    ctx.restore();

}

function projectEdge(from, to, edge){

    const d0 = depthOf(from), d3 = depthOf(to);

    const a = project(from.x, from.y, d0);
    const b = project(to.x, to.y, d3);

    if(edge.style !== "curve") return { a, b };

    const [c1x, c1y, c2x, c2y] = curveControls(from, to, edge.center);

    return {
        a, b,
        c1: project(c1x, c1y, d0 + (d3 - d0) / 3),
        c2: project(c2x, c2y, d0 + (d3 - d0) * 2 / 3)
    };

}

//--------------------------------------------------
// LINE HIT TEST (Complete MCU mind map)
//
// Which connection line, if any, is under a screen point
// — so hovering the branches themselves lights them up,
// not just the posters. Samples each curve along the exact
// same shape it's drawn with, and returns the edge index
// of the nearest line within `tolerance` px, or -1.
//--------------------------------------------------

const LINE_SAMPLES = 16;

function distToSegment(px, py, ax, ay, bx, by){

    const dx = bx - ax, dy = by - ay;

    const len2 = dx*dx + dy*dy;

    let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;

    t = Math.max(0, Math.min(1, t));

    return Math.hypot(px - (ax + t*dx), py - (ay + t*dy));

}

export function edgeAtScreenPoint(px, py, camera, graph, tolerance = 7){

    let best = -1, bestD = tolerance;

    graph.edges.forEach((edge, i)=>{

        const from = resolveAnchor(edge.from, graph);
        const to = resolveAnchor(edge.to, graph);

        if(!from || !to) return;

        const pts = projectEdge(from, to, edge);

        const x0 = pts.a.x, y0 = pts.a.y;
        const x3 = pts.b.x, y3 = pts.b.y;

        // Quick reject: point nowhere near this line's box.
        if(
            px < Math.min(x0, x3) - 60 || px > Math.max(x0, x3) + 60 ||
            py < Math.min(y0, y3) - 60 || py > Math.max(y0, y3) + 60
        ) return;

        if(edge.style !== "curve"){

            const d = distToSegment(px, py, x0, y0, x3, y3);

            if(d < bestD){ bestD = d; best = i; }

            return;

        }

        const x1 = pts.c1.x, y1 = pts.c1.y, x2 = pts.c2.x, y2 = pts.c2.y;

        let lx = x0, ly = y0;

        for(let k = 1; k <= LINE_SAMPLES; k++){

            const t = k / LINE_SAMPLES, u = 1 - t;

            const bx = u*u*u*x0 + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3;
            const by = u*u*u*y0 + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3;

            const d = distToSegment(px, py, lx, ly, bx, by);

            if(d < bestD){ bestD = d; best = i; }

            lx = bx; ly = by;

        }

    });

    return best;

}

export function renderConnections(ctx, camera, graph){

    if(!graph.edges.length) return;

    ctx.save();

    ctx.globalCompositeOperation = "source-over";

    // Watch-list focus (js/upcoming.js): the lines step back
    // with the titles outside the list.
    if(graph.focus) ctx.globalAlpha = 0.25;

    const currentView = getCurrentView();

    if(currentView === "release" || currentView === "chronology"){

        renderTimeline(ctx, camera, graph);

        ctx.restore();

        return;

    }

    const w = window.innerWidth;
    const h = window.innerHeight;

    //----------------------------------
    // Every edge used to get its own
    // ctx.save()/shadowBlur/stroke() —
    // two full passes each. shadowBlur is
    // one of the most expensive canvas 2D
    // operations, and with ~150+ edges in
    // Complete MCU that was ~300 blurred
    // strokes every single frame, which is
    // what was actually causing the lag.
    // Building one Path2D for all edges
    // and stroking it ONCE (per pass)
    // does the same visual job for a
    // fraction of the cost — and since
    // shadowBlur now only runs twice a
    // frame total instead of per-edge, the
    // blur radius below can afford to be
    // considerably bigger for a stronger
    // glow without reintroducing the lag.
    //----------------------------------

    // Complete MCU / X-Men and Phases / Eras: each phase's
    // branches are drawn in that phase's own colour, all the
    // time (see HIGHLIGHT_COLOURS in branchNodes.js). Other
    // views (Character Journeys) keep the white lines.
    const coloured = currentView === "complete" || currentView === "phases";

    // One path per colour, so the whole map still costs only
    // a couple of strokes per colour rather than per edge.
    const paths = new Map();

    const pathFor = colour => {

        let p = paths.get(colour);

        if(!p){ p = new Path2D(); paths.set(colour, p); }

        return p;

    };

    // Shadows first, under every line.
    const shadows = new Path2D();

    graph.edges.forEach(edge=>{

        const from = resolveAnchor(edge.from, graph);
        const to = resolveAnchor(edge.to, graph);

        if(from && to) addShadow(shadows, from, to, edge);

    });

    strokeShadows(ctx, camera, shadows);

    const phaseOf = ref => {

        if(typeof ref === "number") return graph.nodes[ref] ? graph.nodes[ref].phase : null;

        if(typeof ref === "string" && ref.startsWith("branch:phase")) return Number(ref.slice("branch:phase".length));

        return null;

    };

    graph.edges.forEach(edge=>{

        const from = resolveAnchor(edge.from, graph);
        const to = resolveAnchor(edge.to, graph);

        if(!from || !to) return;

        const pts = projectEdge(from, to, edge);

        const x1 = pts.a.x, y1 = pts.a.y;

        const x2 = pts.b.x, y2 = pts.b.y;

        if(

            (x1<0 && x2<0) || (x1>w && x2>w) ||
            (y1<0 && y2<0) || (y1>h && y2>h)

        ) return;

        let colour = null;

        if(coloured){

            const phase = phaseOf(edge.to) ?? phaseOf(edge.from);

            colour = HIGHLIGHT_COLOURS[phase] || null;

        }

        const target = pathFor(colour);

        target.moveTo(x1, y1);

        if(edge.style === "curve"){

            // Mind-map branch: a soft S-curve that leaves the
            // parent heading away from the hub and arrives at
            // the child heading away from the hub too, so every
            // branch visibly "grows" outward from the centre.
            target.bezierCurveTo(

                pts.c1.x, pts.c1.y,
                pts.c2.x, pts.c2.y,
                x2, y2

            );

        } else {

            target.lineTo(x2, y2);

        }

    });

    if(!paths.size){

        ctx.restore();

        return;

    }

    // Hovering a phase on the mind map: the other phases'
    // branches step back with their posters (graph.hoverFade,
    // eased in graph.js).
    const hf = graph.hoverFade;

    const keep = hf && hf.amount > 0.001 && hf.phase !== null ? HIGHLIGHT_COLOURS[hf.phase] : undefined;

    const dimmed = keep === undefined ? 1 : 1 - HOVER_LINE_DIM * hf.amount;

    paths.forEach((path, colour)=>{

        ctx.save();

        if(keep !== undefined && colour !== keep) ctx.globalAlpha *= dimmed;

        if(colour === null) drawWhite(ctx, camera, path);

        else drawColoured(ctx, camera, path, colour);

        ctx.restore();

    });

    ctx.restore();

}

// Plain solid lines, no glow: the shadows underneath
// (strokeShadows) already lift them off the background.

// White lines (Character Journeys).
function drawWhite(ctx, camera, path){

    ctx.save();

    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(225,235,250,.9)";
    // Capped: Character Journeys sits much closer in.
    ctx.lineWidth = Math.min(Math.max(2.5 * camera.zoom, 1.2), 2.2);

    ctx.stroke(path);

    ctx.restore();

}

// Phase-coloured lines, a little lighter than the phase
// colour so they read on the dark background.
function drawColoured(ctx, camera, path, colour){

    const tone = colour.split(",").map(c => Math.round(+c + (255 - +c) * 0.15)).join(",");

    ctx.save();

    ctx.lineCap = "round";
    ctx.strokeStyle = `rgb(${tone})`;
    ctx.lineWidth = Math.max(3 * camera.zoom, 1.4);

    ctx.stroke(path);

    ctx.restore();

}

function renderTimeline(ctx, camera, graph){

    // Left to right normally; top to bottom on an upright
    // phone (see layoutTimeline in layout.js).
    const vertical = getTimelineOrientation() === "vertical";

    const along = vertical ? "targetY" : "targetX";

    //------------------------------------
    // The spine
    //------------------------------------

    const movies = [...graph.nodes]
        .filter(n => !n.isBranch)
        .sort((a,b)=>a[along]-b[along]);

    if(!movies.length) return;

    const first = movies[0], last = movies[movies.length-1];

    // The spine lies on the map's surface (depth 0); with the
    // map tilted (js/depth.js) it's still a straight line,
    // just seen in perspective.
    const start = vertical ? project(0, first.targetY, 0) : project(first.targetX, 0, 0);
    const end = vertical ? project(0, last.targetY, 0) : project(last.targetX, 0, 0);

    const x1 = start.x, y1 = start.y, x2 = end.x, y2 = end.y;

    // The branches' shadows, under everything. (The spine
    // lies on the surface, so it has none.)
    const shadows = new Path2D();

    movies.forEach(node=>{

        const foot = vertical ? { x: 0, y: node.y } : { x: node.x, y: 0 };

        addShadow(shadows, foot, node, null);

    });

    strokeShadows(ctx, camera, shadows);

    const spine = new Path2D();

    spine.moveTo(x1, y1);
    spine.lineTo(x2, y2);

    ctx.save();

    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(220,235,255,.9)";
    ctx.lineWidth = Math.max(4 * camera.zoom, 1.8);

    ctx.stroke(spine);
    ctx.restore();

    //------------------------------------
    // One branch per poster, from the
    // spine straight out to it — batched
    // into a single path for the same
    // reason as the main edges above.
    //------------------------------------

    const branchPath = new Path2D();

    movies.forEach(node=>{

        // From the spine, straight back to the poster at
        // its own depth.
        const foot = vertical ? project(0, node.y, 0) : project(node.x, 0, 0);
        const at = project(node.x, node.y, -nodeHeight(node));

        branchPath.moveTo(foot.x, foot.y);

        branchPath.lineTo(at.x, at.y);

    });

    ctx.save();

    ctx.lineCap = "round";
    ctx.strokeStyle = "rgba(220,235,255,.75)";
    ctx.lineWidth = Math.max(2 * camera.zoom,1);

    ctx.stroke(branchPath);
    ctx.restore();

}
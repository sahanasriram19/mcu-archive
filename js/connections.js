import { getCurrentView } from "./viewManager.js";
import { HIGHLIGHT_COLOURS } from "./branchNodes.js";
import { getTimelineOrientation } from "./layout.js";

//==================================================
// CONNECTION RENDERER
//==================================================

function resolveAnchor(ref, graph){

    if(ref === "hub") return { x:0, y:0 };

    if(typeof ref === "string" && ref.startsWith("branch:")){

        const key = ref.slice("branch:".length);

        return graph.branchNodes.find(b => b.key === key) || null;

    }

    return graph.nodes[ref] || null;

}

// Control points for a mind-map branch, in world space.
function curveControls(from, to){

    const len = Math.hypot(to.x - from.x, to.y - from.y);

    const outward = (p, fallback)=>{

        const d = Math.hypot(p.x, p.y);

        if(d < 1){

            const f = Math.hypot(fallback.x, fallback.y) || 1;

            return [fallback.x / f, fallback.y / f];

        }

        return [p.x / d, p.y / d];

    };

    const [fx, fy] = outward(from, to);
    const [tx, ty] = outward(to, to);

    const k = len * 0.42;

    return [

        from.x + fx * k, from.y + fy * k,
        to.x - tx * k,   to.y - ty * k

    ];

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

    const halfW = window.innerWidth/2;
    const halfH = window.innerHeight/2;

    const sx = x => halfW + (x - camera.x) * camera.zoom;
    const sy = y => halfH + (y - camera.y) * camera.zoom;

    let best = -1, bestD = tolerance;

    graph.edges.forEach((edge, i)=>{

        const from = resolveAnchor(edge.from, graph);
        const to = resolveAnchor(edge.to, graph);

        if(!from || !to) return;

        const x0 = sx(from.x), y0 = sy(from.y);
        const x3 = sx(to.x), y3 = sy(to.y);

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

        const [c1x, c1y, c2x, c2y] = curveControls(from, to);

        const x1 = sx(c1x), y1 = sy(c1y), x2 = sx(c2x), y2 = sy(c2y);

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

//--------------------------------------------------
// HOVER HIGHLIGHT (Complete MCU mind map)
//
// Returns the set of edge indexes to light up, plus the
// phase colour to light them in — or null if nothing is
// hovered.
//   Hovering a poster: its own branch, from the poster
//   back through its parent titles and phase to the hub.
//   Hovering a phase junction: that phase's whole branch.
//--------------------------------------------------

function hoverHighlight(graph){

    const { nodeIndex, phase } = graph.hover;

    if(nodeIndex === null && phase === null) return null;

    const edges = graph.edges;

    const set = new Set();

    if(nodeIndex !== null){

        // Each child has exactly one incoming edge in the
        // mind-map tree, so "edge that ends here" = parent.
        const parentEdge = new Map();

        edges.forEach((edge, i) => parentEdge.set(String(edge.to), i));

        let current = nodeIndex;

        for(let guard = 0; guard < 20; guard++){

            const i = parentEdge.get(String(current));

            if(i === undefined) break;

            set.add(i);

            current = edges[i].from;

            if(current === "hub") break;

        }

    } else {

        const anchor = "branch:phase" + phase;

        edges.forEach((edge, i) => {

            const child = typeof edge.to === "number" ? graph.nodes[edge.to] : null;

            if(edge.to === anchor || (child && child.phase === phase)) set.add(i);

        });

    }

    if(!set.size) return null;

    const colour = HIGHLIGHT_COLOURS[phase] || "170,225,255";

    return { set, colour };

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

    const halfW = window.innerWidth/2;
    const halfH = window.innerHeight/2;

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

    const path = new Path2D();

    // Hovered branch goes into its own path so it can be
    // drawn brighter and in its phase colour on top.
    const highlight = currentView === "complete" ? hoverHighlight(graph) : null;

    const hiPath = highlight ? new Path2D() : null;

    let any = false;

    graph.edges.forEach((edge, edgeIndex)=>{

        const target = highlight && highlight.set.has(edgeIndex) ? hiPath : path;

        const from = resolveAnchor(edge.from, graph);
        const to = resolveAnchor(edge.to, graph);

        if(!from || !to) return;

        const x1 = halfW + (from.x - camera.x) * camera.zoom;
        const y1 = halfH + (from.y - camera.y) * camera.zoom;

        const x2 = halfW + (to.x - camera.x) * camera.zoom;
        const y2 = halfH + (to.y - camera.y) * camera.zoom;

        if(

            (x1<0 && x2<0) || (x1>w && x2>w) ||
            (y1<0 && y2<0) || (y1>h && y2>h)

        ) return;

        target.moveTo(x1, y1);

        if(edge.style === "curve"){

            // Mind-map branch: a soft S-curve that leaves the
            // parent heading away from the hub and arrives at
            // the child heading away from the hub too, so every
            // branch visibly "grows" outward from the centre.
            const [c1x, c1y, c2x, c2y] = curveControls(from, to);

            target.bezierCurveTo(

                halfW + (c1x - camera.x) * camera.zoom,
                halfH + (c1y - camera.y) * camera.zoom,
                halfW + (c2x - camera.x) * camera.zoom,
                halfH + (c2y - camera.y) * camera.zoom,
                x2, y2

            );

        } else {

            target.lineTo(x2, y2);

        }

        any = true;

    });

    if(!any){

        ctx.restore();

        return;

    }

    //----------------------------------
    // Glow — one bigger, bolder pass
    // instead of many small ones.
    //----------------------------------

    ctx.save();

    // While a branch is highlighted, the rest of the map
    // steps back so the highlighted one stands out.
    if(highlight) ctx.globalAlpha = 0.4;

    ctx.globalCompositeOperation = "lighter";

    ctx.shadowColor = "rgba(140,210,255,1)";
    ctx.shadowBlur = 32 * camera.zoom;

    ctx.strokeStyle = "rgba(170,225,255,.75)";
    ctx.lineWidth = 10 * camera.zoom;

    ctx.stroke(path);

    // A second, tighter glow pass adds a brighter inner
    // bloom without needing an even bigger (more expensive)
    // single blur radius.
    ctx.shadowBlur = 14 * camera.zoom;
    ctx.lineWidth = 6 * camera.zoom;
    ctx.stroke(path);

    ctx.restore();

    //----------------------------------
    // Bright Core
    //----------------------------------

    ctx.save();

    if(highlight) ctx.globalAlpha = 0.4;

    ctx.shadowColor = "rgba(255,255,255,1)";
    ctx.shadowBlur = 10 * camera.zoom;

    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.lineWidth = Math.max(2.5 * camera.zoom, 1.2);

    ctx.stroke(path);

    ctx.restore();

    //----------------------------------
    // Highlighted branch — phase-coloured
    // glow with a bright core, on top.
    //----------------------------------

    if(highlight){

        // Soft glow in the phase colour...
        //
        // Widths are kept close to the normal lines (whose
        // core is 1.2px at the default zoom) so a highlighted
        // branch changes colour rather than bulking up. To make
        // it bolder or slimmer, change the minimums (the second
        // number in each Math.max) — they're what apply at the
        // default zoom.
        ctx.save();

        ctx.globalCompositeOperation = "lighter";

        ctx.shadowColor = `rgba(${highlight.colour},1)`;
        ctx.shadowBlur = Math.max(16 * camera.zoom, 6);

        ctx.strokeStyle = `rgba(${highlight.colour},.5)`;
        ctx.lineWidth = Math.max(6 * camera.zoom, 3);

        ctx.stroke(hiPath);

        ctx.restore();

        // ...then the line itself, solid in the phase colour.
        ctx.save();

        ctx.strokeStyle = `rgb(${highlight.colour})`;
        ctx.lineWidth = Math.max(2.5 * camera.zoom, 1.6);

        ctx.stroke(hiPath);

        ctx.restore();

    }

    ctx.restore();

}

function renderTimeline(ctx, camera, graph){

    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;

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

    let x1, y1, x2, y2;

    if(vertical){

        const lineX = halfW + (0 - camera.x) * camera.zoom;

        x1 = x2 = lineX;
        y1 = halfH + (first.targetY - camera.y) * camera.zoom;
        y2 = halfH + (last.targetY - camera.y) * camera.zoom;

    } else {

        const lineY = halfH + (0 - camera.y) * camera.zoom;

        y1 = y2 = lineY;
        x1 = halfW + (first.targetX - camera.x) * camera.zoom;
        x2 = halfW + (last.targetX - camera.x) * camera.zoom;

    }

    const glow = ctx.createLinearGradient(x1, y1, x2, y2);

    glow.addColorStop(0,"rgba(130,205,255,.25)");
    glow.addColorStop(.5,"rgba(190,240,255,.65)");
    glow.addColorStop(1,"rgba(255,255,255,.25)");

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.shadowColor = "rgba(140,210,255,.9)";
    ctx.shadowBlur = 18 * camera.zoom;

    ctx.strokeStyle = glow;
    ctx.lineWidth = 10 * camera.zoom;

    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,.9)";
    ctx.shadowBlur = 8 * camera.zoom;

    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = Math.max(2.5 * camera.zoom,1.2);

    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
    ctx.restore();

    //------------------------------------
    // One branch per poster, from the
    // spine straight out to it — batched
    // into a single path for the same
    // reason as the main edges above.
    //------------------------------------

    const branchPath = new Path2D();

    movies.forEach(node=>{

        const x = halfW + (node.x - camera.x) * camera.zoom;
        const y = halfH + (node.y - camera.y) * camera.zoom;

        if(vertical){

            branchPath.moveTo(x1, y);

        } else {

            branchPath.moveTo(x, y1);

        }

        branchPath.lineTo(x, y);

    });

    ctx.save();
    ctx.shadowColor = "rgba(200,230,255,.7)";
    ctx.shadowBlur = 6 * camera.zoom;

    ctx.strokeStyle = "rgba(255,255,255,.85)";
    ctx.lineWidth = Math.max(2 * camera.zoom,1);

    ctx.stroke(branchPath);
    ctx.restore();

}
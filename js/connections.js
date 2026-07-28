import { getCurrentView } from "./viewManager.js";

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

export function renderConnections(ctx, camera, graph){

    if(!graph.edges.length) return;

    ctx.save();

    ctx.globalCompositeOperation = "source-over";

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

    let any = false;

    graph.edges.forEach(edge=>{

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

        path.moveTo(x1, y1);
        path.lineTo(x2, y2);

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

    ctx.shadowColor = "rgba(255,255,255,1)";
    ctx.shadowBlur = 10 * camera.zoom;

    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.lineWidth = Math.max(2.5 * camera.zoom, 1.2);

    ctx.stroke(path);

    ctx.restore();

    ctx.restore();

}

function renderTimeline(ctx, camera, graph){

    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;

    //------------------------------------
    // Horizontal timeline
    //------------------------------------

    const movies = [...graph.nodes]
        .filter(n => !n.isBranch)
        .sort((a,b)=>a.targetX-b.targetX);

    if(!movies.length) return;

    const firstX = halfW + (movies[0].targetX - camera.x) * camera.zoom;
    const lastX  = halfW + (movies[movies.length-1].targetX - camera.x) * camera.zoom;

    const lineY = halfH + (0 - camera.y) * camera.zoom;

    const glow = ctx.createLinearGradient(firstX, lineY, lastX, lineY);

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
    ctx.moveTo(firstX,lineY);
    ctx.lineTo(lastX,lineY);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = "rgba(255,255,255,.9)";
    ctx.shadowBlur = 8 * camera.zoom;

    ctx.strokeStyle = "rgba(255,255,255,.9)";
    ctx.lineWidth = Math.max(2.5 * camera.zoom,1.2);

    ctx.beginPath();
    ctx.moveTo(firstX,lineY);
    ctx.lineTo(lastX,lineY);
    ctx.stroke();
    ctx.restore();

    //------------------------------------
    // One vertical branch per poster —
    // batched into a single path for the
    // same reason as the main edges above.
    //------------------------------------

    const branchPath = new Path2D();

    movies.forEach(node=>{

        const x = halfW + (node.x - camera.x) * camera.zoom;
        const y = halfH + (node.y - camera.y) * camera.zoom;

        branchPath.moveTo(x, lineY);
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
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

    graph.edges.forEach(edge=>{

        const from = resolveAnchor(edge.from, graph);
        const to = resolveAnchor(edge.to, graph);

        if(!from || !to) return;

        //----------------------------------
        // Screen Positions (camera-zoom aware)
        //----------------------------------

        const x1 = halfW + (from.x - camera.x) * camera.zoom;
        const y1 = halfH + (from.y - camera.y) * camera.zoom;

        const x2 = halfW + (to.x - camera.x) * camera.zoom;
        const y2 = halfH + (to.y - camera.y) * camera.zoom;

        //----------------------------------
        // Skip lines fully offscreen
        //----------------------------------

        if(

            (x1<0 && x2<0) || (x1>w && x2>w) ||
            (y1<0 && y2<0) || (y1>h && y2>h)

        ) return;

        //----------------------------------
        // Straighter connection routing
        //----------------------------------

        const dx = x2 - x1;
        const dy = y2 - y1;
        const dist = Math.hypot(dx, dy) || 1;

        const mx = (x1 + x2) * 0.5;
        const my = (y1 + y2) * 0.5;

        const nx = -dy / dist;
        const ny = dx / dist;

        // Much smaller bend so connections stay organized.
        const bend = Math.min(24 + dist * 0.06, 80);

        const cx = mx + nx * bend;
        const cy = my + ny * bend;
        //----------------------------------
        // Glow — shadowBlur gives a genuine
        // soft halo (the gradient stroke
        // alone read as just "a wide line",
        // not an actual glow).
        //----------------------------------

        ctx.save();

        ctx.globalCompositeOperation = "lighter";

        const glow = ctx.createLinearGradient(x1, y1, x2, y2);

        glow.addColorStop(0, "rgba(130,205,255,.28)");
        glow.addColorStop(.5, "rgba(170,235,255,.60)");
        glow.addColorStop(1, "rgba(255,255,255,.28)");

        ctx.shadowColor = "rgba(140,210,255,.9)";
        ctx.shadowBlur = 18 * camera.zoom;

        ctx.strokeStyle = glow;
        ctx.lineWidth = 10 * camera.zoom;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.restore();

        //----------------------------------
        // Bright Core — its own shadowBlur
        // too, so the very centre of the
        // line still visibly glows even
        // where the wide gradient pass above
        // is close to transparent.
        //----------------------------------

        ctx.save();

        ctx.shadowColor = "rgba(255,255,255,.9)";
        ctx.shadowBlur = 8 * camera.zoom;

        ctx.strokeStyle = "rgba(255,255,255,.88)";
        ctx.lineWidth = Math.max(2.5 * camera.zoom, 1.2);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        ctx.restore();

    });

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
    // One vertical branch per poster
    //------------------------------------

    movies.forEach(node=>{

        const x = halfW + (node.x - camera.x) * camera.zoom;
        const y = halfH + (node.y - camera.y) * camera.zoom;

        ctx.save();
        ctx.shadowColor = "rgba(200,230,255,.7)";
        ctx.shadowBlur = 6 * camera.zoom;

        ctx.strokeStyle = "rgba(255,255,255,.85)";
        ctx.lineWidth = Math.max(2 * camera.zoom,1);

        ctx.beginPath();
        ctx.moveTo(x,lineY);
        ctx.lineTo(x,y);
        ctx.stroke();
        ctx.restore();

    });

}
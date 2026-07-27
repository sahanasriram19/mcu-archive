//==================================================
// PHASE BRANCH NODE RENDERER
//
// The visible category circles in the mind-map views
// ("PHASE 1", "PHASE 2"...). Nothing to do with movie
// posters — these are rendered separately so they
// read as clear category anchors.
//
// TO CHANGE THE CIRCLE SIZE OR PULSE: edit the two
// constants right below this comment.
//==================================================

const BASE_RADIUS = 72;     // circle size in world units, before zoom

const PULSE = false;        // set true to bring back the gentle breathing effect

const PHASE_COLOURS = {

    0: "150,150,160",   // Defenders saga — steel grey
    1: "226,89,107",    // red
    2: "217,148,79",    // orange
    3: "232,183,75",    // gold
    4: "91,141,239",    // blue
    5: "155,140,246",   // violet
    6: "98,201,141"     // green

};

export function renderBranchNodes(ctx, camera, branchNodes){

    if(!branchNodes.length) return;

    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    const halfW = window.innerWidth/2;
    const halfH = window.innerHeight/2;

    branchNodes.forEach(node=>{

        const x = halfW + (node.x - camera.x) * camera.zoom;
        const y = halfH + (node.y - camera.y) * camera.zoom;

        if(

            x < -200 || x > window.innerWidth + 200 ||
            y < -200 || y > window.innerHeight + 200

        ) return;

        const pulse = PULSE ? (0.9 + Math.sin(node.pulse) * 0.1) : 1;

        const radius = BASE_RADIUS * camera.zoom * pulse;

        const phaseNum = typeof node.phase === "number" ? node.phase : null;

        const colour = PHASE_COLOURS[phaseNum] || "230,150,60";

        //----------------------------------
        // Glow
        //----------------------------------

        const glow = ctx.createRadialGradient(x,y,0,x,y, radius*2.8);

        glow.addColorStop(0, `rgba(${colour},.4)`);
        glow.addColorStop(.4, `rgba(${colour},.16)`);
        glow.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = glow;

        ctx.beginPath();
        ctx.arc(x,y, radius*2.8, 0, Math.PI*2);
        ctx.fill();


        //----------------------------------
        // Label
        //----------------------------------

        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 ${Math.max(19, 27 * camera.zoom)}px Inter`;
        ctx.shadowColor = "rgba(0,0,0,.6)";
        ctx.shadowBlur = 6 * camera.zoom;

        ctx.fillText(node.label, x, y);

        ctx.restore();

        //----------------------------------
        // Subtitle (era + year range + count)
        //----------------------------------

        if(node.subtitle){

            ctx.fillStyle = "rgba(255,255,255,.8)";
            ctx.textAlign = "center";
            ctx.font = `${Math.max(16, 22 * camera.zoom)}px Inter`;

            ctx.fillText(
            node.subtitle,
            x,
            y + radius + Math.max(6, 12 * camera.zoom)
        );

        }

    });

    ctx.restore();

}
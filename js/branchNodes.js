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

import { graph } from "./graph.js";

export const PHASE_COLOURS = {

    0: "150,150,160",   // Defenders saga — steel grey
    1: "226,89,107",    // red
    2: "217,148,79",    // orange
    3: "232,183,75",    // gold
    4: "91,141,239",    // blue
    5: "155,140,246",   // violet
    6: "98,201,141"     // green

};

//--------------------------------------------------
// Hover highlight colours for the Complete MCU mind map.
// Brighter, more saturated cousins of the colours above,
// picked so every phase is clearly different from the
// normal pale-blue lines AND from each other. (Using the
// colours above directly, Phase 4's blue looked like no
// change at all and Phase 0's grey barely registered.)
// Phase 0 swaps grey for teal, since grey can't stand
// out against white lines.
//--------------------------------------------------

export const HIGHLIGHT_COLOURS = {

    0: "45,212,191",    // teal
    1: "248,72,94",     // red
    2: "251,140,40",    // orange
    3: "250,210,30",    // gold
    4: "64,120,255",    // royal blue
    5: "196,110,255",   // purple
    6: "60,225,120"     // green

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

        // Nothing to show for an unlabelled branch (the hub,
        // and the phase junctions on the Complete MCU mind
        // map) — skip it rather than leave a bare glow circle.
        // ...except while its branch is hovered on the mind
        // map: then it shows its phase name as a hint.
        const hovered = !!node.hint &&
            graph.hover.phase !== null &&
            node.phase === graph.hover.phase;

        const label = node.label || (hovered ? node.hint : "");
        const subtitle = node.subtitle || (hovered ? node.hintSubtitle : "");

        if(!label && !subtitle) return;

        const pulse = PULSE ? (0.9 + Math.sin(node.pulse) * 0.1) : 1;

        const radius = BASE_RADIUS * camera.zoom * pulse;

        const phaseNum = typeof node.phase === "number" ? node.phase : null;

        const colour = PHASE_COLOURS[phaseNum] || "230,150,60";

        const hintColour = HIGHLIGHT_COLOURS[phaseNum] || colour;

        // Each branch gets its own save/restore so the text
        // shadow below can't leak out. It used to: a stray
        // restore() here only balanced when there was a
        // single branch node, so with several (Phases, the
        // mind map) shadowBlur stayed switched on for every
        // poster, glow and line drawn afterwards — by far the
        // most expensive thing canvas does, and the cause of
        // the choppy animation.
        ctx.save();

        //----------------------------------
        // Glow
        //----------------------------------

        // Hovered mind-map junctions glow in the highlight
        // colour so they match the lit-up branch.
        const glowColour = (hovered && !node.label) ? hintColour : colour;

        const glow = ctx.createRadialGradient(x,y,0,x,y, radius*2.8);

        glow.addColorStop(0, `rgba(${glowColour},.4)`);
        glow.addColorStop(.4, `rgba(${glowColour},.16)`);
        glow.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = glow;

        ctx.beginPath();
        ctx.arc(x,y, radius*2.8, 0, Math.PI*2);
        ctx.fill();


        //----------------------------------
        // Label
        //----------------------------------

        // A thin dark outline instead of shadowBlur: same
        // "lifts off the background" effect, but shadowBlur
        // on text is expensive to redraw every frame and at
        // the default zoom the blur was under a pixel anyway.
        // Drawn normally (not "lighter") so the dark outline
        // actually shows.
        ctx.globalCompositeOperation = "source-over";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(0,0,0,.55)";
        ctx.lineWidth = 4;

        // Hint labels take a pale tint of the phase colour:
        // the full-strength colour (e.g. Phase 4's blue) can be
        // hard to read against the dark navy background.
        const tint = hintColour.split(",").map(c => Math.round((+c + 255*1.2) / 2.2)).join(",");

        ctx.fillStyle = (hovered && !node.label) ? `rgb(${tint})` : "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `700 ${Math.max(19, 27 * camera.zoom)}px Inter`;

        if(label){

            ctx.strokeText(label, x, y);
            ctx.fillText(label, x, y);

        }

        //----------------------------------
        // Subtitle (era + year range + count)
        //----------------------------------

        if(subtitle){

            ctx.fillStyle = "rgba(255,255,255,.8)";
            ctx.textAlign = "center";
            ctx.font = `${Math.max(16, 22 * camera.zoom)}px Inter`;

            ctx.lineWidth = 3;

            ctx.strokeText(subtitle, x, y + radius + 8);

            ctx.fillText(
                subtitle,
                x,
                y + radius + 8
            );

        }

        ctx.restore();

    });

    ctx.restore();

}
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
import { projectNode } from "./depth.js";
import { PHASE_LABEL_WRAP } from "./layout.js";

// A long name split onto two lines, as evenly as the words
// allow ("Sony's Spider-Man" / "Universe").
function wrapLabel(text){

    if(text.length <= PHASE_LABEL_WRAP || !text.includes(" ")) return [text];

    const words = text.split(" ");

    let best = null;

    for(let i = 1; i < words.length; i++){

        const a = words.slice(0, i).join(" "), b = words.slice(i).join(" ");

        const longest = Math.max(a.length, b.length);

        if(!best || longest < best.longest) best = { lines: [a, b], longest };

    }

    return best.lines;

}

export const PHASE_COLOURS = {

    0: "150,150,160",   // Defenders saga — steel grey
    1: "226,89,107",    // red
    2: "217,148,79",    // orange
    3: "232,183,75",    // gold
    4: "91,141,239",    // blue
    5: "155,140,246",   // violet
    6: "98,201,141",    // green

    // X-Men eras (js/worlds.js)
    11: "70,110,230",   // Original Trilogy — blue
    12: "240,160,40",   // Wolverine — amber
    13: "40,190,170",   // First Class Saga — teal
    14: "225,45,60",    // Deadpool — red
    15: "150,110,240",  // Animated X-Men — violet

    // Spider-Man eras (js/worlds.js)
    21: "220,45,55",    // Raimi Trilogy — red
    22: "40,120,230",   // The Amazing Spider-Man — blue
    23: "240,70,170",   // Spider-Verse — magenta
    24: "255,190,60",   // MCU Spider-Man (Tom Holland) — gold
    25: "120,120,135",  // Sony's Spider-Man Universe — grey
    26: "235,95,60",    // Classic Cartoons — orange
    27: "60,170,240",   // Modern Cartoons — sky blue
    28: "255,120,190",  // Spidey & Friends — pink
    29: "90,95,120",    // Venom — symbiote black-blue

    // Animated eras (js/worlds.js)
    31: "214,160,90",   // Classic Cartoons — tan
    32: "120,170,90",   // 2000s Cartoons — olive
    33: "70,140,235",   // Disney XD Era — blue
    34: "240,180,60",   // Shorts — amber
    35: "200,90,230",   // Marvel Rising — purple
    36: "80,200,220",   // Disney Junior — cyan
    37: "250,200,40",   // LEGO Marvel — yellow
    38: "200,60,60",    // Adult Animation — crimson
    39: "230,60,80",    // Marvel Studios Animation — red
    40: "240,70,170",   // Spider-Verse — magenta
    41: "235,80,70",    // Spider-Man Cartoons — red

    // Fantastic Four eras (js/worlds.js)
    51: "120,170,255",  // Cartoons — light blue
    52: "240,120,40",   // Fox Films — flame orange
    53: "70,110,230",   // Marvel Studios — FF blue

    // Marvel Unscripted groups (js/worlds.js)
    61: "230,170,60",   // Docuseries — gold
    62: "200,90,200",   // Specials — magenta
    63: "230,60,80",    // Assembled 2021 — red
    64: "90,150,240",   // Assembled 2022 — blue
    65: "60,190,150",   // Assembled 2023 — teal
    66: "240,120,50",   // Assembled 2024 — orange

    // Marvel Television eras (js/worlds.js)
    71: "70,110,200",   // ABC — S.H.I.E.L.D. blue
    73: "150,150,160",  // Netflix — Defenders steel grey
    74: "190,90,190",   // Hulu & Freeform — magenta
    75: "230,180,60",   // Fox X-Men Shows — gold
    76: "60,170,220"    // Disney+ — Disney+ blue

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
    6: "60,225,120",    // green

    11: "80,130,255",   // Original Trilogy
    12: "255,176,40",   // Wolverine
    13: "40,220,195",   // First Class Saga
    14: "255,60,80",    // Deadpool
    15: "180,120,255",  // Animated X-Men

    21: "255,70,80",    // Raimi Trilogy
    22: "70,150,255",   // The Amazing Spider-Man
    23: "255,90,190",   // Spider-Verse
    24: "255,200,70",   // MCU Spider-Man
    25: "170,175,195",  // Sony's Spider-Man Universe
    26: "255,120,60",   // Classic Cartoons
    27: "60,200,255",   // Modern Cartoons
    28: "255,130,210",  // Spidey & Friends
    29: "130,140,200",  // Venom

    31: "235,180,100",  // Classic Cartoons
    32: "150,220,90",   // 2000s Cartoons
    33: "80,150,255",   // Disney XD Era
    34: "255,190,50",   // Shorts
    35: "215,100,255",  // Marvel Rising
    36: "70,225,240",   // Disney Junior
    37: "255,225,40",   // LEGO Marvel
    38: "255,70,70",    // Adult Animation
    39: "255,60,90",    // Marvel Studios Animation
    40: "255,90,190",   // Spider-Verse
    41: "255,80,70",    // Spider-Man Cartoons

    51: "130,190,255",  // Cartoons
    52: "255,130,40",   // Fox Films
    53: "80,130,255",   // Marvel Studios

    61: "255,190,60",   // Docuseries
    62: "225,100,235",  // Specials
    63: "255,70,90",    // Assembled 2021
    64: "90,160,255",   // Assembled 2022
    65: "60,225,170",   // Assembled 2023
    66: "255,135,50",   // Assembled 2024

    71: "90,150,255",   // ABC
    73: "45,212,191",   // Netflix (teal, as the MCU's Defenders)
    74: "230,100,240",  // Hulu & Freeform
    75: "255,200,60",   // Fox X-Men Shows
    76: "60,200,255"    // Disney+

};

export function renderBranchNodes(ctx, camera, branchNodes){

    if(!branchNodes.length) return;

    ctx.save();

    ctx.globalCompositeOperation = "lighter";

    branchNodes.forEach(node=>{

        // (Not grown out yet — see GROWING in viewManager.js.)
        if(node.growHidden) return;

        // With depth and tilt (js/depth.js).
        const at = projectNode(node);

        const x = at.x;
        const y = at.y;

        // Labels shrink a little with distance, but never
        // below the sizes they already had as a minimum.
        const z = camera.zoom * at.s;

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

        const radius = BASE_RADIUS * z * pulse;

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

        // (No glow behind the name any more: the map keeps
        // its glow for the branches themselves.)


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
        // Bebas Neue, the heading font (css/comic.css); it's
        // narrow, so it's set a little bigger.
        // (The Phases view — node.wrap — keeps its names a
        // little smaller when zoomed right out, so they sit
        // inside their rings; LABEL_PX_PER_CHAR in layout.js
        // matches.)
        const labelSize = Math.max(node.wrap ? 20 : 24, 34 * z);

        ctx.font = `400 ${labelSize}px "Bebas Neue", Impact, "Arial Narrow", sans-serif`;

        // The Phases view wraps a long name onto two lines
        // (node.wrap, set in layout.js), centred on the spot.
        const lines = label ? (node.wrap ? wrapLabel(label) : [label]) : [];

        const lineHeight = labelSize * 0.92;

        // How far the name's extra lines push the years down.
        const extraDown = (lines.length - 1) * lineHeight / 2;

        lines.forEach((line, i) => {

            const ly = y + (i - (lines.length - 1) / 2) * lineHeight;

            ctx.strokeText(line, x, ly);
            ctx.fillText(line, x, ly);

        });

        //----------------------------------
        // Subtitle (era + year range + count)
        //----------------------------------

        if(subtitle){

            // Clear of the name above it, however big that is.
            const subtitleGap = Math.max(radius + 8, labelSize * 0.62 + Math.max(node.wrap ? 13 : 16, 22 * z) * 0.55);

            ctx.fillStyle = "rgba(255,255,255,.8)";
            ctx.textAlign = "center";
            const subtitleSize = Math.max(node.wrap ? 13 : 16, 22 * z);

            ctx.font = `${subtitleSize}px Inter, Arial, sans-serif`;

            ctx.lineWidth = 3;

            ctx.strokeText(subtitle, x, y + subtitleGap + extraDown);

            ctx.fillText(
                subtitle,
                x,
                y + subtitleGap + extraDown
            );

        }

        ctx.restore();

    });

    ctx.restore();

}
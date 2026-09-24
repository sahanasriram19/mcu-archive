//==================================================
// MCU LAYOUT ENGINE
//
// Every function here does the same thing: it sets
// targetX / targetY on each node — never node.x/y
// directly, and never anything based on Math.random()
// or a node's current position. graph.js eases nodes
// toward the target every frame (that's the "no fade,
// no reload" view swap), and a pure function of static
// data is what makes revisiting a view always land on
// exactly the same layout instead of drifting.
//==================================================

import { setBranchNodes } from "./graph.js";
import { getSelectedCharacter } from "./characters/characterJourney.js";
import { isCompact, isPortraitPhone } from "./responsive.js";

//--------------------------------------------------
// Short era name per phase, used as the branch node's
// subtitle. The year range itself is computed from
// the actual data, not hardcoded.
//--------------------------------------------------



function phaseSubtitle(members){

    const years = members.map(m => new Date(m.release).getFullYear());

    const min = Math.min(...years);
    const max = Math.max(...years);

    return min === max ? `${min}` : `${min}–${max}`;

}

//--------------------------------------------------
// OVERLAP RESOLUTION
// This is the fix: a deterministic pairwise separation
// pass, run once per layout call, that nudges any two
// overlapping poster boxes apart along whichever axis
// needs the smaller push. It only ever reads/writes the
// targetX/targetY values the layout just set — never
// Math.random(), never a node's current on-screen x/y —
// so it's still a pure function of the data and always
// resolves to the exact same result.
//--------------------------------------------------

const POSTER_W = 320;
const POSTER_H = POSTER_W * 1.5;

const OVERLAP_MARGIN = 0;      // clear air kept between poster edges
const OVERLAP_ITERATIONS = 200; // converges in well under this for 80 nodes

function resolveOverlaps(nodes, margin = OVERLAP_MARGIN){

    const minW = POSTER_W + margin;
    const minH = POSTER_H + margin;

    for(let iter=0; iter<OVERLAP_ITERATIONS; iter++){

        let moved = false;

        for(let i=0;i<nodes.length;i++){

            for(let j=i+1;j<nodes.length;j++){

                const a = nodes[i], b = nodes[j];

                const dx = b.targetX - a.targetX;
                const dy = b.targetY - a.targetY;

                const overlapX = minW - Math.abs(dx);
                const overlapY = minH - Math.abs(dy);

                if(overlapX > 0 && overlapY > 0){

                    moved = true;

                    // Push apart along whichever axis is
                    // closest to clear — keeps the nudge as
                    // small (and as true to the original
                    // layout) as possible.
                    if(overlapX < overlapY){

                        const push = overlapX/2 + 0.5;
                        const sign = dx !== 0 ? Math.sign(dx) : (j%2===0 ? 1 : -1);

                        a.targetX -= sign*push;
                        b.targetX += sign*push;

                    } else {

                        const push = overlapY/2 + 0.5;
                        const sign = dy !== 0 ? Math.sign(dy) : (j%2===0 ? 1 : -1);

                        a.targetY -= sign*push;
                        b.targetY += sign*push;

                    }

                }

            }

        }

        if(!moved) break;

    }

}

//--------------------------------------------------
// COMPLETE MCU — a real mind map: hub in the centre,
// one branch per phase, evenly spaced around it
// (equal wedges, so a big phase never crowds a small
// one out), and that phase's movies ringing outward
// from their branch, several to a ring, far enough
// apart that full-size posters never overlap.
//--------------------------------------------------

// Order the phase branches go round the hub, clockwise
// from the top. Phase 0 (the Defenders-saga shows) sits
// last so it lands next to Phase 1, closing the loop.
const MINDMAP_PHASE_ORDER = [1, 2, 3, 4, 5, 6, 0];

const MINDMAP_PHASE_RADIUS = 1500;  // hub -> phase node
const MINDMAP_FIRST_TIER = 2500;    // hub -> first row of titles
const MINDMAP_TIER_STEP = 950;      // gap between rows of titles
const MINDMAP_SLOT = 470;           // arc length each poster needs
const MINDMAP_WEDGE_PAD = 4;        // extra "weight" per phase so small phases still get room

// Stretch factors that turn the circle into an ellipse
// matching the screen's shape — wide on a laptop, tall on
// a phone — so the map fills the screen instead of sitting
// in a circle with empty space either side. Area stays
// roughly the same, it's just redistributed.
function mindmapStretch(){

    const aspect = Math.min(2.2, Math.max(0.5,
        window.innerWidth / Math.max(1, window.innerHeight)
    ));

    const s = Math.sqrt(aspect);

    return { sx: Math.max(0.8, s * 1.05), sy: Math.max(0.8, 1 / s * 1.05) };

}

// Splits a phase's titles (already in timeline order)
// into rows radiating out from its branch: a few "lead"
// titles first, then progressively wider rows — that's
// what gives each branch its fanned-out, tree-like look.
function mindmapTiers(members, wedge){

    const tiers = [];

    let index = 0;
    let tier = 0;

    let wanted = Math.max(2, Math.min(4, Math.round(members.length / 4)));

    while(index < members.length){

        const radius = MINDMAP_FIRST_TIER + tier * MINDMAP_TIER_STEP;

        const capacity = Math.max(2, Math.floor((wedge * radius) / MINDMAP_SLOT));

        let count = Math.min(capacity, wanted, members.length - index);

        // Don't leave a lonely one- or two-title row at the
        // end if it can fit on the row before it.
        const left = members.length - index - count;

        if(left > 0 && left <= 2 && count + left <= capacity) count += left;

        tiers.push({ radius, members: members.slice(index, index + count) });

        index += count;
        tier++;

        wanted = Math.ceil(wanted * 1.6);

    }

    return tiers;

}

export function layoutComplete(nodes){

    const { sx, sy } = mindmapStretch();

    const groups = {};

    nodes.forEach(node=>{

        groups[node.phase] = groups[node.phase] || [];
        groups[node.phase].push(node);

    });

    const phaseKeys = [
        ...MINDMAP_PHASE_ORDER.filter(p => groups[p] && groups[p].length),
        ...Object.keys(groups).map(Number).filter(p => !MINDMAP_PHASE_ORDER.includes(p)).sort((a,b)=>a-b)
    ];

    // Wedge size grows with phase size, so Phase 4's 17
    // titles get more of the circle than Phase 0's 6 —
    // the padding keeps small phases from being squeezed.
    const weights = phaseKeys.map(p => groups[p].length + MINDMAP_WEDGE_PAD);
    const totalWeight = weights.reduce((a,b)=>a+b, 0);

    const branches = [{
        phase:null,
        key:"hub",
        label:"",
        subtitle:"",
        x:0,
        y:0
    }];

    let cursor = -Math.PI/2 - (weights[0] / totalWeight) * Math.PI;

    phaseKeys.forEach((phase, pi)=>{

        const wedge = (weights[pi] / totalWeight) * Math.PI * 2;

        const centre = cursor + wedge/2;

        cursor += wedge;

        // No label on the homepage — the Phases view already
        // names each phase. The branch node itself stays (just
        // its small coloured glow): it's the junction the lines
        // split from, and sharing the "phaseN" key with the
        // Phases view is what makes switching views glide
        // instead of rebuilding from the centre.
        branches.push({

            phase,
            key: "phase"+phase,
            label: "",
            subtitle: "",
            // Shown only while that branch is hovered.
            hint: "PHASE "+phase,
            hintSubtitle: phaseSubtitle(groups[phase]),
            x: Math.cos(centre) * MINDMAP_PHASE_RADIUS * sx,
            y: Math.sin(centre) * MINDMAP_PHASE_RADIUS * sy

        });

        const members = [...groups[phase]].sort((a,b)=>a.timeline-b.timeline);

        // Leave a little clear air at each wedge edge so
        // neighbouring phases read as separate branches.
        const usable = wedge * 0.86;

        mindmapTiers(members, usable).forEach((tier, ti)=>{

            const n = tier.members.length;

            const step = Math.min(usable / n, MINDMAP_SLOT * 1.4 / tier.radius);

            // Every other row is nudged half a slot sideways
            // so rows interleave like leaves rather than
            // lining up in rigid columns.
            const stagger = (ti % 2 === 1 && n > 1) ? step * 0.18 : 0;

            tier.members.forEach((node, i)=>{

                const angle = centre + (i - (n-1)/2) * step + stagger;

                node.layout = "complete";
                node.ring = 0;
                node.tier = ti;
                node.mindmapAngle = angle;

                node.targetX = Math.cos(angle) * tier.radius * sx;
                node.targetY = Math.sin(angle) * tier.radius * sy;

            });

        });

    });

    setBranchNodes(branches);

    resolveOverlaps(nodes, 40);

}

//--------------------------------------------------
// PHASES — a compact grid, four phases across the
// top and three across the bottom, all centred on
// the screen so nothing needs zooming out to see.
// Each phase is one full circle of its own movies —
// no nested rings — with the circle's radius scaled
// to how many titles it holds, so Phase 4's 17 titles
// get a bigger circle than Phase 0's 6 without either
// one overlapping its neighbours.
//--------------------------------------------------

const PHASE_GRID_X = 2800;
const PHASE_GRID_Y = 2800;

const PHASE_TOP_ROW_COUNT = 4;

// Radius large enough that arc-spacing comfortably clears
// a poster width even at n=17 (Phase 4) — this is the same
// fix that made Complete MCU's switch fast: give
// resolveOverlaps very little correcting to do in the first
// place, rather than relying on many iterations to untangle
// a tightly-packed starting position.
function phaseRingRadius(n){

    return 620 + Math.max(0, n-6)*55;

}

export function layoutPhases(nodes){

    const groups = {};

    nodes.forEach(node=>{

        groups[node.phase] = groups[node.phase] || [];
        groups[node.phase].push(node);

    });

    // Drop any phase group with no movies — no orphan
    // island for a category nothing belongs to.
    const phaseKeys = Object.keys(groups)
        .map(Number)
        .filter(phase => groups[phase].length > 0)
        .sort((a,b)=>a-b);

    // Upright phone: one phase per row, top to bottom, so
    // each ring is big enough to read and you scroll down
    // through the phases like a feed. (The 4 + 3 grid below
    // is far too wide for a phone held upright.)
    // Phone held sideways: the same idea turned on its side —
    // one row, left to right, that you swipe through. (Two
    // rows are too tall for a ~340px-high screen.)
    if(isCompact()){

        const portrait = isPortraitPhone();

        const column = phaseKeys.map((phase, pi)=>({

            phase,
            key: "phase"+phase,
            label: "PHASE "+phase,
            subtitle: phaseSubtitle(groups[phase]),
            x: portrait ? 0 : pi * PHASE_GRID_X,
            y: portrait ? pi * PHASE_GRID_Y : 0

        }));

        setBranchNodes(column);

        placePhaseRings(column, groups);

        resolveOverlaps(nodes);

        return;

    }

    const branchTargets = phaseKeys.map((phase,pi)=>{

        const row = pi < PHASE_TOP_ROW_COUNT ? 0 : 1;

        const col = row === 0 ? pi : pi - PHASE_TOP_ROW_COUNT;

        const rowCount = row === 0 ?
            Math.min(PHASE_TOP_ROW_COUNT, phaseKeys.length) :
            phaseKeys.length - PHASE_TOP_ROW_COUNT;

        return {

            phase,
            key: "phase"+phase,
            label: "PHASE "+phase,
            subtitle: phaseSubtitle(groups[phase]),
            x: (col - (rowCount-1)/2) * PHASE_GRID_X,
            y: (row - 0.5) * PHASE_GRID_Y

        };

    });

    setBranchNodes(branchTargets);

    placePhaseRings(branchTargets, groups);

    // Guarantees zero overlap island-to-island as well as
    // within a single crowded ring.
    resolveOverlaps(nodes);

}

// Rings each phase's titles around its branch position.
function placePhaseRings(branches, groups){

    branches.forEach(branch=>{

        const members = [...groups[branch.phase]].sort((a,b)=>a.timeline-b.timeline);

        const n = members.length;

        const radius = phaseRingRadius(n);

        members.forEach((node,i)=>{

            const angle = (i/n)*Math.PI*2 - Math.PI/2;

            node.targetX = branch.x + Math.cos(angle)*radius;
            node.targetY = branch.y + Math.sin(angle)*radius*0.88;

        });

    });

}



//--------------------------------------------------
// RELEASE ORDER / CHRONOLOGICAL ORDER — a single
// strict left-to-right zigzag, like a timeline chart:
// oldest/first on the left, each next title alternating
// above and below a shared centre line, connected to its
// neighbour by a nearly-straight line (see graph.js
// edgesChain + connections.js's "straight" edge style).
//
// The chunk/ring version this replaced grouped movies
// into little circular clusters — visually tidy, but it
// meant reading order required following a line around
// a ring, which wasn't obviously left-to-right. Putting
// every title in strict x order the way a real timeline
// does makes the order unambiguous: it's just left to
// right, full stop.
//
// Small era labels sit directly on the centre line every
// few titles for date-range reference, purely decorative
// — they're not part of the chain.
//--------------------------------------------------

const TIMELINE_SPACING_X = 420;

const TIMELINE_STEM = 260;

const TIMELINE_LABEL_EVERY = 5;

const TIMELINE_BRANCH_OFFSET = 120;

// Upright phones: the timeline runs top to bottom instead,
// titles alternating left and right of a vertical spine.
// Same-side neighbours are 2 x spacing apart, which must
// clear a poster's height (480) — hence 290.
const TIMELINE_SPACING_Y = 290;
const TIMELINE_SIDE_X = 330;

export function layoutRelease(nodes){

    layoutTimeline(

        nodes,
        (a,b)=> new Date(a.release)-new Date(b.release),
        members => phaseLabel(members),
        members => {

            const years = members.map(m=>new Date(m.release).getFullYear());

            const min = Math.min(...years), max = Math.max(...years);

            return min===max ? `${min}` : `${min}–${max}`;

        }

    );

}

export function layoutChronology(nodes){

    layoutTimeline(

        nodes,
        (a,b)=> a.timeline-b.timeline,
        members => phaseLabel(members),
        () => ""

    );

}

// Shared by both — a chunk's headline label is the single
// MCU phase most of its movies belong to. This used to show
// a range ("PHASE 2–4") whenever a chunk straddled a phase
// boundary, which for chunks touching Phase 0 (Defenders)
// could read as an odd "PHASE 0–3" — a single representative
// number reads more cleanly on the timeline.
function phaseLabel(members){

    const counts = {};

    members.forEach(m=>{

        if(typeof m.phase === "number"){

            counts[m.phase] = (counts[m.phase]||0) + 1;

        }

    });

    const phases = Object.keys(counts).map(Number);

    if(!phases.length) return "";

    phases.sort((a,b)=> counts[b]-counts[a] || a-b);

    return `PHASE ${phases[0]}`;

}

// Which way the current timeline runs ("horizontal" or
// "vertical"); read by connections.js.
let timelineOrientation = "horizontal";

export function getTimelineOrientation(){

    return timelineOrientation;

}

function layoutTimeline(nodes, compareFn, labelFn, subtitleFn){

    const sorted = [...nodes].sort(compareFn);

    sorted.forEach(node=>{
    node.layout = "timeline";
    node.ring = 0;
});

    const vertical = isPortraitPhone();

    // connections.js draws the spine along whichever axis
    // this says.
    timelineOrientation = vertical ? "vertical" : "horizontal";

    // Starts at x:0 and runs rightward — deliberately not
    // centred, so the camera (see views.js) lands right on
    // the beginning of the timeline instead of somewhere in
    // the middle of it.
        sorted.forEach((node,i)=>{

            const side = i % 2 === 0 ? -1 : 1;

            if(vertical){

                node.targetX = side * TIMELINE_SIDE_X;

                node.targetY = i * TIMELINE_SPACING_Y;

            } else {

                node.targetX = i * TIMELINE_SPACING_X;

                node.targetY = side * (TIMELINE_STEM + 80);

            }

        });

    // Small floating date-range labels sitting right on the
    // centre line, just for reference — no edges connect to
    // these, they're not part of the chain.
    const labels = [];

    for(let i=0; i<sorted.length; i+=TIMELINE_LABEL_EVERY){

        const chunk = sorted.slice(i, i+TIMELINE_LABEL_EVERY);

        const midIndex = i + (chunk.length-1)/2;

        labels.push({

            phase:null,

            key:"era"+i,

            label:labelFn(chunk),

            subtitle: subtitleFn ? subtitleFn(chunk) : "",

            x: vertical ? 0 : midIndex * TIMELINE_SPACING_X,

            y: vertical ? midIndex * TIMELINE_SPACING_Y : 0,

            memberIds:chunk.map(movie=>movie.id)

        });

    }

    setBranchNodes(labels);

    // Guarantees no two posters overlap even where the
    // zigzag runs tight.
    resolveOverlaps(nodes);

}

//--------------------------------------------------
// CHARACTER JOURNEYS — one constellation per lead
// character, in the order they first appear.
//--------------------------------------------------

export function layoutCharacters(nodes){

    const character = getSelectedCharacter();

    if(!character) return;

    setBranchNodes([]);

    const movies = nodes
        .filter(node =>
            (node.characters || []).includes(character)
        )
        .sort((a,b)=>a.timeline-b.timeline);

        nodes.forEach(node=>{

    if(!movies.includes(node)){

        node.targetX = 100000;
        node.targetY = 100000;

    }

});

    const SPACING = 650;

    const vertical = isPortraitPhone();

    movies.forEach((node,i)=>{

        const side = i % 2 === 0 ? -1 : 1;

        // Order along the journey — graph.js chains the
        // titles by this, whichever way the layout runs.
        node.journeyIndex = i;

        if(vertical){

            // Top to bottom, alternating left/right. Same-side
            // neighbours sit 2 x 270 apart, clearing a 450-tall
            // poster.
            node.targetX = side * 230;

            node.targetY = i * 270;

        } else {

            node.targetX = i * SPACING;

            node.targetY = side * 280;

        }

    });

}

export function layoutCharacterJourney(nodes){

    const character = getSelectedCharacter();

    if(!character) return;

    setBranchNodes([]);

    nodes.forEach(node=>{

        node.targetX = 100000;
        node.targetY = 100000;

    });

    const movies = nodes
        .filter(n =>
            n.characters &&
            n.characters.includes(character)
        )
        .sort((a,b)=>a.timeline-b.timeline);

    const spacing = 700;

    movies.forEach((movie,index)=>{

        movie.targetX = index * spacing;
        movie.targetY = 0;

    });

}


//==================================================
// REGISTRY
//==================================================

export const LAYOUTS = {

    complete: layoutComplete,
    phases: layoutPhases,
    release: layoutRelease,
    chronology: layoutChronology,
    characters: layoutCharacters,
    characterJourney: layoutCharacterJourney

};
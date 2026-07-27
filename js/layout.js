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

//--------------------------------------------------
// Short era name per phase, used as the branch node's
// subtitle. The year range itself is computed from
// the actual data, not hardcoded.
//--------------------------------------------------



function phaseSubtitle(members){

    const years = members.map(m => new Date(m.release).getFullYear());

    const min = Math.min(...years);
    const max = Math.max(...years);

    const range = min === max ? `${min}` : `${min}–${max}`;

    return `${range} · ${members.length} titles`;

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

const HUB_RADIUS = 900;
const RING_SPACING = 850;
const ITEMS_PER_RING = 18;
const ELLIPSE_X = 1;
const ELLIPSE_Y = 1;

const RING_COUNTS = [
    8,
    12,
    16,
    20,
    24,
    26,
    26,
    26
];

export function layoutComplete(nodes){

    setBranchNodes([{
        phase:null,
        key:"hub",
        label:"",
        subtitle:"",
        x:0,
        y:0
    }]);

    const ordered = [...nodes].sort(
        (a,b)=>a.timeline-b.timeline
    );

    let index = 0;

    RING_COUNTS.forEach((count, ring)=>{

        const members = ordered.slice(index,index+count);

        let radius =
            HUB_RADIUS +
            ring * RING_SPACING;

       // Give the outer rings much more breathing room.
        if (ring === RING_COUNTS.length - 2) radius += 350;
        if (ring === RING_COUNTS.length - 1) radius += 1400;

        members.forEach((node,i)=>{

            const angle =
                (i/members.length) *
                Math.PI*2 -
                Math.PI/2;

            node.layout = "complete";
            node.ring = ring;

            node.targetX =
                Math.cos(angle) * radius;

            node.targetY =
                Math.sin(angle) * radius;

        });

        index += count;

    });

    if(index < ordered.length){

        const members = ordered.slice(index);

        const ring = RING_COUNTS.length;

        const radius =
            HUB_RADIUS +
            ring * RING_SPACING;

        members.forEach((node,i)=>{

            const angle =
                (i/members.length) *
                Math.PI*2 -
                Math.PI/2;

            node.layout = "complete";
            node.ring = ring;

            node.targetX =
                Math.cos(angle) * radius;

            node.targetY =
                Math.sin(angle) * radius;

        });

    }

    resolveOverlaps(nodes,0);

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

const PHASE_GRID_X = 2600;
const PHASE_GRID_Y = 2600;

const PHASE_TOP_ROW_COUNT = 4;

function phaseRingRadius(n){

    return 560 + Math.max(0, n-6)*32;

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
            subtitle: [phase] ?
                `${[phase]} — ${phaseSubtitle(groups[phase])}` :
                phaseSubtitle(groups[phase]),
            x: (col - (rowCount-1)/2) * PHASE_GRID_X,
            y: (row - 0.5) * PHASE_GRID_Y

        };

    });

    setBranchNodes(branchTargets);

    branchTargets.forEach(branch=>{

        const members = [...groups[branch.phase]].sort((a,b)=>a.timeline-b.timeline);

        const n = members.length;

        const radius = phaseRingRadius(n);

        members.forEach((node,i)=>{

            const angle = (i/n)*Math.PI*2 - Math.PI/2;

            node.targetX = branch.x + Math.cos(angle)*radius;
            node.targetY = branch.y + Math.sin(angle)*radius*0.88;

        });

    });

    // Guarantees zero overlap island-to-island as well as
    // within a single crowded ring.
    resolveOverlaps(nodes);

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

function layoutTimeline(nodes, compareFn, labelFn, subtitleFn){

    const sorted = [...nodes].sort(compareFn);

    sorted.forEach(node=>{
    node.layout = "timeline";
    node.ring = 0;
});

    // Starts at x:0 and runs rightward — deliberately not
    // centred, so the camera (see views.js) lands right on
    // the beginning of the timeline instead of somewhere in
    // the middle of it.
        sorted.forEach((node,i)=>{

            const side = i % 2 === 0 ? -1 : 1;

            node.targetX = i * TIMELINE_SPACING_X;

            node.targetY = side * (TIMELINE_STEM + 80);

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

            x:midIndex * TIMELINE_SPACING_X,

            y:0,

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

    movies.forEach((node,i)=>{

        const side = i % 2 === 0 ? -1 : 1;

        node.targetX = i * SPACING;

        node.targetY = side * 280;

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
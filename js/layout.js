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

import { setBranchNodes, setHubs } from "./graph.js";
import { getSelectedCharacter } from "./characters/characterJourney.js";
import { isCompact, isPortraitPhone } from "./responsive.js";
import { groupName, getWorld, ALL_WORLDS } from "./worlds.js";

//--------------------------------------------------
// Short era name per phase, used as the branch node's
// subtitle. The year range itself is computed from
// the actual data, not hardcoded.
//--------------------------------------------------

function phaseSubtitle(members) {

    const years = members.map(m => new Date(m.release).getFullYear());

    const min = Math.min(...years);
    const max = Math.max(...years);

    return min === max ? `${min}` : `${min}–${max}`;

}

//--------------------------------------------------
// OVERLAP RESOLUTION
//--------------------------------------------------

const POSTER_W = 320;
const POSTER_H = POSTER_W * 1.5;

const OVERLAP_MARGIN = 0;
const OVERLAP_ITERATIONS = 200;

function resolveOverlaps(nodes, margin = OVERLAP_MARGIN) {

    const minW = POSTER_W + margin;
    const minH = POSTER_H + margin;

    for (let iter = 0; iter < OVERLAP_ITERATIONS; iter++) {

        let moved = false;

        for (let i = 0; i < nodes.length; i++) {

            for (let j = i + 1; j < nodes.length; j++) {

                const a = nodes[i], b = nodes[j];

                const dx = b.targetX - a.targetX;
                const dy = b.targetY - a.targetY;

                const overlapX = minW - Math.abs(dx);
                const overlapY = minH - Math.abs(dy);

                if (overlapX > 0 && overlapY > 0) {

                    moved = true;

                    if (overlapX < overlapY) {

                        const push = overlapX / 2 + 0.5;
                        const sign = dx !== 0 ? Math.sign(dx) : (j % 2 === 0 ? 1 : -1);

                        a.targetX -= sign * push;
                        b.targetX += sign * push;

                    } else {

                        const push = overlapY / 2 + 0.5;
                        const sign = dy !== 0 ? Math.sign(dy) : (j % 2 === 0 ? 1 : -1);

                        a.targetY -= sign * push;
                        b.targetY += sign * push;

                    }

                }

            }

        }

        if (!moved) break;

    }

}

//--------------------------------------------------
// COMPLETE MCU — a real mind map
//--------------------------------------------------

const MINDMAP_PHASE_ORDER = [1, 2, 3, 4, 5, 6, 0];

const MINDMAP_PHASE_RADIUS = 1500;
const MINDMAP_FIRST_TIER = 2500;
const MINDMAP_TIER_STEP = 950;
const MINDMAP_SLOT = 470;
const MINDMAP_WEDGE_PAD = 4;

const WORLD_SHAPES = {
    animated: { long: 1.5, short: 1.12 },
    spider: { long: 1.0, short: 1.0 }
};

function worldShape(world, { sx, sy }) {

    const shape = WORLD_SHAPES[world];

    if (!shape) return { sx, sy };

    const wide = window.innerWidth >= window.innerHeight;

    return wide
        ? { sx: sx * shape.long, sy: sy * shape.short }
        : { sx: sx * shape.short, sy: sy * shape.long };

}

function mindmapStretch() {

    const aspect = Math.min(2.2, Math.max(0.5,
        window.innerWidth / Math.max(1, window.innerHeight)
    ));

    const s = Math.sqrt(aspect);

    return { sx: Math.max(0.8, s * 1.05), sy: Math.max(0.8, 1 / s * 1.05) };

}

function mindmapTiers(members, wedge) {

    const tiers = [];

    let index = 0;
    let tier = 0;

    let wanted = Math.max(2, Math.min(4, Math.round(members.length / 4)));

    while (index < members.length) {

        const radius = MINDMAP_FIRST_TIER + tier * MINDMAP_TIER_STEP;

        const capacity = Math.max(2, Math.floor((wedge * radius) / MINDMAP_SLOT));

        let count = Math.min(capacity, wanted, members.length - index);

        const left = members.length - index - count;

        if (left > 0 && left <= 2 && count + left <= capacity) count += left;

        tiers.push({ radius, members: members.slice(index, index + count) });

        index += count;
        tier++;

        wanted = Math.ceil(wanted * 1.6);

    }

    return tiers;

}

function mindmapTargets(nodes, sx, sy) {

    const groups = {};

    nodes.forEach(node => {

        groups[node.phase] = groups[node.phase] || [];
        groups[node.phase].push(node);

    });

    const phaseKeys = [
        ...MINDMAP_PHASE_ORDER.filter(p => groups[p] && groups[p].length),
        ...Object.keys(groups).map(Number).filter(p => !MINDMAP_PHASE_ORDER.includes(p)).sort((a, b) => a - b)
    ];

    const weights = phaseKeys.map(p => groups[p].length + MINDMAP_WEDGE_PAD);
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    const branches = [];

    let cursor = -Math.PI / 2 - (weights[0] / totalWeight) * Math.PI;

    phaseKeys.forEach((phase, pi) => {

        const wedge = (weights[pi] / totalWeight) * Math.PI * 2;

        const centre = cursor + wedge / 2;

        cursor += wedge;

        branches.push({

            phase,
            key: "phase" + phase,
            label: "",
            subtitle: "",
            hint: groupName(phase),
            hintSubtitle: phaseSubtitle(groups[phase]),
            x: Math.cos(centre) * MINDMAP_PHASE_RADIUS * sx,
            y: Math.sin(centre) * MINDMAP_PHASE_RADIUS * sy

        });

        const members = [...groups[phase]].sort((a, b) => a.timeline - b.timeline);

        const usable = wedge * 0.86;

        mindmapTiers(members, usable).forEach((tier, ti) => {

            const n = tier.members.length;

            const step = Math.min(usable / n, MINDMAP_SLOT * 1.4 / tier.radius);

            const stagger = (ti % 2 === 1 && n > 1) ? step * 0.18 : 0;

            tier.members.forEach((node, i) => {

                const angle = centre + (i - (n - 1) / 2) * step + stagger;

                node.layout = "complete";
                node.ring = 0;
                node.tier = ti;
                node.mindmapAngle = angle;

                node.targetX = Math.cos(angle) * tier.radius * sx;
                node.targetY = Math.sin(angle) * tier.radius * sy;

            });

        });

    });

    resolveOverlaps(nodes, 40);

    return branches;

}

export function layoutComplete(nodes) {

    if (getWorld() === ALL_WORLDS) return layoutMultiverse(nodes);

    const currentWorld = getWorld();

    const stretch = mindmapStretch();
    const shape = currentWorld === "mcu"
        ? stretch
        : isPortraitPhone()
            ? { sx: 1, sy: 1 }
            : worldShape(currentWorld, { sx: 1, sy: 1 });

    const branches = mindmapTargets(nodes, shape.sx, shape.sy);

    setHubs([{ world: getWorld(), x: 0, y: 0 }]);

    setBranchNodes([
        { phase: null, key: "hub", label: "", subtitle: "", x: 0, y: 0 },
        ...branches
    ]);

}

//--------------------------------------------------
// COMPLETE MCU — ALL WORLDS
//--------------------------------------------------

const MULTIVERSE_ORDER = ["mcu", "xmen", "spider", "animated", "ff", "unscripted"];
const MULTIVERSE_GAP = 700;
const MULTIVERSE_STEP = 150;
const MULTIVERSE_SPREAD = 1.8;

const MULTIVERSE_CORNERS = {
    xmen: [-1, -1],
    unscripted: [1, -1],
    animated: [-1, 1],
    spider: [1, 1]
};

const MULTIVERSE_TOP = "ff";

function boxesOf(nodes, hubX = 0, hubY = 0) {

    const halfW = POSTER_W / 2, halfH = POSTER_H / 2;

    const boxes = nodes.map(n => ({
        minX: n.targetX - halfW, maxX: n.targetX + halfW,
        minY: n.targetY - halfH, maxY: n.targetY + halfH
    }));

    boxes.push({ minX: hubX - 450, maxX: hubX + 450, minY: hubY - 200, maxY: hubY + 200 });

    return boxes;

}

function boxesClash(a, b, dx, dy, gap) {

    for (const p of a) {

        for (const q of b) {

            if (
                p.minX + dx < q.maxX + gap && p.maxX + dx > q.minX - gap &&
                p.minY + dy < q.maxY + gap && p.maxY + dy > q.minY - gap
            ) return true;

        }

    }

    return false;

}

function cornersClash(maps, worlds, cx, cy) {

    const at = w => w === "mcu"
        ? [0, 0]
        : [MULTIVERSE_CORNERS[w][0] * cx, MULTIVERSE_CORNERS[w][1] * cy];

    for (let i = 0; i < worlds.length; i++) {

        for (let j = i + 1; j < worlds.length; j++) {

            const [ax, ay] = at(worlds[i]);
            const [bx, by] = at(worlds[j]);

            if (boxesClash(maps[worlds[i]].boxes, maps[worlds[j]].boxes, ax - bx, ay - by, MULTIVERSE_GAP)) return true;

        }

    }

    return false;

}

export function layoutMultiverse(nodes) {

    const byWorld = {};

    nodes.forEach(n => { (byWorld[n.world] = byWorld[n.world] || []).push(n); });

    const worlds = MULTIVERSE_ORDER.filter(w => byWorld[w] && byWorld[w].length);

    const stretch = mindmapStretch();

    const maps = {};

    worlds.forEach(w => {

        const shape = w === "mcu"
            ? stretch
            : isPortraitPhone() ? { sx: 1, sy: 1 } : worldShape(w, { sx: 1, sy: 1 });

        const branches = mindmapTargets(byWorld[w], shape.sx, shape.sy);

        maps[w] = { branches, boxes: boxesOf(byWorld[w]), dx: 0, dy: 0 };

    });

    const aspect = Math.min(2.2, Math.max(0.5, window.innerWidth / Math.max(1, window.innerHeight)));

    const ax = Math.sqrt(aspect), ay = 1 / Math.sqrt(aspect);

    const cornerWorlds = worlds.filter(w => w === "mcu" || MULTIVERSE_CORNERS[w]);

    let t = 0;

    while (t < 60000 && cornersClash(maps, cornerWorlds, ax * t, ay * t)) t += MULTIVERSE_STEP;

    cornerWorlds.filter(w => w !== "mcu").forEach(w => {

        maps[w].dx = MULTIVERSE_CORNERS[w][0] * ax * t;
        maps[w].dy = MULTIVERSE_CORNERS[w][1] * ay * t;

    });

    const top = maps[MULTIVERSE_TOP];

    if (top) {

        const placed = [];

        cornerWorlds.forEach(w => maps[w].boxes.forEach(b => placed.push({
            minX: b.minX + maps[w].dx, maxX: b.maxX + maps[w].dx,
            minY: b.minY + maps[w].dy, maxY: b.maxY + maps[w].dy
        })));

        let d = 0;

        while (d < 60000 && boxesClash(top.boxes, placed, 0, -d, MULTIVERSE_GAP)) d += MULTIVERSE_STEP;

        top.dy = -d;

    }

    worlds.forEach(w => {

        maps[w].dx *= MULTIVERSE_SPREAD;
        maps[w].dy *= MULTIVERSE_SPREAD;

    });

    const hubs = [];
    const allBranches = [];

    worlds.forEach(w => {

        const m = maps[w];

        byWorld[w].forEach(n => { n.targetX += m.dx; n.targetY += m.dy; });

        m.branches.forEach(b => allBranches.push({ ...b, world: w, x: b.x + m.dx, y: b.y + m.dy }));

        hubs.push({ world: w, x: m.dx, y: m.dy });

    });

    setHubs(hubs);

    setBranchNodes(allBranches);

}
//--------------------------------------------------
// PHASES — a compact grid
//--------------------------------------------------

const PHASE_GRID_X = 4300;
const PHASE_GRID_Y = 4500;

const PHASE_RING_BASE = 860;
const PHASE_RING_PER_TITLE = 62;

const PHASE_RING_ROUND = 1;

const topRowCount = n => Math.ceil(n / 2);

function phaseRingRadius(n, label = "") {

    return Math.max(
        PHASE_RING_BASE + Math.max(0, n - 6) * PHASE_RING_PER_TITLE,
        300 + label.length * 38
    );

}

export function layoutPhases(nodes) {

    const groups = {};

    nodes.forEach(node => {

        groups[node.phase] = groups[node.phase] || [];
        groups[node.phase].push(node);

    });

    const phaseKeys = Object.keys(groups)
        .map(Number)
        .filter(phase => groups[phase].length > 0)
        .sort((a, b) => a - b);

    if (isCompact()) {

        const portrait = isPortraitPhone();

        const column = phaseKeys.map((phase, pi) => ({

            phase,
            key: "phase" + phase,
            label: groupName(phase),
            subtitle: phaseSubtitle(groups[phase]),
            x: portrait ? 0 : pi * PHASE_GRID_X,
            y: portrait ? pi * PHASE_GRID_Y : 0

        }));

        setBranchNodes(column);

        placePhaseRings(column, groups);

        resolveOverlaps(nodes);

        return;

    }

    const branchTargets = phaseKeys.map((phase, pi) => {

        const row = pi < topRowCount(phaseKeys.length) ? 0 : 1;

        const col = row === 0 ? pi : pi - topRowCount(phaseKeys.length);

        const rowCount = row === 0 ?
            Math.min(topRowCount(phaseKeys.length), phaseKeys.length) :
            phaseKeys.length - topRowCount(phaseKeys.length);

        return {

            phase,
            key: "phase" + phase,
            label: groupName(phase),
            subtitle: phaseSubtitle(groups[phase]),
            x: (col - (rowCount - 1) / 2) * PHASE_GRID_X,
            y: (row - 0.5) * PHASE_GRID_Y

        };

    });

    setBranchNodes(branchTargets);

    placePhaseRings(branchTargets, groups);

    resolveOverlaps(nodes);

}

function placePhaseRings(branches, groups) {

    branches.forEach(branch => {

        const members = [...groups[branch.phase]].sort((a, b) => a.timeline - b.timeline);

        const n = members.length;

        const radius = phaseRingRadius(n, groupName(branch.phase));

        members.forEach((node, i) => {

            const angle = (i / n) * Math.PI * 2 - Math.PI / 2;

            node.targetX = branch.x + Math.cos(angle) * radius;
            node.targetY = branch.y + Math.sin(angle) * radius * PHASE_RING_ROUND;

        });

    });

}

//--------------------------------------------------
// RELEASE ORDER / CHRONOLOGICAL ORDER
//--------------------------------------------------

const TIMELINE_SPACING_X = 420;

const TIMELINE_LABEL_EVERY = 5;

const TIMELINE_BRANCH_OFFSET = 120;

// (Room enough that two posters on the same side don't
// touch once the map is tipped back — js/depth.js.)
const TIMELINE_SPACING_Y = 345;
const TIMELINE_SIDE_X = 330;

const TIMELINE_GROUP_GAP_Y = 520;

// Left-to-right timelines: how far the posters sit from the
// spine. Posters float above the tilted map (js/depth.js),
// which lifts them up the screen — towards the spine for the
// row below it — so that row sits further out, keeping the
// phase name and years on the spine clear.
const TIMELINE_ABOVE_Y = 470;
const TIMELINE_BELOW_Y = 640;

function verticalTimelineY(i) {

    return i * TIMELINE_SPACING_Y + (Math.floor(i / TIMELINE_LABEL_EVERY) + 1) * TIMELINE_GROUP_GAP_Y;

}

function releaseYears(members) {

    const years = members.map(m => new Date(m.release).getFullYear());

    const min = Math.min(...years), max = Math.max(...years);

    return min === max ? `${min}` : `${min}–${max}`;

}

export function layoutRelease(nodes) {

    layoutTimeline(

        nodes,
        (a, b) => new Date(a.release) - new Date(b.release),
        members => phaseLabel(members),
        releaseYears

    );

}

export function layoutChronology(nodes) {

    layoutTimeline(

        nodes,
        (a, b) => a.timeline - b.timeline,
        members => phaseLabel(members),
        releaseYears

    );

}

function phaseLabel(members) {

    const counts = {};

    members.forEach(m => {

        if (typeof m.phase === "number") {

            counts[m.phase] = (counts[m.phase] || 0) + 1;

        }

    });

    const phases = Object.keys(counts).map(Number);

    if (!phases.length) return "";

    phases.sort((a, b) => counts[b] - counts[a] || a - b);

    return groupName(phases[0]);

}

let timelineOrientation = "horizontal";

export function getTimelineOrientation() {

    return timelineOrientation;

}

function layoutTimeline(nodes, compareFn, labelFn, subtitleFn) {

    const sorted = [...nodes].sort(compareFn);

    sorted.forEach(node => {
        node.layout = "timeline";
        node.ring = 0;
    });

    const vertical = isPortraitPhone();

    timelineOrientation = vertical ? "vertical" : "horizontal";

    sorted.forEach((node, i) => {

        const side = i % 2 === 0 ? -1 : 1;

        if (vertical) {

            node.targetX = side * TIMELINE_SIDE_X;

            node.targetY = verticalTimelineY(i);

        } else {

            node.targetX = i * TIMELINE_SPACING_X;

            node.targetY = side < 0 ? -TIMELINE_ABOVE_Y : TIMELINE_BELOW_Y;

        }

    });

    const labels = [];

    for (let i = 0; i < sorted.length; i += TIMELINE_LABEL_EVERY) {

        const chunk = sorted.slice(i, i + TIMELINE_LABEL_EVERY);

        // Half a step along when the middle of the group is a
        // poster, so the label sits in the gap between two
        // posters instead of on top of one's stem.
        const midIndex = i + (chunk.length - 1) / 2 +
            (chunk.length > 1 && chunk.length % 2 === 1 ? 0.5 : 0);

        labels.push({

            phase: null,

            key: "era" + i,

            label: labelFn(chunk),

            subtitle: subtitleFn ? subtitleFn(chunk) : "",

            x: vertical ? 0 : midIndex * TIMELINE_SPACING_X,

            y: vertical ? verticalTimelineY(i) - (TIMELINE_SPACING_Y + TIMELINE_GROUP_GAP_Y) / 2 : 0,

            memberIds: chunk.map(movie => movie.id)

        });

    }

    setBranchNodes(labels);

    resolveOverlaps(nodes);

}

//--------------------------------------------------
// CHARACTER JOURNEYS
//--------------------------------------------------

export function layoutCharacters(nodes) {

    const character = getSelectedCharacter();

    if (!character) return;

    setBranchNodes([]);

    const movies = nodes
        .filter(node =>
            (node.characters || []).includes(character)
        )
        .sort((a, b) => a.timeline - b.timeline);

    nodes.forEach(node => {

        if (!movies.includes(node)) {

            node.targetX = 100000;
            node.targetY = 100000;

        }

    });

    const SPACING = 650;

    const vertical = isPortraitPhone();

    movies.forEach((node, i) => {

        const side = i % 2 === 0 ? -1 : 1;

        node.journeyIndex = i;

        if (vertical) {

            node.targetX = side * 230;

            node.targetY = i * 320;

        } else {

            node.targetX = i * SPACING;

            node.targetY = side * 280;

        }

    });

}

export function layoutCharacterJourney(nodes) {

    const character = getSelectedCharacter();

    if (!character) return;

    setBranchNodes([]);

    nodes.forEach(node => {

        node.targetX = 100000;
        node.targetY = 100000;

    });

    const movies = nodes
        .filter(n =>
            n.characters &&
            n.characters.includes(character)
        )
        .sort((a, b) => a.timeline - b.timeline);

    const spacing = 700;

    movies.forEach((movie, index) => {

        movie.targetX = index * spacing;
        movie.targetY = 0;

    });

}
//--------------------------------------------------
// ALL POSTERS (MCU)
//--------------------------------------------------

const SCATTER_CELL_W = 2300;
const SCATTER_CELL_H = 2900;
const SCATTER_WANDER = 0.72;

function hashOf(text) {

    let h = 2166136261;

    for (let i = 0; i < text.length; i++) {

        h ^= text.charCodeAt(i);
        h = Math.imul(h, 16777619);

    }

    return (h >>> 0) / 4294967295;

}

export function layoutScatter(nodes) {

    const seen = new Set();
    const shown = [];

    nodes.forEach(node => {

        if (seen.has(node.id)) {

            node.targetX = 100000;
            node.targetY = 100000;

            return;

        }

        seen.add(node.id);
        shown.push(node);

    });

    const order = shown
        .map(n => ({ n, k: hashOf(n.id) }))
        .sort((a, b) => a.k - b.k)
        .map(o => o.n);

    const N = order.length;

    const aspect = Math.min(2.6, Math.max(0.45, window.innerWidth / Math.max(1, window.innerHeight)));

    const cols = Math.max(1, Math.min(N, Math.round(Math.sqrt(N * aspect * SCATTER_CELL_H / SCATTER_CELL_W))));
    const rows = Math.ceil(N / cols);

    order.forEach((node, i) => {

        const r = Math.floor(i / cols);
        const c = i % cols;

        const inRow = r === rows - 1 ? N - r * cols : cols;

        const shift = (r % 2 ? 0.25 : -0.25) * SCATTER_CELL_W;

        const jx = (hashOf(node.id + "x") - 0.5) * (SCATTER_CELL_W - POSTER_W) * SCATTER_WANDER;
        const jy = (hashOf(node.id + "y") - 0.5) * (SCATTER_CELL_H - POSTER_H) * SCATTER_WANDER;

        node.layout = "scatter";

        node.targetX = (c - (inRow - 1) / 2) * SCATTER_CELL_W + shift + jx;
        node.targetY = (r - (rows - 1) / 2) * SCATTER_CELL_H + jy;

    });

    // Scatter has no branch nodes, hub, or connecting lines.
    setHubs([]);
    setBranchNodes([]);

}

//==================================================
// REGISTRY
//==================================================

export const LAYOUTS = {

    complete: layoutComplete,
    multiverse: layoutMultiverse,
    scatter: layoutScatter,
    phases: layoutPhases,
    release: layoutRelease,
    chronology: layoutChronology,
    characters: layoutCharacters,
    characterJourney: layoutCharacterJourney

};
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
import { PHASES_POSTER } from "./posterSize.js";
// (Only called while laying out, never as the module loads,
// so importing back from depth.js is safe.)
import { REST_PITCH, mindmapPosterHeight, heightToMapScale } from "./depth.js";

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
// MIND MAP OVERLAP RESOLUTION
//
// resolveOverlaps() above checks the posters on the flat
// map, but the mind map is drawn tipped back (REST_PITCH in
// js/depth.js, which squashes it top to bottom by about a
// fifth) with every poster floating at its own height
// (higher ones are drawn further up the screen). So two
// posters that were clear of each other on the flat map
// could still be drawn on top of one another.
//
// This does the same job, but measures the gap top to bottom
// the way it's actually drawn: tipped back, with each
// poster's height, at both ends of the zoom range (heights
// count for more the further out you are). Posters are
// pushed apart mostly up and down, so the maps grow a little
// taller rather than wider.
//--------------------------------------------------

// The zooms to keep posters apart between (the range you
// look at a mind map in; past the far end posters are only
// a few pixels big).
const MAP_CHECK_ZOOMS = [0.07, 0.4];

// A little more tilt than the map opens with, for headroom
// (the look-around tips it a degree or so with the mouse).
const MAP_CHECK_PITCH_EXTRA = 0.05;

const MAP_OVERLAP_ITERATIONS = 600;

function resolveMindmapOverlaps(nodes, margin = 40) {

    const pitch = REST_PITCH + MAP_CHECK_PITCH_EXTRA;

    const c = Math.cos(pitch), sn = Math.sin(pitch);

    const kLo = heightToMapScale(MAP_CHECK_ZOOMS[1]) * sn;
    const kHi = heightToMapScale(MAP_CHECK_ZOOMS[0]) * sn;

    const minW = POSTER_W + margin;
    const minH = POSTER_H + margin;

    const heights = nodes.map(mindmapPosterHeight);

    for (let iter = 0; iter < MAP_OVERLAP_ITERATIONS; iter++) {

        let moved = false;

        for (let i = 0; i < nodes.length; i++) {

            for (let j = i + 1; j < nodes.length; j++) {

                const a = nodes[i], b = nodes[j];

                const dx = b.targetX - a.targetX;

                const overlapX = minW - Math.abs(dx);

                if (overlapX <= 0) continue;

                const dy = b.targetY - a.targetY;
                const dh = heights[j] - heights[i];

                // How far apart they're drawn top to bottom
                // (in map units), at each end of the zoom range.
                const near = dy * c - dh * kLo;
                const far = dy * c - dh * kHi;

                // Which one is drawn lower: the one lower on the
                // map, unless its height carries it right past.
                const down = (near + far) !== 0
                    ? Math.sign(near + far)
                    : (dy !== 0 ? Math.sign(dy) : (j % 2 === 0 ? 1 : -1));

                const gap = Math.min(near * down, far * down);

                const short = minH - gap;

                if (short <= 0) continue;

                moved = true;

                // Back to flat map units: the tilt squashes
                // vertical distances by c.
                const pushY = short / c;

                // Mostly up and down (taller maps); sideways only
                // when that's a much smaller move.
                if (overlapX < pushY * 0.35) {

                    const push = overlapX / 2 + 0.5;
                    const sign = dx !== 0 ? Math.sign(dx) : (j % 2 === 0 ? 1 : -1);

                    a.targetX -= sign * push;
                    b.targetX += sign * push;

                } else {

                    const push = pushY / 2 + 0.5;

                    a.targetY -= down * push;
                    b.targetY += down * push;

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

    resolveMindmapOverlaps(nodes, 40);

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

const MULTIVERSE_ORDER = ["mcu", "xmen", "spider", "animated", "ff", "unscripted", "tv"];
const MULTIVERSE_GAP = 700;
const MULTIVERSE_STEP = 150;
const MULTIVERSE_SPREAD = 1.8;

// Marvel TV top right, Marvel Unscripted bottom left.
const MULTIVERSE_CORNERS = {
    xmen: [-1, -1],
    tv: [1, -1],
    unscripted: [-1, 1],
    spider: [1, 1]
};

const MULTIVERSE_TOP = "ff";

// Marvel Animation sits straight below the Avengers,
// mirroring the Fantastic Four above (Marvel Unscripted
// takes the bottom-left corner).
const MULTIVERSE_BOTTOM = "animated";

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

        // (The world in the middle-bottom slot is laid out
        // round rather than wide, so it fits between the two
        // bottom corners instead of being pushed far below
        // them.)
        const shape = w === "mcu"
            ? stretch
            : isPortraitPhone() || w === MULTIVERSE_BOTTOM ? { sx: 1, sy: 1 } : worldShape(w, { sx: 1, sy: 1 });

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

    const bottom = maps[MULTIVERSE_BOTTOM];

    if (bottom) {

        const placed = [];

        cornerWorlds.forEach(w => maps[w].boxes.forEach(b => placed.push({
            minX: b.minX + maps[w].dx, maxX: b.maxX + maps[w].dx,
            minY: b.minY + maps[w].dy, maxY: b.maxY + maps[w].dy
        })));

        let d = 0;

        while (d < 60000 && boxesClash(bottom.boxes, placed, 0, d, MULTIVERSE_GAP)) d += MULTIVERSE_STEP;

        // As far below as the top world is above, so the map
        // stays balanced round the Avengers in the middle.
        bottom.dy = Math.max(d, top ? -top.dy : 0);

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
// PHASES — rows of rings
//--------------------------------------------------

// Every phase is a ring of posters round its name. Each
// ring is just big enough for its own titles — every
// poster gets the same room round its ring (SLOT), and
// every ring the same gap to its neighbours — so the rows
// stay even and orderly without a few small phases
// spreading the whole grid out to the size of the biggest
// one (which is what made the posters tiny on screen).
//
// PHASE_RING_MIN keeps even a small phase's posters well
// clear of the name and years in the middle (the map is
// tipped back, which lifts the bottom posters towards
// them). Sized for the Phases view's bigger posters
// (PHASES_POSTER in js/posterSize.js), so they never touch.
const PHASE_RING_MIN = 1300;
const PHASE_RING_SLOT = 740;

// Air between neighbouring rings: from the outermost
// posters' centres of one ring to the next.
const PHASE_GAP_X = 1150;
const PHASE_GAP_Y = 1100;

// Rings are laid out a little taller than wide: tipped back
// (js/depth.js REST_PITCH, cos ≈ 0.79, and a bit more for
// the row further away) they're squashed top
// to bottom, so this brings them back to round on screen —
// and keeps the posters down each side from stacking on
// top of one another.
const PHASE_RING_ROUND = 1.38;

function phaseRingRadius(n) {

    return Math.max(PHASE_RING_MIN, (n * PHASE_RING_SLOT) / (Math.PI * 2));

}

function phaseBranch(phase, groups, x, y, R) {

    return {
        phase,
        key: "phase" + phase,
        label: groupName(phase),
        wrap: true,
        subtitle: phaseSubtitle(groups[phase]),
        x, y,
        ringRadius: R
    };

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

    const radii = phaseKeys.map(p => phaseRingRadius(groups[p].length));

    let branches;

    if (isCompact()) {

        // Phones: one column upright, one row sideways, each
        // ring its own size with the same gap between them.
        const portrait = isPortraitPhone();

        let at = 0;

        branches = phaseKeys.map((phase, i) => {

            const R = radii[i];

            const half = portrait ? R * PHASE_RING_ROUND : R;

            if (i > 0) at += half;

            const b = phaseBranch(phase, groups, portrait ? 0 : at, portrait ? at : 0, R);

            at += half + (portrait ? PHASE_GAP_Y : PHASE_GAP_X);

            return b;

        });

    } else {

        // Computers: rows shaped like the screen (e.g. 4 + 3
        // for the MCU's seven phases, 3 + 3 + 3 for
        // Spider-Man's nine eras), each row centred.
        const rowSizes = phaseRows(phaseKeys.length);

        // A touch bigger all round where a long name needs the
        // room (see labelScale).
        const k = labelScale(phaseKeys, groups, radii, rowSizes);

        branches = phaseGrid(phaseKeys, groups, radii.map(R => R * k), rowSizes).branches;

    }

    setBranchNodes(branches);

    placePhaseRings(branches, groups);

}

// Lays the rings out in centred rows. Returns the branch
// targets and the grid's overall size.
function phaseGrid(phaseKeys, groups, radii, rowSizes) {

    const rows = [];

    let i = 0;

    rowSizes.forEach(count => {

        const ids = [];

        for (let c = 0; c < count; c++) ids.push(i++);

        const width = ids.reduce((sum, j) => sum + radii[j] * 2, 0) + (count - 1) * PHASE_GAP_X;

        const half = Math.max(...ids.map(j => radii[j])) * PHASE_RING_ROUND;

        rows.push({ ids, width, half });

    });

    const height = rows.reduce((sum, r) => sum + r.half * 2, 0) + (rows.length - 1) * PHASE_GAP_Y;

    const branches = [];

    let y = -height / 2;

    rows.forEach(row => {

        y += row.half;

        let x = -row.width / 2;

        row.ids.forEach(j => {

            x += radii[j];

            branches.push(phaseBranch(phaseKeys[j], groups, x, y, radii[j]));

            x += radii[j] + PHASE_GAP_X;

        });

        y += row.half + PHASE_GAP_Y;

    });

    return {
        branches,
        width: Math.max(...rows.map(r => r.width)) + PHASES_POSTER,
        height: height + PHASES_POSTER * 1.5
    };

}

// How many rings go in each row: about as many columns as
// suit the screen's shape, with the rings shared out evenly
// (the first rows take any extra one).
function phaseRows(n) {

    if (n <= 4) return [n];

    const aspect = Math.max(0.8, Math.min(2.2,
        (window.innerWidth - 300) / Math.max(1, window.innerHeight - 60)
    ));

    const cols = Math.max(2, Math.round(Math.sqrt(n * aspect * 1.4)));

    const rows = Math.ceil(n / cols);

    const base = Math.floor(n / rows), extra = n % rows;

    return Array.from({ length: rows }, (_, r) => base + (r < extra ? 1 : 0));

}

// The phase names are drawn at a readable minimum size on
// screen however far out the map is (js/branchNodes.js),
// so a long one ("Sony's Spider-Man Universe") can be wider
// than its ring once the grid is fitted to the screen.
// Scales every ring up a little until each name (and its
// years) fits between the posters either side of it.
const LABEL_PX_PER_CHAR = 8.8;    // Bebas Neue at its 20px minimum here
const YEARS_PX = 70;              // "2016–2019" at its 13px minimum here
const LABEL_CLEAR_PX = 22;        // air between the name and a poster

// Names longer than this go on two lines in the Phases
// view (js/branchNodes.js wraps them), so they only need
// half the width.
export const PHASE_LABEL_WRAP = 14;

// The longer line of a name once wrapped.
function labelLineLength(name) {

    if (name.length <= PHASE_LABEL_WRAP || !name.includes(" ")) return name.length;

    const words = name.split(" ");

    let best = name.length;

    for (let i = 1; i < words.length; i++) {

        best = Math.min(best, Math.max(words.slice(0, i).join(" ").length, words.slice(i).join(" ").length));

    }

    return best;

}

function labelScale(phaseKeys, groups, radii, rowSizes) {

    const need = phaseKeys.map(p => Math.max(labelLineLength(groupName(p)) * LABEL_PX_PER_CHAR, YEARS_PX) / 2);

    // The space the view fits itself into (clear of the
    // panel down the left), as viewManager.js does.
    const freeW = Math.max(300, window.innerWidth - 300);
    const freeH = Math.max(300, window.innerHeight - 60);

    let k = 1;

    // (Growing the rings shrinks the whole grid to fit the
    // screen, so past a point it stops helping: at most a
    // third bigger. Long names wrap onto two lines instead.)
    for (let step = 0; step < 3; step++) {

        const grid = phaseGrid(phaseKeys, groups, radii.map(R => R * k), rowSizes);

        const zoom = Math.min(freeW / grid.width, freeH / grid.height);

        const fits = radii.every((R, i) =>
            (R * k - PHASES_POSTER / 2) * zoom - LABEL_CLEAR_PX >= need[i]
        );

        if (fits) break;

        k *= 1.1;

    }

    return k;

}

// Each phase's titles evenly round its own ring, in story
// order, starting at the top and going clockwise. (No
// overlap pass afterwards: the rings are sized and spaced
// so nothing touches, and nudging posters about is what
// made the rings look ragged.)
function placePhaseRings(branches, groups) {

    branches.forEach(branch => {

        const members = [...groups[branch.phase]].sort((a, b) => a.timeline - b.timeline);

        const n = members.length;

        const radius = branch.ringRadius;

        members.forEach((node, i) => {

            const angle = (i / n) * Math.PI * 2 - Math.PI / 2;

            node.layout = "phases";

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
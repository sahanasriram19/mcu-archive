//==================================================
// MCU GRAPH ENGINE
//==================================================

import { loadPosters } from "./posters.js";
import { WORLDS, setCurrentWorld } from "./worlds.js";

export const graph = {

    nodes: [],

    edges: [],

    // "Branch" nodes are the visible hub/category circles
    // used by the mind-map views — phase hubs in Complete
    // MCU and Phases, trunk waypoints in the timeline
    // trail views. Never movies, never posters.
    branchNodes: [],

    // What the mouse is over on the Complete MCU mind map
    // (set by input.js, read by connections.js and
    // branchNodes.js): nodeIndex = a hovered poster, phase =
    // the phase whose branch should light up. Both null when
    // nothing is hovered.
    hover: { nodeIndex: null, phase: null },

    // The poster under the mouse in ANY view (index into
    // nodes, or null) — nodes.js lifts it. Separate from
    // hover above, which only drives the mind map's branch
    // highlight.
    hoverPoster: null,

    // "What should I watch before…" (js/upcoming.js): when
    // set, only these node ids are shown at full strength and
    // everything else is dimmed. null = off.
    focus: null   // { ids: Set, label: string } | null

};

//==================================================
// NODE
//==================================================

function createNode(movie){

    return{

        id:movie.id,
        title:movie.title,
        type:movie.type,
        phase:movie.phase,
        saga:movie.saga,
        release:movie.release,
        timeline:movie.timeline,
        characters:movie.characters || [],
        // Hand-picked "watch these first" ids (upcoming titles
        // in mcu.json); see js/upcoming.js for how it's used.
        watchBefore:movie.watchBefore || [],
        // e.g. "cancelled" — kept on the map, but never
        // counted down to (js/upcoming.js).
        status:movie.status || "",
        colour:movie.colour || "255,255,255",
        poster:movie.poster,

        // Nodes start stacked at the centre — this is what
        // makes the very first layout call look like the
        // universe "flying outward" from the hub.
        x:0, y:0, targetX:0, targetY:0,

        radius:18,

        glow:0,

        pulse:Math.random()*Math.PI*2,

        hovered:false,
        selected:false

    };

}

function createBranchNode(key, label, subtitle, x, y, targetX, targetY){

    return{

        id:"branch-"+key,
        isBranch:true,
        key,
        label,
        subtitle: subtitle || "",
        x, y,
        targetX: targetX !== undefined ? targetX : x,
        targetY: targetY !== undefined ? targetY : y,
        pulse:Math.random()*Math.PI*2

    };

}

//==================================================
// INITIALISE GRAPH
//
// Returns a promise so callers (app.js) can await it
// before doing anything that needs graph.nodes to be
// populated, like the first setView() call.
//==================================================

// Every world's nodes, loaded once: { mcu: [...], xmen: [...] }.
// graph.nodes always points at the CURRENT world's list —
// everything that draws or lays out the map works on that,
// so it never needs to know which world it's in. Each world
// keeps its own node objects, so switching back finds its
// titles right where they were.
export const worldNodes = {};

export async function initialiseGraph(){

    const keys = Object.keys(WORLDS);

    const lists = await Promise.all(keys.map(key =>

        fetch(WORLDS[key].file)
            .then(r => r.json())
            .catch(err => {

                console.warn("Couldn't load", WORLDS[key].file, err);

                return [];

            })

    ));

    keys.forEach((key, i) => {

        worldNodes[key] = lists[i].map(movie => {

            const node = createNode(movie);

            node.world = key;

            return node;

        });

    });

    graph.nodes = worldNodes.mcu;
    graph.edges = [];
    graph.branchNodes = [];

    // Posters for every world load up front (the MCU first),
    // so switching worlds doesn't start from blank cards.
    keys.forEach(key => loadPosters({ nodes: worldNodes[key] }));

}

// Every title in every world — for things that span both,
// like the countdown to the next release.
export function allNodes(){

    return Object.values(worldNodes).flat();

}

// Switch the map to another world's titles. The caller
// (viewManager.setWorldView) then lays out a view for it.
export function useWorld(key){

    if(!worldNodes[key] || graph.nodes === worldNodes[key]) return false;

    setCurrentWorld(key);

    graph.nodes = worldNodes[key];
    graph.edges = [];

    graph.hover.nodeIndex = null;
    graph.hover.phase = null;
    graph.hoverPoster = null;
    graph.focus = null;

    return true;

}

//==================================================
// BRANCH NODES
//
// Called by layout.js. Each target is { key, label, x, y }.
// A branch keeps easing from wherever it currently is if
// another layout already registered the same key (e.g.
// "phase3" exists in both Complete MCU and Phases) —
// that's what makes switching between those two feel like
// a continuation rather than a reset.
//
// Views that use a different key scheme entirely (Release
// Order's "chunk0".."chunkN" vs Phases' "phase1".."phase6")
// don't get that continuation for free — going Phases ->
// Release -> Phases would otherwise drop every "phaseN"
// branch node when Release's setBranchNodes() call replaces
// the array, so coming back to Phases recreates them fresh
// at the hub and replays the "fly outward" animation. That
// looks like the whole layout changed even though the final
// resting position is identical. branchMemory below is a
// key -> last known {x,y} cache that outlives any single
// view, so a recreated branch starts near where it left off
// instead of at (0,0).
//==================================================

const branchMemory = new Map();

export function setBranchNodes(targets){

    const existing = new Map(graph.branchNodes.map(b => [b.key, b]));

    graph.branchNodes = targets.map(t => {

        const prev = existing.get(t.key);

        if(prev){

            prev.targetX = t.x;
            prev.targetY = t.y;
            prev.label = t.label;
            prev.phase = t.phase;
            prev.hint = t.hint || "";
            prev.hintSubtitle = t.hintSubtitle || "";
            prev.subtitle = t.subtitle || "";
            prev.hidden = !!t.hidden;
            prev.memberIds = t.memberIds || [];

            branchMemory.set(t.key, { x: t.x, y: t.y });

            return prev;

        }

        const remembered = branchMemory.get(t.key);

        const startX = remembered ? remembered.x : 0;
        const startY = remembered ? remembered.y : 0;

        const node = createBranchNode(t.key, t.label, t.subtitle, startX, startY, t.x, t.y);

        node.memberIds = t.memberIds || [];
        node.hidden = !!t.hidden;
        node.phase = t.phase;
        node.hint = t.hint || "";
        node.hintSubtitle = t.hintSubtitle || "";

        branchMemory.set(t.key, { x: t.x, y: t.y });

        return node;

    });

}

//==================================================
// EDGE BUILDERS
//==================================================

function movieNodes(){

    return graph.nodes.filter(n => !n.isBranch);

}

function sortedBy(field){

    return [...movieNodes()].sort((a,b)=> {

        if(field==="release") return new Date(a.release)-new Date(b.release);

        return a[field]-b[field];

    });

}

//--------------------------------------------------
// One continuous thread through every node
//--------------------------------------------------

export function edgesChain(field){

    const sorted = sortedBy(field);

    const edges = [];

    for(let i=0;i<sorted.length-1;i++){

        edges.push({

            from: graph.nodes.indexOf(sorted[i]),
            to: graph.nodes.indexOf(sorted[i+1])

        });

    }

    return edges;

}

//--------------------------------------------------
// One thread per character, following every project
// that character appears in, in timeline order
//--------------------------------------------------

export function edgesByCharacter(){

    const edges = [];

    // Chain in journey order (set by layoutCharacters), not
    // by x position — on an upright phone the journey runs
    // top to bottom, so left-to-right order would be wrong.
    const movies = graph.nodes
        .filter(node => node.targetX < 50000)
        .sort((a,b)=>(a.journeyIndex ?? 0)-(b.journeyIndex ?? 0));

    for(let i = 0; i < movies.length - 1; i++){

        edges.push({

            from: graph.nodes.indexOf(movies[i]),
            to: graph.nodes.indexOf(movies[i + 1])

        });

    }

    return edges;

}

//--------------------------------------------------
// MIND MAP (Complete MCU) — a real tree:
//   hub -> each phase branch
//   phase branch -> its first row of titles
//   every later title -> the nearest title in the row
//   before it (same phase), so each branch keeps
//   splitting into smaller branches as it goes out.
// Reads node.tier / node.mindmapAngle, which
// layoutComplete sets — so layout must run first
// (viewManager already guarantees that).
//--------------------------------------------------

export function edgesMindmap(){

    const edges = [];

    const byPhase = {};

    movieNodes().forEach(node=>{

        if(typeof node.tier !== "number") return;

        (byPhase[node.phase] = byPhase[node.phase] || []).push(node);

    });

    graph.branchNodes.forEach(branch=>{

        if(!branch.key.startsWith("phase")) return;

        edges.push({ from:"hub", to:"branch:"+branch.key, style:"curve" });

        const phase = Number(branch.key.replace("phase",""));

        const members = byPhase[phase] || [];

        const tiers = [];

        members.forEach(node=>{

            (tiers[node.tier] = tiers[node.tier] || []).push(node);

        });

        tiers.forEach((tier, ti)=>{

            if(!tier) return;

            tier.forEach(node=>{

                if(ti === 0){

                    edges.push({ from:"branch:"+branch.key, to:graph.nodes.indexOf(node), style:"curve" });

                    return;

                }

                const parents = tiers[ti-1] || [];

                let best = null, bestD = Infinity;

                parents.forEach(parent=>{

                    const d = Math.abs(parent.mindmapAngle - node.mindmapAngle);

                    if(d < bestD){ bestD = d; best = parent; }

                });

                if(best){

                    edges.push({ from:graph.nodes.indexOf(best), to:graph.nodes.indexOf(node), style:"curve" });

                }

            });

        });

    });

    return edges;

}

//--------------------------------------------------
// PHASE SPOKES (Phases view) — each phase's own hub
// connects directly to every movie in that phase.
// No shared hub between phases — these are meant to
// read as separate little mind maps.
//--------------------------------------------------

export function edgesPhaseSpokes(){

    const edges = [];

    graph.branchNodes.forEach(branch=>{

        const anchor = "branch:" + branch.key;

        const phase = Number(branch.key.replace("phase",""));

        movieNodes()
            .filter(n => n.phase === phase)
            .forEach(node=>{

                edges.push({ from:anchor, to: graph.nodes.indexOf(node) });

            });

    });

    return edges;

}

//--------------------------------------------------
// TIMELINE TRAIL
//
// One continuous timeline.
//
// Every branch node becomes a waypoint on the spine.
// The spine connects waypoint -> waypoint.
// Every project connects directly to its own waypoint.
//
// This removes the disconnected appearance while
// keeping the timeline readable.
//--------------------------------------------------

export function edgesTimelineTrail(){

    const edges = [];

    const branches = [...graph.branchNodes];

    //--------------------------------------------------
    // Spine
    //--------------------------------------------------

    for(let i=0;i<branches.length-1;i++){

        edges.push({

            from:"branch:"+branches[i].key,
            to:"branch:"+branches[i+1].key,
            style:"timeline"

        });

    }

    //--------------------------------------------------
    // Posters connect to their waypoint
    //--------------------------------------------------

    branches.forEach(branch=>{

        const anchor = "branch:"+branch.key;

        (branch.memberIds || []).forEach(id=>{

            const index = graph.nodes.findIndex(n=>n.id===id);

            if(index===-1) return;

            edges.push({

                from:anchor,
                to:index,
                style:"branch"

            });

        });

    });

    return edges;

}

//--------------------------------------------------
// Register the active edge list
//--------------------------------------------------

export function setEdges(edges){

    const seen = new Set();

    graph.edges = edges.filter(edge=>{

        const key = edge.from + "|" + edge.to;

        if(seen.has(key)) return false;

        seen.add(key);

        return true;

    });

}


//==================================================
// UPDATE
//==================================================

export function updateGraph(){

    const NODE_EASE = 0.16;

    graph.nodes.forEach(node=>{

       if (Math.abs(node.targetX - node.x) < 0.5)
            node.x = node.targetX;
        else
            node.x += (node.targetX - node.x) * NODE_EASE;

        if (Math.abs(node.targetY - node.y) < 0.5)
            node.y = node.targetY;
        else
            node.y += (node.targetY - node.y) * NODE_EASE;

        node.pulse += 0.02;
        node.glow = 0.5 + Math.sin(node.pulse)*0.5;

        // Hover lift (nodes.js): ease towards 1 on the hovered
        // poster and back to 0 everywhere else — quick in,
        // slightly slower out, so it feels springy not snappy.
        const hovered = graph.hoverPoster !== null && graph.nodes[graph.hoverPoster] === node;

        const liftTarget = hovered ? 1 : 0;

        const lift = node.lift || 0;

        node.lift = lift + (liftTarget - lift) * (hovered ? 0.25 : 0.18);

        if(node.lift < 0.002) node.lift = 0;

    });

    graph.branchNodes.forEach(node=>{

        // Was 0.08 — half the movie-node rate above. Complete
        // MCU and Phases both lean heavily on branch circles,
        // so that alone was why switching into either of them
        // felt noticeably slower than switching into the
        // Order views (which have little to no branch nodes
        // to wait on).
        if(Math.abs(node.targetX-node.x) < 0.5) node.x = node.targetX;
        else node.x += (node.targetX-node.x) * NODE_EASE;

        if(Math.abs(node.targetY-node.y) < 0.5) node.y = node.targetY;
        else node.y += (node.targetY-node.y) * NODE_EASE;

        node.pulse += 0.02;

    });

}
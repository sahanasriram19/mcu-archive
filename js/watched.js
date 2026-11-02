//==================================================
// WATCHED
//
// Which titles you've ticked off, kept in this browser
// (localStorage). Stored by title id, so a title that's in
// two worlds (Deadpool & Wolverine, No Way Home…) counts
// once and shows as watched in both.
//
// Fires "mcu:watched-changed" on window whenever the list
// changes, so the panel's counts and the details card can
// keep up.
//==================================================

const KEY = "mcu-archive:watched";

//--------------------------------------------------
// Old ids → the ones they became. Shows used to have an
// entry per season (all with the same poster); now each
// project has one, kept under its first season's id. A
// season ticked before the merge counts for the show, and
// an old link to a season opens the show (js/app.js).
//--------------------------------------------------

export const ID_ALIASES = {
    daredevilbornagain2: "daredevilbornagain1",
    whatif2: "whatif1",
    whatif3: "whatif1",
    iamgroot2: "iamgroot1"
};

export const canonicalId = id => ID_ALIASES[id] || id;

let ids = load();

// Saved under an old id? Move it across (once).
if([...ids].some(id => ID_ALIASES[id])){

    ids = new Set([...ids].map(canonicalId));

    save();

}

function load(){

    try {

        const raw = localStorage.getItem(KEY);

        const list = raw ? JSON.parse(raw) : [];

        return new Set(Array.isArray(list) ? list : []);

    } catch {

        return new Set();

    }

}

function save(){

    try {

        localStorage.setItem(KEY, JSON.stringify([...ids]));

    } catch {

        // Private browsing or storage turned off: it still
        // works for this visit, it just won't be remembered.

    }

}

export function isWatched(id){

    return ids.has(id);

}

export function setWatched(id, watched){

    if(watched === ids.has(id)) return;

    if(watched) ids.add(id);
    else ids.delete(id);

    save();

    window.dispatchEvent(new CustomEvent("mcu:watched-changed", { detail: { id, watched } }));

}

export function toggleWatched(id){

    setWatched(id, !ids.has(id));

}

// How many of these titles you've watched, counting each
// id once. `canWatch` leaves out anything not out yet.
export function progress(nodes, canWatch = () => true){

    const seen = new Set();

    let total = 0, done = 0;

    for(const n of nodes){

        if(n.isBranch || seen.has(n.id) || !canWatch(n)) continue;

        seen.add(n.id);

        total++;

        if(ids.has(n.id)) done++;

    }

    return { done, total };

}
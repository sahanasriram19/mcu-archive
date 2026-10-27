//==================================================
// MAP REDRAW
//
// The map (posters, lines, logos, labels) is only redrawn
// while something on it is changing (js/universe.js keeps
// the last picture otherwise). Anything that changes it
// without moving — a poster's picture arriving, a title
// ticked off as watched — calls markMapDirty() so the next
// frame draws it.
//==================================================

let dirty = true;

export function markMapDirty(){

    dirty = true;

}

// True once per change (then cleared).
export function takeMapDirty(){

    const was = dirty;

    dirty = false;

    return was;

}
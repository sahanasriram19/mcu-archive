//==================================================
// WATCHLIST VIEWS (MCU → Watchlist · Release /
// Watchlist · Chronological)
//
// The views themselves are laid out by layout.js
// (layoutWatchlistRelease / layoutWatchlistChronology): the
// titles you've added, as a timeline trail. This file keeps
// them live while one is on screen, like js/watchedView.js
// does for Watched:
//
//   • add or remove a title (on its card) and the trail
//     rearranges itself — posters slide into their new
//     places, without the camera jumping
//   • with nothing added yet, a note in the middle says
//     how to add titles, instead of an empty sky
//==================================================

import { graph, edgesTimelineTrail, setEdges } from "./graph.js";
import { getCurrentView, getWorld, resetView, setWorldView } from "./viewManager.js";
import { LAYOUTS } from "./layout.js";
import { ALL_WORLDS } from "./worlds.js";
import { onWatchlist } from "./watchlist.js";
import { markMapDirty } from "./redraw.js";

// Each Watchlist view and its layout (views.js).
const VIEW_LAYOUTS = {
    watchlist: "watchlistRelease",
    watchlistChrono: "watchlistChronology"
};

const BOOKMARK = `<svg viewBox="0 0 24 24"><path d="M7 4h10v16l-5-3.6L7 20z"/></svg>`;

const note = document.createElement("div");

// (Styled with the Watched note, css/watchedView.css.)
note.id = "watchlist-empty";
note.className = "watched-empty-note";
note.setAttribute("role", "status");

note.innerHTML = `
    <div class="watched-empty-icon" aria-hidden="true">${BOOKMARK}</div>
    <h3>Your watchlist is empty</h3>
    <p>Open any title and tap the <span class="watched-empty-tick watchlist-empty-mark" aria-hidden="true">${BOOKMARK}</span> on its card to add it. Everything you add shows up here as a trail of what to watch next, in release or story order.</p>
    <button type="button" class="watched-empty-go">Back to the map</button>
`;

document.getElementById("viewport").appendChild(note);

note.querySelector(".watched-empty-go").addEventListener("click", () => {

    setWorldView(ALL_WORLDS, "complete");

});

function inWatchlistView(){

    return !!VIEW_LAYOUTS[getCurrentView()] && getWorld() === ALL_WORLDS;

}

function count(){

    const seen = new Set();

    for(const n of graph.nodes){

        if(!n.isBranch && n.id && onWatchlist(n.id)) seen.add(n.id);

    }

    return seen.size;

}

function refreshNote(){

    note.classList.toggle("show", inWatchlistView() && count() === 0);

}

let lastCount = -1;

window.addEventListener("mcu:view-changed", () => {

    lastCount = inWatchlistView() ? count() : -1;

    refreshNote();

});

window.addEventListener("mcu:watchlist-changed", () => {

    if(!inWatchlistView()){

        refreshNote();

        return;

    }

    // Rearrange in place: the posters ease to their new spots
    // (updateGraph), the spine and labels follow, and the
    // camera stays put...
    LAYOUTS[VIEW_LAYOUTS[getCurrentView()]](graph.nodes);

    setEdges(edgesTimelineTrail());

    markMapDirty();

    const n = count();

    // ...unless it was empty (nothing to look at yet) — then
    // frame the first ones.
    if(lastCount === 0 && n > 0) resetView();

    lastCount = n;

    refreshNote();

});
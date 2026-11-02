//==================================================
// WATCHED VIEW (MCU → Watched)
//
// The view itself is laid out by layoutWatched (layout.js):
// every title you've ticked off, in release order. This
// file keeps it live while it's on screen:
//
//   • tick or untick a title (on its card) and the grid
//     rearranges itself — posters slide into their new
//     places, without the camera jumping
//   • with nothing ticked yet, a note in the middle says
//     how to add titles, instead of an empty sky
//==================================================

import { graph } from "./graph.js";
import { getCurrentView, getWorld, resetView, setWorldView } from "./viewManager.js";
import { LAYOUTS } from "./layout.js";
import { ALL_WORLDS } from "./worlds.js";
import { isWatched } from "./watched.js";

const note = document.createElement("div");

note.id = "watched-empty";
note.setAttribute("role", "status");

note.innerHTML = `
    <div class="watched-empty-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M6.5 12.5l3.6 3.6 7.4-8.2"/></svg>
    </div>
    <h3>Nothing watched yet</h3>
    <p>Open any title and tap the <span class="watched-empty-tick">✓</span> on its card once you've seen it. Everything you tick shows up here, in the order it came out.</p>
    <button type="button" class="watched-empty-go">Back to the map</button>
`;

document.getElementById("viewport").appendChild(note);

note.querySelector(".watched-empty-go").addEventListener("click", () => {

    setWorldView(ALL_WORLDS, "complete");

});

function inWatchedView(){

    return getCurrentView() === "watched" && getWorld() === ALL_WORLDS;

}

function count(){

    const seen = new Set();

    for(const n of graph.nodes){

        if(!n.isBranch && n.id && isWatched(n.id)) seen.add(n.id);

    }

    return seen.size;

}

function refreshNote(){

    note.classList.toggle("show", inWatchedView() && count() === 0);

}

let lastCount = -1;

window.addEventListener("mcu:view-changed", () => {

    lastCount = inWatchedView() ? count() : -1;

    refreshNote();

});

window.addEventListener("mcu:watched-changed", () => {

    if(!inWatchedView()){

        refreshNote();

        return;

    }

    // Rearrange in place: the posters ease to their new spots
    // (updateGraph), the camera stays put...
    LAYOUTS.watched(graph.nodes);

    const n = count();

    // ...unless it was empty (nothing to look at yet) — then
    // frame the first ones.
    if(lastCount === 0 && n > 0) resetView();

    lastCount = n;

    refreshNote();

});
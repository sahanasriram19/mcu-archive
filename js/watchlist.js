//==================================================
// WATCHLIST
//
// The titles you want to watch next, kept in this browser
// (localStorage) — the same way as the watched list
// (js/watched.js). Stored by title id, so a title that's in
// two worlds (Deadpool & Wolverine, No Way Home…) is on the
// list once, whichever world you added it from.
//
// The order you add titles in doesn't matter: the two
// Watchlist views (layout.js) put them in release order or
// in story order.
//
// Fires "mcu:watchlist-changed" on window whenever the list
// changes, so the details card and the Watchlist views can
// keep up.
//==================================================

import { canonicalId } from "./watched.js";

const KEY = "mcu-archive:watchlist";

let ids = load();

function load(){

    try {

        const raw = localStorage.getItem(KEY);

        const list = raw ? JSON.parse(raw) : [];

        // (An old season id counts for its show.)
        return new Set((Array.isArray(list) ? list : []).map(canonicalId));

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

export function onWatchlist(id){

    return ids.has(id);

}

export function setOnWatchlist(id, on){

    if(on === ids.has(id)) return;

    if(on) ids.add(id);
    else ids.delete(id);

    save();

    window.dispatchEvent(new CustomEvent("mcu:watchlist-changed", { detail: { id, on } }));

}

export function toggleWatchlist(id){

    setOnWatchlist(id, !ids.has(id));

}

export function watchlistSize(){

    return ids.size;

}
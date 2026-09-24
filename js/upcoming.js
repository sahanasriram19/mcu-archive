//==================================================
// UPCOMING RELEASES
//
// Two features built on the release dates in mcu.json:
//
// 1. COUNTDOWN — a card in the top-right corner counting
//    down to the next title that hasn't come out yet.
//    Click it to open that title's details. When a title's
//    release day arrives, it moves on to the next one by
//    itself.
//
// 2. "WHAT SHOULD I WATCH BEFORE…?" — for any title, a
//    short list of titles to watch first:
//      • a hand-picked `watchBefore` list in mcu.json, if the
//        title has one (the upcoming titles do — edit them
//        freely, they're just ids), otherwise
//      • every earlier title that shares one of its
//        characters.
//    "Show on map" dims everything else, lights up that
//    list, frames it, and shows a banner to clear it.
//
// Release dates count to local midnight on the day.
//==================================================

import { graph } from "./graph.js";
import { showMovieDetails } from "./movieDetails.js";
import { focusNodes } from "./viewManager.js";

//--------------------------------------------------
// Dates
//--------------------------------------------------

// "2026-10-14" -> local midnight that day. (new Date() on a
// bare date string means UTC midnight, which is mid-morning
// in Singapore and the evening before in the US.)
export function releaseTime(node){

    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(node.release || "");

    if(!m) return NaN;

    return new Date(+m[1], +m[2] - 1, +m[3]).getTime();

}

export function isUpcoming(node, now = Date.now()){

    const t = releaseTime(node);

    return !isNaN(t) && t > now;

}

function movies(){

    return graph.nodes.filter(n => !n.isBranch);

}

export function nextRelease(now = Date.now()){

    return movies()
        .filter(n => isUpcoming(n, now))
        .sort((a, b) => releaseTime(a) - releaseTime(b))[0] || null;

}

//--------------------------------------------------
// Watch list
//--------------------------------------------------

// Returns { nodes, source } — source is "curated" (from
// mcu.json's watchBefore) or "characters" (the fallback).
export function watchListFor(node){

    const all = movies();

    const byId = new Map(all.map(n => [n.id, n]));

    if(node.watchBefore && node.watchBefore.length){

        const picked = node.watchBefore
            .map(id => byId.get(id))
            .filter(Boolean)
            .sort((a, b) => releaseTime(a) - releaseTime(b));

        return { nodes: picked, source: "curated" };

    }

    const own = new Set(node.characters || []);

    const t = releaseTime(node);

    const shared = all
        .filter(n =>
            n !== node &&
            releaseTime(n) < t &&
            (n.characters || []).some(c => own.has(c))
        )
        .sort((a, b) => releaseTime(a) - releaseTime(b));

    return { nodes: shared, source: "characters" };

}

//--------------------------------------------------
// Focus mode ("Show on map")
//--------------------------------------------------

const banner = document.createElement("div");

banner.id = "watch-banner";

banner.innerHTML = `
    <span class="watch-banner-text"></span>
    <button type="button" class="watch-banner-clear" aria-label="Clear">Clear &times;</button>
`;

document.getElementById("viewport").appendChild(banner);

const bannerText = banner.querySelector(".watch-banner-text");

banner.querySelector(".watch-banner-clear").addEventListener("click", clearWatchFocus);

window.addEventListener("keydown", e => {

    // Esc closes an open details card first (movieDetails.js);
    // only clear the focus when no card is open.
    if(e.key !== "Escape" || !graph.focus) return;

    const card = document.getElementById("movie-details-overlay");

    if(card && card.classList.contains("open")) return;

    clearWatchFocus();

}, true);   // capture phase: runs before movieDetails.js closes the card

export function startWatchFocus(node){

    const { nodes } = watchListFor(node);

    if(!nodes.length) return;

    graph.focus = {

        // The title itself stays lit too, marked as the goal.
        ids: new Set([...nodes.map(n => n.id), node.id]),
        targetId: node.id,
        label: node.title

    };

    bannerText.innerHTML =
        `<b>${nodes.length}</b> title${nodes.length === 1 ? "" : "s"} to watch before <b>${node.title}</b>`;

    banner.classList.add("show");

    focusNodes([...nodes, node]);

}

export function clearWatchFocus(){

    graph.focus = null;

    banner.classList.remove("show");

}

//--------------------------------------------------
// Countdown card
//--------------------------------------------------

const card = document.createElement("button");

card.id = "countdown";

card.type = "button";

card.innerHTML = `
    <span class="countdown-kicker">Next up</span>
    <span class="countdown-title"></span>
    <span class="countdown-meta"></span>
    <span class="countdown-clock" aria-live="off">
        <span><b data-unit="d">0</b><i>days</i></span>
        <span><b data-unit="h">00</b><i>hrs</i></span>
        <span><b data-unit="m">00</b><i>min</i></span>
        <span><b data-unit="s">00</b><i>sec</i></span>
    </span>
`;

document.getElementById("viewport").appendChild(card);

const titleEl = card.querySelector(".countdown-title");
const metaEl = card.querySelector(".countdown-meta");
const unitEls = Object.fromEntries(
    [...card.querySelectorAll("[data-unit]")].map(el => [el.dataset.unit, el])
);

let current = null;

card.addEventListener("click", () => {

    if(current) showMovieDetails(current);

});

const TYPE_LABEL = { movie: "Film", show: "Disney+ series", special: "Special" };

function formatDay(node){

    return new Date(releaseTime(node)).toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric"
    });

}

function tick(){

    const now = Date.now();

    const next = nextRelease(now);

    if(!next){

        card.classList.remove("ready");

        return;

    }

    if(next !== current){

        current = next;

        titleEl.textContent = next.title;

        metaEl.textContent = `${TYPE_LABEL[next.type] || "Title"} · ${formatDay(next)}`;

        card.setAttribute("aria-label", `Next up: ${next.title}, ${formatDay(next)}. Open details.`);

    }

    let left = Math.max(0, Math.floor((releaseTime(next) - now) / 1000));

    const d = Math.floor(left / 86400); left -= d * 86400;
    const h = Math.floor(left / 3600);  left -= h * 3600;
    const m = Math.floor(left / 60);
    const s = left - m * 60;

    const pad = n => String(n).padStart(2, "0");

    unitEls.d.textContent = d;
    unitEls.h.textContent = pad(h);
    unitEls.m.textContent = pad(m);
    unitEls.s.textContent = pad(s);

    card.classList.add("ready");

}

// Called by app.js once mcu.json has loaded.
export function initUpcoming(){

    tick();

    setInterval(tick, 1000);

}
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

import { graph, worldNodes, allNodes } from "./graph.js";
import { showMovieDetails } from "./movieDetails.js";
import { focusNodes, setWorldView, getCurrentView } from "./viewManager.js";
import { getWorld } from "./worlds.js";

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

// Cancelled titles (`"status": "cancelled"` in the data)
// never count as upcoming, whatever date they still carry.
export function isUpcoming(node, now = Date.now()){

    if(node.status === "cancelled") return false;

    const t = releaseTime(node);

    return !isNaN(t) && t > now;

}

// A title's own world (MCU or X-Men) — watch lists stay
// within it.
function worldOf(node){

    return (worldNodes[node.world] || graph.nodes).filter(n => !n.isBranch);

}

// Every upcoming title across every world, soonest first.
// A title that appears in two worlds (a bridge) counts once.
export function upcomingReleases(now = Date.now()){

    const seen = new Set();

    return allNodes()
        .filter(n => isUpcoming(n, now))
        .sort((a, b) => releaseTime(a) - releaseTime(b))
        .filter(n => !seen.has(n.id) && seen.add(n.id));

}

// The countdown looks across every world.
export function nextRelease(now = Date.now()){

    return allNodes()
        .filter(n => isUpcoming(n, now))
        .sort((a, b) => releaseTime(a) - releaseTime(b))[0] || null;

}

//--------------------------------------------------
// Watch list
//--------------------------------------------------

// Returns { nodes, source } — source is "curated" (from
// mcu.json's watchBefore) or "characters" (the fallback).
export function watchListFor(node){

    const all = worldOf(node);

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

    // Opened from the other world (e.g. the MCU countdown
    // while exploring X-Men): switch over first, same view.
    if(node.world && node.world !== getWorld()){

        setWorldView(node.world, getCurrentView() === "characters" ? "complete" : getCurrentView());

    }

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
// Countdown cards (top right)
//
// A column of identical cards, one per upcoming title
// across every world, soonest at the top: title, type,
// date and a ticking clock. Click one to open that title's
// details. As each release day arrives, its card drops
// off and the rest move up. How many show depends on the
// screen's height (css/upcoming.css); phones show only the
// next one, as a slim pill.
//--------------------------------------------------

const MAX_CARDS = 4;

const column = document.createElement("div");

column.id = "countdown";

document.getElementById("viewport").appendChild(column);

const TYPE_LABEL = { movie: "Film", show: "Disney+ series", special: "Special" };

function formatDay(node){

    return new Date(releaseTime(node)).toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric"
    });

}

const pad = n => String(n).padStart(2, "0");

function split(ms){

    let left = Math.max(0, Math.floor(ms / 1000));

    const d = Math.floor(left / 86400); left -= d * 86400;
    const h = Math.floor(left / 3600);  left -= h * 3600;
    const m = Math.floor(left / 60);
    const s = left - m * 60;

    return { d, h, m, s };

}

// { node, units: {d,h,m,s} } for each card on screen.
let cards = [];

let cardsKey = "";

function buildCards(nodes){

    column.innerHTML = "";

    cards = nodes.map((node, i) => {

        const btn = document.createElement("button");

        btn.type = "button";
        btn.className = "countdown-card";

        btn.innerHTML = `
            <span class="countdown-kicker">${i === 0 ? "Next up" : "Coming up"}</span>
            <span class="countdown-title"></span>
            <span class="countdown-meta"></span>
            <span class="countdown-clock" aria-live="off">
                <span><b data-unit="d">0</b><i>days</i></span>
                <span><b data-unit="h">00</b><i>hrs</i></span>
                <span><b data-unit="m">00</b><i>min</i></span>
                <span><b data-unit="s">00</b><i>sec</i></span>
            </span>
        `;

        btn.querySelector(".countdown-title").textContent = node.title;

        // Long names are cut to one line so every card is the
        // same height; hovering shows the full title.
        btn.title = node.title;
        btn.querySelector(".countdown-meta").textContent = `${TYPE_LABEL[node.type] || "Title"} · ${formatDay(node)}`;

        btn.setAttribute("aria-label", `${i === 0 ? "Next up" : "Coming up"}: ${node.title}, ${formatDay(node)}. Open details.`);

        btn.addEventListener("click", () => showMovieDetails(node));

        column.appendChild(btn);

        const units = Object.fromEntries(
            [...btn.querySelectorAll("[data-unit]")].map(el => [el.dataset.unit, el])
        );

        return { node, units };

    });

}

function tick(){

    const now = Date.now();

    const upcoming = upcomingReleases(now).slice(0, MAX_CARDS);

    if(!upcoming.length){

        column.classList.remove("ready");

        return;

    }

    // Rebuild only when the line-up changes (a release day
    // passed); otherwise just update the numbers.
    const key = upcoming.map(n => n.id).join("|");

    if(key !== cardsKey){

        cardsKey = key;

        buildCards(upcoming);

    }

    cards.forEach(({ node, units }) => {

        const { d, h, m, s } = split(releaseTime(node) - now);

        units.d.textContent = d;
        units.h.textContent = pad(h);
        units.m.textContent = pad(m);
        units.s.textContent = pad(s);

    });

    column.classList.add("ready");

}

// Called by app.js once the data has loaded.
export function initUpcoming(){

    tick();

    setInterval(tick, 1000);

}
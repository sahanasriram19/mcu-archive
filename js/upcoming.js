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
//        freely, they're just ids, and may be titles from
//        another world, like the X-Men films), otherwise
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
import { getWorld, ALL_WORLDS } from "./worlds.js";

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

    // A hand-picked list can reach into another world too
    // (Avengers: Doomsday lists the Fox X-Men films): ids
    // are looked up in the title's own world first, then in
    // the others.
    const anyWorld = new Map();

    allNodes().forEach(n => { if(!n.isBranch && !anyWorld.has(n.id)) anyWorld.set(n.id, n); });

    if(node.watchBefore && node.watchBefore.length){

        const picked = node.watchBefore
            .map(id => byId.get(id) || anyWorld.get(id))
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

    const { nodes: list } = watchListFor(node);

    // Only titles in this title's own world can light up on
    // its map; the rest (e.g. the X-Men films for Doomsday)
    // are counted in the banner instead.
    const home = node.world || getWorld();

    // On the combined "Complete MCU" map every world is on
    // screen, so the whole list can light up there.
    const onCombined = getWorld() === ALL_WORLDS;

    const nodes = onCombined ? list : list.filter(n => (n.world || home) === home);

    const elsewhere = list.length - nodes.length;

    if(!nodes.length) return;

    // Opened from the other world (e.g. the MCU countdown
    // while exploring X-Men): switch over first, same view.
    if(!onCombined && node.world && node.world !== getWorld()){

        setWorldView(node.world, getCurrentView() === "characters" ? "complete" : getCurrentView());

    }

    graph.focus = {

        // The title itself stays lit too, marked as the goal.
        ids: new Set([...nodes.map(n => n.id), node.id]),
        targetId: node.id,
        label: node.title

    };

    bannerText.innerHTML =
        `<b>${nodes.length}</b> title${nodes.length === 1 ? "" : "s"} to watch before <b>${node.title}</b>` +
        (elsewhere ? ` <span class="watch-banner-more">+ ${elsewhere} from other worlds</span>` : "");

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

        btn.addEventListener("click", () => showMovieDetails(node, { from: btn }));

        column.appendChild(btn);

        const units = Object.fromEntries(
            [...btn.querySelectorAll("[data-unit]")].map(el => [el.dataset.unit, el])
        );

        return { node, units };

    });

}

// Flip-clock digits: each digit is its own flap. When a
// number changes, only the digits that actually changed
// flip — the old one folds away from you and the new one
// folds down into place, like the flaps on an airport
// departure board. Plain swap with "reduce motion" on.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function flipDigit(el, ch){

    if(el.textContent === ch) return;

    if(reduceMotion.matches || !el.animate){

        el.textContent = ch;

        return;

    }

    // A flip still running: jump straight to the new digit.
    if(el._flip){

        el._flip.cancel();

        el._flip = null;

    }

    const away = el.animate(
        [ { transform: "rotateX(0deg)" }, { transform: "rotateX(-90deg)" } ],
        { duration: 170, easing: "ease-in" }
    );

    el._flip = away;

    away.onfinish = () => {

        el.textContent = ch;

        const back = el.animate(
            [ { transform: "rotateX(90deg)" }, { transform: "rotateX(0deg)" } ],
            { duration: 230, easing: "cubic-bezier(.2,.9,.3,1.2)" }
        );

        el._flip = back;

        back.onfinish = () => { el._flip = null; };

    };

    away.oncancel = () => { el.textContent = ch; };

}

// Shows `text` in a number's digit flaps, flipping only the
// ones that changed. (If the number of digits changes — 100
// days down to 99 — the flaps are simply rebuilt.)
function flipTo(el, text){

    const digits = el.children;

    if(digits.length !== text.length){

        el.innerHTML = [...text].map(c => `<span class="digit">${c}</span>`).join("");

        return;

    }

    [...text].forEach((c, i) => flipDigit(digits[i], c));

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

        flipTo(units.d, String(d));
        flipTo(units.h, pad(h));
        flipTo(units.m, pad(m));
        flipTo(units.s, pad(s));

    });

    column.classList.add("ready");

}

// Called by app.js once the data has loaded.
export function initUpcoming(){

    tick();

    setInterval(tick, 1000);

}
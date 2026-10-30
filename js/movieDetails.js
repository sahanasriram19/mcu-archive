//==================================================
// MOVIE DETAILS MODAL
//
// A click on a poster (see nodeHitTest.js + input.js)
// calls showMovieDetails(node) to populate and reveal
// this card. Overview/rating come from posters.js,
// which now stashes them on the node alongside the
// poster image whenever TMDB has them.
//==================================================

import { fetchDetails } from "./posters.js";
import { watchListFor, startWatchFocus, isUpcoming, releaseTime } from "./upcoming.js";
import { groupName, WORLDS } from "./worlds.js";
import { canFlip, flipOpen, flipClose, hideFlipper, goodRect } from "./flip.js";
import { isWatched, toggleWatched } from "./watched.js";
import { setLinkTitle, copyLink } from "./links.js";
import { watchScroll } from "./scrollHints.js";

const overlay = document.createElement("div");
overlay.id = "movie-details-overlay";

overlay.innerHTML = `
    <div id="movie-details-card">
        <button id="movie-details-close" aria-label="Close">&times;</button>
        <button type="button" id="movie-details-watched" aria-pressed="false">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.6 3.6 7.4-8.2"/></svg>
        </button>
        <div id="movie-details-poster"></div>
        <div id="movie-details-body">
            <div id="movie-details-kicker"></div>
            <h2 id="movie-details-title"></h2>
            <div id="movie-details-meta"></div>
            <div id="movie-details-actions">
                <a id="movie-details-trailer" target="_blank" rel="noopener">▶ Watch Trailer</a>
                <span id="movie-details-more"></span>
                <button type="button" id="movie-details-share" title="Copy link" aria-label="Copy link"></button>
            </div>
            <p id="movie-details-overview"></p>
            <div id="movie-details-cast"></div>
            <div id="movie-details-watch"></div>
        </div>
    </div>
`;

document.body.appendChild(overlay);

const posterEl = overlay.querySelector("#movie-details-poster");
const kickerEl = overlay.querySelector("#movie-details-kicker");
const titleEl = overlay.querySelector("#movie-details-title");
const metaEl = overlay.querySelector("#movie-details-meta");
const overviewEl = overlay.querySelector("#movie-details-overview");
const trailerEl = overlay.querySelector("#movie-details-trailer");
const moreEl = overlay.querySelector("#movie-details-more");
const castEl = overlay.querySelector("#movie-details-cast");
const watchEl = overlay.querySelector("#movie-details-watch");
const watchedBtn = overlay.querySelector("#movie-details-watched");
const shareBtn = overlay.querySelector("#movie-details-share");
const bodyEl = overlay.querySelector("#movie-details-body");

// No scrollbars (css/main.css): the card's text and its
// sideways rows fade at the edge while there's more to see.
watchScroll(bodyEl);

// Two overlapping squares; a tick for a moment once copied.
const COPY_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/></svg>`;
const COPIED_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 12.5l3.6 3.6 7.4-8.2"/></svg>`;

function resetShareBtn(){

    clearTimeout(shareBtn.resetTimer);

    shareBtn.innerHTML = COPY_ICON;
    shareBtn.classList.remove("copied");
    shareBtn.title = "Copy link";
    shareBtn.setAttribute("aria-label", "Copy link");

}

resetShareBtn();

//--------------------------------------------------
// Watched (js/watched.js): a toggle on the card. Not
// offered for titles that aren't out yet.
//--------------------------------------------------

function renderWatchedButton(node){

    const canWatch = !isUpcoming(node) && node.status !== "cancelled";

    watchedBtn.style.display = canWatch ? "" : "none";

    const on = isWatched(node.id);

    watchedBtn.classList.toggle("on", on);
    watchedBtn.setAttribute("aria-pressed", on ? "true" : "false");
    const label = on ? "Watched (click to undo)" : "Mark as watched";

    watchedBtn.title = label;
    watchedBtn.setAttribute("aria-label", label);

}

watchedBtn.addEventListener("click", () => {

    if(openNode) toggleWatched(openNode.id);

});

window.addEventListener("mcu:watched-changed", () => {

    if(!openNode) return;

    renderWatchedButton(openNode);
    renderWatchBefore(openNode);

});

// Copy link (js/links.js): the address already points at
// this card; this just puts it on the clipboard.
shareBtn.addEventListener("click", async () => {

    const ok = await copyLink();

    clearTimeout(shareBtn.resetTimer);

    if(ok){

        shareBtn.innerHTML = COPIED_ICON;
        shareBtn.classList.add("copied");

    }

    const label = ok ? "Link copied" : "Couldn't copy: copy the address bar";

    shareBtn.title = label;
    shareBtn.setAttribute("aria-label", label);

    shareBtn.resetTimer = setTimeout(resetShareBtn, 1600);

});

//--------------------------------------------------
// "Watch before this" — see js/upcoming.js for where the
// list comes from. Each title is a chip that opens its
// own card; "Show on map" closes this card and lights the
// list up on the map.
//--------------------------------------------------

function renderWatchBefore(node){

    const { nodes, source } = watchListFor(node);

    if(!nodes.length){

        watchEl.innerHTML = "";

        return;

    }

    const note = source === "curated"
        ? "The essentials"
        : "Earlier titles with the same characters";

    // Ticked off already (js/watched.js)?
    const seenCount = nodes.filter(n => isWatched(n.id)).length;

    const left = nodes.length - seenCount;

    const countText = seenCount === 0
        ? `${nodes.length} title${nodes.length === 1 ? "" : "s"}`
        : left === 0
            ? "all watched"
            : `${left} of ${nodes.length} left`;

    // A row of small posters, like the cast row above it.
    // Uses TMDB's smallest poster size (w185) — plenty for
    // ~80px thumbnails. Titles whose poster hasn't loaded
    // yet get a card in their own colour with the name.
    const thumb = n => {

        const url = n.poster
            ? (typeof n.poster === "string" ? n.poster : (n.poster.small || n.poster.medium))
            : "";

        return url
            ? `<img src="${url}" alt="" loading="lazy">`
            : `<div class="watch-poster-fallback" style="--c:${n.colour}">${n.title}</div>`;

    };

    // Opened from the landing page's 3D fly-through, there's
    // no map on screen to show the list on, so "Show on map"
    // only appears once you're inside the archive.
    const landingEl = document.getElementById("landing");

    const onLanding = !!landingEl && landingEl.style.display !== "none";

    // Titles from another world get its name after the
    // year, e.g. "2000 · X-Men".
    const otherWorld = n => {

        const home = node.world || "mcu";

        return n.world && n.world !== home && WORLDS[n.world]
            ? ` · <span class="watch-world">${WORLDS[n.world].label}</span>`
            : "";

    };

    watchEl.innerHTML = `
        <div class="watch-head">
            <div>
                <div class="watch-label">Watch before this</div>
                <div class="watch-note">${note} · ${countText}</div>
            </div>
            ${onLanding ? "" : `<button type="button" class="watch-show">Show on map</button>`}
        </div>
        <div class="watch-row">
            ${nodes.map((n, i) => `
                <button type="button" class="watch-item${isWatched(n.id) ? " seen" : ""}" data-i="${i}" title="${n.title}">
                    <div class="watch-poster">${thumb(n)}</div>
                    <div class="watch-title">${n.title}</div>
                    <div class="watch-year">${(n.release || "").slice(0, 4)}${otherWorld(n)}</div>
                </button>
            `).join("")}
        </div>
    `;

    watchScroll(watchEl.querySelector(".watch-row"), "x");

    watchEl.querySelectorAll(".watch-item").forEach(item => {

        item.addEventListener("click", () => showMovieDetails(nodes[+item.dataset.i]));

    });

    const showBtn = watchEl.querySelector(".watch-show");

    if(showBtn) showBtn.addEventListener("click", () => {

        hideMovieDetails();

        startWatchFocus(node);

    });

}

// Where the card flipped out from (an element, or a
// function giving a rectangle), so it can flip back there.
let flipFrom = null;

function rectOf(from){

    if(!from) return null;

    if(typeof from === "function") return from();

    if(from instanceof Element && from.isConnected){

        const r = from.getBoundingClientRect();

        return { left: r.left, top: r.top, width: r.width, height: r.height };

    }

    return null;

}

function flipPosterUrl(node){

    if(!node.poster) return "";

    return typeof node.poster === "string"
        ? node.poster
        : (node.poster.medium || node.poster.small || node.poster.large || "");

}

const card = overlay.querySelector("#movie-details-card");

//--------------------------------------------------
// The poster a card was opened from lifts off the page
// while its card is open — it has "become" the card —
// and drops back into place when the card closes (after
// the flip back, so the flipping copy lands in the gap).
// A poster on the map fades via node.detailsOpen
// (graph.js / nodes.js); one on the landing page's
// fly-through via the .details-source class
// (css/landing.css).
//--------------------------------------------------

let source = null;   // { node, el }

function hideSource(node, from){

    showSource();

    const el = from instanceof Element ? (from.closest(".intro-item") || from) : null;

    if(el) el.classList.add("details-source");
    else node.detailsOpen = true;

    source = { node, el };

}

function showSource(){

    if(!source) return;

    if(source.el) source.el.classList.remove("details-source");
    else source.node.detailsOpen = false;

    source = null;

}

export function hideMovieDetails() {

    if(!overlay.classList.contains("open") && !overlay.classList.contains("dim")) return;

    openNode = null;

    setLinkTitle(null);

    const back = flipFrom && canFlip() ? rectOf(flipFrom) : null;

    flipFrom = null;

    if(goodRect(back) && overlay.classList.contains("open")){

        // Flip back down onto the poster: the real card
        // vanishes at once and the flipping copy takes over.
        overlay.classList.add("flipping");
        overlay.classList.remove("open", "dim");

        const returning = source;

        flipClose(back, card).then(() => {

            overlay.classList.remove("flipping");

            // The copy has landed where the poster was: the
            // poster itself takes over again. (Unless another
            // card has opened from it in the meantime.)
            if(source === returning) showSource();

        });

        return;

    }

    hideFlipper();

    showSource();

    overlay.classList.remove("open", "dim", "flipping");

}

// The id of the title whose card is open, or null.
export function openDetailsId(){

    return openNode ? openNode.id : null;

}

overlay.addEventListener("click", e => {

    // Only closes on a click outside the card itself.
    if (e.target === overlay) hideMovieDetails();

});

overlay.querySelector("#movie-details-close")
    .addEventListener("click", hideMovieDetails);

window.addEventListener("keydown", e => {

    if (e.key === "Escape") hideMovieDetails();

});

function posterUrlFor(node) {

    if (!node.poster) return "";

    return typeof node.poster === "string"
        ? node.poster
        : (node.poster.large || node.poster.medium || node.poster.small || "");

}

function formatDate(release) {

    if (!release) return "";

    const d = new Date(release);

    if (isNaN(d)) return release;

    return d.toLocaleDateString(undefined, {

        year: "numeric",
        month: "long",
        day: "numeric"

    });

}

let openNode = null;

//--------------------------------------------------
// WHERE TO WATCH
//
// A button for each well-known service that has the title
// where the viewer is — streaming it ("Watch on Netflix") or
// renting / selling it ("Rent or buy on YouTube") — going by
// TMDB's where-to-watch (data from JustWatch, fetched with the
// cast and trailer, js/posters.js). The country comes from the
// browser's time zone. Only what TMDB confirms gets a button:
// no data, a service that isn't well known, or nothing there
// at all — no button, just the trailer.
//
// Each button opens the title on that service where it can:
// Disney+ straight to the title (its ids are in
// data/disneyplus.json, the same in every country; the app
// opens instead on a phone that has it), the others a search
// for it there, and Max (which has no search link) TMDB's page
// that links straight to it.
//--------------------------------------------------

// (A few titles are stored as a full Disney+ link instead.)
const DISNEY_TITLE = id => id.startsWith("https://") ? id : `https://www.disneyplus.com/browse/entity-${id}`;
const DISNEY_MARVEL = "https://www.disneyplus.com/brand/marvel";

let disneyIds = {};

fetch("./data/disneyplus.json")
    .then(r => r.ok ? r.json() : {})
    .then(map => {

        disneyIds = map || {};

        if (openNode && openNode.detailsLoaded) renderWatchButtons(openNode);

    })
    .catch(() => {});

// The well-known services, in the order their buttons go.
// `match` is tested against TMDB's provider name; channels
// sold through another store ("… Amazon Channel", "… Apple TV
// Channel") are skipped, as they'd be mislabelled.
const SERVICES = [
    { key: "disney",  label: "Disney+",     match: /disney\s*(\+|plus)/i,
      url: (node) => disneyIds[node.id] ? DISNEY_TITLE(disneyIds[node.id]) : DISNEY_MARVEL },
    { key: "netflix", label: "Netflix",     match: /netflix/i,
      url: (node, q) => `https://www.netflix.com/search?q=${q}` },
    { key: "prime",   label: "Prime Video", match: /amazon|prime video/i,
      url: (node, q) => `https://www.primevideo.com/search?phrase=${q}` },
    { key: "max",     label: "Max",         match: /^(hbo\s*)?max\b/i,
      url: (node, q, w) => w.link },
    { key: "hulu",    label: "Hulu",        match: /^hulu\b/i,
      url: (node, q) => `https://www.hulu.com/search?q=${q}` },
    { key: "apple",   label: "Apple TV",    match: /apple tv|itunes/i,
      url: (node, q) => `https://tv.apple.com/search?term=${q}` },
    { key: "youtube", label: "YouTube",     match: /youtube/i,
      url: (node, q, w, qy) => `https://www.youtube.com/results?search_query=${qy}` },
    { key: "google",  label: "Google Play", match: /google play/i,
      url: (node, q, w, qy) => `https://play.google.com/store/search?q=${qy}&c=movies` }
];

// At most this many buttons, so the row stays tidy (streaming
// ones first).
const MAX_WATCH_BUTTONS = 4;

function renderWatchButtons(node) {

    moreEl.innerHTML = "";

    if (node.status === "cancelled" || isUpcoming(node)) return;

    const w = node.watch;

    if (!w || !w.offers || !w.offers.length) return;

    // "Spider-Man (1967)" → "Spider-Man"; with the year for
    // the stores that sell all sorts.
    const name = (node.title || "").replace(/\s*\([^)]*\)\s*/g, " ").trim();
    const year = (node.release || "").slice(0, 4);

    const q = encodeURIComponent(name);
    const qy = encodeURIComponent(`${name} ${year}`.trim());

    // Each service once: streaming if it streams it, else
    // rent / buy.
    const found = new Map();

    w.offers.forEach(o => {

        if (/channel/i.test(o.name)) return;

        const svc = SERVICES.find(sv => sv.match.test(o.name));

        if (!svc) return;

        const was = found.get(svc.key);

        if (!was || (was !== "stream" && o.kind === "stream")) found.set(svc.key, o.kind);

    });

    const buttons = SERVICES
        .filter(sv => found.has(sv.key))
        .map(sv => ({ sv, kind: found.get(sv.key) }))
        .sort((a, b) => (a.kind === "stream" ? 0 : 1) - (b.kind === "stream" ? 0 : 1))
        .slice(0, MAX_WATCH_BUTTONS);

    buttons.forEach(({ sv, kind }) => {

        const href = sv.url(node, q, w, qy);

        if (!href) return;

        const a = document.createElement("a");

        a.className = "watch-service " + sv.key;
        a.target = "_blank";
        a.rel = "noopener";
        a.href = href;

        a.textContent = kind === "stream" ? `Watch on ${sv.label}` : `Rent or buy on ${sv.label}`;

        a.title = kind === "stream"
            ? `${node.title} is streaming on ${sv.label} (${w.region})`
            : `Rent or buy ${node.title} on ${sv.label} (${w.region})`;

        moreEl.appendChild(a);

    });

}

function renderExtras(node) {

    renderWatchButtons(node);

    if (node.trailerUrl) {

        trailerEl.href = node.trailerUrl;
        trailerEl.style.display = "inline-flex";

    } else {

        trailerEl.removeAttribute("href");
        trailerEl.style.display = "none";

    }

    if (node.cast && node.cast.length) {

        castEl.innerHTML =
            `<div id="movie-details-cast-label">Cast</div>` +
            `<div id="movie-details-cast-list">` +
            node.cast.map(member => {

                const initials = member.name
                    .split(" ")
                    .map(w => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                const avatar = member.photo
                    ? `<img src="${member.photo}" alt="${member.name}">`
                    : `<div class="cast-avatar-fallback">${initials}</div>`;

                return `
                    <div class="cast-member">
                        <div class="cast-avatar">${avatar}</div>
                        <div class="cast-name">${member.name}</div>
                        <div class="cast-character">${member.character}</div>
                    </div>
                `;

            }).join("") +
            `</div>`;

        watchScroll(castEl.querySelector("#movie-details-cast-list"), "x");

    } else {

        castEl.innerHTML = "";

    }

}

// opts.from: where the poster that was clicked is — an
// element, or a function returning a screen rectangle. The
// card then flips out of it (js/flip.js). Without it, the
// card just swings in as before.
export async function showMovieDetails(node, opts = {}) {

    openNode = node;

    setLinkTitle(node.id);

    resetShareBtn();

    const startRect = opts.from && canFlip() ? rectOf(opts.from) : null;

    const flipping = goodRect(startRect);

    // The poster it came from leaves the page while its card
    // is open (only posters ask for this — opts.hideSource).
    if(opts.hideSource && opts.from) hideSource(node, opts.from);
    else showSource();

    let landed = null;

    if(flipping){

        flipFrom = opts.from;

        // Dim the page now; the card itself stays hidden
        // until the flipping copy has landed on its spot.
        overlay.classList.remove("open");
        overlay.classList.add("flipping", "dim");

        landed = flipOpen(startRect, card, flipPosterUrl(node), node.colour, node.title);

    } else {

        flipFrom = null;

        hideFlipper();

        overlay.classList.remove("flipping", "dim");

    }

    const url = posterUrlFor(node);

    posterEl.innerHTML = url
        ? `<img src="${url}" alt="${node.title}">`
        : `<div id="movie-details-noposter">${node.title}</div>`;

    kickerEl.textContent =
        node.type === "show" ? "Disney+ Series" :
            node.type === "special" ? "Marvel Special" :
                "Feature Film";

    titleEl.textContent = node.title;

    // (Filled in once where-to-watch comes back, renderExtras.)
    moreEl.innerHTML = "";

    const metaParts = [];

    if (node.status === "cancelled") {

        metaParts.push("Cancelled");

    } else if (node.release) {

        metaParts.push(
            isUpcoming(node)
                ? "Coming " + new Date(releaseTime(node)).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })
                : formatDate(node.release)
        );

    }

    if (node.phase !== undefined && node.phase !== null && node.phase >= 0) {

        // "Phase 3" for MCU titles, "Defenders" for the Netflix
        // shows, the era name for X-Men and Spider-Man.
        metaParts.push(groupName(node.phase, { upper: false }) + (node.world && node.world !== "mcu" ? " era" : ""));

    }

    if (typeof node.rating === "number" && node.rating > 0) {

        metaParts.push("★ " + node.rating.toFixed(1));

    }

    metaEl.textContent = metaParts.join("  ·  ");

    renderWatchedButton(node);

    overviewEl.textContent = node.overview ||
        "No synopsis yet.";

    renderWatchBefore(node);

    bodyEl.scrollTop = 0;

    // fetchDetails() call as soon as the poster is hovered,
    // so by the time a click actually lands it has usually
    // already resolved (fetchDetails is a no-op the second
    // time it's called for a node that's already loaded/
    // loading, so this doesn't double the network cost).
        await fetchDetails(node);

        if (openNode !== node) return;

        // Give the browser one frame to apply any updates
        await new Promise(requestAnimationFrame);

        renderExtras(node);

        if(landed){

            await landed;

            if (openNode !== node) return;

        }

        overlay.classList.add("open");

        // The real card is now exactly where the copy is;
        // swap them on the next frame.
        if(landed) requestAnimationFrame(hideFlipper);

}
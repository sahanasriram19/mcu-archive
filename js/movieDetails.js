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
                <a id="movie-details-disney" target="_blank" rel="noopener">Watch on Disney+</a>
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
const disneyEl = overlay.querySelector("#movie-details-disney");
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
// Watch on Disney+
//
// Opens the title itself on Disney+: in the browser, or in
// the Disney+ app on a phone or tablet that has it (Disney+
// links open the app there). data/disneyplus.json holds each
// title's Disney+ id — the same id in every country; Disney+
// sends each viewer to their own country's page. A title not
// in it opens Disney+'s Marvel page instead (still "Watch on
// Disney+"), unless TMDB's where-to-watch data (js/posters.js)
// says it isn't on Disney+ where the viewer is and there's no
// Disney+ link for it, in which case it's a "Where to watch"
// button to the services that do have it. Hidden for titles
// not out yet, and cancelled ones.
//--------------------------------------------------

// (A few titles are stored as a full Disney+ link instead.)
const DISNEY_TITLE = id => id.startsWith("https://") ? id : `https://www.disneyplus.com/browse/entity-${id}`;
const DISNEY_MARVEL = "https://www.disneyplus.com/brand/marvel";

let disneyIds = {};

fetch("./data/disneyplus.json")
    .then(r => r.ok ? r.json() : {})
    .then(map => {

        disneyIds = map || {};

        if (openNode) renderDisneyLink(openNode);

    })
    .catch(() => {});

function renderDisneyLink(node) {

    const hide = () => {

        disneyEl.removeAttribute("href");
        disneyEl.style.display = "none";

    };

    if (node.status === "cancelled" || isUpcoming(node)) return hide();

    const id = disneyIds[node.id];

    const w = node.watch;

    let href, label, title, elsewhere = false;

    if (id) {

        href = DISNEY_TITLE(id);
        label = "Watch on Disney+";
        title = `Open ${node.title} on Disney+`;

    } else if (w && !w.onDisneyHere && w.link) {

        // Not on Disney+ where the viewer is: where it is.
        href = w.link;
        label = "Where to watch";
        title = `Where to stream, rent or buy ${node.title} (${w.region})`;
        elsewhere = true;

    } else {

        href = DISNEY_MARVEL;
        label = "Watch on Disney+";
        title = `Watch ${node.title} in Marvel on Disney+`;

    }

    disneyEl.href = href;
    disneyEl.textContent = label;
    disneyEl.title = title;
    disneyEl.classList.toggle("elsewhere", elsewhere);
    disneyEl.style.display = "inline-flex";

}

function renderExtras(node) {

    renderDisneyLink(node);

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

    renderDisneyLink(node);

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
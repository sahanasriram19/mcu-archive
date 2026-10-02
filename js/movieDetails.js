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

const overlay = document.createElement("div");
overlay.id = "movie-details-overlay";

overlay.innerHTML = `
    <div id="movie-details-card">
        <button id="movie-details-close" aria-label="Close">&times;</button>
        <div id="movie-details-poster"></div>
        <div id="movie-details-body">
            <div id="movie-details-kicker"></div>
            <h2 id="movie-details-title"></h2>
            <div id="movie-details-meta"></div>
            <a id="movie-details-trailer" target="_blank" rel="noopener">▶ Watch Trailer</a>
            <p id="movie-details-overview"></p>
            <div id="movie-details-characters"></div>
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
const charactersEl = overlay.querySelector("#movie-details-characters");
const castEl = overlay.querySelector("#movie-details-cast");
const watchEl = overlay.querySelector("#movie-details-watch");

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
        ? "Hand-picked essentials"
        : "Earlier titles with the same characters";

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
                <div class="watch-note">${note} · ${nodes.length} title${nodes.length === 1 ? "" : "s"}</div>
            </div>
            ${onLanding ? "" : `<button type="button" class="watch-show">Show on map</button>`}
        </div>
        <div class="watch-row">
            ${nodes.map((n, i) => `
                <button type="button" class="watch-item" data-i="${i}" title="${n.title}">
                    <div class="watch-poster">${thumb(n)}</div>
                    <div class="watch-title">${n.title}</div>
                    <div class="watch-year">${(n.release || "").slice(0, 4)}${otherWorld(n)}</div>
                </button>
            `).join("")}
        </div>
        <div class="watch-caption" aria-hidden="true"></div>
    `;

    // With a mouse the posters are fanned out like a hand of
    // cards (css/tilt.css) and their own labels are hidden;
    // the one you point at is named here instead.
    const caption = watchEl.querySelector(".watch-caption");

    const captionFor = n => `${n.title} · ${(n.release || "").slice(0, 4)}${otherWorld(n)}`;

    const idleCaption = "Point at a poster to see its title";

    caption.innerHTML = idleCaption;

    watchEl.querySelectorAll(".watch-item").forEach(item => {

        const show = () => { caption.innerHTML = captionFor(nodes[+item.dataset.i]); caption.classList.add("on"); };
        const hide = () => { caption.innerHTML = idleCaption; caption.classList.remove("on"); };

        item.addEventListener("mouseenter", show);
        item.addEventListener("focus", show);
        item.addEventListener("mouseleave", hide);
        item.addEventListener("blur", hide);

    });

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

function hideMovieDetails() {

    if(!overlay.classList.contains("open") && !overlay.classList.contains("dim")) return;

    openNode = null;

    const back = flipFrom && canFlip() ? rectOf(flipFrom) : null;

    flipFrom = null;

    if(goodRect(back) && overlay.classList.contains("open")){

        // Flip back down onto the poster: the real card
        // vanishes at once and the flipping copy takes over.
        overlay.classList.add("flipping");
        overlay.classList.remove("open", "dim");

        flipClose(back, card).then(() => overlay.classList.remove("flipping"));

        return;

    }

    hideFlipper();

    overlay.classList.remove("open", "dim", "flipping");

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

function renderExtras(node) {

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

        initCoverflow(castEl.querySelector("#movie-details-cast-list"));

    } else {

        castEl.innerHTML = "";

    }

}

//--------------------------------------------------
// Cast coverflow: the cast row is a 3D carousel. The
// photo in the middle faces you; the ones either side turn
// away and sink back, like flipping through album covers.
// Scroll (or swipe) the row to bring others to the middle.
//--------------------------------------------------

const reduceMotionCast = window.matchMedia("(prefers-reduced-motion: reduce)");

// The open card's coverflow, re-laid out on resize.
let coverflowResize = null;

window.addEventListener("resize", () => coverflowResize && coverflowResize());

function initCoverflow(list){

    if(!list || reduceMotionCast.matches) return;

    list.classList.add("coverflow");

    const members = [...list.querySelectorAll(".cast-member")];

    let queued = false;

    const update = () => {

        queued = false;

        const box = list.getBoundingClientRect();

        const mid = box.left + box.width / 2;

        members.forEach(m => {

            const r = m.getBoundingClientRect();

            const step = r.width + 14;

            // How many places from the middle (negative: left).
            const d = Math.max(-3, Math.min(3, (r.left + r.width / 2 - mid) / step));

            const a = Math.max(-1.6, Math.min(1.6, d));

            m.style.transform =
                `translateZ(${(-Math.abs(a) * 60).toFixed(1)}px) rotateY(${(-a * 38).toFixed(1)}deg) scale(${(1 - Math.min(Math.abs(d), 3) * 0.06).toFixed(3)})`;

            m.style.opacity = (1 - Math.min(Math.abs(d), 3) * 0.16).toFixed(3);

            m.style.zIndex = String(10 - Math.round(Math.abs(d) * 2));

        });

    };

    const queue = () => {

        if(queued) return;

        queued = true;

        requestAnimationFrame(update);

    };

    list.addEventListener("scroll", queue, { passive: true });

    coverflowResize = queue;

    // Start with the third photo in the middle, so there are
    // faces on both sides from the start.
    const centreOn = Math.min(2, members.length - 1);

    const start = () => {

        if(members[centreOn]) list.scrollLeft = centreOn * (members[centreOn].offsetWidth + 14);

        update();

    };

    // Once the card is open and laid out.
    requestAnimationFrame(() => requestAnimationFrame(start));

    setTimeout(update, 700);

}

// opts.from: where the poster that was clicked is — an
// element, or a function returning a screen rectangle. The
// card then flips out of it (js/flip.js). Without it, the
// card just swings in as before.
export async function showMovieDetails(node, opts = {}) {

    openNode = node;

    const startRect = opts.from && canFlip() ? rectOf(opts.from) : null;

    const flipping = goodRect(startRect);

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

    overviewEl.textContent = node.overview ||
        "No synopsis available yet for this entry.";

    if (node.characters && node.characters.length) {

        charactersEl.innerHTML =
            `<div id="movie-details-characters-label">Featuring</div>` +
            node.characters
                .map(c => `<span class="character-chip">${c}</span>`)
                .join("");

    } else {

        charactersEl.innerHTML = "";

    }

    renderWatchBefore(node);

    // fetchDetails() call as soon as the poster is hovered,
    // so by the time a click actually lands it has usually
    // already resolved (fetchDetails is a no-op the second
    // time it's called for a node that's already loaded/
    // loading, so this doesn't double the network cost).
        await fetchDetails(node);

        console.log("DETAILS DEBUG:", {
            title: node.title,
            tmdbId: node.tmdbId,
            tmdbEndpoint: node.tmdbEndpoint,
            cast: node.cast,
            castCount: node.cast?.length,
            trailer: node.trailerUrl
        });

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
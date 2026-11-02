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
import { escapeHtml, safeUrl, safeCss } from "./escape.js";

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

        return url && safeUrl(url)
            ? `<img src="${safeUrl(url)}" alt="" loading="lazy">`
            : `<div class="watch-poster-fallback" style="--c:${safeCss(n.colour)}">${escapeHtml(n.title)}</div>`;

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
            ? ` · <span class="watch-world">${escapeHtml(WORLDS[n.world].label)}</span>`
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
                <button type="button" class="watch-item${isWatched(n.id) ? " seen" : ""}" data-i="${i}" title="${escapeHtml(n.title)}">
                    <div class="watch-poster">${thumb(n)}</div>
                    <div class="watch-title">${escapeHtml(n.title)}</div>
                    <div class="watch-year">${escapeHtml((n.release || "").slice(0, 4))}${otherWorld(n)}</div>
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
// One "Where to watch" dropdown listing each well-known
// service that has the title where the viewer is — streaming
// it ("Stream") or renting / selling it ("Rent or buy") —
// going by TMDB's where-to-watch (data from JustWatch, fetched
// with the cast and trailer, js/posters.js). The country comes
// from the browser's time zone. Only what TMDB confirms gets
// listed: no data, a service that isn't well known, or nothing
// there at all — no dropdown, just the trailer.
//
// Each option opens the title on that service where it can:
// Disney+ straight to the title (its ids are in
// data/disneyplus.json), Apple TV straight to the title's own
// page (looked up on Apple's store, see appleTitleUrl below),
// the others a search for it there, and Max (which has no
// search link) TMDB's page that links straight to it.
//--------------------------------------------------

// (A few titles are stored as a full Disney+ link instead.)
const DISNEY_TITLE = id => id.startsWith("https://") ? id : `https://www.disneyplus.com/browse/entity-${id}`;
const DISNEY_MARVEL = "https://www.disneyplus.com/brand/marvel";

let disneyIds = {};

fetch("./data/disneyplus.json")
    .then(r => r.ok ? r.json() : {})
    .then(map => {

        disneyIds = map || {};

        if (openNode && openNode.detailsLoaded) renderWatchMenu(openNode);

    })
    .catch(() => {});

//--------------------------------------------------
// Apple TV: the title's own page.
//
// Apple TV pages are addressed by Apple's own id
// (tv.apple.com/sg/movie/iron-man/umc.cmc.…), which TMDB
// doesn't give. Wikidata does: its entry for a film holds the
// film's TMDB id and its Apple TV id. So:
//
//   1. find the Wikidata entry with this TMDB id (its search
//      API, which allows calls from web pages),
//   2. read the entry and take the Apple TV id from it — any
//      value shaped like "umc.cmc.…", so this doesn't depend
//      on knowing which Wikidata property holds it.
//
// (Apple's own store search can't be used for this: it only
// returns old iTunes Store links, which Apple now redirects
// to the Apple TV home page.)
//
// If nothing's found, the option opens Apple TV's search for
// the title in the viewer's country.
//--------------------------------------------------

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";

// Wikidata properties holding TMDB's movie / TV ids.
const WD_TMDB = { movie: "P4947", tv: "P4983" };

const slugify = str => (str || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "title";

async function wikidataGet(params, signal){

    const res = await fetch(`${WIKIDATA_API}?${params}&format=json&origin=*`, { signal });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    return res.json();

}

async function appleIdFromWikidata(endpoint, tmdbId){

    const prop = WD_TMDB[endpoint] || WD_TMDB.movie;

    const ctrl = new AbortController();

    const timer = setTimeout(() => ctrl.abort(), 8000);

    try {

        // 1. The entry (or entries) with this TMDB id.
        const search = await wikidataGet(
            `action=query&list=search&srlimit=3&srsearch=${encodeURIComponent(`haswbstatement:${prop}=${tmdbId}`)}`,
            ctrl.signal
        );

        const ids = ((search.query && search.query.search) || []).map(r => r.title).filter(t => /^Q\d+$/.test(t));

        if (!ids.length) return null;

        // 2. Its claims: the first "umc.cmc.…" value is the
        // Apple TV id.
        const data = await wikidataGet(`action=wbgetentities&props=claims&ids=${ids.join("|")}`, ctrl.signal);

        for (const q of ids) {

            const claims = (data.entities && data.entities[q] && data.entities[q].claims) || {};

            for (const list of Object.values(claims)) {

                for (const c of list) {

                    const v = c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value;

                    if (typeof v === "string" && /^umc\.cmc\.[a-z0-9]+$/i.test(v)) return v;

                }

            }

        }

        return null;

    } finally {

        clearTimeout(timer);

    }

}

const appleCache = new Map();   // "endpoint/id|region" → Promise<url | null>

// Found Apple TV ids are also kept in localStorage, so a
// title's link is exact straight away on later visits: 30
// days for an id that was found, 3 for "not on Wikidata" (it
// may be added). Bump the key's version to clear everyone's.
const APPLE_KEY = "mcu-archive:apple-tv:v1";
const APPLE_HIT_TTL = 30 * 24 * 60 * 60 * 1000;
const APPLE_MISS_TTL = 3 * 24 * 60 * 60 * 1000;

let appleStore = null;

function appleStored(){

    if (appleStore) return appleStore;

    try { appleStore = JSON.parse(localStorage.getItem(APPLE_KEY)) || {}; }
    catch (err) { appleStore = {}; }

    return appleStore;

}

function readAppleId(tmdbKey){

    const e = appleStored()[tmdbKey];

    if (!e) return undefined;

    const ttl = e.id ? APPLE_HIT_TTL : APPLE_MISS_TTL;

    return Date.now() - e.t < ttl ? (e.id || null) : undefined;

}

function writeAppleId(tmdbKey, id){

    appleStored()[tmdbKey] = { id: id || null, t: Date.now() };

    try { localStorage.setItem(APPLE_KEY, JSON.stringify(appleStore)); } catch (err) {}

}

function appleTitleUrl(node, name, year, region){

    const country = (region || "us").toLowerCase();

    const search = `https://tv.apple.com/${country}/search?term=${encodeURIComponent(name)}`;

    if (!node.tmdbId || !node.tmdbEndpoint) return Promise.resolve(search);

    const key = `${node.tmdbEndpoint}/${node.tmdbId}|${country}`;

    if (appleCache.has(key)) return appleCache.get(key);

    const kind = node.tmdbEndpoint === "tv" ? "show" : "movie";

    const tmdbKey = `${node.tmdbEndpoint}/${node.tmdbId}`;

    const stored = readAppleId(tmdbKey);

    const lookup = stored !== undefined
        ? Promise.resolve(stored)
        : appleIdFromWikidata(node.tmdbEndpoint, node.tmdbId).then(id => {

            writeAppleId(tmdbKey, id);

            return id;

        });

    const job = lookup
        .then(id => {

            if (id) {

                const url = `https://tv.apple.com/${country}/${kind}/${slugify(name)}/${id}`;

                console.debug(`[Apple TV] ${name} → ${url}`);

                return url;

            }

            console.debug(`[Apple TV] no Apple TV id on Wikidata for ${name} (TMDB ${node.tmdbEndpoint}/${node.tmdbId}); using Apple TV search`);

            return search;

        })
        .catch(err => {

            console.warn(`[Apple TV] Wikidata lookup failed for ${name}:`, err.message);

            appleCache.delete(key);   // try again next time

            return search;

        });

    appleCache.set(key, job);

    return job;

}

// The well-known services, in the order they're listed.
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
      // (A search until the exact page is found, below.)
      url: (node, q, w) => `https://tv.apple.com/${(w.region || "us").toLowerCase()}/search?term=${q}`,
      exact: appleTitleUrl },
    { key: "youtube", label: "YouTube",     match: /youtube/i,
      url: (node, q, w, qy) => `https://www.youtube.com/results?search_query=${qy}` },
    { key: "google",  label: "Google Play", match: /google play/i,
      url: (node, q, w, qy) => `https://play.google.com/store/search?q=${qy}&c=movies` }
];

//--------------------------------------------------
// The dropdown itself: a button that opens a short list
// of links. Closes on a pick, a click elsewhere, or Esc
// (Esc then leaves the card open).
//--------------------------------------------------

const CHEVRON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`;

function closeWatchMenu(){

    const wrap = moreEl.querySelector(".watch-dropdown.open");

    if (!wrap) return false;

    wrap.classList.remove("open");
    wrap.querySelector(".watch-dropdown-btn").setAttribute("aria-expanded", "false");

    return true;

}

document.addEventListener("pointerdown", e => {

    if (!e.target.closest || !e.target.closest(".watch-dropdown")) closeWatchMenu();

});

// Capture phase, so Esc closes just the menu, not the card.
window.addEventListener("keydown", e => {

    if (e.key === "Escape" && closeWatchMenu()) {

        e.stopImmediatePropagation();

        moreEl.querySelector(".watch-dropdown-btn")?.focus();

    }

}, true);

function renderWatchMenu(node) {

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

    const options = SERVICES
        .filter(sv => found.has(sv.key))
        .map(sv => ({ sv, kind: found.get(sv.key), href: sv.url(node, q, w, qy) }))
        .filter(o => o.href)
        .sort((a, b) => (a.kind === "stream" ? 0 : 1) - (b.kind === "stream" ? 0 : 1));

    if (!options.length) return;

    const streams = options.filter(o => o.kind === "stream").length;

    const wrap = document.createElement("div");

    wrap.className = "watch-dropdown";

    wrap.innerHTML = `
        <button type="button" class="watch-dropdown-btn" aria-haspopup="true" aria-expanded="false">
            <span>${streams ? "Where to watch" : "Rent or buy"}</span>
            ${CHEVRON}
        </button>
        <div class="watch-dropdown-menu" role="menu"></div>
    `;

    const btn = wrap.querySelector(".watch-dropdown-btn");
    const menu = wrap.querySelector(".watch-dropdown-menu");

    options.forEach(({ sv, kind, href }) => {

        const a = document.createElement("a");

        a.className = "watch-option " + sv.key;
        a.setAttribute("role", "menuitem");
        a.target = "_blank";
        a.rel = "noopener";
        a.href = href;

        a.innerHTML = `
            <span class="watch-option-dot" aria-hidden="true"></span>
            <span class="watch-option-name">${escapeHtml(sv.label)}</span>
            <span class="watch-option-kind">${kind === "stream" ? "Stream" : "Rent or buy"}</span>
        `;

        a.title = kind === "stream"
            ? `${node.title} is streaming on ${sv.label} (${w.region})`
            : `Rent or buy ${node.title} on ${sv.label} (${w.region})`;

        a.addEventListener("click", () => closeWatchMenu());

        // Apple TV: the title's own page, looked up on Apple's
        // store (above). The link is swapped in as soon as it's
        // found; if it's clicked before then, a new tab opens
        // at once and is sent on when the lookup answers (or to
        // the search, if it finds nothing or takes too long).
        if (sv.exact) {

            let exactUrl = null;
            let settled = false;

            const lookup = sv.exact(node, name, year, w.region).then(url => {

                settled = true;
                exactUrl = url;

                if (url && a.isConnected) a.href = url;

                return url;

            });

            a.addEventListener("click", e => {

                if (settled) return;

                e.preventDefault();

                const tab = window.open("about:blank", "_blank");

                const fallback = href;

                Promise.race([lookup, new Promise(r => setTimeout(() => r(null), 8000))]).then(url => {

                    const go = url || exactUrl || fallback;

                    if (tab && !tab.closed) {

                        try { tab.opener = null; } catch (err) {}

                        tab.location.href = go;

                    } else {

                        window.open(go, "_blank", "noopener");

                    }

                });

            });

        }

        menu.appendChild(a);

    });

    btn.addEventListener("click", () => {

        const open = !wrap.classList.contains("open");

        wrap.classList.toggle("open", open);
        btn.setAttribute("aria-expanded", open ? "true" : "false");

        if (!open) return;

        // Line it up with the button's right edge instead if
        // it would run off the side of the card (phones).
        wrap.classList.remove("align-right");

        const box = bodyEl.getBoundingClientRect();

        if (menu.getBoundingClientRect().right > box.right - 8) wrap.classList.add("align-right");

        // If the list runs past the bottom of the card,
        // scroll the card down just enough to show all of it.
        const below = menu.getBoundingClientRect().bottom - (box.bottom - 12);

        if (below > 0) bodyEl.scrollBy({ top: below, behavior: "smooth" });

    });

    moreEl.appendChild(wrap);

}

function renderExtras(node) {

    renderWatchMenu(node);

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

                const name = member.name || "";

                const initials = name
                    .split(" ")
                    .map(w => w[0] || "")
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                const photo = safeUrl(member.photo);

                const avatar = photo
                    ? `<img src="${photo}" alt="${escapeHtml(name)}">`
                    : `<div class="cast-avatar-fallback">${escapeHtml(initials)}</div>`;

                return `
                    <div class="cast-member">
                        <div class="cast-avatar">${avatar}</div>
                        <div class="cast-name">${escapeHtml(name)}</div>
                        <div class="cast-character">${escapeHtml(member.character)}</div>
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

    posterEl.innerHTML = safeUrl(url)
        ? `<img src="${safeUrl(url)}" alt="${escapeHtml(node.title)}">`
        : `<div id="movie-details-noposter">${escapeHtml(node.title)}</div>`;

    // A blurred copy fills the frame either side of the
    // (smaller) poster on phones (css/movieDetails.css, PHONES).
    // (Quotes, brackets and backslashes are %-encoded so the
    // link can't end the url("…") early.)
    if (safeUrl(url)) posterEl.style.setProperty("--poster-bg", `url("${new URL(url, location.href).href.replace(/["'()\\]/g, c => "%" + c.charCodeAt(0).toString(16).toUpperCase())}")`);
    else posterEl.style.removeProperty("--poster-bg");

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
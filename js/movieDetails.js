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
// TMDB doesn't give Apple's id for a title, so it's looked up
// on Apple's public store search (the iTunes Search API) by
// name, checked against the year, in the viewer's country.
// Its link (itunes.apple.com/…/movie/…/id123) opens the title
// on tv.apple.com, or in the TV app on an Apple device.
// The API has no CORS headers, so it's called the way Apple
// documents for web pages: JSONP (a <script> with a callback).
// Until it answers — or if it finds nothing — the option
// opens Apple TV's search for the title instead.
//--------------------------------------------------

let jsonpSeq = 0;

function jsonp(url, timeout = 6000){

    return new Promise((resolve, reject) => {

        const cb = `__mcuApple${Date.now()}_${jsonpSeq++}`;

        const script = document.createElement("script");

        const done = () => {

            clearTimeout(timer);
            delete window[cb];
            script.remove();

        };

        const timer = setTimeout(() => { done(); reject(new Error("timeout")); }, timeout);

        window[cb] = data => { done(); resolve(data); };

        script.onerror = () => { done(); reject(new Error("network")); };

        script.src = `${url}&callback=${cb}`;

        document.head.appendChild(script);

    });

}

// "Spider-Man: No Way Home" / "spider man no way home" → same
// key. Apple's store also names a lot of these "Marvel Studios'
// Black Panther" or "Iron Man (2008)", so those bits go too.
const simplify = str => (str || "")
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[’‘]/g, "'")
    .replace(/^\s*(marvel studios'?s?|marvel'?s|marvel)\s+/, "")
    .replace(/\s*[\(\[][^\)\]]*[\)\]]\s*/g, " ")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const yearOf = r => +(r.releaseDate || "").slice(0, 4) || 0;

// Best match from a list of Apple results (they come in
// Apple's own relevance order): same name and year first,
// then a name that contains the other and the year, then the
// same name in any year.
function pickApple(results, name, year, nameOf){

    const want = simplify(name);

    const y = +year || 0;

    const near = r => !y || !yearOf(r) || Math.abs(yearOf(r) - y) <= 1;

    const same = r => simplify(nameOf(r)) === want;

    const close = r => {

        const n = simplify(nameOf(r));

        return !!n && (n.includes(want) || want.includes(n));

    };

    return results.find(r => same(r) && near(r)) ||
        results.find(r => close(r) && near(r)) ||
        results.find(same) ||
        null;

}

async function appleSearch(params, country){

    const data = await jsonp(`https://itunes.apple.com/search?${params}&country=${country}&limit=50`);

    return (data && data.results) || [];

}

async function appleMovieUrl(name, year, country){

    const term = encodeURIComponent(name);

    const results = await appleSearch(`term=${term}&media=movie&entity=movie`, country);

    const hit = pickApple(results, name, year, r => r.trackName);

    return hit ? hit.trackViewUrl : null;

}

// Shows: Apple sells them by season ("Loki, Season 1"), each
// linking to the show — take the earliest matching season.
async function appleShowUrl(name, year, country){

    const term = encodeURIComponent(name);

    const results = await appleSearch(`term=${term}&media=tvShow&entity=tvSeason`, country);

    const want = simplify(name);

    const seasons = results
        .filter(r => {

            const show = simplify(r.artistName);
            const season = simplify((r.collectionName || "").replace(/,?\s*(season|series|vol\.?|volume)\b.*$/i, ""));

            return show === want || season === want;

        })
        .sort((a, b) => (a.releaseDate || "").localeCompare(b.releaseDate || ""));

    const first = seasons[0];

    return first ? (first.collectionViewUrl || first.artistViewUrl || null) : null;

}

const appleCache = new Map();   // "id|region" → Promise<url | null>

function appleTitleUrl(node, name, year, region){

    const key = `${node.id}|${region}`;

    if (appleCache.has(key)) return appleCache.get(key);

    const country = (region || "us").toLowerCase();

    const isShow = node.type === "show";

    // Movies first for films, seasons first for shows (specials
    // can be listed either way); the viewer's own country, then
    // the US store (Apple sends a link from another store on to
    // the viewer's own where it has the title).
    const tries = [];

    for (const c of country === "us" ? ["us"] : [country, "us"]) {

        tries.push(isShow ? [appleShowUrl, c] : [appleMovieUrl, c]);
        tries.push(isShow ? [appleMovieUrl, c] : [appleShowUrl, c]);

    }

    const job = (async () => {

        for (const [find, c] of tries) {

            try {

                const url = await find(name, year, c);

                if (url) {

                    console.debug(`[Apple TV] ${name} (${year}) → ${url}`);

                    return url;

                }

            } catch (err) {

                console.warn(`[Apple TV] lookup failed (${c}):`, err.message);

            }

        }

        console.debug(`[Apple TV] no match for ${name} (${year}); using search`);

        return null;

    })();

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
      url: (node, q) => `https://tv.apple.com/search?term=${q}`,
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
            <span class="watch-option-name">${sv.label}</span>
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

                Promise.race([lookup, new Promise(r => setTimeout(() => r(null), 4000))]).then(url => {

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

    // A blurred copy fills the frame either side of the
    // (smaller) poster on phones (css/mobile.css).
    if (url) posterEl.style.setProperty("--poster-bg", `url("${new URL(url, location.href).href}")`);
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
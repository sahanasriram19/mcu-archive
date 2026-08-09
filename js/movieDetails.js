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

function hideMovieDetails(){

    overlay.classList.remove("open");

}

overlay.addEventListener("click", e => {

    // Only closes on a click outside the card itself.
    if(e.target === overlay) hideMovieDetails();

});

overlay.querySelector("#movie-details-close")
    .addEventListener("click", hideMovieDetails);

window.addEventListener("keydown", e => {

    if(e.key === "Escape") hideMovieDetails();

});

function posterUrlFor(node){

    if(!node.poster) return "";

    return typeof node.poster === "string"
        ? node.poster
        : (node.poster.large || node.poster.medium || node.poster.small || "");

}

function formatDate(release){

    if(!release) return "";

    const d = new Date(release);

    if(isNaN(d)) return release;

    return d.toLocaleDateString(undefined, {

        year: "numeric",
        month: "long",
        day: "numeric"

    });

}

let openNode = null;

function renderExtras(node){

    if(node.trailerUrl){

        trailerEl.href = node.trailerUrl;
        trailerEl.style.display = "inline-flex";

    } else {

        trailerEl.removeAttribute("href");
        trailerEl.style.display = "none";

    }

    if(node.cast && node.cast.length){

        castEl.innerHTML =
            `<div id="movie-details-cast-label">Cast</div>` +
            `<div id="movie-details-cast-list">` +
            node.cast.map(member => {

                const initials = member.name
                    .split(" ")
                    .map(w => w[0])
                    .join("")
                    .slice(0,2)
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

    } else {

        castEl.innerHTML = "";

    }

}

export async function showMovieDetails(node){

    openNode = node;

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

    if(node.release) metaParts.push(formatDate(node.release));

    if(node.phase !== undefined && node.phase !== null && node.phase >= 1){

        metaParts.push("Phase " + node.phase);

    }

    if(typeof node.rating === "number" && node.rating > 0){

        metaParts.push("★ " + node.rating.toFixed(1));

    }

    metaEl.textContent = metaParts.join("  ·  ");

    overviewEl.textContent = node.overview ||
        "No synopsis available yet for this entry.";

    if(node.characters && node.characters.length){

        charactersEl.innerHTML =
            `<div id="movie-details-characters-label">Featuring</div>` +
            node.characters
                .map(c => `<span class="character-chip">${c}</span>`)
                .join("");

    } else {

        charactersEl.innerHTML = "";

    }

    // Cast is preloaded during poster loading. Wait for that shared
    // promise before revealing the card so the user never sees a
    // blank/loading cast section appear after the modal opens.
    trailerEl.style.display = "none";

    try{

        await fetchDetails(node);

    } catch(err){

        console.warn("Movie details lookup failed for", node.title, err);

    }

    if(openNode !== node) return;

    renderExtras(node);
    overlay.classList.add("open");

}
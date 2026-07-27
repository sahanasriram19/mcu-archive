//==================================================
// TMDB POSTER LOADER
//
// Marvel's own developer API only covers comics, not
// films or shows, so there's no poster art in it. TMDB
// (themoviedb.org) is the standard free source for
// this — real posters for every MCU movie and series,
// keyed by title.
//
// This fetches one poster per node and writes the
// image URL straight onto node.poster. nodes.js
// already re-checks node.poster every frame and starts
// loading it the moment it's set, so nodes just quietly
// swap from a plain star to their poster as each
// request comes back — no extra wiring needed.
//==================================================

import {
    TMDB_API_KEY,
    TMDB_BASE,
    TMDB_IMAGE_BASES
} from "./tmdbConfig.js";

//--------------------------------------------------
// TMDB's title search is a fuzzy match, and a suffix
// like "(Season 2)" or "(one-shot)" throws it off badly
// enough that it can return a completely unrelated
// show. Strip anything in parentheses before searching
// — node.title itself (used for display) is untouched.
//--------------------------------------------------

function searchTitle(title){

    return title.replace(/\s*\([^)]*\)\s*/g, "").trim();

}

//--------------------------------------------------
// Runs one TMDB search and returns the best-matching
// result, or null.
//
// Two bugs used to live here that this replaces:
//
// 1. `type:"special"` (the Marvel One-Shots — Item 47,
//    The Consultant, Team Thor, etc., plus a couple of
//    Disney+ specials) was always searched as a TV show.
//    Most of these are actually catalogued as movies on
//    TMDB, so the search came back empty every time.
//    Now "special" tries the movie endpoint first and
//    falls back to tv.
//
// 2. The year was sent as a hard server-side filter
//    (`&year=` / `&first_air_date_year=`). TMDB drops
//    any result that doesn't match that year exactly —
//    so a one-shot short whose home-video release date
//    differs from our dataset by even a year came back
//    with zero results, every time. Now the year is only
//    used client-side to rank results, with the top
//    (most relevant) result kept as a fallback if nothing
//    matches exactly.
//--------------------------------------------------

async function searchEndpoint(endpoint, title, year){

    const url =
        `${TMDB_BASE}/search/${endpoint}` +
        `?api_key=${TMDB_API_KEY}` +
        `&query=${encodeURIComponent(title)}`;

    const res = await fetch(url);

    if(!res.ok) return null;

    const data = await res.json();

    const results = (data.results || []).filter(r => r.poster_path);

    if(!results.length) return null;

    if(year){

        const dateField = endpoint === "tv" ? "first_air_date" : "release_date";

        const exact = results.find(r => (r[dateField]||"").slice(0,4) === year);

        if(exact) return exact;

    }

    return results[0];

}

async function fetchCast(endpoint, id){

    const url =
        `${TMDB_BASE}/${endpoint}/${id}/credits` +
        `?api_key=${TMDB_API_KEY}`;

    try{

        const res = await fetch(url);

        if(!res.ok) return [];

        const data = await res.json();

        return (data.cast || [])

            .slice(0, 8)

            .map(c => ({

                name: c.name,
                character: c.character || "",
                photo: c.profile_path
                    ? TMDB_IMAGE_BASES.small + c.profile_path
                    : null

            }));

    } catch(err){

        console.warn("Cast lookup failed for id", id, err);

        return [];

    }

}

async function fetchPoster(node){

    const title = searchTitle(node.title);
    const year = node.release ? node.release.slice(0,4) : "";

    // Primary endpoint per type, with a fallback endpoint
    // for "special" since that type covers both one-shot
    // short films and TV-style specials.
    const endpoints =
        node.type === "show" ? ["tv"] :
        node.type === "special" ? ["movie","tv"] :
        ["movie"];

    try{

        let match = null;
        let matchedEndpoint = null;

        for(const endpoint of endpoints){

            match = await searchEndpoint(endpoint, title, year);

            if(match){

                matchedEndpoint = endpoint;
                break;

            }

        }

        if(match && match.poster_path){

           node.poster = {

            small: TMDB_IMAGE_BASES.small + match.poster_path,

            medium: TMDB_IMAGE_BASES.medium + match.poster_path,

            large: TMDB_IMAGE_BASES.large + match.poster_path

        }; 

        }

        // Feeds the click-to-view details card (see
        // movieDetails.js) — harmless to set even if
        // poster_path was missing above.
        if(match){

            if(match.overview) node.overview = match.overview;

            if(typeof match.vote_average === "number"){

                node.rating = match.vote_average;

            }

            node.cast = await fetchCast(matchedEndpoint, match.id);

        }

    } catch(err){

        // A single missed poster shouldn't break the rest —
        // that node just keeps its placeholder card.
        console.warn("Poster lookup failed for", node.title, err);

    }

}

//==================================================
// Fetches every node's poster in small staggered
// batches rather than all ~70 at once. Firing them
// all simultaneously meant ~70 poster images started
// downloading and decoding in the same instant right
// as the "fly out from the hub" reveal animation
// began — competing for the main thread and reading
// as lag/stutter on the very first Enter. Spreading
// the requests out over a couple of seconds fixes
// that without changing anything visible about how
// posters pop in.
//==================================================

const BATCH_SIZE = 6;

const BATCH_DELAY_MS = 220;

export function loadPosters(graph){

    if(TMDB_API_KEY === "YOUR_TMDB_API_KEY_HERE"){

        console.warn(

            "TMDB API key not set — add yours in js/tmdbConfig.js to load real posters. " +
            "Nodes will keep showing as plain stars until then."

        );

        return;

    }

    const nodes = graph.nodes;

    let i = 0;

    function nextBatch(){

        const batch = nodes.slice(i, i+BATCH_SIZE);

        batch.forEach(node => fetchPoster(node));

        i += BATCH_SIZE;

        if(i < nodes.length){

            setTimeout(nextBatch, BATCH_DELAY_MS);

        }

    }

    nextBatch();

}
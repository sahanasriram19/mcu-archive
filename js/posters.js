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
// image URL straight onto node.poster.
//==================================================

import {
    TMDB_API_KEY,
    TMDB_BASE,
    TMDB_IMAGE_BASES
} from "./tmdbConfig.js";


//--------------------------------------------------
// Remove parenthesised text from titles before searching
//--------------------------------------------------

function searchTitle(title) {

    return title.replace(/\s*\([^)]*\)\s*/g, "").trim();

}


//--------------------------------------------------
// Run one TMDB search and return the best match
//--------------------------------------------------

async function searchEndpoint(endpoint, title, year) {

    const url =
        `${TMDB_BASE}/search/${endpoint}` +
        `?api_key=${TMDB_API_KEY}` +
        `&query=${encodeURIComponent(title)}`;

    const res = await fetch(url);

    if (!res.ok) return null;

    const data = await res.json();

    const results = (data.results || [])
        .filter(r => r.poster_path);

    if (!results.length) return null;

    const titleField =
        endpoint === "tv"
            ? "name"
            : "title";

    const normalise = value =>
        String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();

    const requestedTitle = normalise(title);

    // IMPORTANT:
    // Never accept an unrelated title just because it
    // happened to be the first TMDB search result.
    //
    // For example, searching "Blade" can return
    // "Blade Runner" near the top of the results.
    // We only accept an exact title match.
    const exactTitle = results.filter(
        r => normalise(r[titleField]) === requestedTitle
    );

    if (!exactTitle.length) return null;

    if (year) {

        const dateField =
            endpoint === "tv"
                ? "first_air_date"
                : "release_date";

        const exactYear = exactTitle.find(
            r => (r[dateField] || "").slice(0, 4) === year
        );

        if (exactYear) return exactYear;

    }

    // If TMDB has the exact title but its currently listed
    // release year differs, use the exact-title result.
    //
    // This is important for unreleased/upcoming Marvel
    // projects such as Blade.
    return exactTitle[0];

}


//--------------------------------------------------
// Preload an image
//--------------------------------------------------

async function preloadImage(src) {

    if (!src) return;

    await new Promise(resolve => {

        const img = new Image();

        img.onload = async () => {

            try {

                if (img.decode) {
                    await img.decode();
                }

            } catch (err) {

                // Image loaded successfully even if decode fails.

            }

            resolve();

        };

        img.onerror = () => resolve();

        img.src = src;

    });

}


//--------------------------------------------------
// Fetch cast
//--------------------------------------------------

async function fetchCast(endpoint, id) {

    const url =
        `${TMDB_BASE}/${endpoint}/${id}/credits` +
        `?api_key=${TMDB_API_KEY}`;

    try {

        const res = await fetch(url);

        if (!res.ok) {

            console.warn(
                "Cast request failed:",
                res.status,
                res.statusText
            );

            return [];

        }

        const data = await res.json();

        const cast = (data.cast || [])
            .slice(0, 8)
            .map(c => ({

                name: c.name,

                character: c.character || "",

                photo: c.profile_path
                    ? TMDB_IMAGE_BASES.small + c.profile_path
                    : null

            }));

        return cast;

    } catch (err) {

        console.warn(
            "Cast lookup failed for id",
            id,
            err
        );

        return [];

    }

}


//--------------------------------------------------
// Fetch trailer
//--------------------------------------------------

async function fetchTrailer(endpoint, id) {

    const url =
        `${TMDB_BASE}/${endpoint}/${id}/videos` +
        `?api_key=${TMDB_API_KEY}`;

    try {

        const res = await fetch(url);

        if (!res.ok) {

            console.warn(
                "Trailer request failed:",
                res.status,
                res.statusText
            );

            return null;

        }

        const data = await res.json();

        const videos = (data.results || [])
            .filter(v => v.site === "YouTube");

        if (!videos.length) return null;

        // Prefer official trailer, then any trailer,
        // then teaser, then any YouTube video.

        const pick =
            videos.find(
                v => v.type === "Trailer" && v.official
            ) ||

            videos.find(
                v => v.type === "Trailer"
            ) ||

            videos.find(
                v => v.type === "Teaser"
            ) ||

            videos[0];

        return `https://www.youtube.com/watch?v=${pick.key}`;

    } catch (err) {

        console.warn(
            "Trailer lookup failed for id",
            id,
            err
        );

        return null;

    }

}


//--------------------------------------------------
// Fetch poster / TMDB information
//--------------------------------------------------

async function fetchPoster(node) {

    const title = searchTitle(node.title);

    const year = node.release
        ? node.release.slice(0, 4)
        : "";


    // Primary endpoint based on node type.
    //
    // Special can be either a movie or TV entry,
    // so try movie first and then TV.

    const endpoints =
        node.type === "show"
            ? ["tv"]

            : node.type === "special"
                ? ["movie", "tv"]

                : ["movie"];


    try {

        let match = null;

        let matchedEndpoint = null;


        for (const endpoint of endpoints) {

            match = await searchEndpoint(
                endpoint,
                title,
                year
            );

            if (match) {

                matchedEndpoint = endpoint;

                break;

            }

        }


        //--------------------------------------------------
        // Set poster
        //--------------------------------------------------

        if (match && match.poster_path) {

            node.poster = {

                small:
                    TMDB_IMAGE_BASES.small +
                    match.poster_path,

                medium:
                    TMDB_IMAGE_BASES.medium +
                    match.poster_path,

                large:
                    TMDB_IMAGE_BASES.large +
                    match.poster_path

            };

        }


        //--------------------------------------------------
        // Save TMDB information for later cast/trailer
        // requests.
        //--------------------------------------------------

        if (match) {

            if (match.overview) {

                node.overview = match.overview;

            }


            if (
                typeof match.vote_average === "number"
            ) {

                node.rating = match.vote_average;

            }


            node.tmdbId = match.id;

            node.tmdbEndpoint = matchedEndpoint;

        }

    } catch (err) {

        console.warn(
            "Poster lookup failed for",
            node.title,
            err
        );

    }

}


//--------------------------------------------------
// Cast + trailer
//
// These are fetched when the movie details card is
// opened instead of upfront for every project.
//
// If the poster/TMDB search is already running,
// fetchDetails() reuses that existing promise.
//--------------------------------------------------

export async function fetchDetails(node) {

    //--------------------------------------------------
    // Prevent duplicate details requests.
    //--------------------------------------------------

    if (node.detailsPromise) {

        return node.detailsPromise;

    }


    node.detailsPromise = (async () => {


        //--------------------------------------------------
        // If the TMDB search has already been started by
        // loadPosters(), wait for THAT request.
        //
        // This prevents fetchDetails() from starting
        // another search for the same movie.
        //--------------------------------------------------

        if (!node.tmdbId || !node.tmdbEndpoint) {

            if (node.tmdbReady) {

                await node.tmdbReady;

            } else {

                node.tmdbReady = fetchPoster(node);

                await node.tmdbReady;

            }

        }


        //--------------------------------------------------
        // No TMDB match.
        //--------------------------------------------------

        if (!node.tmdbId || !node.tmdbEndpoint) {

            console.warn(
                "No TMDB match for:",
                node.title
            );

            return;

        }


        //--------------------------------------------------
        // Fetch cast + trailer simultaneously.
        //--------------------------------------------------

        const [cast, trailer] = await Promise.all([

            fetchCast(
                node.tmdbEndpoint,
                node.tmdbId
            ),

            fetchTrailer(
                node.tmdbEndpoint,
                node.tmdbId
            )

        ]);


        //--------------------------------------------------
        // Store results on the node.
        //--------------------------------------------------

        node.cast = cast;

        node.trailerUrl = trailer;

        node.detailsLoaded = true;


    })().catch(err => {

        console.error(
            "Details lookup failed:",
            node.title,
            err
        );


        // Allow a future click to retry.

        node.detailsPromise = null;

    });


    return node.detailsPromise;

}


//==================================================
// LOAD POSTERS
//
// A small concurrency pool is used instead of launching
// large batches with timed delays.
//
// This keeps the browser responsive and avoids flooding
// TMDB with too many requests at once.
//
// The tmdbReady promise is stored on each node so
// fetchDetails() can reuse an existing poster/TMDB search.
//==================================================

const MAX_CONCURRENT = 4;


export function loadPosters(graph) {

    if (
        TMDB_API_KEY ===
        "YOUR_TMDB_API_KEY_HERE"
    ) {

        console.warn(
            "TMDB API key not set — add yours in js/tmdbConfig.js to load real posters. " +
            "Nodes will keep showing as plain stars until then."
        );

        return;

    }


    const nodes = graph.nodes;

    let nextIndex = 0;


    //--------------------------------------------------
    // Worker
    //
    // Each worker handles one TMDB search at a time.
    // When it finishes, it takes the next available node.
    //--------------------------------------------------

    async function worker() {

        while (true) {

            const index = nextIndex++;

            if (index >= nodes.length) {

                return;

            }


            const node = nodes[index];


            try {

                //--------------------------------------------------
                // Store the promise on the node.
                //
                // If the user opens this card while its poster
                // is still loading, fetchDetails() can reuse
                // this exact request.
                //--------------------------------------------------

                node.tmdbReady = fetchPoster(node);

                await node.tmdbReady;

            } catch (err) {

                console.warn(
                    "Poster loading failed for:",
                    node.title,
                    err
                );

            }

        }

    }


    //--------------------------------------------------
    // Start a small number of workers.
    //--------------------------------------------------

    const workerCount = Math.min(
        MAX_CONCURRENT,
        nodes.length
    );


    for (let i = 0; i < workerCount; i++) {

        worker();

    }

}
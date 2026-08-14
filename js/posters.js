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

    if (year) {

        const dateField =
            endpoint === "tv"
                ? "first_air_date"
                : "release_date";

        const exact = results.find(
            r => (r[dateField] || "").slice(0, 4) === year
        );

        if (exact) return exact;

    }

    return results[0];

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
//--------------------------------------------------
export async function fetchDetails(node) {

    // Don't create duplicate requests if the details
    // request is already running.
    if (node.detailsPromise) {

        return node.detailsPromise;

    }


    node.detailsPromise = (async () => {


        //--------------------------------------------------
        // Make sure this node has been searched on TMDB.
        //
        // If poster loading hasn't reached this node yet,
        // search for it NOW instead of waiting for the
        // poster batch.
        //--------------------------------------------------

        if (!node.tmdbId || !node.tmdbEndpoint) {

            await fetchPoster(node);

        }


        //--------------------------------------------------
        // If TMDB still couldn't find the title, stop.
        //--------------------------------------------------

        if (!node.tmdbId || !node.tmdbEndpoint) {

            console.warn(
                "No TMDB match found for:",
                node.title
            );

            return;

        }


        //--------------------------------------------------
        // Fetch cast and trailer simultaneously.
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
        // Save the results.
        //--------------------------------------------------

        node.cast = cast;

        node.trailerUrl = trailer;


        //--------------------------------------------------
        // Details successfully loaded.
        //--------------------------------------------------

        node.detailsLoaded = true;

    })().catch(err => {

        console.warn(
            "Details lookup failed for",
            node.title,
            err
        );

        // Allow the next attempt to retry.
        node.detailsPromise = null;

    });


}

//==================================================
// Fetch every node's poster in small staggered
// batches.
//
// The tmdbReady promise is stored on each node so
// fetchDetails() can wait for the poster/TMDB search
// to finish before requesting cast.
//==================================================

const BATCH_SIZE = 12;
const BATCH_DELAY_MS = 40;


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

    let i = 0;


    //--------------------------------------------------
    // Process one batch
    //--------------------------------------------------

    function nextBatch() {

        const batch = nodes.slice(
            i,
            i + BATCH_SIZE
        );


        //--------------------------------------------------
        // IMPORTANT:
        //
        // Store the promise so fetchDetails() can wait
        // until the TMDB search for this node is finished.
        //--------------------------------------------------

        batch.forEach(node => {

            node.tmdbReady = fetchPoster(node);

        });


        i += BATCH_SIZE;


        //--------------------------------------------------
        // Schedule the next batch
        //--------------------------------------------------

        if (i < nodes.length) {

            setTimeout(
                nextBatch,
                BATCH_DELAY_MS
            );

        }

    }


    nextBatch();

}
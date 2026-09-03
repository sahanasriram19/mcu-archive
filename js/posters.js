//--------------------------------------------------
// Fetch poster / TMDB information
//--------------------------------------------------

async function fetchPoster(node) {

    //--------------------------------------------------
    // BLADE-ONLY FIX
    //
    // Do not change the normal TMDB search behavior for
    // any other movie/show.
    //
    // TMDB's search for "Blade" can return Blade Runner
    // first, so Blade uses its known TMDB movie ID directly.
    //--------------------------------------------------

    if (node.id === "blade") {

        const endpoint = "movie";
        const id = 617127;

        try {

            const url =
                `${TMDB_BASE}/${endpoint}/${id}` +
                `?api_key=${TMDB_API_KEY}`;

            const res = await fetch(url);

            if (!res.ok) return;

            const match = await res.json();


            //--------------------------------------------------
            // Set Blade poster
            //--------------------------------------------------

            if (match.poster_path) {

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
            // Save Blade's TMDB information
            //--------------------------------------------------

            if (match.overview) {

                node.overview = match.overview;

            }


            if (
                typeof match.vote_average === "number"
            ) {

                node.rating = match.vote_average;

            }


            node.tmdbId = id;

            node.tmdbEndpoint = endpoint;


        } catch (err) {

            console.warn(
                "Blade TMDB lookup failed:",
                err
            );

        }

        return;

    }


    //--------------------------------------------------
    // NORMAL POSTER LOOKUP
    //
    // Everything below this point is the original
    // behavior, unchanged.
    //--------------------------------------------------

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
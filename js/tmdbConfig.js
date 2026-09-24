//==================================================
// TMDB CONFIG
//
// Your API key does NOT go in this file any more — it
// lives in js/tmdbKey.js, which .gitignore keeps out of
// git so the key never ends up on GitHub.
//
// First-time setup (or on a fresh clone):
// 1. Get a free API key at
//    https://www.themoviedb.org/settings/api
//    (approved instantly for personal/non-commercial use).
// 2. Copy js/tmdbKey.example.js to js/tmdbKey.js.
// 3. Paste your key into js/tmdbKey.js.
//
// If tmdbKey.js is missing, the app still runs — titles
// just show as placeholder cards instead of posters.
//==================================================

const PLACEHOLDER_KEY = "YOUR_TMDB_API_KEY_HERE";

// Loaded dynamically (not a normal import) so a missing
// tmdbKey.js means "no posters" rather than the whole app
// failing to start. Top-level await is supported by every
// current browser.
export const TMDB_API_KEY = await import("./tmdbKey.js")
    .then(m => m.TMDB_API_KEY || PLACEHOLDER_KEY)
    .catch(() => PLACEHOLDER_KEY);

export const TMDB_BASE = "https://api.themoviedb.org/3";

export const TMDB_IMAGE_BASES = {

    small:  "https://image.tmdb.org/t/p/w185",
    medium: "https://image.tmdb.org/t/p/w500",
    large:  "https://image.tmdb.org/t/p/original"

};
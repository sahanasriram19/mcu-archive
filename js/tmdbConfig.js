//==================================================
// TMDB CONFIG
//
// 1. Go to https://www.themoviedb.org/settings/api
//    and request a free API key (approved instantly
//    for personal/non-commercial use).
// 2. Paste it below.
// 3. If you push this repo to a public GitHub, add
//    this file to .gitignore so the key isn't public
//    (TMDB keys aren't secret/dangerous, but it's
//    good practice — someone else could otherwise
//    use up your request quota).
//==================================================

export const TMDB_API_KEY = "8be14d404d22f2dec6bc58c0cd19e49a";

export const TMDB_BASE = "https://api.themoviedb.org/3";

export const TMDB_IMAGE_BASES = {

    small:  "https://image.tmdb.org/t/p/w185",
    medium: "https://image.tmdb.org/t/p/w500",
    large:  "https://image.tmdb.org/t/p/original"

};
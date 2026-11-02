//==================================================
// ESCAPING
//
// Anything that isn't our own fixed markup — titles, cast
// and character names, image links from TMDB, colours from
// the data files — goes through one of these before it's put
// into HTML. Otherwise a name with a "<" or "&" in it would
// break the layout, and a deliberately crafted one (TMDB is
// edited by the public) could run its own script on the page.
//==================================================

const ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

// Text between tags, or inside a quoted attribute.
export function escapeHtml(value){

    return String(value ?? "").replace(/[&<>"']/g, c => ENTITIES[c]);

}

// A link for src / href: only web links (and links on this
// site), never "javascript:" and the like. Returns "" for
// anything else.
export function safeUrl(value){

    const url = String(value ?? "").trim();

    if(!url) return "";

    try {

        const u = new URL(url, location.href);

        if(u.protocol !== "https:" && u.protocol !== "http:") return "";

        return escapeHtml(u.href);

    } catch(err){

        return "";

    }

}

// A value going into an inline style (e.g. --c:${colour}):
// only the characters a colour needs ("255,120,40",
// "#e62429", "rgb(…)"), so it can't close the style or the
// attribute.
export function safeCss(value){

    return String(value ?? "").replace(/[^a-zA-Z0-9#.,%() -]/g, "");

}
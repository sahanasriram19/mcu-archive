//==================================================
// SHAREABLE LINKS
//
// The address bar follows where you are in the archive,
// so a link can be sent to someone and opens in the same
// place:
//
//   #/all/complete                 the combined map
//   #/xmen/release                 a world's view
//   #/mcu/characters/Tony%20Stark  a character journey
//   #/spider/phases?title=nwh      ...with a title's card open
//
// The address is replaced rather than added to history, so
// the back button still leaves the site as before. app.js
// reads a link when the page opens (readLink) and when the
// address is edited by hand (onLinkChange).
//==================================================

import { getWorld, getCurrentView } from "./viewManager.js";
import { getSelectedCharacter } from "./characters/characterJourney.js";
import { VIEWS } from "./views.js";
import { WORLDS, ALL_WORLDS } from "./worlds.js";

let active = false;       // only once you're inside the archive
let titleId = null;       // the open details card, if any

function build(){

    const world = getWorld();
    const view = getCurrentView();

    if(!world || !view) return "";

    let hash = `#/${world}/${view}`;

    const character = view === "characters" ? getSelectedCharacter() : null;

    if(character) hash += "/" + encodeURIComponent(character);

    if(titleId) hash += "?title=" + encodeURIComponent(titleId);

    return hash;

}

function write(){

    if(!active) return;

    const hash = build();

    if(hash && hash !== location.hash) history.replaceState(null, "", hash);

}

function clear(){

    if(location.hash) history.replaceState(null, "", location.pathname + location.search);

}

// The view changed (setView in viewManager.js).
window.addEventListener("mcu:view-changed", () => {

    active = true;

    write();

});

// Back to the landing page: no link there.
window.addEventListener("mcu:go-to-landing", () => {

    active = false;
    titleId = null;

    clear();

});

// A details card opened (id) or closed (null).
export function setLinkTitle(id){

    titleId = id;

    write();

}

// The link in the address bar right now, checked against
// the real worlds and views, or null.
export function readLink(){

    const m = location.hash.match(/^#\/([^/?]+)\/([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/);

    if(!m) return null;

    const world = decodeURIComponent(m[1]);
    const view = decodeURIComponent(m[2]);

    const viewDef = VIEWS.find(v => v.key === view);

    if(!viewDef) return null;

    if(world === ALL_WORLDS){

        if(view !== "complete" && view !== "scatter") return null;

    } else if(!WORLDS[world] || viewDef.allOnly){

        return null;

    }

    const params = new URLSearchParams(m[4] || "");

    let character = null;

    try {

        character = m[3] ? decodeURIComponent(m[3]) : null;

    } catch {

        character = null;

    }

    return {
        world,
        view,
        character: view === "characters" ? character : null,
        title: params.get("title")
    };

}

// The address was changed by hand (or a link pasted into
// the same tab): `callback(link)` with the new link.
export function onLinkChange(callback){

    window.addEventListener("hashchange", () => {

        const link = readLink();

        if(link) callback(link);

    });

}

// Copies the current address. True if it worked.
export async function copyLink(){

    const url = location.href;

    try {

        await navigator.clipboard.writeText(url);

        return true;

    } catch {

        // Older browsers / no clipboard permission.
        try {

            const box = document.createElement("textarea");

            box.value = url;
            box.style.position = "fixed";
            box.style.opacity = "0";

            document.body.appendChild(box);

            box.select();

            const ok = document.execCommand("copy");

            box.remove();

            return ok;

        } catch {

            return false;

        }

    }

}
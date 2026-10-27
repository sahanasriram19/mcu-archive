//==================================================
// SHAREABLE LINKS + TAB HISTORY
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
// Each new view, and each details card you open, is its own
// entry in the tab's history, so the browser's Back and
// Forward buttons step through them:
//
//   landing page → Complete MCU → Phases → (Iron Man's card)
//
// Back from a card closes it; Back from the first view goes
// to the landing page. Closing a card with its × (or Esc)
// steps back over its entry, so Back afterwards doesn't
// open it again. A card opened from inside another card
// (the "Watch before this" row) replaces the first one's
// entry rather than piling up.
//
// app.js reads a link when the page opens (readLink) and
// follows Back / Forward / an edited address (onLinkChange).
//==================================================

import { getWorld, getCurrentView } from "./viewManager.js";
import { getSelectedCharacter } from "./characters/characterJourney.js";
import { VIEWS } from "./views.js";
import { WORLDS, ALL_WORLDS } from "./worlds.js";

let active = false;       // only once you're inside the archive
let titleId = null;       // the open details card, if any
let applying = false;     // following Back/Forward: don't add entries
let everActive = false;   // been inside the archive yet this visit

// The link for a world + view (+ character, + open card).
function hashFor(world, view, character, title){

    let hash = `#/${world}/${view}`;

    if(view === "characters" && character) hash += "/" + encodeURIComponent(character);

    if(title) hash += "?title=" + encodeURIComponent(title);

    return hash;

}

function build(){

    const world = getWorld();
    const view = getCurrentView();

    if(!world || !view) return "";

    return hashFor(world, view, view === "characters" ? getSelectedCharacter() : null, titleId);

}

function baseUrl(){

    return location.origin + location.pathname + location.search;

}

// Puts the current place in the address bar: a new history
// entry (push) or in place of the current one.
function write(push){

    if(!active || applying) return;

    const hash = build();

    if(!hash || hash === location.hash) return;

    const state = { mcu: true, title: titleId };

    if(push) history.pushState(state, "", hash);
    else history.replaceState(state, "", hash);

}

// The view changed (setView in viewManager.js): a new entry,
// unless it's the same place (a resize re-laying it out).
window.addEventListener("mcu:view-changed", () => {

    // Opened from a shared link: tidy that entry up in place
    // rather than adding another on top of it.
    const first = !everActive;

    active = true;
    everActive = true;

    write(!(first && location.hash));

});

// Back to the landing page: no link there. Its own entry,
// so Back returns to the archive.
window.addEventListener("mcu:go-to-landing", () => {

    active = false;
    titleId = null;

    if(applying || !location.hash) return;

    history.pushState(null, "", baseUrl());

});

// A details card opened (id) or closed (null).
export function setLinkTitle(id){

    const wasOpen = titleId;

    titleId = id;

    if(!active || applying) return;

    if(id){

        // Opening a card: its own entry. Swapping to another
        // card from inside one: same entry.
        write(!wasOpen);

        return;

    }

    // Closing a card. If its entry is the one we're on, step
    // back over it (Back then goes to the view before, not
    // into the card again); otherwise just drop the title.
    const state = history.state;

    if(state && state.mcu && state.title === wasOpen && wasOpen){

        history.back();

    } else {

        write(false);

    }

}

// Run `fn` while following Back / Forward (or an edited
// address): whatever it changes doesn't add new entries.
export function applyingLink(fn){

    applying = true;

    try {

        return fn();

    } finally {

        applying = false;

    }

}

// Parses a hash like "#/xmen/release?title=x2", checked
// against the real worlds and views, or null.
function parse(hash){

    const m = hash.match(/^#\/([^/?]+)\/([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/);

    if(!m) return null;

    let world, view;

    try {

        world = decodeURIComponent(m[1]);
        view = decodeURIComponent(m[2]);

    } catch {

        return null;

    }

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

// The link in the address bar right now, or null.
export function readLink(){

    return parse(location.hash);

}

// Back / Forward, or the address edited by hand (or a link
// pasted into the same tab): `callback(link)` with the new
// link, or `callback(null)` for the landing page.
export function onLinkChange(callback){

    window.addEventListener("popstate", () => callback(readLink()));

}

// The link to share for the open card: where you are in the
// archive, with the card. Opened from the landing page's
// fly-through (no view yet), it opens on the combined map.
export function shareUrl(){

    if(active){

        const hash = build();

        if(hash) return baseUrl() + hash;

    }

    return baseUrl() + hashFor(ALL_WORLDS, "complete", null, titleId);

}

// Copies the link for the open card. True if it worked.
export async function copyLink(){

    const url = shareUrl();

    try {

        if(navigator.clipboard && window.isSecureContext){

            await navigator.clipboard.writeText(url);

            return true;

        }

    } catch {

        // Blocked (no permission, page not focused):
        // fall through to the older way below.

    }

    // Older browsers, or a page served over plain http on a
    // network address (no clipboard API there).
    try {

        const box = document.createElement("textarea");

        box.value = url;
        box.setAttribute("readonly", "");
        box.style.position = "fixed";
        box.style.top = "0";
        box.style.left = "0";
        box.style.opacity = "0";

        document.body.appendChild(box);

        box.focus();
        box.select();
        box.setSelectionRange(0, url.length);

        const ok = document.execCommand("copy");

        box.remove();

        return ok;

    } catch {

        return false;

    }

}
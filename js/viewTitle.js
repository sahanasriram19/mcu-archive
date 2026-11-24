//==================================================
// VIEW TITLE CARD
//
// Like a film's title card: each time a view opens, its
// name shows big in the middle of the screen — the world
// it belongs to small above it ("X-MEN WORLD" / "RELEASE
// ORDER") — and then shrinks back and fades into the sky
// as the camera eases out to show the map.
//
//   • entering the archive: every time, timed with the
//     pull-back after the jump (viewManager.js PULLBACK_MS)
//   • switching views or worlds: a little quicker
//   • the same view set up again (resizing the window, the
//     reset button, picking another hero in Character
//     Journeys…) doesn't bring it back
//
// Names come from the panel (ui/panel.js viewNames), so
// they read the same as its buttons. Styled in
// css/viewTitle.css; it never catches a click.
//==================================================

import { getCurrentView, getWorld, PULLBACK_MS } from "./viewManager.js";
import { ALL_WORLDS } from "./worlds.js";
import { viewNames } from "../ui/panel.js";

// How long the whole card lasts, from appearing to gone.
const ENTER_MS = PULLBACK_MS;   // entering the archive
const SWITCH_MS = 2400;         // switching view or world

const card = document.createElement("div");

card.id = "view-title";
card.setAttribute("aria-hidden", "true");

card.innerHTML = `
    <div class="view-title-kicker"></div>
    <div class="view-title-name"></div>
`;

document.getElementById("viewport").appendChild(card);

const kickerEl = card.querySelector(".view-title-kicker");
const nameEl = card.querySelector(".view-title-name");

let lastShown = null;

// Still on the landing page (or the page has only just
// loaded behind it)? Then there's no map to introduce yet.
function onLanding(){

    const landing = document.getElementById("landing");

    return !!landing &&
        landing.style.display !== "none" &&
        !landing.classList.contains("leaving");

}

function show(duration){

    const world = getWorld();
    const view = getCurrentView();

    const names = viewNames(world, view);

    if(!names.view) return;

    lastShown = world + "/" + view;

    // Every world on one map: the archive's own name above.
    kickerEl.textContent = world === ALL_WORLDS ? "MCU Archive" : names.world;
    nameEl.textContent = names.view;

    // Restart the animation from the top, even mid-way
    // through the last one.
    card.classList.remove("play");

    void card.offsetWidth;

    card.style.setProperty("--view-title-ms", duration + "ms");

    card.classList.add("play");

}

card.addEventListener("animationend", () => card.classList.remove("play"));

// A view (or world) opened.
window.addEventListener("mcu:view-changed", () => {

    if(onLanding()) return;

    const key = getWorld() + "/" + getCurrentView();

    if(key === lastShown) return;

    show(SWITCH_MS);

});

// Entering the archive (js/app.js fires this straight after
// the view opens, so it takes over from the one above):
// always, at the pace of the pull-back — even back into the
// same view as last time.
window.addEventListener("mcu:archive-entered", () => {

    show(ENTER_MS);

});
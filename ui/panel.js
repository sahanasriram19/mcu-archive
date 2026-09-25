import { VIEWS } from "../js/views.js";
import { setWorldView, getCurrentView, getWorld } from "../js/viewManager.js";

import {

    setSelectedCharacter

} from "../js/characters/characterJourney.js";

import { initMovieSearch } from "./search.js";
import { isCompact } from "../js/responsive.js";

const viewport = document.getElementById("viewport");

const panel = document.createElement("div");
panel.id = "view-panel";

// Header: the title (click to go back to the landing page)
// and, on phones only, a toggle showing the current view
// that opens/closes the rest of the panel.
panel.innerHTML = `
    <div class="view-panel-header">

        <button class="view-panel-title" type="button" title="Back to the start page">MCU Archive</button>

        <button class="view-panel-toggle" type="button" aria-expanded="false" aria-controls="view-panel-content">
            <span class="view-panel-current"></span>
            <span class="view-panel-chevron" aria-hidden="true">&#9662;</span>
        </button>

    </div>

    <div class="view-panel-subtitle">Choose a view and zoom</div>

    <div class="view-panel-content" id="view-panel-content">

      <div class="view-panel-content-inner">

        <div class="search-container">

            <input
                id="movie-search"
                type="text"
                placeholder="Search movies or characters...">

            <div id="movie-search-results"></div>

        </div>

        <div class="view-panel-list"></div>

      </div>

    </div>
`;

viewport.appendChild(panel);

const list = panel.querySelector(".view-panel-list");

//--------------------------------------------------
// PHONE: COLLAPSIBLE PANEL
//
// On phone-sized screens (see js/responsive.js) the panel
// sits along the bottom as a slim bar: the title plus a
// button showing the current view. Tapping that button
// opens the full panel (search + views); picking a view,
// tapping the map, or pressing Esc closes it again. The
// full panel used to stay open all the time, covering a
// third of a portrait screen and most of a landscape one.
// On desktop none of this applies — the toggle is hidden
// and the panel is always open.
//--------------------------------------------------

const toggle = panel.querySelector(".view-panel-toggle");
const currentLabel = panel.querySelector(".view-panel-current");
const titleBtn = panel.querySelector(".view-panel-title");

function setExpanded(open){

    panel.classList.toggle("expanded", open);

    toggle.setAttribute("aria-expanded", open ? "true" : "false");

}

function collapseIfCompact(){

    if(isCompact()) setExpanded(false);

}

toggle.addEventListener("click", () => {

    setExpanded(!panel.classList.contains("expanded"));

});

// Tapping anywhere outside the panel closes it.
document.addEventListener("pointerdown", e => {

    if(!panel.classList.contains("expanded")) return;

    if(panel.contains(e.target)) return;

    setExpanded(false);

});

document.addEventListener("keydown", e => {

    if(e.key === "Escape" && panel.classList.contains("expanded")) setExpanded(false);

});

// Back to the landing page (app.js listens for this).
titleBtn.addEventListener("click", () => {

    setExpanded(false);

    window.dispatchEvent(new Event("mcu:go-to-landing"));

});

//--------------------------------------------------
// PHONE: KEEP THE PANEL ABOVE THE KEYBOARD
//
// The panel sits at the bottom of the screen, which is
// exactly where a phone's on-screen keyboard appears —
// typing in the search box could hide both the box and
// its results. visualViewport reports the part of the
// page the keyboard leaves visible; the panel is lifted
// by however much the keyboard covers.
//--------------------------------------------------

function liftAboveKeyboard(){

    const vv = window.visualViewport;

    if(!vv || !isCompact()){

        panel.style.removeProperty("--keyboard-offset");

        return;

    }

    const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);

    panel.style.setProperty("--keyboard-offset", covered + "px");

}

if(window.visualViewport){

    window.visualViewport.addEventListener("resize", liftAboveKeyboard);
    window.visualViewport.addEventListener("scroll", liftAboveKeyboard);

}
//--------------------------------------------------
// VIEW SECTIONS — one per world (js/worlds.js)
//
// Each world gets its own section: a heading and that
// world's views. They work as an accordion — one open at
// a time — so the panel stays as short as before and
// doesn't cover more of the map. Picking a view in the
// other world's section switches worlds on the same page.
//--------------------------------------------------

const SECTIONS = [

    {
        world: "mcu",
        title: "MCU",
        labels: {
            complete: "Complete MCU",
            phases: "Phases",
            release: "Release Order",
            chronology: "Chronological Order",
            characters: "Character Journeys"
        },
        heroes: [
            { label: "Iron Man", character: "Tony Stark" },
            { label: "Captain America", character: "Steve Rogers" },
            { label: "Thor", character: "Thor" },
            { label: "Hulk", character: "Bruce Banner" },
            { label: "Black Widow", character: "Natasha Romanoff" },
            { label: "Hawkeye", character: "Clint Barton" },
            { label: "Spider-Man", character: "Peter Parker" },
            { label: "Doctor Strange", character: "Stephen Strange" },
            { label: "Scarlet Witch", character: "Wanda Maximoff" },
            { label: "Loki", character: "Loki" },
            { label: "Black Panther", character: "T'Challa" },
            { label: "Captain Marvel", character: "Carol Danvers" },
            { label: "Vision", character: "Vision" },
            { label: "Ant-Man", character: "Scott Lang" }
        ]
    },

    {
        world: "xmen",
        title: "X-Men World",
        labels: {
            complete: "Complete X-Men",
            phases: "Eras",
            release: "Release Order",
            chronology: "Chronological Order",
            characters: "Character Journeys"
        },
        heroes: [
            { label: "Wolverine", character: "Wolverine" },
            { label: "Professor X", character: "Charles Xavier" },
            { label: "Magneto", character: "Magneto" },
            { label: "Jean Grey", character: "Jean Grey" },
            { label: "Mystique", character: "Mystique" },
            { label: "Cyclops", character: "Cyclops" },
            { label: "Storm", character: "Storm" },
            { label: "Beast", character: "Beast" },
            { label: "Deadpool", character: "Deadpool" }
        ]
    },

    {
        world: "spider",
        title: "Spider-Man World",
        labels: {
            complete: "Complete Spider-Man",
            phases: "Eras",
            release: "Release Order",
            chronology: "Chronological Order",
            characters: "Character Journeys"
        },
        heroes: [
            // `journey` overrides the "<label>'s Journey" wording
            // in the phone bar when that would read awkwardly.
            { label: "Tobey Maguire's Spider-Man", character: "Peter Parker (Tobey Maguire)", journey: "Tobey Maguire's Journey" },
            { label: "Andrew Garfield's Spider-Man", character: "Peter Parker (Andrew Garfield)", journey: "Andrew Garfield's Journey" },
            { label: "Tom Holland's Spider-Man", character: "Peter Parker (Tom Holland)", journey: "Tom Holland's Journey" },
            { label: "Miles Morales", character: "Miles Morales" },
            { label: "Spider-Gwen", character: "Gwen Stacy (Spider-Gwen)" },
            { label: "Green Goblin", character: "Norman Osborn" },
            { label: "Doctor Octopus", character: "Otto Octavius" },
            { label: "Harry Osborn", character: "Harry Osborn" }
        ]
    }

];

let selectedHeroLabel = "";

// Prefix for the phone bar label outside the MCU.
const WORLD_SHORT = { xmen: "X-Men", spider: "Spider-Man" };

const sectionEls = [];

function openSection(world){

    sectionEls.forEach(({ world: w, el, head, body }) => {

        const open = w === world;

        el.classList.toggle("open", open);

        body.classList.toggle("open", open);

        head.setAttribute("aria-expanded", open ? "true" : "false");

    });

}

SECTIONS.forEach(section => {

    const el = document.createElement("div");

    el.className = "view-panel-section";

    el.dataset.world = section.world;

    const head = document.createElement("button");

    head.type = "button";
    head.className = "view-panel-section-head";
    head.innerHTML = `<span>${section.title}</span><span class="view-panel-section-chevron" aria-hidden="true">&#9662;</span>`;

    head.addEventListener("click", () => {

        // Toggle this section; opening it closes the other.
        openSection(el.classList.contains("open") ? null : section.world);

    });

    // The section's body opens/closes smoothly: a .collapse
    // wrapper animates its real height (css/panel.css).
    const body = document.createElement("div");

    body.className = "view-panel-section-body collapse";

    const bodyInner = document.createElement("div");

    bodyInner.className = "collapse-inner";

    body.appendChild(bodyInner);

    const views = document.createElement("div");

    views.className = "view-panel-views";

    const dropdown = document.createElement("div");

    dropdown.className = "character-dropdown collapse";

    const dropdownInner = document.createElement("div");

    dropdownInner.className = "collapse-inner";

    dropdown.appendChild(dropdownInner);

    VIEWS.forEach(view => {

        const btn = document.createElement("button");

        btn.className = "view-panel-btn";
        btn.dataset.view = view.key;
        btn.dataset.world = section.world;
        btn.textContent = section.labels[view.key] || view.label;

        btn.addEventListener("click", () => {

            if(view.key === "characters"){

                dropdown.classList.toggle("open");
                btn.classList.toggle("expanded");
                return;

            }

            // Close the phone panel first, so the new view frames
            // itself around the slim bar, not the open panel.
            collapseIfCompact();

            setWorldView(section.world, view.key);

        });

        views.appendChild(btn);

        if(view.key === "characters"){

            btn.classList.add("has-dropdown");

            views.appendChild(dropdown);

        }

    });

    section.heroes.forEach(hero => {

        const btn = document.createElement("button");

        btn.className = "character-btn";

        btn.textContent = hero.label;

        btn.addEventListener("click", () => {

            setSelectedCharacter(hero.character);

            dropdown.classList.remove("open");

            selectedHeroLabel = hero.journey || hero.label + "'s Journey";

            collapseIfCompact();

            setWorldView(section.world, "characters");

        });

        dropdownInner.appendChild(btn);

    });

    bodyInner.appendChild(views);

    el.appendChild(head);
    el.appendChild(body);

    list.appendChild(el);

    sectionEls.push({ world: section.world, el, head, body });

});

openSection("mcu");

function refreshActive(){

    const current = getCurrentView();
    const world = getWorld();

    const section = SECTIONS.find(s => s.world === world) || SECTIONS[0];

    // The phone bar's label: the current view's name (plus
    // the hero, for a character journey), and the world
    // when it's not the MCU.
    const name =
        current === "characters" && selectedHeroLabel
            ? selectedHeroLabel
            : (section.labels[current] || "");

    currentLabel.textContent =
        world !== "mcu" && !name.startsWith("Complete") && current !== "characters"
            ? `${WORLD_SHORT[world] || ""} · ${name}`
            : name;

    list.querySelectorAll(".view-panel-btn").forEach(btn => {

        btn.classList.toggle(
            "active",
            btn.dataset.view === current && btn.dataset.world === world
        );

    });

    // Keep the current world's section open.
    const openEl = sectionEls.find(s => s.el.classList.contains("open"));

    if(!openEl || openEl.world !== world) openSection(world);

}

// Views can change from elsewhere too (rotating a phone,
// "Show on map" switching worlds) — stay in step.
window.addEventListener("mcu:view-changed", refreshActive);

export function initialisePanel(){

    initMovieSearch();
    refreshActive();

}
import { VIEWS } from "../js/views.js";
import { setWorldView, getCurrentView, getWorld, refitView, resetView } from "../js/viewManager.js";
import { ALL_WORLDS } from "../js/worlds.js";

import {

    setSelectedCharacter

} from "../js/characters/characterJourney.js";

import { initMovieSearch } from "./search.js";
import { isCompact } from "../js/responsive.js";
import { worldNodes, allNodes } from "../js/graph.js";
import { progress } from "../js/watched.js";
import { isUpcoming } from "../js/upcoming.js";
import { watchScroll } from "../js/scrollHints.js";

const viewport = document.getElementById("viewport");

const panel = document.createElement("div");
panel.id = "view-panel";

// Header: the title (click to go back to the landing page)
// and, on phones only, a toggle showing the current view
// that opens/closes the rest of the panel.
panel.innerHTML = `
    <div class="view-panel-header">

        <button class="view-panel-title" type="button" title="Back to the start page">MCU Archive</button>

        <!-- Back to the default view: the map's usual tilt,
             turned square, and the whole view framed again. -->
        <button class="view-panel-reset" type="button" title="Back to the default view" aria-label="Back to the default view">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 3.5v4.6h4.6"/><circle cx="12" cy="12" r="2.2"/></svg>
        </button>

        <button class="view-panel-toggle" type="button" aria-expanded="false" aria-controls="view-panel-content">
            <span class="view-panel-current"></span>
            <span class="view-panel-chevron" aria-hidden="true">&#9662;</span>
        </button>

    </div>

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

// Back to the default view (js/viewManager.js resetView).
panel.querySelector(".view-panel-reset").addEventListener("click", () => {

    collapseIfCompact();

    resetView();

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
// world's views. Only one section is open at a time —
// opening one closes the rest, so the panel never grows
// longer than one world's list. Picking a view in another
// world's section switches worlds on the same page.
//--------------------------------------------------

const SECTIONS = [

    {
        // Every world together. Its own dropdown, above the
        // worlds: the three mind maps side by side, or every
        // poster scattered over the whole screen.
        world: ALL_WORLDS,
        title: "MCU",
        views: ["complete", "scatter"],
        labels: {
            complete: "Complete MCU",
            scatter: "All Posters"
        },
        heroes: []
    },

    {
        world: "mcu",
        title: "Avengers World",
        labels: {
            // The Avengers' own mind map. ("MCU", above the
            // sections, is every world together.)
            complete: "Complete Avengers",
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
            { label: "Harry Osborn", character: "Harry Osborn" },
            { label: "Animated Spider-Man", character: "Peter Parker (Animated)", journey: "Animated Spider-Man's Journey" },
            { label: "Venom", character: "Eddie Brock" }
        ]
    },

    {
        world: "ff",
        title: "Fantastic Four World",
        labels: {
            complete: "Complete Fantastic Four",
            phases: "Eras",
            release: "Release Order",
            chronology: "Chronological Order",
            characters: "Character Journeys"
        },
        heroes: [
            { label: "Mister Fantastic", character: "Reed Richards" },
            { label: "Invisible Woman", character: "Sue Storm" },
            { label: "Human Torch", character: "Johnny Storm" },
            { label: "The Thing", character: "Ben Grimm" },
            { label: "Doctor Doom", character: "Doctor Doom" },
            { label: "Silver Surfer", character: "Silver Surfer" }
        ]
    },

    {
        world: "tv",
        title: "Marvel TV World",
        labels: {
            complete: "Complete Marvel TV",
            phases: "Eras",
            release: "Release Order",
            chronology: "Chronological Order",
            characters: "Character Journeys"
        },
        heroes: [
            { label: "Phil Coulson", character: "Phil Coulson" },
            { label: "Daisy Johnson", character: "Daisy Johnson" },
            { label: "Melinda May", character: "Melinda May" },
            { label: "Peggy Carter", character: "Peggy Carter" },
            { label: "Daredevil", character: "Matt Murdock" },
            { label: "Jessica Jones", character: "Jessica Jones" },
            { label: "The Punisher", character: "Frank Castle" },
            { label: "Cloak & Dagger", character: "Tandy Bowen", journey: "Cloak & Dagger's Journey" },
            { label: "Nico Minoru", character: "Nico Minoru" },
            { label: "Legion", character: "David Haller" }
        ]
    },

    {
        world: "unscripted",
        title: "Unscripted World",
        labels: {
            complete: "Complete Unscripted",
            phases: "Groups",
            release: "Release Order",
            chronology: "Chronological Order",
            characters: "Character Journeys"
        },
        heroes: [
            { label: "Stan Lee", character: "Stan Lee" },
            { label: "Wanda Maximoff", character: "Wanda Maximoff" },
            { label: "Loki", character: "Loki" },
            { label: "Kamala Khan", character: "Kamala Khan" },
            { label: "Carol Danvers", character: "Carol Danvers" },
            { label: "Stephen Strange", character: "Stephen Strange" }
        ]
    },

    {
        world: "animated",
        title: "Animated World",
        labels: {
            complete: "Complete Animated",
            phases: "Eras",
            release: "Release Order",
            chronology: "Chronological Order",
            characters: "Character Journeys"
        },
        heroes: [
            { label: "Spider-Man", character: "Peter Parker" },
            { label: "Iron Man", character: "Tony Stark" },
            { label: "Captain America", character: "Steve Rogers" },
            { label: "Hulk", character: "Bruce Banner" },
            { label: "Thor", character: "Thor" },
            { label: "Wolverine", character: "Wolverine" },
            { label: "Miles Morales", character: "Miles Morales" },
            { label: "Ms. Marvel", character: "Kamala Khan" },
            { label: "Groot", character: "Groot" },
            { label: "The Watcher", character: "The Watcher" }
        ]
    }

];

let selectedHeroLabel = "";

// Prefix for the phone bar label outside the MCU.
const WORLD_SHORT = { [ALL_WORLDS]: "MCU", mcu: "Avengers", xmen: "X-Men", spider: "Spider-Man", ff: "Fantastic Four", unscripted: "Unscripted", animated: "Animated", tv: "Marvel TV" };

const sectionEls = [];

// The Character Journeys dropdowns work the same way: one
// open at a time across the whole panel.
function setDropdownOpen(entry, open){

    if(open){

        sectionEls.forEach(other => {

            if(other !== entry) setDropdownOpen(other, false);

        });

    }

    entry.dropdown.classList.toggle("open", open);

    if(entry.journeyBtn){

        entry.journeyBtn.classList.toggle("expanded", open);
        entry.journeyBtn.setAttribute("aria-expanded", open ? "true" : "false");

    }

}

// An accordion: opening a section closes whichever other
// one was open (and any dropdown inside it).
function setSectionOpen(entry, open){

    if(open){

        sectionEls.forEach(other => {

            if(other !== entry && other.el.classList.contains("open")) setSectionOpen(other, false);

        });

    } else {

        setDropdownOpen(entry, false);

    }

    entry.el.classList.toggle("open", open);

    entry.body.classList.toggle("open", open);

    entry.head.setAttribute("aria-expanded", open ? "true" : "false");

}

// Make sure a world's section is open (closing the others).
function openSection(world){

    const entry = sectionEls.find(s => s.world === world);

    if(entry && !entry.el.classList.contains("open")) setSectionOpen(entry, true);

}

SECTIONS.forEach(section => {

    const el = document.createElement("div");

    el.className = "view-panel-section";

    el.dataset.world = section.world;

    const head = document.createElement("button");

    head.type = "button";
    head.className = "view-panel-section-head";
    head.innerHTML = `<span>${section.title}</span><span class="view-panel-section-progress"></span><span class="view-panel-section-chevron" aria-hidden="true">&#9662;</span>`;

    head.addEventListener("click", () => {

        // Toggle this section; opening it closes the other.
        const entry = sectionEls.find(s => s.el === el);

        setSectionOpen(entry, !el.classList.contains("open"));

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

    // A section lists its own views if it names them (the
    // combined MCU); a world lists every view meant for a
    // single world.
    const sectionViews = section.views
        ? VIEWS.filter(v => section.views.includes(v.key))
        : VIEWS.filter(v => !v.allOnly);

    sectionViews.forEach(view => {

        const btn = document.createElement("button");

        btn.className = "view-panel-btn";
        btn.dataset.view = view.key;
        btn.dataset.world = section.world;
        btn.textContent = section.labels[view.key] || view.label;

        btn.addEventListener("click", () => {

            if(view.key === "characters"){

                const entry = sectionEls.find(s => s.el === el);

                setDropdownOpen(entry, !dropdown.classList.contains("open"));

                return;

            }

            // Close the phone panel first, so the new view frames
            // itself around the slim bar, not the open panel.
            const wasOpen = panel.classList.contains("expanded");

            collapseIfCompact();

            setWorldView(section.world, view.key);

            // On a phone the panel shrinks back to its slim bar
            // over 0.4s; frame the view again once it has, so it
            // fills the screen rather than the space left above
            // the open panel.
            if(wasOpen && isCompact()) setTimeout(refitView, 450);

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

            setDropdownOpen(sectionEls.find(s => s.el === el), false);

            selectedHeroLabel = hero.journey || hero.label + "'s Journey";

            collapseIfCompact();

            setWorldView(section.world, "characters");

        });

        dropdownInner.appendChild(btn);

    });

    bodyInner.appendChild(views);

    const journeyBtn = views.querySelector('.view-panel-btn[data-view="characters"]');

    el.appendChild(head);
    el.appendChild(body);

    list.appendChild(el);

    sectionEls.push({ world: section.world, el, head, body, dropdown, journeyBtn });

});

openSection(ALL_WORLDS);

function refreshActive(){

    const current = getCurrentView();
    const world = getWorld();

    const section = SECTIONS.find(s => s.world === world) || SECTIONS[0];

    // The phone bar's label: the current view's name (plus
    // the hero, for a character journey), with its world in
    // front (e.g. "Avengers · Phases").
    const name =
        current === "characters" && selectedHeroLabel
            ? selectedHeroLabel
            : (section.labels[current] || "");

    currentLabel.textContent =
        !name.startsWith("Complete") && current !== "characters"
            ? `${WORLD_SHORT[world] || ""} · ${name}`
            : name;

    list.querySelectorAll(".view-panel-btn").forEach(btn => {

        btn.classList.toggle(
            "active",
            btn.dataset.view === current && btn.dataset.world === world
        );

    });

    // The current world's section opens with it (and the
    // others close).
    openSection(world);

}

// Views can change from elsewhere too (rotating a phone,
// "Show on map" switching worlds) — stay in step.
window.addEventListener("mcu:view-changed", refreshActive);

//--------------------------------------------------
// Watched counts (js/watched.js): "12/58" beside each
// world's heading once you've ticked something off there.
// Only titles that are out count.
//--------------------------------------------------

const released = n => !isUpcoming(n) && n.status !== "cancelled";

function refreshProgress(){

    sectionEls.forEach(({ world, head }) => {

        const el = head.querySelector(".view-panel-section-progress");

        if(!el) return;

        const nodes = world === ALL_WORLDS ? allNodes() : (worldNodes[world] || []);

        const { done, total } = progress(nodes, released);

        el.textContent = done > 0 ? `${done}/${total}` : "";
        el.title = done > 0 ? `${done} of ${total} watched` : "";

    });

}

window.addEventListener("mcu:watched-changed", refreshProgress);

export function initialisePanel(){

    // No scrollbars: a panel too long for the screen fades
    // out at the bottom instead (js/scrollHints.js). The
    // whole panel scrolls on a computer; on a phone, the
    // open panel's inside does.
    watchScroll(panel);
    watchScroll(panel.querySelector(".view-panel-content-inner"));

    initMovieSearch();
    refreshActive();
    refreshProgress();

}
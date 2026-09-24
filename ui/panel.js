import { VIEWS } from "../js/views.js";
import { setView, getCurrentView } from "../js/viewManager.js";

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

        <div class="search-container">

            <input
                id="movie-search"
                type="text"
                placeholder="Search movies or characters...">

            <div id="movie-search-results"></div>

        </div>

        <div class="view-panel-list"></div>

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
const dropdown = document.createElement("div");
dropdown.className = "character-dropdown";

VIEWS.forEach(view=>{

    const btn = document.createElement("button");

    btn.className = "view-panel-btn";
    btn.dataset.view = view.key;
    btn.textContent = view.label;

btn.addEventListener("click", () => {

    if(view.key === "characters"){

        dropdown.classList.toggle("open");
        btn.classList.toggle("expanded");
        return;

    }

    // Close the phone panel first, so the new view frames
    // itself around the slim bar, not the open panel.
    collapseIfCompact();

    setView(view.key);
    refreshActive();

});

list.appendChild(btn);

if(view.key === "characters"){

    btn.classList.add("has-dropdown");

    list.appendChild(dropdown);

}


});

const heroes = [

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
    {label: "Vision", character: "Vision"},
    {label: "Ant man", character: "Scott Lang"}

];

heroes.forEach(hero=>{

    const btn = document.createElement("button");

    btn.className = "character-btn";

    btn.textContent = hero.label;

    btn.addEventListener("click",()=>{

        setSelectedCharacter(hero.character);

        dropdown.classList.remove("open");

        selectedHeroLabel = hero.label;

        collapseIfCompact();

        setView("characters");

        refreshActive();

    });

    dropdown.appendChild(btn);

});

let selectedHeroLabel = "";

function refreshActive(){

    const current=getCurrentView();

    // The phone bar's label: the current view's name (plus
    // the hero, for a character journey).
    const view = VIEWS.find(v => v.key === current);

    if(view){

        currentLabel.textContent =
            current === "characters" && selectedHeroLabel
                ? selectedHeroLabel + "'s Journey"
                : view.label;

    }

    list.querySelectorAll(".view-panel-btn").forEach(btn=>{

        btn.classList.toggle(
            "active",
            btn.dataset.view===current
        );

    });

}

export function initialisePanel(){

    initMovieSearch();
    refreshActive();

}
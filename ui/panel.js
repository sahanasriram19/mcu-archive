import { VIEWS } from "../js/views.js";
import { setView, getCurrentView } from "../js/viewManager.js";

import {

    setSelectedCharacter

} from "../js/characters/characterJourney.js";

import { initMovieSearch } from "./search.js";

const viewport = document.getElementById("viewport");

const panel = document.createElement("div");
panel.id = "view-panel";

panel.innerHTML = `
    <div class="view-panel-title">MCU Archive</div>
    <div class="view-panel-subtitle">Choose a view and zoom</div>
    <div class="search-container">

        <input
            id="movie-search"
            type="text"
            placeholder="Search movies or characters...">

        <div id="movie-search-results"></div>

    </div>

    <div class="view-panel-list"></div>
`;

viewport.appendChild(panel);

const list = panel.querySelector(".view-panel-list");
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
    {label: "Scarlet Witch", character: "Wanda Maximoff"},
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

        setView("characters");

        refreshActive();

    });

    dropdown.appendChild(btn);

});

function refreshActive(){

    const current=getCurrentView();

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
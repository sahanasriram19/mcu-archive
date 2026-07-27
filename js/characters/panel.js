import { CHARACTER_JOURNEYS } from "./data.js";

let panel;

export function initCharacterPanel() {

    panel = document.createElement("div");
    panel.className = "character-panel hidden";

    panel.innerHTML = `
        <div class="character-header">

            <h2>Character Journeys</h2>

            <input
                id="character-search"
                placeholder="Search..."
            >

        </div>

        <div id="character-list"></div>
    `;

    document.body.appendChild(panel);

    buildList();

}

function buildList() {

    const list = panel.querySelector("#character-list");

    list.innerHTML = "";

    CHARACTER_JOURNEYS.forEach(character => {

        const div = document.createElement("div");

        div.className = "character-entry";

        div.innerHTML = `
            <div class="character-name">

                ${character.icon}
                ${character.name}

            </div>
        `;

        div.onclick = () => {

            console.log(character);

        };

        list.appendChild(div);

    });

}

export function toggleCharacterPanel(){

    panel.classList.toggle("hidden");

}
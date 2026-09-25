//==================================================
// WORLDS
//
// The archive holds three worlds, each with its own data
// file and its own set of views:
//
//   mcu   — data/mcu.json, grouped by Phase (0-6)
//   xmen  — data/xmen.json, the Fox X-Men films plus
//           Marvel Studios' X-Men '97, grouped by era
//   spider — data/spiderman.json, the Raimi and Amazing
//           Spider-Man films, Sony's animated Spider-Verse
//           and Tom Holland's MCU films, grouped by era
//
// Those were their own continuities; they're tied to the
// MCU through the multiverse. Deadpool & Wolverine and
// Tom Holland's Spider-Man films (No Way Home is the
// crossover) appear in two worlds.
//
// X-Men eras use group numbers 11+ and Spider-Man eras
// 21+ (in each file's "phase" field) so they can never be
// mistaken for an MCU phase — the colour tables in
// branchNodes.js key off the same numbers.
//==================================================

export const WORLDS = {

    mcu: {
        key: "mcu",
        label: "MCU",
        file: "./data/mcu.json"
    },

    xmen: {
        key: "xmen",
        label: "X-Men",
        file: "./data/xmen.json"
    },

    spider: {
        key: "spider",
        label: "Spider-Man",
        file: "./data/spiderman.json"
    }

};

// X-Men eras, keyed by the number in xmen.json's "phase".
export const XMEN_ERAS = {

    11: "Original Trilogy",
    12: "Wolverine",
    13: "First Class Saga",
    14: "Deadpool",
    15: "New Mutants & '97"

};

// Spider-Man eras, keyed by the number in spiderman.json.
export const SPIDER_ERAS = {

    21: "Raimi Trilogy",
    22: "The Amazing Spider-Man",
    23: "Spider-Verse",
    24: "MCU Spider-Man"

};

const ERA_NAMES = { ...XMEN_ERAS, ...SPIDER_ERAS };

let currentWorld = "mcu";

export function getWorld(){

    return currentWorld;

}

export function setCurrentWorld(key){

    if(WORLDS[key]) currentWorld = key;

}

// "PHASE 3" for the MCU, "WOLVERINE" etc. for X-Men eras —
// used for branch labels, timeline markers and the
// details card.
export function groupName(phase, { upper = true } = {}){

    const name = ERA_NAMES[phase] !== undefined
        ? ERA_NAMES[phase]
        : "Phase " + phase;

    return upper ? name.toUpperCase() : name;

}
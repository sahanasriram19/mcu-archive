//==================================================
// WORLDS
//
// The archive holds six worlds, each with its own data
// file and its own set of views:
//
//   mcu   — data/mcu.json, grouped by Phase (0-6)
//   xmen  — data/xmen.json, the Fox X-Men films plus
//           the X-Men cartoons (X-Men '97 included),
//           grouped by era
//   spider — data/spiderman.json, the Raimi and Amazing
//           Spider-Man films, Sony's animated Spider-Verse,
//           Tom Holland's MCU films, Sony's Spider-Man
//           Universe (Venom…) and the Spider-Man cartoons,
//           grouped by era
//   ff    — data/fantasticfour.json, the Fantastic Four
//           cartoons, Fox films and Marvel Studios films,
//           grouped by era
//   unscripted — data/unscripted.json, Marvel's unscripted
//           documentaries and specials on Disney+ (Assembled,
//           Legends, 616…), grouped by kind
//   animated — data/animated.json, every Marvel Animation
//           series, short and special on Disney+, grouped
//           by era
//   tv    — data/tv.json, Marvel's live-action television
//           (Agents of S.H.I.E.L.D., Agent Carter, Inhumans,
//           the Netflix Defenders shows, Runaways, Cloak &
//           Dagger, Helstrom, Legion, The Gifted, and Marvel
//           Studios' Disney+ shows), grouped by network
//
// Those were their own continuities; they're tied to the
// MCU through the multiverse. Deadpool & Wolverine,
// Tom Holland's Spider-Man films (No Way Home is the
// crossover) and the cartoons appear in more than one
// world — a shared title keeps the same id everywhere.
//
// X-Men eras use group numbers 11+, Spider-Man eras 21+,
// Animated eras 31+, Fantastic Four eras 51+,
// Unscripted groups 61+ and Marvel TV eras 71+ (in each file's "phase" field)
// so they can never be mistaken for an MCU phase — the colour tables in
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
    },

    ff: {
        key: "ff",
        label: "Fantastic Four",
        file: "./data/fantasticfour.json"
    },

    unscripted: {
        key: "unscripted",
        label: "Unscripted",
        file: "./data/unscripted.json"
    },

    animated: {
        key: "animated",
        label: "Animated",
        file: "./data/animated.json"
    },

    tv: {
        key: "tv",
        label: "Marvel TV",
        file: "./data/tv.json"
    }

};

// X-Men eras, keyed by the number in xmen.json's "phase".
export const XMEN_ERAS = {

    11: "Original Trilogy",
    12: "Wolverine",
    13: "First Class Saga",
    14: "Deadpool",
    15: "Animated X-Men"

};

// Spider-Man eras, keyed by the number in spiderman.json.
export const SPIDER_ERAS = {

    21: "Raimi Trilogy",
    22: "The Amazing Spider-Man",
    23: "Spider-Verse",
    24: "MCU Spider-Man",
    25: "Sony's Spider-Man Universe",
    26: "Classic Cartoons",
    27: "Modern Cartoons",
    28: "Spidey & Friends",
    29: "Venom"

};

// Marvel Animation eras, keyed by the number in animated.json.
export const ANIMATED_ERAS = {

    31: "Classic Cartoons",
    32: "2000s Cartoons",
    33: "Disney XD Era",
    34: "Shorts",
    35: "Marvel Rising",
    36: "Disney Junior",
    37: "LEGO Marvel",
    38: "Adult Animation",
    39: "Marvel Studios",
    40: "Spider-Verse",
    41: "Spider-Man Cartoons"

};

// Fantastic Four eras, keyed by the number in fantasticfour.json.
export const FF_ERAS = {

    51: "Cartoons",
    52: "Fox Films",
    53: "Marvel Studios"

};

// Marvel Unscripted groups, keyed by the number in unscripted.json.
export const UNSCRIPTED_ERAS = {

    61: "Docuseries",
    62: "Specials",
    63: "Assembled 2021",
    64: "Assembled 2022",
    65: "Assembled 2023",
    66: "Assembled 2024"

};

// Marvel Television eras, keyed by the number in tv.json.
// (The Netflix shows are the same titles as the MCU's
// "Defenders" group, and the Disney+ shows — WandaVision,
// Loki, Hawkeye… — the same as the MCU's, under the same ids.)
export const TV_ERAS = {
    71: "ABC",
    73: "Netflix",
    74: "Hulu & Freeform",
    75: "Fox X-Men Shows",
    76: "Disney+"
};

// The MCU's "Phase 0" — the Netflix Defenders-saga shows
// (Daredevil, Jessica Jones, Luke Cage…) — is shown by
// name everywhere rather than as a phase number.
export const MCU_GROUP_NAMES = {

    0: "Defenders"

};

const ERA_NAMES = { ...MCU_GROUP_NAMES, ...XMEN_ERAS, ...SPIDER_ERAS, ...ANIMATED_ERAS, ...FF_ERAS, ...UNSCRIPTED_ERAS, ...TV_ERAS };

// "all" is the combined map (the "Complete MCU" view):
// every world's mind map side by side on one canvas. It
// has no data file of its own — it shows all the others.
export const ALL_WORLDS = "all";

let currentWorld = "mcu";

export function getWorld(){

    return currentWorld;

}

export function setCurrentWorld(key){

    if(WORLDS[key] || key === ALL_WORLDS) currentWorld = key;

}

// "PHASE 3" for the MCU ("DEFENDERS" for the Netflix
// shows), "WOLVERINE" etc. for X-Men eras —
// used for branch labels, timeline markers and the
// details card.
export function groupName(phase, { upper = true } = {}){

    const name = ERA_NAMES[phase] !== undefined
        ? ERA_NAMES[phase]
        : "Phase " + phase;

    return upper ? name.toUpperCase() : name;

}
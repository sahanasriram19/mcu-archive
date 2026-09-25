//==================================================
// WORLDS
//
// The archive holds two worlds, each with its own data
// file and its own set of views:
//
//   mcu   — data/mcu.json, grouped by Phase (0-6)
//   xmen  — data/xmen.json, the Fox X-Men films plus
//           Marvel Studios' X-Men '97, grouped by era
//
// The Fox films were their own continuity; they're tied
// to the MCU through the multiverse, and Deadpool &
// Wolverine appears in both worlds as the bridge.
//
// X-Men eras use group numbers 11+ (in xmen.json's
// "phase" field) so they can never be mistaken for an
// MCU phase — the colour tables in branchNodes.js key
// off the same numbers.
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

    const name = XMEN_ERAS[phase] !== undefined
        ? XMEN_ERAS[phase]
        : "Phase " + phase;

    return upper ? name.toUpperCase() : name;

}
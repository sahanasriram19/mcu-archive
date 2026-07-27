//==================================================
//
// HELPERS
//
//==================================================
// Seeded RNG (mulberry32) instead of Math.random().
// This is what makes the whole universe — every
// star, nebula, and colour — come out identical on
// every reload instead of reshuffling each time.
//==================================================

const SEED = 88817;

let state = SEED;

function mulberry32() {

    state |= 0;

    state = (state + 0x6D2B79F5) | 0;

    let t = Math.imul(state ^ (state >>> 15), 1 | state);

    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;

}

//--------------------------------------------------
// Lets generateUniverse() reset the sequence back to
// the same starting point each time initialiseUniverse()
// runs, so reload order never drifts.
//--------------------------------------------------

export function resetRandomSeed() {

    state = SEED;

}

export function random(min, max) {

    return mulberry32() * (max - min) + min;

}

export function randomInt(min, max) {

    return Math.floor(random(min, max));

}

export function choose(array) {

    return array[randomInt(0, array.length)];

}

export function clamp(value, min, max) {

    return Math.max(min, Math.min(max, value));

}
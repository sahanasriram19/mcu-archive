//==================================================
//
// CONFIG
//
//==================================================

export const CONFIG = {

    WORLD_SIZE: 16000,

    // These were 18000 / 1800 / 700. Each particle is an
    // individual arc()+fill() draw call every frame, and the
    // low-zoom thinning in stars.js only kicks in once
    // camera.zoom has eased down close to its target — during
    // the Enter transition (zoom easing from 1 → ~0.1 over
    // many frames) the full counts were drawing at the exact
    // moment posters/connections/branch circles also turned
    // on, which is what read as the page hanging.
    STAR_COUNT: 7000,

    HERO_STAR_COUNT: 120,

    DUST_COUNT: 700,

    ENERGY_COUNT: 280,

    NEBULA_COUNT: 6,

    SHOOTING_STAR_COUNT: 8

};

export const STAR_COLOURS = [

    "#FFFFFF",
    "#EEF7FF",
    "#D7E9FF",
    "#FFE7B5",
    "#FFD2A6"

];

export const ENERGY_COLOURS = [

    "255,255,255",
    "120,180,255",
    "170,120,255",
    "255,220,130"

];

export const NEBULA_COLOURS = [

    "90,70,255",
    "70,150,255",
    "255,90,170",
    "255,180,120"

];
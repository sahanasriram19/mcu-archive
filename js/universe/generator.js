//==================================================
//
// UNIVERSE GENERATOR
//
//==================================================

import { universe } from "./state.js";

import {

    CONFIG,
    STAR_COLOURS,
    ENERGY_COLOURS,
    NEBULA_COLOURS

} from "./config.js";

import {

    random,
    randomInt,
    choose,
    resetRandomSeed

} from "./helpers.js";

//==================================================
// STAR
//==================================================

//==================================================
// STAR
//==================================================

function createStar() {

    const x = random(-CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE);
    const y = random(-CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE);

    return {

        // Original position
        x,
        y,

        // Used for slow floating animation
        baseX: x,
        baseY: y,

        driftRadius: random(2, 8),
        driftOffset: random(0, Math.PI * 2),

        radius: random(.35, 2.2),

        alpha: random(.4, 1),

        colour: choose(STAR_COLOURS),

        depth: random(.05, .95),

        twinkle: random(0, Math.PI * 2),

        speed: random(.002, .012),

        type: randomInt(0, 4)

    };

}

//==================================================
// HERO STAR
//==================================================

function createHeroStar() {

    return {

        x: random(-CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE),
        y: random(-CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE),

        radius: random(4, 7),

        glow: random(90, 180),

        alpha: random(.4, .8),

        depth: random(.08, .25),

        colour: choose([

            "#FFFFFF",
            "#DDEEFF",
            "#FFE0B5"

        ]),

        twinkle: random(0, Math.PI * 2),

        speed: random(.003, .006)

    };

}

//==================================================
// DUST
//==================================================

function createDust() {

    return {

        x: random(-CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE),
        y: random(-CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE),

        radius: random(8, 30),

        alpha: random(.02, .05),

        depth: random(.15, .85),

        angle: random(0, Math.PI * 2),

        speed: random(.0008, .002)

    };

}

//==================================================
// ENERGY
//==================================================

function createEnergy() {

    return {

        x: random(-CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE),
        y: random(-CONFIG.WORLD_SIZE, CONFIG.WORLD_SIZE),

        radius: random(1.2, 3.5),

        depth: random(.2, .95),

        colour: choose(ENERGY_COLOURS),

        alpha: random(.3, .8),

        orbit: random(10, 60),

        angle: random(0, Math.PI * 2),

        speed: random(.001, .004)

    };

}

//==================================================
// NEBULA
//==================================================

function createNebula(index) {

    return {

        x: random(-14000, 14000),
        y: random(-14000, 14000),

        radius: random(2400, 4200),

        depth: random(.03, .12),

        // Deterministic, not random.choose() — with only
        // ~100 nebulas, random sampling would sometimes
        // land mostly pink, sometimes mostly blue, and the
        // whole background tint would shift on every reload.
        // Cycling evenly through the palette keeps the same
        // colour balance every time.
        colour: NEBULA_COLOURS[index % NEBULA_COLOURS.length],

        alpha: random(.08, .14),

        angle: random(0, Math.PI * 2),

        speed: random(.00005, .00012)

    };

}

//==================================================
// SHOOTING STAR
//==================================================

function createShootingStar() {

    return {

        active: false,

        timer: random(120, 600),

        x: 0,
        y: 0,

        vx: 0,
        vy: 0,

        length: random(180, 320),

        thickness: random(2, 3.5),

        brightness: random(.7, 1)

    };

}

//==================================================
// GENERATE WORLD
//==================================================

export function generateUniverse() {

    resetRandomSeed();

    for (let i = 0; i < CONFIG.HERO_STAR_COUNT; i++) {

        universe.heroStars.push(createHeroStar());

    }

    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {

        universe.stars.push(createStar());

    }

    for (let i = 0; i < CONFIG.DUST_COUNT; i++) {

        universe.dust.push(createDust());

    }

    for (let i = 0; i < CONFIG.ENERGY_COUNT; i++) {

        universe.energy.push(createEnergy());

    }

    for (let i = 0; i < CONFIG.NEBULA_COUNT; i++) {

        universe.nebulas.push(createNebula(i));

    }

    for (let i = 0; i < CONFIG.SHOOTING_STAR_COUNT; i++) {

        universe.shootingStars.push(createShootingStar());

    }

}
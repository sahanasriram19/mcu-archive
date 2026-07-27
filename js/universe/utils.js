//==================================================
//
// UNIVERSE UTILITIES
//
//==================================================

export function random(min, max) {

    return Math.random() * (max - min) + min;

}

export function randomInt(min, max) {

    return Math.floor(random(min, max));

}

export function choose(array) {

    return array[randomInt(0, array.length)];

}

export function clamp(value, min, max) {

    return Math.max(

        min,

        Math.min(max, value)

    );

}

//==================================================
// WORLD -> SCREEN PROJECTION
// (camera.zoom actually scales the universe)
//==================================================

export function worldToScreen(x, y, camera, depth, width, height) {

    return {

        x:
            width / 2 +
            (x - camera.x * depth) * camera.zoom,

        y:
            height / 2 +
            (y - camera.y * depth) * camera.zoom

    };

}
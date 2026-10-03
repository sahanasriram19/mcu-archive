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

//--------------------------------------------------
// ENDLESS BACKGROUND
//
// The stars and energy specks are scattered over a square
// of ±WORLD_SIZE. Zoomed far out (the combined MCU map) the
// screen is wider than that square and its edges showed.
// Instead, the square repeats like tiles in every direction:
// each particle is drawn at every copy of itself that lands
// on screen (usually just one), so the field never ends.
//--------------------------------------------------

export function screenCopies(x, y, camera, depth, width, height, margin, size){

    const period = size * 2;

    const zoom = camera.zoom;

    // Position relative to the camera, folded into one tile.
    const wrap = v => ((v % period) + period) % period - size;

    const rx = wrap(x - camera.x * depth);
    const ry = wrap(y - camera.y * depth);

    // How many tiles either side the screen reaches.
    const nx = Math.max(0, Math.ceil((width / 2 / zoom + margin / zoom - size) / period));
    const ny = Math.max(0, Math.ceil((height / 2 / zoom + margin / zoom - size) / period));

    const out = [];

    for(let i = -nx; i <= nx; i++){

        for(let j = -ny; j <= ny; j++){

            const sx = width / 2 + (rx + i * period) * zoom;
            const sy = height / 2 + (ry + j * period) * zoom;

            if(sx < -margin || sx > width + margin || sy < -margin || sy > height + margin) continue;

            out.push({ x: sx, y: sy });

        }

    }

    return out;

}
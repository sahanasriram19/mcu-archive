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
//==================================================
// STEADY THINNING
//
// Zoomed out, far more of the sky is on screen, so only some
// of the stars (and energy specks) are drawn. That used to be
// "every 2nd one", "every 3rd one"…, and each time the zoom
// crossed from one to the next a completely different set
// was picked — thousands of stars blinking out and others
// appearing at once, which is what made the sky flicker while
// zooming.
//
// Instead each list gets one fixed, shuffled order (the same
// on every visit), and zooming just keeps more or fewer from
// the front of it: the ones that go are always the last few,
// and they fade out rather than vanish. Zooming back in
// brings exactly the same ones back.
//==================================================

const orders = new WeakMap();

// A fixed shuffle of `list`'s indexes (seeded, so it's the
// same every time).
export function steadyOrder(list){

    let order = orders.get(list);

    if(order && order.length === list.length) return order;

    order = Array.from({ length: list.length }, (_, i) => i);

    let seed = 1234567;

    const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

    for(let i = order.length - 1; i > 0; i--){

        const j = Math.floor(rand() * (i + 1));

        [order[i], order[j]] = [order[j], order[i]];

    }

    orders.set(list, order);

    return order;

}

// How strongly the i-th item in that order shows when
// `keep` of them are being kept (a fractional number): fully
// for most, fading over the last fifth, so a zoom changes it
// smoothly.
const KEEP_FADE = 0.2;

export function keepFade(i, keep){

    const fadeFrom = keep * (1 - KEEP_FADE);

    if(i < fadeFrom) return 1;

    return Math.max(0, Math.min(1, (keep - i) / Math.max(1e-6, keep - fadeFrom)));

}
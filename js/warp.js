//==================================================
// HYPERSPACE JUMP
//
// Plays when you enter the archive from the landing page:
// stars stretch into streaks rushing past from the centre,
// faster and faster, until a bright flash — and the mind
// map is waiting on the other side.
//
// The map is set up at the moment of the flash (app.js
// waits for `peak`), so any brief hitch while it appears
// happens behind the light rather than on screen.
//
// When you jump from the end of the trail, the Marvel logo
// the trail ended on stays put the whole way: the streaks
// and the light pour out from behind it, and as the light
// fades the map's own logo is sitting exactly underneath,
// with the posters branching out of it (app.js lines the
// map up with it). Entered from anywhere else, it's the
// plain jump with no logo.
//
// Shooting stars are part of it too: any already crossing
// the screen carry on, speeding up with the jump, and a
// shower of new ones bursts out from the middle and shoots
// past you, more and faster as it builds to the flash.
//
// Drawn on its own canvas laid over everything. Off with
// the OS "reduce motion" setting.
//==================================================

const STREAK_COUNT = 320;

// At most this many of the landing page's own stars become
// streaks (the biggest first).
const MAX_STAR_STREAKS = 600;

// Shooting stars: how many new ones burst out during the
// rush (more of them towards the end, as it speeds up).
const METEOR_COUNT = 16;
const METEOR_FADE_IN_MS = 160;

// One shooting star, drawn as in the sky
// (js/universe/shootingStars.js): a tail fading out behind
// a bright, glowing head. (x, y) is the head; (dx, dy) the
// way it's going (unit length).
function drawMeteor(x, y, dx, dy, length, thickness, brightness, alpha){

    if(alpha <= 0.01) return;

    const tx = x - dx * length, ty = y - dy * length;

    const g = ctx.createLinearGradient(tx, ty, x, y);

    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.35, `rgba(170,210,255,${brightness * 0.35 * alpha})`);
    g.addColorStop(1, `rgba(255,255,255,${brightness * alpha})`);

    ctx.strokeStyle = g;
    ctx.lineWidth = thickness;

    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(x, y);
    ctx.stroke();

    const glow = ctx.createRadialGradient(x, y, 0, x, y, 14);

    glow.addColorStop(0, `rgba(255,255,255,${alpha})`);
    glow.addColorStop(0.4, `rgba(170,220,255,${0.45 * alpha})`);
    glow.addColorStop(1, "rgba(0,0,0,0)");

    ctx.fillStyle = glow;

    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fill();

}

function hexToRgb(hex){

    const n = parseInt(String(hex || "#ffffff").slice(1), 16);

    return `${n >> 16 & 255},${n >> 8 & 255},${n & 255}`;

}

const RUSH_MS = 1700;       // streaks speeding up (was 1350)
const FLASH_IN_MS = 480;    // light builds over the end of the rush (was 380)
const FLASH_OUT_MS = 950;   // light fades, revealing the map (was 750)
const LOGO_OUT_MS = 1150;   // the jump's logo hands over to the map's (was 900)
const LOGO_MATCH_MS = 380; // ...easing onto its shape over this long
const LOGO_GROW = 0.07;     // the logo swells this much as you near the jump

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const canvas = document.createElement("canvas");

canvas.id = "warp";

document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");

export function canWarp(){

    return !reduceMotion.matches;

}

// Options (both optional):
//   logo     — the <img> the trail ended on; drawn over the
//              streaks and the light, where it is on screen
//   followTo — () => {x, y, width, height} of the map's logo
//              once it's there, so this one rides along with
//              it while it fades (null when there isn't one)
//   stars    — the stars on screen right now ({x, y, r,
//              colour}, from captureStars in stars.js — and
//              the coloured glowing specks, {x, y, r, rgb,
//              glow}, from energy.js): they
//              become the first streaks, so the real stars
//              round the logo are what stretch out and rush
//              past you
//   meteors  — shooting stars crossing the screen right now
//              (captureShootingStars in shootingStars.js):
//              they carry on as part of the jump
//
// Returns { peak, done }: `peak` resolves at the full flash
// with where the logo is then ({x, y, width}, or null
// without one), `done` when the light has faded away.
export function playWarp({ logo = null, followTo = null, stars = [], meteors = [] } = {}){

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Sharp on high-DPI screens (the logo needs it).
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    // Where the trail's logo is right now.
    let home = null;

    if(logo && logo.complete){

        const r = logo.getBoundingClientRect();

        if(r.width > 4 && r.height > 4) home = { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };

    }

    const cx = home ? home.x : w / 2;
    const cy = home ? home.y : h / 2;

    const reach = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy));

    // Each streak: a direction from the centre and a
    // distance (as a fraction of the way to the corner).
    //
    // The first ones are the real stars that were on screen,
    // starting exactly where they were, at their own size
    // and colour (the starfield hides its own copies while
    // this plays) — so the stars round the logo are what
    // stretch out into the jump. The rest join in as it
    // speeds up.
    // (The coloured glowing specks, energy.js, come first and
    // keep their colour and glow: they streak as coloured
    // trails with a soft halo round them.)
    const seeds = stars
        .filter(s => s.x > -20 && s.x < w + 20 && s.y > -20 && s.y < h + 20)
        .sort((a, b) => (b.glow ? 1 : 0) - (a.glow ? 1 : 0) || b.r - a.r)
        .slice(0, MAX_STAR_STREAKS)
        .map(s => {

            const dx = s.x - cx, dy = s.y - cy;

            return {
                a: Math.atan2(dy, dx),
                d: Math.max(0.005, Math.hypot(dx, dy) / reach),
                hue: s.rgb || hexToRgb(s.colour),
                r: s.r,
                glow: s.glow || 0,
                seed: true
            };

        });

    const streaks = seeds.concat(Array.from({ length: Math.max(0, STREAK_COUNT - seeds.length / 2) }, () => ({
        a: Math.random() * Math.PI * 2,
        d: 0.04 + Math.random() * 0.9,
        hue: Math.random() < 0.25 ? "255,190,170" : (Math.random() < 0.5 ? "190,220,255" : "255,255,255"),
        seed: false
    })));

    // Shooting stars: the ones already crossing the screen
    // keep going their own way (faster and faster), and new
    // ones burst out from near the middle and shoot
    // outwards past you, joining in more often as the jump
    // builds.
    const shooting = meteors.map(m => {

        const v = Math.hypot(m.vx, m.vy) || 1;

        return {
            real: true, x: m.x, y: m.y,
            dx: m.vx / v, dy: m.vy / v, v,
            length: m.length, thickness: m.thickness, brightness: m.brightness,
            born: 0
        };

    }).concat(Array.from({ length: METEOR_COUNT }, (_, i) => ({
        real: false,
        a: Math.random() * Math.PI * 2,
        d: 0.06 + Math.random() * 0.22,
        length: 90 + Math.random() * 70,
        thickness: 2 + Math.random() * 1.5,
        brightness: 0.75 + Math.random() * 0.25,
        born: RUSH_MS * (0.05 + 0.85 * Math.pow(i / (METEOR_COUNT - 1), 0.75)) + Math.random() * 120
    })));

    canvas.classList.add("show");

    let peakResolve, doneResolve;

    const peak = new Promise(r => peakResolve = r);
    const done = new Promise(r => doneResolve = r);

    const start = performance.now();

    let last = start;

    let peaked = false;

    // The fade starts on the first frame after the peak —
    // i.e. once the map has been set up behind the light,
    // however long that took.
    let fadeStart = null;

    const frame = now => {

        const t = now - start;

        const dt = Math.min(50, now - last) / 1000;

        last = now;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        ctx.clearRect(0, 0, w, h);

        //----------------------------------
        // Streaks (until the flash covers them)
        //----------------------------------

        if(t < RUSH_MS + FLASH_IN_MS){

            // 0 → 1 over the rush; speed grows steeply.
            const p = Math.min(1, t / RUSH_MS);

            const speed = 0.15 + 9 * p * p * p;

            ctx.globalCompositeOperation = "lighter";
            ctx.lineCap = "round";

            for(const s of streaks){

                const before = s.d;

                s.d *= 1 + speed * dt;

                if(s.d > 1.4){

                    // Off the edge: start again near the centre
                    // (as an ordinary streak from now on).
                    s.d = 0.03 + Math.random() * 0.25;

                    s.seed = false;
                    s.glow = 0;

                    continue;

                }

                // Tail length grows with speed.
                const tail = Math.max(before, s.d / (1 + speed * 0.08));

                const x1 = cx + Math.cos(s.a) * tail * reach;
                const y1 = cy + Math.sin(s.a) * tail * reach;
                const x2 = cx + Math.cos(s.a) * s.d * reach;
                const y2 = cy + Math.sin(s.a) * s.d * reach;

                // A real star starts fully bright, at its own size
                // (a zero-length round line is a dot); the others
                // fade in as the jump speeds up.
                const alpha = s.seed
                    ? Math.min(1, s.d * 8)
                    : Math.min(1, 0.25 + p * 0.9) * Math.min(1, s.d * 3);

                // A coloured glow: its halo first, a wide soft
                // trail in its colour, under the bright core.
                if(s.glow){

                    ctx.strokeStyle = `rgba(${s.hue},${alpha * 0.22})`;
                    ctx.lineWidth = Math.max(4, s.glow * 0.32);

                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();

                    ctx.strokeStyle = `rgba(${s.hue},${alpha * 0.45})`;
                    ctx.lineWidth = Math.max(2, s.glow * 0.12);

                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();

                }

                ctx.strokeStyle = `rgba(${s.hue},${alpha})`;
                ctx.lineWidth = s.seed
                    ? Math.max(s.r * 2, 0.6 + s.d * (1 + p * 2.2))
                    : 0.6 + s.d * (1 + p * 2.2);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

            }

            //----------------------------------
            // Shooting stars, over the streaks
            //----------------------------------

            for(const m of shooting){

                if(m.gone || t < m.born) continue;

                const age = t - m.born;

                const alpha = Math.min(1, age / METEOR_FADE_IN_MS);

                let x, y, dx, dy;

                if(m.real){

                    // Its own way, faster as the jump builds
                    // (v is per 60th of a second).
                    const k = m.v * dt * 60 * (1 + speed * 0.9);

                    m.x += m.dx * k;
                    m.y += m.dy * k;

                    x = m.x; y = m.y; dx = m.dx; dy = m.dy;

                    if(x < -600 || x > w + 600 || y < -600 || y > h + 600){ m.gone = true; continue; }

                } else {

                    // Straight out from the middle, like the
                    // streaks but quicker.
                    m.d *= 1 + (1.1 + speed * 1.4) * dt;

                    if(m.d > 1.35){ m.gone = true; continue; }

                    dx = Math.cos(m.a); dy = Math.sin(m.a);

                    x = cx + dx * m.d * reach;
                    y = cy + dy * m.d * reach;

                }

                // Tails stretch as the jump speeds up.
                drawMeteor(x, y, dx, dy, m.length * (1 + p * 1.8), m.thickness, m.brightness, alpha);

            }

            ctx.globalCompositeOperation = "source-over";

        }

        //----------------------------------
        // The flash
        //----------------------------------

        let flash = 0;

        if(t > RUSH_MS - FLASH_IN_MS && t <= RUSH_MS){

            flash = (t - (RUSH_MS - FLASH_IN_MS)) / FLASH_IN_MS;

        } else if(t > RUSH_MS){

            if(peaked && fadeStart === null) fadeStart = now;

            // Eased so the light clears quickly at first and
            // the map is soon showing through.
            const f = fadeStart === null ? 0 : Math.min(1, (now - fadeStart) / FLASH_OUT_MS);

            flash = (1 - f) * (1 - f);

        }

        if(flash > 0){

            // Bright in the middle, a little cooler at the
            // edges.
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach);

            g.addColorStop(0, `rgba(255,255,255,${flash})`);
            g.addColorStop(0.6, `rgba(225,238,255,${flash})`);
            g.addColorStop(1, `rgba(170,200,255,${flash * 0.92})`);

            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);

        }

        //----------------------------------
        // The logo, over the streaks and the light
        //----------------------------------

        let logoW = 0;

        if(home){

            const p = Math.min(1, t / RUSH_MS);

            const grow = 1 + LOGO_GROW * p * p;

            let x = home.x, y = home.y, lw = home.w * grow, lh = home.h * grow;

            let alpha = 1;

            if(fadeStart !== null){

                // Ride along with the map's logo underneath,
                // and fade into it.
                // (Eased over the first moment, as the two
                // logos aren't quite the same shape.)
                const to = followTo && followTo();

                if(to){

                    const m = Math.min(1, (now - fadeStart) / LOGO_MATCH_MS);
                    const k = m * m * (3 - 2 * m);

                    x += (to.x - x) * k;
                    y += (to.y - y) * k;
                    lw += (to.width - lw) * k;
                    lh += (to.height - lh) * k;

                }

                const f = Math.min(1, (now - fadeStart) / LOGO_OUT_MS);

                alpha = 1 - f * f * (3 - 2 * f);

            }

            if(alpha > 0){

                ctx.globalAlpha = alpha;

                // Red glow, like the logo's own on the landing.
                ctx.shadowColor = `rgba(230,36,41,${0.55 + 0.35 * p})`;
                ctx.shadowBlur = 40 + 50 * p;

                ctx.drawImage(logo, x - lw / 2, y - lh / 2, lw, lh);

                ctx.shadowColor = "transparent";
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;

            }

            logoW = lw;

        }

        if(!peaked && t >= RUSH_MS){

            peaked = true;

            peakResolve(home ? { x: home.x, y: home.y, width: logoW } : null);

        }

        if(fadeStart === null || now - fadeStart < Math.max(FLASH_OUT_MS, home ? LOGO_OUT_MS : 0)){

            requestAnimationFrame(frame);

        } else {

            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            canvas.classList.remove("show");

            doneResolve();

        }

    };

    requestAnimationFrame(frame);

    return { peak, done };

}
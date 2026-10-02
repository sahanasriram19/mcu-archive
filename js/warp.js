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
// Drawn on its own canvas laid over everything. Off with
// the OS "reduce motion" setting.
//==================================================

const STREAK_COUNT = 320;

const RUSH_MS = 1350;       // streaks speeding up (was 820)
const FLASH_IN_MS = 380;    // light builds over the end of the rush
const FLASH_OUT_MS = 750;   // light fades, revealing the map (was 950)
const LOGO_OUT_MS = 900;    // the jump's logo hands over to the map's
const LOGO_MATCH_MS = 300; // ...easing onto its shape over this long
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
//
// Returns { peak, done }: `peak` resolves at the full flash
// with where the logo is then ({x, y, width}, or null
// without one), `done` when the light has faded away.
export function playWarp({ logo = null, followTo = null } = {}){

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
    const streaks = Array.from({ length: STREAK_COUNT }, () => ({
        a: Math.random() * Math.PI * 2,
        d: 0.04 + Math.random() * 0.9,
        hue: Math.random() < 0.25 ? "255,190,170" : (Math.random() < 0.5 ? "190,220,255" : "255,255,255")
    }));

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

                    // Off the edge: start again near the centre.
                    s.d = 0.03 + Math.random() * 0.25;

                    continue;

                }

                // Tail length grows with speed.
                const tail = Math.max(before, s.d / (1 + speed * 0.08));

                const x1 = cx + Math.cos(s.a) * tail * reach;
                const y1 = cy + Math.sin(s.a) * tail * reach;
                const x2 = cx + Math.cos(s.a) * s.d * reach;
                const y2 = cy + Math.sin(s.a) * s.d * reach;

                ctx.strokeStyle = `rgba(${s.hue},${Math.min(1, 0.25 + p * 0.9) * Math.min(1, s.d * 3)})`;
                ctx.lineWidth = 0.6 + s.d * (1 + p * 2.2);

                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();

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
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
// Drawn on its own small canvas laid over everything, at
// 1x resolution (streaks don't need more). Off with the OS
// "reduce motion" setting.
//==================================================

const STREAK_COUNT = 320;

const RUSH_MS = 1350;       // streaks speeding up (was 820)
const FLASH_IN_MS = 380;    // light builds over the end of the rush
const FLASH_OUT_MS = 950;   // light fades, revealing the map

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const canvas = document.createElement("canvas");

canvas.id = "warp";

document.body.appendChild(canvas);

const ctx = canvas.getContext("2d");

export function canWarp(){

    return !reduceMotion.matches;

}

// Returns { peak, done }: `peak` resolves at the full
// flash, `done` when it has faded away.
export function playWarp(){

    const w = canvas.width = window.innerWidth;
    const h = canvas.height = window.innerHeight;

    const cx = w / 2, cy = h / 2;

    const reach = Math.hypot(cx, cy);

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

            flash = fadeStart === null ? 1 : 1 - Math.min(1, (now - fadeStart) / FLASH_OUT_MS);

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

        if(!peaked && t >= RUSH_MS){

            peaked = true;

            peakResolve();

        }

        if(fadeStart === null || now - fadeStart < FLASH_OUT_MS){

            requestAnimationFrame(frame);

        } else {

            ctx.clearRect(0, 0, w, h);

            canvas.classList.remove("show");

            doneResolve();

        }

    };

    requestAnimationFrame(frame);

    return { peak, done };

}
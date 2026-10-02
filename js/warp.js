//==================================================
// HYPERSPACE JUMP
//
// Plays when you enter the archive from the landing page:
// stars gather and pull back for a moment, then stretch
// into streaks rushing past from the centre — faster and
// faster, the field twisting into a tunnel of blue light
// with a little shake — until the light bursts open from
// the middle. It clears with a shockwave ring racing out
// across the mind map waiting on the other side.
//
// The map is set up at the moment of the flash (app.js
// waits for `peak`), so any brief hitch while it appears
// happens behind the light rather than on screen.
//
// Drawn on its own small canvas laid over everything, at
// 1x resolution (streaks don't need more). Off with the OS
// "reduce motion" setting.
//==================================================

const STAR_COUNT = 420;

const CHARGE_MS = 380;      // stars appear and pull back, building up
const RUSH_MS = 1500;       // the jump: from the start to the flash
const FLASH_IN_MS = 420;    // light opens from the centre at the end of the rush
const FLASH_OUT_MS = 950;   // light fades, revealing the map
const RING_MS = 900;        // the shockwave ring after the flash

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

    // Stars in 3D: (x, y) across the view, z = how far ahead
    // (1 = far, 0 = right at you). Projected with perspective,
    // so they fan out from the centre and stretch into streaks
    // as you speed up, just like the real thing in films.
    const focal = reach * 0.42;

    const newStar = far => ({
        x: (Math.random() * 2 - 1) * 1.4,
        y: (Math.random() * 2 - 1) * 1.4,
        z: far ? 0.75 + Math.random() * 0.25 : 0.08 + Math.random() * 0.92,
        // Mostly white and ice-blue, a few warmer ones.
        hue: Math.random() < 0.15 ? "255,200,180" : (Math.random() < 0.55 ? "170,210,255" : "255,255,255"),
        twinkle: Math.random() * Math.PI * 2
    });

    const stars = Array.from({ length: STAR_COUNT }, () => newStar(false));

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

    let spin = 0;

    const project = (st, z) => ({
        x: cx + (st.x / z) * focal,
        y: cy + (st.y / z) * focal
    });

    const frame = now => {

        const t = now - start;

        const dt = Math.min(50, now - last) / 1000;

        last = now;

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, w, h);

        // 0 → 1 over the whole jump; the rush part only after
        // the charge.
        const p = Math.min(1, t / RUSH_MS);
        const rush = Math.max(0, (t - CHARGE_MS) / (RUSH_MS - CHARGE_MS));
        const r = Math.min(1, rush);

        if(t < RUSH_MS + FLASH_IN_MS){

            //----------------------------------
            // Deep space closing in behind the
            // streaks (the landing fades under it)
            //----------------------------------

            ctx.fillStyle = `rgba(3,5,12,${Math.min(0.92, p * 1.3)})`;
            ctx.fillRect(0, 0, w, h);

            //----------------------------------
            // A small shake as it nears the jump
            //----------------------------------

            const shake = Math.pow(r, 4) * 5;

            ctx.translate(
                cx + (Math.random() - 0.5) * shake,
                cy + (Math.random() - 0.5) * shake
            );

            // The whole field slowly twists, like a vortex.
            spin += dt * (0.05 + 0.6 * r * r);

            ctx.rotate(spin);

            ctx.translate(-cx, -cy);

            //----------------------------------
            // The tunnel: light gathering at the
            // centre, blue with a Marvel-red rim
            //----------------------------------

            const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, reach * (0.25 + r * 0.45));

            glow.addColorStop(0, `rgba(210,230,255,${0.08 + 0.55 * r * r})`);
            glow.addColorStop(0.4, `rgba(90,140,255,${0.05 + 0.22 * r * r})`);
            glow.addColorStop(0.8, `rgba(230,36,41,${0.04 * r})`);
            glow.addColorStop(1, "rgba(0,0,0,0)");

            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, w, h);

            //----------------------------------
            // Stars → streaks
            //----------------------------------

            // Charging: a gentle drift backwards (they pull in
            // towards the centre). Then the jump: speed climbs
            // steeply.
            const speed = t < CHARGE_MS
                ? -0.06
                : 0.08 + 3.4 * Math.pow(r, 2.4);

            // How long a streak's tail is, in depth.
            const trail = Math.max(0, speed) * 0.085;

            // Stars fade in during the charge.
            const appear = Math.min(1, t / CHARGE_MS);

            ctx.globalCompositeOperation = "lighter";
            ctx.lineCap = "round";

            for(const st of stars){

                st.z -= speed * dt;

                if(st.z > 1.2) st.z = 1.2;

                const head = project(st, st.z);

                if(st.z < 0.02 || head.x < -60 || head.x > w + 60 || head.y < -60 || head.y > h + 60){

                    Object.assign(st, newStar(true));

                    continue;

                }

                const near = 1 - Math.min(1, st.z);   // 0 far → 1 close

                const alpha = appear * Math.min(1, 0.25 + near * 1.1) *
                    (t < CHARGE_MS ? 0.75 + 0.25 * Math.sin(st.twinkle + t * 0.02) : 1);

                if(trail < 0.002){

                    // Still a point of light.
                    ctx.fillStyle = `rgba(${st.hue},${alpha})`;
                    ctx.fillRect(head.x - 0.8, head.y - 0.8, 1.6 + near * 1.6, 1.6 + near * 1.6);

                    continue;

                }

                const tail = project(st, Math.min(1.2, st.z + trail));

                ctx.strokeStyle = `rgba(${st.hue},${alpha})`;
                ctx.lineWidth = 0.5 + near * near * (1.5 + r * 2.5);

                ctx.beginPath();
                ctx.moveTo(tail.x, tail.y);
                ctx.lineTo(head.x, head.y);
                ctx.stroke();

            }

            ctx.globalCompositeOperation = "source-over";

            ctx.setTransform(1, 0, 0, 1, 0, 0);

        }

        //----------------------------------
        // The flash: light opens out from the
        // centre like an iris, holds while the
        // map is set up behind it, then fades
        //----------------------------------

        let open = 0;      // 0 → 1: how far the light has spread
        let flash = 0;     // overall strength

        if(t > RUSH_MS - FLASH_IN_MS && t <= RUSH_MS){

            const f = (t - (RUSH_MS - FLASH_IN_MS)) / FLASH_IN_MS;

            open = f * f;
            flash = 1;

        } else if(t > RUSH_MS){

            if(peaked && fadeStart === null) fadeStart = now;

            open = 1;
            flash = fadeStart === null ? 1 : 1 - Math.min(1, (now - fadeStart) / FLASH_OUT_MS);

        }

        if(flash > 0 && open > 0){

            const radius = reach * (0.05 + open * 1.25);

            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);

            g.addColorStop(0, `rgba(255,255,255,${flash})`);
            g.addColorStop(0.55, `rgba(230,240,255,${flash})`);
            g.addColorStop(0.85, `rgba(170,200,255,${flash * 0.85})`);
            g.addColorStop(1, `rgba(170,200,255,${open >= 1 ? flash * 0.85 : 0})`);

            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);

        }

        //----------------------------------
        // Shockwave: a bright ring racing out
        // across the map as the light clears
        //----------------------------------

        if(fadeStart !== null){

            const k = (now - fadeStart) / RING_MS;

            if(k < 1){

                const ease = 1 - Math.pow(1 - k, 3);

                ctx.globalCompositeOperation = "lighter";

                ctx.strokeStyle = `rgba(190,215,255,${(1 - k) * 0.7})`;
                ctx.lineWidth = 2 + 26 * (1 - k);

                ctx.beginPath();
                ctx.arc(cx, cy, reach * (0.15 + ease * 1.1), 0, Math.PI * 2);
                ctx.stroke();

                ctx.strokeStyle = `rgba(255,255,255,${(1 - k) * 0.9})`;
                ctx.lineWidth = 1.5 + 4 * (1 - k);
                ctx.stroke();

                ctx.globalCompositeOperation = "source-over";

            }

        }

        if(!peaked && t >= RUSH_MS){

            peaked = true;

            peakResolve();

        }

        const finished = fadeStart !== null &&
            now - fadeStart >= Math.max(FLASH_OUT_MS, RING_MS);

        if(!finished){

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
//==================================================
// HYPERSPACE JUMP
//
// Plays when you enter the archive from the landing page:
// stars gather and pull back for a moment, then stretch
// into streaks rushing past from the centre — faster and
// faster, the whole field turning one full revolution as
// it becomes a tunnel of blue light, with colour fringes
// on the nearest streaks and a little shake — until the
// light bursts open from the middle with a wide lens
// flare, and clears to reveal the mind map.
//
// The map is set up at the moment of the flash (app.js
// waits for `peak`), so any brief hitch while it appears
// happens behind the light rather than on screen.
//
// Drawn on its own small canvas laid over everything, at
// 1x resolution (streaks don't need more). Off with the OS
// "reduce motion" setting.
//==================================================

const STAR_COUNT = 480;

const CHARGE_MS = 650;      // stars appear and pull back, building up
const RUSH_MS = 2400;       // the jump: from the start to the flash
const FLASH_IN_MS = 520;    // light opens from the centre at the end of the rush
const FLASH_OUT_MS = 1400;  // light and streaks fade together, revealing the map
const FLARE_MS = 900;       // the lens flare across the middle at the flash

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

        // Once the map is set up behind the light, everything
        // here — the dark backdrop, the streaks, the light —
        // fades out together, smoothly, so the map is revealed
        // gradually rather than appearing all at once.
        if(peaked && fadeStart === null) fadeStart = now;

        const out = fadeStart === null ? 0 : Math.min(1, (now - fadeStart) / FLASH_OUT_MS);

        const layer = 1 - out * out * (3 - 2 * out);   // smooth 1 → 0

        if(layer > 0){

            ctx.globalAlpha = layer;

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

            // The whole field turns one full revolution over
            // the jump, starting gently and picking up speed,
            // so it lands exactly where it began as the light
            // opens.
            const turn = r < 1 ? r * r * (3 - 2 * r) : 1;

            ctx.rotate(turn * Math.PI * 2);

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
            // (Easing off again as everything fades out.)
            const speed = t < CHARGE_MS
                ? -0.06
                : (0.08 + 3.4 * Math.pow(r, 2.4)) * (0.35 + 0.65 * layer);

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

                const width = 0.5 + near * near * (1.5 + r * 2.5);

                // Colour fringes on the nearest, fastest streaks:
                // a red and a blue copy pulled slightly apart,
                // like light splitting through a lens.
                if(r > 0.45 && near > 0.55){

                    const split = (r - 0.45) * near * 5;

                    const dx = (head.x - cx) / reach * split;
                    const dy = (head.y - cy) / reach * split;

                    ctx.lineWidth = width;

                    ctx.strokeStyle = `rgba(255,60,80,${alpha * 0.45})`;
                    ctx.beginPath();
                    ctx.moveTo(tail.x + dx, tail.y + dy);
                    ctx.lineTo(head.x + dx, head.y + dy);
                    ctx.stroke();

                    ctx.strokeStyle = `rgba(60,160,255,${alpha * 0.45})`;
                    ctx.beginPath();
                    ctx.moveTo(tail.x - dx, tail.y - dy);
                    ctx.lineTo(head.x - dx, head.y - dy);
                    ctx.stroke();

                }

                ctx.strokeStyle = `rgba(${st.hue},${alpha})`;
                ctx.lineWidth = width;

                ctx.beginPath();
                ctx.moveTo(tail.x, tail.y);
                ctx.lineTo(head.x, head.y);
                ctx.stroke();

            }

            ctx.globalCompositeOperation = "source-over";

            ctx.setTransform(1, 0, 0, 1, 0, 0);

            ctx.globalAlpha = 1;

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

            open = 1;
            flash = layer;

        }

        if(flash > 0 && open > 0){

            const radius = reach * (0.05 + open * 1.25);

            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);

            // A soft edge, so it reads as light spreading, not
            // a disc.
            g.addColorStop(0, `rgba(255,255,255,${flash})`);
            g.addColorStop(0.35, `rgba(235,243,255,${flash})`);
            g.addColorStop(0.7, `rgba(180,205,255,${flash * (open >= 1 ? 0.9 : 0.6)})`);
            g.addColorStop(1, `rgba(170,200,255,${open >= 1 ? flash * 0.85 : 0})`);

            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);

        }

        //----------------------------------
        // Lens flare: a wide streak of blue
        // light across the middle of the
        // screen as the light bursts open,
        // stretching out and fading
        //----------------------------------

        const flareT = t - (RUSH_MS - FLASH_IN_MS * 0.5);

        if(flareT > 0 && flareT < FLARE_MS){

            const k = flareT / FLARE_MS;

            const strength = Math.sin(Math.PI * Math.min(1, k * 1.4)) * (1 - k * 0.5);

            const len = w * (0.3 + k * 0.9);

            const band = ctx.createLinearGradient(cx - len, 0, cx + len, 0);

            band.addColorStop(0, "rgba(120,170,255,0)");
            band.addColorStop(0.5, `rgba(200,225,255,${strength * 0.9})`);
            band.addColorStop(1, "rgba(120,170,255,0)");

            ctx.globalCompositeOperation = "lighter";

            ctx.fillStyle = band;

            const thick = 3 + 10 * (1 - k);

            ctx.fillRect(cx - len, cy - thick / 2, len * 2, thick);

            // A fainter, wider haze around it.
            ctx.globalAlpha = 0.35;
            ctx.fillRect(cx - len, cy - thick * 3, len * 2, thick * 6);
            ctx.globalAlpha = 1;

            ctx.globalCompositeOperation = "source-over";

        }

        if(!peaked && t >= RUSH_MS){

            peaked = true;

            peakResolve();

        }

        const finished = fadeStart !== null &&
            now - fadeStart >= FLASH_OUT_MS &&
            t > RUSH_MS - FLASH_IN_MS * 0.5 + FLARE_MS;

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
//==================================================
// LANDING PARALLAX
//
// On the landing page, things sit at different depths and
// shift with the mouse by different amounts: the glowing
// ring most, the title and description a little, and the
// starfield behind drifts the other way (the stars already
// sit at different depths, so near ones move more than far
// ones). It makes the first page feel like a scene you're
// looking into rather than a flat page.
//
// Mouse only, while the hero is showing; off with the OS
// "reduce motion" setting. The look is in css/tilt.css —
// this sets --px / --py (-0.5 … 0.5) on #landing-card.
//==================================================

import { camera } from "./camera.js";

const STAR_SHIFT_X = 420;     // how far the starfield drifts (world units)
const STAR_SHIFT_Y = 260;
const EASE = 0.08;            // how softly it follows the mouse

const landing = document.getElementById("landing");
const card = document.getElementById("landing-card");

const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let targetX = 0, targetY = 0;
let x = 0, y = 0;

let running = false;

// Only while the hero is on screen (not mid-flight, not in
// the archive).
export function heroShowing(){

    return landing.style.display !== "none" &&
        !landing.classList.contains("leaving") &&
        landing.scrollTop < window.innerHeight * 0.4;

}

function frame(){

    x += (targetX - x) * EASE;
    y += (targetY - y) * EASE;

    card.style.setProperty("--px", x.toFixed(4));
    card.style.setProperty("--py", y.toFixed(4));

    if(heroShowing()){

        // The starfield drifts the opposite way.
        camera.targetX = -x * STAR_SHIFT_X;
        camera.targetY = -y * STAR_SHIFT_Y;

    }

    const settled = Math.abs(targetX - x) < 0.0005 && Math.abs(targetY - y) < 0.0005;

    if(settled){

        running = false;

        return;

    }

    requestAnimationFrame(frame);

}

function wake(){

    if(running) return;

    running = true;

    requestAnimationFrame(frame);

}

export function initParallax(){

    if(!landing || !card) return;

    landing.addEventListener("pointermove", e => {

        if(!fine.matches || reduceMotion.matches || e.pointerType !== "mouse") return;

        if(!heroShowing()){

            targetX = targetY = 0;

        } else {

            targetX = e.clientX / window.innerWidth - 0.5;
            targetY = e.clientY / window.innerHeight - 0.5;

        }

        wake();

    }, { passive: true });

    // Mouse leaves the window, or the flight starts: settle
    // back to the middle.
    landing.addEventListener("pointerleave", () => { targetX = targetY = 0; wake(); });

    landing.addEventListener("scroll", () => {

        if(!heroShowing() && (targetX || targetY)){

            targetX = targetY = 0;

            // Starfield back to centre for the flight.
            camera.targetX = 0;
            camera.targetY = 0;

            wake();

        }

    }, { passive: true });

}
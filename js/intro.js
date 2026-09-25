//==================================================
// 3D FLY-THROUGH INTRO
//
// Scrolling the landing page flies a camera forward
// through space. Each MCU phase opens with a chapter
// title in its colour; its titles then float past on
// alternating sides, angled towards you. Phases come in
// the order they began (so the Netflix "Phase 0" shows
// sit between Phase 2 and Phase 3), and a final "Coming
// soon" chapter holds the titles not out yet. At the end,
// the way into the archive appears.
//
// How it works: #landing is a scroll container. Its
// scroll position (smoothed) becomes a camera depth, and
// every poster is moved with translate3d() inside a
// CSS-perspective stage — the browser's own 3D, no
// library. Only the handful of items near the camera are
// drawn; the rest are hidden.
//
// Clicking a poster opens its details card. "Skip to the
// archive" appears once you start. The OS "reduce motion"
// setting turns the whole thing off (just the hero shows).
//==================================================

import { camera } from "./camera.js";
import { showMovieDetails } from "./movieDetails.js";
import { groupName } from "./worlds.js";
import { HIGHLIGHT_COLOURS } from "./branchNodes.js";
import { isUpcoming } from "./upcoming.js";

const landing = document.getElementById("landing");
const stage = document.getElementById("intro-stage");
const spacer = document.querySelector(".intro-spacer");
const hero = document.getElementById("landing-card");
const branches = document.getElementById("landing-branches");
const hint = document.querySelector(".intro-scroll-hint");
const skipBtn = document.getElementById("intro-skip");
const endEl = document.getElementById("intro-end");
const endBtn = document.getElementById("intro-end-enter");

//--------------------------------------------------
// Tuning
//--------------------------------------------------

const START_GAP = 1500;       // depth before the first chapter
const CHAPTER_GAP = 1300;     // chapter title -> its first poster
const POSTER_GAP = 430;       // poster -> poster
const GROUP_GAP = 700;        // extra space before the next chapter
const END_GAP = 900;          // after the last poster

const SCROLL_PER_DEPTH = 0.24; // px of scrolling per unit of depth

const FADE_IN_FAR = -4400;    // items appear from here...
const FADE_IN_NEAR = -3000;   // ...fully visible from here
const FADE_OUT_START = 350;   // start fading as they pass...
const FADE_OUT_END = 850;     // ...gone by here

const SMOOTHING = 0.12;       // camera easing per frame

const STAR_ZOOM = 0.28;       // starfield zoom at the start...
const STAR_ZOOM_BOOST = 1.6;  // ...rises by this factor to the end

const reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let items = [];
let totalDepth = 1;
let active = false;
let smooth = 0;
let onEnterCb = null;

// Deterministic "random" per index, so the scene is the
// same on every visit.
const jitter = (i, salt) => {

    const v = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;

    return v - Math.floor(v);   // 0..1

};

//--------------------------------------------------
// Build
//--------------------------------------------------

function yearRange(members){

    const ys = members.map(n => +n.release.slice(0, 4));

    const a = Math.min(...ys), b = Math.max(...ys);

    return a === b ? `${a}` : `${a}–${b}`;

}

function makeChapter(kicker, title, sub, colour){

    const el = document.createElement("div");

    el.className = "intro-item intro-chapter";
    el.style.setProperty("--c", colour);

    el.innerHTML = `
        <div class="intro-chapter-kicker"></div>
        <div class="intro-chapter-title"></div>
        <div class="intro-chapter-sub"></div>
    `;

    el.querySelector(".intro-chapter-kicker").textContent = kicker;
    el.querySelector(".intro-chapter-title").textContent = title;
    el.querySelector(".intro-chapter-sub").textContent = sub;

    return el;

}

function makePoster(node){

    const el = document.createElement("div");

    el.className = "intro-item";

    el.innerHTML = `
        <div class="intro-poster" role="button" tabindex="-1">
            <div class="intro-poster-title"></div>
        </div>
        <div class="intro-caption"><span></span><small></small></div>
    `;

    const poster = el.querySelector(".intro-poster");

    poster.style.setProperty("--c", node.colour || "255,255,255");

    el.querySelector(".intro-poster-title").textContent = node.title;
    el.querySelector(".intro-caption span").textContent = node.title;
    el.querySelector(".intro-caption small").textContent =
        isUpcoming(node) ? "Coming " + node.release.slice(0, 4) : node.release.slice(0, 4);

    poster.addEventListener("click", () => showMovieDetails(node));

    return { el, poster };

}

function posterWidth(){

    return window.innerWidth >= 900 ? 220 : 140;

}

export function initIntro(nodes, onEnter){

    onEnterCb = onEnter;

    skipBtn.addEventListener("click", () => onEnterCb && onEnterCb());
    endBtn.addEventListener("click", () => onEnterCb && onEnterCb());

    if(reduceMotion) return;

    // "Scroll to fly through the MCU" also works as a
    // button: it gets the flight going.
    hint.addEventListener("click", () =>
        landing.scrollBy({ top: Math.round(window.innerHeight * 0.9), behavior: "smooth" })
    );

    const titles = nodes.filter(n => !n.isBranch && n.status !== "cancelled");

    const released = titles.filter(n => !isUpcoming(n));
    const upcoming = titles.filter(n => isUpcoming(n));

    // Group by phase, in the order each phase began.
    const byPhase = {};

    released.forEach(n => (byPhase[n.phase] = byPhase[n.phase] || []).push(n));

    const groups = Object.entries(byPhase)
        .map(([phase, members]) => ({
            phase: +phase,
            members: members.sort((a, b) => a.release.localeCompare(b.release))
        }))
        .sort((a, b) => a.members[0].release.localeCompare(b.members[0].release));

    if(upcoming.length){

        groups.push({
            phase: null,
            members: upcoming.sort((a, b) => a.release.localeCompare(b.release))
        });

    }

    let depth = START_GAP;

    let side = -1;

    let index = 0;

    groups.forEach(group => {

        const colour = group.phase === null
            ? "230,36,41"
            : (HIGHLIGHT_COLOURS[group.phase] || "255,255,255");

        const chapter = group.phase === null
            ? makeChapter("Still to come", "Coming Soon", `${group.members.length} title${group.members.length === 1 ? "" : "s"} on the way`, colour)
            : makeChapter(
                "The Marvel Cinematic Universe",
                groupName(group.phase),
                `${yearRange(group.members)} · ${group.members.length} titles`,
                colour
            );

        stage.appendChild(chapter);

        items.push({ el: chapter, depth, xFrac: 0, y: -40, rot: 0, kind: "chapter" });

        depth += CHAPTER_GAP;

        group.members.forEach(node => {

            const { el, poster } = makePoster(node);

            stage.appendChild(el);

            // Alternate left/right; a little variety in how
            // far out, how high, and how much it's angled.
            const xFrac = side * (0.2 + jitter(index, 1) * 0.1);
            const yFrac = (jitter(index, 2) - 0.5) * 0.22;
            const rot = -side * (14 + jitter(index, 3) * 10);

            items.push({ el, poster, node, depth, xFrac, yFrac, rot, kind: "poster", imgSet: false });

            depth += POSTER_GAP;

            side = -side;

            index++;

        });

        depth += GROUP_GAP;

    });

    totalDepth = depth + END_GAP;

    // Nearer items paint over farther ones (the stage is
    // flat-composited, so DOM order would decide otherwise).
    items.forEach((it, i) => { it.el.style.zIndex = String(items.length - i); });

    layout();

    window.addEventListener("resize", layout);

    active = true;

    requestAnimationFrame(frame);

}

// Scroll length and poster size depend on the screen.
function layout(){

    const pw = posterWidth();

    stage.style.setProperty("--pw", pw + "px");

    spacer.style.height = Math.round(totalDepth * SCROLL_PER_DEPTH) + "px";

}

//--------------------------------------------------
// Per frame
//--------------------------------------------------

const clamp01 = v => Math.max(0, Math.min(1, v));

function frame(){

    if(!active) return;

    requestAnimationFrame(frame);

    // Nothing to do while the landing page is hidden.
    if(landing.style.display === "none") return;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const pw = posterWidth();

    const max = Math.max(1, landing.scrollHeight - landing.clientHeight);

    const target = clamp01(landing.scrollTop / max);

    smooth += (target - smooth) * SMOOTHING;

    if(Math.abs(target - smooth) < 0.00005) smooth = target;

    const scrolled = smooth * max;

    const camZ = smooth * totalDepth;

    //--------------------------------------------------
    // Hero fades and drifts up as the flight begins
    //--------------------------------------------------

    const heroT = clamp01(scrolled / (vh * 0.45));

    hero.style.opacity = String(1 - heroT);
    hero.style.transform = `translateY(${-heroT * 60}px) scale(${1 - heroT * 0.08})`;
    hero.style.pointerEvents = heroT > 0.5 ? "none" : "";

    branches.style.opacity = String(1 - heroT);

    hint.style.opacity = String(1 - clamp01(heroT * 3));

    skipBtn.classList.toggle("show", heroT > 0.6 && smooth < 0.97);

    endEl.classList.toggle("show", smooth > 0.965);

    //--------------------------------------------------
    // Starfield rushes past a little faster as you go
    //--------------------------------------------------

    camera.targetZoom = STAR_ZOOM * (1 + smooth * STAR_ZOOM_BOOST);

    //--------------------------------------------------
    // Items
    //--------------------------------------------------

    for(const it of items){

        const rel = camZ - it.depth;   // < 0: still ahead of us

        const visible = rel > FADE_IN_FAR && rel < FADE_OUT_END;

        if(!visible){

            if(it.shown){ it.el.style.visibility = "hidden"; it.shown = false; }

            continue;

        }

        if(!it.shown){ it.el.style.visibility = "visible"; it.shown = true; }

        const fadeIn = clamp01((rel - FADE_IN_FAR) / (FADE_IN_NEAR - FADE_IN_FAR));
        const fadeOut = 1 - clamp01((rel - FADE_OUT_START) / (FADE_OUT_END - FADE_OUT_START));

        // Items stay out of sight until the hero has gone,
        // so nothing shows through it.
        it.el.style.opacity = String(Math.min(fadeIn, fadeOut) * heroT);

        // On narrow screens keep posters clear of the middle
        // (at least most of a poster's width out).
        const x = it.kind === "chapter"
            ? 0
            : Math.sign(it.xFrac) * Math.max(Math.abs(it.xFrac) * vw, pw * 0.85);
        const y = it.kind === "chapter" ? it.y : it.yFrac * vh;

        it.el.style.transform =
            `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${rel.toFixed(1)}px) rotateY(${it.rot}deg)`;

        // Poster art: loaded as it approaches (posters.js
        // fills node.poster in once TMDB answers).
        if(it.kind === "poster" && !it.imgSet && it.node.poster){

            const src = typeof it.node.poster === "string"
                ? it.node.poster
                : (it.node.poster.medium || it.node.poster.small);

            if(src){

                const img = new Image();

                img.alt = "";
                img.decoding = "async";
                img.src = src;

                img.onload = () => { it.poster.innerHTML = ""; it.poster.appendChild(img); };

                it.imgSet = true;

            }

        }

    }

}

//--------------------------------------------------
// Entering / coming back (app.js)
//--------------------------------------------------

export function setIntroActive(on){

    if(reduceMotion || !items.length) return;

    if(on){

        landing.scrollTop = 0;

        smooth = 0;

        if(!active){

            active = true;

            requestAnimationFrame(frame);

        }

    } else {

        active = false;

    }

}
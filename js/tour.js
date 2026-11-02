//==================================================
// WELCOME TOUR
//
// The first time someone enters the archive, a short guided
// tour points out what's on screen and what it does: a
// spotlight glides from one thing to the next (the map, a
// poster, the panel, search, the countdown…) with a card of
// tips beside it.
//
// • Shown once per browser (localStorage); the "?" button in
//   the panel (ui/panel.js) plays it again any time.
// • Waits for the map to finish opening, and for any open
//   details card to close (someone arriving from a shared
//   link sees their title first).
// • Mouse and touch get their own wording (drag vs swipe,
//   right-drag vs two fingers…).
// • Steps whose target isn't on screen (no upcoming
//   releases, say) are skipped.
// • Next / Back / Esc, or the arrow keys.
//
// The look is in css/tour.css.
//==================================================

import { graph } from "./graph.js";
import { camera } from "./camera.js";
import { nodeScreenRect } from "./nodes.js";
import { isCompact } from "./responsive.js";
import { focusNodes } from "./viewManager.js";

const DONE_KEY = "mcu-archive:tour-done";

// After the map has opened out (the jump + the posters
// branching out), so the tour starts on a settled screen.
const START_DELAY = 2600;

const touch = () => window.matchMedia("(hover: none), (pointer: coarse)").matches;

//--------------------------------------------------
// Things to point at
//--------------------------------------------------

const $ = sel => document.querySelector(sel);

const panel = () => $("#view-panel");

function rectOf(el){

    if(!el || !el.isConnected) return null;

    const s = getComputedStyle(el);

    if(s.display === "none" || s.visibility === "hidden") return null;

    const r = el.getBoundingClientRect();

    if(r.width < 4 || r.height < 4) return null;

    // Off screen?
    if(r.right < 0 || r.bottom < 0 || r.left > innerWidth || r.top > innerHeight) return null;

    return { left: r.left, top: r.top, width: r.width, height: r.height };

}

//--------------------------------------------------
// "Open any title": the camera flies in to a few posters
// from the same phase (on the overview they're only a few
// pixels big), the spotlight lands on one of them, and the
// camera goes back where it was on the next step.
//--------------------------------------------------

let pickedPoster = null;
let savedCamera = null;

function pickPoster(){

    const titles = graph.nodes.filter(n =>
        !n.isBranch && n.title && Number.isFinite(n.targetX) && Math.abs(n.targetX) < 50000
    );

    if(!titles.length) return null;

    // Something everyone knows: the earliest MCU film,
    // else whatever's on the map.
    const films = titles
        .filter(n => (n.world || "mcu") === "mcu" && n.type === "movie" && n.release)
        .sort((a, b) => a.release.localeCompare(b.release));

    return films[0] || titles[0];

}

function flyToPoster(){

    if(!pickedPoster) pickedPoster = pickPoster();

    if(!pickedPoster) return;

    if(!savedCamera) savedCamera = { x: camera.targetX, y: camera.targetY, zoom: camera.targetZoom };

    // It and its neighbours in the same phase.
    const n = pickedPoster;

    const group = graph.nodes
        .filter(m => !m.isBranch && m.world === n.world && m.phase === n.phase && Math.abs(m.targetX) < 50000)
        .sort((a, b) => Math.hypot(a.targetX - n.targetX, a.targetY - n.targetY) - Math.hypot(b.targetX - n.targetX, b.targetY - n.targetY))
        .slice(0, 6);

    focusNodes(group.length ? group : [n]);

    // Close enough to see the posters, not so close one
    // fills the screen.
    camera.targetZoom = Math.min(camera.targetZoom, isCompact() ? 0.3 : 0.24);

}

function flyBack(){

    if(!savedCamera) return;

    camera.targetX = savedCamera.x;
    camera.targetY = savedCamera.y;
    camera.targetZoom = savedCamera.zoom;

    savedCamera = null;

}

function posterRect(){

    return pickedPoster ? safeNodeRect(pickedPoster) : null;

}

function safeNodeRect(n){

    try {

        const r = nodeScreenRect(n, camera);

        if(!r) return null;

        const left = r.left ?? r.x, top = r.top ?? r.y;

        const width = r.width ?? r.w, height = r.height ?? r.h;

        if(![left, top, width, height].every(Number.isFinite)) return null;

        if(left + width < 40 || top + height < 40 || left > innerWidth - 40 || top > innerHeight - 40) return null;

        // Small on the overview: pad it out to something
        // you can see.
        const min = 56;

        const w = Math.max(width, min), h = Math.max(height, min * 1.4);

        return { left: left + width / 2 - w / 2, top: top + height / 2 - h / 2, width: w, height: h };

    } catch(err){

        return null;

    }

}

// The middle of the screen (for the map itself).
function mapRect(){

    const w = Math.min(innerWidth * 0.62, 760), h = Math.min(innerHeight * 0.5, 460);

    return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2 - (isCompact() ? 40 : 0), width: w, height: h };

}

//--------------------------------------------------
// Phones: the panel is a bar along the bottom; it's opened
// for the steps about what's inside it, and closed after.
//--------------------------------------------------

let openedPanel = false;

function setPanelOpen(open){

    const p = panel();

    if(!p || !isCompact()) return;

    const isOpen = p.classList.contains("expanded");

    if(open === isOpen) return;

    const toggle = p.querySelector(".view-panel-toggle");

    if(toggle) toggle.click();

    openedPanel = open;

}

//--------------------------------------------------
// The steps
//--------------------------------------------------

const ICON = {
    hand: `<svg viewBox="0 0 24 24"><path d="M8 13V5.5a1.5 1.5 0 0 1 3 0V12M11 11.5v-2a1.5 1.5 0 0 1 3 0V12M14 10.5a1.5 1.5 0 0 1 3 0V12M17 11.5a1.5 1.5 0 0 1 3 0V16a6 6 0 0 1-6 6h-1.5a6 6 0 0 1-4.6-2.2L4.6 15.6a1.6 1.6 0 0 1 2.4-2.1L8 14.6"/></svg>`,
    tilt: `<svg viewBox="0 0 24 24"><path d="M3 17l9 4 9-4M3 12l9 4 9-4M12 3l9 4-9 4-9-4z"/></svg>`,
    poster: `<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 15l2 2 4-4"/></svg>`
};

function steps(){

    const t = touch();

    return [

        {
            key: "welcome",
            title: "Welcome to the MCU Archive",
            body: `Every Marvel film and series, laid out as a map you can fly around. Here's a quick look at what you can do. It takes about 30 seconds.`,
            target: null
        },

        {
            key: "map",
            title: "Explore the map",
            target: mapRect,
            pad: 0,
            round: 24,
            body: `
                <ul class="tour-list">
                    <li>${ICON.hand}<span>${t ? "<b>Drag</b> to move around, <b>pinch</b> to zoom" : "<b>Drag</b> to move around, <b>scroll</b> to zoom"}</span></li>
                    <li>${ICON.tilt}<span>${t ? "<b>Slide two fingers</b> up or down to tilt it, <b>twist</b> to turn it" : "<b>Right-drag</b> (or Shift + drag) to tilt and turn it. <b>T</b> lays it flat"}</span></li>
                    <li><span class="tour-dot"></span><span>${t ? "Tap" : "Click"} a <b>logo</b> to fly into that world, or a <b>branch</b> to zoom into a phase</span></li>
                </ul>`
        },

        {
            key: "poster",
            title: "Open any title",
            target: posterRect,
            before: flyToPoster,
            pad: 8,
            round: 8,
            body: `${t ? "Tap" : "Click"} a poster for its card: the <b>trailer</b>, <b>where to watch</b> it, the cast, and what to <b>watch before</b> it.`
        },

        {
            key: "views",
            title: "Change the view",
            target: () => rectOf(panel()),
            before: () => setPanelOpen(true),
            pad: 6,
            round: 10,
            body: isCompact()
                ? `Tap the view's name at the bottom to open this. Each world (X-Men, Spider-Man, Fantastic Four…) has its own maps: <b>Phases</b>, <b>Release Order</b>, <b>Chronological Order</b> and <b>Character Journeys</b>.`
                : `Each world (X-Men, Spider-Man, Fantastic Four…) has its own maps. Open one for <b>Phases</b>, <b>Release Order</b>, <b>Chronological Order</b> and <b>Character Journeys</b>.`
        },

        {
            key: "search",
            title: "Search",
            target: () => rectOf($("#movie-search")),
            before: () => setPanelOpen(true),
            pad: 6,
            round: 8,
            body: `Type a title or a character's name to jump straight to it.`
        },

        {
            key: "countdown",
            title: "What's coming next",
            target: () => rectOf($("#countdown")),
            before: () => setPanelOpen(false),
            pad: 6,
            round: 10,
            body: `A live countdown to the next releases. ${t ? "Tap" : "Click"} one to see what to watch before it comes out.`
        },

        {
            key: "watched",
            title: "Keep track",
            target: null,
            before: () => setPanelOpen(false),
            icon: ICON.poster,
            body: `Tick the <span class="tour-tick">✓</span> on a title's card when you've seen it. Everything you've ticked is collected under <b>MCU → Watched</b>, and your progress shows beside each world in the panel.<br><br>It's saved in this browser only.`
        },

        {
            key: "reset",
            title: "Lost? Head back",
            target: () => rectOf($(".view-panel-reset")),
            pad: 6,
            round: 999,
            body: `This puts the map back to its usual angle and framing. The <b>?</b> beside it plays this tour again.`
        }

    ];

}

//--------------------------------------------------
// The overlay: a spotlight (a hole in a dark wash, made
// with a huge box-shadow) and a card beside it.
//--------------------------------------------------

let root = null;
let spot = null;
let card = null;

let list = [];
let index = 0;
let active = false;
let frame = 0;

function build(){

    if(root) return;

    root = document.createElement("div");
    root.id = "tour";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-labelledby", "tour-title");

    root.innerHTML = `
        <div class="tour-spot"></div>
        <div class="tour-card">
            <div class="tour-icon" aria-hidden="true"></div>
            <div class="tour-step"></div>
            <h3 class="tour-title" id="tour-title"></h3>
            <div class="tour-body"></div>
            <div class="tour-foot">
                <div class="tour-dots" aria-hidden="true"></div>
                <div class="tour-buttons">
                    <button type="button" class="tour-skip">Skip</button>
                    <button type="button" class="tour-back">Back</button>
                    <button type="button" class="tour-next">Next</button>
                </div>
            </div>
        </div>
    `;

    spot = root.querySelector(".tour-spot");
    card = root.querySelector(".tour-card");

    root.querySelector(".tour-next").addEventListener("click", next);
    root.querySelector(".tour-back").addEventListener("click", back);
    root.querySelector(".tour-skip").addEventListener("click", () => finish());

    // Nothing behind the tour reacts while it's up (the map,
    // and the phone panel's "tap outside to close").
    for(const type of ["pointerdown", "pointerup", "click", "wheel", "touchstart", "touchmove", "contextmenu"]){

        root.addEventListener(type, e => {

            e.stopPropagation();

            if(type === "wheel" || type === "touchmove" || type === "contextmenu") e.preventDefault();

        }, { passive: false });

    }

    document.body.appendChild(root);

}

function onKey(e){

    if(!active) return;

    if(e.key === "Escape"){

        e.preventDefault();
        e.stopImmediatePropagation();
        finish();

    } else if(e.key === "ArrowRight" || (e.key === "Enter" && !(document.activeElement && document.activeElement.tagName === "BUTTON"))){

        e.preventDefault();
        e.stopImmediatePropagation();
        next();

    } else if(e.key === "ArrowLeft"){

        e.preventDefault();
        e.stopImmediatePropagation();
        back();

    } else if(e.key.length === 1 || e.key.startsWith("Arrow")){

        // (T to tilt, typing into search… none of it while
        // the tour's up.)
        e.stopImmediatePropagation();

    }

}

// The step's target rectangle right now (things move: the
// panel sways with the mouse, the phone panel slides open),
// or null for a card in the middle.
function currentRect(step){

    if(!step.target) return null;

    const r = step.target();

    if(!r) return null;

    const pad = step.pad ?? 8;

    return { left: r.left - pad, top: r.top - pad, width: r.width + pad * 2, height: r.height + pad * 2 };

}

// Where the card goes: beside the spotlight, on whichever
// side has the most room; in the middle when there's none.
function placeCard(rect){

    const cw = card.offsetWidth, ch = card.offsetHeight;

    const gap = 16, edge = 12;

    let x, y;

    if(!rect){

        x = (innerWidth - cw) / 2;
        y = (innerHeight - ch) / 2;

    } else {

        const room = {
            right: innerWidth - (rect.left + rect.width),
            left: rect.left,
            below: innerHeight - (rect.top + rect.height),
            above: rect.top
        };

        const fitsSide = s => (s === "right" || s === "left") ? room[s] >= cw + gap + edge : room[s] >= ch + gap + edge;

        // Phones: above / below reads better than squeezing
        // in beside.
        const order = isCompact()
            ? ["above", "below", "right", "left"]
            : ["right", "below", "left", "above"];

        const side = order.find(fitsSide);

        const midX = rect.left + rect.width / 2 - cw / 2;
        const midY = rect.top + rect.height / 2 - ch / 2;

        if(side === "right"){ x = rect.left + rect.width + gap; y = midY; }
        else if(side === "left"){ x = rect.left - gap - cw; y = midY; }
        else if(side === "below"){ x = midX; y = rect.top + rect.height + gap; }
        else if(side === "above"){ x = midX; y = rect.top - gap - ch; }
        else {

            // Nowhere fits (a big target on a small screen):
            // along the bottom, over it.
            x = (innerWidth - cw) / 2;
            y = innerHeight - ch - edge - 8;

        }

    }

    x = Math.max(edge, Math.min(innerWidth - cw - edge, x));
    y = Math.max(edge, Math.min(innerHeight - ch - edge, y));

    card.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;

}

function placeSpot(rect, step){

    if(rect){

        spot.classList.remove("none");

        spot.style.transform = `translate(${Math.round(rect.left)}px, ${Math.round(rect.top)}px)`;
        spot.style.width = Math.round(rect.width) + "px";
        spot.style.height = Math.round(rect.height) + "px";
        spot.style.borderRadius = (step.round ?? 10) + "px";

    } else {

        // No target: the hole shrinks away to the middle, so
        // the whole screen dims.
        spot.classList.add("none");

        spot.style.transform = `translate(${Math.round(innerWidth / 2)}px, ${Math.round(innerHeight / 2)}px)`;
        spot.style.width = "0px";
        spot.style.height = "0px";

    }

}

// Every frame while the tour's up: follow the target.
function tick(){

    frame = 0;

    if(!active) return;

    const step = list[index];

    const rect = currentRect(step);

    placeSpot(rect, step);
    placeCard(rect);

    frame = requestAnimationFrame(tick);

}

function render(dir = 1){

    // Skip steps with nothing on screen to point at.
    while(list[index] && list[index].target){

        const step = list[index];

        if(step.key !== "poster") flyBack();

        if(step.before) step.before();

        if(currentRect(step)) break;

        // (The phone panel may still be sliding open: its
        // contents count as there.)
        if(isCompact() && (step.key === "search" || step.key === "views")) break;

        // (Likewise the camera, still flying to the poster.)
        if(step.key === "poster" && pickedPoster) break;

        index += dir;

    }

    if(index < 0){ index = 0; return render(1); }

    if(index >= list.length) return finish();

    const step = list[index];

    if(!step.target){

        flyBack();

        if(step.before) step.before();

    }

    const shown = list.length;

    card.classList.remove("in");

    // Re-trigger the text's fade-in.
    void card.offsetWidth;

    card.querySelector(".tour-step").textContent = `${index + 1} of ${shown}`;
    card.querySelector(".tour-title").textContent = step.title;
    card.querySelector(".tour-body").innerHTML = step.body;

    const icon = card.querySelector(".tour-icon");

    icon.innerHTML = step.icon || "";
    icon.style.display = step.icon ? "" : "none";

    card.querySelector(".tour-dots").innerHTML =
        list.map((_, i) => `<span class="${i === index ? "on" : i < index ? "past" : ""}"></span>`).join("");

    const backBtn = card.querySelector(".tour-back");
    const nextBtn = card.querySelector(".tour-next");

    backBtn.style.display = index === 0 ? "none" : "";
    nextBtn.textContent = index === 0 ? "Show me" : index === list.length - 1 ? "Got it" : "Next";

    card.classList.toggle("centered", !step.target);
    card.classList.add("in");

    nextBtn.focus({ preventScroll: true });

}

function next(){

    if(index >= list.length - 1) return finish();

    index++;

    render(1);

}

function back(){

    if(index <= 0) return;

    index--;

    render(-1);

}

export function startTour(){

    if(active) return;

    // Not over a details card or the landing page.
    const overlay = $("#movie-details-overlay");

    if(overlay && (overlay.classList.contains("open") || overlay.classList.contains("dim"))) return;

    if($("#viewport") && $("#viewport").style.display === "none") return;

    build();

    list = steps();
    index = 0;
    pickedPoster = null;
    savedCamera = null;
    active = true;

    window.addEventListener("keydown", onKey, true);

    root.classList.add("show");

    render(1);

    if(!frame) frame = requestAnimationFrame(tick);

}

function finish(){

    if(!active) return;

    active = false;

    try { localStorage.setItem(DONE_KEY, "1"); } catch(err) {}

    window.removeEventListener("keydown", onKey, true);

    cancelAnimationFrame(frame);
    frame = 0;

    if(openedPanel) setPanelOpen(false);

    flyBack();

    root.classList.remove("show");

}

export function tourActive(){

    return active;

}

//--------------------------------------------------
// First visit: start once the archive is open and settled.
//--------------------------------------------------

function seen(){

    try { return localStorage.getItem(DONE_KEY) === "1"; } catch(err) { return true; }

}

let pending = 0;

function startWhenClear(){

    clearTimeout(pending);

    pending = setTimeout(function attempt(){

        if(seen() || active) return;

        const viewport = $("#viewport");

        if(!viewport || viewport.style.display === "none") return;   // back on the landing page

        const overlay = $("#movie-details-overlay");

        // A card's open (from a shared link): wait for it.
        if(overlay && (overlay.classList.contains("open") || overlay.classList.contains("dim") || overlay.classList.contains("flipping"))){

            pending = setTimeout(attempt, 800);

            return;

        }

        startTour();

    }, START_DELAY);

}

export function initTour(){

    window.addEventListener("mcu:archive-entered", startWhenClear);

    window.addEventListener("mcu:go-to-landing", () => {

        clearTimeout(pending);

        finish();

    });

    window.addEventListener("mcu:start-tour", () => {

        clearTimeout(pending);

        startTour();

    });

}
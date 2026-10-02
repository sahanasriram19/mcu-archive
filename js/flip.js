//==================================================
// POSTER → DETAILS CARD FLIP
//
// When you click a poster, a copy of it lifts off from
// exactly where the poster is, flies to the middle of the
// screen while growing to the details card's size, and
// flips over in 3D — its back is the card. When the card
// closes, the same thing plays in reverse, landing back on
// the poster.
//
// movieDetails.js drives this: flipOpen() before showing
// the card, flipClose() when hiding it. Desktop / tablet
// only — on phones the card slides up as a sheet instead —
// and off with the OS "reduce motion" setting.
//==================================================

const DURATION = 950;                 // ms, each way (was 620)
// Gentle start and a long, soft landing.
const EASE = "cubic-bezier(.45,.05,.2,1)";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const phone = window.matchMedia("(max-width: 768px)");

const flipper = document.createElement("div");

flipper.id = "card-flipper";

flipper.innerHTML = `
    <div class="flip-inner">
        <div class="flip-face flip-front"></div>
        <div class="flip-face flip-back">
            <div class="flip-back-poster"></div>
        </div>
    </div>
`;

document.body.appendChild(flipper);

const inner = flipper.querySelector(".flip-inner");
const front = flipper.querySelector(".flip-front");
const backPoster = flipper.querySelector(".flip-back-poster");

let running = null;

export function canFlip(){

    return !reduceMotion.matches && !phone.matches;

}

// Where the details card sits when open.
function cardRect(card){

    const w = card.offsetWidth;
    const h = card.offsetHeight;

    return {
        left: (window.innerWidth - w) / 2,
        top: (window.innerHeight - h) / 2,
        width: w,
        height: h
    };

}

function px(r){

    return {
        left: r.left + "px",
        top: r.top + "px",
        width: r.width + "px",
        height: r.height + "px"
    };

}

function setFaces(posterUrl, colour, title){

    const art = posterUrl
        ? `<img src="${posterUrl}" alt="">`
        : `<div class="flip-noposter" style="--c:${colour || "120,120,140"}"></div>`;

    front.innerHTML = art;
    backPoster.innerHTML = art;

    front.title = title || "";

}

function play(fromRect, toRect, fromTurn, toTurn){

    if(running) running.forEach(a => a.cancel());

    flipper.classList.add("show");

    const move = flipper.animate(
        [ px(fromRect), px(toRect) ],
        { duration: DURATION, easing: EASE, fill: "forwards" }
    );

    // A little lift towards you halfway through the turn.
    const turn = inner.animate(
        [
            { transform: `rotateY(${fromTurn}deg) translateZ(0)` },
            { transform: `rotateY(${(fromTurn + toTurn) / 2}deg) translateZ(80px)`, offset: .5 },
            { transform: `rotateY(${toTurn}deg) translateZ(0)` }
        ],
        { duration: DURATION, easing: EASE, fill: "forwards" }
    );

    running = [move, turn];

    return Promise.all([move.finished, turn.finished]).catch(() => {});

}

// Poster at `fromRect` → card. Resolves when the flip has
// landed (the caller then shows the real card on top).
export function flipOpen(fromRect, card, posterUrl, colour, title){

    setFaces(posterUrl, colour, title);

    return play(fromRect, cardRect(card), 0, 180);

}

// Card → back down onto the poster at `toRect`.
export function flipClose(toRect, card){

    return play(cardRect(card), toRect, 180, 360).then(hideFlipper);

}

export function hideFlipper(){

    if(running) running.forEach(a => a.cancel());

    running = null;

    flipper.classList.remove("show");

}

// A usable rectangle for a poster: on screen and not tiny.
export function goodRect(r){

    return !!r &&
        r.width > 4 && r.height > 4 &&
        r.left < window.innerWidth && r.top < window.innerHeight &&
        r.left + r.width > 0 && r.top + r.height > 0;

}
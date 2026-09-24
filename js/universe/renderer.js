//==================================================
//
// RENDERER
//
// Owns the one canvas everything is drawn on.
//
// All drawing code works in CSS pixels (window.innerWidth
// by window.innerHeight). The canvas's real pixel buffer is
// that size times the screen's devicePixelRatio, and each
// frame starts with a matching scale transform. On a
// high-DPI screen (Windows display scaling at 125-150%,
// Retina and most phones) everything is drawn at full
// resolution instead of being drawn small and stretched,
// which is what made posters, text and lines look soft.
//
// The buffer is only resized when the window or DPR
// actually changes. It used to be re-assigned every frame
// (universe.js set canvas.width in the render loop), which
// throws the whole buffer away and reallocates it 60 times
// a second.
//
//==================================================

const canvas = document.getElementById("universe");

const ctx = canvas.getContext("2d");

// Capped at 2: a 3x phone screen would otherwise mean 9x
// the pixels of a 1x screen for very little visible gain.
const MAX_DPR = 2;

let dpr = 1;

// Adaptive quality: if frames run slow, the buffer steps
// down towards 1x (today's old sharpness, never worse).
// Smoothness beats crispness. It only ever steps down,
// except that a real resize/monitor change starts fresh.
let dprCap = MAX_DPR;

const SLOW_FRAME_MS = 24;     // ~40fps; slower than this on average = step down
const SAMPLE_FRAMES = 90;     // ~1.5s of frames per verdict
const DPR_STEP = 0.5;

let lastFrame = 0;
let frameSum = 0;
let frameCount = 0;

function applySize(){

    const w = window.innerWidth;
    const h = window.innerHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);

    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

}

function trackFrameTime(){

    const now = performance.now();

    const dt = now - lastFrame;

    lastFrame = now;

    // Ignore gaps from a background tab or a one-off stall
    // (like the first frame after load); they aren't a
    // sign the device can't keep up.
    if(dt <= 0 || dt > 250) return;

    frameSum += dt;
    frameCount++;

    if(frameCount < SAMPLE_FRAMES) return;

    const avg = frameSum / frameCount;

    frameSum = 0;
    frameCount = 0;

    if(avg > SLOW_FRAME_MS && dpr > 1){

        dprCap = Math.max(1, dpr - DPR_STEP);

        dpr = dprCap;

        applySize();

    }

}

function resize(){

    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR, dprCap);

    applySize();

    frameSum = 0;
    frameCount = 0;

}

resize();

window.addEventListener("resize", resize);

//--------------------------------------------------
// DPR can change without a resize event, e.g. dragging
// the window to a monitor with different scaling.
//--------------------------------------------------

function watchDpr(){

    if(!window.matchMedia) return;

    const query = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);

    const onChange = () => {

        query.removeEventListener("change", onChange);

        // New monitor: give full sharpness another chance.
        dprCap = MAX_DPR;

        resize();

        watchDpr();

    };

    query.addEventListener("change", onChange);

}

watchDpr();

//--------------------------------------------------
// shadowBlur is measured in real buffer pixels and, unlike
// everything else, ignores the scale transform, so on a 2x
// screen every glow would come out half as wide. Scaling it
// here keeps every glow looking exactly as designed without
// touching each place that sets it.
//--------------------------------------------------

const shadowBlurDesc = Object.getOwnPropertyDescriptor(
    CanvasRenderingContext2D.prototype,
    "shadowBlur"
);

Object.defineProperty(ctx, "shadowBlur", {

    get(){ return shadowBlurDesc.get.call(this) / dpr; },

    set(v){ shadowBlurDesc.set.call(this, v * dpr); }

});

//--------------------------------------------------
// Called once at the top of every frame, in place of the
// old per-frame canvas.width reset: puts the context back
// to a clean default state and applies the DPR scale.
//--------------------------------------------------

function beginFrame(){

    trackFrameTime();

    if(typeof ctx.reset === "function"){

        ctx.reset();

    } else {

        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";
        ctx.shadowBlur = 0;
        ctx.shadowColor = "rgba(0,0,0,0)";
        ctx.filter = "none";

    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

}

export{

    canvas,

    ctx,

    beginFrame

};
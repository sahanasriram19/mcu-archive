//==================================================
// SCROLL HINTS
//
// The site has no scrollbars (css/main.css). Instead, an
// area with more to scroll to fades out at that edge, so
// its content looks cut off and invites a scroll:
//
//   watchScroll(el)          up/down
//   watchScroll(el, "x")     sideways
//
// Adds .scroll-hint (plus .scroll-x for sideways) once, and
// keeps .more-start / .more-end in step with the scroll
// position, the element's size and its content.
//==================================================

const watched = new WeakSet();

// A pixel or two of slack, so rounding doesn't leave a
// fade showing at the very end.
const SLACK = 2;

function update(el, axis){

    const pos = axis === "x" ? el.scrollLeft : el.scrollTop;
    const size = axis === "x" ? el.clientWidth : el.clientHeight;
    const full = axis === "x" ? el.scrollWidth : el.scrollHeight;

    el.classList.toggle("more-start", pos > SLACK);
    el.classList.toggle("more-end", pos + size < full - SLACK);

}

export function watchScroll(el, axis = "y"){

    if(!el) return;

    const run = () => update(el, axis);

    if(!watched.has(el)){

        watched.add(el);

        el.classList.add("scroll-hint");

        if(axis === "x") el.classList.add("scroll-x");

        el.addEventListener("scroll", run, { passive: true });

        if(window.ResizeObserver) new ResizeObserver(run).observe(el);

        // New content (a card filled in, a section opened).
        if(window.MutationObserver){

            new MutationObserver(() => requestAnimationFrame(run))
                .observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "style"] });

        }

        // Images arriving change the size too.
        el.addEventListener("load", run, true);

        // Panels that open over a transition settle later.
        el.addEventListener("transitionend", run);

    }

    run();

}

// Re-check an area right now (e.g. after re-rendering it).
export function refreshScroll(el, axis = "y"){

    if(el) update(el, axis);

}
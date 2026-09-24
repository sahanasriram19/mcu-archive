//==================================================
// RESPONSIVE HELPERS
//
// One place that decides "is this a phone-sized screen,
// and which way up is it?", shared by the layouts, the
// camera, the connection renderer and the view panel so
// they always agree.
//
// COMPACT_QUERY must match the media queries used in
// css/mobile.css and css/panel.css: narrow screens
// (phones in portrait, small tablets) OR short screens
// (phones in landscape, which are wide but only ~340-430px
// tall — the old max-width-only query missed them).
//==================================================

export const COMPACT_QUERY = "(max-width: 768px), (max-height: 500px)";

const compactMedia = window.matchMedia ? window.matchMedia(COMPACT_QUERY) : null;

export function isCompact(){

    return compactMedia ? compactMedia.matches : window.innerWidth <= 768;

}

// Phone held upright: the timelines and the Phases view
// switch to top-to-bottom layouts you scroll through,
// instead of left-to-right ones that don't fit.
export function isPortraitPhone(){

    return isCompact() && window.innerHeight >= window.innerWidth;

}

// A key that changes whenever the layout mode would, so
// callers can tell when a resize/rotation needs a re-layout.
export function layoutModeKey(){

    return isCompact() ? (isPortraitPhone() ? "phone-portrait" : "phone-landscape") : "desktop";

}
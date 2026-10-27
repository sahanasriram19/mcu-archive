//==================================================
// POSTER SIZE
//
// How wide a poster is in world units, per view — the one
// place that decides it, shared by everything that draws a
// poster (nodes.js), finds what a click landed on
// (nodeHitTest.js) and lays the views out (layout.js), so
// they always agree.
//
//   Timelines (Release / Chronological / Character
//   Journeys)                          300
//   Complete mind maps                 320, a little bigger
//                                      on each outer ring
//   Phases                             430: its rings are
//                                      spread wide to stay
//                                      neat, so its posters
//                                      are drawn bigger to
//                                      show at their usual
//                                      size on screen
//   Everything else                    320
//==================================================

export const POSTER_BASE = 320;
export const TIMELINE_POSTER = 300;
export const PHASES_POSTER = 430;

export function posterSizeFor(node, view){

    if(view === "release" || view === "chronology" || view === "characters") return TIMELINE_POSTER;

    if(view === "complete") return POSTER_BASE + Math.min(node.ring || 0, 4) * 35;

    if(view === "phases") return PHASES_POSTER;

    return POSTER_BASE;

}
//==================================================
// VIEWS
//
// The panel reads this list to build its buttons.
// viewManager.js reads it to know which layout to
// run, which edges to draw, and how to frame the
// camera for that view.
//==================================================

export const VIEWS = [

    {
        key: "complete",
        label: "Complete MCU",
        layout: "complete",
        edges: { mode: "mindmap" },
        // Zoom is worked out from the layout so the mind
        // map fills the screen; fit > 1 pushes in a little
        // past "everything visible" so it feels immersive.
        // zoom is the fallback if nothing has laid out yet.
        camera: { x: 0, y: 0, zoom: 0.16, fit: 1.12, minZoom: 0.1, maxZoom: 0.4 }
    },

    {
        key: "phases",
        label: "Phases",
        layout: "phases",
        // Six separate mini mind maps rather than one
        // shared hub — see graph.js edgesPhaseSpokes.
        edges: { mode: "phaseSpokes" },
        camera: { x: 0, y: 0, zoom: 0.16 }
    },

    {
        key: "release",
        label: "Release Order",
        layout: "release",
        // A left-to-right trail with branches, not a
        // grid — see graph.js edgesTimelineTrail. Wider
        // than the screen on purpose; drag to follow it.
        // The trail itself starts at x:0 (see layout.js),
        // so landing the camera there opens on the very
        // start of the timeline, not partway through it.
        edges: { mode: "timelineTrail" },
        camera: { x: 0, y: 0, zoom: 0.40 }
    },

    {
        key: "chronology",
        label: "Chronological Order",
        layout: "chronology",
        edges: { mode: "timelineTrail" },
        camera: { x: 0, y: 0, zoom: 0.40 }
    },

    {
        key: "characters",
        label: "Character Journeys",
        layout: "characters",
        edges: { mode: "characters" },
        camera: { x: 0, y: 0, zoom: 0.40 }
    }

];
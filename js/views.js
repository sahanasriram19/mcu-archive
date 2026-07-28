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
        camera: { x: 0, y: 0, zoom: 0.11 }
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
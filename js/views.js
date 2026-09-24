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
        // Zoom is worked out from the layout so the whole
        // mind map is on screen by default, inviting users
        // to zoom in. fit < 1 leaves a margin round the
        // edge; raise it towards (or past) 1 to start closer.
        // zoom is the fallback if nothing has laid out yet.
        camera: { x: 0, y: 0, zoom: 0.15, fit: 0.92, minZoom: 0.07, maxZoom: 0.4 }
    },

    {
        key: "phases",
        label: "Phases",
        layout: "phases",
        // Six separate mini mind maps rather than one
        // shared hub — see graph.js edgesPhaseSpokes.
        edges: { mode: "phaseSpokes" },
        camera: { x: 0, y: 0, zoom: 0.16 },
        // Phones (see viewManager.js phoneCamera): upright,
        // the phases stack in one column — fill the width and
        // start at the top. Sideways, they sit in one row —
        // fill the height and start at the left.
        phone: {
            portrait:  { fit: 0.94, axis: "width", anchor: "top" },
            landscape: { fit: 0.9,  axis: "height", anchor: "left" }
        }
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
        camera: { x: 0, y: 0, zoom: 0.40 },
        // Phones: the timeline runs top to bottom when upright
        // (fill the width, start at the first title) and left
        // to right when sideways (fill the height, start at
        // the first title on the left).
        phone: {
            portrait:  { fit: 0.9,  axis: "width",  anchor: "top",  maxZoom: 0.32 },
            landscape: { fit: 0.9,  axis: "height", anchor: "left", maxZoom: 0.42 }
        }
    },

    {
        key: "chronology",
        label: "Chronological Order",
        layout: "chronology",
        edges: { mode: "timelineTrail" },
        camera: { x: 0, y: 0, zoom: 0.40 },
        phone: {
            portrait:  { fit: 0.9,  axis: "width",  anchor: "top",  maxZoom: 0.32 },
            landscape: { fit: 0.9,  axis: "height", anchor: "left", maxZoom: 0.42 }
        }
    },

    {
        key: "characters",
        label: "Character Journeys",
        layout: "characters",
        edges: { mode: "characters" },
        camera: { x: 0, y: 0, zoom: 0.40 },
        phone: {
            portrait:  { fit: 0.9,  axis: "width",  anchor: "top",  maxZoom: 0.32 },
            landscape: { fit: 0.9,  axis: "height", anchor: "left", maxZoom: 0.42 }
        }
    }

];
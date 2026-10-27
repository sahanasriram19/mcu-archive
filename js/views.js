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
        camera: { x: 0, y: 0, zoom: 0.12, fit: 0.92, minZoom: 0.07, maxZoom: 0.4 },
        // The combined "Complete MCU" map (every world side by
        // side) is much bigger, so it starts further out and
        // can be zoomed out further. `centre` frames the middle
        // of all the maps rather than the Avengers logo.
        worlds: {
            // fillMinZoom: you can only zoom out until the maps
            // reach the edges of the screen, so they always fill
            // the universe rather than floating in empty space.
            // Raise it to stop further in; lower it to allow
            // zooming out further.
            // (0.7 rather than 1: with the maps spread further apart —
            // MULTIVERSE_SPREAD in layout.js — the opening view
            // needs room to step back far enough that the top
            // corner maps clear the panel and countdown cards.)
            // (phoneFit / phoneMinZoom: on a phone the whole
            // combined map fits between the countdown bar and
            // the panel, with a margin round it.)
            all: { camera: { x: 0, y: 0, zoom: 0.05, fit: 1, minZoom: 0.015, maxZoom: 0.4, centre: true, fillMinZoom: 0.7, phoneFit: 0.88, phoneMinZoom: 0.005 } },
            // Each standalone world uses the same layout shape as
            // its map in Complete MCU, and fits that layout to screen.
            animated: { camera: { x: 0, y: 0, zoom: 0.06, fit: 0.92, minZoom: 0.035, maxZoom: 0.4, userMinZoom: 0.035 } },
            spider: { camera: { x: 0, y: 0, zoom: 0.08, fit: 0.92, minZoom: 0.045, maxZoom: 0.4, userMinZoom: 0.045 } }
        }
    },

    {
        // Every title from every world, scattered far apart over
        // a wide stretch of space — no hub, branches or lines.
        // Only on the combined MCU (see ui/panel.js), not in a
        // world. It opens close enough to read the posters in
        // the middle; drag to roam, or zoom out to see them all.
        key: "scatter",
        label: "All Posters",
        layout: "scatter",
        allOnly: true,
        edges: { mode: "none" },
        // fillMinZoom: you can only zoom out until every poster
        // is on screen, filling it (1 = all of them just fit;
        // lower lets you zoom out further, with space round them;
        // higher stops further in).
        camera: { x: 0, y: 0, zoom: 0.17, fillMinZoom: 0.80 }
    },

    {
        key: "phases",
        label: "Phases",
        layout: "phases",
        // Six separate mini mind maps rather than one
        // shared hub — see graph.js edgesPhaseSpokes.
        edges: { mode: "phaseSpokes" },
        // Fits itself to the screen, clear of the panel and
        // the countdown card (works for MCU Phases and X-Men
        // Eras alike). zoom is the fallback.
        // (minZoom / userMinZoom: low enough for worlds with
        // many eras — Spider-Man, Animated — to fit whole.)
        // (fit 1: it fills the space between the panel and the
        // countdown cards, which it's always kept clear of.)
        camera: { x: 0, y: 0, zoom: 0.16, fit: 1, minZoom: 0.025, maxZoom: 0.3, userMinZoom: 0.025 },
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
        // Opens at an angle: the timeline turned to rise to
        // the right (spin, radians) and tipped well back
        // (pitch), with its start on the left, clear of the
        // panel. (Phones keep the flat-on framing below.)
        camera: { x: 700, y: -40, zoom: 0.34, pitch: 0.8, spin: -0.56 },
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
        // Opens at an angle: the timeline turned to rise to
        // the right (spin, radians) and tipped well back
        // (pitch), with its start on the left, clear of the
        // panel. (Phones keep the flat-on framing below.)
        camera: { x: 700, y: -40, zoom: 0.34, pitch: 0.8, spin: -0.56 },
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
# MCU Archive

An interactive, cinematic mind-map of the Marvel Cinematic Universe — every movie, series, and special rendered as a poster on a pannable, zoomable canvas, connected by glowing lines, with several different ways to explore the timeline.

Built as a portfolio project combining a custom canvas rendering engine, a real movie database (via TMDB), and an original interaction design rather than a template.

---

## What it does

### The landing page

The landing page opens on a glowing ring around the Marvel logo. Scroll to fly through the MCU in 3D: each world — the Avengers, X-Men, Spider-Man, Fantastic Four, Marvel Unscripted and Marvel Animation — opens with a title card, and its films and series float past in small waves of four, on a computer and a phone alike: two trails on each side (an outer row up high and an inner row down low), each poster captioned with its year and phase or era. A "Coming Soon" chapter closes it out. Click any poster on the way to open its details card.

From about 60% of the way along, the Marvel logo appears at the far end of the trail and grows as you approach (smaller on phones and small screens); when you arrive, the mind-map branches draw out from it and the way into the archive appears beneath (or skip straight in). Entering the archive is a hyperspace jump, and then the map grows out of the logo like a mind map being drawn: each phase's branch reaches out in turn round the circle, and its titles sprout off it, inner ring first (on the combined map, the Avengers first, then each other world out of its own logo). The same growth plays the first time you open a world. Coming back to the landing page later — with the "MCU Archive" title or the browser's Back button — and entering again plays exactly the same opening.

The landing page itself stays still under the mouse; the layered mouse movement is kept for the archive.

### The archive

- **MCU → Complete MCU** (the default view) — every world on one canvas: the Avengers mind map exactly in the middle, with the other four on the corners round it at mirrored distances — X-Men top left, Marvel Unscripted top right, Marvel Animation bottom left, Spider-Man bottom right — and the Fantastic Four straight above it, in the middle of the top. Each keeps its own logo at its centre; click a logo to zoom into that world's map, and again to zoom back out. On a phone it opens far enough out to show every world at once.
- **MCU → All Posters** — every title from every world once, with no hub, branches or lines: just posters scattered far apart across a wide stretch of space (several screens across) to drag around and discover, worlds mixed together.
- **Avengers World → Complete Avengers** — the MCU's own titles, organized as a mind map: a central hub branching into each Phase, each Phase branching into its own titles.
- **Phases** — one ring of posters per phase (plus one for the Netflix *Defenders* shows), laid out in neat, evenly spaced rows shaped to the screen. Each ring is sized to its own titles, every poster sits level and evenly spaced round it, and the phase name and years sit clear in the middle (long era names wrap onto two lines).
- **Release Order** — a timeline in real-world release order. On a computer it opens at an angle: turned to rise to the right and tipped back, starting on the left.
- **Chronological Order** — the same timeline shape and angle, but ordered by in-universe chronology instead.
- **X-Men World** — a second world in the same app: the Fox X-Men films plus the X-Men cartoons (*X-Men* 1992, *X-Men: Evolution*, *Wolverine and the X-Men* and *X-Men '97*), with its own Complete map (grouped into eras), Eras, Release Order, Chronological Order and Character Journeys. *Deadpool & Wolverine* appears in both worlds as the bridge.
- **Spider-Man World** — the Raimi trilogy, both *Amazing Spider-Man* films and the animated *Spider-Verse* films (including the upcoming *Beyond the Spider-Verse*), Tom Holland's MCU films, Sony's Spider-Man Universe (*Morbius*, *Madame Web*, *Kraven the Hunter*, with the three *Venom* films on their own branch) and the Spider-Man cartoons on Disney+ (1967 to *Your Friendly Neighborhood Spider-Man* and *Spidey and His Amazing Friends*), with *No Way Home* as the crossover. Same five views, grouped into eras.
- **Fantastic Four World** — the FF cartoons (1967, 1978, 1994 and *World's Greatest Heroes*), the three Fox films (2005, *Rise of the Silver Surfer*, 2015) and Marvel Studios' *First Steps*, with *Avengers: Doomsday* and *Secret Wars* shared with the Avengers map. Same five views, grouped into eras.
- **Unscripted World** — Marvel's unscripted documentaries and specials on Disney+: *Marvel's Hero Project*, *Marvel's 616*, *Marvel Studios: Legends*, *Marvel's Behind the Mask*, the specials (*Expanding the Universe*, the 2021 Disney+ Day special, *A Fan's Guide to Ms. Marvel*, *Voices Rising*, *Stan Lee*) and all 23 *Marvel Studios: Assembled* making-of specials, grouped into Docuseries, Specials and Assembled by year.
- **Animated World** — every Marvel Animation series, short and special on Disney+: the classic cartoons, the Spider-Man cartoons, the 2000s and Disney XD shows, the shorts, *Marvel Rising*, Disney Junior, LEGO Marvel, *M.O.D.O.K.* and *Hit-Monkey*, and Marvel Studios Animation (*What If…?*, *X-Men '97*, *Eyes of Wakanda*, *Marvel Zombies*…). Same five views, grouped into eras. Cartoons that belong to the X-Men or Spider-Man worlds appear there too, under the same id.
- **Character Journeys** — pick a character from the dropdown under a world's views and watch the graph reorganize into just their arc.

The panel on the left (a slim bar along the bottom on phones) lists the worlds as sections that open one at a time — opening one closes the others, and so does each world's Character Journeys dropdown — so the panel never grows longer than one world's list. Beside the title is a **default view** button: it undoes any tilting, turning, panning or zooming and frames the current view the way it opens.

Switching between views never reloads the page — nodes ease smoothly from their old position to their new one, and the connecting lines redraw to match. On the mind map, hovering a phase's branch lights it up and shows the phase's name and years; the other branches stay as they are.

### Details cards

Clicking a poster flips it over into its details card (and back again when you close it): synopsis, rating, cast, trailer, a "watched" tick, and "Watch before this" — the earlier titles worth seeing first, with a button to light them up on the map. While its card is open, the poster itself leaves the map (or the fly-through), as if it has become the card, and drops back into place as the card flips closed. Cast, synopsis and trailer are pulled live from TMDB.

There are no scrollbars anywhere on the site: anything that scrolls (a long card, the cast row, the "Watch before this" row, a long panel) fades out at the edge that has more to see, so the content reads as cut off and invites a scroll.

### Links and history

The address bar follows where you are, so any place in the archive can be shared:

```
#/all/complete                 the combined map
#/xmen/release                 a world's view
#/mcu/characters/Tony%20Stark  a character journey
#/spider/phases?title=nwh      ...with a title's card open
```

Every view you open and every card you open is its own entry in the tab's history: Back closes a card, then steps back through the views, and finally returns to the landing page; Forward goes the other way. The copy-link button on a card copies a link that opens that card again — from inside the archive it's the view you're in; from the landing page's fly-through it opens on the combined map.

### Depth, motion and the look

On a mouse, the countdown cards and small posters lean towards the cursor with a soft light. The countdown digits flip like a departure board (only the digits that change), the panel sections swing open on a hinge, and inside the archive everything shifts in layers as you move the mouse (stars drift against the map, posters float a little above it, the panels follow slightly). On a phone, tilting the phone does the same.

The archive has depth, too. On the Complete MCU map the worlds are spread well apart, with open space to drift through between them. Each world sits in a soft pool of light on the map's surface — the ground, without covering up space — and its posters float above it (a hovered poster rises further); the branches climb from the logo up to their posters. There are no shadows, so the map reads as clean, glowing lines and posters on the sky. Zoomed out in the archive the sky calms down (softer star glows, fewer drifting specks, rarer shooting stars), so the map reads first.

The archive opens with the map tipped back like a table you look across (about 38°), so the pools of light lie flat as ovals, and on a computer it turns a few degrees towards the mouse, as if you were leaning in to look at a model. Each view opens at its own angle — the order timelines turned and tipped further back. Tip it further or flatten it by dragging with the right mouse button (or Shift + drag), sliding two fingers up or down on a phone, or pressing **T** (flat / back to the usual tilt); the default view button puts the view back the way it opens. It's all the same 2D canvas, projected with a little perspective (`js/depth.js`, `js/ground.js`), no 3D library.

The whole thing sits on top of a custom-built starfield/nebula background engine (stars, energy particles, shooting stars, all on a seeded deterministic generator so it looks the same on every visit rather than randomly recoloring itself).

---

## Tech stack

- **Vanilla JavaScript (ES modules)** — no framework. All rendering is hand-written canvas code.
- **HTML5 Canvas** — both the background "universe" and the graph of posters/connections are drawn on canvas, camera-projected (pan + zoom + tilt) consistently across every layer.
- **[TMDB API](https://www.themoviedb.org/)** — poster art, synopses, ratings, cast, and trailers. (Marvel's own developer API only covers comics, not films/shows, so it isn't used here.)
- **JSON data files** — the archive's own dataset (title, phase, saga, release date, in-universe timeline position, characters, colour), one file per world in `data/`, independent of the TMDB-sourced art/metadata.

No build step, no bundler — open `index.html` through a local server and it runs.

---

## Project structure

```
mcu-archive/
├── index.html
├── assets/
│   ├── favicon.png
│   ├── marvel-logo.jpg           # the logo on the landing card and the mind map's centre
│   ├── *-logo.png                # the other worlds' logos on the combined map
│   └── fonts/                    # Inter and Bebas Neue (SIL Open Font License)
├── data/
│   ├── mcu.json              # the archive's own dataset (titles, phases, timeline order, characters)
│   ├── xmen.json             # the X-Men world: Fox films + X-Men cartoons, grouped by era
│   ├── spiderman.json        # the Spider-Man world: Raimi, Amazing, Spider-Verse, Tom Holland, Sony's Spider-Man Universe and the cartoons
│   ├── animated.json         # the Animated world: every Marvel Animation title on Disney+
│   ├── fantasticfour.json    # the Fantastic Four world: cartoons, Fox films, Marvel Studios
│   └── unscripted.json       # the Unscripted world: Marvel's documentaries and specials on Disney+
├── css/
│   ├── main.css               # base styles, no scrollbars, the scroll-edge fades
│   ├── background.css
│   ├── landing.css            # landing page, fly-through, end-of-trail logo
│   ├── world.css
│   ├── cards.css
│   ├── panel.css              # the view panel (and its default view button)
│   ├── search.css
│   ├── characters.css
│   ├── movieDetails.css       # the details card and the poster → card flip
│   ├── upcoming.css           # countdown card, watch-list banner, "Watch before this"
│   ├── tilt.css               # 3D tilt + light on cards, details card swing-in
│   ├── comic.css              # the look: comic-style panels and Bebas Neue headings (loaded last)
│   └── mobile.css             # phone-only overrides; desktop untouched
├── ui/
│   ├── panel.js               # the view panel: one world open at a time, default view button
│   └── search.js              # the movie/character search box
└── js/
    ├── app.js                 # entry point / render loop; entering and leaving the archive
    ├── camera.js              # pan/zoom/tilt state + easing, and the frame timing that keeps glides at full speed
    ├── depth.js               # 2.5D: each poster's height, the map's tilt + look-around, world → screen projection
    ├── ground.js              # the soft pools of light the map lies on (its ground)
    ├── input.js               # drag to pan, wheel/pinch to zoom, click a poster
    ├── graph.js               # node + edge data, per-frame easing
    ├── layout.js              # one layout function per view (mind maps, Phases rings, timelines, Character Journeys, All Posters)
    ├── viewManager.js         # ties layout + edges + camera together per view; the default view
    ├── views.js               # view registry (labels, default camera and angle, phone framing)
    ├── posterSize.js          # how big a poster is in each view (shared by drawing, clicking and layout)
    ├── responsive.js          # decides phone vs desktop layouts (portrait / landscape)
    ├── worlds.js              # the six worlds plus "all" for the combined map, era names, current world
    ├── universe.js            # draws every layer each frame, background first; the map's cached layer
    ├── redraw.js              # tells the map layer when it needs redrawing
    ├── connections.js         # renders the glowing connection lines (curved branches on the mind map)
    ├── nodes.js               # renders poster nodes
    ├── nodeHitTest.js         # works out which poster a click landed on
    ├── branchNodes.js         # renders the phase / era names and years
    ├── hub.js                 # the logo at the centre of each mind map
    ├── archive.js / archiveCore.js   # the central hub orb + view state
    ├── posters.js             # TMDB lookups (poster, overview, rating, cast, trailer)
    ├── tmdbConfig.js          # the TMDB API key and image sizes
    ├── movieDetails.js        # the click-to-view details card
    ├── links.js               # shareable links, copy link, and tab history (Back / Forward)
    ├── watched.js             # the "watched" ticks (saved in the browser)
    ├── upcoming.js            # countdown to the next release + "What should I watch before…?"
    ├── intro.js               # the landing page's 3D scroll fly-through
    ├── flip.js                # posters flip over into the details card
    ├── scrollHints.js         # the fade at the edge of anything that scrolls
    ├── tilt.js                # cards lean towards the mouse
    ├── sway.js                # the archive shifts in layers with the mouse (or the phone's tilt)
    ├── parallax.js            # works out whether the landing hero is showing
    ├── warp.js                # hyperspace jump into the archive
    ├── characters/            # the Character Journeys sub-feature
    │   ├── data.js            # auto-derives the character roster from the data
    │   ├── characterJourney.js # which character is currently selected
    │   └── panel.js           # an older side-panel character list (not shown in the current UI)
    └── universe/              # background starfield/nebula engine
        ├── config.js          # particle counts
        ├── generator.js       # seeded, deterministic particle generation
        ├── stars.js / heroStars.js / dust.js / energy.js / nebulas.js / shootingStars.js
        ├── background.js
        ├── renderer.js        # the canvas + resize handling
        ├── state.js
        ├── helpers.js
        └── utils.js
```

*(If your local copy has drifted from this — files renamed, moved, or split differently — treat this as the intended shape rather than a strict source of truth; the code itself is the final word.)*

---

## Setup

1. **Get a free TMDB API key** at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) (approved instantly for personal/non-commercial use).
2. Open `js/tmdbConfig.js` and put your key in `TMDB_API_KEY` (in place of `YOUR_TMDB_API_KEY_HERE`). That's the file the site reads it from.
3. Serve the folder with any static file server — it uses `fetch()` to load the files in `data/`, which most browsers block from a plain `file://` URL.
   ```bash
   npx serve .
   # or
   python3 -m http.server
   ```
4. Open the served URL, scroll through the fly-through (or skip it), and enter the archive.

> **About the key:** this is a static site, so whatever key it uses is sent from the visitor's browser and can be seen by anyone who opens the page — keeping it out of the repo doesn't hide it on a live site. TMDB keys aren't dangerous if exposed, but someone else could use up your request quota. `js/tmdbKey.js` is listed in `.gitignore` (with `js/tmdbKey.example.js` as its template) for keeping a key out of the repo, but the code currently reads the key from `js/tmdbConfig.js`, which is committed.

---

## Data model

Each entry in `data/mcu.json` (and the other worlds' files) looks like this:

```json
{
  "id": "ironman",
  "title": "Iron Man",
  "type": "movie",
  "phase": 1,
  "saga": "infinity",
  "release": "2008-05-02",
  "timeline": 5,
  "colour": "226,89,107",
  "characters": ["Tony Stark"],
  "poster": ""
}
```

- `phase` drives the Complete and Phases layouts (in the other worlds it's the era).
- `timeline` is the in-universe chronological position, independent of `release` (real-world release date) — this is what makes Release Order and Chronological Order genuinely different views.
- `characters` (ordered by prominence) drives the Character Journeys and the "Watch before this" suggestions (titles with the same characters).
- `poster` is left blank — TMDB fills it in at runtime, along with `overview`, `rating`, `cast`, and `trailerUrl`, which are **not** stored in the JSON (fetched live each session).

---

## Design notes / things worth knowing

- **Deterministic by design.** The background starfield uses a seeded random generator, not `Math.random()`, so the universe looks identical on every reload rather than reshuffling its color balance each time.
- **No overlap, on purpose.** The mind maps and timelines run through a pairwise overlap-resolution pass after placement, so posters never sit on top of each other. The Phases rings don't need one: they're sized and spaced so nothing touches, which keeps them perfectly even.
- **The map only redraws when something changes.** The sky is animated, so it's drawn every frame, but the map on top (every poster, line, logo and label — by far the most work) is only redrawn while something on it is moving or has changed: the camera, posters gliding or rising on hover, the mouse sway, a picture arriving, a new view. Then it's drawn with the sky, as always; once everything settles it's drawn once onto its own canvas stacked over the sky's, and left there (with a safety redraw once a second), so while you're just looking the archive does well under half the work it used to.
- **Glides keep their speed.** Zooms, layouts easing into place, fades and the mouse sway each move a set share of the way per frame. `js/camera.js` measures each frame against the screen's full speed and takes a bigger step after a late one, so a busy moment never makes them crawl — at full speed nothing changes. While the map is still, the posters' gentle float pauses too. See `js/universe.js` and `js/redraw.js`.
- **One place for poster sizes.** `js/posterSize.js` decides how big a poster is in each view, so what's drawn, what a click hits and how the layouts are spaced always agree.
- **Cast/trailer load lazily.** Poster art and basic metadata load for every title up front; full cast and trailer data are only fetched the moment you actually open a details card, to keep the initial load light.
- **Watched ticks stay in the browser.** They're saved in `localStorage`, so they're per browser and never leave the visitor's machine.
- **This is a personal, non-commercial fan project.** Poster art and metadata are served live from TMDB and are their/the studios' copyrighted material — fine for a portfolio piece, but not something to monetize or claim as original art.

---

## Credits

- Data and imagery: [The Movie Database (TMDB)](https://www.themoviedb.org/) — this product uses the TMDB API but is not endorsed or certified by TMDB.
- Marvel Cinematic Universe and all associated titles/characters are the property of Marvel Studios / The Walt Disney Company.
- Font: [Inter](https://github.com/rsms/inter) by Rasmus Andersson, shipped in `assets/fonts` under the SIL Open Font License (see `assets/fonts/Inter-LICENSE.txt`).
- Heading font: [Bebas Neue](https://github.com/dharmatype/Bebas-Neue) by Dharma Type, shipped in `assets/fonts` under the SIL Open Font License (see `assets/fonts/BebasNeue-LICENSE.txt`).
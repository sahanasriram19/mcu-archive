# MCU Archive

An interactive, cinematic mind-map of the Marvel Cinematic Universe — every movie, series, and special rendered as a poster on a pannable, zoomable canvas, connected by glowing lines, with five different ways to explore the timeline.

Built as a portfolio project combining a custom canvas rendering engine, a real movie database (via TMDB), and an original interaction design rather than a template.

---

## What it does

Enter the archive and the whole MCU flies outward from a central hub, forming a living mind map. From there:

- **Complete MCU** — every title, organized as a mind map: a central hub branching into each Phase, each Phase branching into its own titles.
- **Phases** — six (well, seven — Phase 0 covers the Defenders-saga shows) separate mini mind maps, one per phase, so you can compare each era's shape at a glance.
- **Release Order** — a left-to-right timeline in real-world release order.
- **Chronological Order** — the same timeline shape, but ordered by in-universe chronology instead.
- **Character Journeys** — pick a character from a Marvel-style selector (portrait, name, appearance count, first/last year) and watch the graph reorganize into just their arc across the MCU.

Switching between views never reloads the page — nodes ease smoothly from their old position to their new one, and the connecting lines redraw to match. Clicking any poster opens a details card with synopsis, rating, cast, and trailer, pulled live from TMDB.

The whole thing sits on top of a custom-built starfield/nebula background engine (stars, dust, energy particles, shooting stars, all on a seeded deterministic generator so it looks the same on every visit rather than randomly recoloring itself).

---

## Tech stack

- **Vanilla JavaScript (ES modules)** — no framework. All rendering is hand-written canvas code.
- **HTML5 Canvas** — both the background "universe" and the graph of posters/connections are drawn on canvas, camera-projected (pan + zoom) consistently across every layer.
- **[TMDB API](https://www.themoviedb.org/)** — poster art, synopses, ratings, cast, and trailers. (Marvel's own developer API only covers comics, not films/shows, so it isn't used here.)
- **JSON data file** — the archive's own dataset (title, phase, saga, release date, in-universe timeline position, cast, colour) lives in a single `data/mcu.json`, independent of the TMDB-sourced art/metadata.

No build step, no bundler — open `index.html` through a local server and it runs.

---

## Project structure

```
mcu-archive/
├── index.html
├── data/
│   └── mcu.json              # the archive's own dataset (titles, phases, timeline order, characters)
├── css/
│   ├── main.css
│   ├── background.css
│   ├── landing.css
│   ├── world.css
│   ├── panel.css
│   ├── characters.css
│   └── movieDetails.css
├── ui/
│   ├── panel.js               # the top-left view-switcher panel
│   ├── landing.js
│   └── search.js
└── js/
    ├── app.js                 # entry point / render loop
    ├── camera.js               # pan/zoom state + easing
    ├── graph.js                 # node + edge data, per-frame easing
    ├── layout.js                 # one layout function per view (Complete MCU, Phases, Release, Chronology, Character Journeys)
    ├── viewManager.js             # ties layout + edges + camera together per view
    ├── views.js                    # view registry (labels, default camera)
    ├── connections.js               # renders the glowing connection lines
    ├── nodes.js                      # renders poster nodes
    ├── branchNodes.js                 # renders the labelled "Phase" hub circles
    ├── archive.js / archiveCore.js     # the central hub orb + view state
    ├── posters.js                       # TMDB lookups (poster, overview, rating, cast, trailer)
    ├── tmdbConfig.js                     # your TMDB API key goes here
    ├── movieDetails.js                    # the click-to-view details card
    ├── characters/                         # the Character Journeys sub-feature
    │   ├── data.js                          # auto-derives the character roster from mcu.json
    │   ├── journeys.js                       # filters the graph to one character
    │   ├── panel.js                           # the Marvel-style character selector UI
    │   └── timeline.js
    └── universe/                             # background starfield/nebula engine
        ├── generator.js                       # seeded, deterministic particle generation
        ├── stars.js / heroStars.js / dust.js / energy.js / nebulas.js / shootingStars.js
        ├── background.js
        ├── state.js
        └── utils.js
```

*(If your local copy has drifted from this — files renamed, moved, or split differently — treat this as the intended shape rather than a strict source of truth; the code itself is the final word.)*

---

## Setup

1. **Get a free TMDB API key** at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) (approved instantly for personal/non-commercial use).
2. Open `js/tmdbConfig.js` and paste your key in place of `YOUR_TMDB_API_KEY_HERE`.
3. Serve the folder with any static file server — it uses `fetch()` to load `data/mcu.json`, which most browsers block from a plain `file://` URL.
   ```bash
   npx serve .
   # or
   python3 -m http.server
   ```
4. Open the served URL, click **Enter**, and the archive builds itself.

> **Note:** if you plan to push this to a public GitHub repo, consider adding `js/tmdbConfig.js` to `.gitignore` so your key isn't publicly visible. TMDB keys aren't sensitive/dangerous if exposed, but it's good practice — someone else could otherwise use up your request quota.

---

## Data model

Each entry in `data/mcu.json` looks like this:

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

- `phase` drives the Complete MCU and Phases layouts.
- `timeline` is the in-universe chronological position, independent of `release` (real-world release date) — this is what makes Release Order and Chronological Order genuinely different views.
- `characters` (ordered by prominence) drives both the "Featuring" chips on the details card and the Character Journeys roster.
- `poster` is left blank — TMDB fills it in at runtime, along with `overview`, `rating`, `cast`, and `trailerUrl`, which are **not** stored in the JSON (fetched live each session).

---

## Design notes / things worth knowing

- **Deterministic by design.** The background starfield uses a seeded random generator, not `Math.random()`, so the universe looks identical on every reload rather than reshuffling its color balance each time.
- **No overlap, on purpose.** Every layout runs through a pairwise overlap-resolution pass after initial placement, so posters never sit on top of each other regardless of how many titles a given phase or character has.
- **Cast/trailer load lazily.** Poster art and basic metadata load for every title up front; full cast and trailer data are only fetched the moment you actually open a details card, to keep the initial load light.
- **This is a personal, non-commercial fan project.** Poster art and metadata are served live from TMDB and are their/the studios' copyrighted material — fine for a portfolio piece, but not something to monetize or claim as original art.

---

## Credits

- Data and imagery: [The Movie Database (TMDB)](https://www.themoviedb.org/) — this product uses the TMDB API but is not endorsed or certified by TMDB.
- Marvel Cinematic Universe and all associated titles/characters are the property of Marvel Studios / The Walt Disney Company.
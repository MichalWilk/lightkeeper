# Lightkeeper

A browser arcade roguelike in a single HTML file (Canvas 2D + WebAudio, no dependencies, no assets). Desktop and mobile, installable as a PWA, works offline.

Play: https://michalwilk.github.io/lightkeeper/

## How it plays

You are the lighthouse and you only control where the beam points. Ships in the light steer for the harbor gate and avoid obstacles; ships in the dark drift with the current into rocks, the island, wrecks or the breakwater. The beam turns at a limited speed, so juggling several ships is the whole game.

- Controls: mouse, touch drag, or arrow keys (A/D). P, Esc or the on-screen button pauses.
- A ship through the gate scores (skiff 80, sloop 100, ferry 150, clipper 180, steamer 200, oil barge 240, tanker 320, +25 per night). Clean passage (under 3 s in the dark) adds 50. Streaks raise a multiplier up to x4.
- A loss costs one of three lamps; three losses end the watch. Every 5 ships end a night.
- Seven ship types differ in size, speed, turning, drift and the oil they pay (1 to 4). Collisions are checked at bow, centre and stern.

## Progression

- **Within a watch**: ships pay oil (1-3, +1 for a clean passage, +2 per night). At each dawn a market offers three upgrade cards with level-based prices: wider beam, longer reach, faster turning, brighter lamp, spare lamp, harbor keeper (a second lamp on the mole that tracks the nearest ship), steady crews, fine wick, scanner beam, tide tables, back mirror, dock cranes, night watch. Purchases can be undone until you sail on.
- **Between watches**: a watch earns reputation (score/100 + 3 per night), spent in the keeper's log on permanent perks (extra lamp, starting oil, wider beam, fewer rocks, harbor keeper from night one, salvage oil, calmer crews, four cards at dawn).

## Hazards

Storms from night 3 (strong gusty current, rain; lightning briefly lights every ship), fog from night 4 (the beam has a limited reach), wrecks adrift from night 5, pirates from night 4: invisible outside the light, they hunt ships and plunder them; the main beam scares them off, the scanner beam reveals and lures them away.

## Music

Generative WebAudio, no samples. Calm ambient while nothing happens, darkening as danger rises, a two-bar build and a drop into a house groove when it peaks. Tempo, harmony, drums, bass, stabs, arp and the hook all follow the state of the sea.

## Files

- `src/` - the source: `js/` (`i18n.js`, `util.js`, `audio.js`, `music.js`, `game.js`, `render.js`, `input.js`, concatenated into one strict IIFE), `css/style.css`, `html/head.html`, `html/body.html`, `sw.template.js`.
- `site/` - the static files of the web site: `manifest.webmanifest`, `install.js` (service worker registration, install hints, iOS zoom guards), `icons/`.
- `build.py` - builds `dist/` (not committed): `dist/site/` (the site: `index.html`, `app.js`, `style.css`, `sw.js` with a content-derived version, a build stamp on the title screen, plus a copy of `site/`) and `dist/lightkeeper.html` (one self-contained file, what the Claude artifact publishes).
- `.github/workflows/pages.yml` - runs `build.py` on every push to `master` and deploys `dist/site` to GitHub Pages.

Local preview: `./build.py && python3 -m http.server 8766 --directory dist/site`.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Slasher Hero: the high-graphics successor of Piksel Savaşçı (`../piksel-savasci`). Same phone-first idle clicker (battle on top, tabbed panel below: Kahraman, Pet, Zindan, Yetenek, Doğuş; a menu button under the version label opens Günlük Giriş, Posta, Lider Tablosu, Blog and Ayarlar), redrawn as storybook vector art in a Kingdom Rush-like style. `index.html`, `styles.css`, native ES modules in `js/`. No build step and no npm dependencies; the only external resources are the Lilita One and Fredoka fonts from Google Fonts. Keep it that way unless asked. UI text is Turkish.

The game rules (`logic.js`, `dungeon.js`, `store.js`, most of `config.js`) came over from Piksel Savaşçı unchanged; the drawing, sound and UI skin are new. Saves are separate: the storage key differs and save codes carry `game: 'slasher-hero'`, so Piksel Savaşçı codes are refused on import (the user asked for that).

## Workflow with the user

The user doesn't read code. Big steps go: plan → build → present with a 1–10 rating request from the user plus Claude's own scores (akıcılık, grafik kalitesi, efektler, sesler, oynanış/gelişme) → adjust to the rating. Explain changes in Turkish, in player terms.

## Release notes (every change)

1. Bump the version: a new feature is a minor bump (0.1.0 → 0.2.0), a fix or tweak a patch bump.
2. Add an entry at the top of `CHANGELOG` in `js/changelog.js`: version, today's date, short Turkish notes for players.
3. Set the same version in `package.json`. `tests/pwa.test.js` fails if they differ or the list isn't newest-first.

The version is the faint label in the top-right of the battle; tapping it opens the patch notes in the blog. Keep it faint. Announcements with a cover go in `js/news.js` (newest first; covers are `scene:<theme>[:<enemy>]` or an image file under `news/`).

## Running and testing

- Serve over HTTP: `python -m http.server 8003`, or the `slasher-hero` entry in the parent `.claude/launch.json`.
- `npm test` runs `node --test` on `tests/`. The tests import the art modules too (actors, scenery, fx, icons) and draw them into a mock context, so those modules must not touch the DOM at load time; `document` is only used inside functions that run in the browser (`iconUrl`, renderers).
- `tools/pose-lab.html` shows actors and frames of their actions side by side: `?only=hero&wrap=3&cell=260`, `?idle=1&wrap=6&cell=130`, `?ids=slime,bat`. Use it to check poses before looking at the game.
- When the browser pane is hidden, `requestAnimationFrame` may stall; screenshots can lag a frame or two behind (take a second one). Synthetic taps: `scene.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX, clientY }))`.
- To load a test save, use Menü → İçe Aktar with `btoa(unescape(encodeURIComponent(JSON.stringify(save))))`; the save needs `game: 'slasher-hero'`. Writing `localStorage` and reloading doesn't work: the `pagehide` autosave overwrites it.

## Deploying

Repo: `codder-ctrl/slasher-hero` (public). GitHub Pages serves the repo root of `main` at https://codder-ctrl.github.io/slasher-hero/, so every push to `main` is a release; run `npm test` first. `.nojekyll` keeps Pages from running Jekyll. The site lives under `/slasher-hero/`, so keep every path in the page, manifest and `sw.js` relative.

## Architecture

`config` → `dungeon` → `logic` → `store` (rules); `paint` → `people`/`monsters`/`pets` → `actors`; `anim`; `scenery`; `fx`; those → `render`, `dungeon-view`, `icons` → `ui` (+ `ui-pets`, `ui-dungeon`); everything → `main`.

- **Rules** (`logic.js`, `dungeon.js`) — unchanged from Piksel Savaşçı; see that project's CLAUDE.md for stages, pets, dungeon and skills. Events (`hit`, `kill`, `spawn`, `stage`, `skill`, `dg-*`…) go from `main.js` to the renderers and `sound.js`.
- **`paint.js`** — the house style. `blob(ctx, path, color, opts)` strokes a thick warm outline, fills, then clips and adds a lower-right shade crescent and an upper-left highlight crescent. The crescent offset is converted from screen space, so light always comes from the top left even on rotated or mirrored parts. `tint` pushes every fill toward white for hit flashes. Path builders: `ellipse`, `circle`, `roundRect`, `smooth` (Catmull-Rom), `poly`, `capsule` (limbs), `star`, `scallop` (canopies, clouds, smoke).
- **Actors** (`people.js` hero + companions, `monsters.js`, `pets.js`, registry in `actors.js`) — `{ height, hover?, rest, idle(t, look), actions, draw(ctx, pose, look, out), angles? }`. Origin between the feet, +x is facing; enemies are drawn facing right and mirrored by the renderer. A pose is a flat object of numbers (joint angles in radians, offsets, squash `sq`, `blink`, `mouth`…); limbs hang at angle 0 and positive swings backward. `draw` may write screen points into `out` (`tip`/`base` of the hero's sword for the trail, `muzzle` for pet shots).
- **`anim.js`** — `createAnimator(def, look)`: idle gives absolute values, actions give offsets from `rest` via `track(p, keys)`. One action per channel; a new one takes over from the offsets on screen and blends in over 50 ms. Joints in `def.angles` blend the short way, with the direction fixed on the first frame. Swings may pass π (the chop goes over the top); put a `-TAU` duplicate key at the strike so the recovery is short. `tests/art.test.js` checks rapid re-swings don't spin.
- **Look data** — enemies, pets and companions get colors from `config.js` (`body`/`accent`; pet forms `body`/`belly`/`dark`/`accent`/`glow`; companions `main`/`trim`). Pet form 2 adds markings or armor in `accent`, form 3 a glow or flames in `glow`. New variants are config entries, not new drawings.
- **`scenery.js`** — `paintBackdrop(g, theme, w, h, gy, seed)` paints a zone (`meadow`, `forest`, `cave`, `desert`, `ice`, `volcano`; `ZONES[].theme`) in scene units with a seeded RNG; `createWeather` is the live layer; `paintDungeon` is the Zindan room.
- **`render.js`** — the canvas is sized in device pixels (DPR capped at 2.5, lowered in steps if frames stay slow) and the scene is 300 units tall; the backdrop is cached per zone and size with a margin for camera shake. A tap plays a hero swing and queues its hit effects `STRIKE_DELAY` later so they land when the blade connects; `kill` queues behind it. Crits add hit-stop, a punch-in and shake (skipped with reduced motion). It keeps its own `enemy` snapshot and only re-syncs on `spawn`, or on `stage` when the enemy is alive.
- **`fx.js`** — particles, smoke puffs, impact stars, rings, slash crescents, projectiles, numbers and the ribbon banner; shared by both renderers.
- **`icons.js`** — UI icons (`ICONS`) and actor portraits (`iconUrl('actor:dog', look)`), rendered to PNG data URLs at the screen's density. `data-icon` names in `index.html` must exist in `ICONS` (tested).
- **`sound.js`** — synthesized effects through a compressor and a generated reverb, plus a small sequencer for background music: one mood per zone (key, tempo, drums), faster for bosses. `settings.music` and `settings.sound` are separate toggles.
- **`ui.js`** — unchanged structure from Piksel Savaşçı: builds cards once, updates text through `set()`, never mutates state.
- **`ui-windows.js`** — the top-right menu bubble and its parchment windows. Views are built when a window opens and updated with the panel refresh; the Ayarlar view is the `#settings-view` element from `index.html`, moved into the window. Badges: daily claimable, unread or uncollected mail, unseen patch notes or news.
- **Daily login and mail** (`logic.js`) — `claimDaily(state, now)` works on local calendar days (`dayKey`): consecutive days walk the 7-slot `DAILY` cycle, a gap restarts it, gold is worth `DAILY.gold[i]` enemies of the farmed frontier stage. `MAIL` (config) is shown to everyone; `state.mail.claimed/read` hold ids. New players start with 0 elmas and get 100 from the `welcome` mail; v1 saves (which started with 100) get it marked claimed. Daily, mail and `seen` survive rebirth; skill levels and cooldowns don't.
- **Leaderboard** — placeholder ("Çok yakında..."). A real one needs an online backend (accounts, score submission, cheat checks); GitHub Pages can't store other players' scores.

## Rules to keep

- Wrap every `localStorage` access in try/catch; the game must work without storage.
- Saved data is untrusted: anything new in the state needs a matching line in `loadState`. Bump `SAVE_VERSION` and migrate when the shape changes incompatibly.
- Balance numbers live in `config.js` and still match Piksel Savaşçı; re-check pacing with a simulation when changing them (stage 20 at ~4 min with the starter dog, wall around stage 80).
- Put text into the DOM with `textContent`, not `innerHTML`.
- PWA: a new file the page loads must be added to `SHELL` in `sw.js` or `npm test` fails.
- Icons are generated: run `npm run icons` and open the printed URL in a browser; `tools/icons.html` draws them and the server writes `icons/`. Don't edit the PNGs.
- Keep drawing code free of per-frame allocations that grow (no new canvases or gradients cached forever per frame); everything is redrawn every frame.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Slasher Hero: the high-graphics successor of Piksel Savaşçı (`../piksel-savasci`). Same phone-first idle clicker (battle on top, tabbed panel below: Kahraman, Pet, Zindan, Yetenek, Doğuş; a menu button under the version label opens Harita, Günlük Giriş, Görevler, Posta, Lider Tablosu, Blog and Ayarlar; the bag button under it opens the Ekipman screen), redrawn as storybook vector art in a Kingdom Rush-like style. `index.html`, `styles.css`, native ES modules in `js/`. No build step and no npm dependencies; the only external resources are the Lilita One and Fredoka fonts from Google Fonts. Keep it that way unless asked. UI text is Turkish.

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
- Hidden-pane screenshots of the battle canvas come back blank or stale (the emulated viewport resize clears the canvas, and timers get throttled hard, which hung the page once). What works: stub `requestAnimationFrame` and `setTimeout` with queues on a fake clock, step frames synchronously (`slasher.kick()` once, then flush the rAF queue with `now += 16.7`, running due timeouts first), copy `#scene` frames with `drawImage` into one grid canvas, and show it as a fixed `<img>` over the page before taking the screenshot. Dispatch a `resize` event first if the scene looks zoomed.
- On localhost, `window.slasher` exposes `{ state, L, D, G, T, dispatch, kick }` for browser tests. In a hidden pane, timers are throttled too; drive frames with a `MessageChannel` loop as the `requestAnimationFrame` stub and call `slasher.kick()` once to restart the game loop on it. Screenshots can time out while that loop runs flat out; set a pause flag in the stub first.
- `node tools/sim.js` plays the rules headless and prints the pacing (`--taps`, `--share 0.15`, `--skip vitality,armor`, `--curve`, `--logic <path>` to compare with Piksel Savaşçı). Run it after any balance change.
- To load a test save, use Ayarlar → İçe Aktar with `btoa(unescape(encodeURIComponent(JSON.stringify(save))))`; the save needs `game: 'slasher-hero'`. Writing `localStorage` and reloading doesn't work: the `pagehide` autosave overwrites it.

## Deploying

Repo: `codder-ctrl/slasher-hero` (public). GitHub Pages serves the repo root of `main` at https://codder-ctrl.github.io/slasher-hero/, so every push to `main` is a release; run `npm test` first. `.nojekyll` keeps Pages from running Jekyll. The site lives under `/slasher-hero/`, so keep every path in the page, manifest and `sw.js` relative.

## Architecture

`config` → `dungeon` → `logic` → `store` (rules); `paint` → `people`/`monsters`/`pets` → `actors`; `anim`; `scenery`; `fx`; those → `render`, `dungeon-view`, `icons` → `ui` (+ `ui-pets`, `ui-dungeon`); everything → `main`.

- **Rules** (`logic.js`, `dungeon.js`) — built on Piksel Savaşçı's (see its CLAUDE.md for stages, pets, dungeon and skills), plus the v0.3 combat below. Events (`hit`, `kill`, `spawn`, `stage`, `skill`, `dg-*`…) go from `main.js` to the renderers and `sound.js`.
- **`paint.js`** — the house style. `blob(ctx, path, color, opts)` strokes a thick warm outline, fills, then clips and adds a lower-right shade crescent and an upper-left highlight crescent. The crescent offset is converted from screen space, so light always comes from the top left even on rotated or mirrored parts. `tint` pushes every fill toward white for hit flashes. Path builders: `ellipse`, `circle`, `roundRect`, `smooth` (Catmull-Rom), `poly`, `capsule` (limbs), `star`, `scallop` (canopies, clouds, smoke).
- **Actors** (`people.js` hero + companions, `monsters.js`, `pets.js`, registry in `actors.js`) — `{ height, hover?, rest, idle(t, look), actions, draw(ctx, pose, look, out), angles? }`. Origin between the feet, +x is facing; enemies are drawn facing right and mirrored by the renderer. A pose is a flat object of numbers (joint angles in radians, offsets, squash `sq`, `blink`, `mouth`…); limbs hang at angle 0 and positive swings backward. `draw` may write screen points into `out` (`tip`/`base` of the hero's sword for the trail, `muzzle` for pet shots).
- **`anim.js`** — `createAnimator(def, look)`: idle gives absolute values, actions give offsets from `rest` via `track(p, keys)`. One action per channel; a new one takes over from the offsets on screen and blends in over 50 ms. Joints in `def.angles` blend the short way, with the direction fixed on the first frame. Swings may pass π (the chop goes over the top); put a `-TAU` duplicate key at the strike so the recovery is short. `tests/art.test.js` checks rapid re-swings don't spin.
- **Look data** — enemies, pets and companions get colors from `config.js` (`body`/`accent`; pet forms `body`/`belly`/`dark`/`accent`/`glow`; companions `main`/`trim`). Pet form 2 adds markings or armor in `accent`, form 3 a glow or flames in `glow`. New variants are config entries, not new drawings.
- **`scenery.js`** — `paintBackdrop(g, theme, w, h, gy, seed)` paints a zone (`meadow`, `forest`, `cave`, `desert`, `ice`, `volcano`; `ZONES[].theme`) in scene units with a seeded RNG; `createWeather` is the live layer; `paintDungeon` is the Zindan room.
- **`render.js`** (v0.3 additions) — draws the combo meter, the hero HP bar under the feet, the wind-up warning (ring, "!" bubble, tap pips), stun stars and the shield bubble from live state each frame; the `windup`, `interrupt`, `heroHit`, `heroDown`, `shieldBreak`, `goblinFlee` and `eliteFlee` events start the matching animations. Enemy looks carry `armored` (iron helmet in place of the boss crown) and `elite` (golden aura).
- **`render.js`** — the canvas is sized in device pixels (DPR capped at 2.5, lowered in steps if frames stay slow) and the scene is 300 units tall; the backdrop is cached per zone and size with a margin for camera shake. A tap plays a hero swing and queues its hit effects `STRIKE_DELAY` later so they land when the blade connects; `kill` queues behind it. Crits add hit-stop, a punch-in and shake (skipped with reduced motion). It keeps its own `enemy` snapshot and only re-syncs on `spawn`, or on `stage` when the enemy is alive.
- **`fx.js`** — particles, smoke puffs, impact stars, rings, slash crescents, projectiles, numbers and the ribbon banner; shared by both renderers.
- **`icons.js`** — UI icons (`ICONS`) and actor portraits (`iconUrl('actor:dog', look)`), rendered to PNG data URLs at the screen's density. `data-icon` names in `index.html` must exist in `ICONS` (tested).
- **`sound.js`** — synthesized effects through a compressor and a generated reverb, plus a small sequencer for background music: one mood per zone (key, tempo, drums), faster for bosses. `settings.music` and `settings.sound` are separate toggles.
- **`ui.js`** — unchanged structure from Piksel Savaşçı: builds cards once, updates text through `set()`, never mutates state.
- **`ui-windows.js`** — the top-right menu bubble and its parchment windows. Views are built when a window opens and updated with the panel refresh; the Ayarlar view is the `#settings-view` element from `index.html`, moved into the window. Badges: daily claimable, unread or uncollected mail, unseen patch notes or news.
- **Daily login and mail** (`logic.js`) — `claimDaily(state, now)` works on local calendar days (`dayKey`): consecutive days walk the 7-slot `DAILY` cycle, a gap restarts it, gold is worth `DAILY.gold[i]` enemies of the farmed frontier stage. `MAIL` (config) is shown to everyone; `state.mail.claimed/read` hold ids. New players start with 0 elmas and get 100 from the `welcome` mail; v1 saves (which started with 100) get it marked claimed. Daily, mail and `seen` survive rebirth; skill levels and cooldowns don't.
- **Combat v0.3** (`logic.js`, numbers in `config.js`):
  - **Combo.** Player taps within `COMBO.window` of each other build `state.combo`, and its tiers multiply manual tap damage. Kılıç Fırtınası hits don't count. `combo` and `hero` are live state: they aren't saved, and `hero.hp` refills on load.
  - **Hero HP and armor.** Max HP is `hpBase × hpGrowth^vitality × souls`. Damage taken is `armorK / (armorK + armor)` with `armor = armorPerLevel × level`, the standard diminishing-returns formula the user asked for; it never reaches zero.
  - **Enemy attacks.** Bosses and elites run `enemy.attack { cd, windup, need }`. During the wind-up, `ATTACK.taps` manual taps interrupt it: stun for `ATTACK.stun`, ×`stunBonus` damage. Otherwise the hit lands for `attackDamage()`, which is `atkBase × atkGrowth^(stage-1)` eased in over `ramp` stages, then reduced by armor. A knocked-out hero (`heroDown`) loses a boss fight like a timeout; an elite just leaves. The hero regenerates while nothing can attack and is refilled at each boss spawn.
  - **Shields.** Every `SHIELD.every`th stage's boss has `enemy.shield`; damage goes there first, the pet's at `SHIELD.petMult`, and breaking it stuns.
  - **Variants.** Ordinary enemies from `SPECIALS.minStage` roll a `variant`: `goblin` (flees after `flee` s, ×gold), `elite` (×HP, ×gold, attacks), or `armored` (non-crits ×`nonCrit`).
  - **Tuning (v0.4, with equipment).** Auto-equipping drops, without upgrading them, moves the 4-hour stage from ~90 to ~100, and stage 80 from ~57 to ~22 minutes (`node tools/sim.js --share 0.15`, compare `--no-gear`).
  - **Tuning (v0.3).** A player keeping ~15% of their gold in Dayanıklılık + Demir Zırh survives about 5 boss hits at the frontier; skipping defense makes bosses past ~stage 25 a race against the first hit. Active pacing at 5 taps/s with that split: stage 20 ≈ 3 min, 50 ≈ 15 min, ~90 after 4 h (Piksel Savaşçı: 3.7 min, 19 min, 85).
- **Equipment** (`gear.js`, `ui-gear.js`) — `state.equipment = { slots: { weapon, helm, charm }, bag, next }`, with items `{ uid, slot, rarity (RARITIES index), level, stats: [{ k, roll }], locked? }`.
  - **UI.** The Ekipman screen is its own overlay (`#gear-screen`, `createGearScreen`), not a menu window, opened by the bag button (`#bag-btn`, `createBagButton`) under the menu button; its badge means the bag holds something better than what's worn. The Kahraman tab has no equipment card (the user found it too big); its power summary is one thin strip of icon + value chips, and a tap names the stat. It shows the hero portrait with the worn gear between the slots, then the worn totals, Otomatik parçala and Zayıfları parçala, the bag (▲/▼ against what's worn, a lock badge) and an item card popup.
  - **Stat display.** Stats show as small symbol chips (`EQUIP_STATS[k].icon`) in `STAT_ORDER`: attack, then health (the user asked for that), then the rest.
  - **Locking and salvage.** Locked items are never salvaged. With `settings.autoSalvage` on, drops weaker than the worn item (`isWorse`, by `itemScore`) turn into kristal at once.
  - **Stats.** An item always has its slot's first stat, plus more by rarity. A stat is worth `base × rarityMult × roll × (1 + levelStep × (level − 1))`. `gearTotals(state)` sums the worn items, and logic.js applies them:
    - `tap` and `boss` in tapDamage and in tap() against bosses
    - `critDmg` in critMultiplier
    - `hp` and `armor` in heroMaxHp and heroArmor
    - `stun` in stunDuration
    - `gold` in goldMultiplier
    - `pet` in petDps
    - `combo` in comboWindow
  - **Drops.** A first-ever boss win always drops an item, a repeat win sometimes (`EQUIP.bossChance`). The dungeon chest on every 10th floor drops one, and chests can be bought for elmas. When the bag is full, new drops are salvaged for kristal.
  - **Looks.** The hero's sword and helmet colors follow the worn rarity (`look.weapon` / `look.helm` in people.js).
  - **Persistence.** `loadEquipment` validates every field, and equipment survives rebirth.
- **Soul tree** (`souls.js`, `ui-souls.js`) — `state.soulPoints` and `state.soulTree[id]`. Each rebirth adds as many points as souls gained, and souls keep their +10%. Level L+1 of a node costs L+1 points. Effects come from `treeValue(state, id)`:
  - `tapPower`, `petPower` and `goldPower` multiply tap damage, pet damage and gold
  - `bossTime` is added to `bossTime(state)`
  - `startStage` moves the start of a new run (in prestige)
  - `offline` boosts offline gold
  - `skillTime` and `cooldown` change `skillDuration` and `skillCooldown`
  - `comboTime` lengthens the combo window

  v2 saves turned existing souls into points (SAVE_VERSION 3).
- **Pet abilities** (`PETS[].ability`, power × `ABILITY_FORM_MULT[form − 1]`, via `petAbility(state)`):
  - **Passive:** `keen` adds crit chance and `scan` adds gold.
  - **Timed, in `updatePetAbility` with timers in the live `state.petFx`:** `bark` stuns, `laser` hits for `power` × pet DPS, and `breath` burns for `burn` seconds.
  - **Revive:** `revive` stops one knockout per fight in updateAttack.
  - Enemy stun now counts down in tick for every enemy, not only attackers.
- **Dungeon v0.4** (`dungeon.js`, `ui-dungeon.js`):
  - **Synergies.** `SYNERGIES` from team roles (`activeSynergies`, `synergyBonus`) multiply fighter stats in makeFighters.
  - **Chests.** The first clear of every `DUNGEON.chestEvery`th floor adds kristal and an item (`dg-chest`).
  - **Offline.** `offlineDungeon(state, seconds)` runs `tickDungeon` in `offlineStep` steps for up to OFFLINE_CAP; main.js shows the result in the welcome-back modal.
- **Quests and achievements** — `QUESTS` pool: `ensureQuests(state, now)` picks `QUESTS_PER_DAY` per local day from a hash of the date (the same for everyone) and records each stat's start value; progress is the stat's growth since then (`combo` is the day's best). All three claimed → `QUEST_BONUS`. `ACHIEVEMENTS` are tiered on stats (or `pets`/`dungeon`), with `state.achievements[id]` = tiers collected and elmas from `ACHIEVEMENT_ELMAS`. Both survive rebirth. The Görevler window lives in `ui-windows.js`.
- **Zone bosses (v0.6)** — the last stage of each zone (`isZoneBossStage`) shows `ZONES[].boss` instead of a crowned ordinary enemy; `L.enemySpec(state)` picks the actor, name and colors for the renderer and HUD (in later tours, `tourIndex`, the boss uses `boss.tours` colors). The actors live in `bosses.js` with `bossScale` (drawing scale; ordinary bosses use 1.5) and `special` (`slam`, `leaves`, `crystals`). render.js plays their own `enter` (`bossEnter`, crash landing at `BOSS_LAND`, then `bossLanding`), gathers particles during the wind-up (`chargeFx`) and runs `specialAttack(kind)` on `heroHit`, which returns when the hit reaches the hero; if that hit ends the fight, the next enemy waits (`holdSync`). sound.js has `zoneBoss()` and `bossAttack(kind)`. A first-ever zone boss win adds `ZONE_BOSS_ELMAS`. Rules (HP, shield, attacks) are the same as other zone-end bosses.
- **Mega bosses (v0.6, the Harita)** — the user wanted the map to be a separate battleground, not a copy of the main road. `MEGA_BOSSES` (config) are six lands, each with a mega boss that unlocks once `stats.bestStage` passes `unlock` (100, 200, …; never met in the main battle), in `megabosses.js` (`standOff` keeps them further from the hero). A fight (`startRaid`) costs a key (`RAID.keysPerDay`, refilled per local day by `refreshRaidKeys`; more for elmas; a lost fight refunds it and a first win adds `firstKeys`, as the user asked) and swaps `state.enemy` for the boss (`variant: 'raid'`), so taps, pet, skills and wind-ups work unchanged; `setStage` is blocked meanwhile. HP is the stage boss's × `hpMult` × `levelGrowth^(level−1)`; attacks use `atkStage`/`atkMult` in attackDamage. Three phases (`updatePhase`, `raidPhase` event) raise attack and speed. `raidWon` pays `first` once (elmas, a min-rarity item via `dropItem(…, 'mega', rarity)`) and `RAID.repeat` after, and levels the boss and its permanent trophy (`trophyValue(state, kind)` feeds tap/pet/gold/hp/critDmg multipliers). After a win the victory pause is the enemy's respawn delay; a loss (time, knockout, "Arenadan çık") spawns the main enemy at once. `state.raid = { keys, day, wins }` is saved and survives rebirth; the live fight is not saved. The renderer paints the arena theme (`labyrinth`, `lair` in scenery.js) while the boss or its death is on screen. UI: the map window (`ui-map.js`), the HUD shows land, level and phase, the auto button becomes "Arenadan çık", and `ui.showRaidWin` shows the rewards. `node tools/sim.js --mega` prints how long the first mega boss would take at each stage (Sv.1 ≈ 55 s at the first run's ~110 wall). Kraken, Tepegöz, Lich Kral and Kara Ejderha are `soon` entries still to draw.
- **Leaderboard** — placeholder ("Çok yakında..."). A real one needs an online backend (accounts, score submission, cheat checks); GitHub Pages can't store other players' scores.

## Rules to keep

- Wrap every `localStorage` access in try/catch; the game must work without storage.
- Saved data is untrusted: anything new in the state needs a matching line in `loadState`. Bump `SAVE_VERSION` and migrate when the shape changes incompatibly.
- Balance numbers live in `config.js` and still match Piksel Savaşçı; re-check pacing with a simulation when changing them (stage 20 at ~4 min with the starter dog, wall around stage 80).
- Put text into the DOM with `textContent`, not `innerHTML`.
- No zoom (the user asked):
  - the viewport meta locks the scale
  - `html, body` have `touch-action: pan-x pan-y`, which also blocks double-tap zoom
  - main.js cancels iOS `gesture*` events, multi-touch `touchmove` and ctrl+wheel

  Don't block `touchend` to stop double taps: that also eats quick repeated taps on buttons.
- Boss wind-ups need `ATTACK.taps` = 5 taps in 1.4 s, as the user asked after trying 8. A player tapping steadily at 5/s now interrupts without noticing, so defense matters mostly for casual and idle play.
- PWA: a new file the page loads must be added to `SHELL` in `sw.js` or `npm test` fails. The worker fetches game files with `cache: 'no-cache'`: without it the browser's HTTP cache (GitHub Pages: 10 minutes; locally, heuristic caching) served stale modules next to fresh ones after a change. If a local edit doesn't show, update the worker (`reg.update()`) and reload twice.
- Icons are generated: run `npm run icons` and open the printed URL in a browser; `tools/icons.html` draws them and the server writes `icons/`. Don't edit the PNGs.
- Keep drawing code free of per-frame allocations that grow (no new canvases or gradients cached forever per frame); everything is redrawn every frame.

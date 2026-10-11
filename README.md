# Slasher Hero

A storybook-style idle clicker for the browser, built phone-first: the high-graphics successor of Piksel Savaşçı. Same gameplay, redrawn as smooth vector art with skeletal animation, so it stays sharp on every screen and at any zoom. Plain HTML, CSS and JavaScript (ES modules), no build step and no dependencies. UI text is Turkish.

**Play:** <https://codder-ctrl.github.io/slasher-hero/> (GitHub Pages; every push to `main` redeploys it).

## Getting started

Browsers won't load ES modules from a `file://` page, so serve the folder over HTTP:

```bash
python -m http.server 8003 --directory slasher-hero
```

Then open <http://localhost:8003>. On a phone on the same Wi-Fi, open `http://<your-PC-IP>:8003`.

Run the tests (Node 18+):

```bash
npm test
```

## How it plays

The rules are the same as Piksel Savaşçı:

- Tap the battle to swing the sword, and kill enemies for gold.
- 10 kills clear a stage, and every 5th stage is a timed boss.
- The zone changes every 10 stages.
- Upgrades, pets with eggs and evolutions, the dungeon with companions, five active skills and rebirth for soul stones all work as before.

Progression since v0.4:

- **Ekipman:** weapon, helmet and charm slots, with items in four rarities. Upgrade them with kristal or break them down for it. The worn sword and helmet show on the hero.
- **Ruh Ağacı:** every rebirth gives soul points for 9 permanent upgrades in three branches.
- **Zindan:**
  - the team keeps fighting while the game is closed
  - team synergies give bonuses by role mix
  - a chest opens every 10 floors
- **Pet abilities:** each pet has its own skill that grows with evolution:
  - the dog barks and stuns
  - the robot fires a laser
  - the dragon breathes fire
  - the phoenix revives the hero once per fight

Combat since v0.3:

- **Combo:** quick taps build a combo; at 10, 25, 50 and 100 hits your taps get stronger.
- **Boss attacks:** bosses and elites wind up an attack (red "!"). Tap fast to interrupt it, stunning them and dealing extra damage. Otherwise the hero takes the hit.
- **Health and armor:** Dayanıklılık raises the hero's HP and Demir Zırh reduces damage with diminishing returns. A knocked-out hero loses the boss fight.
- **Shields:** every 10th boss hides behind a shield that only taps break well.
- **Special enemies:**
  - the Hazine Goblini runs off with its gold sack if you don't catch it in time
  - elites are tougher and attack
  - armored enemies only take full damage from crits
- **Görevler:** three daily quests with a bonus chest, plus tiered achievements.

Extras since v0.2, behind the menu button under the version label in the top-right:

- **Görevler:** daily quests and achievements.
- **Günlük Giriş:** a reward every day on a 7-day streak. The gold grows with progress, and day 7 adds elmas.
- **Posta:** mails with gifts. New players get their first 100 elmas here.
- **Lider Tablosu:** coming soon.
- **Blog:** patch notes by version, and announcements with cover pictures.
- **Ayarlar:** statistics, sound and music, and save codes.

What's new is how it looks and sounds:

- **Vector art:** every character, enemy, pet, icon and zone is drawn in code with thick outlines and two-tone shading, at the screen's real resolution.
- **Skeletal animation:** the hero has three sword swings, the third one for crits. Enemies hop in, flinch when hit and vanish in a puff. Pets have their own attacks, and evolved pets get armor, markings and flames.
- **Effects:**
  - sword trails, impact stars and slash marks
  - smoke puffs and bouncing coins
  - camera shake, plus a short hit-stop on crits
  - ribbon banners
  - auras for the skills
- **Sound:** synthesized hits, swooshes, coins and skill sounds, plus background music that changes with the zone and speeds up for bosses. Effects and music can be turned off separately in Menü.

Saves from Piksel Savaşçı don't carry over: the save code import only accepts Slasher Hero codes.

## Project layout

| File | Contents |
|---|---|
| `js/config.js` | Balance constants and content tables (colors of every enemy, pet form and companion) |
| `js/logic.js`, `js/dungeon.js` | Game rules (unchanged from Piksel Savaşçı) |
| `js/paint.js` | Drawing style: outlined, shaded shapes and path helpers |
| `js/anim.js` | Pose animation: keyframe tracks and blending |
| `js/people.js`, `js/monsters.js`, `js/pets.js` | The actors: hero and companions, enemies, pets |
| `js/scenery.js` | Zone backdrops, the dungeon room and weather |
| `js/fx.js` | Particles, puffs, impacts, projectiles, numbers, banners |
| `js/render.js`, `js/dungeon-view.js` | The battle and dungeon scenes |
| `js/icons.js` | UI icons and portraits |
| `js/sound.js` | Sound effects and music (WebAudio) |
| `js/ui*.js`, `js/main.js`, `js/store.js` | Interface (incl. the menu windows in `ui-windows.js`), game loop and saving |
| `js/news.js` | Blog announcements |
| `js/gear.js`, `js/souls.js` | Equipment and soul tree rules |
| `js/ui-gear.js`, `js/ui-souls.js` | Equipment card and window, soul tree section |
| `tools/pose-lab.html` | Development view of every actor and its animation frames |
| `tools/sim.js` | Headless pacing simulation (`node tools/sim.js --help` options in the file header) |
| `tools/icon-server.js`, `tools/icons.html` | Icon generator (`npm run icons`) |

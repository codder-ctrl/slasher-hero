import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ACTORS } from '../js/actors.js';
import { createAnimator } from '../js/anim.js';
import { ICONS } from '../js/icons.js';
import { paintBackdrop, paintDungeon, createWeather, THEME_IDS } from '../js/scenery.js';
import { createFx } from '../js/fx.js';
import { UPGRADES, SKILLS, ZONES, PETS, COMPANIONS, DUNGEON, PET_TRAINING, FORM_MULT, RARITIES, MAIL } from '../js/config.js';
import { NEWS } from '../js/news.js';
import { existsSync } from 'node:fs';

// A stand-in for CanvasRenderingContext2D that records path coordinates, so drawing code can
// run under Node and every number it produces can be checked.
function mockContext() {
  const numbers = [];
  const record = (...args) => { for (const a of args) if (typeof a === 'number') numbers.push(a); };
  const gradient = { addColorStop() {} };
  const ctx = {
    numbers,
    globalAlpha: 1,
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    createRadialGradient: (...a) => { record(...a); return gradient; },
    createLinearGradient: (...a) => { record(...a); return gradient; },
    measureText: () => ({ width: 40 }),
  };
  for (const m of ['save', 'restore', 'beginPath', 'closePath', 'fill', 'stroke', 'clip', 'fillText', 'strokeText', 'setTransform', 'drawImage']) ctx[m] = () => {};
  for (const m of ['translate', 'rotate', 'scale', 'moveTo', 'lineTo', 'quadraticCurveTo', 'bezierCurveTo', 'arc', 'arcTo', 'ellipse', 'rect', 'fillRect']) ctx[m] = record;
  return ctx;
}

// Every look an actor appears with in the game.
function looksFor(id) {
  const looks = [];
  for (const z of ZONES) for (const e of z.enemies) if (e.actor === id) looks.push({ colors: e.colors }, { colors: e.colors, boss: true });
  for (const e of DUNGEON.enemies) if (e.actor === id) looks.push({ colors: e.colors });
  for (const p of PETS) if (p.actor === id) p.forms.forEach((f, i) => looks.push({ colors: f.colors, form: i + 1 }));
  for (const c of COMPANIONS) if (c.actor === id) looks.push({ colors: c.colors, role: c.role, shotColor: c.shotColor });
  if (id === 'hero') looks.push({}, { rage: true });
  return looks;
}

test('content tables point at existing actors and icons', () => {
  for (const z of ZONES) {
    assert.ok(THEME_IDS.includes(z.theme), z.name);
    for (const e of z.enemies) assert.ok(ACTORS[e.actor], e.name);
  }
  for (const e of DUNGEON.enemies) assert.ok(ACTORS[e.actor], e.actor);
  for (const p of PETS) assert.ok(ACTORS[p.actor], p.id);
  for (const c of COMPANIONS) assert.ok(ACTORS[c.actor], c.id);
  for (const d of [...UPGRADES, ...SKILLS, PET_TRAINING]) assert.ok(ICONS[d.icon], d.id);
});

test('every icon the page asks for exists', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const names = [...html.matchAll(/data-icon="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(names.length > 5);
  for (const n of names) assert.ok(ICONS[n], n);
  for (const n of ['coinIcon', 'crystal', 'gem', 'lock']) assert.ok(ICONS[n], n);
});

test('pet forms and companions have every color their actors use', () => {
  for (const p of PETS) {
    assert.equal(p.forms.length, FORM_MULT.length);
    assert.ok(RARITIES.some((r) => r.id === p.rarity), p.id);
    for (const f of p.forms) for (const k of ['body', 'belly', 'dark', 'accent', 'glow']) assert.match(f.colors[k] || '', /^#[0-9a-f]{6}$/, `${p.id} ${f.name} ${k}`);
  }
  for (const c of COMPANIONS) for (const k of ['main', 'trim']) assert.match(c.colors[k] || '', /^#[0-9a-f]{6}$/, `${c.id} ${k}`);
  for (const z of ZONES) for (const e of z.enemies) for (const k of ['body', 'accent']) assert.match(e.colors[k] || '', /^#[0-9a-f]{6}$/, `${e.name} ${k}`);
});

test('every actor draws every action at every stage with finite coordinates', () => {
  for (const [id, def] of Object.entries(ACTORS)) {
    const looks = looksFor(id);
    assert.ok(looks.length, `${id} is used somewhere`);
    for (const look of looks) {
      const names = [null, ...Object.keys(def.actions)];
      for (const name of names) {
        for (const variant of [0, 1, 2]) {
          for (const p of [0, 0.15, 0.3, 0.45, 0.7, 1]) {
            const anim = createAnimator(def, look);
            if (name) {
              const inst = anim.play(name, variant);
              inst.t = p;
              inst.w = 1;
            }
            const pose = anim.update(0.016);
            const ctx = mockContext();
            const out = {};
            def.draw(ctx, pose, look, out);
            assert.ok(ctx.numbers.length > 20, `${id} drew something`);
            assert.ok(ctx.numbers.every(Number.isFinite), `${id} ${name} ${variant} ${p}: non-finite coordinate`);
          }
        }
      }
    }
  }
});

test('the hero reports its sword tip and pets report a muzzle for effects', () => {
  const heroOut = {};
  const a = createAnimator(ACTORS.hero, {});
  ACTORS.hero.draw(mockContext(), a.update(0.016), {}, heroOut);
  assert.ok(heroOut.tip && heroOut.base);
  for (const p of PETS) {
    const out = {};
    const look = { colors: p.forms[0].colors, form: 1 };
    ACTORS[p.actor].draw(mockContext(), createAnimator(ACTORS[p.actor], look).update(0.016), look, out);
    assert.ok(out.muzzle, p.id);
  }
});

test('attack swings blend back to rest without spinning', () => {
  // A swing past π must not leave the arm wound up a full turn once it has finished.
  const a = createAnimator(ACTORS.hero, {});
  for (const v of [0, 1, 2]) {
    a.play('attack', v);
    for (let i = 0; i < 60; i++) a.update(1 / 60);
    assert.ok(Math.abs(a.pose.armF - ACTORS.hero.rest.armF) < 0.3, `variant ${v}`);
  }
  // Rapid taps restart the swing mid-way. Catching up with a new windup may move the arm a bit
  // faster than an uninterrupted swing, but a step near half a turn would mean the blend went
  // the wrong way round. It must also settle back at rest.
  const turn = (x) => Math.abs(x - Math.round(x / (Math.PI * 2)) * Math.PI * 2);
  let fastest = 0;
  for (const v of [0, 1, 2]) {
    const s = createAnimator(ACTORS.hero, {});
    let prev = s.update(0).armF;
    s.play('attack', v);
    for (let i = 0; i < 40; i++) { const now = s.update(1 / 60).armF; fastest = Math.max(fastest, turn(now - prev)); prev = now; }
  }
  // Every 4 frames is 15 taps a second, faster than anyone taps.
  for (const every of [4, 5, 6, 9, 15]) {
    const b = createAnimator(ACTORS.hero, {});
    let prev = b.update(0).armF;
    for (let i = 0; i < 90; i++) {
      if (i < 60 && i % every === 0) b.play('attack', Math.floor(i / every) % 3);
      const now = b.update(1 / 60).armF;
      assert.ok(turn(now - prev) <= Math.max(fastest * 1.4, 2.4), `tap every ${every} frames, frame ${i}: step ${turn(now - prev).toFixed(2)} > ${fastest.toFixed(2)}`);
      prev = now;
    }
    assert.ok(turn(prev - ACTORS.hero.rest.armF) < 0.2, `settles after taps every ${every} frames`);
  }
});

test('every backdrop, the dungeon and the weather paint with finite coordinates', () => {
  for (const theme of THEME_IDS) {
    const ctx = mockContext();
    paintBackdrop(ctx, theme, 320, 300, 246, 3);
    assert.ok(ctx.numbers.length > 100, theme);
    assert.ok(ctx.numbers.every(Number.isFinite), theme);
    const w = createWeather(theme, 320, 246, 3);
    for (let i = 0; i < 5; i++) w.draw(ctx, 0.016);
    assert.ok(ctx.numbers.every(Number.isFinite), `${theme} weather`);
  }
  const ctx = mockContext();
  paintDungeon(ctx, 320, 160, 136);
  assert.ok(ctx.numbers.every(Number.isFinite));
});

test('icons draw with finite coordinates', () => {
  for (const [name, draw] of Object.entries(ICONS)) {
    if (name.startsWith('tab')) continue;
    const ctx = mockContext();
    draw(ctx);
    assert.ok(ctx.numbers.length > 4 && ctx.numbers.every(Number.isFinite), name);
  }
});

test('effects run their whole lifetime', () => {
  const fx = createFx();
  const ctx = mockContext();
  let hit = 0;
  fx.burst(10, 10, ['#ffffff'], 5);
  fx.puff(10, 10);
  fx.impact(10, 10, 2);
  fx.ring(10, 10, 1, 20, '#ffffff');
  fx.slash(10, 10, 30, 0.5);
  fx.shot({ x0: 0, y0: 0, x1: 50, y1: 0, kind: 'orb', color: '#ffffff', onHit: () => hit++ });
  fx.number('12', 10, 10);
  fx.banner('BOSS!');
  for (let i = 0; i < 200; i++) fx.draw(ctx, 0.016, 320);
  assert.equal(hit, 1);
  assert.equal(fx.bannerActive, false);
  assert.ok(ctx.numbers.every(Number.isFinite));
});

test('blog posts and mails are complete and their covers exist', () => {
  const ids = new Set();
  for (const n of NEWS) {
    assert.ok(!ids.has(n.id), `duplicate news id ${n.id}`);
    ids.add(n.id);
    assert.match(n.date, /^\d{4}-\d{2}-\d{2}$/, n.id);
    assert.ok(n.title && n.body.length, n.id);
    if (n.cover.startsWith('scene:')) {
      const [, theme, enemy] = n.cover.split(':');
      assert.ok(THEME_IDS.includes(theme), n.id);
      if (enemy) assert.ok(ZONES.some((z) => z.enemies.some((e) => e.actor === enemy)), n.id);
    } else {
      assert.ok(existsSync(new URL(`../${n.cover}`, import.meta.url)), `${n.id}: missing ${n.cover}`);
    }
  }
  for (let i = 1; i < NEWS.length; i++) assert.ok(NEWS[i - 1].date >= NEWS[i].date, 'newest first');
  const mailIds = new Set(MAIL.map((m) => m.id));
  assert.equal(mailIds.size, MAIL.length);
  for (const m of MAIL) assert.ok(m.title && m.from && m.body.length, m.id);
});

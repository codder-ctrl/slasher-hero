import { ACTORS } from './actors.js';
import { createAnimator } from './anim.js';
import { at, blob, line, flat, glow, shadow, tint, circle, ellipse, star, roundRect, mix, darker, rgba, INK } from './paint.js';
import { paintBackdrop, createWeather } from './scenery.js';
import { createFx } from './fx.js';
import { PETS, ZONES, SPECIALS, ATTACK, COMBO, RARITIES } from './config.js';
import { zoneIndex, formatNumber, totalDps, heroMaxHp, comboTier } from './logic.js';

// The battle scene. Everything is vector-drawn every frame at the screen's real resolution:
// the canvas is sized in device pixels and the scene is SCENE_H units tall, so it stays sharp
// at any size. The painted backdrop is cached per zone and size. Effects that follow a sword
// swing are queued to land on the frame the blade connects, not the instant of the tap.

const SCENE_H = 300;
const MARGIN = 12;          // backdrop overscan so camera shake never shows an edge
const MAX_DPR = 2.5;
const MIN_DPR = 1.25;
const STRIKE_DELAY = 0.085; // seconds from tap to the blade connecting (~p 0.33 of the swing)
const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let dpr = 1, k = 1, W = 300, gy = 246;
  let dprCap = MAX_DPR;
  let slow = 0;           // seconds spent below ~45 fps; lowers the resolution if it adds up
  let bg = null, bgKey = '', weather = null;
  let time = 0;
  const fx = createFx();
  const cam = { shake: 0, mag: 0, punch: 0, s: 1, ox: 0, oy: 0 };
  let hitstop = 0;

  // ---- Actors ----

  const hero = { anim: createAnimator(ACTORS.hero, { colors: {} }), out: {}, flash: 0 };
  let comboPop = 0;
  let lastCombo = 0;
  let beam = null;          // Robot's laser: { t, life }
  const trail = [];
  let swing = 0;

  let pet = null;         // { key, def, look, anim, out }
  let petTimer = 0.8;
  let enemy = null;       // { stage, boss, def, look, anim, out, flash }
  const dying = [];
  const pending = [];     // { at, fn } effects waiting for the blade
  let impactAt = 0;

  const coins = [];
  let coinTargetCss = { x: 24, y: 24 };
  let onCoin = () => {};
  let onPetShot = () => {};
  let hitSound = () => {};
  let warcryPulse = 0;
  let lastState = null;

  const heroX = () => W / 2 - 48;
  const petX = () => W / 2 - 100;
  const enemyX = () => W / 2 + 70;

  // Scene point an attack aims for on the current enemy.
  function enemyCenter(e = enemy) {
    if (!e) return { x: enemyX(), y: gy - 30 };
    const s = e.boss ? 1.5 : 1;
    const P = e.anim.pose;
    // Enemies are mirrored: local +x (their front) points left on screen.
    return { x: enemyX() - (P.x + 8) * s, y: gy + (P.y - e.def.height * 0.5) * s };
  }

  function makeEnemy(state) {
    const zone = ZONES[zoneIndex(state.stage)];
    const v = state.enemy.variant;
    const spec = v === 'goblin' ? SPECIALS.goblin : zone.enemies[state.enemy.kind] ?? zone.enemies[0];
    const def = ACTORS[spec.actor];
    const look = { colors: spec.colors, boss: state.enemy.boss, armored: v === 'armored', elite: v === 'elite' };
    const anim = createAnimator(def, look);
    anim.play('enter');
    anim.update(0);
    return { stage: state.stage, boss: state.enemy.boss, variant: v, def, look, anim, out: {}, flash: 0 };
  }

  function syncPet(state) {
    const p = PETS.find((x) => x.id === state.activePet);
    const owned = state.pets[state.activePet];
    if (!p || !owned) { pet = null; return; }
    const key = `${p.id}:${owned.form}`;
    if (pet?.key === key) return;
    const def = ACTORS[p.actor];
    const look = { colors: p.forms[owned.form - 1].colors, form: owned.form };
    pet = { key, p, def, look, anim: createAnimator(def, look), out: {} };
  }

  // ---- Layout ----

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    k = canvas.height / SCENE_H;
    W = canvas.width / k;
    gy = Math.round(SCENE_H * 0.82);
    fx.setGround(gy);
    bgKey = '';
  }

  function buildBackdrop(theme, seed) {
    const c = document.createElement('canvas');
    c.width = Math.ceil((W + MARGIN * 2) * k);
    c.height = Math.ceil((SCENE_H + MARGIN * 2) * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    paintBackdrop(g, theme, W + MARGIN * 2, SCENE_H + MARGIN * 2, gy + MARGIN, seed);
    // Soft vignette baked in.
    const v = g.createRadialGradient((W + MARGIN * 2) / 2, SCENE_H * 0.55, SCENE_H * 0.35, (W + MARGIN * 2) / 2, SCENE_H * 0.55, SCENE_H * 0.95);
    v.addColorStop(0, 'rgba(20,10,30,0)');
    v.addColorStop(1, 'rgba(20,10,30,0.35)');
    g.fillStyle = v;
    g.fillRect(0, 0, W + MARGIN * 2, SCENE_H + MARGIN * 2);
    return c;
  }

  const toScene = (devX, devY) => ({ x: (devX - cam.ox) / cam.s, y: (devY - cam.oy) / cam.s });

  // ---- Drawing actors ----

  function drawEnemy(e, dt, alpha = 1) {
    const P = e.anim.pose;
    const s = e.boss ? 1.5 : 1;
    const a = Math.max(0, Math.min(1, P.alpha)) * alpha;
    if (a <= 0) return;
    const hover = e.def.hover || 0;
    shadow(ctx, enemyX() + P.x * -s, gy + 1, (e.def.height * 0.42 + 4) * s * (hover ? 0.7 : 1), 0.3 * a);
    if (e.boss) glow(ctx, enemyX(), gy - 4, 60, '#ff3a3a', 0.18 + 0.06 * Math.sin(time * 4));
    if (e.look.elite) {
      const c = enemyCenter(e);
      glow(ctx, c.x, c.y, e.def.height * 1.1, '#ffd23a', (0.4 + 0.12 * Math.sin(time * 6)) * a);
      if (Math.random() < 0.15) fx.particle({ x: c.x + Math.random() * 50 - 25, y: c.y + Math.random() * 40 - 20, vx: 0, vy: -30, g: 0, life: 0.5, size: 2.4, kind: 'star', color: '#fff2a0' });
    }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(enemyX(), gy);
    ctx.scale(-s, s);
    tint.amount = e.flash > 0 ? Math.min(0.85, e.flash * 10) : 0;
    e.def.draw(ctx, P, e.look, e.out);
    tint.amount = 0;
    ctx.restore();
  }

  function drawHero(state) {
    const P = hero.anim.pose;
    const rage = state.skillTimers.rage.active > 0;
    shadow(ctx, heroX() + P.x, gy + 1, 22, 0.32);
    hero.flash = Math.max(0, hero.flash - 1 / 60);
    if (rage) {
      glow(ctx, heroX() + P.x, gy - 46, 62, '#ff4a2a', 0.32 + 0.08 * Math.sin(time * 10));
    }
    if (state.skillTimers.storm.active > 0) glow(ctx, heroX() + P.x + 20, gy - 50, 56, '#7ff4ff', 0.22);
    ctx.save();
    ctx.translate(heroX(), gy);
    if (hero.flash > 0) { tint.amount = 0.6; tint.color = '#ff4a3a'; }
    const eq = state.equipment.slots;
    ACTORS.hero.draw(ctx, P, { rage, weapon: eq.weapon?.rarity ?? -1, helm: eq.helm?.rarity ?? -1 }, hero.out);
    tint.amount = 0;
    tint.color = '#ffffff';
    ctx.restore();
  }

  function drawPet(state) {
    if (!pet) return;
    const P = pet.anim.pose;
    const hover = pet.def.hover || 0;
    shadow(ctx, petX() + P.x, gy + 1, pet.def.height * 0.45 * (hover ? 0.6 : 1), 0.28);
    if (state.skillTimers.warcry.active > 0) glow(ctx, petX(), gy - 24 - hover, 46, '#ffd060', 0.3 + 0.1 * Math.sin(time * 8));
    ctx.save();
    ctx.translate(petX(), gy);
    pet.def.draw(ctx, P, pet.look, pet.out);
    ctx.restore();
  }

  // The sword trail: a ribbon between the recorded blade bases and tips, in device pixels.
  function drawTrail() {
    const now = time;
    while (trail.length && now - trail[0].t > 0.11) trail.shift();
    if (trail.length < 2) return;
    const first = trail[0];
    const last = trail[trail.length - 1];
    const crit = last.crit;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const grad = ctx.createLinearGradient(first.tx, first.ty, last.tx, last.ty);
    const edge = crit ? '255,190,80' : '170,230,255';
    grad.addColorStop(0, `rgba(${edge},0)`);
    grad.addColorStop(0.6, `rgba(${edge},0.55)`);
    grad.addColorStop(1, `rgba(${edge},0.9)`);
    const ribbon = (inner) => {
      ctx.beginPath();
      ctx.moveTo(trail[0].tx, trail[0].ty);
      for (let i = 1; i < trail.length; i++) {
        const p0 = trail[i - 1];
        const p1 = trail[i];
        ctx.quadraticCurveTo(p0.tx, p0.ty, (p0.tx + p1.tx) / 2, (p0.ty + p1.ty) / 2);
      }
      ctx.lineTo(last.tx, last.ty);
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        ctx.lineTo(p.bx + (p.tx - p.bx) * inner, p.by + (p.ty - p.by) * inner);
      }
      ctx.closePath();
    };
    ribbon(0);
    ctx.fillStyle = grad;
    ctx.fill();
    const core = ctx.createLinearGradient(first.tx, first.ty, last.tx, last.ty);
    core.addColorStop(0, 'rgba(255,255,255,0)');
    core.addColorStop(1, 'rgba(255,255,255,0.95)');
    ribbon(0.62);
    ctx.fillStyle = core;
    ctx.fill();
    ctx.restore();
  }

  function drawCoin(c) {
    const w = Math.abs(Math.cos(c.spin));
    at(ctx, c.x, c.y, 0, () => {
      blob(ctx, ellipse(0, 0, 5.4 * Math.max(0.18, w), 5.4), '#f6c03a', { ow: 1.4, depth: 1.2, light: '#fff2a8' });
      if (w > 0.45) line(ctx, ellipse(0, 0, 3.3 * w, 3.3), '#c88a1a', 1, 0.9);
    });
  }

  function updateCoins(dt) {
    const target = { x: (coinTargetCss.x * dpr) / k, y: (coinTargetCss.y * dpr) / k };
    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i];
      c.t += dt;
      c.spin += dt * 14;
      if (c.t < c.drop) {
        c.vy += 520 * dt;
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (c.y > gy + 4) { c.y = gy + 4; c.vy *= -0.45; c.vx *= 0.7; }
        c.sx = c.x; c.sy = c.y;
      } else {
        const q = Math.min(1, (c.t - c.drop) / 0.42);
        const e = q * q;
        c.x = c.sx + (target.x - c.sx) * e;
        c.y = c.sy + (target.y - c.sy) * e - Math.sin(Math.PI * q) * 30;
        if (q >= 1) { coins.splice(i, 1); onCoin(); continue; }
      }
      drawCoin(c);
    }
  }

  function dropCoins(x, y, n) {
    for (let i = 0; i < n; i++) {
      coins.push({ x, y, vx: Math.random() * 160 - 110, vy: -150 - Math.random() * 120, t: 0, drop: 0.55 + Math.random() * 0.25, spin: Math.random() * 6 });
    }
  }

  // Ongoing skill visuals that aren't part of an actor.
  function skillAuras(state, dt) {
    const t = state.skillTimers;
    if (t.rage.active > 0 && Math.random() < dt * 28) {
      fx.particle({ x: heroX() + hero.anim.pose.x - 14 + Math.random() * 28, y: gy - 10 - Math.random() * 70, vx: Math.random() * 16 - 8, vy: -40 - Math.random() * 30, g: -30, life: 0.6, size: 2 + Math.random() * 2, kind: 'ember', color: Math.random() < 0.5 ? '#ff6a2a' : '#ffb43a' });
    }
    if (t.warcry.active > 0 && pet) {
      warcryPulse -= dt;
      if (warcryPulse <= 0) {
        warcryPulse = 0.7;
        fx.ring(petX(), gy - 20 - (pet.def.hover || 0), 8, 46, '#ffd060', 0.6, 3);
      }
    }
    if (t.focus.active > 0 && enemy && lastState?.enemy.respawn <= 0) {
      const c = enemyCenter();
      const r = (enemy.boss ? 50 : 36) + Math.sin(time * 5) * 2;
      at(ctx, c.x, c.y, time * 1.4, () => {
        line(ctx, (g) => { for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; g.moveTo(Math.cos(a) * r, Math.sin(a) * r); g.arc(0, 0, r, a, a + 0.9); } }, '#4ad0ff', 2.6, 0.85);
        line(ctx, (g) => { for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.45; g.moveTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6)); g.lineTo(Math.cos(a) * (r + 6), Math.sin(a) * (r + 6)); } }, '#ffffff', 2, 0.8);
      });
    }
  }

  // ---- Combat overlays (from live state) ----

  // Wind-up warning, stun stars and the shield bubble on the current enemy.
  function enemyOverlays(state) {
    const e = state.enemy;
    if (!enemy || e.respawn > 0) return;
    const P = enemy.anim.pose;
    const s = enemy.boss ? 1.5 : 1;
    const c = enemyCenter();
    const top = gy + (P.y - enemy.def.height) * s - (enemy.boss ? 26 : 10);
    if (e.shield > 0) {
      const frac = e.shield / e.shieldMax;
      const rx = enemy.def.height * 0.72 * s;
      const ry = enemy.def.height * 0.62 * s;
      const pulse = 0.85 + 0.15 * Math.sin(time * 5);
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.2 * frac;
      flat(ctx, ellipse(c.x, c.y, rx, ry), '#8fd8ff');
      ctx.restore();
      line(ctx, ellipse(c.x, c.y, rx, ry), '#bff0ff', 3 * pulse, 0.9);
      line(ctx, (g) => { g.ellipse(c.x - rx * 0.2, c.y - ry * 0.2, rx * 0.7, ry * 0.7, 0, Math.PI * 1.1, Math.PI * 1.45); }, '#ffffff', 2.4, 0.8);
      if (frac < 0.6) {
        line(ctx, (g) => {
          g.moveTo(c.x - rx * 0.1, c.y - ry * 0.9); g.lineTo(c.x + rx * 0.1, c.y - ry * 0.4); g.lineTo(c.x - rx * 0.15, c.y - ry * 0.1);
          if (frac < 0.3) { g.moveTo(c.x + rx * 0.9, c.y); g.lineTo(c.x + rx * 0.45, c.y + ry * 0.15); g.lineTo(c.x + rx * 0.5, c.y + ry * 0.5); }
        }, '#ffffff', 2, 0.9);
      }
    }
    if (e.stun > 0) {
      const sy = Math.max(top + 8, SCENE_H * 0.52);
      for (let i = 0; i < 3; i++) {
        const a = time * 5 + (i / 3) * Math.PI * 2;
        blob(ctx, star(c.x + Math.cos(a) * 20 * s, sy + Math.sin(a) * 6, 6, 2.6, 5, a), '#ffe07a', { ow: 1.6, depth: 0.6 });
      }
    }
    const a = e.attack;
    if (a && a.windup > 0) {
      const k = 1 - a.windup / ATTACK.windup;
      glow(ctx, c.x, gy - 6, 70 * s, '#ff2a2a', 0.25 + 0.2 * Math.sin(time * 18));
      line(ctx, circle(c.x, c.y, (enemy.def.height * 0.9 + 40 * (1 - k)) * s), '#ff5a4a', 3, 0.5 + 0.5 * k);
      // "!" bubble with one pip per tap still needed.
      // Kept below the HUD even for tall or flying bosses.
      const by = Math.max(top - 14, SCENE_H * 0.5) + Math.sin(time * 14) * 2;
      blob(ctx, circle(c.x, by, 13), '#e0302a', { ow: 2.2, depth: 2 });
      fx.text(ctx, '!', c.x, by + 0.5, 20, '#fff8e0', { sw: 0.18 });
      const need = Math.max(0, a.need);
      for (let i = 0; i < ATTACK.taps; i++) {
        const px = c.x + (i - (ATTACK.taps - 1) / 2) * 8;
        blob(ctx, circle(px, by + 20, 3.2), i < ATTACK.taps - need ? '#ffe07a' : '#5a2a2a', { ow: 1.4, shade: false, noLight: true });
      }
      if (state.stats.interrupts < 3) fx.text(ctx, 'HIZLI DOKUN!', c.x, by + 34, 11, '#ffe07a', { sw: 0.28 });
    }
  }

  // The hero's health bar under their feet, shown while something can hit them or they're hurt.
  function heroBar(state) {
    const max = heroMaxHp(state);
    const e = state.enemy;
    const threat = e.attack && e.respawn <= 0;
    if (!threat && state.hero.hp >= max - 0.5) return;
    const frac = Math.max(0, state.hero.hp / max);
    const x = heroX() + hero.anim.pose.x - 24;
    const y = gy + 9;
    blob(ctx, roundRect(x, y, 48, 7, 3.5), '#2a1b17', { ow: 1.4, shade: false, noLight: true });
    const col = frac > 0.5 ? '#5ad05a' : frac > 0.25 ? '#f0b83a' : '#e0413b';
    if (frac > 0) flat(ctx, roundRect(x + 1, y + 1, 46 * frac, 5, 2.5), col);
    blob(ctx, (g) => { g.moveTo(x - 7, y + 6); g.bezierCurveTo(x - 13, y + 2, x - 12, y - 4, x - 7, y - 1); g.bezierCurveTo(x - 2, y - 4, x - 1, y + 2, x - 7, y + 6); g.closePath(); }, '#e0413b', { ow: 1.2, depth: 0.6 });
  }

  // Combo counter on the left, popping with each hit and colored by tier.
  function comboMeter(state, dt) {
    const c = state.combo;
    if (c.count !== lastCombo) { if (c.count > lastCombo) comboPop = 1; lastCombo = c.count; }
    comboPop = Math.max(0, comboPop - dt * 6);
    if (c.count < 3) return;
    const tier = comboTier(c.count);
    const color = !tier ? '#ffffff' : tier.at >= 100 ? '#ff7ae0' : tier.at >= 50 ? '#ff7a4a' : tier.at >= 25 ? '#ffb43a' : '#ffe680';
    const x = 34;
    const y = SCENE_H * 0.43;
    const scale = 1 + comboPop * 0.25;
    if (tier) glow(ctx, x, y, 34, color, 0.25);
    fx.text(ctx, String(c.count), x, y, 26, color, { scale, color2: '#fff8e0' });
    fx.text(ctx, tier ? `KOMBO ×${tier.mult}` : 'KOMBO', x, y + 18, 9, '#fff8e0', { sw: 0.3 });
    blob(ctx, roundRect(x - 20, y + 25, 40, 4, 2), '#2a1b17', { ow: 1, shade: false, noLight: true });
    flat(ctx, roundRect(x - 19.5, y + 25.5, 39 * Math.max(0, c.timer / COMBO.window), 3, 1.5), color);
  }

  // Pet ability effects that last a while: the laser beam and the dragon's burn.
  function petEffects(state, dt) {
    if (beam && pet && enemy) {
      beam.t -= dt;
      if (beam.t <= 0) beam = null;
      else {
        const from = pet.out.muzzle ? toScene(pet.out.muzzle.x, pet.out.muzzle.y) : { x: petX() + 14, y: gy - 26 };
        const to = enemyCenter();
        const a = beam.t / beam.life;
        line(ctx, (g) => { g.moveTo(from.x, from.y); g.lineTo(to.x, to.y); }, '#7ff4ff', 9 * a, 0.45);
        line(ctx, (g) => { g.moveTo(from.x, from.y); g.lineTo(to.x, to.y); }, '#ffffff', 3 * a, 0.95);
        glow(ctx, to.x, to.y, 26, '#7ff4ff', 0.6 * a);
      }
    }
    if (state.petFx.burn > 0 && enemy && state.enemy.respawn <= 0 && Math.random() < dt * 22) {
      const c = enemyCenter();
      const s = enemy.boss ? 1.5 : 1;
      fx.particle({ x: c.x + (Math.random() * 30 - 15) * s, y: c.y + (Math.random() * 30 - 5) * s, vx: Math.random() * 10 - 5, vy: -40 - Math.random() * 30, g: -20, life: 0.5, size: 2.4 + Math.random() * 2, kind: 'ember', color: Math.random() < 0.5 ? '#ff7a2a' : '#ffd060' });
    }
  }

  function petSkill(ev) {
    if (!pet || !enemy) return;
    const from = pet.out.muzzle ? toScene(pet.out.muzzle.x, pet.out.muzzle.y) : { x: petX() + 14, y: gy - 26 };
    const c = enemyCenter();
    pet.anim.play('attack');
    if (ev.id === 'bark') {
      fx.ring(from.x, from.y, 6, 60, '#fff2c0', 0.45, 3);
      fx.ring(from.x, from.y, 4, 40, '#fff2c0', 0.35, 2);
      fx.number('HAV!', from.x + 10, from.y - 18, { size: 16, color: '#fff2a0', color2: '#ffb43a', life: 0.8, vy: 24 });
      enemy.anim.play('hurt', 1);
    } else if (ev.id === 'laser') {
      beam = { t: 0.3, life: 0.3 };
      fx.impact(c.x, c.y, 1.4, '#7ff4ff');
      enemy.flash = 0.1;
      if (!reduceMotion) { cam.shake = Math.max(cam.shake, 0.12); cam.mag = Math.max(cam.mag, 2.5); }
    } else if (ev.id === 'breath') {
      for (let i = 0; i < 26; i++) {
        const k = Math.random();
        const dx = c.x - from.x;
        const dy = c.y - from.y;
        fx.particle({ x: from.x, y: from.y, vx: dx * (1.6 + k) + Math.random() * 20 - 10, vy: dy * (1.6 + k) + Math.random() * 30 - 15, g: -30, life: 0.45 + Math.random() * 0.2, size: 3 + Math.random() * 3, kind: 'ember', color: k < 0.5 ? '#ff7a2a' : '#ffd060' });
      }
      fx.impact(c.x, c.y, 1, '#ff8a3a');
    }
  }

  // ---- Events ----

  function queue(delay, fn) {
    const at0 = Math.max(time + delay, impactAt);
    impactAt = at0;
    pending.push({ at: at0, fn });
  }

  function strike(ev) {
    if (!enemy) return;
    const c = enemyCenter();
    const s = enemy.boss ? 1.5 : 1;
    enemy.flash = ev.crit ? 0.1 : 0.07;
    enemy.anim.play('hurt', ev.crit ? 1 : 0);
    const hx = c.x + (Math.random() * 10 - 5) * s;
    const hy = c.y + (Math.random() * 16 - 8) * s;
    if (ev.shield) {
      fx.impact(hx, hy, ev.auto ? 0.5 : 0.9, '#8fd8ff');
      fx.burst(hx, hy, ['#bff0ff', '#ffffff'], 4, 90);
      fx.number(formatNumber(ev.dmg), hx, hy - 28 * s, { size: ev.auto ? 11 : 15, color: '#bff0ff', life: 0.7, vy: 36 });
      if (!ev.auto) hitSound('shield');
      return;
    }
    if (ev.blocked && !ev.auto) {
      fx.impact(hx, hy, 0.6, '#c8d2dc');
      fx.number(formatNumber(ev.dmg), hx, hy - 26 * s, { size: 12, color: '#c8d2dc', life: 0.7, vy: 34 });
      fx.number('TINK', hx + 14, hy - 8, { size: 10, color: '#e8eef4', life: 0.4, vy: 20 });
      hitSound('blocked');
      return;
    }
    if (ev.auto) {
      fx.slash(hx, hy, 44 * s, Math.random() * Math.PI, '#a8f4ff', 0.18, 6);
      fx.impact(hx, hy, 0.5, '#7ff4ff');
      fx.number(formatNumber(ev.dmg), hx + Math.random() * 20 - 10, hy - 22 * s, { size: 11, color: '#d8fbff', life: 0.6, vy: 40 });
      return;
    }
    fx.impact(hx, hy, ev.crit ? 1.9 : 0.9, ev.crit ? '#ffb43a' : '#ffe07a');
    fx.burst(hx, hy, [enemy.look.colors.body, '#ffffff', enemy.look.colors.accent], ev.crit ? 10 : 5, ev.crit ? 150 : 100);
    const str = formatNumber(ev.dmg);
    if (ev.crit) {
      fx.number(str + '!', hx, hy - 34 * s, { size: 26, color: '#fff2a0', color2: '#ff8a2a', life: 1, vy: 46, vx: -10 });
      fx.slash(hx, hy, 80 * s, -0.6, '#ffd890', 0.22, 9);
      if (!reduceMotion) { cam.shake = 0.16; cam.mag = 4; cam.punch = 1; hitstop = 0.055; }
    } else {
      fx.number(str, hx + Math.random() * 16 - 8, hy - 28 * s, { size: 17, color: '#ffffff', life: 0.85, vy: 40, vx: Math.random() * 20 - 10 });
      if (!reduceMotion) { cam.shake = Math.max(cam.shake, 0.07); cam.mag = Math.max(cam.mag, 1.6); }
    }
  }

  function kill(ev) {
    if (!enemy) return;
    const e = enemy;
    const c = enemyCenter(e);
    e.anim.play('die');
    dying.push({ e, t: 0, puffed: false });
    enemy = null;
    dropCoins(c.x, c.y, ev.boss ? 14 : ev.variant === 'goblin' ? 18 : ev.variant === 'elite' ? 8 : 4);
    fx.number('+' + formatNumber(ev.gold), c.x, c.y - (e.boss ? 70 : 46), { size: 16, color: '#ffe680', color2: '#f0a020', life: 1.2, vy: 26 });
    if (ev.boss) {
      hero.anim.play('cheer');
      if (!reduceMotion) { cam.shake = 0.4; cam.mag = 6; hitstop = 0.12; }
    }
  }

  function handle(ev, state) {
    lastState = state;
    if (ev.type === 'hit') {
      if (!ev.auto) {
        swing ^= 1;
        hero.anim.play('attack', ev.crit ? 2 : swing);
        queue(STRIKE_DELAY, () => strike(ev));
      } else {
        queue(0, () => strike(ev));
      }
    } else if (ev.type === 'kill') {
      queue(0, () => kill(ev));
    } else if (ev.type === 'goblinFlee' || ev.type === 'eliteFlee') {
      queue(0, () => {
        if (!enemy) return;
        const c = enemyCenter();
        enemy.anim.play('flee');
        dying.push({ e: enemy, t: 0, puffed: true, flee: true });
        fx.number(ev.type === 'goblinFlee' ? 'KAÇTI!' : 'GERİ ÇEKİLDİ', c.x, c.y - 40, { size: 15, color: '#ffe680', life: 1.1, vy: 22 });
        enemy = null;
      });
    } else if (ev.type === 'windup') {
      enemy?.anim.play('windup');
    } else if (ev.type === 'interrupt') {
      if (enemy) {
        const c = enemyCenter();
        enemy.anim.stop('windup');
        enemy.anim.play('hurt', 1);
        enemy.flash = 0.12;
        fx.impact(c.x, c.y, 2, '#ffe07a');
        fx.ring(c.x, c.y, 10, 90, '#ffe07a', 0.45, 4);
        fx.banner('SERSEMLEDİ!', '#b8842a', 1.1);
        if (!reduceMotion) { cam.shake = 0.2; cam.mag = 4; hitstop = 0.08; }
      }
    } else if (ev.type === 'heroHit') {
      enemy?.anim.stop('windup');
      enemy?.anim.play('attack');
      setTimeout(() => {
        hero.anim.play('hurt');
        hero.flash = 0.15;
        const hx = heroX() + hero.anim.pose.x;
        fx.impact(hx + 10, gy - 50, 1.2, '#ff5a4a');
        fx.burst(hx + 10, gy - 50, ['#ff5a4a', '#ffffff'], 8, 120);
        fx.number('-' + formatNumber(ev.dmg), hx + 24, gy - 70, { size: 17, color: '#ff8a7a', color2: '#e0302a', life: 1, vy: 24 });
        if (!reduceMotion) { cam.shake = 0.22; cam.mag = 4.5; }
      }, 110);
    } else if (ev.type === 'heroDown') {
      setTimeout(() => hero.anim.play('down'), 140);
    } else if (ev.type === 'shieldBreak') {
      if (enemy) {
        const c = enemyCenter();
        fx.burst(c.x, c.y, ['#bff0ff', '#8fd8ff', '#ffffff'], 22, 220);
        fx.ring(c.x, c.y, 20, 110, '#bff0ff', 0.5, 4);
        enemy.anim.play('hurt', 1);
        if (!reduceMotion) { cam.shake = 0.25; cam.mag = 5; hitstop = 0.1; }
      }
    } else if (ev.type === 'petSkill') {
      petSkill(ev);
    } else if (ev.type === 'revive') {
      setTimeout(() => {
        const hx = heroX() + hero.anim.pose.x;
        fx.ring(hx, gy - 46, 10, 90, '#ffd060', 0.6, 4);
        fx.burst(hx, gy - 46, ['#ffd060', '#ff8a3a', '#ffffff'], 24, 180, 'ember');
        hero.anim.play('cheer');
      }, 150);
    } else if (ev.type === 'item' && !ev.salvaged && ev.source === 'boss') {
      queue(0.3, () => {
        const c = enemy ? enemyCenter() : { x: enemyX(), y: gy - 40 };
        fx.number('EŞYA!', c.x, c.y - 60, { size: 16, color: RARITIES[ev.item.rarity].color, color2: '#fff2a0', life: 1.3, vy: 20 });
      });
    } else if (ev.type === 'combo') {
      comboPop = 2;
      fx.ring(34, SCENE_H * 0.43, 8, 50, '#ffe07a', 0.4, 3);
    } else if (ev.type === 'skill' && ev.id === 'goldRain') {
      api.coinShower(34);
    } else if (ev.type === 'skill') {
      if (ev.id === 'rage') fx.ring(heroX(), gy - 46, 10, 80, '#ff6a2a', 0.5, 4);
      if (ev.id === 'storm') { for (let i = 0; i < 6; i++) fx.slash(heroX() + 20, gy - 50, 60, (i / 6) * Math.PI, '#a8f4ff', 0.35, 6); }
      if (ev.id === 'focus') fx.ring(enemyX(), gy - 40, 60, 20, '#4ad0ff', 0.4, 3);
      if (ev.id === 'warcry' && pet) fx.ring(petX(), gy - 24, 10, 90, '#ffd060', 0.6, 4);
    } else if (ev.type === 'spawn' || (ev.type === 'stage' && state.enemy.respawn <= 0)) {
      sync(state);
    }
  }

  function sync(state) {
    if (enemy) {
      // Stage switched with the enemy alive: it vanishes in a puff.
      const c = enemyCenter();
      for (let i = 0; i < 5; i++) fx.puff(c.x + Math.random() * 30 - 15, c.y + Math.random() * 20 - 10, 12, '#f4f0ea', 0.45);
    }
    enemy = makeEnemy(state);
    pending.length = 0;
    impactAt = 0;
  }

  // ---- Frame ----

  // Slow device: drop the canvas resolution a step (everything is vector, so it only gets a
  // little softer) rather than stutter.
  function watchSpeed(dt) {
    if (dt > 0.022 && dt < 0.1) slow += dt;
    else slow = Math.max(0, slow - dt * 0.5);
    if (slow > 3 && dprCap > MIN_DPR && (window.devicePixelRatio || 1) > MIN_DPR) {
      dprCap = Math.max(MIN_DPR, Math.min(dprCap, dpr) - 0.5);
      slow = 0;
      resize();
    }
  }

  function frame(state, dt) {
    lastState = state;
    watchSpeed(dt);
    if (hitstop > 0) { hitstop -= dt; dt *= 0.1; }
    time += dt;
    if (!enemy && state.enemy.respawn <= 0) sync(state);
    syncPet(state);

    const stage = enemy ? enemy.stage : state.stage;
    const zi = zoneIndex(stage);
    const zone = ZONES[zi];
    const key = `${zi}:${canvas.width}x${canvas.height}`;
    if (key !== bgKey) {
      bg = buildBackdrop(zone.theme, zi + 1);
      weather = createWeather(zone.theme, W, gy, zi + 1);
      bgKey = key;
    }

    // Effects whose moment has come.
    for (let i = 0; i < pending.length; i++) {
      if (pending[i].at <= time) { pending[i].fn(); pending.splice(i--, 1); }
    }

    // Camera: shake offset and a small punch-in on crits.
    let sx = 0, sy = 0;
    if (cam.shake > 0) {
      cam.shake -= dt;
      sx = (Math.random() * 2 - 1) * cam.mag;
      sy = (Math.random() * 2 - 1) * cam.mag;
    } else cam.mag = 0;
    cam.punch = Math.max(0, cam.punch - dt * 6);
    const zoom = 1 + cam.punch * 0.035;
    const fxp = enemyX() - 40, fyp = gy - 50;
    cam.s = k * zoom;
    cam.ox = (fxp * k - fxp * cam.s) + sx * k;
    cam.oy = (fyp * k - fyp * cam.s) + sy * k;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1a1424';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bg, (-MARGIN + sx) * k, (-MARGIN + sy) * k);
    ctx.setTransform(cam.s, 0, 0, cam.s, cam.ox, cam.oy);

    weather.draw(ctx, dt);

    // Animate.
    hero.anim.update(dt, state);
    if (pet) pet.anim.update(dt, state);
    if (enemy) {
      enemy.anim.update(dt, state);
      enemy.flash = Math.max(0, enemy.flash - dt);
    }

    // Pet attacks on its own rhythm and fires at the enemy.
    petTimer -= dt;
    const enemyReady = enemy && state.enemy.respawn <= 0 && !enemy.anim.isPlaying('enter');
    if (pet && petTimer <= 0) {
      petTimer = 1 + Math.random() * 0.15;
      if (enemyReady && totalDps(state) > 0) {
        pet.anim.play('attack');
        onPetShot(pet.p.shot);
        const target = enemyCenter();
        const from = pet.out.muzzle ? toScene(pet.out.muzzle.x, pet.out.muzzle.y) : { x: petX() + 14, y: gy - 24 };
        const p = pet.p;
        fx.shot({
          x0: from.x, y0: from.y, x1: target.x + Math.random() * 8 - 4, y1: target.y + Math.random() * 14 - 7,
          kind: p.shot, color: p.shotColor, arc: p.shot === 'arrow' ? 26 : 14, dur: 0.34,
          onHit: () => {
            if (!enemy) return;
            enemy.flash = Math.max(enemy.flash, 0.04);
            const c = enemyCenter();
            fx.impact(c.x - 4, c.y + Math.random() * 10 - 5, 0.4, p.shotColor);
          },
        });
      }
    }

    // Draw: pet, hero, enemies, then effects on top.
    drawPet(state);
    drawHero(state);
    if (hero.anim.pose.trail > 0.5 && hero.out.tip) {
      trail.push({ tx: hero.out.tip.x, ty: hero.out.tip.y, bx: hero.out.base.x, by: hero.out.base.y, t: time, crit: hero.anim.isPlaying('attack') && hero.anim.pose.glow > 0.2 });
    }
    for (let i = dying.length - 1; i >= 0; i--) {
      const d = dying[i];
      d.t += dt;
      d.e.anim.update(dt, state);
      d.e.flash = Math.max(0, 0.08 - d.t);
      const a = d.flee ? Math.max(0, 1 - Math.max(0, d.t - 0.5) / 0.3) : d.t < 0.18 ? 1 : Math.max(0, 1 - (d.t - 0.18) / 0.14);
      drawEnemy(d.e, dt, a);
      if (!d.puffed && d.t >= 0.2) {
        d.puffed = true;
        const c = enemyCenter(d.e);
        const s = d.e.boss ? 1.5 : 1;
        for (let j = 0; j < 7; j++) fx.puff(c.x + (Math.random() * 40 - 20) * s, c.y + (Math.random() * 30 - 12) * s, (10 + Math.random() * 8) * s, '#f4f0ea', 0.55 + Math.random() * 0.2, -16 - Math.random() * 20);
        fx.burst(c.x, c.y, [d.e.look.colors.body, d.e.look.colors.accent], d.e.boss ? 18 : 9, 130);
      }
      if (d.t > (d.flee ? 0.85 : 0.7)) dying.splice(i, 1);
    }
    if (enemy && state.enemy.respawn <= 0) drawEnemy(enemy, dt);
    enemyOverlays(state);
    petEffects(state, dt);
    heroBar(state);
    skillAuras(state, dt);
    drawTrail();
    fx.setBannerY(SCENE_H * 0.53);
    fx.draw(ctx, dt, W);
    comboMeter(state, dt);
    updateCoins(dt);
  }

  const api = {
    resize,
    frame,
    handle,
    sync,
    tapAt(cssX, cssY) {
      const p = toScene(cssX * dpr, cssY * dpr);
      fx.ring(p.x, p.y, 4, 22, '#ffffff', 0.25, 2.2);
      for (let i = 0; i < 3; i++) fx.particle({ x: p.x, y: p.y, vx: Math.random() * 120 - 60, vy: -Math.random() * 90, g: 200, life: 0.3, size: 2, kind: 'star', color: '#fff6c0' });
    },
    // Coins rain from the top and fly to the gold counter (daily reward, Altın Yağmuru).
    coinShower(n = 34) {
      for (let i = 0; i < n; i++) {
        coins.push({ x: 10 + Math.random() * (W - 20), y: -10 - Math.random() * 120, vx: Math.random() * 30 - 15, vy: Math.random() * 60, t: 0, drop: 1 + Math.random() * 0.5, spin: Math.random() * 6 });
      }
    },
    showBanner(textStr, color = '#c8353a', life = 1.6) { fx.banner(textStr, mix(color, '#3b1d3f', 0.22), life); },
    setCoinTarget(cssX, cssY) { coinTargetCss = { x: cssX, y: cssY }; },
    onCoinArrive(cb) { onCoin = cb; },
    onPetShot(cb) { onPetShot = cb; },
    onHitSound(cb) { hitSound = cb; },
  };
  return api;
}

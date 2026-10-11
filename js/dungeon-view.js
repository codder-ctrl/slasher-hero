import { ACTORS } from './actors.js';
import { createAnimator } from './anim.js';
import { at, blob, flat, glow, shadow, tint, roundRect } from './paint.js';
import { paintDungeon } from './scenery.js';
import { createFx } from './fx.js';
import { DUNGEON } from './config.js';
import { formatNumber } from './logic.js';
import { findCompanion } from './dungeon.js';

// Draws the live dungeon fight (state.dungeonRun) on the Zindan tab with the same vector
// actors as the main battle. Visual actors are rebuilt whenever the run's fighters or enemies
// change; main.js only calls frame() and handle() while the tab is open.

const SCENE_H = 160;
const MAX_DPR = 2.5;
const TEAM_SCALE = 0.82;
const ENEMY_SCALE = 0.8;
const BOSS_SCALE = 1.25;

export function createDungeonView(canvas) {
  const ctx = canvas.getContext('2d');
  let dpr = 1, k = 1, W = 300, gy = 136;
  let bg = null, bgKey = '';
  let time = 0;
  const fx = createFx();
  let team = [];       // visuals per fighter index
  let foes = [];       // visuals per enemy index
  let seenFighters = null;
  let seenEnemies = null;
  let torchT = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    k = canvas.height / SCENE_H;
    W = canvas.width / k;
    gy = Math.round(SCENE_H * 0.86);
    fx.setGround(gy);
    bgKey = '';
  }

  const fighterX = (i) => W * 0.38 - i * 34;
  function foeX(run, i) {
    const e = run.enemies[i];
    return e.boss ? W * 0.74 : W * 0.6 + i * 36;
  }

  function sync(run) {
    if (run.fighters !== seenFighters) {
      seenFighters = run.fighters;
      team = run.fighters.map((f) => {
        const def = findCompanion(f.id);
        const look = { colors: def.colors, role: def.role, shotColor: def.shotColor };
        return { f, def, actor: ACTORS[def.actor], anim: createAnimator(ACTORS[def.actor], look), look, out: {}, flash: 0, down: false };
      });
    }
    if (run.enemies !== seenEnemies) {
      seenEnemies = run.enemies;
      foes = run.enemies.map((e) => {
        const spec = DUNGEON.enemies[e.look];
        const actor = ACTORS[spec.actor];
        const look = { colors: spec.colors, boss: e.boss };
        const anim = createAnimator(actor, look);
        anim.play('enter');
        return { e, actor, anim, look, out: {}, flash: 0, gone: 0 };
      });
    }
  }

  const fighterCenter = (i) => ({ x: fighterX(i) + 4, y: gy - 34 * TEAM_SCALE });
  function foeCenter(run, i) {
    const v = foes[i];
    const s = run.enemies[i].boss ? BOSS_SCALE : ENEMY_SCALE;
    const P = v.anim.pose;
    return { x: foeX(run, i) - (P.x + 6) * s, y: gy + (P.y - v.actor.height * 0.5) * s, s };
  }

  function hpBar(x, y, w, frac, color) {
    blob(ctx, roundRect(x - w / 2, y, w, 5, 2.5), '#2a1b17', { ow: 1.2, shade: false, noLight: true });
    if (frac > 0) flat(ctx, roundRect(x - w / 2 + 0.8, y + 0.8, (w - 1.6) * frac, 3.4, 1.7), color);
  }

  function handle(ev, state) {
    const run = state.dungeonRun;
    if (!run || !W) return;
    sync(run);
    if (ev.type === 'dg-attack') {
      const fromTeam = ev.side === 'team';
      if (fromTeam) {
        const v = team[ev.from];
        const target = foeCenter(run, ev.to);
        if (!v || !foes[ev.to]) return;
        v.anim.play('attack');
        const melee = v.def.role === 'tank' || (v.def.role === 'dps' && v.def.actor === 'helm');
        const from = fighterCenter(ev.from);
        const hit = () => {
          const fv = foes[ev.to];
          if (!fv) return;
          fv.flash = 0.08;
          fv.anim.play('hurt');
          fx.impact(target.x, target.y, 0.6, v.def.shotColor);
          fx.number(formatNumber(Math.round(ev.dmg)), target.x + Math.random() * 10 - 5, target.y - 18, { size: 11, life: 0.7, vy: 30 });
        };
        if (melee) setTimeout(hit, 120);
        else fx.shot({ x0: from.x + 10, y0: from.y - 6, x1: target.x, y1: target.y, kind: v.def.shot, color: v.def.shotColor, arc: v.def.shot === 'arrow' ? 16 : 6, dur: 0.26, onHit: hit });
      } else {
        const fv = foes[ev.from];
        const tv = team[ev.to];
        if (!fv || !tv) return;
        fv.anim.play('attack');
        setTimeout(() => {
          tv.flash = 0.08;
          tv.anim.play('hurt');
          const c = fighterCenter(ev.to);
          fx.impact(c.x, c.y, 0.5, '#ff6a5a');
          fx.number(formatNumber(Math.round(ev.dmg)), c.x, c.y - 26, { size: 11, color: '#ffb0a0', life: 0.7, vy: 30 });
        }, 150);
      }
    } else if (ev.type === 'dg-heal') {
      const c = fighterCenter(ev.to);
      const v = team.find((t) => t.f.id === ev.from);
      v?.anim.play('attack');
      fx.number('+' + formatNumber(Math.round(ev.amount)), c.x, c.y - 30, { size: 12, color: '#c8ff9a', life: 0.8, vy: 26 });
      fx.ring(c.x, c.y, 6, 24, '#b8f07a', 0.4, 2);
      for (let i = 0; i < 6; i++) fx.particle({ x: c.x + Math.random() * 20 - 10, y: c.y + Math.random() * 20, vx: 0, vy: -40, g: 0, life: 0.6, kind: 'star', size: 2, color: '#d8ffb0' });
    } else if (ev.type === 'dg-kill') {
      const v = foes[ev.to];
      if (!v) return;
      const c = foeCenter(run, ev.to);
      v.anim.play('die');
      setTimeout(() => {
        for (let i = 0; i < 5; i++) fx.puff(c.x + Math.random() * 20 - 10, c.y + Math.random() * 16 - 8, 8 + Math.random() * 5, '#f4f0ea', 0.5);
        fx.burst(c.x, c.y, [v.look.colors.body, v.look.colors.accent], 6, 90);
      }, 180);
      fx.number('+' + ev.kristal, c.x, c.y - 30, { size: 12, color: '#b8ffd8', color2: '#3fc08a', life: 0.9, vy: 22 });
    } else if (ev.type === 'dg-start') {
      fx.banner(`KAT ${ev.floor}`, '#4a3f7a', 1.1);
    } else if (ev.type === 'dg-clear') {
      fx.banner(ev.elmas ? `TEMİZLENDİ! +${ev.elmas} ELMAS` : 'TEMİZLENDİ!', '#b8842a', 1.2);
    } else if (ev.type === 'dg-defeat') {
      fx.banner('YENİLDİNİZ · BİR KAT GERİ', '#8a2a3a', 2.4);
    }
  }

  function frame(state, dt) {
    const run = state.dungeonRun;
    if (!run || W < 2) return;
    time += dt;
    sync(run);
    if (bgKey !== `${canvas.width}x${canvas.height}`) {
      bg = document.createElement('canvas');
      bg.width = canvas.width;
      bg.height = canvas.height;
      const g = bg.getContext('2d');
      g.scale(k, k);
      paintDungeon(g, W, SCENE_H, gy);
      bgKey = `${canvas.width}x${canvas.height}`;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(k, 0, 0, k, 0, 0);

    // Torch flames on the arches.
    torchT += dt;
    for (const tx of [W * 0.3, W * 0.7]) {
      const f = 1 + Math.sin(torchT * 11 + tx) * 0.12 + Math.sin(torchT * 17) * 0.06;
      glow(ctx, tx, 40, 34 * f, '#ff9a3a', 0.35);
      blob(ctx, roundRect(tx - 2, 42, 4, 12, 1.5), '#5a3a28', { ow: 1.2, depth: 0.8 });
      at(ctx, tx, 42, Math.sin(torchT * 7) * 0.08, () => {
        blob(ctx, (c) => { c.moveTo(-5, 0); c.quadraticCurveTo(-6, -8 * f, 0, -15 * f); c.quadraticCurveTo(6, -8 * f, 5, 0); c.closePath(); }, '#ff7a2a', { ow: 1.4, depth: 1.2, light: '#ffe07a' });
      });
    }

    // Team, back slots first so the front one overlaps.
    for (let i = team.length - 1; i >= 0; i--) {
      const v = team[i];
      const f = run.fighters[i];
      if (!f) continue;
      if (f.hp <= 0 && !v.down) { v.down = true; v.anim.play('down'); }
      if (f.hp > 0 && v.down) { v.down = false; v.anim.stop('down'); }
      v.anim.update(dt, state);
      v.flash = Math.max(0, v.flash - dt);
      const x = fighterX(i);
      shadow(ctx, x, gy + 1, 16, 0.3);
      ctx.save();
      ctx.translate(x, gy);
      ctx.scale(TEAM_SCALE, TEAM_SCALE);
      if (v.down) ctx.globalAlpha = 0.55;
      tint.amount = v.flash > 0 ? 0.8 : 0;
      v.actor.draw(ctx, v.anim.pose, v.look, v.out);
      tint.amount = 0;
      ctx.restore();
      if (!v.down) hpBar(x + 2, gy - 82 * TEAM_SCALE, 26, f.hp / f.maxHp, '#5ad05a');
    }

    for (let i = 0; i < foes.length; i++) {
      const v = foes[i];
      const e = run.enemies[i];
      if (!e) continue;
      v.anim.update(dt, state);
      v.flash = Math.max(0, v.flash - dt);
      if (e.hp <= 0) v.gone += dt;
      const fade = e.hp <= 0 ? Math.max(0, 1 - v.gone / 0.3) : 1;
      if (fade <= 0) continue;
      const s = e.boss ? BOSS_SCALE : ENEMY_SCALE;
      const x = foeX(run, i);
      const P = v.anim.pose;
      const a = Math.max(0, Math.min(1, P.alpha)) * fade;
      shadow(ctx, x - P.x * s, gy + 1, (v.actor.height * 0.4 + 3) * s * (v.actor.hover ? 0.7 : 1), 0.3 * a);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(x, gy);
      ctx.scale(-s, s);
      tint.amount = v.flash > 0 ? 0.8 : 0;
      v.actor.draw(ctx, P, v.look, v.out);
      tint.amount = 0;
      ctx.restore();
      if (e.hp > 0) {
        const top = gy + (P.y - v.actor.height - (e.boss ? 14 : 6)) * s;
        hpBar(x - 4, top, e.boss ? 40 : 24, e.hp / e.maxHp, '#e0413b');
      }
    }

    fx.setBannerY(SCENE_H * 0.3);
    fx.draw(ctx, dt, W);
    if (run.phase === 'idle') fx.text(ctx, 'Takıma yoldaş ekle', W / 2, SCENE_H / 2, 14, '#e8dcc0');
  }

  return { resize, frame, handle };
}

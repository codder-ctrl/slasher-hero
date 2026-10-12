import { INK, at, blob, line, flat, glow, ellipse, circle, roundRect, poly, scallop, smooth, star, darker, lighter, rgba } from './paint.js';
import { ease } from './anim.js';

// Short-lived effects shared by the battle and the dungeon: particles, smoke puffs, impact
// stars, rings, projectiles, floating numbers and ribbon banners. Everything is in scene
// units; `draw(g, dt)` advances and paints. Text uses the game's display font.

export const FONT = '"Lilita One", "Arial Black", sans-serif';

export function createFx() {
  const parts = [];
  const puffs = [];
  const impacts = [];
  const rings = [];
  const shots = [];
  const numbers = [];
  const slashes = [];
  const spikes = [];
  let banner = null;
  let groundY = 1e9;

  function text(g, str, x, y, size, color, { alpha = 1, stroke = INK, sw = 0.22, scale = 1, color2 = null } = {}) {
    if (alpha <= 0) return;
    g.save();
    g.globalAlpha *= alpha;
    g.translate(x, y);
    g.scale(scale, scale);
    g.font = `${size}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = size * sw;
    g.strokeStyle = stroke;
    g.strokeText(str, 0, size * 0.06);
    if (color2) {
      const grad = g.createLinearGradient(0, -size * 0.45, 0, size * 0.45);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color2);
      g.fillStyle = grad;
    } else {
      g.fillStyle = color;
    }
    g.fillText(str, 0, 0);
    g.restore();
  }

  return {
    text,
    setGround(y) { groundY = y; },

    // Generic particle. kind: 'dot' | 'shard' | 'star' | 'ember' | 'leaf'.
    particle(p) { parts.push({ g: 260, size: 2, life: 0.6, kind: 'dot', rot: 0, vr: 0, ...p, max: p.life ?? 0.6 }); },

    burst(x, y, colors, n = 10, speed = 90, kind = 'shard') {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = speed * (0.4 + Math.random() * 0.8);
        this.particle({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.5, kind,
          color: colors[i % colors.length], size: 2 + Math.random() * 3, life: 0.45 + Math.random() * 0.4,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 20,
        });
      }
    },

    puff(x, y, r = 10, color = '#f4f0ea', life = 0.5, vy = -20) {
      puffs.push({ x, y, r, color, t: 0, life, vy, rot: Math.random() * 6, shape: scallop(0, 0, 1, 0.85, 7, 0.45, Math.random) });
    },

    impact(x, y, size = 1, color = '#ffd060') {
      impacts.push({ x, y, size, color, t: 0, life: 0.2 + size * 0.04, rot: Math.random() * Math.PI });
    },

    ring(x, y, r0, r1, color, life = 0.4, width = 2.4) {
      rings.push({ x, y, r0, r1, color, t: 0, life, width });
    },

    // A crescent slash mark (Kılıç Fırtınası blades and crit flourishes).
    slash(x, y, len, angle, color = '#ffffff', life = 0.2, width = 7) {
      slashes.push({ x, y, len, angle, color, t: 0, life, width });
    },

    shot(s) { shots.push({ t: 0, dur: 0.32, arc: 0, ...s }); },

    // A crystal bursting out of the ground at (x, y), then sinking back.
    spike(x, y, h, w, color, life = 0.6) { spikes.push({ x, y, h, w, color, t: 0, life, lean: (Math.random() - 0.5) * 0.4 }); },

    number(str, x, y, { size = 15, color = '#ffffff', color2 = null, life = 0.9, vy = 34, vx = 0 } = {}) {
      numbers.push({ str, x, y, size, color, color2, life, vy, vx, t: 0 });
    },

    banner(str, color = '#c8353a', life = 1.6) { banner = { str, color, t: 0, life }; },

    clear() { parts.length = puffs.length = impacts.length = rings.length = shots.length = numbers.length = slashes.length = spikes.length = 0; banner = null; },

    draw(g, dt, w) {
      // Rings (behind the rest).
      for (let i = rings.length - 1; i >= 0; i--) {
        const r = rings[i];
        r.t += dt;
        const k = r.t / r.life;
        if (k >= 1) { rings.splice(i, 1); continue; }
        line(g, circle(r.x, r.y, r.r0 + (r.r1 - r.r0) * ease.outCubic(k)), r.color, r.width * (1 - k * 0.6), 1 - k);
      }

      // Smoke puffs.
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i];
        p.t += dt;
        const k = p.t / p.life;
        if (k >= 1) { puffs.splice(i, 1); continue; }
        p.y += p.vy * dt;
        const s = p.r * (0.5 + ease.outCubic(k) * 0.8);
        at(g, p.x, p.y, p.rot + k * 0.6, () => blob(g, p.shape, p.color, { ow: 1.6 / s, depth: 0.25, alpha: 1 - ease.in(k), ink: darker(p.color, 0.55) }), s);
      }

      // Ground crystals: pop up with an overshoot, hold, then sink and fade.
      for (let i = spikes.length - 1; i >= 0; i--) {
        const sp = spikes[i];
        sp.t += dt;
        const k = sp.t / sp.life;
        if (k >= 1) { spikes.splice(i, 1); continue; }
        const grow = k < 0.2 ? ease.outBack(k / 0.2) : k > 0.7 ? 1 - ease.in((k - 0.7) / 0.3) * 0.6 : 1;
        const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        const h = sp.h * grow;
        glow(g, sp.x, sp.y - h * 0.5, sp.h * 0.8, sp.color, 0.35 * a);
        at(g, sp.x, sp.y, sp.lean, () => {
          blob(g, poly([[-sp.w, 0], [-sp.w * 0.75, -h * 0.72], [0, -h], [sp.w * 0.75, -h * 0.72], [sp.w, 0]]), sp.color, { ow: 1.8, depth: 1.6, light: '#ffffff', alpha: a });
          line(g, (c) => { c.moveTo(0, -h + 2); c.lineTo(-sp.w * 0.15, -2); }, '#ffffff', 1.2, 0.6 * a);
        });
      }

      // Projectiles.
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        s.t += dt / s.dur;
        if (s.t >= 1) {
          shots.splice(i, 1);
          s.onHit?.();
          continue;
        }
        const k = s.t;
        const x = s.x0 + (s.x1 - s.x0) * k;
        const y = s.y0 + (s.y1 - s.y0) * k - Math.sin(Math.PI * k) * s.arc;
        const dx = s.x1 - s.x0;
        const dy = s.y1 - s.y0 - Math.cos(Math.PI * k) * Math.PI * s.arc;
        const a = Math.atan2(dy, dx);
        if (s.kind === 'arrow') {
          at(g, x, y, a, () => {
            line(g, (c) => { c.moveTo(-12, 0); c.lineTo(3, 0); }, '#7a4a2c', 2.6);
            line(g, (c) => { c.moveTo(-12, 0); c.lineTo(3, 0); }, '#e8d0a0', 1.2);
            blob(g, poly([[2, -3], [9, 0], [2, 3]]), s.color, { ow: 1.2, depth: 0.6 });
            blob(g, poly([[-13, -3.4], [-8, 0], [-13, 3.4], [-11, 0]]), '#f4f0ea', { ow: 1, depth: 0.4, noLight: true });
          });
        } else if (s.kind === 'rock') {
          at(g, x, y, s.t * 9, () => {
            blob(g, smooth([[-14, 1], [-11, -10], [-1, -14], [11, -10], [14, 1], [8, 12], [-7, 12]], 0.9), s.color, { ow: 2, depth: 3, light: '#c8c2b4' });
            line(g, (c) => { c.moveTo(-4, -6); c.lineTo(1, -1); c.lineTo(0, 5); }, darker(s.color, 0.4), 1.4);
          });
        } else if (s.kind === 'skull') {
          glow(g, x, y, 16, s.color, 0.55);
          for (let j = 1; j <= 3; j++) flat(g, circle(x - Math.cos(a) * j * 6, y - Math.sin(a) * j * 6, 5 - j), s.color, 0.45 - j * 0.1);
          blob(g, (c) => { c.arc(x, y - 1, 6, Math.PI * 0.95, Math.PI * 0.05); c.lineTo(x + 4, y + 6); c.lineTo(x - 4, y + 6); c.closePath(); }, lighter(s.color, 0.55), { ow: 1.4, depth: 1, light: '#ffffff' });
          flat(g, circle(x - 2.4, y - 1, 1.8), INK);
          flat(g, circle(x + 2.4, y - 1, 1.8), INK);
        } else if (s.kind === 'leaf') {
          at(g, x, y, a + s.t * 14, () => {
            blob(g, ellipse(0, 0, 8.4, 4), s.color, { ow: 1.4, depth: 1, light: '#ffffff' });
            line(g, (c) => { c.moveTo(-8, 0); c.lineTo(7, 0); }, darker(s.color, 0.45), 1.2);
          });
        } else if (s.kind === 'orb') {
          glow(g, x, y, 14, s.color, 0.6);
          for (let j = 1; j <= 3; j++) flat(g, circle(x - Math.cos(a) * j * 5, y - Math.sin(a) * j * 5, 4 - j), s.color, 0.5 - j * 0.12);
          blob(g, circle(x, y, 4.6), s.color, { ow: 1.4, depth: 1.2, light: '#ffffff' });
        } else {
          glow(g, x, y, 10, s.color, 0.5);
          blob(g, star(x, y, 6, 2.4, 4, s.t * 12), s.color, { ow: 1.2, depth: 0.6, light: '#ffffff' });
        }
      }

      // Particles.
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
        if (p.y > groundY && p.vy > 0 && p.g > 0) { p.y = groundY; p.vy *= -0.35; p.vx *= 0.6; p.vr *= 0.5; }
        const a = Math.min(1, (p.life / p.max) * 2.5);
        if (p.kind === 'shard') {
          at(g, p.x, p.y, p.rot, () => blob(g, poly([[-p.size, -p.size * 0.6], [p.size, -p.size * 0.3], [p.size * 0.2, p.size * 0.8]]), p.color, { ow: 1, depth: 0.5, alpha: a, noLight: true }));
        } else if (p.kind === 'star') {
          flat(g, star(p.x, p.y, p.size * 1.6, p.size * 0.5, 4, p.rot), p.color, a);
        } else if (p.kind === 'leaf') {
          at(g, p.x, p.y, p.rot, () => blob(g, ellipse(0, 0, p.size * 1.6, p.size * 0.8), p.color, { ow: 1, depth: 0.5, alpha: a, noLight: true }));
        } else if (p.kind === 'ember') {
          glow(g, p.x, p.y, p.size * 3, p.color, 0.4 * a);
          flat(g, circle(p.x, p.y, p.size * 0.6), lighter(p.color, 0.5), a);
        } else {
          flat(g, circle(p.x, p.y, p.size), p.color, a);
        }
      }

      // Slash crescents.
      for (let i = slashes.length - 1; i >= 0; i--) {
        const s = slashes[i];
        s.t += dt;
        const k = s.t / s.life;
        if (k >= 1) { slashes.splice(i, 1); continue; }
        const grow = ease.outCubic(Math.min(1, k * 2.2));
        at(g, s.x, s.y, s.angle, () => {
          const L = s.len * grow;
          const W = s.width * (1 - k);
          glow(g, 0, 0, s.len * 0.6, s.color, 0.3 * (1 - k));
          flat(g, (c) => { c.moveTo(-L / 2, 0); c.quadraticCurveTo(0, -W * 2, L / 2, 0); c.quadraticCurveTo(0, -W * 0.6, -L / 2, 0); c.closePath(); }, s.color, 1 - k);
          flat(g, (c) => { c.moveTo(-L / 2.4, -W * 0.15); c.quadraticCurveTo(0, -W * 1.3, L / 2.4, -W * 0.15); c.quadraticCurveTo(0, -W * 0.7, -L / 2.4, -W * 0.15); c.closePath(); }, '#ffffff', 1 - k);
        });
      }

      // Impact stars.
      for (let i = impacts.length - 1; i >= 0; i--) {
        const s = impacts[i];
        s.t += dt;
        const k = s.t / s.life;
        if (k >= 1) { impacts.splice(i, 1); continue; }
        const r = (8 + 14 * s.size) * (0.45 + ease.outCubic(k) * 0.75);
        const a = 1 - ease.in(k);
        glow(g, s.x, s.y, r * 1.8, s.color, 0.55 * a);
        blob(g, star(s.x, s.y, r, r * 0.38, 8, s.rot), s.color, { ow: 1.6, depth: 1, alpha: a, light: '#ffffff' });
        flat(g, star(s.x, s.y, r * 0.55, r * 0.22, 8, s.rot + 0.4), '#ffffff', a);
        if (s.size > 1.2) {
          line(g, (c) => {
            for (let j = 0; j < 10; j++) {
              const ang = s.rot + (j / 10) * Math.PI * 2;
              c.moveTo(s.x + Math.cos(ang) * r * 1.1, s.y + Math.sin(ang) * r * 1.1);
              c.lineTo(s.x + Math.cos(ang) * r * 1.8, s.y + Math.sin(ang) * r * 1.8);
            }
          }, '#ffffff', 2, a);
        }
      }

      // Floating numbers.
      for (let i = numbers.length - 1; i >= 0; i--) {
        const n = numbers[i];
        n.t += dt;
        const k = n.t / n.life;
        if (k >= 1) { numbers.splice(i, 1); continue; }
        n.y -= n.vy * dt * (1 - k * 0.7);
        n.x += n.vx * dt;
        const pop = n.t < 0.12 ? 0.4 + ease.outBack(n.t / 0.12) * 0.6 : 1;
        text(g, n.str, n.x, n.y, n.size, n.color, { alpha: k > 0.7 ? (1 - k) / 0.3 : 1, scale: pop, color2: n.color2 });
      }

      // Ribbon banner.
      if (banner) {
        banner.t += dt;
        const b = banner;
        const k = b.t / b.life;
        if (k >= 1) banner = null;
        else {
          const pop = b.t < 0.22 ? ease.outBack(b.t / 0.22) : 1;
          const a = k > 0.82 ? (1 - k) / 0.18 : 1;
          const size = 19;
          g.save();
          g.font = `${size}px ${FONT}`;
          const tw = Math.min(w * 0.8, g.measureText(b.str).width + 26);
          g.restore();
          at(g, w / 2, b.y ?? 0, 0, () => {
            const h = 14;
            const c = b.color;
            const dk = darker(c, 0.4);
            // Folded tails behind the band.
            blob(g, poly([[-tw / 2 - 18, -h * 0.6], [-tw / 2 + 4, -h * 0.6], [-tw / 2 + 4, h * 1.2], [-tw / 2 - 18, h * 1.2], [-tw / 2 - 10, h * 0.3]]), dk, { ow: 2, depth: 2, alpha: a });
            blob(g, poly([[tw / 2 + 18, -h * 0.6], [tw / 2 - 4, -h * 0.6], [tw / 2 - 4, h * 1.2], [tw / 2 + 18, h * 1.2], [tw / 2 + 10, h * 0.3]]), dk, { ow: 2, depth: 2, alpha: a });
            blob(g, (cx) => { cx.moveTo(-tw / 2, -h); cx.quadraticCurveTo(0, -h - 5, tw / 2, -h); cx.lineTo(tw / 2, h); cx.quadraticCurveTo(0, h - 5, -tw / 2, h); cx.closePath(); }, c, { ow: 2.2, depth: 3, alpha: a });
            text(g, b.str, 0, -1.5, size, '#fff8e0', { alpha: a, color2: '#ffd98a', sw: 0.24 });
          }, pop);
        }
      }
    },

    setBannerY(y) { if (banner) banner.y = y; },
    get bannerActive() { return !!banner; },
  };
}

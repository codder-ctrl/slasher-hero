import {
  INK, at, blob, line, flat, glow, ellipse, circle, roundRect, smooth, poly, capsule, star, eye, darker, lighter, rgba,
} from './paint.js';
import { track, bump } from './anim.js';

// Pet actors, facing +x (toward the enemy). look = { colors, form } where colors come from the
// pet's current form in config. Form 2 adds markings or armor in `accent`; form 3 adds a glow
// or flames in `glow`. Each draw reports `out.muzzle` (where shots leave from).

function mark(ctx, out, x, y) {
  if (!out) return;
  const m = ctx.getTransform();
  out.muzzle = { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

const REST = { x: 0, y: 0, lean: 0, sq: 1, tail: 0, wing: 0, blink: 0, mouth: 0, head: 0, step: 0, fire: 0, spin: 0 };

function squash(ctx, P, fn) {
  at(ctx, P.x, P.y, 0, () => at(ctx, 0, 0, P.lean, fn, 2 - P.sq, P.sq));
}

// Flickering flame tongues around a point (form 3 auras).
function flames(ctx, x, y, r, color, t, n = 5) {
  glow(ctx, x, y, r * 2.2, color, 0.45);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i - (n - 1) / 2) * 0.55;
    const h = r * (0.9 + 0.35 * Math.sin(t * 9 + i * 2.3));
    at(ctx, x + Math.cos(a) * r * 0.4, y + Math.sin(a) * r * 0.2, a + Math.PI / 2, () => {
      blob(ctx, (c) => { c.moveTo(-r * 0.32, 0); c.quadraticCurveTo(-r * 0.3, -h * 0.6, 0, -h); c.quadraticCurveTo(r * 0.3, -h * 0.6, r * 0.32, 0); c.closePath(); }, color, { ow: 1.4, depth: 1, light: lighter(color, 0.6) });
    });
  }
}

const quadLegs = (ctx, P, color, x0, x1, y, len = 9, r = 3) => {
  const legs = [[x0 - 3, P.step], [x1 - 3, -P.step], [x0 + 3, -P.step * 0.8], [x1 + 3, P.step * 0.8]];
  legs.forEach(([x, a], i) => {
    const back = i < 2;
    at(ctx, x, y, a * 0.5, () => {
      blob(ctx, capsule(0, 0, 0, len, r, r * 0.9), back ? darker(color, 0.22) : color, { depth: 1.2, ow: 2 });
      blob(ctx, ellipse(1.2, len + 0.5, r * 1.2, r * 0.8), back ? darker(color, 0.3) : lighter(color, 0.15), { depth: 0.8, ow: 1.8 });
    });
  });
};

const walkIdle = (t) => ({
  sq: 1 + Math.sin(t * 3.2) * 0.025,
  tail: Math.sin(t * 7),
  head: Math.sin(t * 1.6) * 0.05,
  blink: t % 3.4 < 0.12 ? 1 : 0,
  step: Math.sin(t * 3.2) * 0.12,
  fire: t,
});

const pounce = {
  dur: 0.32, channel: 'body',
  pose: (p) => ({
    x: track(p, [[0, 0], [0.2, -3], [0.45, 9, 'outCubic'], [1, 0]]),
    y: track(p, [[0, 0], [0.2, 0], [0.4, -7, 'out'], [0.6, 0, 'in'], [1, 0]]),
    sq: track(p, [[0, 0], [0.2, -0.1], [0.42, 0.08], [0.62, -0.06], [1, 0]]),
    mouth: bump(p, 0.3, 0.5),
    lean: track(p, [[0, 0], [0.2, 0.1], [0.45, -0.12], [1, 0]]),
  }),
};

const recoil = {
  dur: 0.3, channel: 'body',
  pose: (p) => ({
    x: track(p, [[0, 0], [0.12, -5, 'out'], [1, 0]]),
    lean: track(p, [[0, 0], [0.12, -0.12, 'out'], [1, 0]]),
    mouth: bump(p, 0.1, 0.5),
    sq: track(p, [[0, 0], [0.12, 0.06], [1, 0]]),
  }),
};

// ---- Dog ----

export const dog = {
  height: 38,
  rest: REST,
  idle: walkIdle,
  actions: { attack: pounce },
  draw(ctx, P, look, out) {
    const { body, belly, dark, accent, glow: gc } = look.colors;
    const f = look.form || 1;
    squash(ctx, P, () => {
      if (f >= 3) flames(ctx, -6, -26, 9, gc, P.fire, 4);
      // Tail wagging up behind.
      at(ctx, -14, -20, -0.6 + P.tail * 0.35, () => {
        if (f >= 3) flames(ctx, 0, -14, 4, gc, P.fire + 1, 3);
        blob(ctx, (c) => { c.moveTo(-2, 0); c.quadraticCurveTo(-8, -8, -4, -16); c.quadraticCurveTo(0, -10, 3, 0); c.closePath(); }, body, { depth: 1.4 });
      });
      quadLegs(ctx, P, body, -8, 8, -14, 9.5, 3.2);
      blob(ctx, ellipse(0, -18, 16, 10), body, { depth: 3 });
      flat(ctx, ellipse(2, -13, 10, 4.4), belly, 0.9);
      if (f >= 2) {
        // War paint stripes / armor strap.
        blob(ctx, roundRect(-6, -28, 5, 13, 2), accent, { ow: 1.6, depth: 0.8 });
        blob(ctx, roundRect(-13, -26, 4, 10, 2), accent, { ow: 1.6, depth: 0.8 });
      }
      at(ctx, 12, -24, P.head, () => {
        // Ears: floppy on the puppy, pointed from form 2.
        if (f === 1) blob(ctx, smooth([[-5, -8], [-1, -10], [-1, 2], [-6, 4], [-8, -2]]), dark, { depth: 1.2 });
        else blob(ctx, poly([[-6, -6], [-3, -19], [2, -7]]), dark, { depth: 1.4 });
        blob(ctx, circle(0, -2, 10.5), body, { depth: 2.4 });
        blob(ctx, smooth([[4, 0], [10, -3], [15, -1], [15, 4], [9, 6], [4, 5]]), belly, { depth: 1.4 });
        blob(ctx, ellipse(14.5, -1.5, 2.6, 2.1), INK, { ow: 1, shade: false, light: '#7a6a7a' });
        eye(ctx, 4.5, -5.5, 3.6, { lx: 0.8, blink: P.blink, pupil: f >= 3 ? '#a01818' : INK, angry: f >= 2 ? 0.4 : 0 });
        if (f >= 3) glow(ctx, 5, -5.5, 6, gc, 0.6);
        if (P.mouth > 0.3) blob(ctx, ellipse(10, 6.5, 3.6, 1.6 + P.mouth * 2), '#7a1f24', { ow: 1.4, shade: false, noLight: true });
        else line(ctx, (c) => { c.moveTo(7, 5); c.quadraticCurveTo(10, 7, 13, 5); }, INK, 1.4);
        if (f === 1) blob(ctx, roundRect(-9, 4, 12, 3.4, 1.6), accent, { ow: 1.6, depth: 0.6 });
        if (f !== 1) blob(ctx, poly([[-3, -8], [2, -21], [6, -9]]), body, { depth: 1.4 });
        mark(ctx, out, 14, 3);
      });
    });
  },
};

// ---- Cat ----

export const cat = {
  height: 36,
  rest: REST,
  idle: walkIdle,
  actions: { attack: pounce },
  draw(ctx, P, look, out) {
    const { body, belly, dark, accent, glow: gc } = look.colors;
    const f = look.form || 1;
    squash(ctx, P, () => {
      if (f >= 3) glow(ctx, 0, -18, 30, gc, 0.4);
      at(ctx, -14, -18, P.tail * 0.2, () => {
        blob(ctx, (c) => { c.moveTo(0, 0); c.bezierCurveTo(-10, -2, -12, -16, -4, -22); c.bezierCurveTo(-1, -24, 2, -21, -1, -19); c.bezierCurveTo(-7, -14, -5, -5, 3, -3); c.closePath(); }, body, { depth: 1.4 });
        if (f >= 2) flat(ctx, circle(-3, -21, 2.4), accent);
      });
      quadLegs(ctx, P, body, -7, 7, -12, 8.5, 2.8);
      blob(ctx, ellipse(0, -16, 15, 8.6), body, { depth: 2.8 });
      flat(ctx, ellipse(2, -11.5, 9, 3.6), belly, 0.9);
      // Stripes or spots on the back.
      const spot = f >= 3 ? gc : accent;
      if (f === 1) line(ctx, (c) => { for (const x of [-8, -3, 2]) { c.moveTo(x, -24); c.lineTo(x + 2, -18); } }, dark, 2);
      else for (const [x, y] of [[-8, -20], [-2, -22], [4, -19], [-5, -15]]) flat(ctx, circle(x, y, 1.8), spot, f >= 3 ? 0.95 : 0.85);
      at(ctx, 12, -22, P.head, () => {
        blob(ctx, poly([[-8, -4], [-6, -16], [0, -8]]), body, { depth: 1.2 });
        blob(ctx, circle(0, -1, 9.5), body, { depth: 2.2 });
        blob(ctx, poly([[0, -8], [6, -16], [8, -4]]), body, { depth: 1.2 });
        flat(ctx, poly([[2, -8], [5.6, -13], [6.6, -6]]), '#f6a0a8', 0.9);
        if (f >= 2) { line(ctx, (c) => { c.moveTo(6, -16); c.lineTo(6.5, -20); c.moveTo(-6, -16); c.lineTo(-6.5, -20); }, accent, 1.6); }
        blob(ctx, ellipse(7, 3, 5.6, 3.8), belly, { depth: 1, ow: 1.8 });
        flat(ctx, poly([[10.5, 0.5], [13, 0.5], [11.8, 2.4]]), '#e0707a');
        eye(ctx, 4, -3, 3.4, { lx: 0.8, blink: P.blink, pupil: f >= 3 ? '#5a1a8a' : '#2a3a1a', white: f >= 3 ? '#e8d0ff' : '#e8f4a0' });
        line(ctx, (c) => { c.moveTo(9, 4); c.lineTo(17, 2.5); c.moveTo(9, 5); c.lineTo(17, 6); }, INK, 0.9);
        if (P.mouth > 0.3) blob(ctx, ellipse(9.5, 6, 2.4, 1 + P.mouth * 1.6), '#7a1f24', { ow: 1.2, shade: false, noLight: true });
        mark(ctx, out, 12, 4);
      });
    });
  },
};

// ---- Robot ----

export const robot = {
  height: 40,
  rest: REST,
  idle: (t) => ({ ...walkIdle(t), sq: 1 + Math.sin(t * 4) * 0.015, head: Math.sin(t * 1.4) * 0.06, tail: t }),
  actions: { attack: recoil },
  draw(ctx, P, look, out) {
    const { body, belly, dark, accent, glow: gc } = look.colors;
    const f = look.form || 1;
    squash(ctx, P, () => {
      if (f >= 3) {
        // Jet flames under the feet.
        for (const x of [-6, 6]) flames(ctx, x, 1, 4, gc, P.fire + x, 3);
      }
      // Legs, body box and the arm cannon.
      blob(ctx, roundRect(-9, -11, 6, 11, 2), dark, { depth: 1, ow: 2 });
      blob(ctx, roundRect(3, -11, 6, 11, 2), dark, { depth: 1, ow: 2 });
      blob(ctx, roundRect(-12, -27, 24, 18, 5), body, { depth: 2.6 });
      blob(ctx, roundRect(-6, -23, 12, 9, 3), belly, { depth: 1.2, ow: 1.8 });
      const pulse = 0.6 + 0.4 * Math.sin(P.tail * 5);
      flat(ctx, circle(0, -18.5, 2.6), f >= 3 ? gc : accent, pulse);
      if (f >= 3) glow(ctx, 0, -18.5, 10, gc, 0.5 * pulse);
      if (f >= 2) {
        blob(ctx, roundRect(-15, -29, 8, 7, 2.6), accent, { depth: 1, ow: 1.8 });
        blob(ctx, roundRect(7, -29, 8, 7, 2.6), accent, { depth: 1, ow: 1.8 });
      }
      at(ctx, 10, -19, -0.15, () => {
        blob(ctx, roundRect(-1, -3.5, 14, 7, 3), dark, { depth: 1.2, ow: 2 });
        blob(ctx, roundRect(10, -4.5, 4, 9, 1.6), accent, { depth: 0.8, ow: 1.8 });
        mark(ctx, out, 15, 0);
      });
      // Head with a screen face and antenna.
      at(ctx, 0, -28, P.head, () => {
        line(ctx, (c) => { c.moveTo(0, -12); c.lineTo(0, -18); }, INK, 2);
        blob(ctx, circle(0, -19, 2.6), f >= 2 ? accent : '#e0413b', { ow: 1.6, depth: 0.6 });
        blob(ctx, roundRect(-11, -13, 22, 14, 5), body, { depth: 2.2 });
        blob(ctx, roundRect(-7, -10.5, 16, 9, 3), '#1d2a3a', { ow: 1.6, shade: false, light: '#3a5068' });
        const lit = 1 - P.blink;
        flat(ctx, roundRect(-3, -8 + P.blink * 2, 4, 4 * lit + 0.6, 1.4), f >= 3 ? gc : accent);
        flat(ctx, roundRect(4, -8 + P.blink * 2, 4, 4 * lit + 0.6, 1.4), f >= 3 ? gc : accent);
      });
    });
  },
};

// ---- Drone ----

export const drone = {
  height: 26,
  hover: 34,
  rest: REST,
  idle: (t) => ({ y: -34 + Math.sin(t * 2.6) * 3.5, lean: Math.sin(t * 1.3) * 0.08, spin: t * 30, blink: t % 3 < 0.1 ? 1 : 0, fire: t }),
  actions: { attack: recoil },
  draw(ctx, P, look, out) {
    const { body, belly, dark, accent, glow: gc } = look.colors;
    const f = look.form || 1;
    squash(ctx, P, () => {
      if (f >= 3) {
        // Orbiting ring.
        at(ctx, 0, -4, 0, () => {
          ctx.save(); ctx.scale(1, 0.32);
          line(ctx, circle(0, 0, 24), gc, 2.4, 0.8);
          ctx.restore();
          const a = P.fire * 3;
          flat(ctx, circle(Math.cos(a) * 24, Math.sin(a) * 7.7, 2.4), gc);
        });
        glow(ctx, 0, -4, 26, gc, 0.35);
      }
      // Rotor arms with spinning blades.
      for (const x of [-17, 17]) {
        blob(ctx, roundRect(x > 0 ? 6 : -x - 23, -12, 17, 3.6, 1.6), dark, { ow: 1.8, depth: 0.6 });
        blob(ctx, roundRect(x - 1.5, -16, 3, 5, 1.2), dark, { ow: 1.6, depth: 0.5 });
        const w = Math.abs(Math.cos(P.spin + x)) * 11 + 3;
        flat(ctx, ellipse(x, -16.5, w, 1.8), '#e8eef4', 0.7);
        line(ctx, ellipse(x, -16.5, w, 1.8), INK, 1.2, 0.6);
      }
      blob(ctx, smooth([[-14, -4], [-12, -12], [0, -15], [12, -12], [14, -4], [8, 3], [-8, 3]], 0.9), body, { depth: 2.6 });
      blob(ctx, roundRect(-9, -9, 18, 4, 2), belly, { ow: 1.6, depth: 0.6 });
      if (f >= 2) {
        blob(ctx, roundRect(-12, 0, 6, 6, 2), accent, { ow: 1.6, depth: 0.6 });
        blob(ctx, roundRect(6, 0, 6, 6, 2), accent, { ow: 1.6, depth: 0.6 });
      }
      // Camera eye.
      blob(ctx, circle(6, -3, 5.4), dark, { ow: 2, depth: 1 });
      flat(ctx, circle(7, -3, 3.2 * (1 - P.blink * 0.8)), f >= 3 ? gc : accent);
      flat(ctx, circle(5.8, -4.2, 1.2), '#ffffff');
      mark(ctx, out, 11, -2);
    });
  },
};

// ---- Dragon ----

function dragonWing(ctx, P, color, back) {
  at(ctx, back ? -2 : -6, -26, (back ? -0.3 : 0) + P.wing * 0.6, () => {
    blob(ctx, (c) => {
      c.moveTo(0, 0);
      c.quadraticCurveTo(-8, -16, -20, -20);
      c.quadraticCurveTo(-18, -12, -22, -6);
      c.quadraticCurveTo(-15, -7, -13, -1);
      c.quadraticCurveTo(-7, -5, -2, 4);
      c.closePath();
    }, back ? darker(color, 0.25) : color, { depth: 2 });
  });
}

export const dragon = {
  height: 44,
  rest: REST,
  idle: (t) => ({ ...walkIdle(t), wing: Math.sin(t * 4) * 0.35, tail: Math.sin(t * 2.4) }),
  actions: {
    attack: {
      dur: 0.38, channel: 'body',
      pose: (p) => ({
        mouth: bump(p, 0.25, 0.4),
        head: track(p, [[0, 0], [0.25, -0.25], [0.5, 0.15], [1, 0]]),
        lean: track(p, [[0, 0], [0.25, -0.08], [0.5, 0.06], [1, 0]]),
        wing: bump(p, 0.2, 0.5) * 0.8,
      }),
    },
  },
  draw(ctx, P, look, out) {
    const { body, belly, dark, accent, glow: gc } = look.colors;
    const f = look.form || 1;
    squash(ctx, P, () => {
      if (f >= 3) flames(ctx, -4, -30, 10, gc, P.fire, 5);
      dragonWing(ctx, P, dark, true);
      // Tail with a spade tip.
      at(ctx, -12, -12, P.tail * 0.15, () => {
        blob(ctx, (c) => { c.moveTo(2, -4); c.quadraticCurveTo(-12, -2, -18, -10); c.lineTo(-17, -4); c.quadraticCurveTo(-10, 4, 2, 4); c.closePath(); }, body, { depth: 1.4 });
        blob(ctx, poly([[-17, -13], [-25, -12], [-19, -5]]), f >= 3 ? gc : accent, { depth: 0.8, ow: 1.8 });
      });
      quadLegs(ctx, P, body, -7, 7, -12, 8.5, 3.4);
      blob(ctx, ellipse(0, -18, 14, 10.5), body, { depth: 3 });
      flat(ctx, ellipse(4, -14, 8, 6), belly, 0.95);
      line(ctx, (c) => { for (const y of [-17, -13.5, -10]) { c.moveTo(-1, y); c.quadraticCurveTo(4, y + 1.4, 9, y); } }, darker(belly, 0.3), 1.2);
      if (f >= 2) for (const x of [-10, -5, 0]) blob(ctx, poly([[x - 2.4, -27], [x, -33], [x + 2.4, -27]]), accent, { ow: 1.6, depth: 0.6 });
      dragonWing(ctx, P, dark, false);
      at(ctx, 11, -25, P.head, () => {
        blob(ctx, poly([[-6, -7], [-12, -17 - (f >= 2 ? 4 : 0)], [-1, -9]]), accent, { depth: 1.2, ow: 1.8 });
        blob(ctx, smooth([[-8, 2], [-8, -8], [0, -12], [10, -9], [17, -5], [17, 3 + P.mouth * 2], [6, 6], [-4, 6]], 0.9), body, { depth: 2.4 });
        if (P.mouth > 0.25) {
          blob(ctx, poly([[5, 3], [17, 2], [16, 4 + P.mouth * 5], [6, 6]]), '#7a1f24', { ow: 1.4, shade: false, noLight: true });
          glow(ctx, 19, 4, 8 + P.mouth * 8, gc, 0.7 * P.mouth);
        }
        blob(ctx, poly([[0, -10], [2, -18 - (f >= 2 ? 4 : 0)], [5, -10]]), accent, { depth: 1, ow: 1.8 });
        flat(ctx, circle(14.5, -4, 1), INK);
        eye(ctx, 5, -5, 3.4, { lx: 0.8, blink: P.blink, angry: 0.5, pupil: f >= 3 ? '#a01818' : INK, white: '#fff6c0' });
        mark(ctx, out, 18, 2);
      });
    });
  },
};

// ---- Phoenix ----

function featherWing(ctx, P, color, tip, back) {
  at(ctx, back ? -1 : -4, -6, (back ? -0.4 : 0) + P.wing, () => {
    blob(ctx, (c) => {
      c.moveTo(2, 0);
      c.quadraticCurveTo(-6, -16, -24, -19);
      c.quadraticCurveTo(-20, -14, -26, -11);
      c.quadraticCurveTo(-19, -9, -23, -4);
      c.quadraticCurveTo(-14, -5, -12, 2);
      c.quadraticCurveTo(-5, -2, 2, 5);
      c.closePath();
    }, back ? darker(color, 0.25) : color, { depth: 2, light: tip });
  });
}

export const phoenix = {
  height: 34,
  hover: 32,
  rest: REST,
  idle: (t) => ({
    y: -32 + Math.sin(t * 3.4) * 4,
    wing: Math.sin(t * 6.8) * 0.55,
    tail: Math.sin(t * 3.4 - 1),
    head: Math.sin(t * 1.7) * 0.06,
    blink: t % 3.2 < 0.12 ? 1 : 0,
    fire: t,
  }),
  actions: { attack: { dur: 0.32, channel: 'body', pose: (p) => ({ wing: track(p, [[0, 0], [0.3, -0.7], [0.55, 0.9, 'outCubic'], [1, 0]]), x: track(p, [[0, 0], [0.55, 6], [1, 0]]), mouth: bump(p, 0.3, 0.5) }) } },
  draw(ctx, P, look, out) {
    const { body, belly, dark, accent, glow: gc } = look.colors;
    const f = look.form || 1;
    squash(ctx, P, () => {
      glow(ctx, 0, -2, f >= 3 ? 34 : 22, gc, f >= 3 ? 0.5 : 0.3);
      featherWing(ctx, P, dark, accent, true);
      // Long trailing tail feathers.
      at(ctx, -9, 2, 0.35 + P.tail * 0.12, () => {
        for (let i = 0; i < 3; i++) {
          const len = 20 + i * 5 + (f - 1) * 4;
          blob(ctx, (c) => { c.moveTo(0, 0); c.quadraticCurveTo(-len * 0.5, 4 + i * 3, -len, 2 + i * 5); c.quadraticCurveTo(-len * 0.5, 8 + i * 3, 0, 4); c.closePath(); }, i === 1 ? accent : body, { depth: 1.2, ow: 1.8 });
        }
        if (f >= 3) flames(ctx, -26, 8, 5, gc, P.fire, 3);
      });
      blob(ctx, ellipse(0, -2, 12, 10), body, { depth: 2.6 });
      flat(ctx, ellipse(4, 1, 7, 6), belly, 0.95);
      at(ctx, 8, -12, P.head, () => {
        // Crest feathers.
        for (let i = 0; i < 3; i++) blob(ctx, (c) => { c.moveTo(-3, -5); c.quadraticCurveTo(-8 - i * 2, -14 - i * 2, -12 - i * 3, -12 + i * 3); c.quadraticCurveTo(-6, -8, -2, -3); c.closePath(); }, i === 1 ? accent : body, { ow: 1.6, depth: 0.8 });
        if (f >= 3) flames(ctx, -6, -10, 4, gc, P.fire + 2, 3);
        blob(ctx, circle(0, 0, 8), body, { depth: 2 });
        blob(ctx, poly([[6, -2], [14, 1 + P.mouth], [6, 3]]), '#ffc23a', { ow: 1.6, depth: 0.6 });
        eye(ctx, 3, -1.5, 3, { lx: 0.8, blink: P.blink, angry: 0.3 });
        mark(ctx, out, 13, 1);
      });
      featherWing(ctx, P, body, accent, false);
    });
  },
};

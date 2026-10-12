import {
  INK, at, blob, line, flat, glow, ellipse, circle, roundRect, smooth, poly, capsule, star, eye, darker, lighter, mix,
} from './paint.js';
import { track, bump } from './anim.js';

// Enemy actors. Drawn facing +x like everyone else; the renderer mirrors them to face the hero.
// Colors come from config (`body`, `accent`); bosses get a crown and angrier brows.

const GOLD = '#f4b836';

export function crown(ctx, x, y, rot = 0, s = 1) {
  at(ctx, x, y, rot, () => {
    glow(ctx, 0, -6, 20, '#ffd060', 0.35);
    blob(ctx, poly([[-11, 0], [-13, -13], [-6, -6], [0, -16], [6, -6], [13, -13], [11, 0]]), GOLD, { depth: 2 });
    blob(ctx, roundRect(-12, -2, 24, 5, 2), mix(GOLD, '#c07a1a', 0.4), { depth: 1.2, ow: 1.8 });
    flat(ctx, circle(0, -8, 2), '#e0413b');
    flat(ctx, circle(-7, -5, 1.4), '#4aa8f0');
    flat(ctx, circle(7, -5, 1.4), '#4aa8f0');
  }, s);
}

// An iron helmet for armored enemies (drawn where a boss wears its crown).
export function helmet(ctx, x, y, rot = 0, s = 1) {
  at(ctx, x, y + 6, rot, () => {
    blob(ctx, (c) => { c.moveTo(-13, 2); c.bezierCurveTo(-13, -16, 13, -16, 13, 2); c.closePath(); }, '#8f9cab', { depth: 2.4, light: '#dfe6ee' });
    blob(ctx, roundRect(-15, -1, 30, 5, 2.4), '#6f7b8a', { depth: 1, ow: 1.8 });
    blob(ctx, roundRect(-2, -15, 4, 14, 2), '#c8d2dc', { depth: 0.8, ow: 1.6 });
    for (const rx of [-9, 0, 9]) flat(ctx, circle(rx, 1.5, 1.1), '#4a5462');
  }, s);
}

function headgear(ctx, look, x, y, rot, s = 1) {
  if (look.boss) crown(ctx, x, y, rot, s);
  else if (look.armored) helmet(ctx, x, y, rot, s);
}

const REST = { x: 0, y: 0, lean: 0, sq: 1, blink: 0, wob: 0, wing: 0, jaw: 0, arm: 0, mouth: 0, alpha: 1 };

const hurt = {
  dur: 0.28, channel: 'hurt',
  pose: (p, v) => {
    const k = v ? 1.6 : 1;
    return {
      x: track(p, [[0, 0], [0.12, -7 * k, 'out'], [1, 0]]),
      lean: track(p, [[0, 0], [0.12, -0.16 * k, 'out'], [1, 0]]),
      sq: track(p, [[0, 0], [0.1, -0.16 * k, 'out'], [0.35, 0.07], [1, 0]]),
      mouth: bump(p, 0.1, 0.6),
      blink: bump(p, 0.05, 0.5) * 0.7,
    };
  },
};

const die = {
  dur: 0.32, hold: true, channel: 'die',
  pose: (p) => ({
    x: track(p, [[0, 0], [1, -20, 'outCubic']]),
    y: track(p, [[0, 0], [0.4, -12, 'out'], [1, 4, 'in']]),
    lean: track(p, [[0, 0], [1, -0.9, 'outCubic']]),
    sq: track(p, [[0, 0], [0.25, 0.12], [1, -0.35]]),
    mouth: 1,
    blink: 1,
  }),
};

// Hop in from the right (local -x after the mirror).
const enter = {
  dur: 0.45, channel: 'enter', instant: true,
  pose: (p) => ({
    x: track(p, [[0, -70], [1, 0, 'outCubic']]),
    y: track(p, [[0, 0], [0.45, -18, 'out'], [0.8, 0, 'in'], [1, 0]]),
    sq: track(p, [[0, 0], [0.75, 0.05], [0.85, -0.14], [1, 0]]),
    alpha: track(p, [[0, -1], [0.25, 0]]),
  }),
};

// Lunge toward the target (dungeon fights).
const attack = {
  dur: 0.34, channel: 'body',
  pose: (p) => ({
    x: track(p, [[0, 0], [0.3, -4], [0.5, 12, 'outCubic'], [1, 0]]),
    lean: track(p, [[0, 0], [0.3, -0.1], [0.5, 0.18], [1, 0]]),
    sq: track(p, [[0, 0], [0.3, -0.08], [0.5, 0.06], [1, 0]]),
    mouth: bump(p, 0.3, 0.5),
  }),
};

// Rearing back before a strike; held until the attack lands or is interrupted.
const windup = {
  dur: 1.4, hold: true, channel: 'body',
  pose: (p) => ({
    x: track(p, [[0, 0], [0.25, -9, 'out']]),
    lean: track(p, [[0, 0], [0.25, -0.28, 'out']]) + Math.sin(p * 40) * 0.03,
    sq: track(p, [[0, 0], [0.25, 0.1, 'out']]),
    mouth: 1,
  }),
};

// Running off the right edge (local -x after the mirror) for fleeing goblins and elites.
const flee = {
  dur: 0.7, hold: true, channel: 'die',
  pose: (p) => ({
    x: track(p, [[0, 0], [0.15, 6], [1, -160, 'in']]),
    y: -Math.abs(Math.sin(p * Math.PI * 5)) * 8,
    lean: -0.2,
    mouth: 1,
  }),
};

export const baseActions = { hurt, die, enter, attack, windup, flee };

export function squash(ctx, P, fn) {
  at(ctx, P.x, P.y, 0, () => at(ctx, 0, 0, P.lean, fn, 2 - P.sq, P.sq));
}

export function mouthShape(ctx, x, y, w, open, teeth = true) {
  if (open > 0.15) {
    blob(ctx, ellipse(x, y + open * 2, w * 0.5, 1.5 + open * 4), '#5a1426', { ow: 1.6, shade: false, noLight: true });
    if (teeth) flat(ctx, poly([[x - w * 0.3, y - 0.2], [x - w * 0.15, y + 2.4], [x, y - 0.2]]), '#ffffff');
  } else {
    line(ctx, (c) => { c.moveTo(x - w * 0.5, y); c.quadraticCurveTo(x, y + 2.6, x + w * 0.5, y - 0.6); }, INK, 1.8);
    if (teeth) flat(ctx, poly([[x + w * 0.05, y + 0.6], [x + w * 0.2, y + 3.2], [x + w * 0.32, y + 0.2]]), '#ffffff');
  }
}

// ---- Slime ----

export const slime = {
  height: 44,
  rest: REST,
  idle: (t) => {
    const b = Math.sin(t * 5);
    return { sq: 1 + b * 0.06, y: 0, wob: t, blink: t % 3.3 < 0.12 ? 1 : 0 };
  },
  actions: baseActions,
  draw(ctx, P, look) {
    const { body, accent } = look.colors;
    const w = P.wob;
    squash(ctx, P, () => {
      const pts = [[-26, 0], [-27.5, -11], [-21, -27], [-4, -36], [14, -33], [25, -20], [27, -6], [24, 0]];
      const wob = pts.map(([x, y], i) => [x + Math.sin(w * 4 + i * 1.7) * 1.2, y + Math.cos(w * 3.4 + i * 2.1) * 1.2]);
      glow(ctx, 0, -16, 34, accent, 0.18);
      blob(ctx, smooth(wob, 1), body, { depth: 5, light: accent });
      // Floating bubbles inside and a glossy shine.
      flat(ctx, circle(-12, -9 + Math.sin(w * 2) * 2, 3), lighter(body, 0.3), 0.8);
      flat(ctx, circle(-4, -6 + Math.sin(w * 2 + 2) * 2, 1.8), lighter(body, 0.3), 0.8);
      flat(ctx, ellipse(-13, -25, 6, 3.4, -0.5), '#ffffff', 0.75);
      flat(ctx, circle(-5, -30.5, 1.8), '#ffffff', 0.75);
      // A drip on the side.
      blob(ctx, smooth([[22, -10], [26, -4], [25.5, 3 + Math.sin(w * 3) * 1.5], [22, 2]]), body, { depth: 1.2, ow: 1.8, noLight: true });
      eye(ctx, 6, -20, 5.4, { lx: 0.7, blink: P.blink, angry: look.boss ? 0.9 : 0.25 });
      eye(ctx, 17.5, -19, 4.6, { lx: 0.7, blink: P.blink, angry: look.boss ? 0.9 : 0.25 });
      mouthShape(ctx, 13, -9, 9, P.mouth, false);
      headgear(ctx, look, 0, -35, 0.08);
    });
  },
};

// ---- Bat ----

function batWing(ctx, P, color, membrane, back) {
  const a = (back ? -0.25 : 0) + P.wing;
  at(ctx, back ? 2 : -4, -4, a, () => {
    blob(ctx, (c) => {
      c.moveTo(0, -2);
      c.quadraticCurveTo(-14, -20, -30, -18);
      c.quadraticCurveTo(-27, -11, -31, -5);
      c.quadraticCurveTo(-23, -5, -22, 1);
      c.quadraticCurveTo(-15, -2, -12, 4);
      c.quadraticCurveTo(-6, 0, 0, 4);
      c.closePath();
    }, back ? darker(membrane, 0.25) : membrane, { depth: 2.4 });
    line(ctx, (c) => { c.moveTo(0, -2); c.quadraticCurveTo(-14, -20, -30, -18); }, color, 2.6);
    line(ctx, (c) => { c.moveTo(-3, -6); c.lineTo(-22, 1); c.moveTo(-5, -8); c.lineTo(-31, -5); }, darker(membrane, 0.4), 1.3);
  });
}

export const bat = {
  height: 40,
  hover: 46,
  rest: REST,
  idle: (t) => ({
    wing: Math.sin(t * 13) * 0.7,
    y: -46 + Math.sin(t * 3) * 4,
    sq: 1 + Math.sin(t * 13 + 1) * 0.04,
    blink: t % 3.1 < 0.12 ? 1 : 0,
  }),
  actions: baseActions,
  draw(ctx, P, look) {
    const { body, accent } = look.colors;
    squash(ctx, P, () => {
      batWing(ctx, P, body, accent, true);
      // Ears, body and tiny feet.
      blob(ctx, poly([[-8, -11], [-11, -25], [-2, -14]]), body, { depth: 1.8 });
      blob(ctx, poly([[4, -13], [9, -27], [12, -12]]), body, { depth: 1.8 });
      flat(ctx, poly([[6, -15], [9, -23], [10.5, -14]]), accent, 0.8);
      blob(ctx, smooth([[-14, 2], [-15, -10], [-6, -16], [6, -16], [15, -9], [15, 3], [6, 11], [-6, 11]]), body, { depth: 3.4 });
      flat(ctx, ellipse(1, 3, 8, 6), lighter(body, 0.25), 0.7);
      blob(ctx, capsule(-4, 11, -5, 15, 1.6), darker(body, 0.3), { ow: 1.4, depth: 0.6 });
      blob(ctx, capsule(3, 11, 4, 15, 1.6), darker(body, 0.3), { ow: 1.4, depth: 0.6 });
      eye(ctx, 2.5, -6, 4.2, { lx: 0.7, blink: P.blink, angry: look.boss ? 1 : 0.7, pupil: '#2a0a12' });
      eye(ctx, 11, -5.5, 3.6, { lx: 0.7, blink: P.blink, angry: look.boss ? 1 : 0.7, pupil: '#2a0a12' });
      mouthShape(ctx, 8, 2.5, 8, P.mouth, true);
      batWing(ctx, P, body, accent, false);
      headgear(ctx, look, 1, -18, 0.05, 0.8);
    });
  },
};

// ---- Mushroom ----

export const mushroom = {
  height: 54,
  rest: REST,
  idle: (t) => ({
    lean: Math.sin(t * 2.4) * 0.06,
    sq: 1 + Math.sin(t * 4.8) * 0.025,
    arm: Math.sin(t * 2.4 + 1) * 0.3,
    blink: t % 3.9 < 0.12 ? 1 : 0,
  }),
  actions: baseActions,
  draw(ctx, P, look) {
    const { body, accent } = look.colors;
    squash(ctx, P, () => {
      // Feet and stubby arms.
      blob(ctx, ellipse(-7, -1.5, 6, 3.6), darker(accent, 0.2), { depth: 1.2 });
      blob(ctx, ellipse(8, -1.5, 6, 3.6), darker(accent, 0.2), { depth: 1.2 });
      at(ctx, -11, -15, 0.5 + P.arm, () => blob(ctx, capsule(0, 0, 0, 9, 2.8, 2.4), accent, { depth: 1 }));
      // Stem body with the face.
      blob(ctx, smooth([[-11, -2], [-13, -15], [-10, -29], [10, -29], [13, -15], [11, -2]], 0.9), accent, { depth: 3.2 });
      eye(ctx, 0.5, -17, 4, { lx: 0.7, blink: P.blink, angry: look.boss ? 0.9 : 0.35 });
      eye(ctx, 8.5, -16.5, 3.4, { lx: 0.7, blink: P.blink, angry: look.boss ? 0.9 : 0.35 });
      mouthShape(ctx, 5.5, -8.5, 7, P.mouth, false);
      flat(ctx, ellipse(-1, -11.5, 2.4, 1.4), '#f29a8a', 0.55);
      at(ctx, 11, -15, -0.5 - P.arm, () => blob(ctx, capsule(0, 0, 0, 9, 2.8, 2.4), accent, { depth: 1 }));
      // Big spotted cap, tilting with the lean.
      at(ctx, 0, -27, P.lean * 0.8, () => {
        blob(ctx, smooth([[-27, 2], [-25, -10], [-14, -22], [2, -26], [17, -21], [26, -9], [27, 2], [0, 5]], 0.9), body, { depth: 4.4 });
        flat(ctx, ellipse(-11, -11, 5, 4, -0.3), lighter(accent, 0.3), 0.95);
        flat(ctx, ellipse(4, -18, 4, 3), lighter(accent, 0.3), 0.95);
        flat(ctx, ellipse(15, -8, 4.4, 3.4, 0.3), lighter(accent, 0.3), 0.95);
        flat(ctx, ellipse(-19, -3, 2.6, 2), lighter(accent, 0.3), 0.95);
        line(ctx, (c) => { c.moveTo(-24, 1.5); c.quadraticCurveTo(0, 6, 25, 1.5); }, darker(body, 0.35), 2);
        headgear(ctx, look, 2, -24, 0.1);
      });
    });
  },
};

// ---- Skeleton ----

function bone(ctx, x1, y1, x2, y2, color, r = 2.2) {
  blob(ctx, capsule(x1, y1, x2, y2, r), color, { depth: 1, ow: 1.8 });
  blob(ctx, circle(x2, y2, r * 1.15), color, { depth: 0.8, ow: 1.6 });
}

export const skeleton = {
  height: 72,
  rest: REST,
  idle: (t) => ({
    lean: Math.sin(t * 2.2) * 0.04,
    jaw: Math.max(0, Math.sin(t * 6)) * 0.4,
    arm: Math.sin(t * 2.2) * 0.12,
    sq: 1 + Math.sin(t * 4.4) * 0.015,
  }),
  actions: baseActions,
  draw(ctx, P, look) {
    const { body, accent } = look.colors;
    const dark = darker(body, 0.35);
    squash(ctx, P, () => {
      // Back arm, legs and pelvis.
      at(ctx, -5, -42, 0.4 - P.arm, () => { bone(ctx, 0, 0, 0, 12, dark); at(ctx, 0, 12, -0.5, () => bone(ctx, 0, 0, 0, 11, dark)); });
      bone(ctx, -4, -24, -6, -12, dark, 2.4);
      bone(ctx, -6, -12, -5, -2, dark, 2.2);
      blob(ctx, ellipse(-3, -1, 5, 2.6), dark, { depth: 0.8, ow: 1.6 });
      bone(ctx, 3, -24, 5, -12, body, 2.4);
      bone(ctx, 5, -12, 5, -2, body, 2.2);
      blob(ctx, ellipse(8, -1, 5, 2.6), body, { depth: 0.8, ow: 1.6 });
      blob(ctx, smooth([[-8, -22], [-6, -28], [6, -28], [8, -22], [0, -19]]), body, { depth: 1.4, ow: 2 });
      // Spine and ribs.
      blob(ctx, roundRect(-1.8, -45, 3.6, 19, 1.8), body, { depth: 0.8, ow: 1.8 });
      for (let i = 0; i < 3; i++) {
        const y = -42 + i * 5;
        blob(ctx, (c) => { c.moveTo(-8 + i, y); c.quadraticCurveTo(0, y - 4, 8 - i, y); c.quadraticCurveTo(0, y - 1.4, -8 + i, y); }, body, { ow: 1.8, depth: 0.6, noLight: true });
      }
      // Skull with glowing eye sockets.
      at(ctx, 1, -49, P.lean * 0.6, () => {
        glow(ctx, 6, -9, 14, accent, 0.35);
        blob(ctx, smooth([[-11, -4], [-12, -14], [-6, -22], [5, -23], [13, -17], [14, -8], [11, -2], [-6, -1]], 0.9), body, { depth: 2.6 });
        blob(ctx, roundRect(-2, -3 + P.jaw * 3, 14, 6, 2.4), body, { depth: 1, ow: 2 });
        line(ctx, (c) => { for (let x = 1; x < 12; x += 3) { c.moveTo(x, -2 + P.jaw * 3); c.lineTo(x, 2 + P.jaw * 3); } }, dark, 1.2);
        blob(ctx, ellipse(1, -11, 4, 4.6), '#231a26', { ow: 1.4, shade: false, noLight: true });
        blob(ctx, ellipse(10, -10, 3.4, 4.2), '#231a26', { ow: 1.4, shade: false, noLight: true });
        const lit = 1 - P.blink * 0.8;
        flat(ctx, circle(2, -10.5, 1.8), accent, lit);
        flat(ctx, circle(10.6, -9.6, 1.5), accent, lit);
        flat(ctx, poly([[6, -6], [4.6, -3.6], [7.4, -3.6]]), '#231a26');
        headgear(ctx, look, 1, -21, 0.12, 0.9);
      });
      // Front arm with a rusty blade.
      at(ctx, 5, -42, -0.5 + P.arm, () => {
        bone(ctx, 0, 0, 0, 12, body);
        at(ctx, 0, 12, -0.7, () => {
          bone(ctx, 0, 0, 0, 10, body);
          at(ctx, 0, 11, -0.9, () => {
            blob(ctx, roundRect(-4, -1.6, 7, 3.2, 1.4), '#7a4a2c', { ow: 1.6, depth: 0.6 });
            blob(ctx, poly([[3, -3], [22, -4.5], [27, -1], [22, 2.6], [3, 3]]), '#a8a29a', { depth: 1.6, ow: 2, light: '#d8d2c8' });
            flat(ctx, circle(14, -1, 1.2), '#8a5a3a');
            blob(ctx, roundRect(2, -5.5, 3, 11, 1.4), '#6a5a52', { ow: 1.6, depth: 0.6 });
            blob(ctx, circle(0, 0, 2.6), body, { ow: 1.6, depth: 0.6 });
          });
        });
      });
    });
  },
};

// ---- Ghost ----

export const ghost = {
  height: 52,
  hover: 16,
  rest: REST,
  idle: (t) => ({
    y: -16 + Math.sin(t * 2.4) * 5,
    wob: t,
    lean: Math.sin(t * 1.2) * 0.08,
    arm: Math.sin(t * 2.4 + 0.8) * 0.4,
    blink: t % 3.6 < 0.12 ? 1 : 0,
  }),
  actions: baseActions,
  draw(ctx, P, look) {
    const { body, accent } = look.colors;
    const w = P.wob;
    squash(ctx, P, () => {
      glow(ctx, 0, -18, 42, accent, 0.3);
      const a = ctx.globalAlpha;
      ctx.globalAlpha = a * 0.9;
      blob(ctx, (c) => {
        c.moveTo(-20, -16);
        c.bezierCurveTo(-20, -44, 20, -44, 20, -16);
        c.bezierCurveTo(20, -4, 22, 2, 18 + Math.sin(w * 5) * 2, 10);
        c.quadraticCurveTo(12, 6 + Math.sin(w * 5 + 1) * 3, 8, 12);
        c.quadraticCurveTo(2, 6, -3, 13 + Math.sin(w * 5 + 2) * 2);
        c.quadraticCurveTo(-8, 7, -14, 14 + Math.sin(w * 5 + 3) * 3);
        c.quadraticCurveTo(-22, 0, -20, -16);
      }, body, { depth: 4, light: '#ffffff' });
      at(ctx, -17, -14, 0.6 + P.arm, () => blob(ctx, ellipse(0, 5, 4, 7), body, { depth: 1.2 }));
      ctx.globalAlpha = a;
      // Hollow eyes and an "oooh" mouth.
      const open = 1 - P.blink * 0.85;
      blob(ctx, ellipse(1, -24, 4, 5.4 * open), '#1e1430', { ow: 1.4, shade: false, noLight: true });
      blob(ctx, ellipse(12, -23, 3.4, 4.8 * open), '#1e1430', { ow: 1.4, shade: false, noLight: true });
      flat(ctx, circle(1.5, -25, 1.6), accent, open);
      flat(ctx, circle(12.3, -24, 1.4), accent, open);
      blob(ctx, ellipse(8, -12, 3 + P.mouth * 1.5, 3.6 + P.mouth * 2.5), '#1e1430', { ow: 1.4, shade: false, noLight: true });
      at(ctx, 17, -14, -0.6 - P.arm, () => blob(ctx, ellipse(0, 5, 4, 7), body, { depth: 1.2, alpha: 0.9 }));
      headgear(ctx, look, 0, -38, 0.1);
    });
  },
};

// ---- Treasure goblin ----

export const goblin = {
  height: 46,
  rest: REST,
  idle: (t) => ({
    y: -Math.abs(Math.sin(t * 9)) * 3,
    sq: 1 + Math.sin(t * 18) * 0.03,
    lean: Math.sin(t * 4.5) * 0.08,
    arm: Math.sin(t * 9) * 0.4,
    wob: t,
    blink: t % 2.6 < 0.12 ? 1 : 0,
  }),
  actions: baseActions,
  draw(ctx, P, look) {
    const skin = look.colors?.body || '#7cc65a';
    const cloth = look.colors?.accent || '#8a5a32';
    squash(ctx, P, () => {
      // Sack of gold on the back, coins peeking out.
      at(ctx, -12, -24, Math.sin(P.wob * 9) * 0.08, () => {
        blob(ctx, smooth([[-12, 8], [-14, -6], [-6, -16], [6, -15], [10, -4], [9, 9]], 0.9), '#c8a06a', { depth: 3 });
        blob(ctx, circle(-2, -17, 3.4), GOLD, { ow: 1.4, depth: 0.8 });
        blob(ctx, circle(4, -16, 3), GOLD, { ow: 1.4, depth: 0.8 });
        line(ctx, (c) => { c.moveTo(-8, -12); c.quadraticCurveTo(0, -9, 8, -11); }, '#7a4a2c', 2);
        flat(ctx, star(-3, -2, 3, 1.3, 5), GOLD);
      });
      // Legs and body.
      blob(ctx, capsule(-4, -14, -6 - P.arm * 3, -1, 2.6), skin, { depth: 0.8, ow: 1.8 });
      blob(ctx, capsule(4, -14, 6 + P.arm * 3, -1, 2.6), skin, { depth: 0.8, ow: 1.8 });
      blob(ctx, smooth([[-9, -12], [-8, -24], [0, -28], [8, -24], [9, -12], [0, -9]], 0.9), cloth, { depth: 2.4 });
      blob(ctx, roundRect(-9, -15, 18, 3.6, 1.6), '#5a3620', { ow: 1.4, depth: 0.6 });
      // Head: big ears and nose, greedy grin.
      at(ctx, 2, -32, P.lean * 0.5, () => {
        blob(ctx, poly([[-8, -2], [-20, -8], [-9, 3]]), skin, { depth: 1.2 });
        blob(ctx, poly([[8, -3], [19, -10], [10, 3]]), skin, { depth: 1.2 });
        blob(ctx, circle(0, 0, 10), skin, { depth: 2.4 });
        blob(ctx, ellipse(9, 2, 4.4, 3.4, 0.3), darker(skin, 0.15), { depth: 1, ow: 1.8 });
        eye(ctx, 2, -3, 3.2, { lx: 0.7, blink: P.blink, angry: 0.2, white: '#fff6c0' });
        eye(ctx, 9.5, -3.5, 2.8, { lx: 0.7, blink: P.blink, angry: 0.2, white: '#fff6c0' });
        blob(ctx, (c) => { c.moveTo(-1, 5); c.quadraticCurveTo(5, 10 + P.mouth * 2, 10, 6); c.closePath(); }, '#5a1426', { ow: 1.4, shade: false, noLight: true });
        flat(ctx, poly([[2, 5.6], [3.6, 8], [5, 6]]), '#ffffff');
      });
      // Arm hugging a coin.
      at(ctx, 7, -22, 0.4 + P.arm * 0.3, () => {
        blob(ctx, capsule(0, 0, 0, 8, 2.4), skin, { depth: 0.8, ow: 1.8 });
        blob(ctx, circle(1, 10, 3.6), GOLD, { ow: 1.4, depth: 0.8, light: '#fff2a8' });
      });
    });
  },
};

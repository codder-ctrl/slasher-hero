import {
  INK, at, blob, line, flat, glow, ellipse, circle, roundRect, smooth, poly, capsule, scallop, eye, darker, lighter,
  curlPts, tube,
} from './paint.js';
import { track, bump } from './anim.js';
import { baseActions, squash } from './monsters.js';

// Zone bosses: one hand-drawn giant per zone, met on the zone's last stage (config ZONES[].boss).
// Same conventions as monsters.js: drawn facing +x, mirrored by the renderer, colors from
// config (`body`, `accent`). Extra fields the renderer reads:
//   bossScale  drawing scale in battle (ordinary bosses use 1.5)
//   special    which attack effect plays when its hit lands ('slam', 'leaves', 'crystals',
//              'sting', 'iceblock', 'eruption'); draws may report `out.muzzle` where it starts

const GOLD = '#f4b836';
const BONE = '#f2ead8';
const REST = { x: 0, y: 0, lean: 0, sq: 1, blink: 0, wob: 0, arm: 0, arm2: 0, club: 0, mouth: 0, alpha: 1, glow: 0, sway: 0 };

// Crashing down from above: the renderer shakes the screen when it lands (p ≈ 0.55).
export const BOSS_LAND = 0.55;
export const bossEnter = {
  dur: 0.62, channel: 'enter', instant: true,
  pose: (p) => ({
    y: track(p, [[0, -190], [BOSS_LAND, 0, 'in'], [1, 0]]),
    sq: track(p, [[0, 0.08], [BOSS_LAND, 0.08], [0.64, -0.24, 'out'], [0.82, 0.07], [1, 0]]),
    alpha: track(p, [[0, -1], [0.1, 0]]),
    mouth: bump(p, 0.62, 0.3),
  }),
};

// A seeded generator, so canopies and rock shapes are the same every frame.
function seeded(seed) {
  let s = seed;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

// ---- Goblin Şef: a big-bellied goblin chief with a spiked war club ----

function warClub(ctx) {
  blob(ctx, roundRect(-3, -16, 6, 27, 3), '#7a4a2c', { depth: 1, ow: 1.8 });
  blob(ctx, circle(0, 11, 3.4), '#6a6a7a', { depth: 0.8, ow: 1.6 });
  for (const [x, y, a] of [[-11, -30, -1.35], [-12, -45, -1.6], [11, -32, 1.35], [12, -46, 1.6], [0, -58, 0], [-7, -55, -0.7], [7, -55, 0.7]]) {
    at(ctx, x, y, a, () => blob(ctx, poly([[-2.8, 1], [0, -7], [2.8, 1]]), '#c8d2dc', { ow: 1.4, depth: 0.6, light: '#ffffff' }));
  }
  blob(ctx, smooth([[-4, -12], [-9, -28], [-12, -46], [-6, -58], [6, -58], [12, -46], [9, -28], [4, -12]], 0.9), '#b8784a', { depth: 3.4 });
  line(ctx, (c) => { c.moveTo(-4, -30); c.quadraticCurveTo(-6, -40, -3, -50); c.moveTo(4, -22); c.lineTo(5, -30); }, '#7a4a2c', 1.4);
  blob(ctx, roundRect(-9.5, -25, 19, 4.4, 2), '#6a6a7a', { ow: 1.6, depth: 0.6 });
}

export const goblinChief = {
  height: 84,
  bossScale: 1.15,
  special: 'slam',
  rest: { ...REST, arm: -0.35, club: 2.55 },
  idle: (t) => ({
    y: -Math.abs(Math.sin(t * 2.6)) * 1.4,
    sq: 1 + Math.sin(t * 5.2) * 0.02,
    lean: Math.sin(t * 1.3) * 0.04,
    arm: -0.35 + Math.sin(t * 2.6) * 0.05,
    arm2: Math.sin(t * 2.6 + 1) * 0.12,
    club: 2.55 - Math.sin(t * 2.6) * 0.05,
    blink: t % 3.3 < 0.12 ? 1 : 0,
  }),
  actions: {
    ...baseActions,
    enter: bossEnter,
    // Club raised high behind the head.
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -6, 'out']]),
        lean: track(p, [[0, 0], [0.25, -0.22, 'out']]) + Math.sin(p * 40) * 0.02,
        arm: track(p, [[0, 0], [0.25, -2.25, 'out']]),
        club: track(p, [[0, 0], [0.25, -0.45, 'out']]),
        arm2: track(p, [[0, 0], [0.25, -0.7, 'out']]),
        sq: track(p, [[0, 0], [0.25, 0.06, 'out']]),
        mouth: 1,
      }),
    },
    // Over the top and into the ground in front.
    attack: {
      dur: 0.5, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -6], [0.28, 10, 'in'], [0.7, 10], [1, 0]]),
        lean: track(p, [[0, -0.22], [0.28, 0.24, 'in'], [0.7, 0.24], [1, 0]]),
        arm: track(p, [[0, -2.25], [0.28, -0.6, 'in'], [0.7, -0.6], [1, 0]]),
        club: track(p, [[0, -0.45], [0.28, 0.9, 'in'], [0.7, 0.9], [1, 0]]),
        arm2: track(p, [[0, -0.7], [0.28, 0.4], [1, 0]]),
        sq: track(p, [[0, 0.06], [0.28, -0.1], [0.5, 0.03], [1, 0]]),
        mouth: bump(p, 0.1, 0.5),
      }),
    },
  },
  draw(ctx, P, look) {
    const skin = look.colors.body;
    const cloth = look.colors.accent;
    const dark = darker(skin, 0.3);
    squash(ctx, P, () => {
      // Back arm.
      at(ctx, -19, -52, 0.35 + P.arm2, () => {
        blob(ctx, capsule(0, 0, 0, 17, 5.4, 4.6), dark, { depth: 1.2 });
        blob(ctx, circle(0, 19, 5.8), dark, { depth: 1 });
      });
      // Stubby legs in fur boots.
      blob(ctx, capsule(-9, -20, -11, -5, 5.8, 5.2), dark, { depth: 1 });
      blob(ctx, ellipse(-11, -3.4, 8.8, 4.8), darker(cloth, 0.2), { depth: 1.2 });
      blob(ctx, capsule(9, -20, 11, -5, 5.8, 5.2), skin, { depth: 1 });
      blob(ctx, ellipse(12, -3.4, 8.8, 4.8), darker(cloth, 0.1), { depth: 1.2 });
      // The belly.
      blob(ctx, smooth([[-22, -18], [-27, -38], [-21, -58], [-2, -66], [18, -60], [27, -40], [23, -18], [2, -13]], 0.9), skin, { depth: 5 });
      flat(ctx, ellipse(6, -35, 13, 15), lighter(skin, 0.3), 0.5);
      line(ctx, (c) => { c.moveTo(8, -33); c.quadraticCurveTo(10.5, -31, 8, -28.5); }, dark, 1.6);
      // Fur skirt and a belt with a skull buckle.
      blob(ctx, (c) => {
        c.moveTo(-24, -26); c.lineTo(25, -26); c.lineTo(25, -13);
        for (let x = 25, i = 0; x > -25; x -= 6.25, i++) c.lineTo(x - 3.1, i % 2 ? -13 : -8);
        c.lineTo(-24, -13); c.closePath();
      }, cloth, { depth: 2 });
      blob(ctx, roundRect(-25, -30, 50, 6, 3), darker(cloth, 0.4), { depth: 1, ow: 1.8 });
      blob(ctx, ellipse(8, -27, 5.4, 5), BONE, { ow: 1.6, depth: 0.8 });
      flat(ctx, circle(6.2, -27.6, 1.3), INK);
      flat(ctx, circle(9.8, -27.6, 1.3), INK);
      // Tooth necklace.
      line(ctx, (c) => { c.moveTo(-10, -59); c.quadraticCurveTo(6, -51, 22, -59); }, '#5a3620', 1.6);
      for (let i = -3; i <= 3; i++) {
        const x = 6 + i * 4.6;
        const y = -55 - Math.abs(i) * 1.2;
        blob(ctx, poly([[x - 2, y], [x + 2, y], [x, y + 5.4]]), BONE, { ow: 1.2, depth: 0.4, noLight: true });
      }
      // Head with a feather headdress.
      at(ctx, 6, -64, P.lean * 0.5, () => {
        for (const [a, c] of [[-0.75, '#e0413b'], [-0.3, '#f6c03a'], [0.15, '#4aa8f0'], [0.55, '#e0413b']]) {
          at(ctx, -1, -22, a, () => {
            blob(ctx, ellipse(0, -13, 4.4, 12.5), c, { depth: 1.4, ow: 1.8 });
            line(ctx, (g) => { g.moveTo(0, -1); g.lineTo(0, -23); }, darker(c, 0.45), 1.2);
          });
        }
        blob(ctx, poly([[-11, -16], [-31, -25], [-13, -5]]), skin, { depth: 1.4 });
        flat(ctx, poly([[-14, -14], [-25, -20], [-14, -9]]), '#f29a8a', 0.5);
        blob(ctx, smooth([[-14, -2], [-16, -16], [-8, -27], [8, -28], [19, -19], [20, -5], [11, 4], [-7, 4]], 0.9), skin, { depth: 3 });
        blob(ctx, poly([[13, -16], [33, -27], [17, -5]]), skin, { depth: 1.4 });
        flat(ctx, poly([[16, -14], [28, -22], [17.5, -9]]), '#f29a8a', 0.5);
        blob(ctx, roundRect(-14, -28, 30, 7, 3), GOLD, { depth: 1.2, ow: 1.8 });
        blob(ctx, poly([[0, -27], [2.4, -36], [5, -27]]), BONE, { ow: 1.4, depth: 0.5 });
        flat(ctx, circle(9.5, -24.5, 1.9), '#e0413b');
        flat(ctx, circle(-6.5, -24.5, 1.9), '#4aa8f0');
        line(ctx, (c) => { c.moveTo(-10, -9); c.lineTo(-4, -7); c.moveTo(-10, -5); c.lineTo(-5, -3.5); }, '#e0413b', 2);
        eye(ctx, 1, -13, 4.6, { lx: 0.7, blink: P.blink, angry: 1, white: '#fff6c0' });
        eye(ctx, 12, -13, 3.9, { lx: 0.7, blink: P.blink, angry: 1, white: '#fff6c0' });
        blob(ctx, ellipse(18.5, -6, 5.4, 4.2, 0.3), dark, { depth: 1, ow: 1.8 });
        const o = P.mouth;
        blob(ctx, (c) => { c.moveTo(-3, 0); c.quadraticCurveTo(7, 4 + o * 7, 17, -1); c.quadraticCurveTo(7, 2, -3, 0); c.closePath(); }, '#5a1426', { ow: 1.6, shade: false, noLight: true });
        blob(ctx, poly([[0, 2], [2, -5], [4.2, 2.4]]), '#fff6e0', { ow: 1.2, depth: 0.4, noLight: true });
        blob(ctx, poly([[11, 2.2], [13.6, -5], [15.6, 1.2]]), '#fff6e0', { ow: 1.2, depth: 0.4, noLight: true });
      });
      // Front arm swinging the club.
      at(ctx, 17, -52, P.arm, () => {
        blob(ctx, capsule(0, 0, 0, 18, 6, 5.2), skin, { depth: 1.6 });
        blob(ctx, roundRect(-6, 9, 12, 5, 2.4), darker(cloth, 0.2), { depth: 0.8, ow: 1.6 });
        at(ctx, 0, 20, P.club, () => warClub(ctx));
        blob(ctx, circle(0, 20, 6.6), skin, { depth: 1.2 });
      });
    });
  },
};

// ---- Kadim Ağaç: an old walking tree with glowing eyes ----

const CANOPY_BACK = scallop(2, -12, 40, 25, 10, 0.38, seeded(11));
const CANOPY = scallop(-3, -17, 34, 21, 9, 0.42, seeded(29));
const CANOPY_HI = scallop(-14, -27, 11, 6.5, 6, 0.4, seeded(5));
const TUFT = scallop(0, 0, 7, 5, 6, 0.45, seeded(17));

function branchArm(ctx, bark, leaf) {
  blob(ctx, capsule(0, 0, 0, 27, 5.6, 3.4), bark, { depth: 1.4 });
  at(ctx, 0, 27, 0, () => {
    blob(ctx, capsule(0, 0, -5, 9, 2.4, 1.2), bark, { depth: 0.6, ow: 1.8 });
    blob(ctx, capsule(0, 0, 1, 11, 2.4, 1.2), bark, { depth: 0.6, ow: 1.8 });
    blob(ctx, capsule(0, 0, 6, 8, 2.4, 1.2), bark, { depth: 0.6, ow: 1.8 });
  });
  at(ctx, 4, 12, 0.5, () => blob(ctx, TUFT, leaf, { depth: 1.6 }));
}

export const treant = {
  height: 96,
  bossScale: 1.05,
  special: 'leaves',
  rest: { ...REST, arm: -0.45, arm2: 0.45 },
  idle: (t) => ({
    sway: Math.sin(t * 1.6) * 0.05,
    lean: Math.sin(t * 1.6 + 0.5) * 0.03,
    sq: 1 + Math.sin(t * 3.2) * 0.015,
    arm: -0.45 + Math.sin(t * 1.6) * 0.1,
    arm2: 0.45 + Math.sin(t * 1.6 + 1.2) * 0.1,
    wob: t,
    blink: t % 4.4 < 0.14 ? 1 : 0,
  }),
  actions: {
    ...baseActions,
    enter: bossEnter,
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -4, 'out']]),
        lean: track(p, [[0, 0], [0.25, -0.14, 'out']]),
        arm: track(p, [[0, 0], [0.25, -2.3, 'out']]),
        arm2: track(p, [[0, 0], [0.25, -2.6, 'out']]),
        sway: Math.sin(p * 36) * 0.07,
        sq: track(p, [[0, 0], [0.25, 0.05, 'out']]),
        mouth: 1,
      }),
    },
    // Both branches thrown forward, flinging the leaf storm.
    attack: {
      dur: 0.5, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -4], [0.3, 9, 'in'], [0.65, 9], [1, 0]]),
        lean: track(p, [[0, -0.14], [0.3, 0.16, 'in'], [0.65, 0.16], [1, 0]]),
        arm: track(p, [[0, -2.3], [0.3, -1.25, 'in'], [0.65, -1.25], [1, 0]]),
        arm2: track(p, [[0, -2.6], [0.3, -1.7, 'in'], [0.65, -1.7], [1, 0]]),
        sway: track(p, [[0, 0], [0.3, 0.12], [1, 0]]),
        mouth: bump(p, 0.1, 0.5),
      }),
    },
  },
  draw(ctx, P, look) {
    const bark = look.colors.body;
    const leaf = look.colors.accent;
    const dk = darker(bark, 0.38);
    const shine = lighter(leaf, 0.55);
    squash(ctx, P, () => {
      at(ctx, -12, -62, P.arm2, () => branchArm(ctx, darker(bark, 0.2), darker(leaf, 0.22)));
      // Roots for feet.
      for (const [x, a, len] of [[-13, -1.0, 15], [-5, -0.35, 11], [6, 0.3, 12], [14, 1.0, 16]]) {
        blob(ctx, capsule(x, -12, x + Math.sin(a) * len, -1, 5, 2.2), x < 0 ? dk : darker(bark, 0.2), { depth: 1, ow: 2 });
      }
      // Trunk.
      blob(ctx, smooth([[-17, -6], [-15, -34], [-13, -62], [-17, -80], [0, -86], [17, -80], [13, -62], [15, -34], [19, -6], [0, -2]], 0.9), bark, { depth: 5 });
      line(ctx, (c) => {
        c.moveTo(-8, -9); c.quadraticCurveTo(-11, -28, -7, -44);
        c.moveTo(9, -7); c.quadraticCurveTo(12, -22, 8, -34);
        c.moveTo(-1, -13); c.lineTo(1, -24);
        c.moveTo(-11, -70); c.quadraticCurveTo(-8, -76, -10, -82);
      }, dk, 1.8);
      flat(ctx, ellipse(-10, -40, 5, 3), leaf, 0.75);
      flat(ctx, ellipse(12, -17, 4, 2.4), leaf, 0.75);
      flat(ctx, ellipse(-6, -26, 2.6, 1.6), leaf, 0.75);
      // Face carved into the bark: knotted brow, glowing eyes, a splintered mouth.
      blob(ctx, poly([[-9, -71], [19, -67], [17, -63], [6, -64.5], [-7, -66]]), dk, { ow: 1.8, depth: 0.8 });
      const open = Math.max(0.15, 1 - P.blink * 0.85);
      blob(ctx, ellipse(1, -59, 4.6, 5.4 * open), '#1e140e', { ow: 1.6, shade: false, noLight: true });
      blob(ctx, ellipse(12.5, -58, 4, 5 * open), '#1e140e', { ow: 1.6, shade: false, noLight: true });
      glow(ctx, 6, -58, 16, shine, 0.35);
      flat(ctx, circle(2.4, -59, 2.1 * open), shine);
      flat(ctx, circle(13.4, -58, 1.9 * open), shine);
      blob(ctx, ellipse(7, -44, 7.5, 2 + P.mouth * 5), '#1e140e', { ow: 1.8, shade: false, noLight: true });
      flat(ctx, poly([[1, -46], [3, -42], [5, -46]]), '#e8d0a0');
      flat(ctx, poly([[9, -46], [11, -41.5], [13, -46]]), '#e8d0a0');
      // Leafy crown, swaying, with a few glowing fruits.
      at(ctx, 0, -84, P.sway, () => {
        blob(ctx, CANOPY_BACK, darker(leaf, 0.28), { depth: 2 });
        blob(ctx, CANOPY, leaf, { depth: 4.4, light: shine });
        flat(ctx, CANOPY_HI, shine, 0.55);
        for (const [x, y] of [[14, -8], [-20, -10], [4, -30], [24, -22]]) {
          glow(ctx, x, y, 7, '#ffd060', 0.35 + 0.15 * Math.sin(P.wob * 3 + x));
          blob(ctx, circle(x, y, 3.2), '#ffcf4a', { ow: 1.4, depth: 0.8, light: '#ffffff' });
        }
      });
      at(ctx, 12, -62, P.arm, () => branchArm(ctx, bark, leaf));
    });
  },
};

// ---- Kristal Golem: a boulder giant with crystals growing out of it ----

const SHARDS = [[0, 0, -0.45, 22, 6], [9, -3, -0.05, 28, 7], [-9, 5, -0.9, 17, 5], [17, 2, 0.35, 15, 4.4]];

function crystal(ctx, h, w, color) {
  blob(ctx, poly([[-w, 0], [-w * 0.75, -h * 0.72], [0, -h], [w * 0.75, -h * 0.72], [w, 0]]), color, { depth: 2, light: '#ffffff', ow: 2 });
  line(ctx, (c) => { c.moveTo(0, -h + 2); c.lineTo(-w * 0.15, -2); }, '#ffffff', 1.2, 0.6);
}

function stoneFist(ctx, stone, cry, back) {
  blob(ctx, capsule(0, 0, 0, 19, 8.4, 7.4), stone, { depth: 2 });
  blob(ctx, roundRect(-11, 14, 22, 21, 8), stone, { depth: 2.6 });
  line(ctx, (c) => { c.moveTo(-6, 26); c.lineTo(6, 26); c.moveTo(-3, 30); c.lineTo(-3, 34); c.moveTo(3, 30); c.lineTo(3, 34); }, darker(stone, 0.4), 1.4);
  if (!back) for (const x of [-6, 0, 6]) at(ctx, x, 34, Math.PI + x * 0.05, () => crystal(ctx, 7, 2.6, cry));
}

export const golem = {
  height: 88,
  bossScale: 1.1,
  special: 'crystals',
  rest: { ...REST, arm: -0.25, arm2: 0.25 },
  idle: (t) => ({
    y: -Math.abs(Math.sin(t * 1.8)) * 1.2,
    sq: 1 + Math.sin(t * 3.6) * 0.015,
    lean: Math.sin(t * 1.8) * 0.025,
    arm: -0.25 + Math.sin(t * 1.8) * 0.06,
    arm2: 0.25 + Math.sin(t * 1.8 + 1) * 0.06,
    glow: 0.25 + Math.sin(t * 3) * 0.15,
    blink: t % 5 < 0.14 ? 1 : 0,
  }),
  actions: {
    ...baseActions,
    enter: bossEnter,
    // Both fists high, the chest crystal charging up.
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -5, 'out']]),
        y: track(p, [[0, 0], [0.25, -3, 'out']]),
        lean: track(p, [[0, 0], [0.25, -0.18, 'out']]) + Math.sin(p * 44) * 0.015,
        arm: track(p, [[0, 0], [0.25, -2.6, 'out']]),
        arm2: track(p, [[0, 0], [0.25, -2.9, 'out']]),
        glow: track(p, [[0, 0], [1, 1]]),
        mouth: 1,
      }),
    },
    // Fists pounded into the ground.
    attack: {
      dur: 0.55, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -5], [0.26, 8, 'in'], [0.7, 8], [1, 0]]),
        y: track(p, [[0, -3], [0.26, 2, 'in'], [0.7, 2], [1, 0]]),
        lean: track(p, [[0, -0.18], [0.26, 0.32, 'in'], [0.7, 0.32], [1, 0]]),
        sq: track(p, [[0, 0], [0.26, -0.12, 'in'], [0.45, 0.02], [1, 0]]),
        arm: track(p, [[0, -2.6], [0.26, -0.3, 'in'], [0.7, -0.3], [1, 0]]),
        arm2: track(p, [[0, -2.9], [0.26, -0.7, 'in'], [0.7, -0.7], [1, 0]]),
        glow: track(p, [[0, 1], [0.3, 0.6], [1, 0]]),
        mouth: bump(p, 0.1, 0.5),
      }),
    },
  },
  draw(ctx, P, look) {
    const stone = look.colors.body;
    const cry = look.colors.accent;
    const dk = darker(stone, 0.32);
    const g = Math.max(0, P.glow);
    squash(ctx, P, () => {
      // Crystals growing out of the back.
      at(ctx, -12, -64, 0, () => {
        glow(ctx, 2, -14, 26, cry, 0.25 + g * 0.25);
        for (const [x, y, a, h, w] of SHARDS) at(ctx, x, y, a, () => crystal(ctx, h, w, cry));
      });
      at(ctx, -19, -58, 0.3 + P.arm2, () => stoneFist(ctx, darker(stone, 0.2), cry, true));
      // Legs.
      blob(ctx, roundRect(-20, -26, 15, 24, 5), dk, { depth: 1.6 });
      blob(ctx, roundRect(-24, -8, 21, 9, 4), dk, { depth: 1.2 });
      blob(ctx, roundRect(4, -26, 15, 24, 5), darker(stone, 0.12), { depth: 1.6 });
      blob(ctx, roundRect(2, -8, 22, 9, 4), darker(stone, 0.1), { depth: 1.2 });
      // Boulder body.
      blob(ctx, smooth([[-24, -20], [-29, -46], [-20, -68], [4, -74], [24, -64], [29, -40], [20, -20], [-2, -15]], 0.9), stone, { depth: 5.4 });
      flat(ctx, ellipse(-11, -52, 8, 6, -0.3), lighter(stone, 0.18), 0.7);
      flat(ctx, ellipse(16, -30, 6, 4.4, 0.3), lighter(stone, 0.12), 0.6);
      line(ctx, (c) => {
        c.moveTo(-20, -34); c.lineTo(-14, -30); c.lineTo(-15, -24);
        c.moveTo(18, -56); c.lineTo(13, -52); c.lineTo(15, -46);
        c.moveTo(-4, -24); c.lineTo(0, -20);
      }, dk, 1.8);
      // Chest crystal that charges before the pound.
      glow(ctx, 5, -44, 16 + g * 18, cry, 0.3 + g * 0.45);
      blob(ctx, poly([[5, -56], [12.5, -45], [5, -33], [-2.5, -45]]), g > 0.6 ? lighter(cry, 0.4) : cry, { depth: 1.6, light: '#ffffff', ow: 2 });
      // Small head sunk between the shoulders.
      at(ctx, 12, -70, P.lean * 0.4, () => {
        blob(ctx, smooth([[-10, 0], [-12, -12], [-4, -20], [8, -19], [14, -10], [13, 0], [2, 3]], 0.9), lighter(stone, 0.06), { depth: 2.4 });
        at(ctx, -2, -18, -0.3, () => crystal(ctx, 9, 3, cry));
        blob(ctx, roundRect(-9, -15, 22, 5, 2.4), dk, { depth: 0.8, ow: 1.8 });
        const open = Math.max(0.15, 1 - P.blink * 0.85);
        glow(ctx, 5, -8, 12, cry, 0.4 + g * 0.3);
        blob(ctx, ellipse(0.5, -8, 3.6, 1.9 * open), cry, { ow: 1.4, depth: 0.4, light: '#ffffff' });
        blob(ctx, ellipse(9.5, -8, 3, 1.7 * open), cry, { ow: 1.4, depth: 0.4, light: '#ffffff' });
        line(ctx, (c) => { c.moveTo(0, -1.5 + P.mouth * 1.5); c.lineTo(4, -2.5); c.lineTo(8, -1 + P.mouth * 1.5); c.lineTo(11, -2); }, INK, 1.8);
      });
      at(ctx, 20, -58, P.arm, () => stoneFist(ctx, stone, cry, false));
    });
  },
};

// Reports where a boss's special attack starts (device pixels), like the pets' muzzles.
function mark(out, ctx, x, y) {
  if (!out) return;
  const m = ctx.getTransform();
  out.muzzle = { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

// ---- Akrep Kral: a crowned giant scorpion with a venom sting ----

function pincer(ctx, shell, open, back) {
  blob(ctx, capsule(0, 0, 14, -4, 4.4, 4), shell, { depth: 1.2 });
  at(ctx, 14, -4, -0.3, () => {
    blob(ctx, capsule(0, 0, 10, 0, 4, 3.6), shell, { depth: 1 });
    at(ctx, 12, 0, 0, () => {
      blob(ctx, (c) => { c.moveTo(-3, 4); c.quadraticCurveTo(6, 10, 18, 2 + open * 4); c.quadraticCurveTo(8, 2, -3, -2); c.closePath(); }, shell, { depth: 1.2 });
      blob(ctx, (c) => { c.moveTo(-3, -4); c.quadraticCurveTo(8, -12 - open * 4, 18, -4 - open * 6); c.quadraticCurveTo(8, -3, -3, 2); c.closePath(); }, back ? shell : lighter(shell, 0.1), { depth: 1.6 });
    });
  });
}

export const scorpionKing = {
  height: 70,
  bossScale: 1.2,
  standOff: 22,
  special: 'sting',
  rest: { ...REST },
  idle: (t) => ({
    y: -Math.abs(Math.sin(t * 3)) * 1,
    sq: 1 + Math.sin(t * 6) * 0.015,
    lean: Math.sin(t * 1.2) * 0.03,
    arm: Math.sin(t * 2.2) * 0.15,
    club: Math.sin(t * 1.6) * 0.12,
    wob: t,
    glow: 0.5 + Math.sin(t * 4) * 0.3,
    blink: t % 3.4 < 0.12 ? 1 : 0,
  }),
  actions: {
    ...baseActions,
    enter: bossEnter,
    // Tail drawn back, claws wide.
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -6, 'out']]),
        lean: track(p, [[0, 0], [0.25, -0.1, 'out']]),
        club: track(p, [[0, 0], [0.25, -0.7, 'out']]) + Math.sin(p * 34) * 0.05,
        arm: track(p, [[0, 0], [0.25, 1, 'out']]),
        mouth: 1,
      }),
    },
    // The sting stabs forward over the head.
    attack: {
      dur: 0.45, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -6], [0.25, 8, 'in'], [0.6, 8], [1, 0]]),
        lean: track(p, [[0, -0.1], [0.25, 0.12, 'in'], [0.6, 0.12], [1, 0]]),
        club: track(p, [[0, -0.7], [0.25, 1.1, 'in'], [0.6, 1.1], [1, 0]]),
        arm: track(p, [[0, 1], [0.3, 0.2], [1, 0]]),
        mouth: bump(p, 0.1, 0.5),
      }),
    },
  },
  draw(ctx, P, look, out) {
    const shell = look.colors.body;
    const gold = look.colors.accent;
    const dark = darker(shell, 0.3);
    const venom = '#8ae04a';
    squash(ctx, P, () => {
      // Far legs and claw.
      for (let i = 0; i < 3; i++) {
        const x = -16 + i * 13;
        const k = Math.sin(P.wob * 8 + i * 1.7) * 2;
        blob(ctx, capsule(x, -16, x - 10 + k, -28, 2.6, 2.4), dark, { depth: 0.6, ow: 1.8 });
        blob(ctx, capsule(x - 10 + k, -28, x - 16 + k, -1, 2.4, 1.4), dark, { depth: 0.6, ow: 1.8 });
      }
      at(ctx, 20, -24, -0.35 - P.arm * 0.3, () => pincer(ctx, dark, P.arm, true), 1.15);
      // The tail arching over the back, ending in the sting.
      const tail = curlPts(-30, -20, -0.25 + P.club * 0.4, 84, 2.5 + P.club * 0.8, 0, 7);
      for (let i = tail.length - 1; i >= 0; i--) {
        const [x, y] = tail[i];
        const r = 9.4 - i * 0.6;
        blob(ctx, ellipse(x, y, r, r * 0.85), i % 2 ? shell : lighter(shell, 0.08), { depth: 1.6, ow: 2 });
      }
      const [sx, sy] = tail[tail.length - 1];
      const [px, py] = tail[tail.length - 2];
      at(ctx, sx, sy, Math.atan2(sy - py, sx - px) + Math.PI / 2, () => {
        blob(ctx, (c) => { c.moveTo(-6, 0); c.quadraticCurveTo(-8, 10, 0, 18); c.quadraticCurveTo(8, 10, 6, 0); c.closePath(); }, gold, { depth: 1.4 });
        glow(ctx, 0, 16, 10, venom, 0.3 + P.glow * 0.4);
        flat(ctx, circle(0, 19 + (P.wob * 30) % 5, 1.6), venom, 0.9);
        mark(out, ctx, 0, 18);
      });
      // Body segments, then the head with its crown.
      for (let i = 0; i < 4; i++) blob(ctx, ellipse(-24 + i * 9, -18, 9, 9 - i * 0.4), i % 2 ? shell : lighter(shell, 0.06), { depth: 2.4 });
      blob(ctx, smooth([[2, -8], [0, -24], [12, -30], [28, -28], [36, -18], [32, -8], [16, -6]], 0.9), shell, { depth: 3 });
      line(ctx, (c) => { c.moveTo(6, -26); c.quadraticCurveTo(18, -22, 30, -24); }, dark, 1.6);
      for (const [x, y, r] of [[26, -22, 2.6], [31, -21, 2.2], [22, -25, 1.6]]) {
        flat(ctx, circle(x, y, r * (1 - P.blink * 0.7)), '#1a0a0a');
        flat(ctx, circle(x - 0.6, y - 0.6, r * 0.35), '#ff6a3a');
      }
      blob(ctx, poly([[32, -12], [40, -8 + P.mouth * 3], [33, -8]]), dark, { ow: 1.4, depth: 0.5 });
      at(ctx, 16, -30, 0.15, () => {
        blob(ctx, poly([[-9, 0], [-10, -10], [-4, -5], [0, -13], [4, -5], [10, -10], [9, 0]]), GOLD, { depth: 1.6, ow: 1.8 });
        flat(ctx, circle(0, -6, 1.8), '#e0413b');
      });
      // Near legs and the big claw in front.
      for (let i = 0; i < 3; i++) {
        const x = -12 + i * 13;
        const k = Math.sin(P.wob * 8 + i * 1.7 + 1) * 2;
        blob(ctx, capsule(x, -12, x + 6 + k, -24, 2.8, 2.6), shell, { depth: 0.8, ow: 1.8 });
        blob(ctx, capsule(x + 6 + k, -24, x + 12 + k, -1, 2.6, 1.4), shell, { depth: 0.8, ow: 1.8 });
      }
      at(ctx, 26, -16, -0.1 - P.arm * 0.4, () => pincer(ctx, shell, P.arm, false), 1.3);
    });
  },
};

// ---- Yeti: a horned snow giant that hurls blocks of ice ----

const FUR_BODY = scallop(2, -52, 31, 34, 16, 0.26, seeded(41));
const FUR_HEAD = scallop(0, -2, 17, 16, 11, 0.3, seeded(43));

function iceBlock(ctx, r) {
  glow(ctx, 0, 0, r * 1.4, '#bff0ff', 0.35);
  blob(ctx, poly([[-r, -r * 0.5], [-r * 0.4, -r], [r * 0.7, -r * 0.8], [r, r * 0.1], [r * 0.5, r * 0.9], [-r * 0.8, r * 0.7]]), '#a8e4ff', { depth: 3, light: '#ffffff', ow: 2 });
  line(ctx, (c) => { c.moveTo(-r * 0.5, -r * 0.6); c.lineTo(r * 0.2, -r * 0.1); c.lineTo(r * 0.1, r * 0.5); }, '#ffffff', 1.4, 0.8);
}

export const yeti = {
  height: 94,
  bossScale: 1.1,
  standOff: 14,
  special: 'iceblock',
  rest: { ...REST, arm: 0.2, arm2: 0.35 },
  idle: (t) => ({
    y: -Math.abs(Math.sin(t * 2)) * 1.6,
    sq: 1 + Math.sin(t * 4) * 0.02,
    lean: Math.sin(t * 1) * 0.04,
    arm: 0.2 + Math.sin(t * 2) * 0.1,
    arm2: 0.35 + Math.sin(t * 2 + 1) * 0.1,
    wob: t,
    blink: t % 4 < 0.14 ? 1 : 0,
  }),
  actions: {
    ...baseActions,
    enter: bossEnter,
    // A block of ice lifted over the head.
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -6, 'out']]),
        lean: track(p, [[0, 0], [0.25, -0.18, 'out']]),
        arm: track(p, [[0, 0], [0.25, -3, 'out']]),
        arm2: track(p, [[0, 0], [0.25, -3.1, 'out']]),
        glow: track(p, [[0, 0], [0.12, 1]]),
        mouth: 1,
      }),
    },
    // Thrown; the block leaves the hands at p 0.28.
    attack: {
      dur: 0.55, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -6], [0.28, 10, 'in'], [0.65, 10], [1, 0]]),
        lean: track(p, [[0, -0.18], [0.28, 0.24, 'in'], [0.65, 0.24], [1, 0]]),
        arm: track(p, [[0, -3], [0.28, -1.2, 'in'], [0.65, -1.2], [1, 0]]),
        arm2: track(p, [[0, -3.1], [0.28, -1.4, 'in'], [0.65, -1.4], [1, 0]]),
        glow: p < 0.27 ? 1 : 0,
        mouth: bump(p, 0.1, 0.5),
      }),
    },
  },
  draw(ctx, P, look, out) {
    const fur = look.colors.body;
    const skin = look.colors.accent;
    const shade = darker(fur, 0.15);
    const furArm = (back) => {
      blob(ctx, capsule(0, 0, 0, 24, 10, 9), back ? shade : fur, { depth: 2, ink: darker(fur, 0.6) });
      blob(ctx, circle(0, 28, 9), skin, { depth: 1.6 });
      line(ctx, (c) => { c.moveTo(-4, 32); c.lineTo(-4, 36); c.moveTo(1, 33); c.lineTo(1, 37); c.moveTo(6, 32); c.lineTo(6, 35); }, darker(skin, 0.4), 1.4);
    };
    squash(ctx, P, () => {
      at(ctx, -18, -70, 0.25 + P.arm2, () => furArm(true));
      // Legs and big feet.
      for (const [x, c] of [[-12, shade], [12, fur]]) {
        blob(ctx, capsule(x, -34, x, -10, 10, 9), c, { depth: 1.6 });
        blob(ctx, ellipse(x + 4, -5, 13, 6), skin, { depth: 1.2 });
      }
      // Shaggy round body.
      blob(ctx, FUR_BODY, fur, { depth: 5, light: '#ffffff', ink: darker(fur, 0.6) });
      flat(ctx, ellipse(6, -44, 15, 19), '#ffffff', 0.55);
      line(ctx, (c) => { for (const [x, y] of [[-16, -62], [-20, -44], [14, -70], [18, -34], [-6, -28]]) { c.moveTo(x, y); c.quadraticCurveTo(x + 3, y + 4, x + 1, y + 8); } }, darker(fur, 0.25), 1.4, 0.8);
      // Head: blue face, curled horns, angry brows and fangs.
      at(ctx, 6, -82, P.lean * 0.4, () => {
        for (const s of [-1, 1]) {
          blob(ctx, (c) => { c.moveTo(s * 8, -12); c.quadraticCurveTo(s * 22, -20, s * 20, -32); c.quadraticCurveTo(s * 14, -22, s * 4, -16); c.closePath(); }, '#d8c8a8', { depth: 1.2 });
        }
        blob(ctx, FUR_HEAD, fur, { depth: 3, light: '#ffffff', ink: darker(fur, 0.6) });
        blob(ctx, ellipse(5, 2, 11, 10), skin, { depth: 2 });
        eye(ctx, 1, -1, 3.4, { lx: 0.7, blink: P.blink, angry: 1, white: '#e8f8ff' });
        eye(ctx, 10, -1, 3, { lx: 0.7, blink: P.blink, angry: 1, white: '#e8f8ff' });
        blob(ctx, (c) => { c.moveTo(-1, 6); c.quadraticCurveTo(6, 10 + P.mouth * 5, 13, 6); c.quadraticCurveTo(6, 8, -1, 6); c.closePath(); }, '#2a1a3a', { ow: 1.4, shade: false, noLight: true });
        blob(ctx, poly([[1, 6.4], [2.4, 10], [3.6, 6.8]]), '#ffffff', { ow: 1, depth: 0.3, noLight: true });
        blob(ctx, poly([[9, 6.6], [10.4, 10], [11.6, 6.4]]), '#ffffff', { ow: 1, depth: 0.3, noLight: true });
      });
      // Front arm; the ice block rides above the head while lifted.
      at(ctx, 20, -70, P.arm, () => {
        furArm(false);
        if (P.glow > 0.5) {
          at(ctx, -4, 44, -P.arm, () => { iceBlock(ctx, 18); mark(out, ctx, 0, 0); });
        } else {
          mark(out, ctx, 0, 30);
        }
      });
    });
  },
};

// ---- Lav Yılanı: a basalt serpent rising out of a lava pool ----

export const lavaSerpent = {
  height: 100,
  bossScale: 1.05,
  special: 'eruption',
  rest: { ...REST },
  idle: (t) => ({
    lean: Math.sin(t * 1.4) * 0.05,
    arm: Math.sin(t * 1.4) * 0.15,
    wob: t,
    glow: 0.4 + Math.sin(t * 3) * 0.2,
    blink: t % 4.2 < 0.13 ? 1 : 0,
  }),
  actions: {
    ...baseActions,
    enter: bossEnter,
    // Rears back, hood flared, the lava under it boiling.
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -6, 'out']]),
        arm: track(p, [[0, 0], [0.25, -0.6, 'out']]) + Math.sin(p * 30) * 0.05,
        glow: track(p, [[0, 0], [1, 1]]),
        mouth: track(p, [[0, 0], [0.3, 0.8]]),
      }),
    },
    // Strikes down: the lava answers from the ground.
    attack: {
      dur: 0.5, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -6], [0.25, 10, 'in'], [0.6, 10], [1, 0]]),
        arm: track(p, [[0, -0.6], [0.25, 0.7, 'in'], [0.6, 0.7], [1, 0]]),
        glow: track(p, [[0, 1], [0.4, 0.5], [1, 0]]),
        mouth: track(p, [[0, 0.8], [0.25, 1.2], [0.6, 1], [1, 0]]),
      }),
    },
  },
  draw(ctx, P, look, out) {
    const rock = look.colors.body;
    const lava = look.colors.accent;
    const g = Math.max(0, Math.min(1, P.glow));
    squash(ctx, P, () => {
      // The lava pool it rises from.
      glow(ctx, 0, -4, 46, lava, 0.35 + g * 0.3);
      blob(ctx, ellipse(0, -2, 36, 7), lava, { depth: 1.4, light: '#ffe07a', ow: 2 });
      for (let i = 0; i < 3; i++) {
        const k = (P.wob * 0.9 + i * 0.33) % 1;
        flat(ctx, circle(-20 + i * 18, -4 - k * 8, 2.4 * (1 - k)), '#ffe07a', 1 - k);
      }
      // The body: a thick coil, cracks glowing with lava.
      const body = curlPts(-6, -2, 0.25, 92, -0.35 + P.arm * 1.3, P.wob * 1.5, 10);
      tube(ctx, body, 15, 9, rock, { depth: 3 });
      line(ctx, (c) => { c.moveTo(body[0][0], body[0][1]); for (let i = 1; i < body.length; i++) c.lineTo(body[i][0], body[i][1]); }, lava, 2.6, 0.5 + g * 0.5);
      for (let i = 1; i < body.length - 1; i += 2) {
        const [x, y] = body[i];
        flat(ctx, circle(x - 3, y - 2, 2.4), lighter(lava, 0.3), 0.6 + g * 0.4);
      }
      // Head with a flaming hood.
      const [hx, hy] = body[body.length - 1];
      const [px, py] = body[body.length - 2];
      at(ctx, hx, hy, Math.atan2(hy - py, hx - px) * 0.4, () => {
        for (let i = 0; i < 5; i++) {
          const a = -1.2 + i * 0.4;
          const len = 18 + Math.sin(P.wob * 6 + i) * 3;
          blob(ctx, (c) => { c.moveTo(-6, 0); c.quadraticCurveTo(-6 + Math.sin(a) * len * 0.6, -Math.cos(a) * len * 0.8, -8 + Math.sin(a) * len, -Math.cos(a) * len); c.quadraticCurveTo(-2, -4, -6, 0); c.closePath(); }, i % 2 ? lava : '#ffd060', { ow: 1.4, depth: 0.8 });
        }
        blob(ctx, smooth([[-10, 6], [-12, -6], [-2, -12], [14, -9], [24, -3], [22, 5], [8, 9]], 0.85), rock, { depth: 2.6 });
        line(ctx, (c) => { c.moveTo(-6, -8); c.lineTo(2, -4); c.lineTo(0, 2); }, lava, 1.6, 0.8);
        blob(ctx, (c) => { c.moveTo(4, 5); c.quadraticCurveTo(14, 9 + P.mouth * 7, 24, 4); c.quadraticCurveTo(14, 6, 4, 5); c.closePath(); }, '#3a0a0a', { ow: 1.6, shade: false, noLight: true });
        if (P.mouth > 0.3) glow(ctx, 16, 7, 12, lava, 0.6);
        blob(ctx, poly([[16, 4], [17.5, 10 + P.mouth * 3], [19, 4.4]]), '#fff6e0', { ow: 1, depth: 0.3, noLight: true });
        const open = Math.max(0.15, 1 - P.blink * 0.85);
        glow(ctx, 9, -4, 9, '#ffd060', 0.5);
        blob(ctx, ellipse(9, -4, 3.6, 2.4 * open), '#ffe07a', { ow: 1.4, depth: 0.4, light: '#ffffff' });
        if (open > 0.3) flat(ctx, roundRect(8.4, -6, 1.4, 4 * open, 0.7), INK);
        line(ctx, (c) => { c.moveTo(4, -8); c.lineTo(15, -6); }, INK, 2.2);
        mark(out, ctx, 20, 6);
      }, 1.3);
    });
  },
};

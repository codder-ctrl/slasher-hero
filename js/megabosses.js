import {
  INK, at, blob, line, flat, glow, ellipse, circle, roundRect, smooth, poly, capsule, star, eye, darker, lighter, mix,
} from './paint.js';
import { track, bump } from './anim.js';
import { baseActions, squash } from './monsters.js';
import { bossEnter } from './bosses.js';

// Mega bosses of the Harita arena (config MEGA_BOSSES). Bigger and more detailed than anything
// in the main battle; same conventions as monsters.js (facing +x, mirrored by the renderer,
// `body`/`accent` colors from config). `look.phase` (1–3) is the fight's phase: the eyes burn
// hotter and the body darkens with rage. `special` names the attack effect in render.js, and
// `standOff` moves the boss further from the hero.

const GOLD = '#f4b836';
const STEEL = '#c8d2dc';
const REST = {
  x: 0, y: 0, lean: 0, sq: 1, blink: 0, wob: 0, mouth: 0, alpha: 1,
  arm: 0, arm2: 0, axe: 0, head: 0, legF: 0, legB: 0, rear: 0, glow: 0, walk: 0,
};

const rageOf = (look) => Math.max(0, (look.phase || 1) - 1) / 2;   // 0, 0.5, 1
const hotEye = (look) => mix('#ffe07a', '#ff2a2a', rageOf(look));

// ---- Minotor: a towering bull-man with a double-headed axe ----

function labrys(ctx, rage) {
  blob(ctx, roundRect(-3.2, -78, 6.4, 96, 3), '#5a3a26', { depth: 1.2, ow: 2 });
  for (const y of [-6, 4]) blob(ctx, roundRect(-4.4, y, 8.8, 4, 1.6), '#8a5a32', { ow: 1.4, depth: 0.5 });
  blob(ctx, circle(0, 19, 3.6), GOLD, { ow: 1.6, depth: 0.6 });
  for (const s of [-1, 1]) {
    blob(ctx, (c) => {
      c.moveTo(s * 3, -80); c.quadraticCurveTo(s * 26, -92, s * 34, -68);
      c.quadraticCurveTo(s * 27, -46, s * 3, -54); c.closePath();
    }, STEEL, { depth: 2.6, light: '#ffffff' });
    line(ctx, (c) => { c.moveTo(s * 32, -84); c.quadraticCurveTo(s * 38, -68, s * 31, -50); }, '#ffffff', 1.6, 0.8);
    flat(ctx, circle(s * 18, -67, 2.6), rage > 0 ? '#ff5a3a' : '#7a8a9a', 0.9);
  }
  if (rage > 0) glow(ctx, 0, -67, 34, '#ff4a2a', 0.25 * rage);
  blob(ctx, roundRect(-6, -74, 12, 14, 3), GOLD, { ow: 1.8, depth: 1 });
}

function hoofLeg(ctx, fur, hoof) {
  blob(ctx, capsule(0, 0, 0, 27, 11, 8.5), fur, { depth: 2 });
  at(ctx, 0, 27, 0, () => {
    blob(ctx, capsule(0, 0, 2, 21, 8, 6.4), fur, { depth: 1.6 });
    blob(ctx, roundRect(-6.4, 19, 16, 9, 3), hoof, { depth: 1, ow: 2 });
    line(ctx, (c) => { c.moveTo(2, 20); c.lineTo(2, 27); }, INK, 1.2);
  });
}

export const minotaur = {
  height: 132,
  bossScale: 0.9,
  standOff: 24,
  special: 'charge',
  rest: { ...REST, arm: 0.1, axe: 3.3, arm2: 0.25 },
  idle: (t, look) => {
    const k = 1 + rageOf(look) * 0.6;
    return {
      y: -Math.abs(Math.sin(t * 1.8 * k)) * 1.6,
      sq: 1 + Math.sin(t * 3.6 * k) * 0.015,
      lean: Math.sin(t * 0.9) * 0.025,
      arm: 0.1 + Math.sin(t * 1.8) * 0.04,
      axe: 3.3 - Math.sin(t * 1.8) * 0.04,
      arm2: 0.25 + Math.sin(t * 1.8 + 1) * 0.08,
      head: Math.sin(t * 1.8 + 0.6) * 0.05,
      wob: t,
      blink: t % 4.1 < 0.13 ? 1 : 0,
    };
  },
  actions: {
    ...baseActions,
    enter: bossEnter,
    // Rears back with the axe high, scraping a hoof.
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -8, 'out']]),
        lean: track(p, [[0, 0], [0.25, -0.16, 'out']]),
        arm: track(p, [[0, 0], [0.25, -2.8, 'out']]),
        axe: track(p, [[0, 0], [0.25, -0.2, 'out']]),
        arm2: track(p, [[0, 0], [0.25, -0.5, 'out']]),
        head: track(p, [[0, 0], [0.25, 0.25, 'out']]),
        legF: Math.sin(p * 30) * 0.35,
        mouth: 1,
      }),
    },
    // Charges in and brings the axe down.
    attack: {
      dur: 0.6, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -8], [0.3, 46, 'in'], [0.65, 46], [1, 0]]),
        y: -Math.sin(Math.min(1, p / 0.3) * Math.PI) * 10,
        lean: track(p, [[0, -0.16], [0.3, 0.3, 'in'], [0.65, 0.3], [1, 0]]),
        arm: track(p, [[0, -2.8], [0.3, -1.2, 'in'], [0.65, -1.2], [1, 0]]),
        axe: track(p, [[0, -0.2], [0.3, 1, 'in'], [0.65, 1], [1, 0]]),
        head: track(p, [[0, 0.25], [0.3, 0.35], [1, 0]]),
        legF: track(p, [[0, 0], [0.15, -0.6], [0.3, 0.2], [1, 0]]),
        legB: track(p, [[0, 0], [0.15, 0.5], [0.3, -0.1], [1, 0]]),
        mouth: bump(p, 0.1, 0.5),
      }),
    },
  },
  draw(ctx, P, look) {
    const rage = rageOf(look);
    const body = mix(look.colors.body, '#5a1a1a', rage * 0.35);
    const fur = darker(body, 0.22);
    const pale = look.colors.accent;
    const hoof = '#3a2a2e';
    squash(ctx, P, () => {
      // Tail with a tuft.
      line(ctx, (c) => { c.moveTo(-18, -62); c.quadraticCurveTo(-42, -60 + Math.sin(P.wob * 3) * 4, -38, -30); }, INK, 7);
      line(ctx, (c) => { c.moveTo(-18, -62); c.quadraticCurveTo(-42, -60 + Math.sin(P.wob * 3) * 4, -38, -30); }, fur, 3.6);
      blob(ctx, ellipse(-38, -27, 5, 8, 0.2), darker(fur, 0.3), { depth: 1 });
      // Back arm and leg.
      at(ctx, -24, -100, 0.3 + P.arm2, () => {
        blob(ctx, capsule(0, 0, 0, 24, 9, 8), darker(body, 0.25), { depth: 1.6 });
        at(ctx, 0, 24, -0.5, () => {
          blob(ctx, capsule(0, 0, 0, 20, 8, 7), darker(body, 0.25), { depth: 1.4 });
          blob(ctx, circle(0, 23, 8.4), darker(body, 0.3), { depth: 1.4 });
        });
      });
      at(ctx, -12, -56, 0.08 + P.legB, () => hoofLeg(ctx, darker(fur, 0.15), hoof));
      at(ctx, 12, -56, -0.06 + P.legF, () => hoofLeg(ctx, fur, hoof));
      // Kilt and a gold belt with a bull-skull buckle.
      blob(ctx, poly([[-24, -64], [26, -64], [30, -40], [16, -44], [6, -36], [-6, -44], [-18, -38], [-26, -44]]), '#a8302a', { depth: 2 });
      line(ctx, (c) => { c.moveTo(-8, -62); c.lineTo(-6, -44); c.moveTo(12, -62); c.lineTo(16, -44); }, '#6a1a1a', 1.4);
      // Torso.
      blob(ctx, smooth([[-22, -60], [-30, -80], [-29, -102], [-12, -114], [16, -113], [31, -100], [30, -78], [19, -60], [0, -56]], 0.9), body, { depth: 6 });
      flat(ctx, smooth([[-6, -64], [-12, -84], [-4, -104], [14, -104], [22, -86], [16, -66]], 0.9), lighter(body, 0.22), 0.55);
      line(ctx, (c) => {
        c.moveTo(4, -100); c.quadraticCurveTo(5, -90, 3, -82);
        c.moveTo(-6, -84); c.quadraticCurveTo(4, -86, 14, -84);
        c.moveTo(-4, -74); c.quadraticCurveTo(4, -76, 12, -74);
      }, darker(body, 0.4), 1.6, 0.7);
      blob(ctx, roundRect(-26, -68, 54, 8, 3), GOLD, { depth: 1.2, ow: 2 });
      at(ctx, 4, -64, 0, () => {
        blob(ctx, ellipse(0, 0, 7, 6), pale, { ow: 1.6, depth: 1 });
        line(ctx, (c) => { c.moveTo(-6, -3); c.quadraticCurveTo(-12, -9, -9, -13); c.moveTo(6, -3); c.quadraticCurveTo(12, -9, 9, -13); }, pale, 2.4);
        flat(ctx, circle(-2.4, -1, 1.4), INK);
        flat(ctx, circle(2.4, -1, 1.4), INK);
      });
      // Head: bull skull, huge horns, a gold nose ring and steaming nostrils.
      at(ctx, 14, -112, P.head + P.lean * 0.3, () => {
        const hornTip = rage > 0.9 ? '#ff6a3a' : GOLD;
        blob(ctx, (c) => { c.moveTo(-8, -22); c.quadraticCurveTo(-30, -28, -28, -48); c.quadraticCurveTo(-20, -36, -2, -30); c.closePath(); }, darker(pale, 0.2), { depth: 2 });
        blob(ctx, ellipse(-12, -14, 9, 4.2, -0.45), fur, { depth: 1 });
        blob(ctx, smooth([[-14, -6], [-16, -22], [-6, -32], [10, -33], [21, -25], [31, -17], [35, -6], [31, 3], [18, 5], [3, 7], [-10, 4]], 0.9), darker(body, 0.08), { depth: 4 });
        flat(ctx, smooth([[-6, -28], [6, -31], [14, -26], [4, -22]], 0.8), fur, 0.8);
        blob(ctx, ellipse(27, -6, 10, 8.4, 0.15), lighter(body, 0.25), { depth: 2, ow: 2 });
        flat(ctx, ellipse(30, -9, 2.2, 1.6, 0.4), INK);
        flat(ctx, ellipse(24, -10, 2, 1.5, 0.4), INK);
        line(ctx, (c) => { c.arc(28, 0, 4.4, 0.2, Math.PI - 0.2); }, INK, 3.4);
        line(ctx, (c) => { c.arc(28, 0, 4.4, 0.2, Math.PI - 0.2); }, GOLD, 1.8);
        // Jaw opens with the roar.
        blob(ctx, (c) => { c.moveTo(8, 4); c.quadraticCurveTo(20, 9 + P.mouth * 7, 30, 4); c.quadraticCurveTo(20, 6, 8, 4); c.closePath(); }, '#4a1420', { ow: 1.6, shade: false, noLight: true });
        const eyeCol = hotEye(look);
        if (rage > 0) glow(ctx, 12, -18, 16, '#ff3a2a', 0.3 + rage * 0.3);
        eye(ctx, 9, -18, 4.4, { lx: 0.7, blink: P.blink, angry: 1, white: eyeCol, pupil: rage > 0 ? '#5a0a0a' : INK });
        eye(ctx, 18.5, -17, 3.6, { lx: 0.7, blink: P.blink, angry: 1, white: eyeCol, pupil: rage > 0 ? '#5a0a0a' : INK });
        // Front horn over everything else on the head.
        blob(ctx, (c) => { c.moveTo(6, -30); c.quadraticCurveTo(28, -36, 32, -54); c.quadraticCurveTo(22, -40, 14, -26); c.closePath(); }, pale, { depth: 2.4 });
        line(ctx, (c) => { c.moveTo(14, -33); c.lineTo(19, -31); c.moveTo(22, -38); c.lineTo(27, -37); }, darker(pale, 0.35), 1.4);
        blob(ctx, poly([[28.5, -45], [32, -54], [31.5, -42]]), hornTip, { ow: 1.4, depth: 0.5 });
        // Steam from the nostrils, more of it when angry.
        const puff = (P.wob * (1 + rage)) % 1;
        if (rage > 0 || puff < 0.35) {
          flat(ctx, circle(36 + puff * 12, -10 + puff * 4, 2 + puff * 5), '#ffffff', 0.55 * (1 - puff));
          flat(ctx, circle(32 + puff * 10, -12 + puff * 6, 1.6 + puff * 4), '#ffffff', 0.45 * (1 - puff));
        }
      });
      // Iron pauldron on the front shoulder.
      at(ctx, 24, -104, 0.2, () => {
        blob(ctx, smooth([[-14, 6], [-12, -8], [0, -14], [14, -8], [16, 6], [0, 10]], 0.9), '#6a7280', { depth: 2.4, light: '#c8d0dc' });
        for (const [x, y] of [[-6, -10], [4, -13], [13, -6]]) blob(ctx, poly([[x - 2.4, y + 2], [x, y - 7], [x + 2.4, y + 2]]), STEEL, { ow: 1.4, depth: 0.5 });
        for (const x of [-7, 0, 7]) flat(ctx, circle(x, 2, 1.3), '#3a4250');
      });
      // Front arm with the labrys.
      at(ctx, 24, -100, P.arm, () => {
        blob(ctx, capsule(0, 0, 0, 24, 10, 9), body, { depth: 2 });
        at(ctx, 0, 24, -1.1, () => {
          blob(ctx, capsule(0, 0, 0, 20, 9, 8), body, { depth: 1.8 });
          blob(ctx, roundRect(-9, 6, 18, 9, 3), '#6a4a2a', { depth: 1, ow: 1.8 });
          at(ctx, 0, 22, P.axe, () => labrys(ctx, rage));
          blob(ctx, circle(0, 22, 9), body, { depth: 1.6 });
        });
      });
    });
  },
};

// ---- Örümcek Kraliçe: a giant crowned spider with a glowing abdomen ----

// Near and far legs, each { base x, knee offset, foot x }; the far ones are drawn behind.
const LEGS = [
  { bx: 22, kx: 26, fx: 66 },
  { bx: 14, kx: 14, fx: 38 },
  { bx: 4, kx: -10, fx: -24 },
  { bx: -4, kx: -26, fx: -56 },
];

function spiderLeg(ctx, leg, i, P, color, far) {
  const phase = P.walk + i * 1.6 + (far ? 0.8 : 0);
  const lift = Math.max(0, Math.sin(phase)) * 5;
  const raise = i === 0 ? P.rear : i === 1 ? P.rear * 0.6 : 0;
  const bx = leg.bx + (far ? -4 : 0);
  const by = far ? -50 : -46;
  const kx = bx + leg.kx;
  const ky = (far ? -86 : -82) - raise * 30;
  const fx = leg.fx + (far ? -6 : 0) + raise * 18;
  const fy = -lift - raise * 46;
  blob(ctx, capsule(bx, by, kx, ky, 5, 4), color, { depth: 1.4, ow: 2 });
  blob(ctx, capsule(kx, ky, fx, fy, 4, 1.6), color, { depth: 1.2, ow: 2 });
  blob(ctx, circle(kx, ky, 4.6), darker(color, 0.15), { depth: 1, ow: 1.8 });
  line(ctx, (c) => {
    for (let k = 0.3; k < 0.9; k += 0.2) {
      const x = kx + (fx - kx) * k;
      const y = ky + (fy - ky) * k;
      c.moveTo(x, y); c.lineTo(x + 3, y - 2);
    }
  }, INK, 1, 0.6);
}

export const spiderQueen = {
  height: 104,
  bossScale: 1.15,
  standOff: 16,
  special: 'venom',
  rest: { ...REST },
  idle: (t, look) => {
    const k = 1 + rageOf(look) * 0.8;
    return {
      y: -Math.abs(Math.sin(t * 2.2 * k)) * 1.2,
      sq: 1 + Math.sin(t * 4.4 * k) * 0.015,
      lean: Math.sin(t * 1.1) * 0.03,
      walk: t * 2.4 * k,
      glow: 0.3 + Math.sin(t * 2.6) * 0.2,
      wob: t,
      blink: t % 3.7 < 0.12 ? 1 : 0,
    };
  },
  actions: {
    ...baseActions,
    enter: bossEnter,
    // Rears up on the back legs, front legs high, venom glowing.
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -6, 'out']]),
        lean: track(p, [[0, 0], [0.25, -0.2, 'out']]),
        rear: track(p, [[0, 0], [0.25, 1, 'out']]) + Math.sin(p * 34) * 0.06,
        glow: track(p, [[0, 0], [1, 1]]),
        mouth: 1,
      }),
    },
    // Lunges and spits.
    attack: {
      dur: 0.5, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -6], [0.25, 18, 'in'], [0.6, 18], [1, 0]]),
        lean: track(p, [[0, -0.2], [0.25, 0.14, 'in'], [0.6, 0.14], [1, 0]]),
        rear: track(p, [[0, 1], [0.25, 0.1, 'in'], [1, 0]]),
        glow: track(p, [[0, 1], [0.3, 0.4], [1, 0]]),
        mouth: track(p, [[0, 1], [0.25, 1.4], [0.6, 0.6], [1, 0]]),
      }),
    },
  },
  draw(ctx, P, look) {
    const rage = rageOf(look);
    const body = mix(look.colors.body, '#3a0a1a', rage * 0.4);
    const venom = look.colors.accent;
    const legCol = darker(body, 0.1);
    const g = Math.max(0, Math.min(1, P.glow + rage * 0.3));
    squash(ctx, P, () => {
      for (let i = 0; i < LEGS.length; i++) spiderLeg(ctx, LEGS[i], i, P, darker(body, 0.35), true);
      for (let i = 0; i < LEGS.length; i++) spiderLeg(ctx, LEGS[i], i, P, legCol, false);
      // Abdomen with its glowing hourglass.
      at(ctx, -30, -54, -0.25 + Math.sin(P.wob * 2) * 0.03, () => {
        glow(ctx, 0, 0, 40, venom, 0.15 + g * 0.3);
        blob(ctx, ellipse(0, 0, 34, 27), body, { depth: 6, light: lighter(body, 0.35) });
        blob(ctx, poly([[-6, -14], [6, -14], [1, 0], [6, 14], [-6, 14], [-1, 0]]), mix(venom, '#ffffff', g * 0.4), { ow: 1.6, depth: 1, light: '#ffffff' });
        for (const [x, y, r] of [[-20, -8, 3.4], [-18, 10, 3], [16, -12, 2.6], [18, 8, 2.4]]) flat(ctx, circle(x, y, r), venom, 0.5 + g * 0.4);
        blob(ctx, ellipse(-33, 4, 5, 4), darker(body, 0.3), { ow: 1.6, depth: 0.8 });
      });
      // Cephalothorax and head.
      blob(ctx, ellipse(8, -48, 24, 18), body, { depth: 4.4, light: lighter(body, 0.3) });
      at(ctx, 30, -52, P.lean * -0.6, () => {
        blob(ctx, circle(0, 0, 15), darker(body, 0.08), { depth: 3, light: lighter(body, 0.3) });
        // Fangs open with the mouth.
        const o = P.mouth * 0.35;
        for (const s of [-1, 1]) {
          at(ctx, 8, 8 + s * 2, s * (0.3 + o), () => {
            blob(ctx, (c) => { c.moveTo(-3, 0); c.quadraticCurveTo(6, 2, 8, 12); c.quadraticCurveTo(2, 8, -3, 4); c.closePath(); }, venom, { ow: 1.6, depth: 0.8, light: '#ffffff' });
          });
        }
        if (P.mouth > 0.2) flat(ctx, circle(16, 22 + (P.wob * 20) % 6, 1.6), venom, 0.9);
        // Eight eyes: two big, six small, burning hotter in later phases.
        const ec = rage > 0 ? mix(venom, '#ff3a2a', rage) : venom;
        glow(ctx, 6, -4, 18, ec, 0.35 + rage * 0.25);
        const open = 1 - P.blink * 0.85;
        for (const [x, y, r] of [[5, -5, 3.6], [11, -3, 3.2], [-1, -8, 2], [2, -11, 1.8], [8, -10, 1.8], [14, -8, 1.6], [-3, -3, 1.6], [15, -1, 1.4]]) {
          blob(ctx, ellipse(x, y, r, r * open), ec, { ow: 1.2, depth: 0.4, light: '#ffffff' });
          if (r > 3) flat(ctx, circle(x - r * 0.3, y - r * 0.3 * open, r * 0.3), '#ffffff', 0.9);
        }
        // Crown of thorns and gems.
        at(ctx, -2, -12, -0.15, () => {
          blob(ctx, poly([[-11, 0], [-12, -12], [-6, -5], [-1, -16], [4, -5], [10, -13], [10, 0]]), GOLD, { depth: 1.6, ow: 1.8 });
          blob(ctx, roundRect(-12, -2, 23, 4.4, 2), darker(GOLD, 0.3), { depth: 0.6, ow: 1.6 });
          flat(ctx, circle(-1, -8, 2), venom);
          glow(ctx, -1, -8, 6, venom, 0.4);
        });
      });
    });
  },
};

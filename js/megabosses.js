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
  reach: 0, rise: 0, rock: 0, staff: 0, wing: 0, neck: 0,
};

// Reports a point in the current drawing space as the actor's `muzzle` (where its special
// attack starts), in device pixels like the pets' shots.
function mark(out, ctx, x, y) {
  if (!out) return;
  const m = ctx.getTransform();
  out.muzzle = { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

// A curling limb as a list of points from (x, y): `a` is the starting heading (0 = up,
// positive leans toward +x), `curl` the total turn along the way, `wave` sways it.
function curlPts(x, y, a, len, curl, wave = 0, n = 9) {
  const pts = [];
  const step = len / n;
  let ang = a;
  for (let i = 0; i <= n; i++) {
    pts.push([x, y]);
    ang += curl / n + Math.sin(wave + i * 0.7) * 0.05;
    x += Math.sin(ang) * step;
    y -= Math.cos(ang) * step;
  }
  return pts;
}

// A tapered tube along `pts`, `r0` thick at the base and `r1` at the tip, with optional
// sucker dots along one side.
function tube(ctx, pts, r0, r1, color, opts = {}) {
  const n = pts.length;
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const [x, y] = pts[i];
    const [ax, ay] = pts[Math.max(0, i - 1)];
    const [bx, by] = pts[Math.min(n - 1, i + 1)];
    const d = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / d;
    const ny = (bx - ax) / d;
    const r = r0 + (r1 - r0) * (i / (n - 1));
    left.push([x + nx * r, y + ny * r]);
    right.push([x - nx * r, y - ny * r]);
  }
  blob(ctx, smooth([...left, ...right.reverse()], 0.85), color, { depth: opts.depth ?? 2 });
  if (opts.sucker) {
    for (let i = 1; i < n - 1; i++) {
      const [x, y] = pts[i];
      const [px, py] = left[i];
      const r = r0 + (r1 - r0) * (i / (n - 1));
      flat(ctx, circle(x + (px - x) * 0.55, y + (py - y) * 0.55, r * 0.32), opts.sucker, 0.9);
    }
  }
}

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

// ---- Kraken: a giant octopus in a sunken captain's hat ----

export const kraken = {
  height: 130,
  bossScale: 0.95,
  standOff: 22,
  special: 'tentacle',
  rest: { ...REST },
  idle: (t, look) => {
    const k = 1 + rageOf(look) * 0.6;
    return {
      rise: Math.sin(t * 1.6 * k) * 0.25,
      sq: 1 + Math.sin(t * 3.2 * k) * 0.02,
      lean: Math.sin(t * 0.8) * 0.03,
      wob: t * k,
      glow: 0.2 + Math.sin(t * 2) * 0.1,
      blink: t % 4.6 < 0.14 ? 1 : 0,
    };
  },
  actions: {
    ...baseActions,
    enter: bossEnter,
    // Rises tall and pulls the whip tentacle back high.
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -6, 'out']]),
        rise: track(p, [[0, 0], [0.25, 1, 'out']]),
        reach: track(p, [[0, 0], [0.25, -0.4, 'out']]) + Math.sin(p * 30) * 0.04,
        lean: track(p, [[0, 0], [0.25, -0.12, 'out']]),
        glow: track(p, [[0, 0], [1, 1]]),
        mouth: 1,
      }),
    },
    // The whip lashes out across the arena.
    attack: {
      dur: 0.55, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -6], [0.3, 10, 'in'], [0.6, 10], [1, 0]]),
        rise: track(p, [[0, 1], [0.3, 0.2], [1, 0]]),
        reach: track(p, [[0, -0.4], [0.3, 1, 'in'], [0.6, 1], [1, 0]]),
        lean: track(p, [[0, -0.12], [0.3, 0.14, 'in'], [0.6, 0.14], [1, 0]]),
        glow: track(p, [[0, 1], [0.4, 0.4], [1, 0]]),
        mouth: bump(p, 0.1, 0.5),
      }),
    },
  },
  draw(ctx, P, look, out) {
    const rage = rageOf(look);
    const body = mix(look.colors.body, '#3a0a2a', rage * 0.35);
    const dark = darker(body, 0.3);
    const sucker = look.colors.accent;
    const w = P.wob;
    const lift = -P.rise * 8;
    squash(ctx, P, () => {
      // Back tentacles, curling on the ground behind.
      for (const [x, a, len, curl, ph] of [[-20, -2.2, 66, 1.7, 0], [-6, -2.6, 56, 1.5, 1.3], [8, 2.4, 52, -1.6, 2.1]]) {
        tube(ctx, curlPts(x, -26 + lift, a, len, curl, w * 2 + ph), 11, 2.4, dark, { depth: 1.4 });
      }
      // The mantle, leaning back.
      at(ctx, -8, -76 + lift, -0.18 + P.lean * 0.4, () => {
        blob(ctx, smooth([[-30, 32], [-42, 0], [-38, -28], [-20, -46], [6, -46], [26, -30], [36, -2], [32, 32]], 0.9), body, { depth: 7, light: lighter(body, 0.35) });
        for (const [x, y, r] of [[-20, -18, 7], [2, -32, 5], [-28, 8, 4.4], [12, -12, 3.6], [-8, -6, 3]]) flat(ctx, ellipse(x, y, r, r * 0.8), lighter(body, 0.25), 0.7);
        // A captain's tricorn, slightly too small.
        at(ctx, -6, -44, -0.2, () => {
          blob(ctx, (c) => { c.moveTo(-28, 4); c.quadraticCurveTo(-24, -10, -14, -10); c.quadraticCurveTo(0, -30, 14, -10); c.quadraticCurveTo(24, -10, 28, 4); c.quadraticCurveTo(0, -4, -28, 4); c.closePath(); }, '#2a2030', { depth: 2.4, light: '#5a4a60' });
          line(ctx, (c) => { c.moveTo(-26, 2); c.quadraticCurveTo(0, -6, 26, 2); }, GOLD, 2);
          flat(ctx, circle(0, -12, 4.4), '#f2ead8');
          flat(ctx, circle(-1.6, -12.6, 1.1), INK);
          flat(ctx, circle(1.6, -12.6, 1.1), INK);
          line(ctx, (c) => { c.moveTo(-6, -4); c.lineTo(6, -9); c.moveTo(-6, -9); c.lineTo(6, -4); }, '#f2ead8', 1.6);
        });
      });
      // Big eyes with slit pupils over a parrot beak.
      const eyeCol = mix('#ffe07a', '#ff3a2a', rage);
      glow(ctx, 16, -62 + lift, 22, eyeCol, 0.15 + P.glow * 0.3);
      for (const [x, y, r] of [[6, -62, 10], [28, -59, 8.4]]) {
        const open = Math.max(0.12, 1 - P.blink * 0.85);
        blob(ctx, ellipse(x, y + lift, r, r * open), eyeCol, { ow: 2, depth: 1.4, light: '#ffffff' });
        if (open > 0.3) flat(ctx, roundRect(x - r * 0.15, y + lift - r * 0.55 * open, r * 0.55, r * 1.1 * open, 1.4), INK);
        line(ctx, (c) => { c.moveTo(x - r * 1.1, y + lift - r * 1.2); c.lineTo(x + r * 0.9, y + lift - r * 0.7); }, INK, 3);
      }
      at(ctx, 20, -44 + lift, 0, () => {
        blob(ctx, poly([[-6, -2], [6, -2], [2, 8 + P.mouth * 3]]), '#3a2a2a', { ow: 1.8, depth: 1 });
        if (P.mouth > 0.2) blob(ctx, poly([[-5, 2], [5, 2], [0, 6 + P.mouth * 6]]), '#e8d0a0', { ow: 1.4, depth: 0.6 });
      });
      // Front tentacles on the ground, then the whip.
      for (const [x, a, len, curl, ph] of [[-14, -2.3, 64, 1.8, 0.5], [2, 2.2, 60, -1.8, 1.7], [16, 2.0, 72, -2, 2.6]]) {
        tube(ctx, curlPts(x, -24 + lift, a, len, curl, w * 2.2 + ph), 12, 2.4, body, { sucker });
      }
      const reach = P.reach;
      const pts = curlPts(24, -40 + lift, 0.5 + reach * 1.1, 56 + Math.max(0, reach) * 80, 1.4 - Math.max(0, reach) * 1.3 - Math.min(0, reach) * 1.5, w * 3, 12);
      tube(ctx, pts, 11, 2.2, body, { sucker });
      const tip = pts[pts.length - 1];
      mark(out, ctx, tip[0], tip[1]);
    });
  },
};

// ---- Tepegöz: a one-eyed mountain giant that hurls boulders ----

function boulder(ctx, r, mossy) {
  blob(ctx, smooth([[-r, 2], [-r * 0.8, -r * 0.7], [-r * 0.1, -r], [r * 0.8, -r * 0.75], [r, r * 0.1], [r * 0.6, r * 0.85], [-r * 0.5, r * 0.9]], 0.9), '#8a8478', { depth: 4, light: '#c8c2b4' });
  line(ctx, (c) => { c.moveTo(-r * 0.3, -r * 0.4); c.lineTo(r * 0.1, -r * 0.1); c.lineTo(0, r * 0.3); }, '#5a564e', 1.6);
  if (mossy) flat(ctx, ellipse(-r * 0.2, -r * 0.8, r * 0.5, r * 0.2), '#6aa04a', 0.85);
}

function giantArm(ctx, skin, cuff, back) {
  blob(ctx, capsule(0, 0, 0, 30, 11, 10), skin, { depth: 2 });
  at(ctx, 0, 30, back ? -0.2 : -0.35, () => {
    blob(ctx, capsule(0, 0, 0, 26, 10, 9), skin, { depth: 1.8 });
    blob(ctx, roundRect(-11, 8, 22, 9, 3.4), cuff, { depth: 1, ow: 2 });
    blob(ctx, circle(0, 30, 11), skin, { depth: 2 });
  });
}

export const cyclops = {
  height: 140,
  bossScale: 0.8,
  standOff: 14,
  special: 'boulder',
  rest: { ...REST, arm: 0.15, arm2: 0.3 },
  idle: (t, look) => {
    const k = 1 + rageOf(look) * 0.5;
    return {
      y: -Math.abs(Math.sin(t * 1.4 * k)) * 1.6,
      sq: 1 + Math.sin(t * 2.8 * k) * 0.018,
      lean: Math.sin(t * 0.7) * 0.03,
      arm: 0.15 + Math.sin(t * 1.4) * 0.06,
      arm2: 0.3 + Math.sin(t * 1.4 + 1) * 0.06,
      head: Math.sin(t * 1.4 + 0.5) * 0.04,
      wob: t,
      blink: t % 5.2 < 0.16 ? 1 : 0,
    };
  },
  actions: {
    ...baseActions,
    enter: bossEnter,
    // A boulder lifted high over the head.
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -6, 'out']]),
        lean: track(p, [[0, 0], [0.25, -0.2, 'out']]),
        arm: track(p, [[0, 0], [0.25, -3, 'out']]),
        arm2: track(p, [[0, 0], [0.25, -3.1, 'out']]),
        rock: track(p, [[0, 0], [0.12, 1]]),
        head: track(p, [[0, 0], [0.25, -0.12, 'out']]),
        mouth: 1,
      }),
    },
    // Thrown: the rock leaves the hands at p 0.28.
    attack: {
      dur: 0.6, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -6], [0.28, 12, 'in'], [0.65, 12], [1, 0]]),
        lean: track(p, [[0, -0.2], [0.28, 0.28, 'in'], [0.65, 0.28], [1, 0]]),
        arm: track(p, [[0, -3], [0.28, -1.3, 'in'], [0.65, -1.3], [1, 0]]),
        arm2: track(p, [[0, -3.1], [0.28, -1.5, 'in'], [0.65, -1.5], [1, 0]]),
        rock: p < 0.27 ? 1 : 0,
        head: track(p, [[0, -0.12], [0.28, 0.1], [1, 0]]),
        mouth: bump(p, 0.1, 0.5),
      }),
    },
  },
  draw(ctx, P, look, out) {
    const rage = rageOf(look);
    const skin = mix(look.colors.body, '#6a2a3a', rage * 0.3);
    const fur = look.colors.accent;
    const dark = darker(skin, 0.25);
    squash(ctx, P, () => {
      at(ctx, -24, -112, 0.25 + P.arm2, () => giantArm(ctx, dark, darker(fur, 0.2), true));
      // Legs in fur boots.
      for (const [x, c] of [[-13, dark], [13, skin]]) {
        blob(ctx, capsule(x, -58, x + (x < 0 ? -2 : 2), -18, 12, 10), c, { depth: 2 });
        blob(ctx, roundRect(x - 13, -22, 26, 18, 6), darker(fur, x < 0 ? 0.25 : 0.05), { depth: 1.6 });
        blob(ctx, roundRect(x - 13, -6, 28, 7, 3), '#4a3a2e', { depth: 0.8, ow: 2 });
      }
      // Belly, fur kilt and a rope belt.
      blob(ctx, smooth([[-26, -54], [-32, -84], [-28, -112], [-8, -124], [16, -122], [32, -108], [34, -80], [26, -54], [0, -48]], 0.9), skin, { depth: 6 });
      flat(ctx, ellipse(8, -80, 16, 18), lighter(skin, 0.22), 0.55);
      line(ctx, (c) => { c.moveTo(-6, -108); c.lineTo(10, -96); c.moveTo(-2, -110); c.lineTo(14, -98); }, '#c86a6a', 1.6, 0.8);
      blob(ctx, poly([[-28, -62], [30, -62], [32, -40], [20, -46], [12, -36], [2, -46], [-10, -38], [-20, -46], [-30, -40]]), fur, { depth: 2 });
      line(ctx, (c) => { c.moveTo(-28, -61); c.quadraticCurveTo(2, -56, 30, -61); }, '#c8a86a', 3);
      // Head: one huge eye, a horn and an underbite.
      at(ctx, 10, -126, P.head + P.lean * 0.3, () => {
        blob(ctx, poly([[-14, -16], [-24, -24], [-15, -8]]), skin, { depth: 1 });
        blob(ctx, smooth([[-16, 0], [-18, -18], [-8, -30], [10, -31], [22, -22], [24, -6], [18, 6], [-6, 8]], 0.9), skin, { depth: 3.4 });
        blob(ctx, (c) => { c.moveTo(-2, -28); c.quadraticCurveTo(6, -46, 16, -50); c.quadraticCurveTo(12, -40, 8, -28); c.closePath(); }, '#f2ead8', { depth: 1.4 });
        const eyeCol = mix('#fff6d8', '#ffb0a0', rage);
        glow(ctx, 6, -15, 16, rage > 0 ? '#ff3a2a' : '#fff2a8', 0.2 + rage * 0.3);
        const open = Math.max(0.1, 1 - P.blink * 0.9);
        blob(ctx, ellipse(6, -15, 10.5, 9 * open), eyeCol, { ow: 2.2, depth: 1.6 });
        if (open > 0.3) {
          flat(ctx, circle(9, -15, 5.4 * open), rage > 0 ? '#c0202a' : '#4a8a3a');
          flat(ctx, circle(10, -15, 2.6 * open), INK);
          flat(ctx, circle(7.6, -17.6, 1.6), '#ffffff');
        }
        line(ctx, (c) => { c.moveTo(-6, -26); c.quadraticCurveTo(6, -30 + rage * 4, 18, -24); }, INK, 3.4);
        blob(ctx, (c) => { c.moveTo(-4, 0); c.quadraticCurveTo(8, 6 + P.mouth * 6, 20, 0); c.quadraticCurveTo(8, 3, -4, 0); c.closePath(); }, '#4a1420', { ow: 1.8, shade: false, noLight: true });
        blob(ctx, poly([[-1, 2], [1.5, -5], [4, 2.6]]), '#fff6e0', { ow: 1.2, depth: 0.4, noLight: true });
        blob(ctx, poly([[13, 2.4], [15.5, -5], [18, 1.6]]), '#fff6e0', { ow: 1.2, depth: 0.4, noLight: true });
      });
      // Front arm; the boulder sits between the raised hands.
      at(ctx, 26, -112, P.arm, () => {
        giantArm(ctx, skin, fur, false);
        if (P.rock > 0.5) {
          at(ctx, -6, 70, -P.arm, () => {
            boulder(ctx, 24, true);
            mark(out, ctx, 0, 0);
          });
        } else {
          mark(out, ctx, 0, 40);
        }
      });
    });
  },
};

// ---- Lich Kral: a floating skeleton king with a soul-orb staff ----

const BONE = '#e8e2d0';

export const lich = {
  height: 128,
  hover: 14,
  bossScale: 0.95,
  standOff: 18,
  special: 'curse',
  rest: { ...REST, arm2: 0.4 },
  idle: (t, look) => {
    const k = 1 + rageOf(look) * 0.6;
    return {
      y: -14 + Math.sin(t * 1.8 * k) * 5,
      lean: Math.sin(t * 0.9) * 0.03,
      staff: Math.sin(t * 1.8) * 0.05,
      arm2: 0.4 + Math.sin(t * 1.8 + 1) * 0.15,
      glow: 0.4 + Math.sin(t * 3) * 0.2,
      wob: t * k,
      blink: t % 4.8 < 0.14 ? 1 : 0,
    };
  },
  actions: {
    ...baseActions,
    enter: bossEnter,
    // Staff and claw raised, the orb flaring.
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -6, 'out']]),
        y: track(p, [[0, 0], [0.25, -10, 'out']]),
        lean: track(p, [[0, 0], [0.25, -0.12, 'out']]),
        staff: track(p, [[0, 0], [0.25, -0.9, 'out']]),
        arm2: track(p, [[0, 0], [0.25, -2.4, 'out']]),
        glow: track(p, [[0, 0], [1, 1]]),
        mouth: 1,
      }),
    },
    // The staff thrust at the hero.
    attack: {
      dur: 0.55, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -6], [0.25, 10, 'in'], [0.6, 10], [1, 0]]),
        y: track(p, [[0, -10], [0.25, -4], [1, 0]]),
        lean: track(p, [[0, -0.12], [0.25, 0.12, 'in'], [0.6, 0.12], [1, 0]]),
        staff: track(p, [[0, -0.9], [0.25, -1.5, 'in'], [0.6, -1.5], [1, 0]]),
        arm2: track(p, [[0, -2.4], [0.3, -1.2], [1, 0]]),
        glow: track(p, [[0, 1], [0.3, 0.6], [1, 0]]),
        mouth: bump(p, 0.1, 0.5),
      }),
    },
  },
  draw(ctx, P, look, out) {
    const rage = rageOf(look);
    const robe = mix(look.colors.body, '#2a0a1a', rage * 0.3);
    const soul = mix(look.colors.accent, '#ff3a6a', rage * 0.6);
    const g = Math.max(0, Math.min(1, P.glow + rage * 0.3));
    const w = P.wob;
    squash(ctx, P, () => {
      // Ghostly wisps where legs would be.
      glow(ctx, 0, -10, 34, soul, 0.3);
      for (let i = 0; i < 4; i++) {
        const k = (w * 0.8 + i * 0.25) % 1;
        flat(ctx, ellipse(-14 + i * 9, -4 + k * 14, 5 * (1 - k), 8 * (1 - k)), soul, 0.4 * (1 - k));
      }
      // The raised bony claw behind.
      at(ctx, -16, -96, P.arm2, () => {
        blob(ctx, capsule(0, 0, 0, 22, 7, 5), darker(robe, 0.25), { depth: 1.4 });
        at(ctx, 0, 22, -0.3, () => {
          blob(ctx, capsule(0, 0, 0, 16, 2.4, 2.2), BONE, { depth: 0.6, ow: 1.8 });
          line(ctx, (c) => { for (const a of [-0.5, 0, 0.5]) { c.moveTo(0, 16); c.lineTo(Math.sin(a) * 8, 16 + Math.cos(a) * 8); } }, BONE, 2.2);
          if (g > 0.5) glow(ctx, 0, 20, 14, soul, (g - 0.5) * 0.9);
        });
      });
      // The tattered robe, flaring at the hem.
      blob(ctx, (c) => {
        c.moveTo(-16, -106);
        c.quadraticCurveTo(-30, -62, -34, -14);
        for (let x = -34, i = 0; x < 30; x += 8, i++) c.lineTo(x + 4, (i % 2 ? -4 : -14) + Math.sin(w * 4 + i) * 2.4);
        c.lineTo(30, -12);
        c.quadraticCurveTo(28, -62, 20, -106);
        c.closePath();
      }, robe, { depth: 6, light: lighter(robe, 0.3) });
      line(ctx, (c) => { c.moveTo(3, -100); c.quadraticCurveTo(6, -50, 2, -14); }, GOLD, 2.4);
      line(ctx, (c) => { c.moveTo(-30, -24); c.quadraticCurveTo(0, -18, 28, -22); }, GOLD, 2, 0.8);
      // Open chest: ribs around a burning soul.
      blob(ctx, ellipse(4, -82, 9.5, 14), '#160c1c', { ow: 1.8, shade: false, noLight: true });
      glow(ctx, 4, -80, 14, soul, 0.4 + g * 0.4);
      flat(ctx, circle(4, -80, 3.4 + g * 1.6), lighter(soul, 0.5));
      line(ctx, (c) => { for (let i = 0; i < 3; i++) { const y = -90 + i * 6; c.moveTo(-5, y); c.quadraticCurveTo(4, y - 4, 13, y); } }, BONE, 2);
      // High pointed collar.
      blob(ctx, poly([[-17, -102], [-28, -136], [-8, -114], [2, -132], [10, -114], [24, -134], [20, -102]]), darker(robe, 0.3), { depth: 2 });
      // Crowned skull with flames in the sockets.
      at(ctx, 6, -118, P.lean * 0.4, () => {
        blob(ctx, smooth([[-12, 2], [-14, -12], [-8, -22], [6, -24], [16, -16], [17, -4], [13, 3], [0, 5]], 0.9), BONE, { depth: 2.6 });
        blob(ctx, roundRect(-2, 2 + P.mouth * 4, 15, 6, 2.4), BONE, { depth: 1, ow: 1.8 });
        line(ctx, (c) => { for (let x = 1; x < 13; x += 3) { c.moveTo(x, 3 + P.mouth * 4); c.lineTo(x, 7 + P.mouth * 4); } }, darker(BONE, 0.4), 1.1);
        for (const [x, y, r] of [[1, -10, 4.4], [11, -9, 3.8]]) {
          blob(ctx, ellipse(x, y, r, r * 1.1), '#160c1c', { ow: 1.4, shade: false, noLight: true });
          glow(ctx, x, y, 10, soul, 0.5 + g * 0.3);
          const open = 1 - P.blink * 0.8;
          flat(ctx, (c) => { c.moveTo(x - 2, y + 2); c.quadraticCurveTo(x, y - 6 * open - Math.sin(w * 9 + x) * 1.5, x + 2, y + 2); c.closePath(); }, lighter(soul, 0.4), open);
        }
        flat(ctx, poly([[6, -3], [4.4, 0], [7.6, 0]]), '#160c1c');
        // The crown.
        blob(ctx, poly([[-12, -18], [-13, -32], [-6, -24], [1, -36], [7, -24], [14, -33], [15, -16]]), GOLD, { depth: 1.6, ow: 1.8 });
        blob(ctx, roundRect(-13, -20, 29, 5, 2), darker(GOLD, 0.3), { depth: 0.6, ow: 1.6 });
        flat(ctx, circle(1, -27, 2.2), soul);
        glow(ctx, 1, -27, 6, soul, 0.5);
      });
      // Sleeve, bony hand and the staff with its soul orb.
      at(ctx, 18, -98, -0.3 + P.staff, () => {
        blob(ctx, capsule(0, 0, 3, 24, 7, 9), robe, { depth: 1.6 });
        at(ctx, 3, 28, 0.3 - P.staff * 0.6, () => {
          blob(ctx, roundRect(-2.4, -96, 4.8, 126, 2.4), '#4a3a4e', { depth: 0.8, ow: 1.8 });
          at(ctx, 0, -100, 0, () => {
            line(ctx, (c) => { c.moveTo(-7, 8); c.quadraticCurveTo(-11, -4, -3, -10); c.moveTo(7, 8); c.quadraticCurveTo(11, -4, 3, -10); }, BONE, 3);
            glow(ctx, 0, -2, 16 + g * 16, soul, 0.45 + g * 0.4);
            blob(ctx, circle(0, -2, 8), lighter(soul, 0.2), { ow: 1.8, depth: 1.6, light: '#ffffff' });
            mark(out, ctx, 0, -2);
          });
          blob(ctx, circle(0, 0, 5), BONE, { ow: 1.6, depth: 0.6 });
        });
      });
    });
  },
};

// ---- Kara Ejderha: a black dragon breathing fire ----

function dragonWing(ctx, bone, membrane, P) {
  const tips = [[-64, -54], [-70, -22], [-56, 4], [-30, 10]];
  blob(ctx, (c) => {
    c.moveTo(0, 0);
    c.lineTo(-22, -40);
    for (let i = 0; i < tips.length; i++) {
      const [x, y] = tips[i];
      const [nx, ny] = tips[i + 1] || [0, 0];
      c.lineTo(x, y);
      c.quadraticCurveTo((x + nx) / 2 + 8, (y + ny) / 2 - 2, nx, ny);
    }
    c.closePath();
  }, membrane, { depth: 3, light: lighter(membrane, 0.25) });
  line(ctx, (c) => { c.moveTo(0, 0); c.lineTo(-22, -40); for (const [x, y] of tips) { c.moveTo(-22, -40); c.lineTo(x, y); } }, bone, 3.2);
  blob(ctx, poly([[-22, -40], [-28, -50], [-18, -42]]), '#e8dcc0', { ow: 1.4, depth: 0.5 });
}

export const blackDragon = {
  height: 120,
  bossScale: 0.92,
  standOff: 14,
  special: 'fire',
  rest: { ...REST },
  idle: (t, look) => {
    const k = 1 + rageOf(look) * 0.6;
    return {
      y: -Math.abs(Math.sin(t * 1.5 * k)) * 1.4,
      sq: 1 + Math.sin(t * 3 * k) * 0.015,
      wing: Math.sin(t * 1.5 * k) * 0.1,
      neck: Math.sin(t * 1.1) * 0.08,
      glow: 0.2 + Math.sin(t * 2.4) * 0.1,
      wob: t * k,
      blink: t % 4.4 < 0.14 ? 1 : 0,
    };
  },
  actions: {
    ...baseActions,
    enter: bossEnter,
    // Rears up, wings wide, fire building in the throat.
    windup: {
      dur: 1.4, hold: true, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, 0], [0.25, -6, 'out']]),
        lean: track(p, [[0, 0], [0.25, -0.12, 'out']]),
        neck: track(p, [[0, 0], [0.25, -0.6, 'out']]),
        wing: track(p, [[0, 0], [0.25, 0.8, 'out']]) + Math.sin(p * 26) * 0.05,
        glow: track(p, [[0, 0], [1, 1]]),
        mouth: track(p, [[0, 0], [0.3, 0.4]]),
      }),
    },
    // Head thrust forward, jaws wide: the breath.
    attack: {
      dur: 0.75, channel: 'body',
      pose: (p) => ({
        x: track(p, [[0, -6], [0.2, 8, 'in'], [0.8, 8], [1, 0]]),
        lean: track(p, [[0, -0.12], [0.2, 0.1, 'in'], [0.8, 0.1], [1, 0]]),
        neck: track(p, [[0, -0.6], [0.2, 0.45, 'in'], [0.8, 0.45], [1, 0]]),
        wing: track(p, [[0, 0.8], [0.25, -0.2], [1, 0]]),
        glow: track(p, [[0, 1], [0.8, 0.6], [1, 0]]),
        mouth: track(p, [[0, 0.4], [0.2, 1.2], [0.8, 1.2], [1, 0]]),
      }),
    },
  },
  draw(ctx, P, look, out) {
    const rage = rageOf(look);
    const body = mix(look.colors.body, '#3a0a14', rage * 0.35);
    const fire = look.colors.accent;
    const belly = mix(body, '#c8a070', 0.55);
    const horn = '#e8dcc0';
    const dark = darker(body, 0.3);
    const w = P.wob;
    squash(ctx, P, () => {
      // Tail sweeping back with a spade tip.
      const tail = curlPts(-34, -44, -1.95, 76, 1.2 + Math.sin(w * 1.6) * 0.25, w, 9);
      tube(ctx, tail, 12, 2.4, body, { depth: 2 });
      const [tx, ty] = tail[tail.length - 1];
      blob(ctx, poly([[tx, ty], [tx - 6, ty - 10], [tx + 2, ty - 16], [tx + 8, ty - 6]]), dark, { ow: 1.8, depth: 1 });
      // Far wing and legs.
      at(ctx, -4, -74, -0.25 + P.wing * 0.8, () => dragonWing(ctx, dark, darker(body, 0.35), P));
      for (const [x, c] of [[-28, dark], [16, dark]]) {
        blob(ctx, capsule(x, -46, x - 2, -6, 8, 6), c, { depth: 1.4 });
        blob(ctx, ellipse(x + 2, -4, 9, 4.6), c, { depth: 1, ow: 2 });
      }
      // Body with a scaled belly and back spikes.
      blob(ctx, ellipse(-6, -54, 40, 24, -0.08), body, { depth: 5, light: lighter(body, 0.3) });
      blob(ctx, (c) => { c.moveTo(-40, -46); c.quadraticCurveTo(-6, -22, 30, -50); c.quadraticCurveTo(-6, -36, -40, -46); c.closePath(); }, belly, { depth: 1.6, ow: 1.8 });
      line(ctx, (c) => { for (let x = -30; x < 26; x += 8) { c.moveTo(x, -42 + Math.abs(x) * 0.06); c.lineTo(x + 3, -34 + Math.abs(x) * 0.1); } }, darker(belly, 0.3), 1.2, 0.8);
      for (let i = 0; i < 6; i++) {
        const x = -34 + i * 11;
        const y = -76 + Math.abs(x + 6) * 0.08;
        blob(ctx, poly([[x - 4, y + 4], [x, y - 8], [x + 4, y + 4]]), horn, { ow: 1.4, depth: 0.5 });
      }
      // Near legs with claws.
      for (const [x, s] of [[-22, 1], [22, 1]]) {
        blob(ctx, ellipse(x, -42, 11, 14), body, { depth: 2 });
        blob(ctx, capsule(x + 2, -34, x + 4 * s, -6, 7, 5.4), body, { depth: 1.4 });
        blob(ctx, ellipse(x + 6, -3.4, 10, 4.6), body, { depth: 1, ow: 2 });
        for (let k = 0; k < 3; k++) blob(ctx, poly([[x + 9 + k * 3, -4], [x + 14 + k * 3, -1], [x + 9 + k * 3, -1]]), horn, { ow: 1, depth: 0.3, noLight: true });
      }
      // Fire building in the chest.
      glow(ctx, 24, -62, 22, fire, P.glow * 0.5 + rage * 0.2);
      // Neck and head.
      const neck = curlPts(22, -64, 0.6 + P.neck, 52, -0.5 - P.neck * 0.5, 0, 7);
      tube(ctx, neck, 13, 9, body, { depth: 2.4 });
      for (let i = 1; i < neck.length - 1; i += 2) {
        const [x, y] = neck[i];
        blob(ctx, poly([[x - 4, y - 6], [x - 6, y - 14], [x + 1, y - 8]]), horn, { ow: 1.2, depth: 0.4 });
      }
      const [hx, hy] = neck[neck.length - 1];
      const [px, py] = neck[neck.length - 2];
      const ang = Math.atan2(hy - py, hx - px);
      at(ctx, hx, hy, ang * 0.6, () => {
        // Horns, then the skull, the lower jaw and fire in the mouth.
        blob(ctx, (c) => { c.moveTo(-4, -8); c.quadraticCurveTo(-20, -16, -26, -6); c.quadraticCurveTo(-16, -10, -2, -2); c.closePath(); }, horn, { depth: 1.2 });
        at(ctx, 4, 4, P.mouth * 0.45, () => {
          blob(ctx, (c) => { c.moveTo(-6, 0); c.lineTo(30, 2); c.quadraticCurveTo(26, 8, 10, 9); c.lineTo(-6, 6); c.closePath(); }, dark, { depth: 1.4 });
          line(ctx, (c) => { for (let x = 8; x < 28; x += 5) { c.moveTo(x, 2); c.lineTo(x + 1.5, -1.6); } }, '#fff6e0', 1.6);
        });
        if (P.mouth > 0.3) { glow(ctx, 22, 4, 16, fire, 0.6); flat(ctx, ellipse(18, 4, 8, 2 + P.mouth * 3), lighter(fire, 0.4)); }
        blob(ctx, smooth([[-10, 4], [-12, -8], [-2, -14], [14, -10], [34, -4], [34, 3], [14, 5], [-4, 8]], 0.85), body, { depth: 2.6, light: lighter(body, 0.3) });
        line(ctx, (c) => { for (let x = 12; x < 32; x += 5) { c.moveTo(x, 4); c.lineTo(x + 1.5, 7.6); } }, '#fff6e0', 1.6);
        blob(ctx, (c) => { c.moveTo(2, -10); c.quadraticCurveTo(-14, -26, -24, -22); c.quadraticCurveTo(-12, -16, 6, -6); c.closePath(); }, horn, { depth: 1.4 });
        const eyeCol = mix(fire, '#ff2a2a', rage);
        glow(ctx, 8, -6, 10, eyeCol, 0.5);
        const open = Math.max(0.15, 1 - P.blink * 0.85);
        blob(ctx, ellipse(8, -6, 4, 2.6 * open), lighter(eyeCol, 0.3), { ow: 1.6, depth: 0.5, light: '#ffffff' });
        if (open > 0.3) flat(ctx, roundRect(7.6, -6 - 2.2 * open, 1.4, 4.4 * open, 0.7), INK);
        line(ctx, (c) => { c.moveTo(2, -10); c.lineTo(14, -8); }, INK, 2.4);
        flat(ctx, ellipse(31, -2, 1.6, 1), INK);
        const puff = (w * 0.9) % 1;
        flat(ctx, circle(38 + puff * 10, -6 - puff * 8, 1.6 + puff * 4), '#8a8a8a', 0.5 * (1 - puff));
        mark(out, ctx, 32, 4);
      });
      // Near wing over the body.
      at(ctx, 6, -74, -0.15 + P.wing, () => dragonWing(ctx, body, darker(body, 0.12), P));
    });
  },
};

import {
  INK, at, blob, line, flat, glow, ellipse, circle, roundRect, smooth, poly, capsule, star, many, eye, darker, lighter,
} from './paint.js';
import { track, bump } from './anim.js';

// Humanoid actors: the hero and the dungeon companions (hood, hat and helm outfits).
// Origin is between the feet on the ground, +x is the facing direction, units are roughly
// pixels of a ~90 unit tall hero. Joint angles are radians; a limb at 0 hangs straight down,
// positive swings it backward (clockwise on screen).

const SKIN = '#f6c79c';
const STEEL = '#cdd7e0';
const GOLD = '#f4b836';
const LEATHER = '#7a4a2c';

// Writes the screen position of local point (x, y) into `out[key]` (sword tips for trails).
function mark(ctx, out, key, x, y) {
  if (!out) return;
  const m = ctx.getTransform();
  out[key] = { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f };
}

// A leg from the hip: thigh, shin and a boot pointing forward.
function leg(ctx, x, y, hip, knee, pants, boot, len = 11, r = 4.4) {
  at(ctx, x, y, hip, () => {
    blob(ctx, capsule(0, 0, 0, len, r, r * 0.9), pants, { depth: 2 });
    at(ctx, 0, len, knee, () => {
      blob(ctx, capsule(0, 0, 0, len, r * 0.9, r * 0.82), pants, { depth: 2 });
      at(ctx, 0, len, -hip - knee, () => {
        blob(ctx, smooth([[-4.6, -5], [2.5, -5.2], [8.6, -1.6], [9, 2.6], [-5, 2.8]], 0.9), boot, { depth: 2 });
      });
    });
  });
}

// An arm from the shoulder; `hand(ctx)` draws whatever is held, in the hand's frame
// (origin at the palm, +x along the forearm's forward side).
function arm(ctx, x, y, shoulder, elbow, sleeve, glove, hand, len = 9.5, r = 3.9) {
  at(ctx, x, y, shoulder, () => {
    blob(ctx, capsule(0, 0, 0, len, r, r * 0.9), sleeve, { depth: 1.8 });
    at(ctx, 0, len, elbow, () => {
      blob(ctx, capsule(0, 0, 0, len * 0.92, r * 0.88, r * 0.8), glove, { depth: 1.6 });
      at(ctx, 0, len * 0.92 + 1.5, 0, () => {
        if (hand) hand(ctx);
        else blob(ctx, circle(0, 0, r * 0.98), glove, { depth: 1.4 });
      });
    });
  });
}

// ---- Hero ----

function sword(ctx, P, out, look) {
  at(ctx, 0, 0, P.sword, () => {
    // Grip, pommel and crossguard.
    blob(ctx, roundRect(-9, -2.2, 12, 4.4, 2), LEATHER, { depth: 1.2 });
    blob(ctx, circle(-10, 0, 3.2), GOLD, { depth: 1.2 });
    // Blade with a fuller and a bright edge.
    const blade = poly([[5, -3.6], [42, -3.2], [52, 0], [42, 3.2], [5, 3.6]]);
    if (look.rage) glow(ctx, 30, 0, 26, '#ff5a2a', 0.45);
    blob(ctx, blade, look.rage ? '#ffd2b8' : '#e9eff5', { depth: 1.8, ow: 2.2 });
    line(ctx, (c) => { c.moveTo(8, 0); c.lineTo(40, 0); }, '#a9b6c4', 1.6);
    line(ctx, (c) => { c.moveTo(7, -2.2); c.lineTo(42, -2); }, '#ffffff', 1.1, 0.9);
    blob(ctx, roundRect(2, -8, 4.6, 16, 2.2), GOLD, { depth: 1.4 });
    blob(ctx, circle(4.3, 0, 1.9), '#d23c3c', { ow: 1.2, depth: 0.6 });
    mark(ctx, out, 'tip', 52, 0);
    mark(ctx, out, 'base', 12, 0);
    // The gloved hand wraps the grip.
    blob(ctx, ellipse(0, 0, 4.4, 4.2), LEATHER, { depth: 1.4 });
  });
}

function heroHead(ctx, P, look) {
  // Plume sweeps back from the crest.
  at(ctx, 1, -18, P.plume * 0.12, () => {
    blob(ctx, smooth([[0, 0], [-6, -9], [-17, -12 - P.plume * 1.5], [-29, -8 - P.plume * 3], [-24, -3], [-14, -1], [-6, 3]]), '#e0413b', { depth: 2.6 });
    line(ctx, (c) => { c.moveTo(-5, -4); c.quadraticCurveTo(-15, -8, -24, -6 - P.plume * 2.4); }, darker('#e0413b', 0.45), 1.6);
  });
  // Face.
  blob(ctx, circle(0, 0, 15.5), SKIN, { depth: 3 });
  blob(ctx, ellipse(-3.5, 3, 3.4, 4.2), SKIN, { depth: 1.2 });
  flat(ctx, ellipse(9, 7.5, 3.4, 2.2), '#f29a8a', 0.55);
  // Helmet: dome over the top and back with an open face.
  const helm = smooth([[-17.5, 7], [-18, -6], [-11, -16.5], [1, -19], [12.5, -14], [17.5, -5], [16.2, -1.5], [7, -3.6], [-2.5, -2], [-6.5, 8.5], [-13, 11]], 0.95);
  blob(ctx, helm, STEEL, { depth: 3.4 });
  line(ctx, (c) => { c.moveTo(-15, -9); c.quadraticCurveTo(-1, -21, 14, -9); }, GOLD, 2.6);
  flat(ctx, circle(-12, 3, 1.4), '#7e8a99');
  flat(ctx, circle(-9, -9.5, 1.4), '#7e8a99');
  // Eye, brow and mouth.
  const blink = P.blink;
  eye(ctx, 9.2, 3.4, 4, { lx: 0.7, blink, angry: 0.55 + P.mouth * 0.4, pupil: look.rage ? '#c01818' : INK });
  if (P.mouth > 0.4) blob(ctx, ellipse(11, 10, 2.6, 2.2 * P.mouth), '#7a1f24', { ow: 1.4, shade: false, noLight: true });
  else line(ctx, (c) => { c.moveTo(8, 10.5); c.quadraticCurveTo(11, 11.6, 13.5, 9.8); }, INK, 1.6);
}

const HERO_REST = {
  x: 0, y: 0, lean: 0, sq: 1, head: 0, armF: -0.45, elbowF: -0.85, sword: 0.75, armB: 0.3, elbowB: -0.5,
  legF: -0.2, kneeF: 0.15, legB: 0.24, kneeB: 0.12, cape: 0, plume: 0, blink: 0, mouth: 0, trail: 0, glow: 0,
};

function drawHero(ctx, P, look, out) {
  const sx = 2 - P.sq;
  at(ctx, P.x, P.y, 0, () => {
    at(ctx, 0, 0, 0, () => {
      // Upper-body frame pivots at the hips.
      const upper = (fn) => at(ctx, 0, -24, P.lean, fn);
      // Cape behind everything.
      upper(() => {
        const w = P.cape;
        blob(ctx, smooth([[-1, -24], [-8, -21], [-15, -9], [-22 - w * 2, 4], [-28 - w * 4, 15 + w * 2], [-17, 14 - w], [-8, 9], [-3, -6]], 0.9), '#c8353a', { depth: 3.4 });
      });
      // Back arm and leg.
      upper(() => arm(ctx, -4.5, -18.5, P.armB, P.elbowB, '#2f5db8', STEEL, null));
      leg(ctx, -3.5, -24, P.legB, P.kneeB, '#4b3d5c', '#6b4128');
      leg(ctx, 3, -24, P.legF, P.kneeF, '#5a4a6e', '#7d4c2e');
      upper(() => {
        // Tunic skirt, torso, breastplate and belt.
        blob(ctx, poly([[-11, -2], [11, -2], [13.5, 8], [-12.5, 8]]), '#2f5db8', { depth: 2.4 });
        blob(ctx, smooth([[-10.5, 1], [-11.5, -11], [-9, -21.5], [0, -25], [9.5, -21.5], [11.5, -11], [10.5, 1], [0, 3]], 0.9), '#3b6fd6', { depth: 3 });
        blob(ctx, smooth([[-8, -5], [-8.5, -17], [0, -22.5], [8.5, -17], [8, -5], [0, -2.5]], 0.85), STEEL, { depth: 2.6 });
        line(ctx, (c) => { c.moveTo(0, -20); c.lineTo(0, -5); }, '#9aa8b8', 1.4);
        blob(ctx, roundRect(-11.5, -5, 23, 6.4, 2.6), LEATHER, { depth: 1.6 });
        blob(ctx, roundRect(1.5, -5.6, 7, 7.6, 1.8), GOLD, { depth: 1.4, ow: 1.8 });
        // Head pivots at the neck.
        at(ctx, 1.5, -24, P.head, () => at(ctx, 1.5, -14, 0, () => heroHead(ctx, P, look)));
        // Front arm with the sword; pauldron over the shoulder.
        arm(ctx, 4.5, -18.5, P.armF, P.elbowF, '#3b6fd6', STEEL, (c) => sword(c, P, out, look));
        blob(ctx, ellipse(4, -19.5, 7, 5.6, -0.2 + P.armF * 0.3), STEEL, { depth: 2 });
        flat(ctx, circle(4, -20.5, 1.3), '#7e8a99');
      });
    }, sx, P.sq);
  });
}

// Attack variants: 0 overhead chop, 1 rising slash, 2 (crits) a leaping two-step chop.
// Keys are offsets from HERO_REST. The chop swings the arm over the top (offsets past π); the
// animator wraps joint angles, and each key list jumps by 2π at the strike so the recovery
// takes the short way back. Blade angle on screen = armF + elbowF + sword (+ lean).
const TAU = Math.PI * 2;

function chop(p, big) {
  const j = big ? 1.25 : 1;
  return {
    armF: track(p, [[0, 0], [0.2, 2.9, 'linear'], [0.4, 5.7, 'outCubic'], [0.4, 5.7 - TAU], [0.62, 5.9 - TAU], [1, 0]]),
    elbowF: track(p, [[0, 0], [0.2, 0.25], [0.4, 0.6], [0.62, 0.65], [1, 0]]),
    sword: track(p, [[0, 0], [0.2, 0.75], [0.4, 1.03, 'outCubic'], [0.62, 1.15], [1, 0]]),
    lean: track(p, [[0, 0], [0.2, -0.12 * j], [0.4, 0.24 * j], [1, 0]]),
    x: track(p, [[0, 0], [0.2, -2 * j], [0.4, 17 * j, 'outCubic'], [0.68, 14 * j], [1, 0]]),
    y: big ? track(p, [[0, 0], [0.18, 0], [0.3, -12, 'out'], [0.42, 0, 'in'], [1, 0]]) : 0,
    sq: track(p, [[0, 0], [0.18, -0.07 * j], [0.4, 0.07 * j], [0.55, -0.04 * j], [1, 0]]),
    legF: track(p, [[0, 0], [0.4, -0.5 * j], [1, 0]]),
    legB: track(p, [[0, 0], [0.4, 0.4 * j], [1, 0]]),
    armB: track(p, [[0, 0], [0.18, -0.6], [0.4, 0.9], [1, 0]]),
    trail: p > 0.2 && p < 0.5 ? 1 : 0,
    mouth: bump(p, 0.3, 0.5),
    cape: track(p, [[0, 0], [0.4, 1.4 * j], [1, 0]]),
    glow: big ? bump(p, 0.2, 0.6) : 0,
  };
}

function heroAttack(p, v) {
  if (v === 1) {
    return {
      armF: track(p, [[0, 0], [0.18, 1.35, 'linear'], [0.42, -2.15, 'outCubic'], [0.62, -2.3], [1, 0]]),
      elbowF: track(p, [[0, 0], [0.18, 0.55], [0.42, 0.85], [0.62, 0.8], [1, 0]]),
      sword: track(p, [[0, 0], [0.18, 1.05], [0.42, 0.65, 'outCubic'], [1, 0]]),
      lean: track(p, [[0, 0], [0.18, 0.16], [0.42, -0.16], [1, 0]]),
      x: track(p, [[0, 0], [0.18, 3], [0.42, 15, 'outCubic'], [0.7, 12], [1, 0]]),
      sq: track(p, [[0, 0], [0.18, -0.07], [0.42, 0.06], [1, 0]]),
      legF: track(p, [[0, 0], [0.42, -0.45], [1, 0]]),
      legB: track(p, [[0, 0], [0.42, 0.35], [1, 0]]),
      armB: track(p, [[0, 0], [0.42, 0.8], [1, 0]]),
      trail: p > 0.2 && p < 0.52 ? 1 : 0,
      mouth: bump(p, 0.3, 0.5),
      cape: track(p, [[0, 0], [0.45, 1.6], [1, 0]]),
    };
  }
  return chop(p, v === 2);
}

export const hero = {
  height: 92,
  rest: HERO_REST,
  angles: new Set(['armF', 'armB', 'sword', 'elbowF']),
  idle(t) {
    const b = Math.sin(t * 2.6);
    return {
      sq: 1 + b * 0.016,
      armF: HERO_REST.armF + Math.sin(t * 2.6 - 0.6) * 0.05,
      sword: HERO_REST.sword + Math.sin(t * 2.6 - 1) * 0.04,
      cape: Math.sin(t * 2.1),
      plume: Math.sin(t * 2.6 + 1),
      blink: t % 3.7 < 0.13 ? Math.sin((t % 3.7) / 0.13 * Math.PI) : 0,
      head: Math.sin(t * 1.3) * 0.03,
    };
  },
  actions: {
    attack: { dur: 0.26, channel: 'body', pose: heroAttack },
    cheer: {
      dur: 1.1, channel: 'body',
      pose: (p) => ({
        armF: track(p, [[0, 0], [0.2, 3.45, 'outBack'], [0.8, 3.45], [1, 0]]),
        elbowF: track(p, [[0, 0], [0.2, 0.7], [0.8, 0.7], [1, 0]]),
        sword: track(p, [[0, 0], [0.2, 1.1], [0.8, 1.1], [1, 0]]),
        y: track(p, [[0, 0], [0.12, -10, 'out'], [0.24, 0, 'in'], [1, 0]]),
        mouth: bump(p, 0.15, 0.3),
        lean: track(p, [[0, 0], [0.2, -0.1], [0.8, -0.1], [1, 0]]),
      }),
    },
  },
  draw: drawHero,
};

// ---- Companions (dungeon) ----

const ROLE_POSE = {
  tank:   { armF: -0.5, elbowF: -0.6, tool: -1.2 },
  dps:    { armF: -1.25, elbowF: -0.2, tool: 0 },
  mage:   { armF: -0.6, elbowF: -0.7, tool: -1.45 },
  healer: { armF: -0.6, elbowF: -0.7, tool: -1.45 },
};

function companionTool(ctx, P, look) {
  const role = look.role;
  at(ctx, 0, 0, P.tool, () => {
    if (role === 'dps' && look.actor === 'hood') {
      // Bow held upright; the string pulls back with P.draw.
      const d = P.draw * 9;
      line(ctx, (c) => { c.moveTo(0, -17); c.lineTo(-d, 0); c.lineTo(0, 17); }, '#f2ead8', 1.2);
      blob(ctx, (c) => { c.moveTo(0, -18); c.quadraticCurveTo(11, 0, 0, 18); c.quadraticCurveTo(8, 0, 0, -18); }, '#8a5530', { depth: 1, ow: 1.8 });
      if (P.draw > 0.1) blob(ctx, roundRect(-d, -0.9, 20, 1.8, 0.9), '#e8dcc0', { ow: 1.2, shade: false, noLight: true });
    } else if (role === 'mage' || role === 'healer') {
      // Staff with a glowing head.
      blob(ctx, roundRect(-26, -1.8, 44, 3.6, 1.8), '#8a5530', { depth: 1 });
      const c0 = look.colors.trim;
      const gem = role === 'healer' ? '#b8f07a' : look.shotColor || '#7ff4ff';
      glow(ctx, 21, 0, 12 + P.cast * 10, gem, 0.5 + P.cast * 0.4);
      blob(ctx, star(21, 0, 6.5, 3.4, role === 'healer' ? 4 : 5, P.cast), gem, { depth: 1.4, ow: 1.8 });
      blob(ctx, roundRect(14, -3, 4, 6, 1.5), c0, { depth: 1, ow: 1.4 });
    } else {
      // Sword (tank and helm dps).
      blob(ctx, roundRect(-7, -1.8, 9, 3.6, 1.6), LEATHER, { depth: 1 });
      blob(ctx, poly([[3, -2.8], [30, -2.4], [37, 0], [30, 2.4], [3, 2.8]]), '#e9eff5', { depth: 1.4, ow: 2 });
      blob(ctx, roundRect(1, -6, 3.6, 12, 1.6), GOLD, { depth: 1, ow: 1.6 });
    }
    blob(ctx, circle(0, 0, 3.4), SKIN, { depth: 1 });
  });
}

function companionHead(ctx, P, look) {
  const { main, trim } = look.colors;
  const outfit = look.actor;
  if (outfit === 'hat') {
    blob(ctx, circle(0, 0, 13), SKIN, { depth: 2.6 });
    // Beard or hair below the brim.
    blob(ctx, smooth([[-13, -2], [-11, 8], [-4, 11], [2, 9], [-2, 2], [-8, -3]]), look.hair || '#e8e0d0', { depth: 1.6 });
    eye(ctx, 7, 1.5, 3.3, { lx: 0.7, blink: P.blink });
    // Wide-brimmed pointy hat.
    blob(ctx, ellipse(1, -6, 20, 4.6, -0.05), main, { depth: 1.8 });
    blob(ctx, smooth([[-11, -7], [-6, -16], [-2, -26], [-9, -38 - P.hat * 2], [4, -27], [9, -15], [12, -7]], 0.9), main, { depth: 2.8 });
    blob(ctx, poly([[-10.5, -10], [10.5, -10], [11.5, -6.5], [-11, -6.5]]), trim, { depth: 1, ow: 1.8 });
    blob(ctx, star(0, -9, 3, 1.4, 5), GOLD, { ow: 1.2, depth: 0.6 });
  } else if (outfit === 'helm') {
    blob(ctx, circle(0, 0, 13), SKIN, { depth: 2.6 });
    eye(ctx, 7.5, 2.5, 3.3, { lx: 0.7, blink: P.blink, angry: 0.5 });
    // Closed-top helmet with a T visor opening and a crest.
    blob(ctx, smooth([[-6, -14], [4, -20], [10, -26 - P.hat * 2], [6, -16], [-2, -12]]), trim, { depth: 1.6 });
    blob(ctx, smooth([[-14.5, 9], [-15, -6], [-8, -14.5], [3, -15.5], [13, -10], [15, -2], [13.5, -0.5], [4, -1.5], [-3, 1], [-6, 10]], 0.95), main, { depth: 3 });
    line(ctx, (c) => { c.moveTo(-12, -9); c.quadraticCurveTo(0, -18, 12, -8); }, darker(main, 0.25), 2);
  } else {
    blob(ctx, circle(0, 0, 12.6), SKIN, { depth: 2.6 });
    eye(ctx, 7, 2, 3.3, { lx: 0.7, blink: P.blink, angry: look.role === 'dps' ? 0.4 : 0 });
    // Hood with a pointed back and a shadowed rim around the face.
    blob(ctx, smooth([[-15, 12], [-17, -2], [-12, -13], [-1, -16.5], [11, -12], [15, -4], [9, -8], [-1, -9], [-6, -2], [-8, 9]], 0.95), main, { depth: 3 });
    line(ctx, (c) => { c.moveTo(14, -4); c.quadraticCurveTo(5, -10, -5, -4); c.quadraticCurveTo(-8, 3, -7, 10); }, trim, 2.4);
  }
  line(ctx, (c) => { c.moveTo(6.5, 8); c.quadraticCurveTo(9, 9.4, 11, 7.6); }, INK, 1.4);
}

function drawCompanion(ctx, P, look, out) {
  const { main, trim } = look.colors;
  const sx = 2 - P.sq;
  at(ctx, P.x, P.y, 0, () => at(ctx, 0, 0, 0, () => {
    const upper = (fn) => at(ctx, 0, -20, P.lean, fn);
    if (look.actor === 'hood') upper(() => blob(ctx, smooth([[-2, -20], [-9, -16], [-15, 0], [-18, 13 + P.cape], [-6, 9]], 0.9), trim, { depth: 2 }));
    upper(() => {
      if (look.role === 'tank') {
        // Big shield on the back arm, held in front of the body.
        at(ctx, 6, -8, 0, () => {
          blob(ctx, smooth([[-8, -13], [8, -13], [9, 2], [0, 14], [-9, 2]], 0.7), trim, { depth: 2.6 });
          blob(ctx, smooth([[-5, -9], [5, -9], [5.5, 1], [0, 9], [-5.5, 1]], 0.7), main, { depth: 1.6, ow: 1.6 });
        });
      } else {
        arm(ctx, -3.5, -15, P.armB, P.elbowB, trim, SKIN, null, 8, 3.4);
      }
    });
    leg(ctx, -3, -20, P.legB, 0.1, darker(trim, 0.2), '#6b4128', 9.5, 3.8);
    leg(ctx, 2.5, -20, P.legF, 0.12, trim, '#7d4c2e', 9.5, 3.8);
    upper(() => {
      const robe = look.actor === 'hat';
      blob(ctx, robe
        ? smooth([[-9, -19], [9, -19], [12, 0], [14, 19], [-13, 19], [-11, 0]], 0.8)
        : smooth([[-9, 1], [-10, -10], [-7.5, -18.5], [0, -21], [8, -18.5], [10, -10], [9, 1], [0, 3]], 0.9), main, { depth: 2.8 });
      blob(ctx, roundRect(-10, -5, 20, 5, 2.2), robe ? GOLD : LEATHER, { depth: 1.2, ow: 1.8 });
      at(ctx, 1.5, -20, P.head, () => at(ctx, 1, -12, 0, () => companionHead(ctx, P, look)));
      arm(ctx, 4, -15, P.armF, P.elbowF, main, SKIN, (c) => companionTool(c, P, look), 8, 3.4);
      mark(ctx, out, 'muzzle', 18, -15);
    });
  }, sx, P.sq));
}

function companionIdle(t, look) {
  const r = ROLE_POSE[look.role] || ROLE_POSE.dps;
  return {
    sq: 1 + Math.sin(t * 2.8) * 0.02,
    armF: r.armF + Math.sin(t * 2.8 - 0.5) * 0.05,
    elbowF: r.elbowF,
    tool: r.tool,
    cape: Math.sin(t * 2.2) * 2,
    hat: Math.sin(t * 2.4),
    blink: t % 4.1 < 0.13 ? 1 : 0,
    head: Math.sin(t * 1.4) * 0.04,
  };
}

function companionAttack(p, v, look) {
  const role = look.role;
  if (role === 'dps' && look.actor === 'hood') {
    return { draw: track(p, [[0, 0], [0.45, 1, 'out'], [0.55, 0, 'outCubic'], [1, 0]]), lean: track(p, [[0, 0], [0.45, -0.08], [0.6, 0.04], [1, 0]]), x: track(p, [[0, 0], [0.55, -2], [1, 0]]) };
  }
  if (role === 'mage' || role === 'healer') {
    return {
      armF: track(p, [[0, 0], [0.35, -1.2, 'out'], [0.6, -1.4], [1, 0]]),
      cast: bump(p, 0.35, 0.5),
      y: track(p, [[0, 0], [0.3, -4, 'out'], [0.6, 0], [1, 0]]),
    };
  }
  return {
    armF: track(p, [[0, 0], [0.25, 2.4, 'out'], [0.5, -1.2, 'outCubic'], [1, 0]]),
    tool: track(p, [[0, 0], [0.25, 0.6], [0.5, 0.4], [1, 0]]),
    x: track(p, [[0, 0], [0.5, 9, 'outCubic'], [1, 0]]),
    lean: track(p, [[0, 0], [0.25, -0.12], [0.5, 0.2], [1, 0]]),
  };
}

const COMPANION_REST = {
  x: 0, y: 0, lean: 0, sq: 1, head: 0, armF: -0.6, elbowF: -0.6, tool: -1.2, armB: 0.3, elbowB: -0.4,
  legF: -0.15, legB: 0.2, cape: 0, hat: 0, blink: 0, draw: 0, cast: 0, alpha: 1, fall: 0,
};

const hurt = {
  dur: 0.3, channel: 'hurt',
  pose: (p) => ({ x: track(p, [[0, 0], [0.2, -6, 'out'], [1, 0]]), lean: track(p, [[0, 0], [0.2, -0.2, 'out'], [1, 0]]), sq: track(p, [[0, 0], [0.15, -0.08], [1, 0]]) }),
};

const companionActor = (actor) => ({
  height: 76,
  rest: COMPANION_REST,
  idle: companionIdle,
  actions: {
    attack: { dur: 0.45, channel: 'body', pose: companionAttack },
    hurt,
    down: { dur: 0.5, hold: true, channel: 'down', pose: (p) => ({ lean: track(p, [[0, 0], [1, -1.25, 'outCubic']]), y: track(p, [[0, 0], [1, 6]]), x: track(p, [[0, 0], [1, -10]]), sq: track(p, [[0, 0], [1, -0.1]]) }) },
  },
  draw: (ctx, P, look, out) => drawCompanion(ctx, P, { ...look, actor }, out),
});

export const hood = companionActor('hood');
export const hat = companionActor('hat');
export const helm = companionActor('helm');

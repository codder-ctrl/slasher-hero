import {
  INK, at, blob, line, flat, glow, ellipse, circle, roundRect, smooth, poly, capsule, star, darker, lighter,
} from './paint.js';
import { ACTORS } from './actors.js';
import { PETS, COMPANIONS, ZONES } from './config.js';
import { paintBackdrop } from './scenery.js';

// UI icons in the same vector style, drawn into a 64-unit square. `ICONS` holds the plain
// icons; names starting with "actor:" are portraits of an actor in its resting pose.
// iconUrl() renders to a PNG data URL sized for the screen's pixel density.

const GOLD = '#f6c03a';

export const ICONS = {
  coinIcon(g) {
    blob(g, circle(32, 32, 24), GOLD, { depth: 5, light: '#fff2a8' });
    line(g, circle(32, 32, 16.5), '#c88a1a', 2.4, 0.8);
    blob(g, star(32, 33, 9, 4, 5), '#ffe07a', { ow: 1.8, depth: 1.4 });
  },
  gem(g) {
    blob(g, poly([[12, 24], [22, 12], [42, 12], [52, 24], [32, 54]]), '#4ab0ff', { depth: 4, light: '#c8f0ff' });
    line(g, (c) => { c.moveTo(12, 24); c.lineTo(52, 24); c.moveTo(22, 12); c.lineTo(27, 24); c.lineTo(32, 54); c.lineTo(37, 24); c.lineTo(42, 12); }, '#2a6fc0', 2, 0.9);
    flat(g, poly([[24, 15], [29, 15], [26, 22]]), '#ffffff', 0.85);
  },
  crystal(g) {
    blob(g, poly([[14, 52], [12, 34], [20, 24], [26, 38], [24, 52]]), '#3fc08a', { depth: 2.4, light: '#b8ffd8' });
    blob(g, poly([[40, 52], [38, 30], [46, 20], [52, 32], [50, 52]]), '#3fc08a', { depth: 2.4, light: '#b8ffd8' });
    blob(g, poly([[24, 54], [22, 24], [32, 8], [42, 24], [40, 54]]), '#5ae0a0', { depth: 3.4, light: '#d8ffe8' });
    line(g, (c) => { c.moveTo(32, 10); c.lineTo(32, 52); }, '#2a9a6a', 1.6, 0.8);
  },
  soul(g) {
    glow(g, 32, 36, 30, '#c879f0', 0.5);
    blob(g, (c) => { c.moveTo(32, 6); c.bezierCurveTo(40, 18, 52, 26, 50, 40); c.bezierCurveTo(48, 54, 16, 54, 14, 40); c.bezierCurveTo(13, 30, 22, 26, 24, 18); c.bezierCurveTo(28, 24, 30, 26, 30, 30); c.bezierCurveTo(34, 22, 34, 14, 32, 6); c.closePath(); }, '#a855e0', { depth: 4, light: '#e8c8ff' });
    blob(g, ellipse(32, 41, 8, 9), '#f0d8ff', { ow: 1.8, depth: 2 });
  },
  swordIcon(g) {
    at(g, 32, 32, -Math.PI / 4, () => {
      blob(g, poly([[-6, -4], [20, -4], [28, 0], [20, 4], [-6, 4]]), '#e9eff5', { depth: 2 });
      line(g, (c) => { c.moveTo(-4, 0); c.lineTo(20, 0); }, '#a9b6c4', 1.6);
      blob(g, roundRect(-10, -12, 5, 24, 2.4), GOLD, { depth: 1.4 });
      blob(g, roundRect(-22, -3.4, 13, 6.8, 3), '#7a4a2c', { depth: 1.2 });
      blob(g, circle(-24, 0, 4.4), GOLD, { depth: 1.2 });
    });
  },
  target(g) {
    blob(g, circle(30, 34, 22), '#f4ead8', { depth: 3 });
    blob(g, circle(30, 34, 15), '#e0413b', { depth: 2.4 });
    blob(g, circle(30, 34, 8), '#f4ead8', { depth: 1.4 });
    flat(g, circle(30, 34, 3.4), '#e0413b');
    at(g, 30, 34, -0.75, () => {
      line(g, (c) => { c.moveTo(0, 0); c.lineTo(32, 0); }, '#7a4a2c', 3.4);
      blob(g, poly([[22, -6], [32, 0], [22, 6], [25, 0]]), '#f4f0ea', { ow: 1.6, depth: 0.8 });
    });
  },
  bolt(g) {
    glow(g, 32, 32, 28, '#ffd060', 0.4);
    blob(g, poly([[36, 4], [14, 36], [29, 36], [24, 60], [50, 24], [34, 24], [42, 4]]), '#ffd23a', { depth: 3, light: '#fff6c0' });
  },
  bag(g) {
    blob(g, smooth([[18, 24], [12, 42], [16, 56], [48, 56], [52, 42], [46, 24], [32, 20]], 0.9), '#b8844a', { depth: 4 });
    blob(g, smooth([[22, 22], [18, 10], [28, 14], [32, 8], [36, 14], [46, 10], [42, 22]], 0.8), '#b8844a', { depth: 2 });
    blob(g, roundRect(20, 20, 24, 5, 2.4), '#e0413b', { depth: 1, ow: 1.8 });
    blob(g, circle(32, 40, 8), GOLD, { depth: 1.6, ow: 1.8 });
    flat(g, star(32, 40.5, 4, 1.8, 5), '#c88a1a');
  },
  flame(g) {
    glow(g, 32, 38, 28, '#ff8a3a', 0.45);
    blob(g, (c) => { c.moveTo(32, 4); c.bezierCurveTo(44, 18, 54, 30, 50, 44); c.bezierCurveTo(46, 58, 18, 58, 14, 44); c.bezierCurveTo(12, 34, 20, 28, 22, 20); c.bezierCurveTo(26, 26, 28, 28, 28, 32); c.bezierCurveTo(34, 24, 34, 12, 32, 4); c.closePath(); }, '#ff6a2a', { depth: 4, light: '#ffd060' });
    blob(g, (c) => { c.moveTo(32, 30); c.bezierCurveTo(40, 38, 42, 44, 40, 48); c.bezierCurveTo(38, 54, 26, 54, 24, 48); c.bezierCurveTo(22, 42, 28, 38, 32, 30); c.closePath(); }, '#ffe07a', { ow: 1.6, depth: 1.4 });
  },
  paw(g) {
    blob(g, smooth([[20, 40], [24, 30], [32, 27], [40, 30], [44, 40], [42, 50], [32, 52], [22, 50]], 0.9), '#cf9a5e', { depth: 3 });
    for (const [x, y] of [[16, 26], [25, 16], [39, 16], [48, 26]]) blob(g, ellipse(x, y, 6, 7.4), '#cf9a5e', { depth: 1.6 });
  },
  menu(g) {
    // A gear.
    blob(g, (c) => {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 ? 19 : 25;
        const a2 = a + Math.PI / 16;
        c[i ? 'lineTo' : 'moveTo'](32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
        c.lineTo(32 + Math.cos(a2) * r, 32 + Math.sin(a2) * r);
      }
      c.closePath();
    }, '#a9b6c4', { depth: 3.4 });
    blob(g, circle(32, 32, 8), '#5a6a7a', { depth: 1.4 });
  },
  lock(g) {
    line(g, (c) => { c.moveTo(22, 30); c.lineTo(22, 22); c.arc(32, 22, 10, Math.PI, 0); c.lineTo(42, 30); }, INK, 9);
    line(g, (c) => { c.moveTo(22, 30); c.lineTo(22, 22); c.arc(32, 22, 10, Math.PI, 0); c.lineTo(42, 30); }, '#a9b6c4', 4.6);
    blob(g, roundRect(14, 28, 36, 28, 6), GOLD, { depth: 3 });
    blob(g, circle(32, 40, 4), '#7a4a2c', { ow: 1.4, depth: 0.8 });
  },
  skRage(g) {
    glow(g, 32, 32, 30, '#ff3a2a', 0.5);
    blob(g, (c) => { c.moveTo(32, 2); c.bezierCurveTo(46, 16, 56, 28, 52, 44); c.bezierCurveTo(48, 60, 16, 60, 12, 44); c.bezierCurveTo(10, 32, 20, 26, 22, 16); c.bezierCurveTo(26, 22, 28, 26, 28, 30); c.bezierCurveTo(34, 22, 34, 10, 32, 2); c.closePath(); }, '#e0302a', { depth: 4, light: '#ff9a6a' });
    // Angry eyes.
    blob(g, poly([[20, 36], [29, 39], [28, 44], [21, 42]]), '#fff2a0', { ow: 1.6, depth: 0.6 });
    blob(g, poly([[44, 36], [35, 39], [36, 44], [43, 42]]), '#fff2a0', { ow: 1.6, depth: 0.6 });
  },
  // Savaş Narası boosts the pet: a full food bowl with a bone on top.
  skTreat(g) {
    glow(g, 32, 34, 30, '#ffd060', 0.45);
    blob(g, capsule(14, 22, 48, 14, 4.6), '#f6ecd6', { depth: 1.6, light: '#ffffff' });
    for (const [x, y] of [[13, 19], [14, 26], [48, 10], [50, 17]]) blob(g, circle(x, y, 5.2), '#f6ecd6', { depth: 1.4, light: '#ffffff' });
    blob(g, smooth([[10, 34], [54, 34], [50, 50], [44, 55], [20, 55], [14, 50]], 0.7), '#d8443e', { depth: 3 });
    blob(g, ellipse(32, 34, 22, 6), '#8a5a32', { depth: 1.6, ow: 2, light: '#c08a50' });
    for (const [x, y] of [[24, 33], [31, 31], [38, 33], [44, 32], [20, 35]]) flat(g, circle(x, y, 2.6), '#b8844a');
    line(g, (c) => { c.moveTo(16, 44); c.quadraticCurveTo(32, 48, 48, 44); }, '#f6c03a', 2.4);
    flat(g, star(52, 8, 5, 1.4, 4), '#ffffff');
  },
  skStorm(g) {
    glow(g, 32, 32, 30, '#7ff4ff', 0.45);
    for (let i = 0; i < 3; i++) {
      at(g, 32, 32, (i / 3) * Math.PI * 2, () => {
        blob(g, poly([[2, -3], [24, -2.4], [29, 0], [24, 2.4], [2, 3]]), '#d8fbff', { ow: 1.8, depth: 1, light: '#ffffff' });
        blob(g, roundRect(-1, -6, 3.6, 12, 1.6), GOLD, { ow: 1.4, depth: 0.6 });
      });
    }
    blob(g, circle(32, 32, 5), '#4aa8f0', { ow: 1.6, depth: 1 });
  },
  skEye(g) {
    blob(g, (c) => { c.moveTo(6, 32); c.quadraticCurveTo(32, 6, 58, 32); c.quadraticCurveTo(32, 58, 6, 32); c.closePath(); }, '#ffffff', { depth: 3, shade: '#c8d8e8' });
    blob(g, circle(32, 32, 12), '#3a8ae0', { ow: 2, depth: 2, light: '#8fd0ff' });
    flat(g, circle(32, 32, 6), INK);
    flat(g, circle(28, 28, 2.6), '#ffffff');
  },
  skCoins(g) {
    for (let i = 0; i < 4; i++) blob(g, ellipse(26, 52 - i * 6, 15, 5), GOLD, { depth: 1.6, ow: 2, light: '#fff2a8' });
    blob(g, circle(44, 24, 12), GOLD, { depth: 2.4, light: '#fff2a8' });
    flat(g, star(44, 24.5, 6, 2.6, 5), '#c88a1a');
    flat(g, star(16, 18, 6, 1.6, 4), '#ffffff');
  },
};

// Portrait of an actor (resting pose, facing right), fitted into the square.
function portrait(g, id, look) {
  const def = ACTORS[id];
  const P = { ...def.rest, ...(def.idle ? def.idle(0.4, look) : null), y: 0, blink: 0, alpha: 1 };
  const h = def.height;
  const s = 52 / (h + 4);
  // Flying actors are drawn around their origin rather than standing on it.
  at(g, 32, def.hover ? 40 : 60, 0, () => def.draw(g, P, look, null), s);
}

// ---- Hero defense and quests ----

ICONS.heart = (g) => {
  glow(g, 32, 34, 28, '#ff6a6a', 0.35);
  blob(g, (c) => { c.moveTo(32, 54); c.bezierCurveTo(10, 40, 6, 24, 14, 16); c.bezierCurveTo(22, 8, 30, 12, 32, 20); c.bezierCurveTo(34, 12, 42, 8, 50, 16); c.bezierCurveTo(58, 24, 54, 40, 32, 54); c.closePath(); }, '#e0413b', { depth: 4, light: '#ff9a8a' });
  flat(g, ellipse(21, 22, 4, 6, -0.6), '#ffffff', 0.7);
};

ICONS.shield = (g) => {
  blob(g, (c) => { c.moveTo(32, 6); c.quadraticCurveTo(44, 12, 54, 12); c.quadraticCurveTo(56, 42, 32, 58); c.quadraticCurveTo(8, 42, 10, 12); c.quadraticCurveTo(20, 12, 32, 6); c.closePath(); }, '#9aa8b8', { depth: 4, light: '#e4ebf2' });
  blob(g, (c) => { c.moveTo(32, 14); c.quadraticCurveTo(40, 18, 47, 18); c.quadraticCurveTo(48, 40, 32, 50); c.quadraticCurveTo(16, 40, 17, 18); c.quadraticCurveTo(24, 18, 32, 14); c.closePath(); }, '#3b6fd6', { depth: 2.4, ow: 2 });
  blob(g, star(32, 32, 8, 3.4, 5), GOLD, { ow: 1.6, depth: 1 });
};

ICONS.medal = (g) => {
  blob(g, poly([[18, 4], [28, 4], [36, 26], [26, 26]]), '#3b6fd6', { depth: 1.6 });
  blob(g, poly([[46, 4], [36, 4], [28, 26], [38, 26]]), '#e0413b', { depth: 1.6 });
  glow(g, 32, 40, 24, '#ffd060', 0.4);
  blob(g, circle(32, 40, 17), GOLD, { depth: 3, light: '#fff2a8' });
  line(g, circle(32, 40, 12), '#c88a1a', 2, 0.8);
  blob(g, star(32, 40.5, 8, 3.4, 5), '#fff2a8', { ow: 1.4, depth: 1 });
};

// ---- Equipment ----

const ITEM_COLORS = {
  metal: ['#cdd7e0', '#a8d4f4', '#e8907a', '#ffe48a'],
  accent: [GOLD, '#3b8ae0', '#c43a4a', '#fff2a8'],
  glow: [null, '#7fd0ff', '#ff7a3a', '#ffd23a'],
};

// An item picture: look = { slot, rarity } (rarity -1 draws an empty slot silhouette).
ICONS.item = (g, look = {}) => {
  const r = look.rarity ?? 0;
  const empty = r < 0;
  const metal = empty ? '#b8a890' : ITEM_COLORS.metal[r];
  const accent = empty ? '#a89878' : ITEM_COLORS.accent[r];
  const opts = empty ? { ow: 2, depth: 2, alpha: 0.5 } : { depth: 3 };
  if (!empty && r > 0) glow(g, 32, 32, 26 + r * 3, ITEM_COLORS.glow[r], 0.3 + r * 0.1);
  if (look.slot === 'helm') {
    blob(g, (c) => { c.moveTo(10, 44); c.bezierCurveTo(8, 14, 56, 14, 54, 44); c.lineTo(46, 44); c.lineTo(44, 34); c.lineTo(20, 34); c.lineTo(18, 44); c.closePath(); }, metal, opts);
    if (!empty) {
      blob(g, (c) => { c.moveTo(30, 16); c.quadraticCurveTo(22, 2, 6, 6); c.quadraticCurveTo(16, 10, 18, 20); c.closePath(); }, ['#e0413b', '#3b6fd6', '#8a3fc0', '#ffb43a'][r], { depth: 1.6, ow: 2 });
      line(g, (c) => { c.moveTo(12, 30); c.quadraticCurveTo(32, 16, 52, 30); }, accent, 3);
      if (r >= 2) blob(g, star(32, 22, 4.4, 2, 4), accent, { ow: 1.4, depth: 0.6 });
    }
  } else if (look.slot === 'charm') {
    line(g, (c) => { c.moveTo(14, 8); c.quadraticCurveTo(32, 30, 50, 8); }, empty ? '#a89878' : '#8a5a32', 2.6);
    blob(g, (c) => { c.moveTo(32, 18); c.lineTo(48, 34); c.lineTo(32, 56); c.lineTo(16, 34); c.closePath(); }, accent, opts);
    if (!empty) {
      blob(g, circle(32, 36, 7.5), ['#5ad05a', '#4ab0ff', '#e0413b', '#ffffff'][r], { ow: 1.8, depth: 1.4, light: '#ffffff' });
      flat(g, circle(29.5, 33.5, 2), '#ffffff', 0.8);
    }
  } else {
    at(g, 32, 32, -Math.PI / 4, () => {
      blob(g, poly([[-6, -4.5], [20, -4.5], [29, 0], [20, 4.5], [-6, 4.5]]), metal, opts);
      if (!empty) line(g, (c) => { c.moveTo(-4, 0); c.lineTo(20, 0); }, darker(metal, 0.25), 1.6);
      blob(g, roundRect(-10, -12, 5, 24, 2.4), accent, empty ? opts : { depth: 1.4 });
      blob(g, roundRect(-22, -3.4, 13, 6.8, 3), empty ? '#a89878' : '#7a4a2c', empty ? opts : { depth: 1.2 });
      blob(g, circle(-24, 0, 4.4), accent, empty ? opts : { depth: 1.2 });
    });
  }
  if (!empty && r >= 3) for (const [x, y] of [[50, 12], [12, 50]]) flat(g, star(x, y, 5, 1.4, 4), '#ffffff', 0.9);
};

ICONS.chest = (g) => {
  glow(g, 32, 36, 28, '#ffd060', 0.35);
  blob(g, roundRect(8, 28, 48, 26, 4), '#a8683a', { depth: 3 });
  blob(g, (c) => { c.moveTo(8, 30); c.bezierCurveTo(8, 10, 56, 10, 56, 30); c.closePath(); }, '#c07a44', { depth: 3 });
  blob(g, roundRect(29, 18, 6, 36, 2), GOLD, { depth: 1, ow: 2 });
  blob(g, roundRect(8, 28, 48, 5, 2), GOLD, { depth: 1, ow: 2 });
  blob(g, roundRect(27, 30, 10, 10, 2.5), '#e8c050', { depth: 1, ow: 2 });
  flat(g, circle(32, 35, 1.8), INK);
};

// ---- Small stat symbols ----

ICONS.crownIcon = (g) => {
  glow(g, 32, 34, 26, '#ffd060', 0.35);
  blob(g, poly([[8, 48], [6, 18], [20, 32], [32, 12], [44, 32], [58, 18], [56, 48]]), GOLD, { depth: 3.4, light: '#fff2a8' });
  blob(g, roundRect(6, 44, 52, 10, 3), '#d8961e', { depth: 1.4 });
  flat(g, circle(32, 34, 4), '#e0413b');
  flat(g, circle(19, 38, 3), '#4aa8f0');
  flat(g, circle(45, 38, 3), '#4aa8f0');
};

ICONS.stunIcon = (g) => {
  line(g, ellipse(32, 36, 24, 9), '#c8a84a', 3, 0.8);
  for (const [x, y, r] of [[12, 34, 9], [32, 46, 10], [52, 32, 9], [33, 22, 7]]) blob(g, star(x, y, r, r * 0.45, 5), '#ffe07a', { ow: 1.8, depth: 1.2, light: '#ffffff' });
};

ICONS.comboIcon = (g) => {
  blob(g, roundRect(14, 6, 36, 7, 3), '#8a5a32', { depth: 1 });
  blob(g, roundRect(14, 51, 36, 7, 3), '#8a5a32', { depth: 1 });
  blob(g, (c) => { c.moveTo(18, 13); c.lineTo(46, 13); c.quadraticCurveTo(46, 26, 34, 32); c.quadraticCurveTo(46, 38, 46, 51); c.lineTo(18, 51); c.quadraticCurveTo(18, 38, 30, 32); c.quadraticCurveTo(18, 26, 18, 13); c.closePath(); }, '#d8f4ff', { depth: 2, light: '#ffffff' });
  flat(g, (c) => { c.moveTo(24, 20); c.lineTo(40, 20); c.quadraticCurveTo(36, 27, 32, 29); c.quadraticCurveTo(28, 27, 24, 20); c.closePath(); }, GOLD);
  flat(g, (c) => { c.moveTo(21, 49); c.quadraticCurveTo(32, 38, 43, 49); c.closePath(); }, GOLD);
};

// ---- Top-right menu ----

ICONS.menuList = (g) => {
  for (let i = 0; i < 3; i++) {
    const y = 18 + i * 14;
    blob(g, circle(15, y, 5), '#fff8e6', { ow: 2.4, depth: 1.2 });
    blob(g, roundRect(25, y - 4.5, 28, 9, 4.5), '#fff8e6', { ow: 2.4, depth: 1.4 });
  }
};

ICONS.daily = (g) => {
  glow(g, 32, 36, 30, '#ffd060', 0.4);
  blob(g, roundRect(10, 28, 44, 28, 4), '#d8443e', { depth: 3 });
  blob(g, roundRect(7, 20, 50, 11, 4), '#e8584a', { depth: 2 });
  blob(g, roundRect(28, 20, 8, 36, 2), GOLD, { depth: 1.4, ow: 2 });
  blob(g, (c) => { c.moveTo(32, 20); c.bezierCurveTo(22, 4, 10, 12, 18, 20); c.closePath(); }, GOLD, { depth: 1.2, ow: 2 });
  blob(g, (c) => { c.moveTo(32, 20); c.bezierCurveTo(42, 4, 54, 12, 46, 20); c.closePath(); }, GOLD, { depth: 1.2, ow: 2 });
  flat(g, star(52, 12, 5, 1.4, 4), '#ffffff');
};

ICONS.mail = (g) => {
  blob(g, roundRect(7, 16, 50, 34, 5), '#f6ecd6', { depth: 3, light: '#ffffff' });
  line(g, (c) => { c.moveTo(9, 18); c.lineTo(32, 36); c.lineTo(55, 18); }, '#b89a6a', 2.4);
  line(g, (c) => { c.moveTo(9, 48); c.lineTo(26, 32); c.moveTo(55, 48); c.lineTo(38, 32); }, '#d8c49a', 1.8);
  blob(g, circle(32, 35, 6), '#c8353a', { depth: 1.4, ow: 1.8 });
  flat(g, star(32, 35, 3, 1.3, 5), '#f6c03a');
};

ICONS.trophy = (g) => {
  glow(g, 32, 26, 28, '#ffd060', 0.4);
  line(g, (c) => { c.arc(14, 22, 8, Math.PI * 0.5, Math.PI * 1.5); c.moveTo(50, 14); c.arc(50, 22, 8, -Math.PI * 0.5, Math.PI * 0.5); }, INK, 7);
  line(g, (c) => { c.arc(14, 22, 8, Math.PI * 0.5, Math.PI * 1.5); c.moveTo(50, 14); c.arc(50, 22, 8, -Math.PI * 0.5, Math.PI * 0.5); }, GOLD, 3.4);
  blob(g, (c) => { c.moveTo(16, 10); c.lineTo(48, 10); c.quadraticCurveTo(48, 38, 32, 40); c.quadraticCurveTo(16, 38, 16, 10); c.closePath(); }, GOLD, { depth: 3.4, light: '#fff2a8' });
  blob(g, roundRect(28, 38, 8, 8, 2), '#c8871a', { depth: 1, ow: 2 });
  blob(g, roundRect(18, 46, 28, 10, 3), '#7a4a2c', { depth: 1.6 });
  flat(g, star(32, 23, 7, 3, 5), '#fff2a8');
};

ICONS.scroll = (g) => {
  blob(g, roundRect(14, 12, 36, 42, 3), '#f6e7c1', { depth: 3, light: '#ffffff' });
  line(g, (c) => { for (let i = 0; i < 4; i++) { c.moveTo(20, 22 + i * 7); c.lineTo(i === 3 ? 34 : 44, 22 + i * 7); } }, '#a88a5a', 2);
  blob(g, roundRect(9, 6, 46, 9, 4.5), '#e2c98e', { depth: 1.6 });
  blob(g, roundRect(9, 51, 46, 9, 4.5), '#e2c98e', { depth: 1.6 });
  blob(g, circle(44, 50, 6), '#c8353a', { depth: 1.2, ow: 1.8 });
};

// Tab icons: portraits of the hero, the starter dog and the guard.
ICONS.tabHero = (g) => portrait(g, 'hero', {});
ICONS.tabPet = (g) => portrait(g, 'dog', { colors: PETS[0].forms[0].colors, form: 1 });
ICONS.tabDungeon = (g) => {
  const guard = COMPANIONS.find((c) => c.id === 'guard');
  portrait(g, guard.actor, { colors: guard.colors, role: guard.role });
};

const urls = new Map();

// A wide cover picture for blog posts: 'scene:<theme>[:<enemy actor>]' paints a zone with the
// hero facing an enemy. Image files are used as they are.
export function coverUrl(spec, width = 360, height = 160) {
  if (!spec.startsWith('scene:')) return spec;
  const key = `cover:${spec}:${width}x${height}`;
  let url = urls.get(key);
  if (url) return url;
  const [, theme, enemy] = spec.split(':');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const c = document.createElement('canvas');
  c.width = Math.round(width * dpr);
  c.height = Math.round(height * dpr);
  const g = c.getContext('2d');
  const H = 170;
  const k = c.height / H;
  const W = c.width / k;
  g.scale(k, k);
  const gy = 150;
  paintBackdrop(g, theme, W, H, gy, 5);
  const hero = ACTORS.hero;
  at(g, W * 0.36, gy, 0, () => hero.draw(g, { ...hero.rest, armF: -1.7, elbowF: -0.5, sword: 1.1, mouth: 0.8, cape: 1 }, {}, null), 1);
  const def = ACTORS[enemy];
  if (def) {
    const spec2 = ZONES.flatMap((z) => z.enemies).find((e) => e.actor === enemy);
    const look = { colors: spec2.colors, boss: true };
    const P = { ...def.rest, ...def.idle(0.3, look), blink: 0 };
    at(g, W * 0.72, gy, 0, () => def.draw(g, P, look, null), -1.25, 1.25);
  }
  url = c.toDataURL('image/jpeg', 0.88);
  urls.set(key, url);
  return url;
}

export function iconUrl(name, look = null, size = 48) {
  const dpr = Math.min(3, (typeof window !== 'undefined' && window.devicePixelRatio) || 1);
  const key = name + (look ? JSON.stringify(look) : '') + size;
  let url = urls.get(key);
  if (url) return url;
  const px = Math.ceil(size * dpr);
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d');
  g.scale(px / 64, px / 64);
  if (name.startsWith('actor:')) portrait(g, name.slice(6), look || {});
  else (ICONS[name] || ICONS.lock)(g, look);
  url = c.toDataURL();
  urls.set(key, url);
  return url;
}

import {
  INK, at, blob, line, flat, glow, ellipse, circle, roundRect, smooth, poly, capsule, star, darker, lighter,
} from './paint.js';
import { ACTORS } from './actors.js';
import { PETS, COMPANIONS } from './config.js';

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
  skHorn(g) {
    blob(g, (c) => { c.moveTo(10, 40); c.quadraticCurveTo(26, 40, 44, 14); c.lineTo(54, 20); c.quadraticCurveTo(40, 52, 12, 50); c.closePath(); }, '#f4e2b4', { depth: 3, light: '#ffffff' });
    blob(g, ellipse(49, 17, 5.4, 7.6, 0.6), '#7a4a2c', { depth: 1.6 });
    line(g, (c) => { c.moveTo(22, 42); c.quadraticCurveTo(24, 47, 22, 50); c.moveTo(32, 36); c.quadraticCurveTo(36, 42, 33, 48); }, GOLD, 3);
    line(g, (c) => { for (let i = 0; i < 3; i++) { c.moveTo(54 - i * 2, 4 + i * 2); c.lineTo(58 - i * 2, 0 + i * 2); } }, '#ffd060', 2.4);
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

// Tab icons: portraits of the hero, the starter dog and the guard.
ICONS.tabHero = (g) => portrait(g, 'hero', {});
ICONS.tabPet = (g) => portrait(g, 'dog', { colors: PETS[0].forms[0].colors, form: 1 });
ICONS.tabDungeon = (g) => {
  const guard = COMPANIONS.find((c) => c.id === 'guard');
  portrait(g, guard.actor, { colors: guard.colors, role: guard.role });
};

const urls = new Map();

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

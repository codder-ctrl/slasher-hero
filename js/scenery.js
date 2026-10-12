import {
  INK, at, blob, line, flat, glow, ellipse, circle, roundRect, smooth, poly, scallop, star, darker, lighter, mix, rgba,
} from './paint.js';

// Painted backdrops for the six zones and the dungeon, drawn once per zone and size into an
// offscreen canvas (see render.js), plus the live ambient layer (clouds, fireflies, snow...).
// Everything here works in scene units: the caller scales the context so the scene is
// `w` units wide and `h` units tall with the ground line at `gy`.

export function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const THEMES = {
  meadow: {
    sky: ['#4fa8e8', '#8fd0f2', '#d8f2f4'], sun: '#fff4c0',
    far: '#9cc2dc', farTop: '#f4fbff', mid: '#6cbf55', tree: '#3f9a45', trunk: '#7a4b2c',
    ground: '#82c95a', road: '#dcb47c', speck: '#b88f5c', front: '#4e9e40', flower: ['#ffffff', '#ffd23a', '#ff7aa8'],
    weather: 'clouds',
  },
  forest: {
    sky: ['#1f1f4a', '#3a3a78', '#5f5a8f'], moon: '#f2f0d8',
    far: '#2c4a5c', farTop: null, mid: '#24453f', tree: '#1f5a48', trunk: '#4a3328',
    ground: '#3f7a4a', road: '#7a6450', speck: '#5a4a3a', front: '#1c3c34', flower: ['#9ff0ff', '#d0a0ff'],
    glowShroom: '#7ff4e8', weather: 'fireflies',
  },
  cave: {
    sky: ['#14142a', '#22224a', '#33305e'], ceiling: '#2a2848',
    far: '#3a3866', farTop: null, mid: '#4a4878', tree: null, crystal: ['#6ff0ff', '#ff8ae0', '#a890ff'],
    ground: '#5a5888', road: '#7a78a4', speck: '#4a4876', front: '#2a2850', flower: [],
    weather: 'sparkles',
  },
  desert: {
    sky: ['#f08a4a', '#ffbf6a', '#ffe8b0'], sun: '#fff0b0',
    far: '#e0885a', farTop: null, mid: '#e8a860', tree: null, cactus: '#5aa850',
    ground: '#f2c97a', road: '#f8dca0', speck: '#d8a860', front: '#d89850', flower: [],
    weather: 'dust',
  },
  ice: {
    sky: ['#3a5aa8', '#6f9ad8', '#c8e4f8'], sun: '#f4fbff',
    far: '#c8dcf0', farTop: '#ffffff', mid: '#9cc0dc', tree: '#2f6a6a', trunk: '#5a4038', snow: '#f6fbff',
    ground: '#e8f4fc', road: '#cfe2f2', speck: '#a8c8e4', front: '#bcd6ec', flower: [],
    weather: 'snow',
  },
  volcano: {
    sky: ['#1a1020', '#4a1a2a', '#9a3a2a'], lava: '#ff7a2a',
    far: '#3a2028', farTop: null, mid: '#2a1a22', tree: null,
    ground: '#4a3438', road: '#5f4448', speck: '#2f2024', front: '#1f1418', flower: [],
    weather: 'embers',
  },
  // Mega boss arenas (the Harita).
  labyrinth: {
    sky: ['#2a1838', '#7a3a4a', '#e8945a'], sun: '#ffd890',
    far: '#a8784e', farTop: null, mid: '#8a6040', wall: '#c89a62', tree: null, torch: '#ffb43a',
    ground: '#d8b47a', road: '#e8cc94', speck: '#b08850', front: '#8a6a48', flower: [],
    weather: 'dust',
  },
  lair: {
    sky: ['#0e0a18', '#1c1430', '#2a1f40'], ceiling: '#1e1830',
    far: '#2a2240', farTop: null, mid: '#342a4c', tree: null, web: '#d8d2e8', egg: '#9ae04a',
    ground: '#3a3050', road: '#4c4064', speck: '#2a2240', front: '#1a1428', flower: [],
    weather: 'spores',
  },
};

export const THEME_IDS = Object.keys(THEMES);

function sky(g, t, w, gy) {
  const grad = g.createLinearGradient(0, 0, 0, gy);
  grad.addColorStop(0, t.sky[0]);
  grad.addColorStop(0.55, t.sky[1]);
  grad.addColorStop(1, t.sky[2]);
  g.fillStyle = grad;
  g.fillRect(-2, -2, w + 4, gy + 4);
}

// Jagged mountain range between `base` and `base - height`.
function mountains(g, t, rand, w, base, height, color, snow, ow = 0) {
  const pts = [[-10, base + 10]];
  let x = -10;
  while (x < w + 30) {
    const peak = base - height * (0.55 + rand() * 0.45);
    const step = 26 + rand() * 34;
    pts.push([x + step * 0.5, peak]);
    pts.push([x + step, base - height * (0.15 + rand() * 0.3)]);
    x += step;
  }
  pts.push([w + 10, base + 10]);
  blob(g, poly(pts), color, { ow, depth: 6, light: snow ? lighter(color, 0.3) : undefined });
  if (snow) {
    for (let i = 1; i < pts.length - 1; i += 2) {
      const [px, py] = pts[i];
      if (py > base - height * 0.6) continue;
      const d = (base - py) * 0.28;
      flat(g, poly([[px, py], [px + d * 0.9, py + d], [px + d * 0.35, py + d * 0.8], [px, py + d * 1.15], [px - d * 0.4, py + d * 0.8], [px - d * 0.9, py + d]]), snow, 0.95);
    }
  }
}

function hills(g, rand, w, base, height, color, ow = 1.8) {
  const pts = [[-10, base + 30]];
  const n = Math.ceil(w / 40) + 2;
  for (let i = 0; i <= n; i++) pts.push([-10 + (i * (w + 20)) / n, base - height * (0.4 + rand() * 0.6)]);
  pts.push([w + 10, base + 30]);
  blob(g, (c) => {
    c.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      if (i === 1) c.lineTo(x1, y1);
      else c.quadraticCurveTo((x0 + x1) / 2, Math.min(y0, y1) - height * 0.25, x1, y1);
    }
    c.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1]);
    c.closePath();
  }, color, { ow, depth: 5 });
}

function roundTree(g, rand, x, y, s, t) {
  blob(g, roundRect(x - 2.6 * s, y - 16 * s, 5.2 * s, 17 * s, 2 * s), t.trunk, { ow: 1.6, depth: 1.4 });
  blob(g, scallop(x, y - 22 * s, 13 * s, 11 * s, 9, 0.4, rand), t.tree, { ow: 1.8, depth: 4 * s });
  flat(g, scallop(x - 4 * s, y - 26 * s, 5 * s, 4 * s, 6, 0.4, rand), lighter(t.tree, 0.35), 0.7);
}

function pine(g, x, y, s, color, trunk, snow) {
  blob(g, roundRect(x - 2 * s, y - 8 * s, 4 * s, 9 * s, 1.5 * s), trunk, { ow: 1.4, depth: 1 });
  for (let i = 0; i < 3; i++) {
    const yy = y - 6 * s - i * 9 * s;
    const ww = (14 - i * 3.5) * s;
    blob(g, poly([[x - ww, yy], [x, yy - 15 * s], [x + ww, yy]]), color, { ow: 1.6, depth: 2.4 * s });
    if (snow) flat(g, poly([[x - ww * 0.5, yy - 7 * s], [x, yy - 15 * s], [x + ww * 0.5, yy - 7 * s], [x + ww * 0.15, yy - 5.5 * s], [x - ww * 0.2, yy - 6.5 * s]]), snow);
  }
}

function crystal(g, x, y, s, color, rot = 0) {
  at(g, x, y, rot, () => {
    glow(g, 0, -8 * s, 16 * s, color, 0.5);
    blob(g, poly([[-3.5 * s, 0], [-4 * s, -11 * s], [0, -17 * s], [4 * s, -11 * s], [3.5 * s, 0]]), color, { ow: 1.6, depth: 2 * s, light: '#ffffff' });
    line(g, (c) => { c.moveTo(0, -16 * s); c.lineTo(0, -1); }, lighter(color, 0.6), 1, 0.8);
  });
}

function rock(g, rand, x, y, s, color) {
  blob(g, smooth([[x - 8 * s, y], [x - 7 * s, y - 6 * s], [x - 2 * s, y - 9 * s], [x + 5 * s, y - 7 * s], [x + 8 * s, y - 2 * s], [x + 7 * s, y]], 0.8), color, { ow: 1.6, depth: 2.6 * s });
}

function cactus(g, x, y, s, color) {
  const arm = (dx, h) => blob(g, (c) => { c.moveTo(x + dx * 3 * s, y - h * s); c.lineTo(x + dx * 8 * s, y - h * s); c.quadraticCurveTo(x + dx * 11 * s, y - h * s, x + dx * 11 * s, y - (h + 4) * s); c.lineTo(x + dx * 11 * s, y - (h + 10) * s); c.arc(x + dx * 8.5 * s, y - (h + 10) * s, 2.5 * s, 0, Math.PI, true); c.lineTo(x + dx * 6 * s, y - (h + 3) * s); c.lineTo(x + dx * 3 * s, y - (h + 3) * s); c.closePath(); }, color, { ow: 1.6, depth: 1.6 });
  arm(-1, 14);
  arm(1, 20);
  blob(g, roundRect(x - 4 * s, y - 30 * s, 8 * s, 30 * s, 4 * s), color, { ow: 1.8, depth: 2.4 });
  line(g, (c) => { c.moveTo(x, y - 27 * s); c.lineTo(x, y - 2 * s); }, darker(color, 0.3), 1.2);
}

function tuft(g, x, y, s, color) {
  blob(g, (c) => {
    c.moveTo(x - 5 * s, y);
    c.quadraticCurveTo(x - 5 * s, y - 5 * s, x - 7 * s, y - 9 * s);
    c.quadraticCurveTo(x - 2 * s, y - 6 * s, x - 1 * s, y - 3 * s);
    c.quadraticCurveTo(x, y - 9 * s, x + 1 * s, y - 12 * s);
    c.quadraticCurveTo(x + 3 * s, y - 6 * s, x + 2 * s, y - 3 * s);
    c.quadraticCurveTo(x + 5 * s, y - 7 * s, x + 8 * s, y - 8 * s);
    c.quadraticCurveTo(x + 5 * s, y - 4 * s, x + 5 * s, y);
    c.closePath();
  }, color, { ow: 1.4, depth: 1.2 });
}

// The battle ground: a wavy top edge just above the line the actors stand on, a lighter road
// under them, pebbles and tufts, and darker foreground clumps along the bottom.
function ground(g, t, rand, w, h, gy, theme) {
  const top = gy - 10;
  blob(g, (c) => {
    c.moveTo(-10, h + 10);
    c.lineTo(-10, top);
    for (let x = -10; x <= w + 10; x += 16) c.quadraticCurveTo(x + 8, top - 3 - rand() * 3, x + 16, top + rand() * 2);
    c.lineTo(w + 10, h + 10);
    c.closePath();
  }, t.ground, { ow: 2, depth: 4 });
  // Road under the fighters.
  blob(g, (c) => {
    c.moveTo(-10, gy - 4);
    for (let x = -10; x <= w + 10; x += 22) c.quadraticCurveTo(x + 11, gy - 7 - rand() * 2, x + 22, gy - 4 + rand() * 1.5);
    for (let x = w + 10; x >= -10; x -= 22) c.quadraticCurveTo(x - 11, gy + 13 + rand() * 3, x - 22, gy + 10 + rand() * 2);
    c.closePath();
  }, t.road, { ow: 1.4, depth: 2.4, ink: darker(t.road, 0.5) });
  for (let i = 0; i < w / 9; i++) {
    const x = rand() * w;
    const y = gy - 2 + rand() * 13;
    flat(g, ellipse(x, y, 1.2 + rand() * 1.8, 0.8 + rand() * 0.9), t.speck, 0.8);
  }
  // Grass tufts, flowers and props on the ground band.
  for (let i = 0; i < w / 26; i++) {
    const x = rand() * w;
    const y = gy + 16 + rand() * (h - gy - 18);
    if (theme === 'meadow' || theme === 'forest') tuft(g, x, y, 0.7 + rand() * 0.4, darker(t.ground, 0.15));
    else if (theme === 'ice') flat(g, ellipse(x, y, 6 + rand() * 6, 1.6), t.speck, 0.7);
    else rock(g, rand, x, y, 0.4 + rand() * 0.4, t.speck);
    if (t.flower.length && rand() < 0.55) {
      const col = t.flower[Math.floor(rand() * t.flower.length)];
      blob(g, star(x + 6, y - 4, 2.6, 1.3, 5), col, { ow: 1.2, depth: 0.6 });
      flat(g, circle(x + 6, y - 4, 0.9), '#ffd23a');
    }
  }
  // Foreground clumps that frame the bottom edge.
  for (let x = -6; x < w + 20; x += 28 + rand() * 30) {
    const y = h + 4;
    if (theme === 'cave' || theme === 'volcano' || theme === 'desert' || theme === 'labyrinth' || theme === 'lair') rock(g, rand, x, y, 1.4 + rand(), t.front);
    else blob(g, scallop(x, y, 16 + rand() * 8, 8 + rand() * 4, 7, 0.45, rand), t.front, { ow: 1.8, depth: 3 });
  }
  if (theme === 'volcano') {
    // Glowing cracks in the basalt.
    for (let i = 0; i < w / 50; i++) {
      const x = rand() * w;
      const y = gy + 18 + rand() * (h - gy - 22);
      line(g, (c) => { c.moveTo(x, y); c.lineTo(x + 6, y + 2); c.lineTo(x + 10, y - 1); c.lineTo(x + 16, y + 1.5); }, t.lava, 2.2);
      glow(g, x + 8, y, 10, t.lava, 0.35);
    }
  }
}

// Paints the whole static backdrop of `theme`.
export function paintBackdrop(g, theme, w, h, gy, seed = 1) {
  const t = THEMES[theme] || THEMES.meadow;
  const rand = mulberry32(seed * 7919 + 13);
  sky(g, t, w, gy);
  const horizon = gy - 26;

  if (t.sun) {
    glow(g, w * 0.8, horizon - 90, 70, t.sun, 0.55);
    flat(g, circle(w * 0.8, horizon - 90, 17), t.sun);
  }
  if (t.moon) {
    glow(g, w * 0.78, horizon - 105, 46, t.moon, 0.35);
    flat(g, circle(w * 0.78, horizon - 105, 13), t.moon);
    flat(g, circle(w * 0.78 + 5, horizon - 108, 11), t.sky[0]);
    for (let i = 0; i < 26; i++) flat(g, circle(rand() * w, rand() * (horizon - 60), 0.5 + rand() * 0.8), '#ffffff', 0.4 + rand() * 0.5);
  }

  if (theme === 'labyrinth' || theme === 'lair') {
    arenaBackdrop(g, theme, t, rand, w, h, gy, horizon);
  } else if (theme === 'cave') {
    // Back wall, hanging stalactites and crystal clusters.
    mountains(g, t, rand, w, horizon + 10, 120, t.far, null, 0);
    blob(g, (c) => {
      c.moveTo(-10, -10);
      c.lineTo(w + 10, -10);
      c.lineTo(w + 10, 30);
      for (let x = w + 10; x > -10; x -= 14 + rand() * 18) {
        const len = 30 + rand() * 70;
        c.lineTo(x - 4, 32 + rand() * 10);
        c.lineTo(x - 9, 32 + len);
        c.lineTo(x - 14, 34 + rand() * 10);
      }
      c.lineTo(-10, 30);
      c.closePath();
    }, t.ceiling, { ow: 1.6, depth: 5 });
    hills(g, rand, w, horizon + 14, 40, t.mid);
    for (let i = 0; i < w / 45; i++) crystal(g, rand() * w, horizon + 10 + rand() * 6, 0.9 + rand() * 0.8, t.crystal[i % 3], (rand() - 0.5) * 0.5);
  } else if (theme === 'desert') {
    // Striped mesas and dunes.
    for (let i = 0; i < 3; i++) {
      const x = rand() * w;
      const mw = 50 + rand() * 50;
      const mh = 40 + rand() * 40;
      blob(g, poly([[x - mw, horizon + 10], [x - mw * 0.7, horizon - mh], [x + mw * 0.7, horizon - mh], [x + mw, horizon + 10]]), t.far, { ow: 1.4, depth: 6 });
      line(g, (c) => { c.moveTo(x - mw * 0.78, horizon - mh * 0.6); c.lineTo(x + mw * 0.78, horizon - mh * 0.6); c.moveTo(x - mw * 0.86, horizon - mh * 0.25); c.lineTo(x + mw * 0.86, horizon - mh * 0.25); }, darker(t.far, 0.2), 2.4, 0.6);
    }
    hills(g, rand, w, horizon + 16, 26, t.mid);
    for (let i = 0; i < 3; i++) cactus(g, 20 + rand() * (w - 40), horizon + 18 + rand() * 4, 0.8 + rand() * 0.4, t.cactus);
  } else if (theme === 'volcano') {
    // Erupting volcano with a lava river and smoke.
    const vx = w * 0.35;
    glow(g, vx, horizon - 120, 90, t.lava, 0.45);
    blob(g, poly([[vx - 130, horizon + 10], [vx - 22, horizon - 110], [vx + 22, horizon - 110], [vx + 130, horizon + 10]]), t.far, { ow: 1.4, depth: 8 });
    line(g, (c) => { c.moveTo(vx - 8, horizon - 108); c.quadraticCurveTo(vx + 10, horizon - 60, vx - 6, horizon + 6); }, t.lava, 5);
    glow(g, vx, horizon - 50, 30, t.lava, 0.4);
    for (let i = 0; i < 4; i++) flat(g, scallop(vx - 10 + i * 9, horizon - 130 - i * 16, 14 + i * 4, 9 + i * 2, 7, 0.4, rand), '#4a3038', 0.7 - i * 0.12);
    mountains(g, t, rand, w, horizon + 14, 50, t.mid, null, 1.6);
  } else {
    mountains(g, t, rand, w, horizon, theme === 'forest' ? 70 : 95, t.far, t.farTop, 0);
    if (theme === 'forest') {
      for (let x = -10; x < w + 10; x += 14 + rand() * 10) pine(g, x, horizon + 8, 1 + rand() * 0.6, mix(t.far, '#000000', 0.25), '#2a2228', null);
      // Fog band.
      const fog = g.createLinearGradient(0, horizon - 20, 0, horizon + 20);
      fog.addColorStop(0, 'rgba(160,170,220,0)');
      fog.addColorStop(1, 'rgba(160,170,220,0.35)');
      g.fillStyle = fog;
      g.fillRect(0, horizon - 20, w, 40);
    }
    hills(g, rand, w, horizon + 14, theme === 'ice' ? 34 : 30, t.mid);
    if (theme === 'meadow') {
      for (let i = 0; i < w / 60; i++) roundTree(g, rand, 15 + rand() * (w - 30), horizon + 14 + rand() * 6, 0.8 + rand() * 0.5, t);
    } else if (theme === 'forest') {
      for (let i = 0; i < w / 55; i++) roundTree(g, rand, rand() * w, horizon + 16 + rand() * 6, 1 + rand() * 0.5, t);
    } else if (theme === 'ice') {
      for (let i = 0; i < w / 40; i++) pine(g, rand() * w, horizon + 16 + rand() * 6, 0.8 + rand() * 0.5, t.tree, t.trunk, t.snow);
    }
  }

  ground(g, t, rand, w, h, gy, theme);
  if (theme === 'forest') {
    for (let i = 0; i < 4; i++) {
      const x = rand() * w;
      const y = gy + 20 + rand() * (h - gy - 26);
      glow(g, x, y - 4, 14, t.glowShroom, 0.4);
      blob(g, roundRect(x - 1.5, y - 6, 3, 6, 1.2), '#e8f0e0', { ow: 1.2, depth: 0.6 });
      blob(g, (c) => { c.ellipse(x, y - 6, 5, 3.6, 0, Math.PI, 0); c.closePath(); }, t.glowShroom, { ow: 1.4, depth: 1 });
    }
  }
  if (theme === 'lair') {
    for (let i = 0; i < 3; i++) {
      const x = rand() * w;
      const y = gy + 22 + rand() * (h - gy - 26);
      line(g, (c) => { for (let k = 0; k < 4; k++) { c.moveTo(x, y); c.lineTo(x + (k - 1.5) * 7, y + 3); } }, '#e8e0f0', 1, 0.7);
      flat(g, ellipse(x, y + 2, 2.6, 1.6), '#e8e0f0', 0.8);
    }
  }
  if (theme === 'cave') {
    for (let i = 0; i < 3; i++) crystal(g, rand() * w, gy + 24 + rand() * (h - gy - 26), 0.7 + rand() * 0.5, t.crystal[i % 3], (rand() - 0.5) * 0.6);
  }
}

// A torch on a pole with its flame and glow.
function torch(g, x, y, s, color) {
  at(g, x, y, 0, () => {
    blob(g, roundRect(-1.6, -26, 3.2, 26, 1.4), '#5a3a26', { ow: 1.4, depth: 0.6 });
    blob(g, roundRect(-4, -30, 8, 5, 2), '#6a6a7a', { ow: 1.4, depth: 0.6 });
    glow(g, 0, -38, 22, color, 0.55);
    blob(g, (c) => { c.moveTo(0, -48); c.quadraticCurveTo(7, -38, 3.5, -30); c.lineTo(-3.5, -30); c.quadraticCurveTo(-7, -38, 0, -48); c.closePath(); }, color, { ow: 1.4, depth: 1, light: '#fff2a8' });
    flat(g, ellipse(0, -34, 2, 3.4), '#fff6c0', 0.9);
  }, s);
}

// Maze walls of big sandstone blocks, with a dark archway every so often.
function mazeWall(g, rand, x, top, wd, base, color) {
  blob(g, roundRect(x, top, wd, base - top, 3), color, { ow: 1.8, depth: 5 });
  line(g, (c) => {
    for (let y = top + 12, row = 0; y < base; y += 12, row++) {
      c.moveTo(x + 2, y); c.lineTo(x + wd - 2, y);
      for (let bx = x + (row % 2 ? 9 : 18); bx < x + wd - 4; bx += 18) { c.moveTo(bx, y - 12); c.lineTo(bx, y); }
    }
  }, darker(color, 0.3), 1.2, 0.7);
  for (let bx = x + 2; bx < x + wd - 8; bx += 14) blob(g, roundRect(bx, top - 7, 9, 8, 1.5), color, { ow: 1.6, depth: 1.6 });
  if (wd > 60 && rand() < 0.8) {
    const ax = x + wd * (0.3 + rand() * 0.4);
    const aw = 20 + rand() * 8;
    blob(g, (c) => { c.moveTo(ax - aw / 2, base); c.lineTo(ax - aw / 2, base - 30); c.quadraticCurveTo(ax, base - 50, ax + aw / 2, base - 30); c.lineTo(ax + aw / 2, base); c.closePath(); }, '#2a1a20', { ow: 1.6, shade: false, noLight: true });
  }
}

// A cobweb fanning out from a corner at (x, y), spreading toward angle a0..a1.
function cobweb(g, x, y, r, a0, a1, color) {
  const spokes = 6;
  line(g, (c) => {
    for (let i = 0; i <= spokes; i++) {
      const a = a0 + ((a1 - a0) * i) / spokes;
      c.moveTo(x, y); c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    for (let k = 1; k <= 4; k++) {
      const rr = (r * k) / 4.4;
      for (let i = 0; i <= spokes; i++) {
        const a = a0 + ((a1 - a0) * i) / spokes;
        const px = x + Math.cos(a) * rr;
        const py = y + Math.sin(a) * rr;
        if (i === 0) c.moveTo(px, py);
        else {
          const am = a - (a1 - a0) / spokes / 2;
          c.quadraticCurveTo(x + Math.cos(am) * rr * 0.86, y + Math.sin(am) * rr * 0.86, px, py);
        }
      }
    }
  }, color, 1, 0.55);
}

function arenaBackdrop(g, theme, t, rand, w, h, gy, horizon) {
  if (theme === 'labyrinth') {
    glow(g, w * 0.5, horizon - 60, 120, '#ffb46a', 0.35);
    // Far walls, then nearer, taller ones framing the arena.
    for (let x = -20; x < w + 20;) {
      const wd = 50 + rand() * 60;
      mazeWall(g, rand, x, horizon - 64 - rand() * 18, wd, horizon + 12, t.far);
      x += wd + 14 + rand() * 20;
    }
    mazeWall(g, rand, -30, horizon - 120, 70 + rand() * 20, horizon + 22, t.wall);
    mazeWall(g, rand, w - 60 - rand() * 20, horizon - 128, 110, horizon + 22, t.wall);
    for (const tx of [w * 0.12, w * 0.5, w * 0.88]) torch(g, tx, horizon + 20, 1, t.torch);
  } else if (theme === 'lair') {
    // Webbed cave: a dark ceiling with hanging cocoons, webs in the corners, glowing eggs.
    mountains(g, t, rand, w, horizon + 10, 110, t.far, null, 0);
    blob(g, (c) => {
      c.moveTo(-10, -10); c.lineTo(w + 10, -10); c.lineTo(w + 10, 24);
      for (let x = w + 10; x > -10; x -= 18 + rand() * 20) { c.lineTo(x - 5, 26 + rand() * 18); c.lineTo(x - 14, 22 + rand() * 6); }
      c.lineTo(-10, 24); c.closePath();
    }, t.ceiling, { ow: 1.6, depth: 5 });
    for (let i = 0; i < 4; i++) {
      const x = 20 + rand() * (w - 40);
      const len = 30 + rand() * 50;
      line(g, (c) => { c.moveTo(x, 20); c.lineTo(x, 20 + len); }, t.web, 1, 0.6);
      blob(g, ellipse(x, 28 + len, 5, 10), '#c8c0d8', { ow: 1.6, depth: 2 });
      line(g, (c) => { for (let k = -6; k <= 6; k += 4) { c.moveTo(x - 5, 28 + len + k); c.lineTo(x + 5, 28 + len + k + 2); } }, '#8a80a0', 1, 0.6);
    }
    cobweb(g, -4, -4, 90, 0.1, 1.45, t.web);
    cobweb(g, w + 4, -4, 90, Math.PI - 1.45, Math.PI - 0.1, t.web);
    hills(g, rand, w, horizon + 14, 36, t.mid);
    for (let i = 0; i < 5; i++) {
      const x = rand() * w;
      const y = horizon + 12 + rand() * 6;
      glow(g, x, y - 4, 12, t.egg, 0.4);
      for (let k = 0; k < 3; k++) blob(g, ellipse(x + k * 6 - 6, y - 3 - (k % 2) * 3, 3.4, 4.4), lighter(t.egg, 0.2), { ow: 1.2, depth: 1, light: '#ffffff' });
    }
  }
}

// ---- Dungeon backdrop: stone wall, arches, banners and a flagstone floor ----

export function paintDungeon(g, w, h, gy) {
  const rand = mulberry32(4242);
  const wall = g.createLinearGradient(0, 0, 0, gy);
  wall.addColorStop(0, '#24203a');
  wall.addColorStop(1, '#3a3456');
  g.fillStyle = wall;
  g.fillRect(-2, -2, w + 4, gy + 4);
  for (let y = 4, row = 0; y < gy - 4; y += 14, row++) {
    for (let x = (row % 2) * -14 - 4; x < w + 10; x += 28) {
      blob(g, roundRect(x + 1, y, 26, 12, 3), mix('#463f66', '#2e2948', rand() * 0.6), { ow: 1.2, depth: 2, ink: '#1a1628' });
    }
  }
  // Arches with dark openings.
  for (const ax of [w * 0.18, w * 0.82]) {
    blob(g, (c) => { c.moveTo(ax - 22, gy); c.lineTo(ax - 22, gy - 40); c.arc(ax, gy - 40, 22, Math.PI, 0); c.lineTo(ax + 22, gy); c.closePath(); }, '#14111f', { ow: 2, depth: 4, shade: '#0a0812', light: false });
  }
  // Banners.
  for (const bx of [w * 0.4, w * 0.6]) {
    blob(g, poly([[bx - 9, 8], [bx + 9, 8], [bx + 9, 44], [bx, 38], [bx - 9, 44]]), '#a8303a', { ow: 1.6, depth: 2.4 });
    blob(g, star(bx, 22, 5, 2.4, 5), '#f4b836', { ow: 1.2, depth: 0.8 });
  }
  // Floor flagstones.
  blob(g, roundRect(-10, gy - 4, w + 20, h - gy + 14, 2), '#3f3a5a', { ow: 2, depth: 3 });
  for (let y = gy + 2, row = 0; y < h; y += 9, row++) {
    for (let x = (row % 2) * -11 - 4; x < w + 10; x += 22) {
      flat(g, roundRect(x + 1, y, 20, 7.5, 2), mix('#57507a', '#463f66', rand()), 0.9);
    }
  }
}

// ---- Ambient layer ----

// Returns { draw(g, dt) } for the live weather of a theme, in scene units.
export function createWeather(theme, w, gy, seed = 1) {
  const t = THEMES[theme] || THEMES.meadow;
  const kind = t.weather;
  const rand = mulberry32(seed * 31 + 7);
  const items = [];
  const n = { clouds: 4, fireflies: 14, sparkles: 16, snow: 60, embers: 34, dust: 18, spores: 22 }[kind] || 0;
  for (let i = 0; i < n; i++) {
    items.push({
      x: rand() * w, y: rand() * gy, p: rand() * 6.28, s: 0.5 + rand(), r: rand(),
      shape: kind === 'clouds' ? scallop(0, 0, 22 + rand() * 18, 9 + rand() * 5, 8, 0.5, rand) : null,
    });
  }
  let time = 0;
  return {
    draw(g, dt) {
      time += dt;
      for (const p of items) {
        if (kind === 'clouds') {
          p.x += p.s * 4 * dt;
          if (p.x > w + 60) p.x = -60;
          at(g, p.x, gy * (0.22 + p.r * 0.3), 0, () => blob(g, p.shape, '#ffffff', { ow: 1.4, depth: 4, shade: '#d4e8f4', ink: '#7aa8c8', alpha: 0.92 }));
        } else if (kind === 'fireflies') {
          const a = (Math.sin(time * 2 + p.p * 3) + 1) / 2;
          const x = p.x + Math.sin(time * 0.7 + p.p) * 10;
          const y = gy * 0.45 + p.y * 0.55 + Math.cos(time + p.p) * 6;
          glow(g, x, y, 7, '#e8ff7a', 0.6 * a);
          flat(g, circle(x, y, 1.2), '#fbffd0', a);
        } else if (kind === 'sparkles') {
          const a = Math.max(0, Math.sin(time * 1.6 + p.p * 3));
          if (a < 0.05) continue;
          const col = t.crystal[Math.floor(p.r * 3)];
          flat(g, star(p.x, p.y * 0.9, 3.4 * a, 0.8 * a, 4, 0), col, a);
        } else if (kind === 'snow') {
          p.y += p.s * 18 * dt;
          p.x += Math.sin(time + p.p) * 8 * dt - 4 * dt;
          if (p.y > gy + 30) { p.y = -4; p.x = Math.random() * (w + 40); }
          flat(g, circle(p.x, p.y, 0.8 + p.r * 1.4), '#ffffff', 0.9);
        } else if (kind === 'embers') {
          p.y -= p.s * 16 * dt;
          p.x += Math.sin(time * 2 + p.p) * 6 * dt;
          if (p.y < -4) { p.y = gy + 20; p.x = Math.random() * w; }
          glow(g, p.x, p.y, 4, '#ff8a3a', 0.5);
          flat(g, circle(p.x, p.y, 0.9 + p.r * 0.8), p.s > 1 ? '#ffe07a' : '#ff8a3a');
        } else if (kind === 'spores') {
          p.y -= p.s * 6 * dt;
          if (p.y < -4) { p.y = gy + 10; p.x = Math.random() * w; }
          const x = p.x + Math.sin(time * 0.8 + p.p) * 8;
          const a = 0.5 + 0.5 * Math.sin(time * 1.4 + p.p * 2);
          glow(g, x, p.y, 5, '#9ae04a', 0.45 * a);
          flat(g, circle(x, p.y, 0.8 + p.r * 0.8), '#d8ff9a', 0.4 + 0.5 * a);
        } else if (kind === 'dust') {
          p.x += p.s * 20 * dt;
          if (p.x > w + 10) p.x = -10;
          flat(g, circle(p.x, gy - 30 + p.y * 0.3 + Math.sin(time * 2 + p.p) * 3, 0.8 + p.r), '#fff0c8', 0.55);
        }
      }
    },
  };
}

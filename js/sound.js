// Sound effects and background music, synthesized with WebAudio (no audio files). Effects go
// through a small reverb and a compressor so layered hits stay clean. Browsers only allow
// audio after a user gesture, so main.js calls unlockAudio() from the first tap.

let ac = null;
let out = null;        // effects bus → compressor
let verb = null;       // reverb send
let musicBus = null;
let noiseBuf = null;
let sfxOn = true;
let musicOn = true;
const throttle = {};

export function setSoundEnabled(on) { sfxOn = on; }
export function setMusicEnabled(on) {
  musicOn = on;
  if (musicBus && ac) musicBus.gain.setTargetAtTime(on ? MUSIC_VOL : 0, ac.currentTime, 0.3);
}

const MUSIC_VOL = 0.16;

function impulse(seconds, decay) {
  const len = Math.floor(ac.sampleRate * seconds);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}

export function unlockAudio() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return;
    }
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.connect(ac.destination);
    out = ac.createGain();
    out.gain.value = 0.9;
    out.connect(comp);
    const conv = ac.createConvolver();
    conv.buffer = impulse(1.6, 3);
    verb = ac.createGain();
    verb.gain.value = 0.22;
    verb.connect(conv).connect(comp);
    musicBus = ac.createGain();
    musicBus.gain.value = musicOn ? MUSIC_VOL : 0;
    musicBus.connect(comp);
    const musicVerb = ac.createGain();
    musicVerb.gain.value = 0.35;
    musicBus.connect(musicVerb).connect(conv);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const data = noiseBuf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    startMusic();
  }
  if (ac.state === 'suspended') ac.resume().catch(() => {});
}

// Pause audio while the page is hidden (saves battery, keeps music in step).
export function pauseAudio(paused) {
  if (!ac) return;
  if (paused) ac.suspend().catch(() => {});
  else ac.resume().catch(() => {});
}

const ready = () => sfxOn && ac && ac.state === 'running';

function env(gainNode, t0, vol, attack, dur) {
  gainNode.gain.setValueAtTime(0.0001, t0);
  gainNode.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
}

function send(node, wet = 0) {
  node.connect(out);
  if (wet > 0) {
    const s = ac.createGain();
    s.gain.value = wet;
    node.connect(s).connect(verb);
  }
}

function tone(freq, dur, { type = 'sine', vol = 0.1, slide = 0, delay = 0, attack = 0.004, wet = 0, lp = 0, bus = null } = {}) {
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t0 + dur);
  env(g, t0, vol, attack, dur);
  let node = osc.connect(g);
  if (lp) {
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = lp;
    node = g.connect(f);
  }
  if (bus) node.connect(bus);
  else send(node, wet);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur, { vol = 0.1, type = 'bandpass', f0 = 1000, f1 = f0, q = 1, delay = 0, attack = 0.004, wet = 0, bus = null } = {}) {
  const t0 = ac.currentTime + delay;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(f0, t0);
  if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  const g = ac.createGain();
  env(g, t0, vol, attack, dur);
  const node = src.connect(f).connect(g);
  if (bus) node.connect(bus);
  else send(node, wet);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.05);
}

// Metallic ring: inharmonic partials with quick decay.
function ring(freq, dur, vol, delay = 0) {
  for (const [r, v] of [[1, 1], [2.76, 0.5], [5.4, 0.25], [8.93, 0.12]]) {
    tone(freq * r, dur / r ** 0.3, { type: 'sine', vol: vol * v, delay, wet: 0.5 });
  }
}

const rnd = (a, b) => a + Math.random() * (b - a);
const PENTA = [1568, 1760, 2093, 2349, 2637, 3136];

function limited(name, ms) {
  const now = performance.now();
  if (now - (throttle[name] || 0) < ms) return false;
  throttle[name] = now;
  return true;
}

export const sfx = {
  swing() {
    if (!ready()) return;
    noise(0.13, { vol: 0.16, f0: rnd(500, 700), f1: rnd(2600, 3400), q: 1.4, attack: 0.03 });
  },
  hit() {
    if (!ready()) return;
    tone(rnd(150, 180), 0.14, { slide: 0.4, vol: 0.32, delay: 0.07 });
    noise(0.07, { vol: 0.22, f0: rnd(1400, 1900), q: 0.9, delay: 0.07 });
    noise(0.03, { vol: 0.12, type: 'highpass', f0: 4000, delay: 0.07 });
  },
  crit() {
    if (!ready()) return;
    tone(rnd(110, 130), 0.28, { slide: 0.35, vol: 0.45, delay: 0.07 });
    noise(0.14, { vol: 0.3, f0: 1200, f1: 400, q: 0.8, delay: 0.07 });
    ring(rnd(1500, 1900), 0.5, 0.06, 0.07);
    noise(0.2, { vol: 0.1, f0: 3000, f1: 6000, q: 2, delay: 0.02, attack: 0.05 });
  },
  autoHit() {
    if (!ready() || !limited('auto', 55)) return;
    noise(0.08, { vol: 0.08, f0: rnd(2200, 3200), f1: 5000, q: 2 });
    tone(rnd(900, 1300), 0.06, { type: 'triangle', vol: 0.03, slide: 1.5 });
  },
  kill() {
    if (!ready()) return;
    noise(0.32, { vol: 0.26, type: 'lowpass', f0: 2400, f1: 180, q: 0.7, delay: 0.08 });
    tone(420, 0.1, { slide: 0.35, vol: 0.2, delay: 0.08 });
    tone(rnd(880, 990), 0.18, { type: 'triangle', vol: 0.06, slide: 1.5, delay: 0.18, wet: 0.3 });
  },
  coin() {
    if (!ready() || !limited('coin', 55)) return;
    const f = PENTA[Math.floor(Math.random() * PENTA.length)];
    tone(f, 0.22, { vol: 0.05, wet: 0.4 });
    tone(f * 2, 0.12, { vol: 0.02, delay: 0.01 });
  },
  buy() {
    if (!ready()) return;
    const base = rnd(0.98, 1.02);
    tone(784 * base, 0.09, { type: 'triangle', vol: 0.12 });
    tone(1175 * base, 0.16, { type: 'triangle', vol: 0.1, delay: 0.06, wet: 0.3 });
    noise(0.04, { vol: 0.05, type: 'highpass', f0: 5000 });
  },
  boss() {
    if (!ready()) return;
    tone(90, 0.6, { slide: 0.45, vol: 0.5 });
    noise(0.4, { vol: 0.16, type: 'lowpass', f0: 600, f1: 120 });
    for (const [f, d] of [[110, 0.1], [164.8, 0.1], [220, 0.35]]) tone(f, 0.9, { type: 'sawtooth', vol: 0.07, delay: d, lp: 900, attack: 0.05, wet: 0.4 });
  },
  fail() {
    if (!ready()) return;
    [392, 330, 262, 196].forEach((f, i) => tone(f, 0.32, { type: 'triangle', vol: 0.12, delay: i * 0.14, slide: 0.97, wet: 0.3 }));
  },
  skill(id) {
    if (!ready()) return;
    if (id === 'rage') {
      tone(70, 0.6, { type: 'sawtooth', vol: 0.18, slide: 1.6, lp: 700 });
      noise(0.5, { vol: 0.16, f0: 300, f1: 2400, q: 1.2, attack: 0.1 });
      ring(520, 0.5, 0.04, 0.2);
    } else if (id === 'warcry') {
      for (const [f, d] of [[220, 0], [277, 0.12], [330, 0.24]]) tone(f, 0.75, { type: 'sawtooth', vol: 0.09, delay: d, lp: 1400, attack: 0.06, wet: 0.5 });
    } else if (id === 'storm') {
      for (let i = 0; i < 6; i++) noise(0.12, { vol: 0.12, f0: 600, f1: 3500, q: 1.6, delay: i * 0.06, attack: 0.03 });
      ring(1200, 0.6, 0.04, 0.3);
    } else if (id === 'focus') {
      [880, 1109, 1319, 1760].forEach((f, i) => tone(f, 0.3, { vol: 0.07, delay: i * 0.06, wet: 0.5 }));
    } else if (id === 'goldRain') {
      for (let i = 0; i < 14; i++) tone(PENTA[i % PENTA.length] * (i % 2 ? 1 : 0.5), 0.25, { vol: 0.05, delay: i * 0.055 + Math.random() * 0.02, wet: 0.4 });
    }
  },
  win() {
    if (!ready()) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.12, delay: i * 0.09, wet: 0.4 }));
    for (const f of [523, 659, 784]) tone(f, 0.8, { type: 'sawtooth', vol: 0.03, delay: 0.36, lp: 2000, attack: 0.03, wet: 0.5 });
  },
  egg() {
    if (!ready()) return;
    [1047, 1319, 1568, 2093, 2637].forEach((f, i) => tone(f, 0.35, { vol: 0.06, delay: i * 0.07, wet: 0.6 }));
    noise(0.6, { vol: 0.05, type: 'highpass', f0: 6000, attack: 0.2 });
  },
  // An enemy rearing up to strike: a rising growl and a warning bell.
  windup() {
    if (!ready()) return;
    tone(90, 1.2, { type: 'sawtooth', vol: 0.12, slide: 2.2, lp: 900, attack: 0.2 });
    tone(880, 0.12, { type: 'square', vol: 0.05 });
    tone(880, 0.12, { type: 'square', vol: 0.05, delay: 0.18 });
  },
  interrupt() {
    if (!ready()) return;
    ring(1046, 0.7, 0.09);
    tone(220, 0.25, { slide: 0.5, vol: 0.3 });
    noise(0.15, { vol: 0.2, f0: 2500, q: 1.2 });
    [1319, 1568, 2093].forEach((f, i) => tone(f, 0.18, { type: 'triangle', vol: 0.05, delay: 0.08 + i * 0.06, wet: 0.4 }));
  },
  heroHit() {
    if (!ready()) return;
    tone(95, 0.3, { slide: 0.45, vol: 0.5, delay: 0.1 });
    noise(0.2, { vol: 0.25, type: 'lowpass', f0: 1400, f1: 300, delay: 0.1 });
    tone(260, 0.18, { type: 'triangle', vol: 0.08, slide: 0.7, delay: 0.14 });
  },
  heroDown() {
    if (!ready()) return;
    [330, 262, 196, 131].forEach((f, i) => tone(f, 0.4, { type: 'triangle', vol: 0.12, delay: 0.15 + i * 0.16, slide: 0.95, wet: 0.4 }));
  },
  shieldHit() {
    if (!ready() || !limited('shield', 60)) return;
    tone(rnd(1800, 2200), 0.12, { vol: 0.05, wet: 0.3 });
    noise(0.05, { vol: 0.08, type: 'highpass', f0: 5000 });
  },
  shieldBreak() {
    if (!ready()) return;
    noise(0.6, { vol: 0.3, type: 'highpass', f0: 3000, f1: 1200, wet: 0.5 });
    for (let i = 0; i < 6; i++) tone(rnd(1500, 3200), 0.25, { vol: 0.04, delay: i * 0.04, wet: 0.5 });
    tone(140, 0.3, { slide: 0.5, vol: 0.3 });
  },
  blocked() {
    if (!ready() || !limited('blocked', 60)) return;
    ring(rnd(2400, 2900), 0.25, 0.05, 0.07);
  },
  combo(level) {
    if (!ready()) return;
    const base = [784, 880, 988, 1175][Math.min(3, level)];
    [1, 1.25, 1.5].forEach((r, i) => tone(base * r, 0.16, { type: 'triangle', vol: 0.07, delay: i * 0.05, wet: 0.4 }));
  },
  goblin() {
    if (!ready()) return;
    [988, 1175, 988, 1319].forEach((f, i) => tone(f, 0.07, { type: 'square', vol: 0.03, delay: i * 0.07 }));
  },
  goblinFlee() {
    if (!ready()) return;
    [1319, 1175, 988, 784].forEach((f, i) => tone(f, 0.07, { type: 'square', vol: 0.03, delay: i * 0.06 }));
    noise(0.3, { vol: 0.08, f0: 800, f1: 3000, q: 1.4 });
  },
  quest() {
    if (!ready()) return;
    [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.2, { type: 'triangle', vol: 0.09, delay: i * 0.06, wet: 0.4 }));
  },
  chest() {
    if (!ready()) return;
    tone(180, 0.15, { type: 'triangle', vol: 0.15, slide: 1.5 });
    noise(0.12, { vol: 0.1, f0: 900, q: 1.5, delay: 0.05 });
    [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.22, { vol: 0.06, delay: 0.12 + i * 0.06, wet: 0.5 }));
  },
  // A new item: brighter and longer the rarer it is.
  item(rarity = 0) {
    if (!ready()) return;
    const notes = [[659, 988], [659, 988, 1319], [784, 1175, 1568, 1976], [784, 1175, 1568, 2093, 2637]][rarity] || [659, 988];
    notes.forEach((f, i) => tone(f, 0.25 + rarity * 0.08, { type: 'triangle', vol: 0.07, delay: i * 0.07, wet: 0.5 }));
    if (rarity >= 2) noise(0.6, { vol: 0.05, type: 'highpass', f0: 6000, attack: 0.15, wet: 0.5 });
  },
  petSkill(id) {
    if (!ready()) return;
    if (id === 'bark') {
      tone(420, 0.09, { type: 'sawtooth', vol: 0.08, slide: 0.6, lp: 1600 });
      tone(380, 0.11, { type: 'sawtooth', vol: 0.08, slide: 0.6, lp: 1600, delay: 0.14 });
    } else if (id === 'laser') {
      tone(1800, 0.3, { type: 'square', vol: 0.04, slide: 0.3, lp: 4000 });
      tone(900, 0.3, { type: 'sawtooth', vol: 0.03, slide: 0.5 });
    } else if (id === 'breath') {
      noise(0.7, { vol: 0.16, type: 'bandpass', f0: 600, f1: 300, q: 0.7, attack: 0.08 });
      tone(110, 0.6, { type: 'sawtooth', vol: 0.06, lp: 500 });
    }
  },
  revive() {
    if (!ready()) return;
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, 0.3, { type: 'triangle', vol: 0.08, delay: i * 0.05, wet: 0.6 }));
    noise(0.5, { vol: 0.1, f0: 500, f1: 3000, q: 1, attack: 0.1 });
  },
  petShot(kind) {
    if (!ready() || !limited('pet', 120)) return;
    if (kind === 'arrow') tone(rnd(330, 380), 0.12, { type: 'triangle', vol: 0.06, slide: 0.6 });
    else if (kind === 'orb') { tone(rnd(260, 300), 0.22, { vol: 0.08, slide: 2 }); noise(0.18, { vol: 0.04, f0: 800, f1: 2000, q: 2 }); }
    else tone(rnd(1400, 1600), 0.07, { type: 'square', vol: 0.025, slide: 1.6 });
  },
};

// ---- Music ----
// A small lookahead sequencer: bass, arpeggio, pad and soft drums over a chord loop. Each zone
// sets its own key, tempo and drum weight; boss fights add drive.

const MOODS = [
  { root: 57, bpm: 100, chords: [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]], drums: 0.6 },   // Yeşil Çayır
  { root: 55, bpm: 84,  chords: [[0, 3, 7], [5, 8, 12], [-4, 0, 3], [-5, -1, 2]], drums: 0.35 },  // Karanlık Orman
  { root: 59, bpm: 92,  chords: [[0, 3, 7], [-2, 2, 5], [-4, 0, 3], [-5, -1, 2]], drums: 0.4 },   // Kristal Mağara
  { root: 52, bpm: 108, chords: [[0, 4, 7], [1, 5, 8], [0, 4, 7], [-2, 1, 5]], drums: 0.7 },      // Kızıl Çöl
  { root: 62, bpm: 88,  chords: [[0, 3, 7], [-4, 0, 3], [-7, -3, 0], [-5, -1, 2]], drums: 0.3 },  // Buz Diyarı
  { root: 50, bpm: 116, chords: [[0, 3, 7], [1, 4, 8], [-2, 1, 5], [0, 3, 7]], drums: 0.9 },      // Volkan
];

let mood = MOODS[0];
let boss = false;
let step = 0;
let nextTime = 0;
let timer = null;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

export function setMusicMood(zone, isBoss) {
  mood = MOODS[zone % MOODS.length];
  boss = !!isBoss;
}

function note(n, t, dur, { type = 'triangle', vol = 0.1, lp = 2400, attack = 0.01 } = {}) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  const f = ac.createBiquadFilter();
  osc.type = type;
  osc.frequency.value = midi(n);
  f.type = 'lowpass';
  f.frequency.value = lp;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(f).connect(g).connect(musicBus);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function drum(kind, t, vol) {
  if (kind === 'kick') {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.connect(g).connect(musicBus);
    osc.start(t);
    osc.stop(t + 0.25);
  } else {
    const src = ac.createBufferSource();
    src.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = kind === 'hat' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'hat' ? 7000 : 1800;
    const g = ac.createGain();
    const dur = kind === 'hat' ? 0.04 : 0.12;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(musicBus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}

function scheduleStep(t) {
  const s16 = 60 / (boss ? mood.bpm * 1.12 : mood.bpm) / 4;
  const bar = Math.floor(step / 16) % mood.chords.length;
  const pos = step % 16;
  const chord = mood.chords[bar].map((x) => mood.root + x);
  if (pos === 0) {
    for (const n of chord) note(n, t, s16 * 15, { type: 'sine', vol: 0.05, lp: 1200, attack: 0.25 });
  }
  if (pos === 0 || pos === 8 || (pos === 11 && bar % 2)) note(chord[0] - 24, t, s16 * 3, { vol: 0.28, lp: 600 });
  if (pos % 2 === 0) {
    const pattern = [0, 1, 2, 1, 2, 3, 2, 1];
    const i = pattern[(pos / 2) % 8];
    const n = i === 3 ? chord[0] + 12 : chord[i];
    note(n + 12, t, s16 * 1.6, { type: 'triangle', vol: 0.07, lp: 3000 });
  }
  const d = mood.drums * (boss ? 1.4 : 1);
  if (pos === 0 || pos === 8 || (boss && pos === 10)) drum('kick', t, 0.5 * d);
  if (pos === 4 || pos === 12) drum('snare', t, 0.12 * d);
  if (pos % 2 === 1 || boss) drum('hat', t, 0.05 * d);
  step++;
  return s16;
}

function startMusic() {
  nextTime = ac.currentTime + 0.1;
  timer = setInterval(() => {
    if (!ac || ac.state !== 'running') return;
    if (!musicOn) { nextTime = ac.currentTime + 0.1; return; }
    if (nextTime < ac.currentTime) nextTime = ac.currentTime + 0.05;
    while (nextTime < ac.currentTime + 0.25) nextTime += scheduleStep(nextTime);
  }, 60);
}

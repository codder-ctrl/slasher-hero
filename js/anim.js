// Skeletal-style animation for the vector actors. A pose is a flat object of named numbers
// (joint angles, offsets, squash...). Each actor defines a resting pose, a looping idle that
// returns absolute values, and one-shot actions that return offsets added on top. Actions
// fade in and out, so a new swing starting mid-swing blends instead of popping.
// Pure math, no DOM.

export const ease = {
  linear: (t) => t,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  inOut: (t) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t)),
  outBack: (t) => { const c = 1.9; return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2; },
  outCubic: (t) => 1 - (1 - t) ** 3,
  inCubic: (t) => t ** 3,
};

// Value of keyframes [[time, value, easeName?], ...] at time p (0..1). The ease of a key
// shapes the segment that ends at it.
export function track(p, keys) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (p <= t1) {
      const [t0, v0] = keys[i - 1];
      const k = t1 > t0 ? (p - t0) / (t1 - t0) : 1;
      return v0 + (v1 - v0) * (ease[e || 'inOut'])(k);
    }
  }
  return keys[keys.length - 1][1];
}

// Rises from 0 to 1 and back over the action (attack/hurt envelopes).
export const bump = (p, rise = 0.2, fall = 0.5) => (p < rise ? ease.out(p / rise) : p > 1 - fall ? ease.inOut((1 - p) / fall) : 1);

const BLEND = 0.05;      // seconds to blend from the previous pose into a new action
const FADE_OUT = 0.08;   // seconds to fade a finished or stopped action out
const TAU = Math.PI * 2;
const wrap = (a) => a - Math.round(a / TAU) * TAU;

// Plays one actor's animations. `def` = { rest, idle(t, look, state), actions: { name: { dur,
// pose(p, variant, look) -> offsets, hold?, channel?, instant? } }, angles? }.
// Each channel runs one action at a time and channels add up (a flinch on top of a swing).
// A new action takes over its channel from whatever offsets were showing and blends in over
// BLEND seconds; joints listed in `def.angles` take the short way around, so restarting a swing
// that went over the top (offsets past π) never spins the arm the long way.
export function createAnimator(def, look = {}) {
  const angles = def.angles || null;
  const running = [];
  const shown = new Map();   // channel -> offsets displayed last frame
  let time = Math.random() * 10;
  const pose = { ...def.rest };

  return {
    look,
    get time() { return time; },
    // Starts an action, replacing the one on its channel. Returns the instance.
    play(name, variant = 0, speed = 1) {
      const a = def.actions[name];
      if (!a) return null;
      const channel = a.channel || name;
      const from = a.instant ? null : { ...(shown.get(channel) || {}) };
      for (let i = running.length - 1; i >= 0; i--) if (running[i].channel === channel) running.splice(i, 1);
      const inst = { name, a, channel, variant, t: 0, speed, w: 1, out: false, from, blend: 0, shift: null };
      running.push(inst);
      return inst;
    },
    stop(name) { for (const r of running) if (r.name === name) r.out = true; },
    isPlaying(name) { return running.some((r) => r.name === name && !r.out); },
    clear() { running.length = 0; shown.clear(); },
    update(dt, state) {
      time += dt;
      for (let i = running.length - 1; i >= 0; i--) {
        const r = running[i];
        r.t += (dt * r.speed) / r.a.dur;
        r.blend += dt;
        if (r.out) {
          r.w -= dt / FADE_OUT;
          if (r.w <= 0) { running.splice(i, 1); shown.delete(r.channel); continue; }
        } else if (r.t >= 1 && !r.a.hold) {
          r.out = true;
        }
      }
      Object.assign(pose, def.rest, def.idle ? def.idle(time, look, state) : null);
      for (const r of running) {
        const target = r.a.pose(Math.min(1, r.t), r.variant, look);
        const f = r.from ? Math.min(1, r.blend / BLEND) : 1;
        const out = {};
        if (f < 1) {
          for (const k in r.from) if (!(k in target)) target[k] = 0;
        }
        for (const k in target) {
          let v = target[k];
          if (f < 1) {
            const a0 = r.from[k] || 0;
            if (angles && angles.has(k)) {
              // Pick the short way once, on the first frame, and keep it for the whole blend:
              // re-deciding each frame could flip direction when the two poses are opposite.
              r.shift ||= {};
              if (!(k in r.shift)) r.shift[k] = a0 + wrap(v - a0) - v;
              v += r.shift[k];
            }
            v = a0 + (v - a0) * f;
          }
          v *= r.w;
          out[k] = v;
          pose[k] = (pose[k] || 0) + v;
        }
        shown.set(r.channel, out);
      }
      return pose;
    },
    pose,
  };
}

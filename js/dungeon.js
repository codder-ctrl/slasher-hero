import { COMPANIONS, ROLES, DUNGEON, TEAM_SIZE, SYNERGIES, OFFLINE_CAP } from './config.js';
import { dropItem } from './gear.js';

// Dungeon rules: pure, no DOM. The team (state.dungeon.team) auto-battles floor after floor.
// The live fight is `state.dungeonRun`; it isn't saved, so a reload restarts the current floor.
// Events pushed: dg-attack, dg-heal, dg-kill, dg-clear, dg-defeat, dg-start, dg-chest.

const companionIndex = (id) => COMPANIONS.findIndex((c) => c.id === id);
export const findCompanion = (id) => COMPANIONS.find((c) => c.id === id);

export function companionStats(id, level) {
  const def = findCompanion(id);
  const role = ROLES[def.role];
  const k = DUNGEON.companionPower ** companionIndex(id) * DUNGEON.levelGrowth ** (level - 1);
  return {
    hp: Math.round(role.hp * k),
    atk: role.atk * k,
    heal: (role.heal || 0) * k,
    interval: role.interval,
  };
}

export function recruitCost(id) {
  return Math.ceil(DUNGEON.recruitBase * DUNGEON.recruitGrowth ** companionIndex(id));
}

export function levelCost(id, level) {
  return Math.ceil(DUNGEON.levelBase * DUNGEON.levelCostGrowth ** (level - 1) * Math.sqrt(DUNGEON.companionPower ** companionIndex(id)));
}

export const isBossFloor = (floor) => floor % DUNGEON.bossEvery === 0;

export function floorEnemies(floor, rng = Math.random) {
  const boss = isBossFloor(floor);
  const count = boss ? 1 : floor < 3 ? 2 : 3;
  const hp = DUNGEON.enemyHp * DUNGEON.hpGrowth ** (floor - 1) * (boss ? DUNGEON.bossHp : 1);
  const atk = DUNGEON.enemyAtk * DUNGEON.atkGrowth ** (floor - 1) * (boss ? DUNGEON.bossAtk : 1);
  return Array.from({ length: count }, (_, i) => ({
    look: Math.floor(rng() * DUNGEON.enemies.length),
    boss,
    hp: Math.ceil(hp),
    maxHp: Math.ceil(hp),
    atk,
    cd: DUNGEON.enemyInterval * (0.6 + i * 0.25),
  }));
}

// Kristal for each enemy killed and for clearing a floor.
export const killKristal = (floor) => Math.ceil(floor / 4);
export const clearKristal = (floor) => 2 + Math.floor(floor / 2) + (isBossFloor(floor) ? floor : 0);

// Synergies the given team (companion ids) has active.
export function activeSynergies(team) {
  const roles = team.map((id) => findCompanion(id)?.role).filter(Boolean);
  const count = (r) => roles.filter((x) => x === r).length;
  return SYNERGIES.filter((syn) => (syn.distinct ? new Set(roles).size >= syn.distinct
    : Object.entries(syn.need).every(([role, n]) => count(role) >= n)));
}

// Stat multipliers a fighter with `role` gets from the active synergies.
export function synergyBonus(synergies, role) {
  const out = { atk: 1, hp: 1, heal: 1 };
  for (const syn of synergies) {
    if (syn.roles && !syn.roles.includes(role)) continue;
    for (const k in syn.bonus) out[k] *= 1 + syn.bonus[k];
  }
  return out;
}

function makeFighters(state) {
  const team = state.dungeon.team.filter((id) => state.companions[id] > 0);
  const synergies = activeSynergies(team);
  return team.map((id, i) => {
    const role = findCompanion(id).role;
    const s = companionStats(id, state.companions[id]);
    const b = synergyBonus(synergies, role);
    const hp = Math.round(s.hp * b.hp);
    return { id, role, hp, maxHp: hp, atk: s.atk * b.atk, heal: s.heal * b.heal, interval: s.interval, cd: s.interval * (0.3 + i * 0.2) };
  });
}

// Starts the current floor from scratch with the team at full health.
export function restartDungeon(state, rng = Math.random, events = []) {
  const fighters = makeFighters(state);
  state.dungeonRun = {
    phase: fighters.length ? 'fight' : 'idle',
    t: 0,
    fighters,
    enemies: fighters.length ? floorEnemies(state.dungeon.floor, rng) : [],
  };
  events.push({ type: 'dg-start', floor: state.dungeon.floor });
}

const alive = (list) => list.filter((x) => x.hp > 0);

function enemyTarget(fighters) {
  const living = alive(fighters);
  return living.find((f) => f.role === 'tank') || living[0];
}

function act(state, f, run, events) {
  const enemies = alive(run.enemies);
  if (!enemies.length) return;
  if (f.role === 'healer') {
    const hurt = alive(run.fighters).filter((x) => x.hp < x.maxHp * 0.9).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (hurt) {
      const amount = Math.min(f.heal, hurt.maxHp - hurt.hp);
      hurt.hp += amount;
      events.push({ type: 'dg-heal', from: f.id, to: run.fighters.indexOf(hurt), amount });
      return;
    }
  }
  const targets = f.role === 'mage' ? enemies : [enemies[0]];
  for (const e of targets) {
    e.hp -= f.atk;
    events.push({ type: 'dg-attack', side: 'team', from: run.fighters.indexOf(f), to: run.enemies.indexOf(e), dmg: f.atk });
    if (e.hp <= 0) {
      e.hp = 0;
      const k = killKristal(state.dungeon.floor);
      state.kristal += k;
      events.push({ type: 'dg-kill', to: run.enemies.indexOf(e), kristal: k });
    }
  }
}

export function tickDungeon(state, dt, rng = Math.random, events = []) {
  let run = state.dungeonRun;
  if (!run) { restartDungeon(state, rng, events); run = state.dungeonRun; }
  if (run.phase === 'idle') return events;

  if (run.phase === 'clear' || run.phase === 'defeat') {
    run.t -= dt;
    if (run.t > 0) return events;
    if (run.phase === 'clear') {
      // Next floor: survivors keep their health plus a top-up; the fallen get back up at the same share.
      for (const f of run.fighters) f.hp = Math.min(f.maxHp, Math.max(f.hp, 0) + f.maxHp * DUNGEON.healBetween);
      run.enemies = floorEnemies(state.dungeon.floor, rng);
      run.phase = 'fight';
      events.push({ type: 'dg-start', floor: state.dungeon.floor });
    } else {
      // Retreat one floor so the team keeps earning kristal instead of losing forever.
      state.dungeon.floor = Math.max(1, state.dungeon.floor - 1);
      restartDungeon(state, rng, events);
    }
    return events;
  }

  for (const f of run.fighters) {
    if (f.hp <= 0) continue;
    f.cd -= dt;
    if (f.cd <= 0) { f.cd += f.interval; act(state, f, run, events); }
  }
  for (const e of run.enemies) {
    if (e.hp <= 0) continue;
    e.cd -= dt;
    if (e.cd > 0) continue;
    e.cd += DUNGEON.enemyInterval;
    const target = enemyTarget(run.fighters);
    if (!target) break;
    target.hp = Math.max(0, target.hp - e.atk);
    events.push({ type: 'dg-attack', side: 'enemy', from: run.enemies.indexOf(e), to: run.fighters.indexOf(target), dmg: e.atk });
  }

  if (!alive(run.enemies).length) {
    const floor = state.dungeon.floor;
    let kristal = clearKristal(floor);
    let elmas = 0;
    if (floor > state.dungeon.best) {
      state.dungeon.best = floor;
      if (isBossFloor(floor)) elmas = DUNGEON.bossElmas;
      // Every 10th floor cleared for the first time opens a chest.
      if (floor % DUNGEON.chestEvery === 0) {
        const bonus = DUNGEON.chestKristal * floor;
        kristal += bonus;
        const item = dropItem(state, rng, events, 'dungeon');
        events.push({ type: 'dg-chest', floor, kristal: bonus, item });
      }
    }
    state.kristal += kristal;
    state.elmas += elmas;
    state.dungeon.floor = floor + 1;
    run.phase = 'clear';
    run.t = DUNGEON.clearPause;
    state.stats.floors++;
    events.push({ type: 'dg-clear', floor, kristal, elmas });
  } else if (!alive(run.fighters).length) {
    run.phase = 'defeat';
    run.t = DUNGEON.defeatPause;
    events.push({ type: 'dg-defeat', floor: state.dungeon.floor });
  }
  return events;
}

// ---- Team and upgrades (all cost kristal) ----

export function recruit(state, id, rng) {
  if (!findCompanion(id) || state.companions[id] > 0) return false;
  const cost = recruitCost(id);
  if (state.kristal < cost) return false;
  state.kristal -= cost;
  state.companions[id] = 1;
  if (state.dungeon.team.length < TEAM_SIZE) { state.dungeon.team.push(id); restartDungeon(state, rng); }
  return true;
}

export function levelUpCompanion(state, id, rng) {
  const level = state.companions[id];
  if (!(level > 0)) return false;
  const cost = levelCost(id, level);
  if (state.kristal < cost) return false;
  state.kristal -= cost;
  state.companions[id] = level + 1;
  if (state.dungeon.team.includes(id)) restartDungeon(state, rng);
  return true;
}

// Adds a recruited companion to the team or takes it out. A full team refuses additions.
export function toggleTeam(state, id, rng) {
  const team = state.dungeon.team;
  const i = team.indexOf(id);
  if (i >= 0) team.splice(i, 1);
  else if (state.companions[id] > 0 && team.length < TEAM_SIZE) team.push(id);
  else return false;
  restartDungeon(state, rng);
  return true;
}

// ---- Time away ----

// Runs the dungeon forward for `seconds` the game was closed (up to OFFLINE_CAP), in coarse
// steps. Returns what it earned: { floors (best floor gained), kristal, elmas, items }.
export function offlineDungeon(state, seconds, rng = Math.random) {
  const total = Math.min(seconds, OFFLINE_CAP);
  if (!(total > 0) || !state.dungeon.team.some((id) => state.companions[id] > 0)) return { floors: 0, kristal: 0, elmas: 0, items: 0 };
  const before = { best: state.dungeon.best, kristal: state.kristal, elmas: state.elmas };
  let items = 0;
  const step = DUNGEON.offlineStep;
  for (let t = 0; t < total; t += step) {
    const events = [];
    tickDungeon(state, step, rng, events);
    for (const e of events) if (e.type === 'item') items++;
  }
  return {
    floors: state.dungeon.best - before.best,
    kristal: state.kristal - before.kristal,
    elmas: state.elmas - before.elmas,
    items,
  };
}

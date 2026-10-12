import {
  SAVE_VERSION, GAME_ID, KILLS_PER_STAGE, BOSS_EVERY, BOSS_TIME, BOSS_HP_MULT, STAGES_PER_ZONE,
  HP_BASE, HP_GROWTH, GOLD_PER_HP, RESPAWN_DELAY, BASE_CRIT_CHANCE, CRIT_CHANCE_STEP,
  MAX_CRIT_CHANCE, BASE_CRIT_MULT, CRIT_MULT_STEP, GREED_STEP, SPIRIT_STEP, MILESTONE_EVERY,
  MILESTONE_MULT, PRESTIGE_MIN_STAGE, SOUL_BONUS, OFFLINE_MIN, OFFLINE_CAP, OFFLINE_RATE,
  BUY_AMOUNTS, UPGRADES, SKILLS, ZONES, MAX_SKILL_CRIT_CHANCE, PET_TRAINING, PET_BASE_DPS,
  PET_DPS_GROWTH, EGG_COST, STARTING_ELMAS, BOSS_ELMAS, STARTER_PET, FORM_MULT, STAR_BONUS, MAX_STARS,
  DUPLICATE_KRISTAL, RARITIES, PETS, COMPANIONS, STARTER_TEAM, TEAM_SIZE, DAILY, MAIL,
  HERO, COMBO, ATTACK, SHIELD, SPECIALS, QUESTS, QUESTS_PER_DAY, QUEST_BONUS, ACHIEVEMENTS, ACHIEVEMENT_ELMAS,
  ABILITY_FORM_MULT, EQUIP, ZONE_BOSS_ELMAS, RAID, MEGA_BOSSES,
} from './config.js';
import { tickDungeon } from './dungeon.js';
import { newEquipment, gearTotals, dropItem, loadEquipment } from './gear.js';
import { treeValue, loadTree } from './souls.js';

// Pure game rules: no DOM, no timers. Functions that change the game take the state object,
// mutate it, and push what happened ({ type: 'hit' | 'kill' | 'unlock' | 'stage' | 'spawn' |
// 'bossFail' | 'windup' | 'interrupt' | 'heroHit' | 'heroDown' | 'shieldBreak' | 'combo' |
// 'goblinFlee' | 'eliteFlee', ... }) onto an `events` array so the renderer can animate it.

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function newGame(rng = Math.random, now = Date.now()) {
  const state = {
    v: SAVE_VERSION,
    gold: 0,
    souls: 0,
    stage: 1,
    maxStage: 1,        // highest unlocked stage in this run
    kills: 0,           // progress on maxStage
    autoAdvance: true,
    upgrades: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    training: { [PET_TRAINING.id]: 0 },   // Pet Eğitimi level (gold, resets on rebirth)
    pets: { [STARTER_PET]: { form: 1, stars: 0 } },
    activePet: STARTER_PET,
    elmas: STARTING_ELMAS,
    kristal: 0,
    companions: Object.fromEntries(COMPANIONS.map((c) => [c.id, STARTER_TEAM.includes(c.id) ? 1 : 0])),
    dungeon: { floor: 1, best: 0, team: [...STARTER_TEAM] },
    dungeonRun: null,  // live dungeon fight; not saved
    skills: Object.fromEntries(SKILLS.map((s) => [s.id, 0])),
    skillTimers: Object.fromEntries(SKILLS.map((s) => [s.id, { active: 0, cooldown: 0 }])),
    stormAcc: 0,       // fractional auto-taps carried between ticks
    stats: {
      taps: 0, crits: 0, kills: 0, bossKills: 0, skillsUsed: 0, eggs: 0, totalGold: 0, prestiges: 0, playTime: 0, bestStage: 1,
      maxCombo: 0, interrupts: 0, shields: 0, goblins: 0, elites: 0, floors: 0, levels: 0, heroDowns: 0,
    },
    combo: { count: 0, timer: 0 },   // live; not saved
    hero: { hp: 0 },                 // live; not saved, refilled on load
    quests: { day: '', list: [], combo: 0, bonus: false },
    achievements: {},                // id -> tiers collected
    equipment: newEquipment(),
    soulPoints: 0,                   // unspent soul tree points
    soulTree: {},                    // node id -> level
    petFx: { timer: 3, burn: 0, burnDps: 0 },  // live pet ability timers; not saved
    settings: { sound: true, music: true, buyAmount: 1, autoSalvage: false },
    daily: { last: '', streak: 0 },  // last claim as a local YYYY-MM-DD and the streak it made
    mail: { claimed: [], read: [] },
    seen: { version: '', news: [] }, // what the player has opened in the blog (for the badge)
    raid: { keys: 0, day: '', wins: {} },  // mega boss keys (refilled per local day) and wins by id
    enemy: null,
    lastSeen: now,
  };
  state.hero.hp = heroMaxHp(state);
  spawnEnemy(state, rng);
  return state;
}

// ---- Stages and enemies ----

export const isBossStage = (stage) => stage % BOSS_EVERY === 0;
export const zoneIndex = (stage) => Math.floor((stage - 1) / STAGES_PER_ZONE) % ZONES.length;
// The last stage of every zone holds its zone boss.
export const isZoneBossStage = (stage) => stage % STAGES_PER_ZONE === 0;
// Tours: one pass through all the zones (stages 1–60, 61–120, …), counted from 0.
export const TOUR_LENGTH = STAGES_PER_ZONE * ZONES.length;
export const tourIndex = (stage) => Math.floor((stage - 1) / TOUR_LENGTH);

// The zone boss of a stage's zone, in its colors for that tour.
export function zoneBoss(stage) {
  const boss = ZONES[zoneIndex(stage)].boss;
  if (!boss) return null;
  const tour = tourIndex(stage);
  const colors = tour > 0 && boss.tours?.length ? boss.tours[(tour - 1) % boss.tours.length] : boss.colors;
  return { actor: boss.actor, name: boss.name, colors, tour };
}

// What the current enemy is: { actor, name, colors }, plus `zoneBoss` for a zone boss.
export function enemySpec(state, e = state.enemy, stage = state.stage) {
  if (e.variant === 'goblin') return SPECIALS.goblin;
  if (e.variant === 'raid') {
    const m = findMega(e.mega);
    return { actor: m.actor, name: m.name, colors: m.colors, mega: true };
  }
  const zb = e.boss && isZoneBossStage(stage) ? zoneBoss(stage) : null;
  if (zb) return { ...zb, zoneBoss: true };
  const zone = ZONES[zoneIndex(stage)];
  return zone.enemies[e.kind] ?? zone.enemies[0];
}

export function enemyMaxHp(stage, boss = false) {
  const hp = HP_BASE * HP_GROWTH ** (stage - 1);
  return Math.ceil(boss ? hp * BOSS_HP_MULT : hp);
}

export function enemyGold(state, stage, boss = false) {
  return Math.max(1, Math.ceil(enemyMaxHp(stage, boss) * GOLD_PER_HP * goldMultiplier(state)));
}

// Ordinary enemies may roll a special variant: 'goblin' (runs off with gold), 'elite' (tougher,
// attacks) or 'armored' (only crits hit fully).
function rollVariant(state, rng) {
  if (state.stage < SPECIALS.minStage) return 'normal';
  let x = rng();
  for (const v of ['goblin', 'elite', 'armored']) {
    if ((x -= SPECIALS[v].chance) < 0) return v;
  }
  return 'normal';
}

export function spawnEnemy(state, rng = Math.random) {
  const boss = isBossStage(state.stage);
  const zone = ZONES[zoneIndex(state.stage)];
  const kind = Math.floor(rng() * zone.enemies.length);
  const variant = boss ? 'boss' : rollVariant(state, rng);
  const mult = variant === 'goblin' ? SPECIALS.goblin.hp : variant === 'elite' ? SPECIALS.elite.hp : 1;
  const maxHp = Math.ceil(enemyMaxHp(state.stage, boss) * mult);
  const shield = boss && state.stage % SHIELD.every === 0 ? Math.ceil(maxHp * SHIELD.shield) : 0;
  const attacks = boss || variant === 'elite';
  state.enemy = {
    kind,
    boss,
    variant,
    hp: maxHp,
    maxHp,
    shield,
    shieldMax: shield,
    timeLeft: boss ? bossTime(state) : variant === 'goblin' ? SPECIALS.goblin.flee : 0,
    respawn: 0,
    stun: 0,
    attack: attacks ? { cd: ATTACK.first, windup: 0, need: 0 } : null,
  };
  // A fresh boss fight starts at full health.
  if (boss) state.hero.hp = heroMaxHp(state);
}

// Moves to another unlocked stage and spawns its enemy right away.
export function setStage(state, stage, rng = Math.random, events = []) {
  if (inRaid(state)) return false;
  stage = clamp(Math.round(stage), 1, state.maxStage);
  if (stage === state.stage) return false;
  state.stage = stage;
  spawnEnemy(state, rng);
  events.push({ type: 'stage', stage });
  return true;
}

// ---- Damage ----

export const milestoneMultiplier = (level) => MILESTONE_MULT ** Math.floor(level / MILESTONE_EVERY);
export const soulMultiplier = (state) => 1 + state.souls * SOUL_BONUS;

// Passive pet abilities (Kedi's crit, Drone's gold) count only for the active pet.
const passive = (state, id) => { const a = petAbility(state); return a?.id === id ? a.power : 0; };

export const goldMultiplier = (state) => (1 + state.upgrades.greed * GREED_STEP)
  * (1 + gearTotals(state).gold) * (1 + treeValue(state, 'goldPower')) * (1 + passive(state, 'scan')) * (1 + trophyValue(state, 'gold'));
export const critMultiplier = (state) => BASE_CRIT_MULT + state.upgrades.critDmg * CRIT_MULT_STEP + gearTotals(state).critDmg
  + trophyValue(state, 'critDmg');

export function critChance(state) {
  const base = Math.min(MAX_CRIT_CHANCE, BASE_CRIT_CHANCE + state.upgrades.crit * CRIT_CHANCE_STEP);
  return Math.min(MAX_SKILL_CRIT_CHANCE, base + passive(state, 'keen') + activeSkillPower(state, 'focus', 0));
}

export const bossTime = (state) => BOSS_TIME + treeValue(state, 'bossTime');
export const stunDuration = (state) => ATTACK.stun + gearTotals(state).stun;
export const comboWindow = (state) => COMBO.window + gearTotals(state).combo + treeValue(state, 'comboTime');

// ---- Pets ----

export const findPet = (id) => PETS.find((p) => p.id === id);
export const findRarity = (id) => RARITIES.find((r) => r.id === id);

// Damage of the Pet Eğitimi level alone (a 1× pet, no souls).
export function trainingDps(level) {
  return level > 0 ? PET_BASE_DPS * level * PET_DPS_GROWTH ** (level - 1) : 0;
}

// An owned pet's multiplier: rarity × evolution form × stars.
export function petMultiplier(state, id) {
  const owned = state.pets[id];
  if (!owned) return 0;
  return findRarity(findPet(id).rarity).mult * FORM_MULT[owned.form - 1] * (1 + STAR_BONUS * owned.stars);
}

// Pet damage per second without Savaş Narası (the shop shows base values).
export function petDps(state, level = state.training[PET_TRAINING.id], id = state.activePet) {
  return trainingDps(level) * petMultiplier(state, id) * soulMultiplier(state)
    * (1 + gearTotals(state).pet) * (1 + treeValue(state, 'petPower')) * (1 + trophyValue(state, 'pet'));
}

// The active pet's ability with its power scaled by the evolution form, or null.
export function petAbility(state, id = state.activePet) {
  const pet = findPet(id);
  const owned = state.pets[id];
  if (!pet?.ability || !owned) return null;
  return { ...pet.ability, power: pet.ability.power * ABILITY_FORM_MULT[owned.form - 1] };
}

export function totalDps(state) {
  return petDps(state) * activeSkillPower(state, 'warcry', 1);
}

export function swordDamage(state, level = state.upgrades.sword) {
  return (1 + level) * milestoneMultiplier(level) * soulMultiplier(state);
}

export function tapDamage(state, spirit = state.upgrades.spirit) {
  return (swordDamage(state) + totalDps(state) * spirit * SPIRIT_STEP) * activeSkillPower(state, 'rage', 1)
    * (1 + gearTotals(state).tap) * (1 + treeValue(state, 'tapPower')) * (1 + trophyValue(state, 'tap'));
}

// ---- Hero health, armor and combo ----

export function heroMaxHp(state, level = state.upgrades.vitality) {
  return Math.round(HERO.hpBase * HERO.hpGrowth ** level * soulMultiplier(state) * (1 + gearTotals(state).hp) * (1 + trophyValue(state, 'hp')));
}

export const heroArmor = (state, level = state.upgrades.armor) => HERO.armorPerLevel * level + gearTotals(state).armor;

// Share of damage that gets through: armorK / (armorK + armor). Never reaches zero.
export const damageTakenMultiplier = (armor) => HERO.armorK / (HERO.armorK + Math.max(0, armor));

// Damage of one landed attack by the current enemy, after armor.
// A mega boss hits at the strength of its own stage (`atkStage`), times its `atkMult`.
export function attackDamage(state, e = state.enemy, stage = e.atkStage || state.stage) {
  const ease = Math.min(1, stage / ATTACK.ramp);
  const base = ATTACK.atkBase * ATTACK.atkGrowth ** (stage - 1) * ease * (e.boss ? 1 : ATTACK.eliteAtk) * (e.atkMult || 1);
  return base * damageTakenMultiplier(heroArmor(state));
}

export function comboTier(count) {
  let tier = null;
  for (const t of COMBO.tiers) if (count >= t.at) tier = t;
  return tier;
}

export const comboMultiplier = (state) => comboTier(state.combo.count)?.mult ?? 1;

// ---- Active skills ----

export const findSkill = (id) => SKILLS.find((s) => s.id === id);

// Effect strength at a level: a multiplier for rage/warcry, taps per second for storm, added
// crit chance for focus, and enemies' worth of gold for goldRain.
export function skillPower(id, level) {
  if (level <= 0) return 0;
  switch (id) {
    case 'rage':
    case 'warcry': return 1.5 + 0.5 * level;
    case 'storm': return 6 + level;
    case 'focus': return 0.2 + 0.03 * level;
    case 'goldRain': return 15 + 5 * level;
    default: return 0;
  }
}

export const isSkillActive = (state, id) => state.skillTimers[id].active > 0;

function activeSkillPower(state, id, fallback) {
  return isSkillActive(state, id) ? skillPower(id, state.skills[id]) : fallback;
}

export function skillUnlocked(state, def) {
  return state.maxStage >= def.unlockStage || state.skills[def.id] > 0;
}

export function canUseSkill(state, id) {
  return state.skills[id] > 0 && state.skillTimers[id].cooldown <= 0;
}

// Durations and cooldowns after the soul tree (Uzun Öfke, Hızlı Toparlanma).
export const skillDuration = (state, def) => def.duration * (1 + treeValue(state, 'skillTime'));
export const skillCooldown = (state, def) => def.cooldown * (1 - treeValue(state, 'cooldown'));

export function useSkill(state, id, events = []) {
  const def = findSkill(id);
  if (!def || !canUseSkill(state, id)) return false;
  const t = state.skillTimers[id];
  t.active = skillDuration(state, def);
  t.cooldown = skillCooldown(state, def);
  state.stats.skillsUsed++;
  const ev = { type: 'skill', id };
  if (id === 'goldRain') {
    const stage = isBossStage(state.stage) ? state.stage - 1 : state.stage;
    ev.gold = Math.ceil(enemyGold(state, stage) * skillPower(id, state.skills[id]));
    addGold(state, ev.gold);
  }
  events.push(ev);
  return true;
}

// Runs skill timers forward without combat (time spent away).
export function elapseSkills(state, seconds) {
  for (const s of SKILLS) {
    const t = state.skillTimers[s.id];
    t.active = Math.max(0, t.active - seconds);
    t.cooldown = Math.max(0, t.cooldown - seconds);
  }
}

function updateSkills(state, dt, rng, events) {
  const stormOn = isSkillActive(state, 'storm');
  elapseSkills(state, dt);
  if (!stormOn) { state.stormAcc = 0; return; }
  state.stormAcc += skillPower('storm', state.skills.storm) * dt;
  while (state.stormAcc >= 1) {
    state.stormAcc--;
    tap(state, rng, events, true);
  }
}

function addGold(state, amount) {
  state.gold += amount;
  state.stats.totalGold += amount;
}

const VARIANT_GOLD = { goblin: SPECIALS.goblin.gold, elite: SPECIALS.elite.gold };

function killEnemy(state, events, rng = Math.random) {
  const e = state.enemy;
  if (e.variant === 'raid') { raidWon(state, events, rng); return; }
  const gold = enemyGold(state, state.stage, e.boss) * (VARIANT_GOLD[e.variant] || 1);
  e.hp = 0;
  e.respawn = RESPAWN_DELAY;
  addGold(state, gold);
  state.stats.kills++;
  if (e.boss) state.stats.bossKills++;
  if (e.variant === 'goblin') state.stats.goblins++;
  if (e.variant === 'elite') state.stats.elites++;
  events.push({ type: 'kill', gold, boss: e.boss, variant: e.variant });

  if (state.stage === state.maxStage) {
    state.kills = e.boss ? KILLS_PER_STAGE : state.kills + 1;
    if (state.kills >= KILLS_PER_STAGE) {
      state.maxStage++;
      state.kills = 0;
      if (state.maxStage > state.stats.bestStage) {
        state.stats.bestStage = state.maxStage;
        // A boss beaten for the first time ever pays elmas and an item.
        if (e.boss) {
          const zone = isZoneBossStage(state.stage);
          const amount = BOSS_ELMAS + (zone ? ZONE_BOSS_ELMAS : 0);
          state.elmas += amount;
          events.push({ type: 'elmas', amount, zoneBoss: zone });
          e.dropped = true;
          dropItem(state, rng, events, 'boss');
        }
      }
      events.push({ type: 'unlock', stage: state.maxStage });
    }
  }
  // Repeat boss wins sometimes drop an item too.
  if (e.boss && !e.dropped && rng() < EQUIP.bossChance) dropItem(state, rng, events, 'boss');
  // The next enemy spawns from the new stage once the respawn delay ends.
  if (state.autoAdvance && state.stage < state.maxStage) {
    state.stage++;
    events.push({ type: 'stage', stage: state.stage });
  }
}

// Applies damage from a tap or the pet (`pet` true) after the enemy's defenses. Returns
// { dmg, blocked, shield } describing what happened, for the hit event.
function damageEnemy(state, dmg, events, { crit = false, pet = false, rng = Math.random } = {}) {
  const e = state.enemy;
  const out = { dmg, blocked: false, shield: false };
  if (e.variant === 'armored' && !crit) { dmg *= SPECIALS.armored.nonCrit; out.blocked = true; }
  if (e.stun > 0) dmg *= ATTACK.stunBonus;
  if (e.shield > 0) {
    const hit = pet ? dmg * SHIELD.petMult : dmg;
    e.shield -= hit;
    out.dmg = hit;
    out.shield = true;
    if (e.shield <= 0) {
      e.shield = 0;
      state.stats.shields++;
      stun(e, stunDuration(state));
      events.push({ type: 'shieldBreak' });
    }
    return out;
  }
  out.dmg = dmg;
  e.hp -= dmg;
  if (e.hp <= 0) killEnemy(state, events, rng);
  else if (e.variant === 'raid') updatePhase(e, events);
  return out;
}

// Stuns the enemy for `duration` seconds; a wind-up in progress is cancelled.
function stun(e, duration) {
  e.stun = Math.max(e.stun, duration);
  if (e.attack && e.attack.windup > 0) { e.attack.windup = 0; e.attack.cd = ATTACK.every; }
}

// A combo keeps going while hits come within COMBO.window seconds of each other.
function addCombo(state, events) {
  const c = state.combo;
  const before = comboTier(c.count);
  c.count++;
  c.timer = comboWindow(state);
  if (c.count > state.stats.maxCombo) state.stats.maxCombo = c.count;
  if (c.count > state.quests.combo) state.quests.combo = c.count;
  const after = comboTier(c.count);
  if (after && after !== before) events.push({ type: 'combo', count: c.count, mult: after.mult });
}

// A tap (player's, or `auto` from Kılıç Fırtınası). Returns the hit event, or null while the
// next enemy is still on its way.
// Player taps also build the combo and can interrupt an enemy's wind-up.
export function tap(state, rng = Math.random, events = [], auto = false) {
  const e = state.enemy;
  if (e.respawn > 0) return null;
  if (!auto) {
    state.stats.taps++;
    addCombo(state, events);
    const a = e.attack;
    if (a && a.windup > 0 && --a.need <= 0) {
      stun(e, stunDuration(state));
      state.stats.interrupts++;
      events.push({ type: 'interrupt' });
    }
  }
  const crit = rng() < critChance(state);
  const dmg = tapDamage(state) * (crit ? critMultiplier(state) : 1) * (auto ? 1 : comboMultiplier(state))
    * (e.boss ? 1 + gearTotals(state).boss : 1);
  if (crit) state.stats.crits++;
  const hit = { type: 'hit', dmg, crit, auto, combo: state.combo.count };
  events.push(hit);
  const res = damageEnemy(state, dmg, events, { crit, rng });
  hit.dmg = res.dmg;
  hit.blocked = res.blocked;
  hit.shield = res.shield;
  return hit;
}

// The current enemy's attack cycle: cooldown, wind-up (interruptible), then the hit.
function updateAttack(state, dt, rng, events) {
  const e = state.enemy;
  const a = e.attack;
  if (!a || e.stun > 0) return;
  if (a.windup > 0) {
    a.windup -= dt;
    if (a.windup > 0) return;
    a.windup = 0;
    a.cd = e.every || (e.boss ? ATTACK.every : ATTACK.eliteEvery);
    const dmg = attackDamage(state);
    state.hero.hp -= dmg;
    events.push({ type: 'heroHit', dmg });
    if (state.hero.hp <= 0) {
      // Anka's Küllerinden Doğuş: once per fight the hero gets back up instead.
      const ab = petAbility(state);
      if (ab?.id === 'revive' && !e.revived) {
        e.revived = true;
        state.hero.hp = heroMaxHp(state) * Math.min(1, ab.power);
        events.push({ type: 'revive' });
      } else {
        heroDown(state, rng, events);
      }
    }
    return;
  }
  a.cd -= dt;
  if (a.cd <= 0) {
    a.windup = e.windupTime || ATTACK.windup;
    a.need = ATTACK.taps;
    events.push({ type: 'windup' });
  }
}

// Timed pet abilities: Havlama stuns, Lazer hits hard, Alev Nefesi burns for a few seconds.
function updatePetAbility(state, dt, rng, events) {
  const fx = state.petFx;
  const e = state.enemy;
  if (fx.burn > 0) {
    fx.burn -= dt;
    damageEnemy(state, fx.burnDps * dt, events, { pet: true, rng });
    if (e.hp <= 0) return;
  }
  const ab = petAbility(state);
  if (!ab?.every || totalDps(state) <= 0) return;
  if ((fx.timer -= dt) > 0) return;
  fx.timer = ab.every;
  if (ab.id === 'bark') {
    stun(e, ab.power);
    events.push({ type: 'petSkill', id: ab.id });
  } else if (ab.id === 'laser') {
    events.push({ type: 'petSkill', id: ab.id });
    damageEnemy(state, petDps(state) * ab.power, events, { pet: true, rng });
  } else if (ab.id === 'breath') {
    fx.burn = ab.burn;
    fx.burnDps = petDps(state) * ab.power;
    events.push({ type: 'petSkill', id: ab.id });
  }
}

// Knocked out: a boss fight is lost like a timeout; an elite runs off. The hero gets back up.
function heroDown(state, rng, events) {
  const e = state.enemy;
  state.stats.heroDowns++;
  state.hero.hp = heroMaxHp(state);
  events.push({ type: 'heroDown', boss: e.boss });
  if (e.variant === 'raid') {
    raidLost(state, events, rng, 'down');
  } else if (e.boss) {
    state.autoAdvance = false;
    events.push({ type: 'bossFail', down: true });
    setStage(state, state.stage - 1, rng, events);
  } else {
    e.hp = 0;
    e.respawn = RESPAWN_DELAY;
    events.push({ type: 'eliteFlee' });
  }
}

// Advances time: skills, respawn delay, helper damage and the boss timer.
export function tick(state, dt, rng = Math.random, events = []) {
  state.stats.playTime += dt;
  const c = state.combo;
  if (c.count > 0 && (c.timer -= dt) <= 0) { c.count = 0; c.timer = 0; }
  updateSkills(state, dt, rng, events);
  tickDungeon(state, dt, rng, events);
  const e = state.enemy;
  // Out of danger the hero heals up.
  const max = heroMaxHp(state);
  if (!(e.attack && e.respawn <= 0) && state.hero.hp < max) state.hero.hp = Math.min(max, state.hero.hp + max * HERO.regen * dt);
  if (state.hero.hp > max) state.hero.hp = max;
  if (e.respawn > 0) {
    e.respawn -= dt;
    if (e.respawn <= 0) {
      spawnEnemy(state, rng);
      events.push({ type: 'spawn' });
    }
    return events;
  }
  const dps = totalDps(state);
  if (dps > 0) damageEnemy(state, dps * dt, events, { pet: true, rng });
  if (e.stun > 0) e.stun = Math.max(0, e.stun - dt);
  if (e.hp > 0 && e.respawn <= 0) updatePetAbility(state, dt, rng, events);
  if (e.hp > 0 && e.respawn <= 0) updateAttack(state, dt, rng, events);
  if (state.enemy !== e || e.respawn > 0) return events;
  if (e.variant === 'goblin') {
    e.timeLeft -= dt;
    if (e.timeLeft <= 0) {
      // The goblin got away: no gold, no kill.
      e.hp = 0;
      e.respawn = RESPAWN_DELAY;
      events.push({ type: 'goblinFlee' });
    }
  }
  if (e.boss && e.hp > 0) {
    e.timeLeft -= dt;
    if (e.timeLeft <= 0 && e.variant === 'raid') {
      raidLost(state, events, rng, 'time');
    } else if (e.timeLeft <= 0) {
      // Failing a boss drops back a stage and stops auto-advance until the player retries.
      state.autoAdvance = false;
      events.push({ type: 'bossFail' });
      setStage(state, state.stage - 1, rng, events);
    }
  }
  return events;
}

// ---- Shop ----

const TABLES = { upgrade: UPGRADES, pet: [PET_TRAINING], skill: SKILLS };
const LEVEL_KEYS = { upgrade: 'upgrades', pet: 'training', skill: 'skills' };
export const findDef = (kind, id) => TABLES[kind]?.find((d) => d.id === id);
const levelsOf = (state, kind) => state[LEVEL_KEYS[kind]];

// Total cost of the next `n` levels starting from `level` (geometric series).
export function costFor(def, level, n = 1) {
  const g = def.growth;
  const first = def.baseCost * g ** level;
  return Math.ceil(n === 1 ? first : first * (g ** n - 1) / (g - 1));
}

export function maxAffordable(def, level, gold) {
  const room = def.max - level;
  if (room <= 0 || gold < costFor(def, level, 1)) return 0;
  const g = def.growth;
  const first = def.baseCost * g ** level;
  let n = Math.floor(Math.log(gold * (g - 1) / first + 1) / Math.log(g));
  n = clamp(n, 1, room);
  // Correct for float error in the closed form.
  while (n > 1 && costFor(def, level, n) > gold) n--;
  while (n < room && costFor(def, level, n + 1) <= gold) n++;
  return n;
}

// How many levels a buy button would purchase and what it costs. For 'max' with nothing
// affordable it reports the next single level, so the button can show a price.
export function purchasePlan(def, level, gold, amount) {
  const room = def.max - level;
  if (room <= 0) return { n: 0, cost: Infinity };
  const n = amount === 'max' ? Math.max(1, maxAffordable(def, level, gold)) : Math.min(room, amount);
  return { n, cost: costFor(def, level, n) };
}

export function buy(state, kind, id, amount = 1) {
  const def = findDef(kind, id);
  if (!def) return false;
  if (kind === 'skill' && !skillUnlocked(state, def)) return false;
  const levels = levelsOf(state, kind);
  const { n, cost } = purchasePlan(def, levels[id], state.gold, amount);
  if (n <= 0 || cost > state.gold) return false;
  state.gold -= cost;
  levels[id] += n;
  state.stats.levels += n;
  return true;
}

// ---- Pet eggs, evolution and choice ----

export function rollRarity(rng = Math.random) {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let x = rng() * total;
  for (const r of RARITIES) {
    if ((x -= r.weight) < 0) return r;
  }
  return RARITIES[RARITIES.length - 1];
}

// Opens an egg for EGG_COST elmas. A new pet joins the collection; a duplicate adds a star,
// or kristal once the pet has MAX_STARS. Returns { id, isNew, stars, kristal } or null.
export function openEgg(state, rng = Math.random, events = []) {
  if (state.elmas < EGG_COST) return null;
  state.elmas -= EGG_COST;
  state.stats.eggs++;
  const rarity = rollRarity(rng);
  const pool = PETS.filter((p) => p.rarity === rarity.id);
  const pet = pool[Math.floor(rng() * pool.length)];
  const owned = state.pets[pet.id];
  const result = { type: 'egg', id: pet.id, isNew: !owned, stars: 0, kristal: 0 };
  if (!owned) state.pets[pet.id] = { form: 1, stars: 0 };
  else if (owned.stars < MAX_STARS) result.stars = ++owned.stars;
  else { state.kristal += DUPLICATE_KRISTAL; result.kristal = DUPLICATE_KRISTAL; }
  events.push(result);
  return result;
}

export function evolveCost(state, id) {
  const owned = state.pets[id];
  if (!owned || owned.form >= FORM_MULT.length) return Infinity;
  return findRarity(findPet(id).rarity).evolveCost[owned.form - 1];
}

export function evolvePet(state, id) {
  const cost = evolveCost(state, id);
  if (!(cost <= state.kristal)) return false;
  state.kristal -= cost;
  state.pets[id].form++;
  return true;
}

export function selectPet(state, id) {
  if (!state.pets[id] || state.activePet === id) return false;
  state.activePet = id;
  return true;
}

// ---- Prestige ----

export function prestigeSouls(state) {
  if (state.maxStage < PRESTIGE_MIN_STAGE) return 0;
  return Math.floor((state.maxStage - 15) ** 1.5 / 5);
}

// Resets the run for souls (and as many soul tree points). Keeps souls, stats, settings and
// everything permanent; skill levels and cooldowns reset with the run. Kestirme Yol starts the
// new run further in. Returns the souls gained.
export function prestige(state, rng = Math.random) {
  const gain = prestigeSouls(state);
  if (gain <= 0) return 0;
  const fresh = newGame(rng, state.lastSeen);
  fresh.souls = state.souls + gain;
  fresh.stats = { ...state.stats, prestiges: state.stats.prestiges + 1 };
  fresh.settings = state.settings;
  fresh.quests = state.quests;
  fresh.achievements = state.achievements;
  fresh.equipment = state.equipment;
  fresh.soulTree = state.soulTree;
  fresh.soulPoints = state.soulPoints + gain;
  // Pets, gems, companions and the dungeon are permanent.
  for (const k of ['pets', 'activePet', 'elmas', 'kristal', 'companions', 'dungeon', 'dungeonRun', 'daily', 'mail', 'seen', 'raid']) fresh[k] = state[k];
  Object.assign(state, fresh);
  const start = 1 + treeValue(state, 'startStage');
  if (start > 1) {
    state.maxStage = state.stage = start;
    spawnEnemy(state, rng);
  }
  state.hero.hp = heroMaxHp(state);
  return gain;
}

// ---- Daily login ----

// Local calendar day of a timestamp as YYYY-MM-DD.
export function dayKey(time) {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const previousDay = (time) => {
  const d = new Date(time);
  d.setDate(d.getDate() - 1);
  return dayKey(d.getTime());
};

// The stage whose enemies set gold rewards: the frontier, or the one before it if it's a boss.
const farmStage = (state) => (isBossStage(state.maxStage) ? state.maxStage - 1 : state.maxStage) || 1;

// The 7 rewards of the cycle at the player's current progress.
export function dailyRewards(state) {
  const unit = enemyGold(state, farmStage(state));
  return DAILY.gold.map((g, i) => ({ gold: Math.ceil(unit * g), elmas: DAILY.elmas[i] }));
}

// { canClaim, index (0..6, the cycle slot the next claim fills or the last claim filled),
//   streak (what the streak is / would be after claiming), claimedToday }.
export function dailyStatus(state, now = Date.now()) {
  const today = dayKey(now);
  const { last, streak } = state.daily;
  if (last === today) return { canClaim: false, claimedToday: true, streak, index: (streak - 1) % DAILY.gold.length };
  const next = last === previousDay(now) ? streak + 1 : 1;
  return { canClaim: true, claimedToday: false, streak: next, index: (next - 1) % DAILY.gold.length };
}

// Claims today's reward. Returns { gold, elmas, day } or null when already claimed today.
export function claimDaily(state, now = Date.now(), events = []) {
  const status = dailyStatus(state, now);
  if (!status.canClaim) return null;
  const reward = dailyRewards(state)[status.index];
  addGold(state, reward.gold);
  state.elmas += reward.elmas;
  state.daily = { last: dayKey(now), streak: status.streak };
  const result = { type: 'daily', ...reward, day: status.index + 1 };
  events.push(result);
  return result;
}

// ---- Daily quests ----

// A stable small hash of a string, to pick the day's quests.
function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}

export const findQuest = (id) => QUESTS.find((q) => q.id === id);

function questValue(state, def) {
  return def.stat === 'combo' ? state.quests.combo : state.stats[def.stat] || 0;
}

// Makes sure `state.quests` holds today's quests; a new day replaces them. Returns true when it
// rolled new ones.
export function ensureQuests(state, now = Date.now()) {
  const today = dayKey(now);
  if (state.quests.day === today && state.quests.list.length) return false;
  let seed = hashString(today);
  const pool = QUESTS.map((q) => q.id);
  const list = [];
  while (list.length < QUESTS_PER_DAY && pool.length) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    const id = pool.splice(seed % pool.length, 1)[0];
    list.push({ id, start: 0, claimed: false });
  }
  state.quests = { day: today, list, combo: 0, bonus: false };
  for (const q of list) q.start = questValue(state, findQuest(q.id));
  return true;
}

// Progress of one of today's quests: { def, value, done, claimed }.
export function questProgress(state, q) {
  const def = findQuest(q.id);
  const value = def.stat === 'combo' ? state.quests.combo : questValue(state, def) - q.start;
  return { def, value: Math.min(def.n, Math.max(0, value)), done: value >= def.n, claimed: q.claimed };
}

function grant(state, reward) {
  state.elmas += reward.elmas || 0;
  state.kristal += reward.kristal || 0;
  if (reward.gold) addGold(state, reward.gold);
}

export function claimQuest(state, id, events = []) {
  const q = state.quests.list.find((x) => x.id === id);
  if (!q || q.claimed || !questProgress(state, q).done) return null;
  q.claimed = true;
  const reward = findQuest(id).reward;
  grant(state, reward);
  events.push({ type: 'quest', id, reward });
  return reward;
}

export const questBonusReady = (state) => !state.quests.bonus && state.quests.list.length > 0 && state.quests.list.every((q) => q.claimed);

export function claimQuestBonus(state, events = []) {
  if (!questBonusReady(state)) return null;
  state.quests.bonus = true;
  grant(state, QUEST_BONUS);
  events.push({ type: 'quest', id: 'bonus', reward: QUEST_BONUS });
  return QUEST_BONUS;
}

// ---- Achievements ----

export const findAchievement = (id) => ACHIEVEMENTS.find((a) => a.id === id);

export function achievementValue(state, def) {
  if (def.stat === 'pets') return Object.keys(state.pets).length;
  if (def.stat === 'dungeon') return state.dungeon.best;
  return state.stats[def.stat] || 0;
}

// { def, tier (collected so far), next (target or null when complete), value, ready, reward }.
export function achievementStatus(state, def) {
  const tier = state.achievements[def.id] || 0;
  const next = def.tiers[tier] ?? null;
  const value = achievementValue(state, def);
  return { def, tier, next, value, ready: next !== null && value >= next, reward: ACHIEVEMENT_ELMAS[Math.min(tier, ACHIEVEMENT_ELMAS.length - 1)] };
}

export function claimAchievement(state, id, events = []) {
  const def = findAchievement(id);
  if (!def) return null;
  const st = achievementStatus(state, def);
  if (!st.ready) return null;
  state.achievements[id] = st.tier + 1;
  state.elmas += st.reward;
  events.push({ type: 'achievement', id, tier: st.tier + 1, elmas: st.reward });
  return { elmas: st.reward };
}

// Things waiting to be collected in the Görevler window.
export function questsClaimable(state) {
  return state.quests.list.some((q) => !q.claimed && questProgress(state, q).done)
    || questBonusReady(state)
    || ACHIEVEMENTS.some((a) => achievementStatus(state, a).ready);
}

// ---- Mail ----

export const findMail = (id) => MAIL.find((m) => m.id === id);
export const mailClaimed = (state, id) => state.mail.claimed.includes(id);

// Mails still worth a look: unread, or with a reward left to collect.
export function unreadMail(state) {
  return MAIL.filter((m) => !state.mail.read.includes(m.id) || (m.reward && !mailClaimed(state, m.id))).length;
}

export function readMail(state, id) {
  if (!findMail(id) || state.mail.read.includes(id)) return false;
  state.mail.read.push(id);
  return true;
}

// Collects a mail's reward once. Returns the reward or null.
export function claimMail(state, id, events = []) {
  const mail = findMail(id);
  if (!mail?.reward || mailClaimed(state, id)) return null;
  const { elmas = 0, gold = 0, kristal = 0 } = mail.reward;
  state.elmas += elmas;
  state.kristal += kristal;
  if (gold) addGold(state, gold);
  state.mail.claimed.push(id);
  readMail(state, id);
  events.push({ type: 'mail', id, elmas, gold, kristal });
  return mail.reward;
}

// ---- Offline progress ----

// Gold the pet would have earned while the game was closed, farming the current stage
// (or the one before it on a boss stage) at OFFLINE_RATE efficiency.
export function offlineGold(state, seconds) {
  const sec = Math.min(seconds, OFFLINE_CAP);
  if (!(sec >= OFFLINE_MIN)) return 0;
  const dps = totalDps(state);
  if (dps <= 0) return 0;
  const stage = isBossStage(state.stage) ? state.stage - 1 : state.stage;
  const secondsPerKill = enemyMaxHp(stage) / dps + RESPAWN_DELAY;
  return Math.floor((sec / secondsPerKill) * enemyGold(state, stage) * OFFLINE_RATE * (1 + treeValue(state, 'offline')));
}

// Pays offline gold and runs skill timers forward. Effects expire first, so an active
// Savaş Narası doesn't boost the whole absence.
export function applyOffline(state, seconds) {
  elapseSkills(state, seconds);
  const gold = offlineGold(state, seconds);
  if (gold > 0) addGold(state, gold);
  return gold;
}

// ---- Saving ----

export function serializeState(state) {
  const { enemy, dungeonRun, combo, hero, petFx, ...rest } = state;
  return { game: GAME_ID, ...rest };
}

// Whether raw saved data belongs to this game (save codes from other games are refused).
export const isOwnSave = (raw) => !!raw && typeof raw === 'object' && raw.game === GAME_ID;

// Builds a valid state from untrusted saved data, falling back to defaults field by field.
export function loadState(raw, rng = Math.random, now = Date.now()) {
  const s = newGame(rng, now);
  if (!raw || typeof raw !== 'object') return s;
  const num = (v, d) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
  const int = (v, d) => Math.floor(num(v, d));

  s.gold = num(raw.gold, 0);
  s.souls = int(raw.souls, 0);
  s.maxStage = Math.max(1, int(raw.maxStage, 1));
  s.stage = clamp(int(raw.stage, 1), 1, s.maxStage);
  s.kills = clamp(int(raw.kills, 0), 0, KILLS_PER_STAGE - 1);
  s.autoAdvance = raw.autoAdvance !== false;
  for (const u of UPGRADES) s.upgrades[u.id] = Math.min(u.max, int(raw.upgrades?.[u.id], 0));
  s.equipment = loadEquipment(raw.equipment);
  s.soulTree = loadTree(raw.soulTree);
  // Before v3 there was no soul tree: existing souls become points to spend.
  s.soulPoints = typeof raw.soulPoints === 'number' ? int(raw.soulPoints, 0) : !(raw.v >= 3) ? s.souls : 0;
  s.training[PET_TRAINING.id] = int(raw.training?.[PET_TRAINING.id], 0);
  if (raw.pets && typeof raw.pets === 'object') {
    for (const p of PETS) {
      const owned = raw.pets[p.id];
      if (!owned || typeof owned !== 'object') continue;
      s.pets[p.id] = {
        form: clamp(int(owned.form, 1), 1, FORM_MULT.length),
        stars: clamp(int(owned.stars, 0), 0, MAX_STARS),
      };
    }
  }
  if (s.pets[raw.activePet]) s.activePet = raw.activePet;
  s.elmas = int(raw.elmas, STARTING_ELMAS);
  s.kristal = int(raw.kristal, 0);
  for (const c of COMPANIONS) s.companions[c.id] = int(raw.companions?.[c.id], s.companions[c.id]);
  if (raw.dungeon && typeof raw.dungeon === 'object') {
    s.dungeon.best = int(raw.dungeon.best, 0);
    s.dungeon.floor = clamp(int(raw.dungeon.floor, 1), 1, s.dungeon.best + 1);
    if (Array.isArray(raw.dungeon.team)) {
      s.dungeon.team = [...new Set(raw.dungeon.team)].filter((id) => s.companions[id] > 0).slice(0, TEAM_SIZE);
    }
  }
  for (const k of SKILLS) {
    s.skills[k.id] = Math.min(k.max, int(raw.skills?.[k.id], 0));
    const t = raw.skillTimers?.[k.id];
    s.skillTimers[k.id] = {
      active: Math.min(skillDuration(s, k), num(t?.active, 0)),
      cooldown: Math.min(skillCooldown(s, k), num(t?.cooldown, 0)),
    };
  }
  for (const k of Object.keys(s.stats)) s.stats[k] = num(raw.stats?.[k], s.stats[k]);
  if (typeof raw.settings?.sound === 'boolean') s.settings.sound = raw.settings.sound;
  if (typeof raw.settings?.music === 'boolean') s.settings.music = raw.settings.music;
  if (typeof raw.settings?.autoSalvage === 'boolean') s.settings.autoSalvage = raw.settings.autoSalvage;
  if (BUY_AMOUNTS.includes(raw.settings?.buyAmount)) s.settings.buyAmount = raw.settings.buyAmount;
  const day = /^\d{4}-\d{2}-\d{2}$/;
  if (day.test(raw.daily?.last)) s.daily.last = raw.daily.last;
  s.daily.streak = s.daily.last ? Math.max(1, int(raw.daily?.streak, 1)) : 0;
  const ids = (list, known) => (Array.isArray(list) ? [...new Set(list)].filter((id) => known.includes(id)) : []);
  const mailIds = MAIL.map((m) => m.id);
  s.mail.claimed = ids(raw.mail?.claimed, mailIds);
  s.mail.read = ids(raw.mail?.read, mailIds);
  // v1 saves started with 100 elmas, which is what the welcome mail now gives.
  if (raw.v === 1 && !s.mail.claimed.includes('welcome')) {
    s.mail.claimed.push('welcome');
    s.mail.read.push('welcome');
  }
  if (typeof raw.seen?.version === 'string') s.seen.version = raw.seen.version.slice(0, 20);
  if (Array.isArray(raw.seen?.news)) s.seen.news = raw.seen.news.filter((x) => typeof x === 'string').slice(0, 200);
  if (raw.quests && typeof raw.quests === 'object' && day.test(raw.quests.day) && Array.isArray(raw.quests.list)) {
    const list = raw.quests.list
      .filter((q) => q && QUESTS.some((d) => d.id === q.id))
      .slice(0, QUESTS_PER_DAY)
      .map((q) => ({ id: q.id, start: num(q.start, 0), claimed: q.claimed === true }));
    if (list.length === QUESTS_PER_DAY && new Set(list.map((q) => q.id)).size === list.length) {
      s.quests = { day: raw.quests.day, list, combo: int(raw.quests.combo, 0), bonus: raw.quests.bonus === true };
    }
  }
  for (const a of ACHIEVEMENTS) {
    const got = int(raw.achievements?.[a.id], 0);
    if (got > 0) s.achievements[a.id] = Math.min(a.tiers.length, got);
  }
  if (day.test(raw.raid?.day)) s.raid.day = raw.raid.day;
  s.raid.keys = Math.min(99, int(raw.raid?.keys, 0));
  for (const m of MEGA_BOSSES) {
    const w = int(raw.raid?.wins?.[m.id], 0);
    if (w > 0 && !m.soon) s.raid.wins[m.id] = w;
  }
  s.lastSeen = num(raw.lastSeen, now);
  s.hero.hp = heroMaxHp(s);
  spawnEnemy(s, rng);
  return s;
}

// ---- Mega bosses (the Harita arena) ----
// A mega boss fight replaces state.enemy with the boss (variant 'raid'); the main battle is
// put back with a fresh enemy when it ends. Taps, the pet, skills and wind-ups work as usual.

export const findMega = (id) => MEGA_BOSSES.find((m) => m.id === id);
export const inRaid = (state) => state.enemy?.variant === 'raid';
export const megaUnlocked = (state, def) => !def.soon && state.stats.bestStage > def.unlock;
export const megaWins = (state, def) => state.raid.wins[def.id] || 0;
// Level of the next fight: 1 until the first win, then one more per win.
export const megaLevel = (state, def) => Math.min(RAID.maxLevel, megaWins(state, def) + 1);
export const megaHp = (def, level) => Math.ceil(enemyMaxHp(def.unlock, true) * RAID.hpMult * RAID.levelGrowth ** (level - 1));
export const trophyLevel = (state, def) => Math.min(RAID.maxLevel, megaWins(state, def));
export const trophyPower = (def, level) => (level > 0 ? def.trophy.base + def.trophy.step * (level - 1) : 0);

// Sum of the trophies of a kind; 'all' trophies count for tap and pet damage.
export function trophyValue(state, kind) {
  if (!state.raid) return 0;
  let v = 0;
  for (const m of MEGA_BOSSES) {
    const t = m.trophy;
    if (t.kind === kind || (t.kind === 'all' && (kind === 'tap' || kind === 'pet'))) v += trophyPower(m, trophyLevel(state, m));
  }
  return v;
}

// Tops the keys back up to keysPerDay on a new local day (bought extras are kept).
export function refreshRaidKeys(state, now = Date.now()) {
  const d = dayKey(now);
  if (state.raid.day === d) return false;
  state.raid.day = d;
  state.raid.keys = Math.max(state.raid.keys, RAID.keysPerDay);
  return true;
}

export function buyRaidKey(state) {
  if (state.elmas < RAID.keyCost) return false;
  state.elmas -= RAID.keyCost;
  state.raid.keys++;
  return true;
}

export function canStartRaid(state, def, now = Date.now()) {
  refreshRaidKeys(state, now);
  return !!def && megaUnlocked(state, def) && !inRaid(state) && state.raid.keys > 0;
}

export function startRaid(state, id, events = [], now = Date.now()) {
  const def = findMega(id);
  if (!canStartRaid(state, def, now)) return false;
  state.raid.keys--;
  const level = megaLevel(state, def);
  const maxHp = megaHp(def, level);
  state.enemy = {
    kind: 0, boss: true, variant: 'raid', mega: def.id, level, phase: 0,
    hp: maxHp, maxHp, shield: 0, shieldMax: 0,
    timeLeft: RAID.time + treeValue(state, 'bossTime'), respawn: 0, stun: 0,
    atkStage: def.unlock, atkMult: 0, every: 0, windupTime: 0,
    attack: { cd: RAID.firstAttack, windup: 0, need: 0 },
  };
  setPhase(state.enemy, 1);
  state.hero.hp = heroMaxHp(state);
  state.petFx.burn = 0;
  events.push({ type: 'raidStart', id: def.id, level });
  return true;
}

function setPhase(e, phase) {
  const i = phase - 1;
  e.phase = phase;
  e.atkMult = RAID.atkMult * RAID.atkLevel ** (e.level - 1) * RAID.phaseAtk[i];
  e.every = RAID.phaseEvery[i];
  e.windupTime = RAID.phaseWindup[i];
}

// Below 66% and 33% HP the boss gets angry: harder, faster attacks, and the next one comes soon.
function updatePhase(e, events) {
  const share = e.hp / e.maxHp;
  const phase = share <= RAID.phases[1] ? 3 : share <= RAID.phases[0] ? 2 : 1;
  if (phase <= e.phase) return;
  setPhase(e, phase);
  if (e.attack.windup <= 0) e.attack.cd = Math.min(e.attack.cd, 1.2);
  events.push({ type: 'raidPhase', phase });
}

function raidWon(state, events, rng) {
  const e = state.enemy;
  const def = findMega(e.mega);
  const first = megaWins(state, def) === 0;
  e.hp = 0;
  e.respawn = RAID.leaveDelay;
  state.stats.bossKills++;
  const reward = { elmas: 0, kristal: 0, item: null, keys: 0 };
  if (first) {
    reward.elmas = def.first.elmas;
    reward.keys = RAID.firstKeys;
    reward.item = dropItem(state, rng, events, 'mega', def.first.rarity);
  } else {
    reward.elmas = RAID.repeat.elmas;
    reward.kristal = RAID.repeat.kristal * (MEGA_BOSSES.indexOf(def) + 1) * e.level;
    if (rng() < RAID.repeat.itemChance) reward.item = dropItem(state, rng, events, 'mega', 1);
  }
  state.elmas += reward.elmas;
  state.kristal += reward.kristal;
  state.raid.keys += reward.keys;
  state.raid.wins[def.id] = megaWins(state, def) + 1;
  events.push({ type: 'kill', gold: 0, boss: true, variant: 'raid' });
  events.push({ type: 'raidWin', id: def.id, first, level: e.level, reward, trophy: trophyLevel(state, def) });
}

// Lost (time ran out, knocked out, or left): the key comes back and the main battle returns.
function raidLost(state, events, rng, why) {
  const e = state.enemy;
  state.raid.keys++;
  state.hero.hp = heroMaxHp(state);
  events.push({ type: 'raidLose', id: e.mega, why });
  spawnEnemy(state, rng);
  events.push({ type: 'spawn' });
}

export function leaveRaid(state, events = [], rng = Math.random) {
  if (!inRaid(state) || state.enemy.respawn > 0) return false;
  raidLost(state, events, rng, 'left');
  return true;
}

// ---- Formatting ----

const SUFFIXES = ['', 'K', 'M', 'B', 'T'];

function suffix(tier) {
  if (tier < SUFFIXES.length) return SUFFIXES[tier];
  const i = tier - SUFFIXES.length; // aa, ab, … az, ba, …
  return String.fromCharCode(97 + Math.floor(i / 26) % 26, 97 + (i % 26));
}

export function formatNumber(n) {
  if (!Number.isFinite(n)) return '∞';
  if (n < 0) return '-' + formatNumber(-n);
  if (n < 1000) return Number.isInteger(n) ? String(n) : String(Math.floor(n * 10) / 10);
  let tier = Math.floor(Math.log10(n) / 3);
  let scaled = n / 10 ** (tier * 3);
  if (scaled >= 1000) { tier++; scaled /= 1000; }
  if (scaled < 1) { tier--; scaled *= 1000; }
  const digits = scaled >= 100 ? 0 : scaled >= 10 ? 1 : 2;
  const p = 10 ** digits;
  return String(Math.floor(scaled * p + 1e-9) / p) + suffix(tier);
}

export function formatDuration(sec) {
  sec = Math.max(0, Math.floor(sec));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h} sa ${m} dk`;
  if (m > 0) return `${m} dk ${s} sn`;
  return `${s} sn`;
}

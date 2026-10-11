import {
  SAVE_VERSION, GAME_ID, KILLS_PER_STAGE, BOSS_EVERY, BOSS_TIME, BOSS_HP_MULT, STAGES_PER_ZONE,
  HP_BASE, HP_GROWTH, GOLD_PER_HP, RESPAWN_DELAY, BASE_CRIT_CHANCE, CRIT_CHANCE_STEP,
  MAX_CRIT_CHANCE, BASE_CRIT_MULT, CRIT_MULT_STEP, GREED_STEP, SPIRIT_STEP, MILESTONE_EVERY,
  MILESTONE_MULT, PRESTIGE_MIN_STAGE, SOUL_BONUS, OFFLINE_MIN, OFFLINE_CAP, OFFLINE_RATE,
  BUY_AMOUNTS, UPGRADES, SKILLS, ZONES, MAX_SKILL_CRIT_CHANCE, PET_TRAINING, PET_BASE_DPS,
  PET_DPS_GROWTH, EGG_COST, STARTING_ELMAS, BOSS_ELMAS, STARTER_PET, FORM_MULT, STAR_BONUS, MAX_STARS,
  DUPLICATE_KRISTAL, RARITIES, PETS, COMPANIONS, STARTER_TEAM, TEAM_SIZE, DAILY, MAIL,
} from './config.js';
import { tickDungeon } from './dungeon.js';

// Pure game rules: no DOM, no timers. Functions that change the game take the state object,
// mutate it, and push what happened ({ type: 'hit' | 'kill' | 'unlock' | 'stage' | 'spawn' |
// 'bossFail', ... }) onto an `events` array so the renderer can animate it.

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
    stats: { taps: 0, crits: 0, kills: 0, bossKills: 0, skillsUsed: 0, eggs: 0, totalGold: 0, prestiges: 0, playTime: 0, bestStage: 1 },
    settings: { sound: true, music: true, buyAmount: 1 },
    daily: { last: '', streak: 0 },  // last claim as a local YYYY-MM-DD and the streak it made
    mail: { claimed: [], read: [] },
    seen: { version: '', news: [] }, // what the player has opened in the blog (for the badge)
    enemy: null,
    lastSeen: now,
  };
  spawnEnemy(state, rng);
  return state;
}

// ---- Stages and enemies ----

export const isBossStage = (stage) => stage % BOSS_EVERY === 0;
export const zoneIndex = (stage) => Math.floor((stage - 1) / STAGES_PER_ZONE) % ZONES.length;

export function enemyMaxHp(stage, boss = false) {
  const hp = HP_BASE * HP_GROWTH ** (stage - 1);
  return Math.ceil(boss ? hp * BOSS_HP_MULT : hp);
}

export function enemyGold(state, stage, boss = false) {
  return Math.max(1, Math.ceil(enemyMaxHp(stage, boss) * GOLD_PER_HP * goldMultiplier(state)));
}

export function spawnEnemy(state, rng = Math.random) {
  const boss = isBossStage(state.stage);
  const zone = ZONES[zoneIndex(state.stage)];
  const maxHp = enemyMaxHp(state.stage, boss);
  state.enemy = {
    kind: Math.floor(rng() * zone.enemies.length),
    boss,
    hp: maxHp,
    maxHp,
    timeLeft: boss ? BOSS_TIME : 0,
    respawn: 0,
  };
}

// Moves to another unlocked stage and spawns its enemy right away.
export function setStage(state, stage, rng = Math.random, events = []) {
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
export const goldMultiplier = (state) => 1 + state.upgrades.greed * GREED_STEP;
export const critMultiplier = (state) => BASE_CRIT_MULT + state.upgrades.critDmg * CRIT_MULT_STEP;

export function critChance(state) {
  const base = Math.min(MAX_CRIT_CHANCE, BASE_CRIT_CHANCE + state.upgrades.crit * CRIT_CHANCE_STEP);
  return Math.min(MAX_SKILL_CRIT_CHANCE, base + activeSkillPower(state, 'focus', 0));
}

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
  return trainingDps(level) * petMultiplier(state, id) * soulMultiplier(state);
}

export function totalDps(state) {
  return petDps(state) * activeSkillPower(state, 'warcry', 1);
}

export function swordDamage(state, level = state.upgrades.sword) {
  return (1 + level) * milestoneMultiplier(level) * soulMultiplier(state);
}

export function tapDamage(state, spirit = state.upgrades.spirit) {
  return (swordDamage(state) + totalDps(state) * spirit * SPIRIT_STEP) * activeSkillPower(state, 'rage', 1);
}

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

export function useSkill(state, id, events = []) {
  const def = findSkill(id);
  if (!def || !canUseSkill(state, id)) return false;
  const t = state.skillTimers[id];
  t.active = def.duration;
  t.cooldown = def.cooldown;
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

function killEnemy(state, events) {
  const e = state.enemy;
  const gold = enemyGold(state, state.stage, e.boss);
  e.hp = 0;
  e.respawn = RESPAWN_DELAY;
  addGold(state, gold);
  state.stats.kills++;
  if (e.boss) state.stats.bossKills++;
  events.push({ type: 'kill', gold, boss: e.boss });

  if (state.stage === state.maxStage) {
    state.kills = e.boss ? KILLS_PER_STAGE : state.kills + 1;
    if (state.kills >= KILLS_PER_STAGE) {
      state.maxStage++;
      state.kills = 0;
      if (state.maxStage > state.stats.bestStage) {
        state.stats.bestStage = state.maxStage;
        // A boss beaten for the first time ever pays elmas.
        if (e.boss) {
          state.elmas += BOSS_ELMAS;
          events.push({ type: 'elmas', amount: BOSS_ELMAS });
        }
      }
      events.push({ type: 'unlock', stage: state.maxStage });
    }
  }
  // The next enemy spawns from the new stage once the respawn delay ends.
  if (state.autoAdvance && state.stage < state.maxStage) {
    state.stage++;
    events.push({ type: 'stage', stage: state.stage });
  }
}

function damageEnemy(state, dmg, events) {
  const e = state.enemy;
  e.hp -= dmg;
  if (e.hp <= 0) killEnemy(state, events);
}

// A tap (player's, or `auto` from Kılıç Fırtınası). Returns the hit event, or null while the
// next enemy is still on its way.
export function tap(state, rng = Math.random, events = [], auto = false) {
  if (state.enemy.respawn > 0) return null;
  if (!auto) state.stats.taps++;
  const crit = rng() < critChance(state);
  const dmg = tapDamage(state) * (crit ? critMultiplier(state) : 1);
  if (crit) state.stats.crits++;
  const hit = { type: 'hit', dmg, crit, auto };
  events.push(hit);
  damageEnemy(state, dmg, events);
  return hit;
}

// Advances time: skills, respawn delay, helper damage and the boss timer.
export function tick(state, dt, rng = Math.random, events = []) {
  state.stats.playTime += dt;
  updateSkills(state, dt, rng, events);
  tickDungeon(state, dt, rng, events);
  const e = state.enemy;
  if (e.respawn > 0) {
    e.respawn -= dt;
    if (e.respawn <= 0) {
      spawnEnemy(state, rng);
      events.push({ type: 'spawn' });
    }
    return events;
  }
  const dps = totalDps(state);
  if (dps > 0) damageEnemy(state, dps * dt, events);
  if (e.boss && e.hp > 0) {
    e.timeLeft -= dt;
    if (e.timeLeft <= 0) {
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

// Resets the run for souls. Keeps souls, stats, settings and everything permanent; skill
// levels and cooldowns reset with the run.
// skip a cooldown); skill levels reset like other upgrades. Returns the souls gained.
export function prestige(state, rng = Math.random) {
  const gain = prestigeSouls(state);
  if (gain <= 0) return 0;
  const fresh = newGame(rng, state.lastSeen);
  fresh.souls = state.souls + gain;
  fresh.stats = { ...state.stats, prestiges: state.stats.prestiges + 1 };
  fresh.settings = state.settings;
  // Pets, gems, companions and the dungeon are permanent.
  for (const k of ['pets', 'activePet', 'elmas', 'kristal', 'companions', 'dungeon', 'dungeonRun', 'daily', 'mail', 'seen']) fresh[k] = state[k];
  Object.assign(state, fresh);
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
  return Math.floor((sec / secondsPerKill) * enemyGold(state, stage) * OFFLINE_RATE);
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
  const { enemy, dungeonRun, ...rest } = state;
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
      active: Math.min(k.duration, num(t?.active, 0)),
      cooldown: Math.min(k.cooldown, num(t?.cooldown, 0)),
    };
  }
  for (const k of Object.keys(s.stats)) s.stats[k] = num(raw.stats?.[k], s.stats[k]);
  if (typeof raw.settings?.sound === 'boolean') s.settings.sound = raw.settings.sound;
  if (typeof raw.settings?.music === 'boolean') s.settings.music = raw.settings.music;
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
  s.lastSeen = num(raw.lastSeen, now);
  spawnEnemy(s, rng);
  return s;
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

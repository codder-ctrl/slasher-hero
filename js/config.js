// Game constants and content tables. Pure data with no DOM access, so tests can import it.

export const STORAGE_KEY = 'slasher-hero-v1';
export const SAVE_VERSION = 1;
// Every save and save code carries this tag; codes without it (e.g. from Piksel Savaşçı) are refused.
export const GAME_ID = 'slasher-hero';

// Stages
export const KILLS_PER_STAGE = 10;
export const BOSS_EVERY = 5;          // every 5th stage is a single boss with a timer
export const BOSS_TIME = 30;          // seconds
export const BOSS_HP_MULT = 8;
export const STAGES_PER_ZONE = 10;
export const HP_BASE = 10;
export const HP_GROWTH = 1.39;
export const GOLD_PER_HP = 1 / 9;
export const RESPAWN_DELAY = 0.35;    // seconds between an enemy dying and the next one appearing

// Combat
export const BASE_CRIT_CHANCE = 0.02;
export const CRIT_CHANCE_STEP = 0.01;
export const MAX_CRIT_CHANCE = 0.5;
export const BASE_CRIT_MULT = 2;
export const CRIT_MULT_STEP = 0.25;
export const GREED_STEP = 0.1;        // +10% gold per level
export const SPIRIT_STEP = 0.01;      // tap gains 1% of total DPS per level
export const MILESTONE_EVERY = 25;    // the sword doubles its damage every 25 levels
export const MILESTONE_MULT = 2;

// Prestige ("Yeniden Doğuş")
export const PRESTIGE_MIN_STAGE = 20;
export const SOUL_BONUS = 0.1;        // +10% all damage per soul

// Offline progress
export const OFFLINE_MIN = 60;        // seconds away before offline gold kicks in
export const OFFLINE_CAP = 8 * 3600;
export const OFFLINE_RATE = 0.5;      // fraction of the online gold rate

export const AUTOSAVE_MS = 10000;
export const BUY_AMOUNTS = [1, 10, 100, 'max'];

// Tap upgrades. `max` caps the level; Infinity means no cap.
export const UPGRADES = [
  { id: 'sword',   name: 'Keskin Kılıç',  icon: 'swordIcon', baseCost: 5,    growth: 1.07, max: Infinity, desc: 'Her 25 seviyede hasar ×2' },
  { id: 'crit',    name: 'Kartal Gözü',   icon: 'target', baseCost: 100,  growth: 1.4,  max: 48,       desc: 'Kritik vuruş şansı (en fazla %50)' },
  { id: 'critDmg', name: 'Ölümcül Darbe', icon: 'bolt',   baseCost: 400,  growth: 1.55, max: Infinity, desc: 'Kritik vuruşların hasar çarpanı' },
  { id: 'greed',   name: 'Altın Kese',    icon: 'bag',    baseCost: 250,  growth: 1.5,  max: Infinity, desc: 'Düşmanlardan düşen altın' },
  { id: 'spirit',  name: 'Savaş Ruhu',    icon: 'flame',  baseCost: 3000, growth: 1.6,  max: Infinity, desc: 'Pet hasarının bir kısmı dokunuşa eklenir' },
];

// Active skills: used from the skill bar, then they cool down. They unlock at `unlockStage`
// (in the current run) and are leveled with gold; effect per level is in logic.skillPower.
// `cooldown` starts when the skill is used, so it includes `duration`.
export const SKILLS = [
  { id: 'rage',     name: 'Öfke',            icon: 'skRage',  unlockStage: 5,  baseCost: 300,   growth: 4, max: 10, duration: 30, cooldown: 300, color: '#ef7d57' },
  { id: 'warcry',   name: 'Savaş Narası',    icon: 'skHorn',  unlockStage: 12, baseCost: 3000,  growth: 4, max: 10, duration: 30, cooldown: 300, color: '#ffcd75' },
  { id: 'storm',    name: 'Kılıç Fırtınası', icon: 'skStorm', unlockStage: 20, baseCost: 4e4,   growth: 4, max: 10, duration: 20, cooldown: 600, color: '#73eff7' },
  { id: 'focus',    name: 'Keskin Bakış',    icon: 'skEye',   unlockStage: 30, baseCost: 8e5,   growth: 4, max: 10, duration: 30, cooldown: 480, color: '#41a6f6' },
  { id: 'goldRain', name: 'Altın Yağmuru',   icon: 'skCoins', unlockStage: 40, baseCost: 2e7,   growth: 4, max: 10, duration: 0,  cooldown: 900, color: '#ffcd75' },
];
export const MAX_SKILL_CRIT_CHANCE = 0.95;

// ---- Pets (main battle) ----
// One pet fights beside the hero. Its damage is the shared "Pet Eğitimi" level (gold, resets
// on rebirth) times the pet's own multiplier: rarity × evolution form × stars.

export const PET_TRAINING = { id: 'train', name: 'Pet Eğitimi', icon: 'paw', baseCost: 50, growth: 1.07, max: Infinity };
export const PET_BASE_DPS = 5;
export const PET_DPS_GROWTH = 1.045;  // per training level; under the 1.07 cost growth, so runs hit a wall (~stage 80 with the starter dog)

export const EGG_COST = 100;          // elmas per random pet
export const STARTING_ELMAS = 100;
export const BOSS_ELMAS = 10;         // first time each main-battle boss stage is beaten (all-time)
export const STARTER_PET = 'dog';
export const FORM_MULT = [1, 2.5, 6];
export const STAR_BONUS = 0.2;        // +20% pet damage per duplicate
export const MAX_STARS = 5;
export const DUPLICATE_KRISTAL = 30;  // paid instead of a star once a pet has MAX_STARS

export const RARITIES = [
  { id: 'common',    name: 'Sıradan',  color: '#6a7f92', weight: 60,  mult: 1,   evolveCost: [40, 160] },
  { id: 'rare',      name: 'Nadir',    color: '#2a7ad0', weight: 30,  mult: 1.6, evolveCost: [80, 320] },
  { id: 'epic',      name: 'Destansı', color: '#9a46d0', weight: 8.5, mult: 2.5, evolveCost: [150, 600] },
  { id: 'legendary', name: 'Efsanevi', color: '#e09010', weight: 1.5, mult: 4,   evolveCost: [300, 1200] },
];

// Each pet is a vector actor (js/pets.js) drawn with its form's colors: `body`, `belly`, `dark`
// and `accent`. From form 2 the actor adds armor or markings in `accent`; form 3 adds a glowing
// aura or flames in `glow`. `shot` is the projectile it fires at the enemy.
export const PETS = [
  {
    id: 'dog', rarity: 'common', actor: 'dog', shot: 'spark', shotColor: '#fff6d8',
    forms: [
      { name: 'Köpek',           colors: { body: '#cf9a5e', belly: '#f4dfb6', dark: '#8a5a32', accent: '#d8443e', glow: '#ffd060' } },
      { name: 'Kurt',            colors: { body: '#9fb2c2', belly: '#e8eff4', dark: '#566a7c', accent: '#c0384a', glow: '#ffd060' } },
      { name: 'Cehennem Tazısı', colors: { body: '#3e3550', belly: '#5d4f72', dark: '#231d30', accent: '#ffb43a', glow: '#ff6a2a' } },
    ],
  },
  {
    id: 'cat', rarity: 'common', actor: 'cat', shot: 'spark', shotColor: '#ffc0d0',
    forms: [
      { name: 'Kedi',         colors: { body: '#f08a48', belly: '#fde6c6', dark: '#b85a26', accent: '#b85a26', glow: '#ffd060' } },
      { name: 'Vaşak',        colors: { body: '#dba45e', belly: '#f6e4c2', dark: '#7a4c2a', accent: '#3a2c28', glow: '#ffd060' } },
      { name: 'Gölge Panter', colors: { body: '#2f3156', belly: '#434678', dark: '#1c1d3a', accent: '#b56fe8', glow: '#d9a2ff' } },
    ],
  },
  {
    id: 'robot', rarity: 'rare', actor: 'robot', shot: 'arrow', shotColor: '#7ff4ff',
    forms: [
      { name: 'Mini Robot',   colors: { body: '#aec0ce', belly: '#dce6ee', dark: '#6a7f92', accent: '#5bc8e8', glow: '#7ff4ff' } },
      { name: 'Savaş Robotu', colors: { body: '#64788e', belly: '#94a8ba', dark: '#3c4a5c', accent: '#ef6a4a', glow: '#ffb060' } },
      { name: 'Mega Robot',   colors: { body: '#ffc84a', belly: '#fff0b0', dark: '#b8862a', accent: '#3b6fd8', glow: '#7ff4ff' } },
    ],
  },
  {
    id: 'drone', rarity: 'rare', actor: 'drone', shot: 'arrow', shotColor: '#ff9a6a', float: true,
    forms: [
      { name: 'Drone',         colors: { body: '#aec0ce', belly: '#dce6ee', dark: '#6a7f92', accent: '#ef6a4a', glow: '#ffb060' } },
      { name: 'Saldırı Dronu', colors: { body: '#3e4a60', belly: '#64788e', dark: '#232b3a', accent: '#ff5a3a', glow: '#ff9a3a' } },
      { name: 'Uydu Dronu',    colors: { body: '#f2f6fa', belly: '#ffffff', dark: '#9fb2c2', accent: '#ffc84a', glow: '#7ff4ff' } },
    ],
  },
  {
    id: 'dragon', rarity: 'epic', actor: 'dragon', shot: 'orb', shotColor: '#ff8a3a',
    forms: [
      { name: 'Ejder Yavrusu', colors: { body: '#52c05e', belly: '#d2f08e', dark: '#2a8a5a', accent: '#f6f0dc', glow: '#ffb43a' } },
      { name: 'Genç Ejder',    colors: { body: '#2b8f92', belly: '#86dcae', dark: '#1a5c66', accent: '#ffd27a', glow: '#ffb43a' } },
      { name: 'Kadim Ejder',   colors: { body: '#c43a4a', belly: '#ffcf7a', dark: '#6e2050', accent: '#ffe2a0', glow: '#ff7a2a' } },
    ],
  },
  {
    id: 'phoenix', rarity: 'legendary', actor: 'phoenix', shot: 'orb', shotColor: '#ffd060', float: true,
    forms: [
      { name: 'Anka Yavrusu', colors: { body: '#ff8a3a', belly: '#ffd862', dark: '#d84a2a', accent: '#ffe9a0', glow: '#ffb43a' } },
      { name: 'Anka Kuşu',    colors: { body: '#e0423a', belly: '#ffc84a', dark: '#9a2236', accent: '#ffe07a', glow: '#ff8a3a' } },
      { name: 'Ebedi Anka',   colors: { body: '#4aa8f0', belly: '#e6f8ff', dark: '#2a5fc0', accent: '#bff6ff', glow: '#7ff4ff' } },
    ],
  },
];

// ---- Companions (dungeon fighters) ----
// Recruited and leveled with kristal; a team of TEAM_SIZE fights in the dungeon tab.
// `actor` is the outfit (hood, hat or helm, see js/people.js), recolored with `main` and `trim`;
// the weapon follows the role.

export const TEAM_SIZE = 3;
export const STARTER_TEAM = ['archer', 'guard', 'healer'];

// Base stats per role; `mage` hits every enemy, `healer` heals the most hurt ally.
export const ROLES = {
  tank:   { name: 'Tank',  hp: 60, atk: 4, interval: 1.2 },
  dps:    { name: 'Vurucu', hp: 30, atk: 9, interval: 1.0 },
  mage:   { name: 'Büyücü', hp: 24, atk: 5, interval: 1.6 },
  healer: { name: 'Şifacı', hp: 28, atk: 3, heal: 10, interval: 1.4 },
};

export const COMPANIONS = [
  { id: 'archer',   name: 'Okçu Elif',        role: 'dps',    actor: 'hood', colors: { main: '#4fb05a', trim: '#2a7a6a' }, shot: 'arrow', shotColor: '#fff6d8' },
  { id: 'mage',     name: 'Büyücü Kaan',      role: 'mage',   actor: 'hat',  colors: { main: '#3f6fd8', trim: '#2a3a8a' }, shot: 'orb',   shotColor: '#7ff4ff' },
  { id: 'guard',    name: 'Muhafız Deniz',    role: 'tank',   actor: 'helm', colors: { main: '#a8b8c6', trim: '#c0384a' }, shot: 'spark', shotColor: '#ffd060' },
  { id: 'rogue',    name: 'Hırsız Ece',       role: 'dps',    actor: 'hood', colors: { main: '#5f6a80', trim: '#353c52' }, shot: 'arrow', shotColor: '#c8d4e0' },
  { id: 'healer',   name: 'Şifacı Can',       role: 'healer', actor: 'hood', colors: { main: '#f2ead8', trim: '#e0a83a' }, shot: 'orb',   shotColor: '#ffe07a' },
  { id: 'witch',    name: 'Ateş Cadısı Ayla', role: 'mage',   actor: 'hat',  colors: { main: '#c0384a', trim: '#5d2a5a' }, shot: 'orb',   shotColor: '#ff8a3a' },
  { id: 'paladin',  name: 'Şövalye Mert',     role: 'tank',   actor: 'helm', colors: { main: '#ffc84a', trim: '#3b5dc9' }, shot: 'spark', shotColor: '#ffe07a' },
  { id: 'druid',    name: 'Druid Nil',        role: 'healer', actor: 'hood', colors: { main: '#9ad860', trim: '#3f8f4a' }, shot: 'orb',   shotColor: '#b8f07a' },
  { id: 'hunter',   name: 'Avcı Barış',       role: 'dps',    actor: 'hood', colors: { main: '#e0763a', trim: '#7a4b2a' }, shot: 'arrow', shotColor: '#ffd060' },
  { id: 'archmage', name: 'Başbüyücü Selin',  role: 'mage',   actor: 'hat',  colors: { main: '#7a3f9a', trim: '#2a2f6a' }, shot: 'orb',   shotColor: '#d9a2ff' },
  { id: 'titan',    name: 'Dev Tunç',         role: 'tank',   actor: 'helm', colors: { main: '#6a768a', trim: '#3a3f52' }, shot: 'spark', shotColor: '#f2f6fa' },
  { id: 'dragon',   name: 'Ejder Binici Ada', role: 'dps',    actor: 'helm', colors: { main: '#c43a4a', trim: '#ff8a3a' }, shot: 'orb',   shotColor: '#ff8a3a' },
];

// ---- Dungeon ----
export const DUNGEON = {
  companionPower: 1.3,     // each later companion is this much stronger than the one before
  levelGrowth: 1.12,       // stat growth per companion level
  recruitBase: 25,         // kristal; grows ×recruitGrowth per companion index
  recruitGrowth: 1.55,
  levelBase: 6,            // kristal for level 2; grows ×levelCostGrowth per level
  levelCostGrowth: 1.22,
  enemyHp: 22,
  enemyAtk: 3,
  hpGrowth: 1.16,          // per floor
  atkGrowth: 1.14,
  enemyInterval: 1.5,
  bossEvery: 5,
  bossHp: 5,
  bossAtk: 2.5,
  clearPause: 1.2,         // seconds between floors
  defeatPause: 4,          // seconds to regroup after a wipe
  healBetween: 0.3,        // fraction of max HP restored after each floor
  bossElmas: 10,           // first clear of each boss floor
  enemies: [
    { actor: 'slime',    colors: { body: '#7a3f86', accent: '#d0607a' } },
    { actor: 'skeleton', colors: { body: '#d6dcb8', accent: '#ff5a4a' } },
    { actor: 'bat',      colors: { body: '#3a3f5a', accent: '#d0506a' } },
    { actor: 'ghost',    colors: { body: '#b8c8dc', accent: '#8a6aff' } },
    { actor: 'mushroom', colors: { body: '#5f6f86', accent: '#d6dcb8' } },
  ],
};

// Zones cycle every STAGES_PER_ZONE stages. `theme` picks the painted backdrop in js/scenery.js;
// each enemy is a vector actor (js/monsters.js) recolored with `body` and `accent`.
export const ZONES = [
  {
    name: 'Yeşil Çayır',
    theme: 'meadow',
    enemies: [
      { actor: 'slime',    name: 'Yeşil Balçık',   colors: { body: '#5cc25a', accent: '#c4f58a' } },
      { actor: 'bat',      name: 'Mor Yarasa',     colors: { body: '#6a3f86', accent: '#d0607a' } },
      { actor: 'mushroom', name: 'Kızıl Mantar',   colors: { body: '#d8443e', accent: '#f7e6c4' } },
    ],
  },
  {
    name: 'Karanlık Orman',
    theme: 'forest',
    enemies: [
      { actor: 'mushroom', name: 'Zehirli Mantar',   colors: { body: '#8a46b0', accent: '#d8e6b8' } },
      { actor: 'slime',    name: 'Bataklık Balçığı', colors: { body: '#3f8f72', accent: '#9ad890' } },
      { actor: 'skeleton', name: 'Orman İskeleti',   colors: { body: '#d6dcb8', accent: '#8cff6a' } },
    ],
  },
  {
    name: 'Kristal Mağara',
    theme: 'cave',
    enemies: [
      { actor: 'bat',      name: 'Mağara Yarasası', colors: { body: '#3a4466', accent: '#6fe8f4' } },
      { actor: 'slime',    name: 'Kristal Balçık',  colors: { body: '#4aa8f0', accent: '#b0f6ff' } },
      { actor: 'skeleton', name: 'Madenci İskelet', colors: { body: '#f2f0e6', accent: '#6fe8f4' } },
    ],
  },
  {
    name: 'Kızıl Çöl',
    theme: 'desert',
    enemies: [
      { actor: 'skeleton', name: 'Kum İskeleti',   colors: { body: '#f4e2b4', accent: '#ff8a3a' } },
      { actor: 'slime',    name: 'Lav Balçığı',    colors: { body: '#ef6a3a', accent: '#ffd05a' } },
      { actor: 'bat',      name: 'Akbaba Yarasa',  colors: { body: '#86553a', accent: '#f08a5a' } },
    ],
  },
  {
    name: 'Buz Diyarı',
    theme: 'ice',
    enemies: [
      { actor: 'slime',    name: 'Buz Balçığı',    colors: { body: '#7fd8f0', accent: '#f2fdff' } },
      { actor: 'ghost',    name: 'Kar Hayaleti',   colors: { body: '#eef6ff', accent: '#4a8ff0' } },
      { actor: 'bat',      name: 'Ayaz Yarasası',  colors: { body: '#8fa8c4', accent: '#4aa8f0' } },
    ],
  },
  {
    name: 'Volkan',
    theme: 'volcano',
    enemies: [
      { actor: 'ghost',    name: 'Alev Ruhu',      colors: { body: '#ff7a3a', accent: '#ffe07a' } },
      { actor: 'skeleton', name: 'Kor İskelet',    colors: { body: '#a8b4c0', accent: '#ff6a2a' } },
      { actor: 'slime',    name: 'Magma Balçığı',  colors: { body: '#c0384a', accent: '#ff9a3a' } },
    ],
  },
];

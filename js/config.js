// Game constants and content tables. Pure data with no DOM access, so tests can import it.

export const STORAGE_KEY = 'slasher-hero-v1';
export const SAVE_VERSION = 3;           // 2: welcome mail elmas; 3: soul points for existing souls
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
  { id: 'vitality', name: 'Dayanıklılık', icon: 'heart',  baseCost: 60,   growth: 1.07, max: Infinity, desc: 'Kahramanın canı (+%2.5 her seviye)' },
  { id: 'armor',   name: 'Demir Zırh',    icon: 'shield', baseCost: 150,  growth: 1.08, max: Infinity, desc: 'Alınan hasarı azaltır' },
];

// ---- Hero health and armor ----
// Max HP = hpBase × hpGrowth^(Dayanıklılık level) × souls.
// Armor = armorPerLevel × Demir Zırh level; damage taken × armorK / (armorK + armor), so armor
// always helps a little less than the point before and damage only approaches zero.
export const HERO = {
  hpBase: 100,
  hpGrowth: 1.025,     // per level; with the 1.07 cost growth this keeps pace with ATTACK.atkGrowth
  armorPerLevel: 4,
  armorK: 100,
  regen: 0.2,          // fraction of max HP restored per second while nothing is attacking
};

// ---- Combo ----
// Each tap within `window` seconds of the last hit keeps the combo going; reaching a tier
// multiplies tap damage. Kılıç Fırtınası's automatic hits don't count.
export const COMBO = {
  window: 0.75,
  tiers: [
    { at: 10, mult: 1.1 },
    { at: 25, mult: 1.2 },
    { at: 50, mult: 1.35 },
    { at: 100, mult: 1.5 },
  ],
};

// ---- Enemy attacks ----
// Bosses (and elites, weaker) wind up an attack every `every` seconds. During the `windup`
// the player can tap `taps` times to interrupt it: the enemy is stunned and takes extra damage.
// Otherwise the hit lands for atkBase × atkGrowth^(stage-1) (eased in over the first `ramp`
// stages), reduced by armor. Tuned so a hero who keeps up Dayanıklılık and Demir Zırh
// with ~15% of their gold takes about a fifth of their HP per hit at the frontier (fitted with
// `node tools/sim.js --share 0.15 --curve`). A knocked-out
// hero loses a boss fight like the timer running out; an elite just runs off.
export const ATTACK = {
  first: 3,
  every: 6,
  windup: 1.4,
  taps: 5,
  stun: 2.5,
  stunBonus: 1.5,      // damage multiplier on a stunned enemy
  atkBase: 6,
  atkGrowth: 1.16,
  ramp: 30,
  eliteAtk: 0.35,      // elites hit for this share of a boss of the same stage
  eliteEvery: 5,
};

// Zone bosses (every SHIELD_EVERY stages) start behind a shield worth `shield` of their HP.
// Taps hit it fully, pet damage only by `petMult`. Breaking it stuns the boss.
export const SHIELD = { every: 10, shield: 0.2, petMult: 0.25 };

// ---- Special enemies ----
// Rolled for ordinary (non-boss) enemies from `minStage` on.
export const SPECIALS = {
  minStage: 3,
  goblin: { chance: 0.03, hp: 2, gold: 15, flee: 8,       // carries gold and runs away
            actor: 'goblin', name: 'Hazine Goblini', colors: { body: '#7cc65a', accent: '#8a5a32' } },
  elite: { chance: 0.07, hp: 3, gold: 4 },                 // tougher, attacks, pays more
  armored: { chance: 0.1, nonCrit: 0.25 },                 // only crits hit fully
};

// Active skills: used from the skill bar, then they cool down. They unlock at `unlockStage`
// (in the current run) and are leveled with gold; effect per level is in logic.skillPower.
// `cooldown` starts when the skill is used, so it includes `duration`.
export const SKILLS = [
  { id: 'rage',     name: 'Öfke',            icon: 'skRage',  unlockStage: 5,  baseCost: 300,   growth: 4, max: 10, duration: 30, cooldown: 300, color: '#ef7d57' },
  { id: 'warcry',   name: 'Savaş Narası',    icon: 'skTreat',  unlockStage: 12, baseCost: 3000,  growth: 4, max: 10, duration: 30, cooldown: 300, color: '#ffcd75' },
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
export const STARTING_ELMAS = 0;      // new players get their first 100 from the welcome mail
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

// Pet abilities (`ability`) grow with the evolution form: × ABILITY_FORM_MULT[form - 1].
// `every` ones trigger on a timer while the pet fights; the rest are passive. In `text`,
// {power} shows as a percentage for keen/scan/revive.
export const ABILITY_FORM_MULT = [1, 1.5, 2];

// Each pet is a vector actor (js/pets.js) drawn with its form's colors: `body`, `belly`, `dark`
// and `accent`. From form 2 the actor adds armor or markings in `accent`; form 3 adds a glowing
// aura or flames in `glow`. `shot` is the projectile it fires at the enemy.
export const PETS = [
  {
    id: 'dog', rarity: 'common', actor: 'dog', shot: 'spark', shotColor: '#fff6d8',
    ability: { id: 'bark', name: 'Havlama', every: 10, power: 1, text: 'Her {every} sn havlar, düşmanı {power} sn sersemletir.' },
    forms: [
      { name: 'Köpek',           colors: { body: '#cf9a5e', belly: '#f4dfb6', dark: '#8a5a32', accent: '#d8443e', glow: '#ffd060' } },
      { name: 'Kurt',            colors: { body: '#9fb2c2', belly: '#e8eff4', dark: '#566a7c', accent: '#c0384a', glow: '#ffd060' } },
      { name: 'Cehennem Tazısı', colors: { body: '#3e3550', belly: '#5d4f72', dark: '#231d30', accent: '#ffb43a', glow: '#ff6a2a' } },
    ],
  },
  {
    id: 'cat', rarity: 'common', actor: 'cat', shot: 'spark', shotColor: '#ffc0d0',
    ability: { id: 'keen', name: 'Keskin Pençe', power: 0.05, text: 'Kritik şansı +%{power}.' },
    forms: [
      { name: 'Kedi',         colors: { body: '#f08a48', belly: '#fde6c6', dark: '#b85a26', accent: '#b85a26', glow: '#ffd060' } },
      { name: 'Vaşak',        colors: { body: '#dba45e', belly: '#f6e4c2', dark: '#7a4c2a', accent: '#3a2c28', glow: '#ffd060' } },
      { name: 'Gölge Panter', colors: { body: '#2f3156', belly: '#434678', dark: '#1c1d3a', accent: '#b56fe8', glow: '#d9a2ff' } },
    ],
  },
  {
    id: 'robot', rarity: 'rare', actor: 'robot', shot: 'arrow', shotColor: '#7ff4ff',
    ability: { id: 'laser', name: 'Lazer', every: 8, power: 5, text: 'Her {every} sn lazer atar: pet hasarının ×{power} katı.' },
    forms: [
      { name: 'Mini Robot',   colors: { body: '#aec0ce', belly: '#dce6ee', dark: '#6a7f92', accent: '#5bc8e8', glow: '#7ff4ff' } },
      { name: 'Savaş Robotu', colors: { body: '#64788e', belly: '#94a8ba', dark: '#3c4a5c', accent: '#ef6a4a', glow: '#ffb060' } },
      { name: 'Mega Robot',   colors: { body: '#ffc84a', belly: '#fff0b0', dark: '#b8862a', accent: '#3b6fd8', glow: '#7ff4ff' } },
    ],
  },
  {
    id: 'drone', rarity: 'rare', actor: 'drone', shot: 'arrow', shotColor: '#ff9a6a', float: true,
    ability: { id: 'scan', name: 'Hazine Tarayıcı', power: 0.15, text: 'Altın +%{power}.' },
    forms: [
      { name: 'Drone',         colors: { body: '#aec0ce', belly: '#dce6ee', dark: '#6a7f92', accent: '#ef6a4a', glow: '#ffb060' } },
      { name: 'Saldırı Dronu', colors: { body: '#3e4a60', belly: '#64788e', dark: '#232b3a', accent: '#ff5a3a', glow: '#ff9a3a' } },
      { name: 'Uydu Dronu',    colors: { body: '#f2f6fa', belly: '#ffffff', dark: '#9fb2c2', accent: '#ffc84a', glow: '#7ff4ff' } },
    ],
  },
  {
    id: 'dragon', rarity: 'epic', actor: 'dragon', shot: 'orb', shotColor: '#ff8a3a',
    ability: { id: 'breath', name: 'Alev Nefesi', every: 9, power: 2, burn: 3, text: 'Her {every} sn alev püskürtür: {burn} sn boyunca saniyede pet hasarının ×{power} katı.' },
    forms: [
      { name: 'Ejder Yavrusu', colors: { body: '#52c05e', belly: '#d2f08e', dark: '#2a8a5a', accent: '#f6f0dc', glow: '#ffb43a' } },
      { name: 'Genç Ejder',    colors: { body: '#2b8f92', belly: '#86dcae', dark: '#1a5c66', accent: '#ffd27a', glow: '#ffb43a' } },
      { name: 'Kadim Ejder',   colors: { body: '#c43a4a', belly: '#ffcf7a', dark: '#6e2050', accent: '#ffe2a0', glow: '#ff7a2a' } },
    ],
  },
  {
    id: 'phoenix', rarity: 'legendary', actor: 'phoenix', shot: 'orb', shotColor: '#ffd060', float: true,
    ability: { id: 'revive', name: 'Küllerinden Doğuş', power: 0.5, text: 'Kahraman bayılınca savaş başına bir kez canının %{power}\'iyle kalkar.' },
    forms: [
      { name: 'Anka Yavrusu', colors: { body: '#ff8a3a', belly: '#ffd862', dark: '#d84a2a', accent: '#ffe9a0', glow: '#ffb43a' } },
      { name: 'Anka Kuşu',    colors: { body: '#e0423a', belly: '#ffc84a', dark: '#9a2236', accent: '#ffe07a', glow: '#ff8a3a' } },
      { name: 'Ebedi Anka',   colors: { body: '#4aa8f0', belly: '#e6f8ff', dark: '#2a5fc0', accent: '#bff6ff', glow: '#7ff4ff' } },
    ],
  },
];

// ---- Daily login ----
// One claim per local calendar day. Claiming on consecutive days walks through the 7-day cycle;
// missing a day starts it over. Gold is worth `gold[i]` enemies of the stage the player farms,
// so the reward keeps up with progress (and shrinks again after a rebirth).
// ---- Equipment ----
// Three slots. Every item has its slot's first stat and, by rarity, 0–2 more from the slot's
// list. A stat is worth base × EQUIP.rarityMult × roll (0.8–1.2) × (1 + levelStep × (level-1)).
// Values add up across slots; see logic.js for where each one applies.
export const EQUIP_SLOTS = [
  { id: 'weapon', name: 'Silah',  stats: ['tap', 'critDmg', 'boss'], names: ['Demir Kılıç', 'Çelik Kılıç', 'Ejder Kılıcı', 'Yıldız Kılıcı'] },
  { id: 'helm',   name: 'Kask',   stats: ['hp', 'armor', 'stun'],    names: ['Deri Kask', 'Çelik Miğfer', 'Ejder Miğferi', 'Yıldız Tacı'] },
  { id: 'charm',  name: 'Tılsım', stats: ['gold', 'pet', 'combo'],   names: ['Bakır Tılsım', 'Gümüş Tılsım', 'Ejder Gözü', 'Yıldız Kalbi'] },
];
// kind: 'pct' shows +%, 'mult' +×, 'flat' +n, 'sec' +n sn. `icon` is the small symbol the
// item cards show instead of the name.
export const EQUIP_STATS = {
  tap:     { name: 'Dokunuş hasarı', base: 0.25, kind: 'pct',  icon: 'swordIcon' },
  critDmg: { name: 'Kritik çarpanı', base: 0.3,  kind: 'mult', icon: 'bolt' },
  boss:    { name: 'Boss hasarı',    base: 0.3,  kind: 'pct',  icon: 'crownIcon' },
  hp:      { name: 'Can',            base: 0.25, kind: 'pct',  icon: 'heart' },
  armor:   { name: 'Zırh',           base: 15,   kind: 'flat', icon: 'shield' },
  stun:    { name: 'Sersemletme',    base: 0.3,  kind: 'sec',  icon: 'stunIcon' },
  gold:    { name: 'Altın',          base: 0.15, kind: 'pct',  icon: 'coinIcon' },
  pet:     { name: 'Pet hasarı',     base: 0.25, kind: 'pct',  icon: 'paw' },
  combo:   { name: 'Kombo süresi',   base: 0.08, kind: 'sec',  icon: 'comboIcon' },
};
// Display order everywhere: attack first, health second (as the user asked), then the rest.
export const STAT_ORDER = ['tap', 'hp', 'critDmg', 'boss', 'armor', 'stun', 'pet', 'gold', 'combo'];
export const EQUIP = {
  rarityMult: [1, 1.8, 3, 5],     // by RARITIES index
  statCount: [1, 2, 2, 3],
  levelStep: 0.15,
  maxLevel: 20,
  bagSize: 40,
  upgradeBase: 8,                 // kristal for level 2; × upgradeGrowth per level × upgradeRarity
  upgradeGrowth: 1.22,
  upgradeRarity: [1, 1.6, 2.5, 4],
  salvage: 4,                     // kristal per (rarityMult × level)
  chestCost: 60,                  // elmas
  bossChance: 0.08,               // drop chance on repeat boss kills; first wins always drop
};

// ---- Soul tree ----
// Every soul stone earned in a rebirth also gives a soul point to spend here; souls keep their
// +10% damage. Level L+1 of a node costs L+1 points. `step` is the effect per level.
export const SOUL_BRANCHES = [
  { id: 'war', name: 'Savaş' },
  { id: 'wealth', name: 'Servet' },
  { id: 'time', name: 'Zaman' },
];
export const SOUL_TREE = [
  { id: 'tapPower',   branch: 'war',    name: 'Kılıç Ustalığı',    text: 'Dokunuş hasarı +%{v}',               max: 10, step: 0.15, kind: 'pct' },
  { id: 'petPower',   branch: 'war',    name: 'Pet Bağı',          text: 'Pet hasarı +%{v}',                   max: 10, step: 0.15, kind: 'pct' },
  { id: 'bossTime',   branch: 'war',    name: 'Sabır',             text: 'Boss süresi +{v} sn',                max: 5,  step: 2,    kind: 'num' },
  { id: 'goldPower',  branch: 'wealth', name: 'Hazine Kokusu',     text: 'Altın +%{v}',                        max: 10, step: 0.1,  kind: 'pct' },
  { id: 'startStage', branch: 'wealth', name: 'Kestirme Yol',      text: 'Doğuştan sonra {v}. bölümden başla', max: 6,  step: 5,    kind: 'stage' },
  { id: 'offline',    branch: 'wealth', name: 'Uykuda Kazanç',     text: 'Çevrimdışı altın +%{v}',             max: 5,  step: 0.2,  kind: 'pct' },
  { id: 'skillTime',  branch: 'time',   name: 'Uzun Öfke',         text: 'Yetenek süresi +%{v}',               max: 5,  step: 0.1,  kind: 'pct' },
  { id: 'cooldown',   branch: 'time',   name: 'Hızlı Toparlanma',  text: 'Bekleme süresi −%{v}',               max: 5,  step: 0.06, kind: 'pct' },
  { id: 'comboTime',  branch: 'time',   name: 'Ritim',             text: 'Kombo süresi +{v} sn',               max: 5,  step: 0.1,  kind: 'num' },
];

// ---- Daily quests ----
// Three a day, picked by the date from this pool. `stat` counts up from the day's start value;
// `combo` is the best combo of the day. Finishing all three pays QUEST_BONUS.
export const QUESTS = [
  { id: 'kills',      text: '{n} düşman yen',               stat: 'kills',      n: 250,  reward: { elmas: 10 } },
  { id: 'bosses',     text: '{n} boss yen',                 stat: 'bossKills',  n: 3,    reward: { elmas: 15 } },
  { id: 'skills',     text: '{n} yetenek kullan',           stat: 'skillsUsed', n: 4,    reward: { kristal: 30 } },
  { id: 'taps',       text: '{n} kez dokun',                stat: 'taps',       n: 800,  reward: { kristal: 20 } },
  { id: 'combo',      text: '{n} komboya ulaş',             stat: 'combo',      n: 50,   reward: { elmas: 10 } },
  { id: 'interrupts', text: '{n} boss saldırısını kes',     stat: 'interrupts', n: 3,    reward: { elmas: 15 } },
  { id: 'floors',     text: 'Zindanda {n} kat temizle',     stat: 'floors',     n: 5,    reward: { kristal: 40 } },
  { id: 'levels',     text: '{n} güçlendirme seviyesi al',  stat: 'levels',     n: 30,   reward: { kristal: 25 } },
  { id: 'elites',     text: '{n} elit düşman yen',          stat: 'elites',     n: 2,    reward: { elmas: 10 } },
];
export const QUESTS_PER_DAY = 3;
export const QUEST_BONUS = { elmas: 25 };

// ---- Achievements ----
// Permanent goals in tiers; each tier is collected once. `stat` is a stats counter, or one of
// the derived values in logic.achievementValue ('pets', 'dungeon').
export const ACHIEVEMENTS = [
  { id: 'stage',      name: 'Kaşif',             text: '{n}. bölüme ulaş',             stat: 'bestStage',  tiers: [25, 50, 100, 150, 200] },
  { id: 'kills',      name: 'Avcı',              text: '{n} düşman yen',               stat: 'kills',      tiers: [500, 5000, 50000, 500000] },
  { id: 'bosses',     name: 'Boss Avcısı',       text: '{n} boss yen',                 stat: 'bossKills',  tiers: [10, 50, 200, 1000] },
  { id: 'combo',      name: 'Kombo Ustası',      text: '{n} komboya ulaş',             stat: 'maxCombo',   tiers: [25, 50, 100, 200] },
  { id: 'interrupts', name: 'Savuşturan',        text: '{n} boss saldırısını kes',     stat: 'interrupts', tiers: [5, 50, 250] },
  { id: 'shields',    name: 'Kalkan Kıran',      text: '{n} boss kalkanı kır',         stat: 'shields',    tiers: [1, 10, 50] },
  { id: 'goblins',    name: 'Hazine Avcısı',     text: '{n} hazine goblini yakala',    stat: 'goblins',    tiers: [1, 10, 50] },
  { id: 'elites',     name: 'Elit Avcı',         text: '{n} elit düşman yen',          stat: 'elites',     tiers: [5, 50, 250] },
  { id: 'pets',       name: 'Koleksiyoncu',      text: '{n} farklı pet topla',         stat: 'pets',       tiers: [2, 4, 6] },
  { id: 'dungeon',    name: 'Zindan Fatihi',     text: 'Zindanda {n}. kata ulaş',      stat: 'dungeon',    tiers: [10, 25, 50, 100] },
  { id: 'rebirth',    name: 'Yeniden Doğan',     text: '{n} kez yeniden doğ',          stat: 'prestiges',  tiers: [1, 5, 20] },
];
export const ACHIEVEMENT_ELMAS = [10, 20, 30, 50, 80];   // by tier

export const DAILY = {
  gold: [20, 30, 45, 60, 80, 100, 150],
  elmas: [0, 0, 0, 0, 0, 0, 20],
};

// ---- Mail ----
// Every player sees every mail; rewards can be collected once. `welcome` is the starter gift.
export const MAIL = [
  {
    id: 'welcome',
    from: 'Slasher Hero Ekibi',
    title: 'Hoş geldin, kahraman!',
    body: [
      'Çayırları balçıklar sardı, bu topraklar senin kılıcını bekliyordu.',
      'Yolculuğuna küçük bir hediye: 100 elmas. Pet sekmesinden bir yumurta açıp yeni bir dost bulabilirsin.',
      'İyi savaşlar!',
    ],
    reward: { elmas: 100 },
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

// Team synergies: active while the team matches `need` (role counts, or `distinct` roles).
// `bonus` multiplies the stats of the fighters with `roles` (all when omitted).
export const SYNERGIES = [
  { id: 'arcane',  name: 'Büyü Ustaları', text: 'Büyücülerin saldırısı +%25',        need: { mage: 2 },           roles: ['mage'],  bonus: { atk: 0.25 } },
  { id: 'hunters', name: 'Avcı Sürüsü',   text: 'Vurucuların saldırısı +%20',        need: { dps: 2 },            roles: ['dps'],   bonus: { atk: 0.2 } },
  { id: 'fortress', name: 'Kale',         text: 'Tank canı +%30, şifa +%20',         need: { tank: 1, healer: 1 }, roles: ['tank', 'healer'], bonus: { hp: 0.3, heal: 0.2 } },
  { id: 'balance', name: 'Denge',         text: '3 farklı rol: herkes +%10',         distinct: 3,                              bonus: { atk: 0.1, hp: 0.1, heal: 0.1 } },
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
  chestEvery: 10,          // first clear of every 10th floor opens a chest: an item + kristal
  chestKristal: 3,         // × floor
  offlineStep: 0.5,        // seconds per simulated step while the game was closed
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

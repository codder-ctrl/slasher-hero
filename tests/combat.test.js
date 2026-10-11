import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/logic.js';
import {
  COMBO, ATTACK, SHIELD, SPECIALS, HERO, QUESTS, QUESTS_PER_DAY, QUEST_BONUS, ACHIEVEMENTS, ACHIEVEMENT_ELMAS,
  BOSS_TIME, RESPAWN_DELAY,
} from '../js/config.js';

const noCrit = () => 0.99;          // never crits, never rolls a special enemy
const fresh = () => L.newGame(noCrit, 0);

// A state standing on `stage` (unlocked), with its enemy freshly spawned.
function onStage(stage, rng = noCrit) {
  const s = fresh();
  s.maxStage = Math.max(stage, 1);
  L.setStage(s, stage, rng);
  return s;
}

// rng that returns the given values in order, then `rest`.
const seq = (values, rest = 0.99) => { let i = 0; return () => (i < values.length ? values[i++] : rest); };

// ---- Hero ----

test('armor reduces damage with diminishing returns and never to zero', () => {
  assert.equal(L.damageTakenMultiplier(0), 1);
  assert.equal(L.damageTakenMultiplier(HERO.armorK), 0.5);
  assert.ok(Math.abs(L.damageTakenMultiplier(HERO.armorK * 3) - 0.25) < 1e-12);
  let prevGain = Infinity;
  for (let a = 0; a < 2000; a += 100) {
    const gain = L.damageTakenMultiplier(a) - L.damageTakenMultiplier(a + 100);
    assert.ok(gain < prevGain, 'each step of armor helps less');
    prevGain = gain;
  }
  assert.ok(L.damageTakenMultiplier(1e12) > 0);
});

test('Dayanıklılık raises max HP and Demir Zırh lowers the damage of a hit', () => {
  const s = onStage(40);
  const base = L.heroMaxHp(s);
  const hit = L.attackDamage(s);
  s.upgrades.vitality = 20;
  s.upgrades.armor = 25;
  assert.ok(L.heroMaxHp(s) > base * 1.6);
  assert.ok(Math.abs(L.attackDamage(s) - hit * L.damageTakenMultiplier(100)) < 1e-6);
  assert.ok(L.attackDamage(s, s.enemy, 60) > L.attackDamage(s, s.enemy, 40), 'deeper stages hit harder');
});

// ---- Combo ----

test('quick taps build a combo that multiplies tap damage and expires when tapping stops', () => {
  const s = onStage(30);
  const events = [];
  const first = L.tap(s, noCrit, events).dmg;
  for (let i = 1; i < COMBO.tiers[0].at; i++) L.tap(s, noCrit, events);
  assert.equal(s.combo.count, COMBO.tiers[0].at);
  assert.ok(events.some((e) => e.type === 'combo' && e.count === COMBO.tiers[0].at));
  const boosted = L.tap(s, noCrit, events).dmg;
  assert.ok(Math.abs(boosted - first * COMBO.tiers[0].mult) < 1e-6);
  L.tick(s, COMBO.window / 2, noCrit);
  assert.ok(s.combo.count > 0);
  L.tick(s, COMBO.window, noCrit);
  assert.equal(s.combo.count, 0);
  assert.equal(s.stats.maxCombo, COMBO.tiers[0].at + 1);
});

test('Kılıç Fırtınası hits neither build nor use the combo', () => {
  const s = onStage(30);
  s.skills.storm = 3;
  L.useSkill(s, 'storm');
  L.tick(s, 1, noCrit);
  assert.equal(s.combo.count, 0);
});

// ---- Boss attacks ----

function windUp(s) {
  const events = [];
  L.tick(s, ATTACK.first + 0.01, noCrit, events);
  assert.ok(events.some((e) => e.type === 'windup'));
  return events;
}

test('a boss winds up and its hit lands on the hero unless interrupted', () => {
  const s = onStage(45);
  s.upgrades.vitality = 300;
  s.hero.hp = L.heroMaxHp(s);
  windUp(s);
  const hp = s.hero.hp;
  const events = L.tick(s, ATTACK.windup, noCrit);
  const hit = events.find((e) => e.type === 'heroHit');
  assert.ok(hit);
  assert.ok(Math.abs(s.hero.hp - (hp - hit.dmg)) < 1e-6);
});

test('enough taps during the wind-up interrupt it, stun the boss and boost damage', () => {
  const s = onStage(45);
  s.upgrades.vitality = 200;
  s.hero.hp = L.heroMaxHp(s);
  windUp(s);
  const plain = L.tapDamage(s);
  const events = [];
  for (let i = 0; i < ATTACK.taps; i++) L.tap(s, noCrit, events);
  assert.ok(events.some((e) => e.type === 'interrupt'));
  assert.ok(s.enemy.stun > 0);
  assert.equal(s.stats.interrupts, 1);
  const hit = L.tap(s, noCrit, []);
  assert.ok(hit.dmg > plain * ATTACK.stunBonus * 0.99);
  const after = L.tick(s, ATTACK.windup, noCrit);
  assert.ok(!after.some((e) => e.type === 'heroHit'), 'the interrupted hit never lands');
});

test('a knocked-out hero loses the boss fight, drops a stage and gets back up', () => {
  const s = onStage(45);
  s.hero.hp = 1;
  windUp(s);
  const events = L.tick(s, ATTACK.windup, noCrit);
  assert.ok(events.some((e) => e.type === 'heroDown' && e.boss));
  assert.ok(events.some((e) => e.type === 'bossFail'));
  assert.equal(s.stage, 44);
  assert.equal(s.autoAdvance, false);
  assert.equal(s.hero.hp, L.heroMaxHp(s));
  assert.equal(s.stats.heroDowns, 1);
});

test('a new boss fight starts at full health and the hero heals between fights', () => {
  const s = onStage(44);
  s.hero.hp = 5;
  L.tick(s, 1, noCrit);
  assert.ok(s.hero.hp > 5, 'regenerates out of combat');
  s.hero.hp = 5;
  s.maxStage = 45;
  L.setStage(s, 45, noCrit);
  assert.equal(s.hero.hp, L.heroMaxHp(s));
  assert.ok(BOSS_TIME > ATTACK.first);
});

// ---- Shields ----

test('zone bosses start shielded: taps chip it fully, the pet barely, and breaking it stuns', () => {
  const s = onStage(SHIELD.every * 2);
  const e = s.enemy;
  assert.ok(e.boss && e.shield > 0);
  assert.equal(e.shield, Math.ceil(e.maxHp * SHIELD.shield));
  assert.equal(onStage(15).enemy.shield, 0, 'ordinary bosses have none');
  s.training.train = 30;
  const before = e.shield;
  L.tick(s, 0.5, noCrit);
  assert.ok(Math.abs(before - e.shield - L.totalDps(s) * 0.5 * SHIELD.petMult) < 1e-6);
  assert.equal(e.hp, e.maxHp, 'HP is untouched while shielded');
  s.upgrades.sword = 2000;
  const events = [];
  L.tap(s, noCrit, events);
  assert.equal(e.shield, 0);
  assert.ok(events.some((x) => x.type === 'shieldBreak'));
  assert.ok(e.stun > 0);
  assert.equal(s.stats.shields, 1);
});

// ---- Special enemies ----

test('special enemies roll only from the minimum stage and never on boss stages', () => {
  // rng: first value picks the enemy kind, the second rolls the variant.
  const at = (stage, roll) => onStage(stage, seq([0.5, roll])).enemy.variant;
  assert.equal(at(SPECIALS.minStage - 1, 0), 'normal');
  assert.equal(at(SPECIALS.minStage, 0), 'goblin');
  assert.equal(at(SPECIALS.minStage, SPECIALS.goblin.chance + 0.001), 'elite');
  assert.equal(at(SPECIALS.minStage, SPECIALS.goblin.chance + SPECIALS.elite.chance + 0.001), 'armored');
  assert.equal(at(SPECIALS.minStage, 0.99), 'normal');
  assert.equal(at(10, 0), 'boss');
});

test('armored enemies shrug off non-crits; crits hit fully', () => {
  const s = onStage(12, seq([0.5, SPECIALS.goblin.chance + SPECIALS.elite.chance + 0.001]));
  assert.equal(s.enemy.variant, 'armored');
  s.upgrades.sword = 10;
  const normal = L.tap(s, noCrit, []);
  assert.ok(normal.blocked);
  assert.ok(Math.abs(normal.dmg - L.tapDamage(s) * SPECIALS.armored.nonCrit) < 1e-6);
  const crit = L.tap(s, () => 0, []);
  assert.equal(crit.blocked, false);
});

test('a treasure goblin pays big if caught and runs off with no kill if not', () => {
  const s = onStage(12, seq([0.5, 0]));
  assert.equal(s.enemy.variant, 'goblin');
  assert.equal(s.enemy.maxHp, Math.ceil(L.enemyMaxHp(12) * SPECIALS.goblin.hp));
  const events = L.tick(s, SPECIALS.goblin.flee + 0.01, noCrit);
  assert.ok(events.some((e) => e.type === 'goblinFlee'));
  assert.equal(s.stats.kills, 0);

  const t = onStage(12, seq([0.5, 0]));
  t.upgrades.sword = 3000;
  const kill = [];
  L.tap(t, noCrit, kill);
  const k = kill.find((e) => e.type === 'kill');
  assert.equal(k.variant, 'goblin');
  assert.equal(k.gold, L.enemyGold(t, 12) * SPECIALS.goblin.gold);
  assert.equal(t.stats.goblins, 1);
});

test('elites attack too, and a knocked-out hero just lets them get away', () => {
  const s = onStage(31, seq([0.5, SPECIALS.goblin.chance + 0.001]));
  assert.equal(s.enemy.variant, 'elite');
  assert.ok(s.enemy.attack);
  s.hero.hp = 1;
  L.tick(s, ATTACK.first + 0.01, noCrit);
  const events = L.tick(s, ATTACK.windup, noCrit);
  assert.ok(events.some((e) => e.type === 'heroDown' && !e.boss));
  assert.ok(events.some((e) => e.type === 'eliteFlee'));
  assert.equal(s.stage, 31, 'no stage lost');
  assert.equal(s.stats.kills, 0);
});

// ---- Quests ----

const day = (d, h = 12) => new Date(2026, 9, d, h).getTime();

test('three distinct quests a day, the same for everyone that day, new ones the next day', () => {
  const a = fresh();
  const b = fresh();
  assert.equal(L.ensureQuests(a, day(5)), true);
  L.ensureQuests(b, day(5, 22));
  assert.equal(a.quests.list.length, QUESTS_PER_DAY);
  assert.deepEqual(a.quests.list.map((q) => q.id), b.quests.list.map((q) => q.id));
  assert.equal(new Set(a.quests.list.map((q) => q.id)).size, QUESTS_PER_DAY);
  assert.equal(L.ensureQuests(a, day(5, 23)), false);
  const days = new Set();
  for (let d = 1; d <= 20; d++) { L.ensureQuests(a, day(d)); days.add(a.quests.list.map((q) => q.id).join()); }
  assert.ok(days.size > 5, 'the selection changes from day to day');
});

test('quests count from the start of the day and pay once; all three pay a bonus', () => {
  const s = fresh();
  s.stats.kills = 1000;
  s.quests = { day: L.dayKey(day(5)), list: QUESTS.filter((q) => ['kills', 'taps', 'combo'].includes(q.id)).map((q) => ({ id: q.id, start: 0, claimed: false })), combo: 0, bonus: false };
  for (const q of s.quests.list) { const def = L.findQuest(q.id); q.start = def.stat === 'combo' ? 0 : s.stats[def.stat]; }
  const kills = L.findQuest('kills');
  assert.equal(L.questProgress(s, s.quests.list[0]).value, 0, 'kills before today do not count');
  assert.equal(L.claimQuest(s, 'kills'), null);
  s.stats.kills += kills.n;
  assert.ok(L.questProgress(s, s.quests.list[0]).done);
  const elmas = s.elmas;
  assert.deepEqual(L.claimQuest(s, 'kills'), kills.reward);
  assert.equal(s.elmas, elmas + (kills.reward.elmas || 0));
  assert.equal(L.claimQuest(s, 'kills'), null);
  s.stats.taps += 10000;
  s.quests.combo = 1000;
  L.claimQuest(s, 'taps');
  assert.equal(L.claimQuestBonus(s), null, 'bonus waits for all three');
  L.claimQuest(s, 'combo');
  assert.ok(L.questBonusReady(s));
  const before = s.elmas;
  assert.deepEqual(L.claimQuestBonus(s), QUEST_BONUS);
  assert.equal(s.elmas, before + QUEST_BONUS.elmas);
  assert.equal(L.claimQuestBonus(s), null);
});

// ---- Achievements ----

test('achievements pay each tier once, in order, with growing rewards', () => {
  const s = fresh();
  const def = ACHIEVEMENTS.find((a) => a.id === 'kills');
  assert.equal(L.claimAchievement(s, 'kills'), null);
  s.stats.kills = def.tiers[1];
  assert.deepEqual(L.claimAchievement(s, 'kills'), { elmas: ACHIEVEMENT_ELMAS[0] });
  assert.deepEqual(L.claimAchievement(s, 'kills'), { elmas: ACHIEVEMENT_ELMAS[1] });
  assert.equal(L.claimAchievement(s, 'kills'), null, 'tier 3 not reached');
  assert.equal(s.achievements.kills, 2);
  s.pets.cat = { form: 1, stars: 0 };
  assert.ok(L.achievementStatus(s, ACHIEVEMENTS.find((a) => a.id === 'pets')).ready);
  assert.ok(L.questsClaimable(s));
});

test('quests and achievements survive saves and rebirth; live combat state is not saved', () => {
  const s = fresh();
  L.ensureQuests(s, day(5));
  s.stats.kills = 600;
  L.claimAchievement(s, 'kills');
  s.combo.count = 30;
  const saved = JSON.parse(JSON.stringify(L.serializeState(s)));
  assert.equal('combo' in saved, false);
  assert.equal('hero' in saved, false);
  const round = L.loadState(saved, noCrit);
  assert.deepEqual(round.quests.list.map((q) => q.id), s.quests.list.map((q) => q.id));
  assert.equal(round.achievements.kills, 1);
  assert.equal(round.combo.count, 0);
  assert.equal(round.hero.hp, L.heroMaxHp(round));
  round.maxStage = 40;
  L.prestige(round, noCrit);
  assert.equal(round.achievements.kills, 1);
  assert.equal(round.quests.day, s.quests.day);
  const bad = L.loadState({ quests: { day: 'x', list: [{ id: 'nope' }] }, achievements: { kills: 99, bogus: 2 } }, noCrit);
  assert.equal(bad.quests.list.length, 0);
  assert.equal(bad.achievements.kills, ACHIEVEMENTS.find((a) => a.id === 'kills').tiers.length);
  assert.equal('bogus' in bad.achievements, false);
  assert.ok(RESPAWN_DELAY > 0);
});

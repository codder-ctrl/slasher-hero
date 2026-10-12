import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/logic.js';
import { RAID, MEGA_BOSSES } from '../js/config.js';
import { ACTORS } from '../js/actors.js';

const noCrit = () => 0.99;
const DAY1 = new Date(2026, 9, 12, 10).getTime();
const DAY2 = new Date(2026, 9, 13, 10).getTime();
const minotaur = MEGA_BOSSES[0];

// A state that has passed `best` at some point and stands on stage 50 now.
function veteran(best = 150) {
  const s = L.newGame(noCrit, 0);
  s.stats.bestStage = best;
  s.maxStage = 50;
  L.setStage(s, 50, noCrit);
  return s;
}

// Hits the mega boss until it dies (or the fight ends), collecting events.
function finish(s) {
  const events = [];
  let guard = 0;
  while (L.inRaid(s) && s.enemy.hp > 0 && guard++ < 1000) {
    s.enemy.hp = Math.min(s.enemy.hp, s.enemy.maxHp * 0.2);
    L.tap(s, noCrit, events);
    s.enemy.hp -= s.enemy.maxHp;
    if (s.enemy.hp <= 0) { s.enemy.hp = 1; L.tap(s, noCrit, events); }
  }
  return events;
}

test('mega bosses unlock past their stage, by the all-time best', () => {
  assert.equal(L.megaUnlocked(veteran(100), minotaur), false, 'stage 100 itself is not enough');
  assert.equal(L.megaUnlocked(veteran(101), minotaur), true);
  assert.equal(L.megaUnlocked(veteran(150), MEGA_BOSSES[1]), false);
  for (const m of MEGA_BOSSES) {
    assert.ok(m.trophy && m.name && m.land && m.unlock % 100 === 0, m.id);
    if (!m.soon) assert.ok(ACTORS[m.actor]?.special, `${m.id} has an actor with a special attack`);
  }
});

test('keys refill each day, are spent on entering and can be bought', () => {
  const s = veteran();
  assert.ok(L.canStartRaid(s, minotaur, DAY1));
  assert.equal(s.raid.keys, RAID.keysPerDay);
  assert.ok(L.startRaid(s, 'minotaur', [], DAY1));
  assert.equal(s.raid.keys, RAID.keysPerDay - 1);
  assert.ok(L.leaveRaid(s, []));
  assert.equal(s.raid.keys, RAID.keysPerDay, 'leaving gives the key back');
  s.raid.keys = 0;
  assert.equal(L.startRaid(s, 'minotaur', [], DAY1), false, 'no keys left today');
  s.elmas = RAID.keyCost;
  assert.ok(L.buyRaidKey(s));
  assert.equal(s.elmas, 0);
  assert.ok(L.startRaid(s, 'minotaur', [], DAY1));
  L.leaveRaid(s, []);
  L.refreshRaidKeys(s, DAY2);
  assert.equal(s.raid.keys, RAID.keysPerDay, 'a new day tops the keys back up');
});

test('the fight replaces the main enemy and the stage cannot change meanwhile', () => {
  const s = veteran();
  L.startRaid(s, 'minotaur', [], DAY1);
  assert.ok(L.inRaid(s));
  assert.equal(s.enemy.maxHp, L.megaHp(minotaur, 1));
  assert.ok(s.enemy.maxHp >= L.enemyMaxHp(minotaur.unlock, true) * 5, 'much tougher than the stage boss');
  assert.equal(L.setStage(s, 49, noCrit), false);
  assert.equal(L.enemySpec(s).name, 'Minotor');
  assert.ok(L.attackDamage(s) > L.attackDamage(s, { boss: true }, minotaur.unlock), 'hits harder than a stage boss');
});

test('phases come at 66% and 33% HP and make attacks faster', () => {
  const s = veteran();
  L.startRaid(s, 'minotaur', [], DAY1);
  const e = s.enemy;
  const every1 = e.every;
  const events = [];
  e.hp = e.maxHp * 0.6;
  L.tap(s, noCrit, events);
  assert.equal(e.phase, 2);
  e.hp = e.maxHp * 0.3;
  L.tap(s, noCrit, events);
  assert.equal(e.phase, 3);
  assert.deepEqual(events.filter((x) => x.type === 'raidPhase').map((x) => x.phase), [2, 3]);
  assert.ok(e.every < every1);
});

test('the first win pays much more than repeats, and wins level the boss and its trophy', () => {
  const s = veteran();
  const tap0 = L.tapDamage(s);
  L.startRaid(s, 'minotaur', [], DAY1);
  const elmas0 = s.elmas;
  const bag0 = s.equipment.bag.length;
  let events = finish(s);
  const win = events.find((x) => x.type === 'raidWin');
  assert.ok(win?.first);
  assert.equal(s.elmas - elmas0, minotaur.first.elmas);
  assert.equal(win.reward.keys, RAID.firstKeys);
  assert.equal(s.equipment.bag.length, bag0 + 1);
  assert.ok(s.equipment.bag.at(-1).rarity >= minotaur.first.rarity);
  assert.ok(L.tapDamage(s) > tap0 * 1.1, 'the trophy adds tap damage');
  assert.equal(L.megaLevel(s, minotaur), 2);

  // The victory pause, then the main battle is back.
  L.tick(s, RAID.leaveDelay + 0.1, noCrit, []);
  assert.equal(L.inRaid(s), false);
  assert.equal(s.stage, 50);

  L.startRaid(s, 'minotaur', [], DAY1);
  assert.equal(s.enemy.maxHp, L.megaHp(minotaur, 2));
  const elmas1 = s.elmas;
  events = finish(s);
  const again = events.find((x) => x.type === 'raidWin');
  assert.equal(again.first, false);
  assert.ok(s.elmas - elmas1 < minotaur.first.elmas / 5);
  assert.ok(again.reward.kristal > 0);
  assert.equal(L.trophyLevel(s, minotaur), 2);
});

test('losing on time or by knockout returns to the main battle without rewards', () => {
  const s = veteran();
  L.startRaid(s, 'minotaur', [], DAY1);
  const elmas = s.elmas;
  const keys = s.raid.keys;
  const events = [];
  L.tick(s, 0.05, noCrit, events);
  s.enemy.timeLeft = 0.01;
  L.tick(s, 0.05, noCrit, events);
  assert.ok(events.some((x) => x.type === 'raidLose' && x.why === 'time'));
  assert.equal(L.inRaid(s), false);
  assert.equal(s.elmas, elmas);
  assert.equal(s.raid.keys, keys + 1, 'a lost fight refunds its key');
  assert.equal(L.megaWins(s, minotaur), 0);

  L.startRaid(s, 'minotaur', [], DAY1);
  s.hero.hp = 1;
  s.enemy.attack = { cd: 0, windup: 0.01, need: 5 };
  const ev2 = [];
  L.tick(s, 0.05, noCrit, ev2);
  assert.ok(ev2.some((x) => x.type === 'raidLose' && x.why === 'down'));
  assert.equal(L.inRaid(s), false);
});

test('mega boss progress survives saving and rebirth; a live fight is not saved', () => {
  const s = veteran();
  L.startRaid(s, 'minotaur', [], DAY1);
  finish(s);
  const raw = JSON.parse(JSON.stringify(L.serializeState(s)));
  const back = L.loadState(raw, noCrit, DAY1);
  assert.equal(L.megaWins(back, minotaur), 1);
  assert.equal(back.raid.keys, s.raid.keys);
  assert.equal(L.inRaid(back), false);
  const bad = L.loadState({ ...raw, raid: { keys: -5, wins: { minotaur: 'x', nope: 3 } } }, noCrit, DAY1);
  assert.equal(bad.raid.keys, 0);
  assert.deepEqual(bad.raid.wins, {});
  s.souls = 0;
  s.maxStage = 150;
  L.prestige(s, noCrit);
  assert.equal(L.megaWins(s, minotaur), 1);
});

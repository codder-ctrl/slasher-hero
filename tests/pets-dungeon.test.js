import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/logic.js';
import * as D from '../js/dungeon.js';
import {
  PETS, RARITIES, COMPANIONS, ROLES, EGG_COST, MAX_STARS, DUPLICATE_KRISTAL, BOSS_ELMAS,
  STARTING_ELMAS, STARTER_PET, STARTER_TEAM, FORM_MULT, TEAM_SIZE, DUNGEON, RESPAWN_DELAY,
} from '../js/config.js';

const fixed = (x) => () => x;
const fresh = () => L.newGame(fixed(0.5), 0);

// rng value that rolls the given rarity, then picks the first pet of it.
function rollFor(rarityId) {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let start = 0;
  for (const r of RARITIES) {
    if (r.id === rarityId) return (start + 0.0001) / total;
    start += r.weight;
  }
  throw new Error(rarityId);
}

test('new games start with the starter pet, elmas and the starter team', () => {
  const s = fresh();
  assert.deepEqual(Object.keys(s.pets), [STARTER_PET]);
  assert.equal(s.activePet, STARTER_PET);
  assert.equal(s.elmas, STARTING_ELMAS);
  assert.deepEqual(s.dungeon.team, STARTER_TEAM);
  for (const id of STARTER_TEAM) assert.equal(s.companions[id], 1);
});

test('rarity, evolution and stars multiply pet damage', () => {
  const s = fresh();
  s.training.train = 10;
  const base = L.petDps(s);
  s.pets.dog.form = 3;
  s.pets.dog.stars = 2;
  assert.ok(Math.abs(L.petDps(s) - base * FORM_MULT[2] * 1.4) < 1e-6);
  s.pets.phoenix = { form: 1, stars: 0 };
  assert.ok(L.selectPet(s, 'phoenix'));
  assert.equal(L.petDps(s), base * RARITIES.find((r) => r.id === 'legendary').mult);
  assert.equal(L.selectPet(s, 'robot'), false, 'not owned');
});

test('eggs cost elmas, add new pets, then stars, then kristal', () => {
  const s = fresh();
  s.elmas = EGG_COST * (MAX_STARS + 3);
  const rng = fixed(rollFor('legendary'));
  const first = L.openEgg(s, rng);
  assert.equal(first.id, 'phoenix');
  assert.equal(first.isNew, true);
  assert.deepEqual(s.pets.phoenix, { form: 1, stars: 0 });
  for (let i = 1; i <= MAX_STARS; i++) assert.equal(L.openEgg(s, rng).stars, i);
  const extra = L.openEgg(s, rng);
  assert.equal(extra.kristal, DUPLICATE_KRISTAL);
  assert.equal(s.kristal, DUPLICATE_KRISTAL);
  assert.equal(s.elmas, EGG_COST);
  assert.equal(s.stats.eggs, MAX_STARS + 2);
  s.elmas = EGG_COST - 1;
  assert.equal(L.openEgg(s, rng), null);
});

test('egg rarities follow their weights', () => {
  const counts = Object.fromEntries(RARITIES.map((r) => [r.id, 0]));
  for (let i = 0; i < 1000; i++) counts[L.rollRarity(fixed((i + 0.5) / 1000)).id]++;
  for (const r of RARITIES) assert.ok(Math.abs(counts[r.id] / 10 - r.weight) <= 0.6, r.id);
});

test('evolving costs kristal and stops at the last form', () => {
  const s = fresh();
  const costs = RARITIES.find((r) => r.id === 'common').evolveCost;
  assert.equal(L.evolvePet(s, 'dog'), false);
  s.kristal = costs[0] + costs[1];
  assert.ok(L.evolvePet(s, 'dog'));
  assert.ok(L.evolvePet(s, 'dog'));
  assert.equal(s.pets.dog.form, 3);
  assert.equal(s.kristal, 0);
  assert.equal(L.evolveCost(s, 'dog'), Infinity);
  assert.equal(L.evolvePet(s, 'robot'), false, 'not owned');
});

test('a boss beaten for the first time ever pays elmas once', () => {
  const s = fresh();
  s.maxStage = 5;
  s.stats.bestStage = 5;
  L.setStage(s, 5, fixed(0.99));
  const events = [];
  while (s.enemy.respawn <= 0) L.tap(s, fixed(0.99), events);
  assert.equal(s.elmas, STARTING_ELMAS + BOSS_ELMAS);
  assert.ok(events.some((e) => e.type === 'elmas'));
  // Again after rebirth: no new elmas.
  s.maxStage = 5;
  s.autoAdvance = false;
  L.tick(s, RESPAWN_DELAY + 0.01, fixed(0.99));
  L.setStage(s, 4, fixed(0.99));
  L.setStage(s, 5, fixed(0.99));
  while (s.enemy.respawn <= 0) L.tap(s, fixed(0.99));
  assert.equal(s.elmas, STARTING_ELMAS + BOSS_ELMAS);
});

test('pets, gems and the dungeon survive a save round trip; bad values are repaired', () => {
  const s = fresh();
  s.pets.robot = { form: 2, stars: 3 };
  s.activePet = 'robot';
  s.elmas = 345;
  s.kristal = 67;
  s.companions.mage = 4;
  s.dungeon = { floor: 8, best: 9, team: ['mage', 'guard'] };
  const round = L.loadState(JSON.parse(JSON.stringify(L.serializeState(s))), fixed(0.5));
  assert.deepEqual(round.pets.robot, { form: 2, stars: 3 });
  assert.equal(round.activePet, 'robot');
  assert.equal(round.elmas, 345);
  assert.equal(round.kristal, 67);
  assert.equal(round.companions.mage, 4);
  assert.deepEqual(round.dungeon, { floor: 8, best: 9, team: ['mage', 'guard'] });
  assert.equal('dungeonRun' in L.serializeState(s), false);

  const bad = L.loadState({
    v: 2, pets: { robot: { form: 9, stars: -1 }, nope: { form: 1 } }, activePet: 'nope',
    dungeon: { floor: 99, best: 3, team: ['archer', 'archer', 'witch', 'zzz'] },
  }, fixed(0.5));
  assert.deepEqual(bad.pets.robot, { form: 3, stars: 0 });
  assert.equal('nope' in bad.pets, false);
  assert.equal(bad.activePet, STARTER_PET);
  assert.equal(bad.dungeon.floor, 4);
  assert.deepEqual(bad.dungeon.team, ['archer']);
});

// ---- Dungeon ----

function runUntil(s, type, maxSeconds = 600) {
  const events = [];
  for (let t = 0; t < maxSeconds; t += 0.1) {
    D.tickDungeon(s, 0.1, fixed(0.5), events);
    if (events.some((e) => e.type === type)) return events;
  }
  throw new Error(`no ${type} within ${maxSeconds}s`);
}

test('the starter team clears floor 1, earns kristal and moves on', () => {
  const s = fresh();
  const events = runUntil(s, 'dg-clear');
  const clear = events.find((e) => e.type === 'dg-clear');
  assert.equal(clear.floor, 1);
  assert.equal(s.dungeon.floor, 2);
  assert.equal(s.dungeon.best, 1);
  const kills = events.filter((e) => e.type === 'dg-kill').reduce((sum, e) => sum + e.kristal, 0);
  assert.equal(s.kristal, kills + D.clearKristal(1));
});

test('a wiped team retreats one floor and starts again at full health', () => {
  const s = fresh();
  s.dungeon.floor = 40;
  s.dungeon.best = 39;
  runUntil(s, 'dg-defeat');
  runUntil(s, 'dg-start');
  assert.equal(s.dungeon.floor, 39);
  for (const f of s.dungeonRun.fighters) assert.equal(f.hp, f.maxHp);
});

test('boss floors pay elmas on their first clear', () => {
  const s = fresh();
  for (const id of STARTER_TEAM) s.companions[id] = 30;
  s.dungeon.floor = DUNGEON.bossEvery;
  s.dungeon.best = DUNGEON.bossEvery - 1;
  D.restartDungeon(s, fixed(0.5));
  const clear = runUntil(s, 'dg-clear').find((e) => e.type === 'dg-clear');
  assert.equal(clear.elmas, DUNGEON.bossElmas);
  assert.equal(s.elmas, STARTING_ELMAS + DUNGEON.bossElmas);
});

test('healers heal, mages hit every enemy, tanks draw the attacks', () => {
  const s = fresh();
  s.companions.mage = 1;
  s.dungeon.team = ['guard', 'healer', 'mage'];
  s.dungeon.floor = 6;
  D.restartDungeon(s, fixed(0.5));
  const events = [];
  for (let t = 0; t < 20; t += 0.1) D.tickDungeon(s, 0.1, fixed(0.5), events);
  const run = s.dungeonRun;
  const enemyHits = events.filter((e) => e.type === 'dg-attack' && e.side === 'enemy');
  assert.ok(enemyHits.length > 0);
  const tankIndex = 0;
  assert.ok(enemyHits.slice(0, 3).every((e) => e.to === tankIndex), 'tank is targeted first');
  assert.ok(events.some((e) => e.type === 'dg-heal'));
  const mageIndex = 2;
  const firstMageTurn = events.filter((e) => e.type === 'dg-attack' && e.side === 'team' && e.from === mageIndex);
  assert.ok(new Set(firstMageTurn.map((e) => e.to)).size > 1, 'mage hits several enemies');
  assert.ok(run);
});

test('recruiting, leveling and team changes cost kristal and respect the team size', () => {
  const s = fresh();
  assert.equal(D.recruit(s, 'mage', fixed(0.5)), false);
  s.kristal = 10000;
  assert.ok(D.recruit(s, 'mage', fixed(0.5)));
  assert.equal(s.companions.mage, 1);
  assert.equal(s.dungeon.team.length, TEAM_SIZE, 'team was full, so mage waits on the bench');
  assert.equal(D.toggleTeam(s, 'mage', fixed(0.5)), false);
  assert.ok(D.toggleTeam(s, 'archer', fixed(0.5)));
  assert.ok(D.toggleTeam(s, 'mage', fixed(0.5)));
  assert.ok(s.dungeon.team.includes('mage'));
  const before = s.kristal;
  assert.ok(D.levelUpCompanion(s, 'mage', fixed(0.5)));
  assert.equal(s.companions.mage, 2);
  assert.equal(s.kristal, before - D.levelCost('mage', 1));
  assert.equal(D.levelUpCompanion(s, 'titan', fixed(0.5)), false, 'not recruited');
});

test('companion stats grow with level and later companions are stronger', () => {
  for (const c of COMPANIONS) assert.ok(ROLES[c.role], c.id);
  const a = D.companionStats('archer', 1);
  assert.ok(D.companionStats('archer', 5).atk > a.atk);
  assert.ok(D.companionStats('rogue', 1).atk > a.atk);
  assert.ok(D.levelCost('archer', 5) > D.levelCost('archer', 1));
  assert.ok(D.recruitCost('dragon') > D.recruitCost('mage'));
});

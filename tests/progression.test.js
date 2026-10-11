import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../js/logic.js';
import * as G from '../js/gear.js';
import * as T from '../js/souls.js';
import * as D from '../js/dungeon.js';
import {
  EQUIP, EQUIP_SLOTS, EQUIP_STATS, SOUL_TREE, SYNERGIES, DUNGEON, PETS, ABILITY_FORM_MULT, ATTACK,
  BOSS_TIME, COMBO, OFFLINE_CAP,
} from '../js/config.js';

const noCrit = () => 0.99;
const fresh = () => L.newGame(noCrit, 0);
const seq = (values, rest = 0.5) => { let i = 0; return () => (i < values.length ? values[i++] : rest); };

function onStage(stage, rng = noCrit) {
  const s = fresh();
  s.maxStage = Math.max(stage, 1);
  L.setStage(s, stage, rng);
  return s;
}

// ---- Equipment ----

test('items carry their slot stat first and more stats with rarity', () => {
  for (const slot of EQUIP_SLOTS) {
    for (let r = 0; r < 4; r++) {
      const item = G.makeItem(slot.id, r, () => 0.5, 1);
      assert.equal(item.stats[0].k, slot.stats[0]);
      assert.equal(item.stats.length, EQUIP.statCount[r]);
      assert.equal(new Set(item.stats.map((x) => x.k)).size, item.stats.length);
      for (const st of item.stats) assert.ok(slot.stats.includes(st.k));
    }
  }
  const common = G.makeItem('weapon', 0, () => 0.5, 1);
  const legendary = G.makeItem('weapon', 3, () => 0.5, 2);
  assert.ok(G.statValue(legendary, legendary.stats[0]) > G.statValue(common, common.stats[0]) * 4);
  assert.ok(G.itemScore(legendary) > G.itemScore(common));
});

test('equipped items raise the stats they name', () => {
  const s = onStage(30);
  const before = { tap: L.tapDamage(s), hp: L.heroMaxHp(s), armor: L.heroArmor(s), gold: L.goldMultiplier(s), crit: L.critMultiplier(s) };
  s.equipment.slots.weapon = { uid: 1, slot: 'weapon', rarity: 3, level: 1, stats: [{ k: 'tap', roll: 1 }, { k: 'critDmg', roll: 1 }, { k: 'boss', roll: 1 }] };
  s.equipment.slots.helm = { uid: 2, slot: 'helm', rarity: 0, level: 1, stats: [{ k: 'hp', roll: 1 }] };
  s.equipment.slots.charm = { uid: 3, slot: 'charm', rarity: 1, level: 3, stats: [{ k: 'gold', roll: 1 }, { k: 'pet', roll: 1 }] };
  const tap = EQUIP_STATS.tap.base * EQUIP.rarityMult[3];
  assert.ok(Math.abs(L.tapDamage(s) - before.tap * (1 + tap)) < 1e-6);
  assert.ok(Math.abs(L.critMultiplier(s) - (before.crit + EQUIP_STATS.critDmg.base * EQUIP.rarityMult[3])) < 1e-9);
  assert.ok(L.heroMaxHp(s) > before.hp);
  const gold = EQUIP_STATS.gold.base * EQUIP.rarityMult[1] * (1 + EQUIP.levelStep * 2);
  assert.ok(Math.abs(L.goldMultiplier(s) - before.gold * (1 + gold)) < 1e-9);
  assert.equal(L.heroArmor(s), before.armor);
  // Boss hasarı only counts against bosses.
  const t = onStage(35);
  t.equipment = s.equipment;
  const vsBoss = L.tap(t, noCrit, []).dmg;
  const u = onStage(36);
  u.equipment = s.equipment;
  const vsNormal = L.tap(u, noCrit, []).dmg;
  assert.ok(Math.abs(vsBoss / vsNormal - (1 + EQUIP_STATS.boss.base * EQUIP.rarityMult[3])) < 1e-6);
});

test('equipping swaps with the slot, upgrades cost kristal and salvage pays it', () => {
  const s = fresh();
  const a = G.dropItem(s, seq([0, 0.5]), []);
  const b = G.dropItem(s, seq([0, 0.5]), []);
  assert.equal(a.slot, 'weapon');
  assert.ok(G.equip(s, a.uid));
  assert.equal(s.equipment.slots.weapon.uid, a.uid);
  assert.ok(G.equip(s, b.uid));
  assert.equal(s.equipment.slots.weapon.uid, b.uid);
  assert.ok(s.equipment.bag.some((it) => it.uid === a.uid), 'the old one went back to the bag');
  const cost = G.upgradeCost(b);
  assert.equal(G.upgradeItem(s, b.uid), false);
  s.kristal = cost;
  assert.ok(G.upgradeItem(s, b.uid));
  assert.equal(b.level, 2);
  assert.equal(s.kristal, 0);
  assert.ok(G.upgradeCost(b) > cost);
  b.level = EQUIP.maxLevel;
  assert.equal(G.upgradeCost(b), Infinity);
  assert.equal(G.salvage(s, b.uid), 0, 'equipped items are not salvaged');
  assert.equal(G.salvage(s, a.uid), G.salvageValue(a));
  assert.equal(s.kristal, G.salvageValue(a));
  assert.equal(s.equipment.bag.length, 0);
});

test('a full bag salvages new drops; chests cost elmas', () => {
  const s = fresh();
  for (let i = 0; i < EQUIP.bagSize; i++) G.dropItem(s, Math.random, []);
  assert.equal(s.equipment.bag.length, EQUIP.bagSize);
  const events = [];
  G.dropItem(s, Math.random, events);
  assert.equal(s.equipment.bag.length, EQUIP.bagSize);
  assert.ok(events[0].salvaged > 0);
  assert.equal(s.kristal, events[0].salvaged);
  const t = fresh();
  assert.equal(G.openChest(t, Math.random), null);
  t.elmas = EQUIP.chestCost;
  assert.ok(G.openChest(t, Math.random));
  assert.equal(t.elmas, 0);
});

test('a boss beaten for the first time drops an item; repeat wins only sometimes', () => {
  const s = onStage(5);
  s.stats.bestStage = 5;
  s.upgrades.sword = 500;
  const events = [];
  L.tap(s, noCrit, events);
  assert.ok(events.some((e) => e.type === 'item'));
  assert.equal(s.equipment.bag.length, 1);
  // Beaten before: noCrit (0.99) never rolls the repeat drop.
  const t = onStage(5);
  t.stats.bestStage = 10;
  t.upgrades.sword = 500;
  L.tap(t, noCrit, []);
  assert.equal(t.equipment.bag.length, 0);
});

test('equipment survives saves and rebirth; bad items are dropped', () => {
  const s = fresh();
  const it = G.dropItem(s, Math.random, []);
  G.equip(s, it.uid);
  G.dropItem(s, Math.random, []);
  const round = L.loadState(JSON.parse(JSON.stringify(L.serializeState(s))), noCrit);
  assert.deepEqual(round.equipment, s.equipment);
  round.maxStage = 40;
  L.prestige(round, noCrit);
  assert.deepEqual(round.equipment.slots.weapon ?? round.equipment.slots.helm ?? round.equipment.slots.charm, it);
  const bad = L.loadState({ equipment: {
    slots: { weapon: { uid: 1, slot: 'helm', rarity: 1, level: 1, stats: [{ k: 'hp', roll: 1 }] }, helm: { uid: 2, slot: 'helm', rarity: 9, level: 99, stats: [{ k: 'hp', roll: 7 }, { k: 'tap', roll: 1 }] } },
    bag: [{ uid: 2, slot: 'charm', stats: [{ k: 'gold', roll: 1 }] }, { uid: 3, slot: 'charm', stats: [{ k: 'pet', roll: 1 }] }, 'junk'],
    next: -5,
  } }, noCrit);
  assert.equal(bad.equipment.slots.weapon, null, 'a helm in the weapon slot is refused');
  assert.deepEqual(bad.equipment.slots.helm, { uid: 2, slot: 'helm', rarity: 3, level: EQUIP.maxLevel, stats: [{ k: 'hp', roll: 1.2 }] });
  assert.equal(bad.equipment.bag.length, 0, 'duplicate uid and a charm without its main stat are refused');
  assert.equal(bad.equipment.next, 3);
});

// ---- Soul tree ----

test('soul tree nodes cost rising points, cap at their max and change the numbers', () => {
  const s = onStage(30);
  s.soulPoints = 100;
  const tap = L.tapDamage(s);
  assert.ok(T.buyNode(s, 'tapPower'));
  assert.equal(s.soulPoints, 99);
  assert.ok(T.buyNode(s, 'tapPower'));
  assert.equal(s.soulPoints, 97);
  assert.ok(Math.abs(L.tapDamage(s) - tap * (1 + 2 * SOUL_TREE[0].step)) < 1e-6);
  const max = SOUL_TREE.find((n) => n.id === 'bossTime').max;
  for (let i = 0; i < max; i++) assert.ok(T.buyNode(s, 'bossTime'));
  assert.equal(T.buyNode(s, 'bossTime'), false);
  assert.equal(L.bossTime(s), BOSS_TIME + max * 2);
  T.buyNode(s, 'comboTime');
  assert.ok(Math.abs(L.comboWindow(s) - (COMBO.window + 0.1)) < 1e-9);
  T.buyNode(s, 'cooldown');
  const rage = { duration: 30, cooldown: 300 };
  assert.ok(L.skillCooldown(s, rage) < 300);
  s.soulPoints = 0;
  assert.equal(T.buyNode(s, 'goldPower'), false);
  assert.equal(T.buyNode(s, 'nope'), false);
});

test('rebirth grants soul points and Kestirme Yol starts the run further in', () => {
  const s = fresh();
  s.maxStage = 40;
  const gain = L.prestigeSouls(s);
  L.prestige(s, noCrit);
  assert.equal(s.soulPoints, gain);
  s.soulTree.startStage = 2;
  s.maxStage = 50;
  L.prestige(s, noCrit);
  assert.equal(s.stage, 11);
  assert.equal(s.maxStage, 11);
  assert.equal(s.soulTree.startStage, 2);
});

test('saves from before the tree turn existing souls into points; bad tree data is repaired', () => {
  const old = L.loadState({ game: 'slasher-hero', v: 2, souls: 12 }, noCrit);
  assert.equal(old.soulPoints, 12);
  const now = L.loadState({ game: 'slasher-hero', v: 3, souls: 12, soulPoints: 3, soulTree: { tapPower: 99, bogus: 2, petPower: -1 } }, noCrit);
  assert.equal(now.soulPoints, 3);
  assert.deepEqual(now.soulTree, { tapPower: SOUL_TREE[0].max });
});

// ---- Pet abilities ----

function withPet(id, form = 1, stage = 31) {
  const s = onStage(stage);
  s.pets[id] = { form, stars: 0 };
  s.activePet = id;
  s.training.train = 20;
  return s;
}

test('Kedi adds crit chance and Drone adds gold, growing with the form', () => {
  const base = withPet('dog');
  const cat = withPet('cat', 3);
  assert.ok(Math.abs(L.critChance(cat) - (L.critChance(base) + 0.05 * ABILITY_FORM_MULT[2])) < 1e-9);
  const drone = withPet('drone', 2);
  assert.ok(Math.abs(L.goldMultiplier(drone) - L.goldMultiplier(base) * (1 + 0.15 * ABILITY_FORM_MULT[1])) < 1e-9);
});

test('Köpek barks on a timer and stuns the enemy', () => {
  const s = withPet('dog');
  s.petFx.timer = 0.05;
  const events = L.tick(s, 0.1, noCrit);
  assert.ok(events.some((e) => e.type === 'petSkill' && e.id === 'bark'));
  assert.ok(s.enemy.stun > 0);
});

test('Robot fires a laser for several times its damage per second', () => {
  const s = withPet('robot', 1, 61);
  s.petFx.timer = 0.01;
  const hp = s.enemy.hp;
  L.tick(s, 0.02, noCrit);
  const dealt = hp - s.enemy.hp;
  assert.ok(dealt > L.petDps(s) * PETS.find((p) => p.id === 'robot').ability.power * 0.99);
});

test('Ejderha sets the enemy on fire for a few seconds', () => {
  const s = withPet('dragon', 1, 61);
  s.petFx.timer = 0.01;
  L.tick(s, 0.02, noCrit);
  assert.ok(s.petFx.burn > 0);
  const hp = s.enemy.hp;
  L.tick(s, 1, noCrit);
  assert.ok(hp - s.enemy.hp > L.totalDps(s) * 1.5, 'burn adds to the normal damage');
});

test('Anka gets a knocked-out hero back up once per fight', () => {
  const s = withPet('phoenix', 1, 45);
  s.training.train = 0;
  s.hero.hp = 1;
  L.tick(s, ATTACK.first + 0.01, noCrit);
  const events = L.tick(s, ATTACK.windup, noCrit);
  assert.ok(events.some((e) => e.type === 'revive'));
  assert.ok(!events.some((e) => e.type === 'heroDown'));
  assert.ok(Math.abs(s.hero.hp - L.heroMaxHp(s) * 0.5) < 1e-6);
  s.hero.hp = 1;
  L.tick(s, ATTACK.every + 0.01, noCrit);
  const again = L.tick(s, ATTACK.windup, noCrit);
  assert.ok(again.some((e) => e.type === 'heroDown'), 'only once');
});

// ---- Dungeon ----

test('synergies follow the team and boost the right fighters', () => {
  const ids = (list) => list.map((x) => x.id).sort();
  assert.deepEqual(ids(D.activeSynergies(['archer', 'guard', 'healer'])), ['balance', 'fortress']);
  assert.deepEqual(ids(D.activeSynergies(['mage', 'witch', 'archer'])), ['arcane']);
  assert.deepEqual(ids(D.activeSynergies(['archer', 'rogue'])), ['hunters']);
  const syn = D.activeSynergies(['guard', 'healer', 'archer']);
  const tank = D.synergyBonus(syn, 'tank');
  assert.ok(Math.abs(tank.hp - 1.3 * 1.1) < 1e-9);
  assert.ok(Math.abs(D.synergyBonus(syn, 'dps').atk - 1.1) < 1e-9);
  const s = fresh();
  D.restartDungeon(s, noCrit);
  const guard = s.dungeonRun.fighters.find((f) => f.id === 'guard');
  assert.equal(guard.maxHp, Math.round(D.companionStats('guard', 1).hp * 1.3 * 1.1));
  assert.equal(SYNERGIES.length, 4);
});

test('the first clear of every 10th floor opens a chest', () => {
  const s = fresh();
  for (const id of s.dungeon.team) s.companions[id] = 60;
  s.dungeon.floor = DUNGEON.chestEvery;
  s.dungeon.best = DUNGEON.chestEvery - 1;
  D.restartDungeon(s, noCrit);
  const events = [];
  for (let t = 0; t < 120 && !events.some((e) => e.type === 'dg-clear'); t += 0.1) D.tickDungeon(s, 0.1, () => 0.5, events);
  const chest = events.find((e) => e.type === 'dg-chest');
  assert.ok(chest);
  assert.equal(chest.kristal, DUNGEON.chestKristal * DUNGEON.chestEvery);
  assert.equal(s.equipment.bag.length, 1);
});

test('the dungeon keeps fighting while the game is closed', () => {
  const s = fresh();
  const res = D.offlineDungeon(s, 2 * 3600, () => 0.5);
  assert.ok(res.floors > 0);
  assert.ok(res.kristal > 0);
  assert.equal(s.dungeon.best, res.floors);
  const empty = fresh();
  empty.dungeon.team = [];
  assert.deepEqual(D.offlineDungeon(empty, 3600), { floors: 0, kristal: 0, elmas: 0, items: 0 });
  // Capped like offline gold.
  const a = fresh();
  const b = fresh();
  D.offlineDungeon(a, OFFLINE_CAP, () => 0.5);
  D.offlineDungeon(b, OFFLINE_CAP * 3, () => 0.5);
  assert.equal(a.kristal, b.kristal);
});

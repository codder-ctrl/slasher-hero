import { EQUIP, EQUIP_SLOTS, EQUIP_STATS, RARITIES, STAT_ORDER } from './config.js';

// Equipment rules: pure, no DOM. Items live in state.equipment = { slots: { weapon, helm,
// charm }, bag: [item], next } and look like { uid, slot, rarity, level, stats: [{ k, roll }],
// locked? }. `rarity` is an index into RARITIES. Locked items are never salvaged.
// Events pushed: 'item' { item, source, salvaged, auto }.

export const findSlot = (id) => EQUIP_SLOTS.find((s) => s.id === id);

export const newEquipment = () => ({ slots: { weapon: null, helm: null, charm: null }, bag: [], next: 1 });

// Rarity by the egg weights.
export function rollRarityIndex(rng = Math.random) {
  const total = RARITIES.reduce((s, r) => s + r.weight, 0);
  let x = rng() * total;
  for (let i = 0; i < RARITIES.length; i++) if ((x -= RARITIES[i].weight) < 0) return i;
  return RARITIES.length - 1;
}

// A new item. The slot's first stat always comes first; extra stats are picked at random.
export function makeItem(slotId, rarity, rng = Math.random, uid = 0) {
  const slot = findSlot(slotId);
  const pool = slot.stats.slice(1);
  const stats = [{ k: slot.stats[0], roll: 0.8 + rng() * 0.4 }];
  for (let i = 1; i < EQUIP.statCount[rarity] && pool.length; i++) {
    const k = pool.splice(Math.floor(rng() * pool.length), 1)[0];
    stats.push({ k, roll: 0.8 + rng() * 0.4 });
  }
  return { uid, slot: slotId, rarity, level: 1, stats };
}

export const statValue = (item, stat) =>
  EQUIP_STATS[stat.k].base * EQUIP.rarityMult[item.rarity] * stat.roll * (1 + EQUIP.levelStep * (item.level - 1));

// The item's stats in display order (STAT_ORDER).
export const itemStats = (item) => item.stats
  .map((st) => ({ k: st.k, value: statValue(item, st) }))
  .sort((a, b) => STAT_ORDER.indexOf(a.k) - STAT_ORDER.indexOf(b.k));

export const itemName = (item) => findSlot(item.slot).names[item.rarity];

// A rough single number for comparing items (each stat relative to its base).
export const itemScore = (item) => item.stats.reduce((sum, st) => sum + statValue(item, st) / EQUIP_STATS[st.k].base, 0);

// Sum of every equipped stat: { tap, critDmg, boss, hp, armor, stun, gold, pet, combo }.
export function gearTotals(state) {
  const out = Object.fromEntries(Object.keys(EQUIP_STATS).map((k) => [k, 0]));
  const eq = state.equipment;
  if (!eq) return out;
  for (const id in eq.slots) {
    const item = eq.slots[id];
    if (item) for (const st of item.stats) out[st.k] += statValue(item, st);
  }
  return out;
}

export const upgradeCost = (item) => (item.level >= EQUIP.maxLevel ? Infinity
  : Math.ceil(EQUIP.upgradeBase * EQUIP.upgradeGrowth ** (item.level - 1) * EQUIP.upgradeRarity[item.rarity]));

export const salvageValue = (item) => Math.ceil(EQUIP.salvage * EQUIP.rarityMult[item.rarity] * item.level);

// Finds an item by uid in the bag or the slots: { item, where: 'bag' | slot id }.
export function findItem(state, uid) {
  const eq = state.equipment;
  const inBag = eq.bag.find((it) => it.uid === uid);
  if (inBag) return { item: inBag, where: 'bag' };
  for (const id in eq.slots) if (eq.slots[id]?.uid === uid) return { item: eq.slots[id], where: id };
  return null;
}

// Whether an item is weaker than what's worn in its slot (an empty slot makes nothing weaker).
export function isWorse(state, item) {
  const worn = state.equipment.slots[item.slot];
  return !!worn && worn.uid !== item.uid && itemScore(item) < itemScore(worn);
}

// A new random item into the bag. It is salvaged for kristal at once when the bag is full, or
// when it is weaker than the worn one and Otomatik parçala (settings.autoSalvage) is on.
// `minRarity` raises the rolled rarity (mega boss rewards); those are never auto-salvaged.
export function dropItem(state, rng = Math.random, events = [], source = 'boss', minRarity = 0) {
  const eq = state.equipment;
  const slot = EQUIP_SLOTS[Math.floor(rng() * EQUIP_SLOTS.length)].id;
  const item = makeItem(slot, Math.max(minRarity, rollRarityIndex(rng)), rng, eq.next++);
  let salvaged = 0;
  const auto = source !== 'mega' && !!state.settings?.autoSalvage && isWorse(state, item);
  if (auto || eq.bag.length >= EQUIP.bagSize) {
    salvaged = salvageValue(item);
    state.kristal += salvaged;
  } else {
    eq.bag.push(item);
  }
  events.push({ type: 'item', item, source, salvaged, auto });
  return item;
}

export function setLock(state, uid, locked) {
  const found = findItem(state, uid);
  if (!found) return false;
  if (locked) found.item.locked = true;
  else delete found.item.locked;
  return true;
}

// Unlocked bag items weaker than what's worn: what "Zayıfları parçala" would break down.
export const worseItems = (state) => state.equipment.bag.filter((it) => !it.locked && isWorse(state, it));

export function salvageWorse(state) {
  let kristal = 0;
  const items = worseItems(state);
  for (const it of items) kristal += salvage(state, it.uid);
  return { count: items.length, kristal };
}

export function openChest(state, rng = Math.random, events = []) {
  if (state.elmas < EQUIP.chestCost) return null;
  state.elmas -= EQUIP.chestCost;
  return dropItem(state, rng, events, 'chest');
}

// Puts a bag item on; whatever was in that slot goes back into the bag.
export function equip(state, uid) {
  const eq = state.equipment;
  const i = eq.bag.findIndex((it) => it.uid === uid);
  if (i < 0) return false;
  const item = eq.bag[i];
  const old = eq.slots[item.slot];
  eq.bag.splice(i, 1);
  if (old) eq.bag.push(old);
  eq.slots[item.slot] = item;
  return true;
}

export function unequip(state, slotId) {
  const eq = state.equipment;
  const item = eq.slots[slotId];
  if (!item || eq.bag.length >= EQUIP.bagSize) return false;
  eq.slots[slotId] = null;
  eq.bag.push(item);
  return true;
}

export function upgradeItem(state, uid) {
  const found = findItem(state, uid);
  if (!found) return false;
  const cost = upgradeCost(found.item);
  if (!(cost <= state.kristal)) return false;
  state.kristal -= cost;
  found.item.level++;
  return true;
}

// Breaks a bag item down into kristal (equipped items must be taken off first).
export function salvage(state, uid) {
  const eq = state.equipment;
  const i = eq.bag.findIndex((it) => it.uid === uid);
  if (i < 0 || eq.bag[i].locked) return 0;
  const value = salvageValue(eq.bag[i]);
  eq.bag.splice(i, 1);
  state.kristal += value;
  return value;
}

// Rebuilds equipment from untrusted saved data.
export function loadEquipment(raw) {
  const eq = newEquipment();
  if (!raw || typeof raw !== 'object') return eq;
  const seen = new Set();
  const clean = (it, slotId = null) => {
    if (!it || typeof it !== 'object') return null;
    const slot = findSlot(it.slot);
    if (!slot || (slotId && it.slot !== slotId)) return null;
    const uid = Number.isInteger(it.uid) && it.uid > 0 ? it.uid : 0;
    if (!uid || seen.has(uid)) return null;
    const rarity = Number.isInteger(it.rarity) ? Math.min(RARITIES.length - 1, Math.max(0, it.rarity)) : 0;
    const level = Number.isInteger(it.level) ? Math.min(EQUIP.maxLevel, Math.max(1, it.level)) : 1;
    if (!Array.isArray(it.stats)) return null;
    const stats = [];
    for (const st of it.stats.slice(0, 3)) {
      if (!st || !slot.stats.includes(st.k) || stats.some((x) => x.k === st.k)) continue;
      const roll = typeof st.roll === 'number' && Number.isFinite(st.roll) ? Math.min(1.2, Math.max(0.8, st.roll)) : 1;
      stats.push({ k: st.k, roll });
    }
    if (!stats.length || stats[0].k !== slot.stats[0]) return null;
    seen.add(uid);
    const out = { uid, slot: slot.id, rarity, level, stats };
    if (it.locked === true) out.locked = true;
    return out;
  };
  for (const s of EQUIP_SLOTS) eq.slots[s.id] = clean(raw.slots?.[s.id], s.id);
  if (Array.isArray(raw.bag)) for (const it of raw.bag) { const c = clean(it); if (c && eq.bag.length < EQUIP.bagSize) eq.bag.push(c); }
  const maxUid = Math.max(0, ...seen);
  eq.next = Math.max(maxUid + 1, Number.isInteger(raw.next) ? raw.next : 1);
  return eq;
}

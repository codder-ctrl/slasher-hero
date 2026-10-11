import { EQUIP, EQUIP_SLOTS, EQUIP_STATS, RARITIES, STAT_ORDER } from './config.js';
import * as G from './gear.js';

// Equipment UI: the bag button under the menu and the Ekipman screen, a full-screen overlay of
// its own (the hero with the three slots, equipped totals, auto-salvage, the bag, the chest
// and an item card popup). Never changes state: actions go through the handlers.

const $ = (id) => document.getElementById(id);

export function formatStat(k, v) {
  switch (EQUIP_STATS[k].kind) {
    case 'pct': return `+%${Math.round(v * 100)}`;
    case 'mult': return `+×${v.toFixed(2)}`;
    case 'flat': return `+${Math.round(v)}`;
    default: return `+${v.toFixed(2)} sn`;
  }
}

const itemLook = (item) => ({ slot: item.slot, rarity: item.rarity });

// A compact stat line: the stat's symbol and its value; `diff` > 0 / < 0 adds ▲ / ▼.
function statChip({ make, icon }, k, text, diff = 0) {
  const chip = make('span', 'stat-chip');
  chip.title = EQUIP_STATS[k].name;
  const img = make('img');
  img.alt = EQUIP_STATS[k].name;
  img.src = icon(EQUIP_STATS[k].icon, null, 18);
  chip.append(img, make('b', null, text));
  if (diff) chip.append(make('i', diff > 0 ? 'up' : 'down', diff > 0 ? '▲' : '▼'));
  return chip;
}

// A square item picture with a rarity frame, level badge, lock and better/worse marks.
function itemTile({ make, icon }, onClick) {
  const tile = make('button', 'item-tile');
  tile.type = 'button';
  const img = make('img');
  img.alt = '';
  const lvl = make('span', 'item-lvl');
  const lock = make('img', 'item-lock');
  lock.alt = 'Kilitli';
  lock.src = icon('lock', null, 16);
  const mark = make('span', 'item-mark');
  tile.append(img, lvl, lock, mark);
  tile.addEventListener('click', onClick);
  let key = '';
  return {
    tile,
    show(item, emptySlot, compare = 0) {
      const k = item ? `${item.uid}:${item.rarity}:${item.level}:${!!item.locked}:${compare}` : `empty:${emptySlot}`;
      if (k === key) return;
      key = k;
      lock.hidden = !item?.locked;
      mark.textContent = compare > 0 ? '▲' : compare < 0 ? '▼' : '';
      mark.className = `item-mark ${compare > 0 ? 'up' : 'down'}`;
      if (item) {
        img.src = icon('item', itemLook(item));
        tile.style.setProperty('--rarity', RARITIES[item.rarity].color);
        lvl.textContent = `Sv.${item.level}`;
        lvl.hidden = false;
        tile.classList.remove('empty');
      } else {
        img.src = icon('item', { slot: emptySlot, rarity: -1 });
        tile.style.setProperty('--rarity', '#b8a890');
        lvl.hidden = true;
        tile.classList.add('empty');
      }
    },
  };
}

// +1 better than worn, -1 weaker, 0 when nothing worn to compare.
function compareToWorn(state, item) {
  const worn = state.equipment.slots[item.slot];
  if (!worn || worn.uid === item.uid) return worn ? 0 : 1;
  const a = G.itemScore(item);
  const b = G.itemScore(worn);
  return a > b ? 1 : a < b ? -1 : 0;
}

// ---- Bag button (under the menu button, top right of the battle) ----

export function createBagButton({ h }) {
  const btn = $('bag-btn');
  btn.addEventListener('click', () => h.openGear());
  return {
    // Badge when the bag holds something better than what's worn.
    update(state) {
      const better = state.equipment.bag.some((it) => compareToWorn(state, it) > 0);
      btn.classList.toggle('badge', better);
    },
  };
}

// ---- Ekipman screen ----

export function createGearScreen(tools) {
  const { h, make, set, icon, fmt } = tools;
  const screen = $('gear-screen');
  const panel = make('div', 'gs-panel');

  const head = make('div', 'gs-head');
  const headIcon = make('img');
  headIcon.alt = '';
  headIcon.src = icon('bagMenu');
  const close = make('button', 'close-btn', '✕');
  close.type = 'button';
  close.setAttribute('aria-label', 'Kapat');
  head.append(headIcon, make('h2', null, 'Ekipman'), close);

  // The hero between the slots: weapon on the left, helm and charm on the right.
  const stage = make('div', 'gs-hero');
  const portrait = make('img', 'gs-portrait');
  portrait.alt = 'Kahraman';
  const slotTiles = {};
  const slotWrap = (id) => {
    const slot = EQUIP_SLOTS.find((s) => s.id === id);
    const t = itemTile(tools, () => select({ slot: id }));
    const wrap = make('div', `gear-slot gs-slot-${id}`);
    wrap.append(t.tile, make('span', 'gear-label', slot.name));
    slotTiles[id] = t;
    return wrap;
  };
  const right = make('div', 'gs-col');
  right.append(slotWrap('helm'), slotWrap('charm'));
  stage.append(slotWrap('weapon'), portrait, right);

  const totals = make('div', 'gs-totals');

  const tools2 = make('div', 'gs-tools');
  const autoLabel = make('label', 'switch');
  const autoBox = make('input');
  autoBox.type = 'checkbox';
  autoBox.addEventListener('change', () => h.toggleAutoSalvage());
  autoLabel.append(autoBox, make('span', 'switch-ui'), make('span', null, 'Otomatik parçala'));
  autoLabel.title = 'Takılı olandan zayıf yeni eşyalar düşer düşmez kristale dönüşür. Kilitli eşyalara dokunulmaz.';
  const worseBtn = make('button', 'btn small danger');
  worseBtn.type = 'button';
  worseBtn.addEventListener('click', () => h.salvageWorse());
  tools2.append(autoLabel, worseBtn);

  const bagHead = make('div', 'gear-head');
  const bagTitle = make('b');
  const wallet = make('span', 'wallet');
  const kImg = make('img');
  kImg.alt = '';
  kImg.src = icon('crystal');
  const kText = make('b');
  const eImg = make('img');
  eImg.alt = '';
  eImg.src = icon('gem');
  const eText = make('b');
  wallet.append(kImg, kText, eImg, eText);
  bagHead.append(bagTitle, wallet);
  const grid = make('div', 'bag-grid');
  const empty = make('p', 'note center', 'Çantan boş. Bosslar ve zindan sandıkları eşya düşürür.');
  const bagBox = make('div', 'gs-bag');
  bagBox.append(grid, empty);

  const chestBtn = make('button', 'btn gem');
  chestBtn.type = 'button';
  const chestImg = make('img');
  chestImg.alt = '';
  chestImg.src = icon('chest');
  chestBtn.append(chestImg, make('span', null, `Sandık Aç · ${EQUIP.chestCost} elmas`));
  chestBtn.addEventListener('click', () => h.openChest());

  // Item card popup.
  const pop = make('div', 'gs-pop');
  pop.hidden = true;
  const card = make('div', 'card gs-card');
  const cHead = make('div', 'detail-head');
  const cImg = make('img', 'detail-img');
  cImg.alt = '';
  const cTitle = make('div', 'detail-title');
  const cName = make('b');
  const cSub = make('span', 'note');
  cTitle.append(cName, cSub);
  const cClose = make('button', 'close-btn small', '✕');
  cClose.type = 'button';
  cHead.append(cImg, cTitle, cClose);
  const cStats = make('div', 'gs-stats');
  const cNote = make('p', 'note center');
  const cButtons = make('div', 'gs-buttons');
  const equipBtn = make('button', 'btn accent');
  const upBtn = make('button', 'btn');
  const lockBtn = make('button', 'btn');
  const salvBtn = make('button', 'btn danger');
  for (const b of [equipBtn, upBtn, lockBtn, salvBtn]) { b.type = 'button'; cButtons.append(b); }
  card.append(cHead, cStats, cNote, cButtons);
  pop.append(card);

  panel.append(head, stage, totals, tools2, bagHead, bagBox, chestBtn);
  screen.append(panel, pop);

  let selected = null;   // { uid } or { slot }
  let current = null;    // the item on the card
  let currentWhere = null;
  let lastState = null;
  const bagTiles = new Map();

  function select(sel) {
    selected = sel;
    pop.hidden = false;
    if (lastState) update(lastState);
  }
  function closePop() { pop.hidden = true; selected = null; }
  cClose.addEventListener('click', closePop);
  pop.addEventListener('click', (e) => { if (e.target === pop) closePop(); });
  close.addEventListener('click', () => api.close());
  screen.addEventListener('click', (e) => { if (e.target === screen) api.close(); });

  equipBtn.addEventListener('click', () => {
    if (!current) return;
    if (currentWhere === 'bag') h.equipItem(current.uid);
    else h.unequipItem(current.slot);
    closePop();
  });
  upBtn.addEventListener('click', () => { if (current) h.upgradeItem(current.uid); });
  lockBtn.addEventListener('click', () => { if (current) h.lockItem(current.uid, !current.locked); });
  salvBtn.addEventListener('click', () => { if (current) { h.salvageItem(current.uid); closePop(); } });

  function showCard(state) {
    current = null;
    currentWhere = null;
    if (pop.hidden || !selected) return;
    const eq = state.equipment;
    if (selected.uid) {
      const found = G.findItem(state, selected.uid);
      if (found) { current = found.item; currentWhere = found.where; }
    } else if (selected.slot) {
      current = eq.slots[selected.slot];
      currentWhere = selected.slot;
    }
    const has = !!current;
    cHead.hidden = cStats.hidden = cButtons.hidden = !has;
    cNote.hidden = has;
    if (!has) {
      const slot = EQUIP_SLOTS.find((s) => s.id === selected.slot);
      set(cNote, slot ? `${slot.name} yuvası boş. Çantandan bir ${slot.name.toLocaleLowerCase('tr-TR')} seç.` : 'Bu eşya artık yok.');
      return;
    }
    const inBag = currentWhere === 'bag';
    cImg.src = icon('item', itemLook(current));
    set(cName, G.itemName(current));
    cName.style.color = RARITIES[current.rarity].color;
    set(cSub, `${RARITIES[current.rarity].name} · Sv. ${current.level}/${EQUIP.maxLevel}${inBag ? '' : ' · Takılı'}${current.locked ? ' · 🔒' : ''}`);
    // Compact stat lines; bag items are compared with what's worn.
    const worn = inBag ? eq.slots[current.slot] : null;
    const wornStats = worn ? Object.fromEntries(G.itemStats(worn).map((x) => [x.k, x.value])) : {};
    const lines = G.itemStats(current).map(({ k, value }) => statChip(tools, k, formatStat(k, value), worn ? Math.sign(value - (wornStats[k] || 0)) : 0));
    if (worn) {
      for (const { k, value } of G.itemStats(worn)) {
        if (!current.stats.some((st) => st.k === k)) lines.push(statChip(tools, k, `−${formatStat(k, value).slice(1)}`, -1));
      }
      lines.sort((a, b) => STAT_ORDER.indexOf(keyOf(a)) - STAT_ORDER.indexOf(keyOf(b)));
    }
    cStats.replaceChildren(...lines);
    set(equipBtn, inBag ? 'Tak' : 'Çıkar');
    equipBtn.disabled = !inBag && eq.bag.length >= EQUIP.bagSize;
    const cost = G.upgradeCost(current);
    upBtn.disabled = !(cost <= state.kristal);
    set(upBtn, cost === Infinity ? 'MAKS seviye' : `Yükselt · ${fmt(cost)}`);
    set(lockBtn, current.locked ? '🔓 Kilidi aç' : '🔒 Kilitle');
    salvBtn.hidden = !inBag;
    salvBtn.disabled = !!current.locked;
    set(salvBtn, current.locked ? 'Kilitli' : `Parçala +${G.salvageValue(current)}`);
  }
  const keyOf = (chip) => Object.keys(EQUIP_STATS).find((k) => EQUIP_STATS[k].name === chip.title);

  function update(state) {
    lastState = state;
    const eq = state.equipment;
    const lookKey = `${eq.slots.weapon?.rarity ?? -1}:${eq.slots.helm?.rarity ?? -1}`;
    if (portrait.dataset.key !== lookKey) {
      portrait.dataset.key = lookKey;
      portrait.src = icon('actor:hero', { weapon: eq.slots.weapon?.rarity ?? -1, helm: eq.slots.helm?.rarity ?? -1 }, 150);
    }
    for (const s of EQUIP_SLOTS) slotTiles[s.id].show(eq.slots[s.id], s.id);

    // Totals of everything worn, in display order.
    const sum = G.gearTotals(state);
    const totalKey = STAT_ORDER.map((k) => sum[k].toFixed(3)).join();
    if (totals.dataset.key !== totalKey) {
      totals.dataset.key = totalKey;
      const chips = STAT_ORDER.filter((k) => sum[k] > 0).map((k) => statChip(tools, k, formatStat(k, sum[k])));
      totals.replaceChildren(...(chips.length ? chips : [make('span', 'note', 'Henüz eşya takılı değil.')]));
    }

    autoBox.checked = !!state.settings.autoSalvage;
    const worse = G.worseItems(state);
    worseBtn.disabled = worse.length === 0;
    set(worseBtn, `Zayıfları parçala (${worse.length})`);

    const ids = eq.bag.map((it) => it.uid);
    for (const [uid, t] of bagTiles) if (!ids.includes(uid)) { t.tile.remove(); bagTiles.delete(uid); }
    for (const item of eq.bag) {
      let t = bagTiles.get(item.uid);
      if (!t) {
        t = itemTile(tools, () => select({ uid: item.uid }));
        bagTiles.set(item.uid, t);
        grid.append(t.tile);
      }
      t.show(item, null, compareToWorn(state, item));
      t.tile.classList.toggle('selected', selected?.uid === item.uid && !pop.hidden);
    }
    empty.hidden = eq.bag.length > 0;
    set(bagTitle, `Çanta ${eq.bag.length}/${EQUIP.bagSize}`);
    set(kText, fmt(state.kristal));
    set(eText, fmt(state.elmas));
    chestBtn.disabled = state.elmas < EQUIP.chestCost;
    showCard(state);
  }

  const api = {
    open(slotId) {
      screen.hidden = false;
      if (slotId) select({ slot: slotId });
      else closePop();
      if (lastState) update(lastState);
    },
    close() { screen.hidden = true; closePop(); },
    get isOpen() { return !screen.hidden; },
    update(state) { lastState = state; if (!screen.hidden) update(state); },
  };
  return api;
}

import { EQUIP, EQUIP_SLOTS, EQUIP_STATS, RARITIES } from './config.js';
import * as G from './gear.js';

// Equipment UI: the card on the Kahraman tab (three slots and the bag button) and the
// Ekipman window (slots, the selected item, the bag and the chest). Never changes state:
// actions go through the handlers (equipItem, upgradeItem, salvageItem, openChest).

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

// A square item picture with a rarity frame and a level badge.
function itemTile({ make, icon }, onClick) {
  const tile = make('button', 'item-tile');
  tile.type = 'button';
  const img = make('img');
  img.alt = '';
  const lvl = make('span', 'item-lvl');
  tile.append(img, lvl);
  tile.addEventListener('click', onClick);
  let key = '';
  return {
    tile,
    show(item, emptySlot) {
      const k = item ? `${item.uid}:${item.rarity}:${item.level}` : `empty:${emptySlot}`;
      if (k === key) return;
      key = k;
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

// Whether a bag item would be an upgrade over what's worn in its slot.
const isBetter = (state, item) => {
  const worn = state.equipment.slots[item.slot];
  return !worn || G.itemScore(item) > G.itemScore(worn);
};

export function createGearCard(tools) {
  const { h, make, set, icon } = tools;
  const card = $('gear-card');
  const head = make('div', 'gear-head');
  const title = make('b', null, 'Ekipman');
  const bagBtn = make('button', 'btn small');
  bagBtn.type = 'button';
  bagBtn.addEventListener('click', () => h.openWindow('gear'));
  head.append(title, bagBtn);
  const row = make('div', 'gear-slots');
  const slots = EQUIP_SLOTS.map((slot) => {
    const t = itemTile(tools, () => h.openWindow('gear', { select: slot.id }));
    const label = make('span', 'gear-label', slot.name);
    const wrap = make('div', 'gear-slot');
    wrap.append(t.tile, label);
    row.append(wrap);
    return { slot, t };
  });
  card.append(head, row);
  return {
    // Returns whether the bag holds something better than what's worn (tab badge).
    update(state) {
      const eq = state.equipment;
      for (const { slot, t } of slots) t.show(eq.slots[slot.id], slot.id);
      const better = eq.bag.some((it) => isBetter(state, it));
      set(bagBtn, `Çanta ${eq.bag.length}/${EQUIP.bagSize}${better ? ' ★' : ''}`);
      bagBtn.classList.toggle('accent', better);
      return better;
    },
  };
}

// The Ekipman window. opts.select: a slot id to show first.
export function gearView(tools, opts = {}) {
  const { h, make, set, icon, fmt } = tools;
  const root = make('div', 'window-view gear-view');
  let selected = null; // { uid } or { slot }
  if (opts.select) selected = { slot: opts.select };

  const slotRow = make('div', 'gear-slots');
  const slotTiles = EQUIP_SLOTS.map((slot) => {
    const t = itemTile(tools, () => { selected = { slot: slot.id }; refresh(); });
    const wrap = make('div', 'gear-slot');
    wrap.append(t.tile, make('span', 'gear-label', slot.name));
    slotRow.append(wrap);
    return { slot, t, wrap };
  });

  const detail = make('div', 'card item-detail');
  const dHead = make('div', 'detail-head');
  const dImg = make('img', 'detail-img');
  dImg.alt = '';
  const dTitle = make('div', 'detail-title');
  const dName = make('b');
  const dSub = make('span', 'note');
  dTitle.append(dName, dSub);
  dHead.append(dImg, dTitle);
  const dStats = make('div', 'detail-stats');
  const dButtons = make('div', 'btn-row');
  const equipBtn = make('button', 'btn accent', 'Tak');
  const upBtn = make('button', 'btn');
  const salvBtn = make('button', 'btn danger');
  for (const b of [equipBtn, upBtn, salvBtn]) { b.type = 'button'; dButtons.append(b); }
  const dEmpty = make('p', 'note center');
  detail.append(dHead, dStats, dButtons, dEmpty);

  equipBtn.addEventListener('click', () => { if (selected?.uid) h.equipItem(selected.uid); });
  upBtn.addEventListener('click', () => { if (current) h.upgradeItem(current.uid); });
  salvBtn.addEventListener('click', () => { if (selected?.uid) { h.salvageItem(selected.uid); selected = null; } });

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
  const chestBtn = make('button', 'btn gem big');
  chestBtn.type = 'button';
  const chestImg = make('img');
  chestImg.alt = '';
  chestImg.src = icon('chest');
  chestBtn.append(chestImg, make('span', null, `Sandık Aç · ${EQUIP.chestCost} elmas`));
  chestBtn.addEventListener('click', () => h.openChest());
  root.append(slotRow, detail, bagHead, grid, empty, chestBtn);

  const bagTiles = new Map();
  let current = null;
  let lastState = null;

  function refresh() { if (lastState) update(lastState); }

  function showDetail(state) {
    const eq = state.equipment;
    let item = null;
    let inBag = false;
    if (selected?.uid) {
      const found = G.findItem(state, selected.uid);
      if (found) { item = found.item; inBag = found.where === 'bag'; } else selected = null;
    }
    if (!item && selected?.slot) item = eq.slots[selected.slot];
    current = item;
    dHead.hidden = dStats.hidden = dButtons.hidden = !item;
    dEmpty.hidden = !!item;
    if (!item) {
      set(dEmpty, selected?.slot ? `${EQUIP_SLOTS.find((s) => s.id === selected.slot).name} yuvası boş. Çantandan bir eşya seç.` : 'Bir eşya seç.');
      return;
    }
    dImg.src = icon('item', itemLook(item));
    set(dName, G.itemName(item));
    dName.style.color = RARITIES[item.rarity].color;
    set(dSub, `${RARITIES[item.rarity].name} · Seviye ${item.level}/${EQUIP.maxLevel}${inBag ? '' : ' · Takılı'}`);
    // Stats, compared with the worn item for bag items.
    const worn = inBag ? eq.slots[item.slot] : null;
    const wornStats = worn ? Object.fromEntries(G.itemStats(worn).map((x) => [x.k, x.value])) : {};
    const rows = G.itemStats(item).map(({ k, value }) => {
      const row = make('div', 'stat-row');
      const v = make('b', null, formatStat(k, value));
      if (inBag && worn) {
        const diff = value - (wornStats[k] || 0);
        v.classList.add(diff >= 0 ? 'up' : 'down');
      }
      row.append(make('span', null, EQUIP_STATS[k].name), v);
      return row;
    });
    if (inBag && worn) {
      const missing = G.itemStats(worn).filter((x) => !item.stats.some((st) => st.k === x.k));
      for (const { k, value } of missing) {
        const row = make('div', 'stat-row');
        const v = make('b', 'down', `−${formatStat(k, value).slice(1)}`);
        row.append(make('span', null, EQUIP_STATS[k].name), v);
        rows.push(row);
      }
    }
    dStats.replaceChildren(...rows);
    equipBtn.hidden = !inBag;
    salvBtn.hidden = !inBag;
    set(salvBtn, `Parçala +${G.salvageValue(item)}`);
    const cost = G.upgradeCost(item);
    upBtn.disabled = !(cost <= state.kristal);
    set(upBtn, cost === Infinity ? 'En yüksek seviye' : `Yükselt · ${fmt(cost)} kristal`);
  }

  function update(state) {
    lastState = state;
    const eq = state.equipment;
    for (const { slot, t, wrap } of slotTiles) {
      t.show(eq.slots[slot.id], slot.id);
      const on = selected && ((selected.slot === slot.id && !selected.uid) || (selected.uid && eq.slots[slot.id]?.uid === selected.uid));
      wrap.classList.toggle('selected', !!on);
    }
    // Bag tiles: rebuilt only when the bag's contents change.
    const ids = eq.bag.map((it) => it.uid);
    for (const [uid, t] of bagTiles) if (!ids.includes(uid)) { t.tile.remove(); bagTiles.delete(uid); }
    for (const item of eq.bag) {
      let t = bagTiles.get(item.uid);
      if (!t) {
        t = itemTile(tools, () => { selected = { uid: item.uid }; refresh(); });
        bagTiles.set(item.uid, t);
        grid.append(t.tile);
      }
      t.show(item);
      t.tile.classList.toggle('selected', selected?.uid === item.uid);
      t.tile.classList.toggle('better', isBetter(state, item));
    }
    empty.hidden = eq.bag.length > 0;
    set(bagTitle, `Çanta ${eq.bag.length}/${EQUIP.bagSize}`);
    set(kText, fmt(state.kristal));
    set(eText, fmt(state.elmas));
    chestBtn.disabled = state.elmas < EQUIP.chestCost;
    showDetail(state);
  }

  return { root, update };
}

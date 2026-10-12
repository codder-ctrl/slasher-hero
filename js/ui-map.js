import { MEGA_BOSSES, RAID, RARITIES } from './config.js';
import * as L from './logic.js';
import { zoneArtUrl } from './icons.js';

// The Harita window (from the top-right menu): six lands along a winding road, each ruled by a
// mega boss that is fought in its own arena (see logic.js, "Mega bosses"). Shows the keys,
// what each boss pays on the first and on later wins, its trophy, and a fight button.
// Never changes state itself.

const SVG = 'http://www.w3.org/2000/svg';

const TROPHY_TEXT = {
  tap: 'dokunuş hasarı', pet: 'pet hasarı', gold: 'altın', hp: 'can', critDmg: 'kritik hasarı', all: 'tüm hasar',
};

// "+%25 dokunuş hasarı".
export function trophyText(def) {
  return `+%${Math.round(def.trophy.power * 100)} ${TROPHY_TEXT[def.trophy.kind]}`;
}

function road(fromLeft) {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('class', 'map-road-link');
  svg.setAttribute('viewBox', '0 0 100 30');
  svg.setAttribute('preserveAspectRatio', 'none');
  const path = document.createElementNS(SVG, 'path');
  const [a, b] = fromLeft ? [17, 83] : [83, 17];
  path.setAttribute('d', `M ${a} 0 C ${a} 18, ${b} 12, ${b} 30`);
  svg.append(path);
  return svg;
}

export function createMapView({ h, icon, make, set, fmt }) {
  const root = make('div', 'window-view map-view');

  // Keys: how many, when they refill, and buying one more.
  const keys = make('div', 'map-keys');
  const keyIcon = make('img');
  keyIcon.alt = '';
  keyIcon.src = icon('keyIcon', null, 30);
  const keyText = make('div', 'map-keys-text');
  const keyCount = make('b');
  const keyNote = make('span');
  keyText.append(keyCount, keyNote);
  const buy = make('button', 'btn small gem');
  buy.type = 'button';
  const gem = make('img');
  gem.alt = '';
  gem.src = icon('gem', null, 18);
  const buyText = make('span', null, `+1 · ${RAID.keyCost}`);
  buy.append(buyText, gem);
  buy.addEventListener('click', () => h.buyRaidKey());
  keys.append(keyIcon, keyText, buy);

  const lead = make('p', 'note center', 'Her diyarı bir mega boss yönetir. 100 bölümde bir yeni diyar açılır. İlk zafer büyük ödül ve kalıcı bir kupa verir; sonraki zaferler boss\'u güçlendirir ve giderek artan altın verir. Yenilirsen anahtarın geri gelir.');
  const list = make('div', 'map-road');
  root.append(keys, lead, list);

  let built = '';
  const stops = [];

  // Reward symbols with their amounts: [[icon, text, color?], ...].
  function chips(list) {
    return list.map(([name, text, color]) => {
      const chip = make('span', 'reward-chip');
      const img = make('img');
      img.alt = '';
      img.src = icon(name, null, 20);
      const b = make('b', null, text);
      if (color) b.style.color = color;
      chip.append(img, b);
      return chip;
    });
  }

  function stop(def, i) {
    const node = make('div', `map-stop ${i % 2 ? 'right' : 'left'}`);
    const art = make('div', 'map-art');
    if (def.soon) {
      art.append(make('div', 'map-pic'));
    } else {
      const img = make('img', 'map-pic');
      img.alt = def.land;
      img.loading = 'lazy';
      img.src = zoneArtUrl(def.theme, { actor: def.actor, colors: def.colors });
      art.append(img);
    }
    const lock = make('img', 'map-lock');
    lock.alt = 'Kilitli';
    lock.src = icon('lock', null, 30);
    const check = make('span', 'map-check', '✓');
    art.append(lock, check);

    const info = make('div', 'map-info');
    const title = make('div', 'map-title');
    const name = make('b', 'map-name', def.land);
    const lvl = make('span', 'map-lvl');
    title.append(name, lvl);
    const bossRow = make('div', 'map-boss');
    if (!def.soon) {
      const face = make('img');
      face.alt = '';
      face.src = icon(`actor:${def.actor}`, { colors: def.colors, boss: true }, 30);
      bossRow.append(face);
    }
    const bossName = make('span');
    bossRow.append(bossName);
    const unlock = make('span', 'map-range');
    const reward = make('div', 'map-reward');
    const trophy = make('div', 'map-trophy');
    const fight = make('button', 'btn accent map-fight');
    fight.type = 'button';
    fight.addEventListener('click', () => h.startRaid(def.id));
    info.append(title, bossRow, unlock, reward, trophy, fight);
    node.append(art, info);
    stops.push({ def, node, lock, check, lvl, bossName, unlock, reward, trophy, fight, rewardKey: '' });
    return node;
  }

  const items = [];
  MEGA_BOSSES.forEach((def, i) => {
    if (i) items.push(road(i % 2 === 1));
    items.push(stop(def, i));
  });
  list.append(...items);

  function update(state, now = Date.now()) {
    const k = state.raid.keys;
    set(keyCount, `Boss Anahtarı: ${k}`);
    set(keyNote, k >= RAID.keysPerDay ? `Her gün ${RAID.keysPerDay} anahtar` : `Yarın ${RAID.keysPerDay}'e tamamlanır`);
    buy.disabled = state.elmas < RAID.keyCost;
    const fighting = L.inRaid(state);
    // Gold for a win follows the gold multiplier, so rewards are checked on every update.
    for (const s of stops) {
      const { def } = s;
      if (def.soon) continue;
      const wins = L.megaWins(state, def);
      const list = wins === 0
        ? [['gem', String(def.first.elmas)], ['chest', RARITIES[def.first.rarity].name, RARITIES[def.first.rarity].color], ['keyIcon', `+${RAID.firstKeys}`]]
        : [['coinIcon', fmt(L.megaGold(state, def, L.megaLevel(state, def)))]];
      const rk = list.map((x) => x[1]).join('|') + wins;
      if (rk === s.rewardKey) continue;
      s.rewardKey = rk;
      s.reward.replaceChildren(make('span', 'map-reward-label', wins === 0 ? 'İlk zafer:' : 'Zafer:'), ...chips(list));
    }
    const key = `${k}:${fighting}:${state.stats.bestStage}:${JSON.stringify(state.raid.wins)}`;
    if (key === built) return;
    built = key;
    for (const s of stops) {
      const { def } = s;
      const open = L.megaUnlocked(state, def);
      const wins = def.soon ? 0 : L.megaWins(state, def);
      s.node.classList.toggle('locked', !open);
      s.node.classList.toggle('soon', !!def.soon);
      s.node.classList.toggle('cleared', wins > 0);
      s.lock.hidden = open;
      s.check.hidden = wins === 0;
      set(s.bossName, def.soon ? 'Yakında...' : open || wins ? def.name : '???');
      set(s.lvl, open ? `Sv. ${L.megaLevel(state, def)}` : '');
      set(s.unlock, def.soon ? `${def.unlock}. bölümden sonra · çok yakında` : open ? `${wins} zafer` : `${def.unlock}. bölümü geçince açılır (en iyi: ${state.stats.bestStage - 1})`);
      set(s.trophy, `${wins > 0 ? '✓ ' : ''}Kupa: ${def.trophy.name} · ${trophyText(def)}`);
      s.fight.hidden = !open;
      s.fight.disabled = fighting || k <= 0;
      set(s.fight, fighting ? 'Savaş sürüyor' : k > 0 ? 'Savaş · 1 anahtar' : 'Anahtar yok');
    }
  }

  return { root, update };
}

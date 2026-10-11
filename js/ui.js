import {
  UPGRADES, SKILLS, ZONES, KILLS_PER_STAGE, BOSS_TIME, PRESTIGE_MIN_STAGE, SOUL_BONUS, SPECIALS,
  MILESTONE_EVERY, SPIRIT_STEP,
} from './config.js';
import * as L from './logic.js';
import { iconUrl } from './icons.js';
import { VERSION } from './changelog.js';
import { createPetPage } from './ui-pets.js';
import { createDungeonPage } from './ui-dungeon.js';
import { createWindows } from './ui-windows.js';
import { createGearCard, createGearScreen } from './ui-gear.js';
import { createSoulTree } from './ui-souls.js';

// DOM side of the game: HUD over the battle, the tabbed panel below it and modals.
// It never changes game state itself; every action goes through the handlers from main.js.
// update() runs every frame but only writes text that actually changed.

const $ = (id) => document.getElementById(id);
const fmt = L.formatNumber;

function set(node, text) {
  if (node.textContent !== text) node.textContent = text;
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// Click buys once; holding the button keeps buying until released.
function attachRepeat(btn, fn) {
  let delay = null;
  let rep = null;
  let repeated = false;
  const stop = () => { clearTimeout(delay); clearInterval(rep); delay = rep = null; };
  btn.addEventListener('pointerdown', () => {
    repeated = false;
    stop();
    delay = setTimeout(() => {
      rep = setInterval(() => {
        if (btn.disabled) return stop();
        repeated = true;
        fn();
      }, 90);
    }, 450);
  });
  for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) btn.addEventListener(ev, stop);
  btn.addEventListener('click', () => {
    if (repeated) { repeated = false; return; }
    fn();
  });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

const withUpgrade = (state, id, level) => ({ ...state, upgrades: { ...state.upgrades, [id]: level } });
const pct = (x) => `%${Math.round(x * 100)}`;
// Multipliers with at most two decimals (equipment makes them fractional).
const mult = (x) => String(Math.round(x * 100) / 100);

function upgradeEffect(def, state, now, next, maxed) {
  const pair = (label, a, b) => (maxed || a === b ? `${label}: ${a}` : `${label}: ${a} → ${b}`);
  switch (def.id) {
    case 'sword':
      return pair('Dokunuş', fmt(L.swordDamage(state, now)), fmt(L.swordDamage(state, next)));
    case 'crit':
      return pair('Şans', pct(L.critChance(withUpgrade(state, 'crit', now))), pct(L.critChance(withUpgrade(state, 'crit', next))));
    case 'critDmg':
      return pair('Çarpan', '×' + mult(L.critMultiplier(withUpgrade(state, 'critDmg', now))), '×' + mult(L.critMultiplier(withUpgrade(state, 'critDmg', next))));
    case 'greed':
      return pair('Altın', '+' + pct(L.goldMultiplier(withUpgrade(state, 'greed', now)) - 1), '+' + pct(L.goldMultiplier(withUpgrade(state, 'greed', next)) - 1));
    case 'spirit':
      return pair('Aktarım', pct(now * SPIRIT_STEP), pct(next * SPIRIT_STEP));
    case 'vitality':
      return pair('Can', fmt(L.heroMaxHp(state, now)), fmt(L.heroMaxHp(state, next)));
    case 'armor':
      return pair('Savunma', pct(1 - L.damageTakenMultiplier(L.heroArmor(state, now))), pct(1 - L.damageTakenMultiplier(L.heroArmor(state, next))));
    default:
      return '';
  }
}

const nextMilestone = (level) => (Math.floor(level / MILESTONE_EVERY) + 1) * MILESTONE_EVERY;

// Label and value format of each skill's power (see logic.skillPower).
const SKILL_TEXT = {
  rage: ['Dokunuş', (p) => '×' + fmt(p)],
  warcry: ['Pet hasarı', (p) => '×' + fmt(p)],
  storm: ['Otomatik vuruş', (p) => `${fmt(p)}/sn`],
  focus: ['Kritik şansı', (p) => '+' + pct(p)],
  goldRain: ['Anında altın', (p) => `${fmt(p)} düşman`],
};

const minutes = (sec) => (sec >= 60 ? `${sec / 60} dk` : `${sec} sn`);
const clock = (sec) => {
  sec = Math.ceil(sec);
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
};

function skillTiming(def) {
  return def.duration ? `${def.duration} sn sürer · bekleme ${minutes(def.cooldown)}` : `Anında · bekleme ${minutes(def.cooldown)}`;
}

export function createUI(h) {
  const icons = {};
  const icon = (name, look, size) => {
    const key = name + (look ? JSON.stringify(look) : '') + (size || '');
    return (icons[key] ||= iconUrl(name, look, size));
  };
  document.querySelectorAll('img[data-icon]').forEach((img) => { img.src = icon(img.dataset.icon); });

  const el = {
    goldPill: $('gold-pill'), gold: $('gold'), dps: $('dps'), soulsPill: $('souls-pill'), souls: $('souls'),
    zone: $('zone-name'), stage: $('stage-label'), prev: $('stage-prev'), next: $('stage-next'),
    enemyName: $('enemy-name'), progress: $('enemy-progress'), hpFill: $('hp-fill'), hpText: $('hp-text'),
    timerBar: $('timer-bar'), timerFill: $('timer-fill'), timerText: $('timer-text'), shieldFill: $('shield-fill'),
    auto: $('auto-btn'), hint: $('tap-hint'), buyBar: $('buy-bar'), skillBar: $('skill-bar'), skillList: $('skill-list'),
    summary: $('hero-summary'), upgradeList: $('upgrade-list'), version: $('version-btn'),
    rbSouls: $('rb-souls'), rbBonus: $('rb-bonus'), rbStage: $('rb-stage'), rbGain: $('rb-gain'), rbBtn: $('rb-btn'), rbNote: $('rb-note'),
    stats: $('stats'), soundBtn: $('sound-btn'), musicBtn: $('music-btn'), toast: $('toast'),
    modal: $('modal'), modalTitle: $('modal-title'), modalBody: $('modal-body'), modalActions: $('modal-actions'),
  };

  // ---- Tabs ----

  let tab = 'hero';
  let lastPanel = 0;
  const tabButtons = [...document.querySelectorAll('#tabs .tab')];
  const tabButton = (name) => tabButtons.find((b) => b.dataset.tab === name);
  const pages = [...document.querySelectorAll('#pages .page')];
  function setTab(name) {
    tab = name;
    for (const b of tabButtons) {
      b.classList.toggle('active', b.dataset.tab === name);
      b.setAttribute('aria-selected', String(b.dataset.tab === name));
    }
    for (const p of pages) p.hidden = p.dataset.tab !== name;
    el.buyBar.hidden = !['hero', 'pet', 'skills'].includes(name);
    lastPanel = 0;
    $('pages').scrollTop = 0;
  }
  tabButtons.forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab)));

  const amountButtons = [...el.buyBar.querySelectorAll('button[data-amount]')];
  amountButtons.forEach((b) => b.addEventListener('click', () => {
    const a = b.dataset.amount;
    h.setBuyAmount(a === 'max' ? 'max' : Number(a));
  }));

  // ---- Shop cards ----

  function makeCard(iconUrl, onBuy, currency = 'coinIcon') {
    const card = make('div', 'card item');
    const img = make('img', 'item-icon');
    img.alt = '';
    img.src = iconUrl;
    const body = make('div', 'item-body');
    const title = make('div', 'item-title');
    const name = make('span', 'item-name');
    const lvl = make('span', 'item-level');
    title.append(name, lvl);
    const desc = make('div', 'item-desc');
    const note = make('div', 'item-note');
    body.append(title, desc, note);
    const btn = make('button', 'buy-btn');
    btn.type = 'button';
    const label = make('span', 'buy-label');
    const costRow = make('span', 'buy-cost');
    const coin = make('img');
    coin.alt = '';
    coin.src = icon(currency);
    const cost = make('span');
    costRow.append(coin, cost);
    btn.append(label, costRow);
    attachRepeat(btn, onBuy);
    card.append(img, body, btn);
    return { card, img, name, lvl, desc, note, btn, label, cost };
  }

  const upgradeCards = UPGRADES.map((def) => {
    const c = makeCard(icon(def.icon), () => h.buy('upgrade', def.id));
    set(c.name, def.name);
    el.upgradeList.append(c.card);
    return c;
  });

  // Pages can also open windows (the Ekipman card opens the Ekipman window).
  const uiHandlers = Object.assign(Object.create(h), {
    openWindow: (name, opts) => { windows.open(name, opts); lastPanel = 0; },
    openGear: (slot) => { gearScreen.open(slot); lastPanel = 0; },
  });
  const pageTools = { h: uiHandlers, icon, make, set, makeCard, fmt };
  const petPage = createPetPage(pageTools);
  const dungeonPage = createDungeonPage(pageTools);
  const windows = createWindows(pageTools);
  const gearCard = createGearCard(pageTools);
  const gearScreen = createGearScreen(pageTools);
  const soulTree = createSoulTree(pageTools);

  const skillCards = SKILLS.map((def) => {
    const c = makeCard(icon(def.icon), () => h.buy('skill', def.id));
    set(c.name, def.name);
    el.skillList.append(c.card);
    return c;
  });

  // Updates the skills tab; returns whether any skill level is affordable (for the tab badge).
  function updateSkillCards(state, amount) {
    let afford = false;
    SKILLS.forEach((def, i) => {
      const c = skillCards[i];
      const level = state.skills[def.id];
      const unlocked = L.skillUnlocked(state, def);
      c.card.classList.toggle('locked', !unlocked);
      set(c.lvl, level > 0 ? `Sv. ${level}` : '');
      set(c.note, skillTiming(def));
      if (!unlocked) {
        set(c.desc, `${def.unlockStage}. bölümde açılır`);
        set(c.label, 'Kilitli');
        set(c.cost, fmt(def.baseCost));
        c.btn.disabled = true;
        return;
      }
      const plan = L.purchasePlan(def, level, state.gold, amount);
      const maxed = plan.n === 0;
      const [label, value] = SKILL_TEXT[def.id];
      const now = value(L.skillPower(def.id, level));
      const next = value(L.skillPower(def.id, level + plan.n));
      set(c.desc, level === 0 ? `${label}: ${next}` : maxed ? `${label}: ${now}` : `${label}: ${now} → ${next}`);
      set(c.label, maxed ? 'MAKS' : level === 0 && plan.n === 1 ? 'Öğren' : `+${plan.n}`);
      set(c.cost, maxed ? '—' : fmt(plan.cost));
      c.btn.disabled = maxed || plan.cost > state.gold;
      if (!maxed && L.costFor(def, level) <= state.gold) afford = true;
    });
    return afford;
  }

  // Skill bar over the battle ground. Cooling buttons stay clickable (aria-disabled) so a tap
  // on them doesn't fall through to the battle as an attack.
  const skillButtons = SKILLS.map((def, i) => {
    const btn = make('button', 'skill-btn');
    btn.type = 'button';
    btn.title = `${def.name} (${i + 1})`;
    btn.setAttribute('aria-label', def.name);
    btn.style.setProperty('--skill', def.color);
    const img = make('img');
    img.alt = '';
    img.src = icon(def.icon);
    const shade = make('span', 'skill-shade');
    const time = make('span', 'skill-time');
    btn.append(img, shade, time);
    btn.addEventListener('click', () => h.useSkill(def.id));
    el.skillBar.append(btn);
    return { btn, shade, time };
  });

  function updateSkillBar(state) {
    let any = false;
    SKILLS.forEach((def, i) => {
      const s = skillButtons[i];
      const owned = state.skills[def.id] > 0;
      s.btn.hidden = !owned;
      if (!owned) return;
      any = true;
      const t = state.skillTimers[def.id];
      const active = t.active > 0;
      const ready = t.cooldown <= 0;
      s.btn.classList.toggle('active', active);
      s.btn.classList.toggle('ready', ready);
      s.btn.setAttribute('aria-disabled', String(!ready));
      s.shade.style.transform = `scaleY(${active || ready ? 0 : t.cooldown / def.cooldown})`;
      set(s.time, active ? String(Math.ceil(t.active)) : ready ? '' : clock(t.cooldown));
    });
    el.skillBar.hidden = !any;
  }

  const summaryRows = ['Dokunuş', 'Kritik', 'Altın', 'Can', 'Savunma', 'Ruh bonusu'].map((label) => {
    const row = make('div', 'sum-cell');
    const value = make('b');
    row.append(make('span', null, label), value);
    el.summary.append(row);
    return value;
  });

  function updateShop(state) {
    const amount = state.settings.buyAmount;
    for (const b of amountButtons) b.classList.toggle('active', String(amount) === b.dataset.amount);

    let heroAfford = false;
    UPGRADES.forEach((def, i) => {
      const c = upgradeCards[i];
      const level = state.upgrades[def.id];
      const plan = L.purchasePlan(def, level, state.gold, amount);
      const maxed = plan.n === 0;
      set(c.lvl, `Sv. ${level}`);
      set(c.desc, upgradeEffect(def, state, level, level + plan.n, maxed));
      set(c.note, def.id === 'sword' ? `Sonraki ×2: Sv. ${nextMilestone(level)}` : def.desc);
      set(c.label, maxed ? 'MAKS' : `+${plan.n}`);
      set(c.cost, maxed ? '—' : fmt(plan.cost));
      c.btn.disabled = maxed || plan.cost > state.gold;
      if (!maxed && L.costFor(def, level) <= state.gold) heroAfford = true;
    });

    set(summaryRows[0], fmt(L.tapDamage(state)));
    set(summaryRows[1], `${pct(L.critChance(state))} ×${mult(L.critMultiplier(state))}`);
    set(summaryRows[2], `×${L.goldMultiplier(state).toFixed(1)}`);
    set(summaryRows[3], fmt(L.heroMaxHp(state)));
    set(summaryRows[4], pct(1 - L.damageTakenMultiplier(L.heroArmor(state))));
    set(summaryRows[5], `+${pct(state.souls * SOUL_BONUS)}`);

    tabButton('hero').classList.toggle('badge', gearCard.update(state) || heroAfford);
    tabButton('pet').classList.toggle('badge', petPage.update(state, amount));
    tabButton('dungeon').classList.toggle('badge', dungeonPage.update(state));
    tabButton('skills').classList.toggle('badge', updateSkillCards(state, amount));
    const nodeReady = soulTree.update(state);
    tabButton('rebirth').classList.toggle('badge', L.prestigeSouls(state) > 0 || nodeReady);
  }

  // ---- Rebirth and menu pages ----

  function updateRebirth(state) {
    const gain = L.prestigeSouls(state);
    set(el.rbSouls, fmt(state.souls));
    set(el.rbBonus, `+${pct(state.souls * SOUL_BONUS)}`);
    set(el.rbStage, String(state.maxStage));
    set(el.rbGain, gain > 0 ? `+${fmt(gain)}` : '0');
    el.rbBtn.disabled = gain <= 0;
    set(el.rbNote, gain > 0
      ? 'Altın, güçlendirmeler, yetenekler, pet eğitimi ve bölüm sıfırlanır. Ruh taşları, petler, elmas, kristal ve zindan kalır.'
      : `${PRESTIGE_MIN_STAGE}. bölüme ulaşınca açılır.`);
  }

  const statDefs = [
    ['Dokunuş', (s) => fmt(s.stats.taps)],
    ['Kritik vuruş', (s) => fmt(s.stats.crits)],
    ['Yenilen düşman', (s) => fmt(s.stats.kills)],
    ['Yenilen boss', (s) => fmt(s.stats.bossKills)],
    ['Kullanılan yetenek', (s) => fmt(s.stats.skillsUsed)],
    ['Açılan yumurta', (s) => fmt(s.stats.eggs)],
    ['Zindanda en iyi kat', (s) => String(s.dungeon.best)],
    ['Toplam altın', (s) => fmt(s.stats.totalGold)],
    ['En yüksek bölüm', (s) => String(s.stats.bestStage)],
    ['Yeniden doğuş', (s) => String(s.stats.prestiges)],
    ['Oyun süresi', (s) => L.formatDuration(s.stats.playTime)],
  ];
  const statCells = statDefs.map(([label]) => {
    const row = make('div', 'stat-row');
    const value = make('b');
    row.append(make('span', null, label), value);
    el.stats.append(row);
    return value;
  });

  function updateMenu(state) {
    statDefs.forEach(([, get], i) => set(statCells[i], get(state)));
    set(el.soundBtn, state.settings.sound ? 'Açık' : 'Kapalı');
    el.soundBtn.classList.toggle('off', !state.settings.sound);
    set(el.musicBtn, state.settings.music ? 'Açık' : 'Kapalı');
    el.musicBtn.classList.toggle('off', !state.settings.music);
  }

  el.rbBtn.addEventListener('click', () => h.prestige());
  el.soundBtn.addEventListener('click', () => h.toggleSound());
  el.musicBtn.addEventListener('click', () => h.toggleMusic());
  $('save-btn').addEventListener('click', () => h.save());
  $('export-btn').addEventListener('click', () => h.exportSave());
  $('import-btn').addEventListener('click', () => h.importSave());
  $('reset-btn').addEventListener('click', () => h.reset());

  // ---- HUD ----

  el.prev.addEventListener('click', () => h.stage(-1));
  el.next.addEventListener('click', () => h.stage(1));
  el.auto.addEventListener('click', () => h.resumeAuto());

  function updateHud(state) {
    set(el.gold, fmt(state.gold));
    set(el.dps, fmt(L.totalDps(state)));
    el.soulsPill.hidden = state.souls <= 0;
    set(el.souls, fmt(state.souls));

    const zone = ZONES[L.zoneIndex(state.stage)];
    set(el.zone, zone.name);
    set(el.stage, `Bölüm ${state.stage}`);
    el.prev.disabled = state.stage <= 1;
    el.next.disabled = state.stage >= state.maxStage;

    const e = state.enemy;
    if (e.respawn <= 0) {
      const def = zone.enemies[e.kind] ?? zone.enemies[0];
      const name = e.variant === 'goblin' ? SPECIALS.goblin.name
        : e.variant === 'elite' ? `Elit ${def.name}`
          : e.variant === 'armored' ? `Zırhlı ${def.name}` : def.name;
      set(el.enemyName, e.boss ? `BOSS · ${name}` : name);
      el.enemyName.classList.toggle('boss', e.boss);
      el.enemyName.classList.toggle('special', e.variant === 'elite' || e.variant === 'goblin');
    }
    const hpFrac = Math.max(0, e.hp / e.maxHp);
    el.hpFill.style.transform = `scaleX(${hpFrac})`;
    // A boss shield sits over the HP bar until it breaks.
    el.shieldFill.hidden = !(e.shield > 0);
    if (e.shield > 0) el.shieldFill.style.transform = `scaleX(${e.shield / e.shieldMax})`;
    set(el.hpText, e.shield > 0 ? `Kalkan ${fmt(Math.ceil(e.shield))}` : `${fmt(Math.max(0, Math.ceil(e.hp)))} / ${fmt(e.maxHp)}`);
    set(el.progress, state.stage < state.maxStage ? '✓' : e.boss ? '' : `${state.kills}/${KILLS_PER_STAGE}`);

    // Bosses race the clock; a goblin counts down to its escape.
    const timed = e.boss || (e.variant === 'goblin' && e.respawn <= 0);
    el.timerBar.hidden = !timed;
    if (timed) {
      const total = e.boss ? BOSS_TIME : SPECIALS.goblin.flee;
      el.timerFill.style.transform = `scaleX(${Math.max(0, e.timeLeft / total)})`;
      set(el.timerText, `${e.boss ? '' : 'Kaçıyor · '}${Math.max(0, e.timeLeft).toFixed(1)} sn`);
    }

    el.auto.hidden = state.autoAdvance;
    set(el.auto, L.isBossStage(state.stage + 1) ? 'Boss\'a meydan oku ▶' : 'İlerlemeye devam ▶');
    el.hint.hidden = state.stats.taps >= 3;
    updateSkillBar(state);
  }

  // ---- Modal and toast ----

  function openModal({ title, body, actions }) {
    set(el.modalTitle, title);
    el.modalBody.replaceChildren(...(Array.isArray(body) ? body : [body]).map((b) => (typeof b === 'string' ? make('p', null, b) : b)));
    el.modalActions.replaceChildren(...actions.map((a) => {
      const btn = make('button', `btn ${a.kind || ''}`, a.label);
      btn.type = 'button';
      btn.addEventListener('click', () => { if (a.onClick?.() !== false) closeModal(); });
      return btn;
    }));
    el.modal.hidden = false;
    el.modalActions.lastElementChild?.focus();
  }

  function closeModal() {
    el.modal.hidden = true;
  }

  el.modal.addEventListener('click', (e) => { if (e.target === el.modal) closeModal(); });

  // Version label in the top-right corner; opens the patch notes in the blog.
  set(el.version, `v${VERSION}`);
  el.version.addEventListener('click', () => windows.open('blog', { tab: 'notes' }));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!el.modal.hidden) closeModal();
    else if (gearScreen.isOpen) gearScreen.close();
    else if (windows.isOpen) windows.close();
  });

  let toastTimer = null;
  function toast(msg) {
    set(el.toast, msg);
    el.toast.hidden = false;
    el.toast.classList.remove('show');
    void el.toast.offsetWidth;
    el.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.toast.hidden = true; }, 1800);
  }

  function pulseGold() {
    el.goldPill.classList.remove('pulse');
    void el.goldPill.offsetWidth;
    el.goldPill.classList.add('pulse');
  }

  return {
    update(state, now) {
      updateHud(state);
      // The panel lists are heavier; refresh them a few times a second.
      if (now - lastPanel > 150) {
        lastPanel = now;
        updateShop(state);
        if (tab === 'rebirth') updateRebirth(state);
        if (windows.current === 'settings') updateMenu(state);
        windows.update(state);
        gearScreen.update(state);
      }
    },
    refresh() { lastPanel = 0; },
    get tab() { return tab; },
    showEgg(result, state) { openModal(petPage.eggResult(result, state)); },
    setTab,
    openModal,
    closeModal,
    get modalOpen() { return !el.modal.hidden; },
    get windowOpen() { return windows.isOpen || gearScreen.isOpen; },
    openWindow: (name, opts) => { windows.open(name, opts); lastPanel = 0; },
    closeWindow: () => { windows.close(); gearScreen.close(); },
    toast,
    pulseGold,
    make,
    coinIcon: () => document.querySelector('#gold-pill img'),
  };
}

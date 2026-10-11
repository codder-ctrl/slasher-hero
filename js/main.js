import { AUTOSAVE_MS, OFFLINE_MIN, OFFLINE_CAP, SKILLS } from './config.js';
import * as L from './logic.js';
import * as store from './store.js';
import { createRenderer } from './render.js';
import { createUI } from './ui.js';
import { createDungeonView } from './dungeon-view.js';
import * as D from './dungeon.js';
import { sfx, unlockAudio, setSoundEnabled, setMusicEnabled, setMusicMood, pauseAudio } from './sound.js';

// Wires everything together: the game loop, input, saving and the UI handlers.

const battle = document.getElementById('battle');
const canvas = document.getElementById('scene');

let state = L.loadState(store.loadRaw());
setSoundEnabled(state.settings.sound);
setMusicEnabled(state.settings.music);

// Music follows the zone on screen and speeds up for bosses.
const updateMusic = () => setMusicMood(L.zoneIndex(state.stage), state.enemy.boss && state.enemy.respawn <= 0);

const renderer = createRenderer(canvas);
const dungeonCanvas = document.getElementById('dungeon-canvas');
const dungeonView = createDungeonView(dungeonCanvas);

function dispatch(events) {
  for (const ev of events) {
    if (ev.type.startsWith('dg-')) {
      // The dungeon is only drawn while its tab is open.
      if (ui.tab === 'dungeon') dungeonView.handle(ev, state);
      if (ev.type === 'dg-clear' && ev.elmas) ui.toast(`Zindan bossu: +${ev.elmas} elmas`);
      continue;
    }
    renderer.handle(ev, state);
    switch (ev.type) {
      case 'hit':
        // Kılıç Fırtınası hits many times a second; those get a lighter sound.
        if (ev.auto) sfx.autoHit();
        else (ev.crit ? sfx.crit : sfx.hit)();
        break;
      case 'skill': {
        const def = L.findSkill(ev.id);
        sfx.skill(ev.id);
        renderer.showBanner(def.name.toLocaleUpperCase('tr-TR') + '!', def.color, 1.4);
        break;
      }
      case 'kill':
        sfx.kill();
        if (ev.boss) { sfx.win(); renderer.showBanner('BOSS YENİLDİ!', '#e0a020'); }
        break;
      case 'elmas':
        ui.toast(`İlk boss zaferi: +${ev.amount} elmas`);
        break;
      case 'bossFail':
        sfx.fail();
        renderer.showBanner('SÜRE DOLDU!', '#c0503a');
        updateMusic();
        break;
      case 'spawn':
      case 'stage':
        if (state.enemy.respawn <= 0 && state.enemy.boss) {
          sfx.boss();
          renderer.showBanner('BOSS!', '#c8353a', 1.2);
        }
        updateMusic();
        break;
    }
  }
}

function activateSkill(id) {
  unlockAudio();
  const events = [];
  if (L.useSkill(state, id, events)) dispatch(events);
}

function replaceState(next) {
  state = next;
  setSoundEnabled(state.settings.sound);
  setMusicEnabled(state.settings.music);
  updateMusic();
  renderer.sync(state);
  ui.refresh();
}

const ui = createUI({
  buy(kind, id) {
    if (L.buy(state, kind, id, state.settings.buyAmount)) {
      sfx.buy();
      ui.refresh();
    }
  },
  setBuyAmount(amount) {
    state.settings.buyAmount = amount;
    ui.refresh();
  },
  stage(delta) {
    const events = [];
    if (L.setStage(state, state.stage + delta, Math.random, events)) {
      // Stepping back means farming; reaching the frontier turns auto-advance back on.
      state.autoAdvance = state.stage === state.maxStage;
      dispatch(events);
    }
  },
  useSkill: activateSkill,
  openEgg() {
    const result = L.openEgg(state);
    if (!result) return;
    sfx.egg();
    ui.refresh();
    ui.showEgg(result, state);
  },
  evolvePet() {
    if (L.evolvePet(state, state.activePet)) {
      sfx.win();
      ui.refresh();
      const pet = L.findPet(state.activePet);
      renderer.showBanner(pet.forms[state.pets[pet.id].form - 1].name.toLocaleUpperCase('tr-TR') + '!', '#3f9a45', 1.8);
    }
  },
  selectPet(id) {
    if (L.selectPet(state, id)) { sfx.buy(); ui.refresh(); }
  },
  companion(id) {
    const ok = state.companions[id] > 0 ? D.levelUpCompanion(state, id) : D.recruit(state, id);
    if (ok) { sfx.buy(); ui.refresh(); }
  },
  toggleTeam(id) {
    if (D.toggleTeam(state, id)) ui.refresh();
  },
  resumeAuto() {
    state.autoAdvance = true;
  },
  prestige() {
    const gain = L.prestigeSouls(state);
    if (gain <= 0) return;
    ui.openModal({
      title: 'Yeniden Doğuş',
      body: [
        `${L.formatNumber(gain)} Ruh Taşı kazanacaksın. Her biri tüm hasarını kalıcı olarak %10 artırır.`,
        'Altın, güçlendirmeler, yetenekler, pet eğitimi ve bölüm sıfırlanır. Petler, elmas, kristal ve zindan kalır.',
      ],
      actions: [
        { label: 'Vazgeç' },
        {
          label: 'Yeniden Doğ',
          kind: 'accent',
          onClick: () => {
            L.prestige(state);
            replaceState(state);
            store.save(state);
            sfx.win();
            renderer.showBanner('YENİDEN DOĞDUN!', '#8a4fc0', 2);
            ui.setTab('hero');
          },
        },
      ],
    });
  },
  toggleSound() {
    state.settings.sound = !state.settings.sound;
    setSoundEnabled(state.settings.sound);
    ui.refresh();
  },
  toggleMusic() {
    unlockAudio();
    state.settings.music = !state.settings.music;
    setMusicEnabled(state.settings.music);
    ui.refresh();
  },
  save() {
    ui.toast(store.save(state) ? 'Kaydedildi' : 'Kayıt yapılamadı (depolama kapalı)');
  },
  exportSave() {
    const area = ui.make('textarea', 'code-box');
    area.readOnly = true;
    area.value = store.exportCode(state);
    ui.openModal({
      title: 'Kayıt Kodu',
      body: ['Bu kodu başka bir cihazda "İçe Aktar" ile yükleyebilirsin.', area],
      actions: [
        { label: 'Kapat' },
        {
          label: 'Kopyala',
          kind: 'accent',
          onClick: () => {
            area.select();
            navigator.clipboard?.writeText(area.value).then(() => ui.toast('Kopyalandı'), () => ui.toast('Kodu elle kopyala'));
            return false;
          },
        },
      ],
    });
  },
  importSave() {
    const area = ui.make('textarea', 'code-box');
    area.placeholder = 'Kayıt kodunu buraya yapıştır';
    ui.openModal({
      title: 'İçe Aktar',
      body: ['Mevcut ilerlemen bu kayıtla değiştirilecek.', area],
      actions: [
        { label: 'Vazgeç' },
        {
          label: 'Yükle',
          kind: 'accent',
          onClick: () => {
            const raw = store.importCode(area.value);
            if (!raw) { ui.toast('Geçersiz kod'); return false; }
            if (!L.isOwnSave(raw)) { ui.toast('Bu kod Slasher Hero kaydı değil'); return false; }
            replaceState(L.loadState(raw));
            store.save(state);
            ui.toast('Kayıt yüklendi');
            return true;
          },
        },
      ],
    });
  },
  reset() {
    ui.openModal({
      title: 'Her Şeyi Sıfırla',
      body: 'Tüm ilerleme, ruh taşları ve istatistikler silinecek. Bu geri alınamaz.',
      actions: [
        { label: 'Vazgeç' },
        {
          label: 'Sıfırla',
          kind: 'danger',
          onClick: () => {
            store.clear();
            replaceState(L.newGame());
            store.save(state);
            ui.setTab('hero');
          },
        },
      ],
    });
  },
});

// ---- Time away ----

// Short gaps (tab switched, screen locked briefly) are simulated tick by tick; longer ones
// pay out offline gold.
function catchUp(seconds) {
  if (seconds >= OFFLINE_MIN) {
    const gold = L.applyOffline(state, seconds);
    if (gold > 0) {
      ui.openModal({
        title: 'Tekrar hoş geldin!',
        body: `Sen yokken (${L.formatDuration(Math.min(seconds, OFFLINE_CAP))}) petin ${L.formatNumber(gold)} altın topladı.`,
        actions: [{ label: 'Harika!', kind: 'accent' }],
      });
    }
  } else if (seconds > 0.5) {
    for (let t = 0; t < seconds; t += 0.25) L.tick(state, 0.25);
    renderer.sync(state);
  }
}

catchUp((Date.now() - state.lastSeen) / 1000);

let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  pauseAudio(document.hidden);
  if (document.hidden) {
    hiddenAt = Date.now();
    store.save(state);
  } else if (hiddenAt) {
    catchUp((Date.now() - hiddenAt) / 1000);
    hiddenAt = 0;
    last = performance.now();
  }
});
window.addEventListener('pagehide', () => store.save(state));
setInterval(() => store.save(state), AUTOSAVE_MS);

// ---- Input ----

function doTap(cssX, cssY) {
  unlockAudio();
  if (cssX != null) renderer.tapAt(cssX, cssY);
  const events = [];
  if (L.tap(state, Math.random, events)) sfx.swing();
  dispatch(events);
}

battle.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button')) return;
  e.preventDefault();
  const r = canvas.getBoundingClientRect();
  doTap(e.clientX - r.left, e.clientY - r.top);
});

document.addEventListener('keydown', (e) => {
  if (e.repeat || ui.modalOpen || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.target.closest?.('button, textarea, input')) return;
  if (e.code === 'Space' || e.key === 'Enter') {
    e.preventDefault();
    doTap(null, null);
  } else if (/^Digit[1-9]$/.test(e.code)) {
    const def = SKILLS[Number(e.code.slice(5)) - 1];
    if (def) activateSkill(def.id);
  }
});

// Any first touch unlocks audio (browsers block it before a gesture).
document.addEventListener('pointerdown', unlockAudio, { once: true });

renderer.onCoinArrive(() => {
  sfx.coin();
  ui.pulseGold();
});
renderer.onPetShot((kind) => sfx.petShot(kind));
updateMusic();

function layout() {
  renderer.resize();
  const c = canvas.getBoundingClientRect();
  const i = ui.coinIcon().getBoundingClientRect();
  renderer.setCoinTarget(i.left + i.width / 2 - c.left, i.top + i.height / 2 - c.top);
}
new ResizeObserver(layout).observe(canvas);
new ResizeObserver(() => dungeonView.resize()).observe(dungeonCanvas);
layout();
// Canvas text uses the display font; lay out again once it has loaded.
document.fonts?.ready.then(layout);

// ---- Installable app (PWA) ----

// The service worker caches the game for offline play. Browsers only allow it on HTTPS and
// localhost; elsewhere registration fails quietly and the game runs as a normal page.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
// Ask the browser not to evict the save when storage runs low.
navigator.storage?.persist?.().catch(() => {});

// ---- Loop ----

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  dispatch(L.tick(state, dt, Math.random, []));
  renderer.frame(state, dt);
  if (ui.tab === 'dungeon') dungeonView.frame(state, dt);
  ui.update(state, now);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

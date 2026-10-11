import { DAILY, MAIL } from './config.js';
import { CHANGELOG, VERSION } from './changelog.js';
import { NEWS } from './news.js';
import * as L from './logic.js';
import { coverUrl } from './icons.js';

// The top-right menu: a button under the version label opens a square bubble of shortcuts;
// each opens a parchment window (Günlük Giriş, Posta, Lider Tablosu, Blog, Ayarlar).
// Like the rest of the UI it never changes state itself: actions go through the handlers.

const $ = (id) => document.getElementById(id);

const WINDOWS = {
  daily: { title: 'Günlük Giriş', icon: 'daily' },
  mail: { title: 'Posta', icon: 'mail' },
  leaderboard: { title: 'Lider Tablosu', icon: 'trophy' },
  blog: { title: 'Blog', icon: 'scroll' },
  settings: { title: 'Ayarlar', icon: 'menu' },
};

// Time until the next local midnight, for the daily countdown.
function untilMidnight(now) {
  const d = new Date(now);
  d.setHours(24, 0, 0, 0);
  return (d.getTime() - now) / 1000;
}

const fmtDate = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  return `${d} ${months[m - 1]} ${y}`;
};

export function createWindows({ h, icon, make, set, fmt }) {
  const el = {
    btn: $('menu-btn'), pop: $('menu-pop'), win: $('window'), title: $('window-title'),
    icon: $('window-icon'), body: $('window-body'), close: $('window-close'), settings: $('settings-view'),
  };
  const items = [...el.pop.querySelectorAll('button[data-window]')];
  let current = null;
  let view = null;

  // ---- Menu bubble ----

  function setPop(open) {
    el.pop.hidden = !open;
    el.btn.setAttribute('aria-expanded', String(open));
    el.btn.classList.toggle('open', open);
  }
  el.btn.addEventListener('click', () => setPop(el.pop.hidden));
  items.forEach((b) => b.addEventListener('click', () => open(b.dataset.window)));
  document.addEventListener('pointerdown', (e) => {
    if (!el.pop.hidden && !e.target.closest('#menu-pop, #menu-btn')) setPop(false);
  }, true);

  // ---- Views ----

  function dailyView() {
    const root = make('div', 'window-view');
    const head = make('p', 'window-lead', 'Her gün uğra, ödülünü topla! Seriyi bozmadan 7. güne ulaşırsan büyük ödül seni bekler.');
    const grid = make('div', 'daily-grid');
    const tiles = DAILY.gold.map((_, i) => {
      const tile = make('div', 'daily-tile');
      if (i === DAILY.gold.length - 1) tile.classList.add('big');
      const day = make('span', 'daily-day', `${i + 1}. Gün`);
      const gold = make('span', 'daily-reward');
      const coin = make('img');
      coin.alt = '';
      coin.src = icon('coinIcon');
      const goldText = make('b');
      gold.append(coin, goldText);
      tile.append(day, gold);
      let gemText = null;
      if (DAILY.elmas[i]) {
        const gem = make('span', 'daily-reward');
        const gi = make('img');
        gi.alt = '';
        gi.src = icon('gem');
        gemText = make('b');
        gem.append(gi, gemText);
        tile.append(gem);
      }
      const check = make('span', 'daily-check', '✓');
      tile.append(check);
      grid.append(tile);
      return { tile, goldText, gemText };
    });
    const streak = make('div', 'daily-streak');
    const claim = make('button', 'btn accent big', 'Ödülü Topla');
    claim.type = 'button';
    claim.addEventListener('click', () => h.claimDaily());
    const note = make('p', 'note center');
    root.append(head, grid, streak, claim, note);
    return {
      root,
      update(state, now) {
        const status = L.dailyStatus(state, now);
        const rewards = L.dailyRewards(state);
        tiles.forEach((t, i) => {
          set(t.goldText, fmt(rewards[i].gold));
          if (t.gemText) set(t.gemText, String(rewards[i].elmas));
          const done = status.claimedToday ? i <= status.index : i < status.index;
          t.tile.classList.toggle('claimed', done);
          t.tile.classList.toggle('today', status.canClaim && i === status.index);
        });
        set(streak, status.claimedToday ? `Seri: ${status.streak} gün` : status.streak > 1 ? `Seri: ${state.daily.streak} gün · bugün topla, seri sürsün!` : 'Seri bugün başlıyor');
        claim.disabled = !status.canClaim;
        set(claim, status.canClaim ? 'Ödülü Topla' : 'Bugünkü ödül alındı');
        set(note, status.canClaim
          ? 'Altın ödülü ulaştığın bölümle birlikte büyür.'
          : `Yeni ödül ${L.formatDuration(untilMidnight(now))} sonra. Bir gün kaçırırsan seri baştan başlar.`);
      },
    };
  }

  function mailView() {
    const root = make('div', 'window-view');
    const list = make('div', 'list');
    const cards = MAIL.map((m) => {
      const card = make('div', 'card mail-card');
      const top = make('button', 'mail-top');
      top.type = 'button';
      const img = make('img', 'mail-icon');
      img.alt = '';
      img.src = icon('mail');
      const text = make('div', 'mail-text');
      text.append(make('b', null, m.title), make('span', 'note', m.from));
      const dot = make('span', 'mail-dot');
      top.append(img, text, dot);
      const body = make('div', 'mail-body');
      body.hidden = true;
      for (const p of m.body) body.append(make('p', null, p));
      let claimBtn = null;
      if (m.reward) {
        const reward = make('div', 'mail-reward');
        for (const [kind, iconName, label] of [['elmas', 'gem', 'elmas'], ['gold', 'coinIcon', 'altın'], ['kristal', 'crystal', 'kristal']]) {
          if (!m.reward[kind]) continue;
          const chip = make('span', 'chip');
          const ci = make('img');
          ci.alt = '';
          ci.src = icon(iconName);
          chip.append(ci, make('b', null, `${fmt(m.reward[kind])} ${label}`));
          reward.append(chip);
        }
        claimBtn = make('button', 'btn accent');
        claimBtn.type = 'button';
        claimBtn.addEventListener('click', () => h.claimMail(m.id));
        reward.append(claimBtn);
        body.append(reward);
      }
      top.addEventListener('click', () => {
        body.hidden = !body.hidden;
        card.classList.toggle('open', !body.hidden);
        if (!body.hidden) h.readMail(m.id);
      });
      card.append(top, body);
      list.append(card);
      return { m, card, dot, claimBtn, top, body };
    });
    const empty = make('p', 'note center', 'Posta kutun boş.');
    root.append(list, empty);
    // Open the first mail that still has something in it.
    let opened = false;
    return {
      root,
      update(state) {
        let shown = 0;
        for (const c of cards) {
          shown++;
          const claimed = L.mailClaimed(state, c.m.id);
          const unread = !state.mail.read.includes(c.m.id) || (c.m.reward && !claimed);
          c.dot.hidden = !unread;
          c.card.classList.toggle('unread', unread);
          if (c.claimBtn) {
            c.claimBtn.disabled = claimed;
            set(c.claimBtn, claimed ? 'Alındı ✓' : 'Al');
          }
          if (!opened && unread) { opened = true; c.top.click(); }
        }
        empty.hidden = shown > 0;
      },
    };
  }

  function leaderboardView() {
    const root = make('div', 'window-view soon');
    const img = make('img', 'soon-art');
    img.alt = '';
    img.src = icon('trophy', null, 96);
    const best = make('p', 'note center');
    root.append(img, make('h3', 'soon-title', 'Çok yakında...'), make('p', 'center', 'Dünyanın dört bir yanındaki kahramanlarla en ileri bölüm için yarışacağın lider tablosu hazırlanıyor.'), best);
    return {
      root,
      update(state) { set(best, `Şimdilik senin rekorun: Bölüm ${state.stats.bestStage} · Zindan katı ${state.dungeon.best}`); },
    };
  }

  function blogView(opts = {}) {
    const root = make('div', 'window-view');
    const tabs = make('div', 'seg blog-tabs');
    const notesBtn = make('button', null, 'Yama Notları');
    const newsBtn = make('button', null, 'Duyurular');
    for (const b of [notesBtn, newsBtn]) { b.type = 'button'; tabs.append(b); }
    const notes = make('div', 'blog-notes');
    const chips = make('div', 'version-chips');
    const noteCard = make('div', 'card info changelog');
    notes.append(chips, noteCard);
    let version = VERSION;
    const chipBtns = CHANGELOG.map((entry) => {
      const b = make('button', 'version-chip', `v${entry.version}`);
      b.type = 'button';
      b.addEventListener('click', () => { version = entry.version; showNote(); });
      chips.append(b);
      return b;
    });
    function showNote() {
      const entry = CHANGELOG.find((e) => e.version === version);
      chipBtns.forEach((b, i) => b.classList.toggle('active', CHANGELOG[i].version === version));
      const head = make('h3', null, `v${entry.version}`);
      head.append(make('span', null, fmtDate(entry.date)));
      const ul = make('ul');
      for (const n of entry.notes) ul.append(make('li', null, n));
      noteCard.replaceChildren(head, ul);
    }
    const news = make('div', 'list blog-news');
    for (const item of NEWS) {
      const card = make('article', 'card news-card');
      const cover = make('img', 'news-cover');
      cover.alt = '';
      cover.loading = 'lazy';
      cover.src = coverUrl(item.cover);
      const inner = make('div', 'news-text');
      inner.append(make('span', 'note', fmtDate(item.date)), make('h3', null, item.title));
      for (const p of item.body) inner.append(make('p', null, p));
      card.append(cover, inner);
      news.append(card);
    }
    function show(which) {
      notesBtn.classList.toggle('active', which === 'notes');
      newsBtn.classList.toggle('active', which === 'news');
      notes.hidden = which !== 'notes';
      news.hidden = which !== 'news';
      h.markSeen(which);
    }
    notesBtn.addEventListener('click', () => show('notes'));
    newsBtn.addEventListener('click', () => show('news'));
    root.append(tabs, notes, news);
    showNote();
    show(opts.tab || 'notes');
    return { root, update() {} };
  }

  function settingsView() {
    el.settings.hidden = false;
    return { root: el.settings, update() {} };
  }

  const builders = { daily: dailyView, mail: mailView, leaderboard: leaderboardView, blog: blogView, settings: settingsView };

  function open(name, opts) {
    setPop(false);
    current = name;
    view = builders[name](opts);
    set(el.title, WINDOWS[name].title);
    el.icon.src = icon(WINDOWS[name].icon);
    el.body.replaceChildren(view.root);
    el.body.scrollTop = 0;
    el.win.hidden = false;
    h.windowOpened?.(name);
  }

  function close() {
    current = null;
    view = null;
    el.win.hidden = true;
  }
  el.close.addEventListener('click', close);
  el.win.addEventListener('click', (e) => { if (e.target === el.win) close(); });

  // Badges: something to collect or read.
  function badges(state, now) {
    const unseenNews = NEWS.some((n) => !state.seen.news.includes(n.id));
    const flags = {
      daily: L.dailyStatus(state, now).canClaim,
      mail: L.unreadMail(state) > 0,
      blog: state.seen.version !== VERSION || unseenNews,
      leaderboard: false,
      settings: false,
    };
    for (const b of items) b.classList.toggle('badge', flags[b.dataset.window]);
    el.btn.classList.toggle('badge', Object.values(flags).some(Boolean));
  }

  return {
    open,
    close,
    get current() { return current; },
    get isOpen() { return current !== null; },
    update(state, now = Date.now()) {
      badges(state, now);
      if (view) view.update(state, now);
    },
  };
}

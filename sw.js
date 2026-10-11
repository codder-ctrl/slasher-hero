// Service worker: makes the game work offline once it has been opened online.
// Game files are network-first (always fresh when online, cached copy when offline), so a
// deploy needs no version bump. Google Fonts are cache-first since they never change.
// Keep SHELL in sync with the files the page loads; tests/pwa.test.js checks it.

const CACHE = 'slasher-hero';
const FONT_CACHE = 'slasher-hero-fonts';

const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.json',
  'js/actors.js',
  'js/anim.js',
  'js/changelog.js',
  'js/config.js',
  'js/dungeon.js',
  'js/dungeon-view.js',
  'js/fx.js',
  'js/icons.js',
  'js/logic.js',
  'js/main.js',
  'js/monsters.js',
  'js/paint.js',
  'js/people.js',
  'js/pets.js',
  'js/render.js',
  'js/scenery.js',
  'js/sound.js',
  'js/store.js',
  'js/ui.js',
  'js/ui-dungeon.js',
  'js/ui-pets.js',
  'js/ui-windows.js',
  'js/news.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;
    if (request.mode === 'navigate') {
      const page = await cache.match('index.html');
      if (page) return page;
    }
    throw err;
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(FONT_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
  }
});

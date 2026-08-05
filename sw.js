// Service worker: po prvom nacitani hra bezi aj bez internetu.
// Po zmene suborov zvys VERSION - stara cache sa zmaze a klient sa sam obnovi.
const VERSION = 'v4';
const CACHE = `vesmirne-hadanky-${VERSION}`;

const ASSETS = [
  './',
  'index.html',
  'manifest.json',
  'css/style.css',
  'css/fonts.css',
  'fonts/baloo2-500-latin.woff2',
  'fonts/baloo2-500-latin-ext.woff2',
  'fonts/baloo2-700-latin.woff2',
  'fonts/baloo2-700-latin-ext.woff2',
  'fonts/baloo2-800-latin.woff2',
  'fonts/baloo2-800-latin-ext.woff2',
  'js/main.js',
  'js/art.js',
  'js/audio.js',
  'js/util.js',
  'js/i18n.js',
  'js/starfield.js',
  'js/games/pairs.js',
  'js/games/maze.js',
  'js/games/differences.js',
  'js/games/counting.js',
  'js/games/sequence.js',
  'js/games/letters.js',
  'js/games/tangram.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // po jednom - keby jeden subor chybal, nech to nezhodi cely install
    await Promise.all(ASSETS.map((url) => cache.add(url).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res.ok && res.type === 'basic') {
        const cache = await caches.open(CACHE);
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      // offline a nemame to v cache - pri navigacii aspon spustime hru
      if (req.mode === 'navigate') {
        const shell = await caches.match('index.html');
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});

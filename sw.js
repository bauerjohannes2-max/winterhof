const CACHE_NAME = 'winterhof-v6-grid';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon-180.png',
  './assets/icon-512.png',
  './assets/splash_art.webp',
  './assets/terrain/snow_ground.webp',
  './assets/terrain/cobble_road.webp',
  './assets/sprites/winter_chalet.webp',
  './assets/sprites/christmas_bakery.webp',
  './assets/sprites/punch_stand.webp',
  './assets/sprites/patisserie_house.webp',
  './assets/sprites/gift_workshop.webp',
  './assets/sprites/christmas_tree.webp',
  './assets/sprites/reindeer_sleigh.webp',
  './assets/sprites/wishlist_board.webp',
  './assets/sprites/gift_mailbox.webp',
  './assets/sprites/animal_chicken.webp',
  './assets/sprites/animal_sheep.webp',
  './assets/sprites/animal_reindeer.webp',
  './assets/sprites/snow_field_plot.webp',
  './assets/sprites/crop_wheat.webp',
  './assets/sprites/crop_berries.webp',
  './assets/sprites/crop_matcha.webp',
  './assets/sprites/deco_pine.webp',
  './assets/sprites/deco_snowman.webp',
  './assets/sprites/deco_lantern.webp',
  './assets/sprites/timber_bridge.webp',
  './assets/sprites/alpine_cliff.webp',
  './assets/sprites/alpine_villager.webp',
  './assets/sprites/alpine_villager_green.webp',
  './assets/sprites/alpine_villager_navy.webp'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(ASSETS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (res && res.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone)).catch(() => {});
        }
        return res;
      });
    })
  );
});

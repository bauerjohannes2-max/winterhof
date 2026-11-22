const CACHE_NAME = 'winterhof-v4';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './src/main.js',
  './src/world.js',
  './src/sprites.js',
  './src/gameData.js',
  './src/audio.js',
  './src/giftExchange.js',
  './assets/icon-180.png',
  './assets/icon-512.png',
  './assets/splash_art.webp',
  './assets/sprites/winter_chalet.webp',
  './assets/sprites/christmas_bakery.webp',
  './assets/sprites/punch_stand.webp',
  './assets/sprites/patisserie_house.webp',
  './assets/sprites/gift_workshop.webp',
  './assets/sprites/christmas_tree.webp',
  './assets/sprites/autumn_tree_landmark.webp',
  './assets/sprites/reindeer_sleigh.webp',
  './assets/sprites/wishlist_board.webp',
  './assets/sprites/gift_mailbox.webp',
  './assets/sprites/animal_chicken.webp',
  './assets/sprites/animal_sheep.webp',
  './assets/sprites/animal_reindeer.webp',
  './assets/sprites/animal_owl.webp',
  './assets/sprites/snow_field_plot.webp',
  './assets/sprites/crop_wheat.webp',
  './assets/sprites/crop_berries.webp',
  './assets/sprites/crop_pumpkin.webp',
  './assets/sprites/crop_matcha.webp',
  './assets/sprites/crop_mushroom.webp',
  './assets/sprites/deco_pine.webp',
  './assets/sprites/deco_autumn_tree.webp',
  './assets/sprites/deco_snowman.webp',
  './assets/sprites/deco_lantern.webp',
  './assets/sprites/deco_pumpkin.webp',
  './assets/sprites/deco_ghost.webp',
  './assets/sprites/deco_spider.webp',
  './assets/sprites/deco_sorting_hat.webp',
  './assets/sprites/deco_cauldron.webp'
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
  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)));
});

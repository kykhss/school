// sw.js
const cacheName = 'kyhsss-v1';
const assets = [
  './NEWFINAL2.html',
  './addstudent.js',
  './variables.js',
  './appDb.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(assets))
  );
});

/* The Daily Respawn service worker: offline shell + last editions. */
var VERSION = 'v1';
var SHELL = 'tdr-shell-' + VERSION, RUNTIME = 'tdr-runtime-' + VERSION;
var CORE = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'img/respawn-logo.jpg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'data/editions.json'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(SHELL).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== SHELL && k !== RUNTIME; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function swr(req, cacheName) {
  return caches.open(cacheName).then(function (c) {
    return c.match(req).then(function (hit) {
      var net = fetch(req).then(function (r) { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(function () { return hit; });
      return hit || net;
    });
  });
}
function networkFirst(req, cacheName) {
  return caches.open(cacheName).then(function (c) {
    return fetch(req).then(function (r) { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(function () { return c.match(req); });
  });
}
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.origin === location.origin) {
    if (url.pathname.indexOf('/data/') !== -1) { e.respondWith(networkFirst(req, RUNTIME)); return; }      // fresh editions first
    if (req.mode === 'navigate') { e.respondWith(fetch(req).catch(function () { return caches.match('index.html'); })); return; }
    if (url.pathname.indexOf('/img/') !== -1) { e.respondWith(swr(req, RUNTIME)); return; }
    e.respondWith(caches.match(req).then(function (hit) { return hit || fetch(req); }));
    // shell files update because VERSION changes the cache name
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') e.respondWith(swr(req, RUNTIME));
});

// 一度ひらけば、ネットが無くても動くように全部を保存しておく
// 🔴 版を あげるときは app.js の VERSION と いっしょに かえる
var CACHE = 'kids-points-v4';
var FILES = ['./', 'index.html', 'app.js', 'manifest.json', 'icon-180.png', 'icon-512.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) {
    // ブラウザの キャッシュ（GitHub Pages は 10ぷん）に のこった ふるい ファイルを ほぞんしないよう、かならず サーバーから とる
    return c.addAll(FILES.map(function (u) { return new Request(u, { cache: 'reload' }); }));
  }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    // おなじ サイト（tk-engineer.github.io）の ほかの アプリの ほぞんは けさない
    return Promise.all(ks.filter(function (k) { return k.indexOf('kids-points-') === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || fetch(e.request); }));
});

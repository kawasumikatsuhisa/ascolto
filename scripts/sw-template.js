/**
 * ascolto の Service Worker。
 * scripts/generate-sw.mjs がビルド後に、下の VERSION と PRECACHE の
 * プレースホルダを実際の値に差し替えて dist/sw.js を作る。
 *
 * 電波が切れる電車内で使うので、アプリ本体は全部プリキャッシュして
 * ネットワークには一切依存しない作りにしてある。
 *
 * 版が変わるときの取り違えに注意。index.html と JS はハッシュ付きの名前で
 * 結びついているので、片方だけ新しいものを返すと何も表示されなくなる。
 * そうならないよう、探すのは常に「この版のキャッシュ」だけにしてある。
 */

const VERSION = '__VERSION__';
const CACHE = `ascolto-${VERSION}`;
const PRECACHE = __PRECACHE__;

// sw.js からの相対パスで解決する（GitHub Pages のサブパス配信でも動く）
const toURL = (path) => new URL(path, self.location).toString();
const INDEX = toURL('index.html');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE.map(toURL)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

/**
 * この版のキャッシュだけを見る。
 * caches.match() は全部の版を横断して探すので、新旧が混ざっているあいだに
 * 古い index.html と新しい JS を組み合わせて返してしまうことがある。
 */
async function fromCache(request) {
  const cache = await caches.open(CACHE);
  return cache.match(request);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // 画面遷移は常にキャッシュ済みの index.html を返す（SPA なので中身は同じ）。
  // 取り損ねたときだけ配信元から取り直す。ブラウザの HTTP キャッシュには
  // 古い index.html が残っていることがあり、それを掴むと中の JS の名前が
  // 合わずに真っ白になるので、キャッシュを迂回して取りにいく。
  if (request.mode === 'navigate') {
    event.respondWith(
      fromCache(INDEX).then(
        (cached) => cached ?? fetch(INDEX, { cache: 'reload' }),
      ),
    );
    return;
  }

  event.respondWith(
    fromCache(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    }),
  );
});

// Offline support. After one visit with a connection, the whole game is cached
// on the phone and plays with none. New versions are picked up on the next
// launch with a connection.
const CACHE = 'fishing-fly-v2';

/** The page plus every script and stylesheet it references. */
async function precache() {
  const cache = await caches.open(CACHE);
  const res = await fetch('./', { cache: 'no-store' });
  // Read it once and store a fresh copy: Chrome refuses to store a response
  // while a clone of it is still being read.
  const html = await res.text();
  await cache.put('./', new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  const assets = [...html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => !p.includes('splash/'));
  await cache.addAll([...new Set(assets)]);
}

self.addEventListener('install', (e) => {
  e.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  if (req.mode === 'navigate') {
    // The page: try the network for the newest version, fall back to the cached copy.
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy));
          return res;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  // Everything else: cached copy straight away, refreshed in the background.
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req);
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => hit);
      return hit ?? fresh;
    }),
  );
});

/* my fit service worker: cache the app shell so it opens offline; network first
   for the page so a new deploy shows on the next open, cache first for assets. */
const CACHE = "myfit-shell-v1";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const isPage = req.mode === "navigate" || req.destination === "document";
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (isPage) {
      try { const r = await fetch(req); cache.put(req, r.clone()); return r; }
      catch { return (await cache.match(req)) || (await cache.match("./")) || Response.error(); }
    }
    const hit = await cache.match(req);
    if (hit) return hit;
    try { const r = await fetch(req); if (r.ok) cache.put(req, r.clone()); return r; }
    catch { return Response.error(); }
  })());
});

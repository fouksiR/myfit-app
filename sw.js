/* my fit service worker: the app shell for offline opening, and the daily
   reminder (Firebase Cloud Messaging) when it arrives while the app is closed. */
const CACHE = "myfit-shell-v2";
self.addEventListener("install", () => { self.skipWaiting(); });
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

/* reminders: same Firebase project as Ember; a push that arrives in the
   background becomes one notification that opens the app on tap */
try {
  importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");
  firebase.initializeApp({
    apiKey: "AIzaSyDfqkNkezFiO7qcXELKwzzwoK3kLvqdOFw", authDomain: "fertility-gp-portal.firebaseapp.com", projectId: "fertility-gp-portal",
    storageBucket: "fertility-gp-portal.appspot.com", messagingSenderId: "532857641879", appId: "1:532857641879:web:226d22b6b33987ce7e82d2",
  });
  const messaging = firebase.messaging();
  messaging.onBackgroundMessage((payload) => {
    const n = (payload && payload.notification) || {};
    self.registration.showNotification(n.title || "my fit", { body: n.body || "How is it right now? A squeeze takes ten seconds.", icon: "./icon-192.png", badge: "./icon-192.png", tag: "myfit-daily", data: { url: "./" } });
  });
} catch (e) { /* offline at install: reminders register on the next open */ }
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
    for (const c of cs) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./");
  }));
});

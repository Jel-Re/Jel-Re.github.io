/* Round Two: einfacher Service Worker. Netzwerk zuerst, damit nach Updates nie ein alter Stand hängen bleibt.
   Nur für Dateien dieser Seite; Fremdquellen (PeerJS) bleiben unberührt. Offline wird die zuletzt geladene Fassung gezeigt. */
const CACHE = "roundtwo-v4";
const SHELL = ["./", "index.html", "qrcode.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(new Request(r.url, { cache: "no-cache" })).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match("index.html")))
  );
});

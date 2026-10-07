// Futminna Lodges service worker: makes the app installable and keeps the shell usable offline.
// - Pages (navigations): network first, fall back to the last copy / app shell when offline.
// - Built assets (/assets/*, hashed): cache first.
// - Icons, manifest: stale-while-revalidate.
// Never touched: other origins (Supabase data, lodge videos), /api/*, non-GET requests.
const VERSION = "v1";
const PAGES = `lodges-pages-${VERSION}`;
const STATIC = `lodges-static-${VERSION}`;
const SHELL_URLS = ["/shell.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGES).then((cache) =>
      // add one by one so a missing file (e.g. /shell.html when running locally) doesn't fail the install
      Promise.all(SHELL_URLS.map((u) => cache.add(u).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![PAGES, STATIC].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (req.headers.has("range")) return; // video seeking

  if (req.mode === "navigate") {
    event.respondWith(networkFirstPage(req));
    return;
  }
  if (url.pathname.startsWith("/assets/")) {
    event.respondWith(cacheFirst(req));
    return;
  }
  event.respondWith(staleWhileRevalidate(req));
});

async function networkFirstPage(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return (
      (await cache.match(req)) ||
      (await cache.match("/shell.html")) ||
      (await cache.match("/index.html")) ||
      (await cache.match("/")) ||
      new Response("You're offline. Reconnect to browse lodges.", { status: 503, headers: { "content-type": "text/plain" } })
    );
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(req);
  const network = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || network;
}

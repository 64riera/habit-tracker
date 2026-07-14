const CACHE_VERSION = "just-go-v2";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const FLIGHT_CACHE = `${CACHE_VERSION}-flight`;

const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable.png",
];

// Unlike every other page (only cached once actually visited), `/offline`
// is precached unconditionally: it's the navigation fallback for routes
// that were never visited, so it must exist in PAGES_CACHE before any of
// those failures can happen.
function precacheOfflineFallback() {
  return caches.open(PAGES_CACHE).then((cache) =>
    fetch("/offline", { headers: { accept: "text/html" } })
      .then((response) => {
        if (response.ok) return cache.put("/offline", response);
      })
      .catch(() => {})
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    Promise.all([caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)), precacheOfflineFallback()])
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  );
}

// The App Router's client-side transitions (clicking a <Link>, prefetch on
// entering the viewport) are not "navigate" navigations: they're GET
// fetches to the same pathname with an `RSC` header that return a React
// Server Components payload, not HTML. Without intercepting them, any
// in-app navigation to a route that wasn't reloaded as a full document
// this session would fail outright once offline.
function isFlightRequest(request) {
  return request.headers.has("rsc");
}

// The real URL includes `?_rsc=<hash>` (Next's own cache-busting, changes
// with router state). The query is ignored when caching/reading so any
// fetch for that same route reuses the last known payload, even if the
// hash doesn't match.
function flightCacheKey(url) {
  const key = new URL(url);
  key.search = "";
  return key.toString();
}

// The App Router almost never issues a real "navigate" fetch again after
// the initial load (everything after that is a client-side transition),
// so PAGES_CACHE would stay empty for any route only ever visited via a
// soft navigation. If React still falls back to a full MPA navigation
// (e.g. the cached payload doesn't match the current router tree), that
// reload needs an HTML document in PAGES_CACHE. That's why, every time we
// cache a successful flight payload, we also warm the full document cache
// for that same route — best-effort, in the background.
function warmPagesCache(pathnameUrl) {
  caches.open(PAGES_CACHE).then((cache) =>
    cache.match(pathnameUrl).then((existing) => {
      if (existing) return;
      fetch(pathnameUrl, { headers: { accept: "text/html" } })
        .then((response) => {
          if (response.ok) cache.put(pathnameUrl, response);
        })
        .catch(() => {});
    })
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Cache-first for static assets: their content never changes under the
  // same URL. Looked up in STATIC_CACHE specifically: a global
  // `caches.match` searches every cache and could return the wrong entry
  // if another cache had a matching URL (same reasoning applies to
  // flight/pages below).
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Network-first with cache fallback for client-side transitions between app pages.
  if (isFlightRequest(request)) {
    const cacheKey = flightCacheKey(request.url);
    event.respondWith(
      caches.open(FLIGHT_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(cacheKey, response.clone());
              warmPagesCache(cacheKey);
            }
            return response;
          })
          .catch(() => cache.match(cacheKey))
      )
    );
    return;
  }

  // Network-first with cache fallback for navigation (app pages).
  // Important: reads from PAGES_CACHE explicitly, never from a global
  // `caches.match` — FLIGHT_CACHE can have an entry for the same pathname
  // (an RSC payload, not HTML), and a global `caches.match` would return it
  // just as "valid", breaking the document.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(PAGES_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() =>
            // Falls back to the honest "you're offline" page rather than
            // silently swapping in "/" — showing Today's content under a
            // different URL would look like real data for that section.
            cache
              .match(request, { ignoreSearch: true })
              .then((cached) => cached || cache.match("/offline"))
          )
      )
    );
  }
});

// Progressive enhancement (Background Sync, unsupported in Safari/iOS):
// the SW can't re-run Server Actions directly (their invocation protocol
// is internal to each Next build), so it just notifies open tabs so they
// — which do have the real references to the functions — can replay them.
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    event.waitUntil(notifyClientsToDrain());
  }
});

async function notifyClientsToDrain() {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) client.postMessage({ type: "drain-queue" });
}

// Habit reminders: the payload is built by app/api/cron/reminders/route.ts.
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      data: { url: data.url },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((all) => {
      const existing = all.find((c) => c.url.includes(url));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});

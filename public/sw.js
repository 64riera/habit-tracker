const CACHE_VERSION = "just-go-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGES_CACHE = `${CACHE_VERSION}-pages`;
const FLIGHT_CACHE = `${CACHE_VERSION}-flight`;

const PRECACHE_URLS = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting())
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

// Las transiciones cliente del App Router (clic en <Link>, prefetch al entrar en
// viewport) no son navegaciones "navigate": son fetches GET al mismo pathname con
// cabecera `RSC` que devuelven el payload de React Server Components, no HTML. Sin
// interceptarlos, cualquier navegación dentro de la app a una ruta no recargada como
// documento completo esta sesión fallaba en seco al perder la conexión.
function isFlightRequest(request) {
  return request.headers.has("rsc");
}

// La URL real incluye `?_rsc=<hash>` (cache-busting propio de Next, cambia según el
// estado del router). Se ignora la query al cachear/leer para que cualquier fetch de
// esa misma ruta reutilice el último payload conocido, aunque el hash no coincida.
function flightCacheKey(url) {
  const key = new URL(url);
  key.search = "";
  return key.toString();
}

// El App Router casi nunca vuelve a emitir un fetch "navigate" real tras la carga
// inicial (todo son transiciones cliente), así que PAGES_CACHE quedaría vacío para
// cualquier ruta visitada solo por navegación blanda. Si React decide igualmente
// caer a una navegación MPA completa (p. ej. el payload en caché no encaja con el
// árbol de router actual), esa recarga necesita un documento HTML en PAGES_CACHE.
// Por eso, cada vez que cacheamos un payload de flight exitoso, precalentamos también
// el documento completo de esa misma ruta — best-effort, en segundo plano.
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

  // Cache-first para assets estáticos: no cambian de contenido bajo la misma URL.
  // Se busca en STATIC_CACHE específicamente: `caches.match` global busca en todas
  // las cachés y podría devolver la entrada equivocada si otra caché tuviera una URL
  // coincidente (ver el mismo razonamiento en flight/páginas más abajo).
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

  // Network-first con fallback a cache para transiciones cliente entre páginas de la app.
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

  // Network-first con fallback a cache para navegación (páginas de la app).
  // Importante: se lee de PAGES_CACHE explícitamente, nunca de `caches.match` global —
  // FLIGHT_CACHE puede tener una entrada para el mismo pathname (payload RSC, no HTML)
  // y `caches.match` global la devolvería igual de "válida", rompiendo el documento.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(PAGES_CACHE).then((cache) =>
        fetch(request)
          .then((response) => {
            cache.put(request, response.clone());
            return response;
          })
          .catch(() =>
            cache
              .match(request, { ignoreSearch: true })
              .then((cached) => cached || cache.match("/"))
          )
      )
    );
  }
});

// Mejora progresiva (Background Sync, no soportado en Safari/iOS): el SW no puede
// re-ejecutar Server Actions directamente (su protocolo de invocación es interno de
// cada build de Next), así que solo avisa a las pestañas abiertas para que ellas,
// que sí tienen las referencias reales a las funciones, hagan el replay.
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-mutations") {
    event.waitUntil(notifyClientsToDrain());
  }
});

async function notifyClientsToDrain() {
  const clients = await self.clients.matchAll({ type: "window" });
  for (const client of clients) client.postMessage({ type: "drain-queue" });
}

// Recordatorios de hábitos: el payload lo arma app/api/cron/reminders/route.ts.
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

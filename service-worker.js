// service-worker.js
const VERSION = "v3";
const STATIC_CACHE = `lectura-static-${VERSION}`;

// Archivos esenciales (ajusta las rutas si estás en subcarpeta)
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/offline.html"
];

// Instala y precachea
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(CORE_ASSETS))
  );
  self.skipWaiting();
});

// Activa y limpia versiones viejas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Habilita navigation preload para acelerar primeras cargas
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

// Estrategias:
// - Navegaciones (HTML): network-first, fallback cache, luego offline.html
// - Estáticos del CORE: cache-first
// - Resto: cache, luego red
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo manejamos mismo origen
  if (url.origin === location.origin) {
    // Navegaciones (entradas de página)
    if (req.mode === "navigate") {
      event.respondWith((async () => {
        try {
          const preload = await event.preloadResponse;
          if (preload) return preload;

          const netRes = await fetch(req);
          // Guarda la última versión de index para fallback
          const cache = await caches.open(STATIC_CACHE);
          // Importante: guarda bajo /index.html para recuperar fácil
          cache.put("/index.html", netRes.clone());
          return netRes;
        } catch (e) {
          const cached = await caches.match("/index.html");
          return cached || caches.match("/offline.html");
        }
      })());
      return;
    }

    // Estáticos cacheados
    const pathname = url.pathname;
    if (CORE_ASSETS.includes(pathname)) {
      event.respondWith(
        caches.match(req).then((cached) => {
          if (cached) return cached;
          return fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
            return res;
          });
        })
      );
      return;
    }
  }

  // Otros (p. ej., imágenes externas): cache o red
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => caches.match("/offline.html")))
  );
});

const CACHE_NAME = "lectura-cache-v1";
const urlsToCache = [
  "index.html",
  "style.css",
  "manifest.json",
  "icon-48.png",
  "icon-72.png",
  "icon-96.png",
  "icon-144.png",
  "icon-192.png",
  "icon-256.png",
  "icon-512.png"
];

// Instalar y cachear archivos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  console.log("Service Worker instalado ✅");
});

// Activar y limpiar cachés viejas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log("Cache eliminada:", cache);
            return caches.delete(cache);
          }
        })
      )
    )
  );
});

// Interceptar peticiones (modo offline)
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});

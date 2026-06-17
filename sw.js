const CACHE_NAME = "nutrizeka-v1";
const STATIC_ASSETS = [
  "/Nutri_Zeka/",
  "/Nutri_Zeka/index.html"
];

// Kurulum: statik dosyaları cache'e al
self.addEventListener("install", function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Aktivasyon: eski cache'leri temizle
self.addEventListener("activate", function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Fetch: önce cache, yoksa network
// API isteklerini (Worker, Google Fonts) her zaman network'ten al
self.addEventListener("fetch", function(event) {
  const url = event.request.url;

  // Cloudflare Worker, Anthropic, Google Fonts → her zaman network
  if (
    url.includes("workers.dev") ||
    url.includes("anthropic.com") ||
    url.includes("fonts.googleapis.com") ||
    url.includes("fonts.gstatic.com")
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Diğer istekler: cache-first, network fallback
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(response) {
        // Başarılı GET isteklerini cache'e ekle
        if (
          response.status === 200 &&
          event.request.method === "GET"
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, clone);
          });
        }
        return response;
      }).catch(function() {
        // Offline: index.html'i sun
        return caches.match("/Nutri_Zeka/index.html");
      });
    })
  );
});

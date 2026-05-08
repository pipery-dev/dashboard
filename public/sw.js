const CACHE_NAME = "pipery-dashboard-v2";
const STATIC_ASSETS = ["/manifest.webmanifest", "/icon.svg", "/icon.png"];

function shouldBypassCache(requestUrl, request) {
  if (request.method !== "GET") {
    return true;
  }

  const url = new URL(requestUrl);

  // Always fetch app documents, framework chunks, auth, API, and no-store requests from the network.
  if (
    request.mode === "navigate" ||
    request.destination === "document" ||
    request.headers.get("accept")?.includes("text/html") ||
    (url.origin === self.location.origin && url.pathname.startsWith("/_next/"))
  ) {
    return true;
  }

  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    return true;
  }

  if (request.cache === "no-store") {
    return true;
  }

  return false;
}

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
    ])
  );
});

self.addEventListener("fetch", (event) => {
  if (shouldBypassCache(event.request.url, event.request)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (!response.ok || response.type !== "basic") {
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match("/"));
    })
  );
});

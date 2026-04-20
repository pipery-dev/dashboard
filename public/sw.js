const CACHE_NAME = "pipery-dashboard-v1";
const APP_SHELL = ["/", "/manifest.webmanifest", "/icon.svg"];

function shouldBypassCache(requestUrl, request) {
  if (request.method !== "GET") {
    return true;
  }

  const url = new URL(requestUrl);

  // Never cache auth, API, or extension-assisted requests.
  if (url.origin === self.location.origin && url.pathname.startsWith("/api/")) {
    return true;
  }

  if (request.cache === "no-store") {
    return true;
  }

  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
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

// public/service-worker.js
// Cache name includes version to force cache invalidation on version change
let CACHE_NAME = "hellolocal-v1";

// Fetch version and set cache name
fetch("/version.json?t=" + Date.now())
  .then((response) => {
    if (response.ok) {
      return response.json();
    }
    throw new Error("Failed to fetch version");
  })
  .then((data) => {
    CACHE_NAME = `hellolocal-${data.version}-${data.buildHash.substring(0, 7)}`;
  })
  .catch((e) => {
    // Failed to fetch version, using default cache name
  });
const urlsToCache = [
  "/",
  "/index.html",
  "/src/main.tsx",
];

// Install event - cache resources
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => !cacheName.startsWith("hellolocal-") || cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  
  // Don't cache version.json - always fetch fresh
  if (url.pathname.includes("/version.json")) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Don't cache API requests - always fetch fresh from network
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If network fails, return offline response
        return new Response("Offline", { status: 503 });
      })
    );
    return;
  }
  
  // Don't cache chrome-extension, chrome, or other non-http(s) schemes
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // For other requests, use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        // Cache successful responses (only for non-API requests and http(s) schemes)
        if (fetchResponse.ok && (url.protocol === "http:" || url.protocol === "https:")) {
          const responseClone = fetchResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch((err) => {
              // Ignore cache errors (e.g., chrome-extension requests)
            });
          });
        }
        return fetchResponse;
      });
    })
    .catch(() => {
      // If both cache and network fail, return a basic response
      return new Response("Offline", { status: 503 });
    })
  );
});

// Push event - handle push notifications
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || "";
  const options = {
    body: data.body || "Új esemény érkezett!",
    icon: data.icon || "/vite.svg",
    badge: data.badge || "/vite.svg",
    image: data.image,
    data: data.data || {},
    tag: data.tag || "default",
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click event
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window/tab open with the target URL
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }
      // If not, open a new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});


const CACHE_NAME = 'mydailylife-budget-v3';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Install event - cache core resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Fetch event
// Use Network-First for navigations (HTML) to avoid serving stale index.html
// Use Cache-First for other assets with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Handle SPA navigations
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache a fresh copy of the root document
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/');
          return cached || Response.error();
        })
    );
    return;
  }

  // Cache-first for non-HTML requests
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) return caches.delete(name);
        })
      )
    )
  );
  self.clients.claim();
});
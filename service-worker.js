const CACHE_NAME = 'cantoral-tora-shell-v3';
const API_CACHE_NAME = 'cantoral-tora-api-v3';

const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'trope_synthesizer.js',
  'manifest.json',
  'icon.png'
];

// Install Event: cache app shell assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: clear old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: handle caching strategies
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // API Requests: Network-First, fallback to cache
  if (url.hostname.includes('sefaria.org') || url.hostname.includes('hebcal.com')) {
    e.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return fetch(e.request)
          .then((response) => {
            if (response.status === 200) {
              cache.put(e.request, response.clone());
            }
            return response;
          })
          .catch(() => {
            return cache.match(e.request);
          });
      })
    );
    return;
  }

  // App Shell Assets: Stale-While-Revalidate (instant load + async cache update)
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      const fetchPromise = fetch(e.request).then((networkResponse) => {
        if (networkResponse.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(() => {
        // Silent catch for offline fetch failure
      });

      return cachedResponse || fetchPromise;
    })
  );
});

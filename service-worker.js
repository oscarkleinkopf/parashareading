const CACHE_NAME = 'cantoral-tora-shell-v10';
const API_CACHE_NAME = 'cantoral-tora-api-v10';

// Precache the exact (versioned) URLs the page requests, so the very first offline
// load works and there is no bare-vs-versioned mismatch.
const ASSETS_TO_CACHE = [
  './',
  'index.html',
  'styles.css?v=3.9',
  'app.js?v=3.9',
  'trope_synthesizer.js?v=3.1',
  'recordings.js?v=3.8',
  'assets/netlify-identity.js?v=3.1',
  'manifest.json',
  'icon.png'
];

// Install Event: cache app shell assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      // Tolerate individual asset failures so install never rejects entirely.
      .then((cache) => Promise.allSettled(ASSETS_TO_CACHE.map((a) => cache.add(a))))
      .then(() => self.skipWaiting())
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

  // Only handle GET; let the browser deal with POST/PUT/etc. directly.
  if (e.request.method !== 'GET') return;

  // Never intercept our own API / Netlify function / Identity calls — they must be
  // live (auth, uploads, moderation) and must not be served from a stale cache.
  if (url.origin === self.location.origin &&
      (url.pathname.startsWith('/api/') || url.pathname.startsWith('/.netlify/'))) {
    return;
  }

  // External API Requests (Sefaria / Hebcal): Network-First, fallback to cache
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
          .catch(() => cache.match(e.request));
      })
    );
    return;
  }

  // App Shell Assets: Stale-While-Revalidate with a safe offline fallback.
  e.respondWith((async () => {
    const cached = await caches.match(e.request);
    if (cached) {
      // Revalidate in the background without blocking the response.
      e.waitUntil((async () => {
        try {
          const net = await fetch(e.request);
          if (net && net.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(e.request, net.clone());
          }
        } catch (_) { /* offline — keep cached copy */ }
      })());
      return cached;
    }

    try {
      const net = await fetch(e.request);
      if (net && net.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(e.request, net.clone());
      }
      return net;
    } catch (_) {
      // Offline and nothing cached: fall back to the app shell for navigations.
      if (e.request.mode === 'navigate') {
        const shell = await caches.match('index.html') || await caches.match('./');
        if (shell) return shell;
      }
      return new Response('Sin conexión', {
        status: 503,
        statusText: 'Offline',
        headers: { 'content-type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});

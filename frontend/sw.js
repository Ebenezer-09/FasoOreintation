const CACHE_VERSION = 'faso-orientation-v1';
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const APP_SHELL = [
  '/',
  '/index.html',
  '/connexion.html',
  '/inscription.html',
  '/profil.html',
  '/bulletins.html',
  '/analyse.html',
  '/recommandations.html',
  '/conseiller.html',
  '/bourses.html',
  '/stages_emplois.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/assets/icons/icon.svg',
  '/assets/universite.json',
  '/css/main.css',
  '/js/env.js',
  '/js/storage.js',
  '/js/auth-api.js',
  '/js/auth-manager.js',
  '/js/auth.js',
  '/js/auth-forms.js',
  '/js/groq.js',
  '/js/main.js',
  '/js/navigator.js',
  '/js/pwa.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('faso-orientation-') && ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return caches.match(request) || caches.match('/offline.html');
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/js/') ||
      url.pathname.startsWith('/css/') ||
      url.pathname.startsWith('/assets/') ||
      url.pathname.endsWith('.webmanifest'))
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response && (response.ok || response.type === 'opaque')) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

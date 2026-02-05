const CACHE_NAME = 'motortrip-cache-v1';
const OFFLINE_URL = 'offline.html';

// Assets to cache on install
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-icon.png',
  './icons/favicon.ico',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  // Font Awesome font files
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-regular-400.woff2',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-brands-400.woff2'
];

// Install event - precache critical assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell...');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        console.log('Skip waiting on install');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Pre-caching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Claiming clients...');
      return self.clients.claim();
    })
  );
});

// Fetch event - Cache First, Network Fallback strategy
self.addEventListener('fetch', event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin) && 
      !event.request.url.includes('cdnjs.cloudflare.com')) {
    return;
  }
  
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache the page if we got a valid response
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(event.request, responseClone));
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(event.request)
            .then(cachedResponse => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // No cache, return offline page
              return caches.match(OFFLINE_URL);
            });
        })
    );
    return;
  }
  
  // For all other requests (CSS, JS, images, fonts)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Return cached response
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(event.request)
          .then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Cache the fetched resource
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // If the resource is not cached and network fails,
            // and it's an image, return a placeholder
            if (event.request.destination === 'image') {
              return caches.match('./icons/icon-512.png');
            }
            
            // For Font Awesome fonts, we already precached them
            // so they should be in cache
            return caches.match(event.request);
          });
      })
  );
});

// Background sync for saving trips when offline
self.addEventListener('sync', event => {
  if (event.tag === 'sync-trip-data') {
    console.log('Background sync triggered');
    event.waitUntil(syncTrips());
  }
});

async function syncTrips() {
  // This would sync saved trips when back online
  // Implementation depends on your backend
  console.log('Syncing trip data...');
}
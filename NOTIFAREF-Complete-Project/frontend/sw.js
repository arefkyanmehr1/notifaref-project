// NOTIFAREF - Service Worker
// Version 1.0.0

const CACHE_NAME = 'notifaref-v1.0.0';
const STATIC_CACHE = 'notifaref-static-v1.0.0';
const DYNAMIC_CACHE = 'notifaref-dynamic-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/profile.html',
  '/shared.html',
  '/css/styles.css',
  '/css/themes.css',
  '/css/rtl.css',
  '/css/dashboard.css',
  '/js/i18n.js',
  '/js/utils.js',
  '/js/api.js',
  '/js/auth.js',
  '/js/notifications.js',
  '/js/dashboard.js',
  '/js/pwa.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/favicon.ico'
];

// API endpoints that should be cached
const API_CACHE_PATTERNS = [
  /\/api\/auth\/me$/,
  /\/api\/reminders\?.*$/,
  /\/api\/analytics\/dashboard.*$/,
  /\/api\/notifications\/settings$/
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Service Worker: Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Error caching static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached files and implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    handleFetchRequest(request)
  );
});

async function handleFetchRequest(request) {
  const url = new URL(request.url);
  
  // Strategy 1: Cache First for static assets
  if (isStaticAsset(url.pathname)) {
    return cacheFirst(request);
  }
  
  // Strategy 2: Network First for API calls
  if (url.pathname.startsWith('/api/')) {
    return networkFirst(request);
  }
  
  // Strategy 3: Stale While Revalidate for HTML pages
  if (isHTMLPage(url.pathname)) {
    return staleWhileRevalidate(request);
  }
  
  // Default: Network First
  return networkFirst(request);
}

// Cache First Strategy - for static assets
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache First strategy failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

// Network First Strategy - for API calls and dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && shouldCacheResponse(request)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html') || new Response('Offline', { 
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Stale While Revalidate Strategy - for HTML pages
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => cachedResponse);
  
  return cachedResponse || fetchPromise;
}

// Helper functions
function isStaticAsset(pathname) {
  return pathname.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/);
}

function isHTMLPage(pathname) {
  return pathname.endsWith('.html') || 
         pathname === '/' || 
         pathname.startsWith('/dashboard') ||
         pathname.startsWith('/profile') ||
         pathname.startsWith('/shared');
}

function shouldCacheResponse(request) {
  const url = new URL(request.url);
  
  // Cache successful API responses for specific endpoints
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Push event - handle push notifications
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push event received');
  
  if (!event.data) {
    console.log('Push event has no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Push notification data:', data);
    
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192x192.png',
      badge: data.badge || '/icons/badge-72x72.png',
      tag: data.tag || 'notifaref-notification',
      data: data.data || {},
      actions: data.actions || [
        {
          action: 'complete',
          title: 'Mark Complete',
          icon: '/icons/check.png'
        },
        {
          action: 'snooze',
          title: 'Snooze 15min',
          icon: '/icons/snooze.png'
        }
      ],
      requireInteraction: data.requireInteraction || false,
      silent: data.silent || false,
      vibrate: data.vibrate || [200, 100, 200],
      timestamp: Date.now()
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
    
  } catch (error) {
    console.error('Error handling push event:', error);
    
    // Fallback notification
    event.waitUntil(
      self.registration.showNotification('NOTIFAREF Reminder', {
        body: 'You have a new reminder',
        icon: '/icons/icon-192x192.png',
        tag: 'fallback-notification'
      })
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  notification.close();

  event.waitUntil(
    handleNotificationClick(action, data)
  );
});

async function handleNotificationClick(action, data) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  });

  // Handle specific actions
  if (action === 'complete' && data.reminderId) {
    // Send message to client to complete reminder
    sendMessageToClients({
      type: 'notification-action',
      action: 'complete',
      data: { reminderId: data.reminderId }
    });
    
    // Try to complete via API if possible
    try {
      await fetch(`/api/reminders/${data.reminderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getStoredToken()}`
        },
        body: JSON.stringify({ status: 'completed' })
      });
    } catch (error) {
      console.error('Error completing reminder from notification:', error);
    }
    
    return;
  }
  
  if (action === 'snooze' && data.reminderId) {
    // Send message to client to snooze reminder
    sendMessageToClients({
      type: 'notification-action',
      action: 'snooze',
      data: { reminderId: data.reminderId }
    });
    
    // Try to snooze via API if possible
    try {
      await fetch(`/api/reminders/${data.reminderId}/snooze`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await getStoredToken()}`
        },
        body: JSON.stringify({ minutes: 15 })
      });
    } catch (error) {
      console.error('Error snoozing reminder from notification:', error);
    }
    
    return;
  }

  // Default action - open app
  const targetUrl = data.url || '/dashboard';
  
  // Check if app is already open
  for (const client of clients) {
    if (client.url.includes(self.location.origin)) {
      // Focus existing window and navigate
      await client.focus();
      client.postMessage({
        type: 'navigate',
        url: targetUrl
      });
      return;
    }
  }
  
  // Open new window
  await self.clients.openWindow(targetUrl);
}

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('Service Worker: Notification closed');
  
  const data = event.notification.data || {};
  
  // Send message to clients
  sendMessageToClients({
    type: 'notification-close',
    data
  });
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync event');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    console.log('Service Worker: Performing background sync');
    
    // Sync pending reminders
    await syncPendingReminders();
    
    // Sync notification settings
    await syncNotificationSettings();
    
    // Send message to clients
    sendMessageToClients({
      type: 'background-sync',
      status: 'completed'
    });
    
  } catch (error) {
    console.error('Background sync failed:', error);
    
    sendMessageToClients({
      type: 'background-sync',
      status: 'failed',
      error: error.message
    });
  }
}

async function syncPendingReminders() {
  // Get pending reminders from IndexedDB or cache
  // This would sync any offline-created reminders
  console.log('Syncing pending reminders...');
}

async function syncNotificationSettings() {
  // Sync notification preferences
  console.log('Syncing notification settings...');
}

// Message event - handle messages from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'skip-waiting':
      self.skipWaiting();
      break;
      
    case 'get-version':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
      
    case 'cache-reminder':
      cacheReminder(data);
      break;
      
    case 'clear-cache':
      clearAllCaches();
      break;
  }
});

// Utility functions
function sendMessageToClients(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message);
    });
  });
}

async function getStoredToken() {
  // Try to get token from cache or IndexedDB
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const response = await cache.match('/api/auth/token');
    if (response) {
      const data = await response.json();
      return data.token;
    }
  } catch (error) {
    console.error('Error getting stored token:', error);
  }
  return null;
}

async function cacheReminder(reminderData) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const response = new Response(JSON.stringify(reminderData), {
      headers: { 'Content-Type': 'application/json' }
    });
    await cache.put(`/offline/reminder/${reminderData.id}`, response);
  } catch (error) {
    console.error('Error caching reminder:', error);
  }
}

async function clearAllCaches() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('All caches cleared');
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'reminder-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Handle fetch errors gracefully
self.addEventListener('fetch', (event) => {
  // Only handle same-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    handleFetch(event.request)
  );
});

async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // For API requests, try network first
    if (url.pathname.startsWith('/api/')) {
      return await networkFirstStrategy(request);
    }
    
    // For static assets, try cache first
    if (isStaticAsset(url.pathname)) {
      return await cacheFirstStrategy(request);
    }
    
    // For HTML pages, try stale while revalidate
    if (isHTMLRequest(request)) {
      return await staleWhileRevalidateStrategy(request);
    }
    
    // Default to network first
    return await networkFirstStrategy(request);
    
  } catch (error) {
    console.error('Fetch handler error:', error);
    return await handleFetchError(request, error);
  }
}

async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && shouldCache(request)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

async function staleWhileRevalidateStrategy(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  return cachedResponse || fetchPromise;
}

async function handleFetchError(request, error) {
  console.error('Fetch failed:', error);
  
  // Try to serve from cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Return appropriate offline response
  if (isHTMLRequest(request)) {
    return await caches.match('/offline.html') || createOfflineResponse();
  }
  
  if (request.url.includes('/api/')) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Offline - request will be retried when online',
      offline: true
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Offline', { status: 503 });
}

function createOfflineResponse() {
  const offlineHTML = `
    <!DOCTYPE html>
    <html lang="fa" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>آفلاین - NOTIFAREF</title>
        <style>
            body {
                font-family: Tahoma, Arial, sans-serif;
                text-align: center;
                padding: 50px;
                background: #f5f5f5;
            }
            .offline-container {
                max-width: 500px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .offline-icon {
                font-size: 4rem;
                color: #6B7280;
                margin-bottom: 20px;
            }
            h1 { color: #1F2937; margin-bottom: 10px; }
            p { color: #6B7280; margin-bottom: 30px; }
            .btn {
                background: #4F46E5;
                color: white;
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
            }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <div class="offline-icon">📱</div>
            <h1>شما آفلاین هستید</h1>
            <p>لطفاً اتصال اینترنت خود را بررسی کنید</p>
            <button class="btn" onclick="window.location.reload()">تلاش مجدد</button>
        </div>
    </body>
    </html>
  `;
  
  return new Response(offlineHTML, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

function isHTMLRequest(request) {
  return request.headers.get('accept')?.includes('text/html');
}

function shouldCache(request) {
  const url = new URL(request.url);
  
  // Don't cache authentication requests
  if (url.pathname.includes('/auth/')) {
    return false;
  }
  
  // Cache GET requests for specific API endpoints
  return request.method === 'GET' && 
         API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname));
}

// Background fetch event (for large downloads)
self.addEventListener('backgroundfetch', (event) => {
  console.log('Background fetch event:', event.tag);
  
  if (event.tag === 'analytics-export') {
    event.waitUntil(handleAnalyticsExport(event));
  }
});

async function handleAnalyticsExport(event) {
  try {
    const registration = event.registration;
    
    registration.addEventListener('progress', () => {
      // Update progress if needed
      console.log('Export progress:', registration.downloaded, '/', registration.total);
    });
    
    if (registration.result === 'success') {
      // Show success notification
      await self.registration.showNotification('Export Complete', {
        body: 'Your analytics export is ready',
        icon: '/icons/icon-192x192.png',
        tag: 'export-complete'
      });
    }
  } catch (error) {
    console.error('Background fetch error:', error);
  }
}

// Handle updates
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Cleanup old data periodically
setInterval(async () => {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    const requests = await cache.keys();
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const dateHeader = response.headers.get('date');
        if (dateHeader) {
          const responseDate = new Date(dateHeader).getTime();
          if (now - responseDate > maxAge) {
            await cache.delete(request);
            console.log('Deleted old cache entry:', request.url);
          }
        }
      }
    }
  } catch (error) {
    console.error('Cache cleanup error:', error);
  }
}, 60 * 60 * 1000); // Run every hour

// IndexedDB for offline data storage
const DB_NAME = 'notifaref-offline';
const DB_VERSION = 1;

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create object stores
      if (!db.objectStoreNames.contains('reminders')) {
        const reminderStore = db.createObjectStore('reminders', { keyPath: 'id' });
        reminderStore.createIndex('status', 'status', { unique: false });
        reminderStore.createIndex('scheduledTime', 'scheduledTime', { unique: false });
      }
      
      if (!db.objectStoreNames.contains('sync-queue')) {
        db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

// Store reminder offline
async function storeReminderOffline(reminder) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['reminders'], 'readwrite');
    const store = transaction.objectStore('reminders');
    await store.put(reminder);
    console.log('Reminder stored offline:', reminder.id);
  } catch (error) {
    console.error('Error storing reminder offline:', error);
  }
}

// Get offline reminders
async function getOfflineReminders() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['reminders'], 'readonly');
    const store = transaction.objectStore('reminders');
    return await store.getAll();
  } catch (error) {
    console.error('Error getting offline reminders:', error);
    return [];
  }
}

// Queue action for sync
async function queueForSync(action) {
  try {
    const db = await openDB();
    const transaction = db.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    await store.add({
      action,
      timestamp: Date.now()
    });
    
    // Register background sync
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('background-sync');
    }
  } catch (error) {
    console.error('Error queuing for sync:', error);
  }
}

console.log('Service Worker: Loaded successfully');
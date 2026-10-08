// Tata App Custom Service Worker Extensions v5.2.0
// Handles offline-first background notifications, notification click routing,
// IndexedDB alarm persistence, Notification Triggers (TimestampTrigger),
// and Periodic Background Sync.

// Defensive Global Error & Rejection Handlers for Remote SW Diagnostics
self.addEventListener('error', (event) => {
  console.error('[Tata SW Error]:', event.error || event.message || event);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[Tata SW UnhandledRejection]:', event.reason || event);
});

console.log('[Tata SW] Custom service worker extension loaded (v5.2.0)');

const DB_NAME = 'tata_offline_pwa_alarms';
const DB_VERSION = 1;
const STORE_NAME = 'alarms';
let activeAlarmTimer = null;

// 1. IndexedDB Helper for Service Worker & Background Persistence
function openAlarmsDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveAlarmsToDB(alarms) {
  try {
    const db = await openAlarmsDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Clear old items first
    await new Promise((res, rej) => {
      const clearReq = store.clear();
      clearReq.onsuccess = res;
      clearReq.onerror = rej;
    });

    if (Array.isArray(alarms) && alarms.length > 0) {
      for (const alarm of alarms) {
        store.put(alarm);
      }
    }

    await new Promise((res, rej) => {
      tx.oncomplete = res;
      tx.onerror = rej;
    });
  } catch (e) {
    // Fallback to cache storage if IndexedDB fails
    await saveAlarmsToCacheFallback(alarms);
  }
}

async function getAlarmsFromDB() {
  try {
    const db = await openAlarmsDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return await new Promise((resolve) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return await getAlarmsFromCacheFallback();
  }
}

async function removeAlarmFromDB(alarmId) {
  try {
    const db = await openAlarmsDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(alarmId);
    await new Promise((res) => { tx.oncomplete = res; tx.onerror = res; });
  } catch (e) {}
}

// Fallback Cache Storage
async function saveAlarmsToCacheFallback(alarms) {
  try {
    const cache = await caches.open('tata-alarms-v2');
    const response = new Response(JSON.stringify(alarms || []));
    await cache.put('/api-local/alarms.json', response);
  } catch (e) {}
}

async function getAlarmsFromCacheFallback() {
  try {
    const cache = await caches.open('tata-alarms-v2');
    const response = await cache.match('/api-local/alarms.json');
    if (response) return await response.json();
  } catch (e) {}
  return [];
}

// 2. Notification Click Handler - opens or focuses Tata app when notification is clicked
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const action = event.action;

  // Handle Snooze action directly from phone lockscreen / banner
  if (action === 'snooze') {
    event.waitUntil((async () => {
      const snoozeTime = Date.now() + 5 * 60 * 1000;
      const snoozedAlarm = {
        id: `snooze_${Date.now()}`,
        title: `⏱️ ${event.notification.title || 'Pengingat Tata'}`,
        body: `[Ditunda 5 Menit] ${event.notification.body || ''}`,
        targetTime: snoozeTime,
        targetScreen: data.targetScreen || 'tasks',
        targetId: data.targetId
      };
      await saveAlarmsToDB([snoozedAlarm]);
      scheduleNextAlarmTimeout([snoozedAlarm]);
    })());
    return;
  }

  const targetUrl = data.url || (data.targetScreen ? `/?screen=${data.targetScreen}` : '/');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Focus existing window if open
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url && 'focus' in client) {
          if (data.targetScreen) {
            client.postMessage({
              type: 'NAVIGATE_FROM_NOTIFICATION',
              targetScreen: data.targetScreen,
              targetId: data.targetId
            });
          }
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// 3. Periodic Background Sync Handler (Supported on Android Chromium PWAs)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'tata-alarm-check' || event.tag === 'tata-reminders' || event.tag.startsWith('tata-')) {
    event.waitUntil(checkPendingAlarms());
  }
});

// 4. Background Sync Handler (One-off sync event when connectivity/system triggers)
self.addEventListener('sync', (event) => {
  if (event.tag === 'tata-alarm-sync' || event.tag === 'tata-alarm-check' || event.tag.startsWith('tata-')) {
    event.waitUntil(checkPendingAlarms());
  }
});

// 5. Service Worker Activation - Claim clients and check alarms
self.addEventListener('activate', (event) => {
  event.waitUntil(
    self.clients.claim().then(() => checkPendingAlarms())
  );
});

// 6. Message Listener from App
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SYNC_ALARMS') {
    event.waitUntil(
      (async () => {
        const alarms = event.data.alarms || [];
        await saveAlarmsToDB(alarms);
        scheduleNextAlarmTimeout(alarms);
        scheduleNotificationTriggers(alarms);
      })()
    );
  } else if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data;
    event.waitUntil(
      self.registration.showNotification(title || 'Tata', {
        body: options?.body || '',
        icon: options?.icon || '/icon.png',
        badge: options?.badge || '/icon.png',
        vibrate: options?.vibrate || [200, 100, 200],
        data: options?.data || {},
        tag: options?.tag || `tata_${Date.now()}`,
        requireInteraction: options?.requireInteraction || false
      })
    );
  } else if (event.data.type === 'SCHEDULE_TEST_NOTIFICATION') {
    // Schedule a test notification 5 seconds from now to verify background notifications
    const delay = event.data.delay || 5000;
    const title = event.data.title || 'Uji Notifikasi Latar Belakang Tata 🔔';
    const body = event.data.body || 'Hebat! Notifikasi Tata berhasil muncul saat kamu tidak membuka aplikasi.';
    
    event.waitUntil(
      new Promise((resolve) => {
        setTimeout(async () => {
          try {
            await self.registration.showNotification(title, {
              body: body,
              icon: '/icon.png',
              badge: '/icon.png',
              vibrate: [300, 100, 300, 100, 300],
              tag: 'tata_test_bg_notif',
              requireInteraction: true,
              data: { url: '/', targetScreen: 'settings' }
            });
          } catch (e) {}
          resolve();
        }, delay);
      })
    );
  } else if (event.data.type === 'CHECK_PENDING_ALARMS') {
    event.waitUntil(checkPendingAlarms());
  }
});

// 7. Schedule Notification Triggers API (Chromium experimental/PWA capability)
async function scheduleNotificationTriggers(alarms) {
  try {
    if (typeof Notification === 'undefined' || !('showTrigger' in Notification.prototype)) {
      return;
    }
    const TimestampTriggerClass = (self).TimestampTrigger;
    if (!TimestampTriggerClass) return;

    const now = Date.now();
    for (const alarm of alarms) {
      if (alarm.targetTime && alarm.targetTime > now && (alarm.targetTime - now) < 7 * 24 * 60 * 60 * 1000) {
        try {
          await self.registration.showNotification(alarm.title || 'Pengingat Tata', {
            body: alarm.body || 'Waktunya menyelesaikan jadwal kamu di Tata.',
            icon: '/icon.png',
            badge: '/icon.png',
            vibrate: [200, 100, 200],
            tag: `tata_trigger_${alarm.id}`,
            showTrigger: new TimestampTriggerClass(alarm.targetTime),
            data: {
              targetScreen: alarm.targetScreen,
              targetId: alarm.targetId,
              url: '/'
            }
          });
        } catch (e) {}
      }
    }
  } catch (e) {}
}

// 8. Service Worker Active Timer (For upcoming alarms within next 30 minutes while SW is alive)
function scheduleNextAlarmTimeout(alarms) {
  if (activeAlarmTimer) {
    clearTimeout(activeAlarmTimer);
    activeAlarmTimer = null;
  }

  if (!alarms || !alarms.length) return;

  const now = Date.now();
  // Find nearest upcoming alarm
  const futureAlarms = alarms
    .filter(a => a.targetTime && a.targetTime > now)
    .sort((a, b) => a.targetTime - b.targetTime);

  if (futureAlarms.length === 0) return;

  const nextAlarm = futureAlarms[0];
  const delay = nextAlarm.targetTime - now;

  // If next alarm is within 30 minutes, set a timer to trigger it
  if (delay > 0 && delay <= 30 * 60 * 1000) {
    activeAlarmTimer = setTimeout(async () => {
      try {
        await self.registration.showNotification(nextAlarm.title || 'Pengingat Tata', {
          body: nextAlarm.body || 'Waktunya menyelesaikan jadwal kamu di Tata.',
          icon: '/icon.png',
          badge: '/icon.png',
          vibrate: [300, 100, 300, 100, 300],
          tag: `tata_sw_${nextAlarm.id}`,
          requireInteraction: true,
          actions: [
            { action: 'open', title: 'Buka Tata' },
            { action: 'snooze', title: 'Tunda 5m' }
          ],
          data: {
            targetScreen: nextAlarm.targetScreen,
            targetId: nextAlarm.targetId,
            url: '/'
          }
        });
        await removeAlarmFromDB(nextAlarm.id);
        // Check for remaining alarms
        checkPendingAlarms();
      } catch (e) {}
    }, delay);
  }
}

// 9. Check Pending Alarms Logic
async function checkPendingAlarms() {
  try {
    const alarms = await getAlarmsFromDB();
    if (!alarms || !alarms.length) return;

    const now = Date.now();
    const remainingAlarms = [];

    for (const alarm of alarms) {
      // If alarm is due within past 20 minutes (or right now)
      if (alarm.targetTime && alarm.targetTime <= now && (now - alarm.targetTime) < 20 * 60 * 1000) {
        try {
          await self.registration.showNotification(alarm.title || 'Pengingat Tata', {
            body: alarm.body || 'Waktunya menyelesaikan jadwal kamu di Tata.',
            icon: '/icon.png',
            badge: '/icon.png',
            vibrate: [300, 100, 300, 100, 300],
            tag: `tata_pending_${alarm.id}`,
            requireInteraction: true,
            actions: [
              { action: 'open', title: 'Buka Tata' },
              { action: 'snooze', title: 'Tunda 5m' }
            ],
            data: {
              targetScreen: alarm.targetScreen,
              targetId: alarm.targetId,
              url: '/'
            }
          });
        } catch (e) {}
      } else if (alarm.targetTime && alarm.targetTime > now) {
        remainingAlarms.push(alarm);
      }
    }

    await saveAlarmsToDB(remainingAlarms);
    scheduleNextAlarmTimeout(remainingAlarms);
  } catch (e) {}
}

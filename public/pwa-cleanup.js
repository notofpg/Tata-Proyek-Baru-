/**
 * PWA Cleanup Script
 * Runs on every page load to clear stale caches and service worker registrations
 * This helps ensure users can reinstall the PWA after uninstalling
 * 
 * Include in index.html BEFORE any other scripts
 */

(function() {
  'use strict';
  
  if (typeof window === 'undefined' || typeof caches === 'undefined') {
    return;
  }

  // ✅ Clear all old/stale caches on every load
  async function cleanupCaches() {
    try {
      const cacheNames = await caches.keys();
      const now = Date.now();
      
      for (const name of cacheNames) {
        // Keep only recent caches (not older than 7 days)
        // Format: cache-name-TIMESTAMP
        const match = name.match(/(\d+)$/);
        if (match) {
          const timestamp = parseInt(match[1]);
          if (now - timestamp > 7 * 24 * 60 * 60 * 1000) {
            await caches.delete(name);
            console.log('[PWA Cleanup] Deleted old cache:', name);
          }
        }
      }
    } catch (err) {
      console.warn('[PWA Cleanup] Cache cleanup failed:', err);
    }
  }

  // ✅ Unregister all but the latest service worker
  async function cleanupServiceWorkers() {
    try {
      if (!('serviceWorker' in navigator)) return;
      
      const registrations = await navigator.serviceWorker.getRegistrations();
      if (registrations.length > 1) {
        console.log('[PWA Cleanup] Found multiple SW registrations, cleaning up...');
        for (let i = 0; i < registrations.length - 1; i++) {
          await registrations[i].unregister();
          console.log('[PWA Cleanup] Unregistered stale SW');
        }
      }
    } catch (err) {
      console.warn('[PWA Cleanup] SW cleanup failed:', err);
    }
  }

  // ✅ Run cleanup
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      cleanupCaches();
      cleanupServiceWorkers();
    });
  } else {
    cleanupCaches();
    cleanupServiceWorkers();
  }
})();

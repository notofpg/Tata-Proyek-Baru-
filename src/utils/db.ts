export async function getDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB is unavailable in this browser context.');
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export async function preloadLargeItems(): Promise<{ success: boolean; migratedCount: number; error?: any }> {
  try {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      setStorageHydrated(true);
      return { success: true, migratedCount: 0 };
    }

    requestPersistentStorage().catch(() => {});

    const db = await getDB();
    let migratedCount = 0;

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      let completed = 0;
      const total = LARGE_STORAGE_KEYS.length;

      const finishKey = () => {
        completed++;
        if (completed === total) {
          resolve();
        }
      };

      for (const key of LARGE_STORAGE_KEYS) {
        const request = store.get(key);

        request.onsuccess = () => {
          let val = request.result;
          if (val) {
            memoryCache[key] = val;
            if (hasMeaningfulValue(val)) {
              existingDataKeys.add(key);
            }
            finishKey();
          } else {
            const legacyKey = LEGACY_STORAGE_MAP[key];
            if (legacyKey) {
              const legacyReq = store.get(legacyKey);
              legacyReq.onsuccess = () => {
                if (legacyReq.result) {
                  val = legacyReq.result;
                  memoryCache[key] = val;
                  if (hasMeaningfulValue(val)) {
                    existingDataKeys.add(key);
                  }
                  store.put(val, key);
                  migratedCount++;
                  finishKey();
                  return;
                }
                checkAndMigrateFromLocalStorage(key, legacyKey, store, finishKey);
              };
              legacyReq.onerror = () => {
                checkAndMigrateFromLocalStorage(key, legacyKey, store, finishKey);
              };
            } else {
              checkAndMigrateFromLocalStorage(key, undefined, store, finishKey);
            }
          }
        };

        request.onerror = (e) => {
          console.warn(`[Tata Storage] IndexedDB get error for "${key}":`, e);
          const legacyKey = LEGACY_STORAGE_MAP[key];
          checkAndMigrateFromLocalStorage(key, legacyKey, store, finishKey);
        };
      }

      transaction.onerror = (e) => {
        console.error('[Tata Storage] Transaction error during preload:', e);
        reject(e);
      };
    });

    setStorageHydrated(true);
    return { success: true, migratedCount };
  } catch (e) {
    console.warn('[Tata Storage] IndexedDB preload unavailable, continuing in degraded storage mode:', e);
    setStorageHydrated(true);
    return { success: true, migratedCount: 0, error: e };
  }
}

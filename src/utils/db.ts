const DB_NAME = 'TataLargeStorage';
const DB_VERSION = 1;
const STORE_NAME = 'large_items';

const memoryCache: Record<string, string> = {};
const existingDataKeys = new Set<string>();
let isStorageHydratedGlobally = false;

export function isStorageHydrated(): boolean {
  return isStorageHydratedGlobally;
}

export function setStorageHydrated(val: boolean): void {
  isStorageHydratedGlobally = val;
}

export const LARGE_STORAGE_KEYS = [
  'tata_notes',
  'tata_tasks',
  'tata_transactions',
  'tata_moods',
  'tata_debts',
  'tata_savings_goals',
  'tata_user',
  'user_avatar',
  'tata_custom_wallpaper',
  'tata_banner_wallpaper'
] as const;

export const LEGACY_STORAGE_MAP: Record<string, string> = {
  'tata_notes': 'noto_notes',
  'tata_tasks': 'noto_tasks',
  'tata_transactions': 'noto_transactions',
  'tata_moods': 'noto_moods',
  'tata_debts': 'noto_debts',
  'tata_savings_goals': 'noto_savings_goals',
  'tata_user': 'noto_user',
  'tata_custom_wallpaper': 'noto_custom_wallpaper',
  'tata_banner_wallpaper': 'noto_banner_wallpaper'
};

function getDB(): Promise<IDBDatabase> {
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

export async function setLargeItem(key: string, value: string): Promise<void> {
  // Aturan 2 & 3: Auto-save dan penulisan data besar DILARANG sebelum hydration selesai
  if (!isStorageHydratedGlobally) {
    console.warn(`[Tata Storage] Menolak penulisan "${key}" karena storage belum di-hidrasi.`);
    return;
  }

  // Aturan 3: Jangan menimpa data IndexedDB yang ada dengan data kosong saat status tidak aman
  if ((value === '[]' || value === '{}' || !value) && existingDataKeys.has(key) && !isStorageHydratedGlobally) {
    console.warn(`[Tata Storage] Mencegah penulisan data kosong pada "${key}" untuk melindungi data asli.`);
    return;
  }

  memoryCache[key] = value;
  if (value && value !== '[]' && value !== '{}') {
    existingDataKeys.add(key);
  }

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  // Aturan 6: Hapus salinan lama di localStorage HANYA setelah penulisan ke IndexedDB berhasil ditunggu!
  if (value.length > 500000 && typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(key);
      const legacyKey = LEGACY_STORAGE_MAP[key];
      if (legacyKey) localStorage.removeItem(legacyKey);
    } catch (e) {}
  }
}

export async function getLargeItem(key: string): Promise<string | null> {
  if (memoryCache[key]) return memoryCache[key];
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        if (request.result) memoryCache[key] = request.result;
        resolve(request.result || null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB get error:", e);
    return null;
  }
}

export function getLargeItemSync(key: string): string | null {
  return memoryCache[key] || null;
}

export async function deleteLargeItem(key: string): Promise<void> {
  delete memoryCache[key];
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAllLargeItemsByPrefix(prefix: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.openCursor();
      request.onsuccess = (e: any) => {
        const cursor = e.target.result;
        if (cursor) {
          const key = String(cursor.key);
          if (key.startsWith(prefix)) {
            result[key] = cursor.value;
            memoryCache[key] = cursor.value;
          }
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      request.onerror = () => resolve(result);
    });
  } catch (e) {
    console.error("IndexedDB getAllLargeItemsByPrefix error:", e);
    return result;
  }
}

export async function setManyLargeItems(items: Record<string, string>): Promise<void> {
  const keys = Object.keys(items);
  if (keys.length === 0) return;
  for (const k of keys) {
    memoryCache[k] = items[k];
  }
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      for (const k of keys) {
        store.put(items[k], k);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (e) {
    console.error("IndexedDB setManyLargeItems error:", e);
  }
}

export async function clearAllLargeItems(): Promise<void> {
  // Clear memory cache completely
  for (const key of Object.keys(memoryCache)) {
    delete memoryCache[key];
  }
  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error("IndexedDB clear error:", e);
  }

  // Attempt to delete entire database as extra safeguard
  try {
    indexedDB.deleteDatabase(DB_NAME);
  } catch (e) {
    console.error("IndexedDB delete database error:", e);
  }
}

/**
 * Meminta browser untuk mengunci database IndexedDB agar tidak dihapus otomatis
 * saat memori penyimpanan HP hampir penuh (Storage Eviction Protection).
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.storage || !navigator.storage.persist) {
    return false;
  }
  try {
    const isAlreadyPersisted = await navigator.storage.persisted?.();
    if (isAlreadyPersisted) {
      return true;
    }
    const granted = await navigator.storage.persist();
    if (granted) {
      console.log('[Tata Storage] Persistent storage protection activated.');
    }
    return granted;
  } catch (err) {
    console.warn('[Tata Storage] Persistent storage request notice:', err);
    return false;
  }
}

export async function preloadLargeItems(): Promise<{ success: boolean; migratedCount: number; error?: any }> {
  try {
    // Request persistent storage protection asynchronously
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
            if (val !== '[]' && val !== '{}') {
              existingDataKeys.add(key);
            }
            finishKey();
          } else {
            // Cek legacy key di IndexedDB
            const legacyKey = LEGACY_STORAGE_MAP[key];
            if (legacyKey) {
              const legacyReq = store.get(legacyKey);
              legacyReq.onsuccess = () => {
                if (legacyReq.result) {
                  val = legacyReq.result;
                  memoryCache[key] = val;
                  if (val !== '[]' && val !== '{}') {
                    existingDataKeys.add(key);
                  }
                  store.put(val, key);
                  migratedCount++;
                  finishKey();
                  return;
                }
                // Aturan 5: Jika tidak ada di IndexedDB, cari di localStorage lama
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
        console.error("[Tata Storage] Transaction error during preload:", e);
        reject(e);
      };
    });

    setStorageHydrated(true);
    return { success: true, migratedCount };
  } catch (e) {
    console.error("[Tata Storage] IndexedDB preload error:", e);
    return { success: false, migratedCount: 0, error: e };
  }
}

function checkAndMigrateFromLocalStorage(
  key: string,
  legacyKey: string | undefined,
  store: IDBObjectStore,
  onDone: () => void
) {
  try {
    let localVal: string | null = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localVal = localStorage.getItem(key);
      if (!localVal && legacyKey) {
        localVal = localStorage.getItem(legacyKey);
      }
    }

    if (localVal) {
      memoryCache[key] = localVal;
      if (localVal !== '[]' && localVal !== '{}') {
        existingDataKeys.add(key);
      }
      // Pindahkan ke IndexedDB (Aturan 5)
      const putReq = store.put(localVal, key);
      putReq.onsuccess = () => {
        // Aturan 6: Hapus salinan lama di localStorage HANYA setelah penulisan ke IndexedDB berhasil ditunggu
        if (localVal && localVal.length > 500000 && typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.removeItem(key);
            if (legacyKey) localStorage.removeItem(legacyKey);
          } catch(err) {}
        }
        onDone();
      };
      putReq.onerror = () => {
        onDone();
      };
      return;
    }
  } catch (err) {
    console.warn(`[Tata Storage] LocalStorage migration error for "${key}":`, err);
  }
  onDone();
}

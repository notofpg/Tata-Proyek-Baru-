const DB_NAME = 'TataLargeStorage';
const DB_VERSION = 1;
const STORE_NAME = 'large_items';

const memoryCache: Record<string, string> = {};
const existingDataKeys = new Set<string>();
let isStorageHydratedGlobally = false;

function hasMeaningfulValue(value: string | null | undefined): boolean {
  if (typeof value !== 'string') return !!value;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed !== '[]' && trimmed !== '{}';
}

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
  const normalizedValue = typeof value === 'string' ? value : String(value ?? '');

  memoryCache[key] = normalizedValue;
  if (hasMeaningfulValue(normalizedValue)) {
    existingDataKeys.add(key);
  }

  if (!isStorageHydratedGlobally) {
    console.warn(`[Tata Storage] Menolak penulisan "${key}" ke IndexedDB karena storage belum di-hidrasi, namun cache memori telah diperbarui.`);
    return;
  }

  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(normalizedValue, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });

  if (hasMeaningfulValue(normalizedValue) && normalizedValue.length > 500000 && typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.removeItem(key);
      const legacyKey = LEGACY_STORAGE_MAP[key];
      if (legacyKey) localStorage.removeItem(legacyKey);
    } catch (e) {
      console.warn(`[Tata Storage] Gagal membersihkan localStorage legacy untuk "${key}"`, e);
    }
  }
}

export async function getLargeItem(key: string): Promise<string | null> {
  if (Object.prototype.hasOwnProperty.call(memoryCache, key) && memoryCache[key] !== undefined) {
    return memoryCache[key];
  }

  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result ?? null;
        if (result !== null) memoryCache[key] = result;
        resolve(result);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.error('IndexedDB get error:', e);
    return null;
  }
}

export function getLargeItemSync(key: string): string | null {
  if (Object.prototype.hasOwnProperty.call(memoryCache, key)) {
    return memoryCache[key] ?? null;
  }
  return null;
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
    console.error('IndexedDB getAllLargeItemsByPrefix error:', e);
    return result;
  }
}

export async function setManyLargeItems(items: Record<string, string>): Promise<void> {
  const keys = Object.keys(items);
  if (keys.length === 0) return;
  for (const k of keys) {
    memoryCache[k] = items[k];
    if (hasMeaningfulValue(items[k])) {
      existingDataKeys.add(k);
    }
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
    console.error('IndexedDB setManyLargeItems error:', e);
  }
}

export async function clearAllLargeItems(): Promise<void> {
  for (const key of Object.keys(memoryCache)) {
    delete memoryCache[key];
  }
  existingDataKeys.clear();

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
    console.error('IndexedDB clear error:', e);
  }

  try {
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase(DB_NAME);
    }
  } catch (e) {
    console.warn('IndexedDB delete database warning:', e);
  }
}

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
    console.error('[Tata Storage] IndexedDB preload error:', e);
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
      if (hasMeaningfulValue(localVal)) {
        existingDataKeys.add(key);
      }
      const putReq = store.put(localVal, key);
      putReq.onsuccess = () => {
        if (localVal && localVal.length > 500000 && typeof window !== 'undefined' && window.localStorage) {
          try {
            localStorage.removeItem(key);
            if (legacyKey) localStorage.removeItem(legacyKey);
          } catch (err) {
            console.warn(`[Tata Storage] LocalStorage cleanup error for "${key}":`, err);
          }
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

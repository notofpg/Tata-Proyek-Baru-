const DB_NAME = 'tata-large-storage';
const DB_VERSION = 1;
const STORE_NAME = 'large_items';

const LARGE_STORAGE_KEYS: string[] = [];
const LEGACY_STORAGE_MAP: Record<string, string> = {};
const memoryCache: Record<string, any> = {};
const existingDataKeys = new Set<string>();

let storageHydrated = false;

export function setStorageHydrated(value: boolean): void {
  storageHydrated = value;
}

export function isStorageHydrated(): boolean {
  return storageHydrated;
}

export function hasMeaningfulValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
  return true;
}

export async function requestPersistentStorage(): Promise<void> {
  if (typeof navigator === 'undefined' || !('storage' in navigator) || !navigator.storage?.persist) {
    return;
  }

  try {
    await navigator.storage.persist();
  } catch (error) {
    console.warn('[Tata Storage] Persistent storage request failed:', error);
  }
}

export function checkAndMigrateFromLocalStorage(
  key: string,
  legacyKey: string | undefined,
  store: IDBObjectStore,
  done: () => void
): void {
  if (typeof window === 'undefined') {
    done();
    return;
  }

  const sourceKey = legacyKey || key;
  const raw = window.localStorage.getItem(sourceKey);

  if (!raw) {
    done();
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    memoryCache[key] = parsed;
    if (hasMeaningfulValue(parsed)) {
      existingDataKeys.add(key);
    }

    store.put(parsed, key);
    window.localStorage.removeItem(sourceKey);
  } catch (error) {
    console.warn(`[Tata Storage] Failed to migrate value for "${key}":`, error);
  }

  done();
}

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

export async function getLargeItem<T = any>(key: string): Promise<T | null> {
  if (Object.prototype.hasOwnProperty.call(memoryCache, key)) {
    return memoryCache[key] as T;
  }

  if (typeof indexedDB === 'undefined') {
    return null;
  }

  try {
    const db = await getDB();
    const value = await new Promise<T | null>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve((request.result ?? null) as T | null);
      request.onerror = () => reject(request.error);
    });

    if (value !== null && value !== undefined) {
      memoryCache[key] = value;
    }

    return value;
  } catch (error) {
    console.warn(`[Tata Storage] Failed to read "${key}" from IndexedDB:`, error);
    return null;
  }
}

export function getLargeItemSync<T = any>(key: string): T | null {
  if (Object.prototype.hasOwnProperty.call(memoryCache, key)) {
    return memoryCache[key] as T;
  }

  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as T;
    memoryCache[key] = parsed;
    return parsed;
  } catch (error) {
    console.warn(`[Tata Storage] Failed to parse sync value for "${key}":`, error);
    return null;
  }
}

export async function setLargeItem(key: string, value: any): Promise<void> {
  memoryCache[key] = value;
  existingDataKeys.add(key);

  if (typeof indexedDB === 'undefined') {
    return;
  }

  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn(`[Tata Storage] Failed to save "${key}" to IndexedDB:`, error);
  }
}

export async function deleteLargeItem(key: string): Promise<void> {
  delete memoryCache[key];
  existingDataKeys.delete(key);

  if (typeof indexedDB === 'undefined') {
    return;
  }

  try {
    const db = await getDB();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn(`[Tata Storage] Failed to delete "${key}" from IndexedDB:`, error);
  }
}

export async function clearAllLargeItems(): Promise<void> {
  Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);
  existingDataKeys.clear();

  if (typeof indexedDB === 'undefined') {
    return;
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
  } catch (error) {
    console.warn('[Tata Storage] Failed to clear IndexedDB large items:', error);
  }
}

export function getAllLargeItemsByPrefix(prefix: string): Record<string, any> {
  const result: Record<string, any> = {};

  Object.entries(memoryCache).forEach(([key, value]) => {
    if (key.startsWith(prefix)) {
      result[key] = value;
    }
  });

  return result;
}

export async function setManyLargeItems(entries: Array<[string, any]>): Promise<void> {
  for (const [key, value] of entries) {
    await setLargeItem(key, value);
  }
}

export async function preloadLargeItems(): Promise<{ success: boolean; migratedCount: number; error?: any }> {
  try {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      setStorageHydrated(true);
      return { success: true, migratedCount: 0 };
    }

    await requestPersistentStorage();

    const db = await getDB();
    let migratedCount = 0;

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      let completed = 0;
      const total = LARGE_STORAGE_KEYS.length || 0;

      if (total === 0) {
        resolve();
        return;
      }

      const finishKey = () => {
        completed += 1;
        if (completed >= total) {
          resolve();
        }
      };

      for (const key of LARGE_STORAGE_KEYS) {
        const request = store.get(key);

        request.onsuccess = () => {
          let value = request.result;
          if (value) {
            memoryCache[key] = value;
            if (hasMeaningfulValue(value)) {
              existingDataKeys.add(key);
            }
            finishKey();
            return;
          }

          const legacyKey = LEGACY_STORAGE_MAP[key];
          if (legacyKey) {
            checkAndMigrateFromLocalStorage(key, legacyKey, store, finishKey);
            return;
          }

          finishKey();
        };

        request.onerror = (event) => {
          console.warn(`[Tata Storage] IndexedDB get error for "${key}":`, event);
          const legacyKey = LEGACY_STORAGE_MAP[key];
          checkAndMigrateFromLocalStorage(key, legacyKey, store, finishKey);
        };
      }

      transaction.onerror = (event) => {
        console.error('[Tata Storage] Transaction error during preload:', event);
        reject(event);
      };
    });

    setStorageHydrated(true);
    return { success: true, migratedCount };
  } catch (error) {
    console.warn('[Tata Storage] IndexedDB preload unavailable, continuing in degraded storage mode:', error);
    setStorageHydrated(true);
    return { success: true, migratedCount: 0, error };
  }
}

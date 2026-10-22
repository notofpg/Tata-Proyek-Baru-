export const storageAvailable = (): boolean => {
  try {
    if (typeof window === 'undefined') return false;
    const testKey = '__tata_storage_check__';
    window.localStorage.setItem(testKey, testKey);
    window.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const readJsonSafe = <T>(key: string, fallback: T): T => {
  try {
    if (!storageAvailable()) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch (error) {
    console.warn(`[Tata Storage] Invalid JSON for key "${key}":`, error);
    return fallback;
  }
};

export const writeJsonSafe = <T>(key: string, value: T): boolean => {
  try {
    if (!storageAvailable()) return false;
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[Tata Storage] Failed to write JSON for key "${key}":`, error);
    return false;
  }
};

export const removeMatchingKeys = (prefix: string): number => {
  if (!storageAvailable()) return 0;

  const keysToRemove: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key && key.startsWith(prefix)) keysToRemove.push(key);
  }

  keysToRemove.forEach((key) => {
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`[Tata Storage] Failed to remove key "${key}":`, error);
    }
  });

  return keysToRemove.length;
};

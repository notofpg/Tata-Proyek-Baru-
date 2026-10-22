export const safeReadStorage = (key: string): string | null => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`[Tata Storage] Gagal membaca key "${key}":`, error);
    return null;
  }
};

export const safeWriteStorage = (key: string, value: string): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(key, value);
  } catch (error: any) {
    const quotaError = error?.name === 'QuotaExceededError' || error?.code === 22 || error?.number === -2147024882;
    if (quotaError) {
      console.warn(`[Tata Storage] localStorage quota reached for "${key}". Menjaga data utama di IndexedDB.`);
      return;
    }
    console.warn(`[Tata Storage] Gagal menyimpan key "${key}":`, error);
  }
};

export const safeRemoveStorage = (key: string): void => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Tata Storage] Gagal menghapus key "${key}":`, error);
  }
};

export const safeStorageClear = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key) keys.push(key);
  }
  keys.forEach((key) => safeRemoveStorage(key));
};

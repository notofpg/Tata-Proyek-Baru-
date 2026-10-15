import { setLargeItem, getLargeItem, deleteLargeItem, getLargeItemSync } from './db';
import { DisciplineMediaItem } from '../types';

/**
 * Generates a unique ID for media item
 */
export function generateMediaId(): string {
  return `disc_med_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format bytes into human readable format (KB / MB)
 */
export function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Legacy stub for duration formatter (kept for type compatibility)
 */
export function formatDuration(seconds?: number): string {
  return '00:00';
}

/**
 * Compress an image File or Blob into an optimized JPEG DataURL (1280x1280 max, 0.82 quality)
 * Prevents memory and quota issues while preserving crystal-clear detail
 */
export function compressImageFileToDataUrl(
  file: File | Blob,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (!width || !height) {
          resolve(e.target?.result as string || '');
          return;
        }

        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
            return;
          } catch (err) {
            console.warn('Canvas toDataURL failed:', err);
          }
        }
        resolve(e.target?.result as string || '');
      };
      img.onerror = () => resolve(e.target?.result as string || '');
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Create a lightweight thumbnail (400x400 max, 0.75 quality, ~20-30KB)
 * for lightning-fast gallery grid rendering
 */
export function createImageThumbnail(
  file: File | Blob,
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.75
): Promise<string> {
  return compressImageFileToDataUrl(file, maxWidth, maxHeight, quality);
}

/**
 * Process and save an uploaded photo safely into IndexedDB with instant thumbnail caching
 * Video upload is strictly disabled.
 */
export async function processAndSaveDisciplineMedia(
  file: File,
  category: 'before' | 'after' | 'milestone_1m' | 'milestone_6m' | 'milestone_1y' | 'custom' = 'before',
  caption?: string
): Promise<DisciplineMediaItem> {
  if (file.type.startsWith('video/')) {
    throw new Error('Penyimpanan video telah dinonaktifkan. Silakan gunakan foto.');
  }

  const id = generateMediaId();
  const dbKey = `tata_disc_media_${id}`;

  // 1. Compress main photo safely to max 1280px (crisp, optimal offline storage size ~150-250KB)
  const compressedDataUrl = await compressImageFileToDataUrl(file, 1280, 1280, 0.82);
  
  // 2. Generate fast thumbnail for instantaneous grid display
  const thumbnailUrl = await createImageThumbnail(file, 380, 380, 0.70);

  // 3. Save compressed image into IndexedDB large storage
  try {
    await setLargeItem(dbKey, compressedDataUrl);
  } catch (err) {
    console.error('Failed to write to IndexedDB:', err);
  }

  const mediaItem: DisciplineMediaItem = {
    id,
    name: file.name,
    type: 'image',
    url: `indexeddb:${dbKey}`,
    thumbnailUrl: thumbnailUrl || compressedDataUrl,
    createdAt: new Date().toISOString(),
    caption: caption || '',
    category,
    size: Math.round(compressedDataUrl.length * 0.75)
  };

  return mediaItem;
}

/**
 * Resolve media URL from IndexedDB (supports cached memory & fallback)
 */
export async function resolveDisciplineMediaUrl(url: string): Promise<string> {
  if (!url) return '';
  if (url.startsWith('indexeddb:')) {
    const key = url.replace('indexeddb:', '');
    const syncCached = getLargeItemSync(key);
    if (syncCached) return syncCached;
    const dbValue = await getLargeItem(key);
    return dbValue || '';
  }
  return url;
}

/**
 * Delete a media item and its corresponding IndexedDB record
 */
export async function deleteDisciplineMediaItem(item: DisciplineMediaItem): Promise<void> {
  if (item.url && item.url.startsWith('indexeddb:')) {
    const key = item.url.replace('indexeddb:', '');
    await deleteLargeItem(key);
  }
}

/**
 * Reliably download a discipline media file using Blob ObjectURL
 */
export async function downloadDisciplineMedia(url: string, filename: string): Promise<boolean> {
  try {
    const resolved = await resolveDisciplineMediaUrl(url);
    if (!resolved) return false;

    if (resolved.startsWith('data:')) {
      const parts = resolved.split(',');
      const match = parts[0].match(/:(.*?);/);
      const mime = match ? match[1] : 'application/octet-stream';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mime });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      return true;
    }

    const a = document.createElement('a');
    a.href = resolved;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error('Download failed:', err);
    return false;
  }
}

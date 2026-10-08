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
 * Format video duration into MM:SS
 */
export function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Create a crisp, high-resolution thumbnail from an image file / dataUrl
 */
export function createImageThumbnail(file: File | Blob, maxWidth = 800, maxHeight = 800, quality = 0.85): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

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
            // fallback
          }
        }
        resolve(e.target?.result as string);
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Extract snapshot frame and duration from a video file
 */
export function createVideoThumbnailAndDuration(file: File): Promise<{ thumbnailUrl: string; duration: number }> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const objectUrl = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;

    const timeout = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      resolve({ thumbnailUrl: '', duration: 0 });
    }, 8000);

    video.onloadedmetadata = () => {
      const duration = video.duration || 0;
      // Seek to 0.5s or 10% of duration to get a good frame
      video.currentTime = Math.min(Math.max(0.5, duration * 0.1), 5);
    };

    video.onseeked = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement('canvas');
        const maxWidth = 720;
        let width = video.videoWidth || 720;
        let height = video.videoHeight || 480;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, width, height);
          const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.85);
          URL.revokeObjectURL(objectUrl);
          resolve({ thumbnailUrl, duration: video.duration || 0 });
          return;
        }
      } catch (err) {
        console.warn('Video thumbnail capture failed:', err);
      }
      URL.revokeObjectURL(objectUrl);
      resolve({ thumbnailUrl: '', duration: video.duration || 0 });
    };

    video.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(objectUrl);
      resolve({ thumbnailUrl: '', duration: video.duration || 0 });
    };
  });
}

/**
 * Process and save an uploaded file (Image or Video) to IndexedDB
 */
export async function processAndSaveDisciplineMedia(
  file: File,
  category: 'before' | 'after' | 'milestone_1m' | 'milestone_6m' | 'milestone_1y' | 'custom' = 'before',
  caption?: string
): Promise<DisciplineMediaItem> {
  const id = generateMediaId();
  const isVideo = file.type.startsWith('video/');
  const type: 'image' | 'video' = isVideo ? 'video' : 'image';
  const dbKey = `tata_disc_media_${id}`;

  let thumbnailUrl = '';
  let duration = 0;

  if (isVideo) {
    const videoData = await createVideoThumbnailAndDuration(file);
    thumbnailUrl = videoData.thumbnailUrl;
    duration = videoData.duration;
  } else {
    thumbnailUrl = await createImageThumbnail(file);
  }

  // Convert full file to base64 data URL
  const fileDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });

  // Save heavy payload safely to IndexedDB
  await setLargeItem(dbKey, fileDataUrl);

  const mediaItem: DisciplineMediaItem = {
    id,
    name: file.name,
    type,
    url: `indexeddb:${dbKey}`,
    thumbnailUrl: thumbnailUrl || undefined,
    createdAt: new Date().toISOString(),
    caption: caption || '',
    category,
    duration: isVideo ? duration : undefined,
    size: file.size
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

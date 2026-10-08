/**
 * Utility for automatic document & KTP boundary detection and background cropping.
 * Pure offline client-side computer vision algorithm.
 */

import { warpPerspective, QuadCorners } from './perspectiveWarp';

export interface AutoCropResult {
  croppedDataUrl: string;
  wasCropped: boolean;
  cropBox: {
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    width: number; // percentage 0-100
    height: number; // percentage 0-100
  };
  pixelBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Analyzes an image (data URL) to find KTP / ID Card / Document boundaries on floors, desks, or background surfaces.
 * Automatically crops out surrounding background and auto-unskews/flattens perspective into a straight rectangle.
 */
export async function detectAndCropDocument(
  dataUrl: string,
  paddingPercent: number = 0.015
): Promise<AutoCropResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = async () => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      if (!origW || !origH) {
        resolve({
          croppedDataUrl: dataUrl,
          wasCropped: false,
          cropBox: { x: 0, y: 0, width: 100, height: 100 },
          pixelBox: { x: 0, y: 0, width: origW || 100, height: origH || 100 }
        });
        return;
      }

      // Sample image on downscaled offscreen canvas for fast analysis
      const maxSampleDim = 600;
      let sampleW = origW;
      let sampleH = origH;
      if (origW > maxSampleDim || origH > maxSampleDim) {
        if (origW > origH) {
          sampleH = Math.round((origH * maxSampleDim) / origW);
          sampleW = maxSampleDim;
        } else {
          sampleW = Math.round((origW * maxSampleDim) / origH);
          sampleH = maxSampleDim;
        }
      }

      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = sampleW;
      sampleCanvas.height = sampleH;
      const sampleCtx = sampleCanvas.getContext('2d');

      if (!sampleCtx) {
        resolve({
          croppedDataUrl: dataUrl,
          wasCropped: false,
          cropBox: { x: 0, y: 0, width: 100, height: 100 },
          pixelBox: { x: 0, y: 0, width: origW, height: origH }
        });
        return;
      }

      sampleCtx.drawImage(img, 0, 0, sampleW, sampleH);
      const imgData = sampleCtx.getImageData(0, 0, sampleW, sampleH);
      const data = imgData.data;

      // 1. Calculate luminance (gray) and saturation for each pixel
      const gray = new Uint8Array(sampleW * sampleH);
      const sat = new Uint8Array(sampleW * sampleH);

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const idx = i >> 2;

        gray[idx] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);

        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        sat[idx] = maxC === 0 ? 0 : Math.round(((maxC - minC) / maxC) * 255);
      }

      // 2. Multi-pass Edge & Contrast Gradient detection
      const step = Math.max(1, Math.floor(Math.min(sampleW, sampleH) / 180));
      const edgePoints: { x: number; y: number }[] = [];
      const edgeXs: number[] = [];
      const edgeYs: number[] = [];

      for (let y = step; y < sampleH - step; y += step) {
        for (let x = step; x < sampleW - step; x += step) {
          const idx = y * sampleW + x;

          // Spatial Luminance Gradient (Sobel-like magnitude)
          const gx = Math.abs(gray[idx + step] - gray[idx - step]);
          const gy = Math.abs(gray[idx + sampleW * step] - gray[idx - sampleW * step]);
          const grad = gx + gy;

          // Saturation difference (useful for KTP blue/color against floor tiles/wood)
          const satGx = Math.abs(sat[idx + step] - sat[idx - step]);
          const satGy = Math.abs(sat[idx + sampleW * step] - sat[idx - sampleW * step]);

          if (grad > 22 || satGx + satGy > 30) {
            edgePoints.push({ x, y });
            edgeXs.push(x);
            edgeYs.push(y);
          }
        }
      }

      // Default full frame box
      let cropX = 0;
      let cropY = 0;
      let cropW = origW;
      let cropH = origH;
      let wasCropped = false;

      let quadCornersPx: QuadCorners | null = null;

      if (edgeXs.length > 30) {
        const sortedXs = [...edgeXs].sort((a, b) => a - b);
        const sortedYs = [...edgeYs].sort((a, b) => a - b);

        // Filter out extreme 3.5% edge noise/shadow outliers
        const pLow = Math.floor(sortedXs.length * 0.035);
        const pHigh = Math.floor(sortedXs.length * 0.965);

        const minSampleX = sortedXs[pLow];
        const maxSampleX = sortedXs[pHigh];
        const minSampleY = sortedYs[pLow];
        const maxSampleY = sortedYs[pHigh];

        const sampleObjW = maxSampleX - minSampleX;
        const sampleObjH = maxSampleY - minSampleY;

        // Check if object is distinct or framed within sample (occupies at least 10% of dimension)
        const isDistinctX = sampleObjW > sampleW * 0.10;
        const isDistinctY = sampleObjH > sampleH * 0.10;

        if (isDistinctX || isDistinctY) {
          const scaleX = origW / sampleW;
          const scaleY = origH / sampleH;

          const origMinX = Math.round(minSampleX * scaleX);
          const origMaxX = Math.round(maxSampleX * scaleX);
          const origMinY = Math.round(minSampleY * scaleY);
          const origMaxY = Math.round(maxSampleY * scaleY);

          const padX = Math.round(origW * paddingPercent);
          const padY = Math.round(origH * paddingPercent);

          cropX = Math.max(0, origMinX - padX);
          cropY = Math.max(0, origMinY - padY);
          cropW = Math.min(origW - cropX, origMaxX - origMinX + padX * 2);
          cropH = Math.min(origH - cropY, origMaxY - origMinY + padY * 2);

          // Find 4 corners among edge points for perspective unskewing
          let minSum = Infinity, maxSum = -Infinity;
          let minDiff = Infinity, maxDiff = -Infinity;

          let tl = { x: minSampleX, y: minSampleY };
          let tr = { x: maxSampleX, y: minSampleY };
          let br = { x: maxSampleX, y: maxSampleY };
          let bl = { x: minSampleX, y: maxSampleY };

          for (const pt of edgePoints) {
            if (pt.x < minSampleX || pt.x > maxSampleX || pt.y < minSampleY || pt.y > maxSampleY) continue;
            const sum = pt.x + pt.y;
            const diff = pt.x - pt.y;

            if (sum < minSum) { minSum = sum; tl = pt; }
            if (sum > maxSum) { maxSum = sum; br = pt; }
            if (diff > maxDiff) { maxDiff = diff; tr = pt; }
            if (diff < minDiff) { minDiff = diff; bl = pt; }
          }

          quadCornersPx = {
            topLeft: { x: Math.max(0, Math.min(origW, Math.round(tl.x * scaleX))), y: Math.max(0, Math.min(origH, Math.round(tl.y * scaleY))) },
            topRight: { x: Math.max(0, Math.min(origW, Math.round(tr.x * scaleX))), y: Math.max(0, Math.min(origH, Math.round(tr.y * scaleY))) },
            bottomRight: { x: Math.max(0, Math.min(origW, Math.round(br.x * scaleX))), y: Math.max(0, Math.min(origH, Math.round(br.y * scaleY))) },
            bottomLeft: { x: Math.max(0, Math.min(origW, Math.round(bl.x * scaleX))), y: Math.max(0, Math.min(origH, Math.round(bl.y * scaleY))) }
          };

          wasCropped = true;
        }
      }

      if (quadCornersPx) {
        try {
          const unskewedDataUrl = await warpPerspective(dataUrl, quadCornersPx);
          if (unskewedDataUrl) {
            resolve({
              croppedDataUrl: unskewedDataUrl,
              wasCropped: true,
              cropBox: {
                x: Math.round((cropX / origW) * 100),
                y: Math.round((cropY / origH) * 100),
                width: Math.round((cropW / origW) * 100),
                height: Math.round((cropH / origH) * 100)
              },
              pixelBox: {
                x: cropX,
                y: cropY,
                width: cropW,
                height: cropH
              }
            });
            return;
          }
        } catch (e) {
          console.warn('Auto warp perspective failed, fallback to 2D crop:', e);
        }
      }

      if (wasCropped && cropW > 50 && cropH > 50) {
        // Fallback: Render cropped document to clean canvas
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');

        if (cropCtx) {
          cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          const croppedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.88);

          resolve({
            croppedDataUrl,
            wasCropped: true,
            cropBox: {
              x: Math.round((cropX / origW) * 100),
              y: Math.round((cropY / origH) * 100),
              width: Math.round((cropW / origW) * 100),
              height: Math.round((cropH / origH) * 100)
            },
            pixelBox: {
              x: cropX,
              y: cropY,
              width: cropW,
              height: cropH
            }
          });
          return;
        }
      }

      // Fallback: return original without crop
      resolve({
        croppedDataUrl: dataUrl,
        wasCropped: false,
        cropBox: { x: 0, y: 0, width: 100, height: 100 },
        pixelBox: { x: 0, y: 0, width: origW, height: origH }
      });
    };

    img.onerror = () => {
      resolve({
        croppedDataUrl: dataUrl,
        wasCropped: false,
        cropBox: { x: 0, y: 0, width: 100, height: 100 },
        pixelBox: { x: 0, y: 0, width: 100, height: 100 }
      });
    };

    img.src = dataUrl;
  });
}

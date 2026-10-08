/**
 * Utility for perspective transformation (homography warping / un-skewing)
 * Converts skewed quad document images into flat rectangular document views.
 * Pure offline client-side HTML Canvas implementation.
 */

export interface Point2D {
  x: number;
  y: number;
}

export interface QuadCorners {
  topLeft: Point2D;
  topRight: Point2D;
  bottomRight: Point2D;
  bottomLeft: Point2D;
}

/**
 * Calculates the 3x3 homography matrix that maps unit rectangle/target quad to source quadrilateral
 * using backward mapping for smooth pixel interpolation.
 */
function solveHomography(
  src: [Point2D, Point2D, Point2D, Point2D],
  dst: [Point2D, Point2D, Point2D, Point2D]
): number[] {
  // Solve A * h = b for 8 parameters of 3x3 homography matrix H (with h33 = 1)
  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const s = src[i];
    const d = dst[i];

    A.push([s.x, s.y, 1, 0, 0, 0, -d.x * s.x, -d.x * s.y]);
    b.push(d.x);

    A.push([0, 0, 0, s.x, s.y, 1, -d.y * s.x, -d.y * s.y]);
    b.push(d.y);
  }

  // Gaussian elimination with partial pivoting
  const n = 8;
  for (let i = 0; i < n; i++) {
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }

    // Swap rows
    const tempA = A[i];
    A[i] = A[maxRow];
    A[maxRow] = tempA;

    const tempB = b[i];
    b[i] = b[maxRow];
    b[maxRow] = tempB;

    if (Math.abs(A[i][i]) < 1e-10) continue;

    for (let k = i + 1; k < n; k++) {
      const c = -A[k][i] / A[i][i];
      for (let j = i; j < n; j++) {
        if (i === j) {
          A[k][j] = 0;
        } else {
          A[k][j] += c * A[i][j];
        }
      }
      b[k] += c * b[i];
    }
  }

  // Back substitution
  const h = new Array(8).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = 0;
    for (let j = i + 1; j < n; j++) {
      sum += A[i][j] * h[j];
    }
    h[i] = (b[i] - sum) / A[i][i];
  }

  return [...h, 1];
}

/**
 * Performs perspective warping on an image using quad corners.
 * Flattens skewed documents or KTPs into a clean rectangular output image.
 */
export async function warpPerspective(
  imageSource: string | HTMLImageElement,
  corners: QuadCorners,
  outputWidth?: number,
  outputHeight?: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImage = (img: HTMLImageElement) => {
      const origW = img.naturalWidth || img.width;
      const origH = img.naturalHeight || img.height;

      // Calculate target aspect ratio based on corner side lengths
      const topDist = Math.hypot(corners.topRight.x - corners.topLeft.x, corners.topRight.y - corners.topLeft.y);
      const bottomDist = Math.hypot(corners.bottomRight.x - corners.bottomLeft.x, corners.bottomRight.y - corners.bottomLeft.y);
      const leftDist = Math.hypot(corners.bottomLeft.x - corners.topLeft.x, corners.bottomLeft.y - corners.topLeft.y);
      const rightDist = Math.hypot(corners.bottomRight.x - corners.topRight.x, corners.bottomRight.y - corners.topRight.y);

      const avgW = (topDist + bottomDist) / 2;
      const avgH = (leftDist + rightDist) / 2;

      const targetW = Math.max(100, Math.round(outputWidth || avgW));
      const targetH = Math.max(100, Math.round(outputHeight || avgH));

      // Source corners in image pixel coordinates
      const dstQuad: [Point2D, Point2D, Point2D, Point2D] = [
        corners.topLeft,
        corners.topRight,
        corners.bottomRight,
        corners.bottomLeft
      ];

      // Target rectangular coordinates
      const srcQuad: [Point2D, Point2D, Point2D, Point2D] = [
        { x: 0, y: 0 },
        { x: targetW, y: 0 },
        { x: targetW, y: targetH },
        { x: 0, y: targetH }
      ];

      // H matrix maps target (srcQuad) -> source image (dstQuad)
      const H = solveHomography(srcQuad, dstQuad);

      // Create source image canvas
      const srcCanvas = document.createElement('canvas');
      srcCanvas.width = origW;
      srcCanvas.height = origH;
      const srcCtx = srcCanvas.getContext('2d');
      if (!srcCtx) return reject(new Error('Failed to get 2D context'));

      srcCtx.drawImage(img, 0, 0);
      const srcImgData = srcCtx.getImageData(0, 0, origW, origH);
      const srcPixels = srcImgData.data;

      // Create target output canvas
      const dstCanvas = document.createElement('canvas');
      dstCanvas.width = targetW;
      dstCanvas.height = targetH;
      const dstCtx = dstCanvas.getContext('2d');
      if (!dstCtx) return reject(new Error('Failed to get destination 2D context'));

      const dstImgData = dstCtx.createImageData(targetW, targetH);
      const dstPixels = dstImgData.data;

      // Inverse mapping pixel sampler with bilinear interpolation
      for (let y = 0; y < targetH; y++) {
        for (let x = 0; x < targetW; x++) {
          const denominator = H[6] * x + H[7] * y + H[8];
          const srcX = (H[0] * x + H[1] * y + H[2]) / denominator;
          const srcY = (H[3] * x + H[4] * y + H[5]) / denominator;

          const dstIdx = (y * targetW + x) * 4;

          if (srcX >= 0 && srcX < origW - 1 && srcY >= 0 && srcY < origH - 1) {
            // Bilinear interpolation
            const x0 = Math.floor(srcX);
            const x1 = x0 + 1;
            const y0 = Math.floor(srcY);
            const y1 = y0 + 1;

            const dx = srcX - x0;
            const dy = srcY - y0;

            const idx00 = (y0 * origW + x0) * 4;
            const idx10 = (y0 * origW + x1) * 4;
            const idx01 = (y1 * origW + x0) * 4;
            const idx11 = (y1 * origW + x1) * 4;

            for (let c = 0; c < 4; c++) {
              const top = srcPixels[idx00 + c] * (1 - dx) + srcPixels[idx10 + c] * dx;
              const bottom = srcPixels[idx01 + c] * (1 - dx) + srcPixels[idx11 + c] * dx;
              dstPixels[dstIdx + c] = Math.round(top * (1 - dy) + bottom * dy);
            }
          } else {
            // Out of bounds -> fill white
            dstPixels[dstIdx] = 255;
            dstPixels[dstIdx + 1] = 255;
            dstPixels[dstIdx + 2] = 255;
            dstPixels[dstIdx + 3] = 255;
          }
        }
      }

      dstCtx.putImageData(dstImgData, 0, 0);
      resolve(dstCanvas.toDataURL('image/jpeg', 0.92));
    };

    if (typeof imageSource === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => processImage(img);
      img.onerror = (err) => reject(err);
      img.src = imageSource;
    } else {
      processImage(imageSource);
    }
  });
}

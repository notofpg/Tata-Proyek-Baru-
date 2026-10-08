import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  FileText,
  X,
  Plus,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  RotateCw,
  FileCheck,
  Crop,
  ZoomIn,
  ZoomOut,
  SwitchCamera,
  Check,
  Grid,
  Maximize2,
  AlertCircle,
  CreditCard,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { compressImageBase64 } from '../utils/imageCompressor';
import { warpPerspective, QuadCorners } from '../utils/perspectiveWarp';
import { OCRModal } from './OCRModal';

export type CropHandleKey = keyof QuadCorners | 'topCenter' | 'rightCenter' | 'bottomCenter' | 'leftCenter';

interface DocumentScannerModalProps {
  isOpen: boolean;
  lang?: 'id' | 'en';
  appTheme?: string;
  initialImage?: string | null;
  onClose: () => void;
  onInsertToNote?: (scannedImages: string[]) => void;
  onInsertOCRText?: (ocrText: string) => void;
}

export type ScanFilter = 'original' | 'grayscale';

export interface ScannedPage {
  id: string;
  originalDataUrl: string;
  filteredDataUrl: string;
  filter: ScanFilter;
  rotation: number;
}

type StudioMode = 'camera' | 'studio' | 'crop';
type TargetGuideMode = 'ktp' | 'document' | 'none';

export default function DocumentScannerModal({
  isOpen,
  lang = 'id',
  appTheme = 'dark',
  initialImage,
  onClose,
  onInsertToNote,
  onInsertOCRText
}: DocumentScannerModalProps) {
  // Core State
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [docTitle, setDocTitle] = useState<string>('Dokumen_Scan_Tata');
  const [studioMode, setStudioMode] = useState<StudioMode>('studio');
  const [docFilter, setDocFilter] = useState<ScanFilter>('original');

  // Camera State & Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const frameGuideRef = useRef<HTMLDivElement>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [targetGuide, setTargetGuide] = useState<TargetGuideMode>('document');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [flashAnim, setFlashAnim] = useState<boolean>(false);

  // Zoom & Notification State
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const [isOcrOpen, setIsOcrOpen] = useState<boolean>(false);
  const [ocrSnippet, setOcrSnippet] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // 4-Corner Quad Crop Canvas Engine (Cached & Zero-Lag)
  const cropCanvasRef = useRef<HTMLCanvasElement>(null);
  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const [cropCorners, setCropCorners] = useState<QuadCorners>({
    topLeft: { x: 0.08, y: 0.08 },
    topRight: { x: 0.92, y: 0.08 },
    bottomRight: { x: 0.92, y: 0.92 },
    bottomLeft: { x: 0.08, y: 0.92 }
  });
  const [activeCorner, setActiveCorner] = useState<CropHandleKey | null>(null);
  const [magnifier, setMagnifier] = useState<{ x: number; y: number; cornerKey: CropHandleKey } | null>(null);
  const prevPointerRef = useRef<{ x: number; y: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // Stop Camera safely
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraStream(null);
  }, []);

  // Start Live Camera safely
  const startCamera = useCallback(async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(lang === 'id' ? 'Kamera tidak didukung di peranti ini.' : 'Camera not supported.');
      }

      let mediaStream: MediaStream | null = null;
      const constraints = [
        { video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
        { video: { facingMode: { ideal: facingMode } }, audio: false },
        { video: { facingMode: facingMode }, audio: false },
        { video: { facingMode: facingMode === 'environment' ? 'environment' : 'user' }, audio: false },
        { video: true, audio: false }
      ];

      for (const c of constraints) {
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia(c);
          if (mediaStream) break;
        } catch (e) {
          console.warn('DocumentScanner camera constraint failed:', c, e);
        }
      }

      if (!mediaStream) {
        throw new Error(lang === 'id' ? 'Gagal mengakses kamera' : 'Failed to access camera');
      }

      streamRef.current = mediaStream;
      setCameraStream(mediaStream);
      setIsCameraLoading(false);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraLoading(false);
      let errMsg = lang === 'id'
        ? 'Izin akses kamera belum aktif di browser. Tekan "Minta Izin / Buka Kamera Live" untuk mengaktifkan pemindai live dokumen, atau gunakan opsi kamera HP native di bawah.'
        : 'Camera access permission not active in browser. Tap "Request Permission / Open Live Camera" to start live document scanner, or use native camera option below.';
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        errMsg = lang === 'id'
          ? 'Izin kamera ditolak oleh browser. Tekan "Minta Izin / Buka Kamera Live" atau berikan izin pada ikon gembok/pengaturan di browser Anda.'
          : 'Camera permission denied by browser. Tap "Request Permission / Open Live Camera" or enable permission in browser site settings.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errMsg = lang === 'id'
          ? 'Perangkat kamera tidak ditemukan. Pilih foto dari galeri atau kamera native HP.'
          : 'Camera device not found. Choose photo from gallery or native OS camera.';
      }
      setCameraError(errMsg);
    }
  }, [facingMode, lang, stopCameraStream]);

  // Bind video element when mounted or stream updated
  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && cameraStream) {
      videoEl.srcObject = cameraStream;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      const handleMetadata = () => {
        videoEl.play().catch((err) => console.log('DocScanner play metadata err:', err));
      };
      videoEl.addEventListener('loadedmetadata', handleMetadata);
      videoEl.play().catch((err) => console.log('DocScanner play direct err:', err));

      return () => {
        videoEl.removeEventListener('loadedmetadata', handleMetadata);
      };
    }
  }, [cameraStream, studioMode]);

  // Camera Lifecycle
  useEffect(() => {
    if (isOpen && studioMode === 'camera') {
      startCamera();
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, studioMode, facingMode]);

  // Initial Image Injection from props
  useEffect(() => {
    if (isOpen && initialImage) {
      addRawImageToPages(initialImage);
      setStudioMode('studio');
    } else if (isOpen && pages.length === 0 && !initialImage) {
      setStudioMode('camera');
    }
  }, [isOpen, initialImage]);

  // High-Speed CamScanner Image Filter Processor
  const processImageFilter = useCallback(
    (dataUrl: string, filter: ScanFilter, rotation: number = 0): Promise<string> => {
      return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          let origW = img.naturalWidth || img.width || 1280;
          let origH = img.naturalHeight || img.height || 720;

          // Cap max dimension to 1400px for instant rendering speed
          const maxDim = 1400;
          if (origW > maxDim || origH > maxDim) {
            if (origW > origH) {
              origH = Math.round((origH * maxDim) / origW);
              origW = maxDim;
            } else {
              origW = Math.round((origW * maxDim) / origH);
              origH = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(dataUrl);

          if (rotation === 90 || rotation === 270) {
            canvas.width = origH;
            canvas.height = origW;
          } else {
            canvas.width = origW;
            canvas.height = origH;
          }

          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((rotation * Math.PI) / 180);
          ctx.drawImage(img, -origW / 2, -origH / 2, origW, origH);
          ctx.restore();

          if (filter === 'original') {
            resolve(canvas.toDataURL('image/jpeg', 0.88));
            return;
          }

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;

            if (filter === 'grayscale') {
              data[i] = gray;
              data[i + 1] = gray;
              data[i + 2] = gray;
            }
          }

          ctx.putImageData(imageData, 0, 0);
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      });
    },
    []
  );

  // Add raw image (Compress -> Apply Filter)
  const addRawImageToPages = async (rawBase64: string) => {
    try {
      const compressed = await compressImageBase64(rawBase64, 1600, 1600, 0.88);
      const filtered = await processImageFilter(compressed, docFilter, 0);

      const newPage: ScannedPage = {
        id: 'page_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        originalDataUrl: compressed,
        filteredDataUrl: filtered,
        filter: docFilter,
        rotation: 0
      };

      setPages((prev) => [...prev, newPage]);
      setActivePageIndex((prev) => (pages.length === 0 ? 0 : prev + 1));
    } catch (err) {
      console.error('Error processing scanned photo:', err);
    }
  };

  // Camera Snap Handler
  const handleSnapCamera = async () => {
    if (!videoRef.current) return;

    setFlashAnim(true);
    setTimeout(() => setFlashAnim(false), 200);

    const video = videoRef.current;
    const videoWidth = video.videoWidth || 1280;
    const videoHeight = video.videoHeight || 720;

    let capturedDataUrl: string | null = null;

    // If a frame guide (KTP or Document) is active, crop strictly to the inside of the frame guide
    if (targetGuide !== 'none' && frameGuideRef.current) {
      const videoRect = video.getBoundingClientRect();
      const frameRect = frameGuideRef.current.getBoundingClientRect();

      if (videoRect.width > 0 && videoRect.height > 0 && frameRect.width > 0 && frameRect.height > 0) {
        // Video uses object-cover in videoRect
        const scale = Math.max(videoRect.width / videoWidth, videoRect.height / videoHeight);
        const renderW = videoWidth * scale;
        const renderH = videoHeight * scale;

        const offsetX = (videoRect.width - renderW) / 2;
        const offsetY = (videoRect.height - renderH) / 2;

        const frameRelX = frameRect.left - videoRect.left;
        const frameRelY = frameRect.top - videoRect.top;

        let cropX = Math.round((frameRelX - offsetX) / scale);
        let cropY = Math.round((frameRelY - offsetY) / scale);
        let cropW = Math.round(frameRect.width / scale);
        let cropH = Math.round(frameRect.height / scale);

        cropX = Math.max(0, Math.min(videoWidth - 10, cropX));
        cropY = Math.max(0, Math.min(videoHeight - 10, cropY));
        cropW = Math.min(videoWidth - cropX, cropW);
        cropH = Math.min(videoHeight - cropY, cropH);

        if (cropW > 30 && cropH > 30) {
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = cropW;
          cropCanvas.height = cropH;
          const cropCtx = cropCanvas.getContext('2d');
          if (cropCtx) {
            cropCtx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
            capturedDataUrl = cropCanvas.toDataURL('image/jpeg', 0.92);
          }
        }
      }
    }

    // Fallback if no frame guide or calculation fallback
    if (!capturedDataUrl) {
      const canvas = document.createElement('canvas');
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      capturedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    }

    await addRawImageToPages(capturedDataUrl);
    setStudioMode('studio');
  };

  // File Select Handler (Gallery Import)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = async (evt) => {
        if (evt.target?.result) {
          await addRawImageToPages(evt.target.result as string);
          setStudioMode('studio');
        }
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Change Active Filter
  const handleChangeFilter = async (newFilter: ScanFilter) => {
    setDocFilter(newFilter);
    if (pages.length === 0) return;

    const page = pages[activePageIndex];
    const newFiltered = await processImageFilter(page.originalDataUrl, newFilter, page.rotation);

    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ? { ...p, filter: newFilter, filteredDataUrl: newFiltered } : p
      )
    );
  };

  // Rotate Page 90 Degrees
  const handleRotatePage = async () => {
    if (pages.length === 0) return;
    const page = pages[activePageIndex];
    const nextRot = (page.rotation + 90) % 360;
    const newFiltered = await processImageFilter(page.originalDataUrl, page.filter, nextRot);

    setPages((prev) =>
      prev.map((p, idx) =>
        idx === activePageIndex ? { ...p, rotation: nextRot, filteredDataUrl: newFiltered } : p
      )
    );
  };

  // Delete Active Page
  const handleDeleteActivePage = () => {
    if (pages.length === 0) return;
    const newPages = pages.filter((_, idx) => idx !== activePageIndex);
    setPages(newPages);
    setActivePageIndex((prev) => Math.max(0, Math.min(prev, newPages.length - 1)));
    if (newPages.length === 0) {
      setStudioMode('camera');
    }
  };

  // -------------------------------------------------------------
  // ZERO-LAG CROP CANVAS RENDER ENGINE WITH REUSEABLE IMAGE CACHE
  // -------------------------------------------------------------

  // Load Image into Ref once when entering crop mode or changing page
  useEffect(() => {
    if (studioMode === 'crop' && pages[activePageIndex]) {
      const activePage = pages[activePageIndex];
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        cropImageRef.current = img;
        drawCropCanvas();
      };
      img.src = activePage.originalDataUrl;
    } else {
      cropImageRef.current = null;
    }
  }, [studioMode, activePageIndex, pages]);

  // Fast Canvas Draw Loop (No re-instantiating Image or wait onload!)
  const drawCropCanvas = useCallback(() => {
    const canvas = cropCanvasRef.current;
    const img = cropImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = img.naturalWidth || 1000;
    canvas.height = img.naturalHeight || 750;

    const w = canvas.width;
    const h = canvas.height;

    // 1. Draw base photo
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // Points in pixel coordinates
    const pTL = { x: cropCorners.topLeft.x * w, y: cropCorners.topLeft.y * h };
    const pTR = { x: cropCorners.topRight.x * w, y: cropCorners.topRight.y * h };
    const pBR = { x: cropCorners.bottomRight.x * w, y: cropCorners.bottomRight.y * h };
    const pBL = { x: cropCorners.bottomLeft.x * w, y: cropCorners.bottomLeft.y * h };

    // 2. Translucent dark overlay outside quad
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
    ctx.fillRect(0, 0, w, h);

    // Clip hole inside quad
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(pTL.x, pTL.y);
    ctx.lineTo(pTR.x, pTR.y);
    ctx.lineTo(pBR.x, pBR.y);
    ctx.lineTo(pBL.x, pBL.y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 3. Draw Green CS Quad Stroke & Fill
    ctx.save();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = Math.max(3, Math.round(w / 280));
    ctx.beginPath();
    ctx.moveTo(pTL.x, pTL.y);
    ctx.lineTo(pTR.x, pTR.y);
    ctx.lineTo(pBR.x, pBR.y);
    ctx.lineTo(pBL.x, pBL.y);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.fill();
    ctx.restore();

    // 4. Draw Corner Handles & Midpoint Edge Handles
    const handleRadius = Math.max(12, Math.round(w / 90));

    // Midpoints
    const pTC = { x: (pTL.x + pTR.x) / 2, y: (pTL.y + pTR.y) / 2 };
    const pRC = { x: (pTR.x + pBR.x) / 2, y: (pTR.y + pBR.y) / 2 };
    const pBC = { x: (pBL.x + pBR.x) / 2, y: (pBL.y + pBR.y) / 2 };
    const pLC = { x: (pTL.x + pBL.x) / 2, y: (pTL.y + pBL.y) / 2 };

    const cornersArr: { key: CropHandleKey; pt: { x: number; y: number } }[] = [
      { key: 'topLeft', pt: pTL },
      { key: 'topRight', pt: pTR },
      { key: 'bottomRight', pt: pBR },
      { key: 'bottomLeft', pt: pBL }
    ];

    const midpointsArr: { key: CropHandleKey; pt: { x: number; y: number }; horizontal: boolean }[] = [
      { key: 'topCenter', pt: pTC, horizontal: true },
      { key: 'rightCenter', pt: pRC, horizontal: false },
      { key: 'bottomCenter', pt: pBC, horizontal: true },
      { key: 'leftCenter', pt: pLC, horizontal: false }
    ];

    // Draw Corner Handles (Circles)
    cornersArr.forEach(({ key, pt }) => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, handleRadius, 0, Math.PI * 2);
      ctx.fillStyle = activeCorner === key ? '#6366f1' : '#10b981';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.restore();
    });

    // Draw Edge Handles (Sleek Pills with Grip Lines)
    midpointsArr.forEach(({ key, pt, horizontal }) => {
      const isActive = activeCorner === key;
      const pw = horizontal ? handleRadius * 1.8 : handleRadius * 1.0;
      const ph = horizontal ? handleRadius * 1.0 : handleRadius * 1.8;

      ctx.save();
      ctx.translate(pt.x, pt.y);

      ctx.beginPath();
      if (typeof (ctx as any).roundRect === 'function') {
        (ctx as any).roundRect(-pw / 2, -ph / 2, pw, ph, 6);
      } else {
        ctx.rect(-pw / 2, -ph / 2, pw, ph);
      }
      ctx.fillStyle = isActive ? '#6366f1' : '#38bdf8';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Grip lines
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (horizontal) {
        ctx.moveTo(-3, -ph / 3);
        ctx.lineTo(-3, ph / 3);
        ctx.moveTo(3, -ph / 3);
        ctx.lineTo(3, ph / 3);
      } else {
        ctx.moveTo(-pw / 3, -3);
        ctx.lineTo(pw / 3, -3);
        ctx.moveTo(-pw / 3, 3);
        ctx.lineTo(pw / 3, 3);
      }
      ctx.stroke();

      ctx.restore();
    });
  }, [cropCorners, activeCorner]);

  // Request Animation Frame trigger for smooth 60fps drag
  useEffect(() => {
    if (studioMode === 'crop') {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = requestAnimationFrame(() => drawCropCanvas());
    }
  }, [cropCorners, activeCorner, studioMode, drawCropCanvas]);

  // Touch / Pointer Drag Handlers
  const handlePointerDownCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    const tc = { x: (cropCorners.topLeft.x + cropCorners.topRight.x) / 2, y: (cropCorners.topLeft.y + cropCorners.topRight.y) / 2 };
    const rc = { x: (cropCorners.topRight.x + cropCorners.bottomRight.x) / 2, y: (cropCorners.topRight.y + cropCorners.bottomRight.y) / 2 };
    const bc = { x: (cropCorners.bottomLeft.x + cropCorners.bottomRight.x) / 2, y: (cropCorners.bottomLeft.y + cropCorners.bottomRight.y) / 2 };
    const lc = { x: (cropCorners.topLeft.x + cropCorners.bottomLeft.x) / 2, y: (cropCorners.topLeft.y + cropCorners.bottomLeft.y) / 2 };

    const dists: { key: CropHandleKey; dist: number }[] = [
      { key: 'topLeft', dist: Math.hypot(clickX - cropCorners.topLeft.x, clickY - cropCorners.topLeft.y) },
      { key: 'topRight', dist: Math.hypot(clickX - cropCorners.topRight.x, clickY - cropCorners.topRight.y) },
      { key: 'bottomRight', dist: Math.hypot(clickX - cropCorners.bottomRight.x, clickY - cropCorners.bottomRight.y) },
      { key: 'bottomLeft', dist: Math.hypot(clickX - cropCorners.bottomLeft.x, clickY - cropCorners.bottomLeft.y) },
      { key: 'topCenter', dist: Math.hypot(clickX - tc.x, clickY - tc.y) },
      { key: 'rightCenter', dist: Math.hypot(clickX - rc.x, clickY - rc.y) },
      { key: 'bottomCenter', dist: Math.hypot(clickX - bc.x, clickY - bc.y) },
      { key: 'leftCenter', dist: Math.hypot(clickX - lc.x, clickY - lc.y) }
    ];

    dists.sort((a, b) => a.dist - b.dist);
    if (dists[0].dist <= 0.25) {
      // Set Pointer Capture for fluid touch dragging
      e.currentTarget.setPointerCapture(e.pointerId);
      setActiveCorner(dists[0].key);
      prevPointerRef.current = { x: clickX, y: clickY };
      setMagnifier({ x: clickX, y: clickY, cornerKey: dists[0].key });
    }
  };

  const handlePointerMoveCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeCorner) return;
    const canvas = cropCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    const prev = prevPointerRef.current || { x, y };
    const dx = x - prev.x;
    const dy = y - prev.y;
    prevPointerRef.current = { x, y };

    setCropCorners((prevCorners) => {
      const clamp = (v: number) => Math.max(0, Math.min(1, v));

      if (activeCorner === 'topLeft') {
        return { ...prevCorners, topLeft: { x, y } };
      }
      if (activeCorner === 'topRight') {
        return { ...prevCorners, topRight: { x, y } };
      }
      if (activeCorner === 'bottomRight') {
        return { ...prevCorners, bottomRight: { x, y } };
      }
      if (activeCorner === 'bottomLeft') {
        return { ...prevCorners, bottomLeft: { x, y } };
      }

      if (activeCorner === 'topCenter') {
        return {
          ...prevCorners,
          topLeft: { x: clamp(prevCorners.topLeft.x + dx), y: clamp(prevCorners.topLeft.y + dy) },
          topRight: { x: clamp(prevCorners.topRight.x + dx), y: clamp(prevCorners.topRight.y + dy) }
        };
      }
      if (activeCorner === 'rightCenter') {
        return {
          ...prevCorners,
          topRight: { x: clamp(prevCorners.topRight.x + dx), y: clamp(prevCorners.topRight.y + dy) },
          bottomRight: { x: clamp(prevCorners.bottomRight.x + dx), y: clamp(prevCorners.bottomRight.y + dy) }
        };
      }
      if (activeCorner === 'bottomCenter') {
        return {
          ...prevCorners,
          bottomLeft: { x: clamp(prevCorners.bottomLeft.x + dx), y: clamp(prevCorners.bottomLeft.y + dy) },
          bottomRight: { x: clamp(prevCorners.bottomRight.x + dx), y: clamp(prevCorners.bottomRight.y + dy) }
        };
      }
      if (activeCorner === 'leftCenter') {
        return {
          ...prevCorners,
          topLeft: { x: clamp(prevCorners.topLeft.x + dx), y: clamp(prevCorners.topLeft.y + dy) },
          bottomLeft: { x: clamp(prevCorners.bottomLeft.x + dx), y: clamp(prevCorners.bottomLeft.y + dy) }
        };
      }

      return prevCorners;
    });

    setMagnifier({ x, y, cornerKey: activeCorner });
  };

  const handlePointerUpCanvas = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (activeCorner) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {}
    }
    setActiveCorner(null);
    setMagnifier(null);
    prevPointerRef.current = null;
  };

  // Reset corners to clean full frame
  const handleAlignFull = () => {
    setCropCorners({
      topLeft: { x: 0.02, y: 0.02 },
      topRight: { x: 0.98, y: 0.02 },
      bottomRight: { x: 0.98, y: 0.98 },
      bottomLeft: { x: 0.02, y: 0.98 }
    });
    setStatusNotice(lang === 'id' ? 'Reset frame penuh' : 'Reset full frame');
    setTimeout(() => setStatusNotice(null), 1800);
  };

  // Preset KTP / ID Card Ratio (85.6mm x 54mm)
  const handleAlignKTP = () => {
    const frameW = 0.88;
    const frameH = 0.55;
    const startX = (1 - frameW) / 2;
    const startY = (1 - frameH) / 2;
    setCropCorners({
      topLeft: { x: startX, y: startY },
      topRight: { x: startX + frameW, y: startY },
      bottomRight: { x: startX + frameW, y: startY + frameH },
      bottomLeft: { x: startX, y: startY + frameH }
    });
    setStatusNotice(lang === 'id' ? 'Format KTP (85x54)' : 'KTP Format Ratio');
    setTimeout(() => setStatusNotice(null), 1800);
  };

  // Preset A4 Document Ratio (210mm x 297mm)
  const handleAlignA4 = () => {
    const frameH = 0.92;
    const frameW = 0.65;
    const startX = (1 - frameW) / 2;
    const startY = (1 - frameH) / 2;
    setCropCorners({
      topLeft: { x: startX, y: startY },
      topRight: { x: startX + frameW, y: startY },
      bottomRight: { x: startX + frameW, y: startY + frameH },
      bottomLeft: { x: startX, y: startY + frameH }
    });
    setStatusNotice(lang === 'id' ? 'Format Dokumen A4' : 'A4 Document Ratio');
    setTimeout(() => setStatusNotice(null), 1800);
  };

  // Default to full frame when entering crop mode
  useEffect(() => {
    if (studioMode === 'crop' && pages[activePageIndex]) {
      handleAlignFull();
    }
  }, [studioMode, activePageIndex]);

  // Apply Perspective Unskew Warp Homography
  const handleApplyQuadWarp = async () => {
    if (pages.length === 0) return;
    const page = pages[activePageIndex];

    try {
      const img = cropImageRef.current || new Image();
      if (!cropImageRef.current) {
        img.crossOrigin = 'anonymous';
        img.src = page.originalDataUrl;
        await new Promise((res) => (img.onload = res));
      }

      const origW = img.naturalWidth || img.width || 1280;
      const origH = img.naturalHeight || img.height || 720;

      const cornersPx: QuadCorners = {
        topLeft: { x: cropCorners.topLeft.x * origW, y: cropCorners.topLeft.y * origH },
        topRight: { x: cropCorners.topRight.x * origW, y: cropCorners.topRight.y * origH },
        bottomRight: { x: cropCorners.bottomRight.x * origW, y: cropCorners.bottomRight.y * origH },
        bottomLeft: { x: cropCorners.bottomLeft.x * origW, y: cropCorners.bottomLeft.y * origH }
      };

      const unskewedDataUrl = await warpPerspective(page.originalDataUrl, cornersPx);
      const filtered = await processImageFilter(unskewedDataUrl, page.filter, page.rotation);

      setPages((prev) =>
        prev.map((p, idx) =>
          idx === activePageIndex
            ? { ...p, originalDataUrl: unskewedDataUrl, filteredDataUrl: filtered }
            : p
        )
      );

      setStudioMode('studio');
      setStatusNotice(lang === 'id' ? '📐 Dokumen berhasil diratakan' : '📐 Document flattened');
      setTimeout(() => setStatusNotice(null), 3000);
    } catch (err) {
      console.error('Warp error:', err);
      setStudioMode('studio');
    }
  };

  // Insert Scanned Images into Note
  const handleInsertScannedImagesToNote = () => {
    if (onInsertToNote && pages.length > 0) {
      const finalImages = pages.map((p) => p.filteredDataUrl);
      onInsertToNote(finalImages);
      onClose();
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    if (pages.length === 0) return;

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();

      pages.forEach((page, index) => {
        if (index > 0) pdf.addPage();
        pdf.addImage(page.filteredDataUrl, 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
      });

      pdf.save(`${docTitle || 'Dokumen_Scan'}.pdf`);
    } catch (err) {
      console.error('Failed to export PDF:', err);
    }
  };

  if (!isOpen) return null;

  const activePage = pages[activePageIndex];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-slate-950 flex flex-col overflow-hidden select-none text-slate-100 font-sans"
      >
        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* TOP NAVBAR */}
        <div className="h-14 px-4 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="Tutup"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-emerald-400 shrink-0" />
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                placeholder="Nama Dokumen"
                className="bg-transparent text-sm font-extrabold text-slate-100 focus:outline-none focus:border-b focus:border-indigo-500 max-w-[160px] sm:max-w-xs"
              />
            </div>
            {pages.length > 0 && (
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full bg-slate-800 text-[11px] font-bold text-slate-400 border border-slate-700">
                {activePageIndex + 1} / {pages.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {studioMode === 'studio' && pages.length > 0 && onInsertToNote && (
              <button
                onClick={handleInsertScannedImagesToNote}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
              >
                <Check size={16} />
                <span>{lang === 'id' ? 'Masukkan ke Catatan' : 'Use Scans'}</span>
              </button>
            )}
          </div>
        </div>

        {/* STATUS NOTIFICATION BADGE */}
        <AnimatePresence>
          {statusNotice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-14 inset-x-4 z-50 mx-auto max-w-xs bg-slate-900/95 text-slate-200 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-700/80 shadow-xl backdrop-blur-md flex items-center justify-between gap-2"
            >
              <span>{statusNotice}</span>
              <button onClick={() => setStatusNotice(null)} className="p-1 text-slate-400 hover:text-white rounded-lg">
                <X size={13} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN STUDIO VIEWPORT */}
        <div className="flex-1 min-h-0 relative flex flex-col bg-slate-950 overflow-hidden">
          {/* 1. CAMERA VIEW MODE */}
          {studioMode === 'camera' && (
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {/* Camera Error Overlay Screen */}
              {cameraError && (
                <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-4 shadow-xl">
                    <AlertCircle size={28} />
                  </div>
                  <h4 className="text-sm font-extrabold text-slate-100 mb-1.5">
                    {lang === 'id' ? 'Akses Kamera Diblokir' : 'Camera Access Blocked'}
                  </h4>
                  <p className="text-xs text-slate-300 max-w-xs leading-relaxed mb-6 font-medium">
                    {cameraError}
                  </p>
                  <div className="flex flex-col gap-2.5 w-full max-w-xs">
                    <button
                      onClick={startCamera}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/30 active:scale-95 flex items-center justify-center gap-2"
                    >
                      <RotateCw size={16} />
                      <span>{lang === 'id' ? 'Minta Izin / Buka Kamera Live' : 'Request Permission / Open Live Camera'}</span>
                    </button>

                    <button
                      onClick={() => nativeCameraInputRef.current?.click()}
                      className="w-full py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs rounded-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Camera size={16} />
                      <span>{lang === 'id' ? 'Kamera HP (Native OS Fallback)' : 'Native OS Camera (Fallback)'}</span>
                    </button>

                    <button
                      onClick={() => window.open(window.location.href, '_blank')}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <ExternalLink size={14} />
                      <span>{lang === 'id' ? 'Buka Aplikasi di Tab Baru' : 'Open App in New Tab'}</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      <ImageIcon size={14} className="text-indigo-400" />
                      <span>{lang === 'id' ? 'Pilih Foto dari Galeri' : 'Choose Photo from Gallery'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Camera Loading Overlay */}
              {isCameraLoading && !cameraError && (
                <div className="absolute inset-0 z-30 bg-slate-950/90 flex flex-col items-center justify-center text-slate-300 gap-3">
                  <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-semibold">{lang === 'id' ? 'Menyiapkan Kamera...' : 'Initializing Camera...'}</span>
                </div>
              )}

              {/* Grid Lines Overlay */}
              {showGrid && (
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20 border border-white/20">
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                  <div className="border border-white/20"></div>
                </div>
              )}

              {/* Target Frame Guide Overlay */}
              {targetGuide !== 'none' && (
                <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none z-10">
                  <div
                    ref={frameGuideRef}
                    className={`border-2 border-dashed border-emerald-400 rounded-2xl shadow-2xl transition-all duration-300 flex items-center justify-center ${
                      targetGuide === 'ktp'
                        ? 'w-[320px] h-[200px] sm:w-[380px] sm:h-[240px]'
                        : 'w-[280px] h-[390px] sm:w-[340px] sm:h-[480px]'
                    }`}
                  >
                    <div className="bg-emerald-500/20 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold text-emerald-300 tracking-wider uppercase border border-emerald-400/50 backdrop-blur-md shadow-lg">
                      {targetGuide === 'ktp'
                        ? (lang === 'id' ? 'Bingkai KTP / Kartu' : 'ID Card Frame')
                        : (lang === 'id' ? 'Bingkai Dokumen kertas' : 'Document Frame')}
                    </div>
                  </div>
                </div>
              )}

              {/* Flash Animation */}
              {flashAnim && (
                <div className="absolute inset-0 bg-white z-40 animate-out fade-out duration-200 pointer-events-none" />
              )}

              {/* Top Camera Controls Overlay */}
              <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between">
                <div className="flex items-center gap-1.5 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800/80 backdrop-blur-md">
                  <button
                    onClick={() => setTargetGuide('document')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      targetGuide === 'document' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Dokumen
                  </button>
                  <button
                    onClick={() => setTargetGuide('ktp')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      targetGuide === 'ktp' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    KTP / ID
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-2.5 rounded-xl border backdrop-blur-md transition-all cursor-pointer ${
                      showGrid
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-slate-900/80 text-slate-300 border-slate-800'
                    }`}
                  >
                    <Grid size={18} />
                  </button>

                  <button
                    onClick={() => setFacingMode(facingMode === 'environment' ? 'user' : 'environment')}
                    className="p-2.5 rounded-xl bg-slate-900/80 text-slate-300 border border-slate-800 backdrop-blur-md hover:text-white cursor-pointer"
                  >
                    <SwitchCamera size={18} />
                  </button>
                </div>
              </div>

              {/* Bottom Shutter Controls */}
              <div className="absolute bottom-6 inset-x-6 z-30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md text-slate-200 hover:text-white transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    title={lang === 'id' ? 'Upload Galeri' : 'Gallery Upload'}
                  >
                    <ImageIcon size={20} className="text-indigo-400" />
                    <span className="text-xs font-bold hidden sm:inline">{lang === 'id' ? 'Galeri' : 'Gallery'}</span>
                  </button>

                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                    title={lang === 'id' ? 'Kamera HP Native OS' : 'Native OS Camera'}
                  >
                    <Camera size={20} />
                    <span className="text-xs font-bold hidden sm:inline">{lang === 'id' ? 'Kamera OS' : 'Native Cam'}</span>
                  </button>
                </div>

                {/* Shutter Button */}
                <button
                  onClick={handleSnapCamera}
                  disabled={isCameraLoading}
                  className="w-20 h-20 rounded-full border-4 border-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all cursor-pointer shadow-2xl flex items-center justify-center relative"
                >
                  <div className="w-14 h-14 rounded-full border-2 border-white/60 bg-white/20" />
                  {pages.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-zinc-950 font-black text-xs w-6 h-6 rounded-full flex items-center justify-center border-2 border-zinc-950 shadow-md">
                      {pages.length}
                    </span>
                  )}
                </button>

                {pages.length > 0 ? (
                  <button
                    onClick={() => setStudioMode('studio')}
                    className="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
                  >
                    <span>{lang === 'id' ? 'Selesai' : 'Done'}</span>
                    <FileCheck size={18} />
                  </button>
                ) : (
                  <div className="w-12" />
                )}
              </div>
            </div>
          )}

          {/* 2. STUDIO EDITOR VIEW MODE */}
          {studioMode === 'studio' && (
            <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 overflow-hidden">
              {pages.length > 0 && activePage ? (
                <div className="flex-1 min-h-0 flex flex-col gap-3">
                  {/* Active Page Image Viewport */}
                  <div className="relative flex-1 min-h-0 rounded-2xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-center p-3 overflow-auto custom-scrollbar">
                    <img
                      src={activePage.filteredDataUrl}
                      alt="Scanned Document"
                      style={{
                        transform: `scale(${previewZoom})`,
                        transition: 'transform 0.15s ease-out'
                      }}
                      className="max-h-full max-w-full object-contain rounded-xl shadow-2xl border border-slate-800/80"
                    />

                    {/* Floating Image Control Bar */}
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-slate-950/85 p-1 rounded-xl border border-slate-800/80 backdrop-blur-md shadow-xl">
                      <button
                        onClick={() => setPreviewZoom((p) => Math.max(1, p - 0.25))}
                        className="p-1.5 text-slate-300 hover:text-white cursor-pointer rounded-lg hover:bg-slate-800/80 transition-all"
                        title="Zoom Out"
                      >
                        <ZoomOut size={15} />
                      </button>
                      <span className="text-[11px] font-mono font-bold text-slate-300 px-1">
                        {Math.round(previewZoom * 100)}%
                      </span>
                      <button
                        onClick={() => setPreviewZoom((p) => Math.min(3, p + 0.25))}
                        className="p-1.5 text-slate-300 hover:text-white cursor-pointer rounded-lg hover:bg-slate-800/80 transition-all"
                        title="Zoom In"
                      >
                        <ZoomIn size={15} />
                      </button>

                      <div className="w-[1px] h-4 bg-slate-800 mx-0.5" />

                      <button
                        onClick={handleRotatePage}
                        className="p-1.5 text-slate-300 hover:text-white cursor-pointer rounded-lg hover:bg-slate-800/80 transition-all"
                        title="Putar 90°"
                      >
                        <RotateCw size={15} />
                      </button>

                      <button
                        onClick={handleDeleteActivePage}
                        className="p-1.5 text-rose-400 hover:text-rose-300 cursor-pointer rounded-lg hover:bg-rose-500/20 transition-all"
                        title="Hapus Halaman"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Clean Structured Toolbar */}
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex flex-wrap items-center justify-between gap-3 shrink-0">
                    {/* Filter Segmented Control: Foto Asli vs Grayscale */}
                    <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
                      {[
                        { id: 'original', label: 'Foto Asli' },
                        { id: 'grayscale', label: 'Grayscale' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => handleChangeFilter(f.id as ScanFilter)}
                          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            activePage.filter === f.id
                              ? 'bg-indigo-600 text-white shadow-md'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Action Tools Row */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setStudioMode('crop')}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <Crop size={15} />
                        <span>{lang === 'id' ? 'Potong & Ratakan' : 'Crop & Unskew'}</span>
                      </button>

                      <button
                        onClick={() => {
                          setOcrSnippet(activePage.filteredDataUrl);
                          setIsOcrOpen(true);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      >
                        <FileText size={15} />
                        <span>OCR</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-Page Thumb Carousel */}
                  <div className="p-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center gap-2.5 overflow-x-auto custom-scrollbar shrink-0">
                    {pages.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => setActivePageIndex(idx)}
                        className={`relative w-12 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                          idx === activePageIndex
                            ? 'border-indigo-500 ring-2 ring-indigo-500/30 scale-105'
                            : 'border-slate-800 hover:border-slate-600 opacity-70'
                        }`}
                      >
                        <img src={p.filteredDataUrl} alt="Page" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 left-1 bg-slate-950/90 text-[9px] font-black px-1 rounded text-slate-200">
                          {idx + 1}
                        </span>
                      </button>
                    ))}

                    <button
                      onClick={() => setStudioMode('camera')}
                      className="w-12 h-16 rounded-xl border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/60 hover:bg-indigo-500/10 text-slate-400 hover:text-indigo-400 flex flex-col items-center justify-center gap-0.5 shrink-0 cursor-pointer transition-all"
                      title="Tambah Halaman"
                    >
                      <Plus size={16} />
                      <span className="text-[9px] font-bold">{lang === 'id' ? 'Foto' : 'Add'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Empty State */
                <div className="flex-1 min-h-[260px] p-6 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 rounded-3xl bg-slate-900/30">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20 shadow-xl">
                    <Camera size={30} />
                  </div>
                  <h4 className="text-base font-extrabold text-slate-100 mb-1">
                    {lang === 'id' ? 'Pemindai Dokumen & KTP' : 'Document & ID Scanner'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-6">
                    {lang === 'id'
                      ? 'Ambil foto KTP atau dokumen kertas. Pemindai meratakan perspektif dan mencerahkan teks secara otomatis.'
                      : 'Capture ID cards or paper documents. The scanner unskews perspective and brightens text.'}
                  </p>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setStudioMode('camera')}
                      className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-xl shadow-indigo-600/30 active:scale-95"
                    >
                      <Camera size={18} />
                      <span>{lang === 'id' ? 'Buka Kamera' : 'Open Camera'}</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <ImageIcon size={18} className="text-indigo-400" />
                      <span>{lang === 'id' ? 'Pilih dari Galeri' : 'Pick Gallery'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. QUAD CORNER PERSPECTIVE CROP MODE */}
          {studioMode === 'crop' && (
            <div className="flex-1 min-h-0 flex flex-col p-3 sm:p-4 bg-slate-950 overflow-hidden">
              {/* Studio Header in Crop Mode */}
              <div className="flex items-center justify-between pb-3 shrink-0 border-b border-slate-800/80 mb-3">
                <div>
                  <h4 className="text-xs sm:text-sm font-extrabold text-slate-100 flex items-center gap-2">
                    <Crop size={16} className="text-emerald-400" />
                    <span>{lang === 'id' ? 'Potong & Ratakan Perspektif' : 'Crop & Perspective Unskew'}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 hidden sm:block">
                    {lang === 'id' ? 'Seret 8 titik penyesuaian untuk meluruskan batas dokumen' : 'Drag 8 adjustment points to straighten document bounds'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleAlignFull}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700/80 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                    title="Reset Frame Full"
                  >
                    <RefreshCw size={13} className="text-slate-400" />
                    <span>Reset</span>
                  </button>

                  <button
                    onClick={handleAlignKTP}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <CreditCard size={13} />
                    <span>KTP</span>
                  </button>

                  <button
                    onClick={handleAlignA4}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                  >
                    <FileText size={13} />
                    <span>A4</span>
                  </button>
                </div>
              </div>

              {/* Canvas Editor Viewport */}
              <div className="relative flex-1 min-h-0 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center p-2 overflow-hidden">
                <canvas
                  ref={cropCanvasRef}
                  onPointerDown={handlePointerDownCanvas}
                  onPointerMove={handlePointerMoveCanvas}
                  onPointerUp={handlePointerUpCanvas}
                  className="max-h-full max-w-full object-contain rounded-xl cursor-crosshair touch-none select-none"
                />

                {/* Subtle Floating Bottom Tip */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-800 text-[10px] font-semibold text-slate-300 flex items-center gap-1.5 shadow-lg pointer-events-none">
                  <Crop size={12} className="text-emerald-400" />
                  <span>{lang === 'id' ? 'Seret titik sudut atau sisi untuk meratakan foto' : 'Drag corner or edge nodes to align photo'}</span>
                </div>

                {/* Magnifier Status Badge */}
                {magnifier && (
                  <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl border border-emerald-400/50 bg-slate-950/90 backdrop-blur-md shadow-2xl pointer-events-none flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                    <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wide">
                      {magnifier.cornerKey === 'topLeft' && (lang === 'id' ? 'Kiri Atas' : 'Top Left')}
                      {magnifier.cornerKey === 'topRight' && (lang === 'id' ? 'Kanan Atas' : 'Top Right')}
                      {magnifier.cornerKey === 'bottomRight' && (lang === 'id' ? 'Kanan Bawah' : 'Bottom Right')}
                      {magnifier.cornerKey === 'bottomLeft' && (lang === 'id' ? 'Kiri Bawah' : 'Bottom Left')}
                      {magnifier.cornerKey === 'topCenter' && (lang === 'id' ? 'Tarik Sisi Atas' : 'Top Edge')}
                      {magnifier.cornerKey === 'rightCenter' && (lang === 'id' ? 'Tarik Sisi Kanan' : 'Right Edge')}
                      {magnifier.cornerKey === 'bottomCenter' && (lang === 'id' ? 'Tarik Sisi Bawah' : 'Bottom Edge')}
                      {magnifier.cornerKey === 'leftCenter' && (lang === 'id' ? 'Tarik Sisi Kiri' : 'Left Edge')}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Actions Bar */}
              <div className="pt-3 flex items-center justify-between gap-2 shrink-0">
                <button
                  onClick={() => setStudioMode('studio')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer active:scale-95 transition-all"
                >
                  {lang === 'id' ? 'Batal' : 'Cancel'}
                </button>

                <button
                  onClick={handleApplyQuadWarp}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer active:scale-95 transition-all"
                >
                  <Check size={16} />
                  <span>{lang === 'id' ? 'Ratakan & Terapkan' : 'Flatten & Apply'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* EXPORT FOOTER BAR */}
        {studioMode === 'studio' && pages.length > 0 && (
          <div className="h-14 px-4 bg-slate-900/90 border-t border-slate-800/80 backdrop-blur-md flex items-center justify-between shrink-0">
            <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <FileCheck size={16} className="text-emerald-400" />
              <span>{pages.length} {lang === 'id' ? 'Halaman Siap' : 'Pages Ready'}</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPDF}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <FileText size={15} />
                <span>Simpan PDF</span>
              </button>

              {onInsertToNote && (
                <button
                  onClick={handleInsertScannedImagesToNote}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer transition-all active:scale-95"
                >
                  <ImageIcon size={15} />
                  <span>{lang === 'id' ? 'Masukkan ke Catatan' : 'Insert to Note'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* OCR MODAL INTEGRATION */}
        <OCRModal
          isOpen={isOcrOpen}
          imageSnippet={ocrSnippet}
          lang={lang}
          onClose={() => setIsOcrOpen(false)}
          onInsertText={(ocrText) => {
            if (onInsertOCRText) {
              onInsertOCRText(ocrText);
            } else if (onInsertToNote && activePage) {
              onInsertToNote([activePage.filteredDataUrl]);
            }
            setIsOcrOpen(false);
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

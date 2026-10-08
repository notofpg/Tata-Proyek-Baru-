import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Crop,
  Pencil,
  Eraser,
  X,
  Check,
  RotateCcw,
  Undo2,
  Scissors,
  Maximize2,
  Move,
  Info,
  Sparkles,
  MousePointer,
  ZoomIn,
  ZoomOut,
  FileText
} from 'lucide-react';
import { OCRModal } from './OCRModal';
import { detectAndCropDocument } from '../utils/documentAutoDetector';
import { warpPerspective } from '../utils/perspectiveWarp';

interface DocumentCropModalProps {
  isOpen: boolean;
  lang?: 'id' | 'en';
  appTheme?: string;
  imageDataUrl: string | null;
  onClose: () => void;
  onApplyCrop: (croppedDataUrl: string) => void;
}

type EditToolMode = 'box' | 'lasso' | 'eraser';
type CropDetectMode = 'auto' | 'manual';

interface CropBox {
  x: number; // percentage 0 - 100
  y: number;
  width: number;
  height: number;
}

export default function DocumentCropModal({
  isOpen,
  lang = 'id',
  appTheme = 'dark',
  imageDataUrl,
  onClose,
  onApplyCrop
}: DocumentCropModalProps) {
  const isLight = appTheme === 'light';

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeTool, setActiveTool] = useState<EditToolMode>('box');
  const [detectMode, setDetectMode] = useState<CropDetectMode>('auto');
  const [brushSize, setBrushSize] = useState<number>(24);
  const [isAutoDetected, setIsAutoDetected] = useState<boolean>(false);
  const [zoomScale, setZoomScale] = useState<number>(1);
  const [isOcrOpen, setIsOcrOpen] = useState<boolean>(false);
  const [ocrSnippet, setOcrSnippet] = useState<string | null>(null);

  const handleZoomIn = () => setZoomScale((prev) => Math.min(3.5, Math.round((prev + 0.25) * 100) / 100));
  const handleZoomOut = () => setZoomScale((prev) => Math.max(1, Math.round((prev - 0.25) * 100) / 100));
  const handleResetZoom = () => setZoomScale(1);

  // Box Crop State (in percentage 0-100)
  const [cropBox, setCropBox] = useState<CropBox>({
    x: 5,
    y: 5,
    width: 90,
    height: 90
  });

  // Dragging state for box crop handles
  const [dragHandle, setDragHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; box: CropBox } | null>(null);

  // Freehand Lasso / Drawing State
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [lassoPoints, setLassoPoints] = useState<{ x: number; y: number }[]>([]);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);

  const imageObjRef = useRef<HTMLImageElement | null>(null);

  // Run Smart Auto-Detection & Instant Crop of Document/KTP
  const runAutoEdgeDetection = useCallback((shouldInstantlyCrop: boolean = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    if (w <= 20 || h <= 20) return;

    try {
      const imgData = ctx.getImageData(0, 0, w, h);
      const data = imgData.data;

      // 1. Convert image to grayscale and compute contrast/edge gradients
      const gray = new Uint8Array(w * h);
      for (let i = 0; i < data.length; i += 4) {
        gray[i >> 2] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      }

      // 2. Sample gradient edges
      const step = Math.max(1, Math.floor(Math.min(w, h) / 200));
      const edgeXs: number[] = [];
      const edgeYs: number[] = [];

      for (let y = step; y < h - step; y += step) {
        for (let x = step; x < w - step; x += step) {
          const idx = y * w + x;
          const gx = Math.abs(gray[idx + step] - gray[idx - step]);
          const gy = Math.abs(gray[idx + w * step] - gray[idx - w * step]);
          const grad = gx + gy;

          if (grad > 25) {
            edgeXs.push(x);
            edgeYs.push(y);
          }
        }
      }

      let cropX = Math.round(w * 0.05);
      let cropY = Math.round(h * 0.05);
      let cropW = Math.round(w * 0.90);
      let cropH = Math.round(h * 0.90);

      if (edgeXs.length > 30) {
        edgeXs.sort((a, b) => a - b);
        edgeYs.sort((a, b) => a - b);

        // Filter out extreme 3% outliers (shadows, table edges)
        const p3 = Math.floor(edgeXs.length * 0.03);
        const p97 = Math.floor(edgeXs.length * 0.97);

        const minX = edgeXs[p3];
        const maxX = edgeXs[p97];
        const minY = edgeYs[p3];
        const maxY = edgeYs[p97];

        const detectedW = maxX - minX;
        const detectedH = maxY - minY;

        // Ensure detected object is reasonable size (at least 15% of width/height)
        if (detectedW > w * 0.15 && detectedH > h * 0.15) {
          const padX = Math.round(w * 0.01);
          const padY = Math.round(h * 0.01);

          cropX = Math.max(0, minX - padX);
          cropY = Math.max(0, minY - padY);
          cropW = Math.min(w - cropX, detectedW + padX * 2);
          cropH = Math.min(h - cropY, detectedH + padY * 2);
        }
      }

      if (shouldInstantlyCrop && cropW > 20 && cropH > 20) {
        // Crop canvas instantly to detected object
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = cropW;
        tempCanvas.height = cropH;
        const tempCtx = tempCanvas.getContext('2d');

        if (tempCtx) {
          tempCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

          canvas.width = cropW;
          canvas.height = cropH;
          ctx.clearRect(0, 0, cropW, cropH);
          ctx.drawImage(tempCanvas, 0, 0);

          const newImageData = ctx.getImageData(0, 0, cropW, cropH);
          setHistory((prev) => [...prev.slice(-10), newImageData]);

          // Reset crop box to full on new cropped image
          setCropBox({ x: 0, y: 0, width: 100, height: 100 });
          setIsAutoDetected(true);
        }
      } else {
        // Update box frame overlay
        const percentX = Math.round((cropX / w) * 100);
        const percentY = Math.round((cropY / h) * 100);
        const percentW = Math.round((cropW / w) * 100);
        const percentH = Math.round((cropH / h) * 100);

        setCropBox({
          x: Math.max(0, Math.min(85, percentX)),
          y: Math.max(0, Math.min(85, percentY)),
          width: Math.min(100 - percentX, Math.max(15, percentW)),
          height: Math.min(100 - percentY, Math.max(15, percentH))
        });
        setIsAutoDetected(true);
      }
    } catch {
      setCropBox({ x: 5, y: 5, width: 90, height: 90 });
      setIsAutoDetected(false);
    }
  }, []);

  // Initialize Canvas with Image when opened or image changes
  useEffect(() => {
    if (!isOpen || !imageDataUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageObjRef.current = img;
      const w = img.naturalWidth || img.width || 1000;
      const h = img.naturalHeight || img.height || 1000;

      // Clean default crop box (5% margin)
      setCropBox({ x: 5, y: 5, width: 90, height: 90 });
      setLassoPoints([]);
      setHistory([]);
      setZoomScale(1);

      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const initialData = ctx.getImageData(0, 0, w, h);
          setHistory([initialData]);
        }
      }
      setImgLoaded(true);
    };
    img.src = imageDataUrl;
  }, [isOpen, imageDataUrl]);

  // Save state to undo history
  const saveToHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setHistory((prev) => [...prev.slice(-10), currentData]);
  }, []);

  // Undo action
  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const newHistory = [...history];
    newHistory.pop();
    const previousState = newHistory[newHistory.length - 1];

    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
      setHistory(newHistory);
    }
  };

  // Reset to original image
  const handleReset = () => {
    if (!imageObjRef.current || !canvasRef.current) return;
    const img = imageObjRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const initialData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialData]);
      setCropBox({ x: 5, y: 5, width: 90, height: 90 });
      setLassoPoints([]);
      setZoomScale(1);
    }
  };

  // Convert pointer event to canvas coordinates
  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  // Drag handles for box crop
  const handleHandleMouseDown = (
    handle: string,
    e: React.MouseEvent | React.TouchEvent
  ) => {
    e.stopPropagation();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    setDragHandle(handle);
    setDragStart({
      x: clientX,
      y: clientY,
      box: { ...cropBox }
    });
  };

  // Handle Drag Move for Box Crop
  useEffect(() => {
    if (!dragHandle || !dragStart || !containerRef.current) return;

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;

      if ('touches' in e && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else if ('clientX' in e) {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const deltaX = ((clientX - dragStart.x) / rect.width) * 100;
      const deltaY = ((clientY - dragStart.y) / rect.height) * 100;

      const initial = dragStart.box;
      let newBox = { ...initial };

      const minSize = 10; // minimum 10%

      if (dragHandle === 'move') {
        newBox.x = Math.max(0, Math.min(100 - initial.width, initial.x + deltaX));
        newBox.y = Math.max(0, Math.min(100 - initial.height, initial.y + deltaY));
      } else {
        if (dragHandle.includes('nw')) {
          const maxDx = initial.width - minSize;
          const maxDy = initial.height - minSize;
          const clampedDx = Math.min(deltaX, maxDx);
          const clampedDy = Math.min(deltaY, maxDy);

          newBox.x = Math.max(0, initial.x + clampedDx);
          newBox.y = Math.max(0, initial.y + clampedDy);
          newBox.width = initial.width - clampedDx;
          newBox.height = initial.height - clampedDy;
        } else if (dragHandle.includes('ne')) {
          const clampedDy = Math.min(deltaY, initial.height - minSize);
          newBox.y = Math.max(0, initial.y + clampedDy);
          newBox.height = initial.height - clampedDy;
          newBox.width = Math.max(minSize, Math.min(100 - initial.x, initial.width + deltaX));
        } else if (dragHandle.includes('sw')) {
          const clampedDx = Math.min(deltaX, initial.width - minSize);
          newBox.x = Math.max(0, initial.x + clampedDx);
          newBox.width = initial.width - clampedDx;
          newBox.height = Math.max(minSize, Math.min(100 - initial.y, initial.height + deltaY));
        } else if (dragHandle.includes('se')) {
          newBox.width = Math.max(minSize, Math.min(100 - initial.x, initial.width + deltaX));
          newBox.height = Math.max(minSize, Math.min(100 - initial.y, initial.height + deltaY));
        } else if (dragHandle === 'n') {
          const clampedDy = Math.min(deltaY, initial.height - minSize);
          newBox.y = Math.max(0, initial.y + clampedDy);
          newBox.height = initial.height - clampedDy;
        } else if (dragHandle === 's') {
          newBox.height = Math.max(minSize, Math.min(100 - initial.y, initial.height + deltaY));
        } else if (dragHandle === 'w') {
          const clampedDx = Math.min(deltaX, initial.width - minSize);
          newBox.x = Math.max(0, initial.x + clampedDx);
          newBox.width = initial.width - clampedDx;
        } else if (dragHandle === 'e') {
          newBox.width = Math.max(minSize, Math.min(100 - initial.x, initial.width + deltaX));
        }
      }

      setCropBox(newBox);
    };

    const handlePointerUp = () => {
      setDragHandle(null);
      setDragStart(null);
    };

    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    window.addEventListener('touchmove', handlePointerMove);
    window.addEventListener('touchend', handlePointerUp);

    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('touchend', handlePointerUp);
    };
  }, [dragHandle, dragStart]);

  // Canvas Drawing for Lasso & Eraser
  const handleCanvasStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (activeTool === 'box') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);
    setIsDrawing(true);

    if (activeTool === 'eraser') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
    } else if (activeTool === 'lasso') {
      setLassoPoints([{ x, y }]);
    }
  };

  const handleCanvasMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || activeTool === 'box') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoords(e);

    if (activeTool === 'eraser') {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
    } else if (activeTool === 'lasso') {
      setLassoPoints((prev) => [...prev, { x, y }]);
    }
  };

  const handleCanvasEnd = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (activeTool === 'lasso' && lassoPoints.length > 2) {
      // Cut outside lasso loop: make everything outside white
      ctx.save();

      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = canvas.height;
      const tempCtx = tempCanvas.getContext('2d');

      if (tempCtx) {
        tempCtx.fillStyle = '#FFFFFF';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        tempCtx.save();
        tempCtx.beginPath();
        tempCtx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
        for (let i = 1; i < lassoPoints.length; i++) {
          tempCtx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
        }
        tempCtx.closePath();
        tempCtx.clip();

        tempCtx.drawImage(canvas, 0, 0);
        tempCtx.restore();

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(tempCanvas, 0, 0);
      }

      ctx.restore();
      setLassoPoints([]);
      saveToHistory();
    } else if (activeTool === 'eraser') {
      saveToHistory();
    }
  };

  // Render temporary lasso line on canvas
  useEffect(() => {
    if (activeTool !== 'lasso' || lassoPoints.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(lassoPoints[0].x, lassoPoints[0].y);
    for (let i = 1; i < lassoPoints.length; i++) {
      ctx.lineTo(lassoPoints[i].x, lassoPoints[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }, [lassoPoints, activeTool]);

  // Helper to extract current cropped region snippet
  const getCroppedSnippetDataUrl = (): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    if (activeTool === 'box') {
      const cropX = (cropBox.x / 100) * canvas.width;
      const cropY = (cropBox.y / 100) * canvas.height;
      const cropW = (cropBox.width / 100) * canvas.width;
      const cropH = (cropBox.height / 100) * canvas.height;

      if (cropW <= 10 || cropH <= 10) return null;

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = Math.round(cropW);
      cropCanvas.height = Math.round(cropH);

      const cropCtx = cropCanvas.getContext('2d');
      if (!cropCtx) return null;

      cropCtx.drawImage(
        canvas,
        cropX,
        cropY,
        cropW,
        cropH,
        0,
        0,
        cropW,
        cropH
      );

      return cropCanvas.toDataURL('image/jpeg', 0.88);
    } else {
      return canvas.toDataURL('image/jpeg', 0.88);
    }
  };

  const handleOpenOcrForArea = () => {
    const snippet = getCroppedSnippetDataUrl();
    if (snippet) {
      setOcrSnippet(snippet);
      setIsOcrOpen(true);
    }
  };

  const handleWarpPerspectiveApply = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = canvas.width;
    const h = canvas.height;

    const cropX = (cropBox.x / 100) * w;
    const cropY = (cropBox.y / 100) * h;
    const cropW = (cropBox.width / 100) * w;
    const cropH = (cropBox.height / 100) * h;

    const corners = {
      topLeft: { x: cropX, y: cropY },
      topRight: { x: cropX + cropW, y: cropY },
      bottomRight: { x: cropX + cropW, y: cropY + cropH },
      bottomLeft: { x: cropX, y: cropY + cropH }
    };

    try {
      const fullSnippet = canvas.toDataURL('image/jpeg', 0.9);
      const warpedDataUrl = await warpPerspective(fullSnippet, corners, Math.round(cropW), Math.round(cropH));
      onApplyCrop(warpedDataUrl);
      onClose();
    } catch (err) {
      console.error('Perspective warp failed:', err);
      handleApply();
    }
  };

  // Apply final crop
  const handleApply = () => {
    const finalDataUrl = getCroppedSnippetDataUrl();
    if (finalDataUrl) {
      onApplyCrop(finalDataUrl);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[130] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 10 }}
          className={`w-full max-w-3xl max-h-[96vh] flex flex-col rounded-3xl shadow-2xl overflow-hidden border my-auto ${
            isLight ? 'bg-white border-slate-800 text-slate-100' : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-3.5 border-b shrink-0 ${
            isLight ? 'border-slate-800 bg-slate-850/60' : 'border-slate-800 bg-slate-900'
          }`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 flex items-center justify-center shrink-0">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {lang === 'id' ? 'Potong Area Berkas' : 'Crop & Trim Document'}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {lang === 'id' ? 'Atur batas kertas agar background meja tidak terbawa' : 'Adjust document boundaries to trim background'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleUndo}
                disabled={history.length <= 1}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 disabled:opacity-30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 disabled:opacity-30'
                }`}
                title={lang === 'id' ? 'Batal (Undo)' : 'Undo'}
              >
                <Undo2 size={16} />
              </button>

              <button
                onClick={handleReset}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
                title={lang === 'id' ? 'Reset Ke Awal' : 'Reset Original'}
              >
                <RotateCcw size={16} />
              </button>

              <button
                onClick={onClose}
                className={`p-2 rounded-xl border transition-all cursor-pointer ml-1 ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                }`}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Tool Modes Navigation Bar */}
          <div className={`px-4 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 overflow-x-auto custom-scrollbar shrink-0 ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-950 border-slate-800/80'
          }`}>
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
              <button
                onClick={() => {
                  setActiveTool('box');
                  setDetectMode('auto');
                  runAutoEdgeDetection(true);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  activeTool === 'box' && detectMode === 'auto'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm ring-2 ring-indigo-500/30'
                    : isLight
                    ? 'bg-white text-slate-200 border-slate-800 hover:bg-slate-850'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/60 hover:text-slate-100'
                }`}
                title={lang === 'id' ? 'Deteksi Batas Kertas Otomatis' : 'Auto Detect Paper Edges'}
              >
                <Sparkles size={14} className="text-amber-300 animate-pulse" />
                <span>{lang === 'id' ? 'Auto Deteksi' : 'Auto Detect'}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTool('box');
                  setDetectMode('manual');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  activeTool === 'box' && detectMode === 'manual'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : isLight
                    ? 'bg-white text-slate-400 border-slate-800 hover:bg-slate-850'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
                title={lang === 'id' ? 'Atur Garis Potong Manual' : 'Manual Frame Adjustment'}
              >
                <Crop size={14} />
                <span>{lang === 'id' ? 'Potong Manual' : 'Manual Crop'}</span>
              </button>

              <button
                onClick={() => setActiveTool('lasso')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  activeTool === 'lasso'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : isLight
                    ? 'bg-white text-slate-400 border-slate-800 hover:bg-slate-850'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <Pencil size={14} />
                <span>{lang === 'id' ? 'Potong Bebas' : 'Freehand'}</span>
              </button>

              <button
                onClick={() => setActiveTool('eraser')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                  activeTool === 'eraser'
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                    : isLight
                    ? 'bg-white text-slate-400 border-slate-800 hover:bg-slate-850'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
                }`}
              >
                <Eraser size={14} />
                <span>{lang === 'id' ? 'Penghapus' : 'Eraser'}</span>
              </button>
            </div>

            {activeTool === 'box' && (
              <div className="flex items-center gap-1 shrink-0 overflow-x-auto custom-scrollbar">
                <button
                  onClick={() => setCropBox({ x: 5, y: 5, width: 90, height: 90 })}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    isLight ? 'bg-white border-slate-800 text-slate-200 hover:bg-slate-850' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={lang === 'id' ? 'Bingkai Standar Dokumen A4' : 'Standard Document Frame'}
                >
                  {lang === 'id' ? 'Dokumen (A4)' : 'Document (A4)'}
                </button>

                <button
                  onClick={() => setCropBox({ x: 15, y: 20, width: 70, height: 60 })}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    isLight ? 'bg-white border-slate-800 text-slate-200 hover:bg-slate-850' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={lang === 'id' ? 'Bingkai Ukuran Kartu/KTP/SIM' : 'ID Card Frame'}
                >
                  {lang === 'id' ? 'Kartu / KTP' : 'ID Card / KTP'}
                </button>

                <button
                  onClick={() => setCropBox({ x: 0, y: 0, width: 100, height: 100 })}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                    isLight ? 'bg-white border-slate-800 text-slate-200 hover:bg-slate-850' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                  }`}
                  title={lang === 'id' ? 'Ambil Seluruh Gambar' : 'Full Image Frame'}
                >
                  {lang === 'id' ? 'Ukuran Penuh' : 'Full Size'}
                </button>
              </div>
            )}

            {activeTool === 'eraser' && (
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-bold text-slate-400">
                  {lang === 'id' ? 'Ukuran:' : 'Size:'}
                </span>
                {[12, 24, 48].map((size) => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                      brushSize === size
                        ? 'bg-indigo-600 border-white ring-2 ring-indigo-500/40 scale-110'
                        : isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <div
                      className="rounded-full bg-white"
                      style={{ width: Math.max(4, size / 5), height: Math.max(4, size / 5) }}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Workspace Area */}
          <div className="relative bg-slate-950 flex-1 min-h-[240px] flex items-center justify-center p-3 overflow-auto select-none custom-scrollbar">
            {/* Floating Zoom Controls Badge */}
            <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-slate-900/90 border border-slate-700/80 rounded-xl p-1 shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoomScale <= 1}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
                title={lang === 'id' ? 'Perkecil' : 'Zoom Out'}
              >
                <ZoomOut size={15} />
              </button>

              <button
                type="button"
                onClick={handleResetZoom}
                className="px-2 py-1 text-[11px] font-extrabold text-indigo-300 hover:text-indigo-200 hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
                title={lang === 'id' ? 'Reset Zoom (100%)' : 'Reset Zoom'}
              >
                {Math.round(zoomScale * 100)}%
              </button>

              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoomScale >= 3.5}
                className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition-all cursor-pointer"
                title={lang === 'id' ? 'Perbesar' : 'Zoom In'}
              >
                <ZoomIn size={15} />
              </button>
            </div>

            {/* Canvas Container with Smooth Scale Transform */}
            <div
              ref={containerRef}
              style={{
                transform: `scale(${zoomScale})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out'
              }}
              className="relative max-h-[50vh] max-w-full flex items-center justify-center shadow-2xl rounded-2xl overflow-hidden border border-slate-800 bg-slate-900"
            >
              <canvas
                ref={canvasRef}
                onMouseDown={handleCanvasStart}
                onMouseMove={handleCanvasMove}
                onMouseUp={handleCanvasEnd}
                onTouchStart={handleCanvasStart}
                onTouchMove={handleCanvasMove}
                onTouchEnd={handleCanvasEnd}
                className={`max-h-[50vh] max-w-full object-contain ${
                  activeTool === 'lasso'
                    ? 'cursor-crosshair'
                    : activeTool === 'eraser'
                    ? 'cursor-cell'
                    : 'cursor-default'
                }`}
              />

              {/* BOX CROP OVERLAY WITH CRISP BRIGHT INNER & DARK OUTER MASKS */}
              {activeTool === 'box' && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Top Dark Mask */}
                  <div
                    className="absolute bg-slate-950/75 backdrop-blur-[1px] left-0 right-0 top-0"
                    style={{ height: `${cropBox.y}%` }}
                  />
                  {/* Bottom Dark Mask */}
                  <div
                    className="absolute bg-slate-950/75 backdrop-blur-[1px] left-0 right-0 bottom-0"
                    style={{ height: `${100 - (cropBox.y + cropBox.height)}%` }}
                  />
                  {/* Left Dark Mask */}
                  <div
                    className="absolute bg-slate-950/75 backdrop-blur-[1px] left-0"
                    style={{
                      top: `${cropBox.y}%`,
                      height: `${cropBox.height}%`,
                      width: `${cropBox.x}%`
                    }}
                  />
                  {/* Right Dark Mask */}
                  <div
                    className="absolute bg-slate-950/75 backdrop-blur-[1px] right-0"
                    style={{
                      top: `${cropBox.y}%`,
                      height: `${cropBox.height}%`,
                      width: `${100 - (cropBox.x + cropBox.width)}%`
                    }}
                  />

                  {/* Clear Crop Box Frame */}
                  <div
                    className="absolute border-2 border-indigo-500 shadow-[0_0_25px_rgba(99,102,241,0.35)] pointer-events-auto cursor-move"
                    style={{
                      left: `${cropBox.x}%`,
                      top: `${cropBox.y}%`,
                      width: `${cropBox.width}%`,
                      height: `${cropBox.height}%`
                    }}
                    onMouseDown={(e) => handleHandleMouseDown('move', e)}
                    onTouchStart={(e) => handleHandleMouseDown('move', e)}
                  >
                    {/* 3x3 Grid Lines */}
                    <div className="w-full h-full grid grid-cols-3 grid-rows-3 opacity-30 pointer-events-none">
                      <div className="border-r border-b border-indigo-200" />
                      <div className="border-r border-b border-indigo-200" />
                      <div className="border-b border-indigo-200" />
                      <div className="border-r border-b border-indigo-200" />
                      <div className="border-r border-b border-indigo-200" />
                      <div className="border-b border-indigo-200" />
                      <div className="border-r border-indigo-200" />
                      <div className="border-r border-indigo-200" />
                      <div />
                    </div>

                    {/* Corner Scanner L-Brackets */}
                    {/* Top Left */}
                    <div className="absolute top-0 left-0 w-5 h-5 border-t-3 border-l-3 border-indigo-400 -mt-1 -ml-1 rounded-tl-md pointer-events-none" />
                    {/* Top Right */}
                    <div className="absolute top-0 right-0 w-5 h-5 border-t-3 border-r-3 border-indigo-400 -mt-1 -mr-1 rounded-tr-md pointer-events-none" />
                    {/* Bottom Left */}
                    <div className="absolute bottom-0 left-0 w-5 h-5 border-b-3 border-l-3 border-indigo-400 -mb-1 -ml-1 rounded-bl-md pointer-events-none" />
                    {/* Bottom Right */}
                    <div className="absolute bottom-0 right-0 w-5 h-5 border-b-3 border-r-3 border-indigo-400 -mb-1 -mr-1 rounded-br-md pointer-events-none" />

                    {/* Drag Handles */}
                    {[
                      { id: 'nw', class: '-top-3 -left-3 cursor-nwse-resize' },
                      { id: 'ne', class: '-top-3 -right-3 cursor-nesw-resize' },
                      { id: 'sw', class: '-bottom-3 -left-3 cursor-nesw-resize' },
                      { id: 'se', class: '-bottom-3 -right-3 cursor-nwse-resize' },
                      { id: 'n', class: '-top-2.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
                      { id: 's', class: '-bottom-2.5 left-1/2 -translate-x-1/2 cursor-ns-resize' },
                      { id: 'w', class: '-left-2.5 top-1/2 -translate-y-1/2 cursor-ew-resize' },
                      { id: 'e', class: '-right-2.5 top-1/2 -translate-y-1/2 cursor-ew-resize' }
                    ].map((h) => {
                      const isCorner = h.id.length === 2;
                      return (
                        <div
                          key={h.id}
                          onMouseDown={(e) => handleHandleMouseDown(h.id, e)}
                          onTouchStart={(e) => handleHandleMouseDown(h.id, e)}
                          className={`absolute ${h.class} ${
                            isCorner
                              ? 'w-6 h-6 bg-indigo-500 border-2 border-white rounded-full shadow-lg ring-4 ring-indigo-500/25'
                              : 'w-5 h-2.5 bg-white border-2 border-indigo-600 rounded-full shadow-md'
                          } pointer-events-auto hover:scale-125 transition-transform`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer Guidance & Actions */}
          <div className={`p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 ${
            isLight ? 'border-slate-800 bg-slate-850/60' : 'border-slate-800 bg-slate-900'
          }`}>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Info size={15} className="text-indigo-500 shrink-0" />
              <span>
                {activeTool === 'box'
                  ? (lang === 'id' ? 'Geser sudut garis biru untuk menyesuaikan batas kertas' : 'Drag blue corner handles to fit document paper')
                  : activeTool === 'lasso'
                  ? (lang === 'id' ? 'Lingkari area kertas dengan pensil/jari untuk memotong' : 'Draw a loop around the document with pencil to crop')
                  : (lang === 'id' ? 'Usap area meja/background yang ingin dihapus' : 'Paint over background area to erase')}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleOpenOcrForArea}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
                title={lang === 'id' ? 'Ekstrak Teks OCR dari Area Pilihan' : 'Extract OCR Text from Area'}
              >
                <FileText size={15} />
                <span>{lang === 'id' ? 'Teks OCR Area' : 'OCR Area'}</span>
              </button>

              <button
                type="button"
                onClick={handleWarpPerspectiveApply}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title={lang === 'id' ? 'Koreksi Perspektif & Ratakan Area Pilihan' : 'Flatten & Correct Perspective'}
              >
                <Crop size={15} className="text-indigo-400" />
                <span>{lang === 'id' ? 'Ratakan Perspektif' : 'Un-skew'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 font-bold text-xs rounded-xl transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>

              <button
                type="button"
                onClick={handleApply}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/25 active:scale-95"
              >
                <Check size={16} />
                <span>{lang === 'id' ? 'Terapkan Potong' : 'Apply Crop'}</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Privacy-First OCR Text Extraction Modal */}
        <OCRModal
          isOpen={isOcrOpen}
          onClose={() => setIsOcrOpen(false)}
          imageSnippet={ocrSnippet}
          lang={lang}
          isLight={isLight}
        />
      </div>
    </AnimatePresence>
  );
}

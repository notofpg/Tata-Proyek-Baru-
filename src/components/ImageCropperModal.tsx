import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ZoomIn, ZoomOut, Move, Check, RotateCcw, Crop, Maximize2, Minimize2, Smartphone, Image as ImageIcon, Sparkles, Crosshair } from 'lucide-react';
import { useTranslation } from '../translations';

interface ImageCropperModalProps {
  isOpen: boolean;
  imageSrc: string | null;
  aspectRatio?: number;
  targetType?: 'custom' | 'banner';
  title?: string;
  lang?: 'id' | 'en';
  onCancel: () => void;
  onCropComplete: (croppedDataUrl: string) => void;
}

export default function ImageCropperModal({
  isOpen,
  imageSrc,
  aspectRatio,
  targetType = 'custom',
  title,
  lang = 'id',
  onCancel,
  onCropComplete
}: ImageCropperModalProps) {
  const t = useTranslation(lang);

  // Calculate dynamic device screen aspect ratio
  const getDeviceAspectRatio = useCallback(() => {
    if (typeof window !== 'undefined' && window.innerWidth && window.innerHeight) {
      if (window.innerWidth < window.innerHeight) {
        return Math.round((window.innerWidth / window.innerHeight) * 1000) / 1000;
      }
    }
    return 9 / 19.5; // Modern phone standard (portrait)
  }, []);

  // Natural image dimensions
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // Active aspect ratio state
  const [activeRatio, setActiveRatio] = useState<number>(() => {
    if (aspectRatio) return aspectRatio;
    if (targetType === 'banner') return 2.6;
    return getDeviceAspectRatio();
  });

  const [selectedRatioId, setSelectedRatioId] = useState<string>('device');

  // User transform states (scale relative to baseFitScale, position offset in pixels relative to center)
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionStartRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Calculate explicit preview container dimensions matching activeRatio perfectly
  const getCropBoxDimensions = useCallback(() => {
    const maxW = 320;
    const maxH = targetType === 'banner' ? 140 : 280;

    let w: number;
    let h: number;

    if (activeRatio >= 1) {
      w = maxW;
      h = Math.round(w / activeRatio);
      if (h > maxH) {
        h = maxH;
        w = Math.round(h * activeRatio);
      }
    } else {
      h = maxH;
      w = Math.round(h * activeRatio);
      if (w > maxW) {
        w = maxW;
        h = Math.round(w / activeRatio);
      }
    }

    return { w: Math.max(120, w), h: Math.max(80, h) };
  }, [activeRatio, targetType]);

  const cropBoxDim = getCropBoxDimensions();

  // Reset and load natural image size when imageSrc or isOpen changes
  useEffect(() => {
    if (isOpen && imageSrc) {
      const img = new Image();
      img.onload = () => {
        const natSize = { width: img.naturalWidth, height: img.naturalHeight };
        setNaturalSize(natSize);
        setScale(1);
        setPosition({ x: 0, y: 0 });

        if (targetType === 'banner') {
          setActiveRatio(aspectRatio || 2.6);
          setSelectedRatioId('banner_std');
        } else {
          const devRatio = getDeviceAspectRatio();
          setActiveRatio(devRatio);
          setSelectedRatioId('device');
        }
      };
      img.src = imageSrc;
    } else {
      setNaturalSize(null);
    }
  }, [isOpen, imageSrc, targetType, aspectRatio, getDeviceAspectRatio]);

  // Handle Drag / Pan (Mouse & Touch)
  const handlePointerDown = (clientX: number, clientY: number) => {
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    positionStartRef.current = { ...position };
  };

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setPosition({
      x: positionStartRef.current.x + dx,
      y: positionStartRef.current.y + dy
    });
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
    pinchStartDistRef.current = null;
  }, []);

  // Multi-touch gestures (Pinch to Zoom & Touch Pan)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      setIsDragging(false);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = scale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2 && pinchStartDistRef.current !== null) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const scaleMultiplier = currentDist / pinchStartDistRef.current;
      const newScale = Math.max(0.3, Math.min(3.5, pinchStartScaleRef.current * scaleMultiplier));
      setScale(Math.round(newScale * 100) / 100);
    }
  };

  const handleTouchEnd = () => {
    handlePointerUp();
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
    const onMouseUp = () => handlePointerUp();

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Mouse wheel zoom on crop box
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setScale(prev => Math.max(0.3, Math.min(3.5, Math.round((prev + delta) * 100) / 100)));
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // Calculate base scale to fit or cover image cleanly inside the crop container
  const getDisplayMetrics = useCallback(() => {
    if (!naturalSize) return null;
    const boxW = cropBoxDim.w;
    const boxH = cropBoxDim.h;

    const imgW = naturalSize.width;
    const imgH = naturalSize.height;

    // Cover scale: scale so image fills the entire box without black bars initially
    const scaleCover = Math.max(boxW / imgW, boxH / imgH);
    // Contain scale: scale so full image is visible
    const scaleContain = Math.min(boxW / imgW, boxH / imgH);

    // Default base scale uses Cover so no black bars initially
    const baseScale = scaleCover;

    const renderedW = imgW * baseScale * scale;
    const renderedH = imgH * baseScale * scale;

    const left = (boxW - renderedW) / 2 + position.x;
    const top = (boxH - renderedH) / 2 + position.y;

    return {
      boxW,
      boxH,
      imgW,
      imgH,
      renderedW,
      renderedH,
      left,
      top,
      scaleCover,
      scaleContain
    };
  }, [naturalSize, scale, position, cropBoxDim]);

  // Direct Apply Original Photo (Zero Crop Frustration)
  const handleUseOriginal = () => {
    if (!imageSrc) return;
    onCropComplete(imageSrc);
  };

  // Crop & Export Canvas with Pixel-Perfect Alignment
  const handleApplyCrop = () => {
    if (!naturalSize || !imageSrc) return;
    const metrics = getDisplayMetrics();
    if (!metrics) return;

    // Target high-res canvas dimensions
    const outputWidth = targetType === 'banner' ? 1440 : 1080;
    const outputHeight = Math.round(outputWidth / activeRatio);

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Precise scaling from preview box to canvas
    const scaleFactor = outputWidth / cropBoxDim.w;

    const drawX = metrics.left * scaleFactor;
    const drawY = metrics.top * scaleFactor;
    const drawW = metrics.renderedW * scaleFactor;
    const drawH = metrics.renderedH * scaleFactor;

    const imgElement = new Image();
    imgElement.crossOrigin = 'anonymous';
    imgElement.onload = () => {
      // Solid dark base
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, outputWidth, outputHeight);

      // If the transformed photo does not fully cover the bounds, create a smooth blurred glow backdrop
      const coversCanvas = drawX <= 0 && drawY <= 0 && (drawX + drawW) >= outputWidth && (drawY + drawH) >= outputHeight;
      if (!coversCanvas) {
        ctx.save();
        ctx.filter = 'blur(30px) brightness(0.7)';
        ctx.drawImage(imgElement, 0, 0, outputWidth, outputHeight);
        ctx.restore();
      }

      // Draw the sharp cropped image
      ctx.drawImage(imgElement, drawX, drawY, drawW, drawH);
      const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.93);
      onCropComplete(croppedDataUrl);
    };
    imgElement.src = imageSrc;
  };

  if (!isOpen || !imageSrc) return null;

  const metrics = getDisplayMetrics();

  // Aspect ratio presets based on target
  const ratioPresets = targetType === 'banner' ? [
    { id: 'banner_std', label: '2.6:1 (Standar)', ratio: 2.6 },
    { id: 'banner_wide', label: '3:1 (Lebar)', ratio: 3.0 },
    { id: 'banner_mid', label: '2:1 (Sedang)', ratio: 2.0 },
    { id: 'banner_16_9', label: '16:9', ratio: 16 / 9 },
    { id: 'original', label: 'Asli', ratio: naturalSize ? naturalSize.width / naturalSize.height : 2.6 },
  ] : [
    { id: 'device', label: lang === 'id' ? 'Layar HP (9:19.5)' : 'Phone (9:19.5)', ratio: 9 / 19.5, icon: Smartphone },
    { id: 'phone_9_16', label: 'HP 9:16', ratio: 9 / 16 },
    { id: 'original', label: lang === 'id' ? 'Foto Asli' : 'Original', ratio: naturalSize ? naturalSize.width / naturalSize.height : 9 / 19.5, icon: ImageIcon },
    { id: 'square', label: '1:1', ratio: 1 },
    { id: 'landscape', label: '16:9', ratio: 16 / 9 },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/92 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto"
        onClick={onCancel}
      >
        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-[1.75rem] sm:rounded-[2rem] w-full max-w-lg max-h-[96dvh] sm:max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900 shrink-0 z-10">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Crop className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-black text-slate-100 tracking-tight truncate">
                  {title || (lang === 'id' ? 'Atur Posisi & Ukuran Foto' : 'Position & Fit Photo')}
                </h3>
                <p className="text-[11px] text-slate-400 font-medium truncate flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>{lang === 'id' ? 'Foto diposisikan pas dengan layar perangkat Anda' : 'Frame fits perfectly with your device display'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={onCancel}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-xl transition-all cursor-pointer shrink-0 ml-2"
              title={lang === 'id' ? 'Tutup' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Notice Banner & Use Original Button */}
          <div className="px-3 sm:px-5 py-2 bg-indigo-950/40 border-b border-indigo-900/30 flex items-center justify-between gap-2 shrink-0">
            <span className="text-[11px] text-indigo-200/90 font-medium flex items-center gap-1.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 animate-ping" />
              <span>{lang === 'id' ? 'Ingin pakai foto utuh tanpa crop?' : 'Want full photo without crop?'}</span>
            </span>
            <button
              type="button"
              onClick={handleUseOriginal}
              className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all shadow-xs shrink-0 cursor-pointer flex items-center gap-1 active:scale-95"
            >
              <ImageIcon className="w-3 h-3" />
              <span>{lang === 'id' ? 'Pakai Foto Asli' : 'Use Original'}</span>
            </button>
          </div>

          {/* Scrollable Preview and Controls Body */}
          <div className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-4 bg-slate-950/70 flex flex-col items-center justify-start gap-3 no-scrollbar sm:custom-scrollbar">
            
            {/* Aspect Ratio Selector Chips */}
            <div className="w-full max-w-md shrink-0">
              <div className="flex items-center justify-between mb-1.5 px-0.5">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {lang === 'id' ? 'Rasio Potongan (Pilih agar Pas):' : 'Aspect Ratio:'}
                </span>
                {selectedRatioId === 'device' && (
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    {lang === 'id' ? '✓ Pas Layar HP Ini' : '✓ Matches This Screen'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                {ratioPresets.map((preset) => {
                  const isSelected = selectedRatioId === preset.id;
                  const Icon = (preset as any).icon;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedRatioId(preset.id);
                        setActiveRatio(preset.ratio);
                        handleReset();
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-400 text-white shadow-sm'
                          : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {Icon && <Icon className="w-3 h-3" />}
                      <span>{preset.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Crop Viewport Box Container - Responsive Clamping to Prevent Cutoffs */}
            <div className="w-full flex items-center justify-center py-0.5 shrink-0">
              <div
                ref={containerRef}
                style={{
                  width: `${cropBoxDim.w}px`,
                  height: `${cropBoxDim.h}px`,
                }}
                className="relative rounded-2xl overflow-hidden border-2 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.35)] bg-slate-950 cursor-grab active:cursor-grabbing select-none touch-none mx-auto shrink-0"
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onWheel={handleWheel}
              >
                {/* Positioned & Scaled Image */}
                {metrics && (
                  <div
                    style={{
                      width: metrics.renderedW,
                      height: metrics.renderedH,
                      transform: `translate(${metrics.left}px, ${metrics.top}px)`,
                      transition: isDragging ? 'none' : 'transform 0.08s linear'
                    }}
                    className="absolute top-0 left-0 pointer-events-none origin-top-left"
                  >
                    <img
                      ref={imageRef}
                      src={imageSrc}
                      alt="Target to Crop"
                      className="w-full h-full object-fill select-none pointer-events-none"
                      draggable={false}
                    />
                  </div>
                )}

                {/* Grid Rule of Thirds Overlay */}
                <div className="absolute inset-0 border border-indigo-400/30 pointer-events-none grid grid-cols-3 grid-rows-3">
                  <div className="border-r border-b border-indigo-400/15" />
                  <div className="border-r border-b border-indigo-400/15" />
                  <div className="border-b border-indigo-400/15" />
                  <div className="border-r border-b border-indigo-400/15" />
                  <div className="border-r border-b border-indigo-400/15" />
                  <div className="border-b border-indigo-400/15" />
                  <div className="border-r border-b border-indigo-400/15" />
                  <div className="border-r border-b border-indigo-400/15" />
                  <div />
                </div>

                {/* Corner Framing Markers */}
                <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-indigo-400 pointer-events-none rounded-tl" />
                <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-indigo-400 pointer-events-none rounded-tr" />
                <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-indigo-400 pointer-events-none rounded-bl" />
                <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-indigo-400 pointer-events-none rounded-br" />

                {/* Live Guide Floating Pill */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none bg-slate-950/80 backdrop-blur-sm border border-white/20 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white/90 shadow-md">
                  {lang === 'id' ? 'Sentuh & geser untuk posisikan' : 'Touch & drag to frame'}
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-2.5 sm:p-3 flex flex-col gap-2.5 shrink-0">
              {/* Zoom Slider Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScale(prev => Math.max(0.3, Math.round((prev - 0.15) * 100) / 100))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer shrink-0"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-center gap-2 px-1">
                  <input
                    type="range"
                    min="0.3"
                    max="3"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
                  />
                  <span className="text-[11px] font-mono font-bold text-indigo-400 w-11 text-right shrink-0">
                    {Math.round(scale * 100)}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setScale(prev => Math.min(3, Math.round((prev + 0.15) * 100) / 100))}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer shrink-0"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-all cursor-pointer shrink-0"
                  title={lang === 'id' ? 'Reset Posisi' : 'Reset Position'}
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {/* View Mode Quick Buttons */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/80 text-slate-400">
                <span className="text-[11px] font-medium">{lang === 'id' ? 'Kerapian Tampilan:' : 'Fit Mode:'}</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (metrics) {
                        setScale(Math.round((metrics.scaleContain / metrics.scaleCover) * 100) / 100);
                        setPosition({ x: 0, y: 0 });
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <Minimize2 className="w-3 h-3 text-indigo-400" />
                    <span>{lang === 'id' ? 'Lihat Utuh' : 'Show Full'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScale(1);
                      setPosition({ x: 0, y: 0 });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                  >
                    <Maximize2 className="w-3 h-3 text-indigo-400" />
                    <span>{lang === 'id' ? 'Isi Penuh' : 'Fill Box'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPosition({ x: 0, y: 0 })}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    title={lang === 'id' ? 'Pusatkan Foto' : 'Center Photo'}
                  >
                    <Crosshair className="w-3 h-3 text-indigo-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer - ALWAYS VISIBLE / STICKY ON MOBILE */}
          <div className="p-3 sm:p-4 border-t border-slate-800/80 bg-slate-900 sticky bottom-0 z-20 flex items-center justify-end gap-2.5 shrink-0 shadow-[0_-4px_16px_rgba(0,0,0,0.4)]">
            <button
              type="button"
              onClick={onCancel}
              className="py-2.5 px-4 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer"
            >
              {lang === 'id' ? 'Batal' : 'Cancel'}
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl font-extrabold text-xs bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-indigo-600/30 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{lang === 'id' ? 'Simpan & Terapkan' : 'Save & Apply'}</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

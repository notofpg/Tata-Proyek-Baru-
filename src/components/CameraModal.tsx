import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera,
  X,
  FileText,
  Image as ImageIcon,
  SwitchCamera,
  RotateCcw,
  RotateCw,
  Check,
  Grid,
  AlertCircle,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { compressImageBase64 } from '../utils/imageCompressor';

interface CameraModalProps {
  isOpen: boolean;
  lang?: 'id' | 'en';
  onClose: () => void;
  onCapture: (dataUrlOrUrls: string | string[]) => void;
  onOpenScanner?: (capturedDataUrl?: string) => void;
}

export default function CameraModal({
  isOpen,
  lang = 'id',
  onClose,
  onCapture,
  onOpenScanner
}: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [flashAnimation, setFlashAnimation] = useState<boolean>(false);

  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera tracks helper
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  // Start live camera stream
  const startCamera = useCallback(async () => {
    setIsCameraLoading(true);
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(lang === 'id' ? 'Kamera tidak didukung di peramban ini.' : 'Camera not supported in this browser.');
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
          console.warn('Camera constraint attempt failed:', c, e);
        }
      }

      if (!mediaStream) {
        throw new Error(lang === 'id' ? 'Gagal mengakses kamera' : 'Failed to access camera');
      }

      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsCameraLoading(false);
    } catch (err: any) {
      console.error('Camera access error:', err);
      setIsCameraLoading(false);
      let errMsg = lang === 'id'
        ? 'Izin akses kamera belum aktif di browser. Tekan "Minta Izin / Buka Kamera Live" di bawah untuk mengaktifkan kamera.'
        : 'Camera access permission not active in browser. Tap "Request Permission / Open Live Camera" below.';
      if (err?.name === 'NotAllowedError' || err?.message?.includes('Permission denied')) {
        errMsg = lang === 'id'
          ? 'Izin kamera ditolak oleh browser. Tekan "Minta Izin / Buka Kamera Live" atau izinkan di pengaturan situs browser Anda.'
          : 'Camera permission denied by browser. Tap "Request Permission / Open Live Camera" or allow in browser site settings.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        errMsg = lang === 'id'
          ? 'Perangkat kamera tidak ditemukan pada perangkat ini.'
          : 'Camera device not found on this device.';
      }
      setCameraError(errMsg);
    }
  }, [facingMode, lang, stopCameraStream]);

  // Bind video element when mounted or stream updated
  useEffect(() => {
    const videoEl = videoRef.current;
    if (videoEl && stream) {
      videoEl.srcObject = stream;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      const handleMetadata = () => {
        videoEl.play().catch((err) => console.log('Camera play metadata err:', err));
      };
      videoEl.addEventListener('loadedmetadata', handleMetadata);
      videoEl.play().catch((err) => console.log('Camera play direct err:', err));

      return () => {
        videoEl.removeEventListener('loadedmetadata', handleMetadata);
      };
    }
  }, [stream, isOpen, capturedImage]);

  // Effect to manage stream lifecycle when modal opens / closes / facingMode changes
  useEffect(() => {
    if (isOpen && !capturedImage) {
      startCamera();
    } else if (!isOpen) {
      stopCameraStream();
      setCapturedImage(null);
      setCameraError(null);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, facingMode, capturedImage]);

  // Handle shutter capture
  const handleSnap = async () => {
    if (!videoRef.current) return;

    // Trigger visual screen flash
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 200);

    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Flip horizontally if using front camera
    if (facingMode === 'user') {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, width, height);
    const rawDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    // Compress image
    const compressed = await compressImageBase64(rawDataUrl, 1600, 1600, 0.82);
    setCapturedImage(compressed);

    // Stop video stream during review
    stopCameraStream();
  };

  // Toggle camera direction (Front / Rear)
  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Handle photo selection from gallery (supports single and multiple)
  const handleGalleryFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    if (files.length === 1) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        let dataUrl = event.target?.result as string;
        if (dataUrl) {
          dataUrl = await compressImageBase64(dataUrl, 1600, 1600, 0.82);
          setCapturedImage(dataUrl);
          stopCameraStream();
        }
      };
      reader.readAsDataURL(files[0]);
    } else {
      // Multiple files chosen: process all, insert immediately, and close modal
      const promises = files.map((file) => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            let dataUrl = event.target?.result as string;
            if (dataUrl) {
              try {
                dataUrl = await compressImageBase64(dataUrl, 1600, 1600, 0.82);
              } catch (err) {
                console.error("Compression error:", err);
              }
            }
            resolve(dataUrl || '');
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      });

      const results = await Promise.all(promises);
      const valid = results.filter(Boolean);
      if (valid.length > 0) {
        onCapture(valid);
        stopCameraStream();
        onClose();
      }
    }
  };

  // Retake photo (Resume camera stream)
  const handleRetake = () => {
    setCapturedImage(null);
  };

  // Confirm and use captured photo
  const handleConfirmUse = () => {
    if (capturedImage) {
      onCapture(capturedImage);
      stopCameraStream();
      onClose();
    }
  };

  // Send photo to scanner
  const handleSendToScanner = () => {
    if (capturedImage && onOpenScanner) {
      const img = capturedImage;
      onClose();
      onOpenScanner(img);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-slate-950/95 backdrop-blur-lg z-[120] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
        onClick={onClose}
      >
        {/* Hidden gallery & native camera inputs */}
        <input
          type="file"
          ref={galleryInputRef}
          onChange={handleGalleryFile}
          onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
          accept="image/*,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic"
          multiple
          className="hidden"
        />
        <input
          type="file"
          ref={nativeCameraInputRef}
          onChange={handleGalleryFile}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        <motion.div
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col relative my-auto max-h-[95vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Bar Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/90 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5">
                  <span>{lang === 'id' ? 'Kamera Tata' : 'Tata Camera'}</span>
                  <Sparkles size={13} className="text-amber-400" />
                </h3>
                <p className="text-[11px] text-slate-400">
                  {capturedImage
                    ? (lang === 'id' ? 'Pratinjau Foto Catatan' : 'Photo Preview')
                    : (lang === 'id' ? 'Foto langsung & simpan ke catatan' : 'Capture & save directly to note')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {!capturedImage && !cameraError && (
                <>
                  <button
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      showGrid
                        ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30'
                        : 'bg-slate-800/80 text-slate-400 border-slate-700/60 hover:text-slate-200'
                    }`}
                    title={lang === 'id' ? 'Garis Kisi (Grid)' : 'Grid Overlay'}
                  >
                    <Grid size={16} />
                  </button>

                  <button
                    onClick={handleToggleFacingMode}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all cursor-pointer"
                    title={lang === 'id' ? 'Tukar Kamera Depan / Belakang' : 'Switch Camera'}
                  >
                    <SwitchCamera size={16} />
                  </button>
                </>
              )}

              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-xl transition-all cursor-pointer ml-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Camera Viewfinder / Preview Body */}
          <div className="relative bg-slate-950 flex-1 min-h-[320px] sm:min-h-[400px] flex items-center justify-center overflow-hidden">
            {/* Flash Effect Layer */}
            {flashAnimation && (
              <div className="absolute inset-0 bg-white z-50 pointer-events-none animate-ping" />
            )}

            {capturedImage ? (
              /* Review Captured Photo Mode */
              <div className="relative w-full h-full flex items-center justify-center p-3 bg-slate-950">
                <img
                  src={capturedImage}
                  alt="Captured note"
                  className="max-h-[50vh] sm:max-h-[58vh] max-w-full object-contain rounded-2xl border border-slate-800 shadow-xl"
                />
              </div>
            ) : cameraError ? (
              /* Error State */
              <div className="p-6 text-center max-w-xs flex flex-col items-center">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-3">
                  <AlertCircle size={24} />
                </div>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed font-medium">
                  {cameraError}
                </p>
                <div className="flex flex-col gap-2.5 w-full">
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
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <ImageIcon size={14} className="text-indigo-400" />
                    <span>{lang === 'id' ? 'Pilih Foto dari Galeri (Bisa Banyak)' : 'Choose Photos from Gallery (Multi-select)'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Live Camera Stream Mode */
              <div className="relative w-full h-full flex items-center justify-center bg-black min-h-[320px]">
                {isCameraLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 text-slate-400 gap-2">
                    <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">
                      {lang === 'id' ? 'Membuka Kamera...' : 'Opening Camera...'}
                    </span>
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full max-h-[50vh] sm:max-h-[58vh] object-cover ${
                    facingMode === 'user' ? 'scale-x-[-1]' : ''
                  }`}
                />

                {/* Viewfinder Target Framing Corners */}
                <div className="absolute inset-6 sm:inset-10 border-2 border-indigo-500/40 rounded-3xl pointer-events-none flex flex-col justify-between p-3">
                  <div className="flex justify-between">
                    <div className="w-5 h-5 border-t-2 border-l-2 border-indigo-400 rounded-tl-lg" />
                    <div className="w-5 h-5 border-t-2 border-r-2 border-indigo-400 rounded-tr-lg" />
                  </div>
                  <div className="flex justify-between">
                    <div className="w-5 h-5 border-b-2 border-l-2 border-indigo-400 rounded-bl-lg" />
                    <div className="w-5 h-5 border-b-2 border-r-2 border-indigo-400 rounded-br-lg" />
                  </div>
                </div>

                {/* Rule of Thirds Grid Overlay */}
                {showGrid && (
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom Action Controls */}
          <div className="p-4 bg-slate-900 border-t border-slate-800/80 shrink-0">
            {capturedImage ? (
              /* Actions when photo is captured */
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={handleRetake}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
                  >
                    <RotateCcw size={16} />
                    <span>{lang === 'id' ? 'Foto Ulang' : 'Retake'}</span>
                  </button>

                  <button
                    onClick={handleConfirmUse}
                    className="flex-[1.5] py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-2xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/25 active:scale-95"
                  >
                    <Check size={18} />
                    <span>{lang === 'id' ? 'Gunakan & Simpan Foto' : 'Use & Save Photo'}</span>
                  </button>
                </div>

                {onOpenScanner && (
                  <button
                    onClick={handleSendToScanner}
                    className="w-full py-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <FileText size={15} />
                    <span>{lang === 'id' ? 'Pindai ke PDF (Scanner)' : 'Scan to PDF'}</span>
                  </button>
                )}
              </div>
            ) : (
              /* Live Shutter Controls */
              <div className="flex items-center justify-between px-2">
                {/* Gallery & Native Camera buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => galleryInputRef.current?.click()}
                    className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 rounded-2xl flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer"
                    title={lang === 'id' ? 'Pilih Foto dari Galeri' : 'Gallery'}
                  >
                    <ImageIcon size={18} className="text-indigo-400" />
                    <span className="hidden sm:inline">{lang === 'id' ? 'Galeri' : 'Gallery'}</span>
                  </button>

                  <button
                    onClick={() => nativeCameraInputRef.current?.click()}
                    className="p-3 bg-slate-800/80 hover:bg-slate-700 text-emerald-400 border border-slate-700/60 rounded-2xl flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer"
                    title={lang === 'id' ? 'Kamera HP (Native OS)' : 'Native OS Camera'}
                  >
                    <Camera size={18} />
                    <span className="hidden sm:inline">{lang === 'id' ? 'Kamera OS' : 'Cam OS'}</span>
                  </button>
                </div>

                {/* Shutter Button */}
                <button
                  onClick={handleSnap}
                  disabled={isCameraLoading || !!cameraError}
                  className="w-16 h-16 rounded-full border-4 border-white bg-indigo-600 hover:bg-indigo-500 active:scale-90 transition-all cursor-pointer shadow-xl shadow-indigo-600/30 flex items-center justify-center disabled:opacity-40"
                  title={lang === 'id' ? 'Ambil Foto' : 'Take Photo'}
                >
                  <div className="w-12 h-12 rounded-full border-2 border-white/60 bg-white/20" />
                </button>

                {/* Flip camera or Scanner shortcut */}
                {onOpenScanner ? (
                  <button
                    onClick={() => {
                      stopCameraStream();
                      onClose();
                      onOpenScanner();
                    }}
                    className="p-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-2xl flex items-center gap-2 text-xs font-bold transition-all cursor-pointer"
                    title={lang === 'id' ? 'Mode PDF Scanner' : 'PDF Scanner Mode'}
                  >
                    <FileText size={18} />
                    <span className="hidden sm:inline">{lang === 'id' ? 'Scan PDF' : 'PDF Scan'}</span>
                  </button>
                ) : (
                  <button
                    onClick={handleToggleFacingMode}
                    className="p-3 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 rounded-2xl flex items-center gap-2 text-xs font-semibold transition-all cursor-pointer"
                  >
                    <SwitchCamera size={18} />
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

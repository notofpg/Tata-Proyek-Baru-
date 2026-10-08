import React, { useState, useEffect, useRef } from 'react';
import { 
  X, ChevronLeft, ChevronRight, Download, Trash2, Edit3, Check, 
  Play, Pause, Volume2, VolumeX, Maximize, Film, Image as ImageIcon,
  Calendar, HardDrive, Clock, CheckCircle2, AlertTriangle
} from 'lucide-react';
import { DisciplineMediaItem } from '../types';
import { 
  resolveDisciplineMediaUrl, 
  downloadDisciplineMedia, 
  formatBytes, 
  formatDuration 
} from '../utils/disciplineMedia';

interface DisciplineMediaLightboxProps {
  items: DisciplineMediaItem[];
  initialIndex: number;
  lang: string;
  onClose: () => void;
  onDelete: (item: DisciplineMediaItem) => void;
  onUpdateCaption: (item: DisciplineMediaItem, newCaption: string) => void;
}

export const DisciplineMediaLightbox: React.FC<DisciplineMediaLightboxProps> = ({
  items,
  initialIndex,
  lang,
  onClose,
  onDelete,
  onUpdateCaption
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [resolvedUrl, setResolvedUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [captionInput, setCaptionInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  // Video player controls state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  const currentItem = items[currentIndex] || items[0];

  useEffect(() => {
    if (!currentItem) return;
    setLoading(true);
    setCaptionInput(currentItem.caption || '');
    setIsEditingCaption(false);
    setIsPlaying(false);
    setShowDeleteConfirm(false);

    let isMounted = true;
    resolveDisciplineMediaUrl(currentItem.url).then((url) => {
      if (isMounted) {
        setResolvedUrl(url || currentItem.thumbnailUrl || '');
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) {
        setResolvedUrl(currentItem.thumbnailUrl || '');
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentIndex, currentItem]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditingCaption || showDeleteConfirm) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex(prev => prev - 1);
      }
      if (e.key === 'ArrowRight' && currentIndex < items.length - 1) {
        setCurrentIndex(prev => prev + 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, items.length, isEditingCaption, showDeleteConfirm, onClose]);

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < items.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentItem) return;
    setIsDownloading(true);
    const filename = currentItem.name || `discipline_${currentItem.category || 'media'}_${Date.now()}.${currentItem.type === 'video' ? 'mp4' : 'jpg'}`;
    const success = await downloadDisciplineMedia(currentItem.url, filename);
    setIsDownloading(false);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2000);
    }
  };

  const handleConfirmDelete = () => {
    if (!currentItem) return;
    onDelete(currentItem);
    if (items.length <= 1) {
      onClose();
    } else {
      if (currentIndex >= items.length - 1) {
        setCurrentIndex(prev => Math.max(0, prev - 1));
      }
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveCaption = () => {
    if (currentItem) {
      onUpdateCaption(currentItem, captionInput.trim());
      setIsEditingCaption(false);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleFullscreenVideo = () => {
    if (videoRef.current) {
      if (videoRef.current.requestFullscreen) {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 2800);
  };

  if (!currentItem) return null;

  const categoryLabel = currentItem.category === 'after'
    ? (lang === 'id' ? 'Sesudah (After)' : 'After Transformation')
    : currentItem.category?.startsWith('milestone')
    ? (lang === 'id' ? 'Milestone' : 'Milestone')
    : (lang === 'id' ? 'Sebelum (Before)' : 'Before Transformation');

  const formattedDate = currentItem.createdAt
    ? new Date(currentItem.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  return (
    <div 
      className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[220] flex flex-col justify-between p-3 sm:p-5 select-none animate-in fade-in duration-200"
      onClick={onClose}
      onMouseMove={resetControlsTimer}
    >
      {/* Top Bar */}
      <div 
        className="w-full flex items-center justify-between z-20 gap-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 ${
            currentItem.category === 'after'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {currentItem.type === 'video' ? <Film size={13} /> : <ImageIcon size={13} />}
            <span>{categoryLabel}</span>
          </span>

          <span className="text-xs font-semibold text-slate-400">
            {currentIndex + 1} / {items.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`p-2 rounded-xl border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-bold ${
              downloadSuccess
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700'
            }`}
            title={lang === 'id' ? 'Unduh Berkas' : 'Download File'}
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span className="hidden sm:inline text-[11px]">{lang === 'id' ? 'Tersimpan' : 'Saved'}</span>
              </>
            ) : (
              <>
                <Download size={16} className={isDownloading ? 'animate-bounce' : ''} />
                <span className="hidden sm:inline text-[11px]">{lang === 'id' ? 'Unduh' : 'Download'}</span>
              </>
            )}
          </button>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteConfirm(true);
            }}
            className="p-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            title={lang === 'id' ? 'Hapus Media' : 'Delete Media'}
          >
            <Trash2 size={16} />
            <span className="hidden sm:inline text-[11px]">{lang === 'id' ? 'Hapus' : 'Delete'}</span>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all active:scale-95 cursor-pointer"
            title={lang === 'id' ? 'Tutup' : 'Close'}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Center Media Area */}
      <div 
        className="relative flex-1 flex items-center justify-center my-2 max-h-[68vh] sm:max-h-[72vh] w-full"
        onClick={e => e.stopPropagation()}
      >
        {/* Navigation buttons */}
        {items.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className={`absolute left-1 sm:left-4 z-30 p-3 rounded-full bg-slate-900/80 border border-slate-700/80 text-white backdrop-blur-md transition-all ${
                currentIndex === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-800 hover:scale-110 active:scale-95 cursor-pointer shadow-xl'
              }`}
              title={lang === 'id' ? 'Sebelumnya' : 'Previous'}
            >
              <ChevronLeft size={22} />
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === items.length - 1}
              className={`absolute right-1 sm:right-4 z-30 p-3 rounded-full bg-slate-900/80 border border-slate-700/80 text-white backdrop-blur-md transition-all ${
                currentIndex === items.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-800 hover:scale-110 active:scale-95 cursor-pointer shadow-xl'
              }`}
              title={lang === 'id' ? 'Selanjutnya' : 'Next'}
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Media Container */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
            <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold">{lang === 'id' ? 'Memuat media kualitas tinggi...' : 'Loading high-res media...'}</span>
          </div>
        ) : currentItem.type === 'video' ? (
          <div className="relative max-w-full max-h-full flex items-center justify-center group overflow-hidden rounded-2xl bg-black/60 shadow-2xl">
            <video
              ref={videoRef}
              src={resolvedUrl || currentItem.url}
              className="max-w-full max-h-[66vh] rounded-2xl object-contain cursor-pointer"
              playsInline
              onClick={togglePlay}
              onTimeUpdate={() => {
                if (videoRef.current) {
                  setCurrentTime(videoRef.current.currentTime);
                }
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration);
                }
              }}
              onEnded={() => setIsPlaying(false)}
            />

            {/* Custom Video Controls Bar */}
            <div className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 flex flex-col gap-2 rounded-b-2xl ${
              showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}>
              {/* Progress Slider */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400"
              />

              <div className="flex items-center justify-between text-xs text-slate-200">
                <div className="flex items-center gap-3">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </button>

                  <span className="font-mono text-[11px] text-slate-300">
                    {formatDuration(currentTime)} / {formatDuration(duration || currentItem.duration)}
                  </span>
                </div>

                <button
                  onClick={handleFullscreenVideo}
                  className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  title="Fullscreen"
                >
                  <Maximize size={15} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img
              src={resolvedUrl || currentItem.url || currentItem.thumbnailUrl}
              alt={currentItem.caption || 'Discipline Photo'}
              className="max-w-full max-h-[66vh] object-contain rounded-2xl shadow-2xl border border-slate-800/80"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </div>

      {/* Bottom Thumbnail Strip + Information & Caption Bar */}
      <div 
        className="w-full max-w-3xl mx-auto space-y-2 z-20"
        onClick={e => e.stopPropagation()}
      >
        {/* Thumbnails Navigator */}
        {items.length > 1 && (
          <div className="flex items-center justify-center gap-2 overflow-x-auto py-1 px-2 no-scrollbar">
            {items.map((item, idx) => (
              <button
                key={item.id || idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                  idx === currentIndex 
                    ? 'border-indigo-500 scale-110 shadow-lg ring-2 ring-indigo-500/30' 
                    : 'border-slate-800 opacity-60 hover:opacity-100'
                }`}
              >
                <img
                  src={item.thumbnailUrl || item.url}
                  alt="Thumb"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}

        {/* Info & Caption Bar */}
        <div className="bg-slate-900/90 border border-slate-800/90 rounded-2xl p-3.5 backdrop-blur-xl shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Caption section */}
            <div className="flex-1 min-w-0">
              {isEditingCaption ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={captionInput}
                    onChange={(e) => setCaptionInput(e.target.value)}
                    placeholder={lang === 'id' ? 'Tulis catatan / keterangan media...' : 'Write media note or caption...'}
                    className="flex-1 bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCaption();
                      if (e.key === 'Escape') setIsEditingCaption(false);
                    }}
                  />
                  <button
                    onClick={handleSaveCaption}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Check size={13} />
                    <span>{lang === 'id' ? 'Simpan' : 'Save'}</span>
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => setIsEditingCaption(true)}
                  className="flex items-center gap-2 group cursor-pointer"
                >
                  <p className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                    {currentItem.caption || (
                      <span className="text-slate-500 italic font-normal">
                        {lang === 'id' ? '+ Tambah keterangan / catatan foto...' : '+ Add caption / note...'}
                      </span>
                    )}
                  </p>
                  <Edit3 size={13} className="text-slate-500 group-hover:text-indigo-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </div>

            {/* Metadata badges */}
            <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0 flex-wrap">
              {formattedDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-slate-500" />
                  {formattedDate}
                </span>
              )}

              {currentItem.size && (
                <span className="flex items-center gap-1">
                  <HardDrive size={12} className="text-slate-500" />
                  {formatBytes(currentItem.size)}
                </span>
              )}

              {currentItem.type === 'video' && currentItem.duration && (
                <span className="flex items-center gap-1 text-indigo-400">
                  <Clock size={12} />
                  {formatDuration(currentItem.duration)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Custom Delete Confirmation Modal inside Lightbox */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 z-[260] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-slate-900 border border-rose-500/30 rounded-3xl p-5 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col gap-4 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-100">
                {lang === 'id' ? 'Hapus Media Ini?' : 'Delete This Media?'}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {lang === 'id' 
                  ? 'Foto / video ini akan dihapus secara permanen dari penyimpanan lokal perangkat Anda.' 
                  : 'This photo/video will be permanently removed from your device storage.'}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-rose-900/30"
              >
                {lang === 'id' ? 'Ya, Hapus' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

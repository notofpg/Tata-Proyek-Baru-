import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Plus, Image as ImageIcon, Film, Play, Trash2, Maximize2, 
  Sparkles, Download, Eye, AlertTriangle, CheckCircle2,
  SlidersHorizontal, Columns, ArrowRightLeft, Camera
} from 'lucide-react';
import { Task, DisciplineMediaItem } from '../types';
import { useAppStore } from '../store';
import { 
  processAndSaveDisciplineMedia, 
  deleteDisciplineMediaItem, 
  downloadDisciplineMedia,
  resolveDisciplineMediaUrl
} from '../utils/disciplineMedia';
import { DisciplineMediaLightbox } from './DisciplineMediaLightbox';
import { getOrganicThemePalette, OrganicThemePalette } from './home/organicThemePalettes';

interface DisciplineGalleryProps {
  task: Task;
  lang: string;
  onUpdateTask: (updatedTask: Task) => void;
  appTheme?: string;
  palette?: OrganicThemePalette;
}

export const DisciplineGallery: React.FC<DisciplineGalleryProps> = ({
  task,
  lang,
  onUpdateTask,
  appTheme,
  palette: propPalette
}) => {
  const { appVersion, isLiteMode } = useAppStore();
  const isOrganic = appVersion === 'organic' || appVersion === 'pro_max';
  const isLite = appVersion === 'lite' || isLiteMode;
  const palette = useMemo(() => propPalette || getOrganicThemePalette(appTheme), [propPalette, appTheme]);
  const d = task.disciplineData || {};
  
  // Clean media lists with legacy fallback
  const beforeMediaList: DisciplineMediaItem[] = useMemo(() => {
    const list = [...(d.beforeMedia || [])];
    if (list.length === 0 && d.beforePhotoUrl) {
      list.push({
        id: 'legacy_before',
        type: 'image',
        url: d.beforePhotoUrl,
        thumbnailUrl: d.beforePhotoUrl,
        createdAt: task.createdAt || new Date().toISOString(),
        caption: lang === 'id' ? 'Foto awal' : 'Initial photo',
        category: 'before'
      });
    }
    return list;
  }, [d.beforeMedia, d.beforePhotoUrl, task.createdAt, lang]);

  const afterMediaList: DisciplineMediaItem[] = useMemo(() => {
    const list = [...(d.afterMedia || [])];
    if (list.length === 0 && d.afterPhotoUrl) {
      list.push({
        id: 'legacy_after',
        type: 'image',
        url: d.afterPhotoUrl,
        thumbnailUrl: d.afterPhotoUrl,
        createdAt: new Date().toISOString(),
        caption: lang === 'id' ? 'Foto sesudah' : 'After photo',
        category: 'after'
      });
    }
    return list;
  }, [d.afterMedia, d.afterPhotoUrl, lang]);

  // Main Tabs: 'before' | 'after' | 'compare'
  const [activeTab, setActiveTab] = useState<'before' | 'after' | 'compare'>('before');
  
  // Lightbox state
  const [lightboxState, setLightboxState] = useState<{
    items: DisciplineMediaItem[];
    index: number;
  } | null>(null);

  // Uploading state
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<'before' | 'after'>('before');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Compare mode state
  const [compareBeforeIndex, setCompareBeforeIndex] = useState(0);
  const [compareAfterIndex, setCompareAfterIndex] = useState(0);
  const [compareMode, setCompareMode] = useState<'slider' | 'side-by-side'>('slider');
  const [sliderPosition, setSliderPosition] = useState(50);

  // Toast & Delete modal
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<DisciplineMediaItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Safe index bounds
  useEffect(() => {
    if (compareBeforeIndex >= beforeMediaList.length && beforeMediaList.length > 0) {
      setCompareBeforeIndex(0);
    }
  }, [beforeMediaList.length, compareBeforeIndex]);

  useEffect(() => {
    if (compareAfterIndex >= afterMediaList.length && afterMediaList.length > 0) {
      setCompareAfterIndex(0);
    }
  }, [afterMediaList.length, compareAfterIndex]);

  // Upload handler
  const handleFilesUpload = async (files: FileList | File[], targetCategory: 'before' | 'after') => {
    if (!files || files.length === 0) return;
    
    const fileList = Array.from(files);
    const hasVideo = fileList.some(f => f.type.startsWith('video/'));
    if (hasVideo) {
      showToast(lang === 'id' ? 'Penyimpanan video dinonaktifkan. Silakan unggah foto.' : 'Video saving is disabled. Please upload photos.');
    }

    const imageFiles = fileList.filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);
    
    try {
      const newItems: DisciplineMediaItem[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const mediaItem = await processAndSaveDisciplineMedia(file, targetCategory);
        newItems.push(mediaItem);
      }

      if (targetCategory === 'before') {
        const existing = d.beforeMedia || [];
        const updatedBefore = [...existing, ...newItems];
        onUpdateTask({
          ...task,
          disciplineData: {
            ...d,
            beforeMedia: updatedBefore,
            beforePhotoUrl: updatedBefore[0]?.thumbnailUrl || updatedBefore[0]?.url || d.beforePhotoUrl
          }
        });
        setActiveTab('before');
      } else {
        const existing = d.afterMedia || [];
        const updatedAfter = [...existing, ...newItems];
        onUpdateTask({
          ...task,
          disciplineData: {
            ...d,
            afterMedia: updatedAfter,
            afterPhotoUrl: updatedAfter[0]?.thumbnailUrl || updatedAfter[0]?.url || d.afterPhotoUrl
          }
        });
        setActiveTab('after');
      }

      showToast(lang === 'id' ? '✓ Foto berhasil disimpan' : '✓ Photo saved successfully');
    } catch (error) {
      console.error('Error processing media upload:', error);
      showToast(lang === 'id' ? 'Gagal menyimpan foto ke galeri.' : 'Failed to save photo.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenFileDialog = (category: 'before' | 'after') => {
    setUploadCategory(category);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleDeleteItem = async (item: DisciplineMediaItem) => {
    await deleteDisciplineMediaItem(item);
    
    if (item.id === 'legacy_before') {
      onUpdateTask({
        ...task,
        disciplineData: { ...d, beforePhotoUrl: undefined }
      });
      showToast(lang === 'id' ? 'Foto dihapus' : 'Photo deleted');
      setItemToDelete(null);
      return;
    }

    if (item.id === 'legacy_after') {
      onUpdateTask({
        ...task,
        disciplineData: { ...d, afterPhotoUrl: undefined }
      });
      showToast(lang === 'id' ? 'Foto dihapus' : 'Photo deleted');
      setItemToDelete(null);
      return;
    }

    if (item.category === 'before' || (!item.category && beforeMediaList.some(m => m.id === item.id))) {
      const filtered = (d.beforeMedia || []).filter(m => m.id !== item.id);
      onUpdateTask({
        ...task,
        disciplineData: {
          ...d,
          beforeMedia: filtered,
          beforePhotoUrl: filtered[0]?.url || undefined
        }
      });
    } else {
      const filtered = (d.afterMedia || []).filter(m => m.id !== item.id);
      onUpdateTask({
        ...task,
        disciplineData: {
          ...d,
          afterMedia: filtered,
          afterPhotoUrl: filtered[0]?.url || undefined
        }
      });
    }

    showToast(lang === 'id' ? 'Foto dihapus' : 'Photo deleted');
    setItemToDelete(null);
  };

  const handleUpdateCaption = (item: DisciplineMediaItem, newCaption: string) => {
    if (item.category === 'before' || (!item.category && beforeMediaList.some(m => m.id === item.id))) {
      const updated = (d.beforeMedia || []).map(m => m.id === item.id ? { ...m, caption: newCaption } : m);
      onUpdateTask({
        ...task,
        disciplineData: { ...d, beforeMedia: updated }
      });
    } else {
      const updated = (d.afterMedia || []).map(m => m.id === item.id ? { ...m, caption: newCaption } : m);
      onUpdateTask({
        ...task,
        disciplineData: { ...d, afterMedia: updated }
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleFilesUpload(e.target.files, uploadCategory);
          }
        }}
      />

      {/* Clean Simple Navigation Header */}
      <div className={`flex items-center justify-between gap-2 p-1 border rounded-2xl ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}>
        <div className="flex items-center gap-1.5 flex-1">
          {/* Tab: Sebelum */}
          <button
            type="button"
            onClick={() => setActiveTab('before')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'before'
                ? `${palette.disciplineCard} ${palette.disciplineTitle} border ${palette.disciplineBorder} shadow-sm`
                : `${palette.disciplineSub} hover:${palette.disciplineTitle}`
            }`}
          >
            <span>{lang === 'id' ? 'Sebelum' : 'Before'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'before' 
                ? `${palette.disciplineInner} ${palette.disciplineTitle}`
                : `${palette.disciplineInner} ${palette.disciplineSub}`
            }`}>
              {beforeMediaList.length}
            </span>
          </button>

          {/* Tab: Sesudah */}
          <button
            type="button"
            onClick={() => setActiveTab('after')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'after'
                ? `${palette.disciplineCard} ${palette.disciplineTitle} border ${palette.disciplineBorder} shadow-sm`
                : `${palette.disciplineSub} hover:${palette.disciplineTitle}`
            }`}
          >
            <span>{lang === 'id' ? 'Sesudah' : 'After'}</span>
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'after' 
                ? `${palette.disciplineInner} ${palette.disciplineTitle}`
                : `${palette.disciplineInner} ${palette.disciplineSub}`
            }`}>
              {afterMediaList.length}
            </span>
          </button>

          {/* Tab: Bandingkan */}
          <button
            type="button"
            onClick={() => setActiveTab('compare')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'compare'
                ? `${palette.disciplineBtnAction} text-white shadow-sm` 
                : `${palette.disciplineSub} hover:${palette.disciplineTitle}`
            }`}
          >
            <ArrowRightLeft size={13} />
            <span>{lang === 'id' ? 'Bandingkan' : 'Compare'}</span>
          </button>
        </div>
      </div>

      {/* Loading state */}
      {isProcessing && (
        <div className={`p-3 border rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold animate-pulse ${palette.disciplineCard} ${palette.disciplineBorder} ${palette.disciplineTitle}`}>
          <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${palette.disciplineTitle}`} />
          <span>{lang === 'id' ? 'Menyimpan foto...' : 'Saving media...'}</span>
        </div>
      )}

      {/* ========================================= */}
      {/* 1. SEBELUM VIEW */}
      {/* ========================================= */}
      {activeTab === 'before' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Upload Tile */}
            <button
              type="button"
              onClick={() => handleOpenFileDialog('before')}
              className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group ${palette.disciplineInnerBorder} hover:${palette.disciplineBorder} ${palette.disciplineInner} ${palette.disciplineSub} hover:${palette.disciplineTitle}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform ${palette.disciplineCard} ${palette.disciplineTitle}`}>
                <Plus size={20} />
              </div>
              <span className="text-xs font-bold">{lang === 'id' ? 'Tambah Foto' : 'Add Photo'}</span>
              <span className={`text-[10px] ${palette.disciplineSub}`}>{lang === 'id' ? 'Kondisi Sebelum' : 'Before condition'}</span>
            </button>

            {/* List of items */}
            {beforeMediaList.map((item, idx) => (
              <SimpleMediaCard
                key={item.id || idx}
                item={item}
                lang={lang}
                palette={palette}
                onClick={() => setLightboxState({ items: beforeMediaList, index: idx })}
                onDelete={() => setItemToDelete(item)}
                onDownload={() => {
                  const filename = item.name || `discipline_before_${Date.now()}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
                  downloadDisciplineMedia(item.url, filename).then(success => {
                    if (success) showToast(lang === 'id' ? 'Foto diunduh' : 'Photo downloaded');
                  });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 2. SESUDAH VIEW */}
      {/* ========================================= */}
      {activeTab === 'after' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Upload Tile */}
            <button
              type="button"
              onClick={() => handleOpenFileDialog('after')}
              className={`aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center transition-all cursor-pointer group ${palette.disciplineInnerBorder} hover:${palette.disciplineBorder} ${palette.disciplineInner} ${palette.disciplineSub} hover:${palette.disciplineTitle}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform ${palette.disciplineCard} ${palette.disciplineTitle}`}>
                <Plus size={20} />
              </div>
              <span className="text-xs font-bold">{lang === 'id' ? 'Tambah Foto' : 'Add Photo'}</span>
              <span className={`text-[10px] ${palette.disciplineSub}`}>{lang === 'id' ? 'Hasil Sesudah' : 'After result'}</span>
            </button>

            {/* List of items */}
            {afterMediaList.map((item, idx) => (
              <SimpleMediaCard
                key={item.id || idx}
                item={item}
                lang={lang}
                palette={palette}
                onClick={() => setLightboxState({ items: afterMediaList, index: idx })}
                onDelete={() => setItemToDelete(item)}
                onDownload={() => {
                  const filename = item.name || `discipline_after_${Date.now()}.${item.type === 'video' ? 'mp4' : 'jpg'}`;
                  downloadDisciplineMedia(item.url, filename).then(success => {
                    if (success) showToast(lang === 'id' ? 'Foto diunduh' : 'Photo downloaded');
                  });
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* 3. BANDINGKAN VIEW */}
      {/* ========================================= */}
      {activeTab === 'compare' && (
        <div className="space-y-4">
          {beforeMediaList.length === 0 || afterMediaList.length === 0 ? (
            <div className={`py-10 px-4 rounded-2xl border flex flex-col items-center text-center gap-3 ${palette.disciplineCard} ${palette.disciplineBorder}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${palette.disciplineInner} ${palette.disciplineTitle}`}>
                <ArrowRightLeft size={24} />
              </div>
              <div>
                <p className={`text-xs font-bold ${palette.disciplineTitle}`}>
                  {lang === 'id' ? 'Perlu foto Sebelum & Sesudah' : 'Requires Before & After photos'}
                </p>
                <p className={`text-[11px] mt-0.5 ${palette.disciplineSub}`}>
                  {lang === 'id' ? 'Unggah minimal 1 foto di Sebelum dan 1 di Sesudah.' : 'Upload at least 1 Before photo and 1 After photo.'}
                </p>
              </div>

              <div className="flex gap-2 mt-1">
                {beforeMediaList.length === 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenFileDialog('before')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle} border`}
                  >
                    {lang === 'id' ? '+ Foto Sebelum' : '+ Before Photo'}
                  </button>
                )}
                {afterMediaList.length === 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenFileDialog('after')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle} border`}
                  >
                    {lang === 'id' ? '+ Foto Sesudah' : '+ After Photo'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Compare toggle & selector */}
              <div className="flex items-center justify-between gap-2">
                {/* Switcher */}
                <div className={`flex items-center gap-1 p-1 rounded-xl border ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}>
                  <button
                    type="button"
                    onClick={() => setCompareMode('slider')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      compareMode === 'slider' 
                        ? `${palette.disciplineBtnAction} text-white shadow-sm` 
                        : `${palette.disciplineSub} hover:${palette.disciplineTitle}`
                    }`}
                  >
                    {lang === 'id' ? 'Slider' : 'Slider'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompareMode('side-by-side')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      compareMode === 'side-by-side' 
                        ? `${palette.disciplineBtnAction} text-white shadow-sm` 
                        : `${palette.disciplineSub} hover:${palette.disciplineTitle}`
                    }`}
                  >
                    {lang === 'id' ? 'Berdampingan' : 'Side by Side'}
                  </button>
                </div>

                {/* Selectors if multiple */}
                {(beforeMediaList.length > 1 || afterMediaList.length > 1) && (
                  <div className="flex items-center gap-1.5">
                    {beforeMediaList.length > 1 && (
                      <select
                        value={compareBeforeIndex}
                        onChange={(e) => setCompareBeforeIndex(Number(e.target.value))}
                        className={`text-[11px] font-medium rounded-lg px-2 py-1 focus:outline-none border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle}`}
                      >
                        {beforeMediaList.map((m, idx) => (
                          <option key={m.id} value={idx}>Sebelum #{idx + 1}</option>
                        ))}
                      </select>
                    )}
                    {afterMediaList.length > 1 && (
                      <select
                        value={compareAfterIndex}
                        onChange={(e) => setCompareAfterIndex(Number(e.target.value))}
                        className={`text-[11px] font-medium rounded-lg px-2 py-1 focus:outline-none border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle}`}
                      >
                        {afterMediaList.map((m, idx) => (
                          <option key={m.id} value={idx}>Sesudah #{idx + 1}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              {/* Slider View */}
              {compareMode === 'slider' ? (
                <div className={`rounded-2xl overflow-hidden border bg-black ${palette.disciplineInnerBorder}`}>
                  <SimpleInteractiveSlider
                    beforeItem={beforeMediaList[compareBeforeIndex]}
                    afterItem={afterMediaList[compareAfterIndex]}
                    sliderPosition={sliderPosition}
                    onSliderChange={setSliderPosition}
                    lang={lang}
                  />
                </div>
              ) : (
                /* Side-by-side View */
                <div className="grid grid-cols-2 gap-2.5">
                  <div 
                    onClick={() => setLightboxState({ items: beforeMediaList, index: compareBeforeIndex })}
                    className={`aspect-[4/3] rounded-2xl overflow-hidden relative group cursor-pointer border ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}
                  >
                    <AsyncImage
                      url={beforeMediaList[compareBeforeIndex]?.url}
                      thumbnailUrl={beforeMediaList[compareBeforeIndex]?.thumbnailUrl}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/90 text-black">
                      {lang === 'id' ? 'Sebelum' : 'Before'}
                    </div>
                  </div>

                  <div 
                    onClick={() => setLightboxState({ items: afterMediaList, index: compareAfterIndex })}
                    className={`aspect-[4/3] rounded-2xl overflow-hidden relative group cursor-pointer border ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}
                  >
                    <AsyncImage
                      url={afterMediaList[compareAfterIndex]?.url}
                      thumbnailUrl={afterMediaList[compareAfterIndex]?.thumbnailUrl}
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/90 text-black">
                      {lang === 'id' ? 'Sesudah' : 'After'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxState && (
        <DisciplineMediaLightbox
          items={lightboxState.items}
          initialIndex={lightboxState.index}
          lang={lang}
          onClose={() => setLightboxState(null)}
          onDelete={handleDeleteItem}
          onUpdateCaption={handleUpdateCaption}
        />
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div 
          className="fixed inset-0 z-[250] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setItemToDelete(null)}
        >
          <div 
            className={`border rounded-2xl p-5 max-w-xs w-full shadow-2xl flex flex-col gap-3 text-center ${palette.disciplineCard} ${palette.disciplineBorder}`}
            onClick={e => e.stopPropagation()}
          >
            <h4 className={`text-sm font-bold ${palette.disciplineTitle}`}>
              {lang === 'id' ? 'Hapus foto ini?' : 'Delete this photo?'}
            </h4>
            <p className={`text-xs ${palette.disciplineSub}`}>
              {lang === 'id' ? 'Foto akan dihapus dari perangkat Anda.' : 'Photo will be deleted from your device.'}
            </p>

            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className={`flex-1 py-2 rounded-xl font-bold text-xs cursor-pointer border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle}`}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteItem(itemToDelete)}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                {lang === 'id' ? 'Hapus' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] border px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-1.5 animate-in fade-in ${palette.disciplineCard} ${palette.disciplineBorder} ${palette.disciplineTitle}`}>
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

// Simple Clean Media Card
interface SimpleMediaCardProps {
  item: DisciplineMediaItem;
  lang: string;
  palette: OrganicThemePalette;
  onClick: () => void;
  onDelete: () => void;
  onDownload: () => void;
}

const SimpleMediaCard: React.FC<SimpleMediaCardProps> = ({ item, lang, palette, onClick, onDelete, onDownload }) => {
  return (
    <div
      onClick={onClick}
      className={`group aspect-square rounded-2xl overflow-hidden relative border transition-all cursor-pointer shadow-sm ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}
    >
      <AsyncImage
        url={item.url}
        thumbnailUrl={item.thumbnailUrl}
        alt={item.caption || 'Photo'}
        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
      />

      {/* Hover Actions */}
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDownload();
          }}
          className="p-1.5 rounded-lg bg-black/70 hover:bg-black text-slate-200 text-xs transition-colors cursor-pointer"
          title={lang === 'id' ? 'Unduh' : 'Download'}
        >
          <Download size={13} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-600 text-rose-300 hover:text-white text-xs transition-colors cursor-pointer"
          title={lang === 'id' ? 'Hapus' : 'Delete'}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Caption footer if exists */}
      {item.caption && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-4">
          <p className="text-[11px] text-slate-200 truncate">{item.caption}</p>
        </div>
      )}
    </div>
  );
};

// Simple Interactive Slider
interface SimpleInteractiveSliderProps {
  beforeItem: DisciplineMediaItem;
  afterItem: DisciplineMediaItem;
  sliderPosition: number;
  onSliderChange: (val: number) => void;
  lang: string;
}

const SimpleInteractiveSlider: React.FC<SimpleInteractiveSliderProps> = ({
  beforeItem,
  afterItem,
  sliderPosition,
  onSliderChange,
  lang
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handlePointerMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onSliderChange(percentage);
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={() => setIsDragging(true)}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
      onMouseMove={(e) => isDragging && handlePointerMove(e.clientX)}
      onTouchStart={() => setIsDragging(true)}
      onTouchEnd={() => setIsDragging(false)}
      onTouchMove={(e) => {
        if (e.touches.length > 0) handlePointerMove(e.touches[0].clientX);
      }}
      className="relative aspect-[4/3] w-full select-none cursor-ew-resize overflow-hidden"
    >
      {/* After image (Background / Right) */}
      <div className="absolute inset-0">
        <AsyncImage
          url={afterItem.url}
          thumbnailUrl={afterItem.thumbnailUrl}
          alt="After"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/90 text-black">
          {lang === 'id' ? 'Sesudah' : 'After'}
        </div>
      </div>

      {/* Before image (Clipped Foreground / Left) */}
      <div
        className="absolute inset-y-0 left-0 overflow-hidden"
        style={{ width: `${sliderPosition}%` }}
      >
        <div 
          className="absolute inset-y-0 left-0"
          style={{ width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%' }}
        >
          <AsyncImage
            url={beforeItem.url}
            thumbnailUrl={beforeItem.thumbnailUrl}
            alt="Before"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/90 text-black">
          {lang === 'id' ? 'Sebelum' : 'Before'}
        </div>
      </div>

      {/* Divider line & handle */}
      <div
        className="absolute inset-y-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-7 h-7 rounded-full bg-white text-zinc-900 shadow-xl flex items-center justify-center">
          <ArrowRightLeft size={12} className="font-bold" />
        </div>
      </div>
    </div>
  );
};

// Async Image loader
export const AsyncImage: React.FC<{
  url?: string;
  thumbnailUrl?: string;
  alt: string;
  className?: string;
}> = ({ url, thumbnailUrl, alt, className }) => {
  const [src, setSrc] = useState<string>(thumbnailUrl || url || '');

  useEffect(() => {
    let isMounted = true;
    if (url) {
      resolveDisciplineMediaUrl(url).then(resolved => {
        if (isMounted && resolved) {
          setSrc(resolved);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [url]);

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
    />
  );
};

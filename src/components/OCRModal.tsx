import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store';
import {
  FileText,
  Bot,
  Copy,
  Check,
  X,
  Lock,
  ShieldCheck,
  Loader2,
  FilePlus,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface OCRModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSnippet: string | null;
  lang?: 'id' | 'en';
  isLight?: boolean;
  onInsertText?: (text: string) => void;
}

// Helper to compress raw camera images before OCR to prevent 413 Payload Too Large
async function compressImageForOcr(dataUrl: string, maxDim = 1600, quality = 0.85): Promise<string> {
  if (dataUrl.length < 1500000) return dataUrl; // Under ~1.1MB, send directly
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const OCRModal: React.FC<OCRModalProps> = ({
  isOpen,
  onClose,
  imageSnippet,
  lang = 'id',
  isLight = false,
  onInsertText
}) => {
  const [hasConsented, setHasConsented] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [ocrText, setOcrText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const { geminiApiKey, isLiteMode, appVersion, tataAccount } = useAppStore();
  const defaultMaxCredits = (isLiteMode || appVersion === 'lite') ? 7 : (tataAccount?.isPremium ? 20 : 7);
  const [serverMaxCredits, setServerMaxCredits] = useState<number>(defaultMaxCredits);
  const maxDailyCredits = serverMaxCredits;
  const [creditsLeft, setCreditsLeft] = useState<number>(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const storedDate = localStorage.getItem('tata_ai_credits_date');
      const storedCredits = localStorage.getItem('tata_ai_credits_left');
      const initialLimit = defaultMaxCredits;
      if (storedDate === todayStr && storedCredits !== null) {
        const parsed = Number(storedCredits);
        return isNaN(parsed) ? initialLimit : Math.min(parsed, initialLimit);
      }
      return initialLimit;
    } catch {
      return defaultMaxCredits;
    }
  });

  useEffect(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const storedDate = localStorage.getItem('tata_ai_credits_date');
      const storedCredits = localStorage.getItem('tata_ai_credits_left');

      if (storedDate === todayStr && storedCredits !== null) {
        const parsed = Number(storedCredits);
        const valid = isNaN(parsed) ? maxDailyCredits : parsed;
        const adjusted = Math.min(valid, maxDailyCredits);
        setCreditsLeft(adjusted);
        if (adjusted !== valid) {
          localStorage.setItem('tata_ai_credits_left', String(adjusted));
        }
      } else {
        localStorage.setItem('tata_ai_credits_date', todayStr);
        localStorage.setItem('tata_ai_credits_left', String(maxDailyCredits));
        setCreditsLeft(maxDailyCredits);
      }
    } catch (e) {
      console.error('Failed to load credits:', e);
    }
  }, [maxDailyCredits]);

  const updateCredits = (newCount: number) => {
    setCreditsLeft(newCount);
    try {
      localStorage.setItem('tata_ai_credits_left', String(newCount));
    } catch (e) {}
  };


  // Reset modal state when opened
  useEffect(() => {
    if (isOpen) {
      setHasConsented(false);
      setIsLoading(false);
      setOcrText('');
      setErrorMsg(null);
      setIsCopied(false);
    }
  }, [isOpen, imageSnippet]);

  const runOcrProcess = async () => {
    if (!imageSnippet) return;

    const token = tataAccount?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
    if (!token && !geminiApiKey) {
      setErrorMsg(lang === 'id'
        ? 'Sesi Akun Tata Anda belum aktif atau belum masuk. Silakan masuk dengan Akun Google terlebih dahulu di menu Akun untuk menggunakan Tata AI (atau gunakan API Key pribadi di Pengaturan).'
        : 'Please sign in with your Google Account in the Account menu to use Tata AI (or use a personal API Key in Settings).');
      return;
    }

    if (creditsLeft <= 0 && !geminiApiKey) {
      setErrorMsg(lang === 'id' 
        ? `Kredit AI harian Anda telah habis (Maks ${maxDailyCredits} per hari). Kuota akan di-reset otomatis besok pada pukul 00:00 WIB.` 
        : `Your daily AI credits are fully spent (Max ${maxDailyCredits} per day). Credits will automatically reset tomorrow at 00:00 WIB.`);
      return;
    }

    setHasConsented(true);
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const processedImage = await compressImageForOcr(imageSnippet);
      const customKey = geminiApiKey || '';
      const response = await fetch('/api/ai/ocr', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          image: processedImage,
          lang,
          customApiKey: customKey || undefined
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        let errMsg = data?.message || data?.error || `Error (${response.status})`;
        if (response.status === 403 && (data?.error === 'account_blocked' || String(errMsg).toLowerCase().includes('diblokir'))) {
          errMsg = lang === 'id'
            ? 'Akun Tata Anda sedang diblokir oleh administrator. Silakan hubungi dukungan jika Anda merasa ini adalah kekeliruan.'
            : 'Your Tata Account has been suspended by the administrator. Please contact support if you believe this is a mistake.';
        } else if (response.status === 401) {
          errMsg = lang === 'id'
            ? 'Sesi Akun Tata Anda belum aktif atau telah kedaluwarsa. Silakan masuk kembali dengan Akun Google.'
            : 'Session invalid or expired. Please sign in again with your Google Account.';
        } else if (response.status === 429) {
          errMsg = data?.message || (lang === 'id' 
            ? 'Batas kuota AI harian Anda telah habis. Kuota akan di-reset otomatis besok (00:00 WIB).' 
            : 'Daily AI quota exhausted. Resets tomorrow at 00:00 WIB.');
          setCreditsLeft(0);
          try { localStorage.setItem('tata_ai_credits_left', '0'); } catch(e) {}
        } else if (response.status === 413) {
          errMsg = data?.message || (lang === 'id'
            ? 'Ukuran gambar OCR melebihi batas maksimal 3 MB.'
            : 'OCR image size exceeds the 3 MB limit.');
        } else if (response.status === 503) {
          errMsg = data?.message || (lang === 'id'
            ? 'Layanan Tata AI sedang tidak tersedia karena konfigurasi server belum lengkap.'
            : 'Tata AI service is currently unavailable.');
        }
        throw new Error(errMsg);
      }

      setOcrText(data.text || '');
      if (typeof data.creditsLeft === 'number') {
        setCreditsLeft(data.creditsLeft);
        try { localStorage.setItem('tata_ai_credits_left', String(data.creditsLeft)); } catch(e) {}
      } else if (!geminiApiKey) {
        updateCredits(Math.max(0, creditsLeft - 1));
      }
      if (typeof data.maxCredits === 'number') {
        setServerMaxCredits(data.maxCredits);
      }
    } catch (err: any) {
      console.error('[OCR Error]:', err);
      setErrorMsg(err.message || (lang === 'id' ? 'Terjadi kesalahan saat memproses OCR' : 'Error processing OCR'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyText = () => {
    if (!ocrText) return;
    navigator.clipboard.writeText(ocrText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleInsert = () => {
    if (onInsertText && ocrText) {
      onInsertText(ocrText);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className={`w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden border my-auto ${
            isLight
              ? 'bg-white border-slate-800 text-slate-100'
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className={`p-4 sm:p-5 border-b flex items-center justify-between ${
              isLight ? 'bg-slate-850/60 border-slate-800' : 'bg-slate-900/90 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                  <span>{lang === 'id' ? 'Ekstraksi Teks OCR' : 'OCR Text Scanner'}</span>
                  <Bot size={14} className="text-indigo-400" />
                </h3>
                <p className="text-xs text-slate-400 font-medium">
                  {lang === 'id'
                    ? 'Pindai teks dari potongan gambar pilihan'
                    : 'Extract text from selected image crop'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
              }`}
            >
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
            {/* Image Preview Thumbnail */}
            {imageSnippet && (
              <div className="relative w-full h-32 sm:h-40 rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center p-2 shrink-0">
                <img
                  src={imageSnippet}
                  alt="Cropped OCR Snippet"
                  className="max-h-full max-w-full object-contain rounded-xl shadow-lg"
                />
                <div className="absolute top-2 left-2 bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-full text-[10px] font-extrabold text-indigo-300 backdrop-blur-md">
                  {lang === 'id' ? 'Area Pilihan' : 'Selected Snippet'}
                </div>
              </div>
            )}

            {/* Privacy Consent Screen (Before User Explicitly Opts-In) */}
            {!hasConsented && !ocrText && !isLoading && (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-extrabold uppercase tracking-wider">
                  <ShieldCheck size={16} />
                  <span>{lang === 'id' ? 'Privasi & Consent Terjamin' : 'Privacy & Consent First'}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {lang === 'id'
                    ? 'Fitur OCR ini bekerja secara stateless online. Hanya potongan gambar pilihan Anda di atas yang akan dikirim untuk diekstrak teksnya. Tidak ada data pribadi atau berkas Anda yang disimpan di server.'
                    : 'This OCR feature works online statelessly. Only your selected image snippet above will be processed to extract text. No personal data is stored on any server.'}
                </p>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={runOcrProcess}
                    className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-95"
                  >
                    <Bot size={16} />
                    <span>{lang === 'id' ? 'Mulai Ekstrak Teks Sekarang' : 'Start OCR Extraction'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className={`py-3 px-4 font-bold text-xs rounded-xl border transition-all cursor-pointer ${
                      isLight
                        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {lang === 'id' ? 'Batal' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 size={32} className="animate-spin text-indigo-400" />
                <p className="text-xs font-extrabold text-slate-200">
                  {lang === 'id' ? 'Mengekstrak Teks dari Gambar...' : 'Extracting Text from Image...'}
                </p>
                <p className="text-[11px] text-slate-400">
                  {lang === 'id' ? 'Memproses area potongan gambar dengan AI' : 'Processing cropped area with AI'}
                </p>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && !isLoading && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-2 text-rose-300">
                <div className="flex items-center gap-2 text-xs font-extrabold">
                  <AlertCircle size={16} className="text-rose-400" />
                  <span>{lang === 'id' ? 'Gagal Memproses OCR' : 'OCR Extraction Failed'}</span>
                </div>
                <p className="text-xs leading-relaxed">{errorMsg}</p>
                <button
                  type="button"
                  onClick={runOcrProcess}
                  className="mt-2 py-2 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer border border-rose-500/30"
                >
                  <RefreshCw size={14} />
                  <span>{lang === 'id' ? 'Coba Lagi' : 'Try Again'}</span>
                </button>
              </div>
            )}

            {/* Result Area */}
            {ocrText && !isLoading && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold tracking-wider uppercase text-slate-400 flex items-center gap-1.5">
                    <Check size={14} className="text-emerald-400" />
                    <span>{lang === 'id' ? 'Hasil Ekstraksi Teks:' : 'Extracted Text:'}</span>
                  </label>
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    {ocrText.length} {lang === 'id' ? 'Karakter' : 'Chars'}
                  </span>
                </div>

                <textarea
                  readOnly
                  value={ocrText}
                  className={`w-full h-40 p-3.5 rounded-2xl text-xs font-mono leading-relaxed border resize-none focus:outline-none custom-scrollbar ${
                    isLight
                      ? 'bg-slate-850/50 border-slate-800 text-slate-100'
                      : 'bg-slate-950 border-slate-800 text-slate-100'
                  }`}
                />

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-600/20 active:scale-95"
                  >
                    {isCopied ? (
                      <>
                        <Check size={16} className="text-emerald-300" />
                        <span>{lang === 'id' ? 'Teks Tersalin!' : 'Text Copied!'}</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>{lang === 'id' ? 'Salin Teks ke Clipboard' : 'Copy Text'}</span>
                      </>
                    )}
                  </button>

                  {onInsertText && (
                    <button
                      type="button"
                      onClick={handleInsert}
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
                    >
                      <FilePlus size={16} />
                      <span>{lang === 'id' ? 'Sisipkan' : 'Insert'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

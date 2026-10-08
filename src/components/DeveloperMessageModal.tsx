import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Heart, X, Edit3, Check, RotateCcw, Sparkles, MessageSquare, Shield, HardDrive, Copy, Code2 } from 'lucide-react';

interface DeveloperMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
  appTheme?: string;
}

const DEFAULT_MESSAGE_ID = `Halo! Terima kasih banyak sudah memilih Tata. 

Tata dibuat secara khusus dengan penuh ketelitian dan kasih sayang, memegang teguh prinsip Offline-First dan Privacy-First. Semua catatan, rencana tugas, rekaman keuangan, hingga suasana hatimu tersimpan 100% secara lokal di perangkatmu sendiri tanpa perantara server cloud mana pun.

Semoga Tata bisa menjadi ruang yang tenang, nyaman, dan membantu produktivitasmu sehari-hari. Jika ada saran atau ingin berbagi cerita perkembangan Tata, jangan ragu untuk menyapa melalui Instagram @noto.grow!

Selamat berkarya dengan tenang!
— Developer Tata`;

const DEFAULT_MESSAGE_EN = `Hello! Thank you so much for choosing Tata.

Tata is carefully built with love and care, strictly upholding Offline-First and Privacy-First principles. All your notes, tasks, financial records, and mood tracking are stored 100% locally on your device without any cloud server middleware.

May Tata be a peaceful, comfortable space that supports your daily productivity. If you have feedback or want to follow Tata's journey, feel free to reach out via Instagram @noto.grow!

Enjoy your productivity in peace!
— Tata Developer`;

export default function DeveloperMessageModal({
  isOpen,
  onClose,
  lang = 'id',
  appTheme = 'dark'
}: DeveloperMessageModalProps) {
  const defaultMsg = lang === 'id' ? DEFAULT_MESSAGE_ID : DEFAULT_MESSAGE_EN;

  const [message, setMessage] = useState<string>(() => {
    try {
      return localStorage.getItem('tata_dev_message') || defaultMsg;
    } catch (e) {
      return defaultMsg;
    }
  });

  // Check if preview/dev mode is active
  const isPreviewOrDev = React.useMemo(() => {
    try {
      const meta = import.meta as any;
      return (
        !!meta?.env?.DEV ||
        window.location.hostname.includes('ais-dev') ||
        window.location.search.includes('dev=true') ||
        localStorage.getItem('tata_dev_mode') === 'true'
      );
    } catch (e) {
      return false;
    }
  }, []);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [toastText, setToastText] = useState('');
  const [clickCount, setClickCount] = useState(0);
  const [unlockedDevEdit, setUnlockedDevEdit] = useState(isPreviewOrDev);
  const devScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && devScrollRef.current) {
      devScrollRef.current.scrollTop = 0;
    }
  }, [isOpen]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tata_dev_message');
      if (saved) {
        setMessage(saved);
        setEditText(saved);
      } else {
        setMessage(defaultMsg);
        setEditText(defaultMsg);
      }
    } catch (e) {}
  }, [lang, defaultMsg]);

  if (!isOpen) return null;

  // Secret triple click to unlock editing mode in preview/test if needed
  const handleBadgeClick = () => {
    const newCount = clickCount + 1;
    setClickCount(newCount);
    if (newCount >= 3) {
      setUnlockedDevEdit(true);
      try {
        localStorage.setItem('tata_dev_mode', 'true');
      } catch (e) {}
      setToastText(lang === 'id' ? 'Mode Developer diaktifkan!' : 'Developer Mode unlocked!');
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
      setClickCount(0);
    }
  };

  const handleSave = () => {
    const trimmed = editText.trim();
    const finalMsg = trimmed || defaultMsg;
    setMessage(finalMsg);
    try {
      localStorage.setItem('tata_dev_message', finalMsg);
    } catch (e) {}
    setIsEditing(false);
    setToastText(lang === 'id' ? 'Pesan berhasil disimpan!' : 'Message saved!');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleReset = () => {
    setMessage(defaultMsg);
    setEditText(defaultMsg);
    try {
      localStorage.removeItem('tata_dev_message');
    } catch (e) {}
    setIsEditing(false);
    setToastText(lang === 'id' ? 'Pesan direset ke default' : 'Reset to default message');
    setShowSavedToast(true);
    setTimeout(() => setShowSavedToast(false), 2000);
  };

  const handleCopyMessage = () => {
    try {
      navigator.clipboard.writeText(message);
      setToastText(lang === 'id' ? 'Teks pesan berhasil disalin!' : 'Message text copied!');
      setShowSavedToast(true);
      setTimeout(() => setShowSavedToast(false), 2000);
    } catch (e) {}
  };

  const isLight = appTheme === 'light';

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[9999]"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className={`w-full max-w-md max-h-[85vh] flex flex-col rounded-[2rem] shadow-2xl overflow-hidden border ${
            isLight
              ? 'bg-white border-slate-800 text-slate-100'
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header Banner */}
          <div
            className={`p-5 border-b flex items-center justify-between relative shrink-0 ${
              isLight
                ? 'bg-gradient-to-r from-indigo-50 via-slate-50 to-violet-50 border-slate-800'
                : 'bg-gradient-to-r from-indigo-950/40 via-slate-900 to-violet-950/40 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleBadgeClick}
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer shrink-0 ${
                  isLight
                    ? 'bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-indigo-500/20'
                    : 'bg-gradient-to-tr from-indigo-500 to-violet-500 text-white shadow-indigo-500/25'
                }`}
                title={unlockedDevEdit ? 'Developer Mode Active' : 'Tata Developer'}
              >
                <Heart className="w-5 h-5 fill-white" />
              </button>
              <div>
                <h3 className="text-base font-extrabold flex items-center gap-1.5 tracking-tight">
                  <span>{lang === 'id' ? 'Pesan dari Developer' : 'Developer Message'}</span>
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                  <span className="flex items-center gap-1">
                    <Shield size={11} className="text-indigo-400" /> Offline & Privacy First
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-100 border border-slate-800'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <X size={16} />
            </button>
          </div>

          {/* Modal Body Content */}
          <div ref={devScrollRef} className="p-5 overflow-y-auto flex-1 space-y-4 custom-scrollbar">
            {showSavedToast && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2"
              >
                <Check size={14} />
                <span>{toastText}</span>
              </motion.div>
            )}

            {!isEditing ? (
              <div
                className={`p-5 rounded-2xl border space-y-4 relative ${
                  isLight
                    ? 'bg-slate-850/60 border-slate-800'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="text-indigo-500/10 absolute top-3 right-3 pointer-events-none">
                  <MessageSquare size={52} />
                </div>

                {/* Message Body */}
                <div
                  className={`text-xs sm:text-sm leading-relaxed whitespace-pre-line font-medium ${
                    isLight ? 'text-slate-100' : 'text-slate-200'
                  }`}
                >
                  {message}
                </div>

                {/* Feature Chips */}
                <div className="pt-2 flex flex-wrap gap-2 text-[10px] font-bold">
                  <span
                    className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                      isLight
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                    }`}
                  >
                    <HardDrive size={11} /> 100% Local Storage
                  </span>
                  <span
                    className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                      isLight
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    <Shield size={11} /> Zero Cloud Server
                  </span>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1.5 font-extrabold text-indigo-500">
                    <Heart size={13} className="fill-indigo-500" /> Tata Team
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleCopyMessage}
                      className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer border ${
                        isLight
                          ? 'bg-white hover:bg-slate-850 text-slate-200 border-slate-800'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      }`}
                      title={lang === 'id' ? 'Salin isi pesan' : 'Copy message text'}
                    >
                      <Copy size={12} />
                      <span>{lang === 'id' ? 'Salin' : 'Copy'}</span>
                    </button>

                    {/* Show Edit button ONLY if unlockedDevEdit (preview/dev environment or secret toggle) */}
                    {unlockedDevEdit && (
                      <button
                        onClick={() => {
                          setEditText(message);
                          setIsEditing(true);
                        }}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer border ${
                          isLight
                            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                            : 'bg-indigo-950/80 hover:bg-indigo-900/80 text-indigo-300 border-indigo-500/30'
                        }`}
                        title={lang === 'id' ? 'Ubah pesan developer (Mode Developer)' : 'Edit developer message'}
                      >
                        <Edit3 size={12} />
                        <span>{lang === 'id' ? 'Edit Pesan' : 'Edit Message'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Developer Edit Form (Only accessible when unlockedDevEdit = true) */
              <div className="space-y-3 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                    <Code2 size={14} />
                    <span>{lang === 'id' ? 'Ubah Pesan Developer' : 'Edit Developer Message'}</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>{lang === 'id' ? 'Reset Default' : 'Reset Default'}</span>
                  </button>
                </div>

                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={8}
                  placeholder={
                    lang === 'id'
                      ? 'Tulis pesan untuk pengguna Tata di sini...'
                      : 'Type message for Tata users here...'
                  }
                  className={`w-full p-3.5 border rounded-2xl text-xs sm:text-sm placeholder-slate-500 focus:outline-none transition-all custom-scrollbar leading-relaxed font-medium ${
                    isLight
                      ? 'bg-slate-50 border-indigo-300 text-slate-800 focus:border-indigo-600 ring-2 ring-indigo-500/10'
                      : 'bg-slate-950 border-indigo-500/30 text-slate-100 focus:border-indigo-500/60 ring-2 ring-indigo-500/20'
                  }`}
                />

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Check size={14} />
                    <span>{lang === 'id' ? 'Simpan Pesan' : 'Save Message'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer border ${
                      isLight
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    }`}
                  >
                    {lang === 'id' ? 'Batal' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className={`p-4 border-t flex items-center justify-between text-xs shrink-0 ${
              isLight
                ? 'bg-slate-50 border-slate-200/80'
                : 'bg-slate-950/80 border-slate-800/80'
            }`}
          >
            <span className="text-[11px] text-slate-400 font-semibold">@noto.grow</span>
            <button
              onClick={onClose}
              className={`px-4 py-1.5 font-bold text-xs rounded-xl transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              {lang === 'id' ? 'Tutup' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, ArrowLeft, ChevronRight, Check, FileText, 
  AlertCircle, ShieldCheck, ExternalLink, Sparkles
} from 'lucide-react';
import { useAppStore, TataAccount } from '../store';
import { useTranslation } from '../translations';
import { playTapSound, playCelebrationSound } from '../utils/sound';
import GoogleAccountPromptModal from '../components/GoogleAccountPromptModal';
import TermsAndPrivacyModal from '../components/TermsAndPrivacyModal';
import { 
  Icon3DTataAI,
  Icon3DWallet,
  Icon3DNavTasks,
  Icon3DNavCalendar,
  Icon3DNavNotes,
  Icon3DLock,
  Icon3DDatabase,
  Icon3DShield,
  Icon3DUser,
  Icon3DFileText,
  Icon3DTrophy,
  Icon3DCheckSquare,
  Icon3DInfo
} from '../components/home/Organic3DIcons';

interface OnboardingScreenProps {
  onFinish: () => void;
}

export default function OnboardingScreen({ onFinish }: OnboardingScreenProps) {
  const { user, updateUser, lang, tataAccount, setAppVersion } = useAppStore();
  const t = useTranslation(lang);

  const [step, setStep] = useState(0);
  const [guestName, setGuestName] = useState(
    tataAccount?.name || (user.name !== 'Pengguna' && user.name !== 'Pengguna Tata' ? user.name : '')
  );
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  // Mandatory Terms & Privacy Agreement state
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tata_terms_agreed') === 'true';
    } catch {
      return false;
    }
  });
  const [shakeTermsNotice, setShakeTermsNotice] = useState(false);

  const handleToggleTerms = (checked: boolean) => {
    playTapSound();
    setHasAgreedToTerms(checked);
    setShakeTermsNotice(false);
    try {
      if (checked) {
        localStorage.setItem('tata_terms_agreed', 'true');
        localStorage.setItem('tata_terms_agreed_at', new Date().toISOString());
      } else {
        localStorage.removeItem('tata_terms_agreed');
      }
    } catch (e) {
      console.warn('Storage warning:', e);
    }
  };

  // Quick skip with legal protection
  const handleQuickSkip = () => {
    playTapSound();
    if (!hasAgreedToTerms) {
      // Must agree to terms first
      setStep(1);
      setShakeTermsNotice(true);
      return;
    }
    const finalName = guestName.trim() || tataAccount?.name || (lang === 'id' ? 'Pengguna' : 'User');
    updateUser({ ...user, name: finalName });
    onFinish();
  };

  const handleNextStep = () => {
    playTapSound();
    if (step === 1 && !hasAgreedToTerms) {
      setShakeTermsNotice(true);
      return;
    }
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    playTapSound();
    setStep((prev) => Math.max(prev - 1, 0));
  };

  const handleCompleteAsGuest = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    playTapSound();
    if (!hasAgreedToTerms) {
      setStep(1);
      setShakeTermsNotice(true);
      return;
    }
    const finalName = guestName.trim() || (lang === 'id' ? 'Pengguna' : 'User');
    updateUser({ ...user, name: finalName });
    setStep(3);
  };

  const handleAuthSuccess = (account: TataAccount) => {
    setShowAuthModal(false);
    playCelebrationSound();
    const resolvedName = account.name || account.email.split('@')[0];
    setGuestName(resolvedName);
    updateUser({
      ...user,
      name: resolvedName,
      avatarUrl: account.avatarUrl || user.avatarUrl
    });
    if (account.isPremium || account.isTrial) {
      setAppVersion('pro_max');
    }
    setStep(3);
  };

  const handleFinalEnterApp = () => {
    if (isFinishing) return;
    setIsFinishing(true);
    playCelebrationSound();
    setTimeout(() => {
      onFinish();
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-y-auto">
      {/* Ambient background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-600/5 blur-3xl" />
      </div>

      {/* Top Header / Progress Bar */}
      <header className="relative z-20 w-full max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {step > 0 && step < 3 && (
            <button
              type="button"
              onClick={handlePrevStep}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer mr-1"
              title={lang === 'id' ? 'Kembali' : 'Back'}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-black text-sm flex items-center justify-center shadow-lg shadow-indigo-600/30">
              T
            </span>
            <span className="font-black text-base tracking-tight text-slate-100">
              Tata<span className="text-emerald-400">.</span>
            </span>
          </div>
        </div>

        {/* Step dots */}
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                if (idx < step || (idx === 1 && hasAgreedToTerms) || idx === 0) {
                  playTapSound();
                  setStep(idx);
                }
              }}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                idx === step 
                  ? 'w-7 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' 
                  : idx < step 
                    ? 'w-2 bg-emerald-500/50' 
                    : 'w-2 bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* Skip button */}
        {step < 3 ? (
          <button
            type="button"
            onClick={handleQuickSkip}
            className="text-xs font-semibold text-slate-400 hover:text-emerald-300 transition-colors py-1.5 px-3 rounded-xl hover:bg-slate-900 cursor-pointer"
          >
            {lang === 'id' ? 'Lewati' : 'Skip'}
          </button>
        ) : (
          <div className="w-12" />
        )}
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            {/* ========================================================================= */}
            {/* SLIDE 0: APP IDENTITY & FEATURE STORYTELLING (3D ORGANIC ICONS) */}
            {/* ========================================================================= */}
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-6 text-center"
              >
                {/* Hero Badge & Title */}
                <div className="space-y-3 max-w-md mx-auto">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold tracking-wider shadow-sm">
                    <Icon3DTataAI size={20} />
                    <span>{lang === 'id' ? 'Privasi Utama • Bekerja Offline-First' : 'Privacy First • Offline-First Workspace'}</span>
                  </div>

                  <h1 className="text-3xl sm:text-4xl font-black text-slate-50 tracking-tight leading-tight">
                    {lang === 'id' 
                      ? 'Selamat Datang di Tata.' 
                      : 'Welcome to Tata.'}
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {lang === 'id'
                      ? 'Ruang produktivitas pribadi untuk mencatat ide, mengatur tugas harian, jadwal kalender, dan arus keuangan. Berbasis Offline-First di perangkat Anda, dapat dipasang sebagai PWA, dan dilengkapi fitur online cerdas saat Anda membutuhkannya.'
                      : 'A personal productivity workspace to capture ideas, manage daily tasks, calendars, and finances. Offline-first on your device, installable as a PWA, with smart online features whenever you need them.'}
                  </p>
                </div>

                {/* Feature Storytelling Cards Grid (Using Organic Mode 3D Icons!) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                  {/* Notes (Catatan & Ide Cerdas) */}
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-950/25 via-slate-900 to-slate-900/90 border border-amber-500/20 hover:border-amber-500/40 transition-all space-y-2 shadow-sm group">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
                        <Icon3DNavNotes size={36} active={true} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Markdown & Mind Map
                      </span>
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-slate-100">
                        {lang === 'id' ? 'Catatan & Ide Cerdas' : 'Smart Notes & Ideas'}
                      </h2>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                        {lang === 'id' 
                          ? 'Format Markdown kaya, visual mind map interaktif, daftar centang, filter tag, dan catatan privat terkunci.' 
                          : 'Rich markdown, interactive mind maps, checklists, tag filters, and private locked notes.'}
                      </p>
                    </div>
                  </div>

                  {/* Tasks (Tugas & Fokus) */}
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-emerald-950/25 via-slate-900 to-slate-900/90 border border-emerald-500/20 hover:border-emerald-500/40 transition-all space-y-2 shadow-sm group">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
                        <Icon3DNavTasks size={36} active={true} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        To-Do & Pomodoro
                      </span>
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-slate-100">
                        {lang === 'id' ? 'Tugas & Fokus Harian' : 'Daily Tasks & Focus'}
                      </h2>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                        {lang === 'id' 
                          ? 'Daftar to-do terstruktur, matriks prioritas, filter tag, serta timer Pomodoro untuk disiplin diri.' 
                          : 'Structured to-do lists, priority matrix, tag filters, and Pomodoro focus timers.'}
                      </p>
                    </div>
                  </div>

                  {/* Calendar (Kalender & Agenda) */}
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-sky-950/25 via-slate-900 to-slate-900/90 border border-sky-500/20 hover:border-sky-500/40 transition-all space-y-2 shadow-sm group">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-500/25 flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
                        <Icon3DNavCalendar size={36} active={true} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                        Agenda & Alarm
                      </span>
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-slate-100">
                        {lang === 'id' ? 'Kalender & Jadwal' : 'Calendar & Schedules'}
                      </h2>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                        {lang === 'id' 
                          ? 'Agenda terorganisir per tanggal, penanda warna tema, dan pengingat lokal yang presisi.' 
                          : 'Daily timeline agendas, color categories, and offline reliable notifications.'}
                      </p>
                    </div>
                  </div>

                  {/* Finance (Keuangan & Tabungan) */}
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-amber-950/25 via-slate-900 to-slate-900/90 border border-amber-500/20 hover:border-amber-500/40 transition-all space-y-2 shadow-sm group">
                    <div className="flex items-center justify-between">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
                        <Icon3DWallet size={36} />
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                        Cashflow & Tabungan
                      </span>
                    </div>
                    <div>
                      <h2 className="font-bold text-sm text-slate-100">
                        {lang === 'id' ? 'Keuangan & Tabungan' : 'Finances & Savings'}
                      </h2>
                      <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                        {lang === 'id' 
                          ? 'Pencatatan arus kas, target celengan impian, ringkasan pengeluaran, dan kalkulator cicilan.' 
                          : 'Cashflow logs, savings targets, expense summaries, and debt installment manager.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Primary CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    className="w-full sm:w-auto min-w-[260px] px-8 py-4 rounded-2xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2.5"
                  >
                    <span>{lang === 'id' ? 'Lanjut: Privasi & Ketentuan' : 'Continue: Privacy & Terms'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* SLIDE 1: PRIVACY & USER RESPONSIBILITY WITH REASSURING CHECKBOX */}
            {/* ========================================================================= */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-5 text-center"
              >
                {/* Header Icon & Title */}
                <div className="space-y-2 max-w-md mx-auto">
                  <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shadow-xl shadow-emerald-500/20 p-2">
                    <Icon3DShield size={44} />
                  </div>

                  <h1 className="text-2xl sm:text-3xl font-black text-slate-50 tracking-tight leading-snug">
                    {lang === 'id' 
                      ? 'Privasi & Kedaulatan Data Anda' 
                      : 'Privacy & Data Ownership'}
                  </h1>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {lang === 'id'
                      ? 'Di Tata, data Anda adalah milik Anda seutuhnya. Kami merancang Tata agar Anda memegang kendali penuh dengan prinsip privasi yang jujur dan transparan:'
                      : 'At Tata, your data belongs completely to you. We designed Tata with full transparency and personal privacy at heart:'}
                  </p>
                </div>

                {/* 4 Core Reassuring Safeguards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                  {/* 1. Local Storage */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      <Icon3DDatabase size={28} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-100">
                        {lang === 'id' ? '1. Data Sepenuhnya di Tangan Anda' : '1. Data Stays on Your Device'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {lang === 'id'
                          ? 'Catatan, tugas, dan keuangan tersimpan di memori perangkat ini. Developer tidak mengumpulkan, melihat, atau menyimpan isi data pribadi Anda.'
                          : 'Notes, tasks, and finances reside in your local device memory. Developers do not collect or view your private contents.'}
                      </p>
                    </div>
                  </div>

                  {/* 2. User Backup Responsibility */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      <Icon3DLock size={28} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-100">
                        {lang === 'id' ? '2. Cadangkan Mandiri Kapan Saja' : '2. Self-Backup at Your Control'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {lang === 'id'
                          ? 'Karena data tidak dikirim ke server luar demi privasi, Anda bebas mengekspor cadangan berkas (backup) jika ingin berganti perangkat.'
                          : 'Since data is not sent to external servers for privacy, you can export backups anytime to secure or transfer your files.'}
                      </p>
                    </div>
                  </div>

                  {/* 3. Safe Ads & Transparent Payments */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      <Icon3DFileText size={28} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-100">
                        {lang === 'id' ? '3. Iklan Aman & Transaksi Jelas' : '3. Safe Ads & Secure Billing'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {lang === 'id'
                          ? 'Tata versi gratis dapat memuat iklan aman tanpa pernah menjual data Anda. Developer hanya menerima data konfirmasi jika Anda membeli lisensi resmi Tata Pro.'
                          : 'Free tier may include safe ads without tracking or selling data. Developers only process payment confirmations when purchasing Tata Pro.'}
                      </p>
                    </div>
                  </div>

                  {/* 4. AI & Online Features */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      <Icon3DTataAI size={28} />
                    </div>
                    <div>
                      <h3 className="font-bold text-xs text-slate-100">
                        {lang === 'id' ? '4. Fitur Cerdas Online Opsional' : '4. Optional Smart Online Features'}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                        {lang === 'id'
                          ? 'Fitur seperti Tata AI dan pemindai struk (OCR) memerlukan internet dan hanya memproses teks saat Anda secara sadar menekan tombol perintah.'
                          : 'Features like Tata AI and receipt OCR require internet and only process texts when you explicitly tap action buttons.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Read Full Legal Document Trigger */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => { playTapSound(); setShowTermsModal(true); }}
                    className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline py-1 px-3 rounded-lg hover:bg-emerald-500/10 transition-colors cursor-pointer"
                  >
                    <Icon3DInfo size={18} />
                    <span>{lang === 'id' ? 'Baca Rincian Ketentuan Pengguna & Privasi Lengkap' : 'Read Full Terms & Privacy Details'}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* MANDATORY CHECKBOX BOX */}
                <motion.div 
                  animate={shakeTermsNotice ? { x: [-6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.35 }}
                  className={`p-4 rounded-2xl border transition-all text-left space-y-2.5 ${
                    hasAgreedToTerms 
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.12)]' 
                      : shakeTermsNotice
                        ? 'bg-rose-950/30 border-rose-500/70 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                        : 'bg-slate-900/90 border-slate-700/80 hover:border-slate-600'
                  }`}
                >
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                      <input 
                        type="checkbox"
                        checked={hasAgreedToTerms}
                        onChange={(e) => handleToggleTerms(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
                        hasAgreedToTerms 
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950' 
                          : 'bg-slate-950 border-slate-600'
                      }`}>
                        {hasAgreedToTerms && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>

                    <div className="text-xs leading-relaxed text-slate-200">
                      <span className="font-bold text-slate-100">
                        {lang === 'id' 
                          ? 'Saya memahami dan menyetujui prinsip privasi serta ketentuan penggunaan Tata.' 
                          : 'I understand and agree to Tata privacy principles and terms of use.'}
                      </span>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {lang === 'id'
                          ? 'Data catatan dan keuangan saya berada langsung di perangkat ini, saya dapat mencadangkan berkas secara mandiri, iklan yang ditampilkan aman tanpa menjual data pribadi, dan developer hanya mengelola data transaksi pembelian lisensi.'
                          : 'My notes and financial data stay locally on my device, I can export backups anytime, ads remain safe without selling my data, and developers only handle purchase transaction records.'}
                      </p>
                    </div>
                  </label>

                  {shakeTermsNotice && !hasAgreedToTerms && (
                    <div className="flex items-center gap-1.5 text-rose-400 text-[11px] font-bold pt-1">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{lang === 'id' ? 'Mohon centang kotak persetujuan di atas untuk dapat melanjutkan.' : 'Please check the agreement box above to continue.'}</span>
                    </div>
                  )}
                </motion.div>

                {/* Primary CTA */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleNextStep}
                    disabled={!hasAgreedToTerms}
                    className={`w-full sm:w-auto min-w-[260px] px-8 py-4 rounded-2xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2.5 mx-auto ${
                      hasAgreedToTerms
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-emerald-500/25 active:scale-95 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-70'
                    }`}
                  >
                    <span>
                      {hasAgreedToTerms
                        ? (lang === 'id' ? 'Lanjut: Pilih Cara Masuk' : 'Continue: Choose How to Enter')
                        : (lang === 'id' ? 'Centang persetujuan di atas untuk lanjut' : 'Check box above to continue')}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* SLIDE 2: CHOOSE HOW TO ENTER (GUEST OR GOOGLE) */}
            {/* ========================================================================= */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="space-y-5 text-center"
              >
                <div className="space-y-2 max-w-md mx-auto">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-50 tracking-tight">
                    {lang === 'id' ? 'Pilih Cara Anda Memulai' : 'Choose How to Start'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {lang === 'id'
                      ? 'Gunakan langsung sebagai Tamu Lokal tanpa daftar akun, atau hubungkan akun Google / email untuk nama profil dan lisensi.'
                      : 'Use instantly as a Local Guest without sign up, or connect Google / email for your profile and license.'}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* OPTION A: QUICK GUEST MODE (OFFLINE FIRST) */}
                  <form 
                    onSubmit={handleCompleteAsGuest}
                    className="p-5 sm:p-6 rounded-3xl bg-slate-900 border border-slate-800 text-left space-y-4 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center">
                          <Icon3DUser size={28} />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm sm:text-base text-slate-100">
                            {lang === 'id' ? 'Mode Tamu Lokal (Rekomendasi)' : 'Local Guest Mode (Recommended)'}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {lang === 'id' ? 'Instan tanpa daftar, data tersimpan di perangkat ini' : 'Instant without sign up, data saved locally'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Offline-First
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-slate-300">
                        {lang === 'id' ? 'Siapa nama panggilan Anda?' : 'What is your preferred name?'}
                      </label>
                      <input
                        type="text"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder={lang === 'id' ? 'Contoh: Budi atau Sarah' : 'e.g., Alex'}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 font-medium text-sm focus:outline-none focus:border-emerald-500 shadow-inner"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 shadow-md shadow-emerald-500/20 transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
                    >
                      <span>{lang === 'id' ? 'Mulai sebagai Tamu (Offline-First)' : 'Start as Guest (Offline-First)'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>

                  {/* OR SEPARATOR */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                      {lang === 'id' ? 'Atau Hubungkan Akun' : 'Or Connect Account'}
                    </span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>

                  {/* OPTION B: GOOGLE SIGN IN & 6-DAY FREE TRIAL */}
                  <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                          <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                        </svg>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-200">
                            {lang === 'id' ? 'Masuk dengan Akun Google' : 'Sign in with Google Account'}
                          </h4>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {lang === 'id' ? 'Uji Coba 6 Hari' : '6-Day Trial'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {lang === 'id' 
                            ? 'Buka akses Tata Pro & Pro Max gratis 6 hari! Selesai trial, akun beralih aman ke Tata Lite tanpa hilang data.' 
                            : 'Unlock Tata Pro & Pro Max free for 6 days! Seamlessly switches to Lite after with zero data loss.'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { playTapSound(); setShowAuthModal(true); }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-full bg-white hover:bg-slate-100 text-zinc-950 font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                        <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                      </svg>
                      <span>{lang === 'id' ? 'Uji Coba 6 Hari' : 'Start 6-Day Trial'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ========================================================================= */}
            {/* SLIDE 3: CELEBRATION & READY TO USE */}
            {/* ========================================================================= */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="space-y-6 text-center"
              >
                {/* 3D Trophy Celebration Badge */}
                <div className="w-24 h-24 mx-auto rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shadow-xl shadow-amber-500/20 relative p-3">
                  <Icon3DTrophy size={60} />
                  <div className="absolute inset-0 rounded-3xl bg-amber-500/10 blur-xl pointer-events-none" />
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">
                    {lang === 'id' ? 'Ruang Kerja Siap' : 'Workspace Ready'}
                  </span>
                  <h1 className="text-3xl sm:text-4xl font-black text-slate-50 tracking-tight">
                    {lang === 'id' ? 'Selamat Datang' : 'Welcome'}, {guestName || (lang === 'id' ? 'Sahabat' : 'Friend')}!
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed px-2">
                    {lang === 'id'
                      ? 'Ruang kerja pribadimu telah siap digunakan. Nikmati produktivitas yang tenang, rapi, dan sepenuhnya dalam kendali privasi Anda.'
                      : 'Your personal workspace is ready. Enjoy calm, organized productivity with your privacy fully protected.'}
                  </p>
                </div>

                {/* Quick Tip Pill with 3D CheckSquare */}
                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 max-w-md mx-auto text-xs text-slate-300 flex items-center justify-center gap-2.5">
                  <Icon3DCheckSquare size={22} />
                  <span>
                    {lang === 'id'
                      ? 'Tip: Tekan tombol + di beranda kapan saja untuk membuat catatan atau tugas pertamamu.'
                      : 'Tip: Tap + on home anytime to create your first note or task.'}
                  </span>
                </div>

                <div className="pt-3">
                  <button
                    type="button"
                    onClick={handleFinalEnterApp}
                    disabled={isFinishing}
                    className="w-full sm:w-auto min-w-[280px] px-8 py-4 rounded-2xl font-black text-base bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-xl shadow-emerald-500/30 transition-all active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2.5 disabled:opacity-50"
                  >
                    <span>{lang === 'id' ? 'Mulai Gunakan Tata Sekarang' : 'Enter Workspace Now'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Official Copyright & Legal Footer */}
      <footer className="relative z-20 w-full max-w-2xl mx-auto px-4 py-3 text-center border-t border-slate-900 text-slate-500 text-[11px] space-y-0.5">
        <p className="font-semibold text-slate-400">
          © 2026 Tata. Hak Cipta Dilindungi Undang-Undang (All Rights Reserved).
        </p>
        <p className="text-[10px] text-slate-500">
          {lang === 'id'
            ? 'Aplikasi Produktivitas Pribadi • Berbasis Offline-First • Data & Privasi Sepenuhnya Milik Anda'
            : 'Personal Productivity Workspace • Offline-First • Private & User-Owned'}
        </p>
      </footer>

      {/* Google Sign-In Auth Modal */}
      <GoogleAccountPromptModal
        isOpen={showAuthModal}
        flow="trial"
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />

      {/* Full Terms of Service & Privacy Policy Modal */}
      <TermsAndPrivacyModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAgree={() => handleToggleTerms(true)}
        lang={lang}
      />
    </div>
  );
}

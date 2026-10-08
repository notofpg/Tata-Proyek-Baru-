import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Lock, Database, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';
import { 
  Icon3DShield, 
  Icon3DLock, 
  Icon3DDatabase, 
  Icon3DTataAI, 
  Icon3DFileText 
} from './home/Organic3DIcons';

interface TermsAndPrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAgree?: () => void;
  lang: 'id' | 'en';
}

export default function TermsAndPrivacyModal({ isOpen, onClose, onAgree, lang }: TermsAndPrivacyModalProps) {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms' | 'liability'>('privacy');
  const termsScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && termsScrollRef.current) {
      termsScrollRef.current.scrollTop = 0;
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-5">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100"
        >
            {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-emerald-500/15 border border-emerald-500/25">
                <Icon3DShield size={28} />
              </div>
              <div>
                <h3 className="font-black text-base sm:text-lg text-slate-100 leading-tight">
                  {lang === 'id' 
                    ? 'Ketentuan Penggunaan & Privasi Tata' 
                    : 'Tata Terms of Use & Privacy'}
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-400">
                  {lang === 'id' 
                    ? 'Prinsip Kedaulatan Pengguna, Iklan Aman, & Perlindungan Data' 
                    : 'User Data Ownership, Safe Ads, & Privacy Principles'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title={lang === 'id' ? 'Tutup' : 'Close'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/30 px-3 pt-2 gap-1 overflow-x-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('privacy')}
              className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'privacy'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{lang === 'id' ? '1. Privasi & Pembayaran' : '1. Privacy & Billing'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('terms')}
              className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'terms'
                  ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>{lang === 'id' ? '2. Iklan & Fitur Online' : '2. Ads & Online Features'}</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('liability')}
              className={`px-4 py-2.5 rounded-t-xl border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'liability'
                  ? 'border-amber-500 text-amber-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{lang === 'id' ? '3. Backup & Hak Cipta' : '3. Backups & Copyright'}</span>
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div ref={termsScrollRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs sm:text-sm text-slate-300 leading-relaxed custom-scrollbar">
            {activeTab === 'privacy' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-3">
                  <Icon3DDatabase size={24} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold mb-0.5">
                      {lang === 'id' ? 'Komitmen Utama: Data Anda Sepenuhnya di Tangan Anda' : 'Core Commitment: Your Data Stays in Your Hands'}
                    </strong>
                    {lang === 'id'
                      ? 'Tata tidak mengumpulkan atau menyimpan isi catatan, agenda, maupun transaksi keuangan Anda. Seluruh data tersebut tersimpan secara lokal di perangkat Anda sendiri.'
                      : 'Tata does not collect or store your personal notes, tasks, or financial entries. All personal content resides locally on your device.'}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                    <span className="text-emerald-400 font-mono">§1</span>
                    {lang === 'id' ? 'Penyimpanan Lokal di Perangkat (Offline-First)' : 'Local Storage on Your Device (Offline-First)'}
                  </h4>
                  <p>
                    {lang === 'id'
                      ? 'Aplikasi Tata beroperasi dengan prinsip Offline-First. Setiap catatan ide, to-do list, agenda kalender, dan pencatatan arus kas disimpan langsung di penyimpanan lokal browser/perangkat Anda (LocalStorage dan IndexedDB). Developer Tata tidak memiliki akses dan tidak mengintip isi data Anda.'
                      : 'Tata operates offline-first. Notes, to-do lists, calendars, and financial logs are saved directly in your device/browser local storage (LocalStorage and IndexedDB). Developers have no access to your private contents.'}
                  </p>

                  <h4 className="font-bold text-slate-100 text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2 pt-2">
                    <span className="text-emerald-400 font-mono">§2</span>
                    {lang === 'id' ? 'Data Transaksi Pembayaran Resmi' : 'Official Purchase Transaction Data'}
                  </h4>
                  <p>
                    {lang === 'id'
                      ? 'Developer hanya menerima data administratif pembayaran (seperti alamat email dan nomor invoice/transaksi) ketika Anda membeli lisensi Tata Pro secara resmi. Data ini semata-mata digunakan untuk memverifikasi status langganan atau lisensi akun Anda, bukan untuk melacak aktivitas pribadi.'
                      : 'Developers only receive administrative transaction receipts (such as email and order ID) when you officially purchase a Tata Pro license, strictly used to verify your subscription status.'}
                  </p>

                  <h4 className="font-bold text-slate-100 text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2 pt-2">
                    <span className="text-emerald-400 font-mono">§3</span>
                    {lang === 'id' ? 'Tidak Ada Penjualan Data Pengguna' : 'Zero Sale of Personal Data'}
                  </h4>
                  <p>
                    {lang === 'id'
                      ? 'Kami tidak pernah dan tidak akan pernah menjual, menyewakan, atau memperdagangkan data pribadi pengguna kepada pihak ketiga mana pun. Kedaulatan data Anda adalah prioritas utama Tata.'
                      : 'We never sell, rent, or trade your personal data to any third party. Your data ownership remains our top priority.'}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'terms' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-start gap-3">
                  <Icon3DFileText size={24} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold mb-0.5">
                      {lang === 'id' ? 'Iklan yang Aman & Fitur Online Transparan' : 'Safe Ads & Transparent Online Services'}
                    </strong>
                    {lang === 'id'
                      ? 'Tata gratis didukung iklan wajar yang aman tanpa mengorbankan privasi Anda. Fitur online seperti Tata AI hanya aktif jika Anda memilih untuk menggunakannya.'
                      : 'Tata free tier is supported by privacy-safe ads. Online features such as Tata AI run only when you choose to use them.'}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                    <span className="text-indigo-400 font-mono">§4</span>
                    {lang === 'id' ? 'Iklan Aman Tanpa Jual Data' : 'Privacy-Safe Advertisements'}
                  </h4>
                  <p>
                    {lang === 'id'
                      ? 'Untuk menjaga agar versi dasar Tata tetap gratis bagi semua orang, aplikasi dapat menampilkan iklan sponsor yang wajar. Iklan ini berjalan dengan standar keamanan tinggi dan TIDAK PERNAH membaca catatan, membuka data keuangan, ataupun menjual data pribadi Anda kepada pengiklan.'
                      : 'To keep Tata accessible for everyone, the free edition may display reasonable ads. These ads never read your notes, never access your financial records, and never sell personal information.'}
                  </p>

                  <h4 className="font-bold text-slate-100 text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2 pt-2">
                    <span className="text-indigo-400 font-mono">§5</span>
                    {lang === 'id' ? 'Akses Browser & Pemasangan PWA' : 'Browser Access & PWA Installation'}
                  </h4>
                  <p>
                    {lang === 'id'
                      ? 'Saat pertama kali mengakses Tata, Anda membukanya melalui peramban web yang memerlukan koneksi internet. Anda dapat memasang Tata ke layar utama perangkat sebagai Progressive Web App (PWA) agar dapat dibuka dan digunakan dengan nyaman kapan saja.'
                      : 'Initial access to Tata takes place via your web browser. You can install Tata as a Progressive Web App (PWA) to your home screen for quick everyday offline-first access.'}
                  </p>

                  <h4 className="font-bold text-slate-100 text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2 pt-2">
                    <span className="text-indigo-400 font-mono">§6</span>
                    {lang === 'id' ? 'Fitur Online Cerdas (Tata AI & OCR Struk)' : 'Smart Online Features (Tata AI & Receipt OCR)'}
                  </h4>
                  <p>
                    {lang === 'id'
                      ? 'Fitur cerdas seperti asisten Tata AI dan pemindai struk belanja (OCR) memerlukan koneksi internet untuk mengolah data teks. Fitur ini bersifat opsional dan hanya bekerja saat Anda secara sadar menekan tombol aksi, tanpa menyimpan riwayat teks di server Tata.'
                      : 'AI assistance and receipt OCR require an internet connection to process queries. These features are optional, run only upon your explicit action, and retain no conversational history on Tata servers.'}
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'liability' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-3">
                  <Icon3DLock size={24} className="shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold mb-0.5">
                      {lang === 'id' ? 'Pencadangan Mandiri & Perlindungan Hak Cipta' : 'Self-Backups & Copyright Protection'}
                    </strong>
                    {lang === 'id'
                      ? 'Karena privasi Anda terjaga tanpa server cloud pusat, pengguna memiliki kendali penuh untuk mengekspor cadangan berkas mandiri.'
                      : 'Because your privacy is protected without centralized cloud servers, users maintain full control to export backup files.'}
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-bold text-slate-100 text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2">
                    <span className="text-amber-400 font-mono">§7</span>
                    {lang === 'id' ? 'Pencadangan Data Mandiri (Backup)' : 'Self-Backup Control'}
                  </h4>
                  <p>
                    {lang === 'id'
                      ? 'Karena seluruh catatan dan keuangan tersimpan langsung di perangkat Anda demi menjaga privasi, kami menyarankan pengguna untuk mengunduh salinan cadangan berkas (ekspor JSON) secara berkala melalui menu Pengaturan. Hal ini melindungi data Anda jika perangkat hilang atau cache peramban dibersihkan.'
                      : 'Because all notes and records remain solely on your device for privacy, we recommend exporting backup files (JSON) periodically via Settings. This protects your data if you switch devices or clear browser caches.'}
                  </p>

                  <h4 className="font-bold text-slate-100 text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2 pt-2">
                    <span className="text-amber-400 font-mono">§8</span>
                    {lang === 'id' ? 'Komitmen Kualitas Aplikasi' : 'App Quality Commitment'}
                  </h4>
                  <p>
                    {lang === 'id'
                      ? 'Developer berupaya sebaik mungkin untuk menyediakan aplikasi Tata yang andal, rapi, dan bermanfaat bagi produktivitas harian Anda. Aplikasi disediakan untuk mendukung produktivitas pribadi dengan itikad baik dan menghormati hak privasi setiap pengguna.'
                      : 'Developers strive to provide a reliable, clean, and productive experience in good faith, always respecting the fundamental privacy rights of every user.'}
                  </p>

                  <h4 className="font-bold text-slate-100 text-sm sm:text-base border-b border-slate-800 pb-1.5 flex items-center gap-2 pt-2">
                    <span className="text-amber-400 font-mono">§9</span>
                    {lang === 'id' ? 'Hak Cipta & Kepemilikan Intelektual' : 'Copyright & Intellectual Property'}
                  </h4>
                  <p>
                    {lang === 'id'
                      ? 'Seluruh nama merek Tata, logo, ikon 3D Pro Max, dan rancangan visual aplikasi dilindungi oleh hak cipta © 2026 Tata. Hak Cipta Dilindungi Undang-Undang.'
                      : 'The Tata brand, logos, 3D Pro Max icon assets, and interface designs are protected under copyright © 2026 Tata. All Rights Reserved.'}
                  </p>
                </div>
              </div>
            )}

            {/* Copyright Note */}
            <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 text-center space-y-1">
              <p className="font-semibold text-slate-400">
                © 2026 Tata. Hak Cipta Dilindungi Undang-Undang (All Rights Reserved).
              </p>
              <p>
                {lang === 'id'
                  ? 'Aplikasi Produktivitas Pribadi • Offline-First • Data & Privasi di Tangan Pengguna'
                  : 'Personal Productivity Workspace • Offline-First • Private & User-Owned'}
              </p>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                {lang === 'id' 
                  ? 'Tata melindungi privasi Anda & tidak menjual data pribadi.' 
                  : 'Tata protects your privacy & never sells personal data.'}
              </span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              {onAgree ? (
                <button
                  type="button"
                  onClick={() => {
                    onAgree();
                    onClose();
                  }}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{lang === 'id' ? 'Saya Setuju & Simpan' : 'I Agree & Save'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all cursor-pointer"
                >
                  {lang === 'id' ? 'Tutup' : 'Close'}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

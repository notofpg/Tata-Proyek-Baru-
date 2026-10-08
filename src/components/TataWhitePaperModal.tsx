import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Shield, Info, ArrowUp, Crown, Sparkles, 
  Check, Lock, Megaphone, KeyRound, ShieldCheck 
} from 'lucide-react';

interface TataWhitePaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
  initialSection?: 'privacy' | 'about' | 'tiers' | 'google';
}

export default function TataWhitePaperModal({
  isOpen,
  onClose,
  lang = 'id',
  initialSection
}: TataWhitePaperModalProps) {
  const isId = lang === 'id';
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      // Selalu mulai membaca dari atas (judul, metadata, bab 1)
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
      }
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4 md:p-6">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-stone-950/80 backdrop-blur-md"
        />

        {/* Paper Document Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative z-10 w-full max-w-3xl h-[94vh] bg-[#FCFBF8] text-[#1C1917] rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col border border-stone-200 overflow-hidden"
        >
          {/* Header Bar */}
          <div className="px-5 sm:px-8 py-3.5 border-b border-stone-200/90 bg-[#FAF8F4] flex items-center justify-between shrink-0 select-none">
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block animate-pulse" />
              <div>
                <span className="text-[11px] sm:text-xs font-mono font-bold tracking-wider text-stone-700 uppercase">
                  TATA WHITE PAPER • {isId ? 'DOKUMEN RESMI' : 'OFFICIAL DOCUMENT'} v5.1.0
                </span>
              </div>
            </div>

            {/* Quick section jumps */}
            <div className="hidden sm:flex items-center gap-2.5 text-xs font-sans text-stone-600">
              <button
                type="button"
                onClick={() => scrollToSection('section-about')}
                className="hover:text-stone-950 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <Info size={12} className="text-stone-400" />
                {isId ? 'Tentang' : 'About'}
              </button>
              <span className="text-stone-300">•</span>
              <button
                type="button"
                onClick={() => scrollToSection('section-tiers')}
                className="hover:text-stone-950 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <Crown size={12} className="text-amber-500" />
                {isId ? 'Lite, Pro & Pro Max' : 'Tiers & Monetization'}
              </button>
              <span className="text-stone-300">•</span>
              <button
                type="button"
                onClick={() => scrollToSection('section-google')}
                className="hover:text-stone-950 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <ShieldCheck size={12} className="text-blue-500" />
                {isId ? 'Akun Google' : 'Google Account'}
              </button>
              <span className="text-stone-300">•</span>
              <button
                type="button"
                onClick={() => scrollToSection('section-privacy')}
                className="hover:text-stone-950 transition-colors flex items-center gap-1 cursor-pointer font-medium"
              >
                <Shield size={12} className="text-emerald-600" />
                {isId ? 'Privasi Nol-Cloud' : 'Zero-Cloud Privacy'}
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-stone-500 hover:text-stone-900 hover:bg-stone-200/70 transition-colors cursor-pointer"
              title={isId ? 'Tutup Dokumen (Esc)' : 'Close Document (Esc)'}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Long-form Reading Body */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 overflow-y-auto px-6 sm:px-12 md:px-16 py-8 sm:py-12 space-y-12 font-serif text-[15px] sm:text-[17px] leading-[1.85] text-stone-800 custom-scrollbar selection:bg-amber-100 selection:text-amber-950"
          >
            
            {/* Title & Document Meta */}
            <header className="border-b border-stone-300 pb-8 space-y-4">
              <div className="font-mono text-[11px] sm:text-xs text-stone-500 uppercase tracking-widest">
                {isId ? 'DOKUMEN SPESIFIKASI TEKNIS & KEBIJAKAN PRIVASI RESMI' : 'TECHNICAL SPECIFICATION & OFFICIAL PRIVACY POLICY'}
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-stone-950 tracking-tight leading-tight font-serif">
                {isId 
                  ? 'Tata: Kedaulatan Data Pengguna, Ekosistem Tiga Tingkat (Lite, Pro, Pro Max), Integrasi Akun Google, dan Arsitektur Nol-Cloud'
                  : 'Tata: User Data Sovereignty, Three-Tier Ecosystem (Lite, Pro, Pro Max), Google Account Integration, and Zero-Cloud Architecture'}
              </h1>

              <div className="text-xs sm:text-sm font-sans text-stone-600 space-y-1 pt-2">
                <p><strong>{isId ? 'Penulis & Pengembang Mandiri:' : 'Author & Solo Engineer:'}</strong> Noto (@noto.grow)</p>
                <p><strong>{isId ? 'Tingkatan Layanan:' : 'Supported Tiers:'}</strong> Tata Lite (Free & Safe Ads) • Tata Pro • Tata Pro Max (Tactile 3D Flagship)</p>
                <p><strong>{isId ? 'Prinsip Arsitektur:' : 'Core Architectural Pillars:'}</strong> 100% Offline-First • Zero Cloud Database • User Owns Their Data</p>
                <p><strong>{isId ? 'Status Dokumen:' : 'Document Status:'}</strong> Ratified Release • Tata v5.1.0 Stable</p>
              </div>
            </header>

            {/* SECTION 1: MANIFESTO & FILOSOFI */}
            <section id="section-about" className="space-y-4 scroll-mt-6">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-950 border-b border-stone-200 pb-2">
                1. {isId ? 'Manifesto Produk: Menata Pikiran Tanpa Mengorbankan Kedaulatan' : 'Product Manifesto: Organizing Minds Without Sacrificing Sovereignty'}
              </h2>

              <p>
                {isId 
                  ? 'Di era digital saat ini, aplikasi produktivitas sebagian besar telah bergeser dari alat bantu manusia menjadi mesin pengumpul data. Pengguna sering kali diwajibkan menyerahkan data pribadi, dipaksa bergantung pada koneksi internet hanya untuk membuka catatan harian, dan isi kepala mereka disimpan di server cloud milik perusahaan yang sewaktu-waktu dapat diretas, dijual, atau dimonetisasi.'
                  : 'In today’s digital era, productivity tools have largely shifted from quiet instruments into aggressive data-harvesting engines. Users are frequently forced to surrender personal information, tethered to remote internet connections just to read daily notes, and their private thoughts are hosted on remote servers vulnerable to breaches, tracking, and undisclosed monetization.'}
              </p>

              <blockquote className="border-l-4 border-stone-900 pl-5 py-3 my-5 italic text-stone-900 bg-stone-100/70 rounded-r-xl">
                {isId
                  ? '“Tata dibangun atas komitmen mendasar: catatan, tugas, target tabungan, dan jurnal hidup Anda adalah wilayah suci pribadi Anda. Privasi bukanlah fitur tambahan berbayar, melainkan fondasi baku yang tertanam dalam setiap baris kode Tata.”'
                  : '“Tata is anchored upon an uncompromising conviction: your notes, tasks, savings, and personal reflections represent your sacred private domain. Privacy is not a monetized upsell, but the inviolable architectural foundation embedded in every line of code.”'}
              </blockquote>

              <p>
                {isId
                  ? 'Tata hadir sebagai tempat perlindungan digital (digital sanctuary) yang tenang, cepat, berbobot ringan, dan sepenuhnya berada di bawah kendali pemiliknya. Tata dapat langsung digunakan secara penuh 100% secara offline sejak detik pertama tanpa harus melakukan pendaftaran apa pun.'
                  : 'Tata serves as a serene, lightning-fast, and lightweight digital sanctuary completely under its owner’s dominion. It is fully functional offline from the very first second without demanding mandatory registration.'}
              </p>
            </section>

            {/* SECTION 2: ARTI NAMA & METODOLOGI */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-950 border-b border-stone-200 pb-2">
                2. {isId ? 'Arti Nama & Metodologi: Think • Act • Track • Advance' : 'Name Meaning & Methodology: Think • Act • Track • Advance'}
              </h2>

              <p>
                {isId
                  ? 'Kata "Tata" dalam bahasa Indonesia melambangkan tatanan yang rapi, ketertiban, dan keharmonisan hidup. Secara metodologis, Tata merupakan singkatan dari empat siklus bertumbuh yang saling menyempurnakan:'
                  : 'In Indonesian, "Tata" evokes order, harmonious arrangement, and disciplined calm. Methodologically, TATA stands for four mutually reinforcing cycles of personal mastery:'}
              </p>

              <div className="space-y-3 pl-2 sm:pl-4 text-stone-800">
                <p>
                  <strong>• THINK ({isId ? 'Berpikir' : 'Reflect & Ideate'}):</strong> {isId 
                    ? 'Ruang catatan bebas distraksi untuk menangkap kilasan ide, menyusun rencana jangka panjang, dan mengurai kerumitan pikiran tanpa gangguan pop-up atau kebisingan algoritma.'
                    : 'A distraction-free thinking canvas to capture ephemeral ideas, outline long-term blueprints, and untangle mental complexity without algorithmic interference.'}
                </p>
                <p>
                  <strong>• ACT ({isId ? 'Bertindak' : 'Execute Tasks'}):</strong> {isId 
                    ? 'Manajemen daftar tugas harian berorientasi eksekusi dengan penentuan prioritas yang tegas (Tinggi, Sedang, Rendah), tenggat waktu, dan sistem alarm pengingat mandiri offline.'
                    : 'Action-oriented task management with decisive priority tiers (High, Medium, Low), due dates, and an offline local reminder alarm system.'}
                </p>
                <p>
                  <strong>• TRACK ({isId ? 'Melacak' : 'Monitor Progress'}):</strong> {isId 
                    ? 'Pemantauan konsistensi kebiasaan (streak), evaluasi suasana hati harian (mood tracker), pencatatan arus kas keuangan, target tabungan, dan buku catatan utang-piutang terperinci.'
                    : 'Habit streak monitoring, daily emotional mood journaling, precise cash flow and expense ledgering, target savings goals, and clear debt-credit records.'}
                </p>
                <p>
                  <strong>• ADVANCE ({isId ? 'Berkembang' : 'Progress & Mastery'}):</strong> {isId 
                    ? 'Melangkah maju setiap hari menuju versi diri yang lebih tangguh dan teratur melalui Kontrak Perjalanan Disiplin diri yang terukur.'
                    : 'Evolving daily toward a calmer, more disciplined version of yourself supported by measurable Self-Discipline Journey Contracts.'}
                </p>
              </div>
            </section>

            {/* SECTION 3: EKOSISTEM TIGA TINGKAT (LITE, PRO, PRO MAX) & KEBERLANJUTAN */}
            <section id="section-tiers" className="space-y-5 scroll-mt-6">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-950 border-b border-stone-200 pb-2 flex items-center justify-between">
                <span>3. {isId ? 'Ekosistem Tiga Tingkat: Tata Lite, Tata Pro & Tata Pro Max' : 'Three-Tier Ecosystem: Tata Lite, Tata Pro & Tata Pro Max'}</span>
              </h2>

              <p>
                {isId
                  ? 'Untuk menjaga keberlangsungan pengembangan independen tanpa harus menjual data pengguna kepada pialang data (data brokers), Tata menerapkan model ekonomi yang jujur, transparan, dan berkeadilan melalui tiga tingkatan layanan:'
                  : 'To ensure sustainable independent engineering without ever commodifying user data to third-party data brokers, Tata adopts an honest, transparent, and fair economic model structured across three distinct tiers:'}
              </p>

              {/* TIER 1: LITE */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-100/90 border border-stone-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase bg-stone-300 text-stone-800">
                      Tier 1
                    </span>
                    <h3 className="font-bold text-base sm:text-lg text-stone-950">Tata Lite (Gratis Selamanya / 100% Free Forever)</h3>
                  </div>
                  <span className="text-xs font-mono font-medium text-stone-500">{isId ? 'Iklan Aman' : 'Safe Ads'}</span>
                </div>
                <p className="text-sm sm:text-[15px] text-stone-700">
                  {isId
                    ? 'Tata Lite adalah pintu gerbang terbuka bagi siapa saja yang ingin hidup lebih teratur tanpa biaya sepeser pun. Seluruh modul inti Tata (Catatan, Tugas, Keuangan, Kalender, Mood, Pemindai Dokumen, dan Game Santai) dapat dinikmati secara lengkap tanpa batasan waktu.'
                    : 'Tata Lite is the welcoming gateway for anyone seeking an organized life without paying a cent. All core modules (Notes, Tasks, Finance, Calendar, Mood, Scanner, and Offline Games) are permanently accessible with zero time restrictions.'}
                </p>
                <div className="pt-2 border-t border-stone-200 text-xs sm:text-sm text-stone-600 space-y-1">
                  <p>
                    <strong>• {isId ? 'Prinsip Iklan Aman (Privacy-Preserving Safe Ads):' : 'Privacy-Preserving Safe Ads Principle:'}</strong> {isId
                      ? 'Versi Lite didukung oleh slot iklan banner Google AdSense yang aman dan non-invasif. Berbeda dengan aplikasi komersial yang membaca isi percakapan Anda untuk menargetkan iklan secara agresif, iklan di Tata Lite berjalan di dalam sandbox peramban yang terisolasi total dari basis data lokal (IndexedDB) Anda. Skrip iklan sama sekali TIDAK BISA membaca catatan rahasia, isi dompet, atau tugas harian Anda.'
                      : 'Tata Lite is sustained by respectful, non-invasive Google AdSense banner placements. Unlike invasive applications that inspect private messages to profile users, ad scripts in Tata Lite execute within isolated browser boundaries strictly separated from your local IndexedDB storage. Ad scripts have ZERO technical access to read your personal notes, financial ledgers, or daily tasks.'}
                  </p>
                  <p>
                    <strong>• {isId ? 'Tujuan Iklan:' : 'Ad Purpose:'}</strong> {isId
                      ? 'Pendapatan iklan dari versi Lite digunakan murni untuk membiayai infrastruktur hosting, lisensi alat pengembang, dan riset fitur baru oleh solo developer Noto.'
                      : 'Ad revenues directly support lightweight hosting bandwidth, developer tooling, and continuous product research by solo developer Noto.'}
                  </p>
                </div>
              </div>

              {/* TIER 2: PRO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase bg-amber-200 text-amber-900">
                      Tier 2
                    </span>
                    <h3 className="font-bold text-base sm:text-lg text-amber-950">Tata Pro ({isId ? 'Bebas Iklan & Fleksibel' : 'Ad-Free & Enhanced'})</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-800">{isId ? 'Lisensi Mandiri' : 'Self-Sovereign License'}</span>
                </div>
                <p className="text-sm sm:text-[15px] text-stone-700">
                  {isId
                    ? 'Tata Pro dirancang bagi pengguna yang menginginkan ruang kerja yang sepenuhnya tenang, hening, dan bersih tanpa distraksi visual.'
                    : 'Tata Pro is designed for practitioners who value absolute digital tranquility, quiet focus, and an immaculate interface free of visual interruptions.'}
                </p>
                <div className="pt-2 border-t border-amber-200/80 text-xs sm:text-sm text-stone-700 space-y-1">
                  <p><strong>✓ {isId ? '100% Bebas Iklan:' : '100% Ad-Free:'}</strong> {isId ? 'Seluruh slot iklan dinonaktifkan permanen, menghemat pemakaian data internet dan memori baterai.' : 'All ad placements are completely suppressed, saving device memory, network bandwidth, and battery life.'}</p>
                  <p><strong>✓ {isId ? 'Koleksi Tema Lengkap:' : 'Complete Theme Library:'}</strong> {isId ? 'Membuka seluruh tema warna (Gelap OLED, Terang Bersih, Biru Laut, Ecy Pastel, Hangat, Cokelat Tanah, dsb.) serta kustomisasi foto latar wallpaper.' : 'Unlocks all aesthetic palettes (OLED Dark, Crisp Light, Ocean Blue, Pastel Ecy, Warm Ochre, Earth Brown) plus custom background photo wallpapers.'}</p>
                  <p><strong>✓ {isId ? 'Cadangan & Ekspor Tanpa Batas:' : 'Unlimited Backup & Export:'}</strong> {isId ? 'Kemampuan ekspor tak terbatas ke format JSON terenkripsi dan PDF beresolusi tinggi.' : 'Unrestricted encrypted JSON and high-resolution PDF exports.'}</p>
                </div>
              </div>

              {/* TIER 3: PRO MAX */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-100/90 via-orange-50 to-amber-50 border-2 border-amber-400/80 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase bg-amber-500 text-stone-950 flex items-center gap-1">
                      <Crown size={11} className="fill-current" /> Flagship
                    </span>
                    <h3 className="font-bold text-base sm:text-lg text-stone-950">Tata Pro Max ({isId ? 'Edisi Flagship 3D' : 'Flagship 3D Edition'})</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-700">{isId ? 'Mahkota Emas' : 'Gold Crown'}</span>
                </div>
                <p className="text-sm sm:text-[15px] text-stone-800">
                  {isId
                    ? 'Tata Pro Max adalah puncak keunggulan karya rekayasa Tata. Menghadirkan perpaduan estetika visual mewah, performa maksimal, dan pengalaman taktil yang imersif.'
                    : 'Tata Pro Max represents the pinnacle of Tata’s craftsmanship—uniting luxurious visual aesthetics, tactile immersion, and peak execution.'}
                </p>
                <div className="pt-2 border-t border-amber-300 text-xs sm:text-sm text-stone-700 space-y-1">
                  <p><strong>★ {isId ? 'Antarmuka Eksklusif Pro Max Tactile 3D:' : 'Exclusive Pro Max Tactile 3D UI:'}</strong> {isId ? 'Visual 3D organik yang hidup, ikon taktil interaktif, kedalaman visual mewah, dan mesin Live Wallpaper dinamis.' : 'Tactile organic 3D visuals, interactive depth icons, premium tactile responses, and dynamic Live Wallpaper engines.'}</p>
                  <p><strong>★ {isId ? 'Semua Hak Akses Tata Pro:' : 'All Tata Pro Perks Included:'}</strong> {isId ? 'Nol iklan, akses seluruh tema, dan kecepatan respons prioritas.' : 'Zero ads, all themes unlocked, and priority local rendering performance.'}</p>
                  <p><strong>★ {isId ? 'Uji Coba 6 Hari Gratis:' : '6-Day Free Pro Max Trial:'}</strong> {isId ? 'Pengguna baru dapat langsung mengaktifkan uji coba gratis Tata Pro Max selama 6 hari penuh hanya dengan menghubungkan Akun Google.' : 'New users can instantly unlock 6 full days of Tata Pro Max for free simply by connecting their Google Account.'}</p>
                </div>
              </div>

              {/* MODEL LISENSI ADIL */}
              <div className="pt-2 space-y-2">
                <h4 className="font-bold text-stone-900 text-base">
                  {isId ? 'Model Lisensi yang Transparan & Tanpa Jebakan Berlangganan' : 'Transparent Licensing: Free from Predatory Traps'}
                </h4>
                <p className="text-stone-700 text-sm sm:text-[15px]">
                  {isId
                    ? 'Banyak aplikasi mengunci kartu kredit pengguna dengan sistem perpanjangan otomatis diam-diam. Tata menolak keras praktik tersebut. Lisensi Tata Pro & Pro Max ditawarkan secara fleksibel: Bulanan (30 hari), Tahunan (365 hari hemat 50%), serta opsi Lisensi Seumur Hidup (Lifetime Sekali Bayar). Tidak ada perpanjangan diam-diam, tidak ada denda pembatalan, dan tidak ada tagihan tak terduga.'
                    : 'Commercial applications frequently trap credit cards into deceptive recurring autopay cycles. Tata categorically repudiates such deceptive practices. Tata Pro & Pro Max licenses are offered with complete user autonomy: Monthly (30 days), Yearly (365 days at 50% discount), and a Lifetime One-Time Purchase. No hidden auto-renewals, no cancellation penalties, and no unexpected charges.'}
                </p>
              </div>
            </section>

            {/* SECTION 4: INTEGRASI AKUN GOOGLE & LISENSI SADAR PRIVASI */}
            <section id="section-google" className="space-y-4 scroll-mt-6">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-950 border-b border-stone-200 pb-2">
                4. {isId ? 'Integrasi Akun Google: Verifikasi Lisensi Tanpa Mengorbankan Privasi' : 'Google Account Integration: License Verification with Zero Cloud Leak'}
              </h2>

              <p>
                {isId
                  ? 'Aplikasi Tata menyediakan opsi masuk dengan Akun Google (Google Identity Services). Sering kali pengguna bertanya: apakah dengan masuk menggunakan Akun Google, data catatan dan keuangan saya akan terkirim ke server luar? Jawabannya adalah TIDAK SAMA SEKALI. Berikut adalah jaminan arsitekturnya:'
                  : 'Tata offers a frictionless Sign-In with Google option (powered by Google Identity Services). Users naturally inquire: does signing in with a Google Account transmit my private notes and finances to remote servers? The definitive answer is ABSOLUTELY NOT. Below is the technical isolation guarantee:'}
              </p>

              <div className="space-y-3 pl-2 sm:pl-4 text-stone-800">
                <p>
                  <strong>1. {isId ? 'Opsi Masuk Bersifat Sukarela (Optional Sign-In):' : 'Voluntary Sign-In:'}</strong> {isId
                    ? 'Anda tidak pernah dipaksa untuk login agar bisa menggunakan Tata. Aplikasi dapat berjalan 100% normal dan offline tanpa pernah menyentuh tombol login Google.'
                    : 'You are never coerced to sign in. The entire application functions normally and 100% offline without ever tapping the Google button.'}
                </p>
                <p>
                  <strong>2. {isId ? 'Tujuan Tunggal Login Google:' : 'Sole Purpose of Google Sign-In:'}</strong> {isId
                    ? 'Akun Google hanya digunakan untuk 3 hal: (a) Menampilkan nama dan foto profil lokal Anda, (b) Memverifikasi status kepemilikan Lisensi Tata Pro / Pro Max atau menukarkan kode promo voucher, dan (c) Mengaktifkan uji coba gratis 6 hari Tata Pro Max.'
                    : 'Google Sign-In is utilized strictly for 3 things: (a) Displaying your local profile name and avatar, (b) Verifying your Tata Pro / Pro Max license status or redeeming promo vouchers, and (c) Activating the 6-day free Tata Pro Max trial.'}
                </p>
                <p>
                  <strong>3. {isId ? 'Jaminan Nol Kebocoran Data (Zero Data Egress):' : 'Zero Data Egress Guarantee:'}</strong> {isId
                    ? 'Proses autentikasi hanya membaca token identitas dasar (ID token OAuth) melalui Google Identity Services di peramban. Token ini tidak memiliki izin (scopes) untuk mengakses Google Drive, email pribadi, atau kontak Anda. Yang terpenting: basis data lokal Tata (seluruh catatan, tugas, transaksi keuangan, foto dokumen, dan jurnal suasana hati) TETAP TERSIMPAN SECARA LOKAL di perangkat Anda dan tidak pernah dikirim ke Google atau server cloud mana pun.'
                    : 'The authentication process only validates the basic identity credential (OAuth ID token) via client-side Google Identity Services. It requests zero scopes to your personal Google Drive, emails, or contacts. Crucially, your local Tata database (notes, tasks, transactions, scanned docs, and mood logs) REMAINS 100% STORED LOCALLY on your physical device and is never transmitted to Google or any remote cloud.'}
                </p>
                <p>
                  <strong>4. {isId ? 'Pemuatan Skrip Dinamis Sesuai Kebutuhan (On-Demand Loading):' : 'On-Demand Dynamic Script Loading:'}</strong> {isId
                    ? 'Skrip Google Identity Services (https://accounts.google.com/gsi/client) TIDAK PERNAH dimuat di awal atau di latar belakang saat Anda membuka website Tata. Skrip ini baru diunduh secara dinamis ke peramban HANYA ketika Anda secara sadar menekan tombol "Masuk dengan Google" atau membuka jendela login akun. Dengan demikian, jika Anda tidak login, peramban Anda 100% bersih dan sama sekali tidak pernah menghubungi server Google.'
                    : 'The Google Identity Services script (https://accounts.google.com/gsi/client) is NEVER preloaded in the background upon launching the Tata website. It is fetched dynamically into the browser ONLY when you deliberately click the "Sign In with Google" button or open the login dialog. Consequently, without logging in, your browser remains 100% clean and never contacts Google servers.'}
                </p>
              </div>
            </section>

            {/* SECTION 5: ARSITEKTUR PRIVASI NOL-CLOUD & ISOLASI SANDBOX */}
            <section id="section-privacy" className="space-y-5 scroll-mt-6">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-950 border-b border-stone-200 pb-2">
                5. {isId ? 'Laporan Arsitektur Privasi 100% Nol-Cloud (Zero Cloud Architecture)' : 'Privacy Architecture Report: 100% Zero-Cloud'}
              </h2>

              <p>
                {isId
                  ? 'Prinsip kedaulatan data di Tata adalah spesifikasi teknis baku yang tidak dapat diganggu gugat. Berikut adalah rincian teknis isolasi data Tata:'
                  : 'Data sovereignty in Tata is an immutable technical specification. Below is the technical breakdown of Tata’s data isolation architecture:'}
              </p>

              <div className="space-y-4 pt-1">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    A. {isId ? 'Ketiadaan Server Basis Data Pusat (Zero Cloud Database)' : 'Absence of Centralized Database Server'}
                  </h3>
                  <p className="mt-1">
                    {isId
                      ? 'Tata tidak memiliki server database terpusat untuk menampung riwayat hidup pengguna. Seluruh data dialirkan langsung ke dalam penyimpanan fisik perangkat Anda sendiri melalui sandbox browser terisolasi (IndexedDB dan Local Storage).'
                      : 'Tata maintains no centralized database server to warehouse personal records. All data streams directly into your physical device storage through isolated browser sandboxes (IndexedDB and Local Storage).'}
                  </p>
                  <p className="mt-2 text-stone-700">
                    {isId
                      ? 'Bahkan jika koneksi internet di seluruh dunia padam, Tata di perangkat Anda tetap berfungsi normal 100%. Data Anda tidak pernah melintasi jaringan publik, sehingga secara matematis mustahil terjadi kebocoran massal dari server pihak ketiga.'
                      : 'Even if global internet cables were severed, Tata on your device would function 100% uninterrupted. Your data never travels across public networks, making centralized cloud breaches mathematically impossible.'}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    B. {isId ? 'Isolasi Sandbox dari Skrip Iklan Eksternal' : 'Strict Sandbox Ad Isolation'}
                  </h3>
                  <p className="mt-1">
                    {isId
                      ? 'Sistem penyimpanan IndexedDB dilindungi oleh kebijakan keamanan Same-Origin Policy (SOP) peramban modern. Skrip banner iklan yang berjalan di versi Lite tidak memiliki hak akses atau izin baca terhadap tabel basis data catatan, pin, atau keuangan pengguna. Data Anda tetap kedap suara di dalam perangkat.'
                      : 'IndexedDB storage is fortified by the modern browser Same-Origin Policy (SOP). External ad banner scripts operating in the Lite tier possess zero execution permissions to query or read local note tables, PIN vaults, or financial ledgers. Your records remain hermetically sealed.'}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    C. {isId ? 'Kedaulatan Mutlak Pengguna (User Owns Their Data)' : 'Absolute User Sovereignty'}
                  </h3>
                  <p className="mt-1">
                    {isId
                      ? 'Pengguna adalah pemilik tunggal dari setiap bita data yang mereka buat. Anda dapat mencadangkan seluruh data kapan saja ke dalam berkas JSON terenkripsi, memindahkannya antar perangkat, atau menghapus seluruh catatan hingga 0 byte secara mandiri tanpa jejak sisa di server mana pun.'
                      : 'The user is the sole proprietor of every single byte of created data. You may export full backups into encrypted JSON files at any time, transfer them across devices, or purge all local storage down to 0 bytes with zero lingering traces.'}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-stone-900">
                    D. {isId ? 'Statistik Pengunjung Anonim (Vercel Analytics) & Kendali Penuh' : 'Anonymous Visitor Statistics (Vercel Analytics) & Full User Control'}
                  </h3>
                  <p className="mt-1">
                    {isId
                      ? 'Tata menggunakan Vercel Analytics yang aktif secara default semata-mata untuk memantau jumlah orang yang membuka website Tata secara agregat. Metrik ini murni menghitung lalu lintas kunjungan web secara anonim tanpa profil pengguna, tanpa pelacak lintas situs, dan sama sekali TIDAK MEMILIKI akses ke catatan, tugas, keuangan, mood, atau data pribadi Anda yang tetap 100% tersimpan lokal di perangkat. Pengguna memiliki kendali penuh untuk mematikan statistik ini kapan saja melalui Pengaturan -> Statistik anonim penggunaan aplikasi.'
                      : 'Tata utilizes Vercel Analytics enabled by default strictly to monitor the aggregate volume of visitors accessing the Tata website. These metrics purely tally web traffic anonymously without user profiling or cross-site tracking, and possess ZERO technical access to notes, tasks, finances, moods, or private data, which remains 100% locally on your device. Users retain full sovereignty to turn off these statistics at any time via Settings -> Anonymous app usage statistics.'}
                  </p>
                </div>
              </div>
            </section>

            {/* SECTION 6: BATASAN KETAT TATA AI */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-950 border-b border-stone-200 pb-2">
                6. {isId ? 'Batasan Ketat Tata AI (Strict AI Governance)' : 'Strict AI Governance: Ironclad Boundaries'}
              </h2>

              <p>
                {isId
                  ? 'Fitur kecerdasan buatan (Tata AI) di dalam aplikasi ini berstatus sebagai asisten pelengkap opsional dan BUKAN pusat operasional aplikasi. Tata wajib selalu dapat digunakan secara penuh tanpa koneksi internet atau tanpa menyentuh AI. Batasan ketat diberlakukan untuk melindungi privasi:'
                  : 'Tata AI functions strictly as an optional assistive companion and NEVER as the core hub. Tata remains fully functional offline without AI. Ironclad boundaries are strictly enforced:'}
              </p>

              <div className="space-y-3 pl-2 sm:pl-4 text-stone-800">
                <p>
                  <strong>1. {isId ? 'Larangan Membaca Otomatis:' : 'Absolute Ban on Background Scanning:'}</strong> {isId
                    ? 'Tata AI sama sekali TIDAK MEMILIKI akses latar belakang untuk membaca database lokal, seluruh Catatan, Tugas, Keuangan, Kalender, maupun berkas cadangan secara otomatis.'
                    : 'Tata AI has ZERO automatic background access to query your local database, Notes, Tasks, Finance, Calendar, or Backup archives.'}
                </p>
                <p>
                  <strong>2. {isId ? 'Pemrosesan Stateless Atas Izin Sadar Pengguna:' : 'Stateless Processing Under Conscious Consent:'}</strong> {isId
                    ? 'AI hanya memproses teks yang Anda ketikkan atau setujui secara eksplisit saat Anda menekan tombol kirim. Begitu balasan selesai ditampilkan, sesi pemrosesan langsung terputus seketika tanpa ada rekam jejak yang disimpan.'
                    : 'The AI exclusively processes text explicitly authored or consented to when you tap submit. Once rendered, the processing session immediately terminates without lingering logs.'}
                </p>
                <p>
                  <strong>3. {isId ? 'Dukungan Mandiri BYOK (Bring Your Own Key):' : 'Self-Sovereign BYOK (Bring Your Own Key):'}</strong> {isId
                    ? 'Pengguna memiliki opsi menggunakan Google Gemini API Key milik sendiri. Dengan kunci pribadi, panggilan API dikirim langsung dari peramban Anda ke konsol Google Cloud Anda sendiri tanpa melalui server perantara Tata.'
                    : 'Users can supply their personal Google Gemini API Key. Requests route directly from your device browser to your personal Google Cloud console without passing through any Tata proxy server.'}
                </p>
              </div>
            </section>

            {/* SECTION 7: PROTOKOL KRIPTOGRAFI */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-950 border-b border-stone-200 pb-2">
                7. {isId ? 'Protokol Kriptografi & Proteksi Fisik Perangkat' : 'Cryptographic Protocols & Physical Device Protections'}
              </h2>

              <p>
                {isId
                  ? 'Selain mengisolasi data dari server cloud, Tata membekali perangkat Anda dengan mekanisme perlindungan fisik berlapis:'
                  : 'Beyond zero-cloud data isolation, Tata fortifies physical hardware against unauthorized local access:'}
              </p>

              <div className="space-y-3 pl-2 sm:pl-4 text-stone-800">
                <p>
                  <strong>• {isId ? 'Hashing PIN Satu Arah (SHA-256 + Salt):' : 'One-Way PIN Hashing (SHA-256 + Salt):'}</strong> {isId
                    ? 'Kode PIN keamanan Anda tidak pernah disimpan dalam teks biasa. PIN di-hash menggunakan algoritma SHA-256 dengan salt acak unik sehingga mustahil direkonstruksi ulang.'
                    : 'Security PIN codes are never stored in plaintext. They are hashed using SHA-256 with unique random salt, rendering reverse-engineering impossible.'}
                </p>
                <p>
                  <strong>• {isId ? 'Keypad Acak Anti-Intip (Scrambled Keypad):' : 'Anti-Peeping Scrambled Keypad:'}</strong> {isId
                    ? 'Susunan tombol angka (0–9) pada layar PIN dapat diacak posisinya secara dinamis untuk mencegah intipan orang di sebelah Anda (shoulder surfing) serta jejak sidik jari di kaca layar.'
                    : 'The 0–9 keypad layout dynamically scrambles its numerical positions to prevent shoulder-surfing and fingerprint smudge analysis.'}
                </p>
                <p>
                  <strong>• {isId ? 'Enkripsi Cadangan AES-256-GCM:' : 'Military-Grade Backup Encryption (AES-256-GCM):'}</strong> {isId
                    ? 'Berkas cadangan (.JSON) diproteksi menggunakan sandi yang diderivasi melalui PBKDF2 dengan 100.000 iterasi dan dienkripsi dengan standar simetris AES-GCM 256-bit.'
                    : 'Backup export archives (.JSON) are secured with PBKDF2 key derivation (100,000 rounds) and authenticated AES-GCM 256-bit encryption.'}
                </p>
                <p>
                  <strong>• {isId ? 'Nol Kunci Master Pengembang (No Backdoors):' : 'Zero Developer Backdoors:'}</strong> {isId
                    ? 'Tata tidak memiliki kunci master. Jika Anda mengatur pertanyaan pemulihan, jawabannya di-hash secara lokal di perangkat Anda tanpa akses pihak ketiga.'
                    : 'Tata maintains no master unlock key. Security recovery credentials are authenticated exclusively on your local hardware.'}
                </p>
              </div>
            </section>

            {/* SECTION 8: EKOSISTEM MODUL LENGKAP TATA v5.1.0 */}
            <section className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-950 border-b border-stone-200 pb-2">
                8. {isId ? 'Ekosistem Lengkap Modul Produktivitas Tata v5.1.0' : 'Complete Ecosystem of Tata v5.1.0 Productivity Modules'}
              </h2>

              <p>
                {isId
                  ? 'Seluruh modul produktivitas Tata dirancang untuk bekerja secara harmonis, cepat, dan ringan:'
                  : 'Tata’s comprehensive productivity modules integrate harmoniously, rapidly, and lightly:'}
              </p>

              <div className="space-y-3 pl-2 sm:pl-4 text-stone-800">
                <p>
                  <strong>1. Smart & Private Notes:</strong> {isId 
                    ? 'Catatan bebas batas dengan dukungan tag warna, sematan (pin), arsip, dan pencarian cepat offline.'
                    : 'Full-featured notes with color tagging, pinning, archiving, and instant offline search.'}
                </p>
                <p>
                  <strong>2. Tasks & Independent Alarms:</strong> {isId 
                    ? 'Manajemen tugas dengan skala prioritas (Tinggi, Sedang, Rendah), tenggat waktu, dan sistem alarm mandiri.'
                    : 'Task lists with clear priorities (High, Medium, Low), deadlines, and independent reminder alarms.'}
                </p>
                <p>
                  <strong>3. Finance, Savings & Debt Ledgers:</strong> {isId 
                    ? 'Pencatatan arus kas pemasukan dan pengeluaran harian, target tabungan impian, grafik evaluasi keuangan, serta buku catatan utang-piutang terperinci.'
                    : 'Daily cashflow income and expense tracking, savings goals, financial visual analytics, and a comprehensive debt-credit ledger.'}
                </p>
                <p>
                  <strong>4. Integrated Calendar & Mood Tracker:</strong> {isId 
                    ? 'Jadwal agenda bulanan bersatu padu dengan jurnal suasana hati harian untuk memantau keseimbangan emosional.'
                    : 'Monthly calendar intertwined with daily emotional mood journaling to nurture personal balance.'}
                </p>
                <p>
                  <strong>5. Discipline Journey & Life Contracts:</strong> {isId 
                    ? 'Kontrak komitmen jangka panjang lengkap dengan penentuan Hadiah & Konsekuensi untuk membangun disiplin diri nyata.'
                    : 'Long-term self-discipline contracts featuring Rewards & Consequences to cultivate steadfast self-mastery.'}
                </p>
                <p>
                  <strong>6. Document Scanner & PDF Engine:</strong> {isId 
                    ? 'Pemindaian dokumen fisik dari kamera peramban, koreksi perspektif 4 titik dengan preset presisi (KTP, A4, Full Frame), filter visual, dan ekspor langsung ke PDF lokal.'
                    : 'Physical document capture via browser camera, 4-corner perspective correction (ID Card, A4, Full Frame), visual enhancement filters, and direct local PDF generation.'}
                </p>
                <p>
                  <strong>7. Offline Mind-Break Mini Games:</strong> {isId 
                    ? 'Koleksi permainan minimalis (2048, Snake, Tic Tac Toe, Memory Match) untuk menyegarkan pikiran di sela jam kerja padat.'
                    : 'A clean collection of micro-games (2048, Snake, Tic Tac Toe, Memory Match) to reset mental focus during intense work sprints.'}
                </p>
              </div>
            </section>

            {/* SECTION 9: TENTANG PENGEMBANG & JANJI INTEGRITAS */}
            <section className="space-y-4 pt-4 border-t border-stone-300">
              <h2 className="text-xl sm:text-2xl font-bold text-stone-950 pb-2">
                9. {isId ? 'Tentang Pengembang: Noto (@noto.grow) & Ikrar Integritas' : 'About the Developer: Noto (@noto.grow) & Integrity Pledge'}
              </h2>

              <p>
                {isId
                  ? 'Tata dikonsep, dirancang, dan dibangun secara mandiri oleh Noto (dikenal di media sosial Instagram sebagai @noto.grow). Sebagai pengembang tunggal (solo developer), komitmen Noto adalah menghadirkan aplikasi yang jujur, menghormati martabat manusia, dan berkelanjutan.'
                  : 'Tata is conceived, designed, and coded independently by Noto (on Instagram as @noto.grow). As a solo developer, Noto’s enduring commitment is to deliver software that is honest, respectful of human dignity, and transparently sustainable.'}
              </p>

              <blockquote className="border-l-4 border-emerald-600 pl-5 py-4 my-4 italic text-stone-900 bg-emerald-50/70 rounded-r-xl font-serif">
                {isId
                  ? '“Tata akan selamanya mematuhi prinsip kedaulatan data pengguna. Versi Lite akan selalu gratis untuk semua orang dengan iklan yang aman tanpa pelacak data pribadi; versi Pro dan Pro Max hadir bagi mereka yang menginginkan kesempurnaan estetika tanpa distraksi. Data Anda tidak akan pernah dijual atau dikorbankan demi keuntungan sepihak.”'
                  : '“Tata will perpetually honor user data sovereignty. The Lite version will remain forever free with safe, privacy-respecting ads; while Pro and Pro Max exist for those who desire aesthetic mastery without distractions. Your private data will never be traded, scanned, or compromised for commercial gain.”'}
              </blockquote>

              <div className="pt-6 font-sans text-xs sm:text-sm text-stone-600 space-y-1">
                <p className="font-bold text-stone-900 text-base font-serif">Noto</p>
                <p>{isId ? 'Pencipta & Pengembang Tunggal Tata' : 'Creator & Solo Engineer of Tata'}</p>
                <p>Instagram: @noto.grow • {isId ? 'Dirilis dengan Rasa Hormat untuk Seluruh Pengguna Tata' : 'Crafted with Reverence for All Tata Users'}</p>
              </div>
            </section>

            {/* Back to top button */}
            <div className="pt-6 border-t border-stone-200 flex justify-center">
              <button
                type="button"
                onClick={scrollToTop}
                className="flex items-center gap-1.5 text-xs font-sans text-stone-500 hover:text-stone-900 transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-stone-200/50"
              >
                <ArrowUp size={14} />
                {isId ? 'Kembali ke Atas' : 'Back to Top'}
              </button>
            </div>

          </div>

          {/* Footer Close Bar */}
          <div className="px-6 sm:px-12 py-3.5 border-t border-stone-200/90 bg-[#FAF8F4] flex items-center justify-between shrink-0 select-none">
            <span className="text-[11px] sm:text-xs text-stone-500 font-sans">
              {isId ? 'Membaca Dokumen Resmi • Tata v5.1.0' : 'Reading Official Document • Tata v5.1.0'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-50 font-bold text-xs font-sans transition-all cursor-pointer shadow-xs active:scale-95"
            >
              {isId ? 'Tutup Dokumen' : 'Close Document'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


import React from 'react';
import { 
  FileText, CheckSquare, Wallet, Calendar, Sparkles, ShieldCheck, 
  Database, User, Heart, CreditCard, Tag as TagIcon, Camera, Target, 
  TrendingUp, TrendingDown, ShieldAlert, Bot, Palette, Shuffle, HelpCircle, 
  Zap, Volume2, Bell, Globe, Info, Gamepad2, Compass, Instagram, Mail, Smartphone,
  Lock, Share2
} from 'lucide-react';
import { Note, Task, Transaction, DebtItem, MoodEntry } from '../types';

export interface SearchResultItem {
  id: string;
  providerId: string;
  categoryLabel: { id: string; en: string };
  title: string;
  description?: string;
  dateOrInfo?: string;
  icon?: any;
  badge?: string;
  badgeColor?: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'slate';
  rawItem?: any;
  score?: number;
  action: (nav?: (screen: string, extra?: any) => void, callbacks?: { openNote?: (n: Note) => void; createNote?: () => void }) => void;
}

export interface SearchProvider {
  id: string;
  name: string;
  categoryLabel: { id: string; en: string };
  search: (query: string, store: any, lang: string) => SearchResultItem[];
}

// Global registry for search providers
const customSearchProviders: SearchProvider[] = [];

export function registerSearchProvider(provider: SearchProvider) {
  if (!customSearchProviders.some(p => p.id === provider.id)) {
    customSearchProviders.push(provider);
  }
}

export function unregisterSearchProvider(providerId: string) {
  const idx = customSearchProviders.findIndex(p => p.id === providerId);
  if (idx !== -1) customSearchProviders.splice(idx, 1);
}

// Standard APP_FEATURES definitions
export const APP_FEATURES = [
  {
    id: 'create-new-note',
    title: { id: 'Buat Catatan Baru', en: 'Create New Note' },
    description: { id: 'Buka editor untuk menulis catatan teks, pengingat, atau dokumen baru.', en: 'Open editor to write a new note, reminder, or document.' },
    category: { id: 'Catatan', en: 'Note' },
    keywords: ['buat catatan', 'catatan baru', 'tambah catatan', 'new note', 'write note', 'tulis catatan', 'nulis', 'catat', 'bikin catatan', 'editor', 'tambah'],
    icon: FileText,
    action: (_nav: any, callbacks: any) => callbacks?.createNote?.()
  },
  {
    id: 'doc-scanner',
    title: { id: 'Pemindai Dokumen & Ekspor PDF', en: 'Document Scanner & PDF Export' },
    description: { id: 'Pindai dokumen cetak menggunakan kamera/gambar dan simpan sebagai catatan PDF.', en: 'Scan physical documents via camera/image into PDF note.' },
    category: { id: 'Alat', en: 'Tools' },
    keywords: ['scanner', 'pindai', 'scan', 'pdf', 'dokumen', 'document', 'ekspor pdf', 'kamera', 'foto dokumen', 'scan pdf', 'ambil foto'],
    icon: Camera,
    action: (_nav: any, callbacks: any) => callbacks?.createNote?.()
  },
  {
    id: 'task-manager',
    title: { id: 'Daftar Tugas & Checklist Harian', en: 'Task List & Daily Checklist' },
    description: { id: 'Kelola daftar tugas harian, prioritas, pengingat, dan mode habit disiplin.', en: 'Manage daily task list, priorities, reminders, and discipline habit mode.' },
    category: { id: 'Tugas', en: 'Tasks' },
    keywords: ['tugas', 'task', 'tasks', 'todo', 'to do', 'to-do', 'target', 'disiplin', 'discipline', 'habit', 'kebiasaan', 'ceklis', 'checklist', 'kegiatan', 'pr', 'pekerjaan', 'rencana'],
    icon: CheckSquare,
    action: (nav: any) => nav?.('tasks')
  },
  {
    id: 'task-discipline',
    title: { id: 'Target Habit Disiplin (Streak)', en: 'Discipline Habit Target' },
    description: { id: 'Buat komitmen kebiasaan positif harian dengan sistem streak disiplin.', en: 'Build positive daily habits with discipline streak tracking.' },
    category: { id: 'Tugas', en: 'Tasks' },
    keywords: ['habit', 'disiplin', 'discipline', 'kebiasaan', 'streak', 'target harian', 'rutinitas', 'komitmen'],
    icon: Target,
    action: (nav: any) => nav?.('tasks')
  },
  {
    id: 'finance-tracker',
    title: { id: 'Kelola Keuangan & Saldo Dompet', en: 'Finance & Wallet Balance' },
    description: { id: 'Pencatatan pemasukan, pengeluaran, saldo dompet, utang, dan target tabungan.', en: 'Track income, expenses, balance, debt history, and savings target.' },
    category: { id: 'Keuangan', en: 'Finance' },
    keywords: ['keuangan', 'finance', 'transaksi', 'transaction', 'pemasukan', 'income', 'pengeluaran', 'expense', 'dompet', 'wallet', 'uang', 'money', 'utang', 'debt', 'tabungan', 'savings', 'budget', 'finansial', 'bayar', 'kas', 'saldo', 'rupiah', 'catat uang', 'duit'],
    icon: Wallet,
    action: (nav: any) => nav?.('finance')
  },
  {
    id: 'finance-income',
    title: { id: 'Catat Pemasukan Keuangan', en: 'Record Income' },
    description: { id: 'Tambah transaksi pemasukan gaji, bonus, dividen, atau hasil usaha baru.', en: 'Add income transaction for salary, bonus, or business earnings.' },
    category: { id: 'Keuangan', en: 'Finance' },
    keywords: ['pemasukan', 'gaji', 'bonus', 'pendapatan', 'income', 'tambah uang', 'dapat uang', 'masuk', 'terima uang'],
    icon: TrendingUp,
    action: (nav: any) => nav?.('finance')
  },
  {
    id: 'finance-expense',
    title: { id: 'Catat Pengeluaran Keuangan', en: 'Record Expense' },
    description: { id: 'Catat biaya belanja, makan, tagihan, atau pengeluaran harian.', en: 'Record shopping, meals, bills, or daily expenses.' },
    category: { id: 'Keuangan', en: 'Finance' },
    keywords: ['pengeluaran', 'belanja', 'makan', 'tagihan', 'expense', 'biaya', 'bayar', 'keluar uang', 'pakai uang', 'beli', 'jajan'],
    icon: TrendingDown,
    action: (nav: any) => nav?.('finance')
  },
  {
    id: 'finance-savings',
    title: { id: 'Target Tabungan & Celengan Impian', en: 'Savings Target & Goals' },
    description: { id: 'Buat dan pantau kemajuan target tabungan barang atau impian Anda.', en: 'Create and track progress towards your savings goals.' },
    category: { id: 'Keuangan', en: 'Finance' },
    keywords: ['tabungan', 'target tabungan', 'savings', 'nabung', 'impian', 'celengan', 'goal', 'beli barang'],
    icon: CreditCard,
    action: (nav: any) => nav?.('finance')
  },
  {
    id: 'finance-debt',
    title: { id: 'Riwayat Utang & Piutang', en: 'Debt Tracker' },
    description: { id: 'Kelola daftar pinjaman, utang ke orang lain, atau piutang yang belum dibayar.', en: 'Manage loans, personal debts, or pending receivables.' },
    category: { id: 'Keuangan', en: 'Finance' },
    keywords: ['utang', 'piutang', 'pinjaman', 'debt', 'bon', 'pinjam', 'nagih', 'bayar utang', 'hutang'],
    icon: ShieldAlert,
    action: (nav: any) => nav?.('finance')
  },
  {
    id: 'calendar-schedule',
    title: { id: 'Kalender & Jadwal Agenda', en: 'Calendar & Schedule' },
    description: { id: 'Kalender bulanan interaktif, riwayat catatan per tanggal, dan jadwal pengingat.', en: 'Interactive monthly calendar, note history, and schedule reminders.' },
    category: { id: 'Agenda', en: 'Calendar' },
    keywords: ['kalender', 'calendar', 'agenda', 'jadwal', 'schedule', 'tanggal', 'date', 'bulan', 'month', 'pengingat', 'reminder', 'hari', 'kegiatan', 'event'],
    icon: Calendar,
    action: (nav: any) => nav?.('calendar')
  },
  {
    id: 'ai-companion-chat',
    title: { id: 'Asisten Chat Tata AI', en: 'Tata AI Assistant Chat' },
    description: { id: 'Tanya jawab, bertukar ide, dan analisis produktivitas stateless dengan Tata AI.', en: 'Ask questions and analyze productivity statelessly with Tata AI.' },
    category: { id: 'Tata AI', en: 'Tata AI' },
    keywords: ['ai', 'tata ai', 'chat ai', 'asisten', 'assistant', 'tanya ai', 'bot', 'companion', 'analisis ai', 'gemini chat', 'ai chat', 'tanya jawab', 'bantuan ai', 'jawaban', 'otamatis'],
    icon: Bot,
    action: (nav: any) => nav?.('ai-companion')
  },
  {
    id: 'tata-ai-settings',
    title: { id: 'Pengaturan Tata AI (BYOK & API Key)', en: 'Tata AI Settings (BYOK & API Key)' },
    description: { id: 'Konfigurasi Google Gemini API Key / BYOK milik Anda untuk mengaktifkan fitur AI.', en: 'Configure your Google Gemini API Key / BYOK to enable Tata AI features.' },
    category: { id: 'Tata AI', en: 'Tata AI' },
    keywords: ['byok', 'api key', 'gemini', 'gemini key', 'byok key', 'pengaturan ai', 'ai setting', 'key ai', 'google gemini', 'tata ai', 'asisten ai', 'konfigurasi ai', 'minta key', 'gratis api', 'grok', 'groq', 'openai', 'claude', 'openrouter', 'ai key', 'pasang api key', 'kunci api'],
    icon: Bot,
    action: (nav: any) => nav?.('settings', 'ai')
  },
  {
    id: 'note-pin-lock',
    title: { id: 'Kunci Catatan Rahasia (PIN Catatan)', en: 'Secret Note Lock (Note PIN)' },
    description: { id: 'Atur atau ubah PIN khusus untuk mengunci catatan rahasia terpisah.', en: 'Set or change a separate PIN to lock confidential secret notes.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['pin catatan', 'kunci catatan', 'catatan rahasia', 'note pin', 'ganti pin catatan', 'rahasia', 'sandi catatan', 'kunci catatan terpisah', 'note lock', 'buka catatan terkunci'],
    icon: Lock,
    action: (nav: any) => nav?.('settings', 'note-pin')
  },
  {
    id: 'security-screen-lock',
    title: { id: 'Kunci Layar Aplikasi (PIN Keamanan)', en: 'App Screen Lock (Security PIN)' },
    description: { id: 'Atur PIN kunci layar aplikasi, aktifkan acak tombol (Scrambled PIN), dan pertanyaan pemulihan.', en: 'Set app screen lock PIN, enable Scrambled PIN keypad, and recovery question.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['pin', 'sandi', 'password', 'kunci', 'lock', 'keamanan', 'security', 'privasi', 'privacy', 'reset pin', 'ganti pin', 'pola', 'sandi aplikasi', 'kunci layar', 'screen lock', 'keamanan aplikasi', 'kunci pin', 'atur pin'],
    icon: ShieldCheck,
    action: (nav: any) => nav?.('settings', 'screen-lock')
  },
  {
    id: 'scrambled-keypad',
    title: { id: 'Acak Tombol Keypad PIN (Scrambled PIN)', en: 'Scrambled PIN Keypad' },
    description: { id: 'Acak urutan tombol PIN saat memasukkan sandi agar aman dari intipan.', en: 'Scramble PIN button order to protect against shoulder surfing.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['acak', 'scramble', 'scrambled', 'keypad', 'keyboard', 'tombol pin', 'intip', 'acak pin', 'keamanan pin', 'shuffle'],
    icon: Shuffle,
    action: (nav: any) => nav?.('settings', 'screen-lock')
  },
  {
    id: 'pin-recovery',
    title: { id: 'Pertanyaan Pemulihan PIN', en: 'PIN Recovery Question' },
    description: { id: 'Atur pertanyaan pemulihan untuk mereset PIN jika Anda lupa sandi.', en: 'Set recovery question to reset PIN if you forget your password.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['lupa pin', 'recovery', 'pemulihan', 'pertanyaan', 'reset pin', 'bantuan pin', 'lupa sandi', 'pemulihan sandi'],
    icon: HelpCircle,
    action: (nav: any) => nav?.('settings', 'screen-lock')
  },
  {
    id: 'backup-db',
    title: { id: 'Cadangan & Database (Backup JSON)', en: 'Backup & Database (JSON)' },
    description: { id: 'Cadangkan seluruh data Tata ke file JSON lokal, ekspor, impor/pulihkan, atau reset database.', en: 'Backup all Tata data locally, export JSON, restore database, or reset data.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['backup', 'cadangan', 'ekspor', 'export', 'impor', 'import', 'restore', 'pulihkan', 'database', 'reset data', 'simpan data', 'file json', 'unduh data', 'save', 'ekspor data', 'hard reset', 'hapus semua data', 'jadwal backup'],
    icon: Database,
    action: (nav: any) => nav?.('settings', 'backup')
  },
  {
    id: 'notifications-settings',
    title: { id: 'Pengaturan & Uji Notifikasi', en: 'Notifications & Alarm Test' },
    description: { id: 'Uji alarm, dengarkan bunyi pengingat, dan atur izin pemberitahuan di browser/perangkat.', en: 'Test reminder alarm chime, test banner alerts, and manage notification permissions.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['notifikasi', 'notif', 'alarm', 'pengingat', 'reminder', 'izin notifikasi', 'uji notifikasi', 'bunyi alarm', 'tes notifikasi', 'daily reminder', 'pengingat harian', 'jam notif', 'suara alarm', 'nada dering'],
    icon: Bell,
    action: (nav: any) => nav?.('settings', 'notifications')
  },
  {
    id: 'wallpaper-custom',
    title: { id: 'Wallpaper & Latar Belakang Foto', en: 'Wallpaper & Custom Background' },
    description: { id: 'Ubah gambar wallpaper latar belakang dan potong foto sesuai selera.', en: 'Change background wallpaper and crop custom photos.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['wallpaper', 'wall paper', 'latar', 'latar belakang', 'background', 'gambar', 'foto', 'ganti foto', 'crop foto', 'cropper', 'custom wallpaper', 'pilih wallpaper', 'gambar latar', 'potong foto'],
    icon: Palette,
    action: (nav: any) => nav?.('settings', 'appearance')
  },
  {
    id: 'theme-color-mode',
    title: { id: 'Tema Tampilan', en: 'Display Theme' },
    description: { id: 'Pilih tema tampilan (Gelap, Terang, Pro Max, Biru, Ecy, Hangat, Cokelat, Wallpaper).', en: 'Select display theme (Dark, Light, Pro Max, Blue, Ecy, Warm, Brown, Wallpaper).' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['tema', 'theme', 'warna', 'color', 'gelap', 'terang', 'pro max', 'organik', 'biru', 'ecy', 'pink', 'hangat', 'cokelat', 'wallpaper', 'tampilan', 'appearance'],
    icon: Palette,
    action: (nav: any) => nav?.('settings', 'appearance')
  },
  {
    id: 'user-profile',
    title: { id: 'Profil & Avatar Pengguna', en: 'User Profile & Avatar' },
    description: { id: 'Ubah nama panggilan dan pilih ikon avatar profil Tata.', en: 'Change display nickname and profile avatar.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['profil', 'profile', 'avatar', 'nama', 'user', 'foto profil', 'foto', 'pengguna', 'ganti nama', 'biodata', 'nama saya', 'panggilan', 'nickname'],
    icon: User,
    action: (nav: any) => nav?.('settings', 'profile')
  },
  {
    id: 'sound-effects',
    title: { id: 'Pengaturan Suara & Audio Tombol', en: 'Sound & Audio Settings' },
    description: { id: 'Aktifkan atau nonaktifkan efek suara audio tombol klik dan navigasi.', en: 'Enable or disable button click sound effects and navigation audio.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['suara', 'sound', 'audio', 'efek suara', 'musik', 'sound effect', 'bgm', 'bunyi', 'nada', 'suara tombol', 'mute', 'hening'],
    icon: Volume2,
    action: (nav: any) => nav?.('settings', 'appearance')
  },
  {
    id: 'language-setting',
    title: { id: 'Bahasa Aplikasi (Indonesian / English)', en: 'App Language' },
    description: { id: 'Ganti bahasa tampilan Tata antara Bahasa Indonesia dan Bahasa Inggris.', en: 'Switch app display language between Indonesian and English.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['bahasa', 'language', 'indonesia', 'english', 'inggris', 'terjemahan', 'ganti bahasa', 'lang'],
    icon: Globe,
    action: (nav: any) => nav?.('settings', 'appearance')
  },
  {
    id: 'app-mode-version',
    title: { id: 'Mode Aplikasi (Lite, Pro, Pro Max)', en: 'App Mode (Lite, Pro, Pro Max)' },
    description: { id: 'Pilih mode tampilan: Lite, Pro, atau Pro Max.', en: 'Choose interface mode: Lite, Pro, or Pro Max.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['mode', 'pro', 'pro max', 'lite', 'organic', 'performa', 'ringan', 'cepat', 'hemat', 'speed', 'fast mode'],
    icon: Zap,
    action: (nav: any) => nav?.('settings', 'about')
  },
  {
    id: 'about-tata',
    title: { id: 'Tentang Tata & Audit Privasi', en: 'About Tata & Privacy Audit' },
    description: { id: 'Informasi versi aplikasi, audit privasi Offline-First, dan lisensi.', en: 'App version, Offline-First privacy audit, and licensing.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['tentang', 'about', 'versi', 'version', 'lisensi', 'license', 'audit', 'kebijakan', 'privacy policy', 'bantuan', 'offline first', 'hak cipta', 'pengembang'],
    icon: Info,
    action: (nav: any) => nav?.('settings', 'about')
  },
  {
    id: 'games-hub',
    title: { id: 'Pusat Game Santai (Games Hub)', en: 'Casual Games Hub' },
    description: { id: 'Koleksi 6 mini-game ringan (2048, Tetris, Tic Tac Toe, Memory, Space Invaders, Sliding Puzzle).', en: 'Collection of 6 lightweight mini-games (2048, Tetris, Tic Tac Toe, Memory, Space Invaders, Sliding Puzzle).' },
    category: { id: 'Game', en: 'Games' },
    keywords: ['game', 'games', 'permainan', 'hiburan', 'play', 'mini game', 'games hub', 'santai', 'refreshing', 'main', 'istirahat', 'hiburan'],
    icon: Gamepad2,
    action: (nav: any) => nav?.('games-hub')
  },
  {
    id: 'game-2048',
    title: { id: 'Game 2048', en: '2048 Game' },
    description: { id: 'Gabungkan angka ubin yang sama hingga mencapai ubin 2048.', en: 'Merge matching number tiles until you reach 2048.' },
    category: { id: 'Game', en: 'Games' },
    keywords: ['2048', 'game 2048', 'main 2048', 'angka 2048', 'puzzle 2048'],
    icon: Gamepad2,
    action: (nav: any) => nav?.('game')
  },
  {
    id: 'game-tetris',
    title: { id: 'Game Tetris', en: 'Tetris Block Game' },
    description: { id: 'Susun balok blok geometri klasik yang jatuh tanpa celah.', en: 'Classic falling geometric blocks puzzle game.' },
    category: { id: 'Game', en: 'Games' },
    keywords: ['tetris', 'balok', 'block', 'main tetris', 'susun balok'],
    icon: Gamepad2,
    action: (nav: any) => nav?.('tetris')
  },
  {
    id: 'game-tictactoe',
    title: { id: 'Game Tic Tac Toe (XOX)', en: 'Tic Tac Toe Game' },
    description: { id: 'Permainan silang-bulat klasik melawan AI komputer pintar.', en: 'Classic X and O game vs smart AI.' },
    category: { id: 'Game', en: 'Games' },
    keywords: ['tic tac toe', 'tictactoe', 'xox', 'silang bulat', 'sos', 'game tictactoe'],
    icon: Gamepad2,
    action: (nav: any) => nav?.('tictactoe')
  },
  {
    id: 'game-puzzle',
    title: { id: 'Game Sliding Puzzle', en: 'Sliding Puzzle Game' },
    description: { id: 'Geser ubin angka acak agar tersusun berurutan 1 sampai 15.', en: 'Slide randomized number tiles back into 1-15 order.' },
    category: { id: 'Game', en: 'Games' },
    keywords: ['sliding puzzle', 'puzzle', 'susun angka', 'geser angka', '15 puzzle'],
    icon: Gamepad2,
    action: (nav: any) => nav?.('puzzle')
  },
  {
    id: 'game-memory',
    title: { id: 'Game Memory Card (Daya Ingat)', en: 'Memory Card Match' },
    description: { id: 'Latih memori dan konsentrasi dengan mencocokkan pasangan kartu.', en: 'Train memory and focus by matching pairs of cards.' },
    category: { id: 'Game', en: 'Games' },
    keywords: ['memory', 'memory game', 'daya ingat', 'ingatan', 'cocok kartu', 'kartu kembar', 'match card'],
    icon: Gamepad2,
    action: (nav: any) => nav?.('memory')
  },
  {
    id: 'game-space-invaders',
    title: { id: 'Game Space Invaders (Pesawat Luar Angkasa)', en: 'Space Invaders Game' },
    description: { id: 'Tembak dan hancurkan formasi alien penyerang luar angkasa.', en: 'Shoot and defend against waves of invading space aliens.' },
    category: { id: 'Game', en: 'Games' },
    keywords: ['space invaders', 'pesawat', 'tembak pesawat', 'alien', 'arcade pesawat', 'space'],
    icon: Gamepad2,
    action: (nav: any) => nav?.('space-invaders')
  },
  {
    id: 'instagram-official',
    title: { id: 'Instagram Resmi Tata (@noto.grow)', en: 'Official Tata Instagram (@noto.grow)' },
    description: { id: 'Ikuti akun Instagram resmi Tata (@noto.grow) untuk update fitur, tips produktivitas, dan pengumuman.', en: 'Follow official Tata Instagram (@noto.grow) for feature updates, productivity tips, and news.' },
    category: { id: 'Media Sosial', en: 'Social Media' },
    keywords: ['instagram', 'ig', 'noto.grow', 'media sosial', 'sosmed', 'sosial media', 'follow', 'instagram noto', '@noto.grow', 'akun ig', 'ig tata'],
    icon: Instagram,
    action: (nav: any) => nav?.('settings', 'about')
  },
  {
    id: 'email-official',
    title: { id: 'Email Bantuan Tata (notofpg@gmail.com)', en: 'Official Tata Email (notofpg@gmail.com)' },
    description: { id: 'Kirim masukan, saran, atau laporan masalah langsung ke email pengembang Tata.', en: 'Send feedback, suggestions, or bug reports to Tata developers.' },
    category: { id: 'Bantuan', en: 'Support' },
    keywords: ['email', 'gmail', 'notofpg@gmail.com', 'bantuan', 'support', 'kontak', 'hubungi', 'lapor bug', 'masukan', 'surat', 'kirim email', 'pesan'],
    icon: Mail,
    action: (nav: any) => nav?.('settings', 'about')
  },
  {
    id: 'install-pwa',
    title: { id: 'Pasang Aplikasi Tata (PWA / Offline)', en: 'Install Tata App (PWA / Offline)' },
    description: { id: 'Pasang Tata di layar utama perangkat Anda untuk akses cepat tanpa browser & 100% offline.', en: 'Install Tata to home screen for fast native access & 100% offline capability.' },
    category: { id: 'Pengaturan', en: 'Settings' },
    keywords: ['pwa', 'pasang', 'install', 'aplikasi', 'download', 'unduh', 'layar utama', 'home screen', 'offline app', 'pwa tata'],
    icon: Smartphone,
    action: (nav: any) => nav?.('settings', 'about')
  }
];

// Built-in Core Search Providers
const builtInProviders: SearchProvider[] = [
  // 1. Features & Tools Provider
  {
    id: 'features',
    name: 'Fitur & Alat',
    categoryLabel: { id: 'Fitur & Menu', en: 'Features & Tools' },
    search: (query, _store, lang) => {
      const q = query.toLowerCase().trim();
      if (!q) return [];
      const matched: SearchResultItem[] = [];

      APP_FEATURES.forEach(feat => {
        const titleStr = feat.title[lang === 'en' ? 'en' : 'id'].toLowerCase();
        const descStr = feat.description[lang === 'en' ? 'en' : 'id'].toLowerCase();
        const catStr = feat.category[lang === 'en' ? 'en' : 'id'].toLowerCase();
        const kwMatches = feat.keywords.filter(kw => kw.toLowerCase().includes(q));

        let score = 0;
        if (titleStr === q) score += 1200;
        else if (feat.keywords.some(kw => kw.toLowerCase() === q)) score += 1100;
        else if (titleStr.startsWith(q)) score += 800;
        else if (feat.keywords.some(kw => kw.toLowerCase().startsWith(q))) score += 700;
        else if (titleStr.includes(q)) score += 500;
        else if (kwMatches.length > 0) score += 400;
        else if (catStr.includes(q)) score += 300;
        else if (descStr.includes(q)) score += 200;

        if (score > 0) {
          matched.push({
            id: `feat-${feat.id}`,
            providerId: 'features',
            categoryLabel: { id: 'Fitur', en: 'Feature' },
            title: feat.title[lang === 'en' ? 'en' : 'id'],
            description: feat.description[lang === 'en' ? 'en' : 'id'],
            badge: feat.category[lang === 'en' ? 'en' : 'id'],
            badgeColor: 'indigo',
            icon: feat.icon,
            rawItem: feat,
            score,
            action: (nav, callbacks) => feat.action(nav, callbacks)
          });
        }
      });

      return matched;
    }
  },

  // 2. Notes Provider
  {
    id: 'notes',
    name: 'Catatan',
    categoryLabel: { id: 'Catatan', en: 'Notes' },
    search: (query, store) => {
      const q = query.toLowerCase().trim();
      const notes: Note[] = store.notes || [];
      if (!q) return [];
      const matched: SearchResultItem[] = [];

      notes.forEach(n => {
        const title = (n.title || '').toLowerCase();
        const content = (n.content || '').toLowerCase();
        const tags = (n.tags || []).map(t => t.toLowerCase());
        const reminder = (n.reminder || '').toLowerCase();

        let score = 0;
        if (title === q) score += 1150;
        else if (title.startsWith(q)) score += 750;
        else if (title.includes(q)) score += 550;
        else if (tags.some(t => t === q)) score += 500;
        else if (tags.some(t => t.includes(q))) score += 350;
        else if (content.includes(q)) score += 250;
        else if (reminder.includes(q)) score += 200;

        if (score > 0) {
          matched.push({
            id: `note-${n.id}`,
            providerId: 'notes',
            categoryLabel: { id: 'Catatan', en: 'Note' },
            title: n.title || 'Catatan Tanpa Judul',
            description: n.content ? n.content.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim() : '...',
            dateOrInfo: n.date,
            icon: FileText,
            badge: n.isLocked ? 'Terkunci' : (n.tags && n.tags[0]) ? `#${n.tags[0]}` : undefined,
            badgeColor: n.isLocked ? 'amber' : 'indigo',
            rawItem: n,
            score,
            action: (_nav, callbacks) => callbacks?.openNote?.(n)
          });
        }
      });

      return matched;
    }
  },

  // 3. Tasks & Checklist Provider
  {
    id: 'tasks',
    name: 'Tugas',
    categoryLabel: { id: 'Tugas & Ceklis', en: 'Tasks & Checklist' },
    search: (query, store) => {
      const q = query.toLowerCase().trim();
      const tasks: Task[] = store.tasks || [];
      if (!q) return [];
      const matched: SearchResultItem[] = [];

      tasks.forEach(t => {
        if (t.deleted) return;
        const title = (t.title || '').toLowerCase();
        const priority = (t.priority || '').toLowerCase();
        const date = (t.date || '').toLowerCase();

        let score = 0;
        if (title === q) score += 1000;
        else if (title.startsWith(q)) score += 650;
        else if (title.includes(q)) score += 450;
        else if (priority.includes(q)) score += 250;
        else if (date.includes(q)) score += 150;

        if (score > 0) {
          matched.push({
            id: `task-${t.id}`,
            providerId: 'tasks',
            categoryLabel: { id: 'Tugas', en: 'Task' },
            title: t.title,
            description: `Status: ${t.completed ? 'Selesai' : 'Belum Selesai'} • Prioritas: ${t.priority}`,
            dateOrInfo: t.date,
            icon: CheckSquare,
            badge: t.completed ? 'Selesai' : t.priority,
            badgeColor: t.completed ? 'emerald' : t.priority === 'Tinggi' ? 'rose' : 'indigo',
            rawItem: t,
            score,
            action: (nav) => nav?.('tasks')
          });
        }
      });

      return matched;
    }
  },

  // 4. Finance & Transactions Provider
  {
    id: 'finance',
    name: 'Keuangan',
    categoryLabel: { id: 'Transaksi Keuangan', en: 'Transactions & Finance' },
    search: (query, store, lang) => {
      const q = query.toLowerCase().trim();
      const txs: Transaction[] = store.transactions || [];
      if (!q) return [];
      const matched: SearchResultItem[] = [];

      txs.forEach(tx => {
        const desc = (tx.description || '').toLowerCase();
        const cat = (tx.category || '').toLowerCase();
        const type = (tx.type || '').toLowerCase();
        const amountStr = String(tx.amount);

        let score = 0;
        if (desc === q || cat === q) score += 950;
        else if (desc.startsWith(q) || cat.startsWith(q)) score += 600;
        else if (desc.includes(q) || cat.includes(q)) score += 400;
        else if (type.includes(q) || amountStr.includes(q)) score += 300;

        if (score > 0) {
          const isIncome = tx.type === 'income';
          const formattedAmount = `${isIncome ? '+' : '-'} Rp ${tx.amount.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}`;
          matched.push({
            id: `tx-${tx.id}`,
            providerId: 'finance',
            categoryLabel: { id: 'Keuangan', en: 'Finance' },
            title: tx.description || tx.category || 'Transaksi',
            description: `${tx.category} • ${formattedAmount}`,
            dateOrInfo: tx.date,
            icon: Wallet,
            badge: isIncome ? 'Pemasukan' : 'Pengeluaran',
            badgeColor: isIncome ? 'emerald' : 'rose',
            rawItem: tx,
            score,
            action: (nav) => nav?.('finance')
          });
        }
      });

      return matched;
    }
  },

  // 5. Debts & Loans Provider
  {
    id: 'debts',
    name: 'Utang & Piutang',
    categoryLabel: { id: 'Catatan Utang', en: 'Debts & Loans' },
    search: (query, store, lang) => {
      const q = query.toLowerCase().trim();
      const debts: DebtItem[] = store.debts || [];
      if (!q) return [];
      const matched: SearchResultItem[] = [];

      debts.forEach(d => {
        const title = (d.title || '').toLowerCase();
        const lender = (d.lender || '').toLowerCase();
        const notes = (d.notes || '').toLowerCase();
        const amountStr = String(d.totalAmount);

        let score = 0;
        if (title === q || lender === q) score += 900;
        else if (title.startsWith(q) || lender.startsWith(q)) score += 600;
        else if (title.includes(q) || lender.includes(q)) score += 400;
        else if (notes.includes(q) || amountStr.includes(q)) score += 250;

        if (score > 0) {
          matched.push({
            id: `debt-${d.id}`,
            providerId: 'debts',
            categoryLabel: { id: 'Utang', en: 'Debt' },
            title: d.title,
            description: `${d.lender ? `Ke: ${d.lender} • ` : ''}Sisa: Rp ${d.remainingAmount.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')} / Total: Rp ${d.totalAmount.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}`,
            dateOrInfo: d.dueDate || d.createdAt,
            icon: ShieldAlert,
            badge: d.isPaidOff ? 'Lunas' : 'Belum Lunas',
            badgeColor: d.isPaidOff ? 'emerald' : 'amber',
            rawItem: d,
            score,
            action: (nav) => nav?.('finance')
          });
        }
      });

      return matched;
    }
  },

  // 6. Savings Goals Provider
  {
    id: 'savings',
    name: 'Target Tabungan',
    categoryLabel: { id: 'Tabungan', en: 'Savings Goal' },
    search: (query, store, lang) => {
      const q = query.toLowerCase().trim();
      const goals = store.savingsGoals || [];
      if (!q) return [];
      
      const matched: SearchResultItem[] = [];

      goals.forEach((g: any) => {
        const title = (g.title || '').toLowerCase();
        const category = (g.category || '').toLowerCase();
        const notes = (g.notes || '').toLowerCase();
        let score = 0;

        if (title === q || category === q) score += 950;
        else if (title.startsWith(q) || category.startsWith(q)) score += 700;
        else if (title.includes(q) || category.includes(q)) score += 500;
        else if (notes.includes(q) || 'tabungan'.includes(q) || 'celengan'.includes(q) || 'savings'.includes(q)) score += 350;

        if (score > 0) {
          matched.push({
            id: `savings-${g.id}`,
            providerId: 'savings',
            categoryLabel: { id: 'Tabungan', en: 'Savings' },
            title: `${g.emoji || '🎯'} ${g.title}`,
            description: `Terkumpul: Rp ${(g.currentAmount || 0).toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}${g.targetAmount ? ` / Target: Rp ${g.targetAmount.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}` : ''}`,
            icon: CreditCard,
            badge: g.isCompleted ? 'Tercapai' : (g.category || 'Tabungan'),
            badgeColor: g.isCompleted ? 'emerald' : 'purple',
            rawItem: g,
            score,
            action: (nav) => nav?.('finance')
          });
        }
      });

      // Fallback for legacy target if goals array is empty
      if (matched.length === 0 && store.savingsTargetTitle) {
        const targetTitle = store.savingsTargetTitle || '';
        const target = store.savingsTarget || 0;
        const balance = store.savingsBalance || 0;
        const tt = targetTitle.toLowerCase();
        let score = 0;
        if (tt === q || q === 'tabungan' || q === 'savings') score += 900;
        else if (tt.startsWith(q)) score += 600;
        else if (tt.includes(q) || 'tabungan'.includes(q) || 'celengan'.includes(q) || 'savings'.includes(q)) score += 400;

        if (score > 0) {
          matched.push({
            id: 'savings-legacy',
            providerId: 'savings',
            categoryLabel: { id: 'Tabungan', en: 'Savings' },
            title: `Target: ${targetTitle}`,
            description: `Terkumpul: Rp ${balance.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')} dari Rp ${target.toLocaleString(lang === 'en' ? 'en-US' : 'id-ID')}`,
            icon: CreditCard,
            badge: 'Tabungan Impian',
            badgeColor: 'purple',
            score,
            action: (nav) => nav?.('finance')
          });
        }
      }

      return matched;
    }
  },

  // 7. Moods & Journal Provider
  {
    id: 'moods',
    name: 'Suasana Hati & Jurnal',
    categoryLabel: { id: 'Jurnal Mood', en: 'Mood & Journal' },
    search: (query, store) => {
      const q = query.toLowerCase().trim();
      const moods: MoodEntry[] = store.moods || [];
      if (!q) return [];
      
      const moodLabelMap: Record<string, string> = {
        excellent: 'Sangat Baik / Hebat',
        good: 'Baik / Senang',
        neutral: 'Biasa / Netral',
        bad: 'Kurang Baik / Cemas',
        terrible: 'Buruk / Sedih'
      };

      const matched: SearchResultItem[] = [];

      moods.forEach(m => {
        const note = (m.note || '').toLowerCase();
        const label = (m.mood ? moodLabelMap[m.mood] || m.mood : '').toLowerCase();
        const date = (m.date || '').toLowerCase();

        let score = 0;
        if (note.startsWith(q) || label.startsWith(q)) score += 700;
        else if (note.includes(q) || label.includes(q)) score += 400;
        else if (date.includes(q)) score += 200;

        if (score > 0) {
          matched.push({
            id: `mood-${m.date}`,
            providerId: 'moods',
            categoryLabel: { id: 'Mood', en: 'Mood' },
            title: `Jurnal Mood (${m.mood ? moodLabelMap[m.mood] || m.mood : 'Tanpa Mood'})`,
            description: m.note || 'Tidak ada catatan jurnal',
            dateOrInfo: m.date,
            icon: Heart,
            badge: m.mood || 'Jurnal',
            badgeColor: 'rose',
            rawItem: m,
            score,
            action: (nav) => nav?.('calendar')
          });
        }
      });

      return matched;
    }
  }
];

// Dynamic store inspector fallback (ensures future store modules are searched automatically!)
function dynamicStoreInspector(query: string, store: any): SearchResultItem[] {
  const q = query.toLowerCase().trim();
  if (!q || !store) return [];

  const knownKeys = new Set(['notes', 'tasks', 'transactions', 'debts', 'moods', 'user', 'pinHistory']);
  const results: SearchResultItem[] = [];

  Object.keys(store).forEach(key => {
    if (knownKeys.has(key)) return; // already handled by specific providers
    const val = store[key];
    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object' && val[0] !== null) {
      val.forEach((item, index) => {
        const titleCandidate = item.title || item.name || item.subject || item.label || item.header || '';
        const contentCandidate = item.content || item.note || item.description || item.text || item.details || '';
        
        if (
          String(titleCandidate).toLowerCase().includes(q) ||
          String(contentCandidate).toLowerCase().includes(q)
        ) {
          results.push({
            id: `dyn-${key}-${item.id || index}`,
            providerId: `dynamic-${key}`,
            categoryLabel: { id: key.toUpperCase(), en: key.toUpperCase() },
            title: String(titleCandidate) || `Item di ${key}`,
            description: String(contentCandidate) || `Data dari modul ${key}`,
            icon: Compass,
            badge: key,
            badgeColor: 'cyan',
            rawItem: item,
            score: 100,
            action: (nav) => nav?.('home')
          });
        }
      });
    }
  });

  return results;
}

/**
 * Universal Search Engine execution point with intelligent relevance ranking
 */
export function executeUniversalSearch(query: string, store: any, lang: string): SearchResultItem[] {
  if (!query || !query.trim()) return [];

  let results: SearchResultItem[] = [];

  // 1. Run all built-in providers
  builtInProviders.forEach(provider => {
    try {
      const res = provider.search(query, store, lang);
      if (res && res.length > 0) {
        results = results.concat(res);
      }
    } catch (e) {
      console.error(`Search error in provider ${provider.id}:`, e);
    }
  });

  // 2. Run registered custom providers
  customSearchProviders.forEach(provider => {
    try {
      const res = provider.search(query, store, lang);
      if (res && res.length > 0) {
        results = results.concat(res);
      }
    } catch (e) {
      console.error(`Search error in custom provider ${provider.id}:`, e);
    }
  });

  // 3. Fallback dynamic store inspector (for future additions)
  try {
    const dynRes = dynamicStoreInspector(query, store);
    if (dynRes.length > 0) {
      results = results.concat(dynRes);
    }
  } catch (e) {
    console.error('Dynamic store inspector error:', e);
  }

  // 4. Sort by relevance score descending
  results.sort((a, b) => (b.score || 0) - (a.score || 0));

  return results;
}

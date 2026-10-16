import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAppStore } from '../store';
import { CheckSquare, Flame, Pin, Sparkles, Target, X, FileText, Bell, Repeat, Bot, Plus, Laugh, Smile, Meh, Frown, CloudRain, Wallet, Crop, Image as ImageIcon, RefreshCw, Camera, Lock, Shuffle, Gamepad2, ArrowRight, TrendingUp, Zap, PiggyBank, CreditCard, ChevronRight, ChevronUp, Search as SearchIcon, Compass, Heart, ShieldAlert, Tag as TagIcon, ArrowUpRight, Calendar, ShieldCheck, User as UserIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getLargeItem, getLargeItemSync, setLargeItem } from '../utils/db';
import { useTranslation } from '../translations';
import NotificationModal from '../components/NotificationModal';
import ImageCropperModal from '../components/ImageCropperModal';
import { buildAllNotifications } from '../utils/notifications';
import { executeUniversalSearch, SearchResultItem } from '../services/searchEngine';
import { OrganicHomeView } from '../components/home/OrganicHomeView';
import { getOrganicThemePalette } from '../components/home/organicThemePalettes';
import { LiteStickerIcon } from '../components/LiteModeIcons';
import AdBanner from '../components/AdBanner';

interface HomeProps {
  appTheme: any;
  setAppTheme: any;
  onOpenNote: any;
  onNavigate: any;
}

const getMoodIcon = (mood: string, className: string = "w-5 h-5") => {
  switch (mood) {
    case 'excellent': return <Laugh className={className} strokeWidth={2.5} />;
    case 'good': return <Smile className={className} strokeWidth={2.5} />;
    case 'neutral': return <Meh className={className} strokeWidth={2.5} />;
    case 'bad': return <Frown className={className} strokeWidth={2.5} />;
    case 'terrible': return <CloudRain className={className} strokeWidth={2.5} />;
    default: return <Meh className={className} strokeWidth={2.5} />;
  }
};

const extractFirstImageUrl = (content?: string): string | null => {
  if (!content) return null;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
};

const MOTIVATION_QUOTES = [
  {
    quoteId: 'Sakitnya disiplin dan belajar hari ini jauh lebih baik daripada sakitnya menyesal di hari esok.',
    quoteEn: 'The pain of discipline today is far better than the pain of regret tomorrow.',
    category: 'Disiplin Diri',
    categoryEn: 'Self-Discipline',
    icon: 'zap'
  },
  {
    quoteId: 'Tidak ada yang bisa menyakitimu atau melemahkanmu, kecuali kau sendiri yang mengizinkannya.',
    quoteEn: 'No one can hurt or weaken you, unless you allow them to.',
    category: 'Kendali Diri',
    categoryEn: 'Inner Strength',
    icon: 'shield'
  },
  {
    quoteId: 'Godaan hanya manis sesaat, tapi penyesalannya abadi. Tahan dirimu, jangan kalah.',
    quoteEn: 'Temptation feels sweet for a moment, but regret lasts forever. Hold your ground.',
    category: 'Tahan Godaan',
    categoryEn: 'Resist Temptation',
    icon: 'flame'
  },
  {
    quoteId: 'Disiplin adalah memilih antara apa yang kamu inginkan sekarang, dan apa yang paling kamu inginkan nanti.',
    quoteEn: 'Discipline is choosing between what you want now, and what you want most.',
    category: 'Fokus & Masa Depan',
    categoryEn: 'Focus & Vision',
    icon: 'target'
  },
  {
    quoteId: 'Jangan gadaikan perjuangan panjangmu hanya demi kenyamanan atau kesenangan beberapa menit.',
    quoteEn: 'Never trade months of hard work for a few minutes of temporary comfort.',
    category: 'Konsistensi',
    categoryEn: 'Consistency',
    icon: 'sparkles'
  }
];

export default function HomeScreen({ appTheme, setAppTheme, onOpenNote, onNavigate }: HomeProps) {
  const store = useAppStore();
  const { notes, tasks, moods, setMood, user, toggleTask, deleteTask, deleteNote, updateNote, streak, lang, updateTask, checkInDaily, isLiteMode, appVersion, handleRefreshApp, isRefreshing, transactions, savingsBalance, savingsTarget, debts, tataAccount, isAccountPremium } = store;
  const [searchQuery, setSearchQuery] = useState('');
  
  // Strictly compute mode flags to prevent any mode mixing
  const isLite = appVersion === 'lite' || isLiteMode;
  const isProMax = !isLite && (appVersion === 'organic' || appVersion === 'pro_max' || appTheme === 'organic' || (appTheme as string) === 'pro_max' || tataAccount?.premiumType === 'pro_max');

  const palette = useMemo(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : null;
    const effectiveTheme = appTheme || storedTheme || 'dark';
    return getOrganicThemePalette(effectiveTheme);
  }, [appTheme]);
  
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const [activeSearchFilter, setActiveSearchFilter] = useState<'all' | 'features' | 'notes' | 'tasks' | 'finance' | 'mood'>('all');
  const [isSearchBarVisible, setIsSearchBarVisible] = useState(true);
  const mainTouchStartYRef = useRef<number | null>(null);
  const lastScrollTopRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const homeScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Selalu pastikan beranda tampil dari paling atas
    if (homeScrollRef.current) {
      homeScrollRef.current.scrollTop = 0;
    }
  }, []);

  const trimmedQuery = (searchQuery || '').trim();
  const searchResults = useMemo(() => {
    if (isProMax || !trimmedQuery) return [];
    return executeUniversalSearch(trimmedQuery, store, lang);
  }, [isProMax, trimmedQuery, store.notes, store.tasks, store.transactions, store.moods, store.savingsGoals, store.debts, lang]);

  // If query gets entered, make sure search bar is visible
  useEffect(() => {
    if (trimmedQuery.length > 0) {
      setIsSearchBarVisible(true);
    }
  }, [trimmedQuery]);

  // Keyboard shortcut (⌘K / Ctrl+K / Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchBarVisible(prev => {
          const next = !prev;
          if (next) setTimeout(() => searchInputRef.current?.focus(), 100);
          return next;
        });
      } else if (e.key === 'Escape') {
        if (searchQuery) setSearchQuery('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, setSearchQuery]);

  // Touch gesture on main content: Pull down at the top to reveal search bar
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    mainTouchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (mainTouchStartYRef.current === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - mainTouchStartYRef.current;

    // Pull down near top of scrollable container -> reveal search bar smoothly
    if (diff > 50 && e.currentTarget.scrollTop <= 5) {
      setIsSearchBarVisible(true);
    }
  };

  const handleTouchEnd = () => {
    mainTouchStartYRef.current = null;
  };

  // Search bar swipe-up detection to dismiss
  const searchBarTouchStartYRef = useRef<number | null>(null);
  const handleSearchTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    searchBarTouchStartYRef.current = e.touches[0].clientY;
  };
  const handleSearchTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (searchBarTouchStartYRef.current === null) return;
    const diff = e.touches[0].clientY - searchBarTouchStartYRef.current;
    if (diff < -25 && !trimmedQuery) {
      setIsSearchBarVisible(false);
      searchBarTouchStartYRef.current = null;
    }
  };
  const handleSearchTouchEnd = () => {
    searchBarTouchStartYRef.current = null;
  };

  const handleSelectResult = (item: SearchResultItem) => {
    if (!item) return;
    setSearchQuery('');
    const isNote = item.providerId === 'notes';
    const isTask = item.providerId === 'tasks';
    const isFinance = ['finance', 'debt', 'debts', 'savings'].includes(item.providerId);
    const isFeature = item.providerId === 'features';
    const isMood = item.providerId === 'moods' || item.providerId === 'mood';

    if (isNote && item.rawItem) {
      onOpenNote(item.rawItem);
    } else if (isFeature && item.action) {
      item.action(onNavigate, { openNote: onOpenNote, createNote: handleCreateNote });
    } else if (isTask) {
      onNavigate('tasks');
    } else if (isFinance) {
      onNavigate('finance');
    } else if (isMood) {
      onNavigate('calendar');
    } else if (item.action) {
      item.action(onNavigate, { openNote: onOpenNote, createNote: handleCreateNote });
    }
  };

  const featureResults = useMemo(() => searchResults.filter(r => r.providerId === 'features'), [searchResults]);
  const noteResults = useMemo(() => searchResults.filter(r => r.providerId === 'notes'), [searchResults]);
  const taskResults = useMemo(() => searchResults.filter(r => r.providerId === 'tasks'), [searchResults]);
  const financeResults = useMemo(() => searchResults.filter(r => ['finance', 'debt', 'debts', 'savings'].includes(r.providerId)), [searchResults]);
  const moodResults = useMemo(() => searchResults.filter(r => r.providerId === 'mood' || r.providerId === 'moods'), [searchResults]);

  const filteredResults = useMemo(() => {
    if (activeSearchFilter === 'features') return featureResults;
    if (activeSearchFilter === 'notes') return noteResults;
    if (activeSearchFilter === 'tasks') return taskResults;
    if (activeSearchFilter === 'finance') return financeResults;
    if (activeSearchFilter === 'mood') return moodResults;
    return searchResults;
  }, [activeSearchFilter, searchResults, featureResults, noteResults, taskResults, financeResults, moodResults]);

  const refreshNotifCount = useCallback(() => {
    const list = buildAllNotifications({
      notes,
      tasks,
      transactions,
      debts,
      lang,
      streak,
      tataAccount,
      isAccountPremium,
      savingsBalance,
      savingsTarget,
      moods
    });
    setNotificationsCount(list.length);
  }, [notes, tasks, transactions, debts, lang, streak, tataAccount, isAccountPremium, savingsBalance, savingsTarget, moods]);

  useEffect(() => {
    refreshNotifCount();
    const handleNotifChanged = () => refreshNotifCount();
    window.addEventListener('tata_notifications_changed', handleNotifChanged);
    return () => window.removeEventListener('tata_notifications_changed', handleNotifChanged);
  }, [refreshNotifCount]);

  const formatReminderDate = (dateStr: string, lang?: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  const handleCreateNote = () => {
    const newNote = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      updatedAt: Date.now(),
      pinned: false,
      tags: []
    };
    onOpenNote(newNote);
  };
  const t = useTranslation(lang);
  
  const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  
  const currentUser = user;
  
  const getGreeting = () => {
    const hour = new Date().getHours();
    let timeGreeting = '';
    if (hour < 11) { timeGreeting = lang === 'id' ? 'Selamat Pagi' : 'Good Morning'; }
    else if (hour < 15) { timeGreeting = lang === 'id' ? 'Selamat Siang' : 'Good Afternoon'; }
    else if (hour < 18) { timeGreeting = lang === 'id' ? 'Selamat Sore' : 'Good Afternoon'; }
    else { timeGreeting = lang === 'id' ? 'Selamat Malam' : 'Good Evening'; }
    return `${timeGreeting}, ${currentUser.name || (lang === 'id' ? 'Kawan' : 'Friend')}`;
  };

  const [showStreakSplash, setShowStreakSplash] = useState(() => {
    try {
      const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const lastSeen = localStorage.getItem('streak_splash_seen_date');
      return streak > 0 && (streak % 7 === 0) && lastSeen !== today;
    } catch(e) {
      return false;
    }
  });

  const [splashAnim, setSplashAnim] = useState(false);
  const [bannerWallpaper, setBannerWallpaper] = useState<string | null>(() => getLargeItemSync("tata_banner_wallpaper"));
  const [showCropperModal, setShowCropperModal] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);

  useEffect(() => {
    getLargeItem('tata_banner_wallpaper').then(setBannerWallpaper);
  }, []);

  useEffect(() => {
    const handleBannerWallpaperChange = () => {
      getLargeItem('tata_banner_wallpaper').then(setBannerWallpaper);
    };
    window.addEventListener('tata_banner_wallpaper_changed', handleBannerWallpaperChange);
    return () => window.removeEventListener('tata_banner_wallpaper_changed', handleBannerWallpaperChange);
  }, []);

  const handleBannerCropSave = async (croppedDataUrl: string) => {
    setShowCropperModal(false);
    setCropperImageSrc(null);
    await setLargeItem('tata_banner_wallpaper', croppedDataUrl);
    setBannerWallpaper(croppedDataUrl);
    window.dispatchEvent(new Event('tata_banner_wallpaper_changed'));
  };

  useEffect(() => {
    if (showStreakSplash) {
      try {
        const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        localStorage.setItem('streak_splash_seen_date', today);
      } catch(e) {}
      const enterTimer = setTimeout(() => setSplashAnim(true), 50);
      return () => {
        clearTimeout(enterTimer);
      };
    }
  }, [showStreakSplash]);
  
  const [quoteIdx, setQuoteIdx] = useState(0);

  const handleNextQuote = () => {
    setQuoteIdx(prev => (prev + 1) % MOTIVATION_QUOTES.length);
  };

  useEffect(() => {
    const handleQuoteRefresh = () => {
      handleNextQuote();
    };
    window.addEventListener('tata_refresh_quote', handleQuoteRefresh);
    return () => window.removeEventListener('tata_refresh_quote', handleQuoteRefresh);
  }, []);

  const currentQuote = MOTIVATION_QUOTES[quoteIdx];

  const [hideChallenge, setHideChallenge] = useState(() => {
    try {
      const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      return localStorage.getItem('hide_challenge_date') === today;
    } catch(e) {
      return false;
    }
  });

  const handleHideChallenge = () => {
    setHideChallenge(true);
    try {
      const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      localStorage.setItem('hide_challenge_date', today);
    } catch(e) {}
  };

  const { activeTasksCount, pinnedTasks, pinnedNotes, disciplineTask, totalTasks, progressPercent, completedCount, frontStreak, walletCash, activeTasksList, recentNotesList } = useMemo(() => {
    if (isProMax) {
      return {
        activeTasksCount: 0,
        pinnedTasks: [],
        pinnedNotes: [],
        disciplineTask: null,
        totalTasks: 0,
        progressPercent: 0,
        completedCount: 0,
        frontStreak: 0,
        walletCash: 0,
        activeTasksList: [],
        recentNotesList: []
      };
    }
    const nonDeletedTasks = tasks.filter(t => !t.deleted);
    const actTasks = nonDeletedTasks.filter(t => !t.completed && !t.isDiscipline && !t.disciplineData);
    const pTasks = nonDeletedTasks.filter(t => t.pinned && !t.isDiscipline && !t.disciplineData).slice(0, 5);
    const pNotes = notes.filter(n => n.pinned).slice(0, 5);
    const dTask = nonDeletedTasks.find(t => t.isDiscipline || !!t.disciplineData);
    const tTasks = nonDeletedTasks.length;
    const completedCount = nonDeletedTasks.filter(t => t.completed).length;
    const pPercent = tTasks === 0 ? 0 : Math.round((completedCount / tTasks) * 100);
    const frontStreak = completedCount === 0 ? 0 : Math.max(1, streak);

    let inc = 0;
    let exp = 0;
    if (transactions && transactions.length > 0) {
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        if (tx.type === 'income') inc += tx.amount;
        else if (tx.type === 'expense') exp += tx.amount;
      }
    }
    const cash = inc - exp;
    const rNotes = notes.slice(0, 4);

    return {
      activeTasksCount: actTasks.length,
      pinnedTasks: pTasks,
      pinnedNotes: pNotes,
      disciplineTask: dTask,
      totalTasks: tTasks,
      progressPercent: pPercent,
      completedCount,
      frontStreak,
      walletCash: cash,
      activeTasksList: actTasks,
      recentNotesList: rNotes
    };
  }, [tasks, notes, transactions, streak, isProMax]);

  if (isProMax) {
    return (
      <div ref={homeScrollRef} className="flex flex-col h-full font-sans overflow-y-auto">
        <OrganicHomeView
          appTheme={appTheme}
          onOpenNote={onOpenNote}
          onNavigate={onNavigate}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onRefreshQuote={handleNextQuote}
          activeQuote={{
            text: lang === 'id' ? currentQuote.quoteId : currentQuote.quoteEn,
            author: currentQuote.category,
            category: lang === 'id' ? currentQuote.category : currentQuote.categoryEn,
          }}
          onCloseQuote={handleHideChallenge}
          showQuoteCard={!hideChallenge}
        />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full font-sans relative ${palette.rootText}`}>
      {/* Streak Splash Overlay */}
      <AnimatePresence>
        {showStreakSplash && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-950/90 cursor-pointer p-4"
            onClick={() => {
              setSplashAnim(false);
              setTimeout(() => setShowStreakSplash(false), 200);
            }}
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              transition={{ type: "spring", stiffness: 500, damping: 15, mass: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-10 flex flex-col items-center justify-center relative shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Background Glow */}
              
              {/* Flame Icon */}
              <motion.div 
                animate={{ y: [0, -12, 0], scale: [1, 1.25, 1], rotate: [0, -10, 10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="w-24 h-24 bg-slate-900 rounded-[2rem] border border-slate-800 flex items-center justify-center mb-6 shadow-sm relative z-10"
              >
                <Flame className="w-12 h-12 text-orange-500" />
              </motion.div>
              
              {/* Streak Number */}
              <h1 className="text-[5rem] font-black text-white leading-none tracking-tighter mb-2 z-10 drop-shadow-sm">
                {streak}
              </h1>
              
              <div className="text-orange-400 font-black uppercase tracking-[0.2em] text-sm mb-6 z-10 bg-orange-500/10 px-5 py-2 rounded-full ring-1 ring-orange-500/20 shadow-sm">
                {t('streak')}
              </div>
              
              <div className="text-slate-300 font-medium text-[15px] text-center mb-10 px-4 z-10 leading-relaxed">
                {t('streakKeep')}
              </div>
              
              <button 
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 rounded-2xl py-4 font-bold transition-all hover:scale-[1.02] active:scale-95 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setSplashAnim(false);
                  setTimeout(() => setShowStreakSplash(false), 200);
                }}
              >
                {lang === 'id' ? 'Luar Biasa!' : 'Awesome!'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CLEAN TOP HEADER */}
      <div className={`flex-none backdrop-blur-md border-b px-3 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2.5 sm:pb-3 z-20 shadow-sm space-y-2 transition-colors ${
        appTheme === 'wallpaper'
          ? 'bg-slate-950/40 border-white/10 text-white backdrop-blur-xl'
          : `${palette.headerBg} ${palette.headerBorder}`
      }`}>
        <div className="w-full max-w-6xl xl:max-w-7xl mx-auto flex items-center justify-between gap-2">
          {/* Logo & Refresh */}
          <button
            onClick={handleRefreshApp}
            disabled={isRefreshing}
            className="flex items-center gap-2 min-w-0 hover:opacity-90 transition-all cursor-pointer group text-left active:scale-95 shrink-0"
            title={lang === 'id' ? 'Klik Logo Tata untuk Segarkan & Hapus Cache' : 'Click Tata Logo to Refresh & Clear Cache'}
          >
            {isLite ? (
              <div className="relative w-8 h-8 rounded-xl bg-[#38bdf8] border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.35)] flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                <img src="/icon.png" alt="Tata Logo" className={`w-full h-full object-cover transition-transform ${isRefreshing ? 'animate-spin' : ''}`} />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <RefreshCw className={`w-4 h-4 text-white ${isRefreshing ? 'animate-spin' : ''}`} />
                </div>
              </div>
            ) : (
              <div className={`relative w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shadow-sm shrink-0 transition-colors ${palette.brandBg}`}>
                <img src="/icon.png" alt="Tata Logo" className={`w-full h-full object-cover transition-transform ${isRefreshing ? 'animate-spin' : 'group-hover:scale-105'}`} />
                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <RefreshCw className={`w-4 h-4 text-cyan-300 ${isRefreshing ? 'animate-spin' : ''}`} />
                </div>
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`font-extrabold text-base sm:text-lg tracking-tight ${palette.titleText} transition-colors leading-none`}>TATA</span>
                <RefreshCw className={`w-3 h-3 ${palette.subText} group-hover:text-cyan-400 transition-colors ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
              </div>
              <span className={`hidden sm:block text-[9px] font-bold ${palette.subText} group-hover:text-cyan-400 transition-colors tracking-wider uppercase mt-0.5`}>
                {isRefreshing ? (lang === 'id' ? 'Menyegarkan...' : 'Refreshing...') : (lang === 'id' ? 'Segarkan App' : 'Refresh App')}
              </span>
            </div>
          </button>

          {/* Quick Action Buttons (Optimized for mobile without overflow) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button 
              onClick={() => onNavigate('ai-companion')}
              className={isLite 
                ? `flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer shrink-0 ${palette.actionBtn} ${palette.actionBtnHover} ${palette.actionBtnBorder}` 
                : `flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border font-bold text-xs transition-all active:scale-95 shadow-sm cursor-pointer shrink-0 ${palette.actionBtn} ${palette.actionBtnHover} ${palette.actionBtnBorder}`}
              title="Tata AI Companion"
            >
              {isLite ? (
                <LiteStickerIcon variant="ai" size="xs" />
              ) : (
                <Bot className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              )}
              <span className="hidden sm:inline text-xs font-bold">Tata AI</span>
            </button>

            <button 
              onClick={() => onNavigate('finance')}
              className={isLite 
                ? `flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border font-bold text-xs transition-all active:scale-95 shadow-xs cursor-pointer shrink-0 ${palette.actionBtn} ${palette.actionBtnHover} ${palette.actionBtnBorder}` 
                : `flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border font-bold text-xs transition-all active:scale-95 shadow-sm cursor-pointer shrink-0 ${palette.actionBtn} ${palette.actionBtnHover} ${palette.actionBtnBorder}`}
              title="Keuangan & Budget"
            >
              {isLite ? (
                <LiteStickerIcon variant="finance" size="xs" />
              ) : (
                <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              )}
              <span className="hidden sm:inline text-xs font-bold">{t('financeMenu') || 'Keuangan'}</span>
            </button>

            <button 
              onClick={() => setShowNotificationModal(true)}
              className={isLite 
                ? `relative p-1.5 rounded-xl border transition-all active:scale-95 shadow-xs cursor-pointer shrink-0 ${palette.actionBtn} ${palette.actionBtnHover} ${palette.actionBtnBorder}` 
                : `relative p-2 rounded-xl border transition-all active:scale-95 shadow-sm cursor-pointer shrink-0 ${palette.actionBtn} ${palette.actionBtnHover} ${palette.actionBtnBorder}`}
              title={lang === 'id' ? 'Notifikasi & Lonceng' : 'Notifications'}
            >
              {isLite ? (
                <LiteStickerIcon variant="bell" size="xs" />
              ) : (
                <Bell className="w-4 h-4 text-current" />
              )}
              {notificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-black flex items-center justify-center shadow-xs ring-2 ring-slate-900 animate-pulse">
                  {notificationsCount > 9 ? '9+' : notificationsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Clean Integrated Search Bar */}
        <div 
          onTouchStart={handleSearchTouchStart}
          onTouchMove={handleSearchTouchMove}
          onTouchEnd={handleSearchTouchEnd}
          className="w-full max-w-6xl xl:max-w-7xl mx-auto pt-0.5"
        >
          <div className="relative group flex items-center">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={lang === 'id' ? 'Cari catatan, tugas, keuangan, atau menu Tata...' : 'Search notes, tasks, finances, or Tata features...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredResults.length > 0) {
                    handleSelectResult(filteredResults[0]);
                  }
                }
              }}
              className={`w-full rounded-2xl px-4 pr-24 py-2 text-xs sm:text-sm outline-none transition-all shadow-inner border ${palette.searchContainer} ${palette.searchInput}`}
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              {/* Instant Quick Direct Jump Button when results exist */}
              {trimmedQuery && filteredResults.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleSelectResult(filteredResults[0])}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0 animate-in fade-in ${palette.chipActive}`}
                  title={lang === 'id' ? 'Langsung buka hasil teratas (Enter ↵)' : 'Directly open top result (Enter ↵)'}
                >
                  <span>{lang === 'id' ? 'Buka' : 'Open'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`p-1 ${palette.subText} hover:${palette.titleText} rounded-lg transition-colors cursor-pointer`}
                  title={lang === 'id' ? 'Hapus teks' : 'Clear search'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN DASHBOARD CONTENT (Rock-solid scrolling with automatic scroll/swipe detection) */}
      <div 
        ref={homeScrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-6 custom-scrollbar pb-32 w-full max-w-6xl xl:max-w-7xl mx-auto space-y-5 sm:space-y-6"
      >
        {/* If user is searching, render Universal Search Results neatly */}
        {trimmedQuery.length > 0 ? (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Search Header & Category Filter Chips */}
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b ${palette.headerBorder}`}>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${palette.titleText}`}>
                  {lang === 'id' ? 'Hasil Pencarian' : 'Search Results'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${palette.searchBadge}`}>
                  {filteredResults.length}
                </span>
              </div>

              {/* Category Filter Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => setActiveSearchFilter('all')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeSearchFilter === 'all'
                      ? palette.chipActive
                      : palette.chipInactive
                  }`}
                >
                  {lang === 'id' ? 'Semua' : 'All'} ({searchResults.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSearchFilter('features')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    activeSearchFilter === 'features'
                      ? palette.chipActive
                      : palette.chipInactive
                  }`}
                >
                  <Compass className="w-3 h-3" />
                  <span>{lang === 'id' ? 'Fitur' : 'Features'} ({featureResults.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSearchFilter('notes')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    activeSearchFilter === 'notes'
                      ? palette.chipActive
                      : palette.chipInactive
                  }`}
                >
                  <FileText className="w-3 h-3" />
                  <span>{lang === 'id' ? 'Catatan' : 'Notes'} ({noteResults.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSearchFilter('tasks')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    activeSearchFilter === 'tasks'
                      ? palette.chipActive
                      : palette.chipInactive
                  }`}
                >
                  <CheckSquare className="w-3 h-3" />
                  <span>{lang === 'id' ? 'Tugas' : 'Tasks'} ({taskResults.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSearchFilter('finance')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    activeSearchFilter === 'finance'
                      ? palette.chipActive
                      : palette.chipInactive
                  }`}
                >
                  <Wallet className="w-3 h-3" />
                  <span>{lang === 'id' ? 'Keuangan' : 'Finance'} ({financeResults.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSearchFilter('mood')}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                    activeSearchFilter === 'mood'
                      ? palette.chipActive
                      : palette.chipInactive
                  }`}
                >
                  <Heart className="w-3 h-3" />
                  <span>{lang === 'id' ? 'Mood' : 'Mood'} ({moodResults.length})</span>
                </button>
              </div>
            </div>

            {/* Results Grid / Empty State */}
            {filteredResults.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-16 text-center space-y-3 rounded-3xl p-6 border ${palette.cardHero} ${palette.cardHeroBorder}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${palette.avatarBg} ${palette.avatarBorder}`}>
                  <SearchIcon className={`w-6 h-6 ${palette.subText}`} />
                </div>
                <h3 className={`text-sm font-bold ${palette.titleText}`}>
                  {lang === 'id' ? 'Tidak Ada Hasil Ditemukan' : 'No Results Found'}
                </h3>
                <p className={`text-xs max-w-sm ${palette.subText}`}>
                  {lang === 'id' 
                    ? `Tidak ada data yang cocok dengan "${trimmedQuery}". Coba kata kunci lain.`
                    : `No items matched "${trimmedQuery}". Try another query.`}
                </p>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${palette.actionBtn} ${palette.actionBtnHover} ${palette.actionBtnBorder}`}
                >
                  {lang === 'id' ? 'Kembali ke Dashboard' : 'Back to Dashboard'}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Top Recommended Result Highlight (Direct 1-Click / Enter jump) */}
                {filteredResults[0] && (
                  <div
                    onClick={() => handleSelectResult(filteredResults[0])}
                    className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-slate-900/90 border-2 border-indigo-500/60 hover:border-indigo-400 transition-all cursor-pointer group shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center shrink-0 text-indigo-300 shadow-inner">
                        {React.createElement(filteredResults[0].icon || FileText, { className: 'w-5 h-5' })}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500 text-[10px] font-black uppercase tracking-wider text-white shadow-sm flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            <span>{lang === 'id' ? 'Hasil Teratas' : 'Top Match'}</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[9px] font-bold text-slate-400 border border-slate-700/50">
                            {lang === 'id' ? filteredResults[0].categoryLabel.id : filteredResults[0].categoryLabel.en}
                          </span>
                          {filteredResults[0].dateOrInfo && (
                            <span className="text-[9px] font-mono text-slate-400">
                              {filteredResults[0].dateOrInfo}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-indigo-200 transition-colors truncate">
                          {filteredResults[0].title}
                        </h3>
                        {filteredResults[0].description && (
                          <p className="text-xs text-slate-300 line-clamp-1 mt-0.5">
                            {filteredResults[0].description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectResult(filteredResults[0]);
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        <span>{lang === 'id' ? 'Buka Sekarang (Enter ↵)' : 'Open Now (Enter ↵)'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* All Search Results Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredResults.map((item, idx) => {
                    const IconComp = item.icon || FileText;
                    const isNote = item.providerId === 'notes';
                    const isTask = item.providerId === 'tasks';
                    const isFinance = ['finance', 'debt', 'debts', 'savings'].includes(item.providerId);
                    const isFeature = item.providerId === 'features';
                    const isMood = item.providerId === 'mood' || item.providerId === 'moods';
                    const isTop = idx === 0;

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectResult(item)}
                        className={`flex items-start gap-3.5 p-3.5 rounded-2xl transition-all cursor-pointer group shadow-sm border ${palette.searchResultCard} ${palette.searchResultCardBorder} ${palette.searchResultCardHover}`}
                      >
                        {isTask && item.rawItem ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTask(item.rawItem.id);
                            }}
                            className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                              item.rawItem.completed 
                                ? 'bg-emerald-500 border-emerald-400 text-zinc-950' 
                                : `${palette.actionBtnBorder} ${palette.actionBtn}`
                            }`}
                          >
                            {item.rawItem.completed && <CheckSquare className="w-3.5 h-3.5 stroke-[3]" />}
                          </button>
                        ) : (
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${palette.searchResultIconBg}`}>
                            <IconComp className="w-4 h-4" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1.5 mb-1">
                            <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${palette.searchResultBadge}`}>
                              {lang === 'id' ? item.categoryLabel.id : item.categoryLabel.en}
                            </span>
                            {item.dateOrInfo && (
                              <span className={`text-[9px] font-mono truncate ${palette.subText}`}>
                                {item.dateOrInfo}
                              </span>
                            )}
                          </div>

                          <h4 className={`text-xs sm:text-sm font-bold transition-colors truncate ${palette.searchResultTitle}`}>
                            {item.title}
                          </h4>

                          {item.description && (
                            <p className={`text-[11px] line-clamp-1 mt-0.5 ${palette.searchResultDesc}`}>
                              {item.description}
                            </p>
                          )}

                          <div className={`flex items-center justify-between gap-1 mt-2 pt-1.5 border-t text-[10px] font-semibold ${palette.headerBorder} ${palette.subText}`}>
                            <span className="flex items-center gap-0.5 group-hover:underline">
                              {isNote && (lang === 'id' ? 'Buka Catatan' : 'Open Note')}
                              {isTask && (lang === 'id' ? 'Buka Tugas' : 'Open Task')}
                              {isFinance && (lang === 'id' ? 'Buka Keuangan' : 'Open Finance')}
                              {isFeature && (lang === 'id' ? 'Buka Fitur' : 'Open Feature')}
                              {isMood && (lang === 'id' ? 'Buka Kalender' : 'Open Calendar')}
                              <ArrowUpRight className="w-2.5 h-2.5" />
                            </span>
                            {item.badge && (
                              <span className={`text-[9px] font-mono ${palette.subText}`}>{item.badge}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Regular Dashboard Layout (Shown when not searching or below search results) */}
        {trimmedQuery.length === 0 && (
        <div className={`${isLite ? 'flex flex-col' : 'grid grid-cols-1 md:grid-cols-12'} gap-6 items-start`}>
          
          {/* Left Column: Profile, Challenge, Mood, Discipline */}
          <div className={`${isLite ? 'w-full' : 'md:col-span-7'} space-y-6`}>
        {isLite ? (
          <div className={`relative w-full border rounded-3xl p-4 sm:p-5 mb-4 flex flex-row items-center justify-between shadow-xs ${palette.cardHero} ${palette.cardHeroBorder}`}>
            <div className="flex gap-3 sm:gap-4 items-center min-w-0 flex-1 relative z-10">
              {currentUser.avatarUrl === 'indexeddb:user_avatar' ? (
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border shadow-xs shrink-0 animate-pulse ${palette.avatarBg} ${palette.avatarBorder}`}>
                  </div>
              ) : currentUser.avatarUrl ? (
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border shadow-xs shrink-0 ${palette.avatarBorder}`}>
                    <img src={currentUser.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  </div>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className={`text-[11px] sm:text-xs font-bold tracking-wider uppercase mb-1 ${palette.greetingText}`}>{getGreeting()}</p>
                <h2 className={`text-base sm:text-lg font-black tracking-tight leading-none truncate ${palette.titleText}`}>{t('focusToday')}</h2>
              </div>
            </div>
            {/* Minimal Streak Badge */}
            <div 
              onClick={() => setShowStreakSplash(true)}
              className={`flex items-center gap-2 rounded-2xl px-2.5 py-1.5 cursor-pointer transition-all hover:scale-[1.02] shadow-xs relative z-10 w-fit shrink-0 border ${palette.streakCard} ${palette.streakBorder}`}
              title={completedCount === 0 ? (lang === 'id' ? '0 hari (Padam - belum ada tugas selesai hari ini)' : '0 days (Extinguished - no task done today)') : `${frontStreak} hari berturut-turut!`}
            >
              <LiteStickerIcon variant="flame" size="xs" />
              <div className="flex flex-col leading-none pr-0.5">
                <span className={`text-xs font-black ${completedCount === 0 ? palette.subText : palette.streakText}`}>{frontStreak}</span>
              </div>
            </div>
          </div>
        ) : (
          <div 
            style={bannerWallpaper ? { backgroundImage: `url(${bannerWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            className={`relative w-full rounded-[2rem] p-6 sm:p-8 flex flex-col justify-between mb-8 overflow-hidden ${
              bannerWallpaper 
                ? "text-white shadow-md cursor-pointer select-none" 
                : `${palette.cardHero} ${palette.cardHeroBorder} ${palette.titleText} shadow-sm border`
            }`}
            onDoubleClick={() => {
              if (bannerWallpaper) {
                setCropperImageSrc(bannerWallpaper);
                setShowCropperModal(true);
              }
            }}
            title={bannerWallpaper ? (lang === 'id' ? 'Ketuk 2x untuk memotong / mengatur posisi foto' : 'Double click to crop / reposition photo') : undefined}
          >
            {bannerWallpaper && (
              <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-[0.5px] z-0 pointer-events-none" />
            )}
            {/* Subtle decoration elements */}
            {!bannerWallpaper && (
              <>
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-500/5 rounded-full pointer-events-none" />
              </>
            )}
            
            <div className="relative z-10 flex justify-between items-center mb-6 gap-2 sm:gap-3">
              <div className="flex gap-2 sm:gap-4 items-center flex-1 min-w-0">
                {currentUser.avatarUrl === 'indexeddb:user_avatar' ? (
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 border-white/30 shadow-md shrink-0 bg-slate-800/50 animate-pulse">
                  </div>
                ) : currentUser.avatarUrl ? (
                  <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl overflow-hidden border-2 border-white/30 shadow-md shrink-0">
                    <img src={currentUser.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  </div>
                ) : null}

                <div className="flex-1 min-w-0">
                  <p className={`text-[11px] sm:text-xs font-bold tracking-wider uppercase mb-1 ${bannerWallpaper ? "text-indigo-100 drop-shadow-sm" : palette.subText}`}>{getGreeting()}</p>
                  <h2 className={`text-xl sm:text-3xl font-black mb-0.5 sm:mb-1 tracking-tight truncate ${bannerWallpaper ? "text-white drop-shadow-sm" : palette.titleText}`}>{t('focusToday')}</h2>
                  <p className={`text-xs sm:text-sm font-medium mt-1 sm:mt-2 flex items-center gap-1.5 sm:gap-2 ${bannerWallpaper ? "text-indigo-50" : palette.subText}`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-300 shadow-[0_0_8px_rgba(253,224,71,0.8)]"></span>
                    <span className="truncate">{activeTasksCount} {t('remainingTask')}</span>
                  </p>
                </div>
              </div>
              
              {/* Streak Badge */}
              <div 
                onClick={() => setShowStreakSplash(true)}
                className={`flex-none flex flex-col items-center justify-center rounded-2xl px-3 py-2 sm:px-5 sm:py-4 cursor-pointer transition-all hover:scale-105 shadow-sm ${
                  bannerWallpaper 
                    ? "bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20" 
                    : `${palette.streakCard} ${palette.streakBorder} border`
                }`} 
                title={completedCount === 0 ? (lang === 'id' ? '0 hari (Padam - belum ada tugas selesai hari ini)' : '0 days (Extinguished - no tasks finished today)') : `${frontStreak} hari berturut-turut!`}
              >
                <Flame className={`w-5 h-5 sm:w-6 sm:h-6 drop-shadow-sm mb-1 ${completedCount === 0 ? 'text-slate-500 fill-slate-500/50' : 'text-orange-400 fill-orange-400'}`} />
                <span className={`text-lg sm:text-xl font-black leading-none mb-0.5 sm:mb-1 ${bannerWallpaper ? "text-white" : (completedCount === 0 ? palette.subText : palette.titleText)}`}>{frontStreak}</span>
                <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${bannerWallpaper ? "text-indigo-100 opacity-90" : palette.subText}`}>
                  {completedCount === 0 ? (lang === 'id' ? 'Padam' : 'Extinguished') : 'Streak'}
                </span>
              </div>
            </div>
            
            <div className="relative z-10 w-full">
              <div className="flex justify-between items-end mb-3">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${bannerWallpaper ? "text-indigo-100" : palette.subText}`}>Progress</span>
                <span className={`text-xs font-black ${bannerWallpaper ? "text-white" : palette.titleText}`}>{progressPercent}%</span>
              </div>
              <div className={`h-2.5 w-full rounded-full overflow-hidden shadow-inner ${bannerWallpaper ? "bg-black/20" : palette.progressBarTrack}`}>
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ type: 'spring', stiffness: 100, damping: 15, mass: 1, delay: 0.1 }}
                  className={`h-full rounded-full ${bannerWallpaper ? "bg-white" : palette.progressBarFill}`} 
                  id="tata-lite-progress"
                />
              </div>
            </div>
          </div>
        )}

        {/* Daily Motivation & Discipline Card */}
        {!hideChallenge && !isLite && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            whileHover={{ scale: 1.01 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`mb-8 mt-2 p-5 sm:p-6 rounded-3xl border shadow-lg relative group mx-1 sm:mx-2 overflow-hidden ${palette.quoteCard} ${palette.quoteBorder}`}
          >
            {/* Ambient accent background glow */}
            <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${palette.quoteBadge}`}>
                    {currentQuote.icon === 'zap' && <Zap className="w-4 h-4 text-amber-400 shrink-0" />}
                    {currentQuote.icon === 'shield' && <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />}
                    {currentQuote.icon === 'flame' && <Flame className="w-4 h-4 text-orange-400 shrink-0" />}
                    {currentQuote.icon === 'target' && <Target className="w-4 h-4 text-indigo-400 shrink-0" />}
                    {currentQuote.icon === 'sparkles' && <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />}
                  </div>
                  <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${palette.quoteBadge}`}>
                    {lang === 'id' ? currentQuote.category : currentQuote.categoryEn}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 mr-7">
                  <button
                    onClick={handleNextQuote}
                    className={`p-1.5 rounded-xl transition-all active:scale-95 flex items-center gap-1 text-xs cursor-pointer ${palette.quoteBtn}`}
                    title={lang === 'id' ? 'Ganti Pesan' : 'Next Quote'}
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span className="hidden xs:inline text-[10px] font-semibold">{lang === 'id' ? 'Ganti' : 'Shuffle'}</span>
                  </button>
                </div>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div
                  key={quoteIdx}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18 }}
                  className={`p-4 rounded-2xl border ${palette.quoteInner} ${palette.quoteInnerBorder}`}
                >
                  <p className={`font-semibold text-sm sm:text-[15px] leading-relaxed italic ${palette.quoteText}`}>
                    "{lang === 'id' ? currentQuote.quoteId : currentQuote.quoteEn}"
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <button 
              onClick={handleHideChallenge}
              className={`absolute right-3.5 top-3.5 w-7 h-7 flex items-center justify-center rounded-full shadow-sm transition-transform hover:scale-110 z-30 cursor-pointer ${palette.actionBtn} ${palette.actionBtnHover} ${palette.actionBtnBorder}`}
              title={lang === 'id' ? 'Tutup Pesan' : 'Dismiss Message'}
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
          </motion.div>
        )}

        {/* Mood Tracker */}
        <div className={`mb-6 rounded-2xl border p-4 shadow-xs ${palette.moodCard} ${palette.moodBorder}`}>
          <div className="flex justify-between items-center mb-3">
            <h3 className={`text-xs font-bold flex items-center gap-2 ${palette.moodTitle}`}>
              {t('dailyMood') || 'Mood Hari Ini'}
            </h3>
          </div>
          <div className="flex items-center justify-between gap-1 xs:gap-1.5 sm:gap-2">
            {[
              { id: 'excellent', label: 'Sangat Baik', colors: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20' },
              { id: 'good', label: 'Baik', colors: 'bg-teal-500/10 text-teal-400 border-teal-500/30 hover:bg-teal-500/20' },
              { id: 'neutral', label: 'Biasa', colors: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20' },
              { id: 'bad', label: 'Buruk', colors: 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20' },
              { id: 'terrible', label: 'Sangat Buruk', colors: 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20' }
            ].map(m => {
              const currentMood = (moods || []).find(x => x && x.date === todayStr)?.mood;
              const isSelected = currentMood === m.id;
              const notSelectedOpacity = currentMood && !isSelected ? 'opacity-50 grayscale hover:grayscale-0 hover:opacity-100' : '';
              
              if (isLite) {
                return (
                  <button
                    key={m.id}
                    onClick={() => setMood(todayStr, m.id as any)}
                    className={`flex-1 flex flex-col items-center justify-center py-2 px-1 rounded-2xl transition-all cursor-pointer ${
                      isSelected ? `${palette.moodBtnActive} scale-105 font-bold` : `${palette.moodBtnHover}`
                    } ${notSelectedOpacity}`}
                    title={m.label}
                  >
                    <div className={`${isSelected ? 'mb-1 scale-105' : 'opacity-85'} transition-all duration-200`}>
                      <LiteStickerIcon 
                        variant={`mood-${m.id}` as any} 
                        size="xs" 
                        active={isSelected} 
                      />
                    </div>
                    {isSelected && <span className={`text-[8px] xs:text-[9px] font-black whitespace-nowrap uppercase tracking-wider truncate max-w-full px-0.5 mt-0.5 ${palette.moodLabelActive}`}>{m.label}</span>}
                  </button>
                );
              }

              return (
                <button
                  key={m.id}
                  onClick={() => setMood(todayStr, m.id as any)}
                  className={`flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all ${isSelected ? m.colors + ' shadow-sm scale-105 font-bold' : 'text-slate-500 hover:bg-slate-800'} ${notSelectedOpacity}`}
                  title={m.label}
                >
                  <div className={`${isSelected ? 'mb-0.5' : ''} transition-all duration-300`}>{getMoodIcon(m.id, isSelected ? "w-5 h-5" : "w-4 h-4")}</div>
                  {isSelected && <span className="text-[8px] xs:text-[9px] font-bold whitespace-nowrap text-current uppercase tracking-wider truncate max-w-full px-0.5">{m.label}</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Disiplin */}
        {disciplineTask && (() => {
          const d = disciplineTask.disciplineData || {};
          const checkins = d.dailyCheckins || [];
          const rests = d.usedRestDates || [];
          const allDone = new Set([...checkins, ...rests]);
          const totalDone = allDone.size;
          const isCheckedIn = disciplineTask.completed || checkins.includes(todayStr) || rests.includes(todayStr);

          let daysLeftInfo = '';
          let isTargetDone = false;
          if (d.targetDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const target = new Date(d.targetDate);
            target.setHours(0, 0, 0, 0);
            const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
            if (diff <= 0) {
              isTargetDone = true;
              daysLeftInfo = lang === 'id' ? 'Target Selesai' : 'Goal Completed';
            } else {
              daysLeftInfo = lang === 'id' ? `Sisa ${diff} hari` : `${diff} days left`;
            }
          }

          return (
            <section className={`mb-5 border p-5 rounded-3xl shadow-xs relative overflow-hidden group cursor-pointer ${palette.disciplineCard} ${palette.disciplineBorder}`} onClick={() => onNavigate('tasks')}>
              <div className="absolute -top-10 -right-10 p-6 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity rotate-12 pointer-events-none">
                <Target className="w-40 h-40 text-indigo-400" />
              </div>
              
              <div className="flex justify-between items-center mb-4 relative z-10">
                 <h3 className={`text-lg font-black flex items-center gap-2 ${palette.disciplineTitle}`}>
                    <Target className={`w-5 h-5 text-indigo-400 drop-shadow-sm`} />
                    {lang === 'id' ? 'Target Disiplin' : 'Discipline Target'}
                 </h3>
                 <div className="flex items-center gap-2">
                   {daysLeftInfo && (
                     <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                       isTargetDone
                         ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                         : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                     }`}>
                       {daysLeftInfo}
                     </span>
                   )}
                   <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${palette.disciplineBadge}`}>
                     {lang === 'id' ? 'Fokus' : 'Focus'}
                   </span>
                 </div>
              </div>
              
              <div className={`relative z-10 border rounded-2xl p-4 flex items-center gap-4 ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}>
                 <div className={`flex-1 min-w-0 ${isCheckedIn ? 'opacity-70' : ''}`}>
                    <h4 className={`text-base font-bold ${isCheckedIn ? `${palette.subText} opacity-70` : palette.disciplineTitle} leading-snug break-words whitespace-pre-wrap`}>
                      {disciplineTask.title}
                    </h4>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${palette.subText}`}>
                        <Flame className="w-3 h-3 text-orange-400" /> 
                        {totalDone} {lang === 'id' ? 'Hari Selesai' : 'Days Done'}
                      </span>
                      {disciplineTask.disciplineData?.targetDate && (
                        <span className={`text-[10px] font-mono flex items-center gap-1 ${palette.subText}`}>
                           • Target: {disciplineTask.disciplineData.targetDate}
                        </span>
                      )}
                    </div>
                 </div>
                 
                 <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleTask(disciplineTask.id);
                    }}
                    className={`flex-none px-3.5 py-2 rounded-xl font-bold text-[11px] transition-all cursor-pointer ${
                      isCheckedIn
                        ? palette.disciplineBtnDone
                        : `${palette.disciplineBtnAction} active:scale-95`
                    }`}
                  >
                    {isCheckedIn
                      ? (lang === 'id' ? 'Selesai' : 'Done') 
                      : (lang === 'id' ? 'Check-in' : 'Check-in')}
                 </button>
              </div>
            </section>
          );
        })()}

          </div>

          {/* Right Column: Prioritas Utama */}
          <div className={`${isLite ? 'w-full' : 'md:col-span-5'} space-y-6`}>
            {/* Prioritas Utama */}
            <section className={`mb-5 border p-5 rounded-3xl shadow-xs ${palette.cardHero} ${palette.cardHeroBorder}`}>
          <div className="flex justify-between items-center mb-4">
             <h3 className={`text-lg font-black flex items-center gap-2 ${palette.titleText}`}>
                <Pin className={`w-5 h-5 text-orange-400 fill-orange-400 drop-shadow-sm`} />
                {t('topPriority')}
             </h3>
             <button onClick={() => { onNavigate('tasks'); }} className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full transition-colors ${palette.actionBtn} ${palette.actionBtnHover}`}>{t('allTasks') || 'Semua'}</button>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            {pinnedNotes.length === 0 && pinnedTasks.length === 0 && (
              <p className={`text-[11px] font-medium p-4 text-center ${palette.subText}`}>
                {t('noPriority')}
              </p>
            )}

            {pinnedTasks.length > 0 && (
              <div className={`border rounded-2xl p-4 flex flex-col gap-2 mb-2 ${palette.streakCard} ${palette.streakBorder}`}>
                 <h4 className={`text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-1 ${palette.subText}`}><CheckSquare className="w-2.5 h-2.5" /> {t('priorityTasks')}</h4>
                 {pinnedTasks.map((task, i) => (
                   <div key={task.id} className={`flex items-start gap-2.5 group ${palette.isDark ? 'border-slate-800/40' : 'border-black/10'} pb-2 cursor-pointer ${i === pinnedTasks.length - 1 ? '' : 'border-b mt-1.5 -mb-1'}`} onClick={() => toggleTask(task.id)}>
                     <div className="p-3 -ml-3 rounded-full flex-none flex items-center justify-center transition-colors">
                       <button className={`w-5 h-5 rounded-[6px] border-2 flex items-center justify-center flex-none transition-colors ${task.completed ? 'border-indigo-500 bg-indigo-500' : `${palette.actionBtnBorder} group-hover:border-indigo-500`}`}>
                         {task.completed && <div className="w-2 h-2 rounded-[2px] bg-white" />}
                       </button>
                     </div>
                     <div className={`flex-1 min-w-0 ${task.completed ? 'opacity-50' : ''}`}>
                        <h4 className={`text-sm font-medium ${task.completed ? `${palette.subText} line-through` : palette.titleText} break-words whitespace-pre-wrap leading-snug`}>{task.title}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className={`text-[10px] font-mono flex items-center gap-1 ${palette.subText}`}>
                            <span>{task.date && task.date.includes('-') && task.date !== new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0] ? `${task.date} • ` : ''}{task.time}</span>
                            {task.alarmTime && (
                              <span className={`flex items-center gap-0.5 ml-1 px-1 py-0.5 rounded font-bold ${palette.actionBtn}`}>
                                <Bell className="w-2.5 h-2.5" />
                                {task.alarmTime}
                              </span>
                            )}
                          </p>
                        </div>
                     </div>
                     <button 
                       onClick={(e) => { e.stopPropagation(); updateTask({ ...task, pinned: false }); }} 
                       className={`p-3 -mr-2 flex-shrink-0 ${palette.subText} hover:text-amber-400 transition-colors flex items-center justify-center`}
                       title={lang === 'id' ? 'Lepas dari Prioritas Utama' : 'Remove from Top Priority'}
                     >
                       <X className="w-5 h-5" />
                     </button>
                   </div>
                 ))}
              </div>
            )}

            {pinnedNotes.length > 0 && (
              <div className="flex flex-col gap-3 mt-1">
                 <h4 className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ml-1 ${palette.subText}`}><FileText className="w-3 h-3" /> {t('priorityNotes')}</h4>
                {pinnedNotes.map((note) => {
                  const firstImage = note.thumbnailUrl || extractFirstImageUrl(note.content);
                  const cleanText = note.content ? note.content.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>?/gm, '').replace(/&nbsp;?/gi, ' ').replace(/&bnsp;?/gi, ' ').replace(/\s+/g, ' ').trim() : '';
                  const displayTitle = note.title || (firstImage ? (lang === 'id' ? 'Catatan Foto' : 'Photo Note') : (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note'));

                  return (
                    <div 
                      key={note.id} 
                      onClick={() => onOpenNote(note)}
                      role="button"
                      className={`w-full text-left flex flex-col items-start gap-3 p-4 rounded-2xl transition-all cursor-pointer group border ${palette.noteCard} ${palette.noteCardBorder} ${palette.noteCardHoverBorder}`}
                    >
                      {firstImage && (
                        <div className="relative w-full h-32 rounded-xl overflow-hidden bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10">
                          <img
                            src={firstImage}
                            alt="Photo Preview"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                          <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold flex items-center gap-1">
                            <Camera size={10} />
                            <span>{lang === 'id' ? 'Foto' : 'Photo'}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex-1 overflow-hidden w-full min-w-0 flex flex-col">
                         <div className="flex justify-between items-start mb-2">
                            <div className="flex gap-1 overflow-x-hidden min-w-0" onClick={(e) => e.stopPropagation()}>
                              {(note.tags || []).slice(0,2).map(tag => (
                                <span key={tag} onClick={(e) => {
                                   e.stopPropagation();
                                   setSearchQuery(tag);
                                   onNavigate('search');
                                }} className="px-2 py-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-colors text-[9px] font-bold rounded uppercase tracking-wider cursor-pointer truncate max-w-full">{tag.replace('#', '')}</span>
                              ))}
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                               {note.sharedWithAI && (
                                 <span className="px-1.5 py-0.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[9px] font-bold rounded flex items-center gap-1 animate-pulse" title={lang === 'id' ? 'Telah masuk Tata AI' : 'Shared with Tata AI'}>
                                   <Bot size={10} />
                                   <span>AI</span>
                                 </span>
                               )}
                               <span className={`text-[10px] font-mono ${palette.subText}`}>{note.date}</span>
                               <button 
                                 type="button"
                                 onClick={(e) => { 
                                   e.stopPropagation(); 
                                   updateNote({ ...note, pinned: false }); 
                                 }} 
                                 className={`p-1.5 -mr-1 rounded-lg ${palette.subText} hover:text-amber-400 transition-colors flex items-center justify-center cursor-pointer`}
                                 title={lang === 'id' ? 'Lepas dari Prioritas Utama' : 'Remove from Top Priority'}
                               >
                                 <X className="w-4 h-4" />
                               </button>
                             </div>
                         </div>
                         <h4 className={`font-bold leading-tight mb-1 truncate w-full flex items-center gap-1.5 ${palette.noteCardText}`}>
                             {note.sharedWithAI && <Bot className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                             {note.isLocked && <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                             <span>{displayTitle}</span>
                          </h4>
                         {note.isLocked ? (
                           <p className="text-xs text-amber-400/90 font-semibold flex items-center gap-1 my-1">
                             <Lock size={12} />
                             <span>{lang === 'id' ? 'Catatan Terkunci PIN' : 'Locked with PIN'}</span>
                           </p>
                         ) : (
                           <p className={`text-xs line-clamp-2 break-words ${palette.noteCardSub}`}>
                             {cleanText || (firstImage ? (lang === 'id' ? '📸 [Berisi Foto]' : '📸 [Contains Photo]') : '...')}
                           </p>
                         )}
                         {note.reminder && (
                           <div className="flex items-center gap-1.5 mt-2.5 px-2 py-0.5 bg-indigo-500/10 border border-indigo-500/10 rounded-md w-fit text-indigo-400 text-[10px] font-bold">
                             <Bell className="w-3 h-3 text-indigo-400 animate-pulse" />
                             <span>{formatReminderDate(note.reminder, lang)}</span>
                           </div>
                         )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
          </div>
        </div>
        )}

        {/* Google AdSense Banner (Visible only for Free/Lite Tier) */}
        <AdBanner className="mt-6 mb-8" />
      </div>

      {/* FAB Add */}
      <button 
        onClick={handleCreateNote} 
        className={`absolute bottom-8 right-6 w-12 h-12 sm:w-16 sm:h-16 flex items-center justify-center shadow-xl transition-transform active:scale-95 z-50 cursor-pointer ${
          isLite 
            ? 'bg-[#22c55e] border-2 border-white shadow-[0_4px_16px_rgba(34,197,94,0.45)] rounded-2xl text-[#052e16] hover:bg-[#16a34a] hover:text-white' 
            : 'bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] shadow-indigo-600/30'
        }`}
        title={lang === 'id' ? 'Buat Catatan Baru' : 'Create New Note'}
      >
        <Plus className={`w-7 h-7 ${isLite ? 'stroke-[3.5]' : 'stroke-[2.5]'}`} />
      </button>



      {/* Notification Modal */}
      <NotificationModal 
        isOpen={showNotificationModal} 
        onClose={() => setShowNotificationModal(false)} 
        onNavigate={onNavigate} 
        onOpenNote={onOpenNote} 
      />

      {/* Image Cropper Modal for Main Box Wallpaper */}
      <ImageCropperModal
        isOpen={showCropperModal}
        imageSrc={cropperImageSrc}
        aspectRatio={2.6}
        title={lang === 'id' ? 'Potong Wallpaper Kotak Utama' : 'Crop Main Box Wallpaper'}
        lang={lang}
        onCancel={() => {
          setShowCropperModal(false);
          setCropperImageSrc(null);
        }}
        onCropComplete={handleBannerCropSave}
      />
    </div>
  );
}

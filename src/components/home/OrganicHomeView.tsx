import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Wallet, 
  Bell, 
  Search, 
  Shuffle, 
  X, 
  Zap, 
  Flame, 
  ArrowRight,
  RefreshCw,
  Plus,
  Target,
  FileText,
  Lock,
  Calendar as CalendarIcon,
  CheckCircle2,
  TrendingUp,
  Tag,
  Clock,
  Pin,
  Compass,
  ArrowUpRight,
  CheckSquare,
  Repeat,
  Bot
} from 'lucide-react';
import { useAppStore } from '../../store';
import { Note, Task } from '../../types';
import { OrganicPottedPlant, OrganicBloomingRose, OrganicFlowerBlossom, OrganicFabRoseFlower } from './OrganicBotanicals';
import { Organic3DMoodAvatar, OrganicMoodType } from './Organic3DMoodAvatar';
import {
  Icon3DTataAI,
  Icon3DWallet,
  Icon3DBell,
  Icon3DSearch,
  Icon3DFlame,
  Icon3DBulbZap,
  Icon3DTaskChecked,
  Icon3DTaskUnchecked,
  Icon3DFabPlus,
  Icon3DTarget,
  Icon3DNavNotes,
  Icon3DGift,
  Icon3DClock
} from './Organic3DIcons';
import NotificationModal from '../NotificationModal';
import { buildAllNotifications, NotificationItem } from '../../utils/notifications';
import { executeUniversalSearch, SearchResultItem } from '../../services/searchEngine';
import { getOrganicThemePalette } from './organicThemePalettes';
import OrganicStreakModal from './OrganicStreakModal';
import { getLargeItem, getLargeItemSync } from '../../utils/db';

interface OrganicHomeProps {
  appTheme?: string;
  onOpenNote: (note: Note) => void;
  onNavigate: (screen: any, extra?: any) => void;
  setSearchQuery?: (q: string) => void;
  searchQuery?: string;
  onRefreshQuote?: () => void;
  activeQuote: { text: string; author: string; category?: string };
  onCloseQuote?: () => void;
  showQuoteCard?: boolean;
}

export function OrganicHomeView({
  appTheme,
  onOpenNote,
  onNavigate,
  setSearchQuery,
  searchQuery: externalSearchQuery = '',
  onRefreshQuote,
  activeQuote,
  onCloseQuote,
  showQuoteCard = true,
}: OrganicHomeProps) {
  const store = useAppStore();
  const { 
    lang, 
    user, 
    tasks, 
    streak, 
    journeyDay,
    journeyStartDate,
    toggleTask, 
    updateTask,
    checkInDaily,
    moods,
    setMood,
    notes,
    addNote,
    updateNote,
    transactions,
    debts,
    tataAccount,
    isAccountPremium,
    savingsBalance,
    savingsTarget,
    handleRefreshApp,
    isRefreshing
  } = store;

  const [localSearchQuery, setLocalSearchQuery] = useState(externalSearchQuery || '');
  const [selectedSearchCategory, setSelectedSearchCategory] = useState<string>('all');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Sync external search query if provided
  useEffect(() => {
    if (externalSearchQuery !== undefined) {
      setLocalSearchQuery(externalSearchQuery);
    }
  }, [externalSearchQuery]);

  const handleUpdateSearch = (q: string) => {
    setLocalSearchQuery(q);
    if (setSearchQuery) {
      setSearchQuery(q);
    }
  };

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search, and Escape to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape' && localSearchQuery) {
        e.preventDefault();
        handleUpdateSearch('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localSearchQuery]);

  const [bannerWallpaper, setBannerWallpaper] = useState<string | null>(() => getLargeItemSync("tata_banner_wallpaper"));

  useEffect(() => {
    getLargeItem('tata_banner_wallpaper').then(setBannerWallpaper);
    const handleBannerWallpaperChange = () => {
      getLargeItem('tata_banner_wallpaper').then(setBannerWallpaper);
    };
    window.addEventListener('tata_banner_wallpaper_changed', handleBannerWallpaperChange);
    return () => window.removeEventListener('tata_banner_wallpaper_changed', handleBannerWallpaperChange);
  }, []);

  // Dynamic Notifications calculation with real-time detection
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const refreshNotifs = useCallback(() => {
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
    setNotifications(list);
  }, [notes, tasks, transactions, debts, lang, streak, tataAccount, isAccountPremium, savingsBalance, savingsTarget, moods]);

  useEffect(() => {
    refreshNotifs();
    const handleNotifChanged = () => refreshNotifs();
    window.addEventListener('tata_notifications_changed', handleNotifChanged);
    return () => window.removeEventListener('tata_notifications_changed', handleNotifChanged);
  }, [refreshNotifs]);

  // Dynamic Theme Palette: ensures cool (blue), dark, pink, cute, simple, light, and organic
  // apply cohesive container and card colors matching the user's selected theme
  const palette = useMemo(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : null;
    const effectiveTheme = appTheme || storedTheme || 'organic';
    return getOrganicThemePalette(effectiveTheme);
  }, [appTheme]);

  const notificationCount = notifications.length;

  // Universal Search Execution
  const searchResults: SearchResultItem[] = useMemo(() => {
    const trimmed = localSearchQuery.trim();
    if (!trimmed) return [];
    return executeUniversalSearch(trimmed, store, lang);
  }, [store, lang, localSearchQuery]);

  const filteredSearchResults = useMemo(() => {
    if (selectedSearchCategory === 'all') return searchResults;
    return searchResults.filter(item => {
      if (selectedSearchCategory === 'features') return item.providerId === 'features';
      if (selectedSearchCategory === 'notes') return item.providerId === 'notes';
      if (selectedSearchCategory === 'tasks') return item.providerId === 'tasks';
      if (selectedSearchCategory === 'finance') return item.providerId === 'finance';
      if (selectedSearchCategory === 'mood') return item.providerId === 'mood';
      return true;
    });
  }, [searchResults, selectedSearchCategory]);

  const todayStr = useMemo(() => {
    return new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  }, []);

  const currentTodayMood = useMemo(() => {
    return moods.find(m => m.date === todayStr);
  }, [moods, todayStr]);

  const getInitialActiveMood = (): OrganicMoodType | null => {
    if (!currentTodayMood?.mood) return null;
    if (currentTodayMood.mood === 'excellent') return 'great';
    if (['great', 'good', 'neutral', 'bad', 'terrible'].includes(currentTodayMood.mood)) {
      return currentTodayMood.mood as OrganicMoodType;
    }
    return 'neutral';
  };

  const [activeMoodSelected, setActiveMoodSelected] = useState<OrganicMoodType | null>(getInitialActiveMood);
  const [isQuoteDismissed, setIsQuoteDismissed] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);

  // Synchronize mood with store changes
  useEffect(() => {
    setActiveMoodSelected(getInitialActiveMood());
  }, [currentTodayMood?.mood]);

  // 1. Discipline Task Filter
  const disciplineTask = useMemo(() => {
    return tasks.find(t => t.isDiscipline && !t.deleted);
  }, [tasks]);

  // Full Discipline Check-in with Daily Checkins & Streak Updates
  const isDisciplineCheckedInToday = Boolean(
    disciplineTask && (
      disciplineTask.disciplineData?.dailyCheckins?.includes(todayStr) ||
      disciplineTask.disciplineData?.usedRestDates?.includes(todayStr) ||
      disciplineTask.completed
    )
  );

  // 2. Regular Tasks & Progress Calculation
  const regularTasks = useMemo(() => {
    return tasks.filter(t => !t.deleted && !t.isDiscipline);
  }, [tasks]);

  const completedRegularCount = regularTasks.filter(t => t.completed).length;
  const completedCount = completedRegularCount + (isDisciplineCheckedInToday ? 1 : 0);
  const totalCount = regularTasks.length + (disciplineTask ? 1 : 0);
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const organicDay = journeyDay || 1;
  const frontStreak = completedCount === 0 ? 0 : Math.max(1, streak);

  // 3. Pinned Tasks & Pinned Notes (Top Priority)
  const pinnedTasks = useMemo(() => {
    return tasks.filter(t => !t.deleted && !t.isDiscipline && t.pinned);
  }, [tasks]);

  const pinnedNotes = useMemo(() => {
    return notes.filter(n => !n.isArchived && n.pinned);
  }, [notes]);

  const getUserName = () => {
    if (user?.name && user.name.trim()) {
      return user.name.toUpperCase();
    }
    return lang === 'id' ? 'SOBAT TATA' : 'FRIEND';
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (lang === 'id') {
      if (hr < 11) return 'SELAMAT PAGI';
      if (hr < 15) return 'SELAMAT SIANG';
      if (hr < 18) return 'SELAMAT SORE';
      return 'SELAMAT MALAM';
    } else {
      if (hr < 12) return 'GOOD MORNING';
      if (hr < 17) return 'GOOD AFTERNOON';
      return 'GOOD EVENING';
    }
  };

  const handleMoodClick = (val: 'great' | 'good' | 'neutral' | 'bad' | 'terrible') => {
    setActiveMoodSelected(val);
    const moodMapping: Record<string, any> = {
      great: 'excellent',
      good: 'good',
      neutral: 'neutral',
      bad: 'bad',
      terrible: 'terrible',
    };
    setMood(todayStr, moodMapping[val] || 'neutral', currentTodayMood?.note || '');
  };

  const disciplineStats = useMemo(() => {
    if (!disciplineTask) return null;
    const d = disciplineTask.disciplineData || {};
    const checkins = d.dailyCheckins || [];
    const rests = d.usedRestDates || [];
    const allDone = new Set([...checkins, ...rests]);
    const totalDone = allDone.size;
    
    let daysRemainingText = '';
    let isTargetFinished = false;
    if (d.targetDate) {
      const today = new Date();
      today.setHours(0,0,0,0);
      const target = new Date(d.targetDate);
      target.setHours(0,0,0,0);
      const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
      if (diff <= 0) {
        isTargetFinished = true;
        daysRemainingText = lang === 'id' ? 'Target Selesai' : 'Goal Completed';
      } else {
        daysRemainingText = lang === 'id' ? `Sisa ${diff} hari lagi` : `${diff} days left`;
      }
    }
    return {
      totalDone,
      daysRemainingText,
      isTargetFinished
    };
  }, [disciplineTask, lang]);

  const handleToggleDisciplineToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!disciplineTask) return;
    toggleTask(disciplineTask.id);
  };

  const handleCreateNewNote = () => {
    const newId = Date.now().toString();
    const newNote: Note = {
      id: newId,
      title: '',
      content: '',
      date: new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
      tags: []
    };
    addNote(newNote);
    onOpenNote(newNote);
  };

  const handleExecuteSearchResult = (item: SearchResultItem) => {
    item.action(onNavigate, {
      openNote: onOpenNote,
      createNote: handleCreateNewNote
    });
  };

  const isSearching = localSearchQuery.trim().length > 0;

  return (
    <div className={`w-full max-w-6xl xl:max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-32 font-sans antialiased ${palette.rootText} ${palette.selection}`}>
      
      {/* 1. TOP ORGANIC HEADER */}
      <header className="flex items-center justify-between py-2 mb-3.5">
        {/* Brand with Leaf icon and sync status */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshApp}
            disabled={isRefreshing}
            className="flex items-center gap-2.5 group cursor-pointer active:scale-95 transition-all text-left"
            title={lang === 'id' ? 'Klik untuk Segarkan Data' : 'Click to Refresh'}
          >
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs ${palette.brandBg} transition-all group-hover:scale-105`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5 text-current">
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
                <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 12" />
              </svg>
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`font-black text-xl tracking-tight ${palette.brandText}`}>TATA</span>
              <RefreshCw size={12} className={`opacity-60 transition-transform ${isRefreshing ? 'animate-spin text-amber-600' : 'group-hover:rotate-180'}`} />
            </div>
          </button>
        </div>

        {/* Right Action Icons in Soft Rounded Pills */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => onNavigate('ai-companion')}
            aria-label="Tata AI"
            title="Tata AI Companion"
            className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-2xl active:scale-95 flex items-center justify-center transition-all shadow-2xs border ${palette.actionBtn} ${palette.actionBtnHover} hover:shadow-xs cursor-pointer`}
          >
            <Icon3DTataAI size={21} />
          </button>
          
          <button 
            onClick={() => onNavigate('finance')}
            aria-label="Keuangan"
            title={lang === 'id' ? 'Keuangan & Kas' : 'Finance'}
            className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-2xl active:scale-95 flex items-center justify-center transition-all shadow-2xs border ${palette.actionBtn} ${palette.actionBtnHover} hover:shadow-xs cursor-pointer`}
          >
            <Icon3DWallet size={21} />
          </button>

          <button 
            onClick={() => setIsNotificationOpen(true)}
            aria-label="Notifikasi"
            title={lang === 'id' ? 'Notifikasi & Pengingat' : 'Notifications & Reminders'}
            className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-2xl active:scale-95 flex items-center justify-center transition-all shadow-2xs border ${palette.actionBtn} ${palette.actionBtnHover} hover:shadow-xs cursor-pointer relative`}
          >
            <Icon3DBell size={21} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-black flex items-center justify-center shadow-xs">
                {notificationCount > 9 ? '9+' : notificationCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* 2. REAL-TIME ORGANIC SEARCH BAR */}
      <div className="w-full mb-5 relative group">
        <div className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full border transition-all shadow-[0_2px_8px_rgba(0,0,0,0.04)] ${
          isSearching ? palette.searchContainerActive : palette.searchContainer
        }`}>
          <Icon3DSearch size={22} className="shrink-0" />
          <input
            ref={searchInputRef}
            type="text"
            value={localSearchQuery}
            onChange={(e) => handleUpdateSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && filteredSearchResults.length > 0) {
                handleExecuteSearchResult(filteredSearchResults[0]);
              }
            }}
            placeholder={lang === 'id' ? 'Cari catatan, tugas, keuangan, atau fitur Tata...' : 'Search notes, tasks, finances, or Tata features...'}
            className={`w-full text-xs sm:text-sm font-medium tracking-tight bg-transparent outline-none ${palette.searchInput}`}
          />
          {localSearchQuery ? (
            <button
              onClick={() => handleUpdateSearch('')}
              className="p-1 rounded-full opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              title={lang === 'id' ? 'Hapus Pencarian' : 'Clear search'}
            >
              <X size={16} />
            </button>
          ) : (
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${palette.searchBadge}`}>
              ⌘K
            </span>
          )}
        </div>
      </div>

      {/* ================= SEARCH RESULTS OR DASHBOARD VIEW ================= */}
      {isSearching ? (
        <div className="w-full space-y-4 animate-in fade-in duration-200">
          
          {/* Search Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { id: 'all', label: lang === 'id' ? 'Semua' : 'All', count: searchResults.length },
              { id: 'features', label: lang === 'id' ? 'Fitur' : 'Features', count: searchResults.filter(r => r.providerId === 'features').length },
              { id: 'notes', label: lang === 'id' ? 'Catatan' : 'Notes', count: searchResults.filter(r => r.providerId === 'notes').length },
              { id: 'tasks', label: lang === 'id' ? 'Tugas' : 'Tasks', count: searchResults.filter(r => r.providerId === 'tasks').length },
              { id: 'finance', label: lang === 'id' ? 'Keuangan' : 'Finance', count: searchResults.filter(r => r.providerId === 'finance').length },
              { id: 'mood', label: lang === 'id' ? 'Mood' : 'Mood', count: searchResults.filter(r => r.providerId === 'mood').length },
            ].map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedSearchCategory(cat.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer border ${
                  selectedSearchCategory === cat.id
                    ? palette.chipActive
                    : palette.chipInactive
                }`}
              >
                <span>{cat.label}</span>
                {cat.count > 0 && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                    selectedSearchCategory === cat.id ? 'bg-white/20 text-white' : 'opacity-75'
                  }`}>
                    {cat.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Results Summary Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold opacity-75">
              {lang === 'id' 
                ? `Menemukan ${filteredSearchResults.length} hasil untuk "${localSearchQuery}"`
                : `Found ${filteredSearchResults.length} results for "${localSearchQuery}"`}
            </span>
            <button
              onClick={() => handleUpdateSearch('')}
              className="text-xs font-bold hover:underline cursor-pointer opacity-80 hover:opacity-100"
            >
              {lang === 'id' ? 'Tutup Hasil' : 'Close'}
            </button>
          </div>

          {/* Top Result Banner (If Available) */}
          {filteredSearchResults.length > 0 && selectedSearchCategory === 'all' && (
            <div 
              onClick={() => handleExecuteSearchResult(filteredSearchResults[0])}
              className={`p-4 rounded-3xl border shadow-md cursor-pointer transition-all group relative overflow-hidden ${palette.searchResultCard} ${palette.searchResultCardBorder} ${palette.searchResultCardHover}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${palette.searchResultBadge}`}>
                  {lang === 'id' ? 'Hasil Paling Cocok' : 'Top Match'}
                </span>
                <span className="text-[10px] font-bold opacity-75 flex items-center gap-1 group-hover:opacity-100">
                  <span>Enter ↵</span>
                  <ArrowUpRight size={13} />
                </span>
              </div>
              <h3 className={`text-base font-black leading-tight mb-1 flex items-center gap-2 ${palette.searchResultTitle}`}>
                {filteredSearchResults[0].title}
              </h3>
              {filteredSearchResults[0].description && (
                <p className={`text-xs line-clamp-2 leading-relaxed ${palette.searchResultDesc}`}>
                  {filteredSearchResults[0].description}
                </p>
              )}
            </div>
          )}

          {/* Results List */}
          {filteredSearchResults.length > 0 ? (
            <div className="space-y-2">
              {filteredSearchResults.map((item, idx) => {
                const ItemIcon = item.icon || FileText;
                return (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => handleExecuteSearchResult(item)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-start gap-3 group ${palette.searchResultCard} ${palette.searchResultCardBorder} ${palette.searchResultCardHover}`}
                  >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${palette.searchResultIconBg}`}>
                      <ItemIcon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md ${palette.searchResultBadge}`}>
                          {item.categoryLabel ? (lang === 'id' ? item.categoryLabel.id : item.categoryLabel.en) : item.providerId}
                        </span>
                        {item.dateOrInfo && (
                          <span className="text-[10px] font-mono opacity-70 truncate">{item.dateOrInfo}</span>
                        )}
                      </div>

                      <h4 className={`text-xs sm:text-sm font-bold leading-snug transition-colors truncate ${palette.searchResultTitle}`}>
                        {item.title}
                      </h4>

                      {item.description && (
                        <p className={`text-[11px] line-clamp-1 leading-relaxed mt-0.5 ${palette.searchResultDesc}`}>
                          {item.description}
                        </p>
                      )}
                    </div>

                    <ArrowRight size={14} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-14 text-center">
              <div className={`w-14 h-14 rounded-full border flex items-center justify-center mx-auto mb-3 ${palette.searchResultIconBg}`}>
                <Icon3DSearch size={28} />
              </div>
              <h4 className={`font-bold text-sm mb-1 ${palette.titleText}`}>
                {lang === 'id' ? 'Tidak ada hasil ditemukan' : 'No results found'}
              </h4>
              <p className={`text-xs max-w-xs mx-auto ${palette.subText}`}>
                {lang === 'id' 
                  ? `Coba kata kunci lain atau periksa tab kategori di atas.` 
                  : `Try different keywords or check category tabs above.`}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
          {/* Left Column: Hero Focus Card, Growth Streak, Discipline, Quote, Mood */}
          <div className="lg:col-span-5 space-y-5">
            {/* 3. HERO / DAILY FOCUS CARD WITH GROWTH STREAK */}
          <div 
            style={bannerWallpaper ? { backgroundImage: `url(${bannerWallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            className={`relative w-full rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-5 border shadow-xs overflow-hidden ${
              bannerWallpaper ? 'text-white shadow-md border-white/20' : palette.cardHero
            }`}
          >
            {bannerWallpaper && (
              <div className="absolute inset-0 bg-slate-950/45 backdrop-blur-[0.5px] z-0 pointer-events-none" />
            )}
            {palette.id === 'pink' && !bannerWallpaper && (
              <div className="absolute -top-1 -right-1 sm:top-2 sm:right-2 pointer-events-none opacity-40 hover:opacity-75 transition-opacity select-none">
                <OrganicFlowerBlossom className="w-10 h-10 sm:w-12 sm:h-12 rotate-12" glow />
              </div>
            )}
            <div className="relative z-10">
              {/* Top greeting & Streak Container */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  {/* Profile Avatar */}
                  <div 
                    onClick={() => onNavigate('settings')}
                    className={`w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xs shrink-0 cursor-pointer border ${
                      bannerWallpaper ? 'bg-black/40 border-white/40' : `${palette.avatarBg} ${palette.avatarBorder}`
                    } hover:opacity-90 transition-opacity`}
                  >
                    {user?.avatarUrl && user.avatarUrl !== 'indexeddb:user_avatar' ? (
                      <img src={user.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center font-bold text-sm ${
                        bannerWallpaper ? 'bg-white/20 text-white' : palette.avatarFallback
                      }`}>
                        {getUserName().slice(0, 2)}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className={`text-xs font-semibold mb-0.5 ${bannerWallpaper ? 'text-white/90 drop-shadow-xs' : palette.greetingText}`}>
                      {getGreeting()}, {getUserName()}
                    </p>
                    <h1 className={`text-xl sm:text-2xl font-black tracking-tight leading-none ${bannerWallpaper ? 'text-white drop-shadow-sm' : palette.titleText}`}>
                      {lang === 'id' ? 'Fokus Hari Ini' : "Today's Focus"}
                    </h1>
                    <div className={`flex items-center gap-1.5 mt-1.5 text-xs font-medium ${bannerWallpaper ? 'text-white/90 drop-shadow-xs' : palette.subText}`}>
                      <span className={`w-2 h-2 rounded-full inline-block ${
                        completedCount === totalCount && totalCount > 0 ? 'bg-emerald-500' : 'bg-amber-500'
                      }`} />
                      <span>
                        {totalCount === 0 
                          ? (lang === 'id' ? 'Belum ada tugas hari ini' : 'No tasks for today')
                          : completedCount === totalCount 
                            ? (lang === 'id' ? 'Semua tugas selesai' : 'All tasks completed')
                            : (lang === 'id' ? `${totalCount - completedCount} tugas menunggu` : `${totalCount - completedCount} tasks remaining`)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Streak Badge Card - Calm, tactile interactive pill */}
                <motion.div 
                  whileHover={{ scale: 1.04, y: -1 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setIsStreakModalOpen(true)}
                  className={`shrink-0 flex items-center gap-3 rounded-2xl px-3.5 py-2 border cursor-pointer transition-all shadow-2xs hover:shadow-sm group relative overflow-hidden ${
                    bannerWallpaper
                      ? 'bg-black/40 backdrop-blur-md border-white/25 text-white'
                      : (completedCount === 0 
                        ? 'bg-slate-500/10 border-slate-400/20 text-slate-500 dark:text-slate-400' 
                        : palette.streakCard)
                  }`}
                  title={lang === 'id' 
                    ? (completedCount === 0 
                      ? `Streak: 0 hari. Kerjakan tugas hari ini agar streak bertambah!` 
                      : `Streak: ${frontStreak} hari berturut-turut! Klik untuk lihat detail`)
                    : (completedCount === 0 
                      ? `Streak: 0 days. Finish a task today to grow your streak!` 
                      : `Streak: ${frontStreak} days! Click to explore`)}
                >
                  <div className={`relative shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
                    bannerWallpaper 
                      ? 'bg-white/10 border-white/20'
                      : (completedCount === 0 
                        ? 'bg-slate-500/15 border-slate-500/25' 
                        : 'bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-red-500/5 border-orange-500/20')
                  }`}>
                    <Icon3DFlame 
                      size={20} 
                      isDelayed={completedCount === 0}
                      className="group-hover:scale-110 transition-transform duration-300" 
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-base font-black tracking-tight leading-none ${
                        bannerWallpaper ? 'text-white' : (completedCount === 0 ? 'text-slate-400 dark:text-slate-500' : palette.streakText)
                      }`}>
                        {frontStreak}
                      </span>
                    </div>
                    <span className={`text-[9px] font-extrabold tracking-wider uppercase mt-0.5 ${
                      bannerWallpaper ? 'text-amber-300' : (completedCount === 0 ? 'text-slate-400 dark:text-slate-500' : palette.streakLabel)
                    }`}>
                      {completedCount === 0 
                        ? (lang === 'id' ? 'RESET' : 'RESET') 
                        : (lang === 'id' ? 'HARI' : 'DAYS')}
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Progress Bar with Tactile Groove */}
              <div className="mt-3">
                <div className={`flex items-center justify-between text-xs font-semibold mb-1.5 ${bannerWallpaper ? 'text-white/90 drop-shadow-xs' : palette.subText}`}>
                  <span>{lang === 'id' ? 'Progres Tugas' : 'Task Progress'}</span>
                  <span className="font-mono text-[11px] opacity-80">{completedCount}/{totalCount} ({progressPercent}%)</span>
                </div>
                <div className={`h-2 w-full rounded-full overflow-hidden shadow-inner ${bannerWallpaper ? 'bg-black/50' : palette.progressBarTrack}`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${bannerWallpaper ? 'bg-gradient-to-r from-amber-400 to-indigo-400' : palette.progressBarFill}`}
                    style={{ width: `${Math.max(progressPercent, totalCount > 0 ? 4 : 0)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. DISCIPLINE TARGET CARD (If Active) - Single Clean Surface */}
          {disciplineTask && (
            <div 
              onClick={() => onNavigate('tasks')}
              className={`relative w-full rounded-2xl p-4 sm:p-5 mb-5 border transition-all cursor-pointer group shadow-xs ${palette.disciplineCard}`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <Icon3DTarget size={18} />
                  <h3 className={`text-xs font-bold uppercase tracking-wider ${palette.disciplineTitle}`}>
                    {lang === 'id' ? 'Target Disiplin Utama' : 'Core Discipline Goal'}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  {disciplineStats?.daysRemainingText && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${palette.disciplineBadge}`}>
                      {disciplineStats.daysRemainingText}
                    </span>
                  )}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${palette.disciplineBadge}`}>
                    {disciplineStats?.totalDone || 0} {lang === 'id' ? 'Hari' : 'Days'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="min-w-0 flex-1">
                  <h4 className={`text-sm font-bold truncate leading-tight ${palette.disciplineTitle} ${
                    isDisciplineCheckedInToday ? 'opacity-70' : ''
                  }`}>
                    {disciplineTask.title}
                  </h4>
                  {disciplineTask.disciplineData?.targetDate && (
                    <p className={`text-[11px] font-medium mt-1 flex items-center gap-1 ${palette.disciplineSub}`}>
                      <CalendarIcon size={12} className="opacity-70" />
                      <span>Target: {disciplineTask.disciplineData.targetDate}</span>
                    </p>
                  )}
                </div>

                <button
                  onClick={handleToggleDisciplineToday}
                  className={`flex-none px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95 ${
                    isDisciplineCheckedInToday
                      ? palette.disciplineBtnDone
                      : palette.disciplineBtnAction
                  }`}
                >
                  {isDisciplineCheckedInToday
                    ? (lang === 'id' ? 'Selesai' : 'Done')
                    : (lang === 'id' ? 'Check-in' : 'Check-in')}
                </button>
              </div>
            </div>
          )}

          {/* 5. MOTIVATIONAL CHALLENGE / QUOTE CARD - Single Clean Surface */}
          {!isQuoteDismissed && showQuoteCard && (
            <div className={`relative w-full rounded-2xl p-4 sm:p-5 mb-5 border transition-all shadow-xs ${palette.quoteCard}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icon3DBulbZap size={18} />
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase ${palette.quoteBadge}`}>
                    {activeQuote?.category || (lang === 'id' ? 'DISIPLIN DIRI' : 'SELF DISCIPLINE')}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {onRefreshQuote && (
                    <button 
                      onClick={onRefreshQuote}
                      aria-label="Ganti kutipan"
                      title={lang === 'id' ? 'Ganti kutipan' : 'New Quote'}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${palette.quoteBtn}`}
                    >
                      <Shuffle size={12} />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setIsQuoteDismissed(true);
                      if (onCloseQuote) onCloseQuote();
                    }}
                    aria-label="Tutup kutipan"
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors cursor-pointer ${palette.quoteBtn}`}
                  >
                    <X size={13} />
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <p className={`text-sm sm:text-base font-serif italic leading-relaxed ${palette.quoteText}`}>
                  "{activeQuote?.text || (lang === 'id' ? 'Sakitnya disiplin dan belajar hari ini jauh lebih baik daripada sakitnya menyesal di hari esok.' : 'The pain of discipline today is far lighter than the bitter pain of regret tomorrow.')}"
                </p>
              </div>
            </div>
          )}

          {/* 6. MOOD SECTION & EMOTIONAL GARDEN */}
          <div className={`relative w-full rounded-2xl p-4 sm:p-5 mb-5 border shadow-xs ${palette.moodCard}`}>
            <div className="flex items-center justify-between mb-3.5">
              <h2 className={`text-xs font-bold uppercase tracking-wider ${palette.moodTitle}`}>
                {lang === 'id' ? 'Suasana Hati Hari Ini' : "Today's Mood"}
              </h2>
              <button 
                onClick={() => onNavigate('calendar')}
                className={`text-[11px] font-semibold hover:underline flex items-center gap-1 cursor-pointer ${palette.moodLink}`}
              >
                <span>{lang === 'id' ? 'Kalender Mood' : 'Mood Calendar'}</span>
                <ArrowRight size={12} />
              </button>
            </div>

            {/* 5 3D Character Mood Mascots with generous touch target */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 max-w-md mx-auto items-end pt-0.5">
              {([
                { id: 'great', labelId: 'Bahagia', labelEn: 'Joyful' },
                { id: 'good', labelId: 'Senang', labelEn: 'Good' },
                { id: 'neutral', labelId: 'Biasa', labelEn: 'Neutral' },
                { id: 'bad', labelId: 'Sedih', labelEn: 'Sad' },
                { id: 'terrible', labelId: 'Buruk', labelEn: 'Bad' },
              ] as const).map((m) => {
                const isSelected = activeMoodSelected === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleMoodClick(m.id)}
                    aria-label={lang === 'id' ? m.labelId : m.labelEn}
                    className={`group flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl transition-all cursor-pointer select-none active:scale-95 ${
                      isSelected 
                        ? palette.moodBtnActive 
                        : palette.moodBtnHover
                    }`}
                  >
                    <div className="relative flex items-center justify-center">
                      <Organic3DMoodAvatar
                        mood={m.id}
                        size={42}
                        isSelected={isSelected}
                        className="transform transition-all group-hover:scale-105"
                      />
                    </div>
                    <span className={`mt-1.5 text-[10px] tracking-tight leading-none transition-colors ${
                      isSelected 
                        ? palette.moodLabelActive 
                        : palette.moodLabelInactive
                    }`}>
                      {lang === 'id' ? m.labelId : m.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Priorities, Quick Tasks, Recent Notes & Aesthetics */}
        <div className="lg:col-span-7 space-y-5">
          {/* 7. PRIORITAS UTAMA (PINNED TASKS & NOTES) */}
          <div className="w-full">
        <div className="flex items-center justify-between mb-3.5 px-1">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-xs ${palette.brandBg}`}>
              <Pin size={15} className="text-current" />
            </div>
            <h2 className={`text-sm font-extrabold uppercase tracking-wider ${palette.priorityTitle}`}>
              {lang === 'id' ? 'Prioritas Utama' : 'Top Priority'}
            </h2>
          </div>
          <button 
            onClick={() => onNavigate('tasks')}
            className={`text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer ${palette.moodLink}`}
          >
            <span>{lang === 'id' ? 'Semua Tugas' : 'All Tasks'}</span>
            <ArrowRight size={13} />
          </button>
        </div>

        {pinnedTasks.length === 0 && pinnedNotes.length === 0 ? (
          <div className={`rounded-2xl p-6 text-center border shadow-xs ${palette.priorityEmptyCard}`}>
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mx-auto mb-2.5 shadow-inner ${palette.priorityEmptyIconBg}`}>
              <Pin size={20} className="opacity-80" />
            </div>
            <h4 className={`font-bold text-sm mb-1 ${palette.priorityEmptyText}`}>
              {lang === 'id' ? 'Belum Ada Prioritas Utama' : 'No Priority Items Yet'}
            </h4>
            <p className={`text-xs max-w-xs mx-auto leading-relaxed mb-3.5 ${palette.priorityEmptySub}`}>
              {lang === 'id' 
                ? 'Sematkan catatan atau tugas penting agar tampil langsung di beranda.' 
                : 'Pin important tasks or notes to display them right here on Home.'}
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => onNavigate('tasks')}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${palette.priorityEmptyBtn}`}
              >
                {lang === 'id' ? '+ Tugas' : '+ Tasks'}
              </button>
              <button
                onClick={() => onNavigate('search')}
                className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer ${palette.priorityEmptyBtn}`}
              >
                {lang === 'id' ? '+ Catatan' : '+ Notes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Pinned Tasks - Flattened, no nested wrapper card */}
            {pinnedTasks.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <CheckSquare size={14} className="text-emerald-500" />
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${palette.priorityTitle}`}>
                      {lang === 'id' ? 'Tugas Prioritas' : 'Priority Tasks'}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${palette.searchBadge}`}>
                    {pinnedTasks.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {pinnedTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => toggleTask(task.id)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs group ${
                        task.completed
                          ? `${palette.taskCardDone} ${palette.taskCardDoneBorder}`
                          : `${palette.taskCard} ${palette.taskCardBorder} ${palette.taskCardHoverBorder}`
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2 flex-1">
                        <button
                          type="button"
                          className="shrink-0 transition-transform active:scale-90 cursor-pointer"
                          aria-label="Toggle task"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTask(task.id);
                          }}
                        >
                          {task.completed ? (
                            <Icon3DTaskChecked size={22} />
                          ) : (
                            <Icon3DTaskUnchecked size={22} />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <h4 className={`text-xs sm:text-sm font-bold truncate leading-snug ${task.completed ? palette.taskCardDoneText : palette.taskCardText}`}>
                            {task.title}
                          </h4>
                          
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-[10px] opacity-70">
                            {task.date && (
                              <span className="font-mono">{task.date}</span>
                            )}
                            {task.time && (
                              <span className="font-mono">• {task.time}</span>
                            )}
                            {task.alarmTime && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[9px]">
                                <Bell size={10} />
                                {task.alarmTime}
                              </span>
                            )}
                            {task.repeat === 'daily' && (
                              <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 font-semibold text-[9px]">
                                <Repeat size={10} />
                                {lang === 'id' ? 'Tiap Hari' : 'Daily'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {task.priority && task.priority !== 'Sedang' && (
                          <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full mr-1 ${
                            task.priority === 'Tinggi'
                              ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {task.priority}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateTask({ ...task, pinned: false });
                          }}
                          className="w-7 h-7 rounded-xl flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                          title={lang === 'id' ? 'Lepas dari Prioritas Utama' : 'Unpin from Top Priority'}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pinned Notes - Flattened, no nested wrapper card */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className="text-amber-500" />
                    <h3 className={`text-xs font-bold uppercase tracking-wider ${palette.priorityTitle}`}>
                      {lang === 'id' ? 'Catatan Prioritas' : 'Priority Notes'}
                    </h3>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${palette.searchBadge}`}>
                    {pinnedNotes.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {pinnedNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => onOpenNote(note)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between group ${palette.noteCard} ${palette.noteCardBorder} ${palette.noteCardHoverBorder} hover:shadow-md`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <div className="flex items-center gap-1 overflow-x-hidden">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase flex items-center gap-1 shrink-0 ${palette.noteTagBadge}`}>
                              <Pin size={10} className="fill-current" />
                              <span>{lang === 'id' ? 'Prioritas' : 'Pinned'}</span>
                            </span>
                            {note.tags && note.tags.length > 0 && (
                              <span className="text-[9px] font-bold opacity-75 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded-md uppercase truncate max-w-[90px]">
                                {note.tags[0].replace('#', '')}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {note.sharedWithAI && (
                              <span className="px-1.5 py-0.5 bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[9px] font-bold rounded flex items-center gap-0.5" title={lang === 'id' ? 'Telah masuk Tata AI' : 'Shared with Tata AI'}>
                                <Bot size={10} />
                                <span>AI</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateNote({ ...note, pinned: false });
                              }}
                              className="w-6 h-6 rounded-lg flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              title={lang === 'id' ? 'Lepas dari Prioritas Utama' : 'Unpin note'}
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>

                        <h4 className={`text-xs sm:text-sm font-bold transition-colors line-clamp-1 leading-snug mb-1 ${palette.noteCardText}`}>
                          {note.title || (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note')}
                        </h4>

                        {note.isLocked ? (
                          <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1 my-1">
                            <Lock size={11} />
                            <span>{lang === 'id' ? 'Terkunci PIN' : 'Locked with PIN'}</span>
                          </p>
                        ) : (
                          <p className={`text-[11px] line-clamp-2 leading-relaxed ${palette.noteCardSub}`}>
                            {note.content ? note.content.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>?/gm, '').replace(/&nbsp;?/gi, ' ').trim() : '...'}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-black/5 dark:border-white/5 text-[10px] font-mono opacity-60">
                        <span>{note.date}</span>
                        {note.reminder && (
                          <span className="flex items-center gap-1 text-rose-500 font-sans font-bold">
                            <Bell size={10} />
                            <span>{note.reminder}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Elegant Garden / Aesthetic Footer */}
            <div className="pt-6 pb-8 flex flex-col items-center justify-center text-center">
              {palette.id === 'organic' ? (
                <div className="flex flex-col items-center gap-2">
                  <OrganicPottedPlant className="w-20 h-28 drop-shadow-sm opacity-90 hover:opacity-100 hover:scale-105 transition-all" />
                  <p className={`text-xs font-semibold ${palette.subText}`}>
                    {lang === 'id' ? 'Tumbuhkan kebiasaan baik setiap hari' : 'Cultivate good habits every day'}
                  </p>
                </div>
              ) : palette.id === 'pink' ? (
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center gap-2.5 cursor-pointer group select-none"
                >
                  <OrganicBloomingRose className="w-24 h-32 drop-shadow-md group-hover:scale-105 transition-transform duration-300" />
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-100/60 dark:bg-pink-950/40 border border-pink-200/60 shadow-2xs">
                    <OrganicFlowerBlossom className="w-3.5 h-3.5 shrink-0" />
                    <p className={`text-xs font-semibold ${palette.subText}`}>
                      {lang === 'id' ? 'Mekar cantik dan bertumbuh setiap hari' : 'Bloom beautifully and grow every day'}
                    </p>
                    <OrganicFlowerBlossom className="w-3.5 h-3.5 shrink-0" />
                  </div>
                </motion.div>
              ) : (
                <div className={`p-3.5 rounded-2xl border flex items-center gap-3 max-w-sm w-full mx-auto ${palette.cardHero} ${palette.cardHeroBorder}`}>
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${palette.actionBtn} ${palette.actionBtnBorder}`}>
                    <Sparkles size={16} className="text-amber-400" />
                  </div>
                  <div className="text-left">
                    <p className={`text-xs font-bold ${palette.titleText}`}>
                      {lang === 'id' ? 'Tata Terorganisir' : 'Clean & Organized'}
                    </p>
                    <p className={`text-[11px] ${palette.subText}`}>
                      {lang === 'id' ? 'Fokus pada apa yang paling penting hari ini' : 'Focus on what matters most today'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
      )}

      {/* 10. INTERACTIVE FLOATING ACTION BUTTON */}
      <div className="fixed bottom-20 right-4 sm:right-8 z-30 flex flex-col items-end pointer-events-none">
        {/* Action FAB Menu Popup */}
        <AnimatePresence>
          {showFabMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className={`pointer-events-auto mb-3 p-2 rounded-2xl border shadow-xl space-y-1.5 text-xs font-bold ${palette.fabMenu} ${palette.fabMenuBorder}`}
            >
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  handleCreateNewNote();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${palette.fabMenuItemHover} ${palette.fabMenuItemText}`}
              >
                <FileText size={15} className={palette.id === 'pink' ? "text-rose-500" : "text-amber-500"} />
                <span>{lang === 'id' ? 'Catatan Baru' : 'New Note'}</span>
                {palette.id === 'pink' && <OrganicFlowerBlossom className="w-3.5 h-3.5 ml-auto opacity-70" />}
              </button>

              <button
                onClick={() => {
                  setShowFabMenu(false);
                  onNavigate('tasks', { openNewTask: true });
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${palette.fabMenuItemHover} ${palette.fabMenuItemText}`}
              >
                <CheckCircle2 size={15} className="text-emerald-500" />
                <span>{lang === 'id' ? 'Tugas Baru' : 'New Task'}</span>
                {palette.id === 'pink' && <OrganicFlowerBlossom className="w-3.5 h-3.5 ml-auto opacity-70" />}
              </button>

              <button
                onClick={() => {
                  setShowFabMenu(false);
                  onNavigate('finance', { openAddModal: true });
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer ${palette.fabMenuItemHover} ${palette.fabMenuItemText}`}
              >
                <Wallet size={15} className="text-indigo-500" />
                <span>{lang === 'id' ? 'Catat Transaksi' : 'New Transaction'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Action Button (Buat Catatan atau Tugas) */}
        <button
          onClick={() => setShowFabMenu(!showFabMenu)}
          aria-label={lang === 'id' ? 'Buat Catatan atau Tugas Baru' : 'Create New Note or Task'}
          title={lang === 'id' ? 'Buat Catatan atau Tugas' : 'Create Note or Task'}
          className={`relative z-10 w-14 h-14 rounded-full active:scale-90 text-white flex items-center justify-center pointer-events-auto transition-all cursor-pointer overflow-hidden p-0.5 border-2 shadow-lg ${palette.fabBtn}`}
        >
          {palette.id === 'pink' ? (
            <div className={`w-full h-full flex items-center justify-center transition-transform duration-300 ${showFabMenu ? 'rotate-45 scale-105' : 'hover:scale-110'}`}>
              <OrganicFabRoseFlower className="w-11 h-11 drop-shadow-sm" />
            </div>
          ) : (
            <Icon3DFabPlus size={48} />
          )}
        </button>
      </div>

      {/* Notifications Modal */}
      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        appTheme={appTheme}
        onOpenNote={(noteId: string) => {
          const found = notes.find(n => n.id === noteId);
          if (found) {
            onOpenNote(found);
          } else {
            onOpenNote({
              id: noteId,
              title: '',
              content: '',
              date: new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
              tags: []
            });
          }
        }}
        onNavigate={onNavigate}
      />

      {/* Cute Interactive Streak Flame & 365-Day Ecosystem Modal */}
      <OrganicStreakModal
        isOpen={isStreakModalOpen}
        onClose={() => setIsStreakModalOpen(false)}
        streak={streak}
        journeyDay={organicDay}
        journeyStartDate={journeyStartDate}
        hasCompletedTaskToday={completedCount > 0}
        lang={lang}
        palette={palette}
        appTheme={appTheme}
        onNavigateTasks={() => {
          setIsStreakModalOpen(false);
          onNavigate('tasks');
        }}
      />

    </div>
  );
}


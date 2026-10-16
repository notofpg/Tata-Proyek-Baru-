import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store';
import { Note, Task } from '../../types';

const extractFirstImageUrl = (content?: string): string | null => {
  if (!content) return null;
  const match = content.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match ? match[1] : null;
};

const getCleanTextPreview = (content?: string): string => {
  if (!content) return '';
  return content
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;?/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};
import { 
  OrganicPottedPlant, 
  OrganicBloomingRose, 
  OrganicFlowerBlossom, 
  OrganicFabRoseFlower,
  OrganicCrystalOrchid,
  OrganicGoldenBonsai,
  OrganicMinimalSprout,
  OrganicCrystalStar,
  OrganicGoldenLeaf
} from './OrganicBotanicals';
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
  Icon3DClock,
  Icon3DRefresh,
  Icon3DClose,
  Icon3DChevronRight,
  Icon3DForward,
  Icon3DCalendar,
  Icon3DShuffle,
  Icon3DPin,
  Icon3DCheckSquare,
  Icon3DFileText,
  Icon3DCamera,
  Icon3DGoldLock,
  Icon3DSparkles,
  Icon3DSproutLogo,
  Icon3DMoodHappy,
  Icon3DGamepad,
  Icon3DArchive,
  Icon3DCreditCard
} from './Organic3DIcons';

const get3DSearchResultIcon = (item: SearchResultItem) => {
  if (item.providerId === 'notes') return <Icon3DFileText size={20} />;
  if (item.providerId === 'tasks') return <Icon3DTaskChecked size={20} />;
  if (item.providerId === 'finance') return <Icon3DWallet size={20} />;
  if (item.providerId === 'mood') return <Icon3DMoodHappy size={22} />;
  const id = (item.id || '').toLowerCase();
  if (id.includes('note') || id.includes('tulis') || id.includes('catat')) return <Icon3DFileText size={20} />;
  if (id.includes('task') || id.includes('tugas')) return <Icon3DTaskChecked size={20} />;
  if (id.includes('scan') || id.includes('camera') || id.includes('doc')) return <Icon3DCamera size={20} />;
  if (id.includes('calendar') || id.includes('kalender') || id.includes('agenda')) return <Icon3DCalendar size={20} />;
  if (id.includes('ai') || id.includes('bot') || id.includes('companion')) return <Icon3DTataAI size={20} />;
  if (id.includes('game')) return <Icon3DGamepad size={20} />;
  if (id.includes('lock') || id.includes('pin') || id.includes('privasi')) return <Icon3DGoldLock size={20} />;
  if (id.includes('backup') || id.includes('cadang') || id.includes('database')) return <Icon3DArchive size={20} />;
  if (id.includes('streak') || id.includes('flame')) return <Icon3DFlame size={20} />;
  if (id.includes('notif') || id.includes('bell') || id.includes('ingat')) return <Icon3DBell size={20} />;
  if (id.includes('wallet') || id.includes('uang') || id.includes('kas') || id.includes('transaksi') || id.includes('finance')) return <Icon3DWallet size={20} />;
  if (id.includes('target') || id.includes('disiplin')) return <Icon3DTarget size={20} />;
  if (id.includes('kartu') || id.includes('pay') || id.includes('bayar')) return <Icon3DCreditCard size={20} />;
  return <Icon3DSparkles size={20} />;
};

import NotificationModal from '../NotificationModal';
import { buildAllNotifications, NotificationItem } from '../../utils/notifications';
import { executeUniversalSearch, SearchResultItem } from '../../services/searchEngine';
import { getOrganicThemePalette } from './organicThemePalettes';
import OrganicStreakModal from './OrganicStreakModal';
import { getLargeItem, getLargeItemSync } from '../../utils/db';
import { triggerHaptic, playTaskCompleteSound, playConfirmSound, playTapSound } from '../../utils/sound';

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

export const OrganicHomeView = React.memo(function OrganicHomeView({
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
      // Debounce or avoid blocking the UI thread on keystrokes
      setTimeout(() => setSearchQuery(q), 0);
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

  // Dynamic Notifications calculation with real-time detection & single-pass memoization
  const [notifTrigger, setNotifTrigger] = useState(0);

  useEffect(() => {
    const handleNotifChanged = () => setNotifTrigger(prev => prev + 1);
    window.addEventListener('tata_notifications_changed', handleNotifChanged);
    return () => window.removeEventListener('tata_notifications_changed', handleNotifChanged);
  }, []);

  const notifications = useMemo(() => {
    return buildAllNotifications({
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
  }, [notes, tasks, transactions, debts, lang, streak, tataAccount, isAccountPremium, savingsBalance, savingsTarget, moods, notifTrigger]);

  // Dynamic Theme Palette: ensures cool (blue), dark, pink, cute, simple, light, and organic
  // apply cohesive container and card colors matching the user's selected theme
  const palette = useMemo(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : null;
    const effectiveTheme = appTheme || storedTheme || 'organic';
    return getOrganicThemePalette(effectiveTheme);
  }, [appTheme]);

  const notificationCount = notifications.length;

  // Universal Search Execution with decoupled specific dependencies to avoid full-store re-evaluations
  const searchResults: SearchResultItem[] = useMemo(() => {
    const trimmed = localSearchQuery.trim();
    if (!trimmed) return [];
    return executeUniversalSearch(trimmed, store, lang);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearchQuery, notes, tasks, transactions, debts, savingsBalance, savingsTarget, tataAccount, isAccountPremium, lang]);

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
  const [refreshToast, setRefreshToast] = useState(false);

  // Synchronize mood with store changes
  useEffect(() => {
    setActiveMoodSelected(getInitialActiveMood());
  }, [currentTodayMood?.mood]);

  // 1. Discipline Task Filter (robust detection of isDiscipline or disciplineData)
  const disciplineTask = useMemo(() => {
    return tasks.find(t => (t.isDiscipline || !!t.disciplineData) && !t.deleted);
  }, [tasks]);

  // Full Discipline Check-in with Daily Checkins & Streak Updates
  const isDisciplineCheckedInToday = Boolean(
    disciplineTask && (
      disciplineTask.disciplineData?.dailyCheckins?.includes(todayStr) ||
      disciplineTask.disciplineData?.usedRestDates?.includes(todayStr) ||
      disciplineTask.completedDates?.includes(todayStr) ||
      disciplineTask.completed
    )
  );

  // 2. Regular Active Tasks
  const activeTasks = useMemo(() => {
    return tasks.filter(t => !t.deleted && !t.isDiscipline && !t.disciplineData);
  }, [tasks]);

  // Tasks due or active today
  const todayTasks = useMemo(() => {
    return activeTasks.filter(t => {
      if (!t.date || t.date === 'Hari ini' || t.date === todayStr) return true;
      if (t.repeat === 'daily') return true;
      return false;
    });
  }, [activeTasks, todayStr]);

  // 3. Pinned Tasks & Pinned Notes (Top Priority)
  const pinnedTasks = useMemo(() => {
    return activeTasks.filter(t => t.pinned);
  }, [activeTasks]);

  const pinnedNotes = useMemo(() => {
    return notes.filter(n => !n.isArchived && n.pinned);
  }, [notes]);

  const recentNotes = useMemo(() => {
    const nonArchived = notes.filter(n => !n.isArchived);
    return [...nonArchived].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const timeA = a.updatedAt || (a.date ? new Date(a.date).getTime() : 0) || 0;
      const timeB = b.updatedAt || (b.date ? new Date(b.date).getTime() : 0) || 0;
      return timeB - timeA;
    });
  }, [notes]);

  const { completedCount, totalCount, progressPercent, frontStreak, isTodayConfirmed } = useMemo(() => {
    const scope = todayTasks.length > 0 ? todayTasks : activeTasks;
    const compReg = scope.filter(t => t.completed).length;
    const comp = compReg + (isDisciplineCheckedInToday ? 1 : 0);
    const tot = scope.length + (disciplineTask ? 1 : 0);
    const prog = tot > 0 ? Math.round((comp / tot) * 100) : 0;
    const isConfirmed = comp > 0;
    const front = streak || 0;
    return {
      completedCount: comp,
      totalCount: tot,
      progressPercent: prog,
      frontStreak: front,
      isTodayConfirmed: isConfirmed
    };
  }, [todayTasks, activeTasks, isDisciplineCheckedInToday, disciplineTask, streak]);

  const pendingTasksCount = useMemo(() => {
    const scope = todayTasks.length > 0 ? todayTasks : activeTasks;
    const uncompleted = scope.filter(t => !t.completed).length;
    return uncompleted + (disciplineTask && !isDisciplineCheckedInToday ? 1 : 0);
  }, [todayTasks, activeTasks, disciplineTask, isDisciplineCheckedInToday]);

  const organicDay = journeyDay || 1;

  const getUserName = () => {
    if (user?.name && user.name.trim()) {
      const trimmed = user.name.trim();
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }
    return lang === 'id' ? 'Sobat Tata' : 'Friend';
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (lang === 'id') {
      if (hr < 11) return 'Selamat pagi';
      if (hr < 15) return 'Selamat siang';
      if (hr < 18) return 'Selamat sore';
      return 'Selamat malam';
    } else {
      if (hr < 12) return 'Good morning';
      if (hr < 17) return 'Good afternoon';
      return 'Good evening';
    }
  };

  // Instant tactile mood selection WITHOUT notes (per strict user request)
  const handleMoodClick = (val: 'great' | 'good' | 'neutral' | 'bad' | 'terrible') => {
    triggerHaptic('light');
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
    if (!isDisciplineCheckedInToday) {
      playTaskCompleteSound();
    } else {
      triggerHaptic('medium');
    }
    toggleTask(disciplineTask.id, todayStr);
  };

  const handleToggleRegularTask = (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const target = tasks.find(t => t.id === taskId);
    if (target && !target.completed) {
      playTaskCompleteSound();
    } else {
      triggerHaptic('light');
    }
    toggleTask(taskId, todayStr);
  };

  const handleTogglePinTask = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    updateTask({ ...task, pinned: !task.pinned });
  };

  const handleTogglePinNote = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic('light');
    updateNote({ ...note, pinned: !note.pinned });
  };

  const handleRefreshClick = async () => {
    triggerHaptic('medium');
    try {
      if (handleRefreshApp) {
        await handleRefreshApp();
      }
    } catch {
      // ignore
    } finally {
      setRefreshToast(true);
      setTimeout(() => setRefreshToast(false), 2200);
    }
  };

  const handleCreateNewNote = () => {
    triggerHaptic('light');
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
    triggerHaptic('light');
    handleUpdateSearch('');
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
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="flex items-center gap-2.5 group cursor-pointer active:scale-95 transition-all text-left touch-manipulation select-none"
            title={lang === 'id' ? 'Klik untuk Segarkan Data' : 'Click to Refresh'}
          >
            <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-xs ${palette.brandBg} transition-all group-hover:scale-105 active:scale-90`}>
              <Icon3DSproutLogo size={24} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className={`font-black text-xl tracking-tight ${palette.brandText}`}>TATA</span>
              <Icon3DRefresh size={13} spinning={isRefreshing} className={`opacity-75 transition-transform ${isRefreshing ? 'animate-spin' : 'group-hover:rotate-180 duration-300'}`} />
              <AnimatePresence>
                {refreshToast && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  >
                    {lang === 'id' ? 'Segar ✨' : 'Synced ✨'}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </button>
        </div>

        {/* Right Action Icons in Soft Rounded Pills with tactile haptic response */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => {
              triggerHaptic('light');
              onNavigate('ai-companion');
            }}
            aria-label="Tata AI"
            title="Tata AI Companion"
            className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-2xl active:scale-90 flex items-center justify-center transition-all shadow-2xs border touch-manipulation select-none ${palette.actionBtn} ${palette.actionBtnHover} hover:shadow-xs cursor-pointer`}
          >
            <Icon3DTataAI size={21} />
          </button>
          
          <button 
            onClick={() => {
              triggerHaptic('light');
              onNavigate('finance');
            }}
            aria-label="Keuangan"
            title={lang === 'id' ? 'Keuangan & Kas' : 'Finance'}
            className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-2xl active:scale-90 flex items-center justify-center transition-all shadow-2xs border touch-manipulation select-none ${palette.actionBtn} ${palette.actionBtnHover} hover:shadow-xs cursor-pointer`}
          >
            <Icon3DWallet size={21} />
          </button>

          <button 
            onClick={() => {
              triggerHaptic('light');
              setIsNotificationOpen(true);
            }}
            aria-label="Notifikasi"
            title={lang === 'id' ? 'Notifikasi & Pengingat' : 'Notifications & Reminders'}
            className={`w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-2xl active:scale-90 flex items-center justify-center transition-all shadow-2xs border touch-manipulation select-none ${palette.actionBtn} ${palette.actionBtnHover} hover:shadow-xs cursor-pointer relative`}
          >
            <Icon3DBell size={21} />
            {notificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[9.5px] font-black flex items-center justify-center shadow-xs animate-pulse">
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
              onClick={() => {
                triggerHaptic('light');
                handleUpdateSearch('');
                searchInputRef.current?.focus();
              }}
              className="p-1 rounded-full opacity-70 hover:opacity-100 transition-opacity cursor-pointer touch-manipulation active:scale-90"
              title={lang === 'id' ? 'Hapus Pencarian' : 'Clear search'}
            >
              <Icon3DClose size={14} />
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
                onClick={() => {
                  triggerHaptic('light');
                  setSelectedSearchCategory(cat.id);
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-tight whitespace-nowrap transition-all flex items-center gap-1 cursor-pointer border touch-manipulation active:scale-95 ${
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
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0`}>
                    {get3DSearchResultIcon(filteredSearchResults[0])}
                  </div>
                  <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full ${palette.searchResultBadge}`}>
                    {lang === 'id' ? 'Hasil Paling Cocok' : 'Top Match'}
                  </span>
                </div>
                <span className="text-[10px] font-bold opacity-75 flex items-center gap-1 group-hover:opacity-100">
                  <span>Enter ↵</span>
                  <Icon3DForward size={14} />
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
                return (
                  <div
                    key={`${item.id}-${idx}`}
                    onClick={() => handleExecuteSearchResult(item)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs flex items-start gap-3 group ${palette.searchResultCard} ${palette.searchResultCardBorder} ${palette.searchResultCardHover}`}
                  >
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${palette.searchResultIconBg}`}>
                      {get3DSearchResultIcon(item)}
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

                    <Icon3DChevronRight size={15} className="opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-3" />
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
            {palette.id === 'cool' && !bannerWallpaper && (
              <div className="absolute -top-1 -right-1 sm:top-2 sm:right-2 pointer-events-none opacity-40 hover:opacity-75 transition-opacity select-none">
                <OrganicCrystalStar className="w-9 h-9 sm:w-11 sm:h-11 rotate-12" glow />
              </div>
            )}
            {palette.id === 'cute' && !bannerWallpaper && (
              <div className="absolute -top-1 -right-1 sm:top-2 sm:right-2 pointer-events-none opacity-40 hover:opacity-75 transition-opacity select-none">
                <OrganicGoldenLeaf className="w-9 h-9 sm:w-11 sm:h-11 -rotate-12" glow />
              </div>
            )}
            <div className="relative z-10">
              {/* Top greeting & Streak Container */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  {/* Profile Avatar */}
                  <div 
                    onClick={() => {
                      triggerHaptic('light');
                      onNavigate('settings');
                    }}
                    className={`w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center shadow-2xs shrink-0 cursor-pointer border active:scale-90 touch-manipulation select-none ${
                      bannerWallpaper ? 'bg-black/40 border-white/40' : `${palette.avatarBg} ${palette.avatarBorder}`
                    } hover:opacity-90 transition-all`}
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
                  onClick={() => {
                    triggerHaptic('light');
                    setIsStreakModalOpen(true);
                  }}
                  className={`shrink-0 flex items-center gap-3 rounded-2xl px-3.5 py-2 border cursor-pointer transition-all shadow-2xs hover:shadow-sm group relative overflow-hidden touch-manipulation ${
                    bannerWallpaper
                      ? 'bg-black/40 backdrop-blur-md border-white/25 text-white'
                      : (frontStreak === 0
                        ? 'bg-slate-500/10 border-slate-400/20 text-slate-500 dark:text-slate-400' 
                        : palette.streakCard)
                  }`}
                  title={lang === 'id' 
                    ? (frontStreak === 0 
                      ? 'Streak: 0 hari. Selesaikan 1 tugas hari ini untuk mulai membangun streak!' 
                      : isTodayConfirmed
                        ? `Streak: ${frontStreak} hari berturut-turut! Target hari ini tercapai 🔥`
                        : `Streak aktif: ${frontStreak} hari! Selesaikan tugas hari ini agar streak terus bertambah 🔥`)
                    : (frontStreak === 0 
                      ? 'Streak: 0 days. Finish a task today to start your streak!' 
                      : isTodayConfirmed
                        ? `Streak: ${frontStreak} days! Today's goal completed 🔥`
                        : `Active streak: ${frontStreak} days! Complete a task today to keep it going 🔥`)}
                >
                  <div className={`relative shrink-0 flex items-center justify-center w-8 h-8 rounded-xl border transition-all ${
                    bannerWallpaper 
                      ? 'bg-white/10 border-white/20'
                      : (frontStreak === 0
                        ? 'bg-slate-500/15 border-slate-500/25' 
                        : isTodayConfirmed
                          ? 'bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-red-500/10 border-orange-500/30'
                          : 'bg-amber-500/10 border-amber-500/20')
                  }`}>
                    <Icon3DFlame 
                      size={20} 
                      isDelayed={!isTodayConfirmed}
                      className="group-hover:scale-110 transition-transform duration-300" 
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <div className="flex items-baseline gap-1">
                      <span className={`text-base font-black tracking-tight leading-none ${
                        bannerWallpaper ? 'text-white' : (frontStreak === 0 ? 'text-slate-400 dark:text-slate-500' : palette.streakText)
                      }`}>
                        {frontStreak}
                      </span>
                    </div>
                    <span className={`text-[9px] font-extrabold tracking-wider uppercase mt-0.5 ${
                      bannerWallpaper 
                        ? 'text-amber-300' 
                        : (frontStreak === 0 
                          ? 'text-slate-400 dark:text-slate-500' 
                          : isTodayConfirmed
                            ? palette.streakLabel
                            : 'text-amber-600 dark:text-amber-400 font-bold')
                    }`}>
                      {lang === 'id' 
                        ? (frontStreak === 0 ? 'HARI' : isTodayConfirmed ? 'HARI' : 'AKTIF') 
                        : (frontStreak === 0 ? 'DAYS' : isTodayConfirmed ? 'DAYS' : 'ACTIVE')}
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
              onClick={() => {
                triggerHaptic('light');
                onNavigate('tasks');
              }}
              className={`relative w-full rounded-2xl p-4 sm:p-5 mb-5 border transition-all cursor-pointer group shadow-xs touch-manipulation active:scale-[0.99] ${palette.disciplineCard}`}
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
                    <p className={`text-[11px] font-medium mt-1 flex items-center gap-1.5 ${palette.disciplineSub}`}>
                      <Icon3DCalendar size={13} className="shrink-0" />
                      <span>Target: {disciplineTask.disciplineData.targetDate}</span>
                    </p>
                  )}
                </div>

                <button
                  onClick={handleToggleDisciplineToday}
                  className={`flex-none px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-2xs active:scale-95 touch-manipulation ${
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
                      onClick={() => {
                        triggerHaptic('light');
                        onRefreshQuote();
                      }}
                      aria-label="Ganti kutipan"
                      title={lang === 'id' ? 'Ganti kutipan' : 'New Quote'}
                      className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-90 ${palette.quoteBtn}`}
                    >
                      <Icon3DShuffle size={14} />
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      triggerHaptic('light');
                      setIsQuoteDismissed(true);
                      if (onCloseQuote) onCloseQuote();
                    }}
                    aria-label="Tutup kutipan"
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-colors cursor-pointer touch-manipulation active:scale-90 ${palette.quoteBtn}`}
                  >
                    <Icon3DClose size={13} />
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

          {/* 6. MOOD SECTION & EMOTIONAL GARDEN - NO NOTES INPUT PER USER PREFERENCE */}
          <div className={`relative w-full rounded-2xl p-4 sm:p-5 mb-5 border shadow-xs ${palette.moodCard}`}>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <h2 className={`text-xs font-bold uppercase tracking-wider ${palette.moodTitle}`}>
                  {lang === 'id' ? 'Suasana Hati Hari Ini' : "Today's Mood"}
                </h2>
              </div>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  onNavigate('calendar');
                }}
                className={`text-[11px] font-semibold hover:underline flex items-center gap-1 cursor-pointer touch-manipulation select-none ${palette.moodLink}`}
              >
                <span>{lang === 'id' ? 'Kalender Mood' : 'Mood Calendar'}</span>
                <Icon3DChevronRight size={13} />
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
                    className={`group flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl transition-all cursor-pointer select-none active:scale-90 touch-manipulation ${
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
          {/* 7. PRIORITAS UTAMA & TUGAS HARI INI */}
          <div className="w-full">
            <div className="flex items-center justify-between gap-2.5 mb-3.5 px-1">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shadow-xs ${palette.brandBg}`}>
                  <Icon3DPin size={16} />
                </div>
                <h2 className={`text-sm font-extrabold uppercase tracking-wider ${palette.priorityTitle}`}>
                  {lang === 'id' ? 'Tugas Prioritas' : 'Priority Tasks'}
                </h2>
                {(pinnedTasks.length > 0 || pinnedNotes.length > 0) && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${palette.searchBadge}`}>
                    {pinnedTasks.length + pinnedNotes.length}
                  </span>
                )}
              </div>

              <button 
                onClick={() => {
                  triggerHaptic('light');
                  onNavigate('tasks');
                }}
                className={`text-xs font-bold hover:underline flex items-center gap-1 cursor-pointer touch-manipulation select-none ${palette.moodLink}`}
              >
                <span>{lang === 'id' ? 'Semua' : 'All'}</span>
                <Icon3DChevronRight size={13} />
              </button>
            </div>

            {/* HANYA ITEM DI-PIN (PINNED TASKS & PINNED NOTES) */}
            {pinnedTasks.length === 0 && pinnedNotes.length === 0 ? (
                <div className={`rounded-2xl p-5 text-center border shadow-xs ${palette.priorityEmptyCard}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2 shadow-inner ${palette.priorityEmptyIconBg}`}>
                    <Icon3DPin size={22} className="opacity-90" />
                  </div>
                  <h4 className={`font-bold text-xs sm:text-sm mb-1 ${palette.priorityEmptyText}`}>
                    {lang === 'id' ? 'Belum Ada Tugas Prioritas' : 'No Priority Tasks Yet'}
                  </h4>
                  <p className={`text-[11px] max-w-xs mx-auto leading-relaxed mb-3 ${palette.priorityEmptySub}`}>
                    {lang === 'id' 
                      ? 'Sematkan tugas penting agar tampil di sini.' 
                      : 'Pin important tasks to keep them here.'}
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        onNavigate('tasks', { openNewTask: true });
                      }}
                      className={`px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer touch-manipulation select-none flex items-center gap-1.5 ${palette.priorityEmptyBtn}`}
                    >
                      <Icon3DFabPlus size={14} />
                      <span>{lang === 'id' ? 'Buat Tugas' : 'New Task'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Pinned Tasks */}
                  {pinnedTasks.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-1.5">
                          <Icon3DCheckSquare size={16} />
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
                            onClick={() => handleToggleRegularTask(task.id)}
                            className={`flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer shadow-xs group touch-manipulation select-none ${
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
                                onClick={(e) => handleToggleRegularTask(task.id, e)}
                              >
                                {task.completed ? (
                                  <Icon3DTaskChecked size={22} />
                                ) : (
                                  <Icon3DTaskUnchecked size={22} />
                                )}
                              </button>

                              <div className="min-w-0 flex-1">
                                <h4 className={`text-xs sm:text-sm font-bold truncate leading-snug ${task.completed ? `${palette.taskCardDoneText} line-through opacity-70` : palette.taskCardText}`}>
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
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 font-semibold text-[9px]">
                                      <Icon3DBell size={11} />
                                      {task.alarmTime}
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
                                onClick={(e) => handleTogglePinTask(task, e)}
                                className="w-7 h-7 rounded-xl flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all cursor-pointer touch-manipulation"
                                title={lang === 'id' ? 'Lepas Sematan' : 'Unpin'}
                              >
                                <Icon3DClose size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pinned Notes */}
                  {pinnedNotes.length > 0 && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <div className="flex items-center gap-2">
                          <Icon3DFileText size={16} />
                          <h3 className={`text-xs font-bold uppercase tracking-wider ${palette.priorityTitle}`}>
                            {lang === 'id' ? 'Catatan Prioritas' : 'Priority Notes'}
                          </h3>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${palette.searchBadge}`}>
                          {pinnedNotes.length}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {pinnedNotes.map((note) => {
                          const firstImage = note.thumbnailUrl || extractFirstImageUrl(note.content);
                          const cleanText = getCleanTextPreview(note.content);
                          const displayTitle = note.title || (firstImage ? (lang === 'id' ? 'Catatan Foto' : 'Photo Note') : (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note'));

                          return (
                            <div
                              key={note.id}
                              onClick={() => {
                                triggerHaptic('light');
                                onOpenNote(note);
                              }}
                              className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer shadow-xs flex flex-col justify-between group touch-manipulation ${palette.noteCard} ${palette.noteCardBorder} ${palette.noteCardHoverBorder} hover:shadow-md`}
                            >
                              <div>
                                {firstImage && (
                                  <div className="relative w-full h-28 sm:h-32 mb-2.5 rounded-xl overflow-hidden bg-black/10 dark:bg-white/5 border border-black/5 dark:border-white/10">
                                    <img
                                      src={firstImage}
                                      alt="Preview"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      loading="lazy"
                                    />
                                    <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold flex items-center gap-1">
                                      <Icon3DCamera size={11} />
                                      <span>{lang === 'id' ? 'Foto' : 'Photo'}</span>
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center justify-between gap-1 mb-2">
                                  <div className="flex items-center gap-1 overflow-x-hidden">
                                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase flex items-center gap-1 shrink-0 ${palette.noteTagBadge}`}>
                                      <Icon3DPin size={11} />
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
                                        <Icon3DTataAI size={11} />
                                        <span>AI</span>
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={(e) => handleTogglePinNote(note, e)}
                                      className="w-7 h-7 min-w-[28px] min-h-[28px] sm:w-8 sm:h-8 rounded-lg flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 active:scale-90 transition-all cursor-pointer touch-manipulation"
                                      title={lang === 'id' ? 'Lepas dari Prioritas Utama' : 'Unpin note'}
                                    >
                                      <Icon3DClose size={13} />
                                    </button>
                                  </div>
                                </div>

                                <h4 className={`text-xs sm:text-sm font-bold transition-colors line-clamp-1 leading-snug mb-1 ${palette.noteCardText}`}>
                                  {displayTitle}
                                </h4>

                                {note.isLocked ? (
                                  <p className="text-[11px] text-amber-500 font-medium flex items-center gap-1 my-1">
                                    <Icon3DGoldLock size={13} />
                                    <span>{lang === 'id' ? 'Terkunci PIN' : 'Locked with PIN'}</span>
                                  </p>
                                ) : (
                                  <p className={`text-[11px] line-clamp-2 leading-relaxed ${palette.noteCardSub}`}>
                                    {cleanText || (firstImage ? (lang === 'id' ? '📸 [Berisi Foto]' : '📸 [Contains Photo]') : '...')}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-black/5 dark:border-white/5 text-[10px] font-mono opacity-60">
                                <span>{note.date}</span>
                                {note.reminder && (
                                  <span className="flex items-center gap-1 text-rose-500 font-sans font-bold">
                                    <Icon3DBell size={11} />
                                    <span>{note.reminder}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

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
              ) : palette.id === 'cool' ? (
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center gap-2.5 cursor-pointer group select-none"
                >
                  <OrganicCrystalOrchid className="w-22 h-30 drop-shadow-[0_8px_20px_rgba(2,132,199,0.3)] group-hover:scale-105 transition-transform duration-300" />
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#13234A]/80 border border-[#1E3A8A] shadow-2xs text-cyan-300">
                    <Icon3DSparkles size={14} className="shrink-0" />
                    <p className="text-xs font-semibold">
                      {lang === 'id' ? 'Kristal ketenangan dan fokus berenergi' : 'Crystal clarity and energized focus'}
                    </p>
                    <Icon3DSparkles size={14} className="shrink-0" />
                  </div>
                </motion.div>
              ) : palette.id === 'cute' ? (
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center gap-2.5 cursor-pointer group select-none"
                >
                  <OrganicGoldenBonsai className="w-22 h-30 drop-shadow-md group-hover:scale-105 transition-transform duration-300" />
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300/60 shadow-2xs text-amber-900 dark:text-amber-200">
                    <Icon3DSparkles size={14} className="shrink-0" />
                    <p className="text-xs font-semibold">
                      {lang === 'id' ? 'Bonsai emas pembawa keberuntungan dan tekad' : 'Golden bonsai of prosperity & steadfast spirit'}
                    </p>
                    <Icon3DSparkles size={14} className="shrink-0" />
                  </div>
                </motion.div>
              ) : palette.id === 'light' || palette.id === 'simple' ? (
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  className="flex flex-col items-center gap-2.5 cursor-pointer group select-none"
                >
                  <OrganicMinimalSprout className="w-22 h-30 drop-shadow-sm group-hover:scale-105 transition-transform duration-300" />
                  <p className={`text-xs font-semibold ${palette.subText}`}>
                    {lang === 'id' ? 'Satu langkah kecil yang bertumbuh setiap hari' : 'One small step growing every day'}
                  </p>
                </motion.div>
              ) : (
                <div className={`p-3.5 rounded-2xl border flex items-center gap-3 max-w-sm w-full mx-auto ${palette.cardHero} ${palette.cardHeroBorder}`}>
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${palette.actionBtn} ${palette.actionBtnBorder}`}>
                    <Icon3DSparkles size={18} />
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
        </div>
      )}

      {/* 10. INTERACTIVE FLOATING ACTION BUTTON WITH OUTSIDE TAP DISMISS */}
      {showFabMenu && (
        <div 
          className="fixed inset-0 z-20 pointer-events-auto bg-black/15 backdrop-blur-[0.5px] transition-opacity cursor-pointer"
          onClick={() => setShowFabMenu(false)}
        />
      )}

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
                  triggerHaptic('light');
                  setShowFabMenu(false);
                  handleCreateNewNote();
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer touch-manipulation ${palette.fabMenuItemHover} ${palette.fabMenuItemText}`}
              >
                <Icon3DFileText size={18} />
                <span>{lang === 'id' ? 'Catatan Baru' : 'New Note'}</span>
                {palette.id === 'pink' && <OrganicFlowerBlossom className="w-3.5 h-3.5 ml-auto opacity-70" />}
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowFabMenu(false);
                  onNavigate('tasks', { openNewTask: true });
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer touch-manipulation ${palette.fabMenuItemHover} ${palette.fabMenuItemText}`}
              >
                <Icon3DTaskChecked size={18} />
                <span>{lang === 'id' ? 'Tugas Baru' : 'New Task'}</span>
                {palette.id === 'pink' && <OrganicFlowerBlossom className="w-3.5 h-3.5 ml-auto opacity-70" />}
              </button>

              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowFabMenu(false);
                  onNavigate('finance', { openAddModal: true });
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors cursor-pointer touch-manipulation ${palette.fabMenuItemHover} ${palette.fabMenuItemText}`}
              >
                <Icon3DWallet size={18} />
                <span>{lang === 'id' ? 'Catat Transaksi' : 'New Transaction'}</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Action Button (Buat Catatan atau Tugas) */}
        <button
          onClick={() => {
            triggerHaptic('light');
            setShowFabMenu(!showFabMenu);
          }}
          aria-label={lang === 'id' ? 'Buat Catatan atau Tugas Baru' : 'Create New Note or Task'}
          title={lang === 'id' ? 'Buat Catatan atau Tugas' : 'Create Note or Task'}
          className={`relative z-10 w-14 h-14 rounded-full active:scale-90 text-white flex items-center justify-center pointer-events-auto transition-all cursor-pointer overflow-hidden p-0.5 border-2 shadow-lg touch-manipulation select-none ${palette.fabBtn}`}
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
      {isNotificationOpen && (
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
      )}

      {/* Cute Interactive Streak Flame & 365-Day Ecosystem Modal */}
      {isStreakModalOpen && (
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
      )}

    </div>
  );
});


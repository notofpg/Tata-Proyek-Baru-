import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playTapSound } from "./utils/sound";
import { Home, CheckCircle2, Calendar as CalendarIcon, Settings, Lock, Layers, Bell, X, Wallet, WifiOff, FileText, Database, Download, AlertTriangle, Bot, Sparkles, Shuffle, RefreshCw, Gamepad2, Keyboard, MonitorSmartphone, CloudSun, CloudOff, Star, Plus, MoreHorizontal, Search, Shield, BellRing, ArrowLeft, ListTodo, CheckSquare, MessageSquare, CircleDashed, Briefcase, Target, TimerReset, Trash2, PlusCircle, PenLine, Sparkle, ChevronRight, Palette, NotebookText, CreditCard, ShoppingBag, TrendingUp, BadgeDollarSign, Coins, BriefcaseBusiness, Landmark, LandmarkIcon, Users, Moon, SunMedium, ChevronLeft, ArrowUpRight, BellDot, Heart, NotebookPen, Rocket, PackageCheck, CheckCheck, KeyRound, LockKeyhole, Cpu, Wrench, Zap, Activity, DownloadCloud, UploadCloud, ServerCog, Bookmark, Save, UserCircle2, Cctv, AppWindow, LucideIcon } from 'lucide-react';
import HomeScreen from './screens/HomeScreen';
import TasksScreen from './screens/TasksScreen';
import CalendarScreen from './screens/CalendarScreen';
import NoteEditorScreen from './screens/NoteEditorScreen';
import SearchScreen from './screens/SearchScreen';
import SettingsScreen from './screens/SettingsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import FinanceScreen from './screens/FinanceScreen';
import AccountScreen from './screens/AccountScreen';
import AICompanionScreen from './screens/AICompanionScreen';
import GamesHubScreen from './screens/GamesHubScreen';
import GameScreen from './screens/GameScreen';
import TicTacToeScreen from './screens/TicTacToeScreen';
import PuzzleScreen from './screens/PuzzleScreen';
import TetrisScreen from './screens/TetrisScreen';
import MemoryGameScreen from './screens/MemoryGameScreen';
import SpaceInvadersScreen from './screens/SpaceInvadersScreen';
import type { SettingsSectionType } from './screens/SettingsScreen';
import { addDynamicNotif } from './utils/notifications';
import { backgroundTimer } from './utils/backgroundTimer';
import { Note } from './types';
import { generateId, verifyPin, createPinHash, encryptData } from './utils';
import { useAppStore } from './store';
import { useTranslation } from './translations';
import { getLargeItem, getLargeItemSync } from './utils/db';
import { isSwipeOnInteractiveOrScrollable, MIN_SWIPE_DISTANCE, MIN_SWIPE_RATIO, MAX_SWIPE_TIME_MS } from './utils/swipeUtils';
import {
  Icon3DNavHome,
  Icon3DNavTasks,
  Icon3DNavCalendar,
  Icon3DNavNotes,
  Icon3DNavSettings,
  Icon3DGoldLock,
  Icon3DShuffle,
  Icon3DBackspace,
  Icon3DWarning,
  Icon3DShield,
  Icon3DKey,
  Icon3DClose,
  Icon3DBell
} from './components/home/Organic3DIcons';
import { getOrganicThemePalette } from './components/home/organicThemePalettes';
import { LiteStickerIcon } from './components/LiteModeIcons';
import { safeReadStorage, safeWriteStorage, safeRemoveStorage } from './store-safety';

export type ScreenItem = 'home' | 'tasks' | 'search' | 'calendar' | 'finance' | 'settings' | 'note-editor' | 'game' | 'tictactoe' | 'puzzle' | 'tetris' | 'games-hub' | 'memory' | 'space-invaders' | 'ai-companion' | 'account';

// safe app logic

export default function App() {
  const { appPin, isUnlocked, setIsUnlocked, lang, tasks, notes, reminderActive, reminderTime, hasCompletedOnboarding, setHasCompletedOnboarding, isRefreshing, refreshStep, handleRefreshApp, isLiteMode, appVersion, transactions, moods, user, streak, debts, pinRecoveryQuestion, pinRecoveryAnswer, pinHistory, savingsTarget, savingsTargetTitle, savingsBalance, archivedTags, autoBackupFrequency, autoBackupFilenamePrefix, lastAutoBackupTimestamp, setLastAutoBackupTimestamp, autoBackupPin: storeAutoBackupPin, autoBackupPinHistory, createFullBackup, tataAccount } = useAppStore();
  const t = useTranslation(lang);

  const [currentScreen, _setCurrentScreen] = useState<ScreenItem>('home');
  const [screenExtra, setScreenExtra] = useState<any>(null);
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionType>(null);

  const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);
  const [enteredAutoBackupPin, setEnteredAutoBackupPin] = useState('');
  const [enteredAutoBackupPinError, setEnteredAutoBackupPinError] = useState(false);
  const [localToastMessage, setLocalToastMessage] = useState<string | null>(null);

  const appThemeInit = () => {
    const stored = safeReadStorage('tata_theme') as 'dark' | 'light' | 'pink' | 'cool' | 'cute' | 'simple' | 'organic' | 'wallpaper' | null;
    const currentVersion = safeReadStorage('tata_app_version') || 'lite';
    const base = stored || 'dark';
    if (currentVersion === 'lite' && (base === 'organic' || base === 'wallpaper')) return 'dark';
    if (currentVersion !== 'organic' && currentVersion !== 'pro_max' && base === 'organic') return 'dark';
    if (currentVersion === 'organic' || currentVersion === 'pro_max') return base || 'organic';
    return base;
  };

  const [appTheme, setAppTheme] = useState<'dark' | 'light' | 'pink' | 'cool' | 'cute' | 'simple' | 'organic' | 'wallpaper'>(appThemeInit);

  const [wallpaperAccent, setWallpaperAccent] = useState<string>(() => safeReadStorage('tata_wallpaper_accent') || 'blue');

  useEffect(() => {
    safeWriteStorage('tata_theme', appTheme);
  }, [appTheme]);

  useEffect(() => {
    safeWriteStorage('tata_wallpaper_accent', wallpaperAccent);
  }, [wallpaperAccent]);

  useEffect(() => {
    const handleAccentChange = () => {
      const stored = safeReadStorage('tata_wallpaper_accent');
      if (stored) setWallpaperAccent(stored);
    };
    const handleSettingsChange = () => {
      try {
        setWallpaperDim(parseInt(safeReadStorage('tata_wallpaper_dim') || '35', 10));
        setWallpaperBlur(parseInt(safeReadStorage('tata_wallpaper_blur') || '0', 10));
        setWallpaperFit((safeReadStorage('tata_wallpaper_fit') as 'cover' | 'contain') || 'cover');
        setWallpaperPosition((safeReadStorage('tata_wallpaper_position') as 'center' | 'top' | 'bottom') || 'center');
      } catch (e) {
        console.warn('[Tata Storage] Failed to sync wallpaper settings safely.', e);
      }
    };

    window.addEventListener('tata_wallpaper_accent_changed', handleAccentChange);
    window.addEventListener('tata_wallpaper_settings_changed', handleSettingsChange);
    return () => {
      window.removeEventListener('tata_wallpaper_accent_changed', handleAccentChange);
      window.removeEventListener('tata_wallpaper_settings_changed', handleSettingsChange);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.history.replaceState({ screen: 'home', section: null }, '');
    } catch (e) {
      console.warn('[Tata App] Failed to replace history state safely.', e);
    }
  }, []);

  const [customWallpaper, setCustomWallpaper] = useState<string | null>(() => getLargeItemSync('tata_custom_wallpaper'));
  const [wallpaperDim, setWallpaperDim] = useState<number>(() => parseInt(safeReadStorage('tata_wallpaper_dim') || '35', 10));
  const [wallpaperBlur, setWallpaperBlur] = useState<number>(() => parseInt(safeReadStorage('tata_wallpaper_blur') || '0', 10));
  const [wallpaperFit, setWallpaperFit] = useState<'cover' | 'contain'>(() => (safeReadStorage('tata_wallpaper_fit') as 'cover' | 'contain') || 'cover');
  const [wallpaperPosition, setWallpaperPosition] = useState<'center' | 'top' | 'bottom'>(() => (safeReadStorage('tata_wallpaper_position') as 'center' | 'top' | 'bottom') || 'center');

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinute = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;
      const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
      const todayDate = localDate.toISOString().split('T')[0];
      let lastNotif = safeReadStorage('tata_last_notif_date_time') || '';

      const sendNotification = (title: string, body: string, isImportant: boolean = false, noteId?: string, isMissedBacklog: boolean = false) => {
        const id = Date.now();
        const isVisible = document.visibilityState === 'visible';
        if (typeof addDynamicNotif === 'function') {
          try {
            addDynamicNotif({ title: isMissedBacklog ? `[${lang === 'id' ? 'Terlewat' : 'Missed'}] ${title}` : title, body, type: noteId ? 'note' : isImportant ? 'task' : 'general', targetScreen: noteId ? 'note-editor' : 'tasks', targetId: noteId, priority: isImportant ? 'high' : 'medium' });
          } catch (e) {
            console.warn('[Tata App] Failed to push notification badge safely.', e);
          }
        }
        if (isMissedBacklog) return;
        setInAppAlarm({ title, body, id, isAlarm: isImportant, noteId });
        if (!isImportant) {
          setTimeout(() => setInAppAlarm(prev => prev && prev.id === id ? null : prev), 10000);
        }
      };

      if (reminderActive && reminderTime && currentTime >= reminderTime && lastNotif !== `${todayDate}_${reminderTime}`) {
        safeWriteStorage('tata_last_notif_date_time', `${todayDate}_${reminderTime}`);
        const todayTasks = tasks.filter(t => t.date === todayDate || t.date === 'Hari ini' || (t.date && t.date.toLowerCase() === 'today') || t.repeat === 'daily');
        const hasTaskOpen = todayTasks.some(task => !task.completed);
        const title = hasTaskOpen ? (lang === 'id' ? 'Jangan lewatkan hari ini' : 'Don\'t miss today') : (lang === 'id' ? 'Kerja bagus!' : 'Nice work!');
        const body = hasTaskOpen ? (lang === 'id' ? 'Ada tugas yang menunggu Anda.' : 'You still have tasks waiting.') : (lang === 'id' ? 'Semua tugas hari ini sudah selesai.' : 'Everything is done for today.');
        sendNotification(title, body, false);
      }
    };

    checkNotifications();
    const unsubscribeBgTimer = backgroundTimer.subscribe(checkNotifications);
    return () => unsubscribeBgTimer();
  }, [reminderActive, reminderTime, tasks, lang]);

  return null;
}

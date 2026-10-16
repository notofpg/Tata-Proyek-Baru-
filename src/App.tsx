/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { playTapSound } from "./utils/sound";
import { Home, CheckCircle2, Calendar as CalendarIcon, Settings, Lock, Layers, Bell, X, Wallet, WifiOff, FileText, Database, Download, AlertTriangle, Bot, Sparkles, Shuffle, RefreshCw, Gamepad2, KeyRound, Delete, ShieldCheck } from 'lucide-react';
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

// Mini-games bundled for offline instant play
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

export type ScreenItem = 'home' | 'tasks' | 'search' | 'calendar' | 'finance' | 'settings' | 'note-editor' | 'game' | 'tictactoe' | 'puzzle' | 'tetris' | 'games-hub' | 'memory' | 'space-invaders' | 'ai-companion' | 'account';

let activeAudioCtx: AudioContext | null = null;
let activeInterval: NodeJS.Timeout | null = null;

export const stopGlobalAudio = () => {
  if (activeAudioCtx) {
    activeAudioCtx.close().catch(() => {});
    activeAudioCtx = null;
  }
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }
};

export default function App() {
  const { 
    appPin, isUnlocked, setIsUnlocked, lang, tasks, notes, 
    reminderActive, reminderTime, hasCompletedOnboarding, setHasCompletedOnboarding,
    isRefreshing, refreshStep, handleRefreshApp, isLiteMode, appVersion,
    transactions, moods, user, streak, debts, pinRecoveryQuestion, pinRecoveryAnswer, pinHistory,
    savingsTarget, savingsTargetTitle, savingsBalance, archivedTags,
    autoBackupFrequency, autoBackupFilenamePrefix, lastAutoBackupTimestamp, setLastAutoBackupTimestamp,
    autoBackupPin: storeAutoBackupPin, autoBackupPinHistory, createFullBackup, tataAccount
  } = useAppStore();
  const t = useTranslation(lang);
  const [currentScreen, _setCurrentScreen] = useState<ScreenItem>('home');
  const [screenExtra, setScreenExtra] = useState<any>(null);
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionType>(null);

  const [showAutoBackupModal, setShowAutoBackupModal] = useState(false);
  const [enteredAutoBackupPin, setEnteredAutoBackupPin] = useState('');
  const [enteredAutoBackupPinError, setEnteredAutoBackupPinError] = useState(false);
  const [localToastMessage, setLocalToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleToast = (e: any) => {
      const msg = e.detail?.message;
      if (msg) {
        setLocalToastMessage(msg);
        setTimeout(() => setLocalToastMessage(null), 3500);
      }
    };
    window.addEventListener('tata_toast_message', handleToast);
    return () => window.removeEventListener('tata_toast_message', handleToast);
  }, []);

  const getAutoBackupFilename = useCallback(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const prefix = autoBackupFilenamePrefix.trim() || 'tata_backup';
    return `${prefix}_auto_${yyyy}-${mm}-${dd}_${hh}-${min}`;
  }, [autoBackupFilenamePrefix]);

  useEffect(() => {
    if (autoBackupFrequency === 'off') return;
    if (!hasCompletedOnboarding) return;
    
    let intervalMs = 0;
    if (autoBackupFrequency === '3_days') {
      intervalMs = 3 * 24 * 60 * 60 * 1000;
    } else if (autoBackupFrequency === '1_week') {
      intervalMs = 7 * 24 * 60 * 60 * 1000;
    } else if (autoBackupFrequency === '1_month') {
      intervalMs = 30 * 24 * 60 * 60 * 1000;
    }
    
    if (intervalMs === 0) return;
    
    const now = Date.now();
    
    // If it is the first time running (timestamp === 0), set to now so scheduler starts.
    if (lastAutoBackupTimestamp === 0) {
      setLastAutoBackupTimestamp(now);
      return;
    }
    
    const timeDiff = now - lastAutoBackupTimestamp;
    if (timeDiff >= intervalMs) {
      setShowAutoBackupModal(true);
    }
  }, [autoBackupFrequency, lastAutoBackupTimestamp, hasCompletedOnboarding, setLastAutoBackupTimestamp]);

  const executeAutoBackup = async () => {
    try {
      if (storeAutoBackupPin) {
        const isValid = await verifyPin(enteredAutoBackupPin, storeAutoBackupPin || '');
        if (!isValid && enteredAutoBackupPin !== storeAutoBackupPin) {
          setEnteredAutoBackupPinError(true);
          setEnteredAutoBackupPin('');
          setTimeout(() => setEnteredAutoBackupPinError(false), 2500);
          return;
        }
      }

      const exportData = await createFullBackup();
      
      const dataStr = JSON.stringify(exportData);
      let fileData = dataStr;

      if (storeAutoBackupPin && enteredAutoBackupPin) {
        fileData = await encryptData(dataStr, enteredAutoBackupPin);
      }

      const blob = new Blob([fileData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const filename = `${getAutoBackupFilename()}.json`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setLastAutoBackupTimestamp(Date.now());
      setShowAutoBackupModal(false);
      setEnteredAutoBackupPin('');
      
      setLocalToastMessage(lang === 'id' ? `Backup otomatis berhasil diunduh!` : `Auto backup downloaded!`);
      setTimeout(() => setLocalToastMessage(null), 3000);
    } catch (e) {
      console.error("Auto backup failed", e);
    }
  };

  const snoozeAutoBackup = () => {
    const oneDayInMs = 24 * 60 * 60 * 1000;
    let intervalMs = 0;
    if (autoBackupFrequency === '3_days') intervalMs = 3 * 24 * 60 * 60 * 1000;
    else if (autoBackupFrequency === '1_week') intervalMs = 7 * 24 * 60 * 60 * 1000;
    else if (autoBackupFrequency === '1_month') intervalMs = 30 * 24 * 60 * 60 * 1000;
    
    setLastAutoBackupTimestamp(Date.now() - intervalMs + oneDayInMs);
    setShowAutoBackupModal(false);
    setEnteredAutoBackupPin('');
    
    setLocalToastMessage(lang === 'id' ? "Pencadangan ditunda 1 hari." : "Backup postponed for 1 day.");
    setTimeout(() => setLocalToastMessage(null), 3000);
  };

  const [slideDirection, setSlideDirection] = useState<number>(0);
  const lastSwipeTimeRef = React.useRef<number>(0);
  const previousScreenRef = React.useRef<ScreenItem>('home');

  const openNote = useCallback((noteOrId: Note | string) => {
    if (currentScreen !== 'note-editor') {
      previousScreenRef.current = currentScreen;
    }
    if (typeof noteOrId === 'string') {
      const found = notes.find(n => n.id === noteOrId);
      if (found) {
        setActiveNote(found);
      } else {
        setActiveNote({
          id: noteOrId,
          title: '',
          content: '',
          date: new Date().toISOString().split('T')[0],
          tags: []
        });
      }
    } else {
      setActiveNote(noteOrId);
    }
    window.history.pushState({ screen: 'note-editor', section: null }, '');
    _setCurrentScreen('note-editor');
  }, [currentScreen, notes]);

  const closeNote = useCallback(() => {
    setActiveNote(null);
    const target = previousScreenRef.current || 'home';
    _setCurrentScreen(target);
  }, []);

  const setCurrentScreen = useCallback((screen: ScreenItem, extra: any = null) => {
    if (isLiteMode && ['game', 'tictactoe', 'puzzle', 'tetris', 'memory', 'space-invaders', 'games-hub'].includes(screen)) {
      screen = 'home';
    }

    if (screen === 'note-editor') {
      if (extra) {
        openNote(extra);
        return;
      } else if (!activeNote) {
        openNote({
          id: generateId(),
          title: '',
          content: '',
          date: new Date().toISOString().split('T')[0],
          tags: []
        });
        return;
      }
    }

    let section: any = null;
    if (screen === 'settings' && typeof extra === 'string') {
      section = extra;
    }

    if (currentScreen !== 'note-editor') {
      previousScreenRef.current = currentScreen;
    }

    const MAIN_NAV_ORDER: ScreenItem[] = ['home', 'tasks', 'calendar', 'search', 'settings'];
    const currentIdx = MAIN_NAV_ORDER.indexOf(currentScreen);
    const nextIdx = MAIN_NAV_ORDER.indexOf(screen);
    if (currentIdx !== -1 && nextIdx !== -1) {
      if (nextIdx > currentIdx) setSlideDirection(1);
      else if (nextIdx < currentIdx) setSlideDirection(-1);
      else setSlideDirection(0);
    } else {
      setSlideDirection(0);
    }

    window.history.pushState({ screen, section }, '');
    setScreenExtra(extra);
    _setCurrentScreen(screen);
    setActiveSettingsSection(section);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [isLiteMode, currentScreen, openNote]);

  const mainTouchStartRef = React.useRef<{ x: number; y: number; time: number; target: HTMLElement | null } | null>(null);

  const handleMainTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    mainTouchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
      target,
    };
  };

  const handleMainTouchEnd = (e: React.TouchEvent) => {
    if (!mainTouchStartRef.current) return;
    const startTarget = mainTouchStartRef.current.target;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - mainTouchStartRef.current.x;
    const deltaY = touch.clientY - mainTouchStartRef.current.y;
    const deltaTime = Date.now() - mainTouchStartRef.current.time;
    mainTouchStartRef.current = null;

    if (deltaTime > MAX_SWIPE_TIME_MS) return;

    const now = Date.now();
    if (now - lastSwipeTimeRef.current < 200) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    // Require intentional horizontal movement ratio
    if (absX < absY * MIN_SWIPE_RATIO) return;

    // Must exceed minimum swipe distance threshold
    if (absX < MIN_SWIPE_DISTANCE) return;

    // Ignore swipe if touch started or ended on interactive/scrollable elements (tags, buttons, sliders, horizontal lists, settings pills)
    const endTarget = e.target as HTMLElement | null;
    if (isSwipeOnInteractiveOrScrollable(startTarget) || isSwipeOnInteractiveOrScrollable(endTarget)) {
      return;
    }

    const MAIN_NAV_ORDER: ScreenItem[] = ['home', 'tasks', 'calendar', 'search', 'settings'];
    if (!MAIN_NAV_ORDER.includes(currentScreen)) return;

    const idx = MAIN_NAV_ORDER.indexOf(currentScreen);
    if (idx === -1) return;

    if (deltaX < 0) {
      // Swiped Left -> Go to Next Screen
      if (idx < MAIN_NAV_ORDER.length - 1) {
        lastSwipeTimeRef.current = now;
        setCurrentScreen(MAIN_NAV_ORDER[idx + 1]);
      }
    } else if (deltaX > 0) {
      // Swiped Right -> Go to Prev Screen
      if (idx > 0) {
        lastSwipeTimeRef.current = now;
        setCurrentScreen(MAIN_NAV_ORDER[idx - 1]);
      }
    }
  };

  useEffect(() => {
    try {
      window.history.replaceState({ screen: 'home', section: null }, '');
    } catch (e) {}
    _setCurrentScreen('home');
    setActiveSettingsSection(null);

    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.screen) {
        _setCurrentScreen(e.state.screen);
        setActiveSettingsSection(e.state.section || null);
      } else {
        _setCurrentScreen('home');
        setActiveSettingsSection(null);
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [currentScreen]);

  const [appTheme, setAppTheme] = useState<'dark' | 'light' | 'pink' | 'cool' | 'cute' | 'simple' | 'organic' | 'wallpaper'>(() => {
    try {
      const stored = (localStorage.getItem('tata_theme') as 'dark' | 'light' | 'pink' | 'cool' | 'cute' | 'simple' | 'organic' | 'wallpaper') || 'dark';
      const currentVersion = localStorage.getItem('tata_app_version') || 'lite';
      if (currentVersion === 'lite' && (stored === 'organic' || stored === 'wallpaper')) {
        return 'dark';
      }
      if (currentVersion !== 'organic' && currentVersion !== 'pro_max' && stored === 'organic') {
        return 'dark';
      }
      if (currentVersion === 'organic' || currentVersion === 'pro_max') {
        return stored || 'organic';
      }
      return stored;
    } catch (e) {
      return 'dark';
    }
  });

  const [wallpaperAccent, setWallpaperAccent] = useState<string>(() => {
    try {
      return localStorage.getItem('tata_wallpaper_accent') || 'blue';
    } catch (e) {
      return 'blue';
    }
  });

  const [customWallpaper, setCustomWallpaper] = useState<string | null>(() => getLargeItemSync("tata_custom_wallpaper"));
  const [wallpaperDim, setWallpaperDim] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('tata_wallpaper_dim') || '35', 10);
    } catch (e) {
      return 35;
    }
  });
  const [wallpaperBlur, setWallpaperBlur] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('tata_wallpaper_blur') || '0', 10);
    } catch (e) {
      return 0;
    }
  });
  const [wallpaperFit, setWallpaperFit] = useState<'cover' | 'contain'>(() => {
    try {
      return (localStorage.getItem('tata_wallpaper_fit') as 'cover' | 'contain') || 'cover';
    } catch (e) {
      return 'cover';
    }
  });
  const [wallpaperPosition, setWallpaperPosition] = useState<'center' | 'top' | 'bottom'>(() => {
    try {
      return (localStorage.getItem('tata_wallpaper_position') as 'center' | 'top' | 'bottom') || 'center';
    } catch (e) {
      return 'center';
    }
  });
  
  useEffect(() => {
    getLargeItem('tata_custom_wallpaper').then(setCustomWallpaper);
  }, []);
  
  useEffect(() => {
    try {
      localStorage.setItem('tata_theme', appTheme);
    } catch (e) {}
  }, [appTheme]);

  useEffect(() => {
    if (appVersion !== 'organic' && appVersion !== 'pro_max' && appTheme === 'organic') {
      setAppTheme('dark');
    }
  }, [appVersion, appTheme]);

  useEffect(() => {
    try {
      localStorage.setItem('tata_wallpaper_accent', wallpaperAccent);
    } catch (e) {}
  }, [wallpaperAccent]);

  useEffect(() => {
    const handleWallpaperChange = () => {
      getLargeItem('tata_custom_wallpaper').then(setCustomWallpaper);
    };
    const handleAccentChange = () => {
      try {
        const stored = localStorage.getItem('tata_wallpaper_accent');
        if (stored) setWallpaperAccent(stored);
      } catch (e) {}
    };
    const handleSettingsChange = () => {
      try {
        setWallpaperDim(parseInt(localStorage.getItem('tata_wallpaper_dim') || '35', 10));
        setWallpaperBlur(parseInt(localStorage.getItem('tata_wallpaper_blur') || '0', 10));
        setWallpaperFit((localStorage.getItem('tata_wallpaper_fit') as 'cover' | 'contain') || 'cover');
        setWallpaperPosition((localStorage.getItem('tata_wallpaper_position') as 'center' | 'top' | 'bottom') || 'center');
      } catch (e) {}
    };

    window.addEventListener('tata_wallpaper_changed', handleWallpaperChange);
    window.addEventListener('tata_wallpaper_accent_changed', handleAccentChange);
    window.addEventListener('tata_wallpaper_settings_changed', handleSettingsChange);
    return () => {
      window.removeEventListener('tata_wallpaper_changed', handleWallpaperChange);
      window.removeEventListener('tata_wallpaper_accent_changed', handleAccentChange);
      window.removeEventListener('tata_wallpaper_settings_changed', handleSettingsChange);
    };
  }, []);
  const [activeNote, setActiveNote] = useState<Note | null>(null);
  const [inAppAlarm, setInAppAlarm] = useState<{id: number, title: string, body: string, isAlarm?: boolean, noteId?: string} | null>(null);

  // Listen to navigation events from Service Worker notification click
  useEffect(() => {
    const handleSwMessage = (e: MessageEvent) => {
      if (e.data?.type === 'NAVIGATE_FROM_NOTIFICATION') {
        if (e.data.targetScreen === 'note-editor' && e.data.targetId) {
          const note = notes.find(n => n.id === e.data.targetId);
          if (note) {
            setActiveNote(note);
            setCurrentScreen('note-editor');
          }
        } else if (e.data.targetScreen) {
          setCurrentScreen(e.data.targetScreen as any);
        }
      }
    };
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSwMessage);
      return () => {
        navigator.serviceWorker.removeEventListener('message', handleSwMessage);
      };
    }
  }, [notes]);

  // Handle PWA Long-Press Desktop/Mobile Shortcuts URL parameters
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const targetScreen = searchParams.get('screen');
      if (targetScreen) {
        if (targetScreen === 'note-editor') {
          setActiveNote(null);
          setCurrentScreen('note-editor');
        } else if (['home', 'tasks', 'calendar', 'finance', 'settings', 'account'].includes(targetScreen)) {
          setCurrentScreen(targetScreen as ScreenItem);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const now = new Date();
    const todayDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const pendingAlarms: Array<{
      id: string;
      title: string;
      body: string;
      targetTime: number;
      targetScreen: string;
      targetId?: string;
    }> = [];

    // 1. Task scheduling
    tasks.forEach(task => {
      if (task.completed || !task.alarmTime) return;
      let isToday = false;
      if (task.date === 'Hari ini' || (task.date && task.date.toLowerCase() === 'today') || task.date === todayDate || task.repeat === 'daily' || task.isDiscipline) {
        isToday = true;
      }
      if (isToday) {
        const [alarmHour, alarmMinute] = task.alarmTime.split(':').map(Number);
        const targetTime = new Date();
        targetTime.setHours(alarmHour, alarmMinute, 0, 0);
        if (targetTime.getTime() > now.getTime()) {
          pendingAlarms.push({
            id: `task_${task.id}`,
            title: lang === 'id' ? "Waktunya Tugas!" : "Task Due!",
            body: lang === 'id' ? `Ayo lakukan tugas "${task.title}" kamu!` : `Time to do your task: "${task.title}"!`,
            targetTime: targetTime.getTime(),
            targetScreen: 'tasks',
            targetId: task.id
          });
        }
      }
    });

    // 2. Note scheduling
    notes.forEach(note => {
      if (note.isArchived || !note.reminder) return;
      try {
        const targetTime = new Date(note.reminder);
        if (targetTime.getTime() > now.getTime()) {
          const bodyText = t('notifNoteBody')
            ? t('notifNoteBody').replace('{title}', note.title || (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note'))
            : `Ketuk untuk membuka catatan: "${note.title || 'Catatan'}"`;
          pendingAlarms.push({
            id: `note_${note.id}`,
            title: t('noteReminderTitle') || "Catatan Pengingat",
            body: bodyText,
            targetTime: targetTime.getTime(),
            targetScreen: 'note-editor',
            targetId: note.id
          });
        }
      } catch (e) {}
    });

    // 3. Global Daily Reminder scheduling
    if (reminderActive && reminderTime) {
      try {
        const [remH, remM] = reminderTime.split(':').map(Number);
        const targetTime = new Date();
        targetTime.setHours(remH, remM, 0, 0);
        if (targetTime.getTime() > now.getTime()) {
          pendingAlarms.push({
            id: `global_daily_${todayDate}`,
            title: t('notifPendingTitle') || "Pengingat Harian Tata",
            body: t('notifPendingBody') || "Selesaikan target produktivitasmu hari ini di Tata.",
            targetTime: targetTime.getTime(),
            targetScreen: 'home'
          });
        }
      } catch (e) {}
    }

    // 4. Debt Due Date Reminders
    if (debts && Array.isArray(debts)) {
      debts.forEach(debt => {
        if (debt.dueDate === todayDate && (debt.remainingAmount === undefined || debt.remainingAmount > 0)) {
          const targetTime = new Date();
          targetTime.setHours(9, 0, 0, 0); // 9:00 AM
          if (targetTime.getTime() > now.getTime()) {
            pendingAlarms.push({
              id: `debt_${debt.id}_${todayDate}`,
              title: lang === 'id' ? `Tagihan Hari Ini: ${debt.title}` : `Bill Due Today: ${debt.title}`,
              body: lang === 'id' 
                ? `Cicilan Rp ${(debt.installmentAmount || 0).toLocaleString('id-ID')} jatuh tempo hari ini.`
                : `Payment due today.`,
              targetTime: targetTime.getTime(),
              targetScreen: 'finance',
              targetId: debt.id
            });
          }
        }
      });
    }

    // Sync pending alarms to Service Worker for background handling & periodic sync
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const sw = reg.active || navigator.serviceWorker.controller;
          if (sw) {
            sw.postMessage({ type: 'SYNC_ALARMS', alarms: pendingAlarms });
          }

          // Register Periodic Background Sync if supported (Chromium PWA)
          if ('periodicSync' in reg) {
            try {
              // @ts-ignore
              await reg.periodicSync.register('tata-alarm-check', {
                minInterval: 15 * 60 * 1000
              });
            } catch (e) {}
          }

          // Attempt showTrigger if Notification Triggers API is available in browser
          if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && 'showTrigger' in window.Notification.prototype && window.Notification.permission === 'granted') {
            const TimestampTriggerClass = (window as any).TimestampTrigger;
            if (TimestampTriggerClass) {
              for (const alarm of pendingAlarms) {
                if (alarm.targetTime - now.getTime() < 7 * 24 * 60 * 60 * 1000) {
                  const notificationOptions: any = {
                    tag: `tata_trig_${alarm.id}`,
                    body: alarm.body,
                    icon: '/icon.png',
                    badge: '/icon.png',
                    vibrate: [300, 100, 300, 100, 300],
                    data: { targetScreen: alarm.targetScreen, targetId: alarm.targetId, url: '/' },
                    showTrigger: new TimestampTriggerClass(alarm.targetTime)
                  };
                  reg.showNotification(alarm.title, notificationOptions).catch(() => {});
                }
              }
            }
          }
        } catch (e) {}
      }).catch(() => {});
    }
  }, [tasks, notes, debts, reminderActive, reminderTime, lang, t]);

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const currentHour = now.getHours().toString().padStart(2, '0');
      const currentMinute = now.getMinutes().toString().padStart(2, '0');
      const currentTime = `${currentHour}:${currentMinute}`;
      
      const localDate = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
      const todayDate = localDate.toISOString().split('T')[0];
      let lastNotif = '';
      try { lastNotif = localStorage.getItem('tata_last_notif_date_time') || ''; } catch(e) {}
      
      const sendNotification = (title: string, body: string, isImportant: boolean = false, noteId?: string, isMissedBacklog: boolean = false) => {
        const id = Date.now();
        const isVisible = document.visibilityState === 'visible';
        
        // Add to persistent notification list for the Bell icon
        try {
          addDynamicNotif({
            title: isMissedBacklog ? `[${lang === 'id' ? 'Terlewat' : 'Missed'}] ${title}` : title,
            body,
            type: noteId ? 'note' : isImportant ? 'task' : 'general',
            targetScreen: noteId ? 'note-editor' : 'tasks',
            targetId: noteId,
            priority: isImportant ? 'high' : 'medium'
          });
        } catch(e) {}

        // If it's a missed backlog (user opened app hours after the scheduled time),
        // we record it in the notification list without popping up an abrasive alarm modal
        if (isMissedBacklog) {
          return;
        }

        // Tampilkan In-App Notification modal saat aplikasi aktif
        setInAppAlarm({title, body, id, isAlarm: isImportant, noteId});
        if (!isImportant) {
          setTimeout(() => setInAppAlarm(prev => prev && prev.id === id ? null : prev), 10000);
        }

        if (isVisible) {
          // App terbuka: Bunyikan suara notifikasi + Vibrate
          stopGlobalAudio();
          
          if ("vibrate" in navigator) {
            try { navigator.vibrate([200, 100, 200]); } catch(e) {}
          }
          
          try {
             activeAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
             const playBeep = () => {
               if (!activeAudioCtx) return;
               const osc = activeAudioCtx.createOscillator();
               const gain = activeAudioCtx.createGain();
               osc.connect(gain);
               gain.connect(activeAudioCtx.destination);
               osc.type = 'sine';
               osc.frequency.setValueAtTime(isImportant ? 880 : 660, activeAudioCtx.currentTime);
               osc.frequency.exponentialRampToValueAtTime(440, activeAudioCtx.currentTime + 0.1);
               gain.gain.setValueAtTime(0.5, activeAudioCtx.currentTime);
               gain.gain.exponentialRampToValueAtTime(0.01, activeAudioCtx.currentTime + 0.5);
               osc.start(activeAudioCtx.currentTime);
               osc.stop(activeAudioCtx.currentTime + 0.5);
             };
             playBeep();
          } catch(e) {}

        } else {
          // App di latar belakang/tertutup/minimize: Picu Notifikasi Sistem OS via Service Worker
          if (typeof window !== 'undefined' && 'Notification' in window && window.Notification && window.Notification.permission === 'granted') {
            const options: any = { 
              body: body, 
              icon: '/icon.png', 
              badge: '/icon.png',
              vibrate: [300, 100, 300, 100, 300],
              requireInteraction: isImportant,
              silent: false,
              data: { url: '/', targetScreen: noteId ? 'note-editor' : 'tasks', targetId: noteId }
            };
            
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.ready.then(reg => {
                reg.showNotification(title, options);
              }).catch(() => {
                try {
                  new window.Notification(title, options);
                } catch (e) {}
              });
            } else {
              try {
                new window.Notification(title, options);
              } catch (e) {}
            }
          }
        }
      };

      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

      // 1. Global Daily Reminder
      const [remHour, remMin] = (reminderTime || '00:00').split(':').map(Number);
      const remTotalMinutes = remHour * 60 + remMin;
      const remDiffMinutes = currentTotalMinutes - remTotalMinutes;

      if (reminderActive && reminderTime && remDiffMinutes >= 0 && lastNotif !== `${todayDate}_${reminderTime}`) {
        try { localStorage.setItem('tata_last_notif_date_time', `${todayDate}_${reminderTime}`); } catch(e){}
        const todayTasks = tasks.filter(t => {
            if (t.date === 'Hari ini' || (t.date && t.date.toLowerCase() === 'today') || t.repeat === 'daily') return true;
            return t.date === todayDate;
        });
        const allCompleted = todayTasks.length > 0 && todayTasks.every(t => t.completed);
        const hasTasks = todayTasks.length > 0;
        
        let title = '';
        let body = '';
        if (hasTasks && allCompleted) {
          title = t('notifAllDoneTitle') || "Kerja Bagus!";
          body = t('notifAllDoneBody') || "Semua tugas hari ini telah selesai. Pertahankan streakmu.";
        } else {
          title = t('notifPendingTitle') || "Jangan Putus Streak Hari Ini";
          body = t('notifPendingBody') || "Masih ada tugas yang menunggu. Selesaikan targetmu hari ini di Tata.";
        }
        
        // If scheduled within past 45 mins, trigger alert; if older, record quietly
        const isBacklog = remDiffMinutes > 45;
        sendNotification(title, body, false, undefined, isBacklog);
      }

      // 2. Individual Task Notifications
      tasks.forEach(task => {
        if (task.completed || !task.alarmTime) return;

        let isToday = false;
        if (task.date === 'Hari ini' || (task.date && task.date.toLowerCase() === 'today') || task.date === todayDate || task.repeat === 'daily' || task.isDiscipline) {
          isToday = true;
        }

        if (isToday) {
           const [alarmHour, alarmMinute] = task.alarmTime.split(':').map(Number);
           const alarmTotalMinutes = alarmHour * 60 + alarmMinute;
           const diffMinutes = currentTotalMinutes - alarmTotalMinutes;

           if (diffMinutes >= 0) {
             const alarmKey = `tata_alarm_${task.id}_${todayDate}`;
             try {
               if (!localStorage.getItem(alarmKey)) {
                 localStorage.setItem(alarmKey, 'true');
                 const message = lang === 'id' ? `Ayo lakukan tugas "${task.title}" kamu!` : `Time to do your task: "${task.title}"!`;
                 // If more than 30 mins late when app checked, mark as missed backlog
                 const isMissed = diffMinutes > 30;
                 sendNotification(t('alarmDue') || "Waktunya Tugas!", message, true, undefined, isMissed);
               }
             } catch(e) {}
           }
        }
      });

      // 3. Note Reminders
      notes.forEach(note => {
        if (note.isArchived || !note.reminder) return;

        try {
          const reminderTimeMs = new Date(note.reminder).getTime();
          const nowMs = now.getTime();
          const diffMs = nowMs - reminderTimeMs;
          
          if (diffMs >= 0) {
            const reminderKey = `tata_note_reminder_${note.id}`;
            if (!localStorage.getItem(reminderKey)) {
              localStorage.setItem(reminderKey, 'true');
              
              const bodyText = t('notifNoteBody')
                ? t('notifNoteBody').replace('{title}', note.title || (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note'))
                : `Ketuk untuk membuka catatan: "${note.title || 'Catatan'}"`;
              
              // If more than 30 mins late, record quietly
              const isMissed = diffMs > 30 * 60 * 1000;
              sendNotification(
                t('noteReminderTitle') || "Catatan Pengingat!",
                bodyText,
                true,
                note.id,
                isMissed
              );
            }
          }
        } catch (e) {}
      });
      
    }; // End of checkNotifications

    checkNotifications();
    // Subscribe to Background Worker timer so ticks persist when app is minimized without duplicate timers
    const unsubscribeBgTimer = backgroundTimer.subscribe(checkNotifications);
    
    return () => {
      unsubscribeBgTimer();
    };
  }, [reminderActive, reminderTime, tasks, notes, t, lang]);

  // Jika PIN ada tp belum diunlock, kita tampilkan layar kunci
  const isLocked = !!appPin && !isUnlocked;

  const isOrganic = !isLiteMode && appVersion !== 'lite' && (appVersion === 'organic' || appVersion === 'pro_max' || appTheme === 'organic' || tataAccount?.premiumType === 'pro_max');

  const activeTheme = isLiteMode && appTheme === 'wallpaper' 
    ? 'dark' 
    : appTheme;

  // Dynamically synchronize theme-color meta tag and body background for edge-to-edge full screen
  useEffect(() => {
    const themeColors: Record<string, string> = {
      organic: '#F7F3E9',
      light: '#F8FAFC',
      cute: '#FDF8EB',
      pink: '#FDF2F8',
      simple: '#141210',
      cool: '#050811',
      wallpaper: '#020617',
      dark: '#020617',
      slate: '#020617',
    };

    const color = themeColors[activeTheme] || '#020617';
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = activeTheme === 'wallpaper' ? '#000000' : color;
      document.documentElement.style.backgroundColor = activeTheme === 'wallpaper' ? '#000000' : color;

      let metaThemeColor = document.querySelector("meta[name='theme-color']");
      if (!metaThemeColor) {
        metaThemeColor = document.createElement('meta');
        metaThemeColor.setAttribute('name', 'theme-color');
        document.head.appendChild(metaThemeColor);
      }
      metaThemeColor.setAttribute('content', color);
    }
  }, [activeTheme]);

  const getThemeClass = () => {
    let base = '';
    if (activeTheme === 'organic') base = 'organic-theme pro-max-theme bg-[#F7F3E9] text-[#24170D]';
    else if (activeTheme === 'simple') base = 'simple-theme bg-[#141210] text-stone-100';
    else if (activeTheme === 'light') base = 'light-theme bg-[#F8FAFC] text-slate-900';
    else if (activeTheme === 'pink') base = 'pink-theme bg-[#FDF2F8] text-[#500724]';
    else if (activeTheme === 'cool') base = 'cool-theme bg-[#050811] text-slate-100';
    else if (activeTheme === 'cute') base = 'cute-theme bg-[#FDF8EB] text-[#38230F]';
    else if (activeTheme === 'wallpaper') base = `wallpaper-theme wallpaper-accent-${wallpaperAccent} bg-transparent`;
    else base = 'bg-slate-950 text-slate-100';
    
    return base;
  };

  const renderAppBackground = () => {
    if (isLiteMode || activeTheme !== 'wallpaper') return null;

    const bgUrl = customWallpaper;

    if (!bgUrl) {
      return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none bg-gradient-to-br from-slate-950 via-[#090d1f] to-[#020617]">
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.3),rgba(255,255,255,0))]" />
          <div className="absolute inset-0 bg-slate-950/40" />
        </div>
      );
    }

    const positionClass = 
      wallpaperPosition === 'top' ? 'object-top' :
      wallpaperPosition === 'bottom' ? 'object-bottom' :
      'object-center';

    return (
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none">
        {wallpaperFit === 'contain' ? (
          <>
            {/* Ambient blurred backdrop so contain has no harsh borders */}
            <img 
              src={bgUrl} 
              alt="Ambient Background" 
              className="absolute inset-0 w-full h-full object-cover scale-110 blur-2xl opacity-60 pointer-events-none"
              referrerPolicy="no-referrer"
            />
            {/* Contained image showing 100% of photo without any cropping */}
            <img 
              src={bgUrl} 
              alt="Main Background" 
              className={`relative w-full h-full object-contain ${positionClass} pointer-events-none`}
              style={{ filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : undefined }}
              referrerPolicy="no-referrer"
            />
          </>
        ) : (
          <img 
            src={bgUrl} 
            alt="Background" 
            className={`w-full h-full object-cover ${positionClass} pointer-events-none`}
            style={{ filter: wallpaperBlur > 0 ? `blur(${wallpaperBlur}px)` : undefined }}
            referrerPolicy="no-referrer"
          />
        )}
        {/* Dynamic dimming overlay */}
        <div 
          className="absolute inset-0 bg-slate-950 pointer-events-none transition-opacity duration-200" 
          style={{ opacity: Math.max(0.05, Math.min(0.9, wallpaperDim / 100)) }}
        />
      </div>
    );
  };

  if (!hasCompletedOnboarding) {
    return (
      <div className={`w-full h-[100dvh] flex flex-col md:flex-row ${getThemeClass()} font-sans relative overflow-hidden`}>
        {renderAppBackground()}
        {(activeTheme === 'cool' || activeTheme === 'cute') && (
          <div className="absolute inset-0 bg-slate-950/40 z-0 pointer-events-none" />
        )}
        <div className="flex-1 w-full mx-auto max-w-[1920px] relative z-10">
          <OnboardingScreen onFinish={() => {
            setHasCompletedOnboarding(true);
            setCurrentScreen('home');
          }} />
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className={`w-full h-[100dvh] flex flex-col md:flex-row ${getThemeClass()} font-sans relative overflow-hidden`}>
        {renderAppBackground()}
        {(activeTheme === 'cool' || activeTheme === 'cute') && (
          <div className="absolute inset-0 bg-slate-950/40 z-0 pointer-events-none" />
        )}
        <div className="flex-1 w-full mx-auto max-w-[1920px] relative z-10">
          <PinScreen correctPin={appPin} onUnlock={() => {
            setIsUnlocked(true);
            setCurrentScreen('home');
          }} appTheme={activeTheme} lang={lang} />
        </div>
      </div>
    );
  }

  const appPalette = getOrganicThemePalette(activeTheme);

  return (
    <div className={`w-full h-[100dvh] flex flex-col md:flex-row ${getThemeClass()} font-sans relative overflow-hidden`}>
      {renderAppBackground()}
      {(activeTheme === 'cool' || activeTheme === 'cute') && (
        <div className="absolute inset-0 bg-slate-950/40 z-0 pointer-events-none" />
      )}
      <OfflineIndicator lang={lang} />
      
      {inAppAlarm && inAppAlarm.isAlarm && (
        <div className="fixed inset-0 z-[999] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
           <div className={`border rounded-3xl p-6 sm:p-8 max-w-sm w-full flex flex-col items-center text-center shadow-2xl transition-all ${
             appPalette.isDark
               ? 'bg-slate-900 border-slate-800 text-slate-100'
               : 'bg-[#FCF9F2] border-amber-900/15 text-[#24170D]'
           }`}>
             {/* 3D Bell Ripple */}
             <div className="relative mb-5 flex items-center justify-center">
               <div className="absolute inset-0 bg-amber-500/25 rounded-full blur-xl scale-150 animate-pulse pointer-events-none" />
               <div className="relative z-10 p-2">
                 <Icon3DBell size={52} className="animate-bounce" />
               </div>
             </div>

             <div className="mb-6 space-y-1.5">
               <h3 className={`text-xl sm:text-2xl font-black tracking-tight ${
                 appPalette.isDark ? 'text-slate-50' : 'text-[#24170D]'
               }`}>
                 {inAppAlarm.title}
               </h3>
               <p className={`text-xs sm:text-sm font-medium leading-relaxed ${
                 appPalette.isDark ? 'text-slate-400' : 'text-[#6B5E52]'
               }`}>
                 {inAppAlarm.body}
               </p>
             </div>

             <div className="flex flex-col gap-2.5 w-full">
               <button 
                 onClick={() => { 
                   const targetNoteId = inAppAlarm.noteId;
                   setInAppAlarm(null); 
                   stopGlobalAudio(); 
                   if (targetNoteId) {
                     const targetNote = notes.find(n => n.id === targetNoteId);
                     if (targetNote) openNote(targetNote);
                   } else {
                     setCurrentScreen('tasks');
                   }
                 }} 
                 className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm rounded-2xl transition-transform active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
               >
                 {inAppAlarm.noteId ? (lang === 'id' ? 'Buka Catatan' : 'Open Note') : (lang === 'id' ? 'Lihat Tugas Sekarang' : 'View Tasks')}
               </button>

               {/* Snooze 5 Minutes Button */}
               <button 
                 onClick={() => {
                   const snoozeTarget = inAppAlarm;
                   setInAppAlarm(null);
                   stopGlobalAudio();
                   // Reschedule in 5 minutes
                   setTimeout(() => {
                     setInAppAlarm({
                       ...snoozeTarget,
                       title: `[Ditunda] ${snoozeTarget.title}`,
                       id: Date.now()
                     });
                   }, 5 * 60 * 1000);
                 }}
                 className={`w-full py-2.5 font-bold text-xs rounded-xl border transition-colors cursor-pointer ${
                   isOrganic 
                     ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border-amber-500/30'
                     : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                 }`}
               >
                 {lang === 'id' ? 'Tunda 5 Menit' : 'Snooze 5 Minutes'}
               </button>

               <button 
                 onClick={() => { 
                   setInAppAlarm(null); 
                   stopGlobalAudio(); 
                 }} 
                 className={`w-full py-2 font-semibold text-xs transition-colors cursor-pointer ${
                   appPalette.isDark ? 'text-slate-400 hover:text-slate-200' : 'text-stone-500 hover:text-stone-800'
                 }`}
               >
                 {lang === 'id' ? 'Matikan Alarm' : 'Dismiss Alarm'}
               </button>
             </div>
           </div>
        </div>
      )}

      {inAppAlarm && !inAppAlarm.isAlarm && (
        <div 
          onClick={() => {
            if (inAppAlarm.noteId) {
              const targetNoteId = inAppAlarm.noteId;
              setInAppAlarm(null);
              stopGlobalAudio();
              const targetNote = notes.find(n => n.id === targetNoteId);
              if (targetNote) openNote(targetNote);
            }
          }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-[990] max-w-sm w-[92%] sm:w-full ${appPalette.isDark ? 'bg-slate-900/95 border-slate-800 text-slate-100' : 'bg-[#FCF9F2]/95 border-amber-900/15 text-[#24170D]'} backdrop-blur-md border shadow-2xl rounded-2xl p-3.5 flex items-start gap-3.5 animate-in slide-in-from-top-4 fade-in duration-300 ${inAppAlarm.noteId ? 'cursor-pointer hover:border-slate-700' : ''}`}
        >
           <Icon3DBell size={24} className="shrink-0 mt-0.5" />
           <div className="flex-1 min-w-0">
             <h4 className="font-extrabold text-slate-100 text-xs sm:text-sm mb-0.5 truncate">{inAppAlarm.title}</h4>
             <p className="text-slate-400 text-xs leading-relaxed line-clamp-2">{inAppAlarm.body}</p>
           </div>
           <button 
             onClick={(e) => { 
               e.stopPropagation();
               setInAppAlarm(null); 
               stopGlobalAudio(); 
             }} 
             className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200 cursor-pointer shrink-0"
           >
             <Icon3DClose size={16} />
           </button>
        </div>
      )}

      {/* Desktop Sidebar / Mobile Bottom Nav */}
      {currentScreen !== 'note-editor' && currentScreen !== 'finance' && currentScreen !== 'game' && currentScreen !== 'tictactoe' && currentScreen !== 'puzzle' && currentScreen !== 'tetris' && currentScreen !== 'memory' && currentScreen !== 'space-invaders' && currentScreen !== 'ai-companion' && (
        <nav className={`flex-none order-last md:order-first w-full md:w-[240px] lg:w-[280px] ${
          isOrganic
            ? activeTheme === 'cool'
              ? 'bg-[#0A1329]/95 backdrop-blur-md border-t md:border-t-0 md:border-r border-[#1E3A8A] text-slate-100 shadow-[0_-4px_20px_rgba(2,12,38,0.4)] md:shadow-[4px_0_20px_rgba(2,12,38,0.4)]'
              : activeTheme === 'pink'
                ? 'bg-[#FFF0F5]/95 backdrop-blur-md border-t md:border-t-0 md:border-r border-pink-200 text-[#500724] shadow-[0_-4px_16px_rgba(244,114,182,0.1)] md:shadow-[4px_0_16px_rgba(244,114,182,0.1)]'
                : activeTheme === 'cute'
                  ? 'bg-[#FAF5EA]/95 backdrop-blur-md border-t md:border-t-0 md:border-r border-[#EADCC8] text-[#38230F] shadow-[0_-4px_16px_rgba(180,120,60,0.06)] md:shadow-[4px_0_16px_rgba(180,120,60,0.06)]'
                  : activeTheme === 'light'
                    ? 'bg-white/95 backdrop-blur-md border-t md:border-t-0 md:border-r border-slate-200 text-slate-900 shadow-[0_-4px_16px_rgba(0,0,0,0.04)] md:shadow-[4px_0_16px_rgba(0,0,0,0.04)]'
                    : activeTheme === 'simple'
                      ? 'bg-[#161412]/95 backdrop-blur-md border-t md:border-t-0 md:border-r border-[#26221C] text-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.4)] md:shadow-[4px_0_20px_rgba(0,0,0,0.4)]'
                      : activeTheme === 'wallpaper'
                        ? 'bg-black/60 backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/20 text-white shadow-2xl'
                        : (activeTheme as string) === 'dark' || (activeTheme as string) === 'slate'
                          ? 'bg-slate-900/95 backdrop-blur-md border-t md:border-t-0 md:border-r border-slate-800 text-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] md:shadow-[4px_0_20px_rgba(0,0,0,0.3)]'
                          : 'bg-[#FCF9F3]/95 backdrop-blur-md border-t md:border-t-0 md:border-r border-[#E6DAC8] text-[#2B1E14] shadow-[0_-4px_20px_rgba(43,30,20,0.04)] md:shadow-[4px_0_20px_rgba(43,30,20,0.04)]'
            : activeTheme === 'light'
              ? 'bg-white/95 backdrop-blur-md border-t md:border-t-0 md:border-r border-slate-200 text-slate-900 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] md:shadow-[10px_0_30px_rgba(0,0,0,0.05)]'
              : activeTheme === 'cool'
                ? 'bg-[#070D1E] border-t md:border-t-0 md:border-r border-[#152754] text-slate-100 shadow-[0_-10px_30px_rgba(2,12,38,0.6)] md:shadow-[10px_0_30px_rgba(2,12,38,0.6)]'
                : activeTheme === 'pink'
                  ? 'bg-[#fce7f3] border-t md:border-t-0 md:border-r border-[#fbcfe8] text-[#500724] shadow-[0_-10px_30px_rgba(244,114,182,0.12)] md:shadow-[10px_0_30px_rgba(244,114,182,0.12)]'
                  : activeTheme === 'cute'
                    ? 'bg-[#faf5e6] border-t md:border-t-0 md:border-r border-[#faebd7] text-[#38230f] shadow-[0_-10px_30px_rgba(251,146,60,0.1)] md:shadow-[10px_0_30px_rgba(251,146,60,0.1)]'
                    : activeTheme === 'simple'
                      ? 'bg-[#141210] border-t md:border-t-0 md:border-r border-[#26221c] text-stone-200 shadow-[0_-10px_30px_rgba(0,0,0,0.4)] md:shadow-[10px_0_30px_rgba(0,0,0,0.4)]'
                      : activeTheme === 'wallpaper'
                        ? 'bg-black/60 backdrop-blur-xl border-t md:border-t-0 md:border-r border-white/20 text-white shadow-2xl'
                        : 'bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 text-slate-100 shadow-[0_-10px_30px_rgba(0,0,0,0.2)] md:shadow-[10px_0_30px_rgba(0,0,0,0.2)]'
        } flex md:flex-col justify-between md:justify-start z-50 relative pb-[calc(env(safe-area-inset-bottom,0px)+4px)] pt-1 md:pb-0 ${isOrganic ? 'min-h-[62px]' : 'min-h-[72px]'} md:min-h-screen md:pt-8 md:px-4`}>
          
          {/* Logo only visible on Desktop */}
          <div 
            onClick={() => setCurrentScreen('home')} 
            className="hidden md:flex items-center gap-3 px-4 mb-8 cursor-pointer group hover:opacity-90 transition-opacity"
          >
             <div className={`w-10 h-10 rounded-2xl ${
               activeTheme === 'organic' 
                 ? 'bg-[#2B1B10] text-[#FCF9F3] border border-[#432F20]' 
                 : activeTheme === 'cool'
                   ? 'bg-blue-600/30 border border-cyan-400/40'
                   : activeTheme === 'pink'
                     ? 'bg-pink-300/40 border border-pink-400/50'
                     : activeTheme === 'cute'
                       ? 'bg-amber-300/40 border border-amber-400/50'
                       : activeTheme === 'wallpaper'
                         ? 'bg-white/20 border border-white/30'
                         : 'bg-indigo-500/20 border border-indigo-500/30'
             } flex items-center justify-center overflow-hidden shadow-inner`}>
                  <img src="/icon.png" alt="Tata Logo" className="w-full h-full object-cover" />
             </div>
             <span className={`font-extrabold text-2xl tracking-tighter ${
               activeTheme === 'organic' 
                 ? 'text-[#2B1B10]' 
                 : activeTheme === 'cool'
                   ? 'text-cyan-300 group-hover:text-cyan-200'
                   : activeTheme === 'pink'
                     ? 'text-[#500724]'
                     : activeTheme === 'cute'
                       ? 'text-[#38230f]'
                       : activeTheme === 'light'
                         ? 'text-slate-900'
                         : activeTheme === 'wallpaper'
                           ? 'text-white'
                           : 'text-slate-50 group-hover:text-indigo-300'
             } transition-colors`}>
                TATA
             </span>
          </div>

          <div className="flex flex-row md:flex-col justify-evenly md:justify-start w-full px-1 sm:px-4 md:px-0 gap-1 md:gap-3 items-center md:items-stretch overflow-x-auto no-scrollbar relative z-10 py-1 md:py-0">
            <NavItem 
              icon={isOrganic ? <Icon3DNavHome size={24} active={currentScreen === 'home'} /> : <Home />} 
              label={t('home')} 
              active={currentScreen === 'home'} 
              onClick={() => setCurrentScreen('home')} 
              isOrganic={isOrganic} 
              activeTheme={activeTheme}
              isLite={isLiteMode || appVersion === 'lite'}
              navKey="home"
            />
            <NavItem 
              icon={isOrganic ? <Icon3DNavTasks size={24} active={currentScreen === 'tasks'} /> : <CheckCircle2 />} 
              label={t('tasksMenu')} 
              active={currentScreen === 'tasks'} 
              onClick={() => setCurrentScreen('tasks')} 
              isOrganic={isOrganic} 
              activeTheme={activeTheme}
              isLite={isLiteMode || appVersion === 'lite'}
              navKey="tasks"
            />
            <NavItem 
              icon={isOrganic ? <Icon3DNavCalendar size={24} active={currentScreen === 'calendar'} /> : <CalendarIcon />} 
              label={t('calendar')} 
              active={currentScreen === 'calendar'} 
              onClick={() => setCurrentScreen('calendar')} 
              isOrganic={isOrganic} 
              activeTheme={activeTheme}
              isLite={isLiteMode || appVersion === 'lite'}
              navKey="calendar"
            />
            <NavItem 
              icon={isOrganic ? <Icon3DNavNotes size={24} active={currentScreen === 'search'} /> : <FileText />} 
              label={t('searchMenu')} 
              active={currentScreen === 'search'} 
              onClick={() => setCurrentScreen('search')} 
              isOrganic={isOrganic} 
              activeTheme={activeTheme}
              isLite={isLiteMode || appVersion === 'lite'}
              navKey="search"
            />
            <NavItem 
              icon={isOrganic ? <Icon3DNavSettings size={24} active={currentScreen === 'settings'} /> : <Settings />} 
              label={t('settingsMenu')} 
              active={currentScreen === 'settings'} 
              onClick={() => setCurrentScreen('settings')} 
              isOrganic={isOrganic} 
              activeTheme={activeTheme}
              isLite={isLiteMode || appVersion === 'lite'}
              navKey="settings"
            />
          </div>
        </nav>
      )}

      <div 
        onTouchStart={handleMainTouchStart}
        onTouchEnd={handleMainTouchEnd}
        className="flex-1 relative flex flex-col overflow-hidden w-full max-w-[1920px] mx-auto"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.06, ease: 'easeOut' }}
            className="w-full h-full flex flex-col flex-1 relative"
          >
            {currentScreen === 'home' && (
              <HomeScreen 
                appTheme={activeTheme} 
                setAppTheme={setAppTheme} 
                onOpenNote={openNote} 
                onNavigate={(screen, extra) => {
                  setCurrentScreen(screen as ScreenItem, (extra as any) || null);
                }} 
              />
            )}
            {currentScreen === 'tasks' && (
              <TasksScreen 
                appTheme={activeTheme}
                onNavigate={(screen, extra) => {
                  setCurrentScreen(screen as ScreenItem, (extra as any) || null);
                }} 
                extra={screenExtra}
              />
            )}
            {currentScreen === 'calendar' && (
              <CalendarScreen 
                appTheme={activeTheme} 
                onOpenNote={openNote}
                onNavigate={(screen, extra) => {
                  setCurrentScreen(screen as ScreenItem, (extra as any) || null);
                }}
              />
            )}
            {currentScreen === 'finance' && (
              <FinanceScreen 
                appTheme={activeTheme} 
                onBack={() => setCurrentScreen('home')} 
                onNavigate={(screen, extra) => {
                  setCurrentScreen(screen as ScreenItem, (extra as any) || null);
                }} 
                extra={screenExtra}
              />
            )}
            {currentScreen === 'note-editor' && (
              <NoteEditorScreen 
                key={activeNote?.id || 'new-note'}
                appTheme={activeTheme}
                note={activeNote || {
                  id: generateId(),
                  title: '',
                  content: '',
                  date: new Date().toISOString().split('T')[0],
                  tags: []
                }} 
                onBack={closeNote} 
                onNavigate={(screen, extra) => {
                  setCurrentScreen(screen as ScreenItem, (extra as any) || null);
                }} 
              />
            )}
            {currentScreen === 'search' && (
              <SearchScreen 
                appTheme={activeTheme}
                onOpenNote={openNote} 
                onNavigate={(screen, extra) => {
                  setCurrentScreen(screen as ScreenItem, (extra as any) || null);
                }} 
              />
            )}
            {currentScreen === 'settings' && (
              <SettingsScreen 
                appTheme={activeTheme} 
                setAppTheme={setAppTheme} 
                onNavigate={(screen, extra) => {
                  setCurrentScreen(screen as ScreenItem, (extra as any) || null);
                }} 
                activeSection={activeSettingsSection}
                setActiveSection={(section) => {
                  if (section !== activeSettingsSection) {
                    window.history.pushState({ screen: 'settings', section }, '');
                    setActiveSettingsSection(section);
                  }
                }}
                onBack={() => {
                  window.history.back();
                }}
              />
            )}
            {currentScreen === 'games-hub' && <GamesHubScreen appTheme={activeTheme} onSelectGame={(g) => setCurrentScreen(g)} onBack={() => setCurrentScreen('home')} />}
            {currentScreen === 'game' && <GameScreen onBack={() => setCurrentScreen('games-hub')} />}
            {currentScreen === 'tictactoe' && <TicTacToeScreen onBack={() => setCurrentScreen('games-hub')} />}
            {currentScreen === 'puzzle' && <PuzzleScreen onBack={() => setCurrentScreen('games-hub')} />}
            {currentScreen === 'tetris' && <TetrisScreen onBack={() => setCurrentScreen('games-hub')} />}
            {currentScreen === 'memory' && <MemoryGameScreen onBack={() => setCurrentScreen('games-hub')} />}
            {currentScreen === 'space-invaders' && <SpaceInvadersScreen onBack={() => setCurrentScreen('games-hub')} />}
            {currentScreen === 'ai-companion' && <AICompanionScreen onBack={() => setCurrentScreen('home')} />}
            {currentScreen === 'account' && (
              <AccountScreen 
                appTheme={activeTheme} 
                onBack={() => setCurrentScreen('home')} 
                onNavigate={(screen, extra) => setCurrentScreen(screen as ScreenItem, (extra as any) || null)} 
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* COMPACT & SMOOTH AUTO BACKUP PROMPT */}
      {showAutoBackupModal && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/80 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full flex flex-col relative shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <Database size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    {lang === 'id' ? 'Pencadangan Otomatis' : 'Auto Backup'}
                  </h3>
                  <p className="text-[10px] font-mono text-indigo-400/90">
                    {getAutoBackupFilename()}.json
                  </p>
                </div>
              </div>
              <button 
                onClick={snoozeAutoBackup}
                className="text-slate-500 hover:text-slate-300 p-1 rounded-lg transition-colors cursor-pointer"
                title={lang === 'id' ? 'Tutup / Tunda' : 'Close / Snooze'}
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {lang === 'id' 
                ? 'Amankan data harian Anda agar tidak hilang jika peramban dibersihkan.'
                : 'Backup your daily data to keep it safe from browser resets.'}
            </p>

            {/* PIN Entry if set */}
            {storeAutoBackupPin ? (
              <div className="mb-4 space-y-1.5 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {lang === 'id' ? 'Masukkan PIN Cadangan' : 'Enter Backup PIN'}
                </label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={4}
                  value={enteredAutoBackupPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setEnteredAutoBackupPin(val);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && enteredAutoBackupPin.length === 4) {
                      executeAutoBackup();
                    }
                  }}
                  placeholder="••••"
                  className={`w-full text-center text-xl tracking-[0.4em] font-mono bg-slate-950 border py-2 px-3 rounded-lg outline-none transition-all ${
                    enteredAutoBackupPinError 
                      ? 'border-red-500 text-red-400' 
                      : 'border-slate-800 focus:border-indigo-500 text-indigo-400'
                  }`}
                  autoFocus
                />
                {enteredAutoBackupPinError && (
                  <p className="text-[10px] text-red-400 font-medium text-center">
                    {lang === 'id' ? 'PIN salah, coba lagi.' : 'Incorrect PIN, try again.'}
                  </p>
                )}
              </div>
            ) : null}

            <div className="flex gap-2 mt-1">
              <button 
                onClick={snoozeAutoBackup}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700/50 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-all cursor-pointer active:scale-[0.98]"
              >
                {lang === 'id' ? 'Tunda 1 Hari' : 'Snooze 1 Day'}
              </button>
              <button 
                onClick={executeAutoBackup}
                disabled={storeAutoBackupPin ? enteredAutoBackupPin.length !== 4 : false}
                className={`flex-1 py-2.5 font-bold text-xs rounded-xl transition-all active:scale-[0.98] shadow-md ${
                  (!storeAutoBackupPin || enteredAutoBackupPin.length === 4)
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white cursor-pointer'
                    : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-800 shadow-none'
                }`}
              >
                {lang === 'id' ? 'Unduh Backup' : 'Download Backup'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOCAL SUCCESS TOAST */}
      {localToastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10001] bg-slate-900 border border-slate-800 shadow-2xl rounded-2xl px-5 py-3.5 flex items-center gap-3.5 animate-in slide-in-from-bottom-5 duration-300 max-w-sm w-[90%] md:w-auto">
          <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 size={12} />
          </div>
          <p className="text-xs font-bold text-slate-200 leading-normal">
            {localToastMessage}
          </p>
        </div>
      )}

    </div>
  );
}

function getNavThemeStyles(theme: string = 'organic', active: boolean) {
  if (theme === 'cool') {
    return {
      btnClass: active 
        ? 'text-cyan-300 bg-cyan-500/10 md:bg-[#0E1A38] md:text-cyan-300 md:shadow-xs md:border md:border-[#1D3268]' 
        : 'text-blue-300/70 hover:text-cyan-200 md:hover:bg-[#0E1A38]/50 md:border md:border-transparent',
      indicator: 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]',
    };
  }
  if (theme === 'pink') {
    return {
      btnClass: active 
        ? 'text-rose-600 bg-rose-500/10 md:bg-pink-100/80 md:text-rose-700 md:shadow-xs md:border md:border-pink-200' 
        : 'text-pink-900/60 hover:text-pink-950 md:hover:bg-pink-100/40 md:border md:border-transparent',
      indicator: 'bg-rose-500',
    };
  }
  if (theme === 'cute') {
    return {
      btnClass: active 
        ? 'text-amber-800 bg-amber-500/10 md:bg-[#F2E5C9] md:text-amber-900 md:shadow-xs md:border md:border-[#E5D4B2]' 
        : 'text-[#7D6348] hover:text-[#4A3824] md:hover:bg-[#F5EAD4]/60 md:border md:border-transparent',
      indicator: 'bg-amber-600',
    };
  }
  if (theme === 'light') {
    return {
      btnClass: active 
        ? 'text-indigo-600 bg-indigo-50 md:bg-indigo-50/80 md:text-indigo-600 md:shadow-xs md:border md:border-indigo-100' 
        : 'text-slate-500 hover:text-slate-900 md:hover:bg-slate-100 md:border md:border-transparent',
      indicator: 'bg-indigo-600',
    };
  }
  if (theme === 'simple') {
    return {
      btnClass: active 
        ? 'text-emerald-400 bg-emerald-500/10 md:bg-stone-900 md:text-emerald-300 md:shadow-xs md:border md:border-stone-800' 
        : 'text-stone-400 hover:text-stone-200 md:hover:bg-stone-900/50 md:border md:border-transparent',
      indicator: 'bg-emerald-500',
    };
  }
  if (theme === 'wallpaper') {
    return {
      btnClass: active 
        ? 'text-white bg-white/20 md:bg-white/20 md:text-white md:shadow-xs md:border md:border-white/30 backdrop-blur-md' 
        : 'text-white/70 hover:text-white md:hover:bg-white/10 md:border md:border-transparent',
      indicator: 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]',
    };
  }
  if (theme === 'slate' || theme === 'dark') {
    return {
      btnClass: active 
        ? 'text-indigo-400 bg-indigo-500/10 md:bg-slate-800/80 md:text-indigo-300 md:shadow-xs md:border md:border-slate-700/80' 
        : 'text-slate-400 hover:text-slate-200 md:hover:bg-slate-800/40 md:border md:border-transparent',
      indicator: 'bg-indigo-500',
    };
  }
  // Default 'organic'
  return {
    btnClass: active 
      ? 'text-[#964724] bg-[#F2E8DC]/80 md:bg-[#F2E8DC] md:text-[#964724] md:shadow-2xs md:border md:border-[#DECBB5]' 
      : 'text-[#7A6754] hover:text-[#2B1E14] md:hover:bg-[#F4ECE0]/70 md:border md:border-transparent',
    indicator: 'bg-[#D66532]',
  };
}

function NavItem({ 
  icon, 
  label, 
  active, 
  onClick, 
  isOrganic,
  isLite,
  activeTheme,
  navKey
}: { 
  icon: React.ReactNode, 
  label: string, 
  active: boolean, 
  onClick: () => void, 
  isOrganic?: boolean,
  isLite?: boolean,
  activeTheme?: string,
  navKey?: 'home' | 'tasks' | 'calendar' | 'search' | 'settings'
}) {
  if (isLite && navKey) {
    const isLight = activeTheme === 'light' || activeTheme === 'cute' || activeTheme === 'pink' || activeTheme === 'ecy' || activeTheme === 'organic' || activeTheme === 'pro_max';
    
    let activeBg = 'bg-slate-800/70 md:bg-slate-800/90 md:border md:border-slate-700/80 shadow-xs';
    let hoverBg = 'hover:bg-slate-800/30 md:border md:border-transparent';
    let activeText = 'text-white font-black drop-shadow-sm';
    let inactiveText = 'text-slate-400 font-bold hover:text-slate-200';

    if (isLight) {
      if (activeTheme === 'cute') {
        activeBg = 'bg-amber-100/90 md:bg-amber-100 border border-amber-300 shadow-xs';
        hoverBg = 'hover:bg-amber-100/40 md:border md:border-transparent';
        activeText = 'text-[#38230F] font-black';
        inactiveText = 'text-[#7A5B3E] font-bold hover:text-[#38230F]';
      } else if (activeTheme === 'pink' || activeTheme === 'ecy') {
        activeBg = 'bg-pink-100/90 md:bg-pink-100 border border-pink-300 shadow-xs';
        hoverBg = 'hover:bg-pink-100/40 md:border md:border-transparent';
        activeText = 'text-[#500724] font-black';
        inactiveText = 'text-[#9D3C65] font-bold hover:text-[#500724]';
      } else if (activeTheme === 'organic') {
        activeBg = 'bg-[#EADBC8]/80 md:bg-[#EADBC8] border border-[#DFCBB5] shadow-xs';
        hoverBg = 'hover:bg-[#EADBC8]/30 md:border md:border-transparent';
        activeText = 'text-[#2B1E14] font-black';
        inactiveText = 'text-[#7D6A58] font-bold hover:text-[#2B1E14]';
      } else {
        // Clean Light theme
        activeBg = 'bg-slate-100 md:bg-slate-100 border border-slate-300 shadow-xs';
        hoverBg = 'hover:bg-slate-100/50 md:border md:border-transparent';
        activeText = 'text-slate-900 font-black';
        inactiveText = 'text-slate-600 font-bold hover:text-slate-900';
      }
    }

    return (
      <button 
        onClick={onClick}
        className={`relative flex items-center group transition-all duration-150 active:scale-95 cursor-pointer rounded-2xl flex-1 md:w-full md:flex-none md:px-4 md:py-3 md:justify-start flex-col md:flex-row justify-center min-h-[58px] md:min-h-0 md:min-w-0 md:mb-1 py-1 px-0.5 ${
          active ? activeBg : hoverBg
        }`}
      >
        <div className={`flex items-center justify-center transition-transform group-hover:scale-105 md:mr-3.5 shrink-0 ${active ? 'scale-105' : 'opacity-85 group-hover:opacity-100'}`}>
          <LiteStickerIcon variant={navKey} size="md" active={active} />
        </div>
        <span className={`text-[9.5px] xs:text-[10.5px] md:text-sm tracking-tight mt-1 md:mt-0 transition-all truncate max-w-full px-1 ${
          active ? activeText : inactiveText
        }`}>
          {label}
        </span>
      </button>
    );
  }

  if (isOrganic) {
    const navStyles = getNavThemeStyles(activeTheme, active);
    return (
      <button 
        onClick={onClick}
        className={`relative flex items-center group transition-all duration-150 active:scale-95 cursor-pointer rounded-2xl flex-1 md:w-full md:flex-none md:px-4 md:py-2.5 md:justify-start flex-col md:flex-row justify-center min-h-[52px] md:min-h-0 md:min-w-0 md:mb-1 py-1 px-1 ${navStyles.btnClass}`}
      >
        <div className={`flex items-center justify-center transition-transform group-hover:scale-105 md:mr-3 shrink-0 ${active ? 'scale-105' : 'opacity-85'}`}>
          {icon}
        </div>
        <span className={`text-[10px] sm:text-[11px] md:text-sm tracking-tight mt-0.5 md:mt-0 transition-opacity truncate max-w-full px-1 ${
          active ? 'font-bold opacity-100' : 'font-medium opacity-70'
        }`}>
          {label}
        </span>
        {active && (
          <div className="md:hidden absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-current opacity-80"></div>
        )}
        {active && (
          <div className={`hidden md:block absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-6 ${navStyles.indicator} rounded-full shadow-xs`}></div>
        )}
      </button>
    );
  }

  const isLightTheme = activeTheme === 'light' || activeTheme === 'cute' || activeTheme === 'pink' || !getOrganicThemePalette(activeTheme).isDark;

  return (
    <button 
      onClick={onClick}
      className={`relative flex items-center group transition-all duration-150 active:scale-95 cursor-pointer rounded-2xl flex-1 md:w-full md:flex-none md:px-5 md:py-3.5 md:justify-start flex-col md:flex-row justify-center min-h-[54px] md:min-h-0 md:min-w-0 md:mb-1 py-1.5 px-0.5 ${
        isLightTheme
          ? active
            ? 'text-indigo-600 bg-indigo-50/80 md:bg-indigo-50 md:text-indigo-600 md:shadow-inner md:border md:border-indigo-200'
            : 'text-slate-600 hover:text-indigo-600 md:hover:bg-slate-100 md:border md:border-transparent'
          : active
          ? 'text-indigo-400 bg-transparent md:bg-indigo-500/10 md:text-indigo-400 md:shadow-inner md:border md:border-indigo-500/20'
          : 'text-slate-400 hover:text-indigo-300 md:hover:bg-slate-800/40 md:border md:border-transparent'
      }`}
    >
      <div className={`md:hidden absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 ${isLightTheme ? 'bg-indigo-600' : 'bg-indigo-500'} rounded-b-full opacity-0 transition-all ${active ? '!opacity-100 top-0' : ''}`}></div>
      <div className={`[&>svg]:w-[22px] [&>svg]:h-[22px] md:[&>svg]:w-[24px] md:[&>svg]:h-[24px] [&>svg]:stroke-[2] transition-colors md:mr-4 ${active ? (isLightTheme ? '[&>svg]:stroke-indigo-600 drop-shadow-sm' : '[&>svg]:stroke-indigo-400 drop-shadow-sm') : ''}`}>
        {icon}
      </div>
      <span className={`text-[9px] xs:text-[10px] md:text-sm font-bold uppercase md:tracking-wide md:normal-case mt-1 md:mt-0 transition-opacity truncate max-w-full px-1 ${active ? 'opacity-100' : 'opacity-80'}`}>{label}</span>
      {active && <div className={`hidden md:block absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 ${isLightTheme ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]'} rounded-r-full`}></div>}
    </button>
  );
}

function PinScreen({ correctPin, onUnlock, appTheme, lang }: { correctPin: string, onUnlock: () => void, appTheme: string, lang: 'id' | 'en' }) {
  const t = useTranslation(lang);
  const palette = getOrganicThemePalette(appTheme);
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const { user, recordPinChange, pinRecoveryQuestion, pinRecoveryAnswer, setPinRecoveryQuestion, setPinRecoveryAnswer, useScrambledPin, setUseScrambledPin } = useAppStore();

  const [keypadOrder, setKeypadOrder] = useState<number[]>(() => {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    if (useScrambledPin) {
      for (let i = nums.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [nums[i], nums[j]] = [nums[j], nums[i]];
      }
    }
    return nums;
  });

  const shuffleKeypad = useCallback(() => {
    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }
    setKeypadOrder(nums);
  }, []);

  useEffect(() => {
    if (useScrambledPin) {
      shuffleKeypad();
    } else {
      setKeypadOrder([1, 2, 3, 4, 5, 6, 7, 8, 9, 0]);
    }
  }, [useScrambledPin, shuffleKeypad]);

  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotNameInput, setForgotNameInput] = useState('');

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          setFailedAttempts(0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (forgotModalVisible || lockoutSeconds > 0) return; // Don't intercept if forgot modal is open or locked
      if (/^[0-9]$/.test(e.key)) {
        handlePinInput(e.key);
      } else if (e.key === 'Backspace') {
        handlePinDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, error, forgotModalVisible, lockoutSeconds]);

  const handlePinInput = async (digit: string) => {
    playTapSound();
    if (error || lockoutSeconds > 0) return;
    setInput(prev => {
      if (prev.length >= 4) return prev;
      const newVal = prev + digit;
      
      if (newVal.length === 4) {
        (async () => {
          const isValid = await verifyPin(newVal, correctPin || '');
          if (isValid || newVal === correctPin) {
            if (correctPin && !correctPin.startsWith('pbkdf2_v1.')) {
              await recordPinChange(await createPinHash(newVal));
            }
            setFailedAttempts(0);
            setTimeout(onUnlock, 150);
          } else {
            setError(true);
            setFailedAttempts(prevAttempts => {
              const nextAttempts = prevAttempts + 1;
              if (nextAttempts >= 5) {
                setLockoutSeconds(30);
              }
              return nextAttempts;
            });
            setTimeout(() => {
              setInput('');
              setError(false);
              if (useScrambledPin) shuffleKeypad();
            }, 800);
          }
        })();
      }
      return newVal;
    });
  };

  const handlePinDelete = () => {
    playTapSound();
    if (!error && lockoutSeconds > 0) return;
    setInput(prev => prev.length > 0 ? prev.slice(0, -1) : prev);
  };

  const handleForgotPinSubmit = async () => {
    if (!pinRecoveryAnswer) {
      setError(true);
      setTimeout(() => setError(false), 500);
      return;
    }
    const isValid = await verifyPin(forgotNameInput.trim().toLowerCase(), pinRecoveryAnswer || '');
    const isCorrect = isValid || forgotNameInput.trim().toLowerCase() === (pinRecoveryAnswer || '').trim().toLowerCase();
    if (isCorrect && pinRecoveryAnswer && !pinRecoveryAnswer.startsWith('pbkdf2_v1.')) {
      setPinRecoveryAnswer(await createPinHash(forgotNameInput.trim().toLowerCase()));
    }

    if (isCorrect) {
      await recordPinChange(null);
      // Retain unified pinRecoveryQuestion and pinRecoveryAnswer so locked notes and future PINs remain recoverable
      setForgotModalVisible(false);
      setForgotNameInput('');
    } else {
      setError(true);
      setForgotNameInput('');
      setTimeout(() => setError(false), 500);
    }
  };

  const getThemeClass = () => {
    let base = '';
    if (appTheme === 'organic' || appTheme === 'pro_max') base = 'organic-theme bg-[#F7F3E9] text-[#24170D]';
    else if (appTheme === 'light') base = 'light-theme bg-[#F8FAFC] text-slate-900';
    else if (appTheme === 'pink') base = 'pink-theme bg-[#FDF2F8] text-[#500724]';
    else if (appTheme === 'cool') base = 'cool-theme bg-[#050811] text-slate-100';
    else if (appTheme === 'cute') base = 'cute-theme bg-[#FDF8EB] text-[#38230F]';
    else if (appTheme === 'simple') base = 'simple-theme bg-[#141210] text-stone-100';
    else if (appTheme === 'wallpaper') base = 'wallpaper-theme bg-transparent';
    else base = 'bg-slate-950 text-slate-100';
    
    return base;
  };

  const cardThemeStyle = () => {
    if (appTheme === 'wallpaper') {
      return 'bg-slate-950/80 backdrop-blur-2xl border border-white/10 text-white shadow-2xl shadow-black/40';
    }
    if (!palette.isDark) {
      if (appTheme === 'organic' || appTheme === 'pro_max') {
        return 'bg-[#FAF6EC]/95 border-[#E2D6C0] text-[#24170D] shadow-xl shadow-[#24170D]/5';
      }
      if (appTheme === 'pink') {
        return 'bg-[#FFF5F8]/95 border-[#F8D7E3] text-[#500724] shadow-xl shadow-[#500724]/5';
      }
      if (appTheme === 'cute') {
        return 'bg-[#FEFAEF]/95 border-[#F3E7C4] text-[#38230F] shadow-xl shadow-[#38230F]/5';
      }
      return 'bg-white/95 border-slate-200 text-slate-900 shadow-xl shadow-slate-200/50';
    }
    if (appTheme === 'cool') {
      return 'bg-[#0A1329]/95 border-[#1E3A8A] text-slate-100 shadow-2xl shadow-[#020C26]/60';
    }
    if (appTheme === 'simple') {
      return 'bg-[#181614]/95 border-stone-800 text-stone-100 shadow-2xl shadow-black/40';
    }
    return 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-2xl shadow-slate-950/50';
  };

  const keyThemeStyle = () => {
    if (!palette.isDark) {
      if (appTheme === 'organic' || appTheme === 'pro_max') {
        return 'bg-[#F2ECE0] hover:bg-[#EBE3D3] active:bg-[#E2D8C3] border-[#DFD3BE] text-[#24170D] shadow-xs';
      }
      if (appTheme === 'pink') {
        return 'bg-[#FDEBF2] hover:bg-[#FCD8E6] active:bg-[#FAC7DB] border-[#F6C6DA] text-[#500724] shadow-xs';
      }
      if (appTheme === 'cute') {
        return 'bg-[#F8EED9] hover:bg-[#F5E5C7] active:bg-[#EED9B1] border-[#E8D4A8] text-[#38230F] shadow-xs';
      }
      return 'bg-slate-100 hover:bg-slate-200 active:bg-slate-300/80 border-slate-200 text-slate-900 shadow-xs';
    }
    if (appTheme === 'cool') {
      return 'bg-[#0E1A38] hover:bg-[#13234D] active:bg-[#182C5D] border-[#1D3268] text-white shadow-xs';
    }
    if (appTheme === 'simple') {
      return 'bg-[#211E1B] hover:bg-[#2A2623] active:bg-[#342F2B] border-stone-800 text-stone-100 shadow-xs';
    }
    return 'bg-slate-800/80 hover:bg-slate-750 active:bg-slate-700 border-slate-700/80 text-slate-100 shadow-xs';
  };

  const dotBorderEmptyStyle = () => {
    if (!palette.isDark) {
      if (appTheme === 'organic' || appTheme === 'pro_max') return 'border-[#C8B89E] bg-[#EFE8DC]/60';
      if (appTheme === 'pink') return 'border-[#E8B4C8] bg-[#FCE5EE]/60';
      if (appTheme === 'cute') return 'border-[#DFC48F] bg-[#F7EACD]/60';
      return 'border-slate-300 bg-slate-100';
    }
    if (appTheme === 'cool') return 'border-blue-900 bg-[#0E1A38]';
    return 'border-slate-700 bg-slate-800/60';
  };

  return (
    <div className={`min-h-[100dvh] w-full flex items-center justify-center ${getThemeClass()} relative overflow-y-auto px-4 py-6`}>
      <OfflineIndicator lang={lang} />
      
      <div className={`w-full max-w-sm relative flex flex-col items-center justify-between font-sans p-5 sm:p-6 rounded-3xl border transition-all duration-300 ${cardThemeStyle()}`}>
        
        {/* Security Badge & Greeting */}
        <div className="flex flex-col items-center mb-3">
          <div className="mb-2 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-amber-500/20 rounded-full blur-xl scale-125 pointer-events-none" />
            <Icon3DGoldLock size={46} className="relative z-10 transition-transform duration-200 hover:scale-105" />
          </div>

          <h2 className={`text-base sm:text-lg font-black tracking-tight ${palette.titleText}`}>
            {lang === 'id' ? 'Masukkan PIN Tata' : 'Enter Tata PIN'}
          </h2>
          
          <p className={`text-xs mt-0.5 text-center max-w-[240px] font-medium leading-tight ${palette.subText}`}>
            {user?.name 
              ? (lang === 'id' ? `Brankas offline ${user.name}` : `${user.name}'s offline vault`)
              : (lang === 'id' ? 'Akses brankas lokal & catatan aman' : 'Access your secure local vault')}
          </p>
        </div>

        {/* Lockout or Failed Attempts Feedback */}
        {lockoutSeconds > 0 ? (
          <div className="bg-rose-500/15 border border-rose-500/30 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 text-rose-400 text-xs font-bold mb-3 animate-pulse text-center">
            <Icon3DWarning size={16} className="shrink-0" />
            <span>
              {lang === 'id' 
                ? `Terkunci sementara (${lockoutSeconds}d)` 
                : `Locked temporarily (${lockoutSeconds}s)`}
            </span>
          </div>
        ) : failedAttempts > 0 ? (
          <div className="bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full flex items-center gap-1.5 text-xs text-rose-400 font-semibold mb-3">
            <Icon3DWarning size={16} className="shrink-0" />
            <span>
              {lang === 'id' ? `PIN salah (${failedAttempts}/5 percobaan)` : `Wrong PIN (${failedAttempts}/5 attempts)`}
            </span>
          </div>
        ) : (
          <div className="h-4 mb-2" />
        )}

        {/* 4 PIN Dots Indicator with Shake Animation on Error */}
        <motion.div 
          className="flex items-center gap-3.5 mb-5"
          animate={error ? { x: [-8, 8, -6, 6, -3, 3, 0] } : {}}
          transition={{ duration: 0.35 }}
        >
          {[0, 1, 2, 3].map((i) => {
            const isFilled = input.length > i;
            return (
              <div 
                key={i} 
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
                  error 
                    ? 'bg-rose-500 border-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)] scale-110'
                    : isFilled
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 border-transparent scale-110 shadow-xs ring-2 ring-amber-400/30'
                      : `border-2 ${dotBorderEmptyStyle()} scale-95`
                }`}
              />
            );
          })}
        </motion.div>

        {/* Keypad Grid (3x4 Tactile Modern Squircles) */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px] mx-auto">
          {keypadOrder.slice(0, 9).map((num) => (
            <button
              key={num}
              type="button"
              disabled={lockoutSeconds > 0}
              className={`h-14 sm:h-15 flex items-center justify-center rounded-2xl text-xl sm:text-2xl font-bold font-sans active:scale-90 transition-all duration-150 border cursor-pointer ${
                keyThemeStyle()
              } ${lockoutSeconds > 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
              onClick={() => handlePinInput(num.toString())}
            >
              {num}
            </button>
          ))}

          {/* Scramble Toggle Key */}
          <button
            type="button"
            disabled={lockoutSeconds > 0}
            onClick={() => {
              playTapSound();
              const next = !useScrambledPin;
              setUseScrambledPin(next);
            }}
            className={`h-14 sm:h-15 flex flex-col items-center justify-center rounded-2xl border transition-all duration-150 active:scale-90 cursor-pointer ${
              useScrambledPin 
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-black border-amber-400 shadow-sm' 
                : `${keyThemeStyle()} ${palette.subText}`
            } ${lockoutSeconds > 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            title={lang === 'id' ? 'Aktifkan/Matikan PIN Acak (Anti-Intip)' : 'Toggle Scrambled Keypad'}
          >
            <Icon3DShuffle size={20} className="mb-0.5 shrink-0" />
            <span className="text-[8px] font-black uppercase tracking-wider leading-none">
              {useScrambledPin ? 'Acak' : 'Normal'}
            </span>
          </button>

          {/* Zero (0) Key */}
          <button
            type="button"
            disabled={lockoutSeconds > 0}
            className={`h-14 sm:h-15 flex items-center justify-center rounded-2xl text-xl sm:text-2xl font-bold font-sans active:scale-90 transition-all duration-150 border cursor-pointer ${
              keyThemeStyle()
            } ${lockoutSeconds > 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
            onClick={() => handlePinInput(keypadOrder[9].toString())}
          >
            {keypadOrder[9]}
          </button>

          {/* Delete / Backspace Key */}
          <button
            type="button"
            disabled={lockoutSeconds > 0 || input.length === 0}
            className={`h-14 sm:h-15 flex items-center justify-center rounded-2xl border active:scale-90 transition-all duration-150 cursor-pointer ${
              keyThemeStyle()
            } ${palette.subText} hover:text-rose-500 disabled:opacity-30 disabled:cursor-not-allowed ${
              lockoutSeconds > 0 ? 'opacity-40 cursor-not-allowed' : ''
            }`}
            onClick={handlePinDelete}
            title={lang === 'id' ? 'Hapus' : 'Delete'}
          >
            <Icon3DBackspace size={24} className="shrink-0 transition-transform active:scale-90" />
          </button>
        </div>

        {/* Forgot PIN Link */}
        <button 
          type="button"
          onClick={() => {
            playTapSound();
            setForgotModalVisible(true);
          }}
          className={`mt-3.5 text-xs font-bold transition-all hover:underline cursor-pointer ${palette.subText} hover:${palette.titleText}`}
        >
          {lang === 'id' ? 'Lupa PIN Keamanan?' : 'Forgot Security PIN?'}
        </button>

        {/* Footer: Compact Branding & Official Tata v5.1.0 Stable */}
        <div className={`mt-3.5 pt-3 border-t w-full flex flex-col items-center text-center opacity-85 transition-opacity hover:opacity-100 ${
          palette.isDark ? 'border-slate-800/80' : 'border-black/10'
        }`}>
          <div className="flex items-center gap-1.5">
            <span className={`font-black text-xs tracking-tight ${palette.titleText}`}>Tata</span>
            <span className="text-[10px] font-bold text-amber-500 tracking-wide font-sans">
              (Think • Act • Track • Advance)
            </span>
          </div>
          
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className={`text-[9px] font-semibold px-2.5 py-0.5 rounded-full border inline-flex items-center gap-1.5 ${
              palette.isDark 
                ? 'bg-slate-800/80 border-slate-700 text-slate-300' 
                : 'bg-black/5 border-black/10 text-slate-700'
            }`}>
              <Icon3DShield size={14} className="shrink-0" />
              <span>Tata v5.1.0 Stable • 100% Offline</span>
            </span>
          </div>
        </div>

        {/* Forgot PIN Modal (Fixed Overlay) */}
        {forgotModalVisible && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className={`border p-5 sm:p-6 rounded-3xl w-full max-w-sm shadow-2xl ${cardThemeStyle()} ${error ? 'animate-pulse border-rose-500/50' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm sm:text-base font-extrabold flex items-center gap-2 ${palette.titleText}`}>
                  <Icon3DKey size={20} className="shrink-0" />
                  <span>{t('resetPin') || 'Reset PIN'}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    playTapSound();
                    setForgotModalVisible(false);
                    setForgotNameInput('');
                  }}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 transition-colors text-xs cursor-pointer text-slate-400 hover:text-slate-100"
                >
                  <Icon3DClose size={16} />
                </button>
              </div>

              {!pinRecoveryAnswer ? (
                <div className="space-y-3.5">
                  <div className="bg-amber-500/10 border border-amber-500/30 p-3.5 rounded-2xl text-left space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
                      <Icon3DWarning size={18} className="shrink-0" />
                      <span>{lang === 'id' ? 'Pertanyaan Keamanan Belum Diatur' : 'No Security Question Set'}</span>
                    </div>
                    <p className={`text-[11px] leading-relaxed ${palette.subText}`}>
                      {lang === 'id' 
                        ? 'Pertanyaan pemulihan keamanan tidak diatur saat PIN ini dibuat, sehingga PIN tidak dapat dipulihkan melalui jawaban keamanan.' 
                        : 'No security recovery question was configured when this PIN was created, so the PIN cannot be reset via security answer.'}
                    </p>
                    <p className="text-[10px] text-amber-600 dark:text-amber-300 leading-relaxed font-medium pt-1.5 border-t border-amber-500/20">
                      {lang === 'id'
                        ? 'Satu-satunya cara mereset adalah menghapus data aplikasi di Pengaturan (atau bersihkan data browser).'
                        : 'The only option to reset is to clear application data in Settings (or clear browser storage).'}
                    </p>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button 
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setForgotModalVisible(false);
                        setForgotNameInput('');
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${palette.actionBtn}`}
                    >
                      {lang === 'id' ? 'Saya Mengerti' : 'I Understand'}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className={`text-xs mb-3 leading-relaxed ${palette.subText}`}>
                    {t('resetPinDesc') || 'Jawab pertanyaan keamanan Anda untuk memverifikasi dan menghapus PIN.'}
                  </p>
                  {pinRecoveryQuestion && (
                    <div className={`border p-3 rounded-2xl mb-3 text-left ${palette.streakCard} ${palette.streakBorder}`}>
                      <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-1 block">
                        {lang === 'id' ? 'Pertanyaan Pemulihan' : 'Recovery Question'}
                      </span>
                      <p className={`text-xs font-semibold ${palette.titleText}`}>{pinRecoveryQuestion}</p>
                    </div>
                  )}
                  <input
                    type="text"
                    autoFocus
                    value={forgotNameInput}
                    onChange={e => setForgotNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleForgotPinSubmit()}
                    className={`w-full border rounded-xl px-3.5 py-2.5 mb-3.5 text-xs outline-none focus:ring-2 focus:ring-amber-500/30 transition-all ${palette.streakCard} ${palette.streakBorder} ${palette.titleText}`}
                    placeholder={lang === 'id' ? "Ketik jawaban Anda..." : "Type your answer..."}
                  />
                  <div className="flex justify-end gap-2">
                    <button 
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setForgotModalVisible(false);
                        setForgotNameInput('');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${palette.actionBtn}`}
                    >
                      {t('cancel')}
                    </button>
                    <button 
                      type="button"
                      onClick={handleForgotPinSubmit}
                      disabled={!forgotNameInput.trim()}
                      className="px-4 py-2 rounded-xl text-zinc-950 font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      {t('verify') || (lang === 'id' ? 'Verifikasi & Reset' : 'Verify & Reset')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OfflineIndicator({ lang }: { lang: 'id' | 'en' }) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div 
      className="fixed top-3.5 right-3.5 z-[999] p-1.5 bg-slate-900/80 backdrop-blur-sm border border-slate-700/60 shadow-lg shadow-slate-950/40 rounded-full flex items-center justify-center animate-in fade-in duration-200 pointer-events-auto"
      title={lang === 'id' ? 'Mode Offline — Berfungsi penuh secara lokal' : 'Offline Mode — Fully functional locally'}
    >
      <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
    </div>
  );
}

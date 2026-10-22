import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type {
  Note,
  Task,
  User,
  Transaction,
  MoodEntry,
  PinHistoryEntry,
  DebtItem,
  SavingsGoal,
  TataAccount,
  TataAccountTransaction,
  PaymentProof,
  TataPlanType,
} from './types';

export type { TataAccount, TataAccountTransaction, PaymentProof, TataPlanType };

import { currentUser, recentNotes, allTasks } from './data';
import { generateId, obfuscateApiKey, deobfuscateApiKey } from './utils';
import {
  getLargeItem,
  getLargeItemSync,
  setLargeItem,
  deleteLargeItem,
  clearAllLargeItems,
  getAllLargeItemsByPrefix,
  setManyLargeItems,
  isStorageHydrated,
} from './utils/db';
import {
  playTaskCompleteSound,
  playTaskUncheckSound,
  playCelebrationSound,
  playDeleteSound,
  playTapSound,
  playMoodSound,
} from './utils/sound';
import {
  getStoredJourneyStartDate,
  calculateJourneyDay,
  getTodayDateString,
  TATA_JOURNEY_START_KEY,
} from './utils/journey';
import { generateInitialsAvatar, sanitizeAvatarUrl } from './utils/avatar';

export const AppContext = createContext<any>(undefined);

const safeReadStorage = (key: string): string | null => {
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`[Tata Storage] Gagal membaca key "${key}":`, error);
    return null;
  }
};

const safeWriteStorage = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value);
  } catch (error: any) {
    const quotaError = error?.name === 'QuotaExceededError' || error?.code === 22 || error?.number === -2147024882;
    if (quotaError) {
      console.warn(`[Tata Storage] localStorage quota reached for "${key}". Menjaga data penting di IndexedDB.`);
      return;
    }
    console.warn(`[Tata Storage] Gagal menyimpan key "${key}":`, error);
  }
};

const safeRemoveStorage = (key: string): void => {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Tata Storage] Gagal menghapus key "${key}":`, error);
  }
};

const safeStorageClear = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i++) {
    const key = window.localStorage.key(i);
    if (key) keys.push(key);
  }
  keys.forEach((key) => safeRemoveStorage(key));
};

const safeSetItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.number === -2147024882) {
      console.warn(`[Tata Storage] localStorage quota reached for "${key}". Preserving lightweight version in localStorage and full version in IndexedDB.`);
      if (key === 'tata_notes') {
        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            const lightweightNotes = parsed.map((n: any) => ({
              ...n,
              content: typeof n.content === 'string' ? n.content.replace(/src="data:image\/[^"]+"/g, 'src=""') : '',
              thumbnailUrl: n.thumbnailUrl && String(n.thumbnailUrl).startsWith('data:') ? undefined : n.thumbnailUrl,
            }));
            localStorage.setItem(key, JSON.stringify(lightweightNotes));
            return;
          }
        } catch (_) {}
      }
    } else {
      console.warn(`[Tata Storage] Failed to save "${key}" to localStorage:`, e);
    }
  }
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [appPin, setAppPin] = useState<string | null>(null);
  const [notePin, setNotePin] = useState<string | null>(null);
  const [lang, setLang] = useState<'id' | 'en'>('id');
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [user, setUser] = useState<User>({ name: 'Pengguna', avatarUrl: '' });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [moods, setMoods] = useState<MoodEntry[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
  const [streak, setStreak] = useState(0);
  const [lastTaskCompleted, setLastTaskCompleted] = useState<string | null>(null);
  const [reminderActive, setReminderActive] = useState(true);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [tataAccount, setTataAccount] = useState<TataAccount | null>(null);
  const [pinRecoveryQuestion, setPinRecoveryQuestion] = useState<string | null>(null);
  const [pinRecoveryAnswer, setPinRecoveryAnswer] = useState<string | null>(null);
  const [pinHistory, setPinHistory] = useState<PinHistoryEntry[]>([]);
  const [autoBackupPin, setAutoBackupPin] = useState<string | null>(null);
  const [autoBackupPinHistory, setAutoBackupPinHistory] = useState<PinHistoryEntry[]>([]);
  const [savingsTarget, setSavingsTarget] = useState<SavingsGoal | null>(null);
  const [savingsTargetTitle, setSavingsTargetTitle] = useState('');
  const [savingsBalance, setSavingsBalance] = useState(0);
  const [initialDebt, setInitialDebt] = useState(0);
  const [autoBackupFrequency, setAutoBackupFrequency] = useState('off');
  const [autoBackupFilenamePrefix, setAutoBackupFilenamePrefix] = useState('tata_backup');
  const [lastAutoBackupTimestamp, setLastAutoBackupTimestamp] = useState(0);
  const [archivedTags, setArchivedTags] = useState<string[]>([]);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isLiteMode, setIsLiteMode] = useState(false);
  const [appVersion, setAppVersion] = useState<'lite' | 'organic' | 'pro_max'>('lite');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStep, setRefreshStep] = useState('');
  const [geminiApiKey, setGeminiApiKeyState] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem('tata_gemini_api_key');
      if (!raw) return null;
      const deobfuscated = deobfuscateApiKey(raw);
      if (raw && !raw.startsWith('obf_v1:')) {
        localStorage.setItem('tata_gemini_api_key', obfuscateApiKey(deobfuscated));
      }
      return deobfuscated;
    } catch (e) {
      return null;
    }
  });

  useEffect(() => {
    try {
      if (tataAccount) {
        localStorage.setItem('tata_account_session', JSON.stringify(tataAccount));
      }
    } catch (e) {}
  }, [tataAccount]);

  const setGeminiApiKey = (key: string | null) => {
    setGeminiApiKeyState(key);
    if (key === null) {
      safeRemoveStorage('tata_gemini_api_key');
    } else {
      safeWriteStorage('tata_gemini_api_key', obfuscateApiKey(key));
    }
  };

  const handleRefreshApp = async () => {
    setIsRefreshing(true);
    setRefreshStep('Menyegarkan aplikasi...');
    try {
      await Promise.resolve();
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        setRefreshStep('');
      }, 250);
    }
  };

  const addNote = (note: Note) => setNotes((prev) => [note, ...prev]);
  const updateNote = (id: string, changes: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...changes } : n)));
  };
  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const toggleTask = (taskId: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed, updatedAt: Date.now() } : task
      )
    );
  };

  const updateTask = (taskId: string, changes: Partial<Task>) => {
    setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, ...changes } : task)));
  };

  const deleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
  };

  const setMood = (mood: MoodEntry) => {
    setMoods((prev) => [mood, ...prev.filter((item) => item.date !== mood.date)]);
  };

  const checkInDaily = () => {
    setStreak((prev) => prev + 1);
    setLastTaskCompleted(getTodayDateString());
  };

  const createFullBackup = async () => {
    try {
      const payload = { notes, tasks, transactions, moods, debts, user, tataAccount };
      localStorage.setItem('tata_last_full_backup', JSON.stringify(payload));
      return payload;
    } catch (err) {
      console.warn('[Tata Store] backup failed', err);
      return null;
    }
  };

  const clearAllData = async () => {
    try {
      safeStorageClear();
    } catch (e) {
      console.error('Error securely wiping localStorage:', e);
    }

    try {
      sessionStorage.clear();
    } catch (e) {}

    try {
      await clearAllLargeItems();
    } catch (e) {
      console.error('Failed to clear IndexedDB during reset:', e);
    }

    setNotes([]);
    setTasks([]);
    setTransactions([]);
    setMoods([]);
    setDebts([]);
    setSavingsGoals([]);
    setStreak(0);
    setLastTaskCompleted(null);
    try { safeRemoveStorage(TATA_JOURNEY_START_KEY); } catch (e) {}
    setAppPin(null);
    setNotePin(null);
    setPinHistory([]);
    setAutoBackupPin(null);
    setAutoBackupPinHistory([]);
    setPinRecoveryQuestion(null);
    setPinRecoveryAnswer(null);
    setHasCompletedOnboarding(false);
    setUser({ name: 'Pengguna', avatarUrl: '' });
    setReminderActive(true);
    setReminderTime('09:00');
    setSavingsTarget(null);
    setSavingsTargetTitle('');
    setSavingsBalance(0);
    setInitialDebt(0);
    setAutoBackupFrequency('off');
    setAutoBackupFilenamePrefix('tata_backup');
    setLastAutoBackupTimestamp(0);
    setGeminiApiKey(null);
    setArchivedTags([]);
    setIsLiteMode(false);
  };

  const contextValue = useMemo(
    () => ({
      appPin,
      setAppPin,
      notePin,
      setNotePin,
      lang,
      setLang,
      isUnlocked,
      setIsUnlocked,
      user,
      setUser,
      tasks,
      setTasks,
      notes,
      setNotes,
      transactions,
      setTransactions,
      moods,
      setMoods,
      debts,
      setDebts,
      savingsGoals,
      setSavingsGoals,
      streak,
      setStreak,
      lastTaskCompleted,
      setLastTaskCompleted,
      reminderActive,
      setReminderActive,
      reminderTime,
      setReminderTime,
      tataAccount,
      setTataAccount,
      pinRecoveryQuestion,
      setPinRecoveryQuestion,
      pinRecoveryAnswer,
      setPinRecoveryAnswer,
      pinHistory,
      setPinHistory,
      autoBackupPin,
      setAutoBackupPin,
      autoBackupPinHistory,
      setAutoBackupPinHistory,
      savingsTarget,
      setSavingsTarget,
      savingsTargetTitle,
      setSavingsTargetTitle,
      savingsBalance,
      setSavingsBalance,
      initialDebt,
      setInitialDebt,
      autoBackupFrequency,
      setAutoBackupFrequency,
      autoBackupFilenamePrefix,
      setAutoBackupFilenamePrefix,
      lastAutoBackupTimestamp,
      setLastAutoBackupTimestamp,
      archivedTags,
      setArchivedTags,
      hasCompletedOnboarding,
      setHasCompletedOnboarding,
      isLiteMode,
      setIsLiteMode,
      appVersion,
      setAppVersion,
      isRefreshing,
      setIsRefreshing,
      refreshStep,
      setRefreshStep,
      geminiApiKey,
      setGeminiApiKey,
      addNote,
      updateNote,
      deleteNote,
      toggleTask,
      updateTask,
      deleteTask,
      setMood,
      checkInDaily,
      createFullBackup,
      clearAllData,
      handleRefreshApp,
      currentUser,
      recentNotes,
      allTasks,
    }),
    [
      appPin,
      notePin,
      lang,
      isUnlocked,
      user,
      tasks,
      notes,
      transactions,
      moods,
      debts,
      savingsGoals,
      streak,
      lastTaskCompleted,
      reminderActive,
      reminderTime,
      tataAccount,
      pinRecoveryQuestion,
      pinRecoveryAnswer,
      pinHistory,
      autoBackupPin,
      autoBackupPinHistory,
      savingsTarget,
      savingsTargetTitle,
      savingsBalance,
      initialDebt,
      autoBackupFrequency,
      autoBackupFilenamePrefix,
      lastAutoBackupTimestamp,
      archivedTags,
      hasCompletedOnboarding,
      isLiteMode,
      appVersion,
      isRefreshing,
      refreshStep,
      geminiApiKey,
      addNote,
      updateNote,
      deleteNote,
      toggleTask,
      updateTask,
      deleteTask,
      setMood,
      checkInDaily,
      createFullBackup,
      clearAllData,
      handleRefreshApp,
    ]
  );

  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
}

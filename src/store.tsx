import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Note, Task, User, Transaction, MoodEntry, PinHistoryEntry, DebtItem, SavingsGoal, TataAccount, TataAccountTransaction, PaymentProof, TataPlanType } from './types';

export type { TataAccount, TataAccountTransaction, PaymentProof, TataPlanType };
import { currentUser, recentNotes, allTasks } from './data';
import { generateId, obfuscateApiKey, deobfuscateApiKey } from './utils';
import { getLargeItem, getLargeItemSync, setLargeItem, deleteLargeItem, clearAllLargeItems, getAllLargeItemsByPrefix, setManyLargeItems, isStorageHydrated } from './utils/db';
import { playTaskCompleteSound, playTaskUncheckSound, playCelebrationSound, playDeleteSound, playTapSound, playMoodSound } from './utils/sound';
import { getStoredJourneyStartDate, calculateJourneyDay, getTodayDateString, TATA_JOURNEY_START_KEY } from './utils/journey';
import { generateInitialsAvatar, sanitizeAvatarUrl } from './utils/avatar';

interface AppContextType {
  notes: Note[];
  tasks: Task[];
  transactions: Transaction[];
  moods: MoodEntry[];
  user: User;
  updateUser: (u: User) => void;
  addNote: (note: Note) => void;
  updateNote: (note: Note) => void;
  deleteNote: (id: string) => void;
  addTask: (task: Task) => void;
  updateTask: (task: Task) => void;
  toggleTask: (id: string, dateStr?: string) => void;
  restartTask: (id: string, customTargetDate?: string) => void;
  deleteTask: (id: string) => void;
  restoreTask: (id: string) => void;
  emptyTrash: () => void;
  restoreAllTasks: () => void;
  setMood: (date: string, mood: MoodEntry['mood'], note?: string) => void;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  clearAllTransactions: () => void;
  importTransactions: (transactions: Transaction[]) => void;
  importData: (notes: Note[], tasks: Task[], transactions?: Transaction[]) => void;
  importFullBackup: (backup: any) => Promise<void>;
  createFullBackup: (options?: any) => Promise<any>;
  clearAllData: () => Promise<void>;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  appPin: string | null;
  setAppPin: (pin: string | null) => void;
  notePin: string | null;
  setNotePin: (pin: string | null) => void;
  useScrambledPin: boolean;
  setUseScrambledPin: (val: boolean) => void;
  pinRecoveryQuestion: string | null;
  setPinRecoveryQuestion: (question: string | null) => void;
  pinRecoveryAnswer: string | null;
  setPinRecoveryAnswer: (answer: string | null) => void;
  sessionUnlockedNoteIds: string[];
  unlockNoteForSession: (id: string) => void;
  lockNoteForSession: (id: string) => void;
  pinHistory: PinHistoryEntry[];
  setPinHistory: React.Dispatch<React.SetStateAction<PinHistoryEntry[]>>;
  recordPinChange: (newHashedPin: string | null) => Promise<void>;
  lang: 'id' | 'en';
  setLang: (l: 'id' | 'en') => void;
  isUnlocked: boolean;
  setIsUnlocked: (val: boolean) => void;
  hasCompletedOnboarding: boolean;
  setHasCompletedOnboarding: (val: boolean) => void;
  streak: number;
  reminderActive: boolean;
  setReminderActive: (val: boolean) => void;
  reminderTime: string;
  setReminderTime: (val: string) => void;
  savingsTarget: number | null;
  setSavingsTarget: (val: number | null) => void;
  savingsTargetTitle: string;
  setSavingsTargetTitle: (val: string) => void;
  savingsBalance: number;
  setSavingsBalance: React.Dispatch<React.SetStateAction<number>>;
  savingsGoals: SavingsGoal[];
  addSavingsGoal: (goal: SavingsGoal) => void;
  updateSavingsGoal: (goal: SavingsGoal) => void;
  deleteSavingsGoal: (id: string) => void;
  depositToSavingsGoal: (goalId: string, amount: number, transactionDate?: string, note?: string) => void;
  withdrawFromSavingsGoal: (goalId: string, amount: number, transactionDate?: string, note?: string) => void;
  clearAllSavingsGoals: () => void;
  initialDebt: number;
  setInitialDebt: (val: number) => void;
  debts: DebtItem[];
  addDebt: (debt: DebtItem) => void;
  updateDebt: (debt: DebtItem) => void;
  deleteDebt: (id: string) => void;
  clearAllDebtData: () => void;
  payDebtInstallment: (debtId: string, amount: number, transactionDate?: string, note?: string) => void;
  checkInDaily: () => void;
  archivedTags: string[];
  setArchivedTags: React.Dispatch<React.SetStateAction<string[]>>;
  isRefreshing: boolean;
  refreshStep: number;
  handleRefreshApp: () => Promise<void>;
  isLiteMode: boolean;
  setIsLiteMode: (val: boolean) => void;
  appVersion: 'lite' | 'pro' | 'pro_max' | 'organic';
  setAppVersion: (version: 'lite' | 'pro' | 'pro_max' | 'organic') => void;
  autoBackupFrequency: 'off' | '3_days' | '1_week' | '1_month';
  setAutoBackupFrequency: (val: 'off' | '3_days' | '1_week' | '1_month') => void;
  autoBackupFilenamePrefix: string;
  setAutoBackupFilenamePrefix: (val: string) => void;
  lastAutoBackupTimestamp: number;
  setLastAutoBackupTimestamp: (val: number) => void;
  autoBackupPin: string | null;
  setAutoBackupPin: (pin: string | null) => void;
  autoBackupPinHistory: PinHistoryEntry[];
  setAutoBackupPinHistory: React.Dispatch<React.SetStateAction<PinHistoryEntry[]>>;
  recordAutoBackupPinChange: (newHashedPin: string | null) => Promise<void>;
  tempNoteContext: { title: string; content: string; thumbnailUrl?: string } | null;
  setTempNoteContext: (context: { title: string; content: string; thumbnailUrl?: string } | null) => void;
  autoSendNoteToAI: boolean;
  setAutoSendNoteToAI: (val: boolean) => void;
  geminiApiKey: string | null;
  setGeminiApiKey: (key: string | null) => void;
  tataAccount: TataAccount | null;
  loginTataAccount: (data: { credential: string }) => Promise<TataAccount>;
  loginWithGoogle: (data: { credential: string }) => Promise<{ success: boolean; account: TataAccount; isPremium: boolean }>;
  loginWithGoogleCredential: (credential: string) => Promise<{ success: boolean; account: TataAccount; isPremium: boolean }>;
  requestTataAccountOtp: (email: string) => Promise<{ success: boolean; message: string; deliveryMethod?: string; previewUrl?: string; emailSent?: boolean }>;
  verifyTataAccountOtp: (data: { email: string; otp: string; name?: string; avatarUrl?: string; id?: string }) => Promise<TataAccount>;
  logoutTataAccount: () => Promise<void>;
  fetchTataAccountProfile: (email?: string) => Promise<TataAccount | null>;
  createPaymentOrder: (plan: TataPlanType, promoCode?: string) => Promise<{
    success: boolean;
    orderId: string;
    snapToken?: string;
    redirectUrl?: string;
    amount: number;
    originalAmount?: number;
    planName: string;
    promoCode?: string | null;
    clientKey?: string;
    isProduction?: boolean;
    error?: string;
    message?: string;
  }>;
  checkPromoCode: (code: string, plan: string) => Promise<{
    valid: boolean;
    type: 'discount' | 'free';
    code: string;
    planId?: string;
    planName?: string;
    originalAmount?: number;
    discountAmount?: number;
    finalAmount?: number;
    discountType?: 'percent' | 'fixed';
    discountValue?: number;
    tier?: string;
    durationDays?: number | null;
    message?: string;
  }>;
  upgradeTataAccountPremium: (plan: TataPlanType, paymentProof: PaymentProof) => Promise<TataAccount>;
  restoreTataAccountPremium: (email?: string, paymentProof?: PaymentProof) => Promise<boolean>;
  redeemPromoCode: (code: string) => Promise<{ success: boolean; message: string; tier: string }>;
  activateTataTrial: () => Promise<{ success: boolean; message: string; account?: TataAccount }>;
  isAccountPremium: boolean;
  journeyStartDate: string;
  setJourneyStartDate: (dateStr: string) => void;
  journeyDay: number;
  isStorageHydrated: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Backward-compatibility: Automatic migration from legacy "Noto" app storage keys
function migrateLegacyNotoStorage() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToCheck = [
      'notes', 'tasks', 'transactions', 'moods', 'user', 'archived_tags',
      'pin', 'note_pin', 'scrambled_pin', 'pin_history', 'pin_question', 'pin_answer',
      'lang', 'reminder_active', 'reminder_time', 'savings_target', 'savings_target_title',
      'savings_balance', 'savings_goals', 'initial_debt', 'debts', 'lite_mode', 'app_version',
      'auto_backup_frequency', 'auto_backup_filename_prefix', 'last_auto_backup_timestamp',
      'auto_backup_pin', 'auto_backup_pin_history', 'onboarding_completed', 'streak',
      'last_task_completed', 'hide_finance_tutorial', 'theme', 'wallpaper_accent',
      'ai_credits_date', 'ai_credits_left', 'ai_chat_history', 'ai_chat_timestamp',
      'snake_highscore', 'space_invaders_highscore', 'read_notification_ids', 'dynamic_notifications',
      'gemini_api_key'
    ];

    for (const item of keysToCheck) {
      const notoKey = `noto_${item}`;
      const tataKey = `tata_${item}`;
      const notoVal = localStorage.getItem(notoKey);
      const tataVal = localStorage.getItem(tataKey);
      if (notoVal !== null && tataVal === null) {
        localStorage.setItem(tataKey, notoVal);
      }
    }
  } catch (e) {
    console.warn('[Tata Storage] Legacy Noto migration notice:', e);
  }
}

// Execute migration immediately at module load
migrateLegacyNotoStorage();

export function normalizeBackupData(raw: any): any {
  if (!raw) return null;
  
  // If directly an array, it's raw notes
  if (Array.isArray(raw)) {
    return {
      notes: raw.filter(Boolean).map((n: any) => ({
        id: n.id || `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: typeof n.title === 'string' ? n.title : '',
        content: typeof n.content === 'string' ? n.content : '',
        date: typeof n.date === 'string' ? n.date : new Date().toISOString().split('T')[0],
        folder: typeof n.folder === 'string' ? n.folder : undefined,
        tags: Array.isArray(n.tags) ? n.tags : [],
        isPinned: Boolean(n.isPinned || n.pinned || n.is_pinned),
        isArchived: Boolean(n.isArchived || n.archived || n.is_archived),
        isLocked: Boolean(n.isLocked || n.locked || n.is_locked),
        backgroundColor: typeof n.backgroundColor === 'string' ? n.backgroundColor : undefined,
        checklist: Array.isArray(n.checklist) ? n.checklist : undefined
      })),
      tasks: [],
      transactions: [],
      moods: []
    };
  }

  if (typeof raw !== 'object') return null;

  // Handle nested data wrapper if present
  const src = raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data) ? { ...raw, ...raw.data } : raw;

  const rawNotes = src.notes || src.noto_notes || src.noteList || src.allNotes || [];
  const rawTasks = src.tasks || src.noto_tasks || src.taskList || src.allTasks || [];
  const rawTransactions = src.transactions || src.noto_transactions || src.finance || src.financeList || src.mutations || [];
  const rawMoods = src.moods || src.noto_moods || src.moodList || src.moodEntries || [];
  const rawDebts = src.debts || src.noto_debts || src.debtList || [];
  const rawSavingsGoals = src.savingsGoals || src.noto_savings_goals || src.savingsList || [];
  const user = src.user || src.noto_user || src.userProfile || null;
  const userAvatar = src.userAvatar || src.noto_user_avatar || src.avatar || (user && user.avatarUrl) || undefined;
  const customWallpaper = src.customWallpaper || src.noto_custom_wallpaper || src.wallpaper || undefined;
  const bannerWallpaper = src.bannerWallpaper || src.noto_banner_wallpaper || undefined;

  // Deep sanitize notes
  const notes = Array.isArray(rawNotes) ? rawNotes.filter(Boolean).map((n: any, idx: number) => ({
    id: n.id || `note_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    title: typeof n.title === 'string' ? n.title : '',
    content: typeof n.content === 'string' ? n.content : '',
    date: typeof n.date === 'string' ? n.date : (typeof n.createdAt === 'string' ? n.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]),
    folder: typeof n.folder === 'string' ? n.folder : undefined,
    tags: Array.isArray(n.tags) ? n.tags.filter((t: any) => typeof t === 'string') : [],
    isPinned: Boolean(n.isPinned || n.pinned || n.is_pinned),
    isArchived: Boolean(n.isArchived || n.archived || n.is_archived),
    isLocked: Boolean(n.isLocked || n.locked || n.is_locked),
    backgroundColor: typeof n.backgroundColor === 'string' ? n.backgroundColor : undefined,
    checklist: Array.isArray(n.checklist) ? n.checklist.map((c: any) => ({
      id: c.id || `chk_${Math.random().toString(36).substring(2, 6)}`,
      text: typeof c.text === 'string' ? c.text : '',
      completed: Boolean(c.completed)
    })) : undefined,
    updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : undefined
  })) : [];

  // Deep sanitize tasks
  const tasks = Array.isArray(rawTasks) ? rawTasks.filter(Boolean).map((t: any, idx: number) => ({
    id: t.id || `task_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    title: typeof t.title === 'string' ? t.title : (typeof t.text === 'string' ? t.text : ''),
    completed: Boolean(t.completed || t.isCompleted || t.done),
    date: typeof t.date === 'string' ? t.date : new Date().toISOString().split('T')[0],
    time: typeof t.time === 'string' ? t.time : undefined,
    priority: (t.priority === 'high' || t.priority === 'medium' || t.priority === 'low') ? t.priority : 'medium',
    category: typeof t.category === 'string' ? t.category : undefined,
    tags: Array.isArray(t.tags) ? t.tags.filter((tag: any) => typeof tag === 'string') : [],
    subtasks: Array.isArray(t.subtasks) ? t.subtasks.map((st: any) => ({
      id: st.id || `st_${Math.random().toString(36).substring(2, 6)}`,
      title: typeof st.title === 'string' ? st.title : '',
      completed: Boolean(st.completed)
    })) : [],
    alarmTime: typeof t.alarmTime === 'string' ? t.alarmTime : undefined,
    repeat: typeof t.repeat === 'string' ? t.repeat : undefined,
    deleted: Boolean(t.deleted),
    deletedAt: typeof t.deletedAt === 'string' ? t.deletedAt : undefined,
    isHabit: Boolean(t.isHabit),
    isDiscipline: Boolean(t.isDiscipline || t.disciplineMode),
    disciplineMode: Boolean(t.disciplineMode || t.isDiscipline),
    disciplineData: t.disciplineData && typeof t.disciplineData === 'object' ? t.disciplineData : undefined,
    disciplineHistory: Array.isArray(t.disciplineHistory) ? t.disciplineHistory : undefined
  })) : [];

  // Deep sanitize transactions
  const transactions = Array.isArray(rawTransactions) ? rawTransactions.filter(Boolean).map((tx: any, idx: number) => {
    const rawAmt = typeof tx.amount === 'number' ? tx.amount : parseFloat(String(tx.amount || 0));
    return {
      id: tx.id || `tx_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      title: typeof tx.title === 'string' ? tx.title : (typeof tx.description === 'string' ? tx.description : ''),
      amount: isNaN(rawAmt) ? 0 : Math.abs(rawAmt),
      type: (tx.type === 'income' || tx.type === 'pemasukan') ? 'income' : 'expense',
      category: typeof tx.category === 'string' ? tx.category : 'Lainnya',
      date: typeof tx.date === 'string' ? tx.date : new Date().toISOString().split('T')[0],
      note: typeof tx.note === 'string' ? tx.note : undefined
    };
  }) : [];

  // Deep sanitize moods
  const moods = Array.isArray(rawMoods) ? rawMoods.filter(Boolean).map((m: any, idx: number) => ({
    id: m.id || `mood_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    date: typeof m.date === 'string' ? m.date : new Date().toISOString().split('T')[0],
    mood: typeof m.mood === 'string' ? m.mood : 'neutral',
    note: typeof m.note === 'string' ? m.note : ''
  })) : [];

  // Deep sanitize debts
  const debts = Array.isArray(rawDebts) ? rawDebts.filter(Boolean).map((d: any, idx: number) => {
    const amt = typeof d.amount === 'number' ? d.amount : parseFloat(String(d.amount || 0));
    const paid = typeof d.paidAmount === 'number' ? d.paidAmount : parseFloat(String(d.paidAmount || 0));
    return {
      id: d.id || `debt_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      title: typeof d.title === 'string' ? d.title : '',
      amount: isNaN(amt) ? 0 : amt,
      paidAmount: isNaN(paid) ? 0 : paid,
      type: (d.type === 'receivable' || d.type === 'piutang') ? 'receivable' : 'debt',
      dueDate: typeof d.dueDate === 'string' ? d.dueDate : undefined,
      note: typeof d.note === 'string' ? d.note : undefined,
      history: Array.isArray(d.history) ? d.history : []
    };
  }) : [];

  // Deep sanitize savings goals
  const savingsGoals = Array.isArray(rawSavingsGoals) ? rawSavingsGoals.filter(Boolean).map((sg: any, idx: number) => {
    const target = typeof sg.targetAmount === 'number' ? sg.targetAmount : parseFloat(String(sg.targetAmount || 0));
    const current = typeof sg.currentAmount === 'number' ? sg.currentAmount : parseFloat(String(sg.currentAmount || 0));
    return {
      id: sg.id || `sg_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      title: typeof sg.title === 'string' ? sg.title : '',
      targetAmount: isNaN(target) ? 0 : target,
      currentAmount: isNaN(current) ? 0 : current,
      category: typeof sg.category === 'string' ? sg.category : 'General',
      targetDate: typeof sg.targetDate === 'string' ? sg.targetDate : undefined,
      history: Array.isArray(sg.history) ? sg.history : []
    };
  }) : [];

  return {
    ...src,
    notes,
    tasks,
    transactions,
    moods,
    debts,
    savingsGoals,
    user: user && typeof user === 'object' ? user : undefined,
    userAvatar,
    customWallpaper,
    bannerWallpaper,
    streak: src.streak !== undefined ? src.streak : src.noto_streak,
    lastTaskCompleted: src.lastTaskCompleted !== undefined ? src.lastTaskCompleted : src.noto_last_task_completed,
    journeyStartDate: src.journeyStartDate || src.tata_journey_start_date || src.noto_journey_start_date || src.journey_start_date || undefined,
    userProfileIncluded: src.userProfileIncluded !== undefined ? src.userProfileIncluded : undefined,
    settingsIncluded: src.settingsIncluded !== undefined ? src.settingsIncluded : undefined,
    appPin: src.appPin || src.noto_pin || src.pin || src.app_pin,
    notePin: src.notePin || src.noto_note_pin || src.note_pin,
    pinHistory: src.pinHistory || src.noto_pin_history,
    pinRecoveryQuestion: src.pinRecoveryQuestion || src.noto_pin_question || src.pin_question,
    pinRecoveryAnswer: src.pinRecoveryAnswer || src.noto_pin_answer || src.pin_answer,
    autoBackupPin: src.autoBackupPin || src.noto_auto_backup_pin,
    autoBackupPinHistory: src.autoBackupPinHistory || src.noto_auto_backup_pin_history,
    lang: src.lang || src.noto_lang,
    reminderActive: src.reminderActive !== undefined ? src.reminderActive : src.noto_reminder_active,
    reminderTime: src.reminderTime || src.noto_reminder_time,
    savingsTarget: src.savingsTarget !== undefined ? src.savingsTarget : src.noto_savings_target,
    savingsTargetTitle: src.savingsTargetTitle || src.noto_savings_target_title,
    savingsBalance: src.savingsBalance !== undefined ? src.savingsBalance : src.noto_savings_balance,
    initialDebt: src.initialDebt !== undefined ? src.initialDebt : src.noto_initial_debt,
    hasCompletedOnboarding: src.hasCompletedOnboarding !== undefined ? src.hasCompletedOnboarding : src.noto_onboarding_completed,
    archivedTags: src.archivedTags || src.noto_archived_tags,
    isLiteMode: src.isLiteMode !== undefined ? src.isLiteMode : src.noto_lite_mode,
    autoBackupFrequency: src.autoBackupFrequency || src.noto_auto_backup_frequency,
    autoBackupFilenamePrefix: src.autoBackupFilenamePrefix || src.noto_auto_backup_filename_prefix,
    lastAutoBackupTimestamp: src.lastAutoBackupTimestamp !== undefined ? src.lastAutoBackupTimestamp : src.noto_last_auto_backup_timestamp,
    appTheme: src.appTheme || src.noto_theme || src.theme,
    wallpaperAccent: src.wallpaperAccent || src.noto_wallpaper_accent,
    hideFinanceTutorial: src.hideFinanceTutorial || src.noto_hide_finance_tutorial,
    aiCreditsDate: src.aiCreditsDate || src.noto_ai_credits_date,
    aiChatHistory: src.aiChatHistory || src.noto_ai_chat_history,
    aiChatTimestamp: src.aiChatTimestamp || src.noto_ai_chat_timestamp,
    snakeHighScore: src.snakeHighScore || src.noto_snake_highscore,
    tetrisHighScore: src.tetrisHighScore || src.tetris_highscore,
    spaceInvadersHighScore: src.spaceInvadersHighScore || src.noto_space_invaders_highscore,
    readNotificationIds: src.readNotificationIds || src.noto_read_notification_ids,
    dynamicNotifications: src.dynamicNotifications || src.noto_dynamic_notifications,
    geminiApiKey: src.geminiApiKey || src.noto_gemini_api_key,
    disciplineMediaMap: src.disciplineMediaMap || src.disciplineMedia || undefined,
    soundEnabled: src.soundEnabled !== undefined ? src.soundEnabled : (src.noto_sound_enabled !== undefined ? src.noto_sound_enabled : undefined),
    tataAccount: src.tataAccount || src.tata_account_session || undefined
  };
}

const safeSetItem = (key: string, value: string) => {
  try {
    // If value is too large for synchronous localStorage (> 500KB), let IndexedDB handle it exclusively
    if (value.length > 500000) {
      return;
    }
    localStorage.setItem(key, value);
  } catch (e: any) {
    if (e?.name === 'QuotaExceededError' || e?.code === 22 || e?.number === -2147024882) {
      console.warn(`[Tata Storage] localStorage quota reached for "${key}". Data is preserved safely in IndexedDB.`);
    } else {
      console.warn(`[Tata Storage] Failed to save "${key}" to localStorage:`, e);
    }
  }
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [tempNoteContext, setTempNoteContext] = useState<{ title: string; content: string } | null>(null);
  const [autoSendNoteToAI, setAutoSendNoteToAI] = useState<boolean>(false);
  const [geminiApiKey, setGeminiApiKeyState] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem('tata_gemini_api_key');
      if (!raw) return null;
      const deobfuscated = deobfuscateApiKey(raw);
      // Automatically migrate legacy formats (enc_v1: or plaintext) to the new Base64 obfuscation format
      if (raw && !raw.startsWith('obf_v1:')) {
        localStorage.setItem('tata_gemini_api_key', obfuscateApiKey(deobfuscated));
      }
      return deobfuscated;
    } catch (e) {
      return null;
    }
  });

  const setGeminiApiKey = (key: string | null) => {
    setGeminiApiKeyState(key);
    try {
      if (key === null) {
        localStorage.removeItem('tata_gemini_api_key');
      } else {
        localStorage.setItem('tata_gemini_api_key', obfuscateApiKey(key));
      }
    } catch (e) {}
  };

  // Tata Account State (STRICTLY SEPARATED from personal data)
  const [tataAccount, setTataAccount] = useState<TataAccount | null>(() => {
    try {
      const saved = localStorage.getItem('tata_account_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (parsed.avatarUrl && (parsed.avatarUrl.includes('dicebear.com') || !parsed.avatarUrl)) {
            parsed.avatarUrl = generateInitialsAvatar(parsed.name || parsed.email);
          }
          if (!parsed.sessionToken) {
            const token = localStorage.getItem('tata_session_token');
            if (token) parsed.sessionToken = token;
          }
          return parsed;
        }
      }
    } catch(e) {}
    return null;
  });

  useEffect(() => {
    try {
      if (tataAccount) {
        localStorage.setItem('tata_account_session', JSON.stringify(tataAccount));
      }
      // Note: Do NOT remove tata_account_session when tataAccount temporarily re-renders or initializes.
      // Explicit removal only occurs in logoutTataAccount().
    } catch(e) {}
  }, [tataAccount]);

  const loginWithGoogle = async (data: { credential: string }): Promise<{ success: boolean; account: TataAccount; isPremium: boolean }> => {
    if (!data?.credential || typeof data.credential !== 'string' || !data.credential.trim()) {
      throw new Error('Token kredensial Google resmi (credential) wajib disertakan.');
    }
    const res = await fetch('/api/account/google-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: data.credential.trim() })
    });
    const resData = await res.json();
    if (!res.ok || !resData.success || !resData.account) {
      throw new Error(resData.message || resData.error || 'Verifikasi akun Google gagal.');
    }
    const sanitizedAccount: TataAccount = {
      ...resData.account,
      avatarUrl: sanitizeAvatarUrl(resData.account.avatarUrl, resData.account.name || resData.account.email),
      sessionToken: resData.token || undefined
    };
    if (resData.token) {
      try {
        localStorage.setItem('tata_session_token', resData.token);
      } catch (e) {}
    }
    setTataAccount(sanitizedAccount);
    setUser((prev: any) => {
      const shouldUpdateName = !prev?.name || prev?.name === 'Pengguna' || prev?.name === 'Pengguna Tata' || prev?.name === 'Tata User';
      const shouldUpdateAvatar = !prev?.avatarUrl && Boolean(sanitizedAccount.avatarUrl);
      if (shouldUpdateName || shouldUpdateAvatar) {
        return {
          ...prev,
          name: (shouldUpdateName && sanitizedAccount.name) ? sanitizedAccount.name : prev?.name,
          avatarUrl: shouldUpdateAvatar ? (sanitizedAccount.avatarUrl || '') : (prev?.avatarUrl || '')
        };
      }
      return prev;
    });
    return {
      success: true,
      account: sanitizedAccount,
      isPremium: Boolean(resData.isPremium)
    };
  };

  const loginWithGoogleCredential = async (credential: string): Promise<{ success: boolean; account: TataAccount; isPremium: boolean }> => {
    return loginWithGoogle({ credential });
  };

  const loginTataAccount = async (data: { credential: string }): Promise<TataAccount> => {
    const res = await loginWithGoogle(data);
    return res.account;
  };

  const requestTataAccountOtp = async (email: string): Promise<{ success: boolean; message: string; deliveryMethod?: string; previewUrl?: string; emailSent?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();
    const res = await fetch('/api/account/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail })
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      return { 
        success: true, 
        message: data.message, 
        deliveryMethod: data.deliveryMethod,
        previewUrl: data.previewUrl,
        emailSent: data.emailSent
      };
    }
    throw new Error(data.message || 'Gagal mengirim kode OTP');
  };

  const verifyTataAccountOtp = async (data: { email: string; otp: string; name?: string; avatarUrl?: string; id?: string }): Promise<TataAccount> => {
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanOtp = data.otp.trim();
    const res = await fetch('/api/account/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        otp: cleanOtp,
        name: data.name,
        avatarUrl: data.avatarUrl,
        id: data.id
      })
    });
    const resData = await res.json().catch(() => ({}));
    if (res.ok && resData.success && resData.account) {
      const sanitizedAccount = {
        ...resData.account,
        avatarUrl: sanitizeAvatarUrl(resData.account.avatarUrl, resData.account.name || resData.account.email)
      };
      const accountWithToken: TataAccount = {
        ...sanitizedAccount,
        sessionToken: resData.token || undefined
      };
      if (resData.token) {
        try {
          localStorage.setItem('tata_session_token', resData.token);
        } catch (e) {}
      }
      setTataAccount(accountWithToken);
      setUser((prev: any) => {
        const shouldUpdateName = !prev?.name || prev?.name === 'Pengguna' || prev?.name === 'Pengguna Tata' || prev?.name === 'Tata User';
        const shouldUpdateAvatar = !prev?.avatarUrl && Boolean(accountWithToken.avatarUrl);
        if (shouldUpdateName || shouldUpdateAvatar) {
          return {
            ...prev,
            name: (shouldUpdateName && accountWithToken.name) ? accountWithToken.name : prev?.name,
            avatarUrl: shouldUpdateAvatar ? (accountWithToken.avatarUrl || '') : (prev?.avatarUrl || '')
          };
        }
        return prev;
      });
      return accountWithToken;
    }
    throw new Error(resData.message || 'Kode OTP salah atau kedaluwarsa');
  };

  const logoutTataAccount = async () => {
    const token = tataAccount?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      await fetch('/api/account/logout', { method: 'POST', headers });
    } catch(e) {}
    try {
      localStorage.removeItem('tata_account_session');
      localStorage.removeItem('tata_session_token');
    } catch(e) {}
    setTataAccount(null);
  };

  const fetchTataAccountProfile = async (email?: string): Promise<TataAccount | null> => {
    const token = tataAccount?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
    if (!token) return tataAccount;

    const targetEmail = email || tataAccount?.email;
    try {
      const query = targetEmail ? `?email=${encodeURIComponent(targetEmail)}` : '';
      const res = await fetch(`/api/account/profile${query}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        console.warn('[Tata Auth] Sesi telah kedaluwarsa atau tidak valid (401), menghapus token lokal dan menampilkan status belum login.');
        try {
          localStorage.removeItem('tata_account_session');
          localStorage.removeItem('tata_session_token');
        } catch(e) {}
        setTataAccount(null);
        return null;
      }

      if (res.status === 403) {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'account_blocked' || String(errData.message).toLowerCase().includes('diblokir')) {
          console.warn('[Tata Auth] Akun telah dinonaktifkan oleh administrator (403)');
          const msg = lang === 'id'
            ? 'Akun Tata Anda telah dinonaktifkan oleh administrator. Hubungi dukungan jika ini adalah kekeliruan.'
            : 'Your Tata account has been suspended by the administrator. Please contact support if you believe this is a mistake.';
          console.warn('[Tata Auth] Notification:', msg);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('tata_toast', { detail: { message: msg, type: 'warning' } }));
          }
          try {
            localStorage.removeItem('tata_account_session');
            localStorage.removeItem('tata_session_token');
          } catch(e) {}
          setTataAccount(null);
          return null;
        }
        return tataAccount;
      }

      const resData = await res.json().catch(() => ({}));
      if (res.ok && resData.success && resData.account) {
        const updated: TataAccount = {
          ...resData.account,
          sessionToken: token
        };
        setTataAccount(updated);
        return updated;
      }
    } catch (e) {
      console.warn('[Tata Auth] Failed to fetch account profile:', e);
    }
    return tataAccount;
  };

  const createPaymentOrder = async (plan: TataPlanType, promoCode?: string) => {
    if (!tataAccount) {
      throw new Error('Silakan masuk dengan Akun Tata terlebih dahulu.');
    }
    const token = tataAccount.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/payment/create-order', {
      method: 'POST',
      headers,
      body: JSON.stringify({ plan, promoCode })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.message || data.error || 'Gagal membuat invoice pembayaran.');
    }
    return data;
  };

  const checkPromoCode = async (code: string, plan: string) => {
    const clean = code.trim().toUpperCase();
    const BUILTIN_FREE_PROMOS: Record<string, { tier: 'pro' | 'pro_max'; planName: string }> = {
      TATAPROMAX: { tier: 'pro_max', planName: 'Tata Pro Max Seumur Hidup (Voucher Promo)' },
      TATAGRATIS: { tier: 'pro_max', planName: 'Tata Pro Max Seumur Hidup (Voucher Promo)' },
      TATABEBAS: { tier: 'pro_max', planName: 'Tata Pro Max Seumur Hidup (Voucher Promo)' },
      TATAPRO: { tier: 'pro', planName: 'Tata Pro Seumur Hidup (Voucher Promo)' }
    };

    try {
      const token = tataAccount?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/payment/check-promo', {
        method: 'POST',
        headers,
        body: JSON.stringify({ code: clean, plan })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.valid) {
        return data;
      }
    } catch (e) {}

    // Offline / unconfigured server fallback for built-in free promo vouchers
    if (BUILTIN_FREE_PROMOS[clean]) {
      return {
        valid: true,
        type: 'free',
        code: clean,
        tier: BUILTIN_FREE_PROMOS[clean].tier,
        planName: BUILTIN_FREE_PROMOS[clean].planName,
        isLifetime: true,
        message: `Voucher "${clean}" valid untuk aktivasi lisensi ${BUILTIN_FREE_PROMOS[clean].planName}.`
      };
    }

    throw new Error('Kode promo tidak valid atau telah kedaluwarsa.');
  };

  const upgradeTataAccountPremium = async (
    plan: TataPlanType,
    paymentProof: PaymentProof
  ): Promise<TataAccount> => {
    if (!tataAccount) {
      throw new Error('Silakan masuk dengan Akun Tata terlebih dahulu.');
    }

    if (!paymentProof || !paymentProof.orderId) {
      throw new Error('Bukti pembelian resmi (Order ID Midtrans) wajib disertakan. Permintaan aktivasi tanpa bukti resmi ditolak.');
    }

    const token = tataAccount.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch('/api/account/upgrade-premium', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: tataAccount.email,
        plan,
        paymentProof
      })
    });

    const resData = await res.json();
    if (!res.ok || !resData.success || !resData.account) {
      throw new Error(resData.message || 'Verifikasi bukti pembayaran ke server Midtrans gagal. Akun Premium tidak diaktifkan.');
    }

    const updated: TataAccount = {
      ...resData.account,
      sessionToken: token || undefined
    };
    setTataAccount(updated);
    return updated;
  };

  const restoreTataAccountPremium = async (email?: string, paymentProof?: PaymentProof): Promise<boolean> => {
    const targetEmail = email || tataAccount?.email;
    if (!targetEmail) return false;
    const token = tataAccount?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const res = await fetch('/api/account/restore-premium', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: targetEmail,
          paymentProof
        })
      });
      const resData = await res.json();
      if (resData.success && resData.account) {
        const updated: TataAccount = {
          ...resData.account,
          sessionToken: token || undefined
        };
        setTataAccount(updated);
        return !!resData.isPremium;
      } else {
        // If verification fails or has expired, reflect accurately in local state
        if (tataAccount) {
          setTataAccount({
            ...tataAccount,
            isPremium: false
          });
        }
        return false;
      }
    } catch (e) {
      return false;
    }
  };

  const isAccountPremium = Boolean(
    tataAccount?.isPremium &&
    (tataAccount.premiumType === 'lifetime' || (Boolean(tataAccount.premiumExpiresAt) && new Date(tataAccount.premiumExpiresAt!).getTime() > Date.now()))
  );

  const [user, setUser] = useState<any>(() => {
    try {
      const dbStr = getLargeItemSync('tata_user');
      const s = dbStr || localStorage.getItem('tata_user');
      if (s) {
        const parsed = JSON.parse(s);
        if (parsed && typeof parsed === 'object') {
          if (parsed.avatarUrl === 'indexeddb:user_avatar') {
            const cached = getLargeItemSync('user_avatar');
            if (cached) parsed.avatarUrl = cached;
          } else if (parsed.avatarUrl && parsed.avatarUrl.includes('dicebear.com')) {
            parsed.avatarUrl = generateInitialsAvatar(parsed.name);
          }
          return parsed;
        }
      }
    } catch(e){}
    return currentUser;
  });


  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const dbStr = getLargeItemSync('tata_notes');
      const s = dbStr || localStorage.getItem('tata_notes');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const seen = new Set();
          return parsed.map((n: Note) => {
            if (seen.has(n.id)) n.id = generateId();
            seen.add(n.id);
            return n;
          });
        }
      }
    } catch(e){}
    return recentNotes;
  });

  
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const dbStr = getLargeItemSync('tata_tasks');
      const s = dbStr || localStorage.getItem('tata_tasks');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) {
          const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
          return parsed.map((t: Task) => {
            if (t.isDiscipline) {
              const isCompletedToday = Boolean(
                (t.disciplineData?.dailyCheckins && t.disciplineData.dailyCheckins.includes(todayStr)) ||
                (t.disciplineData?.usedRestDates && t.disciplineData.usedRestDates.includes(todayStr)) ||
                (t.completedDates && t.completedDates.includes(todayStr))
              );
              return { ...t, completed: isCompletedToday };
            }
            if (t.repeat === 'daily') {
              const isCompletedToday = t.completedDates && t.completedDates.includes(todayStr);
              if (t.completed && !isCompletedToday) {
                return { ...t, completed: false };
              }
            }
            return t;
          });
        }
      }
    } catch(e){}
    return allTasks;
  });



  useEffect(() => {
    const checkDailyReset = () => {
      const todayStr = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      setTasks(prev => {
        if (!prev) return prev;
        let needsUpdate = false;
        const next = prev.map(t => {
          if (t.isDiscipline) {
            const isCompletedToday = Boolean(
              (t.disciplineData?.dailyCheckins && t.disciplineData.dailyCheckins.includes(todayStr)) ||
              (t.disciplineData?.usedRestDates && t.disciplineData.usedRestDates.includes(todayStr)) ||
              (t.completedDates && t.completedDates.includes(todayStr))
            );
            if (t.completed !== isCompletedToday) {
              needsUpdate = true;
              return { ...t, completed: isCompletedToday };
            }
            return t;
          }
          if (t.repeat === 'daily') {
            const isCompletedToday = t.completedDates && t.completedDates.includes(todayStr);
            if (t.completed && !isCompletedToday) {
              needsUpdate = true;
              return { ...t, completed: false };
            }
          }
          return t;
        });
        return needsUpdate ? next : prev;
      });
    };

    checkDailyReset();
    const interval = setInterval(checkDailyReset, 60000);
    return () => clearInterval(interval);
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const dbStr = getLargeItemSync('tata_transactions');
      const s = dbStr || localStorage.getItem('tata_transactions');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch(e){}
    return [];
  });


  const [moods, setMoods] = useState<MoodEntry[]>(() => {
    try {
      const dbStr = getLargeItemSync('tata_moods');
      const s = dbStr || localStorage.getItem('tata_moods');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch(e){}
    return [];
  });


  const [archivedTags, setArchivedTags] = useState<string[]>(() => {
    try {
      const s = localStorage.getItem('tata_archived_tags');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch(e){}
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [appPin, setAppPin] = useState<string | null>(() => {
    try { return localStorage.getItem('tata_pin'); } catch(e){}
    return null;
  });
  const [notePin, setNotePinState] = useState<string | null>(() => {
    try { return localStorage.getItem('tata_note_pin'); } catch(e){}
    return null;
  });

  const setNotePin = (pin: string | null) => {
    setNotePinState(pin);
    try {
      if (pin === null) {
        localStorage.removeItem('tata_note_pin');
      } else {
        safeSetItem('tata_note_pin', pin);
      }
    } catch (e) {}
  };
  const [useScrambledPin, setUseScrambledPin] = useState<boolean>(() => {
    try { return localStorage.getItem('tata_scrambled_pin') === 'true'; } catch(e){}
    return false;
  });

  useEffect(() => {
    try { safeSetItem('tata_scrambled_pin', String(useScrambledPin)); } catch(e){}
  }, [useScrambledPin]);
  const [pinHistory, setPinHistory] = useState<PinHistoryEntry[]>(() => {
    try {
      const s = localStorage.getItem('tata_pin_history');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    if (appPin && pinHistory.length === 0) {
      setPinHistory([
        {
          id: generateId(),
          hashedPin: appPin,
          startDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          endDate: null
        }
      ]);
    }
  }, [appPin, pinHistory.length]);

  const recordPinChange = async (newHashedPin: string | null) => {
    setAppPin(newHashedPin);
    setPinHistory(prev => {
      const now = new Date().toISOString();
      const updated = prev.map(entry => {
        if (entry.endDate === null) {
          return { ...entry, endDate: now };
        }
        return entry;
      });
      if (newHashedPin) {
        updated.push({
          id: generateId(),
          hashedPin: newHashedPin,
          startDate: now,
          endDate: null
        });
      }
      return updated;
    });
  };
  const [pinRecoveryQuestion, setPinRecoveryQuestion] = useState<string | null>(() => {
    try { return localStorage.getItem('tata_pin_question'); } catch(e){}
    return null;
  });
  const [pinRecoveryAnswer, setPinRecoveryAnswer] = useState<string | null>(() => {
    try { return localStorage.getItem('tata_pin_answer'); } catch(e){}
    return null;
  });
  const [sessionUnlockedNoteIds, setSessionUnlockedNoteIds] = useState<string[]>([]);
  const unlockNoteForSession = (id: string) => {
    setSessionUnlockedNoteIds(prev => prev.includes(id) ? prev : [...prev, id]);
  };
  const lockNoteForSession = (id: string) => {
    setSessionUnlockedNoteIds(prev => prev.filter(item => item !== id));
  };
  const [lang, setLang] = useState<'id' | 'en'>(() => {
    try { const s = localStorage.getItem('tata_lang'); if (s) return s as 'id' | 'en'; } catch(e){}
    return 'id';
  });

  const [reminderActive, setReminderActive] = useState<boolean>(() => {
    try { 
      const s = localStorage.getItem('tata_reminder_active'); 
      if (s !== null) return JSON.parse(s); 
    } catch(e){}
    return true;
  });

  const [reminderTime, setReminderTime] = useState<string>(() => {
    try { 
      const s = localStorage.getItem('tata_reminder_time'); 
      if (s) return s; 
    } catch(e){}
    return '09:00';
  });

  const [savingsTarget, setSavingsTarget] = useState<number | null>(() => {
    try {
      const s = localStorage.getItem('tata_savings_target');
      if (s !== null) return JSON.parse(s);
    } catch(e){}
    return null;
  });

  const [savingsTargetTitle, setSavingsTargetTitle] = useState<string>(() => {
    try {
      const s = localStorage.getItem('tata_savings_target_title');
      if (s !== null) return s;
    } catch(e){}
    return '';
  });

  const [savingsBalance, setSavingsBalance] = useState<number>(() => {
    try {
      const s = localStorage.getItem('tata_savings_balance');
      if (s !== null) return JSON.parse(s);
    } catch(e){}
    return 0;
  });

  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>(() => {
    try {
      const dbStr = getLargeItemSync('tata_savings_goals');
      const s = dbStr || localStorage.getItem('tata_savings_goals');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      // Auto-migrate from legacy single target if exists
      const legacyTarget = localStorage.getItem('tata_savings_target');
      const legacyTitle = localStorage.getItem('tata_savings_target_title');
      const legacyBalance = localStorage.getItem('tata_savings_balance');
      const parsedTarget = legacyTarget ? JSON.parse(legacyTarget) : null;
      const parsedBalance = legacyBalance ? JSON.parse(legacyBalance) : 0;
      if (parsedTarget || parsedBalance > 0 || (legacyTitle && legacyTitle.trim())) {
        return [
          {
            id: 'goal_default_1',
            title: (legacyTitle && legacyTitle.trim()) || 'Tabungan Utama',
            targetAmount: parsedTarget || 0,
            currentAmount: parsedBalance || 0,
            category: 'Tabungan',
            emoji: '🎯',
            createdAt: new Date().toISOString().split('T')[0],
            isCompleted: parsedTarget ? parsedBalance >= parsedTarget : false
          }
        ];
      }
    } catch(e){}
    return [];
  });

  const isSavingsGoalsMountedRef = useRef(false);
  useEffect(() => {
    if (!isStorageHydrated()) return;
    if (!isSavingsGoalsMountedRef.current) {
      isSavingsGoalsMountedRef.current = true;
      return;
    }
    const str = JSON.stringify(savingsGoals);
    safeSetItem('tata_savings_goals', str);
    setLargeItem('tata_savings_goals', str).catch(e => console.error(e));
  }, [savingsGoals]);

  const addSavingsGoal = (goal: SavingsGoal) => {
    setSavingsGoals(prev => [goal, ...prev]);
  };

  const updateSavingsGoal = (updatedGoal: SavingsGoal) => {
    setSavingsGoals(prev => prev.map(g => g.id === updatedGoal.id ? updatedGoal : g));
  };

  const deleteSavingsGoal = (id: string) => {
    setSavingsGoals(prev => prev.filter(g => g.id !== id));
  };

  const clearAllSavingsGoals = () => {
    setSavingsGoals([]);
    try {
      localStorage.removeItem('tata_savings_goals');
      deleteLargeItem('tata_savings_goals').catch(e => console.error(e));
    } catch(e){}
  };

  const depositToSavingsGoal = (goalId: string, amount: number, transactionDate?: string, note?: string) => {
    const targetGoal = savingsGoals.find(g => g.id === goalId);
    if (!targetGoal) return;

    const newCurrent = targetGoal.currentAmount + amount;
    const isCompleted = targetGoal.targetAmount > 0 && newCurrent >= targetGoal.targetAmount;

    setSavingsGoals(prev => prev.map(g => g.id === goalId ? {
      ...g,
      currentAmount: newCurrent,
      isCompleted
    } : g));

    const todayIso = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const txDate = transactionDate || todayIso;
    addTransaction({
      id: generateId(),
      type: 'expense',
      amount: amount,
      category: 'Savings',
      date: txDate,
      description: note || `Setoran Tabungan (${targetGoal.title})`,
      currency: 'IDR'
    });
  };

  const withdrawFromSavingsGoal = (goalId: string, amount: number, transactionDate?: string, note?: string) => {
    const targetGoal = savingsGoals.find(g => g.id === goalId);
    if (!targetGoal) return;

    const newCurrent = Math.max(0, targetGoal.currentAmount - amount);
    const isCompleted = targetGoal.targetAmount > 0 && newCurrent >= targetGoal.targetAmount;

    setSavingsGoals(prev => prev.map(g => g.id === goalId ? {
      ...g,
      currentAmount: newCurrent,
      isCompleted
    } : g));

    const todayIso = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const txDate = transactionDate || todayIso;
    addTransaction({
      id: generateId(),
      type: 'income',
      amount: amount,
      category: 'Savings',
      date: txDate,
      description: note || `Tarik Tabungan (${targetGoal.title})`,
      currency: 'IDR'
    });
  };

  const [initialDebt, setInitialDebt] = useState<number>(() => {
    try {
      const s = localStorage.getItem('tata_initial_debt');
      if (s !== null) return JSON.parse(s);
    } catch(e){}
    return 0;
  });

  const [debts, setDebts] = useState<DebtItem[]>(() => {
    try {
      const dbStr = getLargeItemSync('tata_debts');
      const s = dbStr || localStorage.getItem('tata_debts');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch(e){}
    return [];
  });

  const isDebtsMountedRef = useRef(false);
  useEffect(() => {
    if (!isStorageHydrated()) return;
    if (!isDebtsMountedRef.current) {
      isDebtsMountedRef.current = true;
      return;
    }
    const str = JSON.stringify(debts);
    safeSetItem('tata_debts', str);
    setLargeItem('tata_debts', str).catch(e => console.error(e));
  }, [debts]);

  const addDebt = (debt: DebtItem) => {
    setDebts(prev => [debt, ...prev]);
  };

  const updateDebt = (updatedDebt: DebtItem) => {
    setDebts(prev => prev.map(d => d.id === updatedDebt.id ? updatedDebt : d));
  };

  const deleteDebt = (id: string) => {
    setDebts(prev => {
      const next = prev.filter(d => d.id !== id);
      if (next.length === 0) {
        setInitialDebt(0);
        try { localStorage.removeItem('tata_initial_debt'); } catch(e){}
      }
      return next;
    });
  };

  const clearAllDebtData = () => {
    setDebts([]);
    setInitialDebt(0);
    try {
      localStorage.removeItem('tata_initial_debt');
      localStorage.removeItem('tata_debts');
      deleteLargeItem('tata_debts').catch(e => console.error(e));
    } catch(e){}
  };

  const payDebtInstallment = (debtId: string, amount: number, transactionDate?: string, note?: string) => {
    const targetDebt = debts.find(d => d.id === debtId);
    if (!targetDebt) return;

    const newPaidInstallments = targetDebt.paidInstallments + 1;
    const newRemainingAmount = Math.max(0, targetDebt.remainingAmount - amount);
    const isPaidOff = newRemainingAmount <= 0 || (targetDebt.installmentCount > 0 && newPaidInstallments >= targetDebt.installmentCount);

    const updated: DebtItem = {
      ...targetDebt,
      paidInstallments: newPaidInstallments,
      remainingAmount: newRemainingAmount,
      isPaidOff
    };

    setDebts(prev => prev.map(d => d.id === debtId ? updated : d));

    const todayIso = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const txDate = transactionDate || todayIso;
    const newTx: Transaction = {
      id: generateId(),
      type: 'expense',
      amount: amount,
      category: 'Bayar Hutang',
      date: txDate,
      description: note || `Angsuran ke-${newPaidInstallments} (${targetDebt.title})`,
      currency: 'IDR',
      linkedDebtId: debtId,
      installmentIndex: newPaidInstallments
    };
    addTransaction(newTx);
  };

  useEffect(() => { safeSetItem('tata_lang', lang); }, [lang]);
  useEffect(() => { safeSetItem('tata_reminder_active', JSON.stringify(reminderActive)); }, [reminderActive]);
  useEffect(() => { safeSetItem('tata_reminder_time', reminderTime); }, [reminderTime]);
  useEffect(() => {
    if (savingsTarget !== null) safeSetItem('tata_savings_target', JSON.stringify(savingsTarget));
    else { try { localStorage.removeItem('tata_savings_target'); } catch(e){} }
  }, [savingsTarget]);

  useEffect(() => {
    if (savingsTargetTitle) safeSetItem('tata_savings_target_title', savingsTargetTitle);
    else { try { localStorage.removeItem('tata_savings_target_title'); } catch(e){} }
  }, [savingsTargetTitle]);

  useEffect(() => {
    safeSetItem('tata_savings_balance', JSON.stringify(savingsBalance));
  }, [savingsBalance]);

  useEffect(() => {
    safeSetItem('tata_initial_debt', JSON.stringify(initialDebt));
  }, [initialDebt]);

  const [isUnlocked, setIsUnlocked] = useState(false);

  const [appVersion, setAppVersionState] = useState<'lite' | 'pro' | 'pro_max' | 'organic'>(() => {
    try {
      const savedAccountStr = localStorage.getItem('tata_account_session');
      let hasValidPro = false;
      if (savedAccountStr) {
        try {
          const acc = JSON.parse(savedAccountStr);
          if (acc && acc.isPremium) {
            const notExpired = !acc.premiumExpiresAt || new Date(acc.premiumExpiresAt).getTime() > Date.now();
            if (notExpired) hasValidPro = true;
          }
        } catch (e) {}
      }

      // If user is not logged in with Google or not premium/trial, they strictly stay in 'lite'
      if (!hasValidPro) {
        return 'lite';
      }

      const v = localStorage.getItem('tata_app_version');
      if (v === 'lite' || v === 'pro' || v === 'pro_max' || v === 'organic') return v;
      if (v === 'cips') return 'pro';
      return 'pro_max';
    } catch (e) {
      return 'lite';
    }
  });

  const [isLiteMode, setIsLiteModeState] = useState<boolean>(() => {
    try {
      const savedAccountStr = localStorage.getItem('tata_account_session');
      let hasValidPro = false;
      if (savedAccountStr) {
        try {
          const acc = JSON.parse(savedAccountStr);
          if (acc && acc.isPremium) {
            const notExpired = !acc.premiumExpiresAt || new Date(acc.premiumExpiresAt).getTime() > Date.now();
            if (notExpired) hasValidPro = true;
          }
        } catch (e) {}
      }
      if (!hasValidPro) return true;

      const v = localStorage.getItem('tata_app_version');
      if (v === 'lite') return true;
      if (v === 'pro' || v === 'pro_max' || v === 'organic') return false;

      const s = localStorage.getItem('tata_lite_mode');
      if (s !== null) return JSON.parse(s);
    } catch(e) {}
    return false;
  });

  const setIsLiteMode = (val: boolean) => {
    setIsLiteModeState(val);
    try {
      localStorage.setItem('tata_lite_mode', val ? 'true' : 'false');
      if (val) {
        setAppVersionState('lite');
        localStorage.setItem('tata_app_version', 'lite');
      } else {
        if (appVersion === 'lite') {
          const nextV = isAccountPremium ? 'pro' : 'lite';
          setAppVersionState(nextV);
          localStorage.setItem('tata_app_version', nextV);
        }
      }
    } catch (e) {}
  };

  const setAppVersion = (v: 'lite' | 'pro' | 'pro_max' | 'organic') => {
    // Pro and Pro Max are locked for non-logged-in or free accounts
    if (!isAccountPremium && v !== 'lite') {
      v = 'lite';
    }
    setAppVersionState(v);
    const isLite = v === 'lite';
    setIsLiteModeState(isLite);

    try {
      localStorage.setItem('tata_app_version', v);
      localStorage.setItem('tata_lite_mode', isLite ? 'true' : 'false');
      if (v === 'lite' || v === 'pro') {
        const curTheme = localStorage.getItem('tata_theme');
        if (curTheme === 'organic' || curTheme === 'pro_max') {
          localStorage.setItem('tata_theme', 'dark');
        }
      } else if (v === 'pro_max' || v === 'organic') {
        localStorage.setItem('tata_theme', 'organic');
      }
    } catch (e) {}
  };

  // Monitor trial expiration & Google auth status:
  // Seamlessly transitions to Tata Lite when the 6-day trial expires
  // WITHOUT deleting or touching any Notes, Tasks, Finances, Moods, or user data!
  useEffect(() => {
    if (!tataAccount) {
      if (appVersion !== 'lite') {
        setAppVersion('lite');
      }
      return;
    }

    if (tataAccount.isTrial && tataAccount.trialExpiresAt) {
      const isExpired = Date.now() > new Date(tataAccount.trialExpiresAt).getTime();
      const hasPaid = (tataAccount.transactions || []).some(
        t => t.status === 'success' && t.amount > 0 && t.paymentMethod !== 'google_account_trial'
      );
      if (isExpired && !hasPaid) {
        console.log('[Tata Trial] 6-day trial has ended. Seamlessly switching to Lite mode. All user data is 100% safe.');
        const updated: TataAccount = {
          ...tataAccount,
          isTrial: false,
          isPremium: false,
          premiumType: 'free',
          premiumExpiresAt: null
        };
        setTataAccount(updated);
        try {
          localStorage.setItem('tata_account_session', JSON.stringify(updated));
        } catch (e) {}
        setAppVersion('lite');
      }
    }
  }, [tataAccount, isAccountPremium]);

  const activateTataTrial = async (): Promise<{ success: boolean; message: string; account?: TataAccount }> => {
    const token = tataAccount?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
    if (!token) {
      throw new Error(lang === 'id' 
        ? 'Silakan masuk dengan Akun Google terlebih dahulu untuk mengaktifkan uji coba gratis 6 hari.' 
        : 'Please sign in with a Google account first to activate the 6-day free trial.'
      );
    }
    const res = await fetch('/api/account/activate-trial', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.message || (lang === 'id' ? 'Gagal mengaktifkan uji coba gratis.' : 'Failed to activate trial.'));
    }
    if (data.account) {
      const updated: TataAccount = {
        ...data.account,
        sessionToken: token
      };
      setTataAccount(updated);
      setAppVersion('pro_max');
      try {
        localStorage.setItem('tata_account_session', JSON.stringify(updated));
      } catch (e) {}
    }
    return data;
  };

  const redeemPromoCode = async (rawCode: string): Promise<{ success: boolean; message: string; tier: string }> => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      throw new Error('Silakan masukkan kode promo / voucher terlebih dahulu.');
    }

    const BUILTIN_FREE_PROMOS: Record<string, { tier: 'pro' | 'pro_max'; planName: string }> = {
      TATAPROMAX: { tier: 'pro_max', planName: 'Tata Pro Max Seumur Hidup (Voucher Promo)' },
      TATAGRATIS: { tier: 'pro_max', planName: 'Tata Pro Max Seumur Hidup (Voucher Promo)' },
      TATABEBAS: { tier: 'pro_max', planName: 'Tata Pro Max Seumur Hidup (Voucher Promo)' },
      TATAPRO: { tier: 'pro', planName: 'Tata Pro Seumur Hidup (Voucher Promo)' }
    };

    let serverData: any = null;
    try {
      const token = tataAccount?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/account/redeem-promo', {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          code,
          email: tataAccount?.email || 'guest@tata.local'
        })
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) {
        serverData = data;
      }
    } catch (e) {}

    const isBuiltin = Boolean(BUILTIN_FREE_PROMOS[code]);
    if (!serverData && !isBuiltin) {
      throw new Error('Kode promo voucher tidak valid atau sudah kedaluwarsa.');
    }

    const tier = serverData?.tier || BUILTIN_FREE_PROMOS[code]?.tier || 'pro_max';
    const isProMax = tier === 'pro_max';
    const isLifetime = true;
    const expiresAt = serverData?.expiresAt || new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
    const planName = serverData?.planName || BUILTIN_FREE_PROMOS[code]?.planName || (isProMax
      ? 'Tata Pro Max Seumur Hidup (Voucher Promo)'
      : 'Tata Pro Seumur Hidup (Voucher Promo)');

    const newTxn: TataAccountTransaction = {
      id: `PROMO-${code}-${Date.now()}`,
      transactionId: `PROMO-${code}-${Date.now()}`,
      planName,
      amount: 0,
      currency: 'IDR',
      status: 'success',
      paymentMethod: `Voucher Promo (${code})`,
      paidAt: new Date().toISOString(),
      provider: 'promo_code'
    };

    const currentAccount: TataAccount = serverData?.account || tataAccount || {
      userId: 'local_' + Date.now(),
      email: 'tata.user@local.app',
      name: user?.name || 'Pengguna Tata',
      isPremium: true,
      premiumType: isLifetime ? (isProMax ? 'lifetime' : 'pro') : tier,
      premiumExpiresAt: expiresAt,
      transactions: []
    };

    const updatedAccount: TataAccount = {
      ...currentAccount,
      isPremium: true,
      premiumType: isLifetime ? (isProMax ? 'lifetime' : 'pro') : tier,
      premiumExpiresAt: expiresAt,
      transactions: [newTxn, ...(currentAccount.transactions || [])]
    };

    setTataAccount(updatedAccount);
    try {
      localStorage.setItem('tata_account_session', JSON.stringify(updatedAccount));
    } catch (e) {}

    // Set app version appropriately
    if (isProMax) {
      setAppVersion('pro_max');
    } else {
      setAppVersion('pro');
    }

    return { 
      success: true, 
      message: serverData?.message || `✨ Kode promo ${code} berhasil diklaim! Akun Anda aktif sebagai Tata ${isProMax ? 'Pro Max' : 'Pro'}!`, 
      tier 
    };
  };

  const [autoBackupFrequency, setAutoBackupFrequency] = useState<'off' | '3_days' | '1_week' | '1_month'>(() => {
    try {
      const s = localStorage.getItem('tata_auto_backup_frequency');
      if (s !== null) return s as any;
    } catch (e) {}
    return 'off';
  });

  const [autoBackupFilenamePrefix, setAutoBackupFilenamePrefix] = useState<string>(() => {
    try {
      const s = localStorage.getItem('tata_auto_backup_filename_prefix');
      if (s !== null) return s;
    } catch (e) {}
    return 'tata_backup';
  });

  const [lastAutoBackupTimestamp, setLastAutoBackupTimestamp] = useState<number>(() => {
    try {
      const s = localStorage.getItem('tata_last_auto_backup_timestamp');
      if (s !== null) return parseInt(s, 10);
    } catch (e) {}
    return 0;
  });

  const [autoBackupPin, setAutoBackupPin] = useState<string | null>(() => {
    try { return localStorage.getItem('tata_auto_backup_pin'); } catch(e){}
    return null;
  });

  const [autoBackupPinHistory, setAutoBackupPinHistory] = useState<PinHistoryEntry[]>(() => {
    try {
      const s = localStorage.getItem('tata_auto_backup_pin_history');
      if (s) {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return [];
  });

  useEffect(() => {
    if (autoBackupPin && autoBackupPinHistory.length === 0) {
      setAutoBackupPinHistory([
        {
          id: generateId(),
          hashedPin: autoBackupPin,
          startDate: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString(),
          endDate: null
        }
      ]);
    }
  }, [autoBackupPin, autoBackupPinHistory.length]);

  const recordAutoBackupPinChange = async (newHashedPin: string | null) => {
    setAutoBackupPin(newHashedPin);
    setAutoBackupPinHistory(prev => {
      const now = new Date().toISOString();
      const updated = prev.map(entry => {
        if (entry.endDate === null) {
          return { ...entry, endDate: now };
        }
        return entry;
      });
      if (newHashedPin) {
        updated.push({
          id: generateId(),
          hashedPin: newHashedPin,
          startDate: now,
          endDate: null
        });
      }
      return updated;
    });
  };

  useEffect(() => {
    try {
      if (autoBackupPin) safeSetItem('tata_auto_backup_pin', autoBackupPin); else localStorage.removeItem('tata_auto_backup_pin');
    } catch(e){}
  }, [autoBackupPin]);

  useEffect(() => {
    try {
      safeSetItem('tata_auto_backup_pin_history', JSON.stringify(autoBackupPinHistory));
    } catch(e){}
  }, [autoBackupPinHistory]);

  useEffect(() => {
    safeSetItem('tata_auto_backup_frequency', autoBackupFrequency);
  }, [autoBackupFrequency]);

  useEffect(() => {
    safeSetItem('tata_auto_backup_filename_prefix', autoBackupFilenamePrefix);
  }, [autoBackupFilenamePrefix]);

  useEffect(() => {
    safeSetItem('tata_last_auto_backup_timestamp', JSON.stringify(lastAutoBackupTimestamp));
  }, [lastAutoBackupTimestamp]);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(() => {
    try { 
      const s = localStorage.getItem('tata_onboarding_completed'); 
      if (s !== null) {
        const isCompleted = JSON.parse(s);
        if (isCompleted) return true;
      }

      // Jika belum selesai atau false tapi ternyata punya data (pengguna lama sebelum fitur rilis)
      const u = localStorage.getItem('tata_user');
      if (u) {
        const parsed = JSON.parse(u);
        if (parsed?.name && parsed.name !== 'Pengguna') return true;
      }

      const tasksStr = localStorage.getItem('tata_tasks');
      if (tasksStr && tasksStr !== '[]') return true;

      const notesStr = localStorage.getItem('tata_notes');
      if (notesStr && notesStr !== '[]') return true;
      
    } catch(e){}
    return false;
  });

  useEffect(() => { safeSetItem('tata_onboarding_completed', JSON.stringify(hasCompletedOnboarding)); }, [hasCompletedOnboarding]);

  // Streak logic
  const [streak, setStreak] = useState(() => {
    try { const s = localStorage.getItem('tata_streak'); if (s) return parseInt(s, 10); } catch(e){}
    return 0;
  });
  const [lastTaskCompleted, setLastTaskCompleted] = useState(() => {
    try { return localStorage.getItem('tata_last_task_completed'); } catch(e){}
    return null;
  });

  useEffect(() => {
    if (lastTaskCompleted) {
      const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      const lastDate = new Date(lastTaskCompleted);
      const currentDate = new Date(today);
      const MathFloorDiff = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)); 
      
      if (MathFloorDiff > 1) {
        setStreak(0);
      }
    }
  }, []);

  // Organic Mode Journey & Days Active Tracker
  const [journeyStartDate, setJourneyStartDateState] = useState<string>(() => getStoredJourneyStartDate());

  const setJourneyStartDate = (dateStr: string) => {
    try {
      localStorage.setItem(TATA_JOURNEY_START_KEY, dateStr);
    } catch (e) {}
    setJourneyStartDateState(dateStr);
  };

  const journeyDay = React.useMemo(() => {
    return calculateJourneyDay(journeyStartDate);
  }, [journeyStartDate]);

  // Request storage persistence so browser does not clear localStorage automatically
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then((persisted) => {
        if (persisted) {
          console.log("Tata storage persistence granted.");
        } else {
          console.log("Tata storage persistence not granted.");
        }
      }).catch((err) => {
        console.warn("Storage persistence error:", err);
      });
    }
  }, []);

  // Clean up unused legacy duplicate keys and orphan cache data on startup
  useEffect(() => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        // Clean legacy 'noto_' keys if corresponding 'tata_' key already exists
        if (k.startsWith('noto_')) {
          const tataKey = k.replace('noto_', 'tata_');
          if (localStorage.getItem(tataKey) !== null) {
            keysToRemove.push(k);
          }
        }
        // Clean temporary scratch keys
        if (k.startsWith('tata_temp_')) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach(k => {
        try { localStorage.removeItem(k); } catch (e) {}
      });
    } catch (e) {}
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshStep, setRefreshStep] = useState(1);

  const handleRefreshApp = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshStep(1);

    try {
      // 1. Flush & secure all local data to IndexedDB and LocalStorage safely
      const notesStr = JSON.stringify(notes);
      safeSetItem('tata_notes', notesStr);
      await setLargeItem('tata_notes', notesStr);

      const tasksStr = JSON.stringify(tasks);
      safeSetItem('tata_tasks', tasksStr);
      await setLargeItem('tata_tasks', tasksStr);

      const transactionsStr = JSON.stringify(transactions);
      safeSetItem('tata_transactions', transactionsStr);
      await setLargeItem('tata_transactions', transactionsStr);

      const moodsStr = JSON.stringify(moods);
      safeSetItem('tata_moods', moodsStr);
      await setLargeItem('tata_moods', moodsStr);

      const debtsStr = JSON.stringify(debts);
      safeSetItem('tata_debts', debtsStr);
      await setLargeItem('tata_debts', debtsStr);

      const userStr = JSON.stringify(user);
      safeSetItem('tata_user', userStr);
    } catch (e) {
      console.warn("Storage sync warning during refresh:", e);
    }

    // 2. Real Daily Streak & Discipline Recalculation
    try {
      checkInDaily();
    } catch (e) {}

    // 3. Real Alarm & Notification Synchronization with Service Worker
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        const upcomingTasksWithReminders = (tasks || [])
          .filter(t => !t.completed && !t.deleted && (t.alarmTime || t.time))
          .map(t => {
            const rawTime = t.alarmTime || t.time;
            const today = new Date().toISOString().split('T')[0];
            const timeParts = rawTime ? rawTime.split(':') : ['09', '00'];
            const hours = parseInt(timeParts[0] || '9', 10);
            const mins = parseInt(timeParts[1] || '0', 10);
            const target = new Date(today);
            target.setHours(hours, mins, 0, 0);
            return {
              id: t.id,
              title: t.title,
              body: 'Waktunya menyelesaikan: ' + t.title,
              targetTime: target.getTime(),
              targetScreen: 'tasks',
              targetId: t.id
            };
          });
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_ALARMS',
          alarms: upcomingTasksWithReminders
        });
      }
    } catch (e) {}

    // 4. Background Account & Subscription Profile Check (if logged in)
    try {
      if (tataAccount && tataAccount.sessionToken) {
        fetchTataAccountProfile().catch(() => {});
      }
    } catch (e) {}

    // 5. Background Service Worker Update Check
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
          registrations.forEach(r => r.update().catch(() => {}));
        }).catch(() => {});
      }
    } catch (e) {}

    // 6. Trigger quote change & visual event listeners
    try {
      window.dispatchEvent(new Event('tata_refresh_quote'));
      window.dispatchEvent(new Event('tata_wallpaper_changed'));
      window.dispatchEvent(new Event('tata_banner_wallpaper_changed'));
      window.dispatchEvent(new Event('tata_notifications_changed'));
    } catch (e) {}

    // 7. Tactile sound feedback
    try {
      playTapSound();
    } catch (e) {}

    // Keep active spinning for ~650ms for a satisfying tactile feel
    await new Promise(resolve => setTimeout(resolve, 650));
    setIsRefreshing(false);

    // 8. Inform user with a crisp, reassuring toast message
    try {
      const msg = lang === 'id' 
        ? '✨ Tata berhasil disegarkan! Data tersinkron, streak aktif, & sistem mutakhir.'
        : '✨ Tata refreshed! Data synced, streak active, & system up to date.';
      window.dispatchEvent(new CustomEvent('tata_toast_message', { detail: { message: msg } }));
    } catch (e) {}
  };

  useEffect(() => {
    if (user && user.avatarUrl === 'indexeddb:user_avatar') {
      getLargeItem('user_avatar').then(cached => {
        if (cached) {
          setUser(prev => {
            if (prev && prev.avatarUrl === 'indexeddb:user_avatar') {
              return { ...prev, avatarUrl: cached };
            }
            return prev;
          });
        }
      }).catch(err => console.error("Failed to load async user avatar:", err));
    }
  }, [user?.avatarUrl]);

  const isUserMountedRef = useRef(false);
  useEffect(() => {
    if (!isStorageHydrated()) return;
    if (!isUserMountedRef.current) {
      isUserMountedRef.current = true;
      return;
    }
    const lightweightUser = { ...user };
    if (user.avatarUrl && user.avatarUrl.startsWith('data:image/')) {
      setLargeItem('user_avatar', user.avatarUrl).catch(e => console.error(e));
      lightweightUser.avatarUrl = 'indexeddb:user_avatar';
    } else if (user.avatarUrl === '') {
      deleteLargeItem('user_avatar').catch(e => console.error(e));
    }
    safeSetItem('tata_user', JSON.stringify(lightweightUser));
  }, [user]);

  const isNotesMountedRef = useRef(false);
  const notesSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => { 
    if (!isStorageHydrated()) return;
    if (!isNotesMountedRef.current) {
      isNotesMountedRef.current = true;
      return;
    }
    if (notesSaveTimerRef.current) clearTimeout(notesSaveTimerRef.current);
    notesSaveTimerRef.current = setTimeout(() => {
      try {
        const str = JSON.stringify(notes);
        safeSetItem('tata_notes', str); 
        setLargeItem('tata_notes', str).catch(e => console.error(e));
      } catch (e) {
        console.warn("Storage write error (notes):", e);
      }
    }, 350);
    return () => {
      if (notesSaveTimerRef.current) clearTimeout(notesSaveTimerRef.current);
    };
  }, [notes]);

  const isTasksMountedRef = useRef(false);
  const tasksSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => { 
    if (!isStorageHydrated()) return;
    if (!isTasksMountedRef.current) {
      isTasksMountedRef.current = true;
      return;
    }
    if (tasksSaveTimerRef.current) clearTimeout(tasksSaveTimerRef.current);
    tasksSaveTimerRef.current = setTimeout(() => {
      try {
        const str = JSON.stringify(tasks);
        safeSetItem('tata_tasks', str); 
        setLargeItem('tata_tasks', str).catch(e => console.error(e));
      } catch (e) {
        console.warn("Storage write error (tasks):", e);
      }
    }, 350);
    return () => {
      if (tasksSaveTimerRef.current) clearTimeout(tasksSaveTimerRef.current);
    };
  }, [tasks]);

  const isTxMountedRef = useRef(false);
  const txSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => { 
    if (!isStorageHydrated()) return;
    if (!isTxMountedRef.current) {
      isTxMountedRef.current = true;
      return;
    }
    if (txSaveTimerRef.current) clearTimeout(txSaveTimerRef.current);
    txSaveTimerRef.current = setTimeout(() => {
      try {
        const str = JSON.stringify(transactions);
        safeSetItem('tata_transactions', str); 
        setLargeItem('tata_transactions', str).catch(e => console.error(e));
      } catch (e) {
        console.warn("Storage write error (transactions):", e);
      }
    }, 350);
    return () => {
      if (txSaveTimerRef.current) clearTimeout(txSaveTimerRef.current);
    };
  }, [transactions]);

  const isMoodsMountedRef = useRef(false);
  const moodsSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => { 
    if (!isStorageHydrated()) return;
    if (!isMoodsMountedRef.current) {
      isMoodsMountedRef.current = true;
      return;
    }
    if (moodsSaveTimerRef.current) clearTimeout(moodsSaveTimerRef.current);
    moodsSaveTimerRef.current = setTimeout(() => {
      try {
        const str = JSON.stringify(moods);
        safeSetItem('tata_moods', str); 
        setLargeItem('tata_moods', str).catch(e => console.error(e));
      } catch (e) {
        console.warn("Storage write error (moods):", e);
      }
    }, 350);
    return () => {
      if (moodsSaveTimerRef.current) clearTimeout(moodsSaveTimerRef.current);
    };
  }, [moods]);
  useEffect(() => {
    try {
      if (appPin) safeSetItem('tata_pin', appPin); else localStorage.removeItem('tata_pin');
    } catch(e){}
  }, [appPin]);
  useEffect(() => {
    try {
      safeSetItem('tata_pin_history', JSON.stringify(pinHistory));
    } catch(e){}
  }, [pinHistory]);

  useEffect(() => {
    try {
      if (pinRecoveryQuestion) safeSetItem('tata_pin_question', pinRecoveryQuestion); else localStorage.removeItem('tata_pin_question');
    } catch(e){}
  }, [pinRecoveryQuestion]);
  useEffect(() => {
    try {
      if (pinRecoveryAnswer) safeSetItem('tata_pin_answer', pinRecoveryAnswer); else localStorage.removeItem('tata_pin_answer');
    } catch(e){}
  }, [pinRecoveryAnswer]);
  useEffect(() => { safeSetItem('tata_streak', streak.toString()); }, [streak]);
  useEffect(() => { if (lastTaskCompleted) safeSetItem('tata_last_task_completed', lastTaskCompleted); }, [lastTaskCompleted]);
  useEffect(() => { safeSetItem('tata_archived_tags', JSON.stringify(archivedTags)); }, [archivedTags]);

  const addNote = (note: Note) => {
    playTapSound();
    setNotes(prev => {
      if (prev.some(n => n.id === note.id)) return prev.map(n => n.id === note.id ? note : n);
      return [note, ...prev];
    });
  };
  const updateNote = (note: Note) => setNotes(prev => prev.map(n => n.id === note.id ? note : n));
  const deleteNote = (id: string) => {
    playDeleteSound();
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const addTask = (task: Task) => {
    playTapSound();
    setTasks(prev => {
      let next = prev;
      if (task.isDiscipline) {
        next = next.map(t => t.isDiscipline ? { ...t, isDiscipline: false } : t);
      }
      if (next.some(t => t.id === task.id)) return next.map(t => t.id === task.id ? task : t);
      return [task, ...next];
    });
  };
  const updateTask = (task: Task) => setTasks(prev => {
    let next = prev;
    if (task.isDiscipline) {
      next = next.map(t => (t.isDiscipline && t.id !== task.id) ? { ...t, isDiscipline: false } : t);
    }
    const todayIso = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const updatedTask = { ...task };
    if (updatedTask.isDiscipline && updatedTask.disciplineData) {
      const checkins = updatedTask.disciplineData.dailyCheckins || [];
      const rests = updatedTask.disciplineData.usedRestDates || [];
      const isCompletedToday = checkins.includes(todayIso) || rests.includes(todayIso);
      updatedTask.completed = isCompletedToday;
      updatedTask.completedDates = Array.from(new Set([...(updatedTask.completedDates || []), ...checkins]));
    }
    return next.map(t => t.id === task.id ? updatedTask : t);
  });
  const toggleTask = (id: string, dateStr?: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    const todayIso = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const targetDate = dateStr || todayIso;
    const isToday = targetDate === todayIso;
    
    let isNowCompleted = false;
    let wasCompleted = false;

    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;
      
      if (t.isDiscipline) {
         const disciplineData = t.disciplineData || {};
         const dailyCheckins = new Set(disciplineData.dailyCheckins || []);
         const usedRestDates = new Set(disciplineData.usedRestDates || []);
         const completedDates = new Set(t.completedDates || []);
         const wasDoneOnDate = dailyCheckins.has(targetDate) || usedRestDates.has(targetDate);
         
         if (isToday) {
            wasCompleted = t.completed;
            const newCompleted = !t.completed;
            if (newCompleted) {
              dailyCheckins.add(targetDate);
              completedDates.add(targetDate);
            } else {
              dailyCheckins.delete(targetDate);
              usedRestDates.delete(targetDate);
              completedDates.delete(targetDate);
            }
            isNowCompleted = newCompleted;
         } else {
            if (wasDoneOnDate) {
              dailyCheckins.delete(targetDate);
              usedRestDates.delete(targetDate);
              completedDates.delete(targetDate);
            } else {
              dailyCheckins.add(targetDate);
              completedDates.add(targetDate);
              isNowCompleted = true; // For streak trigger
            }
         }
         
         const isCompletedToday = dailyCheckins.has(todayIso) || usedRestDates.has(todayIso);
         
         return {
           ...t,
           completed: isCompletedToday,
           completedDates: Array.from(completedDates),
           disciplineData: {
             ...disciplineData,
             startDate: disciplineData.startDate || targetDate,
             dailyCheckins: Array.from(dailyCheckins),
             usedRestDates: Array.from(usedRestDates)
           }
         };
      }

      const completedDates = new Set(t.completedDates || []);
      let newCompleted = t.completed;
      
      if (t.repeat === 'daily') {
         if (isToday) {
            wasCompleted = t.completed;
            newCompleted = !t.completed;
            if (newCompleted) completedDates.add(targetDate);
            else completedDates.delete(targetDate);
            isNowCompleted = newCompleted;
         } else {
            const wasDoneOnDate = completedDates.has(targetDate);
            if (wasDoneOnDate) completedDates.delete(targetDate);
            else {
              completedDates.add(targetDate);
              isNowCompleted = true; // For streak trigger
            }
         }
      } else {
         wasCompleted = t.completed;
         newCompleted = !t.completed;
         isNowCompleted = newCompleted;
         if (newCompleted) completedDates.add(targetDate);
         else completedDates.delete(targetDate);
      }
      
      return { ...t, completed: newCompleted, completedDates: Array.from(completedDates) };
    }));
    
    if (isNowCompleted) {
      playTaskCompleteSound();
    } else {
      playTaskUncheckSound();
    }

    if (isNowCompleted && !wasCompleted && isToday) {
      const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      if (lastTaskCompleted !== today) {
        if (lastTaskCompleted) {
          const lastDate = new Date(lastTaskCompleted);
          const currentDate = new Date(today);
          const MathFloorDiff = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (MathFloorDiff === 1) {
            setStreak(s => s + 1);
          } else if (MathFloorDiff > 1) {
            setStreak(1);
          }
        } else {
          setStreak(1);
        }
        setLastTaskCompleted(today);
      }
    } else if (wasCompleted && !isNowCompleted && isToday) {
      // Fitur canggih tambahan: mengurangi streak jika membatalkan penyelesaian dan memundurkan lastTask
      const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      if (lastTaskCompleted === today) {
        // Cek secara sinkron apakah masih ada tugas lain yang 'completed' HARI INI
        // (kita gunakan 'tasks' dengan filter, tapi ingat 'tasks' state-nya akan berubah jadi cek 't.id !== id' yang completed)
        const hasOtherCompletedTasksToday = tasks.some(t => {
          if (t.id === id) return false;
          if (t.completedDates && t.completedDates.includes(today)) return true;
          // For backward compatibility if completedDates is not set but it was completed today
          if (t.completed && (t.date === today || t.date === 'Hari ini')) return true;
          return false;
        });
        if (!hasOtherCompletedTasksToday) {
          setStreak(s => Math.max(0, s - 1));
          
          const yestDate = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
          yestDate.setDate(yestDate.getDate() - 1);
          const yesterday = yestDate.toISOString().split('T')[0];
          setLastTaskCompleted(yesterday);
        }
      }
    }
  };

  const restartTask = (id: string, customTargetDate?: string) => {
    playTapSound();
    const todayIso = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const targetTask = tasks.find(t => t.id === id);
    if (!targetTask) return;

    // Adjust streak if task was completed today and no other task completed today
    if (targetTask.completed && lastTaskCompleted === todayIso) {
      const hasOtherCompletedTasksToday = tasks.some(t => {
        if (t.id === id) return false;
        if (t.completedDates && t.completedDates.includes(todayIso)) return true;
        if (t.completed && (t.date === todayIso || t.date === 'Hari ini')) return true;
        return false;
      });
      if (!hasOtherCompletedTasksToday) {
        setStreak(s => Math.max(0, s - 1));
        const yestDate = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000));
        yestDate.setDate(yestDate.getDate() - 1);
        const yesterday = yestDate.toISOString().split('T')[0];
        setLastTaskCompleted(yesterday);
      }
    }

    setTasks(prev => prev.map(t => {
      if (t.id !== id) return t;

      if (t.isDiscipline) {
        const prevDisc = t.disciplineData || {};
        let nextTargetDate = customTargetDate;
        if (!nextTargetDate && prevDisc.targetDate) {
          if (prevDisc.startDate) {
            const prevStart = new Date(prevDisc.startDate).getTime();
            const prevTarget = new Date(prevDisc.targetDate).getTime();
            const durationMs = Math.max(86400000 * 7, prevTarget - prevStart);
            const targetObj = new Date(new Date().getTime() + durationMs);
            nextTargetDate = targetObj.toISOString().split('T')[0];
          } else {
            const targetObj = new Date();
            targetObj.setDate(targetObj.getDate() + 30);
            nextTargetDate = targetObj.toISOString().split('T')[0];
          }
        }

        return {
          ...t,
          completed: false,
          completedDates: [],
          createdAt: nowIso,
          date: 'Hari ini',
          disciplineData: {
            ...prevDisc,
            startDate: todayIso,
            targetDate: nextTargetDate || prevDisc.targetDate,
            dailyCheckins: [],
            usedRestDates: [],
            punishmentCompletedDates: [],
            journeyLog: [],
            milestones: prevDisc.milestones ? prevDisc.milestones.map(m => ({ ...m, completed: false })) : undefined
          }
        };
      }

      // Routine or regular task
      return {
        ...t,
        completed: false,
        completedDates: [],
        createdAt: nowIso,
        date: 'Hari ini'
      };
    }));
  };

  const deleteTask = (id: string) => {
    playDeleteSound();
    setTasks(prev => {
      const existing = prev.find(t => t.id === id);
      if (!existing) return prev;
      
      if (existing.deleted) {
        // Permanent delete
        return prev.filter(t => t.id !== id);
      }
      
      // Soft delete
      return prev.map(t => {
        if (t.id !== id) return t;
        return {
          ...t,
          deleted: true,
          deletedAt: new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0]
        };
      });
    });
  };

  const restoreTask = (id: string) => {
    playTaskCompleteSound();
    setTasks(prev => prev.map(t => t.id === id ? { ...t, deleted: false } : t));
  };

  const emptyTrash = () => {
    playDeleteSound();
    setTasks(prev => prev.filter(t => !t.deleted));
  };

  const restoreAllTasks = () => {
    playCelebrationSound();
    setTasks(prev => prev.map(t => t.deleted ? { ...t, deleted: false } : t));
  };

  const setMood = (date: string, mood: MoodEntry['mood'], note?: string) => {
    playMoodSound();
    setMoods(prev => {
      const existingIndex = prev.findIndex(m => m.date === date);
      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = { ...next[existingIndex], mood, note: note ?? next[existingIndex].note };
        return next;
      } else {
        return [...prev, { date, mood, note }];
      }
    });
  };

  const checkInDaily = () => {
    const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    if (lastTaskCompleted !== today) {
      if (lastTaskCompleted) {
        const lastDate = new Date(lastTaskCompleted);
        const currentDate = new Date(today);
        const MathFloorDiff = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (MathFloorDiff === 1) {
          setStreak(s => s + 1);
        } else if (MathFloorDiff > 1) {
          setStreak(1);
        }
      } else {
        setStreak(1);
      }
      setLastTaskCompleted(today);
    }
  };

  const isSavingsCategoryName = (cat: string) => {
    const c = (cat || '').toLowerCase().trim();
    return c === 'savings' || c === 'tabungan' || c.includes('setor') || c.includes('tarik') || c.includes('tabungan');
  };

  const isSavingsWithdrawal = (t: Transaction) => {
    const desc = (t.description || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    return desc.includes('tarik') || desc.includes('withdraw') || desc.includes('penarikan') || cat.includes('tarik') || cat.includes('withdraw');
  };

  const calcSavingsBalanceFromTx = (txs: Transaction[]): number => {
    return txs.reduce((acc, t) => {
      if (isSavingsCategoryName(t.category)) {
        if (t.type === 'expense') {
          // Deposit from wallet to savings
          return acc + t.amount;
        }
        if (t.type === 'income') {
          // Withdrawal from savings to wallet
          return Math.max(0, acc - t.amount);
        }
      }
      return acc;
    }, 0);
  };

  useEffect(() => {
    setSavingsBalance(calcSavingsBalanceFromTx(transactions));
  }, [transactions]);

  const addTransaction = (t: Transaction) => {
    playCelebrationSound();
    const txWithTime: Transaction = {
      ...t,
      createdAt: t.createdAt || new Date().toISOString()
    };
    setTransactions(prev => {
      const updated = [txWithTime, ...prev];
      setSavingsBalance(calcSavingsBalanceFromTx(updated));
      return updated;
    });
  };

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setTransactions(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, ...updates } : t);
      setSavingsBalance(calcSavingsBalanceFromTx(updated));
      return updated;
    });
  };

  const deleteTransaction = (id: string) => {
    setTransactions(prev => {
      const targetTx = prev.find(t => t.id === id);
      if (targetTx && targetTx.linkedDebtId) {
        setDebts(currDebts => {
          const d = currDebts.find(item => item.id === targetTx.linkedDebtId);
          if (d) {
            const newPaidCount = Math.max(0, d.paidInstallments - 1);
            const newRemaining = Math.min(d.totalAmount, d.remainingAmount + targetTx.amount);
            return currDebts.map(item => item.id === d.id ? {
              ...item,
              paidInstallments: newPaidCount,
              remainingAmount: newRemaining,
              isPaidOff: newRemaining <= 0
            } : item);
          }
          return currDebts;
        });
      }
      const updated = prev.filter(t => t.id !== id);
      setSavingsBalance(calcSavingsBalanceFromTx(updated));
      return updated;
    });
  };

  const clearAllTransactions = () => {
    setTransactions([]);
    setSavingsBalance(0);
  };

  const importTransactions = (importedTransactions: Transaction[]) => {
    setTransactions(importedTransactions);
    setSavingsBalance(calcSavingsBalanceFromTx(importedTransactions));
  };

  const importData = (importedNotes: Note[], importedTasks: Task[], importedTransactions?: Transaction[]) => {
    setNotes(importedNotes);
    setTasks(importedTasks);
    if (importedTransactions) setTransactions(importedTransactions);
  };

  const createFullBackup = async (options?: {
    notes?: boolean;
    tasks?: boolean;
    transactions?: boolean;
    moods?: boolean;
    userProfile?: boolean;
    settings?: boolean;
  }): Promise<any> => {
    const opts = options || {
      notes: true,
      tasks: true,
      transactions: true,
      moods: true,
      userProfile: true,
      settings: true
    };

    const exportData: any = { 
      version: "5.1",
      timestamp: new Date().toISOString()
    };

    if (opts.notes !== false) {
      exportData.notes = notes;
    } else {
      exportData.notes = [];
    }

    if (opts.tasks !== false) {
      exportData.tasks = tasks;
      try {
        const discMedia = await getAllLargeItemsByPrefix('tata_disc_media_');
        if (discMedia && Object.keys(discMedia).length > 0) {
          exportData.disciplineMediaMap = discMedia;
        }
      } catch (e) {
        console.warn("Could not export discipline media:", e);
      }
    } else {
      exportData.tasks = [];
      exportData.disciplineMediaMap = {};
    }

    if (opts.transactions !== false) {
      exportData.transactions = transactions;
      exportData.initialDebt = initialDebt;
      exportData.debts = debts;
      exportData.savingsGoals = savingsGoals;
      exportData.savingsBalance = savingsBalance;
      exportData.savingsTarget = savingsTarget;
      exportData.savingsTargetTitle = savingsTargetTitle;
      try {
        const hideTut = localStorage.getItem('tata_hide_finance_tutorial');
        if (hideTut) exportData.hideFinanceTutorial = hideTut;
      } catch(e) {}
    } else {
      exportData.transactions = [];
      exportData.initialDebt = 0;
      exportData.debts = [];
      exportData.savingsGoals = [];
      exportData.savingsBalance = 0;
      exportData.savingsTarget = 0;
      exportData.savingsTargetTitle = '';
    }

    if (opts.moods !== false) {
      exportData.moods = moods;
    } else {
      exportData.moods = [];
    }

    if (opts.userProfile !== false) {
      exportData.user = user;
      exportData.streak = streak;
      exportData.lastTaskCompleted = lastTaskCompleted;
      exportData.journeyStartDate = journeyStartDate;
      exportData.userProfileIncluded = true;
      
      try {
        const avatar = await getLargeItem('user_avatar');
        if (avatar) exportData.userAvatar = avatar;
      } catch(e) {}
    } else {
      // Profil, Streak & Hari Penggunaan Tata tidak dicentang:
      // Reset profil ke guest, streak ke 0, riwayat hari penggunaan ke hari ini (0 hari), dan hapus avatar
      exportData.user = { name: 'Pengguna Tata', email: '', bio: '', avatar: '' };
      exportData.streak = 0;
      exportData.lastTaskCompleted = null;
      exportData.journeyStartDate = getTodayDateString();
      exportData.userAvatar = null;
      exportData.userProfileIncluded = false;
    }

    if (opts.settings !== false) {
      exportData.appPin = appPin;
      exportData.notePin = notePin;
      exportData.useScrambledPin = useScrambledPin;
      exportData.pinHistory = pinHistory;
      exportData.pinRecoveryQuestion = pinRecoveryQuestion;
      exportData.pinRecoveryAnswer = pinRecoveryAnswer;
      exportData.lang = lang;
      exportData.reminderActive = reminderActive;
      exportData.reminderTime = reminderTime;
      exportData.hasCompletedOnboarding = hasCompletedOnboarding;
      exportData.isLiteMode = isLiteMode;
      exportData.autoBackupFrequency = autoBackupFrequency;
      exportData.autoBackupFilenamePrefix = autoBackupFilenamePrefix;
      exportData.lastAutoBackupTimestamp = lastAutoBackupTimestamp;
      exportData.autoBackupPin = autoBackupPin;
      exportData.autoBackupPinHistory = autoBackupPinHistory;
      exportData.archivedTags = archivedTags;
      exportData.settingsIncluded = true;

      try {
        const theme = localStorage.getItem('tata_theme');
        if (theme) exportData.appTheme = theme;
        const accent = localStorage.getItem('tata_wallpaper_accent');
        if (accent) exportData.wallpaperAccent = accent;
        const snd = localStorage.getItem('tata_sound_enabled');
        if (snd) exportData.soundEnabled = snd === 'true';
      } catch(e) {}

      // Wallpapers (Custom Page Wallpaper & Banner Box Wallpaper)
      try {
        const customWall = await getLargeItem('tata_custom_wallpaper');
        if (customWall) exportData.customWallpaper = customWall;
        const bannerWall = await getLargeItem('tata_banner_wallpaper');
        if (bannerWall) exportData.bannerWallpaper = bannerWall;
      } catch(e) {}

      // AI credits & logs (tata_ai_credits_left tidak lagi dimasukkan ke backup karena kuota dikelola di server)
      try {
        const aiDate = localStorage.getItem('tata_ai_credits_date');
        if (aiDate) exportData.aiCreditsDate = aiDate;
        const aiHist = localStorage.getItem('tata_ai_chat_history');
        if (aiHist) exportData.aiChatHistory = aiHist;
        const aiTime = localStorage.getItem('tata_ai_chat_timestamp');
        if (aiTime) exportData.aiChatTimestamp = aiTime;
      } catch(e) {}

      // High scores
      try {
        const snake = localStorage.getItem('tata_snake_highscore');
        if (snake) exportData.snakeHighScore = snake;
        const tetris = localStorage.getItem('tetris_highscore');
        if (tetris) exportData.tetrisHighScore = tetris;
        const space = localStorage.getItem('tata_space_invaders_highscore');
        if (space) exportData.spaceInvadersHighScore = space;
        const readNotifs = localStorage.getItem('tata_read_notification_ids');
        if (readNotifs) exportData.readNotificationIds = readNotifs;
        const dynNotifs = localStorage.getItem('tata_dynamic_notifications');
        if (dynNotifs) exportData.dynamicNotifications = dynNotifs;
      } catch(e) {}
    } else {
      exportData.settingsIncluded = false;
      exportData.appPin = null;
      exportData.notePin = null;
      exportData.autoBackupPin = null;
      exportData.customWallpaper = null;
      exportData.bannerWallpaper = null;
    }

    return exportData;
  };

  const importFullBackup = async (rawBackup: any) => {
    if (!rawBackup || typeof rawBackup !== 'object') return;
    
    const backup = normalizeBackupData(rawBackup);
    if (!backup) return;
    
    if (Array.isArray(backup.notes)) {
      setNotes(backup.notes);
      const notesStr = JSON.stringify(backup.notes);
      safeSetItem('tata_notes', notesStr);
      await setLargeItem('tata_notes', notesStr).catch(e => console.error(e));
    }
    if (Array.isArray(backup.tasks)) {
      setTasks(backup.tasks);
      const tasksStr = JSON.stringify(backup.tasks);
      safeSetItem('tata_tasks', tasksStr);
      await setLargeItem('tata_tasks', tasksStr).catch(e => console.error(e));
    }
    if (Array.isArray(backup.transactions)) {
      setTransactions(backup.transactions);
      const txStr = JSON.stringify(backup.transactions);
      safeSetItem('tata_transactions', txStr);
      await setLargeItem('tata_transactions', txStr).catch(e => console.error(e));
    }
    if (Array.isArray(backup.moods)) {
      setMoods(backup.moods);
      const moodsStr = JSON.stringify(backup.moods);
      safeSetItem('tata_moods', moodsStr);
      await setLargeItem('tata_moods', moodsStr).catch(e => console.error(e));
    }
    if (backup.userProfileIncluded === false) {
      const defaultUser = { name: 'Pengguna Tata', email: '', bio: '', avatar: '' };
      setUser(defaultUser);
      safeSetItem('tata_user', JSON.stringify(defaultUser));
      await deleteLargeItem('user_avatar').catch(e => console.error(e));
      setStreak(0);
      safeSetItem('tata_streak', '0');
      setLastTaskCompleted(null);
      localStorage.removeItem('tata_last_task_completed');
      const todayStr = getTodayDateString();
      setJourneyStartDate(todayStr);
      localStorage.setItem('tata_journey_start_date', todayStr);
    } else {
      if (backup.user && typeof backup.user === 'object') {
        setUser(backup.user);
        safeSetItem('tata_user', JSON.stringify(backup.user));
      }
      if (backup.userAvatar) {
        await setLargeItem('user_avatar', backup.userAvatar).catch(e => console.error(e));
      } else if (backup.userAvatar === null) {
        await deleteLargeItem('user_avatar').catch(e => console.error(e));
      }
      if (typeof backup.streak === 'number') {
        setStreak(backup.streak);
        safeSetItem('tata_streak', backup.streak.toString());
      }
      if (backup.lastTaskCompleted !== undefined) {
        setLastTaskCompleted(backup.lastTaskCompleted);
        if (backup.lastTaskCompleted) safeSetItem('tata_last_task_completed', backup.lastTaskCompleted);
        else localStorage.removeItem('tata_last_task_completed');
      }
      if (backup.journeyStartDate && typeof backup.journeyStartDate === 'string') {
        setJourneyStartDate(backup.journeyStartDate);
      }
    }
    if (backup.appPin !== undefined) {
      setAppPin(backup.appPin);
      if (backup.appPin) safeSetItem('tata_pin', backup.appPin); else localStorage.removeItem('tata_pin');
    }
    if (backup.notePin !== undefined) {
      setNotePin(backup.notePin);
      if (backup.notePin) safeSetItem('tata_note_pin', backup.notePin); else localStorage.removeItem('tata_note_pin');
    }
    if (Array.isArray(backup.pinHistory)) {
      setPinHistory(backup.pinHistory);
      safeSetItem('tata_pin_history', JSON.stringify(backup.pinHistory));
    }
    if (backup.autoBackupPin !== undefined) {
      setAutoBackupPin(backup.autoBackupPin);
      if (backup.autoBackupPin) safeSetItem('tata_auto_backup_pin', backup.autoBackupPin); else localStorage.removeItem('tata_auto_backup_pin');
    }
    if (Array.isArray(backup.autoBackupPinHistory)) {
      setAutoBackupPinHistory(backup.autoBackupPinHistory);
      safeSetItem('tata_auto_backup_pin_history', JSON.stringify(backup.autoBackupPinHistory));
    }

    if (backup.pinRecoveryQuestion !== undefined) {
      setPinRecoveryQuestion(backup.pinRecoveryQuestion);
      if (backup.pinRecoveryQuestion) safeSetItem('tata_pin_question', backup.pinRecoveryQuestion);
    }
    if (backup.pinRecoveryAnswer !== undefined) {
      setPinRecoveryAnswer(backup.pinRecoveryAnswer);
      if (backup.pinRecoveryAnswer) safeSetItem('tata_pin_answer', backup.pinRecoveryAnswer);
    }
    if (backup.lang) {
      setLang(backup.lang);
      safeSetItem('tata_lang', backup.lang);
    }
    if (typeof backup.reminderActive === 'boolean') {
      setReminderActive(backup.reminderActive);
      safeSetItem('tata_reminder_active', JSON.stringify(backup.reminderActive));
    }
    if (backup.reminderTime) {
      setReminderTime(backup.reminderTime);
      safeSetItem('tata_reminder_time', backup.reminderTime);
    }
    if (backup.savingsTarget !== undefined) {
      setSavingsTarget(backup.savingsTarget);
      if (backup.savingsTarget !== null) safeSetItem('tata_savings_target', backup.savingsTarget.toString());
      else localStorage.removeItem('tata_savings_target');
    }
    if (backup.savingsTargetTitle !== undefined) {
      setSavingsTargetTitle(backup.savingsTargetTitle);
      safeSetItem('tata_savings_target_title', backup.savingsTargetTitle);
    }
    if (typeof backup.savingsBalance === 'number') {
      setSavingsBalance(backup.savingsBalance);
      safeSetItem('tata_savings_balance', backup.savingsBalance.toString());
    }
    if (typeof backup.hasCompletedOnboarding === 'boolean') {
      setHasCompletedOnboarding(backup.hasCompletedOnboarding);
      safeSetItem('tata_onboarding_completed', JSON.stringify(backup.hasCompletedOnboarding));
    }
    if (Array.isArray(backup.archivedTags)) {
      setArchivedTags(backup.archivedTags);
      safeSetItem('tata_archived_tags', JSON.stringify(backup.archivedTags));
    }
    if (Array.isArray(backup.debts)) {
      setDebts(backup.debts);
      const debtsStr = JSON.stringify(backup.debts);
      safeSetItem('tata_debts', debtsStr);
      await setLargeItem('tata_debts', debtsStr).catch(e => console.error(e));
    }
    if (Array.isArray(backup.savingsGoals)) {
      setSavingsGoals(backup.savingsGoals);
      const sgStr = JSON.stringify(backup.savingsGoals);
      safeSetItem('tata_savings_goals', sgStr);
      await setLargeItem('tata_savings_goals', sgStr).catch(e => console.error(e));
    }
    if (typeof backup.initialDebt === 'number') {
      setInitialDebt(backup.initialDebt);
      safeSetItem('tata_initial_debt', backup.initialDebt.toString());
    }
    if (typeof backup.isLiteMode === 'boolean') {
      setIsLiteMode(backup.isLiteMode);
      safeSetItem('tata_lite_mode', JSON.stringify(backup.isLiteMode));
    }
    if (backup.autoBackupFrequency) {
      setAutoBackupFrequency(backup.autoBackupFrequency);
      safeSetItem('tata_auto_backup_frequency', backup.autoBackupFrequency);
    }
    if (backup.autoBackupFilenamePrefix) {
      setAutoBackupFilenamePrefix(backup.autoBackupFilenamePrefix);
      safeSetItem('tata_auto_backup_filename_prefix', backup.autoBackupFilenamePrefix);
    }
    if (typeof backup.lastAutoBackupTimestamp === 'number') {
      setLastAutoBackupTimestamp(backup.lastAutoBackupTimestamp);
      safeSetItem('tata_last_auto_backup_timestamp', backup.lastAutoBackupTimestamp.toString());
    }
    if (backup.geminiApiKey) {
      setGeminiApiKey(backup.geminiApiKey);
    }
    
    // Asynchronously import wallpapers and avatar
    if (backup.userAvatar) {
      await setLargeItem('user_avatar', backup.userAvatar);
      window.dispatchEvent(new Event('tata_avatar_changed'));
    } else if (backup.userAvatar === null) {
      await deleteLargeItem('user_avatar');
      window.dispatchEvent(new Event('tata_avatar_changed'));
    }

    if (backup.customWallpaper) {
      await setLargeItem('tata_custom_wallpaper', backup.customWallpaper);
      window.dispatchEvent(new Event('tata_wallpaper_changed'));
    } else if (backup.customWallpaper === null) {
      await deleteLargeItem('tata_custom_wallpaper');
      window.dispatchEvent(new Event('tata_wallpaper_changed'));
    }

    if (backup.bannerWallpaper) {
      await setLargeItem('tata_banner_wallpaper', backup.bannerWallpaper);
      window.dispatchEvent(new Event('tata_banner_wallpaper_changed'));
    } else if (backup.bannerWallpaper === null) {
      await deleteLargeItem('tata_banner_wallpaper');
      window.dispatchEvent(new Event('tata_banner_wallpaper_changed'));
    }

    // LocalStorage settings & state
    if (backup.appTheme) {
      safeSetItem('tata_theme', backup.appTheme);
    }
    if (backup.wallpaperAccent) {
      safeSetItem('tata_wallpaper_accent', backup.wallpaperAccent);
      window.dispatchEvent(new Event('tata_wallpaper_accent_changed'));
    }
    if (backup.hideFinanceTutorial) {
      safeSetItem('tata_hide_finance_tutorial', backup.hideFinanceTutorial);
    }
    if (backup.aiCreditsDate) {
      safeSetItem('tata_ai_credits_date', backup.aiCreditsDate);
    }
    if (backup.aiChatHistory) {
      safeSetItem('tata_ai_chat_history', backup.aiChatHistory);
    }
    if (backup.aiChatTimestamp) {
      safeSetItem('tata_ai_chat_timestamp', backup.aiChatTimestamp);
    }
    if (backup.snakeHighScore) {
      safeSetItem('tata_snake_highscore', backup.snakeHighScore);
    }
    if (backup.tetrisHighScore) {
      safeSetItem('tetris_highscore', backup.tetrisHighScore);
    }
    if (backup.spaceInvadersHighScore) {
      safeSetItem('tata_space_invaders_highscore', backup.spaceInvadersHighScore);
    }
    if (backup.readNotificationIds) {
      safeSetItem('tata_read_notification_ids', backup.readNotificationIds);
    }
    if (backup.dynamicNotifications) {
      safeSetItem('tata_dynamic_notifications', backup.dynamicNotifications);
    }
    if (backup.disciplineMediaMap && typeof backup.disciplineMediaMap === 'object') {
      await setManyLargeItems(backup.disciplineMediaMap).catch(e => console.error("Error restoring discipline media:", e));
    }
    if (typeof backup.soundEnabled === 'boolean') {
      localStorage.setItem('tata_sound_enabled', String(backup.soundEnabled));
    }
    window.dispatchEvent(new Event('tata_notifications_changed'));
  };

  const clearAllData = async () => {
    // Securely wipe all data from local storage by dynamically finding all keys, overwriting, and clearing
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        try {
          const val = localStorage.getItem(key);
          if (val) {
            localStorage.setItem(key, '0'.repeat(val.length || 10));
          }
        } catch (e) {}
      });
      localStorage.clear();
    } catch (e) {
      console.error("Error securely wiping localStorage:", e);
    }

    // Clear sessionStorage as well
    try {
      sessionStorage.clear();
    } catch (e) {}

    // Complete wipe of all IndexedDB stored items (including scanned document photos, wallpapers, avatar, and cached collections)
    try {
      await clearAllLargeItems();
    } catch (e) {
      console.error("Failed to clear IndexedDB during reset:", e);
    }

    setNotes([]);
    setTasks([]);
    setTransactions([]);
    setMoods([]);
    setDebts([]);
    setSavingsGoals([]);
    setStreak(0);
    setLastTaskCompleted(null);
    try { localStorage.removeItem(TATA_JOURNEY_START_KEY); } catch(e){}
    setJourneyStartDateState(getTodayDateString());
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

  useEffect(() => {
    safeSetItem('tata_lite_mode', JSON.stringify(isLiteMode));
  }, [isLiteMode]);

  const contextValue = React.useMemo(() => ({
    notes, tasks, transactions, moods, user, updateUser: setUser,
    addNote, updateNote, deleteNote, 
    addTask, updateTask, toggleTask, restartTask, deleteTask, restoreTask, emptyTrash, restoreAllTasks, setMood,
    addTransaction, updateTransaction, deleteTransaction, clearAllTransactions, importTransactions,
    importData, importFullBackup, createFullBackup, clearAllData,
    searchQuery, setSearchQuery, appPin, setAppPin, notePin, setNotePin, useScrambledPin, setUseScrambledPin,
    pinHistory, setPinHistory, recordPinChange,
    pinRecoveryQuestion, setPinRecoveryQuestion, pinRecoveryAnswer, setPinRecoveryAnswer,
    sessionUnlockedNoteIds, unlockNoteForSession, lockNoteForSession,
    lang, setLang,
    hasCompletedOnboarding, setHasCompletedOnboarding,
    isUnlocked, setIsUnlocked, streak,
    journeyStartDate, setJourneyStartDate, journeyDay,
    reminderActive, setReminderActive, reminderTime, setReminderTime,
    savingsTarget, setSavingsTarget, savingsTargetTitle, setSavingsTargetTitle,
    savingsBalance, setSavingsBalance,
    savingsGoals, addSavingsGoal, updateSavingsGoal, deleteSavingsGoal,
    depositToSavingsGoal, withdrawFromSavingsGoal, clearAllSavingsGoals,
    initialDebt, setInitialDebt,
    debts, addDebt, updateDebt, deleteDebt, clearAllDebtData, payDebtInstallment,
    checkInDaily,
    archivedTags, setArchivedTags,
    isRefreshing, refreshStep, handleRefreshApp,
    isLiteMode, setIsLiteMode,
    appVersion, setAppVersion,
    autoBackupFrequency, setAutoBackupFrequency,
    autoBackupFilenamePrefix, setAutoBackupFilenamePrefix,
    lastAutoBackupTimestamp, setLastAutoBackupTimestamp,
    autoBackupPin, setAutoBackupPin,
    autoBackupPinHistory, setAutoBackupPinHistory,
    recordAutoBackupPinChange,
    tempNoteContext, setTempNoteContext, autoSendNoteToAI, setAutoSendNoteToAI,
    geminiApiKey, setGeminiApiKey,
    tataAccount, loginTataAccount, loginWithGoogle, loginWithGoogleCredential, requestTataAccountOtp, verifyTataAccountOtp, logoutTataAccount,
    fetchTataAccountProfile,
    createPaymentOrder,
    checkPromoCode,
    upgradeTataAccountPremium, restoreTataAccountPremium, redeemPromoCode, activateTataTrial, isAccountPremium,
    isStorageHydrated: isStorageHydrated()
  }), [
    notes, tasks, transactions, moods, user, searchQuery, appPin, notePin, useScrambledPin, pinHistory, pinRecoveryQuestion, pinRecoveryAnswer, sessionUnlockedNoteIds, lang,
    hasCompletedOnboarding, isUnlocked, streak,
    journeyStartDate, journeyDay,
    reminderActive, reminderTime, savingsTarget, savingsTargetTitle, savingsBalance, savingsGoals, initialDebt, debts,
    archivedTags, isRefreshing, refreshStep, isLiteMode, appVersion,
    autoBackupFrequency, autoBackupFilenamePrefix, lastAutoBackupTimestamp,
    autoBackupPin, autoBackupPinHistory, tempNoteContext, geminiApiKey,
    tataAccount, isAccountPremium, redeemPromoCode, activateTataTrial, checkPromoCode
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
}

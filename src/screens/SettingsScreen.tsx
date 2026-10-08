import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Upload, Lock, Smartphone, ChevronRight, ChevronLeft, User, 
  Globe, Key, KeyRound, Trash2, Info, AlertTriangle, Image as ImageIcon, RefreshCw, 
  Database, ChevronDown, Check, CheckCircle2, UserCheck, ShieldCheck, HelpCircle, Palette,
  History as HistoryIcon, Bot, Eye, EyeOff, ExternalLink, Gamepad2, Instagram, Crop, Shuffle, Heart, Mail, Bell, FileText, Volume2, VolumeX, Flame, Sparkles,
  Share2, Users, QrCode, Gift, Camera, Sliders, Layers, Crown, Clock,
  CheckSquare, Wallet, Smile, FileCode, PlusCircle, RotateCcw, FileJson, Settings, Zap
} from 'lucide-react';
import { useAppStore, normalizeBackupData } from '../store';
import { useTranslation } from '../translations';
import { ScreenItem } from '../App';
import { generateId, encryptData, decryptData, createPinHash, verifyPin } from '../utils';
import { getLargeItem, getLargeItemSync, setLargeItem, deleteLargeItem } from '../utils/db';
import { getSoundEnabled, setSoundEnabled, playTapSound, playCelebrationSound } from '../utils/sound';
import { calculateJourneyDay, getTodayDateString } from '../utils/journey';
import PrivacyPolicyModal from '../components/PrivacyPolicyModal';
import UpdateNotesModal from '../components/UpdateNotesModal';
import DeveloperMessageModal from '../components/DeveloperMessageModal';
import ImageCropperModal from '../components/ImageCropperModal';
import InviteFriendsModal from '../components/InviteFriendsModal';
import GoogleAccountPromptModal from '../components/GoogleAccountPromptModal';
import BackupRestoreModal from '../components/BackupRestoreModal';
import { WALLPAPER_PRESETS, WallpaperPreset } from '../utils/wallpaperPresets';
import { getOrganicThemePalette } from '../components/home/organicThemePalettes';
import { LiteStickerIcon } from '../components/LiteModeIcons';
import { isSwipeOnInteractiveOrScrollable, MIN_SWIPE_DISTANCE, MIN_SWIPE_RATIO, MAX_SWIPE_TIME_MS } from '../utils/swipeUtils';
import {
  Icon3DPalette, Icon3DGlobe, Icon3DSmartphone, Icon3DVolume, Icon3DTataAI,
  Icon3DLock, Icon3DSecretNote, Icon3DShuffle, Icon3DDatabase, Icon3DDownload,
  Icon3DUpload, Icon3DTrash, Icon3DRefresh, Icon3DBell, Icon3DGamepad,
  Icon3DInfo, Icon3DShield, Icon3DFlame, Icon3DHeart, Icon3DInstagram,
  Icon3DMail, Icon3DKey, Icon3DUser, Icon3DHelp, Icon3DCrop,
  Icon3DCamera, Icon3DHistory, Icon3DCheck, Icon3DShare, Icon3DGift
} from '../components/home/Organic3DIcons';

export type SettingsSectionType = 'profile' | 'theme' | 'appearance' | 'ai' | 'screen-lock' | 'security' | 'note-pin' | 'backup' | 'notifications' | 'privacy' | 'about' | null;

export default function SettingsScreen({ 
  appTheme, 
  setAppTheme, 
  onNavigate,
  activeSection: activeSectionProp,
  setActiveSection: setActiveSectionProp,
  onBack
}: { 
  appTheme: string, 
  setAppTheme: (t: any) => void, 
  onNavigate?: (s: ScreenItem, extra?: any) => void,
  activeSection?: SettingsSectionType,
  setActiveSection?: (s: SettingsSectionType) => void,
  onBack?: () => void
}) {
  const { 
    transactions, notes, tasks, user, updateUser, appPin, setAppPin, notePin, setNotePin, useScrambledPin, setUseScrambledPin,
    pinRecoveryQuestion, setPinRecoveryQuestion, pinRecoveryAnswer, setPinRecoveryAnswer, 
    pinHistory, recordPinChange,
    setIsUnlocked, importData, importFullBackup, createFullBackup, clearAllData, lang, setLang, streak, 
    journeyDay, journeyStartDate, setJourneyStartDate, 
    moods, savingsTarget, savingsTargetTitle, savingsBalance, savingsGoals = [], hasCompletedOnboarding, archivedTags, debts, initialDebt,
    isRefreshing, refreshStep, handleRefreshApp, isLiteMode, setIsLiteMode, appVersion, setAppVersion,
    autoBackupFrequency, setAutoBackupFrequency, autoBackupFilenamePrefix, setAutoBackupFilenamePrefix, 
    lastAutoBackupTimestamp, setLastAutoBackupTimestamp,
    autoBackupPin: storeAutoBackupPin, setAutoBackupPin, autoBackupPinHistory, setAutoBackupPinHistory, 
    recordAutoBackupPinChange, geminiApiKey, setGeminiApiKey,
    tataAccount, isAccountPremium, redeemPromoCode
  } = useAppStore();
  
  const t = useTranslation(lang);
  const isOrganic = appVersion === 'organic' || appVersion === 'pro_max';

  // 6-Day Trial Calculation
  const isTrialActive = Boolean(
    tataAccount?.isTrial &&
    tataAccount?.trialExpiresAt &&
    new Date(tataAccount.trialExpiresAt).getTime() > Date.now()
  );

  const trialDaysLeft = isTrialActive && tataAccount?.trialExpiresAt
    ? Math.max(1, Math.ceil((new Date(tataAccount.trialExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  const canAccessPro = Boolean(isAccountPremium || isTrialActive);

  // Sound feedback state
  const [soundActive, setSoundActive] = useState<boolean>(() => getSoundEnabled());
  const [showLanguageModal, setShowLanguageModal] = useState<boolean>(false);
  const [showModeModal, setShowModeModal] = useState<boolean>(false);
  const [showGoogleTrialModal, setShowGoogleTrialModal] = useState<boolean>(false);
  const [showLicenseModal, setShowLicenseModal] = useState<boolean>(false);
  const [showPwaTroubleshoot, setShowPwaTroubleshoot] = useState<boolean>(false);
  const [licenseModalTierTab, setLicenseModalTierTab] = useState<'pro_max' | 'pro'>('pro_max');
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [isRedeemingPromo, setIsRedeemingPromo] = useState<boolean>(false);
  const [promoFeedback, setPromoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Categorized active section (prop controlled or fallback local state)
  const [localActiveSection, setLocalActiveSection] = useState<SettingsSectionType>(null);
  const currentActiveSection = activeSectionProp !== undefined ? activeSectionProp : localActiveSection;
  const settingsScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Selalu pastikan saat masuk menu baru atau kembali ke awal, mulai dari paling atas
    if (settingsScrollRef.current) {
      settingsScrollRef.current.scrollTop = 0;
    }
    const timer = setTimeout(() => {
      if (settingsScrollRef.current) {
        settingsScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
      }
    }, 15);
    return () => clearTimeout(timer);
  }, [currentActiveSection]);

  const updateActiveSection = (section: SettingsSectionType) => {
    const targetSection = section === 'privacy' ? 'about' : section;
    if (settingsScrollRef.current) {
      settingsScrollRef.current.scrollTop = 0;
    }
    if (setActiveSectionProp) {
      setActiveSectionProp(targetSection);
    } else {
      setLocalActiveSection(targetSection);
    }
  };

  const handleBackSection = () => {
    if (settingsScrollRef.current) {
      settingsScrollRef.current.scrollTop = 0;
    }
    updateActiveSection(null);
  };

  const handleMainBack = () => {
    if (settingsScrollRef.current) {
      settingsScrollRef.current.scrollTop = 0;
    }
    if (currentActiveSection !== null) {
      updateActiveSection(null);
    } else if (onBack) {
      onBack();
    } else if (onNavigate) {
      onNavigate('home');
    }
  };

  const getThemeLabel = (themeId: string) => {
    switch (themeId) {
      case 'organic':
      case 'pro_max': return 'Pro Max';
      case 'slate': 
      case 'dark': return lang === 'id' ? 'Gelap' : 'Dark';
      case 'light': return lang === 'id' ? 'Terang' : 'Light';
      case 'cool': return lang === 'id' ? 'Biru' : 'Blue';
      case 'ecy': 
      case 'pink': return 'Ecy';
      case 'warm': 
      case 'cute': return lang === 'id' ? 'Hangat' : 'Warm';
      case 'simple': return lang === 'id' ? 'Cokelat' : 'Brown';
      case 'wallpaper': return 'Wallpaper';
      default: return themeId;
    }
  };

  const toggleSound = () => {
    const next = !soundActive;
    setSoundEnabled(next);
    setSoundActive(next);
    if (next) playTapSound();
    showNotificationToast(
      lang === 'id' 
        ? (next ? 'Efek suara diaktifkan' : 'Efek suara dinonaktifkan')
        : (next ? 'Sound effects enabled' : 'Sound effects disabled')
    );
  };

  const handleRedeemPromoFromSettings = async (overrideCode?: string) => {
    const code = (overrideCode || promoCodeInput).trim().toUpperCase();
    if (!code) {
      setPromoFeedback({
        type: 'error',
        message: lang === 'id' ? 'Masukkan kode voucher terlebih dahulu.' : 'Please enter a voucher code.'
      });
      return;
    }
    setIsRedeemingPromo(true);
    setPromoFeedback(null);
    playTapSound();
    try {
      const res = await redeemPromoCode(code);
      playCelebrationSound();
      setPromoFeedback({
        type: 'success',
        message: res.message
      });
      showNotificationToast(res.message);
      setTimeout(() => {
        setPromoCodeInput('');
      }, 2000);
    } catch (e: any) {
      setPromoFeedback({
        type: 'error',
        message: e.message || (lang === 'id' ? 'Kode voucher tidak valid.' : 'Invalid promo code.')
      });
    } finally {
      setIsRedeemingPromo(false);
    }
  };

  // Privacy Audit State
  const [isAuditingPrivacy, setIsAuditingPrivacy] = useState<boolean>(false);
  const [privacyAuditResult, setPrivacyAuditResult] = useState<{
    timestamp: string;
    localStorageSizeKB: string;
    totalRecords: number;
    notesCount: number;
    tasksCount: number;
    txCount: number;
    moodsCount: number;
    debtsCount: number;
    pinSecurity: string;
    networkStatus: string;
    isFullyOffline: boolean;
  } | null>(null);
  const [disableTelemetry, setDisableTelemetry] = useState<boolean>(() => {
    return localStorage.getItem('tata_disable_telemetry') === 'true';
  });

  const handleRunPrivacyAudit = () => {
    setIsAuditingPrivacy(true);
    setTimeout(() => {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key) || '';
          totalBytes += key.length + val.length;
        }
      }
      const sizeKB = (totalBytes / 1024).toFixed(2);
      const totalRecs = notes.length + tasks.length + transactions.length + moods.length + debts.length;

      setPrivacyAuditResult({
        timestamp: new Date().toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        localStorageSizeKB: sizeKB,
        totalRecords: totalRecs,
        notesCount: notes.length,
        tasksCount: tasks.length,
        txCount: transactions.length,
        moodsCount: moods.length,
        debtsCount: debts.length,
        pinSecurity: appPin ? (appPin.length > 20 ? 'SHA-256 Salted Hash' : 'Terlindungi') : (lang === 'id' ? 'Nonaktif' : 'Disabled'),
        networkStatus: lang === 'id' ? '0 Byte Terkirim ke Cloud (100% Terisolasi)' : '0 Bytes Sent to Cloud (100% Isolated)',
        isFullyOffline: true
      });
      setIsAuditingPrivacy(false);
      showNotificationToast(lang === 'id' ? 'Audit Privasi Selesai: 100% Terisolasi Lokal!' : 'Privacy Audit Completed: 100% Locally Isolated!');
    }, 450);
  };

  const toggleTelemetry = () => {
    const nextVal = !disableTelemetry;
    setDisableTelemetry(nextVal);
    localStorage.setItem('tata_disable_telemetry', nextVal ? 'true' : 'false');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('tata_telemetry_changed'));
    }
    showNotificationToast(
      lang === 'id'
        ? (nextVal ? 'Statistik anonim penggunaan aplikasi (Vercel Analytics) dinonaktifkan.' : 'Statistik anonim penggunaan aplikasi (Vercel Analytics) diaktifkan.')
        : (nextVal ? 'Anonymous app usage statistics (Vercel Analytics) disabled.' : 'Anonymous app usage statistics (Vercel Analytics) enabled.')
    );
  };

  // Re-map for existing code to work seamlessly
  const activeSection = currentActiveSection;
  const activeTab = currentActiveSection || 'theme';
  const setActiveSection = (section: SettingsSectionType) => {
    if (section === null) {
      handleBackSection();
    } else {
      updateActiveSection(section);
    }
  };

  const SETTINGS_TABS = ['appearance', 'security', 'backup', 'ai', 'about'] as const;
  const touchStartRef = useRef<{ x: number; y: number; time: number; target: HTMLElement | null } | null>(null);

  const handleSettingsTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
      target,
    };
  };

  const handleSettingsTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const startTarget = touchStartRef.current.target;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    if (deltaTime > MAX_SWIPE_TIME_MS) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX < absY * MIN_SWIPE_RATIO) return;
    if (absX < MIN_SWIPE_DISTANCE) return;

    const endTarget = e.target as HTMLElement | null;
    if (isSwipeOnInteractiveOrScrollable(startTarget) || isSwipeOnInteractiveOrScrollable(endTarget)) {
      return;
    }

    const currentIdx = SETTINGS_TABS.indexOf(activeTab as any);
    if (currentIdx === -1) return;

    if (deltaX < 0) {
      // Swipe left -> Next settings tab
      if (currentIdx < SETTINGS_TABS.length - 1) {
        e.stopPropagation();
        setActiveSection(SETTINGS_TABS[currentIdx + 1] as any);
      }
    } else if (deltaX > 0) {
      // Swipe right -> Prev settings tab
      if (currentIdx > 0) {
        e.stopPropagation();
        setActiveSection(SETTINGS_TABS[currentIdx - 1] as any);
      }
    }
  };

  // Modal display states
  const [pinModalMode, setPinModalMode] = useState<'create' | 'verify' | 'change' | 'remove' | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinQuestionInput, setPinQuestionInput] = useState('');
  const [pinAnswerInput, setPinAnswerInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Dedicated Note PIN modal states
  const [notePinModalMode, setNotePinModalMode] = useState<'create' | 'verify' | 'change' | 'remove' | null>(null);
  const [notePinInput, setNotePinInput] = useState('');
  const [notePinError, setNotePinError] = useState(false);
  const [showForgotNotePinModal, setShowForgotNotePinModal] = useState(false);
  const [forgotNoteAnswerInput, setForgotNoteAnswerInput] = useState('');
  const [forgotNoteAnswerError, setForgotNoteAnswerError] = useState(false);
  const [showRecoveryQuestionModal, setShowRecoveryQuestionModal] = useState(false);
  
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showUpdateNotes, setShowUpdateNotes] = useState(false);
  const [showDevMessageModal, setShowDevMessageModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Sound effects state
  const [soundEnabledState, setSoundEnabledState] = useState<boolean>(() => getSoundEnabled());

  const handleToggleSound = () => {
    const next = !soundEnabledState;
    setSoundEnabledState(next);
    setSoundEnabled(next);
    if (next) {
      setTimeout(() => playTapSound(), 50);
    }
  };
  
  // Custom wallpaper states & cropper
  const [localCustomWallpaper, setLocalCustomWallpaper] = useState<string | null>(() => getLargeItemSync("tata_custom_wallpaper"));
  const [localBannerWallpaper, setLocalBannerWallpaper] = useState<string | null>(() => getLargeItemSync("tata_banner_wallpaper"));
  const [cropperModalOpen, setCropperModalOpen] = useState(false);
  const [cropperImageSrc, setCropperImageSrc] = useState<string | null>(null);
  const [cropperTarget, setCropperTarget] = useState<'banner' | 'custom'>('banner');
  const [wallpaperAccent, setLocalWallpaperAccent] = useState<string>(() => {
    try {
      return localStorage.getItem('tata_wallpaper_accent') || 'blue';
    } catch (e) {
      return 'blue';
    }
  });
  const [wallpaperDim, setLocalWallpaperDim] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('tata_wallpaper_dim') || '35', 10);
    } catch (e) {
      return 35;
    }
  });
  const [wallpaperBlur, setLocalWallpaperBlur] = useState<number>(() => {
    try {
      return parseInt(localStorage.getItem('tata_wallpaper_blur') || '0', 10);
    } catch (e) {
      return 0;
    }
  });
  const [wallpaperFit, setLocalWallpaperFit] = useState<'cover' | 'contain'>(() => {
    try {
      return (localStorage.getItem('tata_wallpaper_fit') as 'cover' | 'contain') || 'cover';
    } catch (e) {
      return 'cover';
    }
  });
  const [localWallpaperPosition, setLocalWallpaperPosition] = useState<'center' | 'top' | 'bottom'>(() => {
    try {
      return (localStorage.getItem('tata_wallpaper_position') as 'center' | 'top' | 'bottom') || 'center';
    } catch (e) {
      return 'center';
    }
  });
  const [themeTab, setThemeTab] = useState<'colors' | 'wallpaper' | 'banner'>(() => {
    return appTheme === 'wallpaper' ? 'wallpaper' : 'colors';
  });

  const handleSetWallpaperPosition = (pos: 'center' | 'top' | 'bottom') => {
    setLocalWallpaperPosition(pos);
    try {
      localStorage.setItem('tata_wallpaper_position', pos);
    } catch (e) {}
    window.dispatchEvent(new Event('tata_wallpaper_settings_changed'));
    showNotificationToast(
      pos === 'center'
        ? (lang === 'id' ? 'Posisi: Fokus Tengah' : 'Position: Center Focus')
        : pos === 'top'
        ? (lang === 'id' ? 'Posisi: Fokus Atas' : 'Position: Top Focus')
        : (lang === 'id' ? 'Posisi: Fokus Bawah' : 'Position: Bottom Focus')
    );
  };

  const handleSetWallpaperAccent = (accent: string) => {
    setLocalWallpaperAccent(accent);
    try {
      localStorage.setItem('tata_wallpaper_accent', accent);
    } catch (e) {}
    window.dispatchEvent(new Event('tata_wallpaper_accent_changed'));
    showNotificationToast(lang === 'id' ? 'Warna aksen tema kustom diperbarui!' : 'Custom theme accent color updated!');
  };

  const handleSetWallpaperFit = (fit: 'cover' | 'contain') => {
    setLocalWallpaperFit(fit);
    try {
      localStorage.setItem('tata_wallpaper_fit', fit);
    } catch (e) {}
    window.dispatchEvent(new Event('tata_wallpaper_settings_changed'));
    showNotificationToast(
      fit === 'cover'
        ? (lang === 'id' ? 'Kerapian: Isi Penuh Layar' : 'Fit: Cover Screen')
        : (lang === 'id' ? 'Kerapian: Tampil Utuh 100%' : 'Fit: Show Full Photo')
    );
  };

  const handleSetWallpaperDim = (dim: number) => {
    setLocalWallpaperDim(dim);
    try {
      localStorage.setItem('tata_wallpaper_dim', dim.toString());
    } catch (e) {}
    window.dispatchEvent(new Event('tata_wallpaper_settings_changed'));
  };

  const handleSetWallpaperBlur = (blur: number) => {
    setLocalWallpaperBlur(blur);
    try {
      localStorage.setItem('tata_wallpaper_blur', blur.toString());
    } catch (e) {}
    window.dispatchEvent(new Event('tata_wallpaper_settings_changed'));
  };

  const handleSelectPresetWallpaper = async (preset: WallpaperPreset) => {
    await setLargeItem('tata_custom_wallpaper', preset.dataUrl);
    setLocalCustomWallpaper(preset.dataUrl);
    if (appTheme !== 'wallpaper') {
      setAppTheme('wallpaper');
      try {
        localStorage.setItem('tata_theme', 'wallpaper');
      } catch (e) {}
    }
    window.dispatchEvent(new Event('tata_wallpaper_changed'));
    showNotificationToast(lang === 'id' ? `Wallpaper "${preset.nameId}" diterapkan!` : `Wallpaper "${preset.nameEn}" applied!`);
  };

  // Auto-backup configuration & enhanced modal states
  const [backupModalMode, setBackupModalMode] = useState<'export' | 'import' | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [showBackupPassword, setShowBackupPassword] = useState(false);
  const [backupFileContent, setBackupFileContent] = useState<string | null>(null);
  const [backupFileName, setBackupFileName] = useState('');
  const [backupFileSize, setBackupFileSize] = useState<number>(0);
  const [backupErrorMessage, setBackupErrorMessage] = useState<string | null>(null);
  const [isProcessingBackup, setIsProcessingBackup] = useState(false);
  const [restoreStrategy, setRestoreStrategy] = useState<'replace' | 'merge'>('replace');
  const [exportCustomFilename, setExportCustomFilename] = useState('');
  const [isDragOverImport, setIsDragOverImport] = useState(false);
  const [backupError, setBackupError] = useState(false);
  const [importPreview, setImportPreview] = useState<{
    isEncrypted: boolean;
    isNoto: boolean;
    passwordMatches?: boolean;
    notesCount: number;
    tasksCount: number;
    discMediaCount: number;
    txCount: number;
    moodsCount: number;
    debtsCount: number;
    savingsGoalsCount: number;
    hasUser: boolean;
    hasWallpaper: boolean;
    hasSettings: boolean;
    streak?: number;
    journeyDays?: number;
    userProfileIncluded?: boolean;
    version: string;
  } | null>(null);

  useEffect(() => {
    if (backupModalMode !== 'import' || !backupFileContent) {
      setImportPreview(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        const parsed = JSON.parse(backupFileContent);
        if (parsed.v && parsed.s && parsed.d) {
          // Encrypted backup
          if (backupPassword.trim()) {
            try {
              const decrypted = await decryptData(backupFileContent, backupPassword.trim());
              if (!isMounted) return;
              const data = JSON.parse(decrypted);
              const normalized = normalizeBackupData(data);
              const isNoto = Boolean(data.noto_notes || data.noto_tasks || data.noto_transactions || data.noto_theme || (data.appName && data.appName.toLowerCase().includes('noto')) || (data.version && parseFloat(data.version) < 4.0));
              setBackupErrorMessage(null);
              const strk = typeof normalized?.streak === 'number' ? normalized.streak : 0;
              const jDays = normalized?.journeyStartDate ? calculateJourneyDay(normalized.journeyStartDate) : 1;
              const profInc = normalized?.userProfileIncluded !== undefined ? normalized.userProfileIncluded : (Boolean(normalized?.user) || normalized?.streak !== undefined);
              setImportPreview({
                isEncrypted: true,
                isNoto,
                passwordMatches: true,
                notesCount: normalized?.notes?.length || 0,
                tasksCount: normalized?.tasks?.length || 0,
                discMediaCount: normalized?.disciplineMediaMap ? Object.keys(normalized.disciplineMediaMap).length : 0,
                txCount: normalized?.transactions?.length || 0,
                moodsCount: normalized?.moods?.length || 0,
                debtsCount: normalized?.debts?.length || 0,
                savingsGoalsCount: normalized?.savingsGoals?.length || 0,
                hasUser: Boolean(normalized?.user),
                hasWallpaper: Boolean(normalized?.customWallpaper || normalized?.bannerWallpaper),
                hasSettings: Boolean(normalized?.appPin || normalized?.appTheme || normalized?.lang),
                streak: strk,
                journeyDays: jDays,
                userProfileIncluded: profInc,
                version: data.version || (isNoto ? 'Noto Legacy' : '5.1')
              });
            } catch {
              if (!isMounted) return;
              setImportPreview({
                isEncrypted: true,
                isNoto: false,
                passwordMatches: false,
                notesCount: 0,
                tasksCount: 0,
                discMediaCount: 0,
                txCount: 0,
                moodsCount: 0,
                debtsCount: 0,
                savingsGoalsCount: 0,
                hasUser: false,
                hasWallpaper: false,
                hasSettings: false,
                version: 'Terenkripsi'
              });
            }
          } else {
            if (!isMounted) return;
            setImportPreview({
              isEncrypted: true,
              isNoto: false,
              passwordMatches: undefined,
              notesCount: 0,
              tasksCount: 0,
              discMediaCount: 0,
              txCount: 0,
              moodsCount: 0,
              debtsCount: 0,
              savingsGoalsCount: 0,
              hasUser: false,
              hasWallpaper: false,
              hasSettings: false,
              version: 'Terenkripsi'
            });
          }
        } else {
          // Plaintext JSON
          const normalized = normalizeBackupData(parsed);
          const isNoto = Boolean(parsed.noto_notes || parsed.noto_tasks || parsed.noto_transactions || parsed.noto_theme || (parsed.appName && parsed.appName.toLowerCase().includes('noto')) || (parsed.version && parseFloat(parsed.version) < 4.0));
          if (!isMounted) return;
          setBackupErrorMessage(null);
          const strk = typeof normalized?.streak === 'number' ? normalized.streak : 0;
          const jDays = normalized?.journeyStartDate ? calculateJourneyDay(normalized.journeyStartDate) : 1;
          const profInc = normalized?.userProfileIncluded !== undefined ? normalized.userProfileIncluded : (Boolean(normalized?.user) || normalized?.streak !== undefined);
          setImportPreview({
            isEncrypted: false,
            isNoto,
            passwordMatches: true,
            notesCount: normalized?.notes?.length || 0,
            tasksCount: normalized?.tasks?.length || 0,
            discMediaCount: normalized?.disciplineMediaMap ? Object.keys(normalized.disciplineMediaMap).length : 0,
            txCount: normalized?.transactions?.length || 0,
            moodsCount: normalized?.moods?.length || 0,
            debtsCount: normalized?.debts?.length || 0,
            savingsGoalsCount: normalized?.savingsGoals?.length || 0,
            hasUser: Boolean(normalized?.user),
            hasWallpaper: Boolean(normalized?.customWallpaper || normalized?.bannerWallpaper),
            hasSettings: Boolean(normalized?.appPin || normalized?.appTheme || normalized?.lang),
            streak: strk,
            journeyDays: jDays,
            userProfileIncluded: profInc,
            version: parsed.version || (isNoto ? 'Noto Legacy' : '5.1')
          });
        }
      } catch {
        if (!isMounted) return;
        setBackupErrorMessage(lang === 'id' ? 'File bukan format JSON cadangan yang valid.' : 'File is not a valid backup JSON format.');
        setImportPreview(null);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [backupModalMode, backupFileContent, backupPassword, lang]);

  const [exportOptions, setExportOptions] = useState({
    notes: true,
    tasks: true,
    transactions: true,
    moods: true,
    userProfile: true,
    settings: true,
  });

  const [pendingAutoBackupFreq, setPendingAutoBackupFreq] = useState<'off' | '3_days' | '1_week' | '1_month' | null>(null);
  const [showAutoBackupEnableVerify, setShowAutoBackupEnableVerify] = useState(false);
  const [autoBackupEnableVerifyPin, setAutoBackupEnableVerifyPin] = useState('');
  const [autoBackupEnableVerifyError, setAutoBackupEnableVerifyError] = useState(false);

  const [showAutoBackupPinSetup, setShowAutoBackupPinSetup] = useState(false);
  const [autoBackupPinSetupPin, setAutoBackupPinSetupPin] = useState('');
  const [autoBackupPinSetupConfirm, setAutoBackupPinSetupConfirm] = useState('');
  const [autoBackupPinSetupStep, setAutoBackupPinSetupStep] = useState<1 | 2>(1);
  const [autoBackupPinSetupError, setAutoBackupPinSetupError] = useState(false);

  const [showAutoBackupPinChange, setShowAutoBackupPinChange] = useState(false);
  const [autoBackupPinChangeCurrent, setAutoBackupPinChangeCurrent] = useState('');
  const [autoBackupPinChangeNew, setAutoBackupPinChangeNew] = useState('');
  const [autoBackupPinChangeConfirm, setAutoBackupPinChangeConfirm] = useState('');
  const [autoBackupPinChangeStep, setAutoBackupPinChangeStep] = useState<1 | 2 | 3>(1);
  const [autoBackupPinChangeError, setAutoBackupPinChangeError] = useState(false);
  const [autoBackupPinChangeErrorType, setAutoBackupPinChangeErrorType] = useState<'wrong_current' | 'mismatch' | null>(null);

  const [showAutoBackupPinDisableModal, setShowAutoBackupPinDisableModal] = useState(false);
  const [autoBackupDisablePin, setAutoBackupDisablePin] = useState('');
  const [autoBackupDisableError, setAutoBackupDisableError] = useState(false);

  const [showPinHistoryDropdown, setShowPinHistoryDropdown] = useState(false);
  const [showAutoBackupPinHistoryDropdown, setShowAutoBackupPinHistoryDropdown] = useState(false);
  const [testNotifMsg, setTestNotifMsg] = useState<string | null>(null);

  // PWA Install state & detection
  const [isPwaInstalled, setIsPwaInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  });
  const [pwaPrompt, setPwaPrompt] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      return (window as any).__tata_pwa_prompt || null;
    }
    return null;
  });

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setPwaPrompt(e);
      (window as any).__tata_pwa_prompt = e;
    };
    const handlePromptReady = () => {
      if ((window as any).__tata_pwa_prompt) {
        setPwaPrompt((window as any).__tata_pwa_prompt);
      }
    };
    const handleAppInstalled = () => {
      setIsPwaInstalled(true);
      setPwaPrompt(null);
      (window as any).__tata_pwa_prompt = null;
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('tata_pwa_prompt_ready', handlePromptReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('tata_pwa_installed', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('tata_pwa_prompt_ready', handlePromptReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('tata_pwa_installed', handleAppInstalled);
    };
  }, []);

  // Notification Permission State
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // BYOK Gemini API Key settings state
  const [testApiKey, setTestApiKey] = useState(geminiApiKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>(geminiApiKey ? 'connected' : 'idle');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [aiProvider, setAiProvider] = useState<string | null>(null);
  const [aiModel, setAiModel] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    setTestApiKey(geminiApiKey || '');
    setConnectionStatus(geminiApiKey ? 'connected' : 'idle');
  }, [geminiApiKey]);

  // Refs for focusing inputs
  const enableVerifyInputRef = React.useRef<HTMLInputElement | null>(null);
  const pinSetupInputRef = React.useRef<HTMLInputElement | null>(null);
  const pinChangeInputRef = React.useRef<HTMLInputElement | null>(null);

  // Auto-focus verify modal input
  useEffect(() => {
    if (showAutoBackupEnableVerify) {
      setTimeout(() => enableVerifyInputRef.current?.focus(), 100);
    }
  }, [showAutoBackupEnableVerify]);

  // Auto-focus setup modal input
  useEffect(() => {
    if (showAutoBackupPinSetup) {
      setTimeout(() => pinSetupInputRef.current?.focus(), 100);
    }
  }, [showAutoBackupPinSetup, autoBackupPinSetupStep]);

  // Auto-focus change modal input
  useEffect(() => {
    if (showAutoBackupPinChange) {
      setTimeout(() => pinChangeInputRef.current?.focus(), 100);
    }
  }, [showAutoBackupPinChange, autoBackupPinChangeStep]);

  // Sync recovery question/answer pre-filling when creating or changing app PIN
  useEffect(() => {
    if (pinModalMode === 'create' || pinModalMode === 'change') {
      setPinQuestionInput(pinRecoveryQuestion || '');
      setPinAnswerInput('');
    }
  }, [pinModalMode, pinRecoveryQuestion, pinRecoveryAnswer]);

  // Initialize and load custom wallpapers
  useEffect(() => {
    const loadWallpapers = () => {
      getLargeItem('tata_custom_wallpaper').then(setLocalCustomWallpaper);
      getLargeItem('tata_banner_wallpaper').then(setLocalBannerWallpaper);
    };

    loadWallpapers();
    window.addEventListener('tata_wallpaper_changed', loadWallpapers);
    window.addEventListener('tata_banner_wallpaper_changed', loadWallpapers);

    return () => {
      window.removeEventListener('tata_wallpaper_changed', loadWallpapers);
      window.removeEventListener('tata_banner_wallpaper_changed', loadWallpapers);
    };
  }, []);

  // Wallpaper Upload triggers & Cropper handler
  const handleWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // Directly apply photo as high quality wallpaper without forced auto-cropping
      await setLargeItem('tata_custom_wallpaper', dataUrl);
      setLocalCustomWallpaper(dataUrl);
      if (appTheme !== 'wallpaper') {
        setAppTheme('wallpaper');
        try {
          localStorage.setItem('tata_theme', 'wallpaper');
        } catch (err) {}
      }
      window.dispatchEvent(new Event('tata_wallpaper_changed'));
      showNotificationToast(
        lang === 'id' 
          ? 'Foto berhasil dipasang sebagai wallpaper! Ketuk "Atur Posisi & Potong" jika ingin menyesuaikan.' 
          : 'Photo applied as wallpaper! Tap "Adjust Frame & Crop" to adjust.'
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleBannerWallpaperUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      // Directly apply banner photo without forced auto-cropping
      await setLargeItem('tata_banner_wallpaper', dataUrl);
      setLocalBannerWallpaper(dataUrl);
      window.dispatchEvent(new Event('tata_banner_wallpaper_changed'));
      showNotificationToast(
        lang === 'id' 
          ? 'Foto banner beranda berhasil dipasang!' 
          : 'Home banner photo applied!'
      );
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropSave = (croppedDataUrl: string) => {
    setCropperModalOpen(false);
    setCropperImageSrc(null);

    if (cropperTarget === 'banner') {
      setLargeItem('tata_banner_wallpaper', croppedDataUrl)
        .then(() => {
          setLocalBannerWallpaper(croppedDataUrl);
          window.dispatchEvent(new Event('tata_banner_wallpaper_changed'));
          showNotificationToast(lang === 'id' ? 'Wallpaper kotak utama berhasil dipotong & disimpan!' : 'Main wallpaper cropped & saved!');
        })
        .catch(() => {
          showNotificationToast(lang === 'id' ? 'Gagal menyimpan wallpaper!' : 'Failed to save wallpaper!');
        });
    } else {
      setLargeItem('tata_custom_wallpaper', croppedDataUrl)
        .then(() => {
          setLocalCustomWallpaper(croppedDataUrl);
          window.dispatchEvent(new Event('tata_wallpaper_changed'));
          if (appTheme !== 'wallpaper') {
            setAppTheme('wallpaper');
          }
          showNotificationToast(lang === 'id' ? 'Wallpaper halaman berhasil dipasang!' : 'Page wallpaper applied!');
        })
        .catch(() => {
          showNotificationToast(lang === 'id' ? 'Gagal menyimpan wallpaper!' : 'Failed to save wallpaper!');
        });
    }
  };

  const showNotificationToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Notification Test helper
  const triggerTestNotif = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      setTestNotifMsg(lang === 'id' ? 'Browser Anda tidak mendukung Notifikasi.' : 'Your browser does not support Notifications.');
      setTimeout(() => setTestNotifMsg(null), 5000);
      return;
    }

    try {
      let perm: NotificationPermission;
      if (typeof Notification.requestPermission === 'function') {
        perm = await Notification.requestPermission();
      } else {
        perm = await new Promise((resolve) => (Notification as any).requestPermission(resolve));
      }
      setNotifPermission(perm);

      if (perm === 'granted') {
        const title = t('notifTitleTest') || 'Uji Coba Notifikasi Tata!';
        const body = t('notifBodyTest') || 'Hebat! Notifikasi dari aplikasi Tata berfungsi dengan benar 100%.';
        const options = {
          body: body,
          icon: '/icon.png',
          badge: '/icon.png',
          vibrate: [200, 100, 200],
          tag: 'tata-test-notif'
        };
        
        let sent = false;
        if ('serviceWorker' in navigator) {
          try {
            const reg = await navigator.serviceWorker.ready;
            await reg.showNotification(title, options);
            sent = true;
          } catch (e) {
            console.warn("ServiceWorker showNotification failed:", e);
          }
        }

        if (!sent) {
          try {
            new window.Notification(title, options);
            sent = true;
          } catch (e) {
            console.warn("Notification construction failed:", e);
          }
        }

        setTestNotifMsg(
          lang === 'id'
            ? 'Uji coba sukses! Notifikasi dikirim. (Jika tidak muncul di layar, periksa mode Jangan Ganggu / Silent OS Anda)'
            : 'Test successful! Notification sent. (If not visible, check OS Do Not Disturb settings)'
        );
      } else if (perm === 'denied') {
        setTestNotifMsg(
          lang === 'id'
            ? 'Izin notifikasi ditolak / diblokir oleh browser. Buka Setelan Situs di browser Anda untuk mengizinkan notifikasi.'
            : 'Notification permission denied by browser. Open Site Settings in your browser to allow notifications.'
        );
      } else {
        setTestNotifMsg(
          lang === 'id'
            ? 'Harap konfirmasi izin notifikasi pada pop-up dialog browser Anda.'
            : 'Please confirm the notification permission dialog in your browser.'
        );
      }
    } catch (err) {
      console.error("Notification permission error:", err);
      setTestNotifMsg(lang === 'id' ? 'Gagal meminta izin notifikasi.' : 'Failed to request notification permission.');
    }
    setTimeout(() => setTestNotifMsg(null), 7000);
  };

  // Background Notification Test Helper (5s Delay)
  const triggerBgTestNotif = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setNotifPermission('unsupported');
      setTestNotifMsg(lang === 'id' ? 'Browser Anda tidak mendukung Notifikasi.' : 'Your browser does not support Notifications.');
      setTimeout(() => setTestNotifMsg(null), 5000);
      return;
    }

    try {
      let perm: NotificationPermission = Notification.permission;
      if (perm !== 'granted') {
        if (typeof Notification.requestPermission === 'function') {
          perm = await Notification.requestPermission();
        } else {
          perm = await new Promise((resolve) => (Notification as any).requestPermission(resolve));
        }
        setNotifPermission(perm);
      }

      if (perm !== 'granted') {
        setTestNotifMsg(
          lang === 'id'
            ? 'Izin notifikasi belum diaktifkan. Buka Setelan Browser dan izinkan notifikasi untuk Tata.'
            : 'Notification permission denied. Allow notifications in browser settings.'
        );
        setTimeout(() => setTestNotifMsg(null), 5000);
        return;
      }

      // Schedule in Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.ready;
          const sw = reg.active || navigator.serviceWorker.controller;
          if (sw) {
            sw.postMessage({
              type: 'SCHEDULE_TEST_NOTIFICATION',
              delay: 5000,
              title: lang === 'id' ? 'Tata PWA: Pengingat Latar Belakang' : 'Tata PWA: Background Reminder',
              body: lang === 'id'
                ? 'Hebat! Sistem notifikasi mandiri PWA Tata berhasil berjalan tanpa server cloud.'
                : 'Great! Tata PWA background notification system succeeded offline without cloud servers.'
            });
          }
        } catch (e) {}
      }

      // Fallback timer if SW message is not picked up
      setTimeout(async () => {
        try {
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.ready;
            const bgOptions: any = {
              body: lang === 'id'
                ? 'Hebat! Sistem notifikasi mandiri PWA Tata berhasil berjalan tanpa server cloud.'
                : 'Great! Tata PWA background notification system succeeded offline without cloud servers.',
              icon: '/icon.png',
              badge: '/icon.png',
              vibrate: [300, 100, 300, 100, 300],
              tag: 'tata-bg-test-notif'
            };
            reg.showNotification(
              lang === 'id' ? 'Tata PWA: Pengingat Latar Belakang' : 'Tata PWA: Background Reminder',
              bgOptions
            );
          } else {
            const fallbackOptions: any = {
              body: lang === 'id'
                ? 'Hebat! Sistem notifikasi mandiri PWA Tata berhasil berjalan tanpa server cloud.'
                : 'Great! Tata PWA background notification system succeeded offline without cloud servers.',
              icon: '/icon.png'
            };
            new window.Notification(
              lang === 'id' ? 'Tata PWA: Pengingat Latar Belakang' : 'Tata PWA: Background Reminder',
              fallbackOptions
            );
          }
        } catch (e) {}
      }, 5000);

      setTestNotifMsg(
        lang === 'id'
          ? 'Uji latar belakang dimulai! Segera kunci layar HP atau keluar dari aplikasi Tata dalam 5 detik untuk melihat notifikasi sistem.'
          : 'Background test started! Lock your phone or leave app now; notification will arrive in 5 seconds.'
      );
      setTimeout(() => setTestNotifMsg(null), 9000);
    } catch (err) {
      console.error('BG Notif test error:', err);
      setTestNotifMsg(lang === 'id' ? 'Gagal menjadwalkan notifikasi latar belakang.' : 'Failed to schedule background notification.');
      setTimeout(() => setTestNotifMsg(null), 5000);
    }
  };

  // PWA Install helper
  const handleInstallPwa = async () => {
    const prompt = pwaPrompt || (window as any).__tata_pwa_prompt;
    if (prompt) {
      try {
        prompt.prompt();
        const choice = await prompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          setIsPwaInstalled(true);
          setPwaPrompt(null);
          (window as any).__tata_pwa_prompt = null;
          showNotificationToast(lang === 'id' ? 'Aplikasi Tata berhasil dipasang!' : 'Tata App installed successfully!');
        }
      } catch (e) {
        console.error("PWA prompt error:", e);
      }
    } else {
      const isIos = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIos) {
        alert(
          lang === 'id' 
            ? 'Cara Memasang Tata di iOS (Safari):\n1. Ketuk tombol Bagikan (Share) di bagian bawah browser Safari.\n2. Gulir ke bawah dan pilih "Tambahkan ke Layar Utama" (Add to Home Screen).'
            : 'How to Install Tata on iOS (Safari):\n1. Tap the Share button at the bottom of Safari.\n2. Scroll down and select "Add to Home Screen".'
        );
      } else {
        alert(
          lang === 'id'
            ? 'Cara Memasang Tata di Android/Desktop:\n1. Buka menu titik tiga (⋮) di pojok kanan atas browser Anda.\n2. Pilih "Tambahkan ke Layar Utama" atau "Install Aplikasi".'
            : 'How to Install Tata on Android/Desktop:\n1. Open browser menu (⋮) at top-right.\n2. Select "Add to Home Screen" or "Install App".'
        );
      }
    }
  };

  // Setel ulang registrasi PWA & periksa pembaruan
  const handleForceResetPwa = async () => {
    const confirmReset = window.confirm(
      lang === 'id'
        ? 'Segarkan Cache & Periksa Pembaruan:\nIni akan membersihkan cache browser dan memeriksa pembaruan Tata terbaru dari server.\n\nCatatan, tugas, dan data lokal Anda 100% aman. Lanjutkan?'
        : 'Refresh Cache & Check Updates:\nThis will refresh browser cache and fetch latest Tata updates from server.\n\nYour notes, tasks, and local data remain 100% safe. Continue?'
    );
    if (!confirmReset) return;

    try {
      // 1. Clear runtime caches (preserve alarms if any)
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          if (!name.includes('alarm')) {
            await caches.delete(name);
          }
        }
      }

      // 2. Trigger active SW update check
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.update();
        }
      }
      
      // 3. Clear temporary session states
      sessionStorage.clear();

      showNotificationToast(
        lang === 'id' 
          ? 'Cache disetel ulang! Memuat pembaruan...' 
          : 'Cache refreshed! Loading updates...'
      );

      setTimeout(() => {
        if ((window as any).__tata_update_sw) {
          (window as any).__tata_update_sw(true);
        } else {
          window.location.reload();
        }
      }, 1000);
    } catch (e: any) {
      alert('Error during reset: ' + e.message);
    }
  };

  // Security PIN validation logic
  const handlePinSubmit = async () => {
    if (pinInput.length !== 4) return;
    if (pinModalMode === 'create' || pinModalMode === 'change') {
      if (!pinQuestionInput.trim() || !pinAnswerInput.trim()) {
        setPinError(true);
        setTimeout(() => setPinError(false), 500);
        return;
      }
      const hashed = await createPinHash(pinInput);
      await recordPinChange(hashed);
      setPinRecoveryQuestion(pinQuestionInput.trim());
      const hashedAnswer = await createPinHash(pinAnswerInput.trim().toLowerCase());
      setPinRecoveryAnswer(hashedAnswer);
      setIsUnlocked(true);
      setPinModalMode(null);
      setPinInput('');
      setPinQuestionInput('');
      setPinAnswerInput('');
      showNotificationToast(lang === 'id' ? 'PIN Keamanan berhasil dipasang!' : 'Security PIN successfully saved!');
    } else if (pinModalMode === 'verify') {
      const isValid = await verifyPin(pinInput, appPin || '');
      if (isValid || pinInput === appPin) {
        setPinInput('');
        setPinError(false);
        setPinModalMode('change');
      } else {
        setPinError(true);
        setPinInput('');
        setTimeout(() => setPinError(false), 500);
      }
    } else if (pinModalMode === 'remove') {
      const isValid = await verifyPin(pinInput, appPin || '');
      if (isValid || pinInput === appPin) {
        await recordPinChange(null);
        // Retain unified pinRecoveryQuestion & pinRecoveryAnswer so locked notes stay protected and recoverable
        setPinModalMode(null);
        setPinInput('');
        showNotificationToast(lang === 'id' ? 'PIN Keamanan berhasil dinonaktifkan.' : 'Security PIN disabled.');
      } else {
        setPinError(true);
        setPinInput('');
        setTimeout(() => setPinError(false), 500);
      }
    }
  };

  const handleForgotNotePinInSettings = async () => {
    if (!pinRecoveryAnswer || !forgotNoteAnswerInput.trim()) return;
    const isValid = await verifyPin(forgotNoteAnswerInput.trim().toLowerCase(), pinRecoveryAnswer || '');
    const isCorrect = isValid || forgotNoteAnswerInput.trim().toLowerCase() === (pinRecoveryAnswer || '').trim().toLowerCase();

    if (isCorrect) {
      if (pinRecoveryAnswer && !pinRecoveryAnswer.startsWith('pbkdf2_v1.')) {
        const hashed = await createPinHash(forgotNoteAnswerInput.trim().toLowerCase());
        setPinRecoveryAnswer(hashed);
      }
      setShowForgotNotePinModal(false);
      setForgotNoteAnswerInput('');
      setForgotNoteAnswerError(false);

      if (notePinModalMode === 'remove') {
        setNotePin(null);
        setNotePinModalMode(null);
        setNotePinInput('');
        showNotificationToast(lang === 'id' ? 'Jawaban terverifikasi! PIN khusus catatan berhasil dihapus.' : 'Verified! Dedicated Note PIN removed.');
      } else {
        setNotePinModalMode('change');
        setNotePinInput('');
        showNotificationToast(lang === 'id' ? 'Jawaban terverifikasi! Silakan masukkan 4 digit PIN baru.' : 'Verified! Please enter new 4-digit PIN.');
      }
    } else {
      setForgotNoteAnswerError(true);
      setTimeout(() => setForgotNoteAnswerError(false), 600);
    }
  };

  const handleNotePinSubmit = async () => {
    if (notePinInput.length !== 4) return;

    if (notePinModalMode === 'create' || notePinModalMode === 'change') {
      const hashed = await createPinHash(notePinInput);
      setNotePin(hashed);
      setNotePinModalMode(null);
      setNotePinInput('');
      showNotificationToast(lang === 'id' ? 'PIN khusus catatan berhasil disimpan!' : 'Dedicated Note PIN saved!');
    } else if (notePinModalMode === 'verify') {
      const isValid = await verifyPin(notePinInput, notePin || '');
      if (isValid || notePinInput === notePin) {
        setNotePinInput('');
        setNotePinError(false);
        setNotePinModalMode('change');
      } else {
        setNotePinError(true);
        setNotePinInput('');
        setTimeout(() => setNotePinError(false), 500);
      }
    } else if (notePinModalMode === 'remove') {
      const isValid = await verifyPin(notePinInput, notePin || '');
      if (isValid || notePinInput === notePin) {
        setNotePin(null);
        setNotePinModalMode(null);
        setNotePinInput('');
        showNotificationToast(lang === 'id' ? 'PIN khusus catatan dihapus. Catatan akan menggunakan PIN Layar.' : 'Dedicated Note PIN removed. Notes will fallback to App PIN.');
      } else {
        setNotePinError(true);
        setNotePinInput('');
        setTimeout(() => setNotePinError(false), 500);
      }
    }
  };

  // Auto-backup verification and pin submits
  const handleAutoBackupVerifySubmit = async () => {
    if (autoBackupEnableVerifyPin.length !== 4) return;
    const isValid = await verifyPin(autoBackupEnableVerifyPin, storeAutoBackupPin || '');
    if (isValid || autoBackupEnableVerifyPin === storeAutoBackupPin) {
      if (pendingAutoBackupFreq) {
        setAutoBackupFrequency(pendingAutoBackupFreq);
        showNotificationToast(lang === 'id' ? 'Pencadangan otomatis diaktifkan!' : 'Auto-backup enabled!');
      }
      setShowAutoBackupEnableVerify(false);
      setAutoBackupEnableVerifyPin('');
      setPendingAutoBackupFreq(null);
    } else {
      setAutoBackupEnableVerifyError(true);
      setAutoBackupEnableVerifyPin('');
      setTimeout(() => setAutoBackupEnableVerifyError(false), 2000);
    }
  };

  const handleAutoBackupPinSetupSubmit = async () => {
    if (autoBackupPinSetupStep === 1) {
      if (autoBackupPinSetupPin.length === 4) {
        setAutoBackupPinSetupStep(2);
      }
    } else {
      if (autoBackupPinSetupPin === autoBackupPinSetupConfirm) {
        const hashed = await createPinHash(autoBackupPinSetupPin);
        await recordAutoBackupPinChange(hashed);
        
        if (pendingAutoBackupFreq) {
          setAutoBackupFrequency(pendingAutoBackupFreq);
          showNotificationToast(lang === 'id' ? 'PIN dibuat & Pencadangan diaktifkan!' : 'PIN saved & Auto-backup enabled!');
        }
        setShowAutoBackupPinSetup(false);
        setAutoBackupPinSetupPin('');
        setAutoBackupPinSetupConfirm('');
        setAutoBackupPinSetupStep(1);
        setPendingAutoBackupFreq(null);
      } else {
        setAutoBackupPinSetupError(true);
        setAutoBackupPinSetupConfirm('');
        setTimeout(() => setAutoBackupPinSetupError(false), 2000);
      }
    }
  };

  const handleAutoBackupPinChangeSubmit = async () => {
    if (autoBackupPinChangeStep === 1) {
      const isValid = await verifyPin(autoBackupPinChangeCurrent, storeAutoBackupPin || '');
      if (isValid || autoBackupPinChangeCurrent === storeAutoBackupPin) {
        setAutoBackupPinChangeStep(2);
        setAutoBackupPinChangeError(false);
      } else {
        setAutoBackupPinChangeError(true);
        setAutoBackupPinChangeErrorType('wrong_current');
        setAutoBackupPinChangeCurrent('');
        setTimeout(() => setAutoBackupPinChangeError(false), 2000);
      }
    } else if (autoBackupPinChangeStep === 2) {
      if (autoBackupPinChangeNew.length === 4) {
        setAutoBackupPinChangeStep(3);
      }
    } else {
      if (autoBackupPinChangeNew === autoBackupPinChangeConfirm) {
        const hashed = await createPinHash(autoBackupPinChangeNew);
        await recordAutoBackupPinChange(hashed);
        setShowAutoBackupPinChange(false);
        setAutoBackupPinChangeCurrent('');
        setAutoBackupPinChangeNew('');
        setAutoBackupPinChangeConfirm('');
        setAutoBackupPinChangeStep(1);
        showNotificationToast(lang === 'id' ? 'PIN cadangan diperbarui!' : 'Backup PIN updated!');
      } else {
        setAutoBackupPinChangeError(true);
        setAutoBackupPinChangeErrorType('mismatch');
        setAutoBackupPinChangeConfirm('');
        setTimeout(() => setAutoBackupPinChangeError(false), 2000);
      }
    }
  };

  const handleAutoBackupPinDisableSubmit = async () => {
    if (autoBackupDisablePin.length !== 4) return;
    const isValid = await verifyPin(autoBackupDisablePin, storeAutoBackupPin || '');
    if (isValid || autoBackupDisablePin === storeAutoBackupPin) {
      await recordAutoBackupPinChange(null);
      setShowAutoBackupPinDisableModal(false);
      setAutoBackupDisablePin('');
      showNotificationToast(lang === 'id' ? 'PIN Cadangan Otomatis berhasil dinonaktifkan.' : 'Auto-Backup PIN disabled.');
    } else {
      setAutoBackupDisableError(true);
      setAutoBackupDisablePin('');
      setTimeout(() => setAutoBackupDisableError(false), 2000);
    }
  };

  const handleAutoBackupPinForceReset = async () => {
    await recordAutoBackupPinChange(null);
    setShowAutoBackupPinDisableModal(false);
    setAutoBackupDisablePin('');
    showNotificationToast(lang === 'id' ? 'PIN Cadangan Otomatis berhasil di-reset.' : 'Auto-Backup PIN reset successfully.');
  };

  // Manual Backup trigger events
  const handleExportClick = () => {
    setBackupPassword('');
    setShowBackupPassword(false);
    setBackupErrorMessage(null);
    setExportCustomFilename(autoBackupFilenamePrefix || 'tata_cadangan');
    setBackupModalMode('export');
  };

  const handleFileSelect = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json' && file.type !== '') {
      setBackupErrorMessage(lang === 'id' ? 'Format file tidak didukung. Harap pilih file cadangan berformat .json' : 'Unsupported format. Please select a .json backup file.');
      return;
    }
    setBackupFileName(file.name);
    setBackupFileSize(file.size);
    setBackupPassword('');
    setShowBackupPassword(false);
    setBackupErrorMessage(null);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setBackupFileContent(e.target?.result as string);
      setBackupModalMode('import');
    };
    reader.onerror = () => {
      setBackupErrorMessage(lang === 'id' ? 'Gagal membaca isi file dari perangkat Anda.' : 'Failed reading file contents from your device.');
    };
    reader.readAsText(file);
  };

  const openFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    };
    input.click();
  };

  const handleImportClick = () => {
    setBackupPassword('');
    setShowBackupPassword(false);
    setBackupErrorMessage(null);
    setRestoreStrategy('replace');
    setBackupModalMode('import');
  };

  const processExport = async () => {
    setIsProcessingBackup(true);
    setBackupErrorMessage(null);
    try {
      const exportData = await createFullBackup(exportOptions);

      // Attach clear metadata
      exportData.appName = 'Tata';
      exportData.version = '5.1';
      exportData.exportedAt = new Date().toISOString();
      exportData.summary = {
        notesCount: exportData.notes?.length || 0,
        tasksCount: exportData.tasks?.length || 0,
        txCount: exportData.transactions?.length || 0,
        moodsCount: exportData.moods?.length || 0,
        hasDisciplineMedia: Boolean(exportData.disciplineMediaMap && Object.keys(exportData.disciplineMediaMap).length > 0)
      };

      const dataStr = JSON.stringify(exportData, null, 2);
      let finalContent = dataStr;
      
      if (backupPassword.trim()) {
        finalContent = await encryptData(dataStr, backupPassword.trim());
      }

      const blob = new Blob([finalContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const d = new Date();
      const timestamp = `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}_${d.getHours().toString().padStart(2,'0')}${d.getMinutes().toString().padStart(2,'0')}`;
      const prefix = (exportCustomFilename.trim() || autoBackupFilenamePrefix || 'tata_backup').replace(/[^a-z0-9_-]/gi, '_');
      const suffix = backupPassword.trim() ? '_encrypted' : '';
      a.download = `${prefix}_${timestamp}${suffix}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      playCelebrationSound();
      setBackupModalMode(null);
      showNotificationToast(lang === 'id' ? 'Ekspor data berhasil diunduh ke perangkat Anda!' : 'Data backup exported and downloaded successfully!');
    } catch (e: any) {
      console.error("Export error:", e);
      setBackupErrorMessage(lang === 'id' ? 'Gagal mengekspor data: ' + (e?.message || 'Kesalahan sistem') : 'Failed to export: ' + (e?.message || 'System error'));
    } finally {
      setIsProcessingBackup(false);
    }
  };

  const processImport = async () => {
    if (!backupFileContent) {
      setBackupErrorMessage(lang === 'id' ? 'Silakan pilih file cadangan terlebih dahulu.' : 'Please select a backup file first.');
      return;
    }

    setIsProcessingBackup(true);
    setBackupErrorMessage(null);

    try {
      let dataStr = backupFileContent;
      
      try {
        const parsed = JSON.parse(backupFileContent);
        if (parsed.v && parsed.s && parsed.d) {
          if (!backupPassword.trim()) {
            setBackupErrorMessage(lang === 'id' ? 'File ini terenkripsi. Silakan masukkan kata sandi di bawah.' : 'This file is encrypted. Please enter the password below.');
            setIsProcessingBackup(false);
            return;
          }
          try {
            dataStr = await decryptData(backupFileContent, backupPassword.trim());
          } catch {
            setBackupErrorMessage(lang === 'id' ? 'Kata sandi salah atau file cadangan rusak. Periksa kembali sandi Anda.' : 'Incorrect password or corrupted backup file. Please verify your password.');
            setIsProcessingBackup(false);
            return;
          }
        }
      } catch {
        setBackupErrorMessage(lang === 'id' ? 'Format file tidak valid. Pastikan memilih file .json yang sah.' : 'Invalid file format. Please select a valid .json backup file.');
        setIsProcessingBackup(false);
        return;
      }
      
      const rawData = JSON.parse(dataStr);
      const data = normalizeBackupData(rawData);

      if (!data) {
        setBackupErrorMessage(lang === 'id' ? 'File tidak memuat data yang dikenali oleh Tata.' : 'File does not contain recognized Tata data.');
        setIsProcessingBackup(false);
        return;
      }

      const hasAnyData = 
        (data.notes && data.notes.length > 0) || 
        (data.tasks && data.tasks.length > 0) || 
        (data.transactions && data.transactions.length > 0) || 
        (data.moods && data.moods.length > 0) || 
        (data.debts && data.debts.length > 0) || 
        (data.savingsGoals && data.savingsGoals.length > 0) ||
        data.user || 
        data.appPin || 
        data.customWallpaper || 
        data.bannerWallpaper || 
        rawData.version || 
        rawData.appName === 'Noto' || 
        rawData.appName === 'Tata';

      if (!hasAnyData) {
        setBackupErrorMessage(lang === 'id' ? 'File cadangan ini kosong.' : 'This backup file is empty.');
        setIsProcessingBackup(false);
        return;
      }

      let finalNotes = data.notes || [];
      let finalTasks = data.tasks || [];
      let finalTransactions = data.transactions || [];
      let finalMoods = data.moods || [];
      let finalDebts = data.debts || [];
      let finalSavingsGoals = data.savingsGoals || [];
      let finalDisciplineMedia = { ...(data.disciplineMediaMap || {}) };

      if (restoreStrategy === 'merge') {
        // Merge mode: retain existing records, append new ones with ID collision check
        const existingNoteIds = new Set(notes.map(n => n.id));
        const incomingNotes = finalNotes.map((n: any) => {
          if (existingNoteIds.has(n.id)) return { ...n, id: generateId() };
          return n;
        });
        finalNotes = [...notes, ...incomingNotes];

        const existingTaskIds = new Set(tasks.map(t => t.id));
        const incomingTasks = finalTasks.map((t: any) => {
          if (existingTaskIds.has(t.id)) {
            const oldId = t.id;
            const newId = generateId();
            const oldMediaKey = `tata_disc_media_${oldId}`;
            if (finalDisciplineMedia[oldMediaKey]) {
              finalDisciplineMedia[`tata_disc_media_${newId}`] = finalDisciplineMedia[oldMediaKey];
              delete finalDisciplineMedia[oldMediaKey];
            }
            return { ...t, id: newId };
          }
          return t;
        });
        finalTasks = [...tasks, ...incomingTasks];

        const existingTxIds = new Set(transactions.map(tx => tx.id));
        const incomingTx = finalTransactions.map((tx: any) => {
          if (existingTxIds.has(tx.id)) return { ...tx, id: generateId() };
          return tx;
        });
        finalTransactions = [...transactions, ...incomingTx];

        const existingMoodDates = new Set(moods.map(m => m.date));
        const incomingMoods = finalMoods.filter((m: any) => !existingMoodDates.has(m.date));
        finalMoods = [...moods, ...incomingMoods];

        const existingDebtIds = new Set(debts.map(d => d.id));
        const incomingDebts = finalDebts.map((d: any) => {
          if (existingDebtIds.has(d.id)) return { ...d, id: generateId() };
          return d;
        });
        finalDebts = [...debts, ...incomingDebts];

        const existingSgIds = new Set(savingsGoals.map(s => s.id));
        const incomingSg = finalSavingsGoals.map((s: any) => {
          if (existingSgIds.has(s.id)) return { ...s, id: generateId() };
          return s;
        });
        finalSavingsGoals = [...savingsGoals, ...incomingSg];
      }
      // Replace mode: keep normalized IDs intact to preserve disciplineMediaMap relationships

      await importFullBackup({
        ...data,
        notes: finalNotes,
        tasks: finalTasks,
        transactions: finalTransactions,
        moods: finalMoods,
        debts: finalDebts,
        savingsGoals: finalSavingsGoals,
        user: data.userProfileIncluded === false 
          ? { name: 'Pengguna Tata', email: '', bio: '', avatar: '' } 
          : (data.user || (restoreStrategy === 'replace' ? { name: 'Pengguna Tata', email: '', bio: '', avatar: '' } : user)),
        userAvatar: data.userProfileIncluded === false ? null : (data.userAvatar !== undefined ? data.userAvatar : (restoreStrategy === 'replace' ? null : undefined)),
        streak: data.userProfileIncluded === false ? 0 : (data.streak !== undefined ? data.streak : (restoreStrategy === 'replace' ? 0 : streak)),
        lastTaskCompleted: data.userProfileIncluded === false ? null : (data.lastTaskCompleted !== undefined ? data.lastTaskCompleted : (restoreStrategy === 'replace' ? null : undefined)),
        journeyStartDate: data.userProfileIncluded === false ? getTodayDateString() : (data.journeyStartDate !== undefined ? data.journeyStartDate : (restoreStrategy === 'replace' ? getTodayDateString() : journeyStartDate)),
        appPin: data.settingsIncluded === false ? null : (data.appPin !== undefined ? data.appPin : (restoreStrategy === 'replace' ? null : appPin)),
        notePin: data.settingsIncluded === false ? null : (data.notePin !== undefined ? data.notePin : (restoreStrategy === 'replace' ? null : notePin)),
        pinRecoveryQuestion: data.settingsIncluded === false ? '' : (data.pinRecoveryQuestion || (restoreStrategy === 'replace' ? '' : pinRecoveryQuestion)),
        pinRecoveryAnswer: data.settingsIncluded === false ? '' : (data.pinRecoveryAnswer || (restoreStrategy === 'replace' ? '' : pinRecoveryAnswer)),
        lang: data.lang || lang,
        isLiteMode: data.isLiteMode !== undefined ? data.isLiteMode : isLiteMode,
        autoBackupFrequency: data.autoBackupFrequency || autoBackupFrequency,
        autoBackupFilenamePrefix: data.autoBackupFilenamePrefix || autoBackupFilenamePrefix,
        autoBackupPin: data.settingsIncluded === false ? null : (data.autoBackupPin || (restoreStrategy === 'replace' ? null : storeAutoBackupPin)),
        autoBackupPinHistory: data.settingsIncluded === false ? [] : (data.autoBackupPinHistory || (restoreStrategy === 'replace' ? [] : autoBackupPinHistory)),
        disciplineMediaMap: finalDisciplineMedia
      });

      playCelebrationSound();
      setBackupModalMode(null);
      showNotificationToast(
        lang === 'id' 
          ? `Pemulihan berhasil (${finalNotes.length} catatan, ${finalTasks.length} tugas)! Memuat ulang...` 
          : `Restore successful (${finalNotes.length} notes, ${finalTasks.length} tasks)! Reloading...`
      );
      setTimeout(() => window.location.reload(), 1200);
    } catch(err: any) {
      console.error("Import error:", err);
      setBackupErrorMessage(
        lang === 'id' 
          ? 'Gagal memulihkan data: ' + (err?.message || 'Format tidak didukung.') 
          : 'Failed to restore: ' + (err?.message || 'Unsupported format.')
      );
    } finally {
      setIsProcessingBackup(false);
    }
  };

  const handleFrequencySelect = (freq: 'off' | '3_days' | '1_week' | '1_month') => {
    if (freq === 'off') {
      setAutoBackupFrequency('off');
      showNotificationToast(lang === 'id' ? 'Pencadangan otomatis dinonaktifkan.' : 'Auto-backup disabled.');
    } else {
      setPendingAutoBackupFreq(freq);
      if (!storeAutoBackupPin) {
        setAutoBackupPinSetupStep(1);
        setAutoBackupPinSetupPin('');
        setAutoBackupPinSetupConfirm('');
        setShowAutoBackupPinSetup(true);
      } else {
        setAutoBackupEnableVerifyPin('');
        setShowAutoBackupEnableVerify(true);
      }
    }
  };

  const renderAutoBackupSettings = () => {
    const frequencies = [
      { id: 'off', label: lang === 'id' ? 'Mati' : 'Off' },
      { id: '3_days', label: lang === 'id' ? '3 Hari' : '3 Days' },
      { id: '1_week', label: lang === 'id' ? '1 Mggu' : '1 Wk' },
      { id: '1_month', label: lang === 'id' ? '1 Bln' : '1 Mo' },
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {isOrganic ? (
            <Icon3DDatabase size={24} />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Database size={17} />
            </div>
          )}
          <div>
            <h4 className={`font-bold text-[14px] ${primaryTextThemeClass} block`}>
              {lang === 'id' ? 'Pencadangan Otomatis' : 'Auto Backup'}
            </h4>
            <span className="text-xs text-slate-400 block">
              {lang === 'id' 
                ? 'Unduh cadangan data terenkripsi secara berkala ke penyimpanan lokal.' 
                : 'Automatically download encrypted backups to local storage.'}
            </span>
          </div>
        </div>

        {/* Frequency selector buttons */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {lang === 'id' ? 'Frekuensi Pencadangan' : 'Backup Frequency'}
          </label>
          <div className="grid grid-cols-4 gap-1.5 bg-slate-950/70 p-1 border border-slate-800 rounded-xl w-full">
            {frequencies.map((freq) => {
              const isSelected = autoBackupFrequency === freq.id;
              return (
                <button
                  key={freq.id}
                  type="button"
                  onClick={() => handleFrequencySelect(freq.id as any)}
                  className={`py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-emerald-500 text-zinc-950 font-black shadow-sm' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {freq.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Filename Prefix Input */}
        <div className="space-y-1.5 pt-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {lang === 'id' ? 'Nama Awalan File' : 'Filename Prefix'}
          </label>
          <input 
            type="text"
            value={autoBackupFilenamePrefix}
            onChange={(e) => setAutoBackupFilenamePrefix(e.target.value)}
            className={`w-full ${innerCardThemeClass} rounded-xl px-3.5 py-2.5 ${primaryTextThemeClass} text-xs outline-none focus:border-indigo-500/40 transition-colors placeholder-slate-600`}
            placeholder={lang === 'id' ? 'Contoh: tata_cadangan' : 'Example: tata_backup'}
          />
          {lastAutoBackupTimestamp > 0 && (
            <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {lang === 'id' 
                ? `Terakhir dicadangkan: ${new Date(lastAutoBackupTimestamp).toLocaleString('id-ID')}` 
                : `Last backup: ${new Date(lastAutoBackupTimestamp).toLocaleString()}`}
            </p>
          )}
        </div>

        {/* PIN Management for backup */}
        <div className="pt-3 border-t border-slate-800/60 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className={`text-xs font-bold ${primaryTextThemeClass} block`}>
                {lang === 'id' ? 'Proteksi PIN Cadangan' : 'Backup PIN Security'}
              </span>
              <span className="text-[11px] text-slate-400">
                {storeAutoBackupPin 
                  ? (lang === 'id' ? 'PIN aktif (Terenkripsi)' : 'PIN active (Encrypted)')
                  : (lang === 'id' ? 'Tidak ada PIN (Tanpa enkripsi)' : 'No PIN (Unencrypted)')}
              </span>
            </div>
            {storeAutoBackupPin ? (
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setAutoBackupPinChangeStep(1);
                    setAutoBackupPinChangeCurrent('');
                    setAutoBackupPinChangeNew('');
                    setAutoBackupPinChangeConfirm('');
                    setShowAutoBackupPinChange(true);
                  }}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  {lang === 'id' ? 'Ubah PIN' : 'Change PIN'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoBackupDisablePin('');
                    setAutoBackupDisableError(false);
                    setShowAutoBackupPinDisableModal(true);
                  }}
                  className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  {lang === 'id' ? 'Nonaktifkan' : 'Disable'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAutoBackupPinHistoryDropdown(!showAutoBackupPinHistoryDropdown)}
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  {showAutoBackupPinHistoryDropdown ? (lang === 'id' ? 'Tutup' : 'Hide') : (lang === 'id' ? 'Riwayat' : 'History')}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAutoBackupPinSetupStep(1);
                  setAutoBackupPinSetupPin('');
                  setAutoBackupPinSetupConfirm('');
                  setShowAutoBackupPinSetup(true);
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm"
              >
                {lang === 'id' ? 'Atur PIN Cadangan' : 'Set Backup PIN'}
              </button>
            )}
          </div>

          {/* Backup PIN History Dropdown */}
          {showAutoBackupPinHistoryDropdown && storeAutoBackupPin && (
            <div className={`p-3 ${innerCardThemeClass} rounded-xl space-y-1.5 animate-in fade-in duration-150 max-h-36 overflow-y-auto custom-scrollbar`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {lang === 'id' ? 'Riwayat PIN Cadangan' : 'Backup PIN Audit Log'}
              </span>
              {autoBackupPinHistory.length === 0 ? (
                <p className="text-[11px] text-slate-500 italic">
                  {lang === 'id' ? 'Tidak ada riwayat perubahan.' : 'No change history.'}
                </p>
              ) : (
                autoBackupPinHistory.map((entry, index) => (
                  <div key={index} className="flex items-center justify-between text-[11px] py-1 border-b border-slate-900 last:border-0">
                    <span className="font-mono text-slate-400">
                      PIN: {entry.hashedPin.substring(0, 8)}...
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {new Date(entry.startDate).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US')}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const palette = React.useMemo(() => getOrganicThemePalette(appTheme), [appTheme]);
  const isLight = !palette.isDark;

  const rootTextThemeClass = appTheme === 'wallpaper'
    ? 'text-white'
    : appTheme === 'organic'
      ? 'text-[#2B1E14]'
      : appTheme === 'cute'
        ? 'text-[#38230F]'
        : appTheme === 'pink'
          ? 'text-[#500724]'
          : appTheme === 'light'
            ? 'text-slate-900'
            : 'text-slate-200';

  const cardThemeClass = isLight
    ? (appTheme === 'organic' || appTheme === 'cute'
        ? 'bg-[#FAF5EA] border border-[#EADCC8] rounded-2xl shadow-xs'
        : appTheme === 'pink'
          ? 'bg-[#FFF0F5] border border-pink-200 rounded-2xl shadow-xs'
          : 'bg-white border border-slate-200 rounded-2xl shadow-xs')
    : 'bg-slate-900 border border-slate-800 rounded-2xl shadow-sm';

  const cardGroupThemeClass = isLight
    ? (appTheme === 'organic' || appTheme === 'cute'
        ? 'bg-[#FAF5EA] border border-[#EADCC8] rounded-2xl overflow-hidden divide-y divide-[#EADCC8]/80 shadow-xs'
        : appTheme === 'pink'
          ? 'bg-[#FFF0F5] border border-pink-200 rounded-2xl overflow-hidden divide-y divide-pink-200/80 shadow-xs'
          : 'bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-xs')
    : 'bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/60 shadow-sm';

  const innerCardThemeClass = isLight
    ? (appTheme === 'organic' || appTheme === 'cute'
        ? 'bg-[#F4ECDC] border border-[#EADCC8]'
        : appTheme === 'pink'
          ? 'bg-[#FCE7F3] border border-pink-200'
          : 'bg-slate-50 border border-slate-200')
    : 'bg-slate-950/70 border border-slate-800';

  const inputThemeClass = isLight
    ? (appTheme === 'organic' || appTheme === 'cute'
        ? 'bg-white/80 border border-[#EADCC8] text-[#38230F] placeholder-[#A89078]'
        : appTheme === 'pink'
          ? 'bg-white/80 border border-pink-200 text-[#500724] placeholder-pink-300'
          : 'bg-white border border-slate-200 text-slate-900 placeholder-slate-400')
    : 'bg-slate-950/70 border border-slate-800 text-slate-100 placeholder-slate-500';

  const subTextThemeClass = isLight
    ? (appTheme === 'organic' ? 'text-[#7D6A58]' : appTheme === 'cute' ? 'text-[#7A5B3E]' : appTheme === 'pink' ? 'text-[#9D3C65]' : 'text-slate-500')
    : 'text-slate-400';

  const primaryTextThemeClass = isLight
    ? (appTheme === 'organic' ? 'text-[#2B1E14]' : appTheme === 'cute' ? 'text-[#38230F]' : appTheme === 'pink' ? 'text-[#500724]' : 'text-slate-900')
    : 'text-slate-100';

  const borderThemeClass = isLight
    ? (appTheme === 'organic' || appTheme === 'cute' ? 'border-[#EADCC8]' : appTheme === 'pink' ? 'border-pink-200' : 'border-slate-200')
    : 'border-slate-800/80';

  const modalThemeClass = isLight
    ? (appTheme === 'organic' || appTheme === 'cute'
        ? 'bg-[#FAF5EA] border-[#EADCC8] text-[#2B1E14]'
        : appTheme === 'pink'
          ? 'bg-[#FFF0F5] border-pink-200 text-[#500724]'
          : 'bg-white border-slate-200 text-slate-900')
    : 'bg-slate-900 border-slate-800 text-slate-100';

  const modalHeaderThemeClass = isLight
    ? (appTheme === 'organic' || appTheme === 'cute'
        ? 'bg-[#F4ECDC] border-[#EADCC8]'
        : appTheme === 'pink'
          ? 'bg-[#FCE7F3] border-pink-200'
          : 'bg-slate-50 border-slate-200')
    : 'bg-slate-950/80 border-slate-800';

  const btnSecondaryThemeClass = isLight
    ? 'bg-black/5 hover:bg-black/10 border-slate-200 text-slate-700'
    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/60 text-slate-300';

  const cardProfileThemeClass = isLight
    ? (appTheme === 'organic' || appTheme === 'cute'
        ? 'p-4 bg-[#FAF5EA] hover:bg-[#F4ECDC] border border-[#EADCC8] rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-xs active:scale-[0.99]'
        : appTheme === 'pink'
          ? 'p-4 bg-[#FFF0F5] hover:bg-[#FCE7F3] border border-pink-200 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-xs active:scale-[0.99]'
          : 'p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-xs active:scale-[0.99]')
    : 'p-4 bg-slate-900/80 hover:bg-slate-850/90 border border-slate-800/80 hover:border-indigo-500/40 rounded-2xl cursor-pointer transition-all flex items-center justify-between group shadow-sm active:scale-[0.99]';

  const cardRowHoverClass = isLight
    ? 'hover:bg-black/5 active:bg-black/10'
    : 'hover:bg-slate-800/40 active:bg-slate-800/70';

  const cardRowTextClass = isLight
    ? (appTheme === 'organic' ? 'text-[#2B1E14]' : appTheme === 'cute' ? 'text-[#38230F]' : appTheme === 'pink' ? 'text-[#500724]' : 'text-slate-900')
    : 'text-slate-200';

  const cardRowSubtextClass = subTextThemeClass;

  const sectionHeaderClass = isLight
    ? (appTheme === 'organic' ? 'text-[#7D6A58]' : appTheme === 'cute' ? 'text-[#7A5B3E]' : appTheme === 'pink' ? 'text-[#9D3C65]' : 'text-slate-500')
    : 'text-slate-400';

  return (
    <div 
      className={`flex flex-col h-full font-sans transition-colors ${rootTextThemeClass}`}
    >
      {/* Reset progress overlay */}
      {isResetting && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
          <p className={`font-bold text-lg ${primaryTextThemeClass}`}>
            {lang === 'id' ? 'Mengatur Ulang Aplikasi...' : 'Resetting Application...'}
          </p>
          <p className="text-slate-400 text-xs mt-2">
            {lang === 'id' ? 'Mohon tunggu sebentar, halaman akan dimuat ulang.' : 'Please wait, the page will reload shortly.'}
          </p>
        </div>
      )}

      {/* Header bar */}
      <div className={`flex-none pt-[calc(env(safe-area-inset-top)+0.5rem)] pb-3 px-4 sm:px-6 flex items-center justify-between border-b transition-colors backdrop-blur-md z-20 shrink-0 shadow-sm ${
        appTheme === 'wallpaper'
          ? 'bg-slate-950/40 border-white/10 text-white backdrop-blur-xl'
          : appTheme === 'organic'
            ? 'bg-[#FAF5EA]/95 border-[#EADCC8] text-[#2B1E14]'
            : appTheme === 'light'
              ? 'bg-white/95 border-slate-200 text-slate-900'
              : appTheme === 'cute'
                ? 'bg-[#FAF5EA]/95 border-[#EADCC8] text-[#38230F]'
                : appTheme === 'pink'
                  ? 'bg-[#FFF0F5]/95 border-pink-200 text-[#500724]'
                  : appTheme === 'simple'
                    ? 'bg-[#161412]/95 border-[#26221C] text-stone-200'
                    : appTheme === 'cool'
                      ? 'bg-[#0A1329]/95 border-[#1E3A8A] text-slate-100'
                      : 'bg-slate-900/95 border-slate-800/80 text-slate-100'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <button 
            onClick={handleMainBack}
            className={`p-2 -ml-2 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0 ${
              (appTheme === 'light' || appTheme === 'organic' || appTheme === 'cute' || appTheme === 'pink')
                ? 'hover:bg-black/5 text-slate-700 hover:text-slate-900'
                : 'hover:bg-slate-800/60 text-slate-400 hover:text-slate-200'
            }`}
            title={lang === 'id' ? 'Kembali' : 'Back'}
          >
            <ChevronLeft size={20} />
          </button>
          <div className="flex flex-col justify-center min-w-0">
            <span className={`font-black text-lg sm:text-xl tracking-tight leading-tight truncate ${
              (appTheme === 'light' || appTheme === 'organic' || appTheme === 'cute' || appTheme === 'pink')
                ? 'text-slate-900'
                : 'text-slate-50'
            }`}>
              {currentActiveSection === null 
                ? (lang === 'id' ? 'Pengaturan' : 'Settings')
                : (
                    currentActiveSection === 'profile' ? (lang === 'id' ? 'Profil Pengguna' : 'User Profile') :
                    currentActiveSection === 'theme' || currentActiveSection === 'appearance' ? (lang === 'id' ? 'Tema & Tampilan' : 'Theme & Appearance') :
                    currentActiveSection === 'ai' ? 'Tata AI (BYOK Key)' :
                    currentActiveSection === 'screen-lock' || currentActiveSection === 'security' ? (lang === 'id' ? 'Kunci Layar (PIN)' : 'Screen Lock (PIN)') :
                    currentActiveSection === 'note-pin' ? (lang === 'id' ? 'PIN Catatan Rahasia' : 'Secret Note PIN') :
                    currentActiveSection === 'backup' ? (lang === 'id' ? 'Cadangan & Data' : 'Backup & Data') :
                    currentActiveSection === 'notifications' ? (lang === 'id' ? 'Pengaturan Notifikasi' : 'Notification Settings') :
                    (currentActiveSection === 'privacy' || currentActiveSection === 'about') ? (lang === 'id' ? 'Tentang Tata & Privasi' : 'About Tata & Privacy') :
                    (lang === 'id' ? 'Tentang Tata & Privasi' : 'About Tata & Privacy')
                  )
              }
            </span>
            <span className={`text-[10px] sm:text-xs font-medium leading-tight truncate ${
              (appTheme === 'light' || appTheme === 'organic' || appTheme === 'cute' || appTheme === 'pink')
                ? 'text-slate-600'
                : 'text-slate-400'
            }`}>
              {currentActiveSection === null 
                ? (lang === 'id' ? 'Tata • Produktivitas & Privasi Lokal' : 'Tata • Local Productivity & Privacy')
                : (
                    currentActiveSection === 'profile' ? (lang === 'id' ? 'Foto avatar, nama, akun Google & bagikan' : 'Avatar photo, name, Google account & share') :
                    currentActiveSection === 'theme' || currentActiveSection === 'appearance' ? (lang === 'id' ? 'Tema warna, wallpaper foto & aksen' : 'Color themes, custom wallpapers & accents') :
                    currentActiveSection === 'ai' ? 'Konfigurasi API Key & model mandiri' :
                    currentActiveSection === 'screen-lock' || currentActiveSection === 'security' ? (lang === 'id' ? 'PIN kunci layar & anti-intip acak' : 'Passcode PIN & anti-peeking shuffle') :
                    currentActiveSection === 'note-pin' ? (lang === 'id' ? 'PIN khusus proteksi catatan rahasia' : 'Dedicated PIN for locked notes') :
                    currentActiveSection === 'backup' ? (lang === 'id' ? 'Jadwal cadangan otomatis & ekspor/impor' : 'Auto backup schedule & export/import') :
                    currentActiveSection === 'notifications' ? (lang === 'id' ? 'Uji alarm & izin pemberitahuan' : 'Test alarms & notification permission') :
                    (currentActiveSection === 'privacy' || currentActiveSection === 'about') ? (lang === 'id' ? 'Filosofi, pusat privasi 100% offline, catatan rilis & kontak' : 'Philosophy, 100% offline privacy center, release notes & contact') :
                    (lang === 'id' ? 'Versi v5.1.0 • Karya Pengembang @noto.grow' : 'Version v5.1.0 • Developer @noto.grow')
                  )
              }
            </span>
          </div>
        </div>

        {/* Header Right Action */}
        {currentActiveSection === null ? (
          <button
            onClick={handleRefreshApp}
            disabled={isRefreshing}
            className="p-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-all cursor-pointer flex items-center justify-center shrink-0 active:scale-95 shadow-sm"
            title={lang === 'id' ? 'Segarkan Aplikasi & Cache' : 'Refresh App & Cache'}
          >
            <RefreshCw size={16} className={isRefreshing ? 'animate-spin text-cyan-400' : ''} />
          </button>
        ) : (
          <button
            onClick={() => updateActiveSection(null)}
            className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
          >
            <span>{lang === 'id' ? 'Semua' : 'All'}</span>
          </button>
        )}
      </div>

      <div ref={settingsScrollRef} className="flex-1 overflow-y-auto custom-scrollbar pb-32 w-full">
        <div className="w-full px-4 sm:px-6 py-6 space-y-6 max-w-2xl mx-auto">
          
          {/* MAIN SIMPLIFIED OVERVIEW SCREEN (When currentActiveSection === null) */}
          {currentActiveSection === null && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Profile / Account Card */}
              <div 
                onClick={() => updateActiveSection('profile')}
                className={cardProfileThemeClass}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full bg-slate-950/60 border border-slate-700/80 flex items-center justify-center overflow-hidden shadow-inner ring-2 ring-indigo-500/20 group-hover:ring-indigo-500/40 transition-all">
                      {user.avatarUrl === 'indexeddb:user_avatar' ? (
                        <div className="w-full h-full bg-slate-800 animate-pulse" />
                      ) : (user.avatarUrl || tataAccount?.avatarUrl) ? (
                        <img src={user.avatarUrl || tataAccount?.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <User size={22} className="text-indigo-400" />
                      )}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className={`text-[15px] font-bold truncate transition-colors ${cardRowTextClass}`}>
                        {(user.name && user.name !== 'Pengguna Tata' && user.name !== 'Tata User' && user.name !== 'Pengguna') 
                          ? user.name 
                          : (tataAccount?.name || user.name || (lang === 'id' ? 'Pengguna Tata' : 'Tata User'))}
                      </h2>
                      {isAccountPremium ? (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          PREMIUM
                        </span>
                      ) : tataAccount ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          Google
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium ${cardRowSubtextClass}`}>
                        {appVersion === 'pro' ? 'Pro' : (appVersion === 'organic' || appVersion === 'pro_max') ? 'Pro Max' : 'Lite'}
                      </span>
                      <span className="opacity-40 text-xs">•</span>
                      <span className="text-xs text-amber-400/90 font-semibold inline-flex items-center gap-1">
                        {isOrganic ? <Icon3DFlame size={14} /> : <Flame size={12} className="fill-amber-400" />}
                        {streak} {lang === 'id' ? 'Hari' : 'Days'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-1 text-slate-400 group-hover:text-slate-200 transition-colors">
                  <ChevronRight size={18} />
                </div>
              </div>

              {/* Group 1: AKUN & TAMPILAN */}
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider px-3 mb-2 ${sectionHeaderClass}`}>
                  {lang === 'id' ? 'Akun & Tampilan' : 'Account & Appearance'}
                </h3>
                <div className={cardGroupThemeClass}>
                  {/* Akun Tata & Status Lisensi */}
                  <div 
                    onClick={() => { playTapSound(); onNavigate && onNavigate('account'); }}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                        <Crown size={16} className="fill-amber-400/30" />
                      </div>
                      <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                        {lang === 'id' ? 'Akun Tata & Lisensi' : 'Tata Account & License'}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 text-slate-400">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        isAccountPremium 
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isAccountPremium ? (tataAccount?.premiumType?.includes('lifetime') ? 'Lifetime' : 'Pro Max') : 'Gratis'}
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>
                  {/* Tema Warna & Wallpaper */}
                  <div 
                    onClick={() => updateActiveSection('theme')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DPalette size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="palette" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <Palette size={16} />
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                        {lang === 'id' ? 'Tema & Tampilan' : 'Theme & Appearance'}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 text-slate-400">
                      <span className={`text-xs font-medium ${cardRowSubtextClass}`}>
                        {getThemeLabel(appTheme)}
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>

                  {/* Bahasa Aplikasi */}
                  <div 
                    onClick={() => setShowLanguageModal(true)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DGlobe size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="globe" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
                          <Globe size={16} />
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] ${primaryTextThemeClass} block truncate`}>
                        {lang === 'id' ? 'Bahasa' : 'Language'}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 text-slate-400">
                      <span className="text-xs font-medium text-slate-400">
                        {lang === 'id' ? 'Indonesia' : 'English'}
                      </span>
                      <ChevronRight size={16} className="text-slate-500" />
                    </div>
                  </div>

                  {/* Mode Tampilan */}
                  <div 
                    onClick={() => setShowModeModal(true)}
                    className="w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer hover:bg-slate-800/40 active:bg-slate-800/70"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DSmartphone size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="smartphone" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <Smartphone size={16} />
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] ${primaryTextThemeClass} block truncate`}>
                        {lang === 'id' ? 'Mode Aplikasi' : 'Display Mode'}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 text-slate-400">
                      <span className="text-xs font-medium text-slate-400">
                        {(appVersion === 'organic' || appVersion === 'pro_max') ? 'Pro Max' : appVersion === 'pro' ? 'Pro' : 'Lite'}
                      </span>
                      <ChevronRight size={16} className="text-slate-500" />
                    </div>
                  </div>

                  {/* Efek Suara */}
                  <div className="w-full flex items-center justify-between px-4 py-3.5 text-left">
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DVolume size={24} active={soundActive} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="volume" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                          {soundActive ? <Volume2 size={16} /> : <VolumeX size={16} />}
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] ${primaryTextThemeClass} block truncate`}>
                        {lang === 'id' ? 'Efek Suara' : 'Sound Effects'}
                      </span>
                    </div>
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={toggleSound}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${soundActive ? 'bg-amber-500' : 'bg-slate-800'}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${soundActive ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Tata AI BYOK */}
                  <div 
                    onClick={() => updateActiveSection('ai')}
                    className="w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer hover:bg-slate-800/40 active:bg-slate-800/70"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DTataAI size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="ai" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 border border-violet-500/20 flex items-center justify-center shrink-0">
                          <Bot size={16} />
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] ${primaryTextThemeClass} block truncate`}>
                        Tata AI (BYOK Key)
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 text-slate-400">
                      <span className="text-xs font-medium text-slate-400">
                        {geminiApiKey ? (lang === 'id' ? 'Aktif' : 'Active') : (lang === 'id' ? 'Gratis' : 'Free')}
                      </span>
                      <ChevronRight size={16} className="text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 2: KEAMANAN */}
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider px-3 mb-2 ${sectionHeaderClass}`}>
                  {lang === 'id' ? 'Keamanan' : 'Security'}
                </h3>
                <div className={cardGroupThemeClass}>
                  {/* Kunci Layar / PIN */}
                  <div 
                    onClick={() => updateActiveSection('screen-lock')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DLock size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="lock" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                          <Lock size={16} />
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                        {lang === 'id' ? 'Kunci Layar (PIN)' : 'Screen Lock (PIN)'}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 text-slate-400">
                      <span className={`text-xs font-medium ${appPin ? 'text-emerald-500 font-bold' : cardRowSubtextClass}`}>
                        {appPin ? (lang === 'id' ? 'Aktif' : 'Active') : (lang === 'id' ? 'Nonaktif' : 'Off')}
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>

                  {/* PIN Catatan Rahasia */}
                  <div 
                    onClick={() => updateActiveSection('note-pin')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DSecretNote size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="notes" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                        {lang === 'id' ? 'PIN Catatan Rahasia' : 'Note Dedicated PIN'}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 text-slate-400">
                      <span className={`text-xs font-medium ${cardRowSubtextClass}`}>
                        {notePin ? (lang === 'id' ? 'PIN Khusus' : 'Dedicated') : (lang === 'id' ? 'PIN Layar' : 'App PIN')}
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>

                  {/* Acak Tombol PIN */}
                  <div className="w-full flex items-center justify-between px-4 py-3.5 text-left">
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DShuffle size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="shuffle" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                          <Shuffle size={16} />
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                        {lang === 'id' ? 'Acak Tombol PIN' : 'Scramble Keypad'}
                      </span>
                    </div>
                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => setUseScrambledPin(!useScrambledPin)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useScrambledPin ? 'bg-purple-500' : (isLight ? 'bg-slate-300' : 'bg-slate-800')}`}
                      >
                        <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useScrambledPin ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 3: DATA & CADANGAN */}
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider px-3 mb-2 ${sectionHeaderClass}`}>
                  {lang === 'id' ? 'Data & Cadangan' : 'Data & Backup'}
                </h3>
                <div className={cardGroupThemeClass}>
                  {/* Pencadangan Otomatis */}
                  <div 
                    onClick={() => updateActiveSection('backup')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DDatabase size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="database" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                          <Database size={16} />
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                        {lang === 'id' ? 'Pencadangan Otomatis' : 'Auto Backup'}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 text-slate-400">
                      <span className={`text-xs font-medium capitalize ${cardRowSubtextClass}`}>
                        {autoBackupFrequency !== 'off' ? autoBackupFrequency : (lang === 'id' ? 'Nonaktif' : 'Off')}
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>

                  {/* Cadangan & Pemulihan Data (.json) */}
                  <div 
                    onClick={handleExportClick}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DDatabase size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="database" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <Database size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                          {lang === 'id' ? 'Cadangan & Pemulihan (.json)' : 'Backup & Restore (.json)'}
                        </span>
                        <span className={`text-[11px] block truncate ${cardRowSubtextClass}`}>
                          {lang === 'id' ? 'Ekspor cadangan atau pulihkan catatan & tugas' : 'Export backup or restore notes & tasks'}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center text-slate-400">
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  {/* Hard Reset Data */}
                  <div 
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer hover:bg-rose-500/10 active:bg-rose-500/20"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DTrash size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="trash" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                          <Trash2 size={16} />
                        </div>
                      )}
                      <span className="font-semibold text-[14px] text-rose-500 block truncate">
                        {lang === 'id' ? 'Reset Data Aplikasi' : 'Reset App Data'}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center text-rose-500">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 4: SISTEM & UTILITAS */}
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider px-3 mb-2 ${sectionHeaderClass}`}>
                  {lang === 'id' ? 'Sistem & Utilitas' : 'System & Utilities'}
                </h3>
                <div className={cardGroupThemeClass}>
                  {/* Uji Coba Notifikasi */}
                  <div 
                    onClick={() => updateActiveSection('notifications')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DBell size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="bell" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <Bell size={16} />
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                        {lang === 'id' ? 'Pengaturan & Uji Notifikasi' : 'Notification Settings & Test'}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-1.5 text-slate-400">
                      <span className={`text-xs font-medium ${cardRowSubtextClass}`}>
                        {notifPermission === 'granted' ? (lang === 'id' ? 'Diizinkan' : 'Granted') : (lang === 'id' ? 'Atur' : 'Setup')}
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>

                  {/* Pasang PWA (if not installed) */}
                  {!isPwaInstalled && (
                    <div 
                      onClick={handleInstallPwa}
                      className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-2">
                        {isOrganic ? (
                          <Icon3DSmartphone size={24} />
                        ) : isLiteMode ? (
                          <LiteStickerIcon variant="smartphone" size="sm" />
                        ) : (
                          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                            <Smartphone size={16} />
                          </div>
                        )}
                        <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                          {lang === 'id' ? 'Pasang di Layar Utama (PWA)' : 'Install to Home Screen'}
                        </span>
                      </div>
                      <div className="shrink-0 flex items-center text-slate-400">
                        <ChevronRight size={16} />
                      </div>
                    </div>
                  )}

                  {/* Bantuan & Reset Instalasi PWA */}
                  <div 
                    onClick={() => setShowPwaTroubleshoot(true)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DHelp size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="info" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                          <HelpCircle size={16} />
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                        {lang === 'id' ? 'Bantuan Gagal Install / Reset PWA' : 'PWA Reinstallation Help'}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center text-slate-400">
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  {/* Pusat Game Santai */}
                  <div 
                    onClick={() => onNavigate && onNavigate('games-hub')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DGamepad size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="game" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 flex items-center justify-center shrink-0">
                          <Gamepad2 size={16} />
                        </div>
                      )}
                      <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                        {lang === 'id' ? 'Pusat Game Santai' : 'Casual Games Hub'}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center text-slate-400">
                      <ChevronRight size={16} />
                    </div>
                  </div>

                  {/* Segarkan Cache */}
                  <div 
                    onClick={handleRefreshApp}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DRefresh size={24} spinning={isRefreshing} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="refresh" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                          <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                          {lang === 'id' ? 'Bersihkan Cache & Segarkan Sistem' : 'Clean Cache & Refresh System'}
                        </span>
                        <span className={`text-[11px] block truncate ${cardRowSubtextClass}`}>
                          {lang === 'id' ? 'Hapus sisa cache & sampah sementara, data 100% aman' : 'Clear temporary cache & junk, data 100% safe'}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center text-slate-400">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Group 5: TENTANG TATA & PUSAT PRIVASI */}
              <div>
                <h3 className={`text-xs font-bold uppercase tracking-wider px-3 mb-2 ${sectionHeaderClass}`}>
                  {lang === 'id' ? 'Tentang Tata & Privasi' : 'About Tata & Privacy'}
                </h3>
                <div className={cardGroupThemeClass}>
                  {/* Tentang Tata & Pusat Privasi */}
                  <div 
                    onClick={() => updateActiveSection('about')}
                    className={`w-full flex items-center justify-between px-4 py-3.5 transition-colors text-left cursor-pointer ${cardRowHoverClass}`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      {isOrganic ? (
                        <Icon3DShield size={24} />
                      ) : isLiteMode ? (
                        <LiteStickerIcon variant="shield" size="sm" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                          <ShieldCheck size={16} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className={`font-semibold text-[14px] block truncate ${cardRowTextClass}`}>
                          {lang === 'id' ? 'Tentang Tata & Pusat Privasi' : 'About Tata & Privacy Center'}
                        </span>
                        <span className={`text-[11px] block truncate ${cardRowSubtextClass}`}>
                          {lang === 'id' ? 'Filosofi, status privasi 100% offline, catatan rilis & kontak' : 'Philosophy, 100% offline privacy status, release notes & contact'}
                        </span>
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2 text-slate-400">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        100% Offline
                      </span>
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SUB-CATEGORY VIEWS (When currentActiveSection !== null) */}
          {currentActiveSection !== null && (
            <div className="space-y-6 animate-in fade-in duration-150 transform-gpu">
              {/* SECTION: PROFILE */}
              {currentActiveSection === 'profile' && (
                <div className="space-y-4">
                  <div className={`rounded-2xl overflow-hidden shadow-sm ${cardThemeClass}`}>
                    {/* Header: Foto Profil & Nama */}
                    <div className="p-4 sm:p-5 space-y-4">
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        {/* Avatar upload & delete controls */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div className="relative group">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center overflow-hidden shadow-inner ring-2 ring-indigo-500/20 ${innerCardThemeClass}`}>
                              {user.avatarUrl === 'indexeddb:user_avatar' ? (
                                <div className="w-full h-full bg-slate-800 animate-pulse" />
                              ) : (user.avatarUrl || tataAccount?.avatarUrl) ? (
                                <img src={user.avatarUrl || tataAccount?.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                isOrganic ? (
                                  <Icon3DUser size={32} />
                                ) : (
                                  <User size={24} className={subTextThemeClass} />
                                )
                              )}
                            </div>
                            <label 
                              className="absolute bottom-0 right-0 w-6 h-6 bg-indigo-600 hover:bg-indigo-500 border-2 border-slate-900 rounded-full flex items-center justify-center cursor-pointer transition-all active:scale-95 shadow-sm"
                              title={lang === 'id' ? 'Unggah Foto Profil' : 'Upload Profile Photo'}
                            >
                              <Upload size={10} className="text-white" />
                              <input 
                                type="file" 
                                accept="image/*" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (event) => {
                                      const dataUrl = event.target?.result as string;
                                      updateUser({ ...user, avatarUrl: dataUrl });
                                      showNotificationToast(lang === 'id' ? 'Foto profil berhasil diperbarui!' : 'Avatar updated!');
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                  e.target.value = '';
                                }}
                                className="hidden" 
                              />
                            </label>
                          </div>

                          {/* Tombol Hapus Foto Profil jika avatar ada */}
                          {Boolean(user?.avatarUrl) && (
                            <button
                              type="button"
                              onClick={() => {
                                updateUser({ ...user, avatarUrl: '' });
                                deleteLargeItem('user_avatar').catch(e => console.error(e));
                                showNotificationToast(lang === 'id' ? 'Foto profil berhasil dihapus!' : 'Profile photo removed!');
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-500 hover:text-rose-400 text-[11px] font-semibold transition-all active:scale-95 cursor-pointer shadow-sm"
                              title={lang === 'id' ? 'Hapus Foto Profil' : 'Remove Profile Photo'}
                            >
                              {isOrganic ? (
                                <Icon3DTrash size={14} />
                              ) : (
                                <Trash2 size={11} className="shrink-0" />
                              )}
                              <span>{lang === 'id' ? 'Hapus Foto' : 'Remove Photo'}</span>
                            </button>
                          )}
                        </div>

                        {/* Name input & Google Sync */}
                        <div className="flex-1 w-full space-y-1.5">
                          <label className={`text-[10px] font-bold uppercase tracking-wider block ${subTextThemeClass}`}>
                            {lang === 'id' ? 'Nama Panggilan' : 'Display Name'}
                          </label>
                          <input 
                            type="text" 
                            value={user.name}
                            onChange={(e) => updateUser({ ...user, name: e.target.value })}
                            className={`w-full rounded-xl px-3.5 py-2.5 text-xs outline-none focus:border-indigo-500/40 transition-colors ${inputThemeClass}`}
                            placeholder={lang === 'id' ? 'Nama Anda...' : 'Your name...'}
                          />
                          {Boolean(tataAccount) && (
                            <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  playTapSound();
                                  const nextName = tataAccount?.name || user.name;
                                  const nextAvatar = tataAccount?.avatarUrl || user.avatarUrl;
                                  updateUser({ ...user, name: nextName, avatarUrl: nextAvatar });
                                  showNotificationToast(lang === 'id' ? 'Profil berhasil disinkronkan dengan Akun Google!' : 'Profile synced with Google account!');
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-500 hover:text-indigo-400 text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
                              >
                                <RefreshCw size={12} className="text-indigo-500" />
                                <span>{lang === 'id' ? 'Sinkronkan dari Google' : 'Sync from Google'}</span>
                              </button>
                              <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-emerald-500" />
                                <span>{tataAccount?.email}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className={`pt-3 border-t flex items-center justify-between ${borderThemeClass}`}>
                        <div className="flex items-center gap-2">
                          {isOrganic ? (
                            <Icon3DShield size={18} />
                          ) : (
                            <ShieldCheck size={15} className="text-emerald-500" />
                          )}
                          <span className={`text-xs ${subTextThemeClass}`}>
                            {lang === 'id' ? 'Data Akun & Foto Tersimpan Lokal di Perangkat' : 'Account data & photo stored locally on device'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
                          Offline First
                        </span>
                      </div>
                    </div>

                    {/* Integrated Sub-Items: Pro / Pro Max, Google Login & Invite Friends */}
                    <div className={`border-t divide-y ${borderThemeClass}`}>
                      {/* Menu Tata Pro, Pro Max & Voucher Promo */}
                      <div 
                        onClick={() => { playTapSound(); setShowLicenseModal(true); }}
                        className={`p-4 transition-colors cursor-pointer flex items-center justify-between gap-3 group ${cardRowHoverClass}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-zinc-950 flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                            <Crown className="w-5 h-5 fill-current" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-[13px] font-bold transition-colors ${primaryTextThemeClass}`}>
                                {isAccountPremium 
                                  ? (tataAccount?.premiumType?.includes('pro_max') || tataAccount?.premiumType === 'lifetime' 
                                      ? 'Tata Pro Max' 
                                      : 'Tata Pro')
                                  : 'Tata Pro & Tata Pro Max'}
                              </h4>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isAccountPremium 
                                  ? 'bg-amber-400 text-zinc-950 font-bold' 
                                  : 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                              }`}>
                                {isAccountPremium 
                                  ? (tataAccount?.premiumType?.includes('lifetime') ? 'SEUMUR HIDUP' : 'AKTIF') 
                                  : 'PROMO / VOUCHER'}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-0.5 truncate ${subTextThemeClass}`}>
                              {isAccountPremium 
                                ? (lang === 'id' ? 'Status lisensi aktif & bebas iklan.' : 'Active license & 100% ad-free.') 
                                : (lang === 'id' ? 'Upgrade tier atau klaim kode promo voucher gratis.' : 'Upgrade tier or redeem free promo vouchers.')}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 flex items-center gap-1 text-amber-500 group-hover:text-amber-400 text-xs font-semibold">
                          <span className="hidden sm:inline">
                            {isAccountPremium ? (lang === 'id' ? 'Kelola' : 'Manage') : (lang === 'id' ? 'Pilih Paket' : 'Plans')}
                          </span>
                          <ChevronRight size={16} />
                        </div>
                      </div>

                      {/* Menu Login Google & Akun Tata */}
                      <div 
                        onClick={() => { playTapSound(); onNavigate && onNavigate('account'); }}
                        className={`p-4 transition-colors cursor-pointer flex items-center justify-between gap-3 group ${cardRowHoverClass}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            {tataAccount?.avatarUrl ? (
                              <img src={tataAccount.avatarUrl} alt="Google Avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/40" />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-white text-zinc-900 flex items-center justify-center shadow-md">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                                </svg>
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-[13px] font-bold truncate transition-colors ${primaryTextThemeClass}`}>
                                {tataAccount ? tataAccount.name : (lang === 'id' ? 'Masuk dengan Akun Google' : 'Sign in with Google Account')}
                              </h4>
                              <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                isAccountPremium 
                                  ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' 
                                  : tataAccount 
                                    ? 'bg-indigo-500/20 text-indigo-500 border border-indigo-500/30' 
                                    : 'bg-slate-500/20 text-slate-500 border border-slate-500/30'
                              }`}>
                                {isAccountPremium ? 'PREMIUM' : tataAccount ? 'FREE' : (lang === 'id' ? 'MODE TANPA AKUN' : 'GUEST')}
                              </span>
                            </div>
                            <p className={`text-[11px] mt-0.5 truncate ${subTextThemeClass}`}>
                              {tataAccount 
                                ? tataAccount.email 
                                : (lang === 'id' ? 'Login Google untuk status Premium & Pembayaran (Opsional).' : 'Optional Google sign-in for Premium & payments.')}
                            </p>
                          </div>
                        </div>

                        <div className={`shrink-0 flex items-center gap-1 text-xs font-semibold ${subTextThemeClass}`}>
                          <span className="hidden sm:inline">
                            {tataAccount ? (lang === 'id' ? 'Kelola' : 'Manage') : (lang === 'id' ? 'Buka' : 'Open')}
                          </span>
                          <ChevronRight size={16} />
                        </div>
                      </div>

                      {/* Menu Undang Teman & Bagikan Tata */}
                      <div 
                        onClick={() => setShowInviteModal(true)}
                        className={`p-4 transition-colors cursor-pointer flex items-center justify-between gap-3 group ${cardRowHoverClass}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {isOrganic ? (
                            <div className="w-10 h-10 rounded-xl bg-[#C35E40]/15 border border-[#C35E40]/25 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                              <Icon3DShare size={22} />
                            </div>
                          ) : isLiteMode ? (
                            <LiteStickerIcon variant="share" size="md" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-500 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                              <Share2 size={18} />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-[13px] font-bold transition-colors ${primaryTextThemeClass}`}>
                                {lang === 'id' ? 'Undang Teman & Bagikan Tata' : 'Invite Friends & Share Tata'}
                              </h4>
                              <span className="px-1.5 py-0.5 text-[9px] font-extrabold bg-emerald-500/15 text-emerald-500 border border-emerald-500/30 rounded-md">
                                100% Free
                              </span>
                            </div>
                            <p className={`text-[11px] mt-0.5 truncate ${subTextThemeClass}`}>
                              {lang === 'id' 
                                ? 'Ajak teman nikmati produktivitas offline (opsi bebas iklan di Tata Premium).' 
                                : 'Invite friends to offline productivity (ad-free option on Tata Premium).'}
                            </p>
                          </div>
                        </div>

                        <div className={`shrink-0 flex items-center gap-1 text-xs font-semibold ${subTextThemeClass}`}>
                          <span className="hidden sm:inline">{lang === 'id' ? 'Ajak' : 'Invite'}</span>
                          <ChevronRight size={16} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: THEME / COLOR & WALLPAPER */}
              {(currentActiveSection === 'theme' || currentActiveSection === 'appearance') && (
                <div className="space-y-5">
                  {/* Top Segmented Navigation Tabs */}
                  <div className={`p-1 border rounded-2xl flex items-center shadow-xs ${innerCardThemeClass}`}>
                    <button
                      type="button"
                      onClick={() => setThemeTab('colors')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        themeTab === 'colors'
                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40'
                          : `${subTextThemeClass} hover:opacity-80`
                      }`}
                    >
                      <Palette size={14} />
                      <span>{lang === 'id' ? 'Tema Warna' : 'Color Themes'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setThemeTab('wallpaper')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        themeTab === 'wallpaper'
                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40'
                          : `${subTextThemeClass} hover:opacity-80`
                      }`}
                    >
                      <Smartphone size={14} />
                      <span>{lang === 'id' ? 'Wallpaper Layar' : 'Screen Wallpaper'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setThemeTab('banner')}
                      className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        themeTab === 'banner'
                          ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400/40'
                          : `${subTextThemeClass} hover:opacity-80`
                      }`}
                    >
                      <Layers size={14} />
                      <span>{lang === 'id' ? 'Banner Beranda' : 'Home Banner'}</span>
                    </button>
                  </div>

                  {/* TAB 1: TEMA WARNA */}
                  {themeTab === 'colors' && (
                    <div className="space-y-4">
                      {/* Overview info */}
                      <div className="flex items-center justify-between px-1">
                        <div>
                          <h3 className={`text-sm font-bold ${primaryTextThemeClass}`}>
                            {lang === 'id' ? 'Pilihan Skema Warna Tata' : 'Color Schemes'}
                          </h3>
                          <p className={`text-[11px] mt-0.5 ${subTextThemeClass}`}>
                            {lang === 'id' ? 'Sentuh kartu untuk langsung mengubah suasana tampilan aplikasi' : 'Tap any theme card to immediately apply the color palette'}
                          </p>
                        </div>
                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold shrink-0 ${innerCardThemeClass} text-indigo-500`}>
                          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                          <span>{getThemeLabel(appTheme)}</span>
                        </div>
                      </div>

                      {/* Theme cards grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          {
                            id: 'organic',
                            name: 'Pro Max',
                            vibe: lang === 'id' ? 'Hangat, alami & sentuhan 3D eksklusif' : 'Warm, tactile & exclusive 3D tones',
                            bg: '#F7F3E9',
                            card: '#EFE9DA',
                            header: '#FAF5EA',
                            accent: '#C35E40',
                            text: '#24170D',
                            dot: 'bg-[#C35E40]'
                          },
                          {
                            id: 'dark',
                            name: lang === 'id' ? 'Gelap' : 'Dark',
                            vibe: lang === 'id' ? 'Hitam OLED pekat, sangat nyaman & hemat daya' : 'Deep OLED pitch black, soothing & battery friendly',
                            bg: '#020617',
                            card: '#0F172A',
                            header: '#0B0F19',
                            accent: '#6366F1',
                            text: '#F8FAFC',
                            dot: 'bg-slate-700'
                          },
                          {
                            id: 'light',
                            name: lang === 'id' ? 'Terang' : 'Light',
                            vibe: lang === 'id' ? 'Putih bersih dengan kontras tinggi & minimalis' : 'Clean crisp white, high contrast & modern',
                            bg: '#F8FAFC',
                            card: '#FFFFFF',
                            header: '#FFFFFF',
                            accent: '#4F46E5',
                            text: '#0F172A',
                            dot: 'bg-slate-200'
                          },
                          {
                            id: 'pink',
                            name: 'Ecy',
                            vibe: lang === 'id' ? 'Nuansa mawar pink lembut, feminin & anggun' : 'Soft rose pink, delicate & elegant aesthetic',
                            bg: '#FDF2F8',
                            card: '#FFFFFF',
                            header: '#FFF0F5',
                            accent: '#F43F5E',
                            text: '#500724',
                            dot: 'bg-rose-500'
                          },
                          {
                            id: 'cool',
                            name: lang === 'id' ? 'Biru Malam' : 'Cool Navy',
                            vibe: lang === 'id' ? 'Biru laut dalam untuk fokus belajar & produktivitas' : 'Deep navy ocean for sharp focus and calm',
                            bg: '#050811',
                            card: '#0D1836',
                            header: '#0A1329',
                            accent: '#2563EB',
                            text: '#F8FAFC',
                            dot: 'bg-blue-600'
                          },
                          {
                            id: 'cute',
                            name: lang === 'id' ? 'Hangat Senja' : 'Sunset Warmth',
                            vibe: lang === 'id' ? 'Krem mentega lembut dengan sentuhan hangat senja' : 'Warm cream with soothing amber sunset tones',
                            bg: '#FDF8EB',
                            card: '#FFFDF5',
                            header: '#FAF5EA',
                            accent: '#F59E0B',
                            text: '#38230F',
                            dot: 'bg-amber-500'
                          },
                          {
                            id: 'simple',
                            name: lang === 'id' ? 'Cokelat Klasik' : 'Espresso Earth',
                            vibe: lang === 'id' ? 'Kopi espresso & nuansa kayu bersahaja' : 'Earthy espresso coffee & timeless wood warmth',
                            bg: '#141210',
                            card: '#1E1B18',
                            header: '#161412',
                            accent: '#D97706',
                            text: '#F5F5F4',
                            dot: 'bg-amber-700'
                          },
                        ].map((theme) => {
                          const isCurrent = appTheme === theme.id || (theme.id === 'dark' && appTheme === 'slate');
                          return (
                            <div
                              key={theme.id}
                              onClick={() => {
                                setAppTheme(theme.id as any);
                                try {
                                  localStorage.setItem('tata_theme', theme.id);
                                } catch (e) {}
                                showNotificationToast(lang === 'id' ? `Tema ${theme.name} diaktifkan!` : `${theme.name} theme activated!`);
                              }}
                              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 text-left group relative ${
                                isCurrent
                                  ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-md ' + (isLight ? 'bg-indigo-50/50' : 'bg-slate-900')
                                  : (isLight 
                                      ? 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white active:scale-[0.99]' 
                                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700 hover:bg-slate-850/80 active:scale-[0.99]')
                              }`}
                            >
                              {/* Mini UI Mockup Preview */}
                              <div 
                                className="w-full h-20 rounded-xl p-2 flex flex-col justify-between overflow-hidden shadow-inner border border-black/10 relative select-none"
                                style={{ backgroundColor: theme.bg }}
                              >
                                {/* Mini header strip */}
                                <div 
                                  className="h-4 px-2 rounded-md flex items-center justify-between border border-black/5"
                                  style={{ backgroundColor: theme.header }}
                                >
                                  <div className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.accent }} />
                                    <span className="text-[8px] font-black tracking-tight" style={{ color: theme.text }}>TATA</span>
                                  </div>
                                  <div className="w-3 h-1.5 rounded-full opacity-40" style={{ backgroundColor: theme.text }} />
                                </div>

                                {/* Mini card preview */}
                                <div 
                                  className="p-1.5 rounded-lg flex items-center justify-between border shadow-2xs"
                                  style={{ backgroundColor: theme.card, borderColor: `${theme.accent}33` }}
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: theme.accent }} />
                                    <div className="w-16 h-1.5 rounded-full opacity-70" style={{ backgroundColor: theme.text }} />
                                  </div>
                                  <span className="text-[7px] font-bold px-1 rounded-sm" style={{ backgroundColor: `${theme.accent}22`, color: theme.accent }}>
                                    ✓
                                  </span>
                                </div>
                              </div>

                              {/* Card Info & Active Badge */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${theme.dot} border border-slate-900 shrink-0`} />
                                    <span className={`text-sm font-bold truncate ${primaryTextThemeClass}`}>{theme.name}</span>
                                  </div>
                                  <p className={`text-[11px] mt-1 leading-snug ${subTextThemeClass}`}>
                                    {theme.vibe}
                                  </p>
                                </div>

                                {isCurrent ? (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-500 border border-indigo-500/30 text-[10px] font-bold shrink-0 flex items-center gap-1">
                                    <Check size={11} strokeWidth={3} />
                                    <span>{lang === 'id' ? 'Aktif' : 'Active'}</span>
                                  </span>
                                ) : (
                                  <span className={`text-xs transition-colors shrink-0 ${subTextThemeClass}`}>
                                    <ChevronRight size={16} />
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Callout to switch to wallpaper tab */}
                      <div className="p-4 bg-gradient-to-r from-indigo-950/40 via-slate-900/90 to-slate-900/90 border border-indigo-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                            <Smartphone size={20} />
                          </div>
                          <div>
                            <h4 className={`text-xs sm:text-sm font-bold ${primaryTextThemeClass}`}>
                              {lang === 'id' ? 'Ingin Menggunakan Foto Sendiri?' : 'Want to Use Your Own Photo?'}
                            </h4>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {lang === 'id' ? 'Pasang foto galeri favorit Anda sebagai wallpaper layar penuh Tata.' : 'Set your favorite gallery photo as a full-screen wallpaper.'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setThemeTab('wallpaper')}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <Smartphone size={13} />
                          <span>{lang === 'id' ? 'Buka Wallpaper' : 'Open Wallpaper'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: WALLPAPER LAYAR */}
                  {themeTab === 'wallpaper' && (
                    <div className="space-y-4">
                      {isLiteMode ? (
                        <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center space-y-2">
                          <p className="text-xs text-slate-400">
                            {lang === 'id' 
                              ? 'Kustomisasi Wallpaper dinonaktifkan di Mode Lite. Beralih ke Mode Pro atau Pro Max untuk memasang foto latar.' 
                              : 'Wallpaper settings are disabled in Lite Mode. Switch to Pro or Pro Max Mode to customize background.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => setShowModeModal(true)}
                            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer"
                          >
                            {lang === 'id' ? 'Ubah Mode Aplikasi' : 'Change Mode'}
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Activation Banner */}
                          <div className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            appTheme === 'wallpaper'
                              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                              : 'bg-indigo-950/30 border-indigo-500/30 text-slate-300'
                          }`}>
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                appTheme === 'wallpaper'
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                  : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                              }`}>
                                {appTheme === 'wallpaper' ? <Check size={18} strokeWidth={2.5} /> : <Sparkles size={18} />}
                              </div>
                              <div>
                                <h4 className={`text-xs sm:text-sm font-bold ${primaryTextThemeClass}`}>
                                  {appTheme === 'wallpaper' 
                                    ? (lang === 'id' ? 'Tema Wallpaper Sedang Aktif' : 'Wallpaper Theme Active') 
                                    : (lang === 'id' ? 'Tema Wallpaper Belum Aktif' : 'Wallpaper Theme Inactive')}
                                </h4>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {appTheme === 'wallpaper'
                                    ? (lang === 'id' ? 'Layar utama dan menu Tata sedang menampilkan foto latar Anda.' : 'Home screen and menus are using your background photo.')
                                    : (lang === 'id' ? 'Ketuk tombol di samping untuk mengaktifkan foto sebagai latar layar Tata.' : 'Tap button to apply your photo as full screen background.')}
                                </p>
                              </div>
                            </div>

                            {appTheme !== 'wallpaper' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setAppTheme('wallpaper');
                                  try {
                                    localStorage.setItem('tata_theme', 'wallpaper');
                                  } catch (e) {}
                                  showNotificationToast(lang === 'id' ? 'Tema Wallpaper berhasil diaktifkan!' : 'Wallpaper theme activated!');
                                }}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 shadow-sm flex items-center justify-center gap-1.5 active:scale-95"
                              >
                                <Sparkles size={14} />
                                <span>{lang === 'id' ? 'Aktifkan Wallpaper' : 'Activate Wallpaper'}</span>
                              </button>
                            ) : (
                              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-full shrink-0 text-center">
                                {lang === 'id' ? 'Sedang Digunakan' : 'In Use'}
                              </span>
                            )}
                          </div>

                          {/* Live Phone Screen Mockup & Action Buttons Card */}
                          <div className={`p-4 ${cardThemeClass} rounded-2xl space-y-4`}>
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                              {/* Phone frame preview */}
                              <div className="w-24 sm:w-28 h-40 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-950 shrink-0 relative shadow-lg">
                                {localCustomWallpaper ? (
                                  <img 
                                    src={localCustomWallpaper} 
                                    alt="Active Wallpaper" 
                                    className={`w-full h-full ${wallpaperFit === 'contain' ? 'object-contain' : 'object-cover'} ${
                                      localWallpaperPosition === 'top' ? 'object-top' :
                                      localWallpaperPosition === 'bottom' ? 'object-bottom' :
                                      'object-center'
                                    }`}
                                    style={{ filter: wallpaperBlur > 0 ? `blur(${Math.min(wallpaperBlur, 4)}px)` : undefined }}
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-950 to-slate-900 flex flex-col items-center justify-center p-2 text-center text-slate-500">
                                    <ImageIcon size={22} className="text-slate-600 mb-1" />
                                    <span className="text-[9px] font-bold text-slate-400">Default Gradient</span>
                                  </div>
                                )}
                                {/* Dimming overlay */}
                                <div 
                                  className="absolute inset-0 bg-slate-950 pointer-events-none" 
                                  style={{ opacity: (wallpaperDim || 35) / 100 * 0.7 }}
                                />
                                {/* Mock mini app status bar */}
                                <div className="absolute top-1 left-2 right-2 flex items-center justify-between text-[7px] text-white/70 font-mono">
                                  <span>09:41</span>
                                  <div className="flex items-center gap-0.5">
                                    <span className="w-2 h-1 bg-white/70 rounded-xs" />
                                  </div>
                                </div>
                                {/* Mock mini card */}
                                <div className="absolute bottom-2 left-2 right-2 p-1 bg-slate-900/80 backdrop-blur-xs rounded-md border border-white/10 text-[7px] text-white/90 text-center font-bold truncate">
                                  {lang === 'id' ? 'Tata Produktivitas' : 'Tata Productivity'}
                                </div>
                              </div>

                              {/* Info & action buttons */}
                              <div className="flex-1 space-y-3 min-w-0 text-center sm:text-left">
                                <div>
                                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                                    <h4 className={`text-sm font-bold ${primaryTextThemeClass}`}>
                                      {lang === 'id' ? 'Foto Wallpaper Layar Penuh' : 'Full Screen Background Photo'}
                                    </h4>
                                    {localCustomWallpaper ? (
                                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                        {lang === 'id' ? 'Foto Kustom' : 'Custom Photo'}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-medium bg-slate-800 px-2 py-0.5 rounded-full">
                                        {lang === 'id' ? 'Gradien Bawaan' : 'Default'}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                    {localCustomWallpaper 
                                      ? (lang === 'id' ? 'Foto dipasang dalam kualitas penuh. Gunakan tombol "Atur & Potong" untuk memilih bagian foto yang ingin difokuskan.' : 'Photo active in full resolution. Use "Adjust & Crop" to re-frame.')
                                      : (lang === 'id' ? 'Unggah foto pribadi dari galeri atau pilih dari koleksi gambar estetik di bawah ini.' : 'Upload your own photo or pick from curated presets below.')}
                                  </p>
                                </div>

                                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pt-1">
                                  <label className="py-2 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm active:scale-95">
                                    <Upload size={14} />
                                    <span>{lang === 'id' ? 'Unggah Foto' : 'Upload Photo'}</span>
                                    <input type="file" accept="image/*" onChange={handleWallpaperUpload} className="hidden" />
                                  </label>

                                  {localCustomWallpaper && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCropperImageSrc(localCustomWallpaper);
                                          setCropperTarget('custom');
                                          setCropperModalOpen(true);
                                        }}
                                        className="py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                                      >
                                        <Crop size={14} />
                                        <span>{lang === 'id' ? 'Atur & Potong' : 'Adjust & Crop'}</span>
                                      </button>

                                      <button 
                                        type="button"
                                        onClick={async () => {
                                          await deleteLargeItem('tata_custom_wallpaper');
                                          setLocalCustomWallpaper(null);
                                          window.dispatchEvent(new Event('tata_wallpaper_changed'));
                                          showNotificationToast(lang === 'id' ? 'Foto wallpaper dihapus' : 'Wallpaper cleared');
                                        }}
                                        className="py-2 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
                                        title={lang === 'id' ? 'Hapus Foto' : 'Remove Photo'}
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Curated Wallpaper Presets */}
                          <div className={`${cardThemeClass} rounded-2xl p-4 space-y-3`}>
                            <div className="flex items-center justify-between">
                              <span className={`text-xs font-bold ${primaryTextThemeClass} flex items-center gap-1.5`}>
                                <Sparkles size={13} className="text-amber-400" />
                                {lang === 'id' ? 'Koleksi Estetik Siap Pakai' : 'Curated Wallpaper Presets'}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {lang === 'id' ? 'Sentuh untuk pasang' : 'Tap to apply'}
                              </span>
                            </div>

                            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                              {WALLPAPER_PRESETS.map((preset) => {
                                const isSelected = localCustomWallpaper === preset.dataUrl && appTheme === 'wallpaper';
                                return (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => handleSelectPresetWallpaper(preset)}
                                    className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all cursor-pointer text-left ${
                                      isSelected
                                        ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-[1.02]'
                                        : 'border-slate-800 hover:border-slate-700 hover:scale-[1.02]'
                                    }`}
                                    title={lang === 'id' ? preset.nameId : preset.nameEn}
                                  >
                                    <div className="w-full h-16 relative overflow-hidden bg-slate-950">
                                      <img 
                                        src={preset.dataUrl} 
                                        alt={preset.nameEn} 
                                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                        referrerPolicy="no-referrer"
                                      />
                                      <div className="absolute inset-0 bg-slate-950/20" />
                                      {isSelected && (
                                        <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md">
                                            <Check size={12} strokeWidth={3} />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="p-1.5 bg-slate-950/90">
                                      <span className="text-[10px] font-bold text-slate-300 truncate block text-center">
                                        {lang === 'id' ? preset.nameId : preset.nameEn}
                                      </span>
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Adjustment Controls Card */}
                          <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm`}>
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                              <Sliders size={15} className="text-indigo-400" />
                              <h4 className={`text-xs font-bold ${primaryTextThemeClass} uppercase tracking-wider`}>
                                {lang === 'id' ? 'Penyesuaian & Kenyamanan Layar' : 'Screen & Comfort Settings'}
                              </h4>
                            </div>

                            {/* Section 1: Fit & Position */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Fill Mode */}
                              <div className={`p-3 ${innerCardThemeClass} rounded-xl space-y-2`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-300">
                                    {lang === 'id' ? 'Gaya Layar' : 'Fill Mode'}
                                  </span>
                                  <span className="text-[10px] font-semibold text-indigo-400">
                                    {wallpaperFit === 'cover' ? (lang === 'id' ? 'Penuh' : 'Fill') : (lang === 'id' ? 'Utuh' : 'Contain')}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSetWallpaperFit('cover')}
                                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                                      wallpaperFit === 'cover'
                                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-bold ring-1 ring-indigo-500/50'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <Smartphone size={16} className="text-indigo-400 shrink-0" />
                                    <div className="min-w-0">
                                      <span className="text-xs block font-bold leading-none">{lang === 'id' ? 'Penuh' : 'Fill'}</span>
                                      <span className="text-[9px] text-slate-400 truncate block mt-0.5">{lang === 'id' ? 'Isi seluruh layar' : 'Full cover'}</span>
                                    </div>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetWallpaperFit('contain')}
                                    className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex items-center gap-2 ${
                                      wallpaperFit === 'contain'
                                        ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-bold ring-1 ring-indigo-500/50'
                                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                    }`}
                                  >
                                    <ImageIcon size={16} className="text-indigo-400 shrink-0" />
                                    <div className="min-w-0">
                                      <span className="text-xs block font-bold leading-none">{lang === 'id' ? 'Utuh' : 'Contain'}</span>
                                      <span className="text-[9px] text-slate-400 truncate block mt-0.5">{lang === 'id' ? 'Tanpa terpotong' : 'No crop'}</span>
                                    </div>
                                  </button>
                                </div>
                              </div>

                              {/* Position Focus */}
                              <div className={`p-3 ${innerCardThemeClass} rounded-xl space-y-2`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-300">
                                    {lang === 'id' ? 'Fokus Posisi Layar' : 'Position Focus'}
                                  </span>
                                  <span className="text-[10px] font-semibold text-indigo-400">
                                    {localWallpaperPosition === 'top' ? (lang === 'id' ? 'Atas' : 'Top') :
                                     localWallpaperPosition === 'bottom' ? (lang === 'id' ? 'Bawah' : 'Bottom') :
                                     (lang === 'id' ? 'Tengah' : 'Center')}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {[
                                    { id: 'top', labelId: 'Atas', labelEn: 'Top' },
                                    { id: 'center', labelId: 'Tengah', labelEn: 'Mid' },
                                    { id: 'bottom', labelId: 'Bawah', labelEn: 'Btm' },
                                  ].map((pos) => {
                                    const isPosActive = localWallpaperPosition === pos.id;
                                    return (
                                      <button
                                        key={pos.id}
                                        type="button"
                                        onClick={() => handleSetWallpaperPosition(pos.id as any)}
                                        className={`py-2 px-1 rounded-lg border text-center transition-all cursor-pointer ${
                                          isPosActive
                                            ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 font-bold ring-1 ring-indigo-500/50'
                                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                        }`}
                                      >
                                        <span className="text-xs block font-bold">{lang === 'id' ? pos.labelId : pos.labelEn}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Section 2: Dimming & Blur */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {/* Keredupan */}
                              <div className={`p-3 ${innerCardThemeClass} rounded-xl space-y-2`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-300">
                                    {lang === 'id' ? 'Keredupan Latar' : 'Dimming'}
                                  </span>
                                  <span className="text-[11px] font-mono text-indigo-400 font-bold">{wallpaperDim}%</span>
                                </div>
                                <div className="grid grid-cols-4 gap-1.5">
                                  {[
                                    { val: 15, label: '15%' },
                                    { val: 35, label: '35%' },
                                    { val: 55, label: '55%' },
                                    { val: 75, label: '75%' },
                                  ].map((item) => (
                                    <button
                                      key={item.val}
                                      type="button"
                                      onClick={() => handleSetWallpaperDim(item.val)}
                                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                        wallpaperDim === item.val
                                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      {item.label}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Blur */}
                              <div className={`p-3 ${innerCardThemeClass} rounded-xl space-y-2`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-bold text-slate-300">
                                    {lang === 'id' ? 'Efek Blur (Kenyamanan Baca)' : 'Blur Effect'}
                                  </span>
                                  <span className="text-[11px] font-mono text-indigo-400 font-bold">{wallpaperBlur}px</span>
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  {[
                                    { val: 0, labelId: 'Jernih', labelEn: 'Sharp' },
                                    { val: 4, labelId: 'Lembut', labelEn: 'Soft' },
                                    { val: 10, labelId: 'Frosted', labelEn: 'Frosted' },
                                  ].map((item) => (
                                    <button
                                      key={item.val}
                                      type="button"
                                      onClick={() => handleSetWallpaperBlur(item.val)}
                                      className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                                        wallpaperBlur === item.val
                                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                                      }`}
                                    >
                                      {lang === 'id' ? item.labelId : item.labelEn}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Section 3: Accent Colors */}
                            <div className="pt-2 border-t border-slate-800/80 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-300">
                                  {lang === 'id' ? 'Warna Aksen Tombol & Sorotan' : 'UI Button & Highlight Accent'}
                                </span>
                                <span className="text-[10px] text-slate-400">8 {lang === 'id' ? 'Warna' : 'Colors'}</span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { id: 'blue', name: 'Blue', nameId: 'Biru', bg: 'bg-sky-500', border: 'border-sky-400', ring: 'ring-sky-500' },
                                  { id: 'emerald', name: 'Green', nameId: 'Hijau', bg: 'bg-emerald-500', border: 'border-emerald-400', ring: 'ring-emerald-500' },
                                  { id: 'rose', name: 'Red', nameId: 'Merah', bg: 'bg-rose-500', border: 'border-rose-400', ring: 'ring-rose-500' },
                                  { id: 'violet', name: 'Purple', nameId: 'Ungu', bg: 'bg-purple-500', border: 'border-purple-400', ring: 'ring-purple-500' },
                                  { id: 'amber', name: 'Orange', nameId: 'Oranye', bg: 'bg-amber-500', border: 'border-amber-400', ring: 'ring-amber-500' },
                                  { id: 'cyan', name: 'Cyan', nameId: 'Toska', bg: 'bg-cyan-500', border: 'border-cyan-400', ring: 'ring-cyan-500' },
                                  { id: 'pink', name: 'Ecy', nameId: 'Ecy', bg: 'bg-pink-500', border: 'border-pink-400', ring: 'ring-pink-500' },
                                  { id: 'lime', name: 'Lime', nameId: 'Lime', bg: 'bg-lime-500', border: 'border-lime-400', ring: 'ring-lime-500' },
                                ].map((acc) => {
                                  const isSelected = wallpaperAccent === acc.id;
                                  return (
                                    <button
                                      key={acc.id}
                                      type="button"
                                      onClick={() => handleSetWallpaperAccent(acc.id)}
                                      className={`flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer ${
                                        isSelected 
                                          ? `bg-slate-950 border-indigo-500 text-slate-100 font-bold shadow-sm ring-1 ${acc.ring}` 
                                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                                      }`}
                                    >
                                      <span className={`w-3.5 h-3.5 rounded-full ${acc.bg} ${acc.border} border shrink-0`} />
                                      <span className="text-xs truncate">{lang === 'id' ? acc.nameId : acc.name}</span>
                                      {isSelected && <Check size={13} className="ml-auto text-indigo-400 shrink-0" />}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TAB 3: BANNER BERANDA */}
                  {themeTab === 'banner' && (
                    <div className="space-y-4">
                      <div className={`p-4 sm:p-5 ${cardThemeClass} rounded-2xl space-y-4 shadow-sm`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className={`text-sm font-bold ${primaryTextThemeClass}`}>
                              {lang === 'id' ? 'Banner Sambutan Beranda' : 'Home Greeting Banner'}
                            </h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {lang === 'id' ? 'Foto ini tampil eksklusif sebagai latar kartu sambutan di halaman Beranda' : 'This photo exclusively decorates the welcome card on the Home screen'}
                            </p>
                          </div>
                          {localBannerWallpaper ? (
                            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                              {lang === 'id' ? 'Terpasang' : 'Active'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium bg-slate-800 px-2.5 py-0.5 rounded-full shrink-0">
                              {lang === 'id' ? 'Bawaan' : 'Default'}
                            </span>
                          )}
                        </div>

                        {/* Banner Aspect Ratio Preview Card */}
                        <div className="w-full aspect-[2.6/1] max-h-40 rounded-2xl overflow-hidden relative border-2 border-slate-700/80 bg-slate-950 shadow-inner">
                          {localBannerWallpaper ? (
                            <img 
                              src={localBannerWallpaper} 
                              alt="Banner Preview" 
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900/60 flex flex-col items-center justify-center text-slate-400 text-xs font-medium p-4 text-center">
                              <ImageIcon size={22} className="text-indigo-400 mb-1" />
                              <span>{lang === 'id' ? 'Pratinjau Banner Kartu Beranda' : 'Home Banner Card Preview'}</span>
                            </div>
                          )}
                        </div>

                        {/* Banner Action Buttons */}
                        <div className="flex items-center gap-2 pt-1 flex-wrap">
                          <label className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold text-center rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
                            <Upload size={14} />
                            <span>{lang === 'id' ? 'Unggah Foto Banner' : 'Upload Banner Photo'}</span>
                            <input type="file" accept="image/*" onChange={handleBannerWallpaperUpload} className="hidden" />
                          </label>

                          {localBannerWallpaper && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setCropperImageSrc(localBannerWallpaper);
                                  setCropperTarget('banner');
                                  setCropperModalOpen(true);
                                }}
                                className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                              >
                                <Crop size={14} />
                                <span>{lang === 'id' ? 'Atur & Potong' : 'Adjust & Crop'}</span>
                              </button>

                              <button 
                                type="button"
                                onClick={async () => {
                                  await deleteLargeItem('tata_banner_wallpaper');
                                  setLocalBannerWallpaper(null);
                                  window.dispatchEvent(new Event('tata_banner_wallpaper_changed'));
                                  showNotificationToast(lang === 'id' ? 'Banner beranda dihapus' : 'Banner removed');
                                }}
                                className="py-2.5 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer active:scale-95"
                                title={lang === 'id' ? 'Hapus Banner' : 'Remove Banner'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                          {lang === 'id'
                            ? 'Tips: Di halaman Beranda, Anda juga dapat mengetuk 2x kartu sambutan kapan saja untuk langsung memotong dan mengatur ulang posisi fotonya.'
                            : 'Tip: On the Home screen, you can also double-tap the welcome card at any time to immediately crop and reposition the photo.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: SCREEN LOCK (STANDALONE) */}
              {(currentActiveSection === 'screen-lock' || currentActiveSection === 'security') && (
                <div className="space-y-6">
                  {/* Group 1: Kunci PIN Aplikasi */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Kunci Layar Aplikasi' : 'App Passcode Lock'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm space-y-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          {isOrganic ? (
                            <Icon3DLock size={28} />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                              <Lock size={18} />
                            </div>
                          )}
                          <div>
                            <span className={`font-bold text-sm ${primaryTextThemeClass} block`}>
                              {lang === 'id' ? 'Kunci PIN Layar Utama' : 'Passcode PIN Lock'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {appPin 
                                ? (lang === 'id' ? 'Aktif — Layar terlindungi PIN' : 'Active — Screen protected')
                                : (lang === 'id' ? 'Tidak aktif' : 'Inactive')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!appPin ? (
                            <button 
                              onClick={() => {
                                setPinInput('');
                                setPinModalMode('create');
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-sm active:scale-95"
                            >
                              {lang === 'id' ? 'Aktifkan' : 'Enable'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setPinInput('');
                                  setPinModalMode('verify');
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 font-bold text-xs rounded-lg transition-all cursor-pointer"
                              >
                                {lang === 'id' ? 'Ubah' : 'Change'}
                              </button>
                              <button 
                                onClick={() => {
                                  setPinInput('');
                                  setPinModalMode('remove');
                                }}
                                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs rounded-lg transition-all cursor-pointer"
                              >
                                {lang === 'id' ? 'Hapus' : 'Disable'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {appPin && (
                        <div className={`flex items-center justify-between p-3.5 ${innerCardThemeClass} rounded-xl`}>
                          <div className="flex items-start gap-2.5 pr-2">
                            {isOrganic ? (
                              <Icon3DShuffle size={20} className="mt-0.5" />
                            ) : (
                              <Shuffle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
                            )}
                            <div>
                              <h4 className={`text-xs font-bold ${primaryTextThemeClass}`}>
                                {lang === 'id' ? 'Acak Tombol PIN (Anti-Intip)' : 'Scramble Keypad (Anti-Peeking)'}
                              </h4>
                              <p className="text-[11px] text-slate-400 leading-relaxed mt-0.5">
                                {lang === 'id' 
                                  ? 'Acak susunan angka 0-9 saat membuka kunci agar gerakan jari tidak mudah diintip.' 
                                  : 'Shuffles keypad numbers on lock screen for anti-peeking privacy.'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setUseScrambledPin(!useScrambledPin)}
                            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${useScrambledPin ? 'bg-indigo-600' : 'bg-slate-800'}`}
                          >
                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${useScrambledPin ? 'translate-x-4' : 'translate-x-0'}`} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Group 2: Log Riwayat PIN */}
                  {appPin && (
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                        {lang === 'id' ? 'Audit Keamanan' : 'Security Audit'}
                      </span>
                      <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm space-y-3`}>
                        <button 
                          onClick={() => setShowPinHistoryDropdown(!showPinHistoryDropdown)}
                          className="w-full flex items-center justify-between text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-2.5">
                            {isOrganic ? (
                              <Icon3DHistory size={20} />
                            ) : (
                              <HistoryIcon size={16} className="text-indigo-400" />
                            )}
                            <span className="font-bold text-xs text-slate-300">
                              {lang === 'id' ? 'Riwayat & Log Penggantian PIN' : 'PIN History & Replacement Log'}
                            </span>
                          </div>
                          <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 ${showPinHistoryDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showPinHistoryDropdown && (
                          <div className="pt-2 space-y-2.5 border-t border-slate-800/60 animate-in fade-in duration-200">
                            {pinHistory.length === 0 ? (
                              <p className="text-xs text-slate-500 italic text-center py-2">
                                {lang === 'id' ? 'Belum ada riwayat penggantian PIN.' : 'No PIN replacement history yet.'}
                              </p>
                            ) : (
                              pinHistory.map((entry: any, index: number) => {
                                const isCurrent = entry.endDate === null;
                                return (
                                  <div key={entry.id} className={`p-3 rounded-xl border flex flex-col gap-2 transition-all ${isCurrent ? 'bg-indigo-500/5 border-indigo-500/20' : 'bg-slate-950/40 border-slate-800'}`}>
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold uppercase text-indigo-400">PIN #{pinHistory.length - index}</span>
                                      <span className="text-[10px] font-mono text-slate-500">
                                        {new Date(entry.startDate).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US')}
                                      </span>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-lg border border-slate-900">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-1 shrink-0">{lang === 'id' ? 'UJI' : 'TEST'}:</span>
                                      <input 
                                        type="password" 
                                        maxLength={4}
                                        placeholder="••••"
                                        onChange={async (e) => {
                                          const val = e.target.value;
                                          if (val.length === 4) {
                                            const isValid = await verifyPin(val, entry.hashedPin);
                                            if (isValid) {
                                              e.target.style.borderColor = '#10b981';
                                              e.target.style.color = '#10b981';
                                              e.target.value = 'OK ✓';
                                              setTimeout(() => {
                                                e.target.style.borderColor = '';
                                                e.target.style.color = '';
                                                e.target.value = '';
                                              }, 2000);
                                            } else {
                                              e.target.style.borderColor = '#ef4444';
                                              e.target.style.color = '#ef4444';
                                              setTimeout(() => {
                                                e.target.style.borderColor = '';
                                                e.target.style.color = '';
                                                e.target.value = '';
                                              }, 1500);
                                            }
                                          }
                                        }}
                                        className="flex-1 min-w-0 bg-transparent text-center font-mono text-xs text-slate-300 placeholder-slate-700 outline-none transition-colors border border-transparent rounded px-1"
                                      />
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* SECTION: NOTE PIN (STANDALONE) */}
              {(currentActiveSection === 'note-pin' || currentActiveSection === 'security') && (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Keamanan Catatan Rahasia' : 'Secret Notes Security'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm space-y-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          {isOrganic ? (
                            <Icon3DSecretNote size={28} />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                              <FileText size={18} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-sm ${primaryTextThemeClass} block`}>
                                {lang === 'id' ? 'PIN Terpisah untuk Catatan' : 'Separate Note PIN'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                {notePin 
                                  ? (lang === 'id' ? 'PIN Khusus' : 'Dedicated PIN') 
                                  : (lang === 'id' ? 'Pakai PIN Layar' : 'Using App PIN')}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 mt-0.5 block">
                              {notePin 
                                ? (lang === 'id' ? 'Catatan terkunci memiliki kode PIN khusus terpisah.' : 'Locked notes use a distinct standalone PIN.')
                                : (lang === 'id' ? 'Catatan terkunci saat ini mengikuti PIN layar utama.' : 'Locked notes currently share the main passcode PIN.')}
                            </span>
                          </div>
                        </div>

                        <div>
                          {!notePin ? (
                            <button 
                              onClick={() => {
                                setNotePinInput('');
                                setNotePinModalMode('create');
                              }}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl cursor-pointer transition-all shadow-sm active:scale-95"
                            >
                              {lang === 'id' ? 'Buat PIN' : 'Set PIN'}
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setNotePinInput('');
                                  setNotePinModalMode('verify');
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-lg transition-all cursor-pointer"
                              >
                                {lang === 'id' ? 'Ubah' : 'Change'}
                              </button>
                              <button 
                                onClick={() => {
                                  setNotePinInput('');
                                  setNotePinModalMode('remove');
                                }}
                                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-lg transition-all cursor-pointer"
                              >
                                {lang === 'id' ? 'Hapus' : 'Remove'}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-800/60">
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {lang === 'id' 
                            ? 'Catatan yang dikunci tidak akan menampilkan cuplikan teks di daftar catatan beranda hingga PIN diverifikasi.'
                            : 'Locked notes will conceal all snippet text from the note preview until the PIN is verified.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Group 2: Pertanyaan Pemulihan Terpadu (1 Opsi Lupa PIN) */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Opsi Lupa PIN Terpadu' : 'Unified Forgot PIN Option'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm space-y-3`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                            <KeyRound size={18} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-sm ${primaryTextThemeClass} block truncate`}>
                                {lang === 'id' ? 'Pertanyaan Keamanan Terpadu' : 'Unified Security Question'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 ${
                                pinRecoveryAnswer 
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                {pinRecoveryAnswer ? (lang === 'id' ? 'Aktif' : 'Active') : (lang === 'id' ? 'Belum Diatur' : 'Not Set')}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 mt-0.5 block truncate">
                              {pinRecoveryQuestion 
                                ? `"${pinRecoveryQuestion}"` 
                                : (lang === 'id' ? '1 opsi lupa PIN untuk kunci layar & catatan rahasia.' : '1 recovery question for both screen lock & secret notes.')}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setPinQuestionInput(pinRecoveryQuestion || '');
                            setPinAnswerInput('');
                            setShowRecoveryQuestionModal(true);
                          }}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 font-bold text-xs rounded-xl cursor-pointer transition-all shrink-0 active:scale-95 border border-slate-700/60"
                        >
                          {pinRecoveryAnswer ? (lang === 'id' ? 'Ubah' : 'Change') : (lang === 'id' ? 'Atur' : 'Set Up')}
                        </button>
                      </div>

                      <div className="pt-2.5 border-t border-slate-800/60 text-[11px] text-slate-400 leading-relaxed">
                        {lang === 'id' 
                          ? 'Kunci layar awal masuk dan kunci catatan menggunakan 1 opsi lupa PIN yang sama. Jika Anda lupa PIN, jawab pertanyaan keamanan ini untuk membuka akses.' 
                          : 'The app entrance PIN and note PIN share the exact same 1 recovery question. Answer this question to regain access if you ever forget either PIN.'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: DATABASE & BACKUP */}
              {currentActiveSection === 'backup' && (
                <div className="space-y-6">
                  {/* Group 1: Cadangan & Pemulihan Data Manual */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Cadangan & Pemulihan Data' : 'Data Backup & Restore'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm`}>
                      <button 
                        onClick={handleExportClick}
                        className="w-full flex items-center justify-between p-3.5 sm:p-4 bg-slate-950/70 hover:bg-slate-950 border border-slate-800 rounded-2xl transition-all text-left cursor-pointer active:scale-95 group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          {isOrganic ? (
                            <Icon3DDatabase size={28} />
                          ) : isLiteMode ? (
                            <LiteStickerIcon variant="database" size="md" />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                              <Database size={20} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className={`font-bold text-sm ${primaryTextThemeClass} group-hover:text-indigo-400 transition-colors`}>
                              {lang === 'id' ? 'Kelola Cadangan & Pemulihan (.json)' : 'Manage Backup & Restore (.json)'}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                              {lang === 'id' ? 'Ekspor cadangan aman atau pulihkan catatan, tugas & transaksi' : 'Export secure backup or restore notes, tasks & records'}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0 flex items-center text-slate-500 group-hover:text-indigo-400 transition-colors">
                          <ChevronRight size={18} />
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Group 2: Cadangan Otomatis */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Cadangan Otomatis & Keamanan' : 'Auto Backup & Vault'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm`}>
                      {renderAutoBackupSettings()}
                    </div>
                  </div>

                  {/* Group 3: Zona Bahaya */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-rose-400 uppercase tracking-wider px-3 block flex items-center gap-1.5">
                      <AlertTriangle size={13} /> {lang === 'id' ? 'Zona Bahaya' : 'Danger Zone'}
                    </span>
                    <div className="bg-rose-950/20 border border-rose-900/30 rounded-2xl p-4 sm:p-5 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="font-bold text-xs text-rose-300">{lang === 'id' ? 'Hapus Seluruh Data & Reset' : 'Hard Reset All Data'}</span>
                          <span className="text-[11px] text-slate-400 mt-0.5">{lang === 'id' ? 'Menghapus database lokal, catatan, tugas, dan keuangan secara permanen.' : 'Permanently wipe all local records and settings.'}</span>
                        </div>
                        <button
                          onClick={() => setShowResetConfirm(true)}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm shrink-0"
                        >
                          {lang === 'id' ? 'Reset Data' : 'Reset Data'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: NOTIFICATIONS & ALARMS (STANDALONE) */}
              {currentActiveSection === 'notifications' && (
                <div className="space-y-6">
                  {/* Group 1: Status & Uji Notifikasi */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Pemberitahuan & Alarm' : 'Notifications & Alarms'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm space-y-4`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                          {isOrganic ? (
                            <Icon3DBell size={28} />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                              <Bell size={18} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-sm ${primaryTextThemeClass} block`}>
                                {lang === 'id' ? 'Izin Notifikasi Browser' : 'Browser Notification Permission'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                notifPermission === 'granted' 
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                  : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              }`}>
                                {notifPermission === 'granted' ? (lang === 'id' ? 'Aktif / Diizinkan' : 'Granted') : (lang === 'id' ? 'Belum Diizinkan' : 'Not Granted')}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 mt-0.5 block">
                              {lang === 'id' ? 'Digunakan untuk pengingat jadwal tugas, acara kalender & catatan.' : 'Used for task deadlines, calendar event alarms & reminders.'}
                            </span>
                          </div>
                        </div>

                        <div>
                          {notifPermission !== 'granted' ? (
                            <button 
                              onClick={async () => {
                                if ('Notification' in window) {
                                  const perm = await Notification.requestPermission();
                                  setNotifPermission(perm);
                                  if (perm === 'granted') {
                                    showNotificationToast(lang === 'id' ? 'Izin notifikasi diberikan!' : 'Notification permission granted!');
                                  } else {
                                    showNotificationToast(lang === 'id' ? 'Izin notifikasi ditolak.' : 'Notification permission denied.');
                                  }
                                }
                              }}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-sm active:scale-95"
                            >
                              {lang === 'id' ? 'Minta Izin' : 'Grant Permission'}
                            </button>
                          ) : (
                            <button 
                              onClick={triggerTestNotif}
                              className="px-4 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-bold text-xs rounded-xl cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                            >
                              {isOrganic ? <Icon3DBell size={15} /> : <Bell size={13} />}
                              <span>{lang === 'id' ? 'Uji Alarm & Bunyi' : 'Test Alarm'}</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Uji Notifikasi Langsung & Latar Belakang */}
                      <div className="pt-3 border-t border-slate-800/60 flex flex-col gap-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <span className={`text-xs font-bold ${primaryTextThemeClass} block`}>
                              {lang === 'id' ? 'Uji Coba Notifikasi Langsung' : 'Live Test Notification'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {lang === 'id' ? 'Kirimkan notifikasi banner dan bunyi alarm sekarang.' : 'Send a banner alert and play the chime tone now.'}
                            </span>
                          </div>
                          <button
                            onClick={triggerTestNotif}
                            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                          >
                            {isOrganic ? <Icon3DBell size={15} /> : <Bell size={13} />}
                            <span>{lang === 'id' ? 'Uji Sekarang' : 'Test Now'}</span>
                          </button>
                        </div>

                        {/* Uji Latar Belakang (5 Detik) */}
                        <div className="pt-2.5 border-t border-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold ${primaryTextThemeClass} block`}>
                                {lang === 'id' ? 'Uji Notifikasi Latar Belakang (5 Detik)' : 'Background Test (5s Delay)'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                PWA
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {lang === 'id' 
                                ? 'Tekan tombol ini lalu segera kunci HP atau keluar dari aplikasi untuk menguji Service Worker.' 
                                : 'Press this then lock phone or leave app to test Service Worker background trigger.'}
                            </span>
                          </div>
                          <button
                            onClick={triggerBgTestNotif}
                            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl cursor-pointer transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1.5 shrink-0"
                          >
                            <Clock size={13} />
                            <span>{lang === 'id' ? 'Uji Latar Belakang (5s)' : 'Test Background (5s)'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Group 2: Status Diagnostik PWA & Privasi */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Diagnostik Sistem Notifikasi PWA' : 'PWA Notification Health Check'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm space-y-3`}>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        <div className={`p-2.5 rounded-xl ${innerCardThemeClass} flex items-center justify-between sm:flex-col sm:items-start gap-1`}>
                          <span className="text-[11px] text-slate-400">{lang === 'id' ? 'Izin Browser' : 'Browser Permission'}</span>
                          <span className={`text-xs font-bold ${notifPermission === 'granted' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {notifPermission === 'granted' ? (lang === 'id' ? 'Diizinkan' : 'Granted') : (lang === 'id' ? 'Belum Diizinkan' : 'Not Granted')}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-xl ${innerCardThemeClass} flex items-center justify-between sm:flex-col sm:items-start gap-1`}>
                          <span className="text-[11px] text-slate-400">{lang === 'id' ? 'Service Worker' : 'Service Worker'}</span>
                          <span className="text-xs font-bold text-emerald-400">
                            {lang === 'id' ? 'Aktif & Tersinkron' : 'Active & Synced'}
                          </span>
                        </div>

                        <div className={`p-2.5 rounded-xl ${innerCardThemeClass} flex items-center justify-between sm:flex-col sm:items-start gap-1`}>
                          <span className="text-[11px] text-slate-400">{lang === 'id' ? 'Pusat Privasi' : 'Privacy Center'}</span>
                          <span className="text-xs font-bold text-indigo-400">
                            {lang === 'id' ? '100% Offline-First' : '100% Offline-First'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={16} className="text-indigo-400 shrink-0" />
                          <span className="text-xs font-bold text-indigo-300">
                            {lang === 'id' 
                              ? 'Kenapa Tata Mengirim Notifikasi Tanpa Server Cloud?' 
                              : 'Why Tata Delivers Notifications Without Cloud Servers'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {lang === 'id'
                            ? 'Website lain menggunakan server eksternal yang terus membaca catatan & jadwal pribadi Anda. Tata berpegang teguh pada Offline-First & Privasi Mutlak: semua jadwal disimpan secara lokal di perangkat Anda, dan Service Worker PWA bertindak sebagai alarm mandiri tanpa kebocoran data keluar.'
                            : 'Other websites rely on 24/7 cloud servers that hold your personal tasks. Tata is 100% Offline-First: all schedules stay strictly on your device, powered locally by PWA Service Worker without privacy compromises.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Group 3: Tips Notifikasi & Baterai OS */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Petunjuk Pengaturan OS (Agar Notifikasi Tepat Waktu)' : 'OS Setup Guide (On-Time Delivery)'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm space-y-2.5`}>
                      <div className="flex items-start gap-2.5">
                        <span className="text-indigo-400 font-bold text-xs shrink-0">1.</span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {lang === 'id'
                            ? 'Pasang Tata ke Layar Utama (PWA Install) untuk memberikan hak akses penjadwalan latar belakang penuh ke sistem operasi.'
                            : 'Install Tata to your Home Screen (PWA) to unlock full background scheduling in the OS.'}
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="text-indigo-400 font-bold text-xs shrink-0">2.</span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {lang === 'id'
                            ? 'Pengaturan Baterai Android: Buka Info Aplikasi Tata (atau Chrome) di Setelan HP -> Penggunaan Baterai -> Pilih "Tidak Dibatasi (Unrestricted)" agar HP tidak mematikan timer saat layar mati.'
                            : 'Android Battery Saver: Open App Info for Tata/Chrome in Settings -> Battery -> Select "Unrestricted" so the OS does not freeze the timer when screen is locked.'}
                        </p>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <span className="text-indigo-400 font-bold text-xs shrink-0">3.</span>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {lang === 'id'
                            ? 'Pastikan mode "Jangan Ganggu (Do Not Disturb)" atau hening tidak membisukan banner pemberitahuan dari Tata.'
                            : 'Ensure Do Not Disturb or Silent mode does not silence notification banners from Tata.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION: ABOUT TATA & PRIVACY (UNIFIED) */}
              {(currentActiveSection === 'about' || currentActiveSection === 'privacy') && (
                <div className="space-y-6">
                  {/* 1. Hero Brand Card */}
                  <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-5 sm:p-6 shadow-md">
                    <div className="absolute top-0 right-0 -mt-8 -mr-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden border border-slate-700/60 bg-slate-900 flex items-center justify-center shrink-0 shadow-lg">
                        <img src="/icon.png" alt="Tata Logo" className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="font-black text-xl text-slate-50 tracking-tight">Tata</h2>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            v5.1.0 Stable
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            100% Offline-First
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-indigo-300 mt-0.5">
                          {lang === 'id' ? 'Karya Independen oleh Noto (@noto.grow)' : 'Independent Work by Noto (@noto.grow)'}
                        </p>
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                      {lang === 'id' 
                        ? 'Tata adalah ruang produktivitas yang tenang, privat, dan bebas distraksi. Diciptakan dengan filosofi tanpa database cloud, tanpa pelacak pihak ketiga, dan 100% kepemilikan data ada di tangan Anda.'
                        : 'Tata is a calm, distraction-free productivity space. Built upon zero cloud databases, no third-party trackers, and 100% user data ownership on your device.'}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/40 border border-slate-800/50">
                        <Lock size={14} className="text-emerald-400 shrink-0" />
                        <div className="text-[11px] font-medium text-slate-300">
                          {lang === 'id' ? '100% Offline (Lokal)' : '100% Offline (Local)'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/40 border border-slate-800/50">
                        <ShieldCheck size={14} className="text-sky-400 shrink-0" />
                        <div className="text-[11px] font-medium text-slate-300">
                          {lang === 'id' ? 'Tanpa Server Cloud' : 'Zero Cloud Server'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/40 border border-slate-800/50">
                        <Database size={14} className="text-indigo-400 shrink-0" />
                        <div className="text-[11px] font-medium text-slate-300">
                          {lang === 'id' ? 'Data Milik Anda' : 'User-Owned Data'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Status Privasi & Audit Forensik Lokal */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Status Privasi & Kedaulatan Data' : 'Privacy Status & Data Sovereignty'}
                    </span>
                    <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                      <div className="flex items-center gap-3">
                        {isOrganic ? (
                          <Icon3DShield size={28} />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0 shadow-inner">
                            <ShieldCheck size={20} />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-emerald-300">
                              {lang === 'id' ? 'Isolasi Lokal Penuh & Terenkripsi' : 'Full Local Isolation & Encrypted'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                              Verifikasi Aktif
                            </span>
                          </div>
                          <span className="text-xs text-slate-300 leading-relaxed block mt-0.5">
                            {lang === 'id'
                              ? 'Catatan, tugas, riwayat keuangan, dan foto tersimpan eksklusif di memori lokal peramban Anda.'
                              : 'Notes, tasks, financial records, and photos are strictly stored in local device memory.'}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-500/20 text-center">
                        <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block font-medium">Cloud Server</span>
                          <span className="text-xs font-black text-emerald-400">0 Byte (Nol)</span>
                        </div>
                        <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block font-medium">Penyimpanan</span>
                          <span className="text-xs font-black text-sky-400">Local Only</span>
                        </div>
                        <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block font-medium">Tata AI</span>
                          <span className="text-xs font-black text-purple-400">Stateless BYOK</span>
                        </div>
                        <div className="p-2 bg-slate-900/60 rounded-xl border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block font-medium">Cadangan</span>
                          <span className="text-xs font-black text-amber-400">AES-256 File</span>
                        </div>
                      </div>
                    </div>

                    {/* Uji Forensik Privasi */}
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 mt-2`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className={`font-bold text-xs ${primaryTextThemeClass} block`}>
                            {lang === 'id' ? 'Uji Forensik Isolasi Data Perangkat' : 'Device Forensic Isolation Audit'}
                          </span>
                          <span className="text-[11px] text-slate-400 leading-relaxed block mt-0.5">
                            {lang === 'id'
                              ? 'Pindai database lokal perangkat untuk membuktikan data tetap terisolasi dan tidak ada kebocoran transmisi background.'
                              : 'Scan local device database to verify strict data isolation and zero background leaks.'}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleRunPrivacyAudit}
                          disabled={isAuditingPrivacy}
                          className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0 active:scale-95 shadow-md shadow-emerald-500/10"
                        >
                          <RefreshCw size={14} className={isAuditingPrivacy ? 'animate-spin' : ''} />
                          <span>{isAuditingPrivacy ? (lang === 'id' ? 'Memindai...' : 'Auditing...') : (lang === 'id' ? 'Jalankan Audit Privasi' : 'Run Privacy Audit')}</span>
                        </button>
                      </div>

                      {privacyAuditResult && (
                        <div className="bg-slate-950/80 border border-emerald-500/30 rounded-xl p-3.5 space-y-3 text-xs animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                            <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                              <ShieldCheck size={14} />
                              {lang === 'id' ? 'Hasil Audit: 100% Lolos Isolasi Lokal' : 'Audit Result: 100% Passed Local Isolation'}
                            </span>
                            <span className="text-[10px] text-slate-400">{privacyAuditResult.timestamp}</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-slate-300">
                            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                              <span className="text-[10px] text-slate-400 block">{lang === 'id' ? 'Total Entri Lokal' : 'Total Local Items'}</span>
                              <span className={`font-bold ${primaryTextThemeClass}`}>{privacyAuditResult.totalRecords} {lang === 'id' ? 'item' : 'items'}</span>
                            </div>
                            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                              <span className="text-[10px] text-slate-400 block">{lang === 'id' ? 'Ukuran LocalStorage' : 'LocalStorage Size'}</span>
                              <span className="font-bold text-sky-400">~{privacyAuditResult.localStorageSizeKB} KB</span>
                            </div>
                            <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800">
                              <span className="text-[10px] text-slate-400 block">{lang === 'id' ? 'Proteksi PIN' : 'PIN Security'}</span>
                              <span className="font-bold text-purple-400">{privacyAuditResult.pinSecurity}</span>
                            </div>
                          </div>

                          <ul className="space-y-1.5 pt-1 text-[11px] text-slate-300">
                            <li className="flex items-center gap-2">
                              <span className="text-emerald-400 font-bold">✓</span>
                              <span>{privacyAuditResult.networkStatus}</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-emerald-400 font-bold">✓</span>
                              <span>{lang === 'id' ? 'Tata AI: Model Stateless (Hanya dipanggil saat Anda menekan tombol)' : 'Tata AI: Stateless Model (Invoked only upon explicit button click)'}</span>
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="text-emerald-400 font-bold">✓</span>
                              <span>{lang === 'id' ? 'Penyimpanan Foto & Dokumen: Diproses lokal di RAM/IndexedDB' : 'Photo & Document storage: Processed locally in RAM/IndexedDB'}</span>
                            </li>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Dokumen Resmi & White Paper */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Dokumen Resmi & Pembaruan' : 'Official Documents & Updates'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl overflow-hidden divide-y divide-slate-800/60 shadow-sm`}>
                      {/* White Paper & Kebijakan Privasi Lengkap */}
                      <button 
                        onClick={() => setShowPrivacyPolicy(true)}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          {isOrganic ? (
                            <Icon3DShield size={24} />
                          ) : isLiteMode ? (
                            <LiteStickerIcon variant="shield" size="sm" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                              <ShieldCheck size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-[14px] ${primaryTextThemeClass} block truncate`}>
                                {lang === 'id' ? 'White Paper & Laporan Privasi Lengkap' : 'White Paper & Full Privacy Report'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                                White Paper
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {lang === 'id' ? 'Buku putih lengkap: arsitektur offline, tier Lite/Pro/Pro Max, akun Google & privasi' : 'Complete white paper: offline architecture, Lite/Pro/Pro Max tiers, Google account & privacy'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>

                      {/* Pesan dari Pengembang */}
                      <button 
                        onClick={() => setShowDevMessageModal(true)}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          {isOrganic ? (
                            <Icon3DHeart size={24} />
                          ) : isLiteMode ? (
                            <LiteStickerIcon variant="heart" size="sm" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                              <Heart size={16} className="fill-rose-400/40" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className={`font-semibold text-[14px] ${primaryTextThemeClass} block truncate`}>
                              {lang === 'id' ? 'Pesan dari Pengembang (Noto)' : 'Developer Message (Noto)'}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {lang === 'id' ? 'Sepatah kata hangat tentang visi & misi awal mula dibuatnya Tata' : 'A warm note about the vision and initial purpose behind Tata'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>

                      {/* Catatan Rilis & Fitur Baru */}
                      <button 
                        onClick={() => setShowUpdateNotes(true)}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          {isOrganic ? (
                            <Icon3DInfo size={24} />
                          ) : isLiteMode ? (
                            <LiteStickerIcon variant="info" size="sm" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                              <Info size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className={`font-semibold text-[14px] ${primaryTextThemeClass} block truncate`}>
                              {lang === 'id' ? 'Catatan Rilis & Fitur Baru (v5.1.0)' : 'Release Notes & New Features (v5.1.0)'}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {lang === 'id' ? 'Daftar pembaruan, optimasi performa & penyempurnaan sistem Tata' : 'Update changelog, performance enhancements & refinements'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* 4. Kontrol Izin Perangkat & Telemetri */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Kontrol Izin Perangkat & Telemetri' : 'Device Permissions & Telemetry'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm space-y-4`}>
                      {/* Kamera */}
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {isOrganic ? (
                            <Icon3DCamera size={24} />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center shrink-0">
                              <Camera size={16} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-xs ${primaryTextThemeClass}`}>
                                {lang === 'id' ? 'Izin Kamera (Pemindai Lokal)' : 'Camera Access (Local Scanner)'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
                                {lang === 'id' ? 'Lokal Only' : 'Local Only'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 leading-tight block">
                              {lang === 'id' ? 'Hanya diakses saat memindai dokumen; foto diproses eksklusif di memori lokal.' : 'Accessed only during document scan; processed strictly locally.'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notifikasi */}
                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {isOrganic ? (
                            <Icon3DBell size={24} />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                              <Bell size={16} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-xs ${primaryTextThemeClass}`}>
                                {lang === 'id' ? 'Izin Notifikasi Pengingat' : 'Reminder Notifications'}
                              </span>
                              {notifPermission === 'granted' && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                  {lang === 'id' ? 'Diizinkan' : 'Granted'}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 leading-tight block">
                              {lang === 'id' ? 'Alarm berjalan di peramban tanpa server push cloud.' : 'Alarms run in-browser without cloud push servers.'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={triggerTestNotif}
                          className="px-3 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-bold text-xs rounded-xl transition-all cursor-pointer shrink-0 active:scale-95"
                        >
                          {notifPermission === 'granted' ? (lang === 'id' ? 'Uji Alarm' : 'Test Alert') : (lang === 'id' ? 'Minta Izin' : 'Grant')}
                        </button>
                      </div>

                      {/* Telemetri Toggle */}
                      <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {isOrganic ? (
                            <Icon3DShuffle size={24} />
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                              <ShieldCheck size={16} />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-xs ${primaryTextThemeClass}`}>
                                {lang === 'id' ? 'Statistik anonim penggunaan aplikasi' : 'Anonymous app usage statistics'}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${!disableTelemetry ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                {!disableTelemetry ? (lang === 'id' ? 'Aktif' : 'Active') : (lang === 'id' ? 'Mati' : 'Off')}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 leading-tight block">
                              {lang === 'id'
                                ? 'Hanya menghitung statistik pengunjung web via Vercel Analytics (aktif secara default). Anda dapat mematikannya kapan saja. Data pribadi Anda (catatan, tugas, keuangan, mood) tetap 100% tersimpan lokal di perangkat.'
                                : 'Only counts visitor numbers via Vercel Analytics (enabled by default). You can turn it off anytime. Your private data (notes, tasks, finances, moods) strictly stays 100% locally on your device.'}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={toggleTelemetry}
                          aria-label={lang === 'id' ? 'Toggle Statistik anonim penggunaan aplikasi' : 'Toggle anonymous app usage statistics'}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!disableTelemetry ? 'bg-emerald-500' : 'bg-slate-800'}`}
                        >
                          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${!disableTelemetry ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                      </div>

                      {/* Browser Storage Tips */}
                      <div className="pt-3 border-t border-slate-800/60">
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 text-amber-200">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-400 mt-0.5" />
                          <div>
                            <h4 className="font-bold text-xs text-amber-400 mb-0.5">{lang === 'id' ? 'Tips Keamanan Memori Browser' : 'Browser Storage Best Practices'}</h4>
                            <p className="text-[11px] leading-relaxed text-slate-300">
                              {lang === 'id'
                                ? 'Menghapus histori peramban aman, namun jangan hapus "Data Situs / Local Storage" tanpa mengekspor cadangan file Tata Anda terlebih dahulu.'
                                : 'Clearing browser history is safe. Do not wipe "Site Data / Local Storage" without exporting your Tata backup file first.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Komunitas & Kontak Resmi */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Komunitas & Kontak Resmi (@noto.grow)' : 'Community & Official Contact (@noto.grow)'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl overflow-hidden divide-y divide-slate-800/60 shadow-sm`}>
                      {/* Instagram Resmi */}
                      <a 
                        href="https://www.instagram.com/noto.grow/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          {isOrganic ? (
                            <Icon3DInstagram size={24} />
                          ) : isLiteMode ? (
                            <LiteStickerIcon variant="instagram" size="sm" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center shrink-0">
                              <Instagram size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className={`font-semibold text-[14px] ${primaryTextThemeClass} block truncate`}>
                              Instagram Resmi (@noto.grow)
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {lang === 'id' ? 'Ikuti info pembaruan terkini & tips produktivitas dari Noto' : 'Follow latest updates & productivity tips from Noto'}
                            </span>
                          </div>
                        </div>
                        <ExternalLink size={15} className="text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
                      </a>

                      {/* Email Pengembang */}
                      <a 
                        href="mailto:notofpg@gmail.com"
                        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          {isOrganic ? (
                            <Icon3DMail size={24} />
                          ) : isLiteMode ? (
                            <LiteStickerIcon variant="mail" size="sm" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center shrink-0">
                              <Mail size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className={`font-semibold text-[14px] ${primaryTextThemeClass} block truncate`}>
                              {lang === 'id' ? 'Email Pengembang' : 'Developer Email'}
                            </span>
                            <span className="text-[11px] text-slate-400 block truncate">
                              notofpg@gmail.com • {lang === 'id' ? 'Saran, masukan, atau laporan kendala' : 'Feedback, inquiries, or bug reports'}
                            </span>
                          </div>
                        </div>
                        <ExternalLink size={15} className="text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
                      </a>

                      {/* Undang & Bagikan Tata */}
                      <button 
                        onClick={() => setShowInviteModal(true)}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-800/50 transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          {isOrganic ? (
                            <Icon3DShare size={24} />
                          ) : isLiteMode ? (
                            <LiteStickerIcon variant="heart" size="sm" />
                          ) : (
                            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
                              <Share2 size={16} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-[14px] ${primaryTextThemeClass} block truncate`}>
                                {lang === 'id' ? 'Undang Teman & Bagikan Tata' : 'Invite Friends & Share Tata'}
                              </span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                Free
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {lang === 'id' ? 'Bagikan link Tata via WhatsApp, Telegram, atau barcode QR' : 'Share Tata link via WhatsApp, Telegram, or QR barcode'}
                            </span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-slate-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                      </button>
                    </div>
                  </div>

                  {/* Copyright note */}
                  <div className="pt-2 pb-6 text-center text-xs text-slate-500 leading-relaxed space-y-1">
                    <p className="font-medium text-slate-400">Tata v5.1.0 • Dibuat oleh Noto (@noto.grow)</p>
                    <p className="text-[11px] text-slate-500">100% Offline-First • Privasi Mutlak • Data Milik Anda Penuh</p>
                  </div>
                </div>
              )}

              {/* SECTION: TATA AI SETTINGS */}
              {currentActiveSection === 'ai' && (
                <div className="space-y-6">
                  {/* Group 1: Privacy Notice */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Filosofi Privasi AI' : 'AI Privacy Philosophy'}
                    </span>
                    <div className="bg-indigo-950/20 border border-indigo-900/40 rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                      <div className="flex items-center gap-2">
                        {isOrganic ? (
                          <Icon3DShield size={18} />
                        ) : (
                          <ShieldCheck size={16} className="text-indigo-400" />
                        )}
                        <span className="font-bold text-xs text-indigo-300">
                          {lang === 'id' ? '100% Offline-First & Kendali Penuh Pengguna' : '100% Offline-First & User Controlled'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {lang === 'id' 
                          ? 'Tata dirancang offline-first. Catatan, tugas, keuangan, dan kalender Anda disimpan 100% secara lokal di perangkat. Fitur AI bersifat opsional dan hanya memproses teks saat Anda menekan tombol perintah AI secara sadar.'
                          : 'Tata is built offline-first. Your notes, tasks, finances, and calendar stay 100% on your device. AI features are purely optional and only process text upon your explicit action.'}
                      </p>
                    </div>
                  </div>

                  {/* Group 2: Mesin & API Key */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Konfigurasi Mesin AI' : 'AI Engine Configuration'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm space-y-4`}>
                      {/* Engine Indicator */}
                      <div className={`flex items-center justify-between p-3.5 ${innerCardThemeClass} rounded-xl`}>
                        <div className="flex items-center gap-3">
                          {isOrganic ? (
                            <Icon3DTataAI size={24} />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                              <Bot size={18} />
                            </div>
                          )}
                          <div>
                            <span className={`font-bold text-xs ${primaryTextThemeClass} block`}>
                              {(() => {
                                const key = testApiKey.trim() || geminiApiKey?.trim() || '';
                                if (!key) return 'Gemini Flash (Server Default)';
                                if (key.startsWith('xai-') || key.toLowerCase().includes('grok')) return 'xAI Grok (grok-2-latest)';
                                if (key.startsWith('gsk_')) return 'Groq (llama-3.3-70b-versatile)';
                                if (key.startsWith('sk-ant-')) return 'Anthropic (claude-3-5-sonnet)';
                                if (key.startsWith('sk-or-')) return 'OpenRouter (Multi-model)';
                                if (key.startsWith('sk-')) return 'OpenAI (gpt-4o-mini)';
                                return 'Google Gemini (BYOK)';
                              })()}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {lang === 'id' ? 'Mendukung: Gemini, Grok, Groq, OpenAI, Claude, OpenRouter' : 'Supports: Gemini, Grok, Groq, OpenAI, Claude, OpenRouter'}
                            </span>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase rounded">
                          {geminiApiKey ? (lang === 'id' ? 'BYOK Aktif' : 'BYOK Active') : (lang === 'id' ? 'Gratis' : 'Free')}
                        </span>
                      </div>

                      {/* API Key Field */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between px-1">
                          <label className="text-xs font-bold text-slate-300">
                            {lang === 'id' ? 'API Key Pribadi' : 'Personal API Key'}
                          </label>
                          {geminiApiKey && (
                            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              {lang === 'id' ? 'Tersimpan Lokal' : 'Saved Locally'}
                            </span>
                          )}
                        </div>
                        <div className="relative">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={testApiKey}
                            onChange={(e) => {
                              setTestApiKey(e.target.value);
                              setConnectionStatus('idle');
                              setConnectionError(null);
                            }}
                            className={`w-full ${innerCardThemeClass} rounded-xl pl-3.5 pr-10 py-2.5 ${primaryTextThemeClass} text-xs outline-none focus:border-indigo-500 transition-all placeholder-slate-600`}
                            placeholder={lang === 'id' ? 'Masukkan Key (AIzaSy..., xai-..., gsk_..., sk-...)...' : 'Enter API Key (AIzaSy..., xai-..., gsk_..., sk-...)...'}
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1"
                          >
                            {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                          </button>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      {connectionStatus !== 'idle' && (
                        <div className={`p-3 rounded-xl border text-xs leading-relaxed transition-all ${
                          connectionStatus === 'testing' ? 'bg-indigo-500/5 border-indigo-500/20 text-indigo-300' :
                          connectionStatus === 'connected' ? 'bg-emerald-500/5 border-emerald-500/25 text-emerald-300' :
                          'bg-rose-500/5 border-rose-500/25 text-rose-300'
                        }`}>
                          <div className="flex items-center gap-2 font-bold">
                            {connectionStatus === 'testing' && <RefreshCw size={13} className="animate-spin text-indigo-400" />}
                            {connectionStatus === 'connected' && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                            {connectionStatus === 'error' && <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />}
                            <span>
                              {connectionStatus === 'testing' && (lang === 'id' ? 'Menguji Koneksi...' : 'Testing Connection...')}
                              {connectionStatus === 'connected' && (
                                <>
                                  {lang === 'id' ? `Terhubung (${aiProvider || 'Key Valid'})` : `Connected (${aiProvider || 'Valid Key'})`}
                                  {aiModel && <span className="ml-2 px-1.5 py-0.5 rounded bg-emerald-500/20 text-[10px] text-emerald-400 font-mono">{aiModel}</span>}
                                </>
                              )}
                              {connectionStatus === 'error' && (lang === 'id' ? 'Koneksi Gagal' : 'Connection Failed')}
                            </span>
                          </div>
                          {connectionStatus === 'error' && connectionError && (
                            <p className="text-[11px] text-slate-400 mt-1 bg-slate-950/50 p-2 rounded border border-slate-800">{connectionError}</p>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2.5 pt-1">
                        <button
                          onClick={async () => {
                            if (!testApiKey.trim()) {
                              setConnectionStatus('error');
                              setConnectionError(lang === 'id' ? 'Masukkan API Key terlebih dahulu!' : 'Please enter an API Key first!');
                              return;
                            }

                            setConnectionStatus('testing');
                            setConnectionError(null);

                            try {
                              const requestUrl = `/api/ai/test-key`;
                              const response = await fetch(requestUrl, {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json',
                                  ...(tataAccount?.sessionToken ? { 'Authorization': `Bearer ${tataAccount.sessionToken}` } : {})
                                },
                                body: JSON.stringify({
                                  apiKey: testApiKey.trim(),
                                  lang
                                })
                              });

                              if (response.ok) {
                                const data = await response.json().catch(() => ({}));
                                setConnectionStatus('connected');
                                setAiProvider(data.provider || 'unknown');
                                setAiModel(data.model || null);
                                showNotificationToast(lang === 'id' ? `Koneksi Berhasil! (${data.provider})` : `Connection Successful! (${data.provider})`);
                              } else {
                                const responseBodyText = await response.text().catch(() => "");
                                let errorData: any = {};
                                try {
                                  errorData = JSON.parse(responseBodyText);
                                } catch (_) {}

                                let errMsg = errorData?.error || `API Error (${response.status})`;
                                if (response.status === 404 && !errorData?.error) {
                                  errMsg = lang === 'id'
                                    ? `Error 404: Endpoint API atau Model tidak ditemukan.`
                                    : `Error 404: API Endpoint or Model not found.`;
                                }
                                setConnectionStatus('error');
                                setConnectionError(errMsg);
                              }
                            } catch (err: any) {
                              setConnectionStatus('error');
                              setConnectionError(err.message || (lang === 'id' ? 'Gagal menghubungi API' : 'Failed to reach API'));
                            }
                          }}
                          disabled={connectionStatus === 'testing'}
                          className="flex-1 min-w-[110px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-500/15 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                        >
                          {connectionStatus === 'testing' ? (
                            <>
                              <RefreshCw size={13} className="animate-spin" />
                              {lang === 'id' ? 'Menguji...' : 'Testing...'}
                            </>
                          ) : (
                            lang === 'id' ? 'Uji Koneksi' : 'Test'
                          )}
                        </button>

                        <button
                          onClick={() => {
                            if (!testApiKey.trim()) {
                              showNotificationToast(lang === 'id' ? 'Harap masukkan API Key terlebih dahulu!' : 'Please enter an API Key first!');
                              return;
                            }
                            setGeminiApiKey(testApiKey.trim());
                            setConnectionStatus('connected');
                            showNotificationToast(lang === 'id' ? 'API Key berhasil disimpan secara lokal!' : 'API Key successfully saved locally!');
                          }}
                          disabled={!testApiKey.trim() || connectionStatus === 'testing'}
                          className="flex-1 min-w-[110px] px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm disabled:opacity-50"
                        >
                          {lang === 'id' ? 'Simpan Key' : 'Save Key'}
                        </button>

                        {geminiApiKey && (
                          <button
                            onClick={() => {
                              setGeminiApiKey(null);
                              setTestApiKey('');
                              setConnectionStatus('idle');
                              setConnectionError(null);
                              showNotificationToast(lang === 'id' ? 'API Key berhasil dihapus!' : 'API Key successfully removed!');
                            }}
                            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {isOrganic ? (
                              <Icon3DTrash size={15} />
                            ) : (
                              <Trash2 size={13} />
                            )}
                            {lang === 'id' ? 'Hapus' : 'Delete'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Group 3: Panduan API Key */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 block">
                      {lang === 'id' ? 'Panduan & Bantuan' : 'Guide & Tutorial'}
                    </span>
                    <div className={`${cardThemeClass} rounded-2xl p-4 sm:p-5 shadow-sm space-y-3`}>
                      <button
                        onClick={() => setShowGuide(!showGuide)}
                        className="w-full flex items-center justify-between text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5">
                          {isOrganic ? (
                            <Icon3DHelp size={18} />
                          ) : (
                            <HelpCircle size={16} className="text-indigo-400" />
                          )}
                          <span className={`font-bold text-xs ${primaryTextThemeClass} group-hover:text-indigo-400 transition-colors`}>
                            {lang === 'id' ? 'Cara Mendapatkan API Key Gemini Gratis' : 'How to Get a Free Gemini API Key'}
                          </span>
                        </div>
                        <ChevronDown size={16} className={`text-slate-500 transition-transform duration-200 ${showGuide ? 'rotate-180' : ''}`} />
                      </button>

                      {showGuide && (
                        <div className="pt-2 border-t border-slate-800/60 space-y-2.5 animate-in fade-in duration-200">
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {lang === 'id' 
                              ? 'Google menyediakan API Key gratis untuk model Gemini 1.5 Flash melalui Google AI Studio:'
                              : 'Google provides free API Key access for Gemini models through Google AI Studio:'}
                          </p>
                          
                          <div className="space-y-2">
                            {[
                              {
                                step: '1',
                                text_id: 'Buka Google AI Studio dengan mengklik tombol di bawah ini:',
                                text_en: 'Open Google AI Studio by clicking the link button below:',
                                action: (
                                  <a
                                    href="https://aistudio.google.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-bold mt-1 hover:bg-indigo-500/20 transition-all cursor-pointer"
                                  >
                                    <span>Google AI Studio</span>
                                    <ExternalLink size={10} />
                                  </a>
                                )
                              },
                              {
                                step: '2',
                                text_id: 'Masuk (Sign in) menggunakan Akun Google Anda.',
                                text_en: 'Sign in using your Google Account.'
                              },
                              {
                                step: '3',
                                text_id: 'Klik tombol "Get API Key" di navigasi halaman.',
                                text_en: 'Click "Get API Key" on the page navigation.'
                              },
                              {
                                step: '4',
                                text_id: 'Klik "Create API Key in new project" dan salin kode API Key Anda.',
                                text_en: 'Click "Create API Key in new project" and copy your key.'
                              },
                              {
                                step: '5',
                                text_id: 'Tempelkan ke kolom input di atas, lalu klik "Uji Koneksi" & "Simpan Key".',
                                text_en: 'Paste it into the field above, then click "Test" & "Save Key".'
                              }
                            ].map((item, idx) => (
                              <div key={idx} className={`flex gap-2.5 items-start ${innerCardThemeClass} p-2.5 rounded-xl border`}>
                                <span className="w-4 h-4 rounded bg-indigo-500/10 text-indigo-400 font-bold text-[10px] flex items-center justify-center shrink-0 border border-indigo-500/25 mt-0.5">
                                  {item.step}
                                </span>
                                <div className="text-[11px] text-slate-300 leading-relaxed">
                                  <p>{lang === 'id' ? item.text_id : item.text_en}</p>
                                  {item.action}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* POPUP MODAL: SECURITY PIN ENTRY / VERIFY / CHANGE / REMOVE */}
      {pinModalMode && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className={`${modalThemeClass} p-6 rounded-[2rem] w-full max-w-sm shadow-2xl relative ${pinError ? 'animate-pulse border-red-500/50' : ''}`}>
            {isOrganic ? (
              <div className="flex justify-center mb-3">
                <Icon3DLock size={36} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Lock size={22} />
              </div>
            )}
            <h3 className="text-xl font-bold text-slate-50 mb-1.5 text-center">
              {pinModalMode === 'create' && t('createPin')}
              {(pinModalMode === 'verify' || pinModalMode === 'remove') && t('verifyPin')}
              {pinModalMode === 'change' && t('changePin')}
            </h3>
            <p className="text-xs text-slate-400 mb-5 text-center leading-normal">
              {t('enter4Digits')}
            </p>

            {/* PREMIUM SEGMENTED 4-BOX PIN INPUT (Eliminates the 2-digit bug!) */}
            <div className="relative w-full max-w-[240px] mx-auto mb-5">
              {/* Invisible real text field overlay */}
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={4}
                autoFocus
                value={pinInput}
                onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handlePinSubmit();
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {/* Premium boxes */}
              <div className="flex justify-between gap-3.5 pointer-events-none">
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = index < pinInput.length;
                  const isCurrent = index === pinInput.length;
                  return (
                    <div 
                      key={index}
                      className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-3xl font-extrabold transition-all duration-150 ${
                        isFilled 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                          : isCurrent
                            ? 'border-indigo-500/50 bg-slate-950/50 text-indigo-300'
                            : 'border-slate-800 bg-slate-950/20 text-slate-600'
                      }`}
                    >
                      {isFilled ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {(pinModalMode === 'create' || pinModalMode === 'change') && (
              <div className="space-y-3 mb-6">
                <input
                  type="text"
                  value={pinQuestionInput}
                  onChange={e => setPinQuestionInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3 text-slate-50 text-sm outline-none focus:border-indigo-500/60 transition-all placeholder-slate-600"
                  placeholder={t('securityQuestionPlaceholder')}
                />
                <input
                  type="text"
                  value={pinAnswerInput}
                  onChange={e => setPinAnswerInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3 text-slate-50 text-sm outline-none focus:border-indigo-500/60 transition-all placeholder-slate-600"
                  placeholder={t('securityAnswerPlaceholder')}
                />
              </div>
            )}
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setPinModalMode(null);
                  setPinInput('');
                  setPinQuestionInput('');
                  setPinAnswerInput('');
                  setPinError(false);
                }}
                className="flex-1 py-3 rounded-2xl text-sm font-bold text-slate-400 hover:text-slate-200 bg-slate-950/40 border border-transparent hover:bg-slate-800/40 transition-all cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button 
                disabled={pinInput.length !== 4 || ((pinModalMode === 'create' || pinModalMode === 'change') && (!pinQuestionInput.trim() || !pinAnswerInput.trim()))}
                onClick={handlePinSubmit}
                className={`flex-1 py-3 rounded-2xl text-sm font-extrabold transition-all cursor-pointer ${pinInput.length === 4 && (!['create', 'change'].includes(pinModalMode) || (pinQuestionInput.trim() && pinAnswerInput.trim())) ? 'bg-indigo-400 hover:bg-indigo-300 text-zinc-950 shadow-md shadow-indigo-500/20' : 'bg-slate-850 text-slate-500 cursor-not-allowed opacity-50'}`}
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: NOTE PIN ENTRY / VERIFY / CHANGE / REMOVE */}
      {notePinModalMode && (
        <div className="fixed inset-0 z-[250] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`${modalThemeClass} p-6 rounded-[2rem] w-full max-w-sm shadow-2xl relative ${notePinError ? 'animate-pulse border-red-500/50' : ''}`}>
            {isOrganic ? (
              <div className="flex justify-center mb-3">
                <Icon3DSecretNote size={36} />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <Lock size={22} />
              </div>
            )}
            <h3 className="text-base font-black text-slate-50 mb-1 text-center">
              {notePinModalMode === 'create' && (lang === 'id' ? 'Buat PIN Khusus Catatan' : 'Create Note PIN')}
              {(notePinModalMode === 'verify' || notePinModalMode === 'remove') && (lang === 'id' ? 'Verifikasi PIN Catatan' : 'Verify Note PIN')}
              {notePinModalMode === 'change' && (lang === 'id' ? 'Ubah PIN Catatan' : 'Change Note PIN')}
            </h3>
            <p className="text-xs text-slate-400 mb-5 text-center leading-normal">
              {lang === 'id' ? 'Masukkan 4 digit PIN khusus untuk membuka catatan terkunci' : 'Enter 4-digit PIN dedicated to unlock notes'}
            </p>

            <div className="relative w-full max-w-[240px] mx-auto mb-6">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                maxLength={4}
                autoFocus
                value={notePinInput}
                onChange={e => setNotePinInput(e.target.value.replace(/\D/g, ''))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleNotePinSubmit();
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex justify-between gap-3.5 pointer-events-none">
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = index < notePinInput.length;
                  const isCurrent = index === notePinInput.length;
                  return (
                    <div 
                      key={index}
                      className={`w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-3xl font-extrabold transition-all duration-150 ${
                        isFilled 
                          ? 'border-amber-500 bg-amber-500/10 text-amber-400' 
                          : isCurrent
                            ? 'border-amber-500/50 bg-slate-950/50 text-amber-300'
                            : 'border-slate-800 bg-slate-950/20 text-slate-600'
                      }`}
                    >
                      {isFilled ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {(notePinModalMode === 'verify' || notePinModalMode === 'remove') && (
              <button
                type="button"
                onClick={() => {
                  setShowForgotNotePinModal(true);
                  setForgotNoteAnswerInput('');
                  setForgotNoteAnswerError(false);
                }}
                className="text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors border-b border-transparent hover:border-amber-400/40 py-0.5 cursor-pointer block mx-auto mb-4"
              >
                {lang === 'id' ? 'Lupa PIN Catatan?' : 'Forgot Note PIN?'}
              </button>
            )}
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setNotePinModalMode(null);
                  setNotePinInput('');
                  setNotePinError(false);
                }}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-950/40 border border-transparent hover:bg-slate-800/40 transition-all cursor-pointer"
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button 
                disabled={notePinInput.length !== 4}
                onClick={handleNotePinSubmit}
                className={`flex-1 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${notePinInput.length === 4 ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-md shadow-amber-500/20' : 'bg-slate-850 text-slate-500 cursor-not-allowed opacity-50'}`}
              >
                {lang === 'id' ? 'Simpan' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: FORGOT NOTE PIN RECOVERY IN SETTINGS */}
      {showForgotNotePinModal && (
        <div className="fixed inset-0 z-[270] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`${modalThemeClass} p-6 rounded-[2rem] w-full max-w-sm shadow-2xl relative ${forgotNoteAnswerError ? 'animate-pulse border-red-500/50' : ''}`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <KeyRound size={22} />
            </div>
            <h3 className="text-base font-black text-slate-50 mb-1 text-center">
              {lang === 'id' ? 'Pemulihan PIN Catatan' : 'Note PIN Recovery'}
            </h3>

            {!pinRecoveryAnswer ? (
              <div className="space-y-4 pt-2">
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-left space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{lang === 'id' ? 'Pertanyaan Keamanan Belum Diatur' : 'No Security Question Set'}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {lang === 'id'
                      ? 'Pertanyaan pemulihan keamanan belum diatur pada sistem PIN Anda, sehingga PIN catatan tidak dapat diverifikasi lewat pertanyaan keamanan.'
                      : 'No security recovery question was configured on your PIN system, so the note PIN cannot be recovered via security answer.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForgotNotePinModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  {lang === 'id' ? 'Saya Mengerti' : 'I Understand'}
                </button>
              </div>
            ) : (
              <div className="pt-2">
                <p className="text-xs text-slate-400 mb-3 text-center leading-relaxed">
                  {lang === 'id'
                    ? 'Jawab pertanyaan keamanan akun Tata Anda (sama dengan opsi lupa PIN awal masuk).'
                    : 'Answer your Tata account security question (same as app entrance PIN recovery).'}
                </p>

                {pinRecoveryQuestion && (
                  <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl mb-3 text-left">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-widest mb-1 block">
                      {lang === 'id' ? 'Pertanyaan Keamanan' : 'Security Question'}
                    </span>
                    <p className={`text-xs sm:text-sm font-medium ${primaryTextThemeClass} leading-snug`}>{pinRecoveryQuestion}</p>
                  </div>
                )}

                <input
                  type="text"
                  autoFocus
                  value={forgotNoteAnswerInput}
                  onChange={e => {
                    setForgotNoteAnswerInput(e.target.value);
                    setForgotNoteAnswerError(false);
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleForgotNotePinInSettings();
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-50 mb-3 outline-none focus:border-amber-500/60 transition-colors"
                  placeholder={lang === 'id' ? "Jawaban Anda..." : "Your Answer..."}
                />

                {forgotNoteAnswerError && (
                  <p className="text-xs text-rose-400 font-semibold mb-3 text-left">
                    {lang === 'id' ? 'Jawaban keamanan salah. Coba lagi.' : 'Incorrect security answer. Try again.'}
                  </p>
                )}

                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotNotePinModal(false);
                      setForgotNoteAnswerInput('');
                      setForgotNoteAnswerError(false);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer bg-slate-950/40"
                  >
                    {lang === 'id' ? 'Batal' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotNotePinInSettings}
                    disabled={!forgotNoteAnswerInput.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold disabled:opacity-50 transition-colors cursor-pointer shadow-md shadow-amber-500/20"
                  >
                    {lang === 'id' ? 'Verifikasi' : 'Verify'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* POPUP MODAL: UNIFIED RECOVERY QUESTION SETUP */}
      {showRecoveryQuestionModal && (
        <div className="fixed inset-0 z-[260] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className={`${modalThemeClass} p-6 rounded-[2rem] w-full max-w-sm shadow-2xl relative`}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
              <KeyRound size={22} />
            </div>
            <h3 className="text-base font-black text-slate-50 mb-1 text-center">
              {lang === 'id' ? 'Pertanyaan Pemulihan Terpadu' : 'Unified Recovery Question'}
            </h3>
            <p className="text-xs text-slate-400 mb-5 text-center leading-normal">
              {lang === 'id' 
                ? 'Satu pertanyaan pemulihan ini digunakan untuk memulihkan PIN Layar Utama maupun PIN Catatan jika Anda lupa.' 
                : 'This single recovery question is used to recover both App Screen PIN and Note PIN if forgotten.'}
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">
                  {lang === 'id' ? 'Pertanyaan Keamanan' : 'Security Question'}
                </label>
                <input
                  type="text"
                  value={pinQuestionInput}
                  onChange={e => setPinQuestionInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3 text-slate-50 text-sm outline-none focus:border-amber-500/60 transition-all placeholder-slate-600"
                  placeholder={lang === 'id' ? "Contoh: Nama hewan peliharaan pertama Anda?" : "e.g. What is your first pet's name?"}
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5 pl-1">
                  {lang === 'id' ? 'Jawaban Anda' : 'Your Answer'}
                </label>
                <input
                  type="text"
                  value={pinAnswerInput}
                  onChange={e => setPinAnswerInput(e.target.value)}
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-2xl px-4 py-3 text-slate-50 text-sm outline-none focus:border-amber-500/60 transition-all placeholder-slate-600"
                  placeholder={lang === 'id' ? "Masukkan jawaban rahasia..." : "Enter your secret answer..."}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button"
                onClick={() => {
                  setShowRecoveryQuestionModal(false);
                  setPinQuestionInput('');
                  setPinAnswerInput('');
                }}
                className="flex-1 py-3 rounded-2xl text-xs font-bold text-slate-400 hover:text-slate-200 bg-slate-950/40 border border-transparent hover:bg-slate-800/40 transition-all cursor-pointer"
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button 
                type="button"
                disabled={!pinQuestionInput.trim() || !pinAnswerInput.trim()}
                onClick={async () => {
                  if (!pinQuestionInput.trim() || !pinAnswerInput.trim()) return;
                  setPinRecoveryQuestion(pinQuestionInput.trim());
                  const hashed = await createPinHash(pinAnswerInput.trim().toLowerCase());
                  setPinRecoveryAnswer(hashed);
                  setShowRecoveryQuestionModal(false);
                  setPinQuestionInput('');
                  setPinAnswerInput('');
                  showNotificationToast(lang === 'id' ? 'Pertanyaan pemulihan terpadu berhasil disimpan!' : 'Unified recovery question saved!');
                }}
                className={`flex-1 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                  pinQuestionInput.trim() && pinAnswerInput.trim() 
                    ? 'bg-amber-400 hover:bg-amber-300 text-zinc-950 shadow-md shadow-amber-500/20' 
                    : 'bg-slate-850 text-slate-500 cursor-not-allowed opacity-50'
                }`}
              >
                {lang === 'id' ? 'Simpan' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center p-4 z-[200] animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-red-400 mb-2">{t('reset')}</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {t('resetConfirmDescription')}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-50 bg-slate-800 transition-colors cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={async () => {
                  setIsResetting(true);
                  setShowResetConfirm(false);
                  await clearAllData();
                  setTimeout(() => {
                    window.location.reload();
                  }, 800);
                }}
                className="px-4 py-2 rounded-xl text-white text-sm font-bold bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"
              >
                {t('yesReset')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: MANUAL EXPORT / IMPORT CONFIRMATION */}
      <BackupRestoreModal
        isOpen={Boolean(backupModalMode)}
        initialMode={backupModalMode || 'export'}
        onClose={() => setBackupModalMode(null)}
        lang={lang as any}
        appTheme={appTheme}
        isOrganic={isOrganic}
        isLiteMode={isLiteMode}
      />

      {/* POPUP MODAL: VERIFY AUTO BACKUP PIN */}
      {showAutoBackupEnableVerify && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${modalThemeClass} rounded-3xl p-6 max-w-sm w-full flex flex-col relative overflow-hidden shadow-2xl text-left`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="text-center mb-5">
              {isOrganic ? (
                <div className="flex justify-center mb-3">
                  <Icon3DLock size={36} />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                  <Lock size={20} />
                </div>
              )}
              <h3 className={`text-base font-extrabold ${primaryTextThemeClass} font-sans`}>{lang === 'id' ? 'Verifikasi PIN Cadangan' : 'Verify Backup PIN'}</h3>
              <p className="text-[11px] text-slate-400 leading-normal mt-1.5">{lang === 'id' ? 'Masukkan PIN Cadangan Otomatis Anda untuk menyimpan perubahan frekuensi.' : 'Please enter your Auto-Backup PIN to confirm frequency alteration.'}</p>
            </div>

            {/* Segmented PIN input */}
            <div className="relative w-full max-w-[240px] mx-auto mb-5">
              <input
                ref={enableVerifyInputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                value={autoBackupEnableVerifyPin}
                onChange={e => setAutoBackupEnableVerifyPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && autoBackupEnableVerifyPin.length === 4) {
                    handleAutoBackupVerifySubmit();
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex justify-between gap-3 pointer-events-none">
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = index < autoBackupEnableVerifyPin.length;
                  const isCurrent = index === autoBackupEnableVerifyPin.length;
                  return (
                    <div 
                      key={index}
                      className={`w-11 h-13 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-150 ${
                        isFilled 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                          : isCurrent
                            ? 'border-indigo-500/50 bg-slate-950/50 text-indigo-300'
                            : 'border-slate-800 bg-slate-950/20 text-slate-600'
                      }`}
                    >
                      {isFilled ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {autoBackupEnableVerifyError && (
              <p className="text-[10px] text-red-400 font-bold text-center mb-4 animate-pulse">{lang === 'id' ? 'PIN Cadangan salah!' : 'Incorrect Backup PIN!'}</p>
            )}

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => {
                  setShowAutoBackupEnableVerify(false);
                  setAutoBackupEnableVerifyPin('');
                  setPendingAutoBackupFreq(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs font-bold text-slate-400 transition-all cursor-pointer border border-slate-800/85"
              >
                {t('cancel')}
              </button>
              <button 
                type="button" 
                onClick={handleAutoBackupVerifySubmit}
                disabled={autoBackupEnableVerifyPin.length !== 4}
                className={`flex-1 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg ${
                  autoBackupEnableVerifyPin.length === 4
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/20'
                    : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed shadow-none border border-slate-850'
                }`}
              >
                {lang === 'id' ? 'Verifikasi' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: SETUP AUTO BACKUP PIN */}
      {showAutoBackupPinSetup && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${modalThemeClass} rounded-3xl p-6 max-w-sm w-full flex flex-col relative overflow-hidden shadow-2xl text-left`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="text-center mb-5">
              {isOrganic ? (
                <div className="flex justify-center mb-3">
                  <Icon3DKey size={36} />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                  <Key size={20} />
                </div>
              )}
              <h3 className={`text-base font-extrabold ${primaryTextThemeClass} font-sans`}>
                {autoBackupPinSetupStep === 1 
                  ? (lang === 'id' ? 'Buat PIN Cadangan Otomatis' : 'Create Auto-Backup PIN')
                  : (lang === 'id' ? 'Konfirmasi PIN Cadangan' : 'Confirm Auto-Backup PIN')}
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal mt-1.5">
                {autoBackupPinSetupStep === 1 
                  ? (lang === 'id' 
                      ? 'Buat PIN 4 digit terpisah khusus untuk mengenkripsi file cadangan otomatis Anda.' 
                      : 'Create a separate 4-digit PIN used specifically to encrypt your automatic backup files.')
                  : (lang === 'id' 
                      ? 'Masukkan kembali PIN yang baru saja Anda buat untuk konfirmasi.' 
                      : 'Re-enter the PIN you just created to confirm.')}
              </p>
            </div>

            {/* Segmented PIN input */}
            <div className="relative w-full max-w-[240px] mx-auto mb-5">
              <input
                ref={pinSetupInputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                value={autoBackupPinSetupStep === 1 ? autoBackupPinSetupPin : autoBackupPinSetupConfirm}
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (autoBackupPinSetupStep === 1) setAutoBackupPinSetupPin(val);
                  else setAutoBackupPinSetupConfirm(val);
                }}
                onKeyDown={e => {
                  const currentVal = autoBackupPinSetupStep === 1 ? autoBackupPinSetupPin : autoBackupPinSetupConfirm;
                  if (e.key === 'Enter' && currentVal.length === 4) {
                    handleAutoBackupPinSetupSubmit();
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex justify-between gap-3 pointer-events-none">
                {[0, 1, 2, 3].map((index) => {
                  const currentVal = autoBackupPinSetupStep === 1 ? autoBackupPinSetupPin : autoBackupPinSetupConfirm;
                  const isFilled = index < currentVal.length;
                  const isCurrent = index === currentVal.length;
                  return (
                    <div 
                      key={index}
                      className={`w-11 h-13 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-150 ${
                        isFilled 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                          : isCurrent
                            ? 'border-indigo-500/50 bg-slate-950/50 text-indigo-300'
                            : 'border-slate-800 bg-slate-950/20 text-slate-600'
                      }`}
                    >
                      {isFilled ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {autoBackupPinSetupError && (
              <p className="text-[10px] text-red-400 font-bold text-center mb-4 animate-pulse">{lang === 'id' ? 'PIN konfirmasi tidak cocok!' : 'Confirmation PIN mismatch!'}</p>
            )}

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => {
                  if (autoBackupPinSetupStep === 2) {
                    setAutoBackupPinSetupStep(1);
                    setAutoBackupPinSetupConfirm('');
                  } else {
                    setShowAutoBackupPinSetup(false);
                    setAutoBackupPinSetupPin('');
                    setAutoBackupPinSetupConfirm('');
                    setPendingAutoBackupFreq(null);
                  }
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs font-bold text-slate-400 transition-all cursor-pointer border border-slate-800/85"
              >
                {autoBackupPinSetupStep === 2 ? (lang === 'id' ? 'Kembali' : 'Back') : t('cancel')}
              </button>
              <button 
                type="button" 
                onClick={handleAutoBackupPinSetupSubmit}
                disabled={(autoBackupPinSetupStep === 1 ? autoBackupPinSetupPin.length : autoBackupPinSetupConfirm.length) !== 4}
                className={`flex-1 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg ${
                  (autoBackupPinSetupStep === 1 ? autoBackupPinSetupPin.length : autoBackupPinSetupConfirm.length) === 4
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/20'
                    : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed shadow-none border border-slate-850'
                }`}
              >
                {autoBackupPinSetupStep === 1 ? (lang === 'id' ? 'Lanjut' : 'Next') : (lang === 'id' ? 'Simpan' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: CHANGE AUTO BACKUP PIN */}
      {showAutoBackupPinChange && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${modalThemeClass} rounded-3xl p-6 max-w-sm w-full flex flex-col relative overflow-hidden shadow-2xl text-left`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="text-center mb-5">
              {isOrganic ? (
                <div className="flex justify-center mb-3">
                  <Icon3DKey size={36} />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                  <Key size={20} />
                </div>
              )}
              <h3 className={`text-base font-extrabold ${primaryTextThemeClass} font-sans`}>
                {autoBackupPinChangeStep === 1 
                  ? (lang === 'id' ? 'Verifikasi PIN Lama' : 'Verify Old PIN')
                  : autoBackupPinChangeStep === 2
                    ? (lang === 'id' ? 'Masukkan PIN Baru' : 'Enter New PIN')
                    : (lang === 'id' ? 'Konfirmasi PIN Baru' : 'Confirm New PIN')}
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal mt-1.5">
                {autoBackupPinChangeStep === 1 
                  ? (lang === 'id' ? 'Masukkan PIN Cadangan Otomatis aktif saat ini.' : 'Enter your active Auto-Backup PIN.')
                  : autoBackupPinChangeStep === 2
                    ? (lang === 'id' ? 'Masukkan PIN 4 digit baru khusus cadangan berikutnya.' : 'Enter a new 4-digit PIN.')
                    : (lang === 'id' ? 'Masukkan kembali PIN baru untuk konfirmasi.' : 'Re-enter your new PIN to confirm.')}
              </p>
            </div>

            {/* Segmented PIN input */}
            <div className="relative w-full max-w-[240px] mx-auto mb-5">
              <input
                ref={pinChangeInputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                value={
                  autoBackupPinChangeStep === 1 
                    ? autoBackupPinChangeCurrent 
                    : autoBackupPinChangeStep === 2 
                      ? autoBackupPinChangeNew 
                      : autoBackupPinChangeConfirm
                }
                onChange={e => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (autoBackupPinChangeStep === 1) setAutoBackupPinChangeCurrent(val);
                  else if (autoBackupPinChangeStep === 2) setAutoBackupPinChangeNew(val);
                  else setAutoBackupPinChangeConfirm(val);
                }}
                onKeyDown={e => {
                  const currentVal = autoBackupPinChangeStep === 1 
                    ? autoBackupPinChangeCurrent 
                    : autoBackupPinChangeStep === 2 
                      ? autoBackupPinChangeNew 
                      : autoBackupPinChangeConfirm;
                  if (e.key === 'Enter' && currentVal.length === 4) {
                    handleAutoBackupPinChangeSubmit();
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex justify-between gap-3 pointer-events-none">
                {[0, 1, 2, 3].map((index) => {
                  const currentVal = autoBackupPinChangeStep === 1 
                    ? autoBackupPinChangeCurrent 
                    : autoBackupPinChangeStep === 2 
                      ? autoBackupPinChangeNew 
                      : autoBackupPinChangeConfirm;
                  const isFilled = index < currentVal.length;
                  const isCurrent = index === currentVal.length;
                  return (
                    <div 
                      key={index}
                      className={`w-11 h-13 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-150 ${
                        isFilled 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                          : isCurrent
                            ? 'border-indigo-500/50 bg-slate-950/50 text-indigo-300'
                            : 'border-slate-800 bg-slate-950/20 text-slate-600'
                      }`}
                    >
                      {isFilled ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {autoBackupPinChangeError && (
              <p className="text-[10px] text-red-400 font-bold text-center mb-4 animate-pulse">
                {autoBackupPinChangeErrorType === 'wrong_current' 
                  ? (lang === 'id' ? 'PIN Cadangan Lama salah!' : 'Incorrect Old PIN!')
                  : (lang === 'id' ? 'PIN Baru konfirmasi tidak cocok!' : 'Confirmation PIN mismatch!')}
              </p>
            )}

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => {
                  if (autoBackupPinChangeStep === 3) {
                    setAutoBackupPinChangeStep(2);
                    setAutoBackupPinChangeConfirm('');
                  } else if (autoBackupPinChangeStep === 2) {
                    setAutoBackupPinChangeStep(1);
                    setAutoBackupPinChangeNew('');
                  } else {
                    setShowAutoBackupPinChange(false);
                    setAutoBackupPinChangeCurrent('');
                  }
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs font-bold text-slate-400 transition-all cursor-pointer border border-slate-800/85"
              >
                {autoBackupPinChangeStep > 1 ? (lang === 'id' ? 'Kembali' : 'Back') : t('cancel')}
              </button>
              <button 
                type="button" 
                onClick={handleAutoBackupPinChangeSubmit}
                disabled={
                  (autoBackupPinChangeStep === 1 
                    ? autoBackupPinChangeCurrent.length 
                    : autoBackupPinChangeStep === 2 
                      ? autoBackupPinChangeNew.length 
                      : autoBackupPinChangeConfirm.length) !== 4
                }
                className={`flex-1 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg ${
                  (autoBackupPinChangeStep === 1 
                    ? autoBackupPinChangeCurrent.length 
                    : autoBackupPinChangeStep === 2 
                      ? autoBackupPinChangeNew.length 
                      : autoBackupPinChangeConfirm.length) === 4
                    ? 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/20'
                    : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed shadow-none border border-slate-850'
                }`}
              >
                {autoBackupPinChangeStep === 1 
                  ? (lang === 'id' ? 'Verifikasi' : 'Verify')
                  : autoBackupPinChangeStep === 2
                    ? (lang === 'id' ? 'Lanjut' : 'Next')
                    : (lang === 'id' ? 'Simpan' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: RESET / DISABLE AUTO BACKUP PIN */}
      {showAutoBackupPinDisableModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`${modalThemeClass} rounded-3xl p-6 max-w-sm w-full flex flex-col relative overflow-hidden shadow-2xl text-left`}>
            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl pointer-events-none" />
            <div className="text-center mb-5">
              {isOrganic ? (
                <div className="flex justify-center mb-3">
                  <Icon3DLock size={36} />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto mb-3">
                  <Lock size={20} />
                </div>
              )}
              <h3 className={`text-base font-extrabold ${primaryTextThemeClass} font-sans`}>
                {lang === 'id' ? 'Reset / Nonaktifkan PIN Cadangan' : 'Reset / Disable Backup PIN'}
              </h3>
              <p className="text-[11px] text-slate-400 leading-normal mt-1.5">
                {lang === 'id'
                  ? 'Masukkan PIN Cadangan Otomatis Anda saat ini untuk menonaktifkan enkripsi PIN pada file cadangan.'
                  : 'Enter your current Auto-Backup PIN to remove PIN encryption from backup files.'}
              </p>
            </div>

            {/* Segmented PIN input */}
            <div className="relative w-full max-w-[240px] mx-auto mb-4">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoFocus
                value={autoBackupDisablePin}
                onChange={e => setAutoBackupDisablePin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={e => {
                  if (e.key === 'Enter' && autoBackupDisablePin.length === 4) {
                    handleAutoBackupPinDisableSubmit();
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="flex justify-between gap-3 pointer-events-none">
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = index < autoBackupDisablePin.length;
                  const isCurrent = index === autoBackupDisablePin.length;
                  return (
                    <div 
                      key={index}
                      className={`w-11 h-13 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all duration-150 ${
                        isFilled 
                          ? 'border-rose-500 bg-rose-500/10 text-rose-400' 
                          : isCurrent
                            ? 'border-rose-500/50 bg-slate-950/50 text-rose-300'
                            : 'border-slate-800 bg-slate-950/20 text-slate-600'
                      }`}
                    >
                      {isFilled ? '•' : ''}
                    </div>
                  );
                })}
              </div>
            </div>

            {autoBackupDisableError && (
              <p className="text-[10px] text-red-400 font-bold text-center mb-3 animate-pulse">
                {lang === 'id' ? 'PIN Cadangan salah!' : 'Incorrect Backup PIN!'}
              </p>
            )}

            <div className="text-center mb-5">
              <button
                type="button"
                onClick={handleAutoBackupPinForceReset}
                className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline transition-colors cursor-pointer"
              >
                {lang === 'id' ? 'Lupa PIN? Reset Paksa PIN Cadangan' : 'Forgot PIN? Force Reset Backup PIN'}
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => {
                  setShowAutoBackupPinDisableModal(false);
                  setAutoBackupDisablePin('');
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 rounded-xl text-xs font-bold text-slate-400 transition-all cursor-pointer border border-slate-800/85"
              >
                {t('cancel')}
              </button>
              <button 
                type="button" 
                onClick={handleAutoBackupPinDisableSubmit}
                disabled={autoBackupDisablePin.length !== 4}
                className={`flex-1 py-2.5 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg ${
                  autoBackupDisablePin.length === 4
                    ? 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                    : 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed shadow-none border border-slate-850'
                }`}
              >
                {lang === 'id' ? 'Nonaktifkan' : 'Disable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PRIVACY POLICY */}
      {showPrivacyPolicy && (
        <PrivacyPolicyModal isOpen={showPrivacyPolicy} onClose={() => setShowPrivacyPolicy(false)} lang={lang} t={t} />
      )}

      {/* MODAL: UPDATE NOTES / ABOUT APP */}
      {showUpdateNotes && (
        <UpdateNotesModal isOpen={showUpdateNotes} onClose={() => setShowUpdateNotes(false)} lang={lang} t={t} />
      )}

      {/* MODAL: DEVELOPER MESSAGE */}
      <DeveloperMessageModal isOpen={showDevMessageModal} onClose={() => setShowDevMessageModal(false)} lang={lang} appTheme={appTheme} />

      {/* MODAL: INVITE FRIENDS / SHARE TATA */}
      <InviteFriendsModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} lang={lang} appTheme={appTheme} />

      {/* MODAL: IMAGE CROPPER */}
      <ImageCropperModal
        isOpen={cropperModalOpen}
        imageSrc={cropperImageSrc}
        targetType={cropperTarget}
        title={
          cropperTarget === 'banner'
            ? (lang === 'id' ? 'Atur & Potong Foto Banner' : 'Adjust Banner Box Photo')
            : (lang === 'id' ? 'Atur & Sesuaikan Wallpaper' : 'Adjust & Fit Wallpaper')
        }
        lang={lang}
        onCancel={() => {
          setCropperModalOpen(false);
          setCropperImageSrc(null);
        }}
        onCropComplete={handleCropSave}
      />

      {/* MODAL: PWA TROUBLESHOOT & REINSTALL GUIDE */}
      {showPwaTroubleshoot && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[200] animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className={`text-base font-bold ${primaryTextThemeClass} flex items-center gap-2`}>
                {isOrganic ? <Icon3DHelp size={22} /> : <HelpCircle size={18} className="text-amber-400" />}
                {lang === 'id' ? 'Bantuan Gagal Install / Reset PWA' : 'PWA Reinstallation Support'}
              </h3>
              <button 
                onClick={() => setShowPwaTroubleshoot(false)}
                className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center text-xs transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 text-slate-300 text-xs sm:text-sm leading-relaxed">
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-[11px] sm:text-xs">
                <strong>{lang === 'id' ? 'Masalah "Aplikasi Sudah Terpasang"?' : 'Why "App Already Installed" happens?'}</strong>
                <p className="mt-1">
                  {lang === 'id' 
                    ? 'Saat Anda menghapus PWA dari layar utama, browser sering kali belum menghapus registrasi internal aplikasi. Ini membuat browser menolak instalasi ulang karena mendeteksi aplikasi lama masih terdaftar.'
                    : 'When you delete a PWA from your home screen, the browser often keeps the internal registration active, causing the browser to block reinstallation.'}
                </p>
              </div>

              {/* ACTION 1: FORCE RESET PWA SERVICE WORKERS */}
              <div className="space-y-2">
                <h4 className={`font-bold ${primaryTextThemeClass} text-xs uppercase tracking-wider`}>
                  {lang === 'id' ? 'Solusi 1: Setel Ulang Service Worker & Cache' : 'Solution 1: Reset Service Worker & Cache'}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {lang === 'id'
                    ? 'Menghapus instan registrasi cache dan service worker lama untuk memaksa browser memicu ulang opsi instalasi PWA.'
                    : 'Clears old registration and cache so the browser can trigger the install option again.'}
                </p>
                <button
                  onClick={async () => {
                    await handleForceResetPwa();
                    setShowPwaTroubleshoot(false);
                  }}
                  className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-md transition-all active:scale-[0.98] text-xs flex items-center justify-center gap-1.5"
                >
                  <RefreshCw size={14} className="animate-spin-slow" />
                  {lang === 'id' ? 'Setel Ulang Registrasi PWA (Aman)' : 'Reset PWA Registration (Safe)'}
                </button>
              </div>

              {/* ACTION 2: CLEAR ALL COOKIES & SITE DATA */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80">
                <h4 className={`font-bold ${primaryTextThemeClass} text-xs uppercase tracking-wider`}>
                  {lang === 'id' ? 'Solusi 2: Bersihkan Data Manual di Perangkat' : 'Solution 2: Manual Uninstall on Device'}
                </h4>
                <div className="space-y-2 text-[11px] sm:text-xs text-slate-400">
                  <p>
                    <strong>Android / Chrome Mobile:</strong><br />
                    {lang === 'id'
                      ? 'Buka Pengaturan HP > Aplikasi > Kelola Aplikasi > cari "Tata" > Klik "Hapus Instalasi" (Uninstall). Jika hanya ada Chrome, klik Tata di dalam Chrome lalu hapus.'
                      : 'Go to Android Settings > Apps > Tata > tap "Uninstall". If it is inside Chrome, remove it from Chrome Settings.'}
                  </p>
                  <p>
                    <strong>Desktop / PC Chrome:</strong><br />
                    {lang === 'id'
                      ? 'Ketik chrome://apps di URL bar Chrome, klik kanan ikon "Tata", lalu pilih "Hapus dari Chrome" (Centang hapus data jika perlu).'
                      : 'Open chrome://apps in Chrome, right-click "Tata", and select "Remove from Chrome".'}
                  </p>
                  <p>
                    <strong>iPhone / iPad Safari:</strong><br />
                    {lang === 'id'
                      ? 'Hapus ikon Tata dari layar utama. Bersihkan riwayat situs Tata di Pengaturan Safari, lalu buka kembali browser Safari dan klik Bagikan > Tambahkan ke Layar Utama.'
                      : 'Remove Tata icon from screen. Clear Safari cache for this site, reopen Safari, and click Share > Add to Home Screen.'}
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowPwaTroubleshoot(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-750 rounded-2xl transition-colors text-xs font-bold text-slate-200 border border-slate-750"
            >
              {lang === 'id' ? 'Tutup' : 'Close'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: LANGUAGE PICKER */}
      {showLanguageModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl w-full max-w-xs shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className={`text-sm font-bold ${primaryTextThemeClass} flex items-center gap-2`}>
                {isOrganic ? (
                  <Icon3DGlobe size={18} />
                ) : (
                  <Globe size={16} className="text-sky-400" />
                )}
                {lang === 'id' ? 'Pilih Bahasa' : 'Select Language'}
              </h3>
              <button 
                onClick={() => setShowLanguageModal(false)}
                className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={() => {
                  setLang('id');
                  setShowLanguageModal(false);
                  showNotificationToast('Bahasa diganti ke Indonesia');
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  lang === 'id'
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-200'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🇮🇩</span>
                  <div>
                    <span className="text-sm font-semibold block">Bahasa Indonesia</span>
                    <span className="text-[11px] text-slate-400 block">Bahasa resmi Indonesia</span>
                  </div>
                </div>
                {lang === 'id' && <Check size={16} className="text-indigo-400" />}
              </button>

              <button
                onClick={() => {
                  setLang('en');
                  setShowLanguageModal(false);
                  showNotificationToast('Language set to English');
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  lang === 'en'
                    ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-200'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🇬🇧</span>
                  <div>
                    <span className="text-sm font-semibold block">English</span>
                    <span className="text-[11px] text-slate-400 block">International English</span>
                  </div>
                </div>
                {lang === 'en' && <Check size={16} className="text-indigo-400" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: APP DISPLAY MODE PICKER */}
      {showModeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[200] animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl w-full max-w-xs shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className={`text-sm font-bold ${primaryTextThemeClass} flex items-center gap-2`}>
                {isOrganic ? (
                  <Icon3DSmartphone size={18} />
                ) : (
                  <Smartphone size={16} className="text-emerald-400" />
                )}
                {lang === 'id' ? 'Pilih Mode' : 'Select Mode'}
              </h3>
              <button 
                onClick={() => setShowModeModal(false)}
                className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            {/* Trial / Google Sign In Reassuring Info Banner */}
            {!tataAccount ? (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-left space-y-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold text-xs">
                  <Sparkles size={14} className="text-amber-400 shrink-0" />
                  <span>{lang === 'id' ? 'Uji Coba 6 Hari Tata Pro Max' : '6-Day Free Pro Max Trial'}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {lang === 'id' 
                    ? 'Masuk dengan Akun Google untuk membuka akses Tata Pro & Pro Max gratis selama 6 hari! Jika belum login, versi Pro & Pro Max terkunci di Tata Lite.'
                    : 'Sign in with Google to unlock Tata Pro & Pro Max free for 6 days! Without login, Pro & Pro Max remain locked.'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setShowModeModal(false);
                    setShowGoogleTrialModal(true);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer active:scale-98"
                >
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>{lang === 'id' ? 'Masuk Google & Mulai Uji Coba' : 'Sign in & Start Trial'}</span>
                </button>
              </div>
            ) : isTrialActive ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between text-xs">
                <span className="text-emerald-300 font-bold flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-400" />
                  {lang === 'id' ? 'Uji Coba 6 Hari Aktif' : '6-Day Trial Active'}
                </span>
                <span className="text-[11px] font-extrabold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  {lang === 'id' ? `Tersisa ${trialDaysLeft} Hari` : `${trialDaysLeft} Days Left`}
                </span>
              </div>
            ) : !canAccessPro ? (
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-left space-y-1">
                <p className="text-[11px] text-slate-300 font-semibold flex items-center gap-1.5">
                  <Info size={13} className="text-amber-400" />
                  <span>{lang === 'id' ? 'Masa Uji Coba 6 Hari Telah Selesai' : '6-Day Trial Has Ended'}</span>
                </p>
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  {lang === 'id' 
                    ? 'Akun Anda berpindah ke Tata Lite. Tenang, semua catatan, tugas, dan keuangan Anda tetap 100% aman! Gunakan voucher untuk membuka kembali.'
                    : 'Switched to Tata Lite. All your data remains 100% safe! Redeem a voucher to unlock Pro again.'}
                </p>
              </div>
            ) : null}

            <div className="space-y-2">
              {/* Pro Max Option */}
              <button
                onClick={() => {
                  if (!tataAccount) {
                    playTapSound();
                    setShowModeModal(false);
                    setShowGoogleTrialModal(true);
                    return;
                  }
                  if (!canAccessPro) {
                    playTapSound();
                    setShowModeModal(false);
                    setShowLicenseModal(true);
                    showNotificationToast(
                      lang === 'id' 
                        ? 'Masa uji coba selesai. Akun di Tata Lite, semua data tetap aman!' 
                        : 'Trial ended. Active in Tata Lite, data is safe!'
                    );
                    return;
                  }
                  setAppVersion('pro_max');
                  setAppTheme('organic');
                  setShowModeModal(false);
                  showNotificationToast(lang === 'id' ? 'Mode Pro Max aktif!' : 'Pro Max Mode active!');
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  !canAccessPro
                    ? 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900/60'
                    : (appVersion === 'organic' || appVersion === 'pro_max')
                      ? 'bg-amber-600/15 border-amber-500/40 text-amber-900 dark:text-amber-200 font-bold shadow-sm'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles size={18} className="text-amber-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold block">Pro Max</span>
                      {!canAccessPro && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                          <Lock size={9} />
                          <span>{lang === 'id' ? 'Uji Coba 6 Hari' : '6-Day Trial'}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block">{lang === 'id' ? 'Sentuhan 3D & tema terlengkap' : '3D tactile & ultimate experience'}</span>
                  </div>
                </div>
                {canAccessPro && (appVersion === 'organic' || appVersion === 'pro_max') ? (
                  <Check size={16} className="text-amber-500 shrink-0" />
                ) : !canAccessPro ? (
                  <Lock size={15} className="text-slate-500 shrink-0" />
                ) : null}
              </button>

              {/* Pro Option */}
              <button
                onClick={() => {
                  if (!tataAccount) {
                    playTapSound();
                    setShowModeModal(false);
                    setShowGoogleTrialModal(true);
                    return;
                  }
                  if (!canAccessPro) {
                    playTapSound();
                    setShowModeModal(false);
                    setShowLicenseModal(true);
                    showNotificationToast(
                      lang === 'id' 
                        ? 'Masa uji coba selesai. Akun di Tata Lite, semua data tetap aman!' 
                        : 'Trial ended. Active in Tata Lite, data is safe!'
                    );
                    return;
                  }
                  setAppVersion('pro');
                  if (appTheme === 'organic') setAppTheme('dark');
                  setShowModeModal(false);
                  showNotificationToast(lang === 'id' ? 'Mode Pro aktif!' : 'Pro Mode active!');
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  !canAccessPro
                    ? 'bg-slate-950/40 border-slate-800/80 text-slate-400 hover:bg-slate-900/60'
                    : appVersion === 'pro'
                      ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-200'
                      : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Crown size={18} className="text-indigo-400 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold block">Pro</span>
                      {!canAccessPro && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                          <Lock size={9} />
                          <span>{lang === 'id' ? 'Uji Coba 6 Hari' : '6-Day Trial'}</span>
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block">{lang === 'id' ? 'Fitur lengkap & wallpaper' : 'Full features & wallpaper'}</span>
                  </div>
                </div>
                {canAccessPro && appVersion === 'pro' ? (
                  <Check size={16} className="text-indigo-400 shrink-0" />
                ) : !canAccessPro ? (
                  <Lock size={15} className="text-slate-500 shrink-0" />
                ) : null}
              </button>

              {/* Lite Option (Always Unlocked) */}
              <button
                onClick={() => {
                  setAppVersion('lite');
                  if (appTheme === 'organic') setAppTheme('dark');
                  setShowModeModal(false);
                  showNotificationToast(lang === 'id' ? 'Mode Lite aktif!' : 'Lite Mode active!');
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                  appVersion === 'lite'
                    ? 'bg-emerald-600/15 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Zap size={18} className="text-emerald-400 shrink-0" />
                  <div>
                    <span className="text-sm font-semibold block">Lite</span>
                    <span className="text-[11px] text-slate-400 block">{lang === 'id' ? 'Minimalis, cepat, tanpa login' : 'Minimal, fast, no login needed'}</span>
                  </div>
                </div>
                {appVersion === 'lite' && <Check size={16} className="text-emerald-400" />}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800/80">
              <button
                onClick={() => {
                  setShowModeModal(false);
                  playTapSound();
                  onNavigate && onNavigate('account');
                }}
                className="w-full py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-1.5">
                  <Crown size={14} className="text-amber-400" />
                  <span>{lang === 'id' ? 'Buka Paket & Klaim Kode Promo' : 'View Plans & Redeem Promo'}</span>
                </div>
                <ChevronRight size={14} className="text-amber-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pilihan Lisensi & Kode Promo Tata Pro / Pro Max */}
      {showLicenseModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 z-[210] animate-in fade-in duration-200">
          <div className={`${modalThemeClass} rounded-3xl w-full max-w-lg max-h-[90vh] shadow-2xl flex flex-col overflow-hidden text-slate-100`}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/80 bg-slate-950/60 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-zinc-950 flex items-center justify-center shadow-md shrink-0">
                  <Crown className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className={`text-sm sm:text-base font-extrabold ${primaryTextThemeClass} flex items-center gap-1.5`}>
                    <span>{lang === 'id' ? 'Lisensi Tata Pro & Pro Max' : 'Tata Pro & Pro Max Licenses'}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {lang === 'id' ? 'Pilihan lisensi resmi & klaim voucher promo gratis' : 'Official licenses & free promo vouchers'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setShowLicenseModal(false);
                  setPromoFeedback(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-700 flex items-center justify-center text-sm transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
              {/* Active License Status Banner */}
              {isAccountPremium && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/15 to-amber-500/20 border border-amber-500/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      {tataAccount?.premiumType?.includes('pro_max') || tataAccount?.premiumType === 'lifetime'
                        ? 'Tata Pro Max Aktif'
                        : 'Tata Pro Aktif'}
                    </span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950">
                      {tataAccount?.premiumType?.includes('lifetime') ? 'SEUMUR HIDUP' : 'AKTIF'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    {lang === 'id' 
                      ? 'Selamat! Akun Anda telah memiliki lisensi aktif, bebas iklan selamanya, dan offline-first.'
                      : 'Congratulations! Your license is active, 100% ad-free, and offline-first.'}
                  </p>
                </div>
              )}

              {/* Tier Tab Selector: Pro Max vs Pro */}
              <div className="space-y-2">
                <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-950 border border-slate-800 gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setLicenseModalTierTab('pro_max');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-2.5 sm:px-3 rounded-xl font-bold transition-all cursor-pointer ${
                      licenseModalTierTab === 'pro_max'
                        ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-300 border border-amber-500/50 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Crown className="w-4 h-4 fill-current text-amber-400 shrink-0" />
                    <span className="truncate text-xs sm:text-sm">Tata Pro Max</span>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-amber-400 text-zinc-950 uppercase shrink-0 hidden sm:inline-block">
                      TOP
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      playTapSound();
                      setLicenseModalTierTab('pro');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-2.5 sm:px-3 rounded-xl font-bold transition-all cursor-pointer ${
                      licenseModalTierTab === 'pro'
                        ? 'bg-slate-800 text-indigo-300 border border-indigo-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="truncate text-xs sm:text-sm">Tata Pro</span>
                  </button>
                </div>
              </div>

              {/* Tier Perks Card */}
              <div className={`p-3.5 rounded-2xl border ${
                licenseModalTierTab === 'pro_max'
                  ? 'bg-gradient-to-br from-amber-500/10 via-slate-950 to-orange-500/10 border-amber-500/30'
                  : 'bg-slate-950/60 border-slate-800'
              }`}>
                <h4 className={`font-bold ${primaryTextThemeClass} mb-2 flex items-center gap-1.5`}>
                  {licenseModalTierTab === 'pro_max' ? (
                    <>
                      <Crown className="w-3.5 h-3.5 text-amber-400 fill-current shrink-0" />
                      <span className="truncate">{lang === 'id' ? 'Keunggulan Tata Pro Max (Flagship):' : 'Tata Pro Max Perks:'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      <span className="truncate">{lang === 'id' ? 'Keunggulan Tata Pro:' : 'Tata Pro Perks:'}</span>
                    </>
                  )}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] text-slate-300">
                  {licenseModalTierTab === 'pro_max' ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Semua Keuntungan Tata Pro</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Sentuhan 3D Tactile & Organik</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Mesin Dynamic Wallpaper Premium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>Lencana Mahkota Emas & VIP Status</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>100% Bebas Iklan Selamanya</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Akses Semua Tema Eksklusif</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Cadangkan & Ekspor Tanpa Batas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>100% Offline First & Privasi Terjaga</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* License Option Cards */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  {lang === 'id' ? 'Pilihan Durasi Lisensi:' : 'License Duration Options:'}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {licenseModalTierTab === 'pro_max' ? (
                    <>
                      {/* Pro Max Bulanan */}
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-amber-500/50 transition-all flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block">Bulanan</span>
                          <span className={`text-sm font-extrabold ${primaryTextThemeClass} block`}>Rp 29.000</span>
                          <span className="text-[10px] text-slate-400">/ 30 hari</span>
                        </div>
                        <span className="text-[10px] text-amber-400/80 font-medium">Bebas komitmen</span>
                      </div>

                      {/* Pro Max Tahunan (No negative margin badge collision) */}
                      <div className="p-3 rounded-2xl bg-slate-950/90 border-2 border-amber-500/60 shadow-lg shadow-amber-500/10 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold text-amber-400 block">Tahunan</span>
                            <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-black text-[9px] uppercase tracking-tight shrink-0">
                              Favorit
                            </span>
                          </div>
                          <span className="text-sm font-extrabold text-amber-300 block">Rp 149.000</span>
                          <span className="text-[10px] text-slate-400">/ 365 hari (Hemat 57%)</span>
                        </div>
                        <span className="text-[10px] text-amber-300 font-bold">Paling populer</span>
                      </div>

                      {/* Pro Max Seumur Hidup */}
                      <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 via-slate-950 to-orange-500/15 border border-amber-500/50 flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-[10px] font-bold text-orange-400 block">Seumur Hidup</span>
                          <span className="text-sm font-extrabold text-orange-300 block">Rp 299.000</span>
                          <span className="text-[10px] text-slate-400">Sekali bayar selamanya</span>
                        </div>
                        <span className="text-[10px] text-amber-300 font-bold">Investasi Terbaik</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Pro Bulanan */}
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 transition-all flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 block">Bulanan</span>
                          <span className={`text-sm font-extrabold ${primaryTextThemeClass} block`}>Rp 19.000</span>
                          <span className="text-[10px] text-slate-400">/ 30 hari</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Bebas komitmen</span>
                      </div>

                      {/* Pro Tahunan (No negative margin badge collision) */}
                      <div className="p-3 rounded-2xl bg-slate-950/90 border-2 border-indigo-500/60 flex flex-col justify-between space-y-2">
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-bold text-indigo-400 block">Tahunan</span>
                            <span className="px-2 py-0.5 rounded-full bg-indigo-500 text-white font-black text-[9px] uppercase tracking-tight shrink-0">
                              Hemat 50%
                            </span>
                          </div>
                          <span className="text-sm font-extrabold text-indigo-300 block">Rp 99.000</span>
                          <span className="text-[10px] text-slate-400">/ 365 hari</span>
                        </div>
                        <span className="text-[10px] text-indigo-300 font-bold">Paling hemat</span>
                      </div>

                      {/* Pro Seumur Hidup */}
                      <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-700 flex flex-col justify-between space-y-2">
                        <div>
                          <span className="text-[10px] font-bold text-slate-300 block">Seumur Hidup</span>
                          <span className={`text-sm font-extrabold ${primaryTextThemeClass} block`}>Rp 199.000</span>
                          <span className="text-[10px] text-slate-400">Sekali bayar selamanya</span>
                        </div>
                        <span className="text-[10px] text-slate-300 font-bold">Permanen</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* KODE PROMO / VOUCHER CLAIM SECTION */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-950 to-slate-950 border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="font-bold text-xs text-indigo-200">
                      {lang === 'id' ? 'Klaim Kode Promo / Voucher' : 'Redeem Promo / Voucher Code'}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {lang === 'id' ? 'Gratis 100%' : '100% Free'}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {lang === 'id'
                    ? 'Punya kode promo atau voucher? Masukkan kode di bawah untuk mengaktifkan lisensi.'
                    : 'Have a promo or voucher code? Enter it below to activate your license.'}
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => {
                      setPromoCodeInput(e.target.value.toUpperCase());
                      if (promoFeedback) setPromoFeedback(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRedeemPromoFromSettings();
                    }}
                    placeholder={lang === 'id' ? 'Masukkan kode promo...' : 'Enter promo code...'}
                    className="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-amber-400 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRedeemPromoFromSettings()}
                    disabled={isRedeemingPromo || !promoCodeInput.trim()}
                    className="py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-md active:scale-95"
                  >
                    {isRedeemingPromo ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-zinc-950" />
                    )}
                    <span>{isRedeemingPromo ? (lang === 'id' ? 'Memeriksa...' : 'Checking...') : (lang === 'id' ? 'Klaim' : 'Claim')}</span>
                  </button>
                </div>

                {/* Promo Feedback */}
                {promoFeedback && (
                  <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    promoFeedback.type === 'success'
                      ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
                  }`}>
                    {promoFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    )}
                    <span className="text-[11px] leading-tight font-medium">{promoFeedback.message}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800/80 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>100% Offline First & Data Milik Anda</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    setShowLicenseModal(false);
                    playTapSound();
                    onNavigate && onNavigate('account');
                  }}
                  className="flex-1 sm:flex-initial py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>{lang === 'id' ? 'Beli via Midtrans / Play Store' : 'Buy via Midtrans / Play'}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Account Modal for Trial & Auth */}
      <GoogleAccountPromptModal
        isOpen={showGoogleTrialModal}
        flow="trial"
        onClose={() => setShowGoogleTrialModal(false)}
        onSuccess={(account, isPrem) => {
          setShowGoogleTrialModal(false);
          playCelebrationSound();
          showNotificationToast(
            lang === 'id' 
              ? `Selamat datang ${account.name || 'Pengguna'}! Uji coba 6 hari Tata Pro Max aktif.` 
              : `Welcome ${account.name || 'User'}! 6-day Pro Max trial activated.`
          );
        }}
      />

      {/* Toast Notification popup */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900 border border-slate-850 px-4.5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <p className={`text-xs font-extrabold ${primaryTextThemeClass}`}>
            {toastMessage}
          </p>
        </div>
      )}
    </div>
  );
}

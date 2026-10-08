import React, { useState, useEffect, useRef } from 'react';
import { 
  Download, Upload, Lock, FileText, CheckSquare, Wallet, Smile, 
  User, Image as ImageIcon, RotateCcw, PlusCircle, Check, CheckCircle2, 
  AlertTriangle, RefreshCw, Eye, EyeOff, FileJson, X, ShieldCheck, 
  History as HistoryIcon, HelpCircle, ArrowRight, Layers, Sparkles,
  Shield, Database, Trash2, ArrowLeft, CheckCheck, FileCheck, CircleAlert
} from 'lucide-react';
import { useAppStore, normalizeBackupData } from '../store';
import { useTranslation } from '../translations';
import { generateId, encryptData, decryptData } from '../utils';
import { getLargeItem, setLargeItem, deleteLargeItem } from '../utils/db';
import { playTapSound, playCelebrationSound } from '../utils/sound';
import { calculateJourneyDay, getTodayDateString } from '../utils/journey';
import { LiteStickerIcon, LiteStickerVariant } from './LiteModeIcons';
import { 
  Icon3DDownload, Icon3DUpload, Icon3DDatabase, Icon3DLock, Icon3DGoldLock,
  Icon3DFileText, Icon3DTaskChecked, Icon3DCheckSquare, Icon3DWallet,
  Icon3DMoodHappy, Icon3DPiggyBank, Icon3DUser, Icon3DPalette,
  Icon3DShield, Icon3DTrash, Icon3DRotateCcw, Icon3DFabPlus, Icon3DTataAI
} from './home/Organic3DIcons';

interface BackupRestoreModalProps {
  isOpen: boolean;
  initialMode?: 'export' | 'import';
  onClose: () => void;
  lang?: 'id' | 'en';
  appTheme?: string;
  isOrganic?: boolean;
  isLiteMode?: boolean;
}

export default function BackupRestoreModal({
  isOpen,
  initialMode = 'export',
  onClose,
  lang = 'id',
  appTheme = 'dark',
  isOrganic = false,
  isLiteMode = false
}: BackupRestoreModalProps) {
  const {
    notes, tasks, transactions, moods, debts, savingsGoals, user, streak,
    journeyDay, journeyStartDate, appPin, notePin,
    createFullBackup, importFullBackup, autoBackupFilenamePrefix
  } = useAppStore();

  const t = useTranslation(lang);

  const [activeTab, setActiveTab] = useState<'export' | 'import'>(initialMode);
  
  // Export State
  const [exportCustomFilename, setExportCustomFilename] = useState('');
  const [exportPassword, setExportPassword] = useState('');
  const [showExportPassword, setShowExportPassword] = useState(false);
  const [isProcessingExport, setIsProcessingExport] = useState(false);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(null);
  const [exportOptions, setExportOptions] = useState({
    notes: true,
    tasks: true,
    transactions: true,
    moods: true,
    userProfile: true,
    settings: true
  });

  // Import State
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importFileName, setImportFileName] = useState('');
  const [importFileSize, setImportFileSize] = useState<number>(0);
  const [importFileContent, setImportFileContent] = useState<string | null>(null);
  const [importPassword, setImportPassword] = useState('');
  const [showImportPassword, setShowImportPassword] = useState(false);
  const [isCheckingPassword, setIsCheckingPassword] = useState(false);
  const [restoreStrategy, setRestoreStrategy] = useState<'replace' | 'merge'>('replace');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [importProgressPhase, setImportProgressPhase] = useState<string>('');
  const [importSuccessSummary, setImportSuccessSummary] = useState<{
    notes: number;
    tasks: number;
    transactions: number;
    moods: number;
    debts: number;
    savings: number;
  } | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);
  const [hasEmergencySnapshot, setHasEmergencySnapshot] = useState(false);
  const [emergencySnapshotDate, setEmergencySnapshotDate] = useState<string | null>(null);
  const [emergencySnapshotMeta, setEmergencySnapshotMeta] = useState<any>(null);

  const [importPreview, setImportPreview] = useState<{
    isEncrypted: boolean;
    isNoto: boolean;
    passwordMatches?: boolean;
    notesCount: number;
    lockedNotesCount: number;
    tasksCount: number;
    habitsCount: number;
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
    userName?: string;
    version: string;
    parsedData?: any;
  } | null>(null);

  // Sync initial mode
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialMode);
      setExportCustomFilename(autoBackupFilenamePrefix || 'tata_cadangan');
      setExportErrorMessage(null);
      setImportErrorMessage(null);
      setImportSuccessSummary(null);
      setImportProgressPhase('');
      checkEmergencySnapshot();
    }
  }, [isOpen, initialMode, autoBackupFilenamePrefix]);

  const checkEmergencySnapshot = async () => {
    try {
      const snap = await getLargeItem('tata_pre_restore_snapshot');
      const time = localStorage.getItem('tata_last_emergency_snapshot_time');
      const metaRaw = localStorage.getItem('tata_pre_restore_snapshot_meta');
      if (snap) {
        setHasEmergencySnapshot(true);
        if (time) {
          const d = new Date(parseInt(time, 10));
          setEmergencySnapshotDate(d.toLocaleString(lang === 'id' ? 'id-ID' : 'en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
          }));
        }
        if (metaRaw) {
          try {
            setEmergencySnapshotMeta(JSON.parse(metaRaw));
          } catch {}
        }
      } else {
        setHasEmergencySnapshot(false);
      }
    } catch {
      setHasEmergencySnapshot(false);
    }
  };

  // Adaptive Icon Renderer: Lite vs Pro Max (3D Organic) vs Pro (Modern Vector)
  const renderModeIcon = (
    type: 'download' | 'upload' | 'notes' | 'tasks' | 'finance' | 'mood' | 'user' | 'settings' | 'lock' | 'shield' | 'database' | 'trash' | 'reset' | 'sparkles' | 'plus',
    size = 20,
    className = ''
  ) => {
    if (isOrganic) {
      switch (type) {
        case 'download': return <Icon3DDownload size={size} className={className} />;
        case 'upload': return <Icon3DUpload size={size} className={className} />;
        case 'notes': return <Icon3DFileText size={size} className={className} />;
        case 'tasks': return <Icon3DTaskChecked size={size} className={className} />;
        case 'finance': return <Icon3DWallet size={size} className={className} />;
        case 'mood': return <Icon3DMoodHappy size={size} className={className} />;
        case 'user': return <Icon3DUser size={size} className={className} />;
        case 'settings': return <Icon3DPalette size={size} className={className} />;
        case 'lock': return <Icon3DGoldLock size={size} className={className} />;
        case 'shield': return <Icon3DShield size={size} className={className} />;
        case 'database': return <Icon3DDatabase size={size} className={className} />;
        case 'trash': return <Icon3DTrash size={size} className={className} />;
        case 'reset': return <Icon3DRotateCcw size={size} className={className} />;
        case 'sparkles': return <Icon3DTataAI size={size} className={className} />;
        case 'plus': return <Icon3DFabPlus size={size} className={className} />;
        default: return <Icon3DDownload size={size} className={className} />;
      }
    }

    if (isLiteMode) {
      let variant: LiteStickerVariant = 'download';
      switch (type) {
        case 'download': variant = 'download'; break;
        case 'upload': variant = 'upload'; break;
        case 'notes': variant = 'notes'; break;
        case 'tasks': variant = 'tasks'; break;
        case 'finance': variant = 'finance'; break;
        case 'mood': variant = 'mood-good'; break;
        case 'user': variant = 'user'; break;
        case 'settings': variant = 'palette'; break;
        case 'lock': variant = 'lock'; break;
        case 'shield': variant = 'shield'; break;
        case 'database': variant = 'database'; break;
        case 'trash': variant = 'trash'; break;
        case 'reset': variant = 'history'; break;
        case 'sparkles': variant = 'sparkles'; break;
        case 'plus': variant = 'plus'; break;
      }
      return <LiteStickerIcon variant={variant} size={size > 22 ? 'md' : 'sm'} />;
    }

    // Pro / Standard Vector Icons
    switch (type) {
      case 'download': return <Download size={size} className={className || 'text-indigo-400'} />;
      case 'upload': return <Upload size={size} className={className || 'text-emerald-400'} />;
      case 'notes': return <FileText size={size} className={className || 'text-indigo-400'} />;
      case 'tasks': return <CheckSquare size={size} className={className || 'text-indigo-400'} />;
      case 'finance': return <Wallet size={size} className={className || 'text-emerald-400'} />;
      case 'mood': return <Smile size={size} className={className || 'text-amber-400'} />;
      case 'user': return <User size={size} className={className || 'text-sky-400'} />;
      case 'settings': return <ImageIcon size={size} className={className || 'text-slate-400'} />;
      case 'lock': return <Lock size={size} className={className || 'text-amber-400'} />;
      case 'shield': return <ShieldCheck size={size} className={className || 'text-sky-400'} />;
      case 'database': return <Database size={size} className={className || 'text-violet-400'} />;
      case 'trash': return <Trash2 size={size} className={className || 'text-rose-400'} />;
      case 'reset': return <RotateCcw size={size} className={className || 'text-indigo-400'} />;
      case 'sparkles': return <Sparkles size={size} className={className || 'text-amber-400'} />;
      case 'plus': return <PlusCircle size={size} className={className || 'text-emerald-400'} />;
      default: return <FileText size={size} className={className} />;
    }
  };

  // Parse & Verify Import File
  useEffect(() => {
    if (!importFileContent) {
      setImportPreview(null);
      setImportStep(1);
      return;
    }

    let isMounted = true;
    setIsCheckingPassword(true);
    const timer = setTimeout(async () => {
      try {
        const parsed = JSON.parse(importFileContent);
        
        // Check if encrypted
        if (parsed.v && parsed.s && parsed.d) {
          if (importPassword.trim()) {
            try {
              const decrypted = await decryptData(importFileContent, importPassword.trim());
              if (!isMounted) return;
              const data = JSON.parse(decrypted);
              const normalized = normalizeBackupData(data);
              const isNoto = Boolean(
                data.noto_notes || data.noto_tasks || data.noto_transactions || 
                (data.appName && data.appName.toLowerCase().includes('noto')) || 
                (data.version && parseFloat(data.version) < 4.0)
              );

              setImportErrorMessage(null);
              const strk = typeof normalized?.streak === 'number' ? normalized.streak : 0;
              const jDays = normalized?.journeyStartDate ? calculateJourneyDay(normalized.journeyStartDate) : 1;
              const profInc = normalized?.userProfileIncluded !== undefined 
                ? normalized.userProfileIncluded 
                : (Boolean(normalized?.user) || normalized?.streak !== undefined);

              const notesList = normalized?.notes || [];
              const tasksList = normalized?.tasks || [];

              setImportPreview({
                isEncrypted: true,
                isNoto,
                passwordMatches: true,
                notesCount: notesList.length,
                lockedNotesCount: notesList.filter((n: any) => n.isLocked).length,
                tasksCount: tasksList.length,
                habitsCount: tasksList.filter((t: any) => t.isHabit || t.repeat).length,
                discMediaCount: normalized?.disciplineMediaMap ? Object.keys(normalized.disciplineMediaMap).length : 0,
                txCount: normalized?.transactions?.length || 0,
                moodsCount: normalized?.moods?.length || 0,
                debtsCount: normalized?.debts?.length || 0,
                savingsGoalsCount: normalized?.savingsGoals?.length || 0,
                hasUser: Boolean(normalized?.user),
                userName: normalized?.user?.name || undefined,
                hasWallpaper: Boolean(normalized?.customWallpaper || normalized?.bannerWallpaper),
                hasSettings: Boolean(normalized?.appPin || normalized?.appTheme || normalized?.lang),
                streak: strk,
                journeyDays: jDays,
                userProfileIncluded: profInc,
                version: data.version || (isNoto ? 'Noto Legacy' : '5.1'),
                parsedData: normalized
              });
              setImportStep(2);
            } catch {
              if (!isMounted) return;
              setImportPreview({
                isEncrypted: true,
                isNoto: false,
                passwordMatches: false,
                notesCount: 0,
                lockedNotesCount: 0,
                tasksCount: 0,
                habitsCount: 0,
                discMediaCount: 0,
                txCount: 0,
                moodsCount: 0,
                debtsCount: 0,
                savingsGoalsCount: 0,
                hasUser: false,
                hasWallpaper: false,
                hasSettings: false,
                version: 'AES-256'
              });
              setImportStep(2);
            }
          } else {
            if (!isMounted) return;
            setImportPreview({
              isEncrypted: true,
              isNoto: false,
              passwordMatches: undefined,
              notesCount: 0,
              lockedNotesCount: 0,
              tasksCount: 0,
              habitsCount: 0,
              discMediaCount: 0,
              txCount: 0,
              moodsCount: 0,
              debtsCount: 0,
              savingsGoalsCount: 0,
              hasUser: false,
              hasWallpaper: false,
              hasSettings: false,
              version: 'AES-256'
            });
            setImportStep(2);
          }
        } else {
          // Plaintext JSON
          const normalized = normalizeBackupData(parsed);
          const isNoto = Boolean(
            parsed.noto_notes || parsed.noto_tasks || parsed.noto_transactions || 
            (parsed.appName && parsed.appName.toLowerCase().includes('noto')) || 
            (parsed.version && parseFloat(parsed.version) < 4.0)
          );

          if (!isMounted) return;
          setImportErrorMessage(null);
          const strk = typeof normalized?.streak === 'number' ? normalized.streak : 0;
          const jDays = normalized?.journeyStartDate ? calculateJourneyDay(normalized.journeyStartDate) : 1;
          const profInc = normalized?.userProfileIncluded !== undefined 
            ? normalized.userProfileIncluded 
            : (Boolean(normalized?.user) || normalized?.streak !== undefined);

          const notesList = normalized?.notes || [];
          const tasksList = normalized?.tasks || [];

          setImportPreview({
            isEncrypted: false,
            isNoto,
            passwordMatches: true,
            notesCount: notesList.length,
            lockedNotesCount: notesList.filter((n: any) => n.isLocked).length,
            tasksCount: tasksList.length,
            habitsCount: tasksList.filter((t: any) => t.isHabit || t.repeat).length,
            discMediaCount: normalized?.disciplineMediaMap ? Object.keys(normalized.disciplineMediaMap).length : 0,
            txCount: normalized?.transactions?.length || 0,
            moodsCount: normalized?.moods?.length || 0,
            debtsCount: normalized?.debts?.length || 0,
            savingsGoalsCount: normalized?.savingsGoals?.length || 0,
            hasUser: Boolean(normalized?.user),
            userName: normalized?.user?.name || undefined,
            hasWallpaper: Boolean(normalized?.customWallpaper || normalized?.bannerWallpaper),
            hasSettings: Boolean(normalized?.appPin || normalized?.appTheme || normalized?.lang),
            streak: strk,
            journeyDays: jDays,
            userProfileIncluded: profInc,
            version: parsed.version || (isNoto ? 'Noto Legacy' : '5.1'),
            parsedData: normalized
          });
          setImportStep(2);
        }
      } catch {
        if (!isMounted) return;
        setImportErrorMessage(
          lang === 'id' 
            ? 'Format berkas tidak valid. Pastikan memilih berkas .json cadangan Tata atau Noto.' 
            : 'Invalid file format. Please select a valid Tata or Noto .json backup file.'
        );
        setImportPreview(null);
        setImportStep(1);
      } finally {
        if (isMounted) setIsCheckingPassword(false);
      }
    }, 150);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [importFileContent, importPassword, lang]);

  const handleFileSelect = (file: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json' && file.type !== '') {
      setImportErrorMessage(
        lang === 'id' 
          ? 'Format berkas tidak didukung. Harap pilih berkas cadangan .json yang sah.' 
          : 'Unsupported format. Please select a valid .json backup file.'
      );
      return;
    }

    setImportFileName(file.name);
    setImportFileSize(file.size);
    setImportPassword('');
    setShowImportPassword(false);
    setImportErrorMessage(null);
    setImportSuccessSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImportFileContent(e.target?.result as string);
    };
    reader.onerror = () => {
      setImportErrorMessage(
        lang === 'id' 
          ? 'Gagal membaca isi berkas dari perangkat Anda.' 
          : 'Failed reading file contents from your device.'
      );
    };
    reader.readAsText(file);
  };

  const openFileInput = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) handleFileSelect(file);
    };
    input.click();
  };

  const resetImportFile = () => {
    setImportFileContent(null);
    setImportFileName('');
    setImportFileSize(0);
    setImportPassword('');
    setImportPreview(null);
    setImportErrorMessage(null);
    setImportStep(1);
    setImportSuccessSummary(null);
  };

  // Execute Export
  const processExport = async () => {
    setIsProcessingExport(true);
    setExportErrorMessage(null);

    try {
      const exportData = await createFullBackup(exportOptions);
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

      if (exportPassword.trim()) {
        finalContent = await encryptData(dataStr, exportPassword.trim());
      }

      const blob = new Blob([finalContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const d = new Date();
      const timestamp = `${d.getFullYear()}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getDate().toString().padStart(2,'0')}_${d.getHours().toString().padStart(2,'0')}${d.getMinutes().toString().padStart(2,'0')}`;
      const prefix = (exportCustomFilename.trim() || autoBackupFilenamePrefix || 'tata_cadangan').replace(/[^a-z0-9_-]/gi, '_');
      const suffix = exportPassword.trim() ? '_encrypted' : '';
      a.download = `${prefix}_${timestamp}${suffix}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      playCelebrationSound();
      onClose();
    } catch (e: any) {
      console.error("Export error:", e);
      setExportErrorMessage(
        lang === 'id' 
          ? 'Gagal mengekspor data: ' + (e?.message || 'Kesalahan sistem') 
          : 'Failed to export: ' + (e?.message || 'System error')
      );
    } finally {
      setIsProcessingExport(false);
    }
  };

  // Execute Restore
  const processImport = async () => {
    if (!importFileContent) {
      setImportErrorMessage(
        lang === 'id' ? 'Silakan pilih berkas cadangan terlebih dahulu.' : 'Please select a backup file first.'
      );
      return;
    }

    if (importPreview?.isEncrypted && (!importPassword.trim() || importPreview.passwordMatches === false)) {
      setImportErrorMessage(
        lang === 'id' ? 'Kata sandi salah atau belum dimasukkan.' : 'Incorrect or missing password.'
      );
      return;
    }

    setIsProcessingImport(true);
    setImportErrorMessage(null);
    setImportProgressPhase(lang === 'id' ? 'Memverifikasi struktur berkas...' : 'Verifying file structure...');

    try {
      let dataStr = importFileContent;

      // Handle encrypted backup
      const parsed = JSON.parse(importFileContent);
      if (parsed.v && parsed.s && parsed.d) {
        setImportProgressPhase(lang === 'id' ? 'Mendekripsi berkas AES-256...' : 'Decrypting AES-256 data...');
        dataStr = await decryptData(importFileContent, importPassword.trim());
      }

      const rawData = JSON.parse(dataStr);
      const data = normalizeBackupData(rawData);

      if (!data) {
        throw new Error(lang === 'id' ? 'Data cadangan tidak valid.' : 'Invalid backup data.');
      }

      // 1. SAFETY SNAPSHOT: Create an emergency local snapshot before overwriting
      setImportProgressPhase(lang === 'id' ? 'Membuat cadangan pengaman darurat...' : 'Creating safety emergency snapshot...');
      try {
        const currentSnapshot = await createFullBackup({
          notes: true,
          tasks: true,
          transactions: true,
          moods: true,
          userProfile: true,
          settings: true
        });
        await setLargeItem('tata_pre_restore_snapshot', JSON.stringify(currentSnapshot));
        const nowTs = Date.now().toString();
        localStorage.setItem('tata_last_emergency_snapshot_time', nowTs);
        const snapshotMeta = {
          notesCount: notes.length,
          tasksCount: tasks.length,
          txCount: transactions.length,
          moodsCount: moods.length,
          time: new Date().toLocaleString(lang === 'id' ? 'id-ID' : 'en-US')
        };
        localStorage.setItem('tata_pre_restore_snapshot_meta', JSON.stringify(snapshotMeta));
      } catch (snapErr) {
        console.warn("Could not save emergency snapshot:", snapErr);
      }

      setImportProgressPhase(lang === 'id' ? 'Menyiapkan dan menyaring data...' : 'Preparing and filtering records...');

      let finalNotes = data.notes || [];
      let finalTasks = data.tasks || [];
      let finalTransactions = data.transactions || [];
      let finalMoods = data.moods || [];
      let finalDebts = data.debts || [];
      let finalSavingsGoals = data.savingsGoals || [];
      let finalDisciplineMedia = { ...(data.disciplineMediaMap || {}) };

      if (restoreStrategy === 'merge') {
        // Smart Deduplication for Notes
        const existingNoteSignatures = new Set(
          notes.map(n => `${n.title.trim().toLowerCase()}_${n.content.trim().slice(0, 60)}_${n.date}`)
        );
        const incomingNotes = finalNotes
          .filter((n: any) => !existingNoteSignatures.has(`${(n.title||'').trim().toLowerCase()}_${(n.content||'').trim().slice(0, 60)}_${n.date}`))
          .map((n: any) => ({ ...n, id: generateId() }));
        finalNotes = [...notes, ...incomingNotes];

        // Smart Deduplication for Tasks & Media remapping
        const existingTaskSignatures = new Set(
          tasks.map(t => `${t.title.trim().toLowerCase()}_${t.date}`)
        );
        const incomingTasks = finalTasks
          .filter((t: any) => !existingTaskSignatures.has(`${(t.title||'').trim().toLowerCase()}_${t.date}`))
          .map((t: any) => {
            const oldId = t.id;
            const newId = generateId();
            const oldKey = `tata_disc_media_${oldId}`;
            if (finalDisciplineMedia[oldKey]) {
              finalDisciplineMedia[`tata_disc_media_${newId}`] = finalDisciplineMedia[oldKey];
              delete finalDisciplineMedia[oldKey];
            }
            return { ...t, id: newId };
          });
        finalTasks = [...tasks, ...incomingTasks];

        // Smart Deduplication for Transactions
        const existingTxSignatures = new Set(
          transactions.map(tx => `${(tx.description || '').trim().toLowerCase()}_${tx.amount}_${tx.date}_${tx.type}`)
        );
        const incomingTx = finalTransactions
          .filter((tx: any) => !existingTxSignatures.has(`${((tx.description || tx.title) || '').trim().toLowerCase()}_${tx.amount}_${tx.date}_${tx.type}`))
          .map((tx: any) => ({ ...tx, id: generateId() }));
        finalTransactions = [...transactions, ...incomingTx];

        // Smart Deduplication for Moods
        const existingMoodDates = new Set(moods.map(m => m.date));
        const incomingMoods = finalMoods.filter((m: any) => !existingMoodDates.has(m.date));
        finalMoods = [...moods, ...incomingMoods];

        // Smart Deduplication for Debts
        const existingDebtSignatures = new Set(
          debts.map(d => `${d.title.trim().toLowerCase()}_${d.totalAmount || (d as any).amount || 0}`)
        );
        const incomingDebts = finalDebts
          .filter((d: any) => !existingDebtSignatures.has(`${(d.title||'').trim().toLowerCase()}_${d.totalAmount || (d as any).amount || 0}`))
          .map((d: any) => ({ ...d, id: generateId() }));
        finalDebts = [...debts, ...incomingDebts];

        // Smart Deduplication for Savings Goals
        const existingSgSignatures = new Set(
          savingsGoals.map(s => `${s.title.trim().toLowerCase()}_${s.targetAmount}`)
        );
        const incomingSg = finalSavingsGoals
          .filter((s: any) => !existingSgSignatures.has(`${(s.title||'').trim().toLowerCase()}_${s.targetAmount}`))
          .map((s: any) => ({ ...s, id: generateId() }));
        finalSavingsGoals = [...savingsGoals, ...incomingSg];
      }

      setImportProgressPhase(lang === 'id' ? 'Menyimpan data ke memori aman...' : 'Writing data to secure storage...');

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
        lang: data.lang || lang,
        disciplineMediaMap: finalDisciplineMedia
      });

      playCelebrationSound();
      setImportProgressPhase(lang === 'id' ? 'Pemulihan berhasil!' : 'Restore successful!');
      setImportSuccessSummary({
        notes: finalNotes.length,
        tasks: finalTasks.length,
        transactions: finalTransactions.length,
        moods: finalMoods.length,
        debts: finalDebts.length,
        savings: finalSavingsGoals.length
      });

      setTimeout(() => {
        window.location.reload();
      }, 1600);
    } catch (err: any) {
      console.error("Import error:", err);
      setImportErrorMessage(
        lang === 'id' 
          ? 'Gagal memulihkan data: ' + (err?.message || 'Format tidak didukung.') 
          : 'Failed to restore: ' + (err?.message || 'Unsupported format.')
      );
    } finally {
      setIsProcessingImport(false);
    }
  };

  // Rollback emergency restore
  const handleRollbackSnapshot = async () => {
    if (!window.confirm(
      lang === 'id' 
        ? 'Apakah Anda yakin ingin mengembalikan cadangan darurat ke kondisi sebelum impor terakhir dilakukan?' 
        : 'Are you sure you want to revert to the emergency snapshot taken before the last import?'
    )) return;

    try {
      const snapStr = await getLargeItem('tata_pre_restore_snapshot');
      if (!snapStr) {
        alert(lang === 'id' ? 'Snapshot darurat tidak ditemukan.' : 'Emergency snapshot not found.');
        return;
      }
      const snapshot = JSON.parse(snapStr);
      await importFullBackup(snapshot);
      playCelebrationSound();
      setTimeout(() => window.location.reload(), 1000);
    } catch (err: any) {
      alert(lang === 'id' ? 'Gagal memulihkan snapshot: ' + err.message : 'Failed restoring snapshot: ' + err.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 max-w-lg w-full flex flex-col relative overflow-hidden shadow-2xl text-left max-h-[92vh] sm:max-h-[88vh]"
        onDragOver={(e) => {
          e.preventDefault();
          if (activeTab === 'import') setIsDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (activeTab === 'import') {
            const file = e.dataTransfer.files?.[0];
            if (file) handleFileSelect(file);
          }
        }}
      >
        {/* Subtle Ambient Background */}
        <div className={`absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl pointer-events-none ${
          activeTab === 'export' ? 'bg-indigo-500/10' : 'bg-emerald-500/10'
        }`} />

        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3.5 border-b border-slate-800/80 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0">
              {renderModeIcon(activeTab === 'export' ? 'download' : 'upload', 26)}
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-extrabold text-slate-100 truncate">
                {activeTab === 'export' 
                  ? (lang === 'id' ? 'Ekspor Cadangan Data' : 'Export Data Backup') 
                  : (lang === 'id' ? 'Impor & Pulihkan Data' : 'Import & Restore Data')}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {activeTab === 'export'
                  ? (lang === 'id' ? 'Simpan berkas JSON aman ke memori perangkat' : 'Save secure JSON file to your device')
                  : (lang === 'id' ? 'Pulihkan catatan, tugas & data dari berkas cadangan' : 'Restore records safely from your backup')}
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            disabled={isProcessingExport || isProcessingImport}
            className="w-8 h-8 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-100 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 disabled:opacity-50"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mode Selector Tabs (Ekspor vs Impor) */}
        <div className="flex gap-2 p-1 bg-slate-950/70 border border-slate-800/80 rounded-2xl my-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              playTapSound();
              setActiveTab('export');
            }}
            className={`flex-1 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'export'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {renderModeIcon('download', 14, activeTab === 'export' ? 'text-white' : 'text-slate-400')}
            <span>{lang === 'id' ? 'Ekspor Cadangan' : 'Export Backup'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              playTapSound();
              setActiveTab('import');
            }}
            className={`flex-1 py-2 rounded-xl font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'import'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {renderModeIcon('upload', 14, activeTab === 'import' ? 'text-white' : 'text-slate-400')}
            <span>{lang === 'id' ? 'Impor & Pulihkan' : 'Import & Restore'}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-1 space-y-4">
          {/* Error Banner */}
          {(exportErrorMessage || importErrorMessage) && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-2.5 text-red-300 animate-in fade-in duration-200">
              <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-400" />
              <div className="text-xs leading-relaxed flex-1 font-medium">
                {exportErrorMessage || importErrorMessage}
              </div>
              <button 
                onClick={() => {
                  setExportErrorMessage(null);
                  setImportErrorMessage(null);
                }} 
                className="text-red-400 hover:text-red-200 text-xs font-bold cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* ================= MODE EKSPOR ================= */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              {/* Components Selection Header */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {lang === 'id' ? 'Pilih Data yang Disertakan' : 'Select Data to Include'}
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setExportOptions({ notes: true, tasks: true, transactions: true, moods: true, userProfile: true, settings: true })}
                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {lang === 'id' ? 'Pilih Semua' : 'Select All'}
                  </button>
                  <span className="text-slate-600 text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={() => setExportOptions({ notes: false, tasks: false, transactions: false, moods: false, userProfile: false, settings: false })}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-400 cursor-pointer"
                  >
                    {lang === 'id' ? 'Batal Semua' : 'Deselect All'}
                  </button>
                </div>
              </div>

              {/* Data Components Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { 
                    key: 'notes', 
                    type: 'notes' as const,
                    label: lang === 'id' ? 'Catatan & Dokumen' : 'Notes & Documents',
                    count: `${notes.length} item`
                  },
                  { 
                    key: 'tasks', 
                    type: 'tasks' as const,
                    label: lang === 'id' ? 'Tugas & Disiplin' : 'Tasks & Habits',
                    count: `${tasks.length} item`
                  },
                  { 
                    key: 'transactions', 
                    type: 'finance' as const,
                    label: lang === 'id' ? 'Keuangan & Tabungan' : 'Finance & Savings',
                    count: `${transactions.length} mutasi`
                  },
                  { 
                    key: 'moods', 
                    type: 'mood' as const,
                    label: lang === 'id' ? 'Mood Harian' : 'Daily Moods',
                    count: `${moods.length} hari`
                  },
                  { 
                    key: 'userProfile', 
                    type: 'user' as const,
                    label: lang === 'id' ? 'Profil & Streak' : 'Profile & Streak',
                    count: `${streak} hari streak`
                  },
                  { 
                    key: 'settings', 
                    type: 'settings' as const,
                    label: lang === 'id' ? 'Setelan & Wallpaper' : 'Settings & Wallpaper',
                    count: lang === 'id' ? 'Lengkap' : 'Complete'
                  }
                ].map(opt => {
                  const isChecked = (exportOptions as any)[opt.key];
                  return (
                    <label 
                      key={opt.key} 
                      className={`flex items-center justify-between p-3 border rounded-2xl cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-slate-950/70 border-indigo-500/40 text-slate-100 shadow-sm' 
                          : 'bg-slate-950/30 border-slate-800/80 text-slate-400 hover:bg-slate-950/50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="shrink-0">{renderModeIcon(opt.type, 18)}</span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold block truncate">{opt.label}</span>
                          <span className="text-[10px] text-slate-500 block truncate">{opt.count}</span>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, [opt.key]: e.target.checked }))}
                        className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
                      />
                    </label>
                  );
                })}
              </div>

              {/* Prefix filename */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3.5 space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  {lang === 'id' ? 'Nama Awalan Berkas' : 'Backup Filename Prefix'}
                </span>
                <input 
                  type="text"
                  value={exportCustomFilename}
                  onChange={e => setExportCustomFilename(e.target.value)}
                  className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-3.5 py-2 text-slate-200 text-xs outline-none focus:border-indigo-500/60 placeholder-slate-600 font-mono"
                  placeholder="tata_cadangan"
                />
              </div>

              {/* Encryption Password */}
              <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                    {renderModeIcon('lock', 14)}
                    {lang === 'id' ? 'Proteksi Sandi AES-256 (Opsional)' : 'AES-256 Encryption (Optional)'}
                  </span>
                  {exportPassword && (
                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                      {renderModeIcon('lock', 12)} {lang === 'id' ? 'Terenkripsi' : 'Encrypted'}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 leading-normal">
                  {lang === 'id' 
                    ? 'Bila diisi, file dienkripsi standar keamanan tinggi AES-GCM 256. Kosongkan jika ingin berkas JSON standar terbuka.' 
                    : 'If set, the file is encrypted with AES-GCM 256. Leave blank for standard open JSON.'}
                </p>
                <div className="relative">
                  <input 
                    type={showExportPassword ? 'text' : 'password'}
                    value={exportPassword}
                    onChange={e => setExportPassword(e.target.value)}
                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-slate-200 text-xs outline-none focus:border-indigo-500/60 placeholder-slate-600 font-mono"
                    placeholder={lang === 'id' ? 'Masukkan kata sandi pengaman...' : 'Enter security password...'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowExportPassword(!showExportPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  >
                    {showExportPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ================= MODE IMPOR ================= */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              {/* Step Progress Pills */}
              <div className="flex items-center justify-between gap-1.5 p-1 bg-slate-950/70 border border-slate-800/80 rounded-2xl text-[11px] font-bold">
                {/* Step 1 Pill */}
                <button
                  type="button"
                  onClick={() => {
                    if (importFileContent) setImportStep(1);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    importStep === 1
                      ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/30'
                      : importFileContent
                        ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15'
                        : 'text-slate-500'
                  }`}
                >
                  {importFileContent ? (
                    <Check size={13} className="stroke-[3] text-emerald-400" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-slate-950 text-[10px] font-black flex items-center justify-center">1</span>
                  )}
                  <span className="truncate">{lang === 'id' ? '1. Pilih Berkas' : '1. Select File'}</span>
                </button>

                {/* Step 2 Pill */}
                <button
                  type="button"
                  disabled={!importFileContent}
                  onClick={() => {
                    if (importFileContent) setImportStep(2);
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all ${
                    !importFileContent
                      ? 'text-slate-600 opacity-50 cursor-not-allowed'
                      : importStep === 2
                        ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 cursor-pointer'
                        : importPreview?.isEncrypted && !importPreview.passwordMatches
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20 cursor-pointer'
                          : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 cursor-pointer'
                  }`}
                >
                  {importFileContent && (!importPreview?.isEncrypted || importPreview?.passwordMatches) ? (
                    <Check size={13} className="stroke-[3] text-emerald-400" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] font-black flex items-center justify-center">2</span>
                  )}
                  <span className="truncate">{lang === 'id' ? '2. Pratinjau' : '2. Preview'}</span>
                </button>

                {/* Step 3 Pill */}
                <button
                  type="button"
                  disabled={!importFileContent || Boolean(importPreview?.isEncrypted && !importPreview.passwordMatches)}
                  onClick={() => {
                    if (importFileContent && (!importPreview?.isEncrypted || importPreview?.passwordMatches)) {
                      setImportStep(3);
                    }
                  }}
                  className={`flex-1 py-1.5 px-2 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all ${
                    !importFileContent || (importPreview?.isEncrypted && !importPreview.passwordMatches)
                      ? 'text-slate-600 opacity-50 cursor-not-allowed'
                      : importStep === 3
                        ? 'bg-emerald-600/25 text-emerald-300 border border-emerald-500/30 cursor-pointer'
                        : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 cursor-pointer'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-slate-700 text-slate-300 text-[10px] font-black flex items-center justify-center">3</span>
                  <span className="truncate">{lang === 'id' ? '3. Metode' : '3. Method'}</span>
                </button>
              </div>

              {/* Progress Modal Overlay during execution */}
              {isProcessingImport && (
                <div className="p-4 bg-slate-950/90 border border-emerald-500/40 rounded-3xl text-center space-y-3 shadow-xl animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <RefreshCw size={22} className="animate-spin text-emerald-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-100 mb-1">
                      {lang === 'id' ? 'Sedang Memulihkan Data' : 'Restoring Your Data'}
                    </h4>
                    <p className="text-xs text-emerald-400 font-medium animate-pulse">
                      {importProgressPhase || (lang === 'id' ? 'Memproses berkas cadangan...' : 'Processing backup records...')}
                    </p>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full animate-[indeterminate_1.5s_infinite_linear]" style={{ width: '70%' }} />
                  </div>
                </div>
              )}

              {/* Success Result View */}
              {importSuccessSummary && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-3xl text-center space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                    <CheckCheck size={24} className="text-emerald-300" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-100 mb-1">
                      {lang === 'id' ? 'Data Berhasil Dipulihkan!' : 'Data Restored Successfully!'}
                    </h4>
                    <p className="text-xs text-slate-300">
                      {lang === 'id' 
                        ? 'Memuat ulang aplikasi secara otomatis untuk menyegarkan seluruh tampilan...' 
                        : 'Reloading application automatically to refresh all views...'}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] pt-1">
                    <div className="bg-slate-900/80 p-2 rounded-xl border border-emerald-500/20">
                      <span className="text-slate-400 block">{lang === 'id' ? 'Catatan' : 'Notes'}</span>
                      <strong className="text-emerald-400 text-xs">{importSuccessSummary.notes}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-xl border border-emerald-500/20">
                      <span className="text-slate-400 block">{lang === 'id' ? 'Tugas' : 'Tasks'}</span>
                      <strong className="text-emerald-400 text-xs">{importSuccessSummary.tasks}</strong>
                    </div>
                    <div className="bg-slate-900/80 p-2 rounded-xl border border-emerald-500/20">
                      <span className="text-slate-400 block">{lang === 'id' ? 'Keuangan' : 'Finance'}</span>
                      <strong className="text-emerald-400 text-xs">{importSuccessSummary.transactions}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1: File Selection Area */}
              {!importFileContent ? (
                <div 
                  onClick={openFileInput}
                  className={`p-6 sm:p-7 rounded-3xl border-2 border-dashed transition-all text-center cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    isDragOver 
                      ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/30 scale-[0.99]' 
                      : 'border-slate-700 hover:border-emerald-500/60 bg-slate-950/40 hover:bg-slate-950/70'
                  }`}
                >
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 shadow-inner">
                    {renderModeIcon('upload', 26)}
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-extrabold text-slate-100">
                      {lang === 'id' ? 'Pilih atau Tarik Berkas Cadangan (.json)' : 'Select or Drop Backup File (.json)'}
                    </h4>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      {lang === 'id' 
                        ? 'Mendukung cadangan penuh Tata v5.1, v5.0, serta berkas migrasi aplikasi Noto lama.' 
                        : 'Supports Tata v5.1 full backups and legacy Noto migration files.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFileInput();
                    }}
                    className="mt-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/25 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                  >
                    <FileJson size={15} />
                    <span>{lang === 'id' ? 'Jelajahi Berkas Perangkat' : 'Browse Device Files'}</span>
                  </button>
                </div>
              ) : (
                /* Selected File Card */
                <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      {renderModeIcon('notes', 20)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-slate-100 block truncate">
                        {importFileName || 'tata_backup.json'}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {importFileSize ? `${(importFileSize / 1024).toFixed(1)} KB` : 'JSON File'} • {
                          importPreview?.isEncrypted 
                            ? (lang === 'id' ? 'Terenkripsi AES-256' : 'AES-256 Encrypted') 
                            : (lang === 'id' ? 'Berkas Terbuka' : 'Standard File')
                        }
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={openFileInput}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-xl transition-all cursor-pointer border border-slate-700 flex items-center gap-1.5"
                    >
                      {renderModeIcon('reset', 12)}
                      <span>{lang === 'id' ? 'Ganti' : 'Change'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={resetImportFile}
                      className="p-1.5 bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 rounded-xl transition-all cursor-pointer border border-slate-700"
                      title={lang === 'id' ? 'Hapus berkas terpilih' : 'Remove selected file'}
                    >
                      {renderModeIcon('trash', 14)}
                    </button>
                  </div>
                </div>
              )}

              {/* Compatibility Badge if Noto */}
              {importPreview?.isNoto && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-start gap-2.5">
                  <span className="mt-0.5 shrink-0">{renderModeIcon('sparkles', 15)}</span>
                  <div className="text-xs text-emerald-300 leading-relaxed font-medium">
                    <strong>{lang === 'id' ? 'Format Noto Terdeteksi:' : 'Noto Format Detected:'}</strong>{' '}
                    {lang === 'id' 
                      ? 'Tata akan mengonversi catatan, tugas, dan transaksi dari aplikasi Noto lama secara otomatis tanpa ada yang hilang.' 
                      : 'Tata will automatically upgrade legacy Noto records with zero data loss.'}
                  </div>
                </div>
              )}

              {/* Encrypted Password Prompt (Step 2 Preview) */}
              {importPreview?.isEncrypted && (
                <div className={`border rounded-2xl p-4 space-y-2.5 transition-all ${
                  importPreview.passwordMatches === true
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : importPreview.passwordMatches === false && importPassword
                      ? 'bg-rose-500/5 border-rose-500/30'
                      : 'bg-slate-950/60 border-amber-500/30'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      {renderModeIcon('lock', 14)}
                      {lang === 'id' ? 'Buka Kunci Enkripsi Berkas' : 'Unlock Encrypted File'}
                    </span>
                    {isCheckingPassword ? (
                      <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                        <RefreshCw size={10} className="animate-spin" /> {lang === 'id' ? 'Memeriksa...' : 'Verifying...'}
                      </span>
                    ) : importPreview.passwordMatches === true ? (
                      <span className="text-[10px] font-extrabold text-emerald-400 flex items-center gap-1 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        <CheckCircle2 size={11} /> {lang === 'id' ? 'Sandi Cocok' : 'Unlocked'}
                      </span>
                    ) : importPreview.passwordMatches === false && importPassword ? (
                      <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/20">
                        {lang === 'id' ? 'Sandi Salah' : 'Wrong Password'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/20">
                        {lang === 'id' ? 'Wajib Sandi' : 'Password Required'}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    {lang === 'id' 
                      ? 'Masukkan kata sandi pengaman yang dibuat saat mengekspor berkas ini untuk membaca isinya.' 
                      : 'Enter the password created when exporting this file to unlock its records.'}
                  </p>
                  <div className="relative">
                    <input 
                      type={showImportPassword ? 'text' : 'password'}
                      value={importPassword}
                      onChange={e => setImportPassword(e.target.value)}
                      className={`w-full bg-slate-900 border rounded-xl pl-3.5 pr-10 py-2.5 text-slate-200 text-xs outline-none font-mono transition-colors ${
                        importPreview.passwordMatches === true
                          ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
                          : importPreview.passwordMatches === false && importPassword
                            ? 'border-rose-500/60 ring-1 ring-rose-500/30'
                            : 'border-slate-800 focus:border-amber-500/50'
                      }`}
                      placeholder={lang === 'id' ? 'Ketik kata sandi cadangan...' : 'Type backup password...'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowImportPassword(!showImportPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    >
                      {showImportPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
              )}

              {/* Data Summary Grid (Step 2) */}
              {importFileContent && importPreview && (!importPreview.isEncrypted || importPreview.passwordMatches) && (
                <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      {lang === 'id' ? 'Ringkasan Data Cadangan' : 'Backup Records Breakdown'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
                      v{importPreview.version}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-slate-300 text-xs">
                    {/* Notes */}
                    <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {renderModeIcon('notes', 16)} 
                        {lang === 'id' ? 'Catatan' : 'Notes'}
                      </span>
                      <div className="text-right">
                        <span className="font-extrabold text-indigo-400">{importPreview.notesCount}</span>
                        {importPreview.lockedNotesCount > 0 && (
                          <span className="text-[10px] text-slate-400 block font-normal">({importPreview.lockedNotesCount} PIN)</span>
                        )}
                      </div>
                    </div>

                    {/* Tasks */}
                    <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {renderModeIcon('tasks', 16)} 
                        {lang === 'id' ? 'Tugas' : 'Tasks'}
                      </span>
                      <div className="text-right">
                        <span className="font-extrabold text-indigo-400">{importPreview.tasksCount}</span>
                        {importPreview.discMediaCount > 0 && (
                          <span className="text-[10px] text-slate-400 block font-normal">({importPreview.discMediaCount} media)</span>
                        )}
                      </div>
                    </div>

                    {/* Finance */}
                    <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {renderModeIcon('finance', 16)} 
                        {lang === 'id' ? 'Keuangan' : 'Finance'}
                      </span>
                      <span className="font-extrabold text-emerald-400">{importPreview.txCount}</span>
                    </div>

                    {/* Mood */}
                    <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {renderModeIcon('mood', 16)} 
                        {lang === 'id' ? 'Mood' : 'Moods'}
                      </span>
                      <span className="font-extrabold text-amber-400">{importPreview.moodsCount}</span>
                    </div>

                    {/* Debts & Savings */}
                    {(importPreview.debtsCount > 0 || importPreview.savingsGoalsCount > 0) && (
                      <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {renderModeIcon('database', 16)} 
                          {lang === 'id' ? 'Hutang / Target' : 'Debts / Goals'}
                        </span>
                        <span className="font-extrabold text-violet-400">
                          {importPreview.debtsCount + importPreview.savingsGoalsCount}
                        </span>
                      </div>
                    )}

                    {/* Profile & Streak */}
                    <div className="p-2.5 bg-slate-900/80 border border-slate-800 rounded-xl flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        {renderModeIcon('user', 16)} 
                        {lang === 'id' ? 'Streak & Profil' : 'Streak & Profile'}
                      </span>
                      <div className="text-right">
                        <span className="font-extrabold text-sky-400">
                          {importPreview.streak ?? 0} {lang === 'id' ? 'hari' : 'days'}
                        </span>
                        {importPreview.userName && (
                          <span className="text-[10px] text-slate-400 block font-normal truncate max-w-[80px]">
                            {importPreview.userName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Restore Strategy Selection */}
              {importFileContent && importPreview && (!importPreview.isEncrypted || importPreview.passwordMatches) && (
                <div className="space-y-2 pt-1">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block px-1">
                    {lang === 'id' ? 'Pilih Metode Pemulihan' : 'Select Restore Strategy'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Replace Strategy */}
                    <div
                      onClick={() => setRestoreStrategy('replace')}
                      className={`p-3.5 border rounded-2xl text-left transition-all cursor-pointer ${
                        restoreStrategy === 'replace'
                          ? 'bg-indigo-500/10 border-indigo-500 text-slate-100 ring-1 ring-indigo-500/30'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-extrabold text-xs text-slate-100">
                          {renderModeIcon('reset', 15)}
                          <span>{lang === 'id' ? 'Ganti Semua Data' : 'Replace All Data'}</span>
                        </div>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          restoreStrategy === 'replace' ? 'border-indigo-500 bg-indigo-500' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {restoreStrategy === 'replace' && <Check size={10} className="text-slate-950 stroke-[3]" />}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {lang === 'id' 
                          ? 'Menimpa data lokal saat ini agar bersih dan sama persis dengan berkas cadangan (disarankan saat ganti HP / reset).' 
                          : 'Replaces current local records completely with backup contents (ideal for migrating to a new device).'}
                      </p>
                    </div>

                    {/* Merge Strategy */}
                    <div
                      onClick={() => setRestoreStrategy('merge')}
                      className={`p-3.5 border rounded-2xl text-left transition-all cursor-pointer ${
                        restoreStrategy === 'merge'
                          ? 'bg-emerald-500/10 border-emerald-500 text-slate-100 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950/70 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 font-extrabold text-xs text-slate-100">
                          {renderModeIcon('plus', 15)}
                          <span>{lang === 'id' ? 'Gabungkan Data' : 'Merge Records'}</span>
                        </div>
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          restoreStrategy === 'merge' ? 'border-emerald-500 bg-emerald-500' : 'border-slate-700 bg-slate-900'
                        }`}>
                          {restoreStrategy === 'merge' && <Check size={10} className="text-slate-950 stroke-[3]" />}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-relaxed">
                        {lang === 'id' 
                          ? 'Menambahkan catatan & tugas dari berkas cadangan secara cerdas tanpa menghapus data lokal yang sedang ada.' 
                          : 'Smartly appends notes & tasks without deleting current records on this device.'}
                      </p>
                    </div>
                  </div>

                  {/* Safety Guarantee Notice */}
                  <div className="p-3 bg-sky-950/20 border border-sky-500/20 rounded-2xl flex items-start gap-2.5 text-sky-300">
                    <span className="mt-0.5 shrink-0">{renderModeIcon('shield', 16)}</span>
                    <div className="text-[11px] leading-relaxed">
                      <strong>{lang === 'id' ? 'Jaminan Keamanan:' : 'Safety Guarantee:'}</strong>{' '}
                      {lang === 'id'
                        ? 'Snapshot cadangan darurat dibuat otomatis sesaat sebelum proses impor berjalan. Data Anda terlindungi sepenuhnya.'
                        : 'An emergency snapshot is automatically created before restoring. Your records are always safe.'}
                    </div>
                  </div>
                </div>
              )}

              {/* Emergency Snapshot Rollback Info */}
              {hasEmergencySnapshot && (
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2 min-w-0">
                    {renderModeIcon('shield', 16)}
                    <div className="min-w-0">
                      <span className="font-bold block truncate">
                        {lang === 'id' ? 'Snapshot Darurat Tersedia' : 'Emergency Snapshot Available'}
                      </span>
                      <span className="text-[10px] text-slate-500 block truncate">
                        {emergencySnapshotDate ? `${lang === 'id' ? 'Disimpan pada' : 'Saved on'} ${emergencySnapshotDate}` : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRollbackSnapshot}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-[11px] font-bold rounded-xl border border-slate-700 transition-all cursor-pointer shrink-0"
                  >
                    {lang === 'id' ? 'Kembalikan' : 'Revert'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex gap-3 pt-3 border-t border-slate-800/80 shrink-0">
          <button 
            type="button"
            onClick={onClose}
            disabled={isProcessingExport || isProcessingImport}
            className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-2xl transition-all cursor-pointer text-center disabled:opacity-50"
          >
            {t('cancel')}
          </button>

          {activeTab === 'export' ? (
            <button 
              type="button"
              disabled={isProcessingExport}
              onClick={processExport}
              className="flex-1 py-3 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center shadow-lg shadow-indigo-600/25 bg-indigo-600 hover:bg-indigo-500 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessingExport ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{lang === 'id' ? 'Memproses...' : 'Processing...'}</span>
                </>
              ) : (
                <>
                  {renderModeIcon('download', 14, 'text-white')}
                  <span>{lang === 'id' ? 'Unduh Cadangan' : 'Export File'}</span>
                </>
              )}
            </button>
          ) : (
            <button 
              type="button"
              disabled={
                isProcessingImport || 
                !importFileContent || 
                (importPreview?.isEncrypted && (!importPassword.trim() || importPreview.passwordMatches === false))
              }
              onClick={processImport}
              className={`flex-1 py-3 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all cursor-pointer text-center shadow-lg flex items-center justify-center gap-2 ${
                isProcessingImport || !importFileContent || (importPreview?.isEncrypted && (!importPassword.trim() || importPreview.passwordMatches === false))
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25 active:scale-95'
              }`}
            >
              {isProcessingImport ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>{lang === 'id' ? 'Memulihkan...' : 'Restoring...'}</span>
                </>
              ) : (
                <>
                  {renderModeIcon('upload', 14, 'text-white')}
                  <span>{lang === 'id' ? 'Pulihkan Sekarang' : 'Restore Now'}</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

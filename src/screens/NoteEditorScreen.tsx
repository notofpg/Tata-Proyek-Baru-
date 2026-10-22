import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import {
  ArrowLeft,
  Trash2,
  Image as ImageIcon,
  Paperclip,
  Bell,
  Clock,
  Calendar,
  X,
  AlertCircle,
  Check,
  Bot,
  Sparkles,
  Shield,
  Eye,
  RefreshCw,
  Camera,
  FileText,
  Scan,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Copy,
  Download,
  Lock,
  Unlock,
  CheckCircle2,
  Maximize2,
  ZoomIn,
  Plus,
  KeyRound,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from '../translations';
import { Note } from "../types";
import { useAppStore } from "../store";
import { formatReminderDate, verifyPin, createPinHash } from "../utils";
import CameraModal from "../components/CameraModal";
import DocumentScannerModal from "../components/DocumentScannerModal";
import { compressImageBase64 } from "../utils/imageCompressor";
import { getOrganicThemePalette } from "../components/home/organicThemePalettes";
import {
  Icon3DArrowLeft,
  Icon3DTrash,
  Icon3DImage,
  Icon3DPaperclip,
  Icon3DBell,
  Icon3DClock,
  Icon3DNavCalendar,
  Icon3DScan,
  Icon3DFileText,
  Icon3DLock,
  Icon3DUnlock,
  Icon3DCheck,
  Icon3DTataAI,
  Icon3DShield,
  Icon3DRefresh,
  Icon3DCamera,
  Icon3DCopy,
  Icon3DDownload,
  Icon3DArchive,
} from "../components/home/Organic3DIcons";

// =============================================================================
// ISOLATED NOTE TITLE INPUT: 0ms Typing Latency, Touch-Friendly, Zero Re-renders
// =============================================================================
const NoteTitleInput = React.memo<{
  initialValue: string;
  isOrganic: boolean;
  palette: any;
  placeholder: string;
  label: string;
  onChange: (val: string) => void;
}>(({ initialValue, isOrganic, palette, placeholder, label, onChange }) => {
  const [val, setVal] = useState(initialValue);

  useEffect(() => {
    setVal(initialValue);
  }, [initialValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setVal(nextVal);
    onChange(nextVal);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="flex flex-col mb-4">
      <span className={`text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1 ${
        palette?.subText || (palette?.isDark ? 'text-slate-400' : 'text-slate-600')
      }`}>
        {label}
      </span>
      <input
        type="text"
        value={val}
        onChange={handleChange}
        onBlur={handleBlur}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        className={`w-full text-xl sm:text-2xl font-normal bg-transparent border-none outline-none tracking-tight transition-colors select-text ${
          palette?.titleText 
            ? `${palette.titleText.replace('font-black', '').replace('font-bold', '')} placeholder:opacity-40` 
            : (palette?.isDark ? 'text-slate-100 placeholder-slate-500' : 'text-slate-900 placeholder-slate-400')
        }`}
        placeholder={placeholder}
      />
    </div>
  );
});

interface NoteEditorProps {
  note: Note;
  onBack: () => void;
  onNavigate?: (screen: any, extra?: any) => void;
  appTheme?: string;
}

export default function NoteEditorScreen({ note, onBack, onNavigate, appTheme }: NoteEditorProps) {
  const { 
    notes,
    addNote, 
    updateNote, 
    deleteNote, 
    lang, 
    setTempNoteContext, 
    setAutoSendNoteToAI, 
    geminiApiKey, 
    appPin, 
    notePin, 
    setNotePin, 
    setAppPin, 
    appVersion, 
    pinRecoveryQuestion, 
    pinRecoveryAnswer, 
    setPinRecoveryAnswer, 
    sessionUnlockedNoteIds, 
    unlockNoteForSession, 
    lockNoteForSession, 
    isLiteMode 
  } = useAppStore();

  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);
  const currentNoteIdRef = useRef(note.id);

  const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : null;
  const effectiveTheme = appTheme || storedTheme || 'dark';

  const palette = useMemo(() => {
    return getOrganicThemePalette(effectiveTheme);
  }, [effectiveTheme]);

  const isLite = effectiveTheme === 'lite' || appVersion === 'lite' || isLiteMode;
  const is3D = !isLite && (appVersion === 'organic' || appVersion === 'pro_max');
  const isOrganic = !isLite && ['organic', 'pro_max', 'cute', 'warm'].includes(effectiveTheme);
  const effectiveNotePin = notePin || appPin;

  const t = useTranslation(lang);
  const titleRef = useRef(note.title || '');

  const [initialHtml] = useState(() => {
    let html = note.content || "";
    if (html && !html.includes("<")) {
      html = html
        .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
        .replace(/\*(.*?)\*/g, "<i>$1</i>")
        .replace(/__(.*?)__/g, "<u>$1</u>")
        .replace(/\n/g, "<br>");
    }
    return html;
  });
  
  const contentRef = useRef(initialHtml);
  const editorRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const statsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExplicitImageDeletion = useRef<boolean>(false);
  const mediaListCountRef = useRef<number>(0);

  const [tags, setTags] = useState<string[]>(note.tags || []);
  const tagsRef = useRef<string[]>(note.tags || []);
  useEffect(() => {
    tagsRef.current = tags;
  }, [tags]);

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const hasUnsavedChangesRef = useRef(false);
  const [lastSaved, setLastSaved] = useState(Date.now());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [reminder, setReminder] = useState<string | undefined>(note.reminder);
  const reminderRef = useRef(note.reminder);
  useEffect(() => {
    reminderRef.current = reminder;
  }, [reminder]);

  const [showReminderModal, setShowReminderModal] = useState(false);
  const [customReminderVal, setCustomReminderVal] = useState("");

  const [showGiveToAIModal, setShowGiveToAIModal] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [scannerInitialImage, setScannerInitialImage] = useState<string | null>(null);
  const [sharedWithAI, setSharedWithAI] = useState<boolean>(!!note.sharedWithAI);
  const sharedWithAIRef = useRef(!!note.sharedWithAI);
  useEffect(() => {
    sharedWithAIRef.current = sharedWithAI;
  }, [sharedWithAI]);

  // Note Lock State
  const [isLocked, setIsLocked] = useState<boolean>(!!note.isLocked);
  const isLockedRef = useRef<boolean>(!!note.isLocked);
  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  const [isNoteUnlocked, setIsNoteUnlocked] = useState<boolean>(() => !note.isLocked || !effectiveNotePin || sessionUnlockedNoteIds.includes(note.id));
  const [pinUnlockMode, setPinUnlockMode] = useState<'open' | 'remove'>('open');
  const [unlockPinInput, setUnlockPinInput] = useState<string>('');
  const [unlockPinError, setUnlockPinError] = useState<boolean>(false);
  const [showSetupPinModal, setShowSetupPinModal] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);
  const [exportedToast, setExportedToast] = useState<boolean>(false);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotAnswerInput, setForgotAnswerInput] = useState<string>('');
  const [forgotAnswerError, setForgotAnswerError] = useState<boolean>(false);

  // Photo & Media management state
  const [selectedImage, setSelectedImage] = useState<{ src: string; alt?: string; element?: HTMLImageElement } | null>(null);
  const [showImageModal, setShowImageModal] = useState<boolean>(false);
  const [isFullScreenZoom, setIsFullScreenZoom] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showDeleteImageConfirm, setShowDeleteImageConfirm] = useState<boolean>(false);
  const [mediaList, setMediaList] = useState<Array<{ id: string; type: 'image' | 'file'; src: string; alt?: string; filename?: string; size?: string }>>([]);

  const syncMediaList = () => {
    if (typeof document === 'undefined') return;
    const content = (editorRef.current ? editorRef.current.innerHTML : contentRef.current) || '';
    const div = document.createElement('div');
    div.innerHTML = content;
    
    const items: Array<{ id: string; type: 'image' | 'file'; src: string; alt?: string; filename?: string; size?: string }> = [];
    
    const imgs = Array.from(div.querySelectorAll('img'));
    imgs.forEach((img, idx) => {
      items.push({
        id: `img-${idx}-${img.src.slice(0, 20)}`,
        type: 'image',
        src: img.src,
        alt: img.alt || (lang === 'id' ? `Foto ${idx + 1}` : `Photo ${idx + 1}`)
      });
    });

    const docs = Array.from(div.querySelectorAll('a[download]'));
    docs.forEach((doc, idx) => {
      items.push({
        id: `doc-${idx}-${doc.getAttribute('download')}`,
        type: 'file',
        src: doc.getAttribute('href') || '',
        filename: doc.getAttribute('download') || 'Dokumen',
        size: doc.textContent?.split('•')[1]?.trim() || ''
      });
    });

    mediaListCountRef.current = items.length;
    setMediaList(items);
  };

  useEffect(() => {
    syncMediaList();
  }, []);

  // Detail Formatting Tools State
  const [showDetailedTools, setShowDetailedTools] = useState<boolean>(true);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikeThrough: false,
  });

  const savedRangeRef = useRef<Range | null>(null);

  const saveSelection = () => {
    if (typeof window === 'undefined' || !editorRef.current) return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (editorRef.current.contains(range.commonAncestorContainer)) {
        savedRangeRef.current = range.cloneRange();
      }
    }
  };

  const restoreSelection = () => {
    if (!editorRef.current || typeof window === 'undefined') return;
    editorRef.current.focus();
    const sel = window.getSelection();
    if (!sel) return;

    if (savedRangeRef.current && editorRef.current.contains(savedRangeRef.current.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      savedRangeRef.current = range.cloneRange();
    }
  };

  const updateActiveFormats = () => {
    if (typeof document === 'undefined' || !editorRef.current) return;
    try {
      const b = Boolean(document.queryCommandState('bold'));
      const i = Boolean(document.queryCommandState('italic'));
      const u = Boolean(document.queryCommandState('underline'));
      const s = Boolean(document.queryCommandState('strikeThrough'));
      setActiveFormats((prev) => {
        if (prev.bold === b && prev.italic === i && prev.underline === u && prev.strikeThrough === s) {
          return prev;
        }
        return { bold: b, italic: i, underline: u, strikeThrough: s };
      });
    } catch (e) {
      // ignore
    }
  };

  const applyBasicFormat = (cmd: 'bold' | 'italic' | 'underline' | 'strikeThrough') => {
    if (!editorRef.current) return;
    restoreSelection();
    try {
      document.execCommand(cmd, false, undefined);
    } catch (e) {
      console.warn(`${cmd} failed:`, e);
    }
    saveSelection();
    contentRef.current = editorRef.current.innerHTML;
    if (!hasUnsavedChangesRef.current) {
      hasUnsavedChangesRef.current = true;
      setHasUnsavedChanges(true);
    }
    updateActiveFormats();
    triggerAutosave();
  };

  const lastFormatCheckRef = useRef(0);
  const checkActiveFormatsDebounced = () => {
    const now = Date.now();
    if (now - lastFormatCheckRef.current < 250) return;
    lastFormatCheckRef.current = now;
    updateActiveFormats();
  };

  const handleEditorKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowRight' ||
      e.key === 'ArrowUp' ||
      e.key === 'ArrowDown' ||
      e.key === 'Home' ||
      e.key === 'End' ||
      e.ctrlKey ||
      e.metaKey
    ) {
      saveSelection();
      updateActiveFormats();
    }
  };

  const handleEditorMouseUp = () => {
    saveSelection();
    updateActiveFormats();
  };

  const handleEditorTouchEnd = () => {
    saveSelection();
    updateActiveFormats();
  };

  const handleEditorSelect = () => {
    saveSelection();
    checkActiveFormatsDebounced();
  };



  const handleCopyText = () => {
    const plainText = (editorRef.current ? editorRef.current.innerText : contentRef.current) || '';
    const currentTitle = titleRef.current;
    navigator.clipboard.writeText(`${currentTitle ? currentTitle + '\n\n' : ''}${plainText}`);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleExportTxt = () => {
    const plainText = (editorRef.current ? editorRef.current.innerText : contentRef.current) || '';
    const currentTitle = titleRef.current;
    const fullContent = `${currentTitle || (lang === 'id' ? 'Catatan Tata' : 'Tata Note')}\nDate: ${note.date}\n----------------------------------------\n\n${plainText}`;
    const blob = new Blob([fullContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(currentTitle || 'catatan_tata').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setExportedToast(true);
    setTimeout(() => setExportedToast(false), 2500);
  };

  const handleToggleLock = () => {
    if (!effectiveNotePin) {
      setShowSetupPinModal(true);
      return;
    }
    const nextLock = !isLocked;
    setIsLocked(nextLock);
    isLockedRef.current = nextLock;
    setHasUnsavedChanges(true);
    saveNote();
  };

  const handleVerifyNotePin = async (inputPin: string) => {
    if (!effectiveNotePin) {
      setIsNoteUnlocked(true);
      return;
    }
    const isValid = await verifyPin(inputPin, effectiveNotePin || '');
    if (isValid || inputPin === effectiveNotePin) {
      if (pinUnlockMode === 'remove') {
        setIsLocked(false);
        isLockedRef.current = false;
        lockNoteForSession(note.id);
        const updated = { ...note, isLocked: false };
        updateNote(updated);
        setToastMessage(lang === 'id' ? 'Kunci PIN pada catatan berhasil dihapus.' : 'PIN lock removed from note.');
        setTimeout(() => setToastMessage(null), 2500);
      } else {
        unlockNoteForSession(note.id);
      }
      setIsNoteUnlocked(true);
      setUnlockPinError(false);
    } else {
      setUnlockPinError(true);
      setTimeout(() => setUnlockPinInput(''), 400);
    }
  };

  const handleForgotNotePinSubmit = async () => {
    if (!pinRecoveryAnswer || !forgotAnswerInput.trim()) return;
    const isValid = await verifyPin(forgotAnswerInput.trim().toLowerCase(), pinRecoveryAnswer || '');
    const isCorrect = isValid || forgotAnswerInput.trim().toLowerCase() === (pinRecoveryAnswer || '').trim().toLowerCase();

    if (isCorrect) {
      if (pinRecoveryAnswer && !pinRecoveryAnswer.startsWith('pbkdf2_v1.')) {
        const hashed = await createPinHash(forgotAnswerInput.trim().toLowerCase());
        setPinRecoveryAnswer(hashed);
      }
      if (pinUnlockMode === 'remove') {
        setIsLocked(false);
        isLockedRef.current = false;
        lockNoteForSession(note.id);
        const updated = { ...note, isLocked: false };
        updateNote(updated);
        setToastMessage(lang === 'id' ? 'Kunci PIN pada catatan berhasil dihapus.' : 'PIN lock removed from note.');
        setTimeout(() => setToastMessage(null), 2500);
      } else {
        unlockNoteForSession(note.id);
      }
      setIsNoteUnlocked(true);
      setShowForgotModal(false);
      setForgotAnswerInput('');
      setForgotAnswerError(false);
      setToastMessage(lang === 'id' ? 'Jawaban keamanan benar! Catatan berhasil dibuka.' : 'Security answer correct! Note unlocked.');
      setTimeout(() => setToastMessage(null), 3000);
    } else {
      setForgotAnswerError(true);
      setTimeout(() => setForgotAnswerError(false), 600);
    }
  };

  const [stats, setStats] = useState(() => {
    const raw = (note.content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      words: raw ? raw.split(' ').filter(Boolean).length : 0,
      chars: raw.length
    };
  });

  useEffect(() => {
    if (editorRef.current) {
      if (editorRef.current.innerHTML !== initialHtml) {
        editorRef.current.innerHTML = initialHtml;
      }
      editorRef.current.querySelectorAll('img').forEach((img) => {
        img.setAttribute('contenteditable', 'false');
        img.setAttribute('draggable', 'false');
        img.style.userSelect = 'none';
      });
      syncMediaList();
    }
  }, []); // Only run once on mount

  // Shield note images from accidental keyboard/browser deletion
  useEffect(() => {
    if (!editorRef.current) return;

    const observer = new MutationObserver((mutations) => {
      // If deletion was explicitly triggered by user clicking the dedicated photo delete button, allow it
      if (isExplicitImageDeletion.current) return;

      // Fast path: if there are no images in the note at all, skip checking immediately
      if (mediaListCountRef.current === 0 && !editorRef.current?.querySelector('img')) return;

      // Fast check: verify if any removed node was an IMG element or contains an IMG
      let hasImageRemoved = false;
      for (const m of mutations) {
        if (m.type === 'childList' && m.removedNodes.length > 0) {
          for (let i = 0; i < m.removedNodes.length; i++) {
            const node = m.removedNodes[i];
            if (node.nodeName === 'IMG' || (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).querySelector?.('img'))) {
              hasImageRemoved = true;
              break;
            }
          }
        }
        if (hasImageRemoved) break;
      }

      if (!hasImageRemoved) return;

      let restored = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          mutation.removedNodes.forEach((node) => {
            const imgsToRestore: HTMLImageElement[] = [];
            if (node.nodeName === 'IMG') {
              imgsToRestore.push(node as HTMLImageElement);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              const el = node as HTMLElement;
              el.querySelectorAll?.('img')?.forEach((im) => imgsToRestore.push(im));
            }

            if (imgsToRestore.length > 0) {
              restored = true;
              const parent = mutation.target;
              const next = mutation.nextSibling;
              imgsToRestore.forEach((img) => {
                img.setAttribute('contenteditable', 'false');
                img.setAttribute('draggable', 'false');
                img.style.userSelect = 'none';
                if (parent && parent.isConnected) {
                  if (next && next.parentNode === parent) {
                    parent.insertBefore(img, next);
                  } else {
                    parent.appendChild(img);
                  }
                }
              });
            }
          });
        }
      }

      if (restored) {
        if (editorRef.current) {
          contentRef.current = editorRef.current.innerHTML;
        }
        syncMediaList();
        setToastMessage(
          lang === 'id'
            ? 'Foto terlindungi dari tombol keyboard. Gunakan tombol hapus khusus foto di atas.'
            : 'Photo protected from keyboard deletion. Use the dedicated photo delete button above.'
        );
        setTimeout(() => setToastMessage(null), 3000);
      }
    });

    observer.observe(editorRef.current, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [lang]);

  const handleGiveToAI = () => {
    if (editorRef.current) {
      contentRef.current = editorRef.current.innerHTML;
    }
    const fullContent = contentRef.current || '';
    setSharedWithAI(true);
    sharedWithAIRef.current = true;
    
    const currTitle = (titleRef.current || '').trim();
    setTempNoteContext({
      title: currTitle || (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note'),
      content: fullContent,
      thumbnailUrl: note.thumbnailUrl
    });
    setAutoSendNoteToAI(true);
    
    const noteId = currentNoteIdRef.current;
    const existing = notesRef.current.find((n) => n.id === noteId);
    const currTags = tagsRef.current || [];
    const currReminder = reminderRef.current;

    const imgMatch = fullContent.match(/<img[^>]+src=["']([^"']+)["']/i);
    const rawThumb = imgMatch ? imgMatch[1] : undefined;
    const effectiveThumb = rawThumb && rawThumb.startsWith('data:image/') ? undefined : (rawThumb || existing?.thumbnailUrl);

    const now = Date.now();
    const savedNote: Note = {
      ...(existing || note),
      id: noteId,
      title: currTitle,
      content: fullContent,
      tags: currTags,
      reminder: currReminder,
      sharedWithAI: true,
      isLocked: isLockedRef.current,
      updatedAt: now,
      date: (existing || note).date || new Date().toISOString().split('T')[0],
      thumbnailUrl: effectiveThumb
    };

    if (existing) {
      updateNote(savedNote);
      notesRef.current = notesRef.current.map((n) => (n.id === noteId ? savedNote : n));
    } else {
      addNote(savedNote);
      notesRef.current = [savedNote, ...notesRef.current.filter((n) => n.id !== noteId)];
    }
    
    hasUnsavedChangesRef.current = false;
    setHasUnsavedChanges(false);
    setShowGiveToAIModal(false);

    if (onNavigate) {
      onNavigate('ai-companion', { fromNote: savedNote });
    }
  };

  const handleRevokeAIAccess = () => {
    setSharedWithAI(false);
    sharedWithAIRef.current = false;
    
    // Also clear from temp context if currently selected
    setTempNoteContext(null);
    
    const noteId = currentNoteIdRef.current;
    const existing = notesRef.current.find((n) => n.id === noteId);
    const currTitle = (titleRef.current || '').trim();
    const currContent = (editorRef.current ? editorRef.current.innerHTML : contentRef.current) || '';
    const currTags = tagsRef.current || [];
    const currReminder = reminderRef.current;
    
    const now = Date.now();
    if (existing) {
      const updated: Note = { ...existing, title: currTitle, content: currContent, tags: currTags, reminder: currReminder, sharedWithAI: false, isLocked: isLockedRef.current, updatedAt: now };
      updateNote(updated);
      notesRef.current = notesRef.current.map((n) => (n.id === noteId ? updated : n));
    } else {
      const added: Note = { ...note, id: noteId, title: currTitle, content: currContent, tags: currTags, reminder: currReminder, sharedWithAI: false, isLocked: isLockedRef.current, updatedAt: now };
      addNote(added);
      notesRef.current = [added, ...notesRef.current.filter((n) => n.id !== noteId)];
    }
    
    setShowGiveToAIModal(false);
  };

  const saveNote = (silent: boolean = false) => {
    const noteId = currentNoteIdRef.current;
    const existing = notesRef.current.find((n) => n.id === noteId);
    const currTitle = (titleRef.current || '').trim();
    const currContent = (editorRef.current ? editorRef.current.innerHTML : contentRef.current) || '';
    if (editorRef.current) {
      contentRef.current = currContent;
    }
    const currTags = tagsRef.current || [];
    const currReminder = reminderRef.current;
    const currSharedWithAI = sharedWithAIRef.current;
    const currIsLocked = isLockedRef.current;

    // Check if nothing changed to prevent redundant store updates & UI lag
    if (
      existing &&
      (existing.title || '').trim() === currTitle &&
      (existing.content || '') === currContent &&
      JSON.stringify(existing.tags || []) === JSON.stringify(currTags || []) &&
      existing.reminder === currReminder &&
      existing.sharedWithAI === currSharedWithAI &&
      existing.isLocked === currIsLocked
    ) {
      if (!silent) {
        setHasUnsavedChanges(false);
        setIsSaving(false);
      }
      hasUnsavedChangesRef.current = false;
      return;
    }

    if (!silent) setIsSaving(true);
    
    const rawDomText = editorRef.current ? (editorRef.current.innerText || editorRef.current.textContent || '') : '';
    const hasMedia = currContent.includes('<img') || currContent.includes('<a') || currContent.includes('src=');
    const cleanText = currContent.replace(/<br\s*\/?>/gi, '').replace(/<div>\s*<\/div>/gi, '').replace(/<[^>]*>/g, '').replace(/&nbsp;/gi, '').trim();
    const hasMeaningfulContent = Boolean(currTitle || rawDomText.trim() || cleanText || hasMedia || currTags.length > 0 || currReminder || currSharedWithAI || currIsLocked);

    // Save if has meaningful content or if note already exists (NEVER auto-delete an existing note in saveNote!)
    if (hasMeaningfulContent || existing) {
      const imgMatch = currContent.match(/<img[^>]+src=["']([^"']+)["']/i);
      const rawThumb = imgMatch ? imgMatch[1] : undefined;
      // If the thumb is a base64 image, do not duplicate it into thumbnailUrl since extractFirstImageUrl already reads it from content
      const effectiveThumb = rawThumb && rawThumb.startsWith('data:image/') ? undefined : (rawThumb || existing?.thumbnailUrl);

      const now = Date.now();
      const updatedNote: Note = {
        ...(existing || note),
        id: noteId,
        title: currTitle,
        content: currContent,
        tags: currTags,
        reminder: currReminder,
        sharedWithAI: currSharedWithAI,
        isLocked: currIsLocked,
        updatedAt: now,
        date: (existing || note).date || new Date().toISOString().split('T')[0],
        thumbnailUrl: effectiveThumb
      };

      if (existing) {
        updateNote(updatedNote);
        notesRef.current = notesRef.current.map((n) => (n.id === noteId ? updatedNote : n));
      } else {
        addNote(updatedNote);
        notesRef.current = [updatedNote, ...notesRef.current.filter((n) => n.id !== noteId)];
      }
    }
    
    hasUnsavedChangesRef.current = false;
    if (!silent) {
      setHasUnsavedChanges(false);
      setIsSaving(false);
      setLastSaved(Date.now());
    }
  };

  const triggerAutosave = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      saveNote(true);
    }, 600);
  };

  // Synchronous flush before DOM detachment on unmount (useLayoutEffect runs BEFORE DOM nodes are detached)
  useLayoutEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
      if (editorRef.current) {
        contentRef.current = editorRef.current.innerHTML;
      }
      saveNote(true);
    };
  }, []);

  // Safe flush on page hide, beforeunload, or visibility change
  useEffect(() => {
    const handleFlushSync = () => {
      if (editorRef.current) {
        contentRef.current = editorRef.current.innerHTML;
      }
      saveNote(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleFlushSync();
      }
    };

    window.addEventListener('pagehide', handleFlushSync);
    window.addEventListener('beforeunload', handleFlushSync);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', handleFlushSync);
      window.removeEventListener('beforeunload', handleFlushSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleTitleChange = useCallback((newTitle: string) => {
    titleRef.current = newTitle;
    hasUnsavedChangesRef.current = true;
    triggerAutosave();
  }, []);

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    contentRef.current = e.currentTarget.innerHTML;
    hasUnsavedChangesRef.current = true;

    // Debounced stats calculation for butter-smooth typing
    if (statsTimeoutRef.current) clearTimeout(statsTimeoutRef.current);
    statsTimeoutRef.current = setTimeout(() => {
      const rawText = (editorRef.current ? editorRef.current.textContent : contentRef.current) || '';
      const cleanText = rawText.replace(/\s+/g, ' ').trim();
      const words = cleanText ? cleanText.split(' ').filter(Boolean).length : 0;
      const chars = cleanText.length;
      setStats({ words, chars });
    }, 300);

    triggerAutosave();
  };

  const handleBack = () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (statsTimeoutRef.current) {
      clearTimeout(statsTimeoutRef.current);
    }
    if (editorRef.current) {
      contentRef.current = editorRef.current.innerHTML;
    }
    saveNote(false);
    onBack();
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const docAttachRef = useRef<HTMLInputElement>(null);

  const handleNativeCamera = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.value = '';
      cameraInputRef.current.click();
    }
  };

  const insertHtmlToEditor = (htmlToInsert: string) => {
    if (!editorRef.current) return;
    // Create temporary wrapper and parse incoming HTML
    const temp = document.createElement('div');
    temp.innerHTML = htmlToInsert;

    // Apply strict protective attributes to all images
    temp.querySelectorAll('img').forEach((img) => {
      img.setAttribute('contenteditable', 'false');
      img.setAttribute('draggable', 'false');
      img.style.userSelect = 'none';
      img.style.maxWidth = '100%';
      img.style.borderRadius = '8px';
      img.style.display = 'block';
      img.style.margin = '12px 0';
    });

    const nodes = Array.from(temp.childNodes);
    if (nodes.length === 0) return;

    let insertedAtCaret = false;
    try {
      restoreSelection();
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const frag = document.createDocumentFragment();
        nodes.forEach((n) => frag.appendChild(n));
        range.insertNode(frag);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
        savedRangeRef.current = range.cloneRange();
        insertedAtCaret = true;
      }
    } catch (_) {
      insertedAtCaret = false;
    }

    // Fallback: If not inserted at caret, append directly to editor
    if (!insertedAtCaret && editorRef.current) {
      const fallbackDiv = document.createElement('div');
      fallbackDiv.innerHTML = htmlToInsert;
      Array.from(fallbackDiv.childNodes).forEach((n) => {
        editorRef.current?.appendChild(n);
      });
    }

    // Re-verify styling and attributes on all images in the editor
    editorRef.current.querySelectorAll('img').forEach((img) => {
      img.setAttribute('contenteditable', 'false');
      img.setAttribute('draggable', 'false');
      img.style.userSelect = 'none';
      img.style.maxWidth = '100%';
      img.style.borderRadius = '8px';
      img.style.display = 'block';
      img.style.margin = '12px 0';
    });

    contentRef.current = editorRef.current.innerHTML;
    hasUnsavedChangesRef.current = true;
    setHasUnsavedChanges(true);
    syncMediaList();
    // Flush immediate save so photos & media are saved synchronously into state and IndexedDB
    saveNote(true);
  };

  // Helper to determine if a backspace/delete action would remove or target an image
  const checkWouldDeleteImage = (direction: 'backward' | 'forward'): HTMLImageElement | null => {
    if (typeof window === 'undefined' || !editorRef.current) return null;
    if (mediaList.length === 0 && !editorRef.current.querySelector('img')) return null;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;

    const range = sel.getRangeAt(0);

    // 1. If a range is highlighted/selected (not collapsed)
    if (!range.collapsed) {
      const fragment = range.cloneContents();
      const imgInFragment = fragment.querySelector('img');
      if (imgInFragment) {
        return imgInFragment as HTMLImageElement;
      }
      if (range.startContainer.nodeName === 'IMG') return range.startContainer as HTMLImageElement;
      if (range.endContainer.nodeName === 'IMG') return range.endContainer as HTMLImageElement;
      return null;
    }

    // 2. Collapsed Caret
    const container = range.startContainer;
    const offset = range.startOffset;

    if (direction === 'backward') {
      // Caret inside an element node: check the child node directly preceding the caret
      if (container.nodeType === Node.ELEMENT_NODE) {
        const el = container as HTMLElement;
        if (offset > 0) {
          let node: Node | null = el.childNodes[offset - 1];
          while (node && node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'IMG' && node.lastChild) {
            node = node.lastChild;
          }
          if (node && node.nodeName === 'IMG') {
            return node as HTMLImageElement;
          }
        }
      } else if (container.nodeType === Node.TEXT_NODE) {
        if (offset === 0) {
          // At start of text node, search backwards for preceding significant node
          let curr: Node | null = container;
          while (curr && curr !== editorRef.current) {
            let prev = curr.previousSibling;
            while (prev) {
              if (prev.nodeType === Node.TEXT_NODE && !prev.textContent?.trim()) {
                prev = prev.previousSibling;
                continue;
              }
              let deep: Node = prev;
              while (deep.nodeType === Node.ELEMENT_NODE && deep.nodeName !== 'IMG' && deep.lastChild) {
                deep = deep.lastChild;
              }
              if (deep.nodeName === 'IMG') {
                return deep as HTMLImageElement;
              }
              break;
            }
            if (prev) break;
            curr = curr.parentNode;
          }
        }
      }
    } else {
      // Forward direction (Delete key)
      if (container.nodeType === Node.ELEMENT_NODE) {
        const el = container as HTMLElement;
        if (offset < el.childNodes.length) {
          let node: Node | null = el.childNodes[offset];
          while (node && node.nodeType === Node.ELEMENT_NODE && node.nodeName !== 'IMG' && node.firstChild) {
            node = node.firstChild;
          }
          if (node && node.nodeName === 'IMG') {
            return node as HTMLImageElement;
          }
        }
      } else if (container.nodeType === Node.TEXT_NODE) {
        const text = container.textContent || '';
        if (offset >= text.length) {
          // At end of text node, search forwards for next significant node
          let curr: Node | null = container;
          while (curr && curr !== editorRef.current) {
            let next = curr.nextSibling;
            while (next) {
              if (next.nodeType === Node.TEXT_NODE && !next.textContent?.trim()) {
                next = next.nextSibling;
                continue;
              }
              let deep: Node = next;
              while (deep.nodeType === Node.ELEMENT_NODE && deep.nodeName !== 'IMG' && deep.firstChild) {
                deep = deep.firstChild;
              }
              if (deep.nodeName === 'IMG') {
                return deep as HTMLImageElement;
              }
              break;
            }
            if (next) break;
            curr = curr.parentNode;
          }
        }
      }
    }

    return null;
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      if (mediaList.length === 0 && !editorRef.current?.querySelector('img')) {
        return;
      }
      const direction = e.key === 'Backspace' ? 'backward' : 'forward';
      const targetImg = checkWouldDeleteImage(direction);

      if (targetImg) {
        e.preventDefault();
        e.stopPropagation();

        // Safely reposition cursor to opposite side of image without deleting it
        const sel = window.getSelection();
        if (sel) {
          const newRange = document.createRange();
          if (direction === 'backward') {
            newRange.setStartBefore(targetImg);
          } else {
            newRange.setStartAfter(targetImg);
          }
          newRange.collapse(true);
          sel.removeAllRanges();
          sel.addRange(newRange);
          savedRangeRef.current = newRange.cloneRange();
        }

        setToastMessage(
          lang === 'id'
            ? 'Foto terlindungi dari tombol hapus keyboard. Gunakan tombol hapus khusus foto di atas.'
            : 'Photo protected from keyboard delete. Use the dedicated photo delete button above.'
        );
        setTimeout(() => setToastMessage(null), 2500);
        return;
      }
    }

    // Intercept Cut shortcut (Ctrl+X / Cmd+X) when selection includes an image
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed) {
        const frag = sel.getRangeAt(0).cloneContents();
        if (frag.querySelector('img')) {
          e.preventDefault();
          setToastMessage(
            lang === 'id'
              ? 'Potong teks tidak dapat menghapus foto. Gunakan tombol hapus khusus foto.'
              : 'Cut cannot delete photos. Use the dedicated photo delete button.'
          );
          setTimeout(() => setToastMessage(null), 2500);
        }
      }
    }
  };

  const handleEditorBeforeInput = (e: React.FormEvent<HTMLDivElement>) => {
    const native = e.nativeEvent as InputEvent;
    if (!native || !native.inputType) return;

    if (native.inputType.startsWith('delete')) {
      if (mediaList.length === 0 && !editorRef.current?.querySelector('img')) {
        return;
      }
      const isBackward = native.inputType.includes('Backward');
      const isForward = native.inputType.includes('Forward');
      const targetImg = checkWouldDeleteImage(isBackward ? 'backward' : isForward ? 'forward' : 'backward');

      if (targetImg) {
        e.preventDefault();
        native.preventDefault?.();
        setToastMessage(
          lang === 'id'
            ? 'Foto terlindungi dari tombol hapus keyboard. Gunakan tombol hapus khusus foto.'
            : 'Photo protected from keyboard deletion. Use the dedicated photo delete button.'
        );
        setTimeout(() => setToastMessage(null), 2500);
      }
    }
  };

  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const imgTarget = target.closest('img') || (target.tagName === 'IMG' ? target : null);
    if (imgTarget) {
      e.preventDefault();
      e.stopPropagation();
      const imgEl = imgTarget as HTMLImageElement;
      setSelectedImage({
        src: imgEl.src,
        alt: imgEl.alt || (lang === 'id' ? 'Foto Catatan' : 'Note Photo'),
        element: imgEl
      });
      setShowDeleteImageConfirm(false);
      setShowImageModal(true);
    }
  };

  const handleDeleteImage = (targetSrcOrElement?: string | HTMLImageElement) => {
    if (!editorRef.current) return;
    
    isExplicitImageDeletion.current = true;

    const target = targetSrcOrElement || selectedImage?.element || selectedImage?.src;
    if (!target) {
      isExplicitImageDeletion.current = false;
      return;
    }
    
    let deleted = false;
    if (typeof target !== 'string' && target.parentNode) {
      const prev = target.previousSibling;
      const next = target.nextSibling;
      target.remove();
      if (prev && prev.nodeName === 'BR' && next && next.nodeName === 'BR') {
        prev.remove();
      }
      deleted = true;
    } else if (typeof target === 'string') {
      const imgs = editorRef.current.querySelectorAll('img');
      for (let i = 0; i < imgs.length; i++) {
        if (imgs[i].src === target || imgs[i].getAttribute('src') === target) {
          const prev = imgs[i].previousSibling;
          const next = imgs[i].nextSibling;
          imgs[i].remove();
          if (prev && prev.nodeName === 'BR' && next && next.nodeName === 'BR') {
            prev.remove();
          }
          deleted = true;
          break;
        }
      }
    }

    if (deleted) {
      contentRef.current = editorRef.current.innerHTML;
      hasUnsavedChangesRef.current = true;
      setHasUnsavedChanges(true);
      saveNote();
      syncMediaList();
      setShowImageModal(false);
      setSelectedImage(null);
      setShowDeleteImageConfirm(false);
      setToastMessage(lang === 'id' ? 'Foto berhasil dihapus dari catatan' : 'Photo removed from note');
      setTimeout(() => setToastMessage(null), 2500);
    }

    setTimeout(() => {
      isExplicitImageDeletion.current = false;
    }, 150);
  };

  const handleDeleteAttachment = (href: string) => {
    if (!editorRef.current) return;
    const links = editorRef.current.querySelectorAll('a[download]');
    let deleted = false;
    for (let i = 0; i < links.length; i++) {
      const el = links[i];
      if (el.getAttribute('href') === href || el.closest('div')?.innerHTML.includes(href)) {
        const wrapper = el.closest('div[contenteditable="false"]') || el;
        const prev = wrapper.previousSibling;
        const next = wrapper.nextSibling;
        wrapper.remove();
        if (prev && prev.nodeName === 'BR' && next && next.nodeName === 'BR') {
          prev.remove();
        }
        deleted = true;
        break;
      }
    }
    if (deleted) {
      contentRef.current = editorRef.current.innerHTML;
      hasUnsavedChangesRef.current = true;
      setHasUnsavedChanges(true);
      saveNote();
      syncMediaList();
      setToastMessage(lang === 'id' ? 'Lampiran berhasil dihapus dari catatan' : 'Attachment removed from note');
      setTimeout(() => setToastMessage(null), 2500);
    }
  };

  const handleReplaceImage = (targetSrc: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (file && editorRef.current) {
        const reader = new FileReader();
        reader.onload = async (ev) => {
          let newDataUrl = ev.target?.result as string;
          if (newDataUrl) {
            newDataUrl = await compressImageBase64(newDataUrl, 1200, 1200, 0.75);
          }
          const imgs = editorRef.current?.querySelectorAll('img');
          if (imgs) {
            for (let i = 0; i < imgs.length; i++) {
              if (imgs[i].src === targetSrc || imgs[i].getAttribute('src') === targetSrc) {
                imgs[i].src = newDataUrl;
                imgs[i].setAttribute('contenteditable', 'false');
                imgs[i].setAttribute('draggable', 'false');
                imgs[i].style.userSelect = 'none';
                break;
              }
            }
          }
          contentRef.current = editorRef.current?.innerHTML || '';
          hasUnsavedChangesRef.current = true;
          setHasUnsavedChanges(true);
          saveNote();
          syncMediaList();
          setShowImageModal(false);
          setSelectedImage(null);
          setToastMessage(lang === 'id' ? 'Foto berhasil diganti' : 'Photo replaced');
          setTimeout(() => setToastMessage(null), 2500);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleDownloadImage = (src: string, filename = 'catatan-foto.png') => {
    const a = document.createElement('a');
    a.href = src;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCameraCapture = (dataUrlOrUrls: string | string[]) => {
    const urls = Array.isArray(dataUrlOrUrls) ? dataUrlOrUrls : [dataUrlOrUrls];
    const validUrls = urls.filter((u) => u && typeof u === 'string' && (u.startsWith('data:image/') || u.startsWith('blob:') || u.startsWith('http')));
    if (validUrls.length === 0) return;

    const html = validUrls
      .map(
        (url) =>
          `<br><img src="${url}" alt="photo" contenteditable="false" draggable="false" style="max-width: 100%; border-radius: 8px; user-select: none; display: block; margin: 12px 0;" /><br>`
      )
      .join('');
    insertHtmlToEditor(html);

    setToastMessage(lang === 'id' ? 'Foto berhasil disimpan ke catatan' : 'Photo saved to note');
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenScannerWithImage = (capturedDataUrl?: string) => {
    setScannerInitialImage(capturedDataUrl || null);
    setShowScannerModal(true);
  };

  const handleInsertScannedToNote = (scannedImages: string[]) => {
    if (scannedImages.length > 0) {
      const imgsHtml = scannedImages
        .map((imgUrl) => `<br><img src="${imgUrl}" alt="scanned_doc" contenteditable="false" draggable="false" style="max-width: 100%; border-radius: 8px; user-select: none; display: block; margin: 8px 0;" />`)
        .join('<br>');
      const html = `<br>${imgsHtml}<br><br>`;
      insertHtmlToEditor(html);
    }
  };

  const handleInsertOCRText = (ocrText: string) => {
    if (ocrText && ocrText.trim()) {
      const formatted = ocrText
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .join('<br>');
      const html = `<br><blockquote style="border-left: 3px solid #6366f1; padding-left: 12px; margin: 12px 0; color: #d4d4d8;"><strong>[Teks Hasil Scan OCR]:</strong><br>${formatted}</blockquote><br>`;
      insertHtmlToEditor(html);
    }
  };

  const processMultipleImageFiles = async (files: File[]) => {
    if (files.length === 0) return;

    const count = files.length;
    setToastMessage(
      lang === 'id' 
        ? (count > 1 ? `Memproses ${count} foto sekaligus...` : 'Memproses foto...')
        : (count > 1 ? `Processing ${count} photos...` : 'Processing photo...')
    );

    try {
      const readAndCompress = (file: File): Promise<string> => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            let dataUrl = event.target?.result as string;
            if (dataUrl) {
              try {
                dataUrl = await compressImageBase64(dataUrl, 1200, 1200, 0.75);
              } catch (err) {
                console.error("Image compression error:", err);
              }
            }
            resolve(dataUrl || '');
          };
          reader.onerror = () => resolve('');
          reader.readAsDataURL(file);
        });
      };

      const compressedImages = await Promise.all(files.map(readAndCompress));
      const validImages = compressedImages.filter(Boolean);

      if (validImages.length > 0) {
        const html = validImages
          .map((dataUrl) => {
            return `<br><img src="${dataUrl}" alt="image" contenteditable="false" draggable="false" style="max-width: 100%; border-radius: 8px; user-select: none; display: block; margin: 12px 0;" /><br>`;
          })
          .join('');

        insertHtmlToEditor(html);

        const msg = lang === 'id'
          ? (validImages.length > 1 ? `${validImages.length} foto berhasil ditambahkan ke catatan!` : 'Foto berhasil ditambahkan ke catatan')
          : (validImages.length > 1 ? `${validImages.length} photos added to note!` : 'Photo added to note');
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error("Error adding photos:", err);
      setToastMessage(lang === 'id' ? 'Gagal menambahkan foto' : 'Failed to add photos');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const handleImage = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();

      setToastMessage(
        lang === 'id'
          ? '💡 Tips: Anda dapat memilih beberapa foto sekaligus dari galeri'
          : '💡 Tip: You can select multiple photos at once from gallery'
      );
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleDocAttachClick = () => {
    docAttachRef.current?.click();
  };

  const handleDocAttachChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';

    files.forEach((file) => {
      const fileExt = file.name.split('.').pop()?.toUpperCase() || 'FILE';
      const isVideo = file.type.startsWith('video/') || ['MP4', 'WEBM', 'MOV', 'M4V', 'MKV', 'AVI', '3GP'].includes(fileExt);

      if (isVideo) {
        setToastMessage(
          lang === 'id' 
            ? 'Penyimpanan video dinonaktifkan. Gunakan lampiran foto atau file dokumen (PDF/Word/Excel).' 
            : 'Video saving is disabled. Please use photos or documents.'
        );
        setTimeout(() => setToastMessage(null), 3500);
        return;
      }

      // Safeguard against massive file crash
      if (file.size > 10 * 1024 * 1024) {
        setToastMessage(
          lang === 'id' 
            ? `File "${file.name}" melebihi 10MB. Untuk menjaga performa penyimpanan offline tetap cepat & aman, gunakan dokumen di bawah 10MB.` 
            : `File "${file.name}" exceeds 10MB. Please use document under 10MB for optimal performance.`
        );
        setTimeout(() => setToastMessage(null), 4000);
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const html = `
          <br><br>
          <a href="${dataUrl}" download="${file.name}" style="display: flex; align-items: center; gap: 12px; padding: 12px 16px; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; text-decoration: none; color: #f8fafc; max-width: 300px; margin: 4px 0;" contenteditable="false">
            <div style="width: 40px; height: 40px; border-radius: 8px; background-color: #312e81; color: #818cf8; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0;">
              ${fileExt.substring(0, 4)}
            </div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-weight: 600; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${file.name}</div>
              <div style="font-size: 12px; color: #94a3b8;">${(file.size / 1024).toFixed(1)} KB • Klik untuk unduh</div>
            </div>
          </a>
          <br><br>
        `;
        insertHtmlToEditor(html);
      };
      reader.readAsDataURL(file);
    });

    const msg = lang === 'id'
      ? (files.length > 1 ? `${files.length} dokumen dilampirkan` : 'Dokumen dilampirkan ke catatan')
      : (files.length > 1 ? `${files.length} documents attached` : 'Document attached');
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = '';
    await processMultipleImageFiles(files);
  };

  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  const handleAddTagSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newTagInput.trim()) {
      const newTag = newTagInput.trim().startsWith("#")
        ? newTagInput.trim()
        : "#" + newTagInput.trim();
      if (!tags.includes(newTag)) {
        setTags((prev) => {
          const newTags = [...prev, newTag];
          tagsRef.current = newTags;
          setHasUnsavedChanges(true);
          return newTags;
        });
        triggerAutosave();
      }
    }
    setNewTagInput("");
    setIsAddingTag(false);
  };
  
  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => {
      const newTags = prev.filter((t) => t !== tagToRemove);
      tagsRef.current = newTags;
      setHasUnsavedChanges(true);
      return newTags;
    });
    triggerAutosave();
  };

  const allExistingTags = useMemo(() => {
    const tagSet = new Set<string>();
    notesRef.current.forEach(n => {
      n.tags?.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet);
  }, []);
  
  const suggestedTags = useMemo(() => {
    const defaultTags = ['#penting', '#ide', '#kerja', '#pribadi', '#tugas'];
    const combinedTags = Array.from(new Set([...allExistingTags, ...defaultTags]));
    return combinedTags.filter(t => !tags.includes(t)).slice(0, 8);
  }, [allExistingTags, tags]);

  const handleAddExistingTag = (tag: string) => {
    if (!tags.includes(tag)) {
      setTags(prev => {
        const newTags = [...prev, tag];
        tagsRef.current = newTags;
        setHasUnsavedChanges(true);
        return newTags;
      });
      triggerAutosave();
    }
  };

  return (
    <div className={`flex flex-col h-full font-sans transition-colors ${palette.rootText}`}>
      {/* Top Bar */}
      <div className={`flex-none min-h-[4rem] pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2 border-b backdrop-blur-md px-4 flex items-center justify-between transition-colors ${
        effectiveTheme === 'wallpaper'
          ? 'bg-slate-950/40 border-white/10 text-white backdrop-blur-xl'
          : `${palette.headerBg} ${palette.headerBorder} ${palette.titleText}`
      }`}>
        <button
          onClick={handleBack}
          className={`p-3 -ml-2 rounded-xl transition-colors cursor-pointer ${
            effectiveTheme === 'wallpaper'
              ? 'text-white hover:bg-white/10'
              : `${palette.subText} hover:${palette.titleText} hover:bg-black/5 dark:hover:bg-white/5`
          }`}
        >
          {is3D ? <Icon3DArrowLeft size={24} /> : <ArrowLeft className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-3 sm:gap-4">
          {isSaving ? (
            <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full mr-2 border ${
              `${palette.streakCard} ${palette.streakBorder}`
            }`}>
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
              <span className={`text-xs font-bold uppercase tracking-widest ${palette.subText}`}>
                {t('saving')}
              </span>
            </div>
          ) : hasUnsavedChanges ? (
            <button 
              onClick={() => saveNote(false)}
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer mr-2 shadow-md ${
                `${palette.brandBg} active:scale-95`
              }`}
            >
              <span className="text-sm font-bold uppercase tracking-widest text-white">
                {t('save')}
              </span>
            </button>
          ) : (
            <div className={`flex items-center justify-center gap-2 px-4 py-2 rounded-full mr-2 border ${
              `${palette.streakCard} ${palette.streakBorder} text-emerald-600 dark:text-emerald-400`
            }`}>
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
              <span className="text-xs font-bold uppercase tracking-widest">
                {t('saved')}
              </span>
            </div>
          )}
          <button
            onClick={handleToggleLock}
            className={`p-2.5 rounded-xl transition-all cursor-pointer ${
              isLocked 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : `${palette.subText} hover:${palette.titleText} hover:bg-black/5 dark:hover:bg-white/5`
            }`}
            title={isLocked ? (lang === 'id' ? 'Catatan Terkunci dengan PIN' : 'Note Locked with PIN') : (lang === 'id' ? 'Kunci Catatan dengan PIN' : 'Lock Note with PIN')}
          >
            {isLocked 
              ? (is3D ? <Icon3DLock size={20} /> : <Lock size={18} />) 
              : (is3D ? <Icon3DUnlock size={20} /> : <Unlock size={18} />)}
          </button>
          <button
            onClick={() => {
              const currTitle = titleRef.current;
              const currContent = contentRef.current;
              const currTags = tagsRef.current;
              
              if (note.id && notesRef.current.some(n => n.id === note.id)) {
                 updateNote({ ...note, title: currTitle, content: currContent, tags: currTags, isArchived: !note.isArchived, reminder: reminderRef.current, isLocked: isLockedRef.current });
              } else {
                 addNote({ ...note, title: currTitle, content: currContent, tags: currTags, isArchived: !note.isArchived, reminder: reminderRef.current, isLocked: isLockedRef.current });
              }
              onBack();
            }}
            className={`p-3 transition-colors cursor-pointer relative group ${
              `${palette.subText} hover:${palette.titleText}`
            }`}
            title={note.isArchived ? (lang === 'id' ? 'Batal Arsipkan' : 'Unarchive') : (lang === 'id' ? 'Arsipkan' : 'Archive')}
          >
            {is3D ? (
              <Icon3DArchive size={20} />
            ) : note.isArchived ? (
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="9 10 12 7 15 10"></polyline><line x1="12" y1="7" x2="12" y2="15"></line><polyline points="21 8 21 21 3 21 3 8"></polyline><line x1="23" y1="3" x2="1" y2="3"></line><line x1="23" y1="8" x2="1" y2="8"></line></svg>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>
            )}
          </button>
          <button
            className={`p-3 -mr-2 transition-colors cursor-pointer ${
              `${palette.subText} hover:text-rose-500`
            }`}
            onClick={() => setShowDeleteConfirm(true)}
          >
             {is3D ? <Icon3DTrash size={20} /> : <Trash2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar w-full">
        <div className="w-full max-w-4xl mx-auto px-6 py-6 flex flex-col min-h-full">
          {/* Title - clean, readable and normal weight (never auto-bold, zero re-renders) */}
          <NoteTitleInput
            initialValue={note.title || ''}
            isOrganic={isOrganic}
            palette={palette}
            label={lang === 'id' ? 'Judul Catatan (Opsional)' : 'Note Title (Optional)'}
            placeholder={t('titlePlaceholder') || (lang === 'id' ? "Tulis judul catatan di sini..." : "Type note title here...")}
            onChange={handleTitleChange}
          />

          {/* Tata AI Permission Badge */}
          {sharedWithAI && (
            <div className={`flex items-center gap-1.5 px-3 py-1 border rounded-full w-fit mb-4 text-[10px] font-bold animate-in fade-in duration-200 ${
              `${palette.streakCard} ${palette.streakBorder} text-emerald-600 dark:text-emerald-400`
            }`}>
              {is3D ? <Icon3DTataAI size={14} /> : <Bot size={11} />}
              <span>{lang === 'id' ? 'Telah Masuk Tata AI' : 'Shared with Tata AI'}</span>
            </div>
          )}

          {/* Tags */}
          <div className="flex flex-col gap-3 mb-8">
            <div className="flex flex-wrap items-center gap-2">
              {tags.map((tag) => (
                <div
                  key={tag}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border group ${
                    `${palette.noteTagBadge} ${palette.streakBorder}`
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    {tag.replace("#", "")}
                  </span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="w-4 h-4 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-rose-500 hover:text-white transition-all cursor-pointer"
                  >
                    &times;
                  </button>
                </div>
              ))}
              {isAddingTag ? (
                <form onSubmit={handleAddTagSubmit} className="flex items-center">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    autoFocus
                    onBlur={handleAddTagSubmit}
                    placeholder={t('tagNamePlaceholder')}
                    className={`h-7 w-24 px-2 rounded-lg text-[10px] outline-none border ${
                      `${palette.searchContainer} ${palette.searchInput}`
                    }`}
                  />
                </form>
              ) : (
                <button
                  onClick={() => setIsAddingTag(true)}
                  className={`h-7 px-3 flex items-center justify-center rounded-lg border border-dashed text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                    `${palette.streakBorder} ${palette.subText} hover:${palette.titleText}`
                  }`}
                >
                  + Tag
                </button>
              )}
            </div>

            {suggestedTags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className={`text-[10px] uppercase tracking-wider font-bold ${palette.subText}`}>Rekomendasi:</span>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => handleAddExistingTag(tag)}
                      className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                        `${palette.streakCard} ${palette.streakBorder} ${palette.subText} hover:${palette.titleText}`
                      }`}
                    >
                      +{tag.replace("#", "")}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Active Reminder Banner */}
          {reminder && (
            <div className={`flex items-center justify-between p-3.5 mb-4 border rounded-2xl animate-in fade-in duration-200 ${palette.cardHero} ${palette.cardHeroBorder}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl border ${palette.streakCard} ${palette.streakBorder} text-indigo-500`}>
                  {is3D ? <Icon3DBell size={18} /> : <Bell className="w-4 h-4 animate-swing" />}
                </div>
                <div className="flex flex-col text-left">
                  <span className={`text-[10px] uppercase font-bold tracking-widest ${palette.subText}`}>{t('reminderBadgeLabel')}</span>
                  <span className={`text-xs font-semibold ${palette.titleText}`}>{formatReminderDate(reminder, lang)}</span>
                </div>
              </div>
              <button 
                onClick={() => { setReminder(undefined); setHasUnsavedChanges(true); }}
                className={`px-2.5 py-1 rounded-lg transition-all text-[11px] font-bold cursor-pointer ${palette.actionBtn} hover:text-rose-500 border ${palette.actionBtnBorder}`}
              >
                {t('clearReminder')}
              </button>
            </div>
          )}

          {/* Content */}
          <div className={`flex-grow flex flex-col rounded-3xl p-4 md:p-5 border transition-colors ${palette.noteCard} ${palette.noteCardBorder}`}>
            {/* Rich Text Formatting Bar */}
            <div className={`flex flex-wrap items-center gap-1.5 p-2 mb-4 rounded-2xl border transition-colors ${palette.streakCard} ${palette.streakBorder}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => applyBasicFormat('bold')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  activeFormats.bold 
                    ? `${palette.brandBg} shadow-md` 
                    : `${palette.chipInactive} ${palette.subText} hover:${palette.titleText}`
                }`}
                title={lang === 'id' ? 'Tebal (Bold)' : 'Bold'}
              >
                <Bold size={14} />
                <span className="text-[11px]">{lang === 'id' ? 'Tebal' : 'Bold'}</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => applyBasicFormat('italic')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  activeFormats.italic 
                    ? `${palette.brandBg} shadow-md` 
                    : `${palette.chipInactive} ${palette.subText} hover:${palette.titleText}`
                }`}
                title={lang === 'id' ? 'Miring (Italic)' : 'Italic'}
              >
                <Italic size={14} />
                <span className="text-[11px]">{lang === 'id' ? 'Miring' : 'Italic'}</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => applyBasicFormat('underline')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  activeFormats.underline 
                    ? `${palette.brandBg} shadow-md` 
                    : `${palette.chipInactive} ${palette.subText} hover:${palette.titleText}`
                }`}
                title={lang === 'id' ? 'Garis Bawah (Underline)' : 'Underline'}
              >
                <Underline size={14} />
                <span className="text-[11px]">{lang === 'id' ? 'Garis Bawah' : 'Underline'}</span>
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onTouchStart={(e) => e.preventDefault()}
                onClick={() => applyBasicFormat('strikeThrough')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  activeFormats.strikeThrough 
                    ? `${palette.brandBg} shadow-md` 
                    : `${palette.chipInactive} ${palette.subText} hover:${palette.titleText}`
                }`}
                title={lang === 'id' ? 'Coretan (Strikethrough)' : 'Strikethrough'}
              >
                <Strikethrough size={14} />
                <span className="text-[11px]">{lang === 'id' ? 'Coret' : 'Strike'}</span>
              </button>

              <div className={`w-px h-5 mx-1 shrink-0 ml-auto ${palette.streakBorder}`} />

              <button
                type="button"
                onClick={handleCopyText}
                className={`px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer border ${
                  `${palette.streakCard} ${palette.streakBorder} ${palette.subText} hover:${palette.titleText}`
                }`}
                title={lang === 'id' ? 'Salin Semua Teks' : 'Copy All Text'}
              >
                {copiedToast ? (
                  is3D ? <Icon3DCheck size={14} /> : <CheckCircle2 size={13} className="text-emerald-400" />
                ) : (
                  is3D ? <Icon3DCopy size={14} /> : <Copy size={13} />
                )}
                <span>{copiedToast ? (lang === 'id' ? 'Disalin!' : 'Copied!') : (lang === 'id' ? 'Salin' : 'Copy')}</span>
              </button>
              <button
                type="button"
                onClick={handleExportTxt}
                className={`px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-bold shrink-0 flex items-center gap-1 cursor-pointer border ${
                  `${palette.streakCard} ${palette.streakBorder} ${palette.subText} hover:${palette.titleText}`
                }`}
                title={lang === 'id' ? 'Ekspor ke File Teks (.txt)' : 'Export to Text (.txt)'}
              >
                {exportedToast ? (
                  is3D ? <Icon3DCheck size={14} /> : <CheckCircle2 size={13} className="text-emerald-400" />
                ) : (
                  is3D ? <Icon3DDownload size={14} /> : <Download size={13} />
                )}
                <span>{exportedToast ? (lang === 'id' ? 'Diekspor!' : 'Exported!') : '.TXT'}</span>
              </button>
            </div>

            {/* Media & Photos Quick Strip */}
            {mediaList.length > 0 && (
              <div className={`mb-3 p-2.5 rounded-2xl border animate-in fade-in duration-200 ${palette.cardHero} ${palette.cardHeroBorder}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[11px] font-bold flex items-center gap-1.5 ${palette.subText}`}>
                    {is3D ? <Icon3DImage size={15} /> : <ImageIcon size={13} className={palette.brandText} />}
                    {lang === 'id' ? `Foto & Lampiran (${mediaList.length})` : `Photos & Files (${mediaList.length})`}
                  </span>
                  <span className={`text-[10px] font-medium ${palette.subText}`}>
                    {lang === 'id' ? 'Klik foto untuk kelola' : 'Click to view'}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {mediaList.map((item, idx) => (
                    <div 
                      key={item.id || idx}
                      className={`relative group shrink-0 rounded-xl overflow-hidden border shadow-sm transition-all ${palette.streakCard} ${palette.streakBorder}`}
                    >
                      {item.type === 'image' ? (
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20">
                          <img 
                            src={item.src} 
                            alt={item.alt || 'Thumb'} 
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => {
                              setSelectedImage({ src: item.src, alt: item.alt });
                              setShowDeleteImageConfirm(false);
                              setShowImageModal(true);
                            }}
                          />
                          {/* Quick Delete Single Photo Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage(item.src);
                            }}
                            className="absolute top-1 right-1 p-1 rounded-lg bg-rose-950/85 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white transition-all shadow-md cursor-pointer"
                            title={lang === 'id' ? 'Hapus Foto Ini Saja' : 'Delete This Photo Only'}
                          >
                            {is3D ? <Icon3DTrash size={12} /> : <Trash2 size={11} />}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-2 w-36 h-16 sm:h-20">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                            isOrganic ? `${palette.streakCard} ${palette.brandText}` : 'bg-indigo-500/20 text-indigo-400'
                          }`}>
                            {is3D ? <Icon3DFileText size={18} /> : <FileText size={16} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-[11px] font-bold block truncate ${palette.titleText}`}>{item.filename}</span>
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(item.src)}
                              className="text-[10px] text-rose-400 hover:underline flex items-center gap-0.5 mt-0.5 cursor-pointer"
                            >
                              {is3D ? <Icon3DTrash size={12} /> : <Trash2 size={10} />} {lang === 'id' ? 'Hapus' : 'Delete'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add more photos button in thumbnail row */}
                  <button
                    type="button"
                    onClick={() => setShowAttachmentMenu(true)}
                    className={`shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-dashed flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                      isOrganic 
                        ? `${palette.chipInactive} ${palette.streakBorder} ${palette.brandText}` 
                        : 'border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-400 hover:text-indigo-300'
                    }`}
                    title={lang === 'id' ? 'Tambah foto (Kamera atau Galeri)' : 'Add photo (Camera or Gallery)'}
                  >
                    <Plus size={18} />
                    <span className="text-[10px] font-bold">{lang === 'id' ? '+ Foto' : '+ Photo'}</span>
                  </button>
                </div>
              </div>
            )}

            <div
              id="note-editor-content"
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={handleEditorKeyDown}
              onBeforeInput={handleEditorBeforeInput}
              onInput={handleInput}
              onPaste={() => {
                setTimeout(() => {
                  if (editorRef.current) {
                    contentRef.current = editorRef.current.innerHTML;
                    hasUnsavedChangesRef.current = true;
                    triggerAutosave();
                    syncMediaList();
                  }
                }, 30);
              }}
              onClick={handleEditorClick}
              onBlur={(e) => { handleInput(e); saveSelection(); syncMediaList(); }}
              onFocus={() => { saveSelection(); checkActiveFormatsDebounced(); }}
              onKeyUp={handleEditorKeyUp}
              onMouseUp={handleEditorMouseUp}
              onTouchEnd={handleEditorTouchEnd}
              onSelect={handleEditorSelect}
              className={`w-full flex-grow text-sm leading-relaxed bg-transparent border-none outline-none overflow-y-auto overflow-x-hidden note-editor-area break-words font-normal ${
                palette.rootText || (palette.isDark ? 'text-slate-100' : 'text-slate-900')
              }`}
              style={{ minHeight: "200px" }}
              data-placeholder={t('notePlaceholder') || (lang === 'id' ? "Mulai menulis isi catatan di sini..." : "Start typing note content here...")}
            />

            {/* Word & Char Counter */}
            <div className={`flex items-center justify-start px-1 pt-3 mt-2 border-t text-[11px] font-semibold ${
              `${palette.streakBorder} ${palette.subText}`
            }`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <span>{stats.words} {lang === 'id' ? 'kata' : 'words'}</span>
                <span>•</span>
                <span>{stats.chars} {lang === 'id' ? 'karakter' : 'chars'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Editor Toolbar & Status */}
      <div className={`p-3 sm:p-4 shrink-0 border-t transition-colors ${
        `${palette.headerBg} ${palette.headerBorder}`
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Media & Tools Group */}
          <div className="flex items-center gap-2">
            {/* Unified Clean Foto & Kamera Button */}
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(true)}
              onMouseDown={(e) => e.preventDefault()}
              className={`px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 border text-xs font-bold active:scale-95 shadow-xs ${palette.streakCard} ${palette.streakBorder} ${palette.titleText} hover:opacity-90`}
              title={lang === 'id' ? 'Foto & Kamera' : 'Photo & Camera'}
            >
              {is3D ? (
                <Icon3DCamera size={18} />
              ) : (
                <Camera size={15} className={palette.brandText} />
              )}
              <span>{lang === 'id' ? 'Foto & Kamera' : 'Photo & Camera'}</span>
            </button>
            
            {/* Hidden file inputs with multiple support */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              accept="image/*,image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic" 
              multiple
              className="hidden" 
            />
            <input 
              type="file" 
              ref={cameraInputRef} 
              onChange={handleFileChange} 
              onClick={(e) => { (e.target as HTMLInputElement).value = ''; }}
              accept="image/*" 
              capture="environment"
              className="hidden" 
            />
            <input 
              type="file" 
              ref={docAttachRef} 
              onChange={handleDocAttachChange} 
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar" 
              multiple
              className="hidden" 
            />

            {/* Reminder Bell */}
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                setShowReminderModal(true);
              }}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                `${palette.streakCard} ${palette.streakBorder} ${reminder ? palette.brandText : palette.subText} hover:${palette.titleText}`
              }`}
              title={t('setReminder')}
            >
              {is3D ? <Icon3DBell size={20} /> : <Bell size={16} />}
            </button>
          </div>

          {/* AI Access Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (editorRef.current) {
                  contentRef.current = editorRef.current.innerHTML;
                }
                saveNote(true);
                setShowGiveToAIModal(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                sharedWithAI 
                  ? `${palette.streakCard} ${palette.streakBorder} text-emerald-600 dark:text-emerald-400 font-bold`
                  : `${palette.chipInactive} ${palette.subText} hover:${palette.titleText}`
              }`}
              title={lang === 'id' ? 'Pengaturan Akses Tata AI' : 'Tata AI Access Settings'}
            >
              {is3D ? (
                <Icon3DTataAI size={18} />
              ) : (
                <Bot size={14} className={sharedWithAI ? "text-emerald-500" : ""} />
              )}
              <span>{sharedWithAI ? (lang === 'id' ? 'Izin AI: Ya' : 'AI Access: On') : (lang === 'id' ? 'Tanya AI' : 'Ask AI')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reminder Setting Modal */}
      {showReminderModal && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-4 z-[100] animate-in fade-in duration-200">
          <div className={`p-6 rounded-3xl w-full max-w-sm flex flex-col text-left shadow-2xl border ${palette.cardHero} ${palette.cardHeroBorder}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-bold flex items-center gap-2 ${palette.titleText}`}>
                {is3D ? <Icon3DBell size={20} /> : <Bell size={18} className={palette.brandText} />} {t('setReminder')}
              </h3>
              <button 
                onClick={() => setShowReminderModal(false)}
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${palette.subText} hover:${palette.titleText}`}
              >
                &times;
              </button>
            </div>

            <p className={`text-xs mb-4 leading-relaxed ${palette.subText}`}>
              {t('reminderSetFor')} {reminder ? <strong className={palette.brandText}>{formatReminderDate(reminder, lang)}</strong> : <em className="opacity-50">{t('noReminder')}</em>}
            </p>

            <div className="flex flex-col gap-2.5 mb-6">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${palette.subText}`}>{t('quickPresets')}</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setHours(d.getHours() + 1);
                    const tzOffset = d.getTimezoneOffset() * 60000;
                    const localISO = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
                    setReminder(localISO);
                    setHasUnsavedChanges(true);
                    setShowReminderModal(false);
                  }}
                  className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 justify-center border cursor-pointer ${palette.streakCard} ${palette.streakBorder} ${palette.titleText} hover:opacity-90`}
                >
                  {is3D ? <Icon3DClock size={16} /> : <Clock size={12} className={palette.brandText} />} {t('preset1Hour')}
                </button>
                <button
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    d.setHours(9, 0, 0, 0); // 9 AM tomorrow
                    const tzOffset = d.getTimezoneOffset() * 60000;
                    const localISO = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
                    setReminder(localISO);
                    setHasUnsavedChanges(true);
                    setShowReminderModal(false);
                  }}
                  className={`px-3 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 justify-center border cursor-pointer ${palette.streakCard} ${palette.streakBorder} ${palette.titleText} hover:opacity-90`}
                >
                  {is3D ? <Icon3DNavCalendar size={16} /> : <Calendar size={12} className={palette.brandText} />} {t('presetTomorrow')}
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-6">
              <span className={`text-[10px] font-bold uppercase tracking-widest ${palette.subText}`}>{t('customReminder')}</span>
              <input
                type="datetime-local"
                value={customReminderVal || (reminder ? reminder.slice(0, 16) : "")}
                onChange={(e) => {
                  setCustomReminderVal(e.target.value);
                }}
                className={`w-full border rounded-xl px-4 py-3 text-sm outline-none transition-colors ${palette.searchContainer} ${palette.streakBorder} ${palette.titleText}`}
              />
            </div>

            <div className="flex justify-end gap-3">
              {reminder && (
                <button 
                  onClick={() => {
                    setReminder(undefined);
                    setCustomReminderVal("");
                    setHasUnsavedChanges(true);
                    setShowReminderModal(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors mr-auto cursor-pointer"
                >
                  {t('clearReminder')}
                </button>
              )}
              <button 
                onClick={() => setShowReminderModal(false)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${palette.chipInactive} ${palette.subText} hover:${palette.titleText}`}
              >
                {t('cancel')}
              </button>
              <button 
                onClick={() => {
                  if (customReminderVal) {
                    setReminder(customReminderVal);
                    setHasUnsavedChanges(true);
                  }
                  setShowReminderModal(false);
                }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${palette.brandBg} active:scale-95 shadow-sm`}
              >
                {t('save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-4 z-[100]">
          <div className={`border p-6 rounded-3xl w-full max-w-sm shadow-2xl ${palette.cardHero} ${palette.cardHeroBorder}`}>
            <h3 className={`text-lg font-bold mb-2 ${palette.titleText}`}>
              {lang === 'id' ? 'Hapus Catatan Ini?' : 'Delete This Note?'}
            </h3>
            <p className={`text-sm mb-6 leading-relaxed ${palette.subText}`}>
              {lang === 'id' ? 'Catatan yang dihapus akan dipindahkan ke Sampah.' : 'Deleted note will be moved to Trash.'}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${palette.chipInactive} ${palette.subText} hover:${palette.titleText}`}
              >
                {t('cancel')}
              </button>
              <button 
                onClick={() => {
                  deleteNote(note.id);
                  onBack();
                }}
                className="px-4 py-2 rounded-xl text-white text-sm font-bold bg-rose-600 hover:bg-rose-500 transition-colors cursor-pointer shadow-md"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GIVE TO AI CONSENT MODAL */}
      {showGiveToAIModal && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 md:p-4 z-[100] animate-in fade-in duration-200">
          <div className={`border p-6 rounded-3xl w-full max-w-sm flex flex-col text-left shadow-2xl relative overflow-hidden ${palette.cardHero} ${palette.cardHeroBorder}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2.5 rounded-2xl border ${
                sharedWithAI 
                  ? `${palette.streakCard} ${palette.streakBorder} text-indigo-500` 
                  : `${palette.streakCard} ${palette.streakBorder} text-emerald-500`
              }`}>
                {sharedWithAI ? (
                  is3D ? <Icon3DTataAI size={22} /> : <Bot size={20} />
                ) : (
                  is3D ? <Icon3DShield size={22} /> : <Shield size={20} />
                )}
              </div>
              <div>
                <h3 className={`text-sm font-bold ${palette.titleText}`}>
                  {sharedWithAI 
                    ? (lang === 'id' ? 'Akses Tata AI Aktif' : 'Tata AI Access Active') 
                    : (lang === 'id' ? 'Berikan ke Tata AI' : 'Give to Tata AI')}
                </h3>
                <span className={`text-[10px] font-medium uppercase tracking-wider block mt-0.5 ${sharedWithAI ? 'text-indigo-400' : 'text-emerald-500'}`}>
                  {sharedWithAI 
                    ? (lang === 'id' ? 'Izin Akses Diaktifkan' : 'Access Permission Enabled') 
                    : (lang === 'id' ? 'Izin Privasi Terbatas' : 'Limited Privacy Permission')}
                </span>
              </div>
            </div>

            <p className={`text-xs mb-4 leading-relaxed ${palette.subText}`}>
              {sharedWithAI 
                ? (lang === 'id'
                  ? 'Catatan ini telah diberikan izin untuk dibahas dengan asisten AI Tata secara aman. Anda bisa langsung masuk ke obrolan atau mencabut izin akses ini.'
                  : 'This note has been granted access to be discussed securely with the Tata AI assistant. You can proceed to the chat or revoke this permission.')
                : (lang === 'id'
                  ? 'Apakah Anda ingin mengirimkan isi catatan ini secara aman ke Tata AI Companion? Catatan ini hanya akan tersedia selama sesi obrolan aktif ini dan tidak akan disimpan permanen.'
                  : 'Do you want to securely share this note\'s contents with the Tata AI Companion? It will only be active during this stateless chat session and won\'t be permanently stored.')}
            </p>

            {/* Content Preview */}
            <div className={`border p-3 rounded-2xl mb-5 max-h-[120px] overflow-y-auto no-scrollbar ${palette.streakCard} ${palette.streakBorder}`}>
              <span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${palette.subText}`}>
                {lang === 'id' ? 'Judul Catatan' : 'Note Title'}
              </span>
              <span className={`text-xs font-bold block mb-2 ${palette.titleText}`}>{titleRef.current || (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note')}</span>
              
              <span className={`text-[9px] font-bold uppercase tracking-widest block mb-1 ${palette.subText}`}>
                {lang === 'id' ? 'Konten Terenkripsi Lokal' : 'Local Plaintext Content'}
              </span>
              <p className={`text-xs font-mono whitespace-pre-wrap leading-relaxed ${palette.subText}`}>
                {(editorRef.current ? editorRef.current.innerText : contentRef.current) || (lang === 'id' ? '(Catatan Kosong)' : '(Empty Note)')}
              </p>
            </div>

            {sharedWithAI ? (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleGiveToAI}
                  className={`w-full py-3 font-bold text-xs rounded-xl transition-colors cursor-pointer text-center shadow-md flex items-center justify-center gap-2 ${palette.brandBg} active:scale-95`}
                >
                  {is3D ? <Icon3DTataAI size={16} /> : <Bot size={14} />}
                  <span>{lang === 'id' ? 'Buka di Obrolan AI' : 'Open in AI Chat'}</span>
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowGiveToAIModal(false)}
                    className={`py-2.5 font-semibold text-xs rounded-xl transition-colors cursor-pointer border text-center ${palette.chipInactive} ${palette.subText} hover:${palette.titleText}`}
                  >
                    {lang === 'id' ? 'Kembali' : 'Back'}
                  </button>
                  <button
                    onClick={handleRevokeAIAccess}
                    className="py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-rose-500/20 text-center"
                  >
                    {lang === 'id' ? 'Cabut Izin Akses' : 'Revoke Access'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowGiveToAIModal(false)}
                  className={`flex-1 py-3 font-semibold text-xs rounded-xl transition-colors cursor-pointer border text-center ${palette.chipInactive} ${palette.subText} hover:${palette.titleText}`}
                >
                  {lang === 'id' ? 'Batalkan' : 'Cancel'}
                </button>
                <button
                  onClick={handleGiveToAI}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer text-center shadow-lg shadow-emerald-600/20"
                >
                  {lang === 'id' ? 'Berikan & Bahas' : 'Give & Discuss'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Clean & Simple Photo / Camera Picker Modal */}
      {showAttachmentMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="fixed inset-0" 
            onClick={() => setShowAttachmentMenu(false)} 
          />
          <div className={`relative w-full max-w-sm border rounded-2xl p-5 shadow-2xl z-10 space-y-4 ${palette.cardHero} ${palette.cardHeroBorder}`}>
            <div className="flex items-center justify-between pb-2 border-b border-inherit">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${palette.streakCard} ${palette.brandText}`}>
                  <Camera size={18} />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${palette.titleText}`}>
                    {lang === 'id' ? 'Tambah Foto ke Catatan' : 'Add Photo to Note'}
                  </h3>
                  <span className={`text-[10px] ${palette.subText}`}>
                    {lang === 'id' ? 'Pilih kamera atau galeri perangkat' : 'Choose camera or device gallery'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAttachmentMenu(false)}
                className={`w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${palette.subText} hover:${palette.titleText}`}
              >
                <X size={16} />
              </button>
            </div>

            {/* 3 Clear, intuitive photo choices */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {/* 1. Native OS Camera (Works 100% on phones & desktop without permission friction) */}
              <button
                type="button"
                onClick={() => {
                  handleNativeCamera();
                  setShowAttachmentMenu(false);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer active:scale-95 shadow-sm ${palette.streakCard} ${palette.streakBorder} hover:opacity-90`}
              >
                {is3D ? (
                  <Icon3DCamera size={28} />
                ) : (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}>
                    <Camera size={20} />
                  </div>
                )}
                <div className="space-y-0.5">
                  <span className={`block text-[11px] font-bold ${palette.titleText}`}>
                    {lang === 'id' ? 'Kamera HP' : 'Phone Cam'}
                  </span>
                  <span className="block text-[9px] text-emerald-400 font-semibold">
                    {lang === 'id' ? 'Bawaan OS' : 'Native OS'}
                  </span>
                </div>
              </button>

              {/* 2. Tata Live Viewfinder */}
              <button
                type="button"
                onClick={() => {
                  setShowAttachmentMenu(false);
                  setShowCameraModal(true);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer active:scale-95 shadow-sm ${palette.streakCard} ${palette.streakBorder} hover:opacity-90`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${palette.streakCard} ${palette.brandText}`}>
                  <Camera size={20} />
                </div>
                <div className="space-y-0.5">
                  <span className={`block text-[11px] font-bold ${palette.titleText}`}>
                    {lang === 'id' ? 'Kamera Live' : 'Live Camera'}
                  </span>
                  <span className={`block text-[9px] ${palette.subText}`}>
                    {lang === 'id' ? 'Viewfinder' : 'In-App'}
                  </span>
                </div>
              </button>

              {/* 3. Photo Gallery */}
              <button
                type="button"
                onClick={() => {
                  handleImage();
                  setShowAttachmentMenu(false);
                }}
                className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all text-center group cursor-pointer active:scale-95 shadow-sm ${palette.streakCard} ${palette.streakBorder} hover:opacity-90`}
              >
                {is3D ? (
                  <Icon3DImage size={28} />
                ) : (
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform bg-indigo-500/10 text-indigo-400 border border-indigo-500/20`}>
                    <ImageIcon size={20} />
                  </div>
                )}
                <div className="space-y-0.5">
                  <span className={`block text-[11px] font-bold ${palette.titleText}`}>
                    {lang === 'id' ? 'Galeri Foto' : 'Gallery'}
                  </span>
                  <span className={`block text-[9px] ${palette.brandText} font-medium`}>
                    {lang === 'id' ? 'Multi Foto' : 'Multi-select'}
                  </span>
                </div>
              </button>
            </div>

            {/* Subtle extra options at the bottom without crowding */}
            <div className={`pt-2.5 border-t flex items-center justify-between text-[11px] ${palette.streakBorder} ${palette.subText}`}>
              <button
                type="button"
                onClick={() => {
                  setShowAttachmentMenu(false);
                  handleOpenScannerWithImage();
                }}
                className="hover:text-amber-500 transition-colors flex items-center gap-1.5 cursor-pointer py-1"
              >
                <Scan size={13} className="text-amber-500" />
                <span>{lang === 'id' ? 'Pindai Dokumen' : 'Scan Document'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDocAttachClick();
                  setShowAttachmentMenu(false);
                }}
                className="hover:text-blue-500 transition-colors flex items-center gap-1.5 cursor-pointer py-1"
              >
                <FileText size={13} className="text-blue-500" />
                <span>{lang === 'id' ? 'File Dokumen' : 'Attach Document'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      <CameraModal
        isOpen={showCameraModal}
        lang={lang}
        onClose={() => setShowCameraModal(false)}
        onCapture={handleCameraCapture}
        onOpenScanner={handleOpenScannerWithImage}
      />

      {/* Document Scanner Modal (PDF & Word Converter) */}
      <DocumentScannerModal
        isOpen={showScannerModal}
        lang={lang}
        appTheme="dark"
        initialImage={scannerInitialImage}
        onClose={() => {
          setShowScannerModal(false);
          setScannerInitialImage(null);
        }}
        onInsertToNote={handleInsertScannedToNote}
        onInsertOCRText={handleInsertOCRText}
      />

      {/* PIN Verification Overlay for Locked Note */}
      {!isNoteUnlocked && (
        <div className="fixed inset-0 z-[200] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className={`border p-6 sm:p-8 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-150 ${
            `${palette.cardHero} ${palette.cardHeroBorder} ${palette.titleText}`
          }`}>
            <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 shadow-lg ${
              `${palette.streakCard} ${palette.streakBorder} ${palette.titleText}`
            }`}>
              {is3D ? <Icon3DLock size={32} /> : <Lock size={28} />}
            </div>
            <h2 className={`text-lg font-black mb-1 ${palette.titleText}`}>
              {pinUnlockMode === 'open'
                ? (lang === 'id' ? 'Buka Catatan Terkunci' : 'Open Locked Note')
                : (lang === 'id' ? 'Hapus Kunci PIN' : 'Remove PIN Lock')}
            </h2>
            <p className={`text-xs mb-3 leading-relaxed ${palette.subText}`}>
              {pinUnlockMode === 'open'
                ? (lang === 'id' 
                    ? 'Buka catatan untuk sesi ini (tetap terkunci otomatis setelahnya).' 
                    : 'Open note for this session (stays locked automatically afterwards).')
                : (lang === 'id'
                    ? 'Hapus proteksi PIN agar catatan tidak terkunci lagi.'
                    : 'Remove PIN protection so note is no longer locked.')}
            </p>

            {/* Mode Selector Tabs: Buka Saja vs Hapus Kunci */}
            <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-2xl mb-4 w-full border ${palette.searchContainer}`}>
              <button
                type="button"
                onClick={() => {
                  setPinUnlockMode('open');
                  setUnlockPinError(false);
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  pinUnlockMode === 'open'
                    ? `${palette.streakCard} ${palette.streakBorder} border ${palette.titleText} shadow-sm`
                    : `${palette.subText} hover:${palette.titleText}`
                }`}
              >
                {lang === 'id' ? '🔓 Buka Saja' : '🔓 Open Only'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPinUnlockMode('remove');
                  setUnlockPinError(false);
                }}
                className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  pinUnlockMode === 'remove'
                    ? `${palette.streakCard} ${palette.streakBorder} border text-rose-500 shadow-sm`
                    : `${palette.subText} hover:text-rose-500`
                }`}
              >
                {lang === 'id' ? '🗑️ Hapus Kunci' : '🗑️ Remove Lock'}
              </button>
            </div>

            {/* PIN Dots */}
            <div className="flex gap-3 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    unlockPinInput.length > i 
                      ? `${palette.brandBg} scale-100 shadow-sm` 
                      : `${palette.streakCard} ${palette.streakBorder} border scale-75`
                  } ${unlockPinError ? 'bg-rose-500 animate-bounce' : ''}`}
                />
              ))}
            </div>

            {unlockPinError && (
              <p className="text-xs text-rose-400 font-bold mb-4">
                {lang === 'id' ? 'PIN salah, silakan coba lagi.' : 'Incorrect PIN, please try again.'}
              </p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-3 mb-6 w-full max-w-[240px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (unlockPinInput.length < 4) {
                      const next = unlockPinInput + num;
                      setUnlockPinInput(next);
                      setUnlockPinError(false);
                      if (next.length === 4) {
                        handleVerifyNotePin(next);
                      }
                    }
                  }}
                  className={`h-12 flex items-center justify-center rounded-xl text-lg font-mono font-black active:scale-95 transition-all cursor-pointer border ${palette.streakCard} ${palette.streakBorder} ${palette.titleText} hover:opacity-85 shadow-sm`}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (unlockPinInput.length < 4) {
                    const next = unlockPinInput + '0';
                    setUnlockPinInput(next);
                    setUnlockPinError(false);
                    if (next.length === 4) {
                      handleVerifyNotePin(next);
                    }
                  }
                }}
                className={`col-start-2 h-12 flex items-center justify-center rounded-xl text-lg font-mono font-black active:scale-95 transition-all cursor-pointer border ${palette.streakCard} ${palette.streakBorder} ${palette.titleText} hover:opacity-85 shadow-sm`}
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnlockPinInput(prev => prev.slice(0, -1));
                  setUnlockPinError(false);
                }}
                className={`h-12 flex items-center justify-center rounded-xl active:scale-95 transition-all cursor-pointer border ${palette.streakCard} ${palette.streakBorder} ${palette.subText} hover:text-red-500 hover:border-red-300`}
              >
                &larr;
              </button>
            </div>

            {/* Lupa PIN Option */}
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(true);
                setForgotAnswerInput('');
                setForgotAnswerError(false);
              }}
              className={`mt-1 mb-4 text-xs font-semibold ${palette.subText} hover:${palette.titleText} transition-colors border-b border-transparent py-0.5 cursor-pointer`}
            >
              {lang === 'id' ? 'Lupa PIN?' : 'Forgot PIN?'}
            </button>

            <button
              type="button"
              onClick={onBack}
              className={`w-full py-2.5 font-bold text-xs rounded-xl transition-colors cursor-pointer ${palette.actionBtn}`}
            >
              {lang === 'id' ? 'Batal & Kembali' : 'Cancel & Go Back'}
            </button>
          </div>
        </div>
      )}

      {/* Forgot PIN Recovery Modal for Locked Note */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[260] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`border p-6 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-150 ${palette.cardHero} ${palette.cardHeroBorder} ${forgotAnswerError ? 'animate-pulse border-red-500/50' : ''}`}>
            <div className="flex items-center gap-2.5 mb-2">
              <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 border ${palette.streakCard} ${palette.streakBorder} ${palette.isDark ? 'text-amber-400' : 'text-rose-500'}`}>
                <KeyRound size={18} />
              </div>
              <div className="text-left">
                <h3 className={`text-sm sm:text-base font-bold leading-tight ${palette.titleText}`}>
                  {lang === 'id' ? 'Lupa PIN Catatan' : 'Forgot Note PIN'}
                </h3>
                <span className={`text-[10px] font-medium ${palette.subText}`}>
                  {lang === 'id' ? 'Opsi Pemulihan Pertanyaan Keamanan' : 'Security Question Recovery'}
                </span>
              </div>
            </div>

            {!pinRecoveryAnswer ? (
              <div className="space-y-4 pt-2">
                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl text-left space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{lang === 'id' ? 'Pertanyaan Keamanan Belum Diatur' : 'No Security Question Set'}</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${palette.subText}`}>
                    {lang === 'id'
                      ? 'Pertanyaan pemulihan keamanan belum diatur pada sistem PIN Anda, sehingga catatan tidak dapat dibuka melalui jawaban pemulihan.'
                      : 'No security recovery question was configured on your PIN system, so the note cannot be unlocked via security answer.'}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-300 leading-relaxed font-medium pt-1 border-t border-amber-500/20">
                    {lang === 'id'
                      ? 'Anda dapat mengatur pertanyaan & jawaban keamanan pemulihan di menu Pengaturan > Kunci Layar / PIN Catatan.'
                      : 'You can configure your security recovery question & answer in Settings > Screen Lock / Note PIN.'}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotAnswerInput('');
                    }}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${palette.actionBtn}`}
                  >
                    {lang === 'id' ? 'Saya Mengerti' : 'I Understand'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <p className={`text-xs mb-3 text-left leading-relaxed ${palette.subText}`}>
                  {lang === 'id'
                    ? 'Jawab pertanyaan keamanan akun Tata Anda (sama dengan opsi lupa PIN awal masuk) untuk memverifikasi dan membuka catatan ini.'
                    : 'Answer your Tata account security question (same recovery option as app entrance PIN) to verify and unlock this note.'}
                </p>
                {pinRecoveryQuestion && (
                  <div className={`border p-3.5 rounded-2xl mb-3 text-left ${palette.streakCard} ${palette.streakBorder}`}>
                    <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest mb-1 block">
                      {lang === 'id' ? 'Pertanyaan Keamanan' : 'Security Question'}
                    </span>
                    <p className={`text-xs sm:text-sm font-medium leading-snug ${palette.titleText}`}>{pinRecoveryQuestion}</p>
                  </div>
                )}
                <input
                  type="text"
                  autoFocus
                  value={forgotAnswerInput}
                  onChange={e => {
                    setForgotAnswerInput(e.target.value);
                    setForgotAnswerError(false);
                  }}
                  onKeyDown={e => e.key === 'Enter' && handleForgotNotePinSubmit()}
                  className={`w-full border rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-amber-500 transition-colors ${palette.searchContainer} ${palette.streakBorder} ${palette.titleText}`}
                  placeholder={lang === 'id' ? "Jawaban Anda..." : "Your Answer..."}
                />

                {forgotAnswerError && (
                  <p className="text-xs text-rose-500 font-semibold mb-3 text-left">
                    {lang === 'id' ? 'Jawaban keamanan salah. Coba lagi.' : 'Incorrect security answer. Try again.'}
                  </p>
                )}

                <div className="flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotAnswerInput('');
                      setForgotAnswerError(false);
                    }}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${palette.actionBtn}`}
                  >
                    {lang === 'id' ? 'Batal' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleForgotNotePinSubmit}
                    disabled={!forgotAnswerInput.trim()}
                    className={`px-4 py-2.5 rounded-xl text-white text-xs font-extrabold disabled:opacity-50 transition-colors cursor-pointer shadow-md ${palette.brandBg}`}
                  >
                    {lang === 'id' ? 'Verifikasi & Buka' : 'Verify & Unlock'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Setup PIN Prompt Modal */}
      {showSetupPinModal && (
        <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              {is3D ? <Icon3DLock size={28} /> : <Lock size={24} />}
            </div>
            <h3 className="text-base font-black text-slate-100 mb-1">
              {lang === 'id' ? 'PIN Keamanan Belum Ditingkatkan' : 'Security PIN Not Set'}
            </h3>
            <p className="text-xs text-slate-400 mb-5 leading-relaxed">
              {lang === 'id' 
                ? 'Anda perlu mengatur PIN Keamanan di Pengaturan sebelum dapat mengunci catatan ini.' 
                : 'You need to set up a Security PIN in Settings before locking this note.'}
            </p>
            <div className="flex flex-col gap-2 w-full">
              <button
                onClick={() => {
                  setShowSetupPinModal(false);
                  if (onNavigate) {
                    onNavigate('settings', 'security');
                  }
                }}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {lang === 'id' ? 'Atur PIN Sekarang' : 'Set Up PIN Now'}
              </button>
              <button
                onClick={() => setShowSetupPinModal(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Image Action Modal */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 z-[260] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  {is3D ? <Icon3DImage size={18} /> : <ImageIcon size={16} />}
                </div>
                <h3 className="text-sm font-bold text-slate-100">
                  {lang === 'id' ? 'Kelola Foto Catatan' : 'Manage Note Photo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowImageModal(false);
                  setSelectedImage(null);
                  setShowDeleteImageConfirm(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Image Preview */}
            <div className="p-4 flex flex-col items-center">
              <div className="relative w-full max-h-[48vh] rounded-2xl overflow-hidden bg-black/50 border border-slate-800 flex items-center justify-center">
                <img 
                  src={selectedImage.src} 
                  alt={selectedImage.alt || 'Note preview'} 
                  className="max-h-[48vh] w-auto max-w-full object-contain cursor-pointer"
                  onClick={() => setIsFullScreenZoom(true)}
                  title={lang === 'id' ? 'Klik untuk memperbesar' : 'Click to zoom'}
                />
                <button
                  type="button"
                  onClick={() => setIsFullScreenZoom(true)}
                  className="absolute bottom-2.5 right-2.5 px-2.5 py-1.5 rounded-xl bg-slate-950/80 hover:bg-slate-900 text-slate-200 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md border border-slate-700/80 shadow-lg cursor-pointer"
                >
                  <Maximize2 size={13} />
                  <span>{lang === 'id' ? 'Perbesar' : 'Zoom'}</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 w-full mt-4">
                <button
                  type="button"
                  onClick={() => handleReplaceImage(selectedImage.src)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700/60 transition-all cursor-pointer"
                >
                  {is3D ? <Icon3DRefresh size={16} /> : <RefreshCw size={14} className="text-indigo-400" />}
                  <span>{lang === 'id' ? 'Ganti Foto' : 'Replace Photo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadImage(selectedImage.src)}
                  className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 border border-slate-700/60 transition-all cursor-pointer"
                >
                  {is3D ? <Icon3DDownload size={16} /> : <Download size={14} className="text-indigo-400" />}
                  <span>{lang === 'id' ? 'Unduh Foto' : 'Download'}</span>
                </button>
              </div>

              {/* Delete Button / Confirmation */}
              <div className="w-full mt-2.5">
                {!showDeleteImageConfirm ? (
                  <button
                    type="button"
                    onClick={() => setShowDeleteImageConfirm(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {is3D ? <Icon3DTrash size={16} /> : <Trash2 size={14} />}
                    <span>{lang === 'id' ? 'Hapus Foto Ini' : 'Delete This Photo'}</span>
                  </button>
                ) : (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl flex flex-col gap-2 animate-in fade-in duration-150">
                    <p className="text-xs text-rose-200 text-center font-medium">
                      {lang === 'id' ? 'Yakin ingin menghapus foto ini dari catatan?' : 'Are you sure you want to delete this photo?'}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(selectedImage.src)}
                        className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        {lang === 'id' ? 'Ya, Hapus' : 'Yes, Delete'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteImageConfirm(false)}
                        className="flex-1 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                      >
                        {lang === 'id' ? 'Batal' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Lightbox */}
      {isFullScreenZoom && selectedImage && (
        <div 
          className="fixed inset-0 z-[300] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-lg animate-in fade-in duration-200"
          onClick={() => setIsFullScreenZoom(false)}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleDownloadImage(selectedImage.src);
              }}
              className="p-2.5 rounded-full bg-slate-900/80 text-white border border-slate-700 hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
              title={lang === 'id' ? 'Unduh' : 'Download'}
            >
              <Download size={18} />
            </button>
            <button
              type="button"
              onClick={() => setIsFullScreenZoom(false)}
              className="p-2.5 rounded-full bg-slate-900/80 text-white border border-slate-700 hover:bg-slate-800 transition-colors shadow-lg cursor-pointer"
              title={lang === 'id' ? 'Tutup' : 'Close'}
            >
              <X size={18} />
            </button>
          </div>
          <img 
            src={selectedImage.src} 
            alt={selectedImage.alt || 'Zoomed photo'} 
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Toast message */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[350] bg-slate-900/95 border border-indigo-500/40 text-slate-100 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}

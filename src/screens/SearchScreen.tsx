import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  FileText, Pin, Trash2, Bell, Plus, 
  Tag as TagIcon, Archive, Sparkles, Bot, Lock, Unlock,
  Search as SearchIcon, X, LayoutGrid, List, ArrowUpDown,
  KeyRound, AlertTriangle
} from 'lucide-react';
import { useAppStore } from '../store';
import { useTranslation } from '../translations';
import { Note } from '../types';
import { generateId, formatReminderDate, verifyPin, createPinHash } from '../utils';
import { ScreenItem } from '../App';
import {
  Icon3DNavNotes, Icon3DTag, Icon3DArchive, Icon3DLock,
  Icon3DPin, Icon3DTrash, Icon3DPlus, Icon3DTataAI, Icon3DSearch,
  Icon3DClock
} from '../components/home/Organic3DIcons';
import { getOrganicThemePalette } from '../components/home/organicThemePalettes';
import { LiteStickerIcon } from '../components/LiteModeIcons';

export default function SearchScreen({ 
  appTheme,
  onOpenNote, 
  onNavigate 
}: { 
  appTheme?: string;
  onOpenNote: (note: Note) => void; 
  onNavigate?: (screen: ScreenItem, extra?: any) => void; 
}) {
  const store = useAppStore();
  const { 
    notes, updateNote, deleteNote, 
    lang, appPin, notePin, appVersion, isLiteMode,
    pinRecoveryQuestion, pinRecoveryAnswer, setPinRecoveryAnswer,
    unlockNoteForSession, lockNoteForSession
  } = store;

  const isLite = appTheme === 'lite' || appVersion === 'lite' || isLiteMode;
  const isOrganic = !isLite && (appVersion === 'organic' || appVersion === 'pro_max' || appTheme === 'organic');
  const is3D = isOrganic;

  const palette = useMemo(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : null;
    const effectiveTheme = appTheme || storedTheme || 'organic';
    return getOrganicThemePalette(effectiveTheme);
  }, [appTheme]);

  const effectiveNotePin = notePin || appPin;
  const t = useTranslation(lang);
  const [activeFilter, setActiveFilter] = useState<string>('all'); 
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (searchScrollRef.current) {
      searchScrollRef.current.scrollTop = 0;
    }
  }, [activeFilter]);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState<boolean>(false);
  const [forgotAnswerInput, setForgotAnswerInput] = useState<string>('');
  const [forgotAnswerError, setForgotAnswerError] = useState<boolean>(false);

  // View Mode & Sorting (Organic Mode)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tata_notes_view_mode');
      if (saved === 'list' || saved === 'grid') return saved;
    }
    return 'grid';
  });

  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'title_asc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tata_notes_sort_order');
      if (saved === 'newest' || saved === 'oldest' || saved === 'title_asc') return saved;
    }
    return 'newest';
  });

  const handleToggleViewMode = () => {
    setViewMode(prev => {
      const next = prev === 'grid' ? 'list' : 'grid';
      try { localStorage.setItem('tata_notes_view_mode', next); } catch (e) {}
      return next;
    });
  };

  const handleToggleSortOrder = () => {
    setSortOrder(prev => {
      const next = prev === 'newest' ? 'oldest' : prev === 'oldest' ? 'title_asc' : 'newest';
      try { localStorage.setItem('tata_notes_sort_order', next); } catch (e) {}
      return next;
    });
  };

  // Lock Note States
  const [showSetupPinModal, setShowSetupPinModal] = useState(false);
  const [noteForPinUnlock, setNoteForPinUnlock] = useState<Note | null>(null);
  const [pinUnlockMode, setPinUnlockMode] = useState<'open' | 'remove'>('open');
  const [cardPinInput, setCardPinInput] = useState('');
  const [cardPinError, setCardPinError] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOpenNoteCard = (note: Note) => {
    if (note.isLocked && effectiveNotePin) {
      setNoteForPinUnlock(note);
      setPinUnlockMode('open');
      setCardPinInput('');
      setCardPinError(false);
      return;
    }
    onOpenNote(note);
  };

  const handleToggleNoteLock = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    if (!effectiveNotePin) {
      setShowSetupPinModal(true);
      return;
    }

    if (note.isLocked) {
      setNoteForPinUnlock(note);
      setPinUnlockMode('remove');
      setCardPinInput('');
      setCardPinError(false);
    } else {
      updateNote({ ...note, isLocked: true });
      showToast(lang === 'id' ? 'Catatan berhasil dikunci dengan PIN.' : 'Note locked with PIN.');
    }
  };

  const handleVerifyCardPin = async (inputPin: string) => {
    if (!noteForPinUnlock || !effectiveNotePin) return;
    const isValid = await verifyPin(inputPin, effectiveNotePin);
    if (isValid || inputPin === effectiveNotePin) {
      const targetNote = noteForPinUnlock;
      setNoteForPinUnlock(null);
      setCardPinInput('');
      setCardPinError(false);

      if (pinUnlockMode === 'remove') {
        updateNote({ ...targetNote, isLocked: false });
        lockNoteForSession(targetNote.id);
        showToast(lang === 'id' ? 'Kunci PIN pada catatan berhasil dihapus.' : 'PIN lock removed from note.');
      } else {
        unlockNoteForSession(targetNote.id);
        onOpenNote(targetNote);
      }
    } else {
      setCardPinError(true);
      setTimeout(() => setCardPinInput(''), 400);
    }
  };

  const archivedNotes = notes.filter(n => n.isArchived);
  const activeNotes = notes.filter(n => !n.isArchived);

  const pinnedNotesCount = useMemo(() => activeNotes.filter(n => n.pinned).length, [activeNotes]);
  const reminderNotesCount = useMemo(() => activeNotes.filter(n => !!n.reminder).length, [activeNotes]);
  const lockedNotesCount = useMemo(() => activeNotes.filter(n => !!n.isLocked).length, [activeNotes]);
  const aiNotesCount = useMemo(() => activeNotes.filter(n => !!n.sharedWithAI).length, [activeNotes]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    activeNotes.forEach(n => n.tags?.forEach(tag => tags.add(tag)));
    return Array.from(tags).sort();
  }, [activeNotes]);

  const displayedNotes = useMemo(() => {
    let list = activeNotes;
    if (activeFilter === 'archive') {
      list = archivedNotes;
    } else if (activeFilter === 'pinned') {
      list = activeNotes.filter(n => n.pinned);
    } else if (activeFilter === 'reminder') {
      list = activeNotes.filter(n => !!n.reminder);
    } else if (activeFilter === 'locked') {
      list = activeNotes.filter(n => !!n.isLocked);
    } else if (activeFilter === 'ai') {
      list = activeNotes.filter(n => !!n.sharedWithAI);
    } else if (activeFilter !== 'all') {
      list = activeNotes.filter(n => n.tags?.includes(activeFilter));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(n => {
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const contentMatch = (n.content || '').toLowerCase().includes(q);
        const tagMatch = n.tags?.some(tag => tag.toLowerCase().includes(q));
        return titleMatch || contentMatch || tagMatch;
      });
    }

    // In Organic Mode: Smart sorting (pinned first, then sortOrder)
    if (isOrganic) {
      const copy = [...list];
      copy.sort((a, b) => {
        if (activeFilter !== 'archive') {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
        }

        if (sortOrder === 'oldest') {
          return (a.date || '').localeCompare(b.date || '');
        }
        if (sortOrder === 'title_asc') {
          return (a.title || '').localeCompare(b.title || '');
        }
        // 'newest' (default)
        return (b.date || '').localeCompare(a.date || '');
      });
      return copy;
    }

    return list;
  }, [activeNotes, archivedNotes, activeFilter, searchQuery, isOrganic, sortOrder]);

  const handleTogglePinNote = (e: React.MouseEvent, note: Note) => {
    e.stopPropagation();
    updateNote({ ...note, pinned: !note.pinned });
  };

  const handleCreateNote = () => {
    const locale = lang === 'en' ? 'en-US' : 'id-ID';
    onOpenNote({
      id: generateId(),
      title: '',
      content: '',
      date: new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' }),
      tags: []
    });
  };

  // Render Note Card (Grid View or Default)
  const renderNoteCard = (note: Note) => {
    // List View for Organic Mode
    if (isOrganic && viewMode === 'list') {
      return (
        <div
          key={`note-${note.id}`}
          onClick={() => handleOpenNoteCard(note)}
          role="button"
          className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer group shadow-2xs relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            palette.noteCard
          } ${palette.noteCardBorder} ${palette.noteCardHoverBorder}`}
        >
          <div className="flex items-start gap-3 min-w-0 flex-1">
            {/* Note Icon / Pinned indicator */}
            <div className="shrink-0 mt-0.5">
              {note.pinned ? (
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs ${palette.streakCard} ${palette.streakBorder}`}>
                  <Icon3DPin size={16} />
                </div>
              ) : (
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs ${palette.streakCard} ${palette.streakBorder}`}>
                  <Icon3DNavNotes size={16} />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={`font-bold text-xs sm:text-sm truncate leading-tight flex items-center gap-1.5 ${palette.titleText}`}>
                  {note.sharedWithAI && (
                    <span title={lang === 'id' ? 'Tersambung ke Tata AI' : 'Shared with Tata AI'}>
                      <Icon3DTataAI size={13} />
                    </span>
                  )}
                  {note.isLocked && (
                    <button
                      onClick={(e) => handleToggleNoteLock(e, note)}
                      className={`p-0.5 transition-colors cursor-pointer shrink-0 ${palette.subText}`}
                      title={lang === 'id' ? 'Catatan Terkunci - Klik Buka' : 'Locked Note - Click to Unlock'}
                    >
                      <Icon3DLock size={13} />
                    </button>
                  )}
                  <span>{note.title || (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note')}</span>
                </h4>

                {note.pinned && (
                  <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border ${palette.streakCard} ${palette.streakBorder} ${palette.titleText}`}>
                    {lang === 'id' ? 'Disematkan' : 'Pinned'}
                  </span>
                )}
              </div>

              {note.isLocked ? (
                <p className={`text-[11px] font-medium mt-1 italic ${palette.subText}`}>
                  {lang === 'id' ? 'Konten dilindungi PIN keamanan.' : 'Content protected with security PIN.'}
                </p>
              ) : (
                <p className={`text-xs line-clamp-1 mt-1 leading-relaxed ${palette.noteCardSub}`}>
                  {note.content ? note.content.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>?/gm, '').replace(/&nbsp;?/gi, ' ').replace(/&bnsp;?/gi, ' ').replace(/\s+/g, ' ').trim() : '...'}
                </p>
              )}

              {/* Meta row: Date, Reminder, Tags */}
              <div className="flex items-center gap-2 mt-2 flex-wrap text-[10px]">
                <span className={`font-mono opacity-80 ${palette.subText}`}>{note.date}</span>
                {note.reminder && (
                  <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-semibold ${palette.streakCard} ${palette.streakBorder} ${palette.titleText}`}>
                    <Icon3DClock size={11} />
                    <span>{formatReminderDate(note.reminder, lang)}</span>
                  </span>
                )}
                {note.tags && note.tags.slice(0, 3).map(tag => (
                  <span 
                    key={tag} 
                    onClick={(e) => { e.stopPropagation(); setActiveFilter(tag); }}
                    className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] uppercase border cursor-pointer ${palette.noteTagBadge}`}
                  >
                    #{tag.replace('#', '')}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5 justify-end">
            <button
              onClick={(e) => handleToggleNoteLock(e, note)}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${palette.streakCard} ${palette.streakBorder} ${palette.subText} hover:${palette.titleText}`}
              title={note.isLocked ? (lang === 'id' ? 'Buka Kunci' : 'Unlock') : (lang === 'id' ? 'Kunci dengan PIN' : 'Lock with PIN')}
            >
              <Icon3DLock size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); updateNote({ ...note, isArchived: !note.isArchived }); }}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${palette.streakCard} ${palette.streakBorder} ${palette.subText} hover:${palette.titleText}`}
              title={note.isArchived ? (lang === 'id' ? 'Batal Arsipkan' : 'Unarchive') : (lang === 'id' ? 'Arsipkan' : 'Archive')}
            >
              <Icon3DArchive size={14} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setNoteToDelete(note.id); }}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${palette.streakCard} ${palette.streakBorder} ${palette.subText} hover:text-red-500 hover:border-red-300`}
              title={lang === 'id' ? 'Hapus Catatan' : 'Delete Note'}
            >
              <Icon3DTrash size={14} />
            </button>
            <button 
              onClick={(e) => handleTogglePinNote(e, note)}
              className={`p-1.5 rounded-xl border transition-all cursor-pointer ${palette.streakCard} ${palette.streakBorder} ${palette.subText} hover:${palette.titleText}`}
              title={note.pinned ? (lang === 'id' ? 'Lepas Sematan' : 'Unpin') : (lang === 'id' ? 'Sematkan' : 'Pin')}
            >
              <Icon3DPin size={14} />
            </button>
          </div>
        </div>
      );
    }

    // Grid View (Default)
    return (
      <div 
        key={`note-${note.id}`} 
        onClick={() => handleOpenNoteCard(note)}
        role="button"
        className={`w-full text-left flex flex-col justify-between gap-3 p-4 border rounded-2xl transition-all cursor-pointer group shadow-sm relative overflow-hidden min-w-0 ${
          palette.noteCard
        } ${palette.noteCardBorder} ${palette.noteCardHoverBorder}`}
      >
        {note.pinned && (
          <div className={`absolute top-0 right-0 w-8 h-8 rounded-bl-xl flex items-center justify-center ${
            palette.streakCard
          } border-l border-b ${palette.streakBorder} ${palette.isDark ? 'text-amber-400' : 'text-amber-600'}`}>
            {is3D ? <Icon3DPin size={14} /> : <Pin className="w-3.5 h-3.5 fill-current" />}
          </div>
        )}
        
        <div className="flex-1 overflow-hidden pr-6 min-w-0 flex flex-col">
          <h4 className={`font-bold leading-tight mb-1.5 truncate w-full flex items-center gap-1.5 ${
            palette.titleText
          }`}>
            {note.sharedWithAI && (
              <span title={lang === 'id' ? 'Tersambung ke Tata AI' : 'Shared with Tata AI'}>
                {is3D ? <Icon3DTataAI size={13} /> : <Bot className="w-3.5 h-3.5 shrink-0 text-indigo-400" />}
              </span>
            )}
            {note.isLocked && (
              <button
                onClick={(e) => handleToggleNoteLock(e, note)}
                className={`p-0.5 transition-colors cursor-pointer shrink-0 ${palette.subText}`}
                title={lang === 'id' ? 'Catatan Terkunci - Klik untuk Buka Kunci' : 'Note Locked - Click to Unlock'}
              >
                {is3D ? <Icon3DLock size={14} /> : <Lock className="w-3.5 h-3.5" />}
              </button>
            )}
            <span>{note.title || (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note')}</span>
          </h4>
          
          {note.isLocked ? (
            <button
              type="button"
              onClick={(e) => handleToggleNoteLock(e, note)}
              className={`flex items-center gap-1.5 py-2 px-2.5 rounded-xl text-xs font-semibold my-1 transition-colors cursor-pointer text-left w-full border ${
                isOrganic 
                  ? `${palette.streakCard} ${palette.streakBorder} ${palette.titleText}` 
                  : 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20 text-amber-400'
              }`}
              title={lang === 'id' ? 'Klik untuk membuka kunci catatan ini' : 'Click to unlock this note'}
            >
              {is3D ? <Icon3DLock size={13} /> : <Lock size={13} className="shrink-0 animate-pulse" />}
              <span>{lang === 'id' ? 'Catatan Terkunci PIN (Klik Buka)' : 'Locked with PIN (Click Unlock)'}</span>
            </button>
          ) : (
            <p className={`text-xs line-clamp-3 leading-relaxed break-words ${
              palette.noteCardSub
            }`}>
              {note.content ? note.content.replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>?/gm, '').replace(/&nbsp;?/gi, ' ').replace(/&bnsp;?/gi, ' ').replace(/\s+/g, ' ').trim() : '...'}
            </p>
          )}

          {note.reminder && (
            <div className={`flex items-center gap-1.5 mt-2.5 px-2 py-0.5 rounded-md w-fit text-[10px] font-bold border ${
              isOrganic 
                ? `${palette.streakCard} ${palette.streakBorder} ${palette.titleText}` 
                : 'bg-indigo-500/10 border-indigo-500/10 text-indigo-400'
            }`}>
              {is3D ? <Icon3DClock size={12} /> : <Bell className="w-3 h-3 animate-pulse" />}
              <span>{formatReminderDate(note.reminder, lang)}</span>
            </div>
          )}
        </div>
        
        <div className={`flex items-center justify-between mt-1 pt-3 border-t gap-2 ${
          palette.streakBorder
        }`}>
          <div className="flex items-center gap-1.5 overflow-x-hidden min-w-0">
            {note.tags && note.tags.length > 0 ? (
              note.tags.slice(0, 3).map(tag => (
                <span 
                  key={tag} 
                  onClick={(e) => { e.stopPropagation(); setActiveFilter(tag); }}
                  className={`cursor-pointer transition-colors text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex-shrink-0 truncate max-w-full border ${
                    isOrganic 
                      ? `${palette.noteTagBadge}` 
                      : 'text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500 hover:text-white border-transparent'
                  }`}
                >
                  #{tag.replace('#', '')}
                </span>
              ))
            ) : (
              <span className={`text-[10px] font-mono truncate ${palette.subText}`}>
                {note.date}
              </span>
            )}

            {note.sharedWithAI && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 flex-shrink-0 border ${
                isOrganic 
                  ? `${palette.streakCard} ${palette.streakBorder} ${palette.titleText}` 
                  : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
              }`} title={lang === 'id' ? 'Telah masuk Tata AI' : 'Shared with Tata AI'}>
                {is3D ? <Icon3DTataAI size={12} /> : isLite ? <LiteStickerIcon variant="ai" size="xs" /> : <Bot size={10} />}
                <span>AI</span>
              </span>
            )}
          </div>
          
          <div className="flex gap-1 flex-shrink-0 opacity-100 transition-opacity">
            <button
              onClick={(e) => handleToggleNoteLock(e, note)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isOrganic 
                  ? `${palette.subText} hover:${palette.titleText}` 
                  : note.isLocked ? 'text-amber-400 hover:text-amber-300 hover:bg-slate-700' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-700'
              }`}
              title={note.isLocked ? (lang === 'id' ? 'Buka Kunci Catatan' : 'Unlock Note') : (lang === 'id' ? 'Kunci Catatan dengan PIN' : 'Lock Note with PIN')}
            >
              {is3D ? <Icon3DLock size={15} /> : note.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); updateNote({ ...note, isArchived: !note.isArchived }); }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isOrganic 
                  ? `${palette.subText} hover:${palette.titleText}` 
                  : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-700'
              }`}
              title={note.isArchived ? (lang === 'id' ? 'Batal Arsipkan' : 'Unarchive') : (lang === 'id' ? 'Arsipkan' : 'Archive')}
            >
              {is3D ? <Icon3DArchive size={15} /> : <Archive className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setNoteToDelete(note.id); }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isOrganic 
                  ? `${palette.subText} hover:text-red-500` 
                  : 'text-slate-400 hover:text-red-400 hover:bg-slate-700'
              }`}
              title={lang === 'id' ? 'Hapus Catatan' : 'Delete Note'}
            >
              {is3D ? <Icon3DTrash size={15} /> : isLite ? <LiteStickerIcon variant="trash" size="xs" /> : <Trash2 className="w-3.5 h-3.5" />}
            </button>
            <div 
              onClick={(e) => handleTogglePinNote(e, note)}
              className="p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              {isOrganic ? (
                <Icon3DPin size={15} />
              ) : isLite ? (
                <LiteStickerIcon variant="key" size="xs" />
              ) : (
                <Pin className={`w-3.5 h-3.5 ${note.pinned ? 'fill-orange-400 text-orange-400' : 'text-slate-400 hover:text-orange-400'}`} />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`h-full flex flex-col w-full overflow-hidden relative ${palette.rootText}`}>
      {/* Fixed Top Header */}
      <div className={`flex-none backdrop-blur-md border-b pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 px-4 md:px-8 z-20 shadow-sm transition-colors ${palette.headerBg} ${palette.headerBorder}`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-2 mb-3">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h1 className={`text-lg sm:text-2xl font-black leading-tight truncate ${
                palette.titleText
              }`}>
                {t('searchMenu') || (lang === 'id' ? 'Catatan' : 'Notes')}
              </h1>
              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border shrink-0 ${
                isOrganic 
                  ? `${palette.streakCard} ${palette.streakBorder} ${palette.titleText}` 
                  : 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
              }`}>
                {activeNotes.length} {lang === 'id' ? 'Catatan' : 'Notes'}
              </span>
            </div>
            <span className={`text-[10px] sm:text-xs font-medium leading-tight truncate ${
              palette.subText
            }`}>
              {lang === 'id' ? 'Tulis, Kunci PIN & Kelola Catatan Pribadi' : 'Write, PIN Lock & Manage Personal Notes'}
            </span>
          </div>
          
          <button
            onClick={handleCreateNote}
            className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl shadow-lg transition-transform active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer font-bold text-xs sm:text-sm ${
              isOrganic 
                ? `${palette.brandBg} shadow-sm` 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/25'
            }`}
            title={lang === 'id' ? 'Tambah Catatan Baru' : 'Add New Note'}
          >
            {is3D ? <Icon3DPlus size={18} /> : isLite ? <LiteStickerIcon variant="plus" size="xs" /> : <Plus className="w-4 h-4" />}
            <span>{lang === 'id' ? 'Catatan Baru' : 'New Note'}</span>
          </button>
        </div>

        {/* Note Search Input Bar */}
        <div className="max-w-4xl mx-auto relative flex items-center">
          <input
            type="text"
            placeholder={lang === 'id' ? 'Cari judul, isi memo, atau tag catatan...' : 'Search note titles, content, or tags...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full rounded-2xl px-4 pl-10 pr-10 py-2 text-xs sm:text-sm outline-none transition-all border ${
              isOrganic
                ? `${palette.searchContainer} ${palette.searchInput}`
                : 'bg-slate-950/90 border-slate-800 focus:border-indigo-500 text-slate-100 placeholder:text-slate-500'
            }`}
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            {is3D ? <Icon3DSearch size={17} /> : isLite ? <LiteStickerIcon variant="search" size="xs" /> : <SearchIcon className="w-4 h-4" />}
          </div>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors cursor-pointer ${
                palette.subText
              } hover:${palette.titleText}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      <div ref={searchScrollRef} className="flex-1 overflow-y-auto w-full custom-scrollbar">
        <div className="pb-24 pt-4 px-4 md:px-8 max-w-4xl mx-auto space-y-4 sm:space-y-5">

          {/* Tag & Quick Status Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide animate-in slide-in-from-bottom-4 fade-in duration-300">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                activeFilter === 'all'
                  ? isOrganic 
                    ? `${palette.chipActive} shadow-xs`
                    : 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/20' 
                  : isOrganic
                    ? `${palette.chipInactive}`
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {lang === 'id' ? 'Semua' : 'All'}
            </button>

            {/* In Organic Mode: add convenient status filter chips */}
            {isOrganic && (
              <>
                {pinnedNotesCount > 0 && (
                  <button
                    onClick={() => setActiveFilter(activeFilter === 'pinned' ? 'all' : 'pinned')}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                      activeFilter === 'pinned'
                        ? `${palette.chipActive} shadow-xs`
                        : `${palette.chipInactive}`
                    }`}
                  >
                    {is3D ? <Icon3DPin size={13} /> : <Pin className="w-3 h-3" />}
                    <span>{lang === 'id' ? 'Disematkan' : 'Pinned'}</span>
                    <span className="text-[10px] opacity-75">({pinnedNotesCount})</span>
                  </button>
                )}

                {reminderNotesCount > 0 && (
                  <button
                    onClick={() => setActiveFilter(activeFilter === 'reminder' ? 'all' : 'reminder')}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                      activeFilter === 'reminder'
                        ? `${palette.chipActive} shadow-xs`
                        : `${palette.chipInactive}`
                    }`}
                  >
                    {is3D ? <Icon3DClock size={13} /> : <Bell className="w-3 h-3" />}
                    <span>{lang === 'id' ? 'Pengingat' : 'Reminders'}</span>
                    <span className="text-[10px] opacity-75">({reminderNotesCount})</span>
                  </button>
                )}

                {lockedNotesCount > 0 && (
                  <button
                    onClick={() => setActiveFilter(activeFilter === 'locked' ? 'all' : 'locked')}
                    className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                      activeFilter === 'locked'
                        ? `${palette.chipActive} shadow-xs`
                        : `${palette.chipInactive}`
                    }`}
                  >
                    {is3D ? <Icon3DLock size={13} /> : <Lock className="w-3 h-3" />}
                    <span>{lang === 'id' ? 'Terkunci' : 'Locked'}</span>
                    <span className="text-[10px] opacity-75">({lockedNotesCount})</span>
                  </button>
                )}
              </>
            )}
            
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setActiveFilter(tag)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                  activeFilter === tag
                    ? isOrganic 
                      ? `${palette.chipActive} shadow-xs`
                      : 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/20' 
                    : isOrganic
                      ? `${palette.chipInactive}`
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                {is3D ? <Icon3DTag size={13} /> : isLite ? <LiteStickerIcon variant="notes" size="xs" /> : <TagIcon className="w-3 h-3" />}
                {tag}
              </button>
            ))}

            <button
              onClick={() => setActiveFilter('archive')}
              className={`px-3.5 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer ${
                activeFilter === 'archive'
                  ? isOrganic 
                    ? `${palette.chipActive} shadow-xs`
                    : 'bg-slate-700 text-slate-50 border-slate-600 shadow-sm' 
                  : isOrganic
                    ? `${palette.chipInactive}`
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {is3D ? <Icon3DArchive size={14} /> : isLite ? <LiteStickerIcon variant="database" size="xs" /> : <Archive className="w-3.5 h-3.5" />}
              {lang === 'id' ? 'Arsip' : 'Archive'}
              {archivedNotes.length > 0 && (
                <span className="text-[10px] opacity-80">({archivedNotes.length})</span>
              )}
            </button>
          </div>

          {/* Organic Mode Toolbar: Total Count, Grid/List toggle, and Sort */}
          {isOrganic && (
            <div className="flex items-center justify-between gap-2 pt-1 text-xs">
              <span className={`font-semibold text-[11px] ${palette.subText}`}>
                {lang === 'id' ? `Menampilkan ${displayedNotes.length} catatan` : `Showing ${displayedNotes.length} notes`}
              </span>

              <div className="flex items-center gap-1.5">
                {/* Sort Toggle */}
                <button
                  type="button"
                  onClick={handleToggleSortOrder}
                  className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer select-none ${palette.actionBtn} hover:${palette.titleText}`}
                  title={lang === 'id' ? 'Ganti Urutan Catatan' : 'Change Sort Order'}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span>
                    {sortOrder === 'newest' 
                      ? (lang === 'id' ? 'Terbaru' : 'Newest') 
                      : sortOrder === 'oldest' 
                        ? (lang === 'id' ? 'Terlama' : 'Oldest') 
                        : (lang === 'id' ? 'Judul A-Z' : 'Title A-Z')}
                  </span>
                </button>

                {/* View Mode Toggle (Grid / List) */}
                <button
                  type="button"
                  onClick={handleToggleViewMode}
                  className={`p-1.5 rounded-xl border transition-all cursor-pointer select-none ${palette.actionBtn} hover:${palette.titleText}`}
                  title={viewMode === 'grid' ? (lang === 'id' ? 'Mode Tampilan Daftar' : 'List View Mode') : (lang === 'id' ? 'Mode Tampilan Kisi' : 'Grid View Mode')}
                >
                  {viewMode === 'grid' ? <List className="w-3.5 h-3.5" /> : <LayoutGrid className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          )}

          {/* Notes Grid or List Container */}
          <div className="animate-in fade-in duration-300 space-y-6">
            {displayedNotes.length > 0 ? (
              <div className={
                isOrganic && viewMode === 'list' 
                  ? 'flex flex-col space-y-2.5' 
                  : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4'
              }>
                {displayedNotes.map(note => renderNoteCard(note))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 border shadow-sm ${
                  isOrganic 
                    ? `${palette.streakCard} ${palette.streakBorder}` 
                    : 'bg-slate-800 text-slate-500 border-slate-700/50'
                }`}>
                  {isOrganic ? (
                    activeFilter === 'archive' ? <Icon3DArchive size={32} /> : activeFilter !== 'all' ? <Icon3DTag size={32} /> : <Icon3DNavNotes size={32} />
                  ) : isLite ? (
                    activeFilter === 'archive' ? <LiteStickerIcon variant="database" size="lg" /> : <LiteStickerIcon variant="notes" size="lg" />
                  ) : (
                    activeFilter === 'archive' ? <Archive className="w-8 h-8" /> : activeFilter !== 'all' ? <TagIcon className="w-8 h-8" /> : <FileText className="w-8 h-8" />
                  )}
                </div>
                <h3 className={`font-bold text-base sm:text-lg mb-1.5 ${palette.titleText}`}>
                  {searchQuery.trim()
                    ? (lang === 'id' ? `Tidak ada catatan cocok dengan "${searchQuery}"` : `No notes match "${searchQuery}"`)
                    : activeFilter === 'archive' 
                      ? (lang === 'id' ? 'Tidak ada arsip catatan' : 'No archived notes') 
                      : activeFilter === 'pinned'
                        ? (lang === 'id' ? 'Belum ada catatan yang disematkan' : 'No pinned notes yet')
                        : activeFilter === 'reminder'
                          ? (lang === 'id' ? 'Tidak ada catatan dengan pengingat' : 'No notes with reminders')
                          : activeFilter === 'locked'
                            ? (lang === 'id' ? 'Tidak ada catatan yang terkunci' : 'No locked notes')
                            : activeFilter !== 'all' 
                              ? (lang === 'id' ? 'Tidak ada catatan dengan filter ini' : 'No notes with this filter')
                              : (lang === 'id' ? 'Belum ada catatan' : 'No notes yet')}
                </h3>
                <p className={`text-xs max-w-sm mx-auto mb-5 ${palette.subText}`}>
                  {searchQuery.trim()
                    ? (lang === 'id' ? 'Coba gunakan kata kunci pencarian yang lain atau bersihkan kotak pencarian.' : 'Try a different search query or clear the search input.')
                    : (lang === 'id' ? 'Tuangkan ide, jadwal, memo, dan rangkuman penting dengan aman dan privat.' : 'Capture your thoughts, plans, and memos safely and privately.')}
                </p>

                {activeFilter === 'all' && !searchQuery && (
                  <button
                    onClick={handleCreateNote}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer ${
                      isOrganic 
                        ? `${palette.brandBg}` 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {is3D ? <Icon3DPlus size={16} /> : <Plus className="w-4 h-4" />}
                    <span>{lang === 'id' ? 'Mulai Tulis Catatan Baru' : 'Start a New Note'}</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {noteToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className={`border p-6 rounded-3xl w-full max-w-sm shadow-2xl ${
            `${palette.cardHero} ${palette.cardHeroBorder} ${palette.titleText}`
          }`}>
            <h3 className="text-xl font-bold text-red-500 mb-2">{t('deleteNoteTitle')}</h3>
            <p className={`text-sm mb-6 ${palette.subText}`}>
              {t('deleteNoteConfirm')}
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setNoteToDelete(null)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                  isOrganic 
                    ? `${palette.actionBtn}` 
                    : 'bg-slate-800 hover:text-slate-50 text-slate-400'
                }`}
              >
                {t('cancel')}
              </button>
              <button 
                onClick={() => {
                  if (noteToDelete) {
                    deleteNote(noteToDelete);
                  }
                  setNoteToDelete(null);
                }}
                className="px-4 py-2 rounded-xl text-white text-sm font-bold bg-red-500 hover:bg-red-600 transition-colors cursor-pointer"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Setup PIN Prompt Modal */}
      {showSetupPinModal && (
        <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`border p-6 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-150 ${
            `${palette.cardHero} ${palette.cardHeroBorder} ${palette.titleText}`
          }`}>
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3 ${
              isOrganic 
                ? `${palette.streakCard} ${palette.streakBorder} ${palette.titleText}` 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              {is3D ? <Icon3DLock size={24} /> : <Lock size={24} />}
            </div>
            <h3 className={`text-base font-black mb-1 ${palette.titleText}`}>
              {lang === 'id' ? 'PIN Keamanan Belum Ditingkatkan' : 'Security PIN Not Set'}
            </h3>
            <p className={`text-xs mb-5 leading-relaxed ${palette.subText}`}>
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
                className={`w-full py-2.5 font-bold text-xs rounded-xl transition-colors cursor-pointer ${palette.actionBtn}`}
              >
                {lang === 'id' ? 'Atur PIN Sekarang' : 'Set Up PIN Now'}
              </button>
              <button
                onClick={() => setShowSetupPinModal(false)}
                className={`w-full py-2 font-bold text-xs rounded-xl transition-colors cursor-pointer ${
                  palette.isDark 
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-400' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN Unlock Modal for Note Card */}
      {noteForPinUnlock && (
        <div className="fixed inset-0 z-[250] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className={`border p-6 rounded-3xl w-full max-w-sm flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-150 ${palette.cardHero} ${palette.cardHeroBorder} ${palette.titleText}`}>
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center mb-3 ${palette.streakCard} ${palette.streakBorder} ${palette.isDark ? 'text-amber-400' : 'text-rose-500'}`}>
              {is3D ? <Icon3DLock size={24} /> : <Lock size={24} />}
            </div>
            <h3 className={`text-base font-black mb-1 ${palette.titleText}`}>
              {pinUnlockMode === 'open' 
                ? (lang === 'id' ? 'Buka Catatan Terkunci' : 'Open Locked Note')
                : (lang === 'id' ? 'Hapus Kunci PIN' : 'Remove PIN Lock')}
            </h3>
            <p className={`text-xs mb-3 leading-relaxed ${palette.subText}`}>
              {pinUnlockMode === 'open'
                ? (lang === 'id' 
                    ? 'Buka catatan untuk sesi ini (tetap terkunci otomatis nanti).' 
                    : 'Open note for this session (stays locked automatically later).')
                : (lang === 'id'
                    ? 'Hapus proteksi PIN agar catatan tidak terkunci lagi.'
                    : 'Remove PIN protection so note is no longer locked.')}
            </p>

            {/* Mode Selector: Buka Saja vs Hapus Kunci */}
            <div className={`grid grid-cols-2 gap-1.5 p-1 rounded-2xl mb-4 w-full border ${palette.searchContainer}`}>
              <button
                type="button"
                onClick={() => {
                  setPinUnlockMode('open');
                  setCardPinError(false);
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
                  setCardPinError(false);
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
            <div className="flex gap-3 mb-5">
              {[0, 1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                    cardPinInput.length > i 
                      ? `${palette.brandBg} scale-100 shadow-sm` 
                      : `${palette.streakCard} ${palette.streakBorder} border scale-75`
                  } ${cardPinError ? 'bg-rose-500 animate-bounce' : ''}`}
                />
              ))}
            </div>

            {cardPinError && (
              <p className="text-xs text-rose-500 font-bold mb-3">
                {lang === 'id' ? 'PIN salah, silakan coba lagi.' : 'Incorrect PIN, please try again.'}
              </p>
            )}

            {/* Keypad */}
            <div className="grid grid-cols-3 gap-2.5 mb-5 w-full max-w-[220px]">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    if (cardPinInput.length < 4) {
                      const next = cardPinInput + num;
                      setCardPinInput(next);
                      setCardPinError(false);
                      if (next.length === 4) {
                        handleVerifyCardPin(next);
                      }
                    }
                  }}
                  className={`h-11 flex items-center justify-center rounded-xl text-lg font-mono font-black active:scale-95 transition-all cursor-pointer border ${palette.streakCard} ${palette.streakBorder} ${palette.titleText} hover:opacity-85 shadow-sm`}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  if (cardPinInput.length < 4) {
                    const next = cardPinInput + '0';
                    setCardPinInput(next);
                    setCardPinError(false);
                    if (next.length === 4) {
                      handleVerifyCardPin(next);
                    }
                  }
                }}
                className={`col-start-2 h-11 flex items-center justify-center rounded-xl text-lg font-mono font-black active:scale-95 transition-all cursor-pointer border ${palette.streakCard} ${palette.streakBorder} ${palette.titleText} hover:opacity-85 shadow-sm`}
              >
                0
              </button>
              <button
                type="button"
                onClick={() => {
                  setCardPinInput(prev => prev.slice(0, -1));
                  setCardPinError(false);
                }}
                className={`h-11 flex items-center justify-center rounded-xl active:scale-95 transition-all cursor-pointer border ${palette.streakCard} ${palette.streakBorder} ${palette.subText} hover:text-red-500 hover:border-red-300`}
              >
                &larr;
              </button>
            </div>

            {/* Lupa PIN Button */}
            <button
              type="button"
              onClick={() => {
                setShowForgotModal(true);
                setForgotAnswerInput('');
                setForgotAnswerError(false);
              }}
              className={`mt-1 mb-3 text-xs font-semibold ${palette.subText} hover:${palette.titleText} transition-colors border-b border-transparent py-0.5 cursor-pointer`}
            >
              {lang === 'id' ? 'Lupa PIN?' : 'Forgot PIN?'}
            </button>

            <button
              type="button"
              onClick={() => {
                setNoteForPinUnlock(null);
                setCardPinInput('');
                setCardPinError(false);
              }}
              className={`w-full py-2 font-bold text-xs rounded-xl transition-colors cursor-pointer ${palette.actionBtn}`}
            >
              {lang === 'id' ? 'Batal' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* Forgot PIN Modal for Note Card Unlock */}
      {showForgotModal && (
        <div className="fixed inset-0 z-[270] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
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
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-xs">
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
                    ? 'Jawab pertanyaan keamanan akun Tata Anda (sama dengan opsi lupa PIN awal masuk) untuk membuka catatan ini.'
                    : 'Answer your Tata account security question (same recovery option as app entrance PIN) to unlock this note.'}
                </p>
                {pinRecoveryQuestion && (
                  <div className={`p-3.5 rounded-2xl mb-3 text-left border ${palette.streakCard} ${palette.streakBorder}`}>
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
                  onKeyDown={async e => {
                    if (e.key === 'Enter') {
                      if (!pinRecoveryAnswer || !forgotAnswerInput.trim() || !noteForPinUnlock) return;
                      const isValid = await verifyPin(forgotAnswerInput.trim().toLowerCase(), pinRecoveryAnswer || '');
                      const isCorrect = isValid || forgotAnswerInput.trim().toLowerCase() === (pinRecoveryAnswer || '').trim().toLowerCase();

                      if (isCorrect) {
                        if (pinRecoveryAnswer && !pinRecoveryAnswer.startsWith('pbkdf2_v1.')) {
                          const hashed = await createPinHash(forgotAnswerInput.trim().toLowerCase());
                          setPinRecoveryAnswer(hashed);
                        }
                        updateNote({ ...noteForPinUnlock, isLocked: false });
                        setNoteForPinUnlock(null);
                        setShowForgotModal(false);
                        setForgotAnswerInput('');
                        setForgotAnswerError(false);
                      } else {
                        setForgotAnswerError(true);
                        setTimeout(() => setForgotAnswerError(false), 600);
                      }
                    }
                  }}
                  className={`w-full rounded-xl px-4 py-3 text-sm mb-3 outline-none transition-colors border ${palette.searchContainer} ${palette.streakBorder} ${palette.titleText} focus:border-amber-500`}
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
                    onClick={async () => {
                      if (!pinRecoveryAnswer || !forgotAnswerInput.trim() || !noteForPinUnlock) return;
                      const isValid = await verifyPin(forgotAnswerInput.trim().toLowerCase(), pinRecoveryAnswer || '');
                      const isCorrect = isValid || forgotAnswerInput.trim().toLowerCase() === (pinRecoveryAnswer || '').trim().toLowerCase();

                      if (isCorrect) {
                        if (pinRecoveryAnswer && !pinRecoveryAnswer.startsWith('pbkdf2_v1.')) {
                          const hashed = await createPinHash(forgotAnswerInput.trim().toLowerCase());
                          setPinRecoveryAnswer(hashed);
                        }
                        const targetNote = noteForPinUnlock;
                        setNoteForPinUnlock(null);
                        setShowForgotModal(false);
                        setForgotAnswerInput('');
                        setForgotAnswerError(false);

                        if (pinUnlockMode === 'remove') {
                          updateNote({ ...targetNote, isLocked: false });
                          lockNoteForSession(targetNote.id);
                          showToast(lang === 'id' ? 'Kunci PIN pada catatan berhasil dihapus.' : 'PIN lock removed from note.');
                        } else {
                          unlockNoteForSession(targetNote.id);
                          onOpenNote(targetNote);
                        }
                      } else {
                        setForgotAnswerError(true);
                        setTimeout(() => setForgotAnswerError(false), 600);
                      }
                    }}
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

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[300] px-4 py-2.5 rounded-2xl bg-zinc-900/95 text-white border border-white/10 shadow-xl text-xs font-medium backdrop-blur-md animate-in fade-in slide-in-from-bottom-3 duration-200">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { Bot, Send, Trash2, ArrowLeft, ShieldAlert, Sparkles, AlertCircle, Check, HelpCircle, Lock, Shield, Eye, Flame, Wallet, CheckSquare, Smile, FileText, Plus, Copy, RotateCcw, Info, X, BookmarkPlus, Share2, Compass, Target, Feather, CreditCard, PiggyBank, TrendingUp, AlertTriangle, Square, Zap, SlidersHorizontal, Lightbulb } from 'lucide-react';
import { useAppStore } from '../store';
import { useTranslation } from '../translations';
import { motion, AnimatePresence } from 'motion/react';
import { generateId } from '../utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Note } from '../types';
import { playAISendSound, playAIReplySound, playDeleteSound, playTapSound, playNavSound } from '../utils/sound';
import {
  Icon3DTataAI, Icon3DWallet, Icon3DFlame, Icon3DFeather, Icon3DMoodHappy,
  Icon3DLightbulb, Icon3DCheckSquare, Icon3DFileText, Icon3DShield, Icon3DSend,
  Icon3DArrowLeft, Icon3DClose, Icon3DCopy, Icon3DBookmark, Icon3DRotateCcw,
  Icon3DSliders, Icon3DZap, Icon3DCheck, Icon3DWarning, Icon3DStop, Icon3DEye,
  Icon3DInfo, Icon3DNavNotes
} from '../components/home/Organic3DIcons';
import { LiteStickerIcon } from '../components/LiteModeIcons';


interface AICompanionProps {
  onBack: () => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  isSystemPrompt?: boolean;
  modelUsed?: string;
  images?: { mimeType: string; data: string }[];
}

export function extractAndCleanImages(content: string) {
  const images: { mimeType: string; data: string }[] = [];
  if (!content) return { cleanedContent: '', images };

  // Match <img ... src="data:image/(png|jpeg|jpg|webp|gif);base64,([^"']+)">
  const imgTagRegex = /<img[^>]+src=["']data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([^"']+)["'][^>]*>/gi;
  let count = 0;

  let cleaned = content.replace(imgTagRegex, (_match, mimeType, base64Data) => {
    count++;
    images.push({ mimeType, data: base64Data });
    return `\n[Gambar/Foto Terlampir #${count}]\n`;
  });

  // Match raw data:image/...;base64,... strings
  const rawDataUrlRegex = /data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=]{100,})/gi;
  cleaned = cleaned.replace(rawDataUrlRegex, (_match, mimeType, base64Data) => {
    if (!images.some(img => img.data === base64Data)) {
      count++;
      images.push({ mimeType, data: base64Data });
      return `[Gambar/Foto Terlampir #${count}]`;
    }
    return `[Gambar/Foto Terlampir]`;
  });

  // Clean HTML tags and excessive spacing
  cleaned = cleaned
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();

  return { cleanedContent: cleaned, images };
}

// Memoized Chat Message Bubble Component to prevent re-parsing Markdown on every single input keypress
const ChatMessageBubble = React.memo(({
  msg,
  lang,
  isOrganic,
  copiedMsgId,
  savedMsgId,
  onCopy,
  onSaveToNote,
  onPreviewImage,
  isLite
}: {
  msg: ChatMessage;
  lang: string;
  isOrganic: boolean;
  copiedMsgId: string | null;
  savedMsgId: string | null;
  onCopy: (msgId: string, text: string) => void;
  onSaveToNote: (msgId: string, text: string) => void;
  onPreviewImage: (url: string) => void;
  isLite?: boolean;
}) => {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300 w-full mb-3.5`}>
      <div className={`flex gap-3 w-full ${isUser ? 'flex-row-reverse items-end' : 'flex-row items-start'}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 text-white shadow-md shadow-indigo-500/20 mt-0.5 border border-indigo-400/30">
            {isOrganic ? <Icon3DTataAI size={22} /> : isLite ? <LiteStickerIcon variant="ai" size="xs" /> : <Bot size={16} />}
          </div>
        )}

        <div className={`flex flex-col gap-1.5 max-w-full ${isUser ? 'items-end' : 'items-start flex-1 min-w-0'}`}>
          <div className={`text-sm leading-relaxed ${
            isUser 
              ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-2xl rounded-tr-xs px-4 py-3 shadow-md max-w-[88%] sm:max-w-[82%] border border-indigo-400/40 break-words [word-break:break-word]' 
              : 'bg-slate-900/90 border border-slate-800/80 rounded-2xl rounded-tl-xs p-4 sm:p-5 text-slate-100 w-full shadow-sm break-words [word-break:break-word] overflow-hidden'
          }`}>
            {isUser ? (
              <div className="flex flex-col gap-2">
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {msg.images && msg.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {msg.images.map((img, i) => {
                      const imgSrc = `data:${img.mimeType};base64,${img.data}`;
                      return (
                        <div 
                          key={i} 
                          onClick={() => onPreviewImage(imgSrc)}
                          className="relative rounded-xl overflow-hidden border border-indigo-400/40 shadow-md max-w-[180px] max-h-[140px] cursor-pointer hover:opacity-90 transition-opacity group"
                          title={lang === 'id' ? 'Klik untuk memperbesar' : 'Click to enlarge'}
                        >
                          <img 
                            src={imgSrc} 
                            alt="Visual Attachment" 
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[11px] font-bold">
                            🔍 {lang === 'id' ? 'Lihat' : 'View'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="prose prose-invert prose-sm sm:prose-base max-w-none break-words [word-break:break-word] prose-p:my-2 prose-p:leading-relaxed prose-headings:my-2.5 prose-headings:font-bold prose-headings:text-slate-100 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 prose-pre:my-2.5 prose-pre:max-w-full prose-pre:overflow-x-auto prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800/80 prose-pre:rounded-xl prose-pre:p-3.5 prose-code:text-indigo-300 prose-code:bg-slate-800/80 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none prose-a:text-indigo-400 prose-table:my-2 prose-table:border-collapse prose-th:border prose-th:border-slate-800 prose-th:bg-slate-800/50 prose-th:p-2 prose-td:border prose-td:border-slate-800 prose-td:p-2">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
                
                <div className="mt-3.5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-slate-400">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onCopy(msg.id, msg.content)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 hover:text-slate-100 text-[11px] font-semibold transition-all cursor-pointer border border-slate-700/60 shadow-xs"
                      title={lang === 'id' ? 'Salin Pesan' : 'Copy Response'}
                    >
                      {copiedMsgId === msg.id ? (
                        <>
                          {isOrganic ? <Icon3DCheck size={14} /> : <Check size={13} className="text-emerald-400" />}
                          <span className="text-emerald-400 font-bold">{lang === 'id' ? 'Tersalin!' : 'Copied!'}</span>
                        </>
                      ) : (
                        <>
                          {isOrganic ? <Icon3DCopy size={14} /> : <Copy size={13} />}
                          <span>{lang === 'id' ? 'Salin' : 'Copy'}</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => onSaveToNote(msg.id, msg.content)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 hover:text-indigo-200 text-[11px] font-semibold transition-all cursor-pointer border border-indigo-500/30 shadow-xs"
                      title={lang === 'id' ? 'Simpan Balasan Ini ke Catatan Saya' : 'Save Response to Note'}
                    >
                      {savedMsgId === msg.id ? (
                        <>
                          {isOrganic ? <Icon3DCheck size={14} /> : <Check size={13} className="text-emerald-400" />}
                          <span className="text-emerald-400 font-bold">{lang === 'id' ? 'Tersimpan!' : 'Saved!'}</span>
                        </>
                      ) : (
                        <>
                          {isOrganic ? <Icon3DBookmark size={14} /> : <BookmarkPlus size={13} />}
                          <span>{lang === 'id' ? 'Simpan ke Catatan' : 'Save to Note'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {msg.modelUsed && (
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-medium text-slate-500">
                      {isOrganic ? <Icon3DTataAI size={13} /> : <Bot size={11} className="text-indigo-400" />}
                      <span>{msg.modelUsed}</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export type AIPersonality = 'general' | 'discipline' | 'finance' | 'writer' | 'mindfulness';
export type AITierMode = 'lite' | 'pro';

export default function AICompanionScreen({ onBack }: AICompanionProps) {
  const { notes, addNote, moods, transactions, tasks, streak, savingsBalance, savingsTarget, savingsGoals, lang, tempNoteContext, setTempNoteContext, autoSendNoteToAI, setAutoSendNoteToAI, geminiApiKey, debts, initialDebt, isLiteMode, appVersion, tataAccount } = useAppStore();
  const t = useTranslation(lang);
  const isOrganic = appVersion === 'organic' || appVersion === 'pro_max' || (typeof window !== 'undefined' && ['organic', 'pro_max'].includes(localStorage.getItem('tata_theme') || ''));

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showNoteAttachModal, setShowNoteAttachModal] = useState(false);

  // AI Tier Mode (Tata Lite vs Tata Pro: gaya respon / tone format)
  const [aiTierMode, setAiTierMode] = useState<AITierMode>(() => {
    try {
      return (localStorage.getItem('tata_ai_tier_mode') as AITierMode) || 'lite';
    } catch (e) {
      return 'lite';
    }
  });

  // Calculate maximum free credits dynamically (Lite = 7/day, Pro = 20/day, Pro Max = 30/day)
  const isAppInLiteMode = Boolean(isLiteMode || appVersion === 'lite');
  const defaultMaxCredits = isAppInLiteMode ? 7 : (tataAccount?.isPremium ? 20 : 7);
  const [serverMaxCredits, setServerMaxCredits] = useState<number>(defaultMaxCredits);
  const maxDailyCredits = serverMaxCredits;

  // Daily AI Credits State
  const [creditsLeft, setCreditsLeft] = useState<number>(() => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const storedDate = localStorage.getItem('tata_ai_credits_date');
      const storedCredits = localStorage.getItem('tata_ai_credits_left');
      const initialLimit = defaultMaxCredits;
      if (storedDate === todayStr && storedCredits !== null) {
        const parsed = Number(storedCredits);
        return isNaN(parsed) ? initialLimit : Math.min(parsed, initialLimit);
      }
      return initialLimit;
    } catch {
      return defaultMaxCredits;
    }
  });
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [savedMsgId, setSavedMsgId] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  const handleSelectAiTierMode = (mode: AITierMode) => {
    playTapSound();
    setAiTierMode(mode);
    try {
      localStorage.setItem('tata_ai_tier_mode', mode);
    } catch (e) {}
  };

  // AI Personality Mode State
  const [personality, setPersonality] = useState<AIPersonality>(() => {
    try {
      return (localStorage.getItem('tata_ai_personality') as AIPersonality) || 'general';
    } catch (e) {
      return 'general';
    }
  });

  const handleSelectPersonality = (p: AIPersonality) => {
    setPersonality(p);
    try {
      localStorage.setItem('tata_ai_personality', p);
    } catch (e) {}
  };

  // Image Lightbox State
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null);

  // Store last call args for instant Retry on error
  const lastCallArgsRef = useRef<{ fullPrompt: string; userFacingPrompt?: string; attachedImages?: { mimeType: string; data: string }[] } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCancelRequest = () => {
    playDeleteSound();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
    setErrorMsg(null);

    const cancelNotice: ChatMessage = {
      id: generateId(),
      role: 'model',
      content: lang === 'id' 
        ? "*(Pengiriman / proses Tata AI telah dibatalkan)*" 
        : "*(Tata AI request processing cancelled)*",
      timestamp: Date.now()
    };
    setMessages(prev => {
      const updated = [...prev, cancelNotice];
      saveChatHistory(updated);
      return updated;
    });
  };

  const handleRetry = () => {
    if (lastCallArgsRef.current && !isLoading) {
      const { fullPrompt, userFacingPrompt, attachedImages } = lastCallArgsRef.current;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last && last.role === 'user' && last.content === (userFacingPrompt || fullPrompt)) {
          return prev.slice(0, -1);
        }
        return prev;
      });
      executeChatCall(fullPrompt, userFacingPrompt, attachedImages);
    }
  };

  const handleSaveMsgToNote = (msgId: string, text: string) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const newNote: Note = {
        id: generateId(),
        title: lang === 'id' ? `Hasil Tata AI (${todayStr})` : `Tata AI Output (${todayStr})`,
        content: text,
        tags: ['tata-ai', 'ai'],
        date: todayStr,
        updatedAt: Date.now(),
        sharedWithAI: true
      };
      addNote(newNote);
      setSavedMsgId(msgId);
      setTimeout(() => setSavedMsgId(null), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportChatToNote = () => {
    if (messages.length === 0) return;
    const todayStr = new Date().toISOString().split('T')[0];
    let formattedContent = lang === 'id' 
      ? `# Sesi Percakapan Tata AI (${todayStr})\n\n` 
      : `# Tata AI Conversation (${todayStr})\n\n`;

    messages.forEach(m => {
      const sender = m.role === 'user' ? '👤 **Pengguna**' : '🤖 **Tata AI**';
      formattedContent += `${sender}:\n${m.content}\n\n---\n\n`;
    });

    const newNote: Note = {
      id: generateId(),
      title: lang === 'id' ? `Sesi Chat Tata AI (${todayStr})` : `Tata AI Chat Log (${todayStr})`,
      content: formattedContent,
      tags: ['tata-ai', 'chat-export'],
      date: todayStr,
      updatedAt: Date.now(),
      sharedWithAI: true
    };
    addNote(newNote);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2500);
  };

  const getPersonalityDetails = (p: AIPersonality) => {
    switch (p) {
      case 'discipline':
        return { label: lang === 'id' ? 'Pelatih Disiplin' : 'Discipline Coach', icon: Flame, badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30' };
      case 'finance':
        return { label: lang === 'id' ? 'Konsultan Keuangan' : 'Financial Advisor', icon: Wallet, badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' };
      case 'writer':
        return { label: lang === 'id' ? 'Penulis & Editor' : 'Writer & Editor', icon: Feather, badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30' };
      case 'mindfulness':
        return { label: lang === 'id' ? 'Mentor Mindfulness' : 'Mindfulness Mentor', icon: Smile, badgeBg: 'bg-sky-500/10 text-sky-400 border-sky-500/30' };
      default:
        return { label: lang === 'id' ? 'Asisten Produktivitas' : 'Productivity Assistant', icon: Bot, badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' };
    }
  };

  const getCoreShortcuts = () => {
    if (lang === 'id') {
      return [
        {
          title: '💡 Rekomendasi Finansial AI',
          desc: 'Analisis cashflow, pos tabungan/deposito & strategi hutang',
          prompt: 'Tolong berikan analisis mendalam dan rekomendasi finansial terstruktur berdasarkan data keuangan saya: evaluasi rasio arus kas (cashflow), pos tabungan & impian (termasuk optimasi bunga/deposito/reksadana), efisiensi pengeluaran terbesar, serta saran alokasi atau pelunasan hutang.',
          type: 'finance' as const,
          icon: Lightbulb,
          color: 'text-amber-400 border-amber-500/20 group-hover:bg-amber-600 group-hover:text-white'
        },
        {
          title: 'Analisis Tugas & Produktivitas',
          desc: 'Evaluasi konsistensi tugas, pola streak & kendala ceklis',
          prompt: 'Tolong analisis tingkat penyelesaian tugas saya sepanjang waktu (semenjak awal dibuat), identifikasi pola hari di mana saya sering gagal ceklis, dan analisis kendala utamanya.',
          type: 'tasks' as const,
          icon: CheckSquare,
          color: 'text-indigo-400 border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white'
        },
        {
          title: 'Ringkasan Kas & Keuangan',
          desc: 'Evaluasi saldo dompet, tabungan celengan & cashflow',
          prompt: 'Bagaimana kondisi keuangan, saldo dompet, dan tabungan saya saat ini?',
          type: 'finance' as const,
          icon: Wallet,
          color: 'text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white'
        },
        {
          title: 'Panduan & Fitur Tata',
          desc: 'Pelajari semua modul, tips produktivitas & cara kerja offline Tata',
          prompt: 'Tolong jelaskan secara lengkap seluruh fitur unggulan yang ada di aplikasi Tata (Catatan, Tugas & Habit, Pos Impian & Keuangan, Kalender, Games Hub, Auto-Backup, dan Keamanan) serta cara memanfaatkannya secara maksimal.',
          type: 'guide' as const,
          icon: Compass,
          color: 'text-purple-400 border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white'
        },
        {
          title: 'Tanya dari Catatan',
          desc: 'Lampirkan catatan tersimpan untuk dibahas atau dipoles',
          prompt: '',
          type: 'note' as const,
          icon: FileText,
          color: 'text-sky-400 border-sky-500/20 group-hover:bg-sky-600 group-hover:text-white'
        },
        {
          title: 'Refleksi Mood 7 Hari',
          desc: 'Tinjau tren suasana hati mingguan & booster motivasi',
          prompt: 'Tolong berikan refleksi mood 7 hari terakhir saya di Tata dan berikan masukan yang menenangkan.',
          type: 'mood' as const,
          icon: Smile,
          color: 'text-rose-400 border-rose-500/20 group-hover:bg-rose-600 group-hover:text-white'
        }
      ];
    }
    return [
      {
        title: '💡 AI Financial Strategy',
        desc: 'Analyze cashflow, savings/deposit yields & debt payoff',
        prompt: 'Please provide an in-depth, structured financial evaluation and recommendations based on my finances: evaluate cashflow ratio, savings & dream goals (including interest/deposit/mutual funds yields), top expense efficiency, and debt payoff advice.',
        type: 'finance' as const,
        icon: Lightbulb,
        color: 'text-amber-400 border-amber-500/20 group-hover:bg-amber-600 group-hover:text-white'
      },
      {
        title: 'Task & Productivity Analysis',
        desc: 'Evaluate completion rates, streak patterns & blockers',
        prompt: 'Please analyze my all-time task completion rate, identify day-of-week drop-offs, and assess key blockers.',
        type: 'tasks' as const,
        icon: CheckSquare,
        color: 'text-indigo-400 border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white'
      },
      {
        title: 'Cash & Financial Summary',
        desc: 'Review wallet balance, savings vault & cashflow',
        prompt: 'How is my current financial status, wallet cash, and savings balance?',
        type: 'finance' as const,
        icon: Wallet,
        color: 'text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-600 group-hover:text-white'
      },
      {
        title: 'Tata Features & Guide',
        desc: 'Explore all modules, productivity tips & offline capabilities',
        prompt: 'Please provide a comprehensive overview of all top features in Tata (Notes, Tasks & Habits, Dream Goals & Finance, Calendar, Games Hub, Auto-Backup, and Security) and how to maximize their benefits.',
        type: 'guide' as const,
        icon: Compass,
        color: 'text-purple-400 border-purple-500/20 group-hover:bg-purple-600 group-hover:text-white'
      },
      {
        title: 'Discuss a Note',
        desc: 'Attach an authorized note to summarize or refine',
        prompt: '',
        type: 'note' as const,
        icon: FileText,
        color: 'text-sky-400 border-sky-500/20 group-hover:bg-sky-600 group-hover:text-white'
      },
      {
        title: '7-Day Mood Reflection',
        desc: 'Review weekly emotional trends & uplifting guidance',
        prompt: 'Please review my mood logs from the last 7 days and provide empathetic guidance.',
        type: 'mood' as const,
        icon: Smile,
        color: 'text-rose-400 border-rose-500/20 group-hover:bg-rose-600 group-hover:text-white'
      }
    ];
  };

  const getActiveModelDetails = () => {
    if (!geminiApiKey) {
      return {
        provider: 'Gemini',
        version: 'gemini-3.6-flash',
        isByok: false,
        label: 'Gemini 3.6 Flash'
      };
    }
    const key = geminiApiKey.trim();
    if (key.startsWith('xai-') || key.toLowerCase().includes('grok')) {
      return {
        provider: 'xAI Grok',
        version: 'grok-2-latest',
        isByok: true,
        label: 'xAI Grok-2'
      };
    }
    if (key.startsWith('gsk_')) {
      return {
        provider: 'Groq',
        version: 'llama-3.3-70b',
        isByok: true,
        label: 'Groq Llama 3.3'
      };
    }
    if (key.startsWith('sk-ant-')) {
      return {
        provider: 'Anthropic',
        version: 'claude-3-5-sonnet',
        isByok: true,
        label: 'Claude 3.5 Sonnet'
      };
    }
    if (key.startsWith('sk-or-')) {
      return {
        provider: 'OpenRouter',
        version: 'auto-route',
        isByok: true,
        label: 'OpenRouter AI'
      };
    }
    if (key.startsWith('sk-')) {
      return {
        provider: 'OpenAI',
        version: 'gpt-4o-mini',
        isByok: true,
        label: 'OpenAI GPT-4o'
      };
    }
    if (key.startsWith('AIzaSy') || key.startsWith('AQ') || key.startsWith('AI')) {
      return {
        provider: 'Gemini BYOK',
        version: 'gemini-3.6-flash',
        isByok: true,
        label: 'Gemini 3.6 (BYOK)'
      };
    }
    return {
      provider: 'Custom AI',
      version: 'custom-key',
      isByok: true,
      label: 'Custom AI (BYOK)'
    };
  };

  const handleCopyMessage = (msgId: string, text: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch (e) {
      console.error(e);
    }
  };
  const [todayStr] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // Consent Modal State
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentType, setConsentType] = useState<'mood' | 'finance' | 'tasks' | null>(null);
  const [consentPayload, setConsentPayload] = useState<string>('');
  const [pendingPrompt, setPendingPrompt] = useState<string>('');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const latestMsgRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto resize textarea height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputText]);

  // Load and Reset Credits with Dynamic Limit from Server Quota
  useEffect(() => {
    try {
      const storedDate = localStorage.getItem('tata_ai_credits_date');
      const storedCredits = localStorage.getItem('tata_ai_credits_left');

      if (storedDate === todayStr && storedCredits !== null) {
        const parsed = Number(storedCredits);
        const valid = isNaN(parsed) ? maxDailyCredits : parsed;
        const adjusted = Math.min(valid, maxDailyCredits);
        setCreditsLeft(adjusted);
        if (adjusted !== valid) {
          localStorage.setItem('tata_ai_credits_left', String(adjusted));
        }
      } else {
        localStorage.setItem('tata_ai_credits_date', todayStr);
        localStorage.setItem('tata_ai_credits_left', String(maxDailyCredits));
        setCreditsLeft(maxDailyCredits);
      }
    } catch (e) {
      console.error("Failed to load credits:", e);
    }
  }, [todayStr, maxDailyCredits]);

  // Sinkronisasi Kuota Harian dari Server (Server sebagai single source of truth)
  useEffect(() => {
    const token = tataAccount?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
    if (!token) return;

    fetch('/api/ai/quota', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          if (typeof data.creditsLeft === 'number') {
            setCreditsLeft(data.creditsLeft);
            try {
              localStorage.setItem('tata_ai_credits_left', String(data.creditsLeft));
            } catch(e) {}
          }
          if (typeof data.maxCredits === 'number') {
            setServerMaxCredits(data.maxCredits);
          }
        }
      })
      .catch(() => {});
  }, [tataAccount?.sessionToken]);

  // Load chat history from localStorage with 24-hour auto-reset
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('tata_ai_chat_history');
      const savedTimestampStr = localStorage.getItem('tata_ai_chat_timestamp');
      const ONE_DAY_MS = 24 * 60 * 60 * 1000;
      let loadedValidHistory = false;

      if (savedHistory && savedTimestampStr) {
        const timestamp = Number(savedTimestampStr);
        if (!isNaN(timestamp) && (Date.now() - timestamp) < ONE_DAY_MS) {
          const parsed = JSON.parse(savedHistory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const officialWarning = lang === 'id' 
              ? `⚠️ Peringatan Privasi: Mohon jangan mengirimkan data sensitif, kata sandi, atau data pribadi yang tidak ingin Anda bagikan kepada orang lain ke dalam Tata AI. Tata AI bersifat online dan terpisah dari menu lokal Tata lainnya. Pemrosesan data pada percakapan ini mengikuti kebijakan privasi pihak ketiga (Google Gemini untuk versi gratis ${maxDailyCredits} kredit/hari, atau platform penyedia API Key pribadi/BYOK yang Anda gunakan). Tetap berhati-hati dan bijak dalam membagikan informasi.`
              : `⚠️ Privacy Warning: Please do not send sensitive data, passwords, or personal data that you do not wish to share with others into Tata AI. Tata AI is online and separate from other local Tata features. Data processing in this conversation follows third-party privacy policies (Google Gemini for the free ${maxDailyCredits} credits/day version, or your personal BYOK API Key platform). Always be cautious and wise when sharing information.`;
            
            const updated = parsed.map((m: ChatMessage) => {
              if (m.id === 'welcome') {
                return { ...m, content: officialWarning };
              }
              return m;
            });
            setMessages(updated);
            saveChatHistory(updated);
            loadedValidHistory = true;
          }
        }
      }

      if (!loadedValidHistory) {
        localStorage.removeItem('tata_ai_chat_history');
        localStorage.removeItem('tata_ai_chat_timestamp');
        // Welcome message with official privacy warning
        const welcome: ChatMessage = {
          id: 'welcome',
          role: 'model',
          content: lang === 'id' 
            ? `⚠️ Peringatan Privasi: Mohon jangan mengirimkan data sensitif, kata sandi, atau data pribadi yang tidak ingin Anda bagikan kepada orang lain ke dalam Tata AI. Tata AI bersifat online dan terpisah dari menu lokal Tata lainnya. Pemrosesan data pada percakapan ini mengikuti kebijakan privasi pihak ketiga (Google Gemini untuk versi gratis ${maxDailyCredits} kredit/hari, atau platform penyedia API Key pribadi/BYOK yang Anda gunakan). Tetap berhati-hati dan bijak dalam membagikan informasi.`
            : `⚠️ Privacy Warning: Please do not send sensitive data, passwords, or personal data that you do not wish to share with others into Tata AI. Tata AI is online and separate from other local Tata features. Data processing in this conversation follows third-party privacy policies (Google Gemini for the free ${maxDailyCredits} credits/day version, or your personal BYOK API Key platform). Always be cautious and wise when sharing information.`,
          timestamp: Date.now()
        };
        setMessages([welcome]);
      }
    } catch (e) {
      console.error(e);
    }
  }, [lang, maxDailyCredits]);

  // Save chat history to localStorage (strip heavy base64 image data to prevent lag)
  const saveChatHistory = (history: ChatMessage[]) => {
    try {
      const sanitizedHistory = history.slice(-25).map(msg => {
        if (msg.images && msg.images.length > 0) {
          return { ...msg, images: undefined };
        }
        return msg;
      });
      localStorage.setItem('tata_ai_chat_history', JSON.stringify(sanitizedHistory));
      localStorage.setItem('tata_ai_chat_timestamp', String(Date.now()));
    } catch (e) {
      console.error(e);
    }
  };

  // Auto-scroll chat so the START of new AI responses appears at top of viewport
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === 'model') {
          latestMsgRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }, 80);
      return () => clearTimeout(timer);
    }
  }, [messages.length, isLoading]);

  const updateCredits = (newCount: number) => {
    setCreditsLeft(newCount);
    try {
      localStorage.setItem('tata_ai_credits_left', String(newCount));
    } catch (e) {}
  };

  // Compile Minimal Consent Payloads
  const getMoodPayload = () => {
    // Get last 7 days of moods
    const sortedMoods = [...moods]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 7);

    if (sortedMoods.length === 0) {
      return lang === 'id' 
        ? "Belum ada catatan mood dalam 7 hari terakhir." 
        : "No mood logs registered in the last 7 days.";
    }

    return sortedMoods.map(m => {
      const dateObj = new Date(m.date);
      const dayName = dateObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
      const moodLabel = lang === 'id' 
        ? (m.mood === 'excellent' ? 'Sangat Senang' : m.mood === 'good' ? 'Senang' : m.mood === 'neutral' ? 'Biasa Saja' : m.mood === 'bad' ? 'Buruk' : 'Sangat Buruk')
        : (m.mood === 'excellent' ? 'Excellent' : m.mood === 'good' ? 'Good' : m.mood === 'neutral' ? 'Neutral' : m.mood === 'bad' ? 'Bad' : 'Terrible');
      return `- ${dayName}: ${moodLabel} ${m.note ? `("${m.note}")` : ''}`;
    }).join('\n');
  };

  const getFinancePayload = () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed (0 = Jan, ..., 11 = Dec)
    const currentYearMonth = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    const currentMonthName = now.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });

    const prevDate = new Date(currentYear, currentMonth - 1, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonth = prevDate.getMonth();
    const prevYearMonth = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}`;
    const prevMonthName = prevDate.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });

    const formatCurr = (num: number) =>
      new Intl.NumberFormat(lang === 'id' ? 'id-ID' : 'en-US', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);

    const getTxDateStr = (t: any) => {
      if (!t.date) return '';
      return String(t.date).split('T')[0];
    };

    const getTxYearMonth = (t: any) => {
      const d = getTxDateStr(t);
      if (!d || !d.includes('-')) return '';
      return d.substring(0, 7); // 'YYYY-MM'
    };

    // 1. ALL-TIME TOTALS & NET WORTH
    const allIncomeTxs = transactions.filter(t => t.type === 'income');
    const allExpenseTxs = transactions.filter(t => t.type === 'expense');
    const totalIncomeAllTime = allIncomeTxs.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenseAllTime = allExpenseTxs.reduce((sum, t) => sum + t.amount, 0);
    const availableWalletCash = totalIncomeAllTime - totalExpenseAllTime;
    
    // Pos Tabungan & Impian (Savings Goals)
    const goalsList = savingsGoals || [];
    const totalInGoals = goalsList.reduce((acc, g) => acc + (g.currentAmount || 0), 0);
    const totalGoalTargets = goalsList.reduce((acc, g) => acc + (g.targetAmount || 0), 0);

    // Active Total Savings: If user has multi-goals (Pos Impian), the savings sum is totalInGoals.
    // If user has only the single vault/celengan, it is savingsBalance.
    const activeSavings = goalsList.length > 0 ? totalInGoals : (savingsBalance || 0);

    // Total Net Worth (Kekayaan Bersih = Kas Dompet Bebas + Total Tabungan)
    const totalNetCash = availableWalletCash + activeSavings;

    // Debt calculations
    const activeDebts = (debts || []).filter(d => !d.isPaidOff);
    const totalDebtFromItems = activeDebts.reduce((acc, d) => acc + d.remainingAmount, 0);

    const totalDebtExpenses = transactions
      .filter(t => t.type === 'expense' && (t.category === 'Hutang' || t.category === 'Bayar Hutang' || t.linkedDebtId))
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebtIncomes = transactions
      .filter(t => t.type === 'income' && t.category === 'Hutang')
      .reduce((sum, t) => sum + t.amount, 0);

    const totalDebt = (debts && debts.length > 0)
      ? totalDebtFromItems
      : Math.max(0, (initialDebt || 0) + totalDebtIncomes - totalDebtExpenses);

    let targetText = lang === 'id' ? 'Tidak ada target celengan aktif' : 'No active vault target';
    if (goalsList.length > 0 && totalGoalTargets > 0) {
      const percent = Math.min(100, Math.round((totalInGoals / totalGoalTargets) * 100));
      targetText = `${formatCurr(totalGoalTargets)} (${percent}% ${lang === 'id' ? 'tercapai' : 'achieved'})`;
    } else if (savingsTarget && savingsTarget > 0) {
      const percent = Math.min(100, Math.round(((savingsBalance || 0) / savingsTarget) * 100));
      targetText = `${formatCurr(savingsTarget)} (${percent}% ${lang === 'id' ? 'tercapai' : 'achieved'})`;
    }

    // 2. BULAN INI (CURRENT MONTH / BULAN BERJALAN)
    const thisMonthTxs = transactions.filter(t => getTxYearMonth(t) === currentYearMonth);
    const incomeThisMonth = thisMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expenseThisMonth = thisMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netCashflowThisMonth = incomeThisMonth - expenseThisMonth;
    const savingsRateThisMonth = incomeThisMonth > 0 ? Math.max(0, Math.round(((incomeThisMonth - expenseThisMonth) / incomeThisMonth) * 100)) : 0;

    const expenseCategoryMapThisMonth: Record<string, number> = {};
    thisMonthTxs.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || (lang === 'id' ? 'Lainnya' : 'Other');
      expenseCategoryMapThisMonth[cat] = (expenseCategoryMapThisMonth[cat] || 0) + t.amount;
    });
    const topCategoriesThisMonth = Object.entries(expenseCategoryMapThisMonth)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => {
        const catPct = expenseThisMonth > 0 ? Math.round((amt / expenseThisMonth) * 100) : 0;
        return `  - ${cat}: ${formatCurr(amt)} (${catPct}% dari total pengeluaran bulan ini)`;
      })
      .join('\n');

    const thisMonthTxList = thisMonthTxs
      .slice(0, 20)
      .map(t => {
        const typeLabel = t.type === 'income' ? (lang === 'id' ? '[+ Pemasukan]' : '[+ Income]') : (lang === 'id' ? '[- Pengeluaran]' : '[- Expense]');
        const dateStr = getTxDateStr(t);
        const catStr = t.category || '';
        const descStr = t.description ? ` - "${t.description}"` : '';
        return `  * ${dateStr}: ${typeLabel} ${catStr} (${formatCurr(t.amount)})${descStr}`;
      })
      .join('\n');

    // 3. BULAN KEMARIN (PREVIOUS MONTH / BULAN LALU)
    const prevMonthTxs = transactions.filter(t => getTxYearMonth(t) === prevYearMonth);
    const incomePrevMonth = prevMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const expensePrevMonth = prevMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netCashflowPrevMonth = incomePrevMonth - expensePrevMonth;

    const expenseCategoryMapPrevMonth: Record<string, number> = {};
    prevMonthTxs.filter(t => t.type === 'expense').forEach(t => {
      const cat = t.category || (lang === 'id' ? 'Lainnya' : 'Other');
      expenseCategoryMapPrevMonth[cat] = (expenseCategoryMapPrevMonth[cat] || 0) + t.amount;
    });
    const topCategoriesPrevMonth = Object.entries(expenseCategoryMapPrevMonth)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat, amt]) => {
        const catPct = expensePrevMonth > 0 ? Math.round((amt / expensePrevMonth) * 100) : 0;
        return `  - ${cat}: ${formatCurr(amt)} (${catPct}% dari pengeluaran bulan kemarin)`;
      })
      .join('\n');

    // Perbandingan Pengeluaran & Pemasukan Bulan Ini vs Bulan Kemarin
    let comparisonText = '';
    if (expensePrevMonth > 0) {
      const diffExpense = expenseThisMonth - expensePrevMonth;
      const pctChange = Math.round((diffExpense / expensePrevMonth) * 100);
      if (diffExpense > 0) {
        comparisonText = lang === 'id' 
          ? `Pengeluaran bulan ini NAIK +${formatCurr(diffExpense)} (+${pctChange}%) dibanding bulan kemarin (${prevMonthName}).`
          : `Expenses this month INCREASED by +${formatCurr(diffExpense)} (+${pctChange}%) compared to last month (${prevMonthName}).`;
      } else if (diffExpense < 0) {
        comparisonText = lang === 'id'
          ? `Pengeluaran bulan ini TURUN / LEBIH HEMAT -${formatCurr(Math.abs(diffExpense))} (${pctChange}%) dibanding bulan kemarin (${prevMonthName}).`
          : `Expenses this month DECREASED / SAVED -${formatCurr(Math.abs(diffExpense))} (${pctChange}%) compared to last month (${prevMonthName}).`;
      } else {
        comparisonText = lang === 'id'
          ? `Pengeluaran bulan ini SAMA DENGAN bulan kemarin (${formatCurr(expenseThisMonth)}).`
          : `Expenses this month are EQUAL to last month (${formatCurr(expenseThisMonth)}).`;
      }
    }

    // 4. POS TABUNGAN & IMPIAN DENGAN ESTIMASI YIELD
    let savingsGoalsText = '';
    let totalEstimatedAnnualYield = 0;
    if (goalsList.length > 0) {
      savingsGoalsText = goalsList.map(g => {
        const pct = g.targetAmount > 0 ? Math.min(100, Math.round(((g.currentAmount || 0) / g.targetAmount) * 100)) : 0;
        const icon = g.emoji || '🎯';
        const instLabel = g.instrumentType ? ` [${g.instrumentType.toUpperCase()}${g.institutionName ? ` - ${g.institutionName}` : ''}]` : '';
        
        let yieldText = '';
        if (g.interestRate && g.interestRate > 0) {
          const grossRate = g.interestRate / 100;
          const taxMultiplier = 1 - ((g.taxRate ?? 20) / 100);
          const netAnnualRate = grossRate * taxMultiplier;
          const annualNetYield = (g.currentAmount || 0) * netAnnualRate;
          const monthlyNetYield = annualNetYield / 12;
          totalEstimatedAnnualYield += annualNetYield;

          yieldText = lang === 'id'
            ? ` | Bunga: ${g.interestRate}% p.a. (Pajak ${g.taxRate ?? 20}%, Net: +${formatCurr(monthlyNetYield)}/bln atau +${formatCurr(annualNetYield)}/thn${g.isCompound ? ', Majemuk' : ''})`
            : ` | Yield: ${g.interestRate}% p.a. (Tax ${g.taxRate ?? 20}%, Net: +${formatCurr(monthlyNetYield)}/mo or +${formatCurr(annualNetYield)}/yr${g.isCompound ? ', Compound' : ''})`;
        }
        
        const dateText = g.targetDate ? ` | Deadline: ${g.targetDate}` : '';
        const statusText = g.isCompleted ? (lang === 'id' ? ' [✅ TERCAPAI]' : ' [✅ COMPLETED]') : '';
        return `- ${icon} ${g.title}${instLabel}: Terkumpul ${formatCurr(g.currentAmount || 0)} / Target ${formatCurr(g.targetAmount)} (${pct}%)${yieldText}${dateText}${statusText}`;
      }).join('\n');
    }

    // 5. HUTANG & CICILAN
    let debtListText = '';
    if (activeDebts.length > 0) {
      debtListText = activeDebts.slice(0, 10).map(d => {
        const debtName = d.lender ? `${d.title} (${d.lender})` : d.title;
        const dueDateText = d.dueDate ? ` (${lang === 'id' ? 'Jatuh tempo' : 'Due'}: ${d.dueDate})` : '';
        const instText = d.installmentAmount ? ` [Cicilan: ${formatCurr(d.installmentAmount)}/${d.paymentFrequency || 'bln'}]` : '';
        return `- ${debtName}: Sisa ${formatCurr(d.remainingAmount)} dari Total ${formatCurr(d.totalAmount)}${instText}${dueDateText}`;
      }).join('\n');
    }

    // 6. RECENT 5 TRANSACTIONS OVERALL
    const recentTxText = transactions
      .slice(0, 5)
      .map(t => {
        const typeLabel = t.type === 'income' ? (lang === 'id' ? '[Pemasukan]' : '[Income]') : (lang === 'id' ? '[Pengeluaran]' : '[Expense]');
        const dateStr = getTxDateStr(t);
        const catStr = t.category || '';
        const descStr = t.description ? ` ("${t.description}")` : '';
        return `- ${typeLabel} ${dateStr} - ${catStr}: ${formatCurr(t.amount)}${descStr}`;
      })
      .join('\n');

    if (lang === 'id') {
      let text = `=== DATA KEUANGAN PENGGUNA TATA (IZIN SEKALI PAKAI) ===\n\n`;
      text += `⚠️ PERATURAN KRUSIAL MEMBACA DATA WAKTU OLEH TATA AI:\n`;
      text += `1. DATA BULAN INI (${currentMonthName}): Gunakan HANYA angka pada bagian [BAGIAN 1: BULAN INI] jika pengguna bertanya tentang keuangan, pengeluaran, pemasukan, atau cashflow bulan ini. DILARANG KERAS mencampuradukkan angka transaksi bulan kemarin atau total sepanjang waktu ke dalam analisis bulan ini!\n`;
      text += `2. DATA BULAN KEMARIN (${prevMonthName}): Gunakan angka pada [BAGIAN 2: BULAN KEMARIN] jika pengguna menanyakan bulan lalu / bulan kemarin.\n`;
      text += `3. SALDO KAS & KEKAYAAN BERSIH: Rujuk pada [BAGIAN 4: STATUS SALDO & KEKAYAAN BERSIH].\n\n`;

      text += `[BAGIAN 1: DATA KEUANGAN BULAN INI (${currentMonthName})]\n`;
      text += `• Pemasukan Bulan Ini (${currentMonthName}): ${formatCurr(incomeThisMonth)} (${thisMonthTxs.filter(t => t.type === 'income').length} transaksi)\n`;
      text += `• Pengeluaran Bulan Ini (${currentMonthName}): ${formatCurr(expenseThisMonth)} (${thisMonthTxs.filter(t => t.type === 'expense').length} transaksi)\n`;
      text += `• Arus Kas Bersih Bulan Ini (Net Cashflow): ${formatCurr(netCashflowThisMonth)}\n`;
      text += `• Rasio Tabungan Bulan Ini (Savings Rate): ${savingsRateThisMonth}%\n`;
      if (topCategoriesThisMonth) {
        text += `• Kategori Pengeluaran Terbesar Bulan Ini:\n${topCategoriesThisMonth}\n`;
      } else {
        text += `• Kategori Pengeluaran Terbesar Bulan Ini: Belum ada pengeluaran di bulan ini.\n`;
      }
      if (thisMonthTxList) {
        text += `• Daftar Rinci Transaksi Bulan Ini (${currentMonthName}):\n${thisMonthTxList}\n`;
      } else {
        text += `• Daftar Rinci Transaksi Bulan Ini: Belum ada transaksi di bulan ini.\n`;
      }

      text += `\n[BAGIAN 2: DATA KEUANGAN BULAN KEMARIN (${prevMonthName})]\n`;
      text += `• Pemasukan Bulan Kemarin (${prevMonthName}): ${formatCurr(incomePrevMonth)} (${prevMonthTxs.filter(t => t.type === 'income').length} transaksi)\n`;
      text += `• Pengeluaran Bulan Kemarin (${prevMonthName}): ${formatCurr(expensePrevMonth)} (${prevMonthTxs.filter(t => t.type === 'expense').length} transaksi)\n`;
      text += `• Arus Kas Bersih Bulan Kemarin: ${formatCurr(netCashflowPrevMonth)}\n`;
      if (topCategoriesPrevMonth) {
        text += `• Kategori Pengeluaran Terbesar Bulan Kemarin:\n${topCategoriesPrevMonth}\n`;
      }
      if (comparisonText) {
        text += `• Komparasi Bulan Ini vs Bulan Kemarin: ${comparisonText}\n`;
      }

      text += `\n[BAGIAN 3: TOTAL AKUMULASI SEPANJANG WAKTU (ALL-TIME HISTORICAL TOTAL)]\n`;
      text += `• Total Pemasukan Akumulasi Sepanjang Waktu: ${formatCurr(totalIncomeAllTime)}\n`;
      text += `• Total Pengeluaran Akumulasi Sepanjang Waktu: ${formatCurr(totalExpenseAllTime)}\n`;
      text += `• Total Transaksi Tercatat: ${transactions.length} transaksi\n`;

      text += `\n[BAGIAN 4: STATUS SALDO & KEKAYAAN BERSIH REAL-TIME (NET WORTH)]\n`;
      text += `• Saldo Kas Dompet (Bebas Siap Pakai): ${formatCurr(availableWalletCash)}\n`;
      if (goalsList.length > 0) {
        text += `• Total Saldo Tabungan / Pos Impian (${goalsList.length} Pos): ${formatCurr(totalInGoals)}\n`;
      } else {
        text += `• Total Saldo Tabungan / Celengan: ${formatCurr(activeSavings)}\n`;
      }
      text += `• TOTAL KEKAYAAN BERSIH (NET WORTH): ${formatCurr(totalNetCash)} (Penjumlahan: Saldo Dompet ${formatCurr(availableWalletCash)} + Total Tabungan ${formatCurr(activeSavings)})\n`;
      if (totalEstimatedAnnualYield > 0) {
        text += `• Estimasi Bunga/Yield Bersih Tabungan: +${formatCurr(totalEstimatedAnnualYield / 12)}/bulan (+${formatCurr(totalEstimatedAnnualYield)}/tahun)\n`;
      }
      text += `• Target Tabungan Aktif: ${targetText}\n`;
      text += `• Total Hutang Aktif: ${formatCurr(totalDebt)}\n`;
      
      if (totalDebt > 0) {
        if (totalNetCash >= totalDebt) {
          text += `• Rasio Likuiditas Hutang: AMAN (Total kekayaan bersih ${formatCurr(totalNetCash)} cukup untuk melunasi seluruh hutang ${formatCurr(totalDebt)}, sisa bersih setelah lunas: ${formatCurr(totalNetCash - totalDebt)})\n`;
        } else {
          text += `• Rasio Likuiditas Hutang: KURANG (Kekayaan bersih ${formatCurr(totalNetCash)} belum cukup menutup seluruh hutang ${formatCurr(totalDebt)}, defisit: ${formatCurr(totalDebt - totalNetCash)})\n`;
        }
      }

      if (savingsGoalsText) {
        text += `\nRincian Pos Tabungan & Impian (Goals & Deposito/Reksadana):\n${savingsGoalsText}\n`;
      }

      if (debtListText) {
        text += `\nRincian Item Kewajiban Hutang & Cicilan:\n${debtListText}\n`;
      }

      if (recentTxText) {
        text += `\n5 Transaksi Paling Terakhir Keseluruhan:\n${recentTxText}\n`;
      }

      return text;
    } else {
      let text = `=== USER FINANCIAL DATA IN TATA (SINGLE-USE CONSENT) ===\n\n`;
      text += `⚠️ CRITICAL TIME ANALYSIS RULES FOR TATA AI:\n`;
      text += `1. CURRENT MONTH DATA (${currentMonthName}): If the user asks about current month finances/expenses/income/cashflow, ONLY use figures from [SECTION 1: CURRENT MONTH]. NEVER mix previous month or all-time totals into current month figures!\n`;
      text += `2. PREVIOUS MONTH DATA (${prevMonthName}): Use figures from [SECTION 2: PREVIOUS MONTH] when discussing last month.\n`;
      text += `3. REAL-TIME BALANCES & NET WORTH: Refer to [SECTION 4: BALANCES & NET WORTH].\n\n`;

      text += `[SECTION 1: CURRENT MONTH DATA (${currentMonthName})]\n`;
      text += `• Income This Month (${currentMonthName}): ${formatCurr(incomeThisMonth)} (${thisMonthTxs.filter(t => t.type === 'income').length} transactions)\n`;
      text += `• Expenses This Month (${currentMonthName}): ${formatCurr(expenseThisMonth)} (${thisMonthTxs.filter(t => t.type === 'expense').length} transactions)\n`;
      text += `• Net Cashflow This Month: ${formatCurr(netCashflowThisMonth)}\n`;
      text += `• Savings Rate This Month: ${savingsRateThisMonth}%\n`;
      if (topCategoriesThisMonth) {
        text += `• Top Expense Categories This Month:\n${topCategoriesThisMonth}\n`;
      } else {
        text += `• Top Expense Categories This Month: No expenses recorded yet this month.\n`;
      }
      if (thisMonthTxList) {
        text += `• Itemized Transactions This Month (${currentMonthName}):\n${thisMonthTxList}\n`;
      } else {
        text += `• Itemized Transactions This Month: No transactions recorded yet this month.\n`;
      }

      text += `\n[SECTION 2: PREVIOUS MONTH DATA (${prevMonthName})]\n`;
      text += `• Income Last Month (${prevMonthName}): ${formatCurr(incomePrevMonth)} (${prevMonthTxs.filter(t => t.type === 'income').length} transactions)\n`;
      text += `• Expenses Last Month (${prevMonthName}): ${formatCurr(expensePrevMonth)} (${prevMonthTxs.filter(t => t.type === 'expense').length} transactions)\n`;
      text += `• Net Cashflow Last Month: ${formatCurr(netCashflowPrevMonth)}\n`;
      if (topCategoriesPrevMonth) {
        text += `• Top Expense Categories Last Month:\n${topCategoriesPrevMonth}\n`;
      }
      if (comparisonText) {
        text += `• Comparison (This Month vs Last Month): ${comparisonText}\n`;
      }

      text += `\n[SECTION 3: ALL-TIME HISTORICAL TOTALS]\n`;
      text += `• Cumulative Income All-Time: ${formatCurr(totalIncomeAllTime)}\n`;
      text += `• Cumulative Expenses All-Time: ${formatCurr(totalExpenseAllTime)}\n`;
      text += `• Total Recorded Transactions: ${transactions.length} transactions\n`;

      text += `\n[SECTION 4: REAL-TIME BALANCES & NET WORTH]\n`;
      text += `• Main Wallet Balance (Available Cash): ${formatCurr(availableWalletCash)}\n`;
      if (goalsList.length > 0) {
        text += `• Total Savings / Dream Goals Balance (${goalsList.length} Goals): ${formatCurr(totalInGoals)}\n`;
      } else {
        text += `• Total Savings / Vault Balance: ${formatCurr(activeSavings)}\n`;
      }
      text += `• TOTAL NET WORTH: ${formatCurr(totalNetCash)} (Formula: Wallet Cash ${formatCurr(availableWalletCash)} + Total Savings ${formatCurr(activeSavings)})\n`;
      if (totalEstimatedAnnualYield > 0) {
        text += `• Estimated Net Yield from Goals: +${formatCurr(totalEstimatedAnnualYield / 12)}/month (+${formatCurr(totalEstimatedAnnualYield)}/year)\n`;
      }
      text += `• Active Savings Target: ${targetText}\n`;
      text += `• Total Active Debt: ${formatCurr(totalDebt)}\n`;

      if (totalDebt > 0) {
        if (totalNetCash >= totalDebt) {
          text += `• Debt Solvency: SAFE (Total net assets sufficient to clear all debt, net balance: ${formatCurr(totalNetCash - totalDebt)})\n`;
        } else {
          text += `• Debt Solvency: DEFICIT (Requires ${formatCurr(totalDebt - totalNetCash)} more to cover full liabilities)\n`;
        }
      }

      if (savingsGoalsText) {
        text += `\nSavings Goals & Investment Deposits Breakdown:\n${savingsGoalsText}\n`;
      }

      if (debtListText) {
        text += `\nActive Debts & Installment Schedule:\n${debtListText}\n`;
      }

      if (recentTxText) {
        text += `\n5 Most Recent Transactions Overall:\n${recentTxText}\n`;
      }

      return text;
    }
  };

  const getTasksPayload = (overrideSelectedIds?: string[]) => {
    const targetIds = overrideSelectedIds !== undefined ? overrideSelectedIds : selectedTaskIds;
    const allNonDeleted = tasks.filter(t => !t.deleted);
    const permittedTasks = allNonDeleted.filter(t => targetIds.includes(t.id));

    const activeTasks = permittedTasks.filter(t => !t.completed);
    const completedTasks = permittedTasks.filter(t => t.completed);

    const now = new Date();
    const todayLocal = new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
    const todayStr = todayLocal.toISOString().split('T')[0];

    // Compute date cutoffs for 7 days (1 minggu) and 30 days (1 bulan)
    const d7AgoDate = new Date(todayLocal.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d7AgoStr = d7AgoDate.toISOString().split('T')[0];

    const d30AgoDate = new Date(todayLocal.getTime() - 30 * 24 * 60 * 60 * 1000);
    const d30AgoStr = d30AgoDate.toISOString().split('T')[0];

    // Find earliest task creation date (Semenjak Bikin Tugas)
    let earliestCreatedDateStr = todayStr;
    permittedTasks.forEach(t => {
      const cDate = t.createdAt ? t.createdAt.split('T')[0] : (t.date && t.date.includes('-') ? t.date : todayStr);
      if (cDate && cDate < earliestCreatedDateStr) {
        earliestCreatedDateStr = cDate;
      }
    });

    const earliestTime = new Date(earliestCreatedDateStr + 'T00:00:00').getTime();
    const todayTime = new Date(todayStr + 'T00:00:00').getTime();
    const totalDaysInception = Math.max(1, Math.ceil((todayTime - earliestTime) / (1000 * 60 * 60 * 24)) + 1);

    // Track completions per day of week (0 = Minggu, 1 = Senin, ..., 6 = Sabtu)
    const daysOfWeekNamesId = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const daysOfWeekNamesEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const completionsByDayOfWeek = [0, 0, 0, 0, 0, 0, 0];

    let completions7Days = 0;
    let completions30Days = 0;
    let completionsAllTime = 0;

    let overdueTasksCount = 0;
    let highPrioCount = 0;
    let highPrioCompleted = 0;
    let medPrioCount = 0;
    let medPrioCompleted = 0;

    permittedTasks.forEach(t => {
      const prioLower = (t.priority || '').toLowerCase();
      if (prioLower === 'tinggi' || prioLower === 'high') {
        highPrioCount++;
        if (t.completed) highPrioCompleted++;
      } else if (prioLower === 'sedang' || prioLower === 'medium') {
        medPrioCount++;
        if (t.completed) medPrioCompleted++;
      }

      // Check if task is overdue (pending and due date < today)
      if (!t.completed && t.date && t.date.includes('-') && t.date < todayStr) {
        overdueTasksCount++;
      }

      // Completion dates
      const compDates = t.isDiscipline
        ? (t.disciplineData?.dailyCheckins || [])
        : (t.completedDates || []);

      if (compDates.length > 0) {
        compDates.forEach(d => {
          completionsAllTime++;
          if (d >= d7AgoStr && d <= todayStr) completions7Days++;
          if (d >= d30AgoStr && d <= todayStr) completions30Days++;

          if (d.includes('-')) {
            const dayIdx = new Date(d + 'T00:00:00').getDay();
            if (!isNaN(dayIdx)) completionsByDayOfWeek[dayIdx]++;
          }
        });
      } else if (t.completed) {
        completionsAllTime++;
        const createdDateStr = t.createdAt ? t.createdAt.split('T')[0] : '';
        const compDate = (t.date && t.date.includes('-')) ? t.date : (createdDateStr || todayStr);
        if (compDate >= d7AgoStr && compDate <= todayStr) completions7Days++;
        if (compDate >= d30AgoStr && compDate <= todayStr) completions30Days++;

        if (compDate.includes('-')) {
          const dayIdx = new Date(compDate + 'T00:00:00').getDay();
          if (!isNaN(dayIdx)) completionsByDayOfWeek[dayIdx]++;
        }
      }
    });

    // Determine peak day and low/failure days
    let maxDayIdx = 0;
    let maxDayCount = -1;
    let minDayIdx = 0;
    let minDayCount = 999999;

    completionsByDayOfWeek.forEach((cnt, idx) => {
      if (cnt > maxDayCount) {
        maxDayCount = cnt;
        maxDayIdx = idx;
      }
      if (cnt < minDayCount) {
        minDayCount = cnt;
        minDayIdx = idx;
      }
    });

    const lowCompletionDaysId = completionsByDayOfWeek
      .map((cnt, idx) => ({ day: daysOfWeekNamesId[idx], count: cnt }))
      .filter(d => d.count === minDayCount || d.count === 0)
      .map(d => `${d.day} (${d.count} x selesai)`);

    const lowCompletionDaysEn = completionsByDayOfWeek
      .map((cnt, idx) => ({ day: daysOfWeekNamesEn[idx], count: cnt }))
      .filter(d => d.count === minDayCount || d.count === 0)
      .map(d => `${d.day} (${d.count} x completed)`);

    const dayOfWeekSummaryId = daysOfWeekNamesId.map((d, i) => `${d}: ${completionsByDayOfWeek[i]}`).join(', ');
    const dayOfWeekSummaryEn = daysOfWeekNamesEn.map((d, i) => `${d}: ${completionsByDayOfWeek[i]}`).join(', ');

    // Calculate rates
    const totalPermitted = permittedTasks.length;
    const rateAllTime = totalPermitted > 0 ? Math.round((completedTasks.length / totalPermitted) * 100) : 0;

    const relevant7 = permittedTasks.filter(t => {
      const createdStr = t.createdAt ? t.createdAt.split('T')[0] : '';
      const dueStr = t.date && t.date.includes('-') ? t.date : '';
      const compDates = t.isDiscipline ? (t.disciplineData?.dailyCheckins || []) : (t.completedDates || []);
      const hasComp7 = compDates.some(d => d >= d7AgoStr && d <= todayStr);
      return (createdStr >= d7AgoStr && createdStr <= todayStr) || (dueStr >= d7AgoStr && dueStr <= todayStr) || hasComp7 || !t.completed;
    }).length;

    const relevant30 = permittedTasks.filter(t => {
      const createdStr = t.createdAt ? t.createdAt.split('T')[0] : '';
      const dueStr = t.date && t.date.includes('-') ? t.date : '';
      const compDates = t.isDiscipline ? (t.disciplineData?.dailyCheckins || []) : (t.completedDates || []);
      const hasComp30 = compDates.some(d => d >= d30AgoStr && d <= todayStr);
      return (createdStr >= d30AgoStr && createdStr <= todayStr) || (dueStr >= d30AgoStr && dueStr <= todayStr) || hasComp30 || !t.completed;
    }).length;

    const denom7 = Math.max(relevant7, completions7Days, 1);
    const rate7Days = Math.min(100, Math.round((completions7Days / denom7) * 100));

    const denom30 = Math.max(relevant30, completions30Days, 1);
    const rate30Days = Math.min(100, Math.round((completions30Days / denom30) * 100));

    const avg7 = (completions7Days / 7).toFixed(1);
    const avg30 = (completions30Days / 30).toFixed(1);

    const taskListText = permittedTasks.map((t, idx) => {
      const statusStr = t.completed 
        ? (lang === 'id' ? 'Selesai ✅' : 'Completed ✅') 
        : (lang === 'id' ? 'Belum Selesai ⏳' : 'Pending ⏳');
      const prioStr = t.priority || (lang === 'id' ? 'Biasa' : 'Normal');
      const createdStr = t.createdAt ? t.createdAt.split('T')[0] : (lang === 'id' ? 'Tugas awal' : 'Initial task');
      const dateStr = t.date ? ` | Tenggat: ${t.date}${t.time ? ' ' + t.time : ''}` : '';
      const isOverdue = !t.completed && t.date && t.date.includes('-') && t.date < todayStr;
      const overdueStr = isOverdue ? (lang === 'id' ? ' ⚠️ [TERLAMBAT/OVERDUE]' : ' ⚠️ [OVERDUE]') : '';
      const discStr = t.isDiscipline ? ` | Tipe: Disiplin Harian` : '';
      const compDates = t.isDiscipline ? (t.disciplineData?.dailyCheckins || []) : (t.completedDates || []);
      const compDatesStr = compDates.length > 0 
        ? ` | Riwayat Tanggal Ceklis (${compDates.length}x): [${compDates.join(', ')}]` 
        : '';
      return `${idx + 1}. [Prioritas: ${prioStr}] "${t.title}"
   • Status: ${statusStr}${overdueStr}
   • Tanggal Dibuat: ${createdStr}${dateStr}${discStr}${compDatesStr}`;
    }).join('\n\n');

    if (lang === 'id') {
      let text = `=== REKAP & ANALISIS POLA TUGAS SEPANJANG WAKTU (IZIN SEKALI PAKAI) ===\n`;
      text += `• Total Tugas Diberikan Akses: ${permittedTasks.length} dari ${allNonDeleted.length} total tugas\n`;
      text += `• Tanggal Dibuat Paling Awal: ${earliestCreatedDateStr} (${totalDaysInception} hari periode pelacakan)\n`;
      text += `• TINGKAT PENYELESAIAN SEPANJANG WAKTU (SEMENJAK AWAL DIBUAT):\n`;
      text += `  - Total Tugas Selesai: ${completedTasks.length} dari ${permittedTasks.length} tugas (${rateAllTime}% penyelesaian all-time)\n`;
      text += `  - Tugas Belum Selesai Saat Ini: ${activeTasks.length} tugas\n`;
      text += `  - Tugas Terlambat (Melewati Tenggat): ${overdueTasksCount} tugas ⚠️\n`;
      text += `  - Tugas Prioritas Tinggi Selesai: ${highPrioCompleted} dari ${highPrioCount} tugas\n`;
      text += `• PERBANDINGAN TINGKAT PENYELESAIAN PERIODIK:\n`;
      text += `  - 1 MINGGU (7 Hari Terakhir): ${completions7Days} penyelesaian (${rate7Days}%, avg ${avg7} tugas/hari)\n`;
      text += `  - 1 BULAN (30 Hari Terakhir): ${completions30Days} penyelesaian (${rate30Days}%, avg ${avg30} tugas/hari)\n`;
      text += `• ANALISIS POLA HARI CEKLIS (SEBARAN HARI SELESAI):\n`;
      text += `  - Sebaran per Hari: ${dayOfWeekSummaryId}\n`;
      text += `  - Hari Paling Sering Selesai (Peak): ${daysOfWeekNamesId[maxDayIdx]} (${maxDayCount}x selesai)\n`;
      text += `  - Hari Paling Sering Gagal / Terlewat Ceklis: ${lowCompletionDaysId.join(', ')}\n`;
      text += `• Streak Disiplin Harian: ${streak} hari aktif berturut-turut\n\n`;
      if (permittedTasks.length > 0) {
        text += `Daftar Detail Tugas & Riwayat Tanggal Ceklis yang Diizinkan Pengguna:\n${taskListText}\n\n`;
      } else {
        text += `(Pengguna tidak mencentang/mengizinkan detail tugas tertentu)\n\n`;
      }
      text += `*PRINSIP PRIVASI (ATURAN NO 1): Tata AI HANYA menerima ${permittedTasks.length} tugas yang dicentang di atas atas izin pengguna secara sadar. Data tidak disimpan di cloud/database manapun. Izin ini bersifat SEKALI PAKAI dan langsung DICABUT/DIHAPUS secara otomatis di perangkat setelah balasan terkirim.*`;
      return text;
    } else {
      let text = `=== LIFETIME TASK PATTERN & COMPLETION ANALYTICS (SINGLE-USE CONSENT) ===\n`;
      text += `• Total Permitted Tasks: ${permittedTasks.length} of ${allNonDeleted.length} total tasks\n`;
      text += `• Earliest Task Created Date: ${earliestCreatedDateStr} (${totalDaysInception} days tracking period)\n`;
      text += `• LIFETIME COMPLETION RATE (SINCE INCEPTION):\n`;
      text += `  - Total Completed Tasks: ${completedTasks.length} of ${permittedTasks.length} tasks (${rateAllTime}% all-time completion rate)\n`;
      text += `  - Currently Pending Tasks: ${activeTasks.length} tasks\n`;
      text += `  - Overdue Tasks: ${overdueTasksCount} tasks ⚠️\n`;
      text += `  - High Priority Completed: ${highPrioCompleted} of ${highPrioCount} tasks\n`;
      text += `• PERIODIC COMPARISON:\n`;
      text += `  - 1-WEEK (Last 7 Days): ${completions7Days} completions (${rate7Days}%, avg ${avg7} tasks/day)\n`;
      text += `  - 1-MONTH (Last 30 Days): ${completions30Days} completions (${rate30Days}%, avg ${avg30} tasks/day)\n`;
      text += `• DAY-OF-WEEK CHECKIN PATTERNS:\n`;
      text += `  - Breakdown per Day: ${dayOfWeekSummaryEn}\n`;
      text += `  - Peak Productivity Day: ${daysOfWeekNamesEn[maxDayIdx]} (${maxDayCount}x completions)\n`;
      text += `  - Lowest Completion / Missed Days: ${lowCompletionDaysEn.join(', ')}\n`;
      text += `• Daily Discipline Streak: ${streak} active consecutive days\n\n`;
      if (permittedTasks.length > 0) {
        text += `Itemized Permitted Tasks & History:\n${taskListText}\n\n`;
      } else {
        text += `(User has not selected/permitted any specific tasks)\n\n`;
      }
      text += `*PRIVACY RULE (RULE NO 1): Tata AI ONLY receives the ${permittedTasks.length} selected tasks above via conscious user permission. Data is never saved to a cloud database. Permission is SINGLE-USE and automatically REVOKED immediately after response.*`;
      return text;
    }
  };

  // Intercept prompts to check for consent triggers (either explicitly or via automatic keyword detection)
  const handleSend = async (customPrompt?: string, customType?: 'mood' | 'finance' | 'tasks') => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend) return;

    const token = tataAccount?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
    if (!token) {
      setErrorMsg(lang === 'id'
        ? 'Sesi Akun Tata Anda belum aktif atau belum masuk. Silakan masuk dengan Akun Google terlebih dahulu di menu Akun untuk menggunakan Tata AI.'
        : 'Please sign in with your Google Account in the Account menu to use Tata AI.');
      return;
    }

    if (creditsLeft <= 0 && !geminiApiKey) {
      setErrorMsg(lang === 'id' 
        ? `Kredit AI harian Anda telah habis (Maks ${maxDailyCredits} per hari). Kredit akan di-reset otomatis besok pada pukul 00:00 WIB. Atau gunakan API Key pribadi (BYOK) di Pengaturan untuk akses tanpa batas.` 
        : `Your daily AI credits are fully spent (Max ${maxDailyCredits} per day). Credits will automatically reset tomorrow at 00:00 WIB.`);
      return;
    }

    setErrorMsg(null);

    // Auto-detect if prompt relates to tasks, finance, or mood data
    const lower = textToSend.toLowerCase();
    let detectedType: 'mood' | 'finance' | 'tasks' | null = customType || null;

    if (!detectedType) {
      if (lower.includes('mood') || lower.includes('emosi') || lower.includes('suasana hati') || lower.includes('perasaan')) {
        detectedType = 'mood';
      } else if (
        lower.includes('keuangan') || lower.includes('duit') || lower.includes('finansial') || 
        lower.includes('tabungan') || lower.includes('pemasukan') || lower.includes('pengeluaran') || 
        lower.includes('finance') || lower.includes('hutang') || lower.includes('piutang') || 
        lower.includes('debt') || lower.includes('saldo') || lower.includes('anggaran') || lower.includes('dompet') ||
        lower.includes('deposito') || lower.includes('reksadana') || lower.includes('obligasi') || lower.includes('sukuk') ||
        lower.includes('investasi') || lower.includes('rekomendasi keuangan') || lower.includes('saran keuangan') ||
        lower.includes('bunga') || lower.includes('yield') || lower.includes('budget') || lower.includes('cashflow')
      ) {
        detectedType = 'finance';
      } else if (
        lower.includes('tugas') || lower.includes('task') || lower.includes('disiplin') || 
        lower.includes('streak') || lower.includes('produktivitas') || lower.includes('productivity') || 
        lower.includes('rekap') || lower.includes('ceklis') || lower.includes('todo') || lower.includes('to-do')
      ) {
        detectedType = 'tasks';
      }
    }

    // If data type is detected or requested, show friendly consent dialog allowing user to choose:
    // 1) Send with local data attached (Izinkan & Kirim)
    // 2) Send question directly without data (Kirim Tanpa Data)
    if (detectedType) {
      setConsentType(detectedType);
      setPendingPrompt(textToSend);
      if (detectedType === 'mood') {
        setConsentPayload(getMoodPayload());
      } else if (detectedType === 'finance') {
        setConsentPayload(getFinancePayload());
      } else if (detectedType === 'tasks') {
        const nonDeleted = tasks.filter(t => !t.deleted);
        const initialTaskIds = nonDeleted.map(t => t.id);
        setSelectedTaskIds(initialTaskIds);
        setConsentPayload(getTasksPayload(initialTaskIds));
      }
      setShowConsentModal(true);
      return;
    }

    // Extract images from note context if attached
    let noteImages: { mimeType: string; data: string }[] = [];
    let cleanedNoteText = '';

    if (tempNoteContext) {
      const extracted = extractAndCleanImages(tempNoteContext.content);
      cleanedNoteText = extracted.cleanedContent;
      noteImages = [...extracted.images];

      if (tempNoteContext.thumbnailUrl && tempNoteContext.thumbnailUrl.startsWith('data:image/')) {
        const parts = tempNoteContext.thumbnailUrl.split(';base64,');
        if (parts.length === 2) {
          const mimeType = parts[0].replace('data:', '');
          const data = parts[1];
          if (!noteImages.some(img => img.data === data)) {
            noteImages.push({ mimeType, data });
          }
        }
      }
    }

    const allImages: { mimeType: string; data: string }[] = [
      ...noteImages
    ];

    if (tempNoteContext) {
      const imgNotice = noteImages.length > 0 
        ? (lang === 'id' 
            ? `\n(Catatan ini menyertakan ${noteImages.length} foto/gambar terlampir yang dikirim secara visual ke Tata AI)` 
            : `\n(This note includes ${noteImages.length} attached photo/image sent visually to Tata AI)`)
        : '';
      const contextPrefix = lang === 'id'
        ? `[KONTEKS CATATAN YANG DIIZINKAN PENGGUNA]\nJudul: ${tempNoteContext.title}${imgNotice}\nKonten Catatan:\n${cleanedNoteText}\n\n---\nPertanyaan Pengguna:\n`
        : `[USER-CONSENTED NOTE CONTEXT]\nTitle: ${tempNoteContext.title}${imgNotice}\nNote Content:\n${cleanedNoteText}\n\n---\nUser Question:\n`;
      
      const fullPrompt = contextPrefix + textToSend;
      // Immediately revoke note context permission after single use
      setTempNoteContext(null);
      await executeChatCall(fullPrompt, textToSend, allImages);
    } else {
      await executeChatCall(textToSend, textToSend, allImages);
    }
  };

  const handleConsentApproved = async () => {
    setShowConsentModal(false);
    
    // Format prompt with prepended context block
    const contextPrefix = lang === 'id'
      ? `[KONTEKS PRIVASI YANG DIIZINKAN PENGGUNA]\n${consentPayload}\n\nPertanyaan Pengguna:\n`
      : `[USER-CONSENTED MINIMAL CONTEXT]\n${consentPayload}\n\nUser Question:\n`;

    const fullPrompt = contextPrefix + pendingPrompt;
    const originalPrompt = pendingPrompt;

    // Immediately revoke/clear single-use permission states ("langsung cabut ijinya")
    setPendingPrompt('');
    setConsentPayload('');
    setConsentType(null);
    setSelectedTaskIds([]);

    await executeChatCall(fullPrompt, originalPrompt);
  };

  // Allow user to send the question without sharing local private data (answers conceptually)
  const handleSendWithoutConsent = async () => {
    setShowConsentModal(false);
    const originalPrompt = pendingPrompt;

    // Clear consent states
    setPendingPrompt('');
    setConsentPayload('');
    setConsentType(null);
    setSelectedTaskIds([]);

    if (originalPrompt) {
      await executeChatCall(originalPrompt, originalPrompt);
    }
  };

  const handleConsentCancel = () => {
    setShowConsentModal(false);
    if (pendingPrompt && !inputText) {
      setInputText(pendingPrompt);
    }
    setPendingPrompt('');
    setConsentPayload('');
    setConsentType(null);
    setSelectedTaskIds([]);
  };

  // Auto send note context when navigated from note editor with 'Tanya AI'
  useEffect(() => {
    if (tempNoteContext && autoSendNoteToAI) {
      setAutoSendNoteToAI(false);
      const defaultPrompt = lang === 'id' 
        ? "Tolong berikan ringkasan atau tanggapan untuk catatan ini." 
        : "Please provide a summary or response for this note.";
      handleSend(defaultPrompt);
    }
  }, [tempNoteContext, autoSendNoteToAI, lang]);

  const executeChatCall = async (fullPrompt: string, userFacingPrompt?: string, attachedImages?: { mimeType: string; data: string }[]) => {
    const token = tataAccount?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
    if (!token) {
      setErrorMsg(lang === 'id'
        ? 'Sesi Akun Tata Anda belum aktif atau belum masuk. Silakan masuk dengan Akun Google terlebih dahulu di menu Akun untuk menggunakan Tata AI.'
        : 'Please sign in with your Google Account in the Account menu to use Tata AI.');
      return;
    }

    playAISendSound();
    setIsLoading(true);
    setErrorMsg(null);

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let personalityPrefix = '';
    if (personality === 'discipline') {
      personalityPrefix = lang === 'id' 
        ? '[MODE KEPRIBADIAN: PELATIH DISIPLIN & HABITS - Berikan masukan langsung, tegas, memotivasi, dan fokus pada aksi nyata.]\n\n' 
        : '[PERSONALITY MODE: DISCIPLINE & HABITS COACH - Be direct, encouraging, firm, and focused on clear action.]\n\n';
    } else if (personality === 'finance') {
      personalityPrefix = lang === 'id' 
        ? '[MODE KEPRIBADIAN: KONSULTAN KEUANGAN PRIBADI - Analisis secara rasional, bijak, dan hemat untuk anggaran/tabungan.]\n\n' 
        : '[PERSONALITY MODE: FINANCIAL ADVISOR - Provide rational, wise, and budget-conscious advice.]\n\n';
    } else if (personality === 'writer') {
      personalityPrefix = lang === 'id' 
        ? '[MODE KEPRIBADIAN: PENULIS & EDITOR TEKS KREATIF - Bantu menyusun, merapikan tata bahasa, dan memoles teks dengan indah.]\n\n' 
        : '[PERSONALITY MODE: WRITER & EDITOR - Help structure, refine grammar, and polish text beautifully.]\n\n';
    } else if (personality === 'mindfulness') {
      personalityPrefix = lang === 'id' 
        ? '[MODE KEPRIBADIAN: MENTOR MINDFULNESS & MOOD - Dengarkan dengan tenang, ramah, bebas perundungan, dan memberikan ketenangan.]\n\n' 
        : '[PERSONALITY MODE: MINDFULNESS MENTOR - Listen calmly, empathetically, and provide reassuring guidance.]\n\n';
    }

    if (personalityPrefix && !fullPrompt.startsWith('[MODE KEPRIBADIAN:') && !fullPrompt.startsWith('[PERSONALITY MODE:')) {
      fullPrompt = personalityPrefix + fullPrompt;
    }

    lastCallArgsRef.current = { fullPrompt, userFacingPrompt, attachedImages };

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: userFacingPrompt || fullPrompt,
      timestamp: Date.now(),
      images: attachedImages && attachedImages.length > 0 ? attachedImages : undefined
    };

    // Calculate synchronously so we can use it immediately in the payload
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    saveChatHistory(newHistory);
    setInputText('');

    try {
      // Map historical messages from the new history (strip heavy past images to keep payload ultra light & fast)
      const messagesPayload = newHistory.slice(-8).map((m, idx, arr) => {
        const isLatestUser = idx === arr.length - 1;
        let contentStr = isLatestUser ? fullPrompt : m.content;
        if (!isLatestUser && contentStr.length > 2500) {
          contentStr = contentStr.substring(0, 2500) + '... [konteks lampau]';
        }
        return {
          role: m.role === 'model' ? 'model' : 'user',
          content: contentStr,
          images: isLatestUser ? (attachedImages && attachedImages.length > 0 ? attachedImages : undefined) : undefined
        };
      });

      const requestUrl = `/api/ai/chat`;
      const res = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        signal: controller.signal,
        body: JSON.stringify({
          messages: messagesPayload,
          lang,
          personality,
          aiMode: aiTierMode,
          customApiKey: geminiApiKey ? geminiApiKey.trim() : undefined,
          clientDateTime: {
            iso: new Date().toISOString(),
            localFormatted: new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta'
          }
        })
      });

      if (!res.ok) {
        const responseBodyText = await res.text().catch(() => "");
        let errorData: any = {};
        try {
          errorData = JSON.parse(responseBodyText);
        } catch (_) {}

        let errMsg = errorData?.message || errorData?.error || `API Error (${res.status})`;
        
        if (res.status === 403 && (errorData?.error === 'account_blocked' || String(errMsg).toLowerCase().includes('diblokir'))) {
          errMsg = lang === 'id'
            ? 'Akun Tata Anda sedang diblokir oleh administrator. Silakan hubungi dukungan jika Anda merasa ini adalah kekeliruan.'
            : 'Your Tata Account has been suspended by the administrator. Please contact support if you believe this is a mistake.';
        } else if (res.status === 401) {
          errMsg = lang === 'id'
            ? 'Sesi Akun Tata Anda belum aktif atau telah kedaluwarsa. Silakan masuk kembali dengan Akun Google.'
            : 'Session invalid or expired. Please sign in again with your Google Account.';
        } else if (res.status === 429) {
          errMsg = errorData?.message || (lang === 'id' 
            ? 'Batas kuota AI harian Anda telah habis. Kuota akan di-reset otomatis besok (00:00 WIB).' 
            : 'Daily AI quota exhausted. Resets tomorrow at 00:00 WIB.');
          setCreditsLeft(0);
          try { localStorage.setItem('tata_ai_credits_left', '0'); } catch(e) {}
        } else if (res.status === 413) {
          errMsg = errorData?.message || (lang === 'id'
            ? 'Pesan percakapan terlalu panjang atau melebihi batas.'
            : 'Conversation message is too long.');
        } else if (res.status === 503) {
          errMsg = errorData?.message || (lang === 'id'
            ? 'Layanan Tata AI sedang tidak tersedia karena konfigurasi server belum lengkap.'
            : 'Tata AI service is currently unavailable.');
        } else if (res.status === 404 && !errorData?.error) {
          errMsg = lang === 'id'
            ? `Error 404: Endpoint API atau Model tidak ditemukan.`
            : `Error 404: API Endpoint or Model not found.`;
        } else if (errMsg === 'missing_api_key') {
          errMsg = lang === 'id'
            ? "API Key Gemini belum dikonfigurasi di server ataupun aplikasi."
            : "Gemini API Key is not configured on the server or app.";
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const replyText = data?.reply || "No response received";
      playAIReplySound();

      const modelMsg: ChatMessage = {
        id: generateId(),
        role: 'model',
        content: replyText,
        timestamp: Date.now(),
        modelUsed: data?.modelUsed || (geminiApiKey ? data?.provider : 'gemini (free limit)')
      };

      setMessages(prev => {
        const finalHistory = [...prev, modelMsg];
        saveChatHistory(finalHistory);
        return finalHistory;
      });

      // Update sisa kredit dari server jika diberikan
      if (typeof data?.creditsLeft === 'number') {
        setCreditsLeft(data.creditsLeft);
        try {
          localStorage.setItem('tata_ai_credits_left', String(data.creditsLeft));
        } catch(e) {}
      } else if (!geminiApiKey) {
        updateCredits(Math.max(0, creditsLeft - 1));
      }

      if (typeof data?.maxCredits === 'number') {
        setServerMaxCredits(data.maxCredits);
      }

    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted') || controller.signal.aborted) {
        console.log("Request cancelled by user");
        return;
      }
      console.error(err);
      setErrorMsg(lang === 'id'
        ? `Gagal terhubung dengan Tata AI: ${err.message || 'Kesalahan koneksi'}`
        : `Failed to connect with Tata AI: ${err.message || 'Connection error'}`);
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const welcome: ChatMessage = {
      id: 'welcome',
      role: 'model',
      content: lang === 'id' 
        ? `⚠️ Peringatan Privasi: Mohon jangan mengirimkan data sensitif, kata sandi, atau data pribadi yang tidak ingin Anda bagikan kepada orang lain ke dalam Tata AI. Tata AI bersifat online dan terpisah dari menu lokal Tata lainnya. Pemrosesan data pada percakapan ini mengikuti kebijakan privasi pihak ketiga (Google Gemini untuk versi gratis ${maxDailyCredits} kredit/hari, atau platform penyedia API Key pribadi/BYOK yang Anda gunakan). Tetap berhati-hati dan bijak dalam membagikan informasi.`
        : `⚠️ Privacy Warning: Please do not send sensitive data, passwords, or personal data that you do not wish to share with others into Tata AI. Tata AI is online and separate from other local Tata features. Data processing in this conversation follows third-party privacy policies (Google Gemini for the free ${maxDailyCredits} credits/day version, or your personal BYOK API Key platform). Always be cautious and wise when sharing information.`,
      timestamp: Date.now()
    };
    setMessages([welcome]);
    saveChatHistory([welcome]);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 font-sans text-slate-100">
      {/* Top Header */}
      <div className="flex-none pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md px-3 sm:px-5 py-2.5 sm:py-3 flex items-center justify-between shadow-sm z-20 gap-2 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-2 -ml-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-all cursor-pointer shrink-0"
            title={lang === 'id' ? 'Kembali' : 'Back'}
          >
            {isOrganic ? <Icon3DArrowLeft size={20} /> : <ArrowLeft className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0 border border-indigo-400/30">
              {isOrganic ? <Icon3DTataAI size={22} /> : isAppInLiteMode ? <LiteStickerIcon variant="ai" size="sm" /> : <Bot size={18} />}
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <div className="flex items-center gap-2 min-w-0">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-100 shrink-0 leading-none">Tata AI</h1>
                <button
                  type="button"
                  onClick={() => setShowInfoModal(true)}
                  className="hidden xs:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all text-[10px] font-mono cursor-pointer"
                  title={lang === 'id' ? 'Klik untuk Pengaturan Model & Mode AI' : 'Click for AI Model & Mode Settings'}
                >
                  <span className={aiTierMode === 'lite' ? 'text-amber-400 font-bold' : 'text-indigo-300 font-bold'}>
                    {aiTierMode === 'lite' ? '⚡ Lite' : '⭐ Pro'}
                  </span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                {lang === 'id' ? 'Layanan AI Online • Berbasis Izin Pengguna' : 'Online AI Service • User-Consent Based'}
              </p>
            </div>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowInfoModal(true)}
            className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono border transition-all cursor-pointer flex items-center gap-1 ${
              getActiveModelDetails().isByok 
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25' 
                : 'bg-slate-800/90 border-slate-700/70 text-indigo-300 hover:text-white hover:bg-slate-800'
            }`}
            title={lang === 'id' ? 'Kredit Harian & Info Model' : 'Daily Credits & Model Info'}
          >
            {getActiveModelDetails().isByok ? (
              <>
                {isOrganic ? <Icon3DZap size={13} /> : <Zap size={11} className="fill-emerald-400" />}
                <span>BYOK</span>
              </>
            ) : (
              <span>{creditsLeft}/{maxDailyCredits}</span>
            )}
          </button>

          <button
            onClick={() => setShowInfoModal(true)}
            className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer shrink-0"
            title={lang === 'id' ? 'Pengaturan Model & Mode Tata AI' : 'Tata AI Model & Mode Settings'}
          >
            {isOrganic ? <Icon3DSliders size={20} /> : <SlidersHorizontal size={18} />}
          </button>

          <button
            onClick={handleClearHistory}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0"
            title={lang === 'id' ? 'Chat Baru' : 'New Chat'}
          >
            {isOrganic ? <Icon3DRotateCcw size={18} /> : <RotateCcw size={18} />}
            <span className="hidden sm:inline text-xs">{lang === 'id' ? 'Baru' : 'New'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative bg-slate-950">
        <div className="w-full max-w-3xl mx-auto flex flex-col h-full min-h-0 overflow-hidden px-3 sm:px-4">
          
          {/* Chat Messages Log */}
          <div className="flex-1 min-h-0 overflow-y-auto py-3 sm:py-4 space-y-4 custom-scrollbar pr-1">
            
            {messages.filter(m => m.id !== 'welcome').length === 0 && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] px-3 animate-in fade-in duration-500 my-auto py-6">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 text-white flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/25 ring-4 ring-indigo-500/10 border border-indigo-400/30">
                  {isOrganic ? <Icon3DTataAI size={44} /> : isAppInLiteMode ? <LiteStickerIcon variant="ai" size="xl" /> : <Bot size={32} />}
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 mb-1.5 text-center tracking-tight">
                  {lang === 'id' ? 'Ada yang bisa Tata AI bantu?' : 'How can Tata AI assist you?'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 text-center max-w-md mb-5 leading-relaxed">
                  {lang === 'id' 
                    ? 'Asisten produktivitas cerdas untuk mengevaluasi tugas, catatan, keuangan & jurnal harian Anda.' 
                    : 'Smart productivity assistant to review your tasks, notes, finances & daily reflections.'}
                </p>

                {/* Privacy Badge Card */}
                <div className="mb-6 w-full max-w-xl p-3 sm:p-3.5 bg-slate-900/90 border border-slate-800/90 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-sm">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                      {isOrganic ? <Icon3DShield size={16} /> : isAppInLiteMode ? <LiteStickerIcon variant="shield" size="xs" /> : <Shield size={13} className="text-indigo-400" />}
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                      {lang === 'id' 
                        ? 'Layanan AI Online • Berjalan stateless & data hanya dikirim atas izin Anda.' 
                        : 'Online AI Service • Runs stateless & data is only sent with your consent.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowInfoModal(true)}
                    className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border border-slate-700/60 text-[10px] font-bold shrink-0 transition-colors cursor-pointer"
                  >
                    {lang === 'id' ? 'Info Privasi' : 'Privacy Info'}
                  </button>
                </div>

                {/* 4 Core Shortcuts Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
                  {getCoreShortcuts().map((card, idx) => {
                    const CardIcon = card.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          if (card.type === 'note') {
                            setShowNoteAttachModal(true);
                          } else if (card.type === 'guide') {
                            handleSend(card.prompt);
                          } else {
                            handleSend(card.prompt, card.type);
                          }
                        }}
                        className="flex items-start gap-3.5 p-3.5 sm:p-4 bg-slate-900/80 hover:bg-slate-855 border border-slate-800/90 hover:border-indigo-500/40 rounded-2xl text-left transition-all group cursor-pointer shadow-sm hover:scale-[1.01]"
                      >
                        <div className={`w-9 h-9 rounded-xl bg-slate-950 flex items-center justify-center shrink-0 border transition-all ${card.color}`}>
                          {isOrganic ? (
                            card.type === 'finance' && card.title.includes('💡') ? <Icon3DLightbulb size={22} /> :
                            card.type === 'finance' ? <Icon3DWallet size={22} /> :
                            card.type === 'tasks' ? <Icon3DCheckSquare size={22} /> :
                            card.type === 'note' ? <Icon3DFileText size={22} /> :
                            <Icon3DMoodHappy size={22} />
                          ) : isAppInLiteMode ? (
                            card.type === 'finance' ? <LiteStickerIcon variant="finance" size="sm" /> :
                            card.type === 'tasks' ? <LiteStickerIcon variant="tasks" size="sm" /> :
                            card.type === 'note' ? <LiteStickerIcon variant="notes" size="sm" /> :
                            card.type === 'mood' ? <LiteStickerIcon variant="mood-good" size="sm" /> :
                            <LiteStickerIcon variant="sparkles" size="sm" />
                          ) : (
                            <CardIcon size={18} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-bold text-slate-100 text-xs sm:text-sm group-hover:text-indigo-300 transition-colors">
                            {card.title}
                          </h3>
                          <p className="text-[11px] text-slate-400 leading-snug mt-0.5 line-clamp-2">
                            {card.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {messages.filter(m => m.id !== 'welcome').map((msg, idx, arr) => {
              const isLatest = idx === arr.length - 1;
              return (
                <div key={msg.id} ref={isLatest ? latestMsgRef : undefined} className="scroll-mt-4">
                  <ChatMessageBubble
                    msg={msg}
                    lang={lang}
                    isOrganic={isOrganic}
                    isLite={isAppInLiteMode}
                    copiedMsgId={copiedMsgId}
                    savedMsgId={savedMsgId}
                    onCopy={handleCopyMessage}
                    onSaveToNote={handleSaveMsgToNote}
                    onPreviewImage={setPreviewImageModalUrl}
                  />
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start animate-in fade-in duration-200 w-full mb-4">
                <div className="flex gap-3 items-start max-w-full">
                  <div className="w-8 h-8 rounded-2xl shrink-0 flex items-center justify-center bg-gradient-to-tr from-indigo-600 via-indigo-500 to-indigo-400 text-white shadow-md shadow-indigo-500/20 mt-0.5 border border-indigo-400/30">
                    {isOrganic ? <Icon3DTataAI size={22} className="animate-spin" /> : <Bot size={16} className="animate-pulse" />}
                  </div>
                  <div className="bg-slate-900/90 border border-slate-800/80 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center justify-between gap-3 shadow-sm flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      <span className="text-xs text-slate-300 ml-1 font-medium">{lang === 'id' ? 'Tata AI sedang berpikir...' : 'Tata AI is thinking...'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCancelRequest}
                      className="px-2.5 py-1 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 ml-auto"
                      title={lang === 'id' ? 'Batalkan Proses AI' : 'Cancel AI Request'}
                    >
                      {isOrganic ? <Icon3DStop size={12} /> : <Square size={10} className="fill-red-400 text-red-400" />}
                      <span>{lang === 'id' ? 'Batalkan' : 'Cancel'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!isLoading && inputText.trim()) handleSend();
            }}
            className="flex-none pt-2 pb-[calc(env(safe-area-inset-bottom)+10px)] w-full flex flex-col gap-2"
          >
            {/* Active Attached Note Context Pill (Inline Attachment above input) */}
            {tempNoteContext && (
              <div className="flex items-center justify-between gap-2 px-3.5 py-2 bg-emerald-950/80 border border-emerald-500/40 rounded-2xl text-xs text-emerald-300 backdrop-blur-md animate-in slide-in-from-bottom-2 shadow-lg">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {isOrganic ? <Icon3DFileText size={16} /> : <FileText size={15} className="text-emerald-400 shrink-0" />}
                  <span className="font-semibold text-emerald-400 shrink-0">{lang === 'id' ? 'Lampiran:' : 'Attachment:'}</span>
                  <span className="text-slate-100 font-bold truncate max-w-[180px] sm:max-w-[320px]">"{tempNoteContext.title}"</span>
                  {(() => {
                    const { images } = extractAndCleanImages(tempNoteContext.content || '');
                    if (images.length > 0) {
                      return (
                        <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                          📷 {images.length} {lang === 'id' ? 'Foto' : 'Photo'}
                        </span>
                      );
                    }
                    return null;
                  })()}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowNoteAttachModal(true)}
                    className="px-2 py-0.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-bold transition-colors cursor-pointer"
                  >
                    {lang === 'id' ? 'Ubah' : 'Change'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempNoteContext(null)}
                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title={lang === 'id' ? 'Lepas Lampiran Catatan' : 'Detach Note Context'}
                  >
                    {isOrganic ? <Icon3DClose size={14} /> : <X size={14} />}
                  </button>
                </div>
              </div>
            )}
            {/* Error Message banner inline with Retry button */}
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-center justify-between gap-2 animate-in slide-in-from-bottom-2">
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {isOrganic ? <Icon3DWarning size={16} /> : <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />}
                  <p className="text-xs text-red-300 font-medium leading-relaxed truncate">{errorMsg}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {lastCallArgsRef.current && (
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="px-2.5 py-1 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/40 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      {isOrganic ? <Icon3DRotateCcw size={14} /> : <RotateCcw size={12} />}
                      <span>{lang === 'id' ? 'Coba Lagi' : 'Retry'}</span>
                    </button>
                  )}
                  <button 
                    type="button" 
                    onClick={() => setErrorMsg(null)} 
                    className="text-red-400 hover:text-red-200 text-xs font-bold p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 items-end bg-slate-900/95 border border-slate-800 focus-within:border-indigo-500/60 focus-within:ring-2 focus-within:ring-indigo-500/20 rounded-3xl p-2 transition-all shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onClick={() => setShowNoteAttachModal(true)}
                className={`p-2.5 rounded-2xl transition-all cursor-pointer shrink-0 ${
                  tempNoteContext 
                    ? 'text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30' 
                    : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800'
                }`}
                title={lang === 'id' ? 'Lampirkan Catatan Berizin' : 'Attach Authorized Note'}
              >
                {isOrganic ? <Icon3DFileText size={20} /> : isAppInLiteMode ? <LiteStickerIcon variant="notes" size="xs" /> : <FileText size={18} />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setConsentType('tasks');
                  setPendingPrompt(inputText.trim() || (lang === 'id' ? 'Bantu saya menganalisis dan mengatur tugas-tugas berizin ini.' : 'Help me analyze and organize these permitted tasks.'));
                  const nonDeleted = tasks.filter(t => !t.deleted);
                  const initialTaskIds = nonDeleted.map(t => t.id);
                  setSelectedTaskIds(initialTaskIds);
                  setConsentPayload(getTasksPayload(initialTaskIds));
                  setShowConsentModal(true);
                }}
                className={`p-2.5 rounded-2xl transition-all cursor-pointer shrink-0 ${
                  consentType === 'tasks' && showConsentModal
                    ? 'text-indigo-400 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30' 
                    : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800'
                }`}
                title={lang === 'id' ? 'Lampirkan Tugas Berizin AI (Izin Sekali Pakai)' : 'Attach Authorized Tasks (Single-Use Permission)'}
              >
                {isOrganic ? <Icon3DCheckSquare size={20} /> : isAppInLiteMode ? <LiteStickerIcon variant="tasks" size="xs" /> : <CheckSquare size={18} />}
              </button>
              
              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  // On touch/mobile devices or when Shift is held, Enter creates a newline (garis baru).
                  // On desktop keyboards without shift, Enter sends the message.
                  const isTouchDevice = typeof window !== 'undefined' && (('ontouchstart' in window) || navigator.maxTouchPoints > 0 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
                  if (e.key === 'Enter') {
                    if (!isTouchDevice && !e.shiftKey) {
                      e.preventDefault();
                      if (!isLoading && inputText.trim()) handleSend();
                    }
                  }
                }}
                placeholder={lang === 'id' ? "Kirim pesan ke Tata AI..." : "Message Tata AI..."}
                disabled={isLoading}
                rows={1}
                className="flex-1 bg-transparent border-none px-2 py-2 text-xs sm:text-[15px] placeholder-slate-500 outline-none resize-none min-h-[40px] max-h-32 text-slate-100 no-scrollbar leading-relaxed"
                style={{ overflowY: 'auto' }}
              />
              
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleCancelRequest}
                  className="p-2.5 rounded-2xl transition-all shrink-0 bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30 active:scale-95 cursor-pointer flex items-center justify-center"
                  title={lang === 'id' ? 'Batalkan Proses AI' : 'Cancel AI Request'}
                >
                  {isOrganic ? <Icon3DStop size={18} /> : <Square size={16} className="fill-red-400 text-red-400 animate-pulse" />}
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`p-2.5 rounded-2xl transition-all shrink-0 ${
                    inputText.trim()
                      ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 cursor-pointer'
                      : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {isOrganic ? <Icon3DSend size={20} /> : <Send size={18} />}
                </button>
              )}
            </div>
            
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 font-medium">
              {isOrganic ? <Icon3DShield size={13} /> : <Shield size={11} className="text-slate-500 shrink-0" />}
              <span className="truncate">{lang === 'id' ? 'Tata AI membutuhkan internet • Data dikirim secara stateless atas izin Anda' : 'Tata AI requires internet • Data sent statelessly with your consent'}</span>
            </div>
          </form>

        </div>
      </div>

      {/* INFO MODAL: System & Privacy Knowledge */}
      <AnimatePresence>
        {showInfoModal && (
          <div className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    {isOrganic ? <Icon3DSliders size={22} /> : <SlidersHorizontal size={20} className="text-indigo-400" />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{lang === 'id' ? 'Pengaturan Model & Mode AI' : 'AI Model & Mode Settings'}</h3>
                    <p className="text-xs text-slate-400">{lang === 'id' ? 'Konfigurasi Tata AI & Kuota Percakapan' : 'Tata AI & Conversation Quota Config'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title={lang === 'id' ? 'Tutup' : 'Close'}
                >
                  {isOrganic ? <Icon3DClose size={18} /> : <X size={18} />}
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 pr-1 text-xs text-slate-300 leading-relaxed my-1">
                {/* Clarification banner about AI mode vs App mode */}
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-start gap-2.5">
                  {isOrganic ? <Icon3DInfo size={18} /> : <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />}
                  <p className="text-[11px] text-indigo-200/90 leading-relaxed">
                    {lang === 'id'
                      ? `Pilihan "Tata Lite / Pro" di bawah ini murni mengatur gaya respon percakapan (singkat vs mendalam). Kuota kredit gratis Anda adalah ${maxDailyCredits}x/hari sesuai Mode Aplikasi (${isAppInLiteMode ? 'Mode Aplikasi Lite: 5x/hari' : 'Mode Aplikasi Pro: 15x/hari'}).`
                      : `The "Tata Lite / Pro" option below purely sets the response style (concise vs in-depth). Your daily free credits are ${maxDailyCredits}x/day based on App Mode (${isAppInLiteMode ? 'Lite App Mode: 5x/day' : 'Pro App Mode: 15x/day'}).`}
                  </p>
                </div>

                {/* Active Model Status Card */}
                <div className="p-3.5 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400">
                      {lang === 'id' ? 'Versi Model AI & Status' : 'Active AI Model & Status'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      getActiveModelDetails().isByok 
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    }`}>
                      {getActiveModelDetails().isByok ? (lang === 'id' ? 'BYOK (Tak Terbatas)' : 'BYOK (Unlimited)') : (lang === 'id' ? `Kredit Gratis (${creditsLeft}/${maxDailyCredits})` : `Free Credit (${creditsLeft}/${maxDailyCredits})`)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-100">{getActiveModelDetails().provider}</h4>
                      <p className="text-[11px] font-mono text-indigo-300">Model ID: <span className="font-bold text-slate-200">{getActiveModelDetails().version}</span></p>
                    </div>
                  </div>
                </div>

                {/* Mode Tier: Tata Lite vs Tata Pro (Response Style) */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-indigo-400 flex items-center gap-1.5 text-xs">
                      {isOrganic ? <Icon3DZap size={16} /> : <Zap size={14} className="text-amber-400" />}
                      <span>{lang === 'id' ? 'Gaya Respon Tata AI' : 'Tata AI Response Style'}</span>
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      aiTierMode === 'lite' 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                        : 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                    }`}>
                      {aiTierMode === 'lite' ? 'Tata Lite ⚡' : 'Tata Pro ⭐'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAiTierMode('lite')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        aiTierMode === 'lite'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-amber-300">
                        {isOrganic ? <Icon3DZap size={14} /> : <Zap size={13} className="fill-amber-400" />}
                        <span>Tata Lite</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        {lang === 'id' ? 'Respons kilat, padat, ringkas & to-the-point.' : 'Ultra-fast, compact & direct answers.'}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectAiTierMode('pro')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        aiTierMode === 'pro'
                          ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 shadow-sm'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-300">
                        {isOrganic ? <Icon3DTataAI size={16} /> : <Bot size={13} />}
                        <span>Tata Pro</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                        {lang === 'id' ? 'Analisis mendalam, terstruktur & komprehensif.' : 'Deep analysis, structured & thorough.'}
                      </p>
                    </button>
                  </div>
                </div>

                {/* AI Persona / Tone Selector */}
                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-indigo-400 flex items-center gap-1.5 text-xs">
                      {isOrganic ? <Icon3DTataAI size={16} /> : <Bot size={14} />}
                      <span>{lang === 'id' ? 'Gaya & Karakter Tata AI' : 'AI Persona & Tone'}</span>
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {getPersonalityDetails(personality).label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-1">
                    {(['general', 'discipline', 'finance', 'writer', 'mindfulness'] as AIPersonality[]).map(p => {
                      const details = getPersonalityDetails(p);
                      const IconComp = details.icon;
                      const isSelected = personality === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handleSelectPersonality(p)}
                          className={`flex items-center gap-1.5 p-2 rounded-xl text-left border transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm' 
                              : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:text-slate-200 hover:bg-slate-800/60'
                          }`}
                        >
                          {isOrganic ? (
                            p === 'general' ? <Icon3DTataAI size={14} /> :
                            p === 'discipline' ? <Icon3DFlame size={14} /> :
                            p === 'finance' ? <Icon3DWallet size={14} /> :
                            p === 'writer' ? <Icon3DNavNotes size={14} /> :
                            <Icon3DMoodHappy size={14} />
                          ) : isAppInLiteMode ? (
                            p === 'general' ? <LiteStickerIcon variant="ai" size="xs" /> :
                            p === 'discipline' ? <LiteStickerIcon variant="flame" size="xs" /> :
                            p === 'finance' ? <LiteStickerIcon variant="finance" size="xs" /> :
                            p === 'writer' ? <LiteStickerIcon variant="notes" size="xs" /> :
                            <LiteStickerIcon variant="mood-good" size="xs" />
                          ) : (
                            <IconComp size={12} className={isSelected ? 'text-indigo-400' : 'text-slate-500'} />
                          )}
                          <span className="text-[11px] font-semibold truncate">{details.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1.5">
                  <h4 className="font-bold text-indigo-400 flex items-center gap-1.5 text-xs">
                    {isOrganic ? <Icon3DCheckSquare size={16} /> : <Check size={14} className="text-emerald-400" />}
                    <span>{lang === 'id' ? 'Apakah Tata AI paham semua fitur Tata?' : 'Does Tata AI know all Tata features?'}</span>
                  </h4>
                  <p className="text-slate-300">
                    {lang === 'id' 
                      ? 'Ya! Tata AI diprogram secara sistemik untuk memahami seluruh ekosistem Tata: Note Editor (Markdown), Task Manager & Streak Disiplin, Pelacak Keuangan & Tabungan, Kalender, Jurnal Mood, Kunci PIN Lokal, Mini Game 2048, dan PWA Offline-First.'
                      : 'Yes! Tata AI is systemically instructed on all Tata features: Note Editor (Markdown), Task Manager & Streak, Finance & Savings, Calendar, Mood Journal, PIN Lock, 2048 game, and Offline-First PWA.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1.5">
                  <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 text-xs">
                    {isOrganic ? <Icon3DShield size={16} /> : <Shield size={14} />}
                    <span>{lang === 'id' ? 'Layanan AI Online & Akses Data' : 'Online AI Service & Data Access'}</span>
                  </h4>
                  <p className="text-slate-300">
                    {lang === 'id' 
                      ? 'Berbeda dengan aplikasi Tata yang 100% offline-first, fitur Tata AI adalah asisten online pihak ketiga (Google Gemini / BYOK). Tata AI TIDAK PERNAH membaca database lokal Anda secara otomatis. Data hanya dikirim ke server AI jika Anda secara sadar menekan tombol analisis dan memberikan izin (consent).'
                      : 'Unlike the Tata core app which is 100% offline-first, Tata AI is an online 3rd-party assistant (Google Gemini / BYOK). Tata AI NEVER reads your local database automatically. Data is only sent to AI servers if you explicitly request analysis and grant consent.'}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-1.5">
                  <h4 className="font-bold text-amber-400 flex items-center gap-1.5 text-xs">
                    {isOrganic ? <Icon3DTataAI size={16} /> : <Bot size={14} />}
                    <span>{lang === 'id' ? 'Kredit Harian & API Key (BYOK)' : 'Daily Credits & API Key (BYOK)'}</span>
                  </h4>
                  <p className="text-slate-300">
                    {lang === 'id' 
                      ? `Anda mendapatkan ${maxDailyCredits} kredit percakapan gratis setiap harinya (${maxDailyCredits === 5 ? 'Mode Lite: 5 kredit/hari' : 'Mode Pro: 15 kredit/hari'}). Jika ingin percakapan tak terbatas, Anda dapat memasukkan API Key pribadi (Gemini, OpenRouter, OpenAI, Anthropic, Groq) di menu Pengaturan.`
                      : `You receive ${maxDailyCredits} free chat credits daily (${maxDailyCredits === 5 ? 'Lite Mode: 5 credits/day' : 'Pro Mode: 15 credits/day'}). For unlimited access, enter your own API Key (Gemini, OpenRouter, OpenAI, Anthropic, Groq) in Settings.`}
                  </p>
                </div>

                {messages.length > 0 && (
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        handleExportChatToNote();
                      }}
                      className="w-full py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      {exportSuccess ? (
                        isOrganic ? <Icon3DCheck size={16} /> : <Check size={15} className="text-emerald-400" />
                      ) : (
                        isOrganic ? <Icon3DBookmark size={16} /> : <BookmarkPlus size={15} />
                      )}
                      <span>{exportSuccess ? (lang === 'id' ? 'Sesi Chat Berhasil Disimpan!' : 'Chat Log Exported!') : (lang === 'id' ? 'Ekspor Seluruh Sesi Chat ke Catatan' : 'Export Full Chat Log to Note')}</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-800/80 shrink-0">
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-indigo-600/20"
                >
                  {lang === 'id' ? 'Mengerti' : 'Got it'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONSENT DIALOG MODAL */}
      <AnimatePresence>
        {showConsentModal && (
          <div 
            className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
            onClick={handleConsentCancel}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Blur accent background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-center justify-between gap-3 mb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    {isOrganic ? <Icon3DShield size={24} /> : <Shield size={22} />}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{lang === 'id' ? 'Kirim dengan Data Lokal?' : 'Send with Local Data?'}</h3>
                    <p className="text-xs text-slate-400">{lang === 'id' ? 'Opsi Privasi Fleksibel' : 'Flexible Privacy Options'}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleConsentCancel}
                  className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-xl transition-colors cursor-pointer shrink-0"
                  title={lang === 'id' ? 'Tutup / Batalkan' : 'Close / Cancel'}
                >
                  {isOrganic ? <Icon3DClose size={18} /> : <X size={18} />}
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 pr-1 space-y-3.5 my-1">
                {pendingPrompt && (
                  <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-2xl">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                      {lang === 'id' ? 'Pertanyaan Anda:' : 'Your Prompt:'}
                    </span>
                    <p className="text-xs text-slate-200 line-clamp-3 italic">
                      "{pendingPrompt}"
                    </p>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {lang === 'id' ? (
                    consentType === 'tasks' ? (
                      <span>
                        Tata mendeteksi pertanyaan Anda berkaitan dengan <strong>Tugas & Produktivitas</strong>. Anda dapat memilih <strong>Izinkan & Kirim</strong> agar Tata AI dapat membaca tugas Anda (izin sekali pakai) untuk analisis mendalam, atau <strong>Kirim Tanpa Data</strong> untuk langsung menanyakan pertanyaan ini secara umum tanpa membagikan data tugas lokal.
                      </span>
                    ) : consentType === 'finance' ? (
                      <span>
                        Tata mendeteksi pertanyaan Anda berkaitan dengan <strong>Keuangan</strong>. Anda dapat memilih <strong>Izinkan & Kirim</strong> untuk menyertakan ringkasan kas/anggaran agar saran lebih akurat, atau <strong>Kirim Tanpa Data</strong> untuk berdiskusi finansial secara umum tanpa membagikan data lokal.
                      </span>
                    ) : (
                      <span>
                        Tata mendeteksi pertanyaan Anda berkaitan dengan <strong>Mood & Suasana Hati</strong>. Anda dapat memilih <strong>Izinkan & Kirim</strong> untuk menyertakan tren mood mingguan, atau <strong>Kirim Tanpa Data</strong> untuk berkonsultasi umum tanpa melampirkan jurnal mood lokal.
                      </span>
                    )
                  ) : (
                    consentType === 'tasks' ? (
                      <span>
                        Tata detected your question relates to <strong>Tasks & Productivity</strong>. Select <strong>Authorize & Send</strong> to grant single-use consent for personalized task analysis, or <strong>Send Without Data</strong> to discuss generally without sharing your local tasks.
                      </span>
                    ) : consentType === 'finance' ? (
                      <span>
                        Tata detected your question relates to <strong>Finance</strong>. Select <strong>Authorize & Send</strong> to attach your cash summary for tailored advice, or <strong>Send Without Data</strong> to ask generally without sharing local data.
                      </span>
                    ) : (
                      <span>
                        Tata detected your question relates to <strong>Mood & Emotions</strong>. Select <strong>Authorize & Send</strong> to attach your 7-day mood history, or <strong>Send Without Data</strong> to chat generally without sharing local mood entries.
                      </span>
                    )
                  )}
                </p>

                {/* Task Checklist Permission Selector */}
                {consentType === 'tasks' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">
                        {lang === 'id' ? 'Pilih Tugas yang Boleh Dibaca AI (Izin Sekali Pakai):' : 'Select Tasks Permitted for AI (Single-Use Consent):'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = tasks.filter(t => !t.deleted).map(t => t.id);
                            setSelectedTaskIds(allIds);
                            setConsentPayload(getTasksPayload(allIds));
                          }}
                          className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                        >
                          {lang === 'id' ? 'Pilih Semua' : 'Select All'}
                        </button>
                        <span className="text-slate-600">•</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTaskIds([]);
                            setConsentPayload(getTasksPayload([]));
                          }}
                          className="text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                        >
                          {lang === 'id' ? 'Batal Semua' : 'Deselect All'}
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[140px] sm:max-h-[170px] overflow-y-auto no-scrollbar space-y-1.5 p-2 bg-slate-950/60 border border-slate-800 rounded-2xl">
                      {tasks.filter(t => !t.deleted).length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-500">
                          {lang === 'id' ? 'Belum ada tugas di Tata.' : 'No tasks in Tata.'}
                        </div>
                      ) : (
                        tasks.filter(t => !t.deleted).map(t => {
                          const isChecked = selectedTaskIds.includes(t.id);
                          return (
                            <label
                              key={t.id}
                              className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-indigo-600/15 border-indigo-500/40 text-slate-100'
                                  : 'bg-slate-900/40 border-slate-800/60 text-slate-400 opacity-60'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  let updated: string[];
                                  if (isChecked) {
                                    updated = selectedTaskIds.filter(id => id !== t.id);
                                  } else {
                                    updated = [...selectedTaskIds, t.id];
                                  }
                                  setSelectedTaskIds(updated);
                                  setConsentPayload(getTasksPayload(updated));
                                }}
                                className="mt-0.5 rounded accent-indigo-500 shrink-0 cursor-pointer"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className={`text-xs font-semibold truncate ${isChecked ? 'text-slate-100' : 'text-slate-400 line-through'}`}>
                                    {t.title}
                                  </span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                    t.priority === 'Tinggi' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                                    t.priority === 'Sedang' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                                    'bg-slate-800 text-slate-400'
                                  }`}>
                                    {t.priority || 'Biasa'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                  <span>{t.completed ? (lang === 'id' ? 'Selesai' : 'Completed') : (lang === 'id' ? 'Belum selesai' : 'Pending')}</span>
                                  {t.date && <span>• {t.date}</span>}
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                      {isOrganic ? <Icon3DShield size={14} /> : <Shield size={12} />}
                      <span>
                        {lang === 'id'
                          ? `Diizinkan: ${selectedTaskIds.length} tugas. Izin ini akan LANGSUNG DICABUT setelah balasan dikirim.`
                          : `Permitted: ${selectedTaskIds.length} tasks. Permission is IMMEDIATELY REVOKED after response.`}
                      </span>
                    </div>
                  </div>
                )}

                {consentType !== 'tasks' && (
                  <div>
                    <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                      {lang === 'id' ? 'Data yang akan dikirim:' : 'Data to be sent:'}
                    </span>
                    <ul className="text-xs text-slate-300 space-y-1 bg-slate-950/40 border border-slate-800/60 p-3 rounded-2xl">
                      {consentType === 'finance' && (
                        <>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            <span>{lang === 'id' ? 'Saldo Dompet, Celengan, & Kekayaan Bersih (Net Worth)' : 'Wallet Cash, Vault Savings, & Total Net Worth'}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            <span>{lang === 'id' ? 'Pos Impian & Deposito/Reksadana (Target, Bunga %, Pajak, Imbal Hasil)' : 'Savings Goals & Deposits (Target, Yield %, Tax, Estimated Net Yield)'}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            <span>{lang === 'id' ? 'Arus Kas (Cashflow), Rasio Tabungan, & Kategori Pengeluaran Terbesar' : 'Cashflow, Savings Rate %, & Top Expense Categories'}</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            <span>{lang === 'id' ? 'Kewajiban Hutang & Cicilan Aktif serta 5 Transaksi Terakhir' : 'Active Debts, Installment Schedules & 5 Recent Transactions'}</span>
                          </li>
                        </>
                      )}
                      {consentType === 'mood' && (
                        <>
                          <li className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            <span>{lang === 'id' ? 'Riwayat mood 7 hari terakhir' : 'Mood history for the last 7 days'}</span>
                          </li>
                          <li className="flex items-center gap-2 text-[10px] text-slate-500 pl-3.5">
                            <span>(Hari, Label Mood, {lang === 'id' ? 'dan catatan pendek' : 'and short note'})</span>
                          </li>
                        </>
                      )}
                    </ul>
                  </div>
                )}

                {/* Exact Data Block Display */}
                <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3 sm:p-3.5 max-h-[120px] overflow-y-auto no-scrollbar">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1.5">
                    {lang === 'id' ? 'PRATINJAU DATA SEBENARNYA' : 'ACTUAL DATA PREVIEW'}
                  </span>
                  <pre className="text-xs font-mono text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {consentPayload}
                  </pre>
                </div>

                {/* AI Engine Provider Transparency Box */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-3 text-[11px] text-amber-200/90 leading-relaxed">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-1">
                    {isOrganic ? <Icon3DWarning size={16} className="shrink-0" /> : <AlertTriangle size={14} className="shrink-0" />}
                    <span>{lang === 'id' ? 'Transparansi Mesin AI Pihak Ketiga' : 'Third-Party AI Engine Policy'}</span>
                  </div>
                  <p>
                    {lang === 'id'
                      ? 'Tata berjalan 100% lokal tanpa database backend dan langsung mencabut izin akses lokal di HP begitu dikirim. Namun, teks yang diizinkan di atas akan dikirim via internet ke server API mesin AI pilihan Anda (Gemini, Grok, OpenAI, dll). Retensi log dan kebijakan privasi data di server mesin tersebut sepenuhnya mengikuti Kebijakan Privasi dari penyedia API AI tersebut.'
                      : 'Tata runs 100% locally without cloud databases and revokes local access permission immediately after sending. However, the permitted text above is sent over the internet to your chosen AI engine API server (Gemini, Grok, OpenAI, etc.). Log retention and data privacy policies on those AI servers depend entirely on that specific provider\'s Privacy Policy.'}
                  </p>
                </div>
              </div>

              {/* Modal Fixed Footer Buttons */}
              <div className="shrink-0 pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleConsentCancel}
                    className="py-2.5 sm:py-3 px-3.5 bg-slate-800 hover:bg-slate-700/80 text-slate-300 font-semibold text-xs sm:text-sm rounded-2xl transition-colors cursor-pointer border border-slate-700/40 text-center order-3 sm:order-1"
                  >
                    {lang === 'id' ? 'Batal' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWithoutConsent}
                    className="flex-1 py-2.5 sm:py-3 px-3.5 bg-slate-800/90 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 font-semibold text-xs sm:text-sm rounded-2xl transition-colors cursor-pointer border border-indigo-500/30 text-center order-2 flex items-center justify-center gap-1.5"
                    title={lang === 'id' ? 'Tanyakan pertanyaan ini secara umum tanpa melampirkan data lokal' : 'Ask this question generally without attaching local data'}
                  >
                    {isOrganic ? <Icon3DTataAI size={16} /> : <Bot size={14} className="text-indigo-400 shrink-0" />}
                    <span>{lang === 'id' ? 'Kirim Tanpa Data' : 'Send Without Data'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleConsentApproved}
                    className="flex-1 py-2.5 sm:py-3 px-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm rounded-2xl transition-colors cursor-pointer text-center shadow-lg shadow-indigo-600/20 order-1 sm:order-3 flex items-center justify-center gap-1.5"
                  >
                    {isOrganic ? <Icon3DShield size={16} className="shrink-0" /> : <Shield size={14} className="shrink-0" />}
                    <span>{lang === 'id' ? 'Izinkan & Kirim' : 'Authorize & Send'}</span>
                  </button>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500">
                  {isOrganic ? <Icon3DEye size={14} /> : <Eye size={12} />}
                  <span>{lang === 'id' ? 'Data lokal hanya dikirim jika Anda menekan "Izinkan & Kirim".' : 'Local data is only sent if you click "Authorize & Send".'}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ATTACH NOTE DIALOG MODAL */}
      <AnimatePresence>
        {showNoteAttachModal && (
          <div className="fixed inset-0 z-[10000] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Blur accent background */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center gap-3 mb-4 shrink-0">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  {isOrganic ? <Icon3DTataAI size={28} /> : <Bot size={24} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">{lang === 'id' ? 'Lampirkan Catatan Berizin AI' : 'Attach AI-Consented Note'}</h3>
                  <p className="text-xs text-slate-400">{lang === 'id' ? 'Hanya catatan yang telah Anda beri izin akses' : 'Only notes that you have granted permission'}</p>
                </div>
              </div>

              {/* Scrollable list of notes */}
              <div className="flex-1 overflow-y-auto no-scrollbar space-y-2.5 my-4 pr-1 min-h-[200px]">
                {(() => {
                  const sharedNotes = (notes || []).filter(n => n.sharedWithAI && !n.isArchived);
                  if (sharedNotes.length === 0) {
                    return (
                      <div className="text-center py-8 px-4 border border-dashed border-slate-800 rounded-2xl bg-slate-950/20">
                        {isOrganic ? <Icon3DFileText size={36} className="mx-auto mb-2" /> : <FileText size={32} className="text-slate-600 mx-auto mb-2" />}
                        <h4 className="text-xs font-bold text-slate-300 mb-1">{lang === 'id' ? 'Tidak Ada Catatan Berizin AI' : 'No AI-Consented Notes'}</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
                          {lang === 'id' 
                            ? 'Buka salah satu catatan Anda di editor, lalu tekan tombol "Berikan ke AI" untuk memberikan izin akses secara eksplisit.' 
                            : 'Open one of your notes in the editor and click "Give to AI" to grant explicit access permission first.'}
                        </p>
                      </div>
                    );
                  }

                  return sharedNotes.map((n) => {
                    const isSelected = tempNoteContext && tempNoteContext.title === n.title;
                    const { images: noteImages } = extractAndCleanImages(n.content || '');
                    const hasPhotos = noteImages.length > 0 || (n.thumbnailUrl && n.thumbnailUrl.startsWith('data:image/'));

                    const contentPreview = n.content 
                      ? n.content.replace(/<img[^>]*>/gi, ' [Foto] ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>?/gm, '').replace(/&nbsp;?/gi, ' ').trim() 
                      : '';
                    
                    return (
                      <div 
                        key={n.id}
                        className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col gap-1.5 ${
                          isSelected 
                            ? 'bg-indigo-600/10 border-indigo-500/40' 
                            : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700/60'
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className="text-xs font-bold text-slate-100 truncate flex-1 flex items-center gap-1.5">
                            {isOrganic ? <Icon3DTataAI size={13} /> : <Bot size={11} className="text-indigo-400 shrink-0" />}
                            <span>{n.title || (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note')}</span>
                            {hasPhotos && (
                              <span className="px-1.5 py-0.5 rounded-md bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[9px] font-bold">
                                📷 {lang === 'id' ? 'Ada Foto' : 'Has Photo'}
                              </span>
                            )}
                          </h4>
                          <span className="text-[9px] text-slate-500 font-mono shrink-0">{n.date}</span>
                        </div>
                        {contentPreview && (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed break-words">
                            {contentPreview}
                          </p>
                        )}
                        <div className="flex justify-end pt-1 shrink-0">
                          {isSelected ? (
                            <button
                              onClick={() => {
                                setTempNoteContext(null);
                                setShowNoteAttachModal(false);
                              }}
                              className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              {lang === 'id' ? 'Lepas Lampiran' : 'Detach'}
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setTempNoteContext({
                                  title: n.title || (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note'),
                                  content: n.content || '',
                                  thumbnailUrl: n.thumbnailUrl
                                });
                                setShowNoteAttachModal(false);
                              }}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              {lang === 'id' ? 'Lampirkan' : 'Attach'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              <div className="flex gap-3 shrink-0 pt-2 border-t border-slate-800/60">
                <button
                  onClick={() => setShowNoteAttachModal(false)}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700/80 text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer border border-slate-700/40 text-center"
                >
                  {lang === 'id' ? 'Tutup' : 'Close'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMAGE LIGHTBOX PREVIEW MODAL */}
      <AnimatePresence>
        {previewImageModalUrl && (
          <div 
            onClick={() => setPreviewImageModalUrl(null)}
            className="fixed inset-0 z-[10001] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center">
              <button
                onClick={() => setPreviewImageModalUrl(null)}
                className="absolute -top-12 right-0 p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-full border border-slate-700 transition-colors"
                title={lang === 'id' ? 'Tutup' : 'Close'}
              >
                {isOrganic ? <Icon3DClose size={20} /> : <X size={20} />}
              </button>
              <img
                src={previewImageModalUrl}
                alt="Enlarged Preview"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-slate-800 shadow-2xl"
              />
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

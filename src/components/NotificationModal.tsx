import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, X, Sparkles, CheckSquare, FileText, Flame, 
  Check, CheckCheck, Trash2, ChevronRight, AlertCircle, Clock,
  CreditCard, Wallet, Smile, ShieldCheck, AlertTriangle
} from 'lucide-react';
import {
  Icon3DBell,
  Icon3DClose,
  Icon3DSparkles,
  Icon3DCheckSquare,
  Icon3DFileText,
  Icon3DFlame,
  Icon3DTaskChecked,
  Icon3DChevronRight,
  Icon3DWarning,
  Icon3DClock,
  Icon3DCreditCard,
  Icon3DWallet,
  Icon3DMoodHappy,
  Icon3DShield,
} from './home/Organic3DIcons';
import { useAppStore } from '../store';
import { useTranslation } from '../translations';
import { 
  buildAllNotifications, 
  markNotifAsRead, 
  markAllNotifsAsRead, 
  NotificationItem 
} from '../utils/notifications';
import { triggerHaptic, playConfirmSound } from '../utils/sound';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (screen: string, param?: any) => void;
  onOpenNote?: (noteId: string) => void;
  appTheme?: string;
}

export default function NotificationModal({
  isOpen,
  onClose,
  onNavigate,
  onOpenNote,
  appTheme
}: NotificationModalProps) {
  const { 
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
    moods,
    appVersion
  } = useAppStore();

  const currentTheme = appTheme || (typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : 'organic') || 'organic';
  const isOrganic = currentTheme === 'organic' || appVersion === 'pro_max' || appVersion === 'organic';
  const isCool = currentTheme === 'cool';
  const isPink = currentTheme === 'pink';
  const isCute = currentTheme === 'cute';
  const isSimple = currentTheme === 'simple';
  const isLight = currentTheme === 'light';
  const isWallpaper = currentTheme === 'wallpaper';
  const t = useTranslation(lang);

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'payment' | 'task' | 'finance' | 'note' | 'update'>('all');

  const refreshNotifs = useCallback(() => {
    const list = buildAllNotifications({
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
    setNotifications(list);
  }, [notes, tasks, transactions, debts, lang, streak, tataAccount, isAccountPremium, savingsBalance, savingsTarget, moods]);

  const notifScrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      refreshNotifs();
      if (notifScrollRef.current) {
        notifScrollRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, refreshNotifs, filterType]);

  useEffect(() => {
    const handleNotifChanged = () => refreshNotifs();
    window.addEventListener('tata_notifications_changed', handleNotifChanged);
    return () => window.removeEventListener('tata_notifications_changed', handleNotifChanged);
  }, [refreshNotifs]);

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter(item => {
    if (filterType === 'all') return true;
    if (filterType === 'payment') return item.type === 'payment';
    if (filterType === 'task') return item.type === 'task' || item.type === 'streak';
    if (filterType === 'finance') return item.type === 'finance';
    if (filterType === 'note') return item.type === 'note';
    if (filterType === 'update') return item.type === 'update' || item.type === 'system' || item.type === 'mood' || item.type === 'general';
    return true;
  });

  const handleItemClick = (item: NotificationItem) => {
    triggerHaptic('light');
    markNotifAsRead(item.id);
    refreshNotifs();

    if (item.type === 'note' && item.targetId) {
      onClose();
      if (onOpenNote) {
        onOpenNote(item.targetId);
      } else {
        onNavigate('note-editor', item.targetId);
      }
    } else if (item.targetScreen) {
      onClose();
      onNavigate(item.targetScreen, item.targetId);
    }
  };

  const handleDismiss = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    triggerHaptic('light');
    markNotifAsRead(id);
    refreshNotifs();
  };

  const handleMarkAllRead = () => {
    triggerHaptic('medium');
    playConfirmSound();
    const allIds = notifications.map(n => n.id);
    markAllNotifsAsRead(allIds);
    refreshNotifs();
  };

  const getItemBadge = (item: NotificationItem) => {
    if (isOrganic) {
      switch (item.type) {
        case 'payment':
          return {
            icon: <Icon3DCreditCard size={18} className="shrink-0" />,
            bg: 'bg-[#FBE9DC] border-[#F4CDAF] text-[#B34E27]',
            label: lang === 'id' ? 'Pembayaran' : 'Payment'
          };
        case 'finance':
          return {
            icon: <Icon3DWallet size={18} className="shrink-0" />,
            bg: 'bg-[#D2DEC7] border-[#BFCDB3] text-[#2F5225]',
            label: lang === 'id' ? 'Keuangan' : 'Finance'
          };
        case 'update':
          return {
            icon: <Icon3DSparkles size={18} className="shrink-0" />,
            bg: 'bg-[#EAD4BF] border-[#DFC8B0] text-[#863D22]',
            label: lang === 'id' ? 'Pembaruan' : 'Update'
          };
        case 'note':
          return {
            icon: <Icon3DFileText size={18} className="shrink-0" />,
            bg: 'bg-[#FAF4EB] border-[#E8DDCA] text-[#7D6B58]',
            label: lang === 'id' ? 'Catatan' : 'Note'
          };
        case 'task':
          return {
            icon: <Icon3DCheckSquare size={18} className="shrink-0" />,
            bg: 'bg-[#D2DEC7] border-[#BFCDB3] text-[#2F5225]',
            label: lang === 'id' ? 'Tugas' : 'Task'
          };
        case 'streak':
          return {
            icon: <Icon3DFlame size={18} className="shrink-0" />,
            bg: 'bg-[#FBE9DC] border-[#F4CDAF] text-[#B34E27]',
            label: lang === 'id' ? 'Streak' : 'Streak'
          };
        case 'mood':
          return {
            icon: <Icon3DMoodHappy size={18} className="shrink-0" />,
            bg: 'bg-[#FAF4EB] border-[#E8DDCA] text-[#7D6B58]',
            label: lang === 'id' ? 'Suasana Hati' : 'Mood'
          };
        case 'system':
          return {
            icon: <Icon3DShield size={18} className="shrink-0" />,
            bg: 'bg-[#D2DEC7] border-[#BFCDB3] text-[#2F5225]',
            label: lang === 'id' ? 'Sistem' : 'System'
          };
        default:
          return {
            icon: <Icon3DBell size={18} className="shrink-0" />,
            bg: 'bg-[#EFE7D7] border-[#E2D4BE] text-[#6E5945]',
            label: lang === 'id' ? 'Pemberitahuan' : 'Info'
          };
      }
    }

    if (isCool) {
      switch (item.type) {
        case 'payment':
          return {
            icon: <CreditCard className="w-4 h-4 text-cyan-400" />,
            bg: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300',
            label: lang === 'id' ? 'Pembayaran' : 'Payment'
          };
        case 'finance':
          return {
            icon: <Wallet className="w-4 h-4 text-emerald-400" />,
            bg: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
            label: lang === 'id' ? 'Keuangan' : 'Finance'
          };
        case 'update':
          return {
            icon: <Sparkles className="w-4 h-4 text-cyan-400" />,
            bg: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300',
            label: lang === 'id' ? 'Update' : 'Update'
          };
        case 'note':
          return {
            icon: <FileText className="w-4 h-4 text-blue-400" />,
            bg: 'bg-blue-500/15 border-blue-400/30 text-blue-300',
            label: lang === 'id' ? 'Catatan' : 'Note'
          };
        case 'task':
          return {
            icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
            bg: 'bg-emerald-500/15 border-emerald-400/30 text-emerald-300',
            label: lang === 'id' ? 'Tugas' : 'Task'
          };
        case 'streak':
          return {
            icon: <Flame className="w-4 h-4 text-amber-400" />,
            bg: 'bg-amber-500/15 border-amber-400/30 text-amber-300',
            label: lang === 'id' ? 'Streak' : 'Streak'
          };
        case 'mood':
          return {
            icon: <Smile className="w-4 h-4 text-sky-400" />,
            bg: 'bg-sky-500/15 border-sky-400/30 text-sky-300',
            label: lang === 'id' ? 'Suasana Hati' : 'Mood'
          };
        case 'system':
          return {
            icon: <ShieldCheck className="w-4 h-4 text-cyan-400" />,
            bg: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300',
            label: lang === 'id' ? 'Sistem' : 'System'
          };
        default:
          return {
            icon: <Bell className="w-4 h-4 text-cyan-400" />,
            bg: 'bg-cyan-500/15 border-cyan-400/30 text-cyan-300',
            label: lang === 'id' ? 'Pemberitahuan' : 'Info'
          };
      }
    }

    if (isPink) {
      switch (item.type) {
        case 'payment':
          return {
            icon: <CreditCard className="w-4 h-4 text-rose-600" />,
            bg: 'bg-rose-100 border-rose-200 text-rose-700',
            label: lang === 'id' ? 'Pembayaran' : 'Payment'
          };
        case 'finance':
          return {
            icon: <Wallet className="w-4 h-4 text-emerald-600" />,
            bg: 'bg-emerald-100 border-emerald-200 text-emerald-700',
            label: lang === 'id' ? 'Keuangan' : 'Finance'
          };
        case 'update':
          return {
            icon: <Sparkles className="w-4 h-4 text-rose-500" />,
            bg: 'bg-rose-100 border-rose-200 text-rose-700',
            label: lang === 'id' ? 'Update' : 'Update'
          };
        case 'note':
          return {
            icon: <FileText className="w-4 h-4 text-rose-600" />,
            bg: 'bg-pink-100 border-pink-200 text-pink-700',
            label: lang === 'id' ? 'Catatan' : 'Note'
          };
        case 'task':
          return {
            icon: <CheckSquare className="w-4 h-4 text-emerald-600" />,
            bg: 'bg-emerald-100 border-emerald-200 text-emerald-700',
            label: lang === 'id' ? 'Tugas' : 'Task'
          };
        case 'streak':
          return {
            icon: <Flame className="w-4 h-4 text-orange-500" />,
            bg: 'bg-orange-100 border-orange-200 text-orange-700',
            label: lang === 'id' ? 'Streak' : 'Streak'
          };
        case 'mood':
          return {
            icon: <Smile className="w-4 h-4 text-rose-500" />,
            bg: 'bg-rose-100 border-rose-200 text-rose-700',
            label: lang === 'id' ? 'Suasana Hati' : 'Mood'
          };
        case 'system':
          return {
            icon: <ShieldCheck className="w-4 h-4 text-pink-600" />,
            bg: 'bg-pink-100 border-pink-200 text-pink-700',
            label: lang === 'id' ? 'Sistem' : 'System'
          };
        default:
          return {
            icon: <Bell className="w-4 h-4 text-rose-500" />,
            bg: 'bg-rose-100 border-rose-200 text-rose-700',
            label: lang === 'id' ? 'Pemberitahuan' : 'Info'
          };
      }
    }

    if (isLight) {
      switch (item.type) {
        case 'payment':
          return {
            icon: <CreditCard className="w-4 h-4 text-amber-600" />,
            bg: 'bg-amber-50 border-amber-200 text-amber-700',
            label: lang === 'id' ? 'Pembayaran' : 'Payment'
          };
        case 'finance':
          return {
            icon: <Wallet className="w-4 h-4 text-emerald-600" />,
            bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
            label: lang === 'id' ? 'Keuangan' : 'Finance'
          };
        case 'update':
          return {
            icon: <Sparkles className="w-4 h-4 text-indigo-600" />,
            bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
            label: lang === 'id' ? 'Update' : 'Update'
          };
        case 'note':
          return {
            icon: <FileText className="w-4 h-4 text-sky-600" />,
            bg: 'bg-sky-50 border-sky-200 text-sky-700',
            label: lang === 'id' ? 'Catatan' : 'Note'
          };
        case 'task':
          return {
            icon: <CheckSquare className="w-4 h-4 text-emerald-600" />,
            bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
            label: lang === 'id' ? 'Tugas' : 'Task'
          };
        case 'streak':
          return {
            icon: <Flame className="w-4 h-4 text-amber-600" />,
            bg: 'bg-amber-50 border-amber-200 text-amber-700',
            label: lang === 'id' ? 'Streak' : 'Streak'
          };
        case 'mood':
          return {
            icon: <Smile className="w-4 h-4 text-purple-600" />,
            bg: 'bg-purple-50 border-purple-200 text-purple-700',
            label: lang === 'id' ? 'Suasana Hati' : 'Mood'
          };
        case 'system':
          return {
            icon: <ShieldCheck className="w-4 h-4 text-slate-700" />,
            bg: 'bg-slate-100 border-slate-200 text-slate-700',
            label: lang === 'id' ? 'Sistem' : 'System'
          };
        default:
          return {
            icon: <Bell className="w-4 h-4 text-indigo-600" />,
            bg: 'bg-indigo-50 border-indigo-200 text-indigo-700',
            label: lang === 'id' ? 'Pemberitahuan' : 'Info'
          };
      }
    }

    // Default Dark / Slate Theme
    switch (item.type) {
      case 'payment':
        return {
          icon: <CreditCard className="w-4 h-4 text-amber-400" />,
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
          label: lang === 'id' ? 'Pembayaran' : 'Payment'
        };
      case 'finance':
        return {
          icon: <Wallet className="w-4 h-4 text-emerald-400" />,
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
          label: lang === 'id' ? 'Keuangan' : 'Finance'
        };
      case 'update':
        return {
          icon: <Sparkles className="w-4 h-4 text-purple-400" />,
          bg: 'bg-purple-500/10 border-purple-500/20 text-purple-300',
          label: lang === 'id' ? 'Update' : 'Update'
        };
      case 'note':
        return {
          icon: <FileText className="w-4 h-4 text-indigo-400" />,
          bg: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300',
          label: lang === 'id' ? 'Catatan' : 'Note'
        };
      case 'task':
        return {
          icon: <CheckSquare className="w-4 h-4 text-emerald-400" />,
          bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300',
          label: lang === 'id' ? 'Tugas' : 'Task'
        };
      case 'streak':
        return {
          icon: <Flame className="w-4 h-4 text-amber-400" />,
          bg: 'bg-amber-500/10 border-amber-500/20 text-amber-300',
          label: lang === 'id' ? 'Streak' : 'Streak'
        };
      case 'mood':
        return {
          icon: <Smile className="w-4 h-4 text-pink-400" />,
          bg: 'bg-pink-500/10 border-pink-500/20 text-pink-300',
          label: lang === 'id' ? 'Suasana Hati' : 'Mood'
        };
      case 'system':
        return {
          icon: <ShieldCheck className="w-4 h-4 text-slate-300" />,
          bg: 'bg-slate-800/80 border-slate-700 text-slate-300',
          label: lang === 'id' ? 'Sistem' : 'System'
        };
      default:
        return {
          icon: <Bell className="w-4 h-4 text-sky-400" />,
          bg: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
          label: lang === 'id' ? 'Pemberitahuan' : 'Info'
        };
    }
  };

  const getModalStyles = () => {
    if (isOrganic) {
      return {
        container: 'bg-[#F7F3E9] border-[#E8DDCA] text-[#24170D]',
        header: 'bg-[#EFE5D5]/90 border-[#E2D4BE]',
        iconBox: 'bg-[#E5D7C2] border-[#D9C6AE] text-[#863D22]',
        countBadge: 'bg-[#E8C2B3] text-[#863116]',
        closeBtn: 'bg-[#E7DAC7] hover:bg-[#DBCABA] text-[#695340] border-[#DFCBB4]',
        filterBar: 'bg-[#EFE7D7] border-[#E2D4BE]',
        filterActive: 'bg-[#E06D34] text-white shadow-sm',
        filterInactive: 'bg-[#FAF5ED] text-[#7D6B58] hover:text-[#24170D] border border-[#E5D7C2]',
        readAllBtn: 'bg-[#FAF5ED] hover:bg-[#EFE5D5] text-[#863D22] border-[#DFCBB4]',
        itemCard: 'bg-[#FAF5EC] hover:bg-[#FAF0E1] border-[#E8DDCA] hover:border-[#D5C2A8]',
        itemTitle: 'text-[#24170D] group-hover:text-[#863D22]',
        itemBody: 'text-[#6E5945]',
        itemFooter: 'border-[#EAE0D0] text-[#863D22]',
        itemBrand: 'text-[#A89480]',
        emptyBox: 'bg-[#EFE7D7] border-[#E2D4BE] text-[#863D22]',
        emptyTitle: 'text-[#24170D]',
        emptySub: 'text-[#7D6B58]',
        footer: 'border-[#E8DDCA] bg-[#EFE5D5]/90',
        footerText: 'text-[#7D6B58]',
        footerBtn: 'bg-[#E06D34] hover:bg-[#C95924] text-white shadow-sm',
      };
    }
    if (isCool) {
      return {
        container: 'bg-[#0D1836] border-[#1E3A8A] text-white',
        header: 'bg-[#0A1329]/95 border-[#1E3A8A]',
        iconBox: 'bg-[#13234A] border-[#1E3A8A] text-cyan-400',
        countBadge: 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30',
        closeBtn: 'bg-[#13234A] hover:bg-[#182C5D] text-blue-200 border-[#1E3A8A]',
        filterBar: 'bg-[#0A1329] border-[#1E3A8A]',
        filterActive: 'bg-blue-600 text-white shadow-sm',
        filterInactive: 'bg-[#13234A] text-blue-200 hover:text-white border border-[#1E3A8A]',
        readAllBtn: 'bg-[#13234A] hover:bg-[#182C5D] text-cyan-300 border-[#1E3A8A]',
        itemCard: 'bg-[#13234A] hover:bg-[#182C5D] border-[#1E3A8A] hover:border-cyan-400/50',
        itemTitle: 'text-white group-hover:text-cyan-300',
        itemBody: 'text-blue-200/80',
        itemFooter: 'border-[#1E3A8A] text-cyan-400',
        itemBrand: 'text-blue-400/60',
        emptyBox: 'bg-[#13234A] border-[#1E3A8A] text-cyan-400',
        emptyTitle: 'text-white',
        emptySub: 'text-blue-200/70',
        footer: 'border-[#1E3A8A] bg-[#0A1329]/95',
        footerText: 'text-blue-300/70',
        footerBtn: 'bg-blue-600 hover:bg-blue-500 text-white shadow-sm',
      };
    }
    if (isPink) {
      return {
        container: 'bg-[#fdf2f8] border-[#fbcfe8] text-[#500724]',
        header: 'bg-[#fce7f3]/90 border-[#fbcfe8]',
        iconBox: 'bg-rose-100 border-rose-200 text-rose-600',
        countBadge: 'bg-rose-500/20 text-rose-600 border border-rose-300',
        closeBtn: 'bg-rose-100 hover:bg-rose-200 text-rose-700 border-rose-200',
        filterBar: 'bg-[#fce7f3]/60 border-[#fbcfe8]',
        filterActive: 'bg-rose-500 text-white shadow-sm',
        filterInactive: 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200',
        readAllBtn: 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200',
        itemCard: 'bg-white hover:bg-rose-50/50 border-rose-200/80 hover:border-rose-300',
        itemTitle: 'text-[#500724] group-hover:text-rose-600',
        itemBody: 'text-[#831843]',
        itemFooter: 'border-rose-100 text-rose-600',
        itemBrand: 'text-rose-400',
        emptyBox: 'bg-rose-100 border-rose-200 text-rose-600',
        emptyTitle: 'text-[#500724]',
        emptySub: 'text-rose-700/70',
        footer: 'border-rose-200 bg-[#fce7f3]/90',
        footerText: 'text-rose-700/70',
        footerBtn: 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm',
      };
    }
    if (isCute) {
      return {
        container: 'bg-[#FDF8EB] border-[#F2E8CF] text-[#42332B]',
        header: 'bg-[#FAF1D6]/90 border-[#EADBB7]',
        iconBox: 'bg-[#F7E7BE] border-[#EADBB7] text-[#93542B]',
        countBadge: 'bg-[#F3D5A5] text-[#7A3F18]',
        closeBtn: 'bg-[#F7E7BE] hover:bg-[#EED8A7] text-[#5C4538] border-[#E8D4A4]',
        filterBar: 'bg-[#F9EDCF] border-[#EADBB7]',
        filterActive: 'bg-[#D97736] text-white shadow-sm',
        filterInactive: 'bg-[#FDF8EE] text-[#7A6456] hover:text-[#42332B] border border-[#ECD9B0]',
        readAllBtn: 'bg-[#FDF8EE] hover:bg-[#F7E7BE] text-[#93542B] border-[#ECD9B0]',
        itemCard: 'bg-[#FFFDF7] hover:bg-[#FDF5E2] border-[#F0E4C3] hover:border-[#DFC896]',
        itemTitle: 'text-[#42332B] group-hover:text-[#D97736]',
        itemBody: 'text-[#6E5B4F]',
        itemFooter: 'border-[#F2E8CF] text-[#93542B]',
        itemBrand: 'text-[#A08B7A]',
        emptyBox: 'bg-[#F7E7BE] border-[#EADBB7] text-[#93542B]',
        emptyTitle: 'text-[#42332B]',
        emptySub: 'text-[#7A6456]',
        footer: 'border-[#F2E8CF] bg-[#FAF1D6]/90',
        footerText: 'text-[#7A6456]',
        footerBtn: 'bg-[#D97736] hover:bg-[#BF6326] text-white shadow-sm',
      };
    }
    if (isLight) {
      return {
        container: 'bg-white border-slate-200 text-slate-900',
        header: 'bg-slate-50/95 border-slate-200',
        iconBox: 'bg-indigo-50 border-indigo-100 text-indigo-600',
        countBadge: 'bg-indigo-100 text-indigo-700',
        closeBtn: 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200',
        filterBar: 'bg-slate-50 border-slate-200',
        filterActive: 'bg-indigo-600 text-white shadow-sm',
        filterInactive: 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200',
        readAllBtn: 'bg-white hover:bg-slate-100 text-indigo-600 border-slate-200',
        itemCard: 'bg-white hover:bg-indigo-50/40 border-slate-200 hover:border-indigo-200',
        itemTitle: 'text-slate-900 group-hover:text-indigo-600',
        itemBody: 'text-slate-600',
        itemFooter: 'border-slate-100 text-indigo-600',
        itemBrand: 'text-slate-400',
        emptyBox: 'bg-indigo-50 border-indigo-100 text-indigo-600',
        emptyTitle: 'text-slate-900',
        emptySub: 'text-slate-500',
        footer: 'border-slate-200 bg-slate-50/95',
        footerText: 'text-slate-500',
        footerBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm',
      };
    }

    // Default Dark / Slate Theme
    return {
      container: 'bg-slate-900 border-slate-800 text-slate-100',
      header: 'bg-slate-950/95 border-slate-800',
      iconBox: 'bg-slate-800 border-slate-700 text-indigo-400',
      countBadge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      closeBtn: 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700',
      filterBar: 'bg-slate-950 border-slate-800',
      filterActive: 'bg-indigo-600 text-white shadow-sm',
      filterInactive: 'bg-slate-850 text-slate-300 hover:text-white border border-slate-750',
      readAllBtn: 'bg-slate-850 hover:bg-slate-800 text-indigo-300 border-slate-700',
      itemCard: 'bg-slate-850 hover:bg-slate-800 border-slate-750/80 hover:border-indigo-500/40',
      itemTitle: 'text-slate-100 group-hover:text-indigo-300',
      itemBody: 'text-slate-300/80',
      itemFooter: 'border-slate-750 text-indigo-400',
      itemBrand: 'text-slate-500',
      emptyBox: 'bg-slate-800 border-slate-700 text-indigo-400',
      emptyTitle: 'text-slate-100',
      emptySub: 'text-slate-400',
      footer: 'border-slate-800 bg-slate-950/95',
      footerText: 'text-slate-400',
      footerBtn: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm',
    };
  };

  const ms = getModalStyles();

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-3 sm:p-4" 
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.95, y: 15, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className={`rounded-[2rem] w-full max-w-md flex flex-col max-h-[85vh] shadow-2xl relative overflow-hidden border ${ms.container}`} 
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`p-5 border-b flex items-center justify-between relative z-10 shrink-0 ${ms.header}`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center relative shrink-0 ${ms.iconBox}`}>
                {isOrganic ? <Icon3DBell size={24} /> : <Bell className="w-5 h-5" />}
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-rose-500 ring-2 ring-current animate-pulse" />
                )}
              </div>
              <div>
                <h3 className="text-base font-extrabold tracking-tight flex items-center gap-2">
                  {lang === 'id' ? 'Pemberitahuan & Perubahan' : 'Notifications & Updates'}
                  {notifications.length > 0 && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ms.countBadge}`}>
                      {notifications.length}
                    </span>
                  )}
                </h3>
                <p className="text-xs font-medium opacity-80">
                  {notifications.length > 0
                    ? (lang === 'id' ? 'Deteksi perubahan tugas, pembayaran & sistem' : 'Detected changes in tasks, payment & system')
                    : (lang === 'id' ? 'Semua status terkini sudah terbaca' : 'All recent notifications are up to date')}
                </p>
              </div>
            </div>

            <button 
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className={`p-2 rounded-xl transition-all cursor-pointer shrink-0 border active:scale-95 touch-manipulation ${ms.closeBtn}`}
              title={t('close') || 'Tutup'}
            >
              {isOrganic ? <Icon3DClose size={18} /> : <X className="w-4 h-4" />}
            </button>
          </div>

          {/* Filter Bar & Clear All */}
          {notifications.length > 0 && (
            <div className={`px-4 py-2.5 border-b flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0 ${ms.filterBar}`}>
              <div className="flex items-center gap-1.5 shrink-0">
                {[
                  { id: 'all', label: lang === 'id' ? 'Semua' : 'All' },
                  { id: 'payment', label: lang === 'id' ? 'Pembayaran' : 'Payment' },
                  { id: 'task', label: lang === 'id' ? 'Tugas' : 'Tasks' },
                  { id: 'finance', label: lang === 'id' ? 'Keuangan' : 'Finance' },
                  { id: 'note', label: lang === 'id' ? 'Catatan' : 'Notes' },
                  { id: 'update', label: lang === 'id' ? 'Sistem' : 'System' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      triggerHaptic('light');
                      setFilterType(tab.id as any);
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap active:scale-95 touch-manipulation select-none ${
                      filterType === tab.id ? ms.filterActive : ms.filterInactive
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleMarkAllRead}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer shrink-0 border active:scale-95 touch-manipulation select-none ${ms.readAllBtn}`}
                title={lang === 'id' ? 'Tandai Semua Dibaca' : 'Mark All Read'}
              >
                {isOrganic ? <Icon3DTaskChecked size={14} className="shrink-0" /> : <CheckCheck className="w-3.5 h-3.5" />}
                <span>{lang === 'id' ? 'Tandai Dibaca' : 'Mark Read'}</span>
              </button>
            </div>
          )}

          {/* List Content */}
          <div ref={notifScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
            {filteredNotifs.length > 0 ? (
              filteredNotifs.map(item => {
                const badge = getItemBadge(item);
                const isHighPriority = item.priority === 'high';

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    onClick={() => handleItemClick(item)}
                    className={`group relative rounded-2xl p-3.5 flex flex-col gap-2 transition-all cursor-pointer shadow-sm active:scale-[0.99] border ${ms.itemCard}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[11px] font-bold shrink-0 ${badge.bg}`}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>

                        {isHighPriority && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-500 text-[10px] font-extrabold uppercase tracking-wider shrink-0 animate-pulse">
                            {isOrganic ? <Icon3DWarning size={13} className="shrink-0" /> : <AlertCircle className="w-3 h-3" />}
                            {lang === 'id' ? 'Penting' : 'Urgent'}
                          </span>
                        )}

                        {item.timeFormatted && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold shrink-0 opacity-75">
                            {isOrganic ? <Icon3DClock size={12} className="shrink-0" /> : <Clock className="w-3 h-3" />}
                            {item.timeFormatted}
                          </span>
                        )}
                      </div>

                      {/* Dismiss / Mark Read Button */}
                      <button
                        onClick={(e) => handleDismiss(e, item.id)}
                        className="p-1 rounded-lg border border-transparent hover:border-current opacity-60 hover:opacity-100 transition-all cursor-pointer shrink-0"
                        title={lang === 'id' ? 'Tandai Dibaca' : 'Mark Read'}
                      >
                        {isOrganic ? <Icon3DTaskChecked size={16} className="shrink-0" /> : <Check className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="min-w-0 pr-4">
                      <h4 className={`text-sm font-bold tracking-tight leading-snug transition-colors ${ms.itemTitle}`}>
                        {item.title}
                      </h4>
                      <p className={`text-xs mt-1 leading-relaxed ${ms.itemBody}`}>
                        {item.body}
                      </p>
                    </div>

                    <div className={`flex items-center justify-between text-[11px] font-bold pt-1 border-t mt-1 ${ms.itemFooter}`}>
                      <span className="flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        {lang === 'id' ? 'Ketuk untuk membuka rincian' : 'Tap to open details'}
                        {isOrganic ? <Icon3DChevronRight size={13} className="shrink-0" /> : <ChevronRight className="w-3 h-3" />}
                      </span>
                      <span className={`${ms.itemBrand} font-normal`}>Tata</span>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                <div className={`w-16 h-16 rounded-3xl border flex items-center justify-center mb-4 shadow-inner ${ms.emptyBox}`}>
                  {isOrganic ? <Icon3DBell size={42} /> : <Bell className="w-8 h-8 opacity-60" />}
                </div>
                <h4 className={`text-base font-extrabold mb-1 ${ms.emptyTitle}`}>
                  {filterType !== 'all'
                    ? (lang === 'id' ? 'Tidak Ada Notifikasi Kategori Ini' : 'No Notifications in this Category')
                    : (t('noNotification') || (lang === 'id' ? 'Semua Notifikasi Terbaca' : 'No New Notifications'))}
                </h4>
                <p className={`text-xs max-w-xs leading-relaxed ${ms.emptySub}`}>
                  {lang === 'id' 
                    ? 'Lonceng Tata akan otomatis mendeteksi jika ada tugas baru, perubahan pembayaran, tagihan hutang, atau pembaruan sistem.' 
                    : 'Tata\'s notification bell automatically detects upcoming tasks, pending payments, bills, and system updates.'}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`p-4 border-t flex items-center justify-between gap-3 shrink-0 ${ms.footer}`}>
            <span className={`text-xs font-medium ${ms.footerText}`}>
              {lang === 'id' ? 'Deteksi otomatis & terkelola' : 'Auto-detected alerts'}
            </span>
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation select-none ${ms.footerBtn}`}
            >
              {t('close') || 'Tutup'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

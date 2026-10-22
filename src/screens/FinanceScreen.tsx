import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '../store';
import { useTranslation } from '../translations';
import { ScreenItem } from '../App';
import { 
  Plus, Minus, ArrowUpRight, ArrowDownRight, Wallet, ArrowLeft, 
  Trash2, Search, X, Target, Edit2, AlertTriangle, 
  PieChart as PieChartIcon, ChevronLeft, ChevronRight, ChevronDown, TrendingUp, PiggyBank, Receipt,
  HelpCircle, BookOpen, Bot, CheckCircle2, Info, CreditCard, Clock, Calendar, Check, Zap, List,
  Eye, EyeOff, Download, Printer, ArrowUpDown, FileSpreadsheet, Landmark, FileText, ShieldCheck,
  Percent, Coins, Building2, Calculator, ChevronUp
} from 'lucide-react';
import { Transaction, DebtItem, SavingsGoal } from '../types';
import { generateId } from '../utils';
import { getOrganicThemePalette } from '../components/home/organicThemePalettes';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import {
  Icon3DWallet, Icon3DIncome, Icon3DExpense, Icon3DPiggy, Icon3DTarget,
  Icon3DChartPie, Icon3DReceipt, Icon3DCreditCard, Icon3DBank, Icon3DCoins,
  Icon3DTrash, Icon3DShield
} from '../components/home/Organic3DIcons';

export const isDebtCategory = (cat: string) => {
  const c = (cat || '').toLowerCase().trim();
  return c.includes('hutang') || c.includes('utang') || c.includes('debt') || c.includes('cicilan') || c.includes('pinjam');
};

export const expenseCategoriesList = ['Food', 'Transport', 'Bills', 'Investment', 'Health', 'Education', 'Entertainment', 'Pocket Money', 'Savings', 'Debt Payment', 'Other'];
export const incomeCategoriesList = ['Salary', 'Freelance', 'Investment', 'Gift', 'Savings', 'Debt Received', 'Other'];

export const translateCategory = (cat: string, lang: 'id' | 'en') => {
  if (lang === 'en') {
    if (cat === 'Makan') return 'Food';
    if (cat === 'Transportasi') return 'Transport';
    if (cat === 'Tagihan') return 'Bills';
    if (cat === 'Investasi') return 'Investment';
    if (cat === 'Kesehatan') return 'Health';
    if (cat === 'Pendidikan') return 'Education';
    if (cat === 'Hiburan') return 'Entertainment';
    if (cat === 'Uang Jajan') return 'Pocket Money';
    if (cat === 'Gaji') return 'Salary';
    if (cat === 'Sambilan') return 'Freelance';
    if (cat === 'Hadiah') return 'Gift';
    if (cat === 'Tabungan') return 'Savings';
    if (cat === 'Bayar Hutang' || cat === 'Debt Payment') return 'Debt Payment';
    if (cat === 'Pinjaman / Hutang Baru' || cat === 'Pinjaman' || cat === 'Debt Received') return 'Debt Received';
    if (cat === 'Lainnya') return 'Other';
    return cat;
  }
  const map: Record<string, string> = {
    'Food': 'Makan',
    'Transport': 'Transportasi',
    'Bills': 'Tagihan',
    'Investment': 'Investasi',
    'Health': 'Kesehatan',
    'Education': 'Pendidikan',
    'Entertainment': 'Hiburan',
    'Pocket Money': 'Uang Jajan',
    'Salary': 'Gaji',
    'Freelance': 'Sambilan',
    'Gift': 'Hadiah',
    'Savings': 'Tabungan',
    'Debt Payment': 'Bayar Hutang',
    'Debt Received': 'Pinjaman / Hutang Baru',
    'Other': 'Lainnya'
  };
  return map[cat] || cat;
};

export const getCategoryEmoji = (cat: string): string => {
  const c = cat.toLowerCase();
  if (c.includes('food') || c.includes('makan')) return '🍔';
  if (c.includes('transport')) return '🚗';
  if (c.includes('bill') || c.includes('tagihan')) return '⚡';
  if (c.includes('invest')) return '📈';
  if (c.includes('health') || c.includes('sehat')) return '🏥';
  if (c.includes('educat') || c.includes('didik')) return '🎓';
  if (c.includes('entertain') || c.includes('hiburan')) return '🎮';
  if (c.includes('pocket') || c.includes('jajan')) return '🛍️';
  if (c.includes('salar') || c.includes('gaji')) return '💼';
  if (c.includes('free') || c.includes('sambilan')) return '💻';
  if (c.includes('gift') || c.includes('hadiah')) return '🎁';
  if (c.includes('saving') || c.includes('tabung')) return '🐷';
  if (c.includes('debt') || c.includes('hutang') || c.includes('utang') || c.includes('pinjam') || c.includes('cicilan')) return '💳';
  return '📌';
};

// Helper to format currency numbers cleanly
export const formatCurrency = (amount: number, currency: 'IDR' | 'USD' = 'IDR') => {
  if (isNaN(amount)) return currency === 'USD' ? '$0' : 'Rp 0';
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US')}`;
  }
  return `Rp ${Math.round(amount).toLocaleString('id-ID')}`;
};

export function QuickAmountRow({
  currentVal,
  onUpdate,
  currency = 'IDR',
  isLight = false
}: {
  currentVal: string;
  onUpdate: (newVal: string) => void;
  currency?: 'IDR' | 'USD';
  isLight?: boolean;
}) {
  const handleAppend000 = () => {
    const clean = currentVal.replace(/[^0-9]/g, '');
    if (!clean) {
      onUpdate('1000');
    } else {
      onUpdate(clean + '000');
    }
  };

  const handleSetPreset = (num: number) => {
    onUpdate(num.toString());
  };

  const presetBtnClass = `px-2.5 py-1 rounded-lg font-semibold text-xs shrink-0 transition-colors cursor-pointer border ${
    isLight 
      ? 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200/80 border-slate-200' 
      : 'bg-slate-800 text-slate-300 hover:text-slate-100 border-slate-700/60'
  }`;

  if (currency === 'USD') {
    return (
      <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          type="button"
          onClick={handleAppend000}
          className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-black text-xs border border-indigo-500/30 shrink-0 transition-colors cursor-pointer"
          title="Add 000"
        >
          +000
        </button>
        <button type="button" onClick={() => handleSetPreset(10)} className={presetBtnClass}>$10</button>
        <button type="button" onClick={() => handleSetPreset(50)} className={presetBtnClass}>$50</button>
        <button type="button" onClick={() => handleSetPreset(100)} className={presetBtnClass}>$100</button>
        <button type="button" onClick={() => handleSetPreset(500)} className={presetBtnClass}>$500</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
      <button
        type="button"
        onClick={handleAppend000}
        className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-black text-xs border border-indigo-500/30 shrink-0 transition-colors cursor-pointer"
        title="Tambah .000 (Ribuan)"
      >
        +000
      </button>
      <button
        type="button"
        onClick={() => handleSetPreset(10000)}
        className={presetBtnClass}
      >
        10rb
      </button>
      <button
        type="button"
        onClick={() => handleSetPreset(20000)}
        className={presetBtnClass}
      >
        20rb
      </button>
      <button
        type="button"
        onClick={() => handleSetPreset(50000)}
        className={presetBtnClass}
      >
        50rb
      </button>
      <button
        type="button"
        onClick={() => handleSetPreset(100000)}
        className={presetBtnClass}
      >
        100rb
      </button>
      <button
        type="button"
        onClick={() => handleSetPreset(500000)}
        className={presetBtnClass}
      >
        500rb
      </button>
      <button
        type="button"
        onClick={() => handleSetPreset(1000000)}
        className={presetBtnClass}
      >
        1jt
      </button>
    </div>
  );
}

export function terbilangRupiah(num: number): string {
  if (isNaN(num) || num <= 0) return '';
  const n = Math.floor(num);
  if (n === 0) return 'Nol Rupiah';

  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

  function baca(x: number): string {
    if (x < 12) return satuan[x];
    if (x < 20) return baca(x - 10) + ' Belas';
    if (x < 100) return baca(Math.floor(x / 10)) + ' Puluh ' + satuan[x % 10];
    if (x < 200) return 'Seratus ' + baca(x - 100);
    if (x < 1000) return baca(Math.floor(x / 100)) + ' Ratus ' + baca(x % 100);
    if (x < 2000) return 'Seribu ' + baca(x - 1000);
    if (x < 1000000) return baca(Math.floor(x / 1000)) + ' Ribu ' + baca(x % 1000);
    if (x < 1000000000) return baca(Math.floor(x / 1000000)) + ' Juta ' + baca(x % 1000000);
    if (x < 1000000000000) return baca(Math.floor(x / 1000000000)) + ' Miliar ' + baca(x % 1000000000);
    return x.toString();
  }

  const str = baca(n).replace(/\s+/g, ' ').trim();
  return str ? `${str} Rupiah` : '';
}

export function parseRawAmount(rawVal: string, currency: 'IDR' | 'USD' = 'IDR'): number {
  if (!rawVal) return 0;
  if (currency === 'IDR') {
    const digitsOnly = rawVal.replace(/[^0-9]/g, '');
    const num = parseInt(digitsOnly, 10);
    return isNaN(num) ? 0 : num;
  } else {
    const cleanStr = rawVal.replace(/,/g, '').replace(/[^0-9.]/g, '');
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
  }
}

export function AmountPreviewHelper({
  rawVal,
  onUpdateValue,
  currency = 'IDR'
}: {
  rawVal: string;
  onUpdateValue?: (newVal: string) => void;
  currency?: 'IDR' | 'USD';
}) {
  const cleanNum = parseRawAmount(rawVal, currency);
  if (cleanNum <= 0) return null;

  const isSmallRupiah = currency === 'IDR' && cleanNum < 1000;
  const suggestedRupiah = cleanNum * 1000;
  const terbilangCurr = currency === 'IDR' ? terbilangRupiah(cleanNum) : '';
  const terbilangSugg = currency === 'IDR' && isSmallRupiah ? terbilangRupiah(suggestedRupiah) : '';

  return (
    <div className="mt-2.5 p-3 rounded-2xl bg-slate-900 border border-indigo-500/30 text-xs space-y-1.5 shadow-md">
      <div className="flex items-center justify-between text-slate-200 font-bold">
        <span className="text-indigo-300 text-[11px] uppercase tracking-wider">Nilai Nominal:</span>
        <span className="text-emerald-400 text-sm font-black">
          {formatCurrency(cleanNum, currency)}
        </span>
      </div>

      {currency === 'IDR' && terbilangCurr && (
        <p className="text-[11px] text-slate-300 font-medium italic border-t border-slate-800 pt-1.5">
          &quot;{terbilangCurr}&quot;
        </p>
      )}

      {isSmallRupiah && onUpdateValue && (
        <div className="mt-1 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
          <p className="text-[11px] text-amber-300 font-semibold leading-snug">
            💡 Maksud Anda <span className="text-white font-bold">{formatCurrency(suggestedRupiah)}</span> ({terbilangSugg})?
          </p>
          <button
            type="button"
            onClick={() => onUpdateValue(suggestedRupiah.toString())}
            className="self-start px-3 py-1 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-lg text-xs transition-colors cursor-pointer shadow-sm active:scale-95"
          >
            Ubah ke {formatCurrency(suggestedRupiah)}
          </button>
        </div>
      )}
    </div>
  );
}

export const getInstrumentInfo = (type?: string, lang: 'id' | 'en' = 'id') => {
  switch (type) {
    case 'deposito':
      return { 
        label: lang === 'id' ? 'Deposito Berjangka' : 'Term Deposit', 
        icon: '🏦', 
        defaultTax: 20, 
        badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' 
      };
    case 'reksadana':
      return { 
        label: lang === 'id' ? 'Reksadana' : 'Mutual Fund', 
        icon: '📈', 
        defaultTax: 0, 
        badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' 
      };
    case 'obligasi':
      return { 
        label: lang === 'id' ? 'Obligasi / SBN' : 'Bonds / SBN', 
        icon: '📜', 
        defaultTax: 10, 
        badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30' 
      };
    case 'emas':
      return { 
        label: lang === 'id' ? 'Emas / Logam Mulia' : 'Gold Savings', 
        icon: '🪙', 
        defaultTax: 0, 
        badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' 
      };
    case 'p2p':
      return { 
        label: lang === 'id' ? 'P2P / Sukuk' : 'P2P Lending', 
        icon: '🤝', 
        defaultTax: 15, 
        badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' 
      };
    case 'cash':
      return { 
        label: lang === 'id' ? 'Kas / Celengan' : 'Cash / Physical', 
        icon: '💵', 
        defaultTax: 0, 
        badgeClass: 'bg-slate-800 text-slate-300 border-slate-700/60' 
      };
    case 'bank':
    default:
      return { 
        label: lang === 'id' ? 'Tabungan Bank' : 'Bank Savings', 
        icon: '🏛️', 
        defaultTax: 20, 
        badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' 
      };
  }
};

export const calculateGoalYield = (
  principal: number,
  interestRate: number = 0,
  taxRate: number = 20,
  targetDateStr?: string,
  isCompound: boolean = false
) => {
  if (interestRate <= 0 || principal <= 0) {
    return {
      hasYield: false,
      annualGross: 0,
      annualNet: 0,
      monthlyGross: 0,
      monthlyNet: 0,
      dailyNet: 0,
      taxAmountAnnual: 0,
      projectedAtTarget: principal,
      projectedYieldAtTarget: 0,
      monthsToTarget: 0,
      daysToTarget: 0
    };
  }

  const effectiveTax = Math.max(0, Math.min(100, taxRate));
  const taxFactor = (100 - effectiveTax) / 100;
  const annualGross = principal * (interestRate / 100);
  const annualNet = annualGross * taxFactor;
  const monthlyGross = annualGross / 12;
  const monthlyNet = annualNet / 12;
  const dailyNet = annualNet / 365;
  const taxAmountAnnual = annualGross * (effectiveTax / 100);

  let monthsToTarget = 0;
  let daysToTarget = 0;
  let projectedYieldAtTarget = 0;

  if (targetDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(targetDateStr);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    if (diffTime > 0) {
      daysToTarget = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      monthsToTarget = +(daysToTarget / 30.4375).toFixed(1);

      if (isCompound) {
        const monthlyEffRate = (interestRate / 100 * taxFactor) / 12;
        projectedYieldAtTarget = principal * (Math.pow(1 + monthlyEffRate, monthsToTarget) - 1);
      } else {
        projectedYieldAtTarget = dailyNet * daysToTarget;
      }
    }
  }

  return {
    hasYield: true,
    annualGross,
    annualNet,
    monthlyGross,
    monthlyNet,
    dailyNet,
    taxAmountAnnual,
    projectedAtTarget: principal + projectedYieldAtTarget,
    projectedYieldAtTarget,
    monthsToTarget,
    daysToTarget
  };
};

export default function FinanceScreen({ appTheme, onBack, onNavigate, extra }: { appTheme: string; onBack: () => void; onNavigate?: (screen: ScreenItem, extra?: any) => void; extra?: any }) {
  const { 
    transactions, 
    addTransaction, 
    updateTransaction, 
    deleteTransaction, 
    clearAllTransactions, 
    lang, 
    savingsTarget, 
    setSavingsTarget, 
    savingsTargetTitle, 
    setSavingsTargetTitle, 
    setSavingsBalance,
    savingsGoals = [],
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    depositToSavingsGoal,
    withdrawFromSavingsGoal,
    clearAllSavingsGoals,
    initialDebt,
    setInitialDebt,
    debts = [],
    addDebt,
    updateDebt,
    deleteDebt,
    clearAllDebtData,
    payDebtInstallment,
    user,
    updateUser,
    appVersion,
    isLiteMode
  } = useAppStore();

  const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : null;
  const effectiveTheme = appTheme || storedTheme || 'dark';

  const palette = useMemo(() => {
    return getOrganicThemePalette(effectiveTheme);
  }, [effectiveTheme]);

  const isLite = effectiveTheme === 'lite' || appVersion === 'lite' || isLiteMode;
  const isOrganic = !isLite && ['organic', 'pro_max', 'cute', 'warm'].includes(effectiveTheme);
  const is3D = !isLite && (appVersion === 'organic' || appVersion === 'pro_max');
  const isLight = !palette.isDark && effectiveTheme !== 'wallpaper';
  const isCute = effectiveTheme === 'cute' || effectiveTheme === 'organic' || effectiveTheme === 'warm';
  const isPink = effectiveTheme === 'pink';
  const isSimple = effectiveTheme === 'simple';
  const isCool = effectiveTheme === 'cool';

  const themeCardBg = effectiveTheme === 'wallpaper'
    ? 'bg-slate-950/70 border-white/10 text-white backdrop-blur-xl'
    : isLight
      ? (isCute
          ? 'bg-[#FAF5EA] border-[#EADCC8] text-[#2B1E14] shadow-xs'
          : isPink
            ? 'bg-[#FFF0F5] border-pink-200 text-[#500724] shadow-xs'
            : 'bg-white border-slate-200 text-slate-900 shadow-xs')
      : isSimple
        ? 'bg-[#1C1B17] border-stone-800 text-stone-100 shadow-sm'
        : isCool
          ? 'bg-[#0D1836] border-[#1E3A8A]/70 text-slate-100 shadow-sm'
          : 'bg-slate-900 border-slate-800/80 text-slate-100 shadow-sm';

  const themeInnerCardBg = effectiveTheme === 'wallpaper'
    ? 'bg-slate-900/60 border-white/10 text-white'
    : isLight
      ? (isCute
          ? 'bg-[#F2E7D5]/70 border-[#EADCC8] text-[#2B1E14]'
          : isPink
            ? 'bg-[#FCE7F3]/70 border-pink-200 text-[#500724]'
            : 'bg-slate-50 border-slate-200 text-slate-900')
      : isSimple
        ? 'bg-[#26241F] border-stone-800 text-stone-100'
        : isCool
          ? 'bg-[#13234A] border-[#1E3A8A] text-slate-100'
          : 'bg-slate-950/60 border-slate-800/80 text-slate-100';

  const themeInputBg = effectiveTheme === 'wallpaper'
    ? 'bg-slate-900/80 border-white/20 text-white placeholder-slate-400 focus:border-indigo-400'
    : isLight
      ? (isCute
          ? 'bg-white border-[#EADCC8] text-[#2B1E14] placeholder-[#A08E7D] focus:border-amber-500'
          : isPink
            ? 'bg-white border-pink-200 text-[#500724] placeholder-pink-300 focus:border-pink-400'
            : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500')
      : isSimple
        ? 'bg-[#141310] border-stone-800 text-stone-100 placeholder-stone-500 focus:border-emerald-500'
        : isCool
          ? 'bg-[#0A1329] border-[#1E3A8A] text-white placeholder-blue-300/50 focus:border-cyan-400'
          : 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500/50';

  const themeSubText = effectiveTheme === 'wallpaper'
    ? 'text-slate-300'
    : isLight
      ? (isCute
          ? 'text-[#7D6A58]'
          : isPink
            ? 'text-[#9D3C65]'
            : 'text-slate-500')
      : isSimple
        ? 'text-stone-400'
        : isCool
          ? 'text-blue-200/80'
          : 'text-slate-400';

  const themePrimaryText = effectiveTheme === 'wallpaper'
    ? 'text-white'
    : isLight
      ? (isCute
          ? 'text-[#2B1E14]'
          : isPink
            ? 'text-[#500724]'
            : 'text-slate-900')
      : isSimple
        ? 'text-stone-100'
        : isCool
          ? 'text-white'
          : 'text-slate-100';

  const themeBorder = isLight 
    ? (isCute ? 'border-[#EADCC8]' : isPink ? 'border-pink-200' : 'border-slate-200')
    : isSimple
      ? 'border-stone-800'
      : isCool
        ? 'border-[#1E3A8A]'
        : 'border-slate-800';

  const themeTabContainer = effectiveTheme === 'wallpaper'
    ? 'bg-slate-950/60 border-white/10'
    : isLight
      ? (isCute
          ? 'bg-[#EFE5D2] border-[#EADCC8]'
          : isPink
            ? 'bg-pink-100/70 border-pink-200'
            : 'bg-slate-100 border-slate-200')
      : isSimple
        ? 'bg-[#161412] border-stone-800'
        : isCool
          ? 'bg-[#0E1A38] border-[#1D3268]'
          : 'bg-slate-900 border-slate-800';

  const themeBtnSecondary = isLight
    ? (isCute
        ? 'bg-[#FAF5EA] hover:bg-[#F2E7D5] text-[#2B1E14] border-[#EADCC8]'
        : isPink
          ? 'bg-[#FFF0F5] hover:bg-[#FCE7F3] text-[#500724] border-pink-200'
          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200')
    : isSimple
      ? 'bg-[#26241F] hover:bg-[#322F29] text-stone-200 border-stone-800'
      : isCool
        ? 'bg-[#13234A] hover:bg-[#182C5D] text-blue-200 border-[#1E3A8A]'
        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/60';

  const themeModalBg = effectiveTheme === 'wallpaper'
    ? 'bg-slate-950/95 border-white/20 text-white backdrop-blur-2xl shadow-2xl'
    : isLight
      ? (isCute
          ? 'bg-[#FAF5EA] border-[#EADCC8] text-[#2B1E14] shadow-2xl'
          : isPink
            ? 'bg-[#FFF0F5] border-pink-200 text-[#500724] shadow-2xl'
            : 'bg-white border-slate-200 text-slate-900 shadow-2xl')
      : isSimple
        ? 'bg-[#1C1B17] border-stone-800 text-stone-100 shadow-2xl'
        : isCool
          ? 'bg-[#0D1836] border-[#1E3A8A] text-slate-100 shadow-2xl'
          : 'bg-slate-900 border-slate-800 text-slate-100 shadow-2xl';

  const themeModalHeader = effectiveTheme === 'wallpaper'
    ? 'bg-slate-950/80 border-white/10'
    : isLight
      ? (isCute
          ? 'bg-[#F2E7D5] border-[#EADCC8]'
          : isPink
            ? 'bg-[#FCE7F3] border-pink-200'
            : 'bg-slate-50 border-slate-200')
      : isSimple
        ? 'bg-[#161412] border-stone-800'
        : isCool
          ? 'bg-[#0A1329] border-[#1E3A8A]'
          : 'bg-slate-900 border-slate-800';

  const t = useTranslation(lang);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showFinanceToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Screen Tab View state: 'transactions' | 'savings' | 'debts' | 'analytics'
  const [activeTab, setActiveTab] = useState<'transactions' | 'savings' | 'debts' | 'analytics'>('transactions');
  const financeScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (financeScrollRef.current) {
      financeScrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Separate Balance Visibility States (Eye toggle buttons for privacy)
  const [hideMainBalance, setHideMainBalance] = useState(() => localStorage.getItem('tata_hide_main_balance') === 'true');
  const [hideSavingsBalance, setHideSavingsBalance] = useState(() => localStorage.getItem('tata_hide_savings_balance') === 'true');
  const [hideTotalNetBalance, setHideTotalNetBalance] = useState(() => localStorage.getItem('tata_hide_total_net_balance') === 'true');
  const [hideDebtBalance, setHideDebtBalance] = useState(() => localStorage.getItem('tata_hide_debt_balance') === 'true');

  useEffect(() => {
    localStorage.setItem('tata_hide_main_balance', String(hideMainBalance));
  }, [hideMainBalance]);
  useEffect(() => {
    localStorage.setItem('tata_hide_savings_balance', String(hideSavingsBalance));
  }, [hideSavingsBalance]);
  useEffect(() => {
    localStorage.setItem('tata_hide_total_net_balance', String(hideTotalNetBalance));
  }, [hideTotalNetBalance]);
  useEffect(() => {
    localStorage.setItem('tata_hide_debt_balance', String(hideDebtBalance));
  }, [hideDebtBalance]);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddModalDetails, setShowAddModalDetails] = useState(false);

  useEffect(() => {
    if (extra?.openAddModal) {
      setShowAddModal(true);
    }
  }, [extra]);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showClearTargetConfirm, setShowClearTargetConfirm] = useState(false);
  const [showSavingsDepositModal, setShowSavingsDepositModal] = useState(false);
  const [showSavingsWithdrawModal, setShowSavingsWithdrawModal] = useState(false);
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showTutorialModal, setShowTutorialModal] = useState(false);
  const [showTutorialBanner, setShowTutorialBanner] = useState(() => {
    return localStorage.getItem('tata_hide_finance_tutorial') !== 'true';
  });

  // Multiple Savings Goals Modals & States
  const [savingsViewMode, setSavingsViewMode] = useState<'simple' | 'detail'>(() => {
    return (localStorage.getItem('tata_savings_view_mode') as 'simple' | 'detail') || 'simple';
  });
  const [savingsStatusFilter, setSavingsStatusFilter] = useState<'all' | 'active' | 'achieved'>('all');
  const [showSavingsGoalModal, setShowSavingsGoalModal] = useState(false);
  const [goalFormMode, setGoalFormMode] = useState<'simple' | 'detail'>('simple');
  const [editingSavingsGoal, setEditingSavingsGoal] = useState<SavingsGoal | null>(null);
  const [goalFormTitle, setGoalFormTitle] = useState('');
  const [goalFormTargetAmount, setGoalFormTargetAmount] = useState('');
  const [goalFormInitialAmount, setGoalFormInitialAmount] = useState('');
  const [goalFormCategory, setGoalFormCategory] = useState('Lainnya');
  const [goalFormEmoji, setGoalFormEmoji] = useState('🎯');
  const [goalFormTargetDate, setGoalFormTargetDate] = useState('');
  const [goalFormNotes, setGoalFormNotes] = useState('');
  const [goalFormInstrumentType, setGoalFormInstrumentType] = useState<string>('bank');
  const [goalFormInstitutionName, setGoalFormInstitutionName] = useState<string>('');
  const [goalFormHasInterest, setGoalFormHasInterest] = useState<boolean>(false);
  const [goalFormInterestRate, setGoalFormInterestRate] = useState<string>('');
  const [goalFormTaxRate, setGoalFormTaxRate] = useState<string>('20');
  const [goalFormIsCompound, setGoalFormIsCompound] = useState<boolean>(false);
  const [expandedGoalYieldId, setExpandedGoalYieldId] = useState<string | null>(null);
  const [goalFormError, setGoalFormError] = useState('');
  const [showDeleteGoalConfirm, setShowDeleteGoalConfirm] = useState<string | null>(null);
  const [selectedGoalIdForAction, setSelectedGoalIdForAction] = useState<string>('');

  // Debt Modals & Form States
  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [debtFormMode, setDebtFormMode] = useState<'simple' | 'detail'>('simple');
  const [editingDebt, setEditingDebt] = useState<DebtItem | null>(null);
  const [debtFormTitle, setDebtFormTitle] = useState('');
  const [debtFormLender, setDebtFormLender] = useState('');
  const [debtFormTotalAmount, setDebtFormTotalAmount] = useState('');
  const [debtFormInstallmentCount, setDebtFormInstallmentCount] = useState('12');
  const [debtFormPaymentFrequency, setDebtFormPaymentFrequency] = useState<'monthly' | 'weekly' | 'custom'>('monthly');
  const [debtFormInstallmentAmount, setDebtFormInstallmentAmount] = useState('');
  const [debtFormDueDate, setDebtFormDueDate] = useState('');
  const [debtFormNotes, setDebtFormNotes] = useState('');
  const [debtFormError, setDebtFormError] = useState('');

  const [showPayInstallmentModal, setShowPayInstallmentModal] = useState(false);
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<DebtItem | null>(null);
  const [payInstallmentAmount, setPayInstallmentAmount] = useState('');
  const [payInstallmentDate, setPayInstallmentDate] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [payInstallmentNote, setPayInstallmentNote] = useState('');
  const [payInstallmentError, setPayInstallmentError] = useState('');

  const [showDeleteDebtConfirm, setShowDeleteDebtConfirm] = useState<string | null>(null);
  const [showResetDebtConfirm, setShowResetDebtConfirm] = useState(false);
  const [selectedLinkedDebtId, setSelectedLinkedDebtId] = useState<string>('');

  // Inputs state
  const [savingsDepositAmount, setSavingsDepositAmount] = useState('');
  const [savingsWithdrawAmount, setSavingsWithdrawAmount] = useState('');
  const [depositError, setDepositError] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [debtInputAmount, setDebtInputAmount] = useState('');
  const [targetInputAmount, setTargetInputAmount] = useState('');
  const [targetInputTitle, setTargetInputTitle] = useState('');

  // Time navigation state: 'all' or YYYY-MM
  const todayISO = useMemo(() => {
    const tzOffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => todayISO.substring(0, 7)); // 'YYYY-MM' or 'all'
  
  // Statement Account Owner & Account Details State
  const [accountOwnerName, setAccountOwnerName] = useState(() => {
    const saved = localStorage.getItem('tata_statement_owner');
    if (saved && saved.trim()) return saved;
    return user?.name && user.name.trim() ? user.name : 'Pengguna Tata';
  });

  const [accountNumber, setAccountNumber] = useState(() => {
    return localStorage.getItem('tata_statement_acc_no') || 'TATA-8820-9102-4411';
  });

  useEffect(() => {
    localStorage.setItem('tata_statement_owner', accountOwnerName);
  }, [accountOwnerName]);

  useEffect(() => {
    localStorage.setItem('tata_statement_acc_no', accountNumber);
  }, [accountNumber]);

  useEffect(() => {
    if (user?.name && (!localStorage.getItem('tata_statement_owner') || accountOwnerName === 'Pengguna Tata' || accountOwnerName === 'Pengguna')) {
      setAccountOwnerName(user.name);
    }
  }, [user?.name]);
  
  // Filter by Type
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense' | 'savings'>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Transaction Editing State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states for Add/Edit Modal
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'IDR' | 'USD'>('IDR');
  const [category, setCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [date, setDate] = useState(() => todayISO);
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTransactions, setShowAllTransactions] = useState(false);

  // Chart type toggle
  const [chartType, setChartType] = useState<'income' | 'expense'>('expense');
  const [error, setError] = useState('');

  // Track if any modal or popup overlay is open
  const hasAnyModalOpen = Boolean(
    showSavingsGoalModal ||
    showSavingsDepositModal ||
    showSavingsWithdrawModal ||
    showAddModal ||
    showAddModalDetails ||
    showDebtModal ||
    showAddDebtModal ||
    showPayInstallmentModal ||
    showTargetModal ||
    showTutorialModal ||
    showPrintModal ||
    showClearConfirm ||
    showClearTargetConfirm ||
    showDeleteConfirm ||
    showDeleteGoalConfirm ||
    showDeleteDebtConfirm ||
    showResetDebtConfirm
  );

  const smartStateRef = useRef({ activeTab, hasAnyModalOpen });
  smartStateRef.current = { activeTab, hasAnyModalOpen };

  const closeAllModals = useCallback(() => {
    setShowSavingsGoalModal(false);
    setShowSavingsDepositModal(false);
    setShowSavingsWithdrawModal(false);
    setShowAddModal(false);
    setShowAddModalDetails(false);
    setShowDebtModal(false);
    setShowAddDebtModal(false);
    setShowPayInstallmentModal(false);
    setShowTargetModal(false);
    setShowTutorialModal(false);
    setShowPrintModal(false);
    setShowClearConfirm(false);
    setShowClearTargetConfirm(false);
    setShowDeleteConfirm(null);
    setShowDeleteGoalConfirm(null);
    setShowDeleteDebtConfirm(null);
    setShowResetDebtConfirm(false);
  }, []);

  const handleSmartBack = useCallback(() => {
    if (smartStateRef.current.hasAnyModalOpen) {
      closeAllModals();
      return;
    }
    if (activeTab !== 'transactions') {
      setActiveTab('transactions');
      return;
    }
    onBack();
  }, [activeTab, closeAllModals, onBack]);

  // Keep history updated so Android / browser hardware back button handles modals and sub-tabs smoothly
  const lastPushedFinanceKeyRef = useRef<string>('');
  useEffect(() => {
    const key = `${activeTab}_${hasAnyModalOpen}`;
    if (lastPushedFinanceKeyRef.current !== key) {
      lastPushedFinanceKeyRef.current = key;
      if (activeTab !== 'transactions' || hasAnyModalOpen) {
        window.history.pushState({ screen: 'finance', tab: activeTab, isSub: true }, '');
      }
    }
  }, [activeTab, hasAnyModalOpen]);

  useEffect(() => {
    const handlePop = () => {
      const { activeTab: curTab, hasAnyModalOpen: modalOpen } = smartStateRef.current;
      if (modalOpen) {
        closeAllModals();
      } else if (curTab !== 'transactions') {
        setActiveTab('transactions');
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [closeAllModals]);

  // Normalize category name for savings checks
  const isSavingsCategory = (cat: string) => {
    const lower = (cat || '').toLowerCase().trim();
    return lower === 'savings' || lower === 'tabungan' || lower.includes('setor') || lower.includes('tarik') || lower.includes('tabungan');
  };

  const isSavingsWithdrawal = (t: Transaction) => {
    const desc = (t.description || '').toLowerCase();
    const cat = (t.category || '').toLowerCase();
    return desc.includes('tarik') || desc.includes('withdraw') || desc.includes('penarikan') || cat.includes('tarik') || cat.includes('withdraw');
  };

  // Switch month helper (Previous / Next Month)
  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (selectedMonth === 'all') {
      setSelectedMonth(todayISO.substring(0, 7));
      return;
    }
    const [year, month] = selectedMonth.split('-').map(Number);
    let newYear = year;
    let newMonth = direction === 'prev' ? month - 1 : month + 1;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    const formatted = `${newYear}-${String(newMonth).padStart(2, '0')}`;
    setSelectedMonth(formatted);
  };

  // Month Display Name
  const monthDisplayTitle = useMemo(() => {
    if (selectedMonth === 'all') {
      return lang === 'id' ? 'Semua Waktu' : 'All Time';
    }
    const [y, m] = selectedMonth.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' });
  }, [selectedMonth, lang]);

  // Filtered transactions for selected month/period
  const periodTransactions = useMemo(() => {
    if (selectedMonth === 'all') return transactions;
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  // Filtered by search & type
  const filteredTransactions = useMemo(() => {
    let result = periodTransactions;

    if (typeFilter !== 'all') {
      if (typeFilter === 'savings') {
        result = result.filter(t => isSavingsCategory(t.category));
      } else {
        result = result.filter(t => t.type === typeFilter);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(t => {
        const matchDesc = (t.description || '').toLowerCase().includes(q);
        const matchCat = translateCategory(t.category, lang).toLowerCase().includes(q);
        const matchAmount = t.amount.toString().includes(q);
        const matchDate = t.date.includes(q);
        return matchDesc || matchCat || matchAmount || matchDate;
      });
    }

    return [...result].sort((a, b) => {
      if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id);
      }
      if (sortBy === 'amount-desc') {
        return b.amount - a.amount || new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'amount-asc') {
        return a.amount - b.amount || new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id);
    });
  }, [periodTransactions, typeFilter, searchQuery, lang, sortBy]);

  // Calculate Opening Balance for the selected month (transactions prior to selectedMonth)
  const openingBalance = useMemo(() => {
    if (selectedMonth === 'all') return 0;
    const firstDayOfMonth = `${selectedMonth}-01`;
    return transactions
      .filter(t => t.date < firstDayOfMonth)
      .reduce((acc, t) => {
        if (t.type === 'income') return acc + t.amount;
        return acc - t.amount;
      }, 0);
  }, [transactions, selectedMonth]);

  // Statement summary totals (Credit, Debit, Closing)
  const statementTotals = useMemo(() => {
    let credit = 0;
    let debit = 0;
    periodTransactions.forEach(t => {
      if (t.type === 'income') credit += t.amount;
      else debit += t.amount;
    });
    const closing = openingBalance + credit - debit;
    return {
      credit,
      debit,
      closing
    };
  }, [periodTransactions, openingBalance]);

  // Chronological transaction ledger with Running Balance (Oldest to Newest)
  const chronologicalLedger = useMemo(() => {
    let running = openingBalance;
    const sorted = [...periodTransactions].sort((a, b) => {
      const timeDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.id.localeCompare(b.id);
    });

    return sorted.map((tx, idx) => {
      const isCredit = tx.type === 'income';
      const isDebit = tx.type === 'expense';
      if (isCredit) {
        running += tx.amount;
      } else {
        running -= tx.amount;
      }
      return {
        ...tx,
        indexNumber: idx + 1,
        isCredit,
        isDebit,
        creditAmount: isCredit ? tx.amount : 0,
        debitAmount: isDebit ? tx.amount : 0,
        runningBalance: running
      };
    });
  }, [periodTransactions, openingBalance]);

  const handleExportCSV = (mode: 'excel' | 'clean_table' = 'excel') => {
    if (periodTransactions.length === 0 && openingBalance === 0) {
      showFinanceToast(lang === 'id' ? 'Belum ada transaksi di bulan ini untuk diekspor.' : 'No transactions recorded for this period to export.');
      return;
    }

    const ownerName = (accountOwnerName || user?.name || 'Pengguna Tata').trim();
    const accNo = (accountNumber || `TATA-${selectedMonth.replace('-', '')}`).trim();
    const reportDate = new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    const periodLabel = monthDisplayTitle;

    const formatCsvCell = (val: string | number | boolean | null | undefined): string => {
      if (val === null || val === undefined) return '';
      const str = String(val);
      if (str.includes(';') || str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [];

    if (mode === 'clean_table') {
      // Pure data table for spreadsheets - uniform columns
      lines.push([
        'No', 'Tanggal', 'Nomor Ref ID', 'Nama Pengguna', 'ID Statement', 
        'Kategori', 'Deskripsi / Keterangan', 'Jenis Transaksi', 
        'Pengeluaran (Rp)', 'Pemasukan (Rp)', 'Saldo Berjalan (Rp)'
      ].map(formatCsvCell).join(';'));

      chronologicalLedger.forEach((item) => {
        lines.push([
          item.indexNumber,
          item.date,
          item.id,
          ownerName,
          accNo,
          translateCategory(item.category, lang) || '',
          item.description || item.category || '',
          item.isCredit ? 'Pemasukan' : 'Pengeluaran',
          item.isDebit ? item.amount : 0,
          item.isCredit ? item.amount : 0,
          item.runningBalance
        ].map(formatCsvCell).join(';'));
      });
    } else {
      // Clean structured Excel CSV with neat summary section and transaction table
      lines.push(['TATA STATEMENT - LAPORAN MUTASI KEUANGAN'].map(formatCsvCell).join(';'));
      lines.push(['Nama Pengguna', ownerName].map(formatCsvCell).join(';'));
      lines.push(['ID Laporan Statement', accNo].map(formatCsvCell).join(';'));
      lines.push(['Periode Laporan', periodLabel].map(formatCsvCell).join(';'));
      lines.push(['Mata Uang', 'IDR (Rupiah)'].map(formatCsvCell).join(';'));
      lines.push(['Tanggal Dicetak', reportDate].map(formatCsvCell).join(';'));
      lines.push(['Status Keamanan', 'Privat & Offline (Disimpan di Perangkat)'].map(formatCsvCell).join(';'));
      lines.push('');
      lines.push(['RINGKASAN MUTASI KEUANGAN'].map(formatCsvCell).join(';'));
      lines.push(['Saldo Awal Periode', openingBalance].map(formatCsvCell).join(';'));
      lines.push(['Total Pemasukan (+)', statementTotals.credit].map(formatCsvCell).join(';'));
      lines.push(['Total Pengeluaran (-)', statementTotals.debit].map(formatCsvCell).join(';'));
      lines.push(['Saldo Akhir Periode', statementTotals.closing].map(formatCsvCell).join(';'));
      lines.push(['Total Tabungan Terkumpul', savingsBalance].map(formatCsvCell).join(';'));
      lines.push(['Total Kekayaan Bersih', availableWalletCash + savingsBalance].map(formatCsvCell).join(';'));
      lines.push(['Total Frekuensi Transaksi', `${chronologicalLedger.length} Transaksi`].map(formatCsvCell).join(';'));
      lines.push('');
      lines.push(['TABEL DETAIL STATEMENT TRANSAKSI'].map(formatCsvCell).join(';'));
      lines.push([
        'No', 'Tanggal', 'Nomor Ref ID', 'Nama Pengguna', 'Kategori', 
        'Deskripsi / Keterangan', 'Jenis Transaksi', 'Pengeluaran (Rp)', 
        'Pemasukan (Rp)', 'Saldo Berjalan (Rp)'
      ].map(formatCsvCell).join(';'));

      chronologicalLedger.forEach((item) => {
        lines.push([
          item.indexNumber,
          item.date,
          item.id,
          ownerName,
          translateCategory(item.category, lang) || '',
          item.description || item.category || '',
          item.isCredit ? 'Pemasukan' : 'Pengeluaran',
          item.isDebit ? item.amount : 0,
          item.isCredit ? item.amount : 0,
          item.runningBalance
        ].map(formatCsvCell).join(';'));
      });

      lines.push('');
      lines.push(['PERNYATAAN KEASLIAN & PRIVASI', 'Dokumen statement ini dihasilkan secara otomatis oleh Tata App. Seluruh data disimpan 100% lokal & privat.'].map(formatCsvCell).join(';'));
    }

    const csvContent = lines.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const sanitizedOwner = ownerName.replace(/[^a-zA-Z0-9]/g, '_');
    const suffix = mode === 'clean_table' ? 'DataTabel' : 'StatementExcel';
    link.setAttribute('download', `Tata_${suffix}_${sanitizedOwner}_${selectedMonth}_${todayISO}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showFinanceToast(lang === 'id' ? 'Laporan mutasi CSV berhasil diunduh!' : 'CSV statement downloaded successfully!');
  };

  // Group transactions by Date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    filteredTransactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return groups;
  }, [filteredTransactions]);

  const sortedDateKeys = useMemo(() => {
    return Object.keys(groupedTransactions).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [groupedTransactions]);

  // Display pagination
  const displayData = useMemo(() => {
    if (showAllTransactions || searchQuery.trim().length > 0 || typeFilter !== 'all') {
      return { keys: sortedDateKeys, groups: groupedTransactions, hasMore: false };
    }

    let count = 0;
    const limitedGroups: Record<string, Transaction[]> = {};
    const limitedKeys: string[] = [];
    let hasMore = false;

    for (const key of sortedDateKeys) {
      if (count >= 10) {
        hasMore = true;
        break;
      }
      const txs = groupedTransactions[key];
      const remaining = 10 - count;
      if (txs.length > remaining) {
        limitedGroups[key] = txs.slice(0, remaining);
        limitedKeys.push(key);
        count += remaining;
        hasMore = true;
        break;
      } else {
        limitedGroups[key] = txs;
        limitedKeys.push(key);
        count += txs.length;
      }
    }

    if (!hasMore && count >= 10 && sortedDateKeys.length > limitedKeys.length) {
      hasMore = true;
    }

    return { keys: limitedKeys, groups: limitedGroups, hasMore };
  }, [groupedTransactions, sortedDateKeys, showAllTransactions, searchQuery, typeFilter]);

  // Overall Financial Totals
  const totalIncomePeriod = useMemo(() => {
    return periodTransactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [periodTransactions]);

  const totalExpensePeriod = useMemo(() => {
    return periodTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [periodTransactions]);

  const allTimeIncome = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions]);

  const allTimeExpense = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions]);

  const availableWalletCash = allTimeIncome - allTimeExpense;

  const totalSavingsDeposits = useMemo(() => {
    return transactions
      .filter(t => isSavingsCategory(t.category) && t.type === 'expense' && !isSavingsWithdrawal(t))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions]);

  const totalSavingsWithdrawals = useMemo(() => {
    return transactions
      .filter(t => isSavingsCategory(t.category) && (t.type === 'income' || isSavingsWithdrawal(t)))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions]);

  const savingsBalance = useMemo(() => {
    return Math.max(0, totalSavingsDeposits - totalSavingsWithdrawals);
  }, [totalSavingsDeposits, totalSavingsWithdrawals]);

  const totalSavingsInGoals = useMemo(() => {
    return savingsGoals.reduce((sum, g) => sum + (g.currentAmount || 0), 0);
  }, [savingsGoals]);

  const totalSavingsTargetInGoals = useMemo(() => {
    return savingsGoals.reduce((sum, g) => sum + (g.targetAmount || 0), 0);
  }, [savingsGoals]);

  // Unified savings balance: prioritize total savings in goals if goals exist, otherwise transaction calculations
  const activeSavingsBalance = useMemo(() => {
    if (savingsGoals.length > 0) return totalSavingsInGoals;
    return savingsBalance;
  }, [savingsGoals.length, totalSavingsInGoals, savingsBalance]);

  const activeSavingsTarget = useMemo(() => {
    if (savingsGoals.length > 0) return totalSavingsTargetInGoals;
    return savingsTarget || 0;
  }, [savingsGoals.length, totalSavingsTargetInGoals, savingsTarget]);

  // Aggregated interest & yield from all savings goals
  const totalAnnualYieldFromGoals = useMemo(() => {
    return savingsGoals.reduce((sum, g) => {
      if ((g.interestRate || 0) > 0 && (g.currentAmount || 0) > 0) {
        const taxRate = g.taxRate !== undefined ? g.taxRate : (g.instrumentType === 'deposito' || g.instrumentType === 'bank' ? 20 : 0);
        const taxFactor = Math.max(0, 100 - taxRate) / 100;
        const netAnnual = (g.currentAmount || 0) * ((g.interestRate || 0) / 100) * taxFactor;
        return sum + netAnnual;
      }
      return sum;
    }, 0);
  }, [savingsGoals]);

  const totalMonthlyYieldFromGoals = useMemo(() => {
    return totalAnnualYieldFromGoals / 12;
  }, [totalAnnualYieldFromGoals]);

  const totalYieldBearingGoalsCount = useMemo(() => {
    return savingsGoals.filter(g => (g.interestRate || 0) > 0 && (g.currentAmount || 0) > 0).length;
  }, [savingsGoals]);

  useEffect(() => {
    setSavingsBalance(activeSavingsBalance);
  }, [activeSavingsBalance, setSavingsBalance]);

  const totalNetCash = availableWalletCash + activeSavingsBalance;

  const totalDebtExpenses = useMemo(() => {
    return transactions
      .filter(t => t.type === 'expense' && isDebtCategory(t.category))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions]);

  const totalDebtIncomes = useMemo(() => {
    return transactions
      .filter(t => t.type === 'income' && isDebtCategory(t.category))
      .reduce((acc, curr) => acc + curr.amount, 0);
  }, [transactions]);

  const totalDebtFromItems = useMemo(() => {
    return debts.filter(d => !d.isPaidOff).reduce((acc, d) => acc + d.remainingAmount, 0);
  }, [debts]);

  const totalDebt = useMemo(() => {
    if (debts.length > 0) return totalDebtFromItems;
    return Math.max(0, initialDebt + totalDebtIncomes - totalDebtExpenses);
  }, [debts, totalDebtFromItems, initialDebt, totalDebtIncomes, totalDebtExpenses]);

  const resetDebtForm = (mode: 'simple' | 'detail' = 'simple') => {
    setDebtFormMode(mode);
    setEditingDebt(null);
    setDebtFormTitle('');
    setDebtFormLender('');
    setDebtFormTotalAmount('');
    setDebtFormInstallmentCount('1');
    setDebtFormPaymentFrequency('custom');
    setDebtFormInstallmentAmount('');
    setDebtFormDueDate('');
    setDebtFormNotes('');
    setDebtFormError('');
  };

  const handleOpenAddDebt = (mode: 'simple' | 'detail' = 'simple') => {
    resetDebtForm(mode);
    setShowAddDebtModal(true);
  };

  const handleOpenEditDebt = (d: DebtItem) => {
    const isDetail = (d.installmentCount && d.installmentCount > 1) || !!d.lender || !!d.dueDate || (d.paymentFrequency && d.paymentFrequency !== 'custom');
    setDebtFormMode(isDetail ? 'detail' : 'simple');
    setEditingDebt(d);
    setDebtFormTitle(d.title);
    setDebtFormLender(d.lender || '');
    setDebtFormTotalAmount(d.totalAmount.toString());
    setDebtFormInstallmentCount((d.installmentCount || 1).toString());
    setDebtFormPaymentFrequency(d.paymentFrequency || 'custom');
    setDebtFormInstallmentAmount((d.installmentAmount || Math.round(d.totalAmount / (d.installmentCount || 1))).toString());
    setDebtFormDueDate(d.dueDate || '');
    setDebtFormNotes(d.notes || '');
    setDebtFormError('');
    setShowAddDebtModal(true);
  };

  const handleSaveDebtItem = () => {
    const totalAmt = parseRawAmount(debtFormTotalAmount, 'IDR');
    if (isNaN(totalAmt) || totalAmt <= 0) {
      setDebtFormError(lang === 'id' ? 'Masukkan total nominal hutang yang valid (lebih dari 0).' : 'Enter a valid total debt amount greater than 0.');
      return;
    }

    const isSimple = debtFormMode === 'simple';
    const count = isSimple ? 1 : (parseInt(debtFormInstallmentCount, 10) || 1);
    let instAmt = isSimple ? totalAmt : parseRawAmount(debtFormInstallmentAmount, 'IDR');
    if (isNaN(instAmt) || instAmt <= 0) {
      instAmt = Math.round(totalAmt / count);
    }

    if (editingDebt) {
      const updated: DebtItem = {
        ...editingDebt,
        title: debtFormTitle.trim() || (lang === 'id' ? 'Catatan Hutang' : 'Debt Record'),
        lender: isSimple ? '' : debtFormLender.trim(),
        totalAmount: totalAmt,
        installmentCount: count,
        paymentFrequency: isSimple ? 'custom' : debtFormPaymentFrequency,
        installmentAmount: instAmt,
        dueDate: isSimple ? '' : debtFormDueDate,
        notes: debtFormNotes.trim(),
        remainingAmount: Math.min(editingDebt.remainingAmount, totalAmt),
        isPaidOff: Math.min(editingDebt.remainingAmount, totalAmt) <= 0
      };
      updateDebt(updated);
    } else {
      const newDebt: DebtItem = {
        id: generateId(),
        title: debtFormTitle.trim() || (lang === 'id' ? 'Catatan Hutang' : 'Debt Record'),
        lender: isSimple ? '' : debtFormLender.trim(),
        totalAmount: totalAmt,
        remainingAmount: totalAmt,
        installmentCount: count,
        paidInstallments: 0,
        paymentFrequency: isSimple ? 'custom' : debtFormPaymentFrequency,
        installmentAmount: instAmt,
        dueDate: isSimple ? '' : debtFormDueDate,
        notes: debtFormNotes.trim(),
        isPaidOff: false,
        createdAt: todayISO
      };
      addDebt(newDebt);
    }

    setShowAddDebtModal(false);
    resetDebtForm();
  };

  const handleOpenPayInstallment = (debt: DebtItem) => {
    setSelectedDebtForPayment(debt);
    setPayInstallmentAmount((debt.installmentAmount || Math.round(debt.totalAmount / (debt.installmentCount || 1))).toString());
    setPayInstallmentDate(todayISO);
    setPayInstallmentNote(`Angsuran ke-${debt.paidInstallments + 1} (${debt.title})`);
    setPayInstallmentError('');
    setShowPayInstallmentModal(true);
  };

  const handlePayInstallmentSubmit = () => {
    if (!selectedDebtForPayment) return;
    const val = parseRawAmount(payInstallmentAmount, 'IDR');
    if (isNaN(val) || val <= 0) {
      setPayInstallmentError(lang === 'id' ? 'Masukkan nominal angsuran yang valid.' : 'Please enter a valid installment amount.');
      return;
    }

    payDebtInstallment(
      selectedDebtForPayment.id,
      val,
      payInstallmentDate || todayISO,
      payInstallmentNote.trim() || `Angsuran (${selectedDebtForPayment.title})`
    );

    setShowPayInstallmentModal(false);
    setSelectedDebtForPayment(null);
    setPayInstallmentAmount('');
    setPayInstallmentNote('');
    setPayInstallmentError('');
  };

  const handleSaveDebtTarget = () => {
    const val = parseRawAmount(debtInputAmount, 'IDR');
    if (isNaN(val) || val < 0) return;
    const adjustedInitial = Math.max(0, val - totalDebtIncomes + totalDebtExpenses);
    setInitialDebt(adjustedInitial);
    setShowDebtModal(false);
    setDebtInputAmount('');
  };

  // Category breakdown for chart
  const chartCategories = useMemo(() => {
    const records = periodTransactions.filter(t => t.type === chartType);
    const categories: Record<string, number> = {};
    records.forEach(t => {
      const catKey = t.category || 'Other';
      categories[catKey] = (categories[catKey] || 0) + t.amount;
    });

    const totalAmount = chartType === 'expense' ? totalExpensePeriod : totalIncomePeriod;
    return Object.entries(categories)
      .map(([name, amount]) => ({
        name: translateCategory(name, lang),
        amount,
        perc: totalAmount > 0 ? (amount / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodTransactions, chartType, totalExpensePeriod, totalIncomePeriod, lang]);

  // Handlers
  const handleEditClick = (t: Transaction) => {
    setEditingId(t.id);
    setType(t.type);
    setAmount(t.amount.toString());
    setCategory(t.category);

    const list = t.type === 'expense' ? expenseCategoriesList : incomeCategoriesList;
    if (!list.includes(t.category)) {
      setShowCustomCategory(true);
    } else {
      setShowCustomCategory(false);
    }

    setDate(t.date);
    setDescription(t.description || '');
    setCurrency(t.currency || 'IDR');
    setSelectedLinkedDebtId(t.linkedDebtId || '');
    setError('');
    setShowAddModalDetails(true);
    setShowAddModal(true);
  };

  const resetAddForm = (initialType: 'income' | 'expense' = 'expense') => {
    setEditingId(null);
    setType(initialType);
    setAmount('');
    setCategory('');
    setShowCustomCategory(false);
    setDescription('');
    setCurrency('IDR');
    setDate(todayISO);
    setError('');
    setShowAddModalDetails(false);
    setSelectedLinkedDebtId('');
  };

  const handleSaveTransaction = () => {
    const numericAmount = parseRawAmount(amount, currency);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError(lang === 'id' ? 'Masukkan nominal jumlah yang valid (lebih dari 0).' : 'Please enter a valid amount greater than 0.');
      return;
    }

    const selectedCategory = category.trim() || (type === 'income' ? 'Salary' : 'Other');
    const txDate = date || todayISO;

    let finalType = type;
    if (isSavingsCategory(selectedCategory)) {
      if (type === 'income' || isSavingsWithdrawal({ category: selectedCategory, description } as any)) {
        finalType = 'income';
      } else {
        finalType = 'expense';
      }
    }

    if (isSavingsCategory(selectedCategory) && finalType === 'income') {
      let currentSavingsAvailable = savingsBalance;
      if (editingId) {
        const oldTx = transactions.find(t => t.id === editingId);
        if (oldTx && isSavingsCategory(oldTx.category) && (oldTx.type === 'income' || isSavingsWithdrawal(oldTx))) {
          currentSavingsAvailable += oldTx.amount;
        }
      }
      if (numericAmount > currentSavingsAvailable) {
        setError(
          lang === 'id'
            ? `Nominal penarikan dari tabungan (${formatCurrency(numericAmount)}) melebihi saldo tabungan saat ini (${formatCurrency(currentSavingsAvailable)}).`
            : `Withdrawal amount exceeds available savings balance (${formatCurrency(currentSavingsAvailable)}).`
        );
        return;
      }
    }

    if (selectedLinkedDebtId && finalType === 'expense') {
      const targetDebt = debts.find(d => d.id === selectedLinkedDebtId);
      if (targetDebt) {
        const newPaidInstallments = targetDebt.paidInstallments + 1;
        const newRemainingAmount = Math.max(0, targetDebt.remainingAmount - numericAmount);
        const isPaidOff = newRemainingAmount <= 0 || (targetDebt.installmentCount > 0 && newPaidInstallments >= targetDebt.installmentCount);

        updateDebt({
          ...targetDebt,
          paidInstallments: newPaidInstallments,
          remainingAmount: newRemainingAmount,
          isPaidOff
        });
      }
    }

    if (editingId) {
      updateTransaction(editingId, {
        type: finalType,
        amount: numericAmount,
        category: selectedCategory,
        date: txDate,
        description: description.trim(),
        currency,
        linkedDebtId: selectedLinkedDebtId || undefined
      });
    } else {
      const newTx: Transaction = {
        id: generateId(),
        type: finalType,
        amount: numericAmount,
        category: selectedCategory,
        date: txDate,
        description: description.trim(),
        currency,
        linkedDebtId: selectedLinkedDebtId || undefined
      };
      addTransaction(newTx);
    }

    // Auto switch month/filter view if needed so transaction is immediately visible to user
    const txMonth = txDate.substring(0, 7);
    if (selectedMonth !== 'all' && selectedMonth !== txMonth) {
      setSelectedMonth(txMonth);
    }
    if (typeFilter !== 'all' && typeFilter !== type) {
      setTypeFilter('all');
    }
    if (searchQuery) {
      setSearchQuery('');
    }

    setShowAddModal(false);
    resetAddForm();
  };

  const resetGoalForm = () => {
    setEditingSavingsGoal(null);
    setGoalFormTitle('');
    setGoalFormTargetAmount('');
    setGoalFormInitialAmount('');
    setGoalFormCategory('Lainnya');
    setGoalFormEmoji('🎯');
    setGoalFormTargetDate('');
    setGoalFormNotes('');
    setGoalFormMode('simple');
    setGoalFormInstrumentType('bank');
    setGoalFormInstitutionName('');
    setGoalFormHasInterest(false);
    setGoalFormInterestRate('');
    setGoalFormTaxRate('20');
    setGoalFormIsCompound(false);
    setGoalFormError('');
  };

  const handleOpenAddGoal = (preset?: { 
    title: string; 
    emoji: string; 
    category: string; 
    target?: number;
    instrumentType?: 'cash' | 'bank' | 'deposito' | 'reksadana' | 'obligasi' | 'emas' | 'p2p' | 'crypto' | 'lainnya';
    institutionName?: string;
    interestRate?: number;
    taxRate?: number;
    isCompound?: boolean;
  }) => {
    resetGoalForm();
    if (preset) {
      setGoalFormTitle(preset.title);
      setGoalFormEmoji(preset.emoji);
      setGoalFormCategory(preset.category);
      if (preset.target) setGoalFormTargetAmount(preset.target.toString());
      if (preset.instrumentType) setGoalFormInstrumentType(preset.instrumentType);
      if (preset.institutionName) setGoalFormInstitutionName(preset.institutionName);
      if (preset.interestRate !== undefined && preset.interestRate > 0) {
        setGoalFormHasInterest(true);
        setGoalFormInterestRate(preset.interestRate.toString());
      }
      if (preset.taxRate !== undefined) setGoalFormTaxRate(preset.taxRate.toString());
      if (preset.isCompound !== undefined) setGoalFormIsCompound(preset.isCompound);
      
      // Auto switch mode if preset is a financial instrument / yield
      if (preset.interestRate || (preset.instrumentType && preset.instrumentType !== 'bank' && preset.instrumentType !== 'cash')) {
        setGoalFormMode('detail');
      } else {
        setGoalFormMode('simple');
      }
    }
    setShowSavingsGoalModal(true);
  };

  const handleOpenEditGoal = (g: SavingsGoal) => {
    setEditingSavingsGoal(g);
    setGoalFormTitle(g.title);
    setGoalFormTargetAmount(g.targetAmount ? g.targetAmount.toString() : '');
    setGoalFormInitialAmount('');
    setGoalFormCategory(g.category || 'Lainnya');
    setGoalFormEmoji(g.emoji || '🎯');
    setGoalFormTargetDate(g.targetDate || '');
    setGoalFormNotes(g.notes || '');
    setGoalFormInstrumentType(g.instrumentType || 'bank');
    setGoalFormInstitutionName(g.institutionName || '');
    setGoalFormHasInterest(Boolean(g.interestRate && g.interestRate > 0));
    setGoalFormInterestRate(g.interestRate ? g.interestRate.toString() : '');
    setGoalFormTaxRate(g.taxRate !== undefined ? g.taxRate.toString() : (g.instrumentType === 'deposito' || g.instrumentType === 'bank' ? '20' : '0'));
    setGoalFormIsCompound(Boolean(g.isCompound));
    
    // Auto switch mode if the existing goal has interest or non-basic instrument
    if (g.interestRate || (g.instrumentType && g.instrumentType !== 'bank' && g.instrumentType !== 'cash')) {
      setGoalFormMode('detail');
    } else {
      setGoalFormMode('simple');
    }
    
    setGoalFormError('');
    setShowSavingsGoalModal(true);
  };

  const handleSaveSavingsGoal = () => {
    const title = goalFormTitle.trim();
    if (!title) {
      setGoalFormError(lang === 'id' ? 'Nama target tabungan wajib diisi.' : 'Goal title is required.');
      return;
    }
    const targetAmt = parseRawAmount(goalFormTargetAmount, 'IDR');
    const initialAmt = parseRawAmount(goalFormInitialAmount, 'IDR');

    if (targetAmt <= 0 && initialAmt <= 0) {
      setGoalFormError(lang === 'id' ? 'Masukkan target nominal tabungan (lebih dari 0).' : 'Please enter target amount greater than 0.');
      return;
    }

    const parsedRate = goalFormHasInterest ? (parseFloat(goalFormInterestRate) || 0) : 0;
    const parsedTax = goalFormHasInterest ? (parseFloat(goalFormTaxRate) >= 0 ? parseFloat(goalFormTaxRate) : 0) : 0;

    if (editingSavingsGoal) {
      const updated: SavingsGoal = {
        ...editingSavingsGoal,
        title,
        targetAmount: targetAmt,
        category: goalFormCategory || 'Lainnya',
        emoji: goalFormEmoji || '🎯',
        targetDate: goalFormTargetDate || undefined,
        notes: goalFormNotes.trim() || undefined,
        instrumentType: (goalFormInstrumentType as any) || 'bank',
        institutionName: goalFormInstitutionName.trim() || undefined,
        interestRate: parsedRate > 0 ? parsedRate : undefined,
        taxRate: parsedRate > 0 ? parsedTax : undefined,
        isCompound: parsedRate > 0 ? goalFormIsCompound : undefined,
        isCompleted: targetAmt > 0 && editingSavingsGoal.currentAmount >= targetAmt
      };
      updateSavingsGoal(updated);
    } else {
      const newGoal: SavingsGoal = {
        id: generateId(),
        title,
        targetAmount: targetAmt,
        currentAmount: initialAmt,
        category: goalFormCategory || 'Lainnya',
        emoji: goalFormEmoji || '🎯',
        targetDate: goalFormTargetDate || undefined,
        notes: goalFormNotes.trim() || undefined,
        instrumentType: (goalFormInstrumentType as any) || 'bank',
        institutionName: goalFormInstitutionName.trim() || undefined,
        interestRate: parsedRate > 0 ? parsedRate : undefined,
        taxRate: parsedRate > 0 ? parsedTax : undefined,
        isCompound: parsedRate > 0 ? goalFormIsCompound : undefined,
        isCompleted: targetAmt > 0 && initialAmt >= targetAmt,
        createdAt: todayISO
      };
      addSavingsGoal(newGoal);

      if (initialAmt > 0) {
        addTransaction({
          id: generateId(),
          type: 'expense',
          amount: initialAmt,
          category: 'Savings',
          date: todayISO,
          description: lang === 'id' ? `Setoran Awal Tabungan (${title})` : `Initial Deposit (${title})`,
          currency: 'IDR'
        });
      }
    }

    setShowSavingsGoalModal(false);
    resetGoalForm();
  };

  const handleOpenDepositModal = (goalId?: string) => {
    setSelectedGoalIdForAction(goalId || (savingsGoals.length > 0 ? savingsGoals[0].id : ''));
    setSavingsDepositAmount('');
    setDepositError('');
    setShowSavingsDepositModal(true);
  };

  const handleOpenWithdrawModal = (goalId?: string) => {
    setSelectedGoalIdForAction(goalId || (savingsGoals.length > 0 ? savingsGoals[0].id : ''));
    setSavingsWithdrawAmount('');
    setWithdrawError('');
    setShowSavingsWithdrawModal(true);
  };

  const handleDepositSavings = () => {
    const val = parseRawAmount(savingsDepositAmount, 'IDR');
    if (isNaN(val) || val <= 0) {
      setDepositError(lang === 'id' ? 'Masukkan nominal setoran yang valid.' : 'Please enter a valid deposit amount.');
      return;
    }

    const targetGoal = savingsGoals.find(g => g.id === selectedGoalIdForAction);
    if (targetGoal) {
      depositToSavingsGoal(
        targetGoal.id,
        val,
        todayISO,
        lang === 'id' ? `Setoran Tabungan (${targetGoal.title})` : `Savings Deposit (${targetGoal.title})`
      );
    } else {
      addTransaction({
        id: generateId(),
        type: 'expense',
        amount: val,
        category: 'Savings',
        date: todayISO,
        description: lang === 'id' ? 'Setoran Tabungan' : 'Savings Deposit',
        currency: 'IDR'
      });
    }

    setShowSavingsDepositModal(false);
    setSavingsDepositAmount('');
    setDepositError('');
  };

  const handleWithdrawSavings = () => {
    const val = parseRawAmount(savingsWithdrawAmount, 'IDR');
    if (isNaN(val) || val <= 0) {
      setWithdrawError(lang === 'id' ? 'Masukkan nominal penarikan yang valid.' : 'Please enter a valid withdrawal amount.');
      return;
    }

    const targetGoal = savingsGoals.find(g => g.id === selectedGoalIdForAction);
    const maxAvailable = targetGoal ? targetGoal.currentAmount : activeSavingsBalance;

    if (val > maxAvailable) {
      setWithdrawError(
        lang === 'id'
          ? `Nominal penarikan (${formatCurrency(val)}) melebihi saldo tabungan saat ini (${formatCurrency(maxAvailable)}).`
          : `Withdrawal amount (${formatCurrency(val)}) exceeds available savings balance (${formatCurrency(maxAvailable)}).`
      );
      return;
    }

    if (targetGoal) {
      withdrawFromSavingsGoal(
        targetGoal.id,
        val,
        todayISO,
        lang === 'id' ? `Penarikan Tabungan (${targetGoal.title})` : `Savings Withdrawal (${targetGoal.title})`
      );
    } else {
      addTransaction({
        id: generateId(),
        type: 'income',
        amount: val,
        category: 'Savings',
        date: todayISO,
        description: lang === 'id' ? 'Penarikan Tabungan' : 'Savings Withdrawal',
        currency: 'IDR'
      });
    }

    setShowSavingsWithdrawModal(false);
    setSavingsWithdrawAmount('');
    setWithdrawError('');
  };

  return (
    <div className={`flex-1 h-full flex flex-col relative overflow-hidden transition-colors ${
      effectiveTheme === 'wallpaper' ? 'bg-transparent text-white' : `${palette.rootText}`
    }`}>
      {/* Header */}
      <div className={`flex-none px-4 sm:px-6 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 border-b backdrop-blur-md z-20 flex justify-between items-center shrink-0 shadow-sm transition-colors ${
        effectiveTheme === 'wallpaper'
          ? 'bg-slate-950/40 border-white/10 text-white backdrop-blur-xl'
          : `${palette.headerBg} ${palette.headerBorder}`
      }`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button 
            onClick={handleSmartBack} 
            className={`p-2 -ml-2 rounded-xl transition-colors shrink-0 cursor-pointer ${
              effectiveTheme === 'wallpaper'
                ? 'text-white hover:bg-white/10'
                : `${palette.subText} hover:${palette.titleText} hover:bg-black/5 dark:hover:bg-white/5`
            }`}
            title={lang === 'id' ? 'Kembali' : 'Back'}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col justify-center min-w-0">
            <h2 className={`text-base sm:text-xl font-black tracking-tight leading-none truncate ${
              effectiveTheme === 'wallpaper' ? 'text-white' : palette.titleText
            }`}>
              {t('financeMenu') as string}
            </h2>
            <span className={`text-[10px] sm:text-xs font-medium leading-tight truncate mt-0.5 ${palette.subText}`}>
              {lang === 'id' ? 'Pencatatan Keuangan & Tabungan' : 'Financial Tracker & Savings'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const allHidden = hideMainBalance && hideSavingsBalance && hideTotalNetBalance && hideDebtBalance;
              setHideMainBalance(!allHidden);
              setHideSavingsBalance(!allHidden);
              setHideTotalNetBalance(!allHidden);
              setHideDebtBalance(!allHidden);
            }}
            className={`h-9 px-2.5 sm:px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${palette.actionBtn} ${palette.actionBtnHover}`}
            title={lang === 'id' ? 'Sembunyikan / Tampilkan Semua Saldo' : 'Hide / Show All Balances'}
          >
            {(hideMainBalance && hideSavingsBalance && hideTotalNetBalance && hideDebtBalance) ? (
              <>
                <EyeOff className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Tampil Semua' : 'Show All'}</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">{lang === 'id' ? 'Tutup Semua' : 'Hide All'}</span>
              </>
            )}
          </button>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('ai-companion')}
              className="h-9 px-3 rounded-xl bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-indigo-300 hover:text-white flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0"
              title={lang === 'id' ? 'Tanyakan / Analisis Keuangan dengan Tata AI' : 'Ask / Analyze Finances with Tata AI'}
            >
              <Bot className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">{lang === 'id' ? 'Tanya AI' : 'Ask AI'}</span>
            </button>
          )}

          <button
            onClick={() => setShowTutorialModal(true)}
            className={`h-9 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer shrink-0 ${themeBtnSecondary}`}
            title={lang === 'id' ? 'Panduan Penggunaan' : 'User Guide'}
          >
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">{lang === 'id' ? 'Panduan' : 'Guide'}</span>
          </button>

          {transactions.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors border cursor-pointer ${
                isLight ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-rose-500 hover:bg-rose-50' : 'bg-slate-800 border-slate-700/60 text-slate-400 hover:text-rose-400'
              }`}
              title={lang === 'id' ? 'Hapus Semua Transaksi' : 'Clear All Transactions'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div ref={financeScrollRef} className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">
        <div className="w-full max-w-4xl mx-auto space-y-5">

          {/* MAIN FINANCIAL HERO CARD */}
          <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-4 transition-colors ${
            appTheme === 'wallpaper'
              ? 'bg-slate-950/70 border-white/10 text-white backdrop-blur-xl'
              : `${palette.cardHero} ${palette.cardHeroBorder}`
          }`}>
            
            {/* Top Row: Primary Cash Balance & Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                    appTheme === 'wallpaper' ? 'text-slate-300' : palette.subText
                  }`}>
                    💵 {lang === 'id' ? 'Saldo Utama (Siap Pakai)' : 'Main Wallet Cash'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setHideMainBalance(!hideMainBalance)}
                    className="p-1 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition-colors cursor-pointer"
                    title={hideMainBalance ? (lang === 'id' ? 'Tampilkan Saldo Utama' : 'Show Main Balance') : (lang === 'id' ? 'Sembunyikan Saldo Utama' : 'Hide Main Balance')}
                  >
                    {hideMainBalance ? <EyeOff className="w-3.5 h-3.5 text-slate-500" /> : <Eye className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                </div>
                <span className={`text-3xl sm:text-4xl font-black tracking-tight block ${
                  appTheme === 'wallpaper' ? 'text-white' : (palette.isDark ? 'text-slate-100' : 'text-slate-900')
                }`}>
                  {hideMainBalance ? 'Rp •••••••' : formatCurrency(availableWalletCash)}
                </span>
              </div>

              {/* Direct Quick Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetAddForm('income');
                    setShowAddModal(true);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer active:scale-95"
                >
                  {is3D ? <Icon3DIncome size={18} /> : <ArrowDownRight className="w-4 h-4" />}
                  <span>{lang === 'id' ? '+ Pemasukan' : '+ Income'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    resetAddForm('expense');
                    setShowAddModal(true);
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
                >
                  {is3D ? <Icon3DExpense size={18} /> : <ArrowUpRight className="w-4 h-4" />}
                  <span>{lang === 'id' ? '- Pengeluaran' : '- Expense'}</span>
                </button>
              </div>
            </div>

            {/* Bottom Row: Savings, Total Net Worth & Total Debt */}
            <div className={`pt-3.5 border-t grid grid-cols-1 sm:grid-cols-3 gap-3 ${
              palette.isDark ? 'border-slate-800/80' : 'border-slate-200/80'
            }`}>
              <div className={`p-3 rounded-2xl border flex flex-col justify-between gap-1.5 transition-colors ${
                palette.isDark 
                  ? 'bg-slate-950/50 border-slate-800/80' 
                  : (appTheme === 'organic' || appTheme === 'cute' ? 'bg-[#F2E7D5]/80 border-[#EADCC8]' : appTheme === 'pink' ? 'bg-[#FCE7F3]/70 border-pink-200' : 'bg-slate-50 border-slate-200')
              }`}>
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      {is3D ? <Icon3DPiggy size={16} className="inline-block" /> : <span>🐷</span>}
                      <span className={`block text-[10px] font-bold uppercase tracking-wider truncate ${palette.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {lang === 'id' ? 'Tabungan Terkumpul' : 'Saved Money'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setHideSavingsBalance(!hideSavingsBalance)}
                        className={`p-0.5 rounded transition-colors cursor-pointer shrink-0 ${palette.isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'}`}
                        title={hideSavingsBalance ? (lang === 'id' ? 'Tampilkan Tabungan' : 'Show Savings') : (lang === 'id' ? 'Sembunyikan Tabungan' : 'Hide Savings')}
                      >
                        {hideSavingsBalance ? <EyeOff className="w-3 h-3 text-slate-500" /> : <Eye className="w-3 h-3 text-amber-500" />}
                      </button>
                    </div>
                    <span className="text-amber-500 font-extrabold text-sm sm:text-base block mt-0.5">
                      {hideSavingsBalance ? 'Rp •••••••' : formatCurrency(savingsBalance)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('savings')}
                    className="px-2 py-1 rounded-xl bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 text-[10px] font-bold border border-amber-500/20 transition-colors cursor-pointer shrink-0"
                  >
                    {lang === 'id' ? 'Kelola' : 'Manage'}
                  </button>
                </div>
                <p className={`text-[10px] font-medium ${palette.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {lang === 'id' ? 'Uang dingin terpisah' : 'Separate savings pool'}
                </p>
              </div>

              <div className={`p-3 rounded-2xl border flex flex-col justify-between gap-1.5 transition-colors ${
                palette.isDark 
                  ? 'bg-slate-950/50 border-slate-800/80' 
                  : (appTheme === 'organic' || appTheme === 'cute' ? 'bg-[#F2E7D5]/80 border-[#EADCC8]' : appTheme === 'pink' ? 'bg-[#FCE7F3]/70 border-pink-200' : 'bg-slate-50 border-slate-200')
              }`}>
                <div>
                  <div className="flex items-center gap-1">
                    {is3D ? <Icon3DCoins size={16} className="inline-block" /> : <span>💰</span>}
                    <span className={`block text-[10px] font-bold uppercase tracking-wider truncate ${palette.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {lang === 'id' ? 'Total Semua Uang' : 'Total Net Worth'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setHideTotalNetBalance(!hideTotalNetBalance)}
                      className={`p-0.5 rounded transition-colors cursor-pointer shrink-0 ${palette.isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'}`}
                      title={hideTotalNetBalance ? (lang === 'id' ? 'Tampilkan Total Semua Uang' : 'Show Net Worth') : (lang === 'id' ? 'Sembunyikan Total Semua Uang' : 'Hide Net Worth')}
                    >
                      {hideTotalNetBalance ? <EyeOff className="w-3 h-3 text-slate-500" /> : <Eye className="w-3 h-3 text-emerald-500" />}
                    </button>
                  </div>
                  <span className="text-emerald-500 font-extrabold text-sm sm:text-base block mt-0.5">
                    {hideTotalNetBalance ? 'Rp •••••••' : formatCurrency(totalNetCash)}
                  </span>
                </div>
                <p className={`text-[10px] font-medium ${palette.isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {lang === 'id' ? 'Saldo Utama + Tabungan' : 'Cash + Savings'}
                </p>
              </div>

              <div className={`p-3 rounded-2xl border flex flex-col justify-between gap-1.5 transition-colors ${
                palette.isDark 
                  ? 'bg-slate-950/50 border-slate-800/80' 
                  : (appTheme === 'organic' || appTheme === 'cute' ? 'bg-[#F2E7D5]/80 border-[#EADCC8]' : appTheme === 'pink' ? 'bg-[#FCE7F3]/70 border-pink-200' : 'bg-slate-50 border-slate-200')
              }`}>
                <div className="flex items-center justify-between gap-1">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      {is3D ? <Icon3DCreditCard size={16} className="inline-block" /> : <span>💳</span>}
                      <span className={`block text-[10px] font-bold uppercase tracking-wider truncate ${palette.isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {lang === 'id' ? 'Total Hutang' : 'Total Debts'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setHideDebtBalance(!hideDebtBalance)}
                        className={`p-0.5 rounded transition-colors cursor-pointer shrink-0 ${palette.isDark ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'}`}
                        title={hideDebtBalance ? (lang === 'id' ? 'Tampilkan Total Hutang' : 'Show Total Debts') : (lang === 'id' ? 'Sembunyikan Total Hutang' : 'Hide Total Debts')}
                      >
                        {hideDebtBalance ? <EyeOff className="w-3 h-3 text-slate-500" /> : <Eye className="w-3 h-3 text-rose-500" />}
                      </button>
                    </div>
                    <span className="text-rose-500 font-extrabold text-sm sm:text-base block mt-0.5">
                      {hideDebtBalance ? 'Rp •••••••' : formatCurrency(totalDebt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('debts')}
                    className="px-2 py-1 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 text-[10px] font-bold border border-rose-500/20 transition-colors cursor-pointer shrink-0"
                  >
                    {lang === 'id' ? 'Kelola' : 'Manage'}
                  </button>
                </div>

                {/* Catatan Hutang vs Total Uang */}
                <div className="pt-1.5 border-t border-slate-800/60 text-[10px] leading-snug">
                  {totalDebt > 0 ? (
                    totalNetCash >= totalDebt ? (
                      <div className="text-emerald-400 font-medium">
                        <span className="font-bold text-slate-300">
                          {hideDebtBalance || hideTotalNetBalance ? 'Rp ••••••• - Rp •••••••' : `${formatCurrency(totalDebt)} - ${formatCurrency(totalNetCash)}`} = {hideDebtBalance || hideTotalNetBalance ? 'Rp •••••••' : formatCurrency(totalNetCash - totalDebt)}
                        </span>
                        <p className="text-[9.5px] text-emerald-400/90 mt-0.5">
                          {lang === 'id' 
                            ? `Masih punya sisa ${hideDebtBalance || hideTotalNetBalance ? 'Rp •••••••' : formatCurrency(totalNetCash - totalDebt)}` 
                            : `${hideDebtBalance || hideTotalNetBalance ? 'Rp •••••••' : formatCurrency(totalNetCash - totalDebt)} remaining`}
                        </p>
                      </div>
                    ) : (
                      <div className="text-rose-400 font-medium">
                        <span className="font-bold text-slate-300">
                          {hideDebtBalance || hideTotalNetBalance ? 'Rp ••••••• - Rp •••••••' : `${formatCurrency(totalDebt)} - ${formatCurrency(totalNetCash)}`} = {hideDebtBalance || hideTotalNetBalance ? 'Rp •••••••' : formatCurrency(totalDebt - totalNetCash)}
                        </span>
                        <p className="text-[9.5px] text-amber-400/90 mt-0.5">
                          {lang === 'id'
                            ? `Butuh ${hideDebtBalance || hideTotalNetBalance ? 'Rp •••••••' : formatCurrency(totalDebt - totalNetCash)} lagi untuk melunasi hutang`
                            : `Need ${hideDebtBalance || hideTotalNetBalance ? 'Rp •••••••' : formatCurrency(totalDebt - totalNetCash)} more to pay off debt`}
                        </p>
                      </div>
                    )
                  ) : (
                    <span className="text-slate-400 text-[10px]">
                      {lang === 'id' ? '🎉 Bebas hutang' : '🎉 Debt free'}
                    </span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* VIEW NAVIGATION TABS */}
          <div className={`grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl border transition-colors ${themeTabContainer}`}>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {is3D ? <Icon3DReceipt size={18} /> : <Receipt className="w-4 h-4" />}
              <span className="truncate">{lang === 'id' ? 'Riwayat' : 'Transactions'}</span>
            </button>

            <button
              onClick={() => setActiveTab('savings')}
              className={`py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'savings'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {is3D ? <Icon3DPiggy size={18} /> : <PiggyBank className="w-4 h-4" />}
              <span className="truncate">{lang === 'id' ? 'Tabungan' : 'Savings'}</span>
            </button>

            <button
              onClick={() => setActiveTab('debts')}
              className={`py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'debts'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {is3D ? <Icon3DCreditCard size={18} /> : <CreditCard className="w-4 h-4" />}
              <span className="truncate">{lang === 'id' ? 'Hutang & Cicilan' : 'Debts'}</span>
            </button>

            <button
              onClick={() => setActiveTab('analytics')}
              className={`py-2 px-2 sm:px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {is3D ? <Icon3DChartPie size={18} /> : <PieChartIcon className="w-4 h-4" />}
              <span className="truncate">{lang === 'id' ? 'Analisis' : 'Analytics'}</span>
            </button>
          </div>

          {/* TAB 1: TRANSACTIONS LIST */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              
              {/* Clean Filter & Search Strip */}
              <div className={`p-3 rounded-2xl space-y-2.5 border transition-colors ${themeCardBg}`}>
                {/* Row 1: Month Selector & Type Filters */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className={`flex items-center gap-1 p-1 rounded-xl border self-start sm:self-auto ${themeInnerCardBg}`}>
                    <button
                      onClick={() => handleMonthChange('prev')}
                      disabled={selectedMonth === 'all'}
                      className={`p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                        isLight ? 'hover:bg-black/5 text-slate-600' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                      title={lang === 'id' ? 'Bulan Sebelumnya' : 'Previous Month'}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className={`text-xs font-bold px-2 min-w-[100px] text-center ${themePrimaryText}`}>
                      {monthDisplayTitle}
                    </span>

                    <button
                      onClick={() => handleMonthChange('next')}
                      disabled={selectedMonth === 'all'}
                      className={`p-1 rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                        isLight ? 'hover:bg-black/5 text-slate-600' : 'hover:bg-slate-800 text-slate-300'
                      }`}
                      title={lang === 'id' ? 'Bulan Berikutnya' : 'Next Month'}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setSelectedMonth(todayISO.substring(0, 7))}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        selectedMonth === todayISO.substring(0, 7)
                          ? 'bg-indigo-600 text-white'
                          : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang === 'id' ? 'Bulan Ini' : 'This Month'}
                    </button>

                    <button
                      onClick={() => setSelectedMonth('all')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        selectedMonth === 'all'
                          ? 'bg-indigo-600 text-white'
                          : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang === 'id' ? 'Semua Waktu' : 'All Time'}
                    </button>
                  </div>

                  {/* Filter Types */}
                  <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
                    <button
                      onClick={() => setTypeFilter('all')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                        typeFilter === 'all'
                          ? 'bg-indigo-600 text-white'
                          : isLight ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200' : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {lang === 'id' ? 'Semua' : 'All'}
                    </button>

                    <button
                      onClick={() => setTypeFilter('income')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                        typeFilter === 'income'
                          ? 'bg-emerald-600 text-white'
                          : isLight ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200' : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <ArrowDownRight className="w-3 h-3" />
                      {lang === 'id' ? 'Pemasukan' : 'Income'}
                    </button>

                    <button
                      onClick={() => setTypeFilter('expense')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                        typeFilter === 'expense'
                          ? 'bg-rose-600 text-white'
                          : isLight ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200' : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <ArrowUpRight className="w-3 h-3" />
                      {lang === 'id' ? 'Pengeluaran' : 'Expense'}
                    </button>

                    <button
                      onClick={() => setTypeFilter('savings')}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1 ${
                        typeFilter === 'savings'
                          ? 'bg-amber-600 text-white'
                          : isLight ? 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200' : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      <Target className="w-3 h-3" />
                      {lang === 'id' ? 'Tabungan' : 'Savings'}
                    </button>
                  </div>
                </div>

                {/* Row 2: Search Bar, Sort, CSV Export & Period Totals */}
                <div className={`flex flex-col sm:flex-row gap-2 pt-1.5 border-t ${themeBorder}`}>
                  <div className="relative flex-1">
                    <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${themeSubText}`} />
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={lang === 'id' ? 'Cari deskripsi, nominal...' : 'Search description...'}
                      className={`w-full border rounded-xl py-1.5 pl-8 pr-7 text-xs outline-none transition-colors ${themeInputBg}`}
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')} 
                        className={`absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer ${themeSubText}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Utility Controls: Sort, CSV & Print */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                    {/* Sort Selector */}
                    <div className="relative flex items-center">
                      <select
                        value={sortBy}
                        onChange={(e: any) => setSortBy(e.target.value)}
                        className={`border font-medium text-xs rounded-xl py-1.5 pl-2.5 pr-7 appearance-none outline-none cursor-pointer ${themeInputBg}`}
                        title={lang === 'id' ? 'Urutkan Transaksi' : 'Sort Transactions'}
                      >
                        <option value="date-desc">{lang === 'id' ? 'Terbaru' : 'Newest'}</option>
                        <option value="date-asc">{lang === 'id' ? 'Terlama' : 'Oldest'}</option>
                        <option value="amount-desc">{lang === 'id' ? 'Nominal Max' : 'Highest Amount'}</option>
                        <option value="amount-asc">{lang === 'id' ? 'Nominal Min' : 'Lowest Amount'}</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2 pointer-events-none" />
                    </div>

                    {/* Statement & Export Link (Relocated & Consolidated to Analisis) */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('analytics');
                      }}
                      className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:text-indigo-500 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                      title={lang === 'id' ? 'Buka Menu Analisis & Statement Bank' : 'Go to Analytics & Bank Statement'}
                    >
                      <Landmark className="w-3.5 h-3.5 text-indigo-400" />
                      <span>{lang === 'id' ? 'Statement Bank' : 'Statement Bank'}</span>
                    </button>

                    {/* Period Summary Totals Badge */}
                    <div className={`flex items-center gap-2 px-2.5 py-1.5 border rounded-xl text-[11px] font-bold shrink-0 ${themeInnerCardBg}`}>
                      <span className="text-emerald-500 font-black">+{formatCurrency(totalIncomePeriod)}</span>
                      <span className={themeSubText}>|</span>
                      <span className="text-rose-500 font-black">-{formatCurrency(totalExpensePeriod)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions List */}
              {displayData.keys.length === 0 ? (
                <div className={`flex flex-col items-center justify-center py-16 px-4 text-center border-2 border-dashed rounded-3xl ${
                  isLight ? 'border-slate-300 bg-slate-50/70' : 'border-slate-800 bg-slate-900/40'
                }`}>
                  <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-3">
                    {searchQuery ? <Search className="w-6 h-6" /> : <Wallet className="w-6 h-6" />}
                  </div>
                  <h4 className={`text-sm font-bold mb-1 ${themePrimaryText}`}>
                    {searchQuery 
                      ? (lang === 'id' ? 'Tidak ada transaksi yang cocok' : 'No matching transactions')
                      : (t('noTransactions') as string)}
                  </h4>
                  <p className={`text-xs max-w-xs mb-4 ${themeSubText}`}>
                    {lang === 'id' ? 'Catat pemasukan atau pengeluaran harianmu dengan mudah.' : 'Record your daily income or expenses easily.'}
                  </p>
                  <button
                    onClick={() => {
                      resetAddForm('expense');
                      setShowAddModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    {lang === 'id' ? 'Tambah Transaksi Pertama' : 'Add First Transaction'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {displayData.keys.map(dateKey => {
                    const [y, m, dNum] = dateKey.split('-').map(Number);
                    const dateObj = new Date(y, m - 1, dNum);
                    const now = new Date();
                    
                    let dateLabel = dateObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
                    if (dateObj.toDateString() === now.toDateString()) {
                      dateLabel = lang === 'id' ? 'Hari Ini' : 'Today';
                    } else {
                      const yesterday = new Date(now);
                      yesterday.setDate(now.getDate() - 1);
                      if (dateObj.toDateString() === yesterday.toDateString()) {
                        dateLabel = lang === 'id' ? 'Kemarin' : 'Yesterday';
                      }
                    }

                    return (
                      <div key={dateKey} className="space-y-2">
                        <span className={`text-[11px] font-bold uppercase tracking-wider ml-1 block ${themeSubText}`}>
                          {dateLabel}
                        </span>

                        <div className="space-y-2">
                          {displayData.groups[dateKey].map(tx => {
                            const isSavings = isSavingsCategory(tx.category);
                            const emoji = getCategoryEmoji(tx.category);

                            return (
                              <div 
                                key={tx.id}
                                className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 group ${themeCardBg} ${
                                  isLight ? 'hover:border-slate-300' : 'hover:border-slate-700'
                                }`}
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-base shrink-0 font-bold ${
                                    isSavings 
                                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' 
                                      : tx.type === 'income' 
                                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' 
                                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                                  }`}>
                                    {emoji}
                                  </div>

                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <h4 className={`text-xs sm:text-sm font-bold truncate ${themePrimaryText}`}>
                                        {translateCategory(tx.category, lang)}
                                      </h4>
                                      {isSavings && (
                                        <span className="px-1.5 py-0.5 text-[9px] font-extrabold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                                          {lang === 'id' ? 'Tabungan' : 'Savings'}
                                        </span>
                                      )}
                                    </div>
                                    <p className={`text-[11px] truncate mt-0.5 ${themeSubText}`}>
                                      {tx.description || translateCategory(tx.category, lang)}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="text-right">
                                    <span className={`text-xs sm:text-sm font-black block ${
                                      isSavings 
                                        ? 'text-amber-500 font-extrabold' 
                                        : tx.type === 'income' 
                                          ? 'text-emerald-500 font-extrabold' 
                                          : 'text-rose-500 font-extrabold'
                                    }`}>
                                      {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount, tx.currency)}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                    <button
                                      onClick={() => handleEditClick(tx)}
                                      className={`p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer ${
                                        isLight ? 'hover:bg-black/5' : 'hover:bg-slate-800'
                                      }`}
                                      title={lang === 'id' ? 'Ubah' : 'Edit'}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setShowDeleteConfirm(tx.id)}
                                      className={`p-1.5 rounded-lg text-slate-400 hover:text-rose-400 transition-colors cursor-pointer ${
                                        isLight ? 'hover:bg-black/5' : 'hover:bg-slate-800'
                                      }`}
                                      title={lang === 'id' ? 'Hapus' : 'Delete'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {displayData.hasMore && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => setShowAllTransactions(true)}
                        className={`px-4 py-2 rounded-xl text-indigo-400 text-xs font-bold transition-colors cursor-pointer border ${themeBtnSecondary}`}
                      >
                        {lang === 'id' ? 'Tampilkan Lebih Banyak Transaksi' : 'Show All Transactions'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TABUNGAN BANYAK TARGET (MULTI-SAVINGS GOALS) */}
          {activeTab === 'savings' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Simplified & Elegant Savings Overview Card */}
              <div className={`p-5 sm:p-6 rounded-3xl border shadow-xl space-y-4 ${themeCardBg}`}>
                {/* Header & Quick Action Buttons */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 shadow-inner">
                      <PiggyBank className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base sm:text-lg font-black ${themePrimaryText}`}>
                          {lang === 'id' ? 'Pos Tabungan & Impian' : 'Savings & Dream Goals'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black">
                          {savingsGoals.length} {lang === 'id' ? 'pos' : 'goals'}
                        </span>
                      </div>
                      <p className={`text-xs ${themeSubText}`}>
                        {lang === 'id'
                          ? 'Alokasikan dana impianmu secara teratur dan mandiri.'
                          : 'Allocate funds towards your goals with clear tracking.'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenAddGoal()}
                      className="flex-1 sm:flex-initial px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{lang === 'id' ? '+ Tambah Tabungan' : '+ New Goal'}</span>
                    </button>
                    {savingsGoals.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenDepositModal()}
                          className="px-3.5 py-2.5 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          title={lang === 'id' ? 'Setor uang ke salah satu tabungan' : 'Deposit money to savings'}
                        >
                          <ArrowDownRight className="w-4 h-4" />
                          <span>{lang === 'id' ? 'Setor' : 'Deposit'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenWithdrawModal()}
                          className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${themeBtnSecondary}`}
                          title={lang === 'id' ? 'Tarik uang dari tabungan ke saldo utama' : 'Withdraw money from savings'}
                        >
                          <ArrowUpRight className="w-4 h-4" />
                          <span>{lang === 'id' ? 'Tarik' : 'Withdraw'}</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Clean Unified Hero Balance & Progress Strip */}
                <div className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${themeInnerCardBg}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${themeSubText}`}>
                        {lang === 'id' ? 'Total Saldo Terkumpul' : 'Total Accumulated'}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xl sm:text-2xl font-black text-amber-500">
                          {hideSavingsBalance ? 'Rp •••••••' : formatCurrency(activeSavingsBalance)}
                        </span>
                        <button
                          type="button"
                          onClick={() => setHideSavingsBalance(!hideSavingsBalance)}
                          className="p-1 text-slate-500 hover:text-slate-400 transition-colors cursor-pointer"
                          title={hideSavingsBalance ? (lang === 'id' ? 'Tampilkan saldo' : 'Show balance') : (lang === 'id' ? 'Sembunyikan saldo' : 'Hide balance')}
                        >
                          {hideSavingsBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className={`text-[10px] font-bold uppercase tracking-wider block ${themeSubText}`}>
                        {lang === 'id' ? 'Target Keseluruhan' : 'Total Target'}
                      </span>
                      <div className={`text-xs sm:text-sm font-extrabold mt-0.5 ${themePrimaryText}`}>
                        {formatCurrency(activeSavingsTarget)}
                        <span className="text-amber-500 ml-1.5 font-bold">
                          ({activeSavingsTarget > 0 ? `${Math.min(100, Math.max(0, (activeSavingsBalance / activeSavingsTarget) * 100)).toFixed(1)}%` : '0%'})
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Clean Modern Progress Bar */}
                  <div className="space-y-1.5">
                    <div className={`h-2.5 w-full rounded-full overflow-hidden p-0.5 border ${isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          activeSavingsTarget > 0 && activeSavingsBalance >= activeSavingsTarget 
                            ? 'bg-gradient-to-r from-amber-400 to-emerald-400' 
                            : 'bg-gradient-to-r from-amber-500 to-amber-400'
                        }`}
                        style={{ width: `${activeSavingsTarget > 0 ? Math.min(100, Math.max(0, (activeSavingsBalance / activeSavingsTarget) * 100)) : 0}%` }}
                      />
                    </div>
                    
                    <div className={`flex flex-wrap items-center justify-between text-[11px] gap-1 ${themeSubText}`}>
                      <span>
                        {activeSavingsTarget > activeSavingsBalance 
                          ? (lang === 'id' ? `Kurang ${formatCurrency(activeSavingsTarget - activeSavingsBalance)} lagi untuk mencapai seluruh target` : `Need ${formatCurrency(activeSavingsTarget - activeSavingsBalance)} more to reach all targets`)
                          : (lang === 'id' ? '🎉 Luar biasa! Seluruh target tabungan telah terpenuhi.' : '🎉 Great job! All savings targets reached.')}
                      </span>
                      {totalYieldBearingGoalsCount > 0 && (
                        <span className="text-emerald-500 font-bold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <Percent className="w-3 h-3" />
                          <span>+{formatCurrency(totalMonthlyYieldFromGoals)} / {lang === 'id' ? 'bln bunga bersih' : 'mo net yield'}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Filter Tabs & View Mode Switcher */}
                <div className={`flex items-center justify-between gap-3 pt-2 border-t flex-wrap ${themeBorder}`}>
                  {/* Status Filter Tabs */}
                  <div className={`flex items-center gap-1 p-1 rounded-xl border ${themeInnerCardBg}`}>
                    <button
                      type="button"
                      onClick={() => setSavingsStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        savingsStatusFilter === 'all'
                          ? (isLight ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'bg-slate-800 text-white shadow-sm')
                          : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                      }`}
                    >
                      {lang === 'id' ? 'Semua' : 'All'} ({savingsGoals.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavingsStatusFilter('active')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        savingsStatusFilter === 'active'
                          ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                          : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                      }`}
                    >
                      {lang === 'id' ? 'Berjalan' : 'Active'} ({savingsGoals.filter(g => g.targetAmount <= 0 || g.currentAmount < g.targetAmount).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSavingsStatusFilter('achieved')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        savingsStatusFilter === 'achieved'
                          ? 'bg-emerald-600 text-white font-black shadow-sm'
                          : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                      }`}
                    >
                      {lang === 'id' ? 'Tercapai 🎉' : 'Achieved 🎉'} ({savingsGoals.filter(g => g.targetAmount > 0 && g.currentAmount >= g.targetAmount).length})
                    </button>
                  </div>

                  {/* Mode Ringkas vs Detail Switcher */}
                  <div className={`flex items-center p-1 rounded-xl border ${themeInnerCardBg}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSavingsViewMode('simple');
                        localStorage.setItem('tata_savings_view_mode', 'simple');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        savingsViewMode === 'simple'
                          ? 'bg-amber-500 text-zinc-950 font-black shadow-sm'
                          : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                      }`}
                      title={lang === 'id' ? 'Tampilan Ringkas & Bersih' : 'Clean & Simple View'}
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'Ringkas' : 'Simple'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSavingsViewMode('detail');
                        localStorage.setItem('tata_savings_view_mode', 'detail');
                      }}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                        savingsViewMode === 'detail'
                          ? 'bg-indigo-600 text-white font-black shadow-sm'
                          : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200')
                      }`}
                      title={lang === 'id' ? 'Tampilan Rinci dengan Info Bunga/Pajak' : 'Detailed with Yield & Tax Info'}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'Detail & Bunga' : 'Detailed'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* SAVINGS GOALS GRID */}
              {(() => {
                const filteredGoals = savingsGoals.filter(goal => {
                  if (savingsStatusFilter === 'active') {
                    return goal.targetAmount <= 0 || goal.currentAmount < goal.targetAmount;
                  }
                  if (savingsStatusFilter === 'achieved') {
                    return goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount;
                  }
                  return true;
                });

                if (savingsGoals.length === 0) {
                  return (
                    /* Clean Empty State with Fast 1-Click Presets */
                    <div className={`p-6 sm:p-8 rounded-3xl border text-center space-y-5 ${themeCardBg}`}>
                      <div className="w-14 h-14 rounded-3xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
                        <PiggyBank className="w-7 h-7" />
                      </div>
                      <div>
                        <h4 className={`text-base font-bold mb-1 ${themePrimaryText}`}>
                          {lang === 'id' ? 'Belum Ada Pos Tabungan' : 'No Savings Goals Yet'}
                        </h4>
                        <p className={`text-xs max-w-sm mx-auto ${themeSubText}`}>
                          {lang === 'id' 
                            ? 'Mulai atur pos tabungan impianmu. Pilih contoh siap pakai di bawah untuk membuat cepat:' 
                            : 'Start organizing your dreams. Pick a preset below to start in one tap:'}
                        </p>
                      </div>

                      {/* 4 Clean Presets */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-lg mx-auto text-left">
                        {[
                          { title: 'Dana Darurat 3 Bulan', emoji: '🛡️', category: 'Darurat', target: 15000000 },
                          { title: 'Beli Laptop / Gadget', emoji: '💻', category: 'Elektronik', target: 12000000 },
                          { title: 'Liburan Akhir Tahun', emoji: '🏖️', category: 'Liburan', target: 8000000 },
                          { title: 'Deposito Berbunga 6%', emoji: '🏦', category: 'Investasi', target: 20000000, instrumentType: 'deposito' as const, institutionName: 'Bank Jago', interestRate: 6.0, taxRate: 20, isCompound: false }
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleOpenAddGoal(preset)}
                            className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer hover:border-amber-500/40 group active:scale-98 ${themeInnerCardBg}`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <span className="text-xl">{preset.emoji}</span>
                              <span className="truncate group-hover:text-amber-500 transition-colors font-bold">{preset.title}</span>
                            </div>
                            <span className="text-[11px] text-amber-500 font-extrabold shrink-0 ml-2">{formatCurrency(preset.target)}</span>
                          </button>
                        ))}
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => handleOpenAddGoal()}
                          className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs inline-flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
                        >
                          <Plus className="w-4 h-4" />
                          <span>{lang === 'id' ? '+ Buat Target Sendiri' : '+ Create Custom Goal'}</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                if (filteredGoals.length === 0) {
                  return (
                    <div className={`p-8 rounded-3xl border text-center space-y-3 ${themeCardBg}`}>
                      <p className={`text-xs ${themeSubText}`}>
                        {lang === 'id' ? 'Tidak ada tabungan dengan filter ini.' : 'No goals found for this filter.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => setSavingsStatusFilter('all')}
                        className={`px-4 py-2 rounded-xl border text-amber-500 text-xs font-bold transition-colors cursor-pointer ${themeBtnSecondary}`}
                      >
                        {lang === 'id' ? 'Tampilkan Semua Pos Tabungan' : 'Show All Goals'}
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredGoals.map((goal) => {
                      const perc = goal.targetAmount > 0 ? Math.min(100, Math.max(0, (goal.currentAmount / goal.targetAmount) * 100)) : 100;
                      const isGoalAchieved = goal.targetAmount > 0 && goal.currentAmount >= goal.targetAmount;
                      const remainingToSave = Math.max(0, goal.targetAmount - goal.currentAmount);
                      const instInfo = getInstrumentInfo(goal.instrumentType, lang);
                      const hasYield = Boolean(goal.interestRate && goal.interestRate > 0);
                      const yieldData = calculateGoalYield(
                        goal.currentAmount || 0,
                        goal.interestRate || 0,
                        goal.taxRate !== undefined ? goal.taxRate : (goal.instrumentType === 'deposito' || goal.instrumentType === 'bank' ? 20 : 0),
                        goal.targetDate,
                        goal.isCompound
                      );
                      const isYieldExpanded = expandedGoalYieldId === goal.id;

                      return (
                        <div 
                          key={goal.id}
                          className={`p-5 rounded-3xl border transition-all duration-200 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md ${themeCardBg} ${
                            isGoalAchieved 
                              ? 'border-emerald-500/30 hover:border-emerald-500/50' 
                              : (isLight ? 'hover:border-slate-300' : 'hover:border-slate-700')
                          }`}
                        >
                          {/* Goal Card Header */}
                          <div className="space-y-2.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-2xl flex items-center justify-center shrink-0 shadow-inner">
                                  {goal.emoji || '🎯'}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className={`text-base font-extrabold truncate ${themePrimaryText}`}>
                                      {goal.title}
                                    </h4>
                                    {isGoalAchieved && (
                                      <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black tracking-wide flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        {lang === 'id' ? 'Tercapai 🎉' : 'Achieved 🎉'}
                                      </span>
                                    )}
                                  </div>
                                  
                                  {/* Clean Metadata Badges Row */}
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {goal.category && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-800 text-slate-300 border-slate-700/60'}`}>
                                        {goal.category}
                                      </span>
                                    )}

                                    {(goal.institutionName || (goal.instrumentType && goal.instrumentType !== 'bank') || hasYield) && (
                                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border flex items-center gap-1 ${instInfo.badgeClass}`}>
                                        <span>{instInfo.icon}</span>
                                        <span>{goal.institutionName || instInfo.label}</span>
                                        {hasYield && (
                                          <span className="font-black text-indigo-400 ml-0.5">{goal.interestRate}%</span>
                                        )}
                                      </span>
                                    )}

                                    {goal.targetDate && (
                                      <span className={`text-[10px] flex items-center gap-1 px-2 py-0.5 rounded-md border ${themeInnerCardBg}`}>
                                        <Calendar className="w-3 h-3 text-indigo-400" />
                                        {goal.targetDate}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Options buttons (Edit / Delete) */}
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditGoal(goal)}
                                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                                    isLight ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-amber-500 hover:bg-slate-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-400 hover:bg-slate-800'
                                  }`}
                                  title={lang === 'id' ? 'Ubah Target' : 'Edit Goal'}
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setShowDeleteGoalConfirm(goal.id)}
                                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                                    isLight ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-rose-500 hover:bg-slate-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                                  }`}
                                  title={lang === 'id' ? 'Hapus Target' : 'Delete Goal'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {/* Optional Note */}
                            {goal.notes && (
                              <p className={`text-xs p-2.5 rounded-xl border italic ${themeInnerCardBg}`}>
                                &quot;{goal.notes}&quot;
                              </p>
                            )}
                          </div>

                          {/* Progress & Balances Box */}
                          <div className={`space-y-2.5 p-3.5 rounded-2xl border ${themeInnerCardBg}`}>
                            <div className="flex justify-between items-baseline">
                              <div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider block ${themeSubText}`}>
                                  {lang === 'id' ? 'Saldo Terkumpul' : 'Saved'}
                                </span>
                                <span className={`text-lg font-black ${themePrimaryText}`}>
                                  {hideSavingsBalance ? 'Rp •••••••' : formatCurrency(goal.currentAmount)}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className={`text-xs font-black ${isGoalAchieved ? 'text-emerald-500' : 'text-amber-500'}`}>
                                  {perc.toFixed(1)}%
                                </span>
                                <span className={`text-[10px] block ${themeSubText}`}>
                                  {goal.targetAmount > 0 ? (lang === 'id' ? `Target: ${formatCurrency(goal.targetAmount)}` : `Target: ${formatCurrency(goal.targetAmount)}`) : (lang === 'id' ? 'Tanpa batas target' : 'No limit')}
                                </span>
                              </div>
                            </div>

                            {/* Smooth Progress Bar */}
                            <div className={`h-2.5 w-full rounded-full overflow-hidden p-0.5 border ${isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isGoalAchieved 
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400' 
                                    : 'bg-gradient-to-r from-amber-500 to-amber-400'
                                }`}
                                style={{ width: `${perc}%` }}
                              />
                            </div>

                            {!isGoalAchieved && goal.targetAmount > 0 && (
                              <div className={`flex justify-between items-center text-[11px] pt-0.5 ${themeSubText}`}>
                                <span>{lang === 'id' ? 'Sisa yang perlu ditabung:' : 'Remaining to save:'}</span>
                                <span className="font-bold text-amber-500">{formatCurrency(remainingToSave)}</span>
                              </div>
                            )}

                            {/* Yield strip (if interest is configured) */}
                            {hasYield && (
                              <div className={`pt-2 border-t space-y-2 ${themeBorder}`}>
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-emerald-500 font-bold flex items-center gap-1 text-[11px]">
                                    <Percent className="w-3 h-3 text-emerald-500" />
                                    <span>+{formatCurrency(yieldData.monthlyNet)} / {lang === 'id' ? 'bln bunga bersih' : 'mo net'}</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setExpandedGoalYieldId(isYieldExpanded ? null : goal.id)}
                                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>{isYieldExpanded ? (lang === 'id' ? 'Tutup Rincian' : 'Hide Detail') : (lang === 'id' ? 'Rincian Bunga ▾' : 'Yield Breakdown ▾')}</span>
                                  </button>
                                </div>

                                {/* Expanded Yield Breakdown (Clean & compact) */}
                                {(isYieldExpanded || savingsViewMode === 'detail') && (
                                  <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-[10px] space-y-1.5 animate-in fade-in duration-150">
                                    <div className={`flex justify-between ${themePrimaryText}`}>
                                      <span>{lang === 'id' ? `Bunga Tahunan (${goal.interestRate}% p.a.):` : `Annual Rate (${goal.interestRate}% p.a.):`}</span>
                                      <span className="text-emerald-500 font-bold">+{formatCurrency(yieldData.annualNet)} / {lang === 'id' ? 'thn (bersih)' : 'yr (net)'}</span>
                                    </div>
                                    <div className={`flex justify-between ${themeSubText}`}>
                                      <span>{lang === 'id' ? `Pajak PPh (${goal.taxRate || 0}%):` : `Tax (${goal.taxRate || 0}%):`}</span>
                                      <span className="text-rose-500">-{formatCurrency(yieldData.taxAmountAnnual)} / {lang === 'id' ? 'thn' : 'yr'}</span>
                                    </div>
                                    {goal.targetDate && yieldData.daysToTarget > 0 && (
                                      <div className="pt-1 border-t border-indigo-500/20 text-indigo-300">
                                        🎯 {lang === 'id' ? 'Proyeksi s/d target' : 'Target projection'}: <strong className="text-emerald-500 font-black">+{formatCurrency(yieldData.projectedYieldAtTarget)}</strong>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Card Action Buttons (Setor & Tarik) */}
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleOpenDepositModal(goal.id)}
                              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{lang === 'id' ? 'Setor' : 'Deposit'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenWithdrawModal(goal.id)}
                              className={`py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${themeBtnSecondary}`}
                            >
                              <Minus className="w-3.5 h-3.5" />
                              <span>{lang === 'id' ? 'Tarik' : 'Withdraw'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 3: HUTANG & ANGSURAN */}
          {activeTab === 'debts' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Debt Overview Header */}
              <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${themeCardBg}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`text-base font-bold ${themePrimaryText}`}>
                        {lang === 'id' ? 'Daftar Hutang & Cicilan' : 'Debts & Installments'}
                      </h3>
                      <p className={`text-xs ${themeSubText}`}>
                        {lang === 'id'
                          ? 'Tambah nominal hutang cepat (Simpel) atau catat rincian cicilan & angsuran lengkap (Detail).'
                          : 'Record simple direct debt amounts or detailed installment payment schedules.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenAddDebt('simple')}
                    className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'id' ? '⚡ Hutang Simpel' : 'Simple Debt'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenAddDebt('detail')}
                    className={`flex-1 sm:flex-initial px-3.5 py-2.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${themeBtnSecondary}`}
                  >
                    <List className="w-4 h-4" />
                    <span>{lang === 'id' ? '📋 Rincian Cicilan' : 'Detailed Installment'}</span>
                  </button>
                  {(debts.length > 0 || totalDebt > 0 || initialDebt > 0) && (
                    <button
                      type="button"
                      onClick={() => setShowResetDebtConfirm(true)}
                      className="px-3.5 py-2.5 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
                      title={lang === 'id' ? 'Hapus semua data hutang & reset total ke Rp 0' : 'Delete all debt data & reset total to Rp 0'}
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">{lang === 'id' ? 'Reset Hutang 0' : 'Reset Debt 0'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Alert for legacy/remaining initial debt total if debts list is empty */}
              {debts.length === 0 && totalDebt > 0 && (
                <div className="p-4 rounded-3xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row items-center justify-between gap-3 text-rose-200 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2.5 text-xs">
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    <div>
                      <p className="font-bold text-rose-100">
                        {lang === 'id' ? `Terdapat Sisa Total Hutang: ${formatCurrency(totalDebt)}` : `Remaining Total Debt: ${formatCurrency(totalDebt)}`}
                      </p>
                      <p className="text-[11px] text-rose-300/80">
                        {lang === 'id'
                          ? 'Gunakan tombol di sebelah untuk menghapus total ini dan meresetnya menjadi Rp 0 bersih.'
                          : 'Click button to clear remaining debt total and reset to Rp 0.'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      clearAllDebtData();
                      setInitialDebt(0);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs shrink-0 transition-all cursor-pointer shadow-lg shadow-rose-600/30 active:scale-95 flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{lang === 'id' ? 'Hapus Jadi Rp 0' : 'Reset to Rp 0'}</span>
                  </button>
                </div>
              )}

              {/* Empty State */}
              {debts.length === 0 && (
                <div className={`p-8 rounded-3xl border text-center space-y-3 ${themeCardBg}`}>
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <h4 className={`font-bold text-sm ${themePrimaryText}`}>
                    {lang === 'id' ? 'Belum Ada Catatan Hutang' : 'No Debt Records Yet'}
                  </h4>
                  <p className={`text-xs max-w-sm mx-auto ${themeSubText}`}>
                    {lang === 'id' 
                      ? 'Gunakan Mode Simpel untuk memasukkan nominal hutang langsung, atau Mode Detail untuk melacak rincian cicilan & angsuran.'
                      : 'Choose Simple Mode for direct debt amounts, or Detailed Mode to track installments & payment schedules.'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleOpenAddDebt('simple')}
                      className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-md shadow-rose-600/20"
                    >
                      <Zap className="w-4 h-4" />
                      <span>{lang === 'id' ? 'Tambah Hutang Simpel' : 'Add Simple Debt'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenAddDebt('detail')}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 border ${themeBtnSecondary}`}
                    >
                      <List className="w-4 h-4" />
                      <span>{lang === 'id' ? 'Tambah Rincian Cicilan' : 'Add Detailed Installment'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Debt Cards List */}
              {debts.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {debts.map(debt => {
                    const totalAmt = debt.totalAmount || 1;
                    const paidAmt = Math.max(0, totalAmt - debt.remainingAmount);
                    const paidPerc = Math.min(100, Math.round((paidAmt / totalAmt) * 100));
                    const isSimpleDebt = (debt.installmentCount || 1) <= 1 && (!debt.paymentFrequency || debt.paymentFrequency === 'custom');

                    return (
                      <div 
                        key={debt.id} 
                        className={`p-4 sm:p-5 rounded-3xl border transition-all flex flex-col justify-between gap-3.5 ${
                          debt.isPaidOff 
                            ? 'border-emerald-500/30' 
                            : (isLight ? 'hover:border-slate-300' : 'hover:border-slate-700')
                        } ${themeCardBg}`}
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-bold text-sm sm:text-base ${themePrimaryText}`}>{debt.title}</h4>
                              {debt.isPaidOff ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold">
                                  {lang === 'id' ? 'Lunas 🎉' : 'Paid Off 🎉'}
                                </span>
                              ) : isSimpleDebt ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold flex items-center gap-1">
                                  <Zap className="w-2.5 h-2.5" />
                                  <span>{lang === 'id' ? 'Hutang Simpel' : 'Simple Debt'}</span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] font-bold flex items-center gap-1">
                                  <List className="w-2.5 h-2.5" />
                                  <span>{debt.paymentFrequency === 'weekly' ? (lang === 'id' ? 'Cicilan Mingguan' : 'Weekly') : (lang === 'id' ? 'Cicilan Bulanan' : 'Monthly')}</span>
                                </span>
                              )}
                            </div>
                            {debt.lender && (
                              <p className={`text-[11px] ${themeSubText}`}>
                                {lang === 'id' ? 'Pemberi pinjaman:' : 'Lender:'} <span className="font-medium text-slate-300">{debt.lender}</span>
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleOpenEditDebt(debt)}
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                isLight ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                              }`}
                              title={lang === 'id' ? 'Edit Hutang' : 'Edit Debt'}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowDeleteDebtConfirm(debt.id)}
                              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                                isLight ? 'bg-slate-100 border-slate-200 text-slate-500 hover:text-rose-500 hover:bg-slate-200' : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-slate-800'
                              }`}
                              title={lang === 'id' ? 'Hapus Hutang' : 'Delete Debt'}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* SIMPLE DEBT CARD BODY */}
                        {isSimpleDebt ? (
                          <div className="space-y-3">
                            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-2 ${themeInnerCardBg}`}>
                              <div>
                                <span className={`text-[10px] font-bold block uppercase ${themeSubText}`}>{lang === 'id' ? 'Sisa Hutang' : 'Remaining'}</span>
                                <span className="font-black text-rose-400 text-lg sm:text-xl block">{formatCurrency(debt.remainingAmount)}</span>
                              </div>
                              <div className={`text-right border-l pl-3 ${themeBorder}`}>
                                <span className={`text-[10px] font-bold block uppercase ${themeSubText}`}>{lang === 'id' ? 'Total Awal' : 'Total'}</span>
                                <span className={`font-bold text-xs sm:text-sm block ${themePrimaryText}`}>{formatCurrency(debt.totalAmount)}</span>
                              </div>
                            </div>
                            {debt.notes && (
                              <p className={`text-xs italic p-2.5 rounded-xl border ${themeInnerCardBg}`}>
                                "{debt.notes}"
                              </p>
                            )}
                          </div>
                        ) : (
                          /* DETAILED DEBT CARD BODY */
                          <div className="space-y-3">
                            {/* Progress Bar */}
                            <div className={`space-y-1 p-3 rounded-2xl border ${themeInnerCardBg}`}>
                              <div className="flex justify-between items-center text-[10px] font-bold">
                                <span className={themeSubText}>{lang === 'id' ? 'Progres Pelunasan' : 'Progress'}</span>
                                <span className={paidPerc >= 100 ? 'text-emerald-400' : 'text-rose-400'}>{paidPerc}%</span>
                              </div>
                              <div className={`w-full h-2 rounded-full overflow-hidden border ${isLight ? 'bg-slate-200 border-slate-300' : 'bg-slate-900 border-slate-800'}`}>
                                <div 
                                  className={`h-full transition-all duration-300 ${paidPerc >= 100 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                  style={{ width: `${paidPerc}%` }}
                                />
                              </div>
                            </div>

                            {/* Grid Info */}
                            <div className={`grid grid-cols-2 gap-2 p-3 rounded-2xl border text-xs ${themeInnerCardBg}`}>
                              <div>
                                <span className={`text-[10px] font-bold block uppercase ${themeSubText}`}>{lang === 'id' ? 'Sisa Hutang' : 'Remaining'}</span>
                                <span className="font-black text-rose-400 text-sm mt-0.5 block">{formatCurrency(debt.remainingAmount)}</span>
                              </div>
                              <div>
                                <span className={`text-[10px] font-bold block uppercase ${themeSubText}`}>{lang === 'id' ? 'Total Awal' : 'Total'}</span>
                                <span className={`font-bold mt-0.5 block ${themePrimaryText}`}>{formatCurrency(debt.totalAmount)}</span>
                              </div>
                              <div>
                                <span className={`text-[10px] font-bold block uppercase ${themeSubText}`}>{lang === 'id' ? 'Angsuran / Periode' : 'Installment'}</span>
                                <span className={`font-semibold mt-0.5 block ${themePrimaryText}`}>
                                  {formatCurrency(debt.installmentAmount || Math.round(debt.totalAmount / (debt.installmentCount || 1)))}
                                  <span className={`text-[10px] font-normal ${themeSubText}`}> / {debt.paymentFrequency === 'weekly' ? (lang === 'id' ? 'mgg' : 'wk') : (lang === 'id' ? 'bln' : 'mo')}</span>
                                </span>
                              </div>
                              <div>
                                <span className={`text-[10px] font-bold block uppercase ${themeSubText}`}>{lang === 'id' ? 'Jumlah Angsuran' : 'Installments'}</span>
                                <span className="font-semibold text-indigo-400 mt-0.5 block">
                                  {debt.paidInstallments} / {debt.installmentCount || 1} {lang === 'id' ? 'kali' : 'x'}
                                </span>
                              </div>
                            </div>

                            {/* Due Date & Notes */}
                            {(debt.dueDate || debt.notes) && (
                              <div className={`text-[11px] space-y-0.5 ${themeSubText}`}>
                                {debt.dueDate && (
                                  <div className="flex items-center gap-1.5 text-amber-500 font-medium">
                                    <Clock className="w-3.5 h-3.5 shrink-0" />
                                    <span>{lang === 'id' ? 'Rutin / Jatuh tempo:' : 'Due:'} {debt.dueDate}</span>
                                  </div>
                                )}
                                {debt.notes && (
                                  <p className="text-[10px] italic truncate">"{debt.notes}"</p>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pay Installment Action */}
                        {!debt.isPaidOff && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayInstallment(debt)}
                            className="w-full py-2.5 px-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
                          >
                            <CreditCard className="w-4 h-4" />
                            <span>{lang === 'id' ? 'Bayar Angsuran Ini' : 'Pay Installment'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ANALISIS */}
          {activeTab === 'analytics' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* CONSOLIDATED BANK STATEMENT & EXPORT CARD */}
              <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 shadow-xl relative overflow-hidden ${
                isLight
                  ? (isCute 
                      ? 'bg-gradient-to-br from-[#FAF5EA] via-[#F4ECDC] to-[#EFE5D2] border-[#EADCC8]' 
                      : isPink 
                        ? 'bg-gradient-to-br from-[#FFF0F5] via-[#FCE7F3] to-[#FBCFE8] border-pink-200' 
                        : 'bg-gradient-to-br from-indigo-50/60 via-white to-slate-50 border-slate-200')
                  : 'bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-900 border-indigo-500/30'
              }`}>
                <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${themeBorder}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-lg">
                      <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base sm:text-lg font-black ${themePrimaryText}`}>
                          {lang === 'id' ? 'Statement & Laporan Keuangan' : 'Financial Statement & Report'}
                        </h3>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                          {lang === 'id' ? 'Format Rapih' : 'Pro Format'}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 ${themeSubText}`}>
                        {lang === 'id' 
                          ? 'Satu tempat untuk lihat dan unduh laporan statement mutasi rapih dan terstruktur.' 
                          : 'Unified place to view & download clean financial mutation statements.'}
                      </p>
                    </div>
                  </div>

                  {/* Period Switcher inside Analytics */}
                  <div className={`flex items-center gap-1.5 p-1.5 rounded-2xl border self-start sm:self-auto shrink-0 ${themeInnerCardBg}`}>
                    <button
                      onClick={() => handleMonthChange('prev')}
                      className={`p-1 rounded-xl transition-colors cursor-pointer ${isLight ? 'text-slate-600 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      title={lang === 'id' ? 'Bulan Sebelumnya' : 'Previous Month'}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-extrabold text-indigo-500 px-2 min-w-[100px] text-center">
                      {monthDisplayTitle}
                    </span>
                    <button
                      onClick={() => handleMonthChange('next')}
                      className={`p-1 rounded-xl transition-colors cursor-pointer ${isLight ? 'text-slate-600 hover:bg-black/5' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                      title={lang === 'id' ? 'Bulan Berikutnya' : 'Next Month'}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Account Owner & Account Number Customization */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl border ${themeInnerCardBg}`}>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className={`text-[10px] font-extrabold uppercase tracking-wider block ${themeSubText}`}>
                        {lang === 'id' ? 'Nama Pengguna' : 'User Name'}
                      </label>
                      {user?.name && user.name !== accountOwnerName && (
                        <button
                          type="button"
                          onClick={() => setAccountOwnerName(user.name)}
                          className="text-[10px] text-indigo-500 hover:text-indigo-600 font-bold transition-colors cursor-pointer"
                        >
                          {lang === 'id' ? 'Gunakan Nama Profil' : 'Use Profile Name'}
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={accountOwnerName}
                      onChange={(e) => setAccountOwnerName(e.target.value)}
                      placeholder={lang === 'id' ? 'Masukkan nama...' : 'Enter name...'}
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-extrabold focus:outline-none focus:border-indigo-500 ${themeInputBg}`}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className={`text-[10px] font-extrabold uppercase tracking-wider block ${themeSubText}`}>
                      {lang === 'id' ? 'ID Laporan Statement' : 'Statement ID'}
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. TATA-8820-9102-4411"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-mono font-extrabold focus:outline-none focus:border-indigo-500 ${themeInputBg}`}
                    />
                  </div>
                </div>

                {/* Account Summary Stats Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className={`p-3 rounded-2xl border space-y-1 ${themeInnerCardBg}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${themeSubText}`}>
                      {lang === 'id' ? 'Saldo Awal' : 'Opening Balance'}
                    </span>
                    <span className={`text-xs sm:text-sm font-black block truncate ${themePrimaryText}`}>
                      {formatCurrency(openingBalance)}
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl border space-y-1 ${themeInnerCardBg}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${themeSubText}`}>
                      {lang === 'id' ? 'Total Pemasukan' : 'Total Income'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-500 block truncate">
                      +{formatCurrency(statementTotals.credit)}
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl border space-y-1 ${themeInnerCardBg}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${themeSubText}`}>
                      {lang === 'id' ? 'Total Pengeluaran' : 'Total Expense'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-rose-500 block truncate">
                      -{formatCurrency(statementTotals.debit)}
                    </span>
                  </div>

                  <div className={`p-3 rounded-2xl border space-y-1 ${themeInnerCardBg}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${themeSubText}`}>
                      {lang === 'id' ? 'Saldo Akhir' : 'Closing Balance'}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-indigo-500 block truncate">
                      {formatCurrency(statementTotals.closing)}
                    </span>
                  </div>
                </div>

                {/* Primary Integrated Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    className="py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/25 active:scale-95 cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>{lang === 'id' ? 'Cetak & Lihat Statement' : 'View & Print Statement'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCSV('excel')}
                    className={`py-3 px-4 rounded-2xl border text-emerald-500 font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${themeBtnSecondary}`}
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span>{lang === 'id' ? 'Download CSV (Excel Rapih)' : 'Download CSV (Excel)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleExportCSV('clean_table')}
                    className={`py-3 px-4 rounded-2xl border font-extrabold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer ${themeBtnSecondary}`}
                  >
                    <Download className="w-4 h-4" />
                    <span>{lang === 'id' ? 'Download CSV Data Murni' : 'Download Pure CSV'}</span>
                  </button>
                </div>
              </div>

              <div className={`p-5 rounded-3xl border space-y-4 ${themeCardBg}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${themePrimaryText}`}>
                    <PieChartIcon className="w-4 h-4 text-indigo-400" />
                    <span>{lang === 'id' ? 'Analisis Kategori' : 'Category Breakdown'}</span>
                  </h3>

                  <div className={`flex items-center gap-1 p-1 rounded-xl border ${themeInnerCardBg}`}>
                    <button
                      onClick={() => setChartType('expense')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chartType === 'expense'
                          ? 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                          : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang === 'id' ? 'Pengeluaran' : 'Expense'}
                    </button>
                    <button
                      onClick={() => setChartType('income')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        chartType === 'income'
                          ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                          : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang === 'id' ? 'Pemasukan' : 'Income'}
                    </button>
                  </div>
                </div>

                {chartCategories.length === 0 ? (
                  <p className={`text-xs py-10 text-center ${themeSubText}`}>
                    {lang === 'id' ? 'Belum ada data untuk periode ini.' : 'No category data for this period.'}
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="h-52 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={chartCategories}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                            dataKey="amount"
                          >
                            {chartCategories.map((entry, index) => {
                              const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f43f5e'];
                              return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                            })}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => [formatCurrency(Number(value)), 'Jumlah']}
                            contentStyle={{ 
                              backgroundColor: isLight ? '#ffffff' : '#0f172a', 
                              borderColor: isLight ? '#e2e8f0' : '#334155', 
                              borderRadius: '12px', 
                              color: isLight ? '#0f172a' : '#f8fafc', 
                              fontSize: '12px' 
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className={`space-y-2 pt-2 border-t ${themeBorder}`}>
                      {chartCategories.map((c, i) => {
                        const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4', '#f43f5e'];
                        return (
                          <div key={c.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[i % colors.length] }} />
                                <span className={`font-semibold ${themePrimaryText}`}>{c.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`font-bold ${themePrimaryText}`}>{formatCurrency(c.amount)}</span>
                                <span className={`text-[10px] font-mono w-9 text-right ${themeSubText}`}>{c.perc.toFixed(1)}%</span>
                              </div>
                            </div>
                            <div className={`h-1.5 w-full rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-950'}`}>
                              <div className="h-full rounded-full" style={{ width: `${c.perc}%`, backgroundColor: colors[i % colors.length] }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>



      {/* MODAL: Add / Edit Transaction */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSaveTransaction();
            }}
            className={`relative w-full max-w-sm max-h-[85vh] sm:max-h-[90vh] border rounded-3xl flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 ${themeModalBg}`}
          >
            
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${themeModalHeader}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className={`p-1.5 -ml-1 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
                  title={lang === 'id' ? 'Kembali' : 'Back'}
                >
                  <ArrowLeft className="w-4 h-4 text-indigo-400" />
                </button>
                <h3 className={`text-base font-bold ${themePrimaryText}`}>
                  {editingId ? (t('editTransaction') as string) : (t('addTransaction') as string)}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${themeSubText} ${isLight ? 'hover:bg-black/5' : 'hover:bg-slate-800'}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {/* Type Switcher */}
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${themeSubText}`}>
                  {t('transactionType') as string}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => { setType('expense'); setCategory(''); }}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      type === 'expense' 
                        ? 'border-rose-500 bg-rose-500/15 text-rose-500 shadow-md shadow-rose-500/10' 
                        : `${themeBtnSecondary}`
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    {lang === 'id' ? 'Pengeluaran' : 'Expense'}
                  </button>

                  <button 
                    type="button"
                    onClick={() => { setType('income'); setCategory(''); }}
                    className={`py-2.5 px-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                      type === 'income' 
                        ? 'border-emerald-500 bg-emerald-500/15 text-emerald-500 shadow-md shadow-emerald-500/10' 
                        : `${themeBtnSecondary}`
                    }`}
                  >
                    <ArrowDownRight className="w-4 h-4" />
                    {lang === 'id' ? 'Pemasukan' : 'Income'}
                  </button>
                </div>
              </div>

              {/* Amount Input (Main Focus) */}
              <div className="space-y-1.5">
                <label className={`block text-[10px] font-bold uppercase tracking-wider ${themeSubText}`}>
                  {t('amount') as string}
                </label>
                <div className={`flex items-center px-3 py-3 rounded-2xl border shadow-inner ${themeInnerCardBg} ${themeBorder}`}>
                  <select 
                    value={currency} 
                    onChange={e => setCurrency(e.target.value as 'IDR' | 'USD')}
                    className="bg-transparent font-bold text-indigo-500 outline-none mr-2 cursor-pointer text-xs"
                  >
                    <option value="IDR" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>Rp</option>
                    <option value="USD" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-slate-100'}>$</option>
                  </select>
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={amount !== '' ? (isNaN(Number(amount)) ? amount : Number(amount).toLocaleString(currency === 'IDR' ? 'id-ID' : 'en-US')) : ''}
                    onChange={e => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveTransaction();
                      }
                    }}
                    className={`w-full bg-transparent text-base font-bold outline-none ${themePrimaryText}`}
                    placeholder="0"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setAmount(prev => (prev ? prev.replace(/[^0-9]/g, '') + '000' : '1000'))}
                    className="ml-2 px-2.5 py-1 bg-indigo-600/20 text-indigo-500 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-black shrink-0 transition-all cursor-pointer border border-indigo-500/30"
                    title="Tambah .000 (Ribuan)"
                  >
                    +000
                  </button>
                </div>
                <QuickAmountRow currentVal={amount} onUpdate={setAmount} currency={currency} isLight={isLight} />
                <AmountPreviewHelper rawVal={amount} onUpdateValue={setAmount} currency={currency} />
                {error && <p className="text-rose-500 text-[10px] font-semibold mt-1">{error}</p>}
              </div>

              {/* Collapsible Detail Toggle (Kategori, Tanggal, Catatan) */}
              <div className={`pt-2 border-t ${themeBorder}`}>
                <button
                  type="button"
                  onClick={() => setShowAddModalDetails(prev => !prev)}
                  className={`w-full flex items-center justify-between py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${themeInnerCardBg}`}
                >
                  <span className={`flex items-center gap-2 ${themePrimaryText}`}>
                    <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                    {lang === 'id' ? 'Detail Tambahan (Kategori, Tanggal, Catatan)' : 'More Details (Category, Date, Note)'}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAddModalDetails ? 'rotate-180 text-indigo-400' : themeSubText}`} />
                </button>

                {showAddModalDetails && (
                  <div className="mt-3 space-y-4 animate-in fade-in slide-in-from-top-1 duration-150">
                    {/* Category selector */}
                    <div>
                      <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${themeSubText}`}>
                        {t('category') as string}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto custom-scrollbar p-0.5">
                        {(type === 'expense' ? expenseCategoriesList : incomeCategoriesList).map(cat => {
                          const isSelected = category === cat && !showCustomCategory;
                          const emoji = getCategoryEmoji(cat);
                          return (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setCategory(cat);
                                setShowCustomCategory(false);
                              }}
                              className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 truncate cursor-pointer ${
                                isSelected 
                                  ? (type === 'income' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500' : 'bg-rose-500/15 text-rose-500 border-rose-500') 
                                  : `${themeBtnSecondary}`
                              }`}
                            >
                              <span className="text-sm shrink-0">{emoji}</span>
                              <span className="truncate">{translateCategory(cat, lang)}</span>
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomCategory(true);
                            setCategory('');
                          }}
                          className={`px-2.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center justify-center gap-1.5 cursor-pointer ${
                            showCustomCategory 
                              ? (type === 'income' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500' : 'bg-rose-500/15 text-rose-500 border-rose-500') 
                              : `${themeBtnSecondary}`
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Lainnya</span>
                        </button>
                      </div>

                      {showCustomCategory && (
                        <div className="mt-2">
                          <input 
                            type="text" 
                            value={category}
                            onChange={e => setCategory(e.target.value)}
                            placeholder={lang === 'id' ? 'Kategori kustom...' : 'Custom category...'}
                            className={`w-full px-3 py-2 rounded-xl border text-xs outline-none ${themeInputBg}`}
                          />
                        </div>
                      )}

                      {isSavingsCategory(category) && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-500 text-[11px] flex items-center gap-2">
                          <PiggyBank className="w-4 h-4 text-amber-500 shrink-0" />
                          <span>
                            {lang === 'id' 
                              ? 'Kategori Tabungan akan memindahkan/mengalokasikan uang dari Saldo Utama ke Tabungan Terkumpul (Saldo Utama berkurang & Tabungan bertambah).' 
                              : 'Savings category allocates money from Main Balance to Accumulated Savings (Main Balance decreases & Savings increases).'}
                          </span>
                        </div>
                      )}

                      {(isDebtCategory(category) || category === 'Bayar Hutang' || type === 'expense') && debts.length > 0 && (
                        <div className="mt-2.5 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
                          <label className="block text-[10px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>{lang === 'id' ? 'Hubungkan ke Hutang / Cicilan Mana?' : 'Link to Debt / Installment'}</span>
                          </label>
                          <select
                            value={selectedLinkedDebtId}
                            onChange={e => {
                              const dId = e.target.value;
                              setSelectedLinkedDebtId(dId);
                              if (dId) {
                                const target = debts.find(d => d.id === dId);
                                if (target && !amount) {
                                  setAmount((target.installmentAmount || Math.round(target.totalAmount / (target.installmentCount || 1))).toString());
                                }
                              }
                            }}
                            className={`w-full border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-rose-500/60 cursor-pointer ${themeInputBg}`}
                          >
                            <option value="">-- {lang === 'id' ? 'Tidak Dihubungkan / Pilih Catatan Hutang' : 'None / Select Debt Record'} --</option>
                            {debts.filter(d => !d.isPaidOff || d.id === selectedLinkedDebtId).map(d => (
                              <option key={d.id} value={d.id}>
                                {d.title} (Sisa: {formatCurrency(d.remainingAmount)} | Angsuran #{d.paidInstallments + 1})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Date & Description */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                          {t('date') as string}
                        </label>
                        <input 
                          type="date"
                          value={date}
                          onChange={e => setDate(e.target.value)}
                          className={`w-full border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none ${themeInputBg}`}
                        />
                      </div>

                      <div>
                        <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                          {t('description') as string}
                        </label>
                        <input 
                          type="text"
                          value={description}
                          onChange={e => setDescription(e.target.value)}
                          placeholder="..."
                          className={`w-full border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none ${themeInputBg}`}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className={`p-4 border-t flex gap-2 shrink-0 ${themeModalHeader}`}>
              <button 
                type="button"
                onClick={() => setShowAddModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {t('cancel') as string}
              </button>
              <button 
                type="submit"
                className="flex-[2] py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {t('saveTransaction') as string}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* MODAL: Tambah / Edit Target Tabungan (Savings Goal Modal) */}
      {showSavingsGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowSavingsGoalModal(false)}></div>
          <div className={`relative w-full max-w-md max-h-[90vh] overflow-y-auto custom-scrollbar p-5 sm:p-6 rounded-3xl border shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 ${themeModalBg}`}>
            {/* Modal Header with Back & Close */}
            <div className={`flex items-start justify-between gap-3 mb-3 border-b pb-3 ${themeBorder}`}>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSavingsGoalModal(false)}
                  className={`p-1.5 -ml-1 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
                  title={lang === 'id' ? 'Kembali' : 'Back'}
                >
                  <ArrowLeft className="w-4 h-4 text-amber-500" />
                </button>
                <div>
                  <h3 className={`text-base font-bold flex items-center gap-2 ${themePrimaryText}`}>
                    <PiggyBank className="w-5 h-5 text-amber-500" />
                    {editingSavingsGoal 
                      ? (lang === 'id' ? 'Ubah Pos Tabungan' : 'Edit Savings Goal')
                      : (lang === 'id' ? 'Buat Pos Tabungan Baru' : 'Create New Savings Goal')}
                  </h3>
                  <p className={`text-xs mt-0.5 ${themeSubText}`}>
                    {lang === 'id' 
                      ? 'Tentukan target nominal, ikon impian, dan pos tabunganmu.' 
                      : 'Define your target amount, dream icon, and timeline.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSavingsGoalModal(false)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${themeBtnSecondary}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Mode Switcher (Simpel vs Detail) */}
            <div className={`grid grid-cols-2 p-1 rounded-2xl border mb-4 ${themeInnerCardBg}`}>
              <button
                type="button"
                onClick={() => setGoalFormMode('simple')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  goalFormMode === 'simple'
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-md'
                    : `${themeSubText}`
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{lang === 'id' ? 'Versi Simpel (Cepat)' : 'Simple Version'}</span>
              </button>
              <button
                type="button"
                onClick={() => setGoalFormMode('detail')}
                className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  goalFormMode === 'detail'
                    ? 'bg-indigo-600 text-white font-black shadow-md'
                    : `${themeSubText}`
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>{lang === 'id' ? 'Versi Detail (Bunga)' : 'Detailed (Yield)'}</span>
              </button>
            </div>

            <div className="space-y-3.5 mb-5">
              {/* Emoji Picker Row */}
              <div>
                <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Pilih Ikon / Emoji Impian' : 'Select Dream Icon / Emoji'}
                </label>
                <div className={`flex flex-wrap gap-1.5 p-2 rounded-2xl border ${themeInnerCardBg}`}>
                  {['🎯', '🐷', '💻', '📱', '🏖️', '🚗', '🛵', '🏠', '✈️', '🛡️', '💍', '🎓', '🎁', '🚴', '📈', '🛒'].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setGoalFormEmoji(emoji)}
                      className={`w-9 h-9 rounded-xl text-lg flex items-center justify-center transition-all cursor-pointer ${
                        goalFormEmoji === emoji 
                          ? 'bg-amber-500/20 border-2 border-amber-500 scale-110 shadow-md shadow-amber-500/20' 
                          : `border border-transparent ${isLight ? 'hover:bg-black/5' : 'hover:bg-slate-800'}`
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal Title */}
              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Nama Pos Tabungan (Wajib)' : 'Goal Title (Required)'}
                </label>
                <input 
                  type="text"
                  value={goalFormTitle}
                  onChange={e => setGoalFormTitle(e.target.value)}
                  placeholder={lang === 'id' ? 'Contoh: Beli Laptop Baru, Liburan ke Bali' : 'e.g. New Laptop, Japan Trip'}
                  className={`w-full px-3 py-2.5 rounded-xl border text-xs font-semibold outline-none focus:border-amber-500/60 ${themeInputBg}`}
                  autoFocus
                />
              </div>

              {/* Target Amount */}
              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Target Nominal (Rp)' : 'Target Amount (Rp)'}
                </label>
                <div className={`flex items-center px-3 py-2 rounded-xl border focus-within:border-amber-500/60 ${themeInputBg}`}>
                  <span className={`font-bold mr-2 text-xs ${themeSubText}`}>Rp</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={goalFormTargetAmount ? Number(goalFormTargetAmount).toLocaleString('id-ID') : ''}
                    onChange={e => setGoalFormTargetAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    className={`w-full bg-transparent text-xs font-semibold outline-none ${themePrimaryText}`}
                  />
                  <button
                    type="button"
                    onClick={() => setGoalFormTargetAmount(prev => (prev ? prev.replace(/[^0-9]/g, '') + '000' : '1000'))}
                    className="ml-2 px-2 py-1 bg-amber-600/30 text-amber-500 hover:bg-amber-600 hover:text-white rounded-lg text-xs font-black shrink-0 transition-all cursor-pointer border border-amber-500/30"
                    title="Tambah .000 (Ribuan)"
                  >
                    +000
                  </button>
                </div>
                <QuickAmountRow currentVal={goalFormTargetAmount} onUpdate={setGoalFormTargetAmount} currency="IDR" isLight={isLight} />
                <AmountPreviewHelper rawVal={goalFormTargetAmount} onUpdateValue={setGoalFormTargetAmount} currency="IDR" />
              </div>

              {/* Initial Amount (Only when creating new) */}
              {!editingSavingsGoal && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                    {lang === 'id' ? 'Setoran Awal (Opsional - Rp)' : 'Initial Deposit (Optional - Rp)'}
                  </label>
                  <div className={`flex items-center px-3 py-2 rounded-xl border focus-within:border-emerald-500/60 ${themeInputBg}`}>
                    <span className={`font-bold mr-2 text-xs ${themeSubText}`}>Rp</span>
                    <input 
                      type="text"
                      inputMode="numeric"
                      value={goalFormInitialAmount ? Number(goalFormInitialAmount).toLocaleString('id-ID') : ''}
                      onChange={e => setGoalFormInitialAmount(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      className={`w-full bg-transparent text-xs font-semibold outline-none ${themePrimaryText}`}
                    />
                    <button
                      type="button"
                      onClick={() => setGoalFormInitialAmount(prev => (prev ? prev.replace(/[^0-9]/g, '') + '000' : '1000'))}
                      className="ml-2 px-2 py-1 bg-emerald-600/30 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-black shrink-0 transition-all cursor-pointer border border-emerald-500/30"
                    >
                      +000
                    </button>
                  </div>
                  <QuickAmountRow currentVal={goalFormInitialAmount} onUpdate={setGoalFormInitialAmount} currency="IDR" isLight={isLight} />
                  <AmountPreviewHelper rawVal={goalFormInitialAmount} onUpdateValue={setGoalFormInitialAmount} currency="IDR" />
                </div>
              )}

              {/* Category & Target Date */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                    {lang === 'id' ? 'Kategori Pos' : 'Category'}
                  </label>
                  <select
                    value={goalFormCategory}
                    onChange={e => setGoalFormCategory(e.target.value)}
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-amber-500/60 cursor-pointer ${themeInputBg}`}
                  >
                    {['Darurat', 'Elektronik', 'Liburan', 'Kendaraan', 'Properti', 'Pendidikan', 'Investasi', 'Lainnya'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold mb-1 uppercase tracking-wider text-slate-400">
                    {lang === 'id' ? 'Target Tercapai (Deadline)' : 'Target Date (Optional)'}
                  </label>
                  <input 
                    type="date"
                    value={goalFormTargetDate}
                    onChange={e => setGoalFormTargetDate(e.target.value)}
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-amber-500/60 ${themeInputBg}`}
                  />
                </div>
              </div>

              {/* SIMPLE MODE HINT / CALLOUT */}
              {goalFormMode === 'simple' && (
                <div className={`p-3 rounded-2xl border flex items-center justify-between gap-2 text-xs ${themeInnerCardBg}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-amber-500">💡</span>
                    <span className={`text-[11px] ${themeSubText}`}>
                      {lang === 'id' ? 'Punya deposito berbunga, reksadana, atau bank khusus?' : 'Have a deposit yield or specific bank?'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGoalFormMode('detail')}
                    className="text-[11px] text-indigo-500 hover:text-indigo-600 font-bold underline cursor-pointer shrink-0"
                  >
                    {lang === 'id' ? 'Buka Detail →' : 'Switch to Detail →'}
                  </button>
                </div>
              )}

              {/* DETAILED FIELDS (INSTRUMENTS, INSTITUTION & INTEREST/YIELD) */}
              {goalFormMode === 'detail' && (
                <div className="space-y-3.5 animate-in fade-in duration-200">
                  {/* INSTRUMENT & INSTITUTION TYPE */}
                  <div className={`p-3 rounded-2xl border space-y-2.5 ${themeInnerCardBg}`}>
                    <div>
                      <label className={`block text-[10px] font-bold mb-1.5 uppercase tracking-wider flex items-center gap-1.5 ${themePrimaryText}`}>
                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{lang === 'id' ? 'Jenis Simpanan / Instrumen' : 'Savings Instrument Type'}</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {[
                          { type: 'bank', label: 'Bank', icon: '🏛️', defTax: 20 },
                          { type: 'deposito', label: 'Deposito', icon: '🏦', defTax: 20 },
                          { type: 'reksadana', label: 'Reksadana', icon: '📈', defTax: 0 },
                          { type: 'obligasi', label: 'Obligasi / SBN', icon: '📜', defTax: 10 },
                          { type: 'emas', label: 'Emas', icon: '🪙', defTax: 0 },
                          { type: 'p2p', label: 'P2P / Sukuk', icon: '🤝', defTax: 15 },
                          { type: 'cash', label: 'Tunai / Celengan', icon: '💵', defTax: 0 },
                          { type: 'lainnya', label: 'Lainnya', icon: '🎯', defTax: 0 }
                        ].map(inst => (
                          <button
                            key={inst.type}
                            type="button"
                            onClick={() => {
                              setGoalFormInstrumentType(inst.type);
                              if (inst.type === 'deposito') {
                                setGoalFormHasInterest(true);
                                if (!goalFormInterestRate) setGoalFormInterestRate('6.0');
                                setGoalFormTaxRate('20');
                              } else if (inst.type === 'reksadana') {
                                setGoalFormHasInterest(true);
                                if (!goalFormInterestRate) setGoalFormInterestRate('5.5');
                                setGoalFormTaxRate('0');
                              } else if (inst.type === 'obligasi') {
                                setGoalFormHasInterest(true);
                                if (!goalFormInterestRate) setGoalFormInterestRate('6.4');
                                setGoalFormTaxRate('10');
                              } else if (inst.type === 'cash' || inst.type === 'emas') {
                                setGoalFormTaxRate('0');
                              }
                            }}
                            className={`px-2 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
                              goalFormInstrumentType === inst.type
                                ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500 shadow-sm font-bold'
                                : `${themeBtnSecondary}`
                            }`}
                          >
                            <span className="text-sm">{inst.icon}</span>
                            <span className="truncate">{inst.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                        {lang === 'id' ? 'Nama Bank / Platform / Lembaga (Opsional)' : 'Bank / Institution Name (Optional)'}
                      </label>
                      <input 
                        type="text"
                        value={goalFormInstitutionName}
                        onChange={e => setGoalFormInstitutionName(e.target.value)}
                        placeholder={lang === 'id' ? 'Contoh: Bank Jago, BCA, Bibit, Bareksa, SeaBank' : 'e.g. Bank Jago, SeaBank, Bibit'}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold outline-none focus:border-indigo-500/60 ${themeInputBg}`}
                      />
                      {/* Quick suggestion chips */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {['Bank Jago', 'SeaBank', 'BCA', 'Mandiri', 'BRI', 'Bibit', 'Bareksa', 'Pluang', 'Allo Bank', 'Pegadaian'].map(name => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => setGoalFormInstitutionName(name)}
                            className={`text-[10px] px-2 py-0.5 rounded-md border font-medium transition-colors cursor-pointer ${themeBtnSecondary}`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* INTEREST & YIELD SETTINGS */}
                  <div className={`p-3 rounded-2xl border space-y-3 ${isLight ? 'bg-indigo-50/70 border-indigo-200' : 'bg-indigo-950/20 border-indigo-500/30'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-500 flex items-center justify-center">
                          <Percent className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className={`text-xs font-bold block ${themePrimaryText}`}>
                            {lang === 'id' ? 'Bunga / Imbal Hasil Tabungan' : 'Interest / Yield Rate'}
                          </span>
                          <span className={`text-[10px] block ${themeSubText}`}>
                            {lang === 'id' ? 'Untuk deposito, bunga tabungan bank, atau reksadana' : 'For deposits, bank interest, or investment yields'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const next = !goalFormHasInterest;
                          setGoalFormHasInterest(next);
                          if (next && !goalFormInterestRate) {
                            setGoalFormInterestRate(goalFormInstrumentType === 'deposito' ? '6.0' : goalFormInstrumentType === 'reksadana' ? '5.5' : '3.5');
                          }
                        }}
                        className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                          goalFormHasInterest ? 'bg-indigo-600 justify-end' : (isLight ? 'bg-slate-300 justify-start' : 'bg-slate-800 justify-start')
                        }`}
                      >
                        <div className="w-5 h-5 rounded-full bg-white shadow-md"></div>
                      </button>
                    </div>

                    {goalFormHasInterest && (
                      <div className={`space-y-3 pt-2 border-t animate-in fade-in duration-150 ${isLight ? 'border-indigo-200' : 'border-indigo-500/20'}`}>
                        {/* Interest Rate Input */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
                              {lang === 'id' ? 'Tingkat Bunga / Return (% p.a.)' : 'Interest / Return Rate (% p.a.)'}
                            </label>
                            <span className={`text-[10px] ${themeSubText}`}>{lang === 'id' ? 'Per tahun' : 'Per annum'}</span>
                          </div>
                          <div className={`flex items-center px-3 py-2 rounded-xl border focus-within:border-indigo-500/60 ${themeInputBg}`}>
                            <input 
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={goalFormInterestRate}
                              onChange={e => setGoalFormInterestRate(e.target.value)}
                              placeholder="6.0"
                              className={`w-full bg-transparent text-xs font-bold outline-none ${themePrimaryText}`}
                            />
                            <span className="font-black text-indigo-500 text-xs ml-1">% p.a.</span>
                          </div>
                          <div className="flex gap-1.5 mt-1.5">
                            {['3.5', '5.0', '6.0', '6.5', '7.0', '8.0'].map(rate => (
                              <button
                                key={rate}
                                type="button"
                                onClick={() => setGoalFormInterestRate(rate)}
                                className={`text-[10px] px-2 py-0.5 rounded-md border text-indigo-500 font-bold transition-colors cursor-pointer ${themeBtnSecondary}`}
                              >
                                {rate}%
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Tax Rate Input */}
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className={`text-[10px] font-bold uppercase tracking-wider ${themeSubText}`}>
                              {lang === 'id' ? 'Pajak Bunga / PPh (%)' : 'Withholding Tax (%)'}
                            </label>
                            <span className={`text-[10px] ${themeSubText}`}>{lang === 'id' ? 'Dipotong dari bunga' : 'Deducted from interest'}</span>
                          </div>
                          <div className={`flex items-center px-3 py-2 rounded-xl border focus-within:border-indigo-500/60 ${themeInputBg}`}>
                            <input 
                              type="number"
                              step="1"
                              min="0"
                              max="100"
                              value={goalFormTaxRate}
                              onChange={e => setGoalFormTaxRate(e.target.value)}
                              placeholder="20"
                              className={`w-full bg-transparent text-xs font-bold outline-none ${themePrimaryText}`}
                            />
                            <span className={`font-bold text-xs ml-1 ${themeSubText}`}>%</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {[
                              { label: '20% (Deposito & Bank)', val: '20' },
                              { label: '10% (SBN / Obligasi)', val: '10' },
                              { label: '0% (Reksadana/Emas Bebas Pajak)', val: '0' }
                            ].map(taxItem => (
                              <button
                                key={taxItem.val}
                                type="button"
                                onClick={() => setGoalFormTaxRate(taxItem.val)}
                                className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold transition-colors cursor-pointer ${
                                  goalFormTaxRate === taxItem.val
                                    ? 'bg-indigo-500/20 text-indigo-500 border-indigo-500/40 font-bold'
                                    : `${themeBtnSecondary}`
                                }`}
                              >
                                {taxItem.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Compound interest checkbox */}
                        <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer select-none ${themeInnerCardBg}`}>
                          <input 
                            type="checkbox"
                            checked={goalFormIsCompound}
                            onChange={e => setGoalFormIsCompound(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 mt-0.5"
                          />
                          <div className="text-xs">
                            <span className={`font-bold block ${themePrimaryText}`}>
                              {lang === 'id' ? 'Bunga Majemuk / Digulung (Compound Interest)' : 'Compound Interest (Monthly Rollover)'}
                            </span>
                            <span className={`text-[10px] block ${themeSubText}`}>
                              {lang === 'id' ? 'Bunga bulanan otomatis ditambahkan kembali ke pokok tabungan.' : 'Monthly interest is reinvested into the principal.'}
                            </span>
                          </div>
                        </label>

                        {/* Live Simulation Preview */}
                        {(() => {
                          const simPrincipal = editingSavingsGoal 
                            ? (editingSavingsGoal.currentAmount || parseRawAmount(goalFormTargetAmount, 'IDR') || 10000000)
                            : (parseRawAmount(goalFormInitialAmount, 'IDR') || parseRawAmount(goalFormTargetAmount, 'IDR') || 10000000);
                          const simRate = parseFloat(goalFormInterestRate) || 0;
                          const simTax = parseFloat(goalFormTaxRate) >= 0 ? parseFloat(goalFormTaxRate) : 20;
                          const simYield = calculateGoalYield(simPrincipal, simRate, simTax, goalFormTargetDate, goalFormIsCompound);

                          if (simRate <= 0) return null;

                          return (
                            <div className={`p-3 rounded-2xl border text-xs space-y-2 ${isLight ? 'bg-indigo-100/60 border-indigo-200' : 'bg-indigo-950/40 border-indigo-500/30'}`}>
                              <div className="flex items-center justify-between text-indigo-500 font-bold">
                                <span className="flex items-center gap-1.5">
                                  <Calculator className="w-3.5 h-3.5 text-indigo-500" />
                                  <span>{lang === 'id' ? 'Simulasi Estimasi Imbal Hasil:' : 'Estimated Yield Simulation:'}</span>
                                </span>
                                <span className={`text-[10px] ${themeSubText}`}>
                                  (Pokok: {formatCurrency(simPrincipal)})
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className={`p-2 rounded-xl border ${themeInnerCardBg}`}>
                                  <span className={`text-[9px] uppercase font-bold block ${themeSubText}`}>
                                    {lang === 'id' ? 'Per Bulan (Bersih)' : 'Monthly (Net)'}
                                  </span>
                                  <span className="text-emerald-500 font-black text-xs mt-0.5 block">
                                    +{formatCurrency(simYield.monthlyNet)}
                                  </span>
                                  <span className={`text-[9px] block ${themeSubText}`}>
                                    +{formatCurrency(simYield.dailyNet)} / {lang === 'id' ? 'hari' : 'day'}
                                  </span>
                                </div>

                                <div className={`p-2 rounded-xl border ${themeInnerCardBg}`}>
                                  <span className={`text-[9px] uppercase font-bold block ${themeSubText}`}>
                                    {lang === 'id' ? 'Per Tahun (Bersih)' : 'Annual (Net)'}
                                  </span>
                                  <span className="text-emerald-500 font-black text-xs mt-0.5 block">
                                    +{formatCurrency(simYield.annualNet)}
                                  </span>
                                  <span className="text-[9px] text-rose-500/80 block">
                                    -{formatCurrency(simYield.taxAmountAnnual)} {lang === 'id' ? 'pajak' : 'tax'}
                                  </span>
                                </div>
                              </div>

                              {goalFormTargetDate && simYield.daysToTarget > 0 && (
                                <p className={`text-[10px] pt-1 border-t leading-relaxed ${themeBorder} ${themePrimaryText}`}>
                                  🎯 {lang === 'id' ? 'Hingga deadline target' : 'By target date'} ({goalFormTargetDate} - ~{simYield.monthsToTarget} bln): 
                                  {' '}estimasi bunga bersih <strong className="text-emerald-500 font-black">+{formatCurrency(simYield.projectedYieldAtTarget)}</strong>
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Catatan / Alasan Impian (Opsional)' : 'Notes / Motivation (Optional)'}
                </label>
                <input 
                  type="text"
                  value={goalFormNotes}
                  onChange={e => setGoalFormNotes(e.target.value)}
                  placeholder={lang === 'id' ? 'Contoh: Harus terkumpul sebelum akhir tahun' : 'e.g. Save before year end'}
                  className={`w-full border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-amber-500/60 ${themeInputBg}`}
                />
              </div>

              {goalFormError && (
                <p className="text-rose-500 text-xs font-semibold bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
                  {goalFormError}
                </p>
              )}
            </div>

            <div className={`flex gap-2 pt-2 border-t ${themeBorder}`}>
              <button 
                type="button"
                onClick={() => setShowSavingsGoalModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {t('cancel') as string}
              </button>
              <button 
                type="button"
                onClick={handleSaveSavingsGoal}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-amber-500 text-zinc-950 hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/20 cursor-pointer font-black"
              >
                {editingSavingsGoal ? (lang === 'id' ? 'Simpan Perubahan' : 'Save Changes') : (lang === 'id' ? 'Buat Target' : 'Create Goal')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Hapus Target Confirm */}
      {showDeleteGoalConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowDeleteGoalConfirm(null)}></div>
          <div className={`relative w-full max-w-sm p-5 rounded-3xl border shadow-2xl animate-in fade-in zoom-in duration-150 text-center ${themeModalBg}`}>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3 mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className={`text-sm font-bold mb-1 ${themePrimaryText}`}>
              {lang === 'id' ? 'Hapus Pos Tabungan Ini?' : 'Delete This Savings Goal?'}
            </h3>
            <p className={`text-xs mb-4 ${themeSubText}`}>
              {lang === 'id' 
                ? 'Target tabungan ini akan dihapus dari daftar.' 
                : 'This savings goal will be removed from your list.'}
            </p>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setShowDeleteGoalConfirm(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {t('cancel') as string}
              </button>
              <button 
                type="button"
                onClick={() => {
                  if (showDeleteGoalConfirm) {
                    deleteSavingsGoal(showDeleteGoalConfirm);
                    setShowDeleteGoalConfirm(null);
                  }
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {lang === 'id' ? 'Ya, Hapus' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Setor Tabungan (+ Deposit) */}
      {showSavingsDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowSavingsDepositModal(false)}></div>
          <div className={`relative w-full max-w-sm max-h-[85vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar p-5 rounded-3xl border shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 ${themeModalBg}`}>
            {/* Modal Header with Back & Close */}
            <div className={`flex items-start justify-between gap-3 mb-3 border-b pb-3 ${themeBorder}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSavingsDepositModal(false)}
                  className={`p-1.5 -ml-1 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
                  title={lang === 'id' ? 'Kembali' : 'Back'}
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-500" />
                </button>
                <div>
                  <h3 className={`text-sm font-bold flex items-center gap-1.5 ${themePrimaryText}`}>
                    <Target className="w-4 h-4 text-emerald-500" />
                    {lang === 'id' ? 'Setor ke Pos Tabungan' : 'Deposit to Savings'}
                  </h3>
                  <p className={`text-[11px] mt-0.5 ${themeSubText}`}>
                    {lang === 'id' ? 'Pindahkan uang dari Saldo Utama ke Tabungan.' : 'Move money from Wallet to Savings.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSavingsDepositModal(false)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${themeBtnSecondary}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {/* Savings Goal Selector */}
              {savingsGoals.length > 0 && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                    {lang === 'id' ? 'Pilih Pos Tabungan Tujuan' : 'Select Destination Goal'}
                  </label>
                  <select
                    value={selectedGoalIdForAction}
                    onChange={e => setSelectedGoalIdForAction(e.target.value)}
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-emerald-500/60 cursor-pointer ${themeInputBg}`}
                  >
                    {savingsGoals.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.emoji || '🎯'} {g.title} (Saat ini: {formatCurrency(g.currentAmount)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Jumlah Setoran (Rp)' : 'Amount (Rp)'}
                </label>
                <div className={`flex items-center px-3 py-2.5 rounded-xl border focus-within:border-emerald-500/60 ${themeInputBg}`}>
                  <span className={`font-bold mr-2 text-xs ${themeSubText}`}>Rp</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={savingsDepositAmount ? Number(savingsDepositAmount).toLocaleString('id-ID') : ''}
                    onChange={e => setSavingsDepositAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    className={`w-full bg-transparent text-sm font-semibold outline-none ${themePrimaryText}`}
                    placeholder="0"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setSavingsDepositAmount(prev => (prev ? prev.replace(/[^0-9]/g, '') + '000' : '1000'))}
                    className="ml-2 px-2.5 py-1 bg-emerald-600/30 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-lg text-xs font-black shrink-0 transition-all cursor-pointer border border-emerald-500/30"
                    title="Tambah .000 (Ribuan)"
                  >
                    +000
                  </button>
                </div>
                <QuickAmountRow currentVal={savingsDepositAmount} onUpdate={setSavingsDepositAmount} currency="IDR" isLight={isLight} />
                <AmountPreviewHelper rawVal={savingsDepositAmount} onUpdateValue={setSavingsDepositAmount} currency="IDR" />
                {depositError && <p className="text-rose-500 text-[10px] font-semibold mt-1.5">{depositError}</p>}
              </div>
            </div>

            <div className={`flex gap-2 pt-2 border-t ${themeBorder}`}>
              <button 
                onClick={() => setShowSavingsDepositModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {t('cancel') as string}
              </button>
              <button 
                onClick={handleDepositSavings}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                {lang === 'id' ? 'Setor Sekarang' : 'Deposit Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tarik Tabungan (- Withdraw) */}
      {showSavingsWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowSavingsWithdrawModal(false)}></div>
          <div className={`relative w-full max-w-sm max-h-[85vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar p-5 rounded-3xl border shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 ${themeModalBg}`}>
            {/* Modal Header with Back & Close */}
            <div className={`flex items-start justify-between gap-3 mb-3 border-b pb-3 ${themeBorder}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSavingsWithdrawModal(false)}
                  className={`p-1.5 -ml-1 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
                  title={lang === 'id' ? 'Kembali' : 'Back'}
                >
                  <ArrowLeft className="w-4 h-4 text-rose-500" />
                </button>
                <div>
                  <h3 className={`text-sm font-bold flex items-center gap-1.5 ${themePrimaryText}`}>
                    <Minus className="w-4 h-4 text-rose-500" />
                    {lang === 'id' ? 'Tarik dari Pos Tabungan' : 'Withdraw from Savings'}
                  </h3>
                  <p className={`text-[11px] mt-0.5 ${themeSubText}`}>
                    {lang === 'id' ? 'Kembalikan uang dari Tabungan ke Saldo Utama.' : 'Return money to Main Wallet.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSavingsWithdrawModal(false)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${themeBtnSecondary}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {/* Savings Goal Selector */}
              {savingsGoals.length > 0 && (
                <div>
                  <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                    {lang === 'id' ? 'Pilih Pos Tabungan Asal' : 'Select Source Goal'}
                  </label>
                  <select
                    value={selectedGoalIdForAction}
                    onChange={e => setSelectedGoalIdForAction(e.target.value)}
                    className={`w-full border rounded-xl px-2.5 py-2 text-xs font-semibold outline-none focus:border-rose-500/60 cursor-pointer ${themeInputBg}`}
                  >
                    {savingsGoals.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.emoji || '🎯'} {g.title} (Tersedia: {formatCurrency(g.currentAmount)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Jumlah Penarikan (Rp)' : 'Amount (Rp)'}
                </label>
                <div className={`flex items-center px-3 py-2.5 rounded-xl border focus-within:border-rose-500/60 ${themeInputBg}`}>
                  <span className={`font-bold mr-2 text-xs ${themeSubText}`}>Rp</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={savingsWithdrawAmount ? Number(savingsWithdrawAmount).toLocaleString('id-ID') : ''}
                    onChange={e => setSavingsWithdrawAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    className={`w-full bg-transparent text-sm font-semibold outline-none ${themePrimaryText}`}
                    placeholder="0"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setSavingsWithdrawAmount(prev => (prev ? prev.replace(/[^0-9]/g, '') + '000' : '1000'))}
                    className="ml-2 px-2.5 py-1 bg-rose-600/30 text-rose-500 hover:bg-rose-600 hover:text-white rounded-lg text-xs font-black shrink-0 transition-all cursor-pointer border border-rose-500/30"
                    title="Tambah .000 (Ribuan)"
                  >
                    +000
                  </button>
                </div>
                <QuickAmountRow currentVal={savingsWithdrawAmount} onUpdate={setSavingsWithdrawAmount} currency="IDR" isLight={isLight} />
                <AmountPreviewHelper rawVal={savingsWithdrawAmount} onUpdateValue={setSavingsWithdrawAmount} currency="IDR" />
                {withdrawError && <p className="text-rose-500 text-[10px] font-semibold mt-1.5">{withdrawError}</p>}
              </div>
            </div>

            <div className={`flex gap-2 pt-2 border-t ${themeBorder}`}>
              <button 
                onClick={() => setShowSavingsWithdrawModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {t('cancel') as string}
              </button>
              <button 
                onClick={handleWithdrawSavings}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition-colors shadow-lg shadow-rose-600/20 cursor-pointer"
              >
                {lang === 'id' ? 'Tarik Sekarang' : 'Withdraw Now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Set Target Tabungan (Legacy fallback) */}
      {showTargetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowTargetModal(false)}></div>
          <div className={`relative w-full max-w-sm max-h-[85vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar p-5 rounded-3xl border shadow-2xl my-auto animate-in fade-in zoom-in-95 duration-150 ${themeModalBg}`}>
            <h3 className={`text-sm font-bold mb-4 flex items-center gap-2 ${themePrimaryText}`}>
              <Target className="w-4 h-4 text-amber-500" />
              {t('setSavingsTarget') as string}
            </h3>

            <div className="space-y-3 mb-5">
              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Nama Target (Impian)' : 'Target Name'}
                </label>
                <input 
                  type="text"
                  value={targetInputTitle}
                  onChange={e => setTargetInputTitle(e.target.value)}
                  placeholder={lang === 'id' ? 'Contoh: Beli Laptop Baru' : 'e.g. Buy New Laptop'}
                  className={`w-full px-3 py-2 rounded-xl border text-xs outline-none focus:border-indigo-500/60 ${themeInputBg}`}
                  autoFocus
                />
              </div>

              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {t('targetAmount') as string}
                </label>
                <div className={`flex items-center px-3 py-2 rounded-xl border focus-within:border-indigo-500/60 ${themeInputBg}`}>
                  <span className={`font-bold mr-2 text-xs ${themeSubText}`}>Rp</span>
                  <input 
                    type="text"
                    inputMode="numeric"
                    value={targetInputAmount ? Number(targetInputAmount).toLocaleString('id-ID') : ''}
                    onChange={e => setTargetInputAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    className={`w-full bg-transparent text-xs font-semibold outline-none ${themePrimaryText}`}
                  />
                  <button
                    type="button"
                    onClick={() => setTargetInputAmount(prev => (prev ? prev.replace(/[^0-9]/g, '') + '000' : '1000'))}
                    className="ml-2 px-2.5 py-1 bg-amber-500/20 text-amber-500 hover:bg-amber-500 hover:text-white rounded-lg text-xs font-black shrink-0 transition-all cursor-pointer border border-amber-500/30"
                    title="Tambah .000 (Ribuan)"
                  >
                    +000
                  </button>
                </div>
                <QuickAmountRow currentVal={targetInputAmount} onUpdate={setTargetInputAmount} currency="IDR" isLight={isLight} />
                <AmountPreviewHelper rawVal={targetInputAmount} onUpdateValue={setTargetInputAmount} currency="IDR" />
              </div>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => setShowTargetModal(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {t('cancel') as string}
              </button>
              <button 
                onClick={() => {
                  const val = parseRawAmount(targetInputAmount, 'IDR');
                  if (val > 0) {
                    setSavingsTarget(val);
                    setSavingsTargetTitle(targetInputTitle.trim());
                  } else {
                    setSavingsTarget(null);
                    setSavingsTargetTitle('');
                  }
                  setShowTargetModal(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {lang === 'id' ? 'Simpan Target' : 'Save Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Hapus Target Confirm */}
      {showClearTargetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowClearTargetConfirm(false)}></div>
          <div className={`relative w-full max-w-sm p-5 rounded-3xl border shadow-2xl animate-in fade-in zoom-in duration-150 text-center ${themeModalBg}`}>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3 mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className={`text-sm font-bold mb-1 ${themePrimaryText}`}>
              {lang === 'id' ? 'Hapus Target Tabungan?' : 'Delete Savings Target?'}
            </h3>
            <p className={`text-xs mb-4 ${themeSubText}`}>
              {lang === 'id' ? 'Target tabungan akan dihapus.' : 'Savings goal will be deleted.'}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowClearTargetConfirm(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {t('cancel') as string}
              </button>
              <button 
                onClick={() => {
                  setSavingsTarget(null);
                  setSavingsTargetTitle('');
                  setShowClearTargetConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition-colors cursor-pointer"
              >
                {lang === 'id' ? 'Hapus Target' : 'Delete Target'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Atur Total Hutang */}
      {showDebtModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowDebtModal(false)}></div>
          <div className={`relative w-full max-w-sm p-5 rounded-3xl border shadow-2xl animate-in fade-in zoom-in duration-150 space-y-4 ${themeModalBg}`}>
            <div className={`flex items-center justify-between border-b pb-3 ${themeBorder}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowDebtModal(false)}
                  className={`p-1.5 -ml-1 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
                  title={lang === 'id' ? 'Kembali' : 'Back'}
                >
                  <ArrowLeft className="w-4 h-4 text-rose-500" />
                </button>
                <h3 className={`font-extrabold text-sm sm:text-base ${themePrimaryText}`}>
                  {lang === 'id' ? 'Atur Total Hutang' : 'Set Total Debt'}
                </h3>
              </div>
              <button
                onClick={() => setShowDebtModal(false)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className={`text-xs font-medium leading-relaxed ${themeSubText}`}>
              {lang === 'id'
                ? 'Masukkan total jumlah hutang aktif Anda. Setiap pengeluaran dengan kategori "Bayar Hutang" akan otomatis mengurangi jumlah hutang ini.'
                : 'Enter your total active debt balance. Every expense under "Debt Payment" will automatically decrease this total.'}
            </p>

            <div>
              <label className={`block text-[11px] font-bold uppercase tracking-wider mb-1 ${themeSubText}`}>
                {lang === 'id' ? 'Nominal Total Hutang' : 'Total Debt Amount'}
              </label>
              <div className={`flex items-center px-3.5 py-2.5 rounded-xl border focus-within:border-rose-500 ${themeInputBg}`}>
                <span className={`font-bold mr-2 text-xs ${themeSubText}`}>Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={debtInputAmount ? Number(debtInputAmount).toLocaleString('id-ID') : ''}
                  onChange={e => setDebtInputAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="Contoh: 2000000"
                  className={`w-full bg-transparent font-bold text-sm outline-none ${themePrimaryText}`}
                />
              </div>
              <QuickAmountRow
                currentVal={debtInputAmount}
                onUpdate={setDebtInputAmount}
                currency="IDR"
                isLight={isLight}
              />
              <AmountPreviewHelper
                rawVal={debtInputAmount}
                onUpdateValue={setDebtInputAmount}
                currency="IDR"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowDebtModal(false)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                onClick={handleSaveDebtTarget}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all cursor-pointer shadow-lg shadow-rose-600/20 active:scale-95"
              >
                {lang === 'id' ? 'Simpan Total Hutang' : 'Save Total Debt'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Clear All Transactions Confirm */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowClearConfirm(false)}></div>
          <div className={`relative w-full max-w-sm p-5 rounded-3xl border shadow-2xl animate-in fade-in zoom-in duration-150 text-center ${themeModalBg}`}>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3 mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className={`text-sm font-bold mb-1 ${themePrimaryText}`}>{t('clearTransactions') as string}</h3>
            <p className={`text-xs mb-4 ${themeSubText}`}>{t('confirmClearTransactions') as string}</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowClearConfirm(false)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {t('cancel') as string}
              </button>
              <button 
                onClick={() => {
                  clearAllTransactions();
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition-colors cursor-pointer"
              >
                {t('clearTransactions') as string}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Delete Single Transaction Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(null)}></div>
          <div className={`relative w-full max-w-sm p-5 rounded-3xl border shadow-2xl animate-in fade-in zoom-in duration-150 text-center ${themeModalBg}`}>
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3 mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className={`text-sm font-bold mb-1 ${themePrimaryText}`}>
              {lang === 'id' ? 'Hapus Transaksi Ini?' : 'Delete This Transaction?'}
            </h3>
            <p className={`text-xs mb-4 ${themeSubText}`}>
              {lang === 'id' ? 'Tindakan ini tidak dapat dibatalkan.' : 'This action cannot be undone.'}
            </p>
            <div className="flex gap-2">
              <button 
                onClick={() => setShowDeleteConfirm(null)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {t('cancel') as string}
              </button>
              <button 
                onClick={() => {
                  deleteTransaction(showDeleteConfirm);
                  setShowDeleteConfirm(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-rose-600 text-white hover:bg-rose-500 transition-colors cursor-pointer"
              >
                {t('delete') as string}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT DEBT ITEM */}
      {showAddDebtModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto custom-scrollbar"
          onClick={() => setShowAddDebtModal(false)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-md border rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 ${themeModalBg}`}
          >
            {/* Header */}
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${themeModalHeader}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddDebtModal(false)}
                  className={`p-1.5 -ml-1 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
                  title={lang === 'id' ? 'Kembali' : 'Back'}
                >
                  <ArrowLeft className="w-4 h-4 text-rose-500" />
                </button>
                <h3 className={`text-base font-bold ${themePrimaryText}`}>
                  {editingDebt ? (lang === 'id' ? 'Edit Catatan Hutang' : 'Edit Debt Record') : (lang === 'id' ? 'Tambah Hutang / Cicilan Baru' : 'Add New Debt / Installment')}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowAddDebtModal(false)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar max-h-[75vh]">
              {/* Mode Selector Tabs */}
              <div className={`grid grid-cols-2 p-1 border rounded-2xl gap-1 ${themeInnerCardBg}`}>
                <button
                  type="button"
                  onClick={() => setDebtFormMode('simple')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    debtFormMode === 'simple'
                      ? 'bg-rose-600 text-white shadow-md'
                      : `${themeSubText}`
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{lang === 'id' ? 'Mode Simpel (Nominal Cepat)' : 'Simple Mode'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDebtFormMode('detail')}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    debtFormMode === 'detail'
                      ? 'bg-rose-600 text-white shadow-md'
                      : `${themeSubText}`
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>{lang === 'id' ? 'Mode Detail (Angsuran)' : 'Detailed Mode'}</span>
                </button>
              </div>

              {debtFormError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                  {debtFormError}
                </div>
              )}

              {/* Title Input */}
              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Nama Hutang / Keperluan' : 'Debt Title'} *
                </label>
                <input
                  type="text"
                  value={debtFormTitle}
                  onChange={e => setDebtFormTitle(e.target.value)}
                  placeholder={lang === 'id' ? 'Contoh: Hutang Warung, Pinjam Budi, Cicilan Motor' : 'e.g. Store Debt, Motor Installment'}
                  className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-500/60 font-medium ${themeInputBg}`}
                />
              </div>

              {debtFormMode === 'simple' ? (
                /* SIMPLE MODE FIELDS */
                <div className="space-y-3">
                  <div>
                    <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                      {lang === 'id' ? 'Nominal Hutang (Rp)' : 'Debt Amount (Rp)'} *
                    </label>
                    <div className={`relative flex items-center border rounded-xl px-3 py-2 focus-within:border-rose-500/60 ${themeInputBg}`}>
                      <span className="text-xs font-bold text-rose-500 mr-1.5">Rp</span>
                      <input
                        type="text"
                        value={debtFormTotalAmount ? Number(debtFormTotalAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                        onChange={e => setDebtFormTotalAmount(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="Contoh: 150000"
                        className={`w-full bg-transparent text-sm font-bold outline-none ${themePrimaryText}`}
                      />
                      <button
                        type="button"
                        onClick={() => setDebtFormTotalAmount(prev => (prev ? prev.replace(/[^0-9]/g, '') + '000' : '1000'))}
                        className="ml-1.5 px-2 py-0.5 bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-black shrink-0 transition-all cursor-pointer border border-rose-500/30"
                        title="Tambah .000 (Ribuan)"
                      >
                        +000
                      </button>
                    </div>
                  </div>

                  <QuickAmountRow
                    currentVal={debtFormTotalAmount}
                    onUpdate={setDebtFormTotalAmount}
                    currency="IDR"
                    isLight={isLight}
                  />
                  <AmountPreviewHelper
                    rawVal={debtFormTotalAmount}
                    onUpdateValue={setDebtFormTotalAmount}
                    currency="IDR"
                  />
                </div>
              ) : (
                /* DETAIL MODE FIELDS */
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                        {lang === 'id' ? 'Pemberi Pinjaman' : 'Lender'}
                      </label>
                      <input
                        type="text"
                        value={debtFormLender}
                        onChange={e => setDebtFormLender(e.target.value)}
                        placeholder={lang === 'id' ? 'Contoh: Bank X, Budi' : 'e.g. Bank A, Friend'}
                        className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-500/60 font-medium ${themeInputBg}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                        {lang === 'id' ? 'Total Pinjaman (Rp)' : 'Total Amount'} *
                      </label>
                      <div className={`relative flex items-center border rounded-xl px-3 py-2 focus-within:border-rose-500/60 ${themeInputBg}`}>
                        <span className="text-xs font-bold text-rose-500 mr-1.5">Rp</span>
                        <input
                          type="text"
                          value={debtFormTotalAmount ? Number(debtFormTotalAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                          onChange={e => setDebtFormTotalAmount(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="0"
                          className="w-full bg-transparent text-xs font-bold text-rose-500 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setDebtFormTotalAmount(prev => (prev ? prev.replace(/[^0-9]/g, '') + '000' : '1000'))}
                          className="ml-1.5 px-2 py-0.5 bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-black shrink-0 transition-all cursor-pointer border border-rose-500/30"
                          title="Tambah .000 (Ribuan)"
                        >
                          +000
                        </button>
                      </div>
                    </div>
                  </div>

                  <QuickAmountRow currentVal={debtFormTotalAmount} onUpdate={setDebtFormTotalAmount} currency="IDR" isLight={isLight} />
                  <AmountPreviewHelper rawVal={debtFormTotalAmount} onUpdateValue={setDebtFormTotalAmount} currency="IDR" />

                  {/* Installment Count & Frequency */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                        {lang === 'id' ? 'Berapa Kali Angsuran?' : 'Installment Count'}
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={debtFormInstallmentCount}
                        onChange={e => {
                          const countStr = e.target.value;
                          setDebtFormInstallmentCount(countStr);
                          const count = parseInt(countStr, 10) || 1;
                          const tot = parseRawAmount(debtFormTotalAmount, 'IDR');
                          if (tot > 0) {
                            setDebtFormInstallmentAmount(Math.round(tot / count).toString());
                          }
                        }}
                        placeholder="12"
                        className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-500/60 font-bold ${themeInputBg}`}
                      />
                    </div>

                    <div>
                      <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                        {lang === 'id' ? 'Frekuensi Pembayaran' : 'Payment Frequency'}
                      </label>
                      <select
                        value={debtFormPaymentFrequency}
                        onChange={e => setDebtFormPaymentFrequency(e.target.value as any)}
                        className={`w-full border rounded-xl px-2.5 py-2 text-xs outline-none focus:border-rose-500/60 cursor-pointer font-medium ${themeInputBg}`}
                      >
                        <option value="monthly">{lang === 'id' ? 'Bulanan (Per Bulan)' : 'Monthly'}</option>
                        <option value="weekly">{lang === 'id' ? 'Mingguan (Per Minggu)' : 'Weekly'}</option>
                        <option value="custom">{lang === 'id' ? 'Fleksibel / Sesuai Jadwal' : 'Custom / Flexible'}</option>
                      </select>
                    </div>
                  </div>

                  {/* Installment Amount & Due Date */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                        {lang === 'id' ? 'Cicilan per Periode (Rp)' : 'Rate / Period'}
                      </label>
                      <div className={`relative flex items-center border rounded-xl px-3 py-2 focus-within:border-rose-500/60 ${themeInputBg}`}>
                        <input
                          type="text"
                          value={debtFormInstallmentAmount ? Number(debtFormInstallmentAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                          onChange={e => setDebtFormInstallmentAmount(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="0"
                          className={`w-full bg-transparent text-xs outline-none font-semibold ${themePrimaryText}`}
                        />
                        <button
                          type="button"
                          onClick={() => setDebtFormInstallmentAmount(prev => (prev ? prev.replace(/[^0-9]/g, '') + '000' : '1000'))}
                          className="ml-1.5 px-2 py-0.5 bg-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg text-[10px] font-black shrink-0 transition-all cursor-pointer border border-rose-500/30"
                          title="Tambah .000 (Ribuan)"
                        >
                          +000
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                        {lang === 'id' ? 'Tanggal / Rutin Jatuh Tempo' : 'Due Date'}
                      </label>
                      <input
                        type="text"
                        value={debtFormDueDate}
                        onChange={e => setDebtFormDueDate(e.target.value)}
                        placeholder={lang === 'id' ? 'Tgl 25 setiap bulan / Tgl ISO' : 'e.g. 25th of every month'}
                        className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-rose-500/60 font-medium ${themeInputBg}`}
                      />
                    </div>
                  </div>

                  <QuickAmountRow currentVal={debtFormInstallmentAmount} onUpdate={setDebtFormInstallmentAmount} currency="IDR" isLight={isLight} />
                  <AmountPreviewHelper rawVal={debtFormInstallmentAmount} onUpdateValue={setDebtFormInstallmentAmount} currency="IDR" />
                </div>
              )}

              {/* Notes */}
              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Catatan Tambahan (Opsional)' : 'Notes'}
                </label>
                <textarea
                  rows={2}
                  value={debtFormNotes}
                  onChange={e => setDebtFormNotes(e.target.value)}
                  placeholder={lang === 'id' ? 'Nomor kontrak, bunga, atau info kontak...' : 'Contract number or details...'}
                  className={`w-full border rounded-xl p-2.5 text-xs outline-none focus:border-rose-500/60 resize-none ${themeInputBg}`}
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className={`p-4 border-t flex items-center justify-end gap-2 shrink-0 ${themeModalHeader}`}>
              <button
                type="button"
                onClick={() => setShowAddDebtModal(false)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleSaveDebtItem}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
              >
                {lang === 'id' ? 'Simpan Catatan' : 'Save Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PAY INSTALLMENT */}
      {showPayInstallmentModal && selectedDebtForPayment && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto custom-scrollbar"
          onClick={() => setShowPayInstallmentModal(false)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-sm border rounded-3xl shadow-2xl flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150 ${themeModalBg}`}
          >
            <div className={`p-4 sm:p-5 border-b flex items-center justify-between shrink-0 ${themeModalHeader}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowPayInstallmentModal(false)}
                  className={`p-1.5 -ml-1 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
                  title={lang === 'id' ? 'Kembali' : 'Back'}
                >
                  <ArrowLeft className="w-4 h-4 text-emerald-500" />
                </button>
                <div>
                  <h3 className={`text-sm font-bold ${themePrimaryText}`}>
                    {lang === 'id' ? 'Bayar Angsuran Hutang' : 'Pay Debt Installment'}
                  </h3>
                  <p className={`text-[11px] truncate max-w-[200px] ${themeSubText}`}>
                    {selectedDebtForPayment.title}
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowPayInstallmentModal(false)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3.5">
              {payInstallmentError && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-semibold">
                  {payInstallmentError}
                </div>
              )}

              <div className={`p-3 rounded-2xl border space-y-1 text-xs ${themeInnerCardBg}`}>
                <div className="flex justify-between">
                  <span className={themeSubText}>{lang === 'id' ? 'Angsuran Ke:' : 'Installment #'}</span>
                  <span className="font-bold text-indigo-500">
                    {selectedDebtForPayment.paidInstallments + 1} / {selectedDebtForPayment.installmentCount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={themeSubText}>{lang === 'id' ? 'Sisa Hutang Saat Ini:' : 'Current Remaining:'}</span>
                  <span className="font-bold text-rose-500">{formatCurrency(selectedDebtForPayment.remainingAmount)}</span>
                </div>
              </div>

              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Nominal Pembayaran (Rp)' : 'Amount (Rp)'}
                </label>
                <div className={`relative flex items-center border rounded-xl px-3 py-2 focus-within:border-emerald-500/60 ${themeInputBg}`}>
                  <span className="text-xs font-bold text-emerald-500 mr-1.5">Rp</span>
                  <input
                    type="text"
                    value={payInstallmentAmount ? Number(payInstallmentAmount.replace(/[^0-9]/g, '')).toLocaleString('id-ID') : ''}
                    onChange={e => setPayInstallmentAmount(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="0"
                    className="w-full bg-transparent text-sm text-emerald-500 font-black outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setPayInstallmentAmount(prev => (prev ? prev.replace(/[^0-9]/g, '') + '000' : '1000'))}
                    className="ml-2 px-2.5 py-1 bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-black shrink-0 transition-all cursor-pointer border border-emerald-500/30"
                    title="Tambah .000 (Ribuan)"
                  >
                    +000
                  </button>
                </div>
                <QuickAmountRow currentVal={payInstallmentAmount} onUpdate={setPayInstallmentAmount} currency="IDR" isLight={isLight} />
                <AmountPreviewHelper rawVal={payInstallmentAmount} onUpdateValue={setPayInstallmentAmount} currency="IDR" />
              </div>

              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Tanggal Bayar' : 'Payment Date'}
                </label>
                <input
                  type="date"
                  value={payInstallmentDate}
                  onChange={e => setPayInstallmentDate(e.target.value)}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-semibold outline-none focus:border-emerald-500/60 ${themeInputBg}`}
                />
              </div>

              <div>
                <label className={`block text-[10px] font-bold mb-1 uppercase tracking-wider ${themeSubText}`}>
                  {lang === 'id' ? 'Catatan / Keterangan' : 'Note'}
                </label>
                <input
                  type="text"
                  value={payInstallmentNote}
                  onChange={e => setPayInstallmentNote(e.target.value)}
                  placeholder={lang === 'id' ? 'Contoh: Transfer via M-Banking' : 'e.g. Bank transfer'}
                  className={`w-full border rounded-xl px-3 py-2 text-xs outline-none focus:border-emerald-500/60 ${themeInputBg}`}
                />
              </div>

              <p className={`text-[10px] italic ${themeSubText}`}>
                * {lang === 'id' 
                  ? 'Pembayaran ini akan otomatis dicatat sebagai Transaksi Pengeluaran (kategori Bayar Hutang) dan sisa hutang Anda berkurang.'
                  : 'This payment will automatically be logged as an Expense transaction and reduce your remaining debt.'}
              </p>
            </div>

            <div className={`p-4 border-t flex items-center justify-end gap-2 shrink-0 ${themeModalHeader}`}>
              <button
                type="button"
                onClick={() => setShowPayInstallmentModal(false)}
                className={`px-4 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handlePayInstallmentSubmit}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer active:scale-95 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>{lang === 'id' ? 'Konfirmasi Bayar' : 'Confirm Payment'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE DEBT CONFIRM */}
      {showDeleteDebtConfirm && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto custom-scrollbar"
          onClick={() => setShowDeleteDebtConfirm(null)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-xs border rounded-3xl shadow-2xl p-5 text-center space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150 ${themeModalBg}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${themePrimaryText}`}>
                {lang === 'id' ? 'Hapus Catatan Hutang Ini?' : 'Delete Debt Record?'}
              </h3>
              <p className={`text-xs mt-1 ${themeSubText}`}>
                {lang === 'id' 
                  ? 'Catatan hutang akan dihapus dari daftar. Transaksi pembayaran yang sudah dicatat sebelumnya tidak akan terhapus.' 
                  : 'This debt record will be removed. Past logged payment transactions will remain in history.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteDebtConfirm(null)}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteDebt(showDeleteDebtConfirm);
                  if (debts.length <= 1) {
                    setInitialDebt(0);
                    try { localStorage.removeItem('tata_initial_debt'); } catch(e){}
                  }
                  setShowDeleteDebtConfirm(null);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                {lang === 'id' ? 'Hapus' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESET ALL DEBT CONFIRM */}
      {showResetDebtConfirm && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto custom-scrollbar"
          onClick={() => setShowResetDebtConfirm(false)}
        >
          <div 
            onClick={e => e.stopPropagation()}
            className={`relative w-full max-w-xs border rounded-3xl shadow-2xl p-5 text-center space-y-4 my-auto animate-in fade-in zoom-in-95 duration-150 ${themeModalBg}`}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className={`font-bold text-sm ${themePrimaryText}`}>
                {lang === 'id' ? 'Hapus & Reset Semua Data Hutang?' : 'Reset All Debt Data?'}
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${themeSubText}`}>
                {lang === 'id' 
                  ? 'Seluruh catatan hutang dan total nominal hutang akan dihapus bersih dan direset menjadi Rp 0.' 
                  : 'All debt records and remaining total debt will be completely wiped and reset to Rp 0.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetDebtConfirm(false)}
                className={`flex-1 py-2 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${themeBtnSecondary}`}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearAllDebtData();
                  setInitialDebt(0);
                  setShowResetDebtConfirm(false);
                }}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                {lang === 'id' ? 'Reset Jadi Rp 0' : 'Reset to Rp 0'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Comprehensive Interactive Tutorial / Panduan Fitur Keuangan */}
      {showTutorialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md" onClick={() => setShowTutorialModal(false)}></div>
          
          <div className={`relative w-full max-w-2xl border rounded-3xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] ${themeModalBg}`}>
            
            {/* Header Modal */}
            <div className={`p-5 sm:p-6 border-b flex items-center justify-between shrink-0 ${themeModalHeader}`}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowTutorialModal(false)}
                  className={`p-1.5 -ml-1 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
                  title={lang === 'id' ? 'Kembali' : 'Back'}
                >
                  <ArrowLeft className="w-4 h-4 text-indigo-500" />
                </button>
                <div>
                  <h3 className={`text-base sm:text-lg font-black flex items-center gap-2 ${themePrimaryText}`}>
                    {lang === 'id' ? 'Panduan Fitur Keuangan Tata' : 'Tata Finance User Guide'}
                  </h3>
                  <p className={`text-xs font-medium ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
                    {lang === 'id' ? 'Pelajari cara pakai dalam 1 menit — Mudah, Cepat & Bebas Ribet' : 'Learn how it works in 1 minute — Simple, Fast & Easy'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTutorialModal(false)}
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs leading-relaxed">
              
              {/* Section 1 */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${themeInnerCardBg}`}>
                <div className="flex items-center gap-2 text-indigo-500 font-black text-sm">
                  <Wallet className="w-5 h-5" />
                  <h4>1. {lang === 'id' ? 'Total Saldo Dompet & Pencatatan Cepat' : 'Cash Balance & Fast Logging'}</h4>
                </div>
                <p className={themePrimaryText}>
                  {lang === 'id' 
                    ? 'Saldo Dompet dihitung secara otomatis dari Total Pemasukan dikurangi Total Pengeluaran.' 
                    : 'Your Wallet Balance is automatically computed as Total Income minus Total Expense.'}
                </p>
                <ul className={`list-disc list-inside space-y-1 font-medium pl-1 ${themeSubText}`}>
                  <li>
                    <strong className="text-emerald-500">{lang === 'id' ? '+ Pemasukan' : '+ Income'}</strong>: {lang === 'id' ? 'Untuk mencatat gaji, bonus, atau uang jajan masuk.' : 'Record salaries, pocket money, or bonuses.'}
                  </li>
                  <li>
                    <strong className="text-rose-500">{lang === 'id' ? '- Pengeluaran' : '- Expense'}</strong>: {lang === 'id' ? 'Untuk mencatat belanja harian, makan, atau tagihan.' : 'Record daily meals, shopping, or utility bills.'}
                  </li>
                  <li>
                    <strong className="text-amber-500">{lang === 'id' ? 'Pembaca Nominal Terbilang' : 'Auto Amount Speller'}</strong>: {lang === 'id' ? 'Sistem langsung membaca angka yang Anda ketik dalam kalimat (contoh: 100.000 menjadi "Seratus Ribu Rupiah") agar tidak terjadi salah jumlah nol.' : 'System spells out typed numbers automatically (e.g. 100,000 -> "One Hundred Thousand Rupiah") to prevent typing errors.'}
                  </li>
                  <li>
                    <strong className="text-indigo-500">{lang === 'id' ? 'Tombol Shortcut (+000 & Preset)' : 'Shortcut Buttons (+000 & Presets)'}</strong>: {lang === 'id' ? 'Gunakan tombol 10rb, 50rb, 100rb, atau +000 untuk pengisian nominal kilat tanpa mengetik nol manual.' : 'Use 10k, 50k, 100k, or +000 buttons for instant input without typing zeros.'}
                  </li>
                </ul>
              </div>

              {/* Section 2 */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${themeInnerCardBg}`}>
                <div className="flex items-center gap-2 text-indigo-500 font-black text-sm">
                  <PiggyBank className="w-5 h-5" />
                  <h4>2. {lang === 'id' ? 'Tabungan Terpisah & Target Impian' : 'Savings & Goal Tracking'}</h4>
                </div>
                <p className={themePrimaryText}>
                  {lang === 'id'
                    ? 'Tabungan dipisahkan khusus agar uang dingin Anda aman dari belanja sehari-hari.'
                    : 'Savings are safely kept separate from your daily wallet balance.'}
                </p>
                <ul className={`list-disc list-inside space-y-1 font-medium pl-1 ${themeSubText}`}>
                  <li>
                    <strong className={themePrimaryText}>{lang === 'id' ? 'Atur Target Impian' : 'Set Savings Goal'}</strong>: {lang === 'id' ? 'Tentukan target impian (misal "Beli Laptop" atau "Dana Darurat") beserta jumlah nominal yang ingin dicapai.' : 'Set a target goal (e.g. "Buy Laptop" or "Emergency Fund") with a target amount.'}
                  </li>
                  <li>
                    <strong className="text-indigo-500">{lang === 'id' ? 'Setor Tabungan' : 'Deposit Savings'}</strong>: {lang === 'id' ? 'Gunakan tombol ini saat menyisihkan uang dari dompet ke tabungan. Saldo tabungan bertambah dan dicatat otomatis.' : 'Deposit money from wallet into savings.'}
                  </li>
                  <li>
                    <strong className="text-amber-500">{lang === 'id' ? 'Tarik Tabungan' : 'Withdraw Savings'}</strong>: {lang === 'id' ? 'Gunakan tombol ini jika Anda perlu menarik dana dari tabungan saat terdesak.' : 'Withdraw money back when needed urgently.'}
                  </li>
                </ul>
              </div>

              {/* Section 3 */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${themeInnerCardBg}`}>
                <div className="flex items-center gap-2 text-indigo-500 font-black text-sm">
                  <Receipt className="w-5 h-5" />
                  <h4>3. {lang === 'id' ? 'Filter Bulan & Pencarian Riwayat' : 'Monthly Filter & History Search'}</h4>
                </div>
                <p className={themePrimaryText}>
                  {lang === 'id'
                    ? 'Anda bisa memantau transaksi berdasarkan periode bulan (Bulan Ini, Kemarin, atau Semua Waktu) serta mencari kata kunci transaksi tertentu secara praktis.'
                    : 'Easily filter transactions by month (Current Month, Last Month, All Time) or search by description.'}
                </p>
              </div>

              {/* Section 4 */}
              <div className={`p-4 sm:p-5 rounded-2xl border space-y-2 ${themeInnerCardBg}`}>
                <div className="flex items-center gap-2 text-indigo-500 font-black text-sm">
                  <PieChartIcon className="w-5 h-5" />
                  <h4>4. {lang === 'id' ? 'Analisis Pengeluaran' : 'Expense Analytics'}</h4>
                </div>
                <p className={themePrimaryText}>
                  {lang === 'id'
                    ? 'Klik tab "Analisis" di bagian atas untuk melihat grafik lingkaran persentase pengeluaran. Anda bisa mengevaluasi kategori mana (Makan, Transport, Tagihan) yang paling banyak menyerap anggaran.'
                    : 'Click the "Analytics" tab at the top to see pie charts of your spending categories.'}
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center gap-3 text-indigo-500">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <p className="text-[11px] font-medium">
                  {lang === 'id'
                    ? 'Semua data disimpan secara 100% lokal di perangkat Anda (Offline & Privat).'
                    : 'All financial data is stored 100% locally on your device (Offline & Private).'}
                </p>
              </div>

            </div>

            {/* Footer Modal */}
            <div className={`p-4 border-t flex items-center justify-between gap-3 shrink-0 ${themeModalHeader}`}>
              <span className={`text-[11px] hidden sm:inline ${themeSubText}`}>
                {lang === 'id' ? 'Panduan ini bisa dibuka kapan saja dari tombol header' : 'Access this guide anytime via header button'}
              </span>
              <button
                onClick={() => {
                  setShowTutorialModal(false);
                  setShowTutorialBanner(false);
                  localStorage.setItem('tata_hide_finance_tutorial', 'true');
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 cursor-pointer active:scale-95"
              >
                {lang === 'id' ? 'Paham, Mulai Sekarang!' : 'Got it, Start Now!'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL PRINT / LAPORAN KEUANGAN STATEMENT BANK */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-6 overflow-y-auto">
          <div className={`printable-bank-statement border rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 ${themeModalBg}`}>
            
            {/* Modal Header Controls (Hidden on Print) */}
            <div className={`p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0 no-print ${themeModalHeader}`}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className={`p-2 -ml-1 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
                  title={lang === 'id' ? 'Kembali' : 'Back'}
                >
                  <ArrowLeft className="w-4 h-4 text-indigo-500" />
                </button>
                <div>
                  <h3 className={`text-base sm:text-lg font-black ${themePrimaryText}`}>
                    {lang === 'id' ? 'Laporan Statement Keuangan Tata' : 'Tata Financial Statement'}
                  </h3>
                  <p className={`text-xs font-medium ${isLight ? 'text-indigo-600' : 'text-indigo-300'}`}>
                    {monthDisplayTitle} • {chronologicalLedger.length} {lang === 'id' ? 'Transaksi' : 'Transactions'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleExportCSV('excel')}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 font-bold text-xs flex items-center gap-1.5 border border-emerald-500/30 transition-all cursor-pointer active:scale-95"
                  title={lang === 'id' ? 'Download CSV Format Statement Excel' : 'Download Excel CSV'}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{lang === 'id' ? 'CSV Excel' : 'CSV Excel'}</span>
                </button>
                <button
                  onClick={() => handleExportCSV('clean_table')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer active:scale-95 ${themeBtnSecondary}`}
                  title={lang === 'id' ? 'Download CSV Format Tabel Murni' : 'Download Raw Table CSV'}
                >
                  <Download className="w-4 h-4" />
                  <span>{lang === 'id' ? 'CSV Data Murni' : 'Pure CSV'}</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>{lang === 'id' ? 'Cetak / Save PDF' : 'Print / Save PDF'}</span>
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className={`p-2 rounded-xl border transition-colors cursor-pointer ${themeBtnSecondary}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Printable Financial Statement Layout */}
            <div className="p-5 sm:p-7 overflow-y-auto space-y-6 custom-scrollbar text-xs">
              
              {/* Official Financial Statement Header Banner */}
              <div className={`p-5 rounded-2xl border space-y-4 ${themeInnerCardBg}`}>
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${themeBorder}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500 shrink-0">
                      <Landmark className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className={`text-base sm:text-lg font-black tracking-wide uppercase ${themePrimaryText}`}>
                        Tata Financial Statement
                      </h2>
                      <p className="text-[11px] text-indigo-500 font-bold">
                        {lang === 'id' ? 'LAPORAN STATEMENT MUTASI KEUANGAN' : 'OFFICIAL FINANCIAL MUTATION STATEMENT'}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-[11px] space-y-0.5">
                    <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 font-bold border border-emerald-500/20 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'Offline & Privat' : 'Offline & Private'}</span>
                    </div>
                    <p className={`font-medium ${themeSubText}`}>
                      {lang === 'id' ? 'No. Referensi' : 'Ref No'}: <span className={`font-mono ${themePrimaryText}`}>TATA-STMT-{selectedMonth.replace('-', '')}</span>
                    </p>
                    <p className={`font-medium ${themeSubText}`}>
                      {lang === 'id' ? 'Tanggal Dicetak' : 'Issue Date'}: <span className={themePrimaryText}>{new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>
                </div>

                {/* Account Holder & Statement Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                  <div className={`p-3.5 rounded-xl border space-y-1 ${themeCardBg}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${themeSubText}`}>
                      {lang === 'id' ? 'Nama Pengguna' : 'User Name'}
                    </span>
                    <p className={`font-black text-base tracking-tight ${themePrimaryText}`}>{accountOwnerName || user?.name || 'Pengguna Tata'}</p>
                    <p className={`text-[11px] font-mono ${themeSubText}`}>
                      {lang === 'id' ? 'ID Statement' : 'Statement ID'}: <strong className={themePrimaryText}>{accountNumber}</strong>
                    </p>
                    <p className={`text-[11px] ${themeSubText}`}>
                      {lang === 'id' ? 'Periode Laporan' : 'Statement Period'}: <strong className="text-indigo-500">{monthDisplayTitle}</strong>
                    </p>
                  </div>

                  <div className={`p-3.5 rounded-xl border space-y-1 ${themeCardBg}`}>
                    <span className={`text-[10px] font-bold uppercase tracking-wider block ${themeSubText}`}>
                      {lang === 'id' ? 'Total Kekayaan Bersih' : 'Net Worth Summary'}
                    </span>
                    <p className="font-black text-emerald-500 text-base">
                      {formatCurrency(availableWalletCash + savingsBalance)}
                    </p>
                    <p className={`text-[11px] ${themeSubText}`}>
                      {lang === 'id' ? 'Mata Uang Operasional' : 'Currency'}: <strong className={themePrimaryText}>IDR (Rupiah)</strong>
                    </p>
                    <p className={`text-[11px] ${themeSubText}`}>
                      {lang === 'id' ? 'Status Laporan' : 'Statement Status'}: <strong className="text-emerald-500">{lang === 'id' ? 'Singkron & Privat' : 'Synced & Private'}</strong>
                    </p>
                  </div>
                </div>

                {/* Key Financial Totals Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                  <div className={`p-3 rounded-xl border ${themeCardBg}`}>
                    <span className={`text-[10px] font-bold uppercase block ${themeSubText}`}>{lang === 'id' ? 'Saldo Awal' : 'Opening Balance'}</span>
                    <span className={`font-extrabold text-sm block mt-0.5 ${themePrimaryText}`}>{formatCurrency(openingBalance)}</span>
                  </div>

                  <div className={`p-3 rounded-xl border ${themeCardBg}`}>
                    <span className={`text-[10px] font-bold uppercase block ${themeSubText}`}>{lang === 'id' ? 'Total Pemasukan (+)' : 'Total Income (+)'}</span>
                    <span className="text-emerald-500 font-extrabold text-sm block mt-0.5">+{formatCurrency(statementTotals.credit)}</span>
                  </div>

                  <div className={`p-3 rounded-xl border ${themeCardBg}`}>
                    <span className={`text-[10px] font-bold uppercase block ${themeSubText}`}>{lang === 'id' ? 'Total Pengeluaran (-)' : 'Total Expense (-)'}</span>
                    <span className="text-rose-500 font-extrabold text-sm block mt-0.5">-{formatCurrency(statementTotals.debit)}</span>
                  </div>

                  <div className={`p-3 rounded-xl border ${themeCardBg}`}>
                    <span className={`text-[10px] font-bold uppercase block ${themeSubText}`}>{lang === 'id' ? 'Saldo Akhir' : 'Closing Balance'}</span>
                    <span className="text-indigo-500 font-extrabold text-sm block mt-0.5">{formatCurrency(statementTotals.closing)}</span>
                  </div>
                </div>
              </div>

              {/* Transactions Ledger Table with Running Balance */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${themePrimaryText}`}>
                    <Receipt className="w-4 h-4 text-indigo-500" />
                    <span>{lang === 'id' ? 'Rincian Mutasi Keuangan (Kronologis)' : 'Detailed Financial Mutations'} ({chronologicalLedger.length})</span>
                  </h4>
                  <span className={`text-[10px] italic ${themeSubText}`}>
                    * {lang === 'id' ? 'Diurutkan dari transaksi terlama ke terbaru' : 'Sorted chronologically'}
                  </span>
                </div>

                {chronologicalLedger.length === 0 ? (
                  <div className={`p-8 text-center rounded-2xl border italic ${themeInnerCardBg} ${themeSubText}`}>
                    {lang === 'id' ? 'Tidak ada catatan transaksi untuk periode ini.' : 'No transactions recorded for this period.'}
                  </div>
                ) : (
                  <div className={`border rounded-2xl overflow-hidden shadow-inner ${themeInnerCardBg}`}>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-xs min-w-[650px]">
                        <thead className={`text-[10px] uppercase font-extrabold border-b ${themeBorder} ${themeCardBg} ${themeSubText}`}>
                          <tr>
                            <th className="py-3 px-3 text-center w-10">No</th>
                            <th className="py-3 px-3 whitespace-nowrap">{lang === 'id' ? 'Tanggal' : 'Date'}</th>
                            <th className="py-3 px-3">{lang === 'id' ? 'Kategori & Keterangan' : 'Category & Desc'}</th>
                            <th className="py-3 px-3 text-center w-24">{lang === 'id' ? 'Jenis' : 'Type'}</th>
                            <th className="py-3 px-3 text-right">{lang === 'id' ? 'Pengeluaran (-)' : 'Expense (-)'}</th>
                            <th className="py-3 px-3 text-right">{lang === 'id' ? 'Pemasukan (+)' : 'Income (+)'}</th>
                            <th className="py-3 px-3 text-right font-black">{lang === 'id' ? 'Saldo Berjalan' : 'Running Balance'}</th>
                          </tr>
                        </thead>
                        <tbody className={`divide-y font-medium ${themeBorder} ${themePrimaryText}`}>
                          {chronologicalLedger.map((item) => (
                            <tr key={item.id} className="hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                              <td className={`py-2.5 px-3 text-center font-mono text-[11px] ${themeSubText}`}>
                                {item.indexNumber}
                              </td>
                              <td className={`py-2.5 px-3 whitespace-nowrap font-mono text-[11px] ${themeSubText}`}>
                                {item.date}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className={`font-bold flex items-center gap-1.5 ${themePrimaryText}`}>
                                  <span>{getCategoryEmoji(item.category)}</span>
                                  <span>{translateCategory(item.category, lang)}</span>
                                </div>
                                {item.description && (
                                  <p className={`text-[11px] truncate max-w-[220px] ${themeSubText}`}>
                                    {item.description}
                                  </p>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wide ${
                                  item.isCredit
                                    ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-500 border border-rose-500/30'
                                }`}>
                                  {item.isCredit 
                                    ? (lang === 'id' ? 'Pemasukan' : 'Income') 
                                    : (lang === 'id' ? 'Pengeluaran' : 'Expense')}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-rose-500 font-bold whitespace-nowrap">
                                {item.isDebit ? `-${formatCurrency(item.amount, item.currency)}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right text-emerald-500 font-bold whitespace-nowrap">
                                {item.isCredit ? `+${formatCurrency(item.amount, item.currency)}` : '-'}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-indigo-500 whitespace-nowrap">
                                {formatCurrency(item.runningBalance, item.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Legal Notice / Footer */}
              <div className={`p-3.5 rounded-xl border text-[11px] text-center leading-relaxed ${themeCardBg} ${themeSubText}`}>
                <p className="font-medium">
                  {lang === 'id'
                    ? 'Dokumen statement ini diterbitkan secara resmi oleh Tata App. Seluruh data keuangan disimpan 100% lokal & privat di perangkat Anda.'
                    : 'This financial statement was generated by Tata App. All data is processed 100% locally and privately on your device.'}
                </p>
              </div>

            </div>

            {/* Modal Action Footer (Hidden on Print) */}
            <div className={`p-4 border-t flex items-center justify-between gap-3 shrink-0 no-print ${themeModalHeader}`}>
              <button
                type="button"
                onClick={() => handleExportCSV('excel')}
                className="px-4 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>{lang === 'id' ? 'Download CSV (Excel)' : 'Download CSV (Excel)'}</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/25 cursor-pointer active:scale-95"
                >
                  <Printer className="w-4 h-4" />
                  <span>{lang === 'id' ? 'Cetak / Save PDF' : 'Print / Save PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintModal(false)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${themeBtnSecondary}`}
                >
                  {lang === 'id' ? 'Tutup' : 'Close'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[250] border px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none ${
          isLight ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/50' : 'bg-slate-900 border-slate-700/80 text-slate-100'
        }`}>
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}

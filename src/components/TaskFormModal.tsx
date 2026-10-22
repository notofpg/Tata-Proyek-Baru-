import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  X, Target, Repeat, ClipboardList, Calendar as CalendarIcon, 
  Bell, Gift, AlertTriangle, RotateCcw, Check
} from 'lucide-react';
import { Task } from '../types';
import { OrganicThemePalette } from './home/organicThemePalettes';
import { 
  Icon3DTarget, Icon3DRepeat, Icon3DNavTasks, Icon3DX, 
  Icon3DCalendar, Icon3DClock, Icon3DGift, Icon3DWarning, 
  Icon3DRotateCcw 
} from './home/Organic3DIcons';
import { triggerHaptic } from '../utils/sound';

export interface TaskFormData {
  title: string;
  priority: 'Tinggi' | 'Sedang' | 'Rendah';
  repeat: 'once' | 'daily';
  date: string;
  alarmTime?: string;
  isDiscipline: boolean;
  targetDate?: string;
  reward?: string;
  punishment?: string;
  motivation?: string;
}

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTask: Task | null;
  initialType?: 'Sekarang' | 'Harian' | 'Disiplin';
  onSave: (data: TaskFormData) => void;
  onRestartRequest?: (task: Task) => void;
  appTheme?: string;
  isOrganic: boolean;
  palette: OrganicThemePalette;
  lang: 'id' | 'en';
}

const getLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const PRESET_DAYS = [
  { label: '30 Hari', days: 30 },
  { label: '60 Hari', days: 60 },
  { label: '90 Hari', days: 90 },
  { label: '100 Hari', days: 100 },
  { label: '1 Tahun', days: 365 },
] as const;

// ---------------------------------------------------------------------------
// 1. MEMOIZED TYPE TABS (Zero re-render when typing title)
// ---------------------------------------------------------------------------
const TaskTypeTabs = React.memo<{
  isDiscipline: boolean;
  repeat: 'once' | 'daily';
  isOrganic: boolean;
  palette: OrganicThemePalette;
  is3D: boolean;
  lang: string;
  onSelectSekarang: () => void;
  onSelectHarian: () => void;
  onSelectDisiplin: () => void;
}>(({
  isDiscipline,
  repeat,
  isOrganic,
  palette,
  is3D,
  lang,
  onSelectSekarang,
  onSelectHarian,
  onSelectDisiplin,
}) => {
  return (
    <div className={`p-1 rounded-2xl border flex gap-1 shadow-inner ${palette.searchContainer}`}>
      <button
        type="button"
        onClick={onSelectSekarang}
        className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
          !isDiscipline && repeat === 'once'
            ? `${palette.chipActive} text-white shadow-xs font-extrabold`
            : `${palette.subText} hover:${palette.titleText}`
        }`}
      >
        {is3D ? <Icon3DNavTasks size={14} /> : <ClipboardList className="w-3.5 h-3.5" />}
        <span className="truncate">{lang === 'id' ? 'Sekarang' : 'Once'}</span>
      </button>

      <button
        type="button"
        onClick={onSelectHarian}
        className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
          !isDiscipline && repeat === 'daily'
            ? `${palette.chipActive} text-white shadow-xs font-extrabold`
            : `${palette.subText} hover:${palette.titleText}`
        }`}
      >
        {is3D ? <Icon3DRepeat size={14} /> : <Repeat className="w-3.5 h-3.5" />}
        <span className="truncate">{lang === 'id' ? 'Rutinitas' : 'Daily'}</span>
      </button>

      <button
        type="button"
        onClick={onSelectDisiplin}
        className={`flex-1 py-2 px-2.5 text-xs font-bold rounded-xl transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation ${
          isDiscipline
            ? `${palette.chipActive} text-white shadow-xs font-extrabold`
            : `${palette.subText} hover:${palette.titleText}`
        }`}
      >
        {is3D ? <Icon3DTarget size={14} /> : <Target className="w-3.5 h-3.5" />}
        <span className="truncate">{lang === 'id' ? 'Disiplin' : 'Discipline'}</span>
      </button>
    </div>
  );
});

// ---------------------------------------------------------------------------
// 2. MEMOIZED PRIORITY SELECTOR (Zero re-render when typing title)
// ---------------------------------------------------------------------------
const TaskPrioritySelector = React.memo<{
  priority: 'Tinggi' | 'Sedang' | 'Rendah';
  onChangePriority: (p: 'Tinggi' | 'Sedang' | 'Rendah') => void;
  isOrganic: boolean;
  palette: OrganicThemePalette;
  lang: string;
}>(({ priority, onChangePriority, isOrganic, palette, lang }) => {
  return (
    <div>
      <span className={`text-[11px] font-bold mb-1.5 block ${palette.subText}`}>
        {lang === 'id' ? 'Prioritas Tugas' : 'Priority'}
      </span>
      <div className={`flex gap-1.5 p-1 rounded-xl border ${palette.searchContainer}`}>
        {(['Rendah', 'Sedang', 'Tinggi'] as const).map(p => {
          const pLabel = p === 'Tinggi' ? (lang === 'id' ? 'Wajib' : 'High') : p === 'Sedang' ? (lang === 'id' ? 'Sedang' : 'Medium') : (lang === 'id' ? 'Rendah' : 'Low');
          const isSelected = priority === p;
          const activeClass = 
            isSelected 
              ? `${palette.chipActive} font-bold shadow-xs`
              : `${palette.subText} hover:opacity-90`;
          return (
            <button
              key={p}
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onChangePriority(p);
              }}
              className={`flex-1 py-1.5 text-xs rounded-lg transition-all active:scale-95 cursor-pointer touch-manipulation ${activeClass}`}
            >
              {pLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// 3. MEMOIZED DATE & TIME CONTROLS (Zero re-render when typing title)
// ---------------------------------------------------------------------------
const TaskDateTimeSection = React.memo<{
  repeat: 'once' | 'daily';
  isDiscipline: boolean;
  date: string;
  setDate: (d: string) => void;
  alarmTime: string;
  setAlarmTime: (t: string) => void;
  isOrganic: boolean;
  palette: OrganicThemePalette;
  is3D: boolean;
  lang: string;
}>(({
  repeat,
  isDiscipline,
  date,
  setDate,
  alarmTime,
  setAlarmTime,
  isOrganic,
  palette,
  is3D,
  lang,
}) => {
  // Pre-compute date chips once
  const dateChips = useMemo(() => {
    const today = new Date();
    const tmr = new Date(Date.now() + 86400000);
    const lusa = new Date(Date.now() + 86400000 * 2);
    const sat = new Date();
    const day = sat.getDay();
    const diff = (6 - day + 7) % 7 || 7;
    sat.setDate(sat.getDate() + diff);
    const nextWeek = new Date(Date.now() + 86400000 * 7);

    return [
      { label: lang === 'id' ? 'Hari Ini' : 'Today', val: getLocalIsoDate(today) },
      { label: lang === 'id' ? 'Besok' : 'Tmrw', val: getLocalIsoDate(tmr) },
      { label: lang === 'id' ? 'Lusa' : '+2d', val: getLocalIsoDate(lusa) },
      { label: lang === 'id' ? 'Sabtu' : 'Sat', val: getLocalIsoDate(sat) },
      { label: lang === 'id' ? '+1 Mgg' : '+1w', val: getLocalIsoDate(nextWeek) },
    ];
  }, [lang]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Due Date with Quick Chips (Only for One-Time Tasks) */}
      {!isDiscipline && repeat === 'once' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold flex items-center gap-1 ${palette.subText}`}>
              {is3D ? <Icon3DCalendar size={13} /> : <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />}
              <span>{lang === 'id' ? 'Tanggal Target' : 'Due Date'}</span>
            </span>
            {date && (
              <span className={`text-[10px] font-mono font-bold ${palette.brandText}`}>
                {date}
              </span>
            )}
          </div>

          {/* Quick Date Chips */}
          <div className="flex flex-wrap gap-1">
            {dateChips.map(chip => {
              const isSelected = date === chip.val;
              return (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setDate(chip.val);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all active:scale-95 cursor-pointer touch-manipulation border ${
                    isSelected
                      ? `${palette.chipActive} shadow-xs` 
                      : `${palette.chipInactive} hover:opacity-90`
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>

          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ colorScheme: palette.isDark ? 'dark' : 'light' }}
            className={`w-full rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none transition-colors cursor-pointer border ${palette.taskCard} ${palette.streakBorder} ${palette.titleText}`}
          />
        </div>
      )}

      {/* Reminder Alarm Time */}
      <div className={repeat === 'daily' || isDiscipline ? 'sm:col-span-2' : ''}>
        <span className={`text-[11px] font-bold mb-1 flex items-center gap-1 ${palette.subText}`}>
          {is3D ? <Icon3DClock size={13} /> : <Bell className="w-3.5 h-3.5 text-indigo-400" />}
          <span>
            {repeat === 'daily' || isDiscipline 
              ? (lang === 'id' ? 'Jam Pengingat Harian' : 'Daily Reminder Time') 
              : (lang === 'id' ? 'Jam Pengingat' : 'Reminder Time')}
          </span>
        </span>
        <div className="relative">
          <input
            type="time"
            value={alarmTime}
            onChange={e => setAlarmTime(e.target.value)}
            style={{ colorScheme: palette.isDark ? 'dark' : 'light' }}
            className={`w-full rounded-xl pl-3 pr-8 py-2 text-xs font-semibold focus:outline-none transition-colors cursor-pointer border ${palette.taskCard} ${palette.streakBorder} ${palette.titleText}`}
          />
          {alarmTime && (
            <button 
              type="button" 
              onClick={() => {
                triggerHaptic('light');
                setAlarmTime('');
              }}
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 cursor-pointer touch-manipulation ${palette.streakCard} ${palette.subText} hover:${palette.titleText}`}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// 4. MEMOIZED DISCIPLINE DETAILS SECTION (Zero re-render when typing title)
// ---------------------------------------------------------------------------
const TaskDisciplineDetailsSection = React.memo<{
  targetDate: string;
  setTargetDate: (d: string) => void;
  reward: string;
  setReward: (r: string) => void;
  punishment: string;
  setPunishment: (p: string) => void;
  motivation: string;
  setMotivation: (m: string) => void;
  isOrganic: boolean;
  palette: OrganicThemePalette;
  is3D: boolean;
  lang: string;
}>(({
  targetDate,
  setTargetDate,
  reward,
  setReward,
  punishment,
  setPunishment,
  motivation,
  setMotivation,
  isOrganic,
  palette,
  is3D,
  lang,
}) => {
  return (
    <div className={`space-y-3.5 pt-3 border-t ${palette.streakBorder}`}>
      {/* Target Date / Duration Presets */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className={`text-[11px] font-bold flex items-center gap-1.5 ${palette.brandText}`}>
            {is3D ? <Icon3DTarget size={14} /> : <Target className="w-3.5 h-3.5 text-orange-400" />}
            <span>{lang === 'id' ? 'Target Selesai / Durasi Tantangan' : 'Target Date / Challenge Duration'}</span>
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {PRESET_DAYS.map(preset => {
            const targetD = new Date();
            targetD.setDate(targetD.getDate() + preset.days);
            const isoStr = getLocalIsoDate(targetD);
            const isSelected = targetDate === isoStr;
            return (
              <button
                key={preset.days}
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  setTargetDate(isoStr);
                }}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all active:scale-95 cursor-pointer touch-manipulation border ${
                  isSelected 
                    ? `${palette.chipActive} shadow-xs` 
                    : `${palette.chipInactive} hover:opacity-90`
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
        <input
          type="date"
          value={targetDate}
          onChange={e => setTargetDate(e.target.value)}
          style={{ colorScheme: palette.isDark ? 'dark' : 'light' }}
          className={`w-full rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer border ${palette.taskCard} ${palette.streakBorder} ${palette.titleText}`}
        />
      </div>

      {/* Reward & Punishment Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Reward */}
        <div className={`rounded-2xl p-3.5 space-y-2 border ${palette.quoteCard} ${palette.quoteBorder}`}>
          <div className={`flex items-center gap-1.5 font-bold text-xs ${palette.brandText}`}>
            {is3D ? <Icon3DGift size={15} /> : <Gift className="w-3.5 h-3.5 text-amber-400" />}
            <span>{lang === 'id' ? 'Hadiah Keberhasilan' : 'Success Reward'}</span>
          </div>
          <input
            type="text"
            value={reward}
            onChange={e => setReward(e.target.value)}
            placeholder={lang === 'id' ? 'Contoh: Liburan, Beli sepatu baru...' : 'Example: Vacation, Buy shoes...'}
            className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${palette.streakCard} ${palette.streakBorder} ${palette.titleText} placeholder:${palette.subText}`}
          />
          <p className={`text-[10px] leading-tight ${palette.subText}`}>
            {lang === 'id' ? 'Hadiah saat target tercapai penuh.' : 'Reward upon full achievement.'}
          </p>
        </div>

        {/* Punishment */}
        <div className={`rounded-2xl p-3.5 space-y-2 border ${palette.quoteCard} ${palette.quoteBorder}`}>
          <div className="flex items-center gap-1.5 font-bold text-xs text-rose-500">
            {is3D ? <Icon3DWarning size={15} /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
            <span>{lang === 'id' ? 'Konsekuensi Bolong' : 'Missed Consequence'}</span>
          </div>
          <input
            type="text"
            value={punishment}
            onChange={e => setPunishment(e.target.value)}
            placeholder={lang === 'id' ? 'Contoh: Push-up 50x, Sedekah...' : 'Example: 50 pushups, Donate...'}
            className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${palette.streakCard} ${palette.streakBorder} ${palette.titleText} placeholder:${palette.subText}`}
          />
          <p className={`text-[10px] leading-tight ${palette.subText}`}>
            {lang === 'id' ? 'Wajib dijalani jika ada hari terlewat.' : 'Must execute if a day is missed.'}
          </p>
        </div>
      </div>

      {/* Strong Reason (Why) */}
      <div className="space-y-1">
        <span className={`text-[11px] font-bold block ${palette.subText}`}>
          {lang === 'id' ? 'Alasan Kuat (Why)' : 'Strong Reason (Why)'}
        </span>
        <textarea
          rows={2}
          value={motivation}
          onChange={e => setMotivation(e.target.value)}
          placeholder={lang === 'id' ? 'Kenapa target disiplin ini sangat penting bagi hidupmu?' : 'Why is this discipline goal important for your life?'}
          className={`w-full rounded-xl p-2.5 text-xs focus:outline-none resize-none leading-relaxed border ${palette.taskCard} ${palette.streakBorder} ${palette.titleText} placeholder:${palette.subText}`}
        />
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// MAIN TASK FORM MODAL (Ultra-Responsive, Zero Typing Lag)
// ---------------------------------------------------------------------------
export const TaskFormModal: React.FC<TaskFormModalProps> = React.memo(({
  isOpen,
  onClose,
  editingTask,
  initialType = 'Sekarang',
  onSave,
  onRestartRequest,
  appTheme,
  isOrganic,
  palette,
  lang,
}) => {
  const is3D = isOrganic;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Local, isolated form state
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<'Tinggi' | 'Sedang' | 'Rendah'>('Sedang');
  const [repeat, setRepeat] = useState<'once' | 'daily'>('once');
  const [date, setDate] = useState<string>(getLocalIsoDate(new Date()));
  const [alarmTime, setAlarmTime] = useState<string>('');
  const [isDiscipline, setIsDiscipline] = useState<boolean>(false);
  const [targetDate, setTargetDate] = useState<string>('');
  const [reward, setReward] = useState<string>('');
  const [punishment, setPunishment] = useState<string>('');
  const [motivation, setMotivation] = useState<string>('');

  // Sync state when opening modal
  useEffect(() => {
    if (!isOpen) return;

    if (editingTask) {
      setTitle(editingTask.title || '');
      setPriority(editingTask.priority || 'Sedang');
      setRepeat(editingTask.repeat || 'once');
      setDate(editingTask.date || getLocalIsoDate(new Date()));
      setAlarmTime(editingTask.alarmTime || '');
      setIsDiscipline(!!editingTask.isDiscipline);
      if (editingTask.isDiscipline && editingTask.disciplineData) {
        setTargetDate(editingTask.disciplineData.targetDate || '');
        setReward(editingTask.disciplineData.reward || '');
        setPunishment(editingTask.disciplineData.punishment || '');
        setMotivation(editingTask.disciplineData.motivation || '');
      } else {
        setTargetDate('');
        setReward('');
        setPunishment('');
        setMotivation('');
      }
    } else {
      setTitle('');
      setAlarmTime('');
      setReward('');
      setPunishment('');
      setMotivation('');

      if (initialType === 'Harian') {
        setPriority('Sedang');
        setRepeat('daily');
        setIsDiscipline(false);
        setDate(getLocalIsoDate(new Date()));
        setTargetDate('');
      } else if (initialType === 'Disiplin') {
        setPriority('Tinggi');
        setRepeat('daily');
        setIsDiscipline(true);
        const today = new Date();
        setDate(getLocalIsoDate(today));
        const target30 = new Date(today);
        target30.setDate(target30.getDate() + 30);
        setTargetDate(getLocalIsoDate(target30));
      } else {
        setPriority('Sedang');
        setRepeat('once');
        setIsDiscipline(false);
        setDate(getLocalIsoDate(new Date()));
        setTargetDate('');
      }
    }

    // Auto-focus title on open
    const timer = setTimeout(() => {
      textareaRef.current?.focus();
    }, 60);
    return () => clearTimeout(timer);
  }, [isOpen, editingTask, initialType]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!title.trim()) return;

    triggerHaptic('success');
    onSave({
      title: title.trim(),
      priority,
      repeat,
      date,
      alarmTime: alarmTime || undefined,
      isDiscipline,
      targetDate: isDiscipline ? (targetDate || undefined) : undefined,
      reward: isDiscipline ? (reward || undefined) : undefined,
      punishment: isDiscipline ? (punishment || undefined) : undefined,
      motivation: isDiscipline ? (motivation || undefined) : undefined,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectSekarang = useCallback(() => {
    triggerHaptic('light');
    setIsDiscipline(false);
    setRepeat('once');
  }, []);

  const handleSelectHarian = useCallback(() => {
    triggerHaptic('light');
    setIsDiscipline(false);
    setRepeat('daily');
  }, []);

  const handleSelectDisiplin = useCallback(() => {
    triggerHaptic('light');
    setIsDiscipline(true);
    setRepeat('daily');
    setPriority('Tinggi');
    setTargetDate(prev => {
      if (prev) return prev;
      const target30 = new Date();
      target30.setDate(target30.getDate() + 30);
      return getLocalIsoDate(target30);
    });
  }, []);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-slate-950/85 z-[150] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          triggerHaptic('light');
          onClose();
        }
      }}
    >
      <div 
        className={`w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-150 overflow-hidden border ${palette.cardHero} ${palette.streakBorder} ${palette.titleText}`}
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Fixed Header */}
        <div className={`px-4 sm:px-6 pt-4 pb-3 flex-shrink-0 border-b relative z-10 ${palette.headerBg} ${palette.streakBorder}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              {isDiscipline ? (
                <span className={`p-2 rounded-2xl shrink-0 ${palette.cardHero} ${palette.brandText}`}>
                  {is3D ? <Icon3DTarget size={20} /> : <Target className="w-4 h-4 text-orange-400" />}
                </span>
              ) : repeat === 'daily' ? (
                <span className={`p-2 rounded-2xl shrink-0 ${palette.streakCard} ${palette.brandText}`}>
                  {is3D ? <Icon3DRepeat size={20} /> : <Repeat className="w-4 h-4 text-violet-400" />}
                </span>
              ) : (
                <span className={`p-2 rounded-2xl shrink-0 ${palette.streakCard} ${palette.brandText}`}>
                  {is3D ? <Icon3DNavTasks size={20} /> : <ClipboardList className="w-4 h-4 text-indigo-400" />}
                </span>
              )}
              <h3 className={`text-sm sm:text-base font-extrabold truncate ${palette.titleText}`}>
                {editingTask 
                  ? (isDiscipline 
                      ? (lang === 'id' ? 'Edit Target Disiplin' : 'Edit Discipline Goal')
                      : repeat === 'daily'
                      ? (lang === 'id' ? 'Edit Rutinitas' : 'Edit Routine')
                      : (lang === 'id' ? 'Edit Tugas' : 'Edit Task'))
                  : (isDiscipline 
                      ? (lang === 'id' ? 'Target Disiplin Baru' : 'New Discipline Target')
                      : repeat === 'daily'
                      ? (lang === 'id' ? 'Rutinitas Harian Baru' : 'New Daily Routine')
                      : (lang === 'id' ? 'Tugas Baru' : 'New Task'))}
              </h3>
            </div>
            <button 
              type="button"
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }} 
              className={`p-1.5 rounded-xl cursor-pointer transition-colors touch-manipulation ${palette.subText} hover:${palette.titleText}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Category Selection */}
          <TaskTypeTabs 
            isDiscipline={isDiscipline}
            repeat={repeat}
            isOrganic={isOrganic}
            palette={palette}
            is3D={is3D}
            lang={lang}
            onSelectSekarang={handleSelectSekarang}
            onSelectHarian={handleSelectHarian}
            onSelectDisiplin={handleSelectDisiplin}
          />
        </div>

        {/* Scrollable Form Body */}
        <form 
          id="task-modal-form" 
          onSubmit={handleSubmit} 
          className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 space-y-4"
        >
          {/* Task Title Input: Super fast, lightweight local state */}
          <div className="space-y-1.5">
            <label className={`block text-[11px] font-extrabold uppercase tracking-wider ${palette.subText}`}>
              {isDiscipline 
                ? (lang === 'id' ? 'Target Disiplin Utama' : 'Main Discipline Target')
                : repeat === 'daily'
                ? (lang === 'id' ? 'Judul Rutinitas Harian' : 'Daily Routine Title')
                : (lang === 'id' ? 'Judul Tugas' : 'Task Title')}
            </label>
            <textarea 
              ref={textareaRef}
              rows={2}
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
              autoCorrect="off"
              spellCheck="false"
              placeholder={
                isDiscipline 
                  ? (lang === 'id' ? 'Contoh: Bangun jam 05:00 & Lari pagi 20 menit...' : 'Example: Wake up at 5 AM & run 20 mins...') 
                  : repeat === 'daily'
                  ? (lang === 'id' ? 'Contoh: Minum air 2L, Olahraga 15 Menit...' : 'Example: Drink 2L water, Workout 15m...')
                  : (lang === 'id' ? 'Contoh: Selesaikan laporan kantor...' : 'Example: Finish office report...')
              }
              className={`w-full rounded-2xl px-3.5 py-3 text-sm sm:text-base font-medium transition-colors focus:outline-none resize-none leading-relaxed border select-text ${palette.taskCard} ${palette.streakBorder} ${palette.titleText} placeholder:${palette.subText} focus:ring-2 focus:ring-amber-500/20`}
            />
          </div>

          {/* Restart from Beginning Card (Only when editing an existing routine or discipline task) */}
          {editingTask && (repeat === 'daily' || isDiscipline) && onRestartRequest && (
            <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${palette.quoteCard} ${palette.quoteBorder}`}>
              <div className="space-y-0.5 min-w-0">
                <h5 className={`text-xs font-bold flex items-center gap-1.5 ${palette.brandText}`}>
                  {is3D ? <Icon3DRotateCcw size={14} /> : <RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
                  <span>{lang === 'id' ? 'Mulai Ulang dari Awal' : 'Restart from Beginning'}</span>
                </h5>
                <p className={`text-[10px] leading-relaxed ${palette.subText}`}>
                  {lang === 'id' 
                    ? 'Banyak hari bolong? Reset riwayat dan mulai baru dari hari ini tanpa harus hapus tugas.' 
                    : 'Missed days? Reset history and start fresh from today without deleting.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  onRestartRequest(editingTask);
                }}
                className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 cursor-pointer touch-manipulation border bg-amber-500 text-white border-amber-500 shadow-sm hover:bg-amber-600"
              >
                {lang === 'id' ? 'Ulangi Sekarang' : 'Restart Now'}
              </button>
            </div>
          )}

          {/* Priority Selector (Only for One-Time & Regular Routine) */}
          {!isDiscipline && (
            <TaskPrioritySelector 
              priority={priority}
              onChangePriority={setPriority}
              isOrganic={isOrganic}
              palette={palette}
              lang={lang}
            />
          )}

          {/* Date & Time Controls */}
          <TaskDateTimeSection 
            repeat={repeat}
            isDiscipline={isDiscipline}
            date={date}
            setDate={setDate}
            alarmTime={alarmTime}
            setAlarmTime={setAlarmTime}
            isOrganic={isOrganic}
            palette={palette}
            is3D={is3D}
            lang={lang}
          />

          {/* Dedicated Discipline Configuration in Modal */}
          {isDiscipline && (
            <TaskDisciplineDetailsSection 
              targetDate={targetDate}
              setTargetDate={setTargetDate}
              reward={reward}
              setReward={setReward}
              punishment={punishment}
              setPunishment={setPunishment}
              motivation={motivation}
              setMotivation={setMotivation}
              isOrganic={isOrganic}
              palette={palette}
              is3D={is3D}
              lang={lang}
            />
          )}
        </form>

        {/* Modal Fixed Sticky Footer */}
        <div className={`px-4 sm:px-6 py-3.5 flex-shrink-0 border-t flex gap-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] relative z-10 ${palette.headerBg} ${palette.streakBorder}`}>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className={`flex-1 py-3 rounded-2xl font-bold text-xs transition-all active:scale-95 cursor-pointer touch-manipulation border ${palette.chipInactive} ${palette.subText}`}
          >
            {lang === 'id' ? 'Batal' : 'Cancel'}
          </button>
          <button
            type="submit"
            form="task-modal-form"
            disabled={!title.trim()}
            className={`flex-1 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center gap-1.5 ${
              title.trim()
                ? `${palette.brandBg} shadow-xs text-white`
                : 'opacity-40 cursor-not-allowed bg-slate-400/30 text-slate-400'
            }`}
          >
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            <span>{lang === 'id' ? 'Simpan' : 'Save'}</span>
          </button>
        </div>

      </div>
    </div>
  );
});

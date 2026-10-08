import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Target, Flame, Pencil, Trash2, Plus, ClipboardList, Check, 
  CheckCircle2, Gift, AlertTriangle, X, ChevronRight, RotateCcw,
  Coffee, Sparkles
} from 'lucide-react';
import { Task } from '../types';
import { useAppStore } from '../store';
import { useTranslation } from '../translations';
import { getOrganicThemePalette, OrganicThemePalette } from './home/organicThemePalettes';
import { DisciplineGallery } from './DisciplineGallery';
import { 
  Icon3DTarget, Icon3DFlame, Icon3DGift, 
  Icon3DWarning, Icon3DPlus, Icon3DClipboard, Icon3DRotateCcw
} from './home/Organic3DIcons';

interface DisciplineViewProps {
  task?: Task;
  onSelectExisting: () => void;
  onEdit: (task: Task) => void;
  onSelectDisciplineId?: (id: string) => void;
  lang: string;
  appTheme?: string;
  palette?: OrganicThemePalette;
}

const getLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalDateFromStr = (dateStr: string) => {
  if (!dateStr) return new Date();
  const trimmed = dateStr.trim();
  if (trimmed === 'Hari ini' || trimmed === 'Hari Ini' || trimmed.toLowerCase() === 'today') {
    return new Date();
  }
  if (trimmed === 'Besok' || trimmed.toLowerCase() === 'tomorrow') {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    return tmr;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const parts = trimmed.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return new Date();
  return parsed;
};

const parseDateToIso = (dateStr?: string): string | null => {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (trimmed === 'Hari ini' || trimmed === 'Hari Ini' || trimmed.toLowerCase() === 'today') {
    return getLocalIsoDate(new Date());
  }
  if (trimmed === 'Besok' || trimmed.toLowerCase() === 'tomorrow') {
    const tmr = new Date();
    tmr.setDate(tmr.getDate() + 1);
    return getLocalIsoDate(tmr);
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return getLocalIsoDate(parsed);
  }
  return null;
};

const AutoResizeTextarea: React.FC<{
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}> = ({ value, onChange, placeholder, className = '', minHeight = 45 }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(minHeight, textareaRef.current.scrollHeight)}px`;
    }
  }, [value, minHeight]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={1}
      className={`w-full resize-none overflow-hidden leading-relaxed ${className}`}
    />
  );
};

export const DisciplineView = React.memo<DisciplineViewProps>(({ 
  task, 
  onSelectExisting, 
  onEdit, 
  onSelectDisciplineId, 
  lang, 
  appTheme,
  palette: propPalette 
}) => {
  const { tasks, updateTask, restartTask, checkInDaily, deleteTask, appVersion, isLiteMode } = useAppStore();
  const isOrganic = appVersion === 'organic' || appVersion === 'pro_max';
  const is3D = isOrganic;
  const isLite = appVersion === 'lite' || isLiteMode;
  const palette = useMemo(() => propPalette || getOrganicThemePalette(appTheme), [propPalette, appTheme]);
  const [activeTab, setActiveTab] = useState<'Aksi' | 'Jurnal' | 'Galeri'>('Aksi');
  const [newNoteText, setNewNoteText] = useState<string>('');
  const [showTaskPickerModal, setShowTaskPickerModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [restartTargetDays, setRestartTargetDays] = useState<number>(30);

  const allDisciplineTasks = useMemo(() => tasks.filter(t => t.isDiscipline && !t.deleted), [tasks]);
  const availableRegularTasks = useMemo(() => tasks.filter(t => !t.isDiscipline && !t.deleted && !t.completed), [tasks]);

  if (!task) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 px-4 text-center rounded-3xl border shadow-sm ${palette.disciplineCard} ${palette.disciplineBorder} ${palette.rootText}`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3.5 border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle}`}>
          {is3D ? <Icon3DTarget size={32} /> : <Target className="w-7 h-7" />}
        </div>
        <h3 className={`text-base font-extrabold mb-1 ${palette.disciplineTitle}`}>
          {lang === 'id' ? 'Fokus Disiplin' : 'Discipline Focus'}
        </h3>
        <p className={`text-xs mb-5 max-w-xs leading-relaxed ${palette.disciplineSub}`}>
          {lang === 'id' 
            ? 'Pilih 1 target utama pembentuk karakter (misal: Olahraga Harian, Bangun Pagi). Jaga streak harian dan pantau progres transformasimu.' 
            : 'Select 1 primary goal. Keep your daily streak and track your transformation.'}
        </p>
        <div className="flex flex-col sm:flex-row items-center gap-2 w-full max-w-xs">
          <button 
            onClick={onSelectExisting}
            className={`w-full text-white px-4 py-2.5 rounded-2xl font-bold text-xs transition-all active:scale-95 shadow-md cursor-pointer flex items-center justify-center gap-2 ${palette.disciplineBtnAction} shadow-sm`}
          >
            {is3D ? <Icon3DPlus size={15} /> : <Plus className="w-4 h-4" />}
            <span>{lang === 'id' ? 'Buat Target Disiplin' : 'Create Discipline Goal'}</span>
          </button>
          {availableRegularTasks.length > 0 && (
            <button 
              onClick={() => setShowTaskPickerModal(true)}
              className={`w-full px-4 py-2.5 rounded-2xl font-bold text-xs transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineSub} hover:${palette.disciplineTitle}`}
            >
              {is3D ? <Icon3DClipboard size={15} /> : <ClipboardList className="w-4 h-4 text-indigo-400" />}
              <span>{lang === 'id' ? 'Pilih dari Tugas Ada' : 'Pick from Tasks'}</span>
            </button>
          )}
        </div>

        {/* Task Picker Modal */}
        {showTaskPickerModal && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setShowTaskPickerModal(false)}>
            <div className={`border rounded-3xl p-5 max-w-md w-full shadow-2xl text-left ${palette.disciplineCard} ${palette.disciplineBorder} ${palette.disciplineTitle}`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-sm font-bold ${palette.disciplineTitle}`}>
                  {lang === 'id' ? 'Pilih Tugas Jadi Fokus Disiplin' : 'Select Task for Discipline Focus'}
                </h3>
                <button onClick={() => setShowTaskPickerModal(false)} className={`p-1.5 rounded-full cursor-pointer ${palette.disciplineInner} ${palette.disciplineSub} hover:opacity-80`}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 max-h-[50vh] overflow-y-auto custom-scrollbar pr-1">
                {availableRegularTasks.map(t => (
                  <button
                    key={t.id}
                    onClick={() => {
                      updateTask({
                        ...t,
                        isDiscipline: true,
                        disciplineData: t.disciplineData || {}
                      });
                      setShowTaskPickerModal(false);
                    }}
                    className={`w-full p-3 rounded-2xl flex items-center justify-between transition-colors text-left group cursor-pointer border ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}
                  >
                    <div className="min-w-0 pr-3">
                      <p className={`text-xs font-bold truncate ${palette.disciplineTitle}`}>{t.title}</p>
                      <span className={`text-[10px] font-medium ${palette.disciplineSub}`}>{t.priority}</span>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${palette.disciplineTitle}`} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const today = getLocalIsoDate(new Date());
  const d = task.disciplineData || {};
  const rawCheckins = d.dailyCheckins || [];
  const rawRests = d.usedRestDates || [];
  const completedPunishments = d.punishmentCompletedDates || [];

  // Sinkronkan status check-in hari ini
  const isCheckedInToday = Boolean(
    rawCheckins.includes(today) ||
    rawRests.includes(today) ||
    task.completed
  );
  const isRestDayToday = rawRests.includes(today);

  // Daftar tanggal selesai unik (hari check-in & hari libur)
  const allCheckinsList = isCheckedInToday && !rawCheckins.includes(today) && !isRestDayToday
    ? [...rawCheckins, today]
    : rawCheckins;

  // 1. Tanggal Start yang Akurat
  const candidateDates = [
    d.startDate,
    ...rawCheckins,
    ...rawRests,
    task.createdAt,
    task.date
  ].filter(Boolean).map(dt => parseDateToIso(dt)).filter(Boolean) as string[];

  let actualStartDate = today;
  if (candidateDates.length > 0) {
    candidateDates.sort();
    actualStartDate = candidateDates[0];
  }
  if (actualStartDate > today) {
    actualStartDate = today;
  }

  // 2. Penghitungan Hari Selesai
  const allDoneDatesSet = new Set([...allCheckinsList, ...rawRests]);
  const daysDone = allDoneDatesSet.size;

  // 3. Penghitungan Hari Bolong
  const startObj = getLocalDateFromStr(actualStartDate);
  const todayObj = getLocalDateFromStr(today);
  startObj.setHours(0, 0, 0, 0);
  todayObj.setHours(0, 0, 0, 0);

  let daysMissed = 0;
  const curr = new Date(startObj);
  let loopGuard = 0;
  const yesterdayObj = new Date(todayObj);
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);

  while (curr <= yesterdayObj && loopGuard < 2000) {
    const currStr = getLocalIsoDate(curr);
    if (!allDoneDatesSet.has(currStr)) {
      daysMissed++;
    }
    curr.setDate(curr.getDate() + 1);
    loopGuard++;
  }

  // 4. Hukuman yang belum ditebus
  const unredeemedPunishments = Math.max(0, daysMissed - completedPunishments.length);

  // 5. Streak Berurutan Disiplin
  let currentStreak = 0;
  const checkDate = new Date(todayObj);
  if (!isCheckedInToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let streakGuard = 0;
  while (streakGuard < 1000) {
    const iso = getLocalIsoDate(checkDate);
    if (allDoneDatesSet.has(iso)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      streakGuard++;
    } else {
      break;
    }
  }

  const getDaysDiff = (startStr: string, endStr: string) => {
    const start = getLocalDateFromStr(startStr);
    const end = getLocalDateFromStr(endStr);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - start.getTime()) / 86400000);
  };

  // Rest day eligibility (max 1 rest day in past 7 days)
  const recentRestDates = rawRests.filter(date => {
    if (!date || date === today) return false;
    const diff = getDaysDiff(date, today);
    return diff > 0 && diff < 7;
  });
  const isRestDayDisabled = recentRestDates.length >= 1;

  // 6. Target & Sisa Berapa Hari
  let daysLeftText = '';
  let daysLeftCount: number | null = null;
  let totalTargetDays = 0;
  let isTargetReached = false;

  if (d.targetDate) {
    const rawDaysLeft = getDaysDiff(today, d.targetDate);
    daysLeftCount = Math.max(0, rawDaysLeft);
    totalTargetDays = Math.max(1, getDaysDiff(actualStartDate, d.targetDate) + 1);

    if (today >= d.targetDate || (daysDone >= totalTargetDays && totalTargetDays > 0)) {
      isTargetReached = true;
      daysLeftText = lang === 'id' ? 'Target Selesai' : 'Goal Completed';
    } else {
      isTargetReached = false;
      daysLeftText = lang === 'id' ? `Sisa ${daysLeftCount} hari lagi` : `${daysLeftCount} days left`;
    }
  } else {
    totalTargetDays = Math.max(daysDone + daysMissed, 30);
    daysLeftText = lang === 'id' ? 'Tantangan Berkelanjutan' : 'Ongoing Target';
  }

  // Handlers for Check-in
  const handleCheckInToday = () => {
    const newCheckins = Array.from(new Set([...rawCheckins, today]));
    const newRests = rawRests.filter(date => date !== today);
    updateTask({
      ...task,
      completed: true,
      disciplineData: {
        ...d,
        startDate: d.startDate || actualStartDate || today,
        dailyCheckins: newCheckins,
        usedRestDates: newRests
      }
    });
    checkInDaily();
  };

  const handleRestDayToday = () => {
    if (isRestDayDisabled) return;
    const newCheckins = Array.from(new Set([...rawCheckins, today]));
    const newRests = Array.from(new Set([...rawRests, today]));
    updateTask({
      ...task,
      completed: true,
      disciplineData: {
        ...d,
        startDate: d.startDate || actualStartDate || today,
        dailyCheckins: newCheckins,
        usedRestDates: newRests
      }
    });
    checkInDaily();
  };

  const handleUndoCheckIn = () => {
    const newCheckins = rawCheckins.filter(date => date !== today);
    const newRests = rawRests.filter(date => date !== today);
    updateTask({
      ...task,
      completed: false,
      disciplineData: {
        ...d,
        startDate: d.startDate || actualStartDate || today,
        dailyCheckins: newCheckins,
        usedRestDates: newRests
      }
    });
  };

  const handleQuickSetTargetDays = (numDays: number) => {
    const targetObj = new Date();
    targetObj.setDate(targetObj.getDate() + numDays);
    const targetIso = getLocalIsoDate(targetObj);
    updateTask({
      ...task,
      disciplineData: {
        ...d,
        targetDate: targetIso,
        startDate: d.startDate || actualStartDate || today
      }
    });
  };

  const handleRedeemPunishment = () => {
    const updated = [...completedPunishments, `${today}_${Date.now()}`];
    updateTask({
      ...task,
      disciplineData: {
        ...d,
        punishmentCompletedDates: updated
      }
    });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto pb-10">
      {/* Switcher if multiple discipline tasks exist */}
      {allDisciplineTasks.length > 1 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
          {allDisciplineTasks.map(tItem => (
            <button
              key={tItem.id}
              onClick={() => {
                if (onSelectDisciplineId) onSelectDisciplineId(tItem.id);
                updateTask({ ...tItem, isDiscipline: true });
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                tItem.id === task.id 
                  ? `${palette.disciplineBtnAction} text-white shadow-sm` 
                  : `${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineSub} hover:${palette.disciplineTitle}`
              }`}
            >
              {tItem.title}
            </button>
          ))}
        </div>
      )}

      {/* 1. Main Discipline Hero Card */}
      <div className={`rounded-3xl p-4 sm:p-5 relative overflow-hidden shadow-md space-y-4 border ${palette.disciplineCard} ${palette.disciplineBorder} ${palette.rootText}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg flex items-center gap-1.5 border ${palette.disciplineBadge}`}>
                {is3D ? <Icon3DFlame size={14} /> : <Flame className="w-3.5 h-3.5" />} 
                <span>{currentStreak} {lang === 'id' ? 'Hari Streak' : 'Day Streak'}</span>
              </span>
              {d.targetDate && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineSub}`}>
                  {lang === 'id' ? 'Target:' : 'Target:'} {d.targetDate}
                </span>
              )}
            </div>
            <h2 className={`text-base sm:text-lg font-bold leading-snug break-words ${palette.disciplineTitle}`}>
              {task.title}
            </h2>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setShowRestartModal(true)}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${palette.disciplineInner} ${palette.disciplineInnerBorder} text-amber-500 hover:opacity-80`}
              title={lang === 'id' ? 'Mulai Ulang dari Awal' : 'Restart from Beginning'}
            >
              {is3D ? <Icon3DRotateCcw size={14} /> : <RotateCcw className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => onEdit(task)}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineSub} hover:${palette.disciplineTitle}`}
              title={lang === 'id' ? 'Edit Target' : 'Edit Goal'}
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => deleteTask(task.id)}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${palette.disciplineInner} ${palette.disciplineInnerBorder} text-rose-500 hover:opacity-80`}
              title={lang === 'id' ? 'Hapus' : 'Delete'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Unified Clean Stats Grid */}
        <div className={`p-3.5 rounded-2xl border space-y-3 ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-1">
              <span className={`text-[11px] font-medium block mb-0.5 ${palette.disciplineSub}`}>{lang === 'id' ? 'Selesai' : 'Completed'}</span>
              <span className={`font-extrabold text-sm sm:text-base ${palette.isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {daysDone} <span className={`text-[10px] font-normal ${palette.disciplineSub}`}>{lang === 'id' ? 'hari' : 'days'}</span>
              </span>
            </div>
            <div className={`p-1 border-x ${palette.disciplineInnerBorder}`}>
              <span className={`text-[11px] font-medium block mb-0.5 ${palette.disciplineSub}`}>{lang === 'id' ? 'Bolong' : 'Missed'}</span>
              <span className={`font-extrabold text-sm sm:text-base ${palette.isDark ? 'text-rose-400' : 'text-rose-600'}`}>
                {daysMissed} <span className={`text-[10px] font-normal ${palette.disciplineSub}`}>{lang === 'id' ? 'hari' : 'days'}</span>
              </span>
            </div>
            <div className="p-1">
              <span className={`text-[11px] font-medium block mb-0.5 ${palette.disciplineSub}`}>{lang === 'id' ? 'Target Sisa' : 'Days Remaining'}</span>
              <span className={`font-bold text-xs truncate block mt-0.5 ${
                isTargetReached 
                  ? (palette.isDark ? 'text-emerald-400' : 'text-emerald-600') 
                  : (palette.isDark ? 'text-indigo-300' : 'text-indigo-600')
              }`}>
                {daysLeftText}
              </span>
            </div>
          </div>
          
          {/* Visual Progress Bar with Percent */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold px-0.5">
              <span className={palette.disciplineSub}>
                {d.targetDate 
                  ? `${daysDone}/${totalTargetDays} ${lang === 'id' ? 'Hari Target' : 'Days Target'}`
                  : (lang === 'id' ? 'Kemajuan Konsistensi' : 'Consistency Progress')}
              </span>
              <span className={palette.disciplineTitle}>
                {Math.min(100, Math.round((daysDone / (totalTargetDays || 1)) * 100))}%
              </span>
            </div>
            <div className={`h-2.5 w-full rounded-full overflow-hidden flex border ${palette.progressBarTrack} ${palette.disciplineInnerBorder}`}>
              <div 
                style={{ width: `${Math.min(100, Math.max(0, (daysDone / (totalTargetDays || 1)) * 100))}%` }} 
                className={`h-full transition-all duration-500 ${isOrganic ? palette.progressBarFill : 'bg-emerald-500'}`} 
              />
              <div 
                style={{ width: `${Math.min(100, Math.max(0, (daysMissed / (totalTargetDays || 1)) * 100))}%` }} 
                className={`h-full transition-all duration-500 ${palette.isDark ? 'bg-rose-500/80' : 'bg-rose-500'}`} 
              />
            </div>
          </div>

          {/* Helpful callout if user missed days */}
          {daysMissed > 0 && (
            <button
              type="button"
              onClick={() => setShowRestartModal(true)}
              className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border active:scale-98 ${
                palette.isDark
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              {is3D ? <Icon3DRotateCcw size={14} /> : <RotateCcw className="w-3.5 h-3.5 text-amber-500" />}
              <span>{lang === 'id' ? 'Banyak hari bolong? Mulai ulang dari awal' : 'Missed too many days? Start fresh from Day 1'}</span>
            </button>
          )}

          {/* Quick Target Presets if no targetDate */}
          {!d.targetDate && (
            <div className="pt-1">
              <p className={`text-[10px] font-bold mb-1.5 flex items-center justify-between ${palette.disciplineSub}`}>
                <span>{lang === 'id' ? 'Pasang Durasi Target Cepat:' : 'Set Quick Target Duration:'}</span>
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 custom-scrollbar">
                {[
                  { days: 30, label: '30 Hari' },
                  { days: 60, label: '60 Hari' },
                  { days: 90, label: '90 Hari' },
                  { days: 100, label: '100 Hari' },
                  { days: 365, label: '1 Tahun' }
                ].map(preset => (
                  <button
                    key={preset.days}
                    onClick={() => handleQuickSetTargetDays(preset.days)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer whitespace-nowrap border active:scale-95 ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineSub} hover:${palette.disciplineTitle}`}
                  >
                    + {preset.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Tactical Check-in Banner inside Hero */}
        <div className="pt-1">
          {isCheckedInToday ? (
            <div className={`flex items-center justify-between p-3 rounded-2xl border ${palette.disciplineBtnDone}`}>
              <div className="flex items-center gap-2 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>
                  {isRestDayToday
                    ? (lang === 'id' ? 'Hari ini kamu mengambil hari istirahat' : 'Rest day recorded today')
                    : (lang === 'id' ? 'Disiplin hari ini sudah selesai!' : 'Daily discipline completed today!')}
                </span>
              </div>
              <button
                onClick={handleUndoCheckIn}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-xl cursor-pointer transition-colors shrink-0 ml-2 border ${palette.disciplineInner} ${palette.disciplineInnerBorder} text-rose-500 hover:opacity-80`}
              >
                {lang === 'id' ? 'Urungkan' : 'Undo'}
              </button>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={handleCheckInToday}
                className={`flex-1 py-3 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 ${palette.disciplineBtnAction} shadow-sm`}
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>{lang === 'id' ? 'Check-in Disiplin Hari Ini' : 'Complete Daily Check-in'}</span>
              </button>
              <button
                onClick={handleRestDayToday}
                disabled={isRestDayDisabled}
                title={isRestDayDisabled ? (lang === 'id' ? 'Jatah libur 1x/minggu sudah digunakan' : 'Rest day limit (1x/week) reached') : undefined}
                className={`px-4 py-2.5 rounded-2xl font-semibold text-xs border transition-all flex items-center justify-center gap-1.5 ${
                  isRestDayDisabled
                    ? `${palette.disciplineInner} ${palette.disciplineInnerBorder} opacity-50 cursor-not-allowed`
                    : `${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineSub} hover:${palette.disciplineTitle} active:scale-95 cursor-pointer`
                }`}
              >
                <Coffee className="w-3.5 h-3.5 text-amber-500" />
                <span>{lang === 'id' ? 'Libur (1x/Mgg)' : 'Rest (1x/Wk)'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Navigation Tabs: Aksi, Jurnal, Galeri */}
      {(() => {
        const totalGalleryMedia = (d.beforeMedia?.length || 0) + (d.afterMedia?.length || 0) + (d.beforePhotoUrl && !d.beforeMedia?.length ? 1 : 0) + (d.afterPhotoUrl && !d.afterMedia?.length ? 1 : 0);
        const journalCount = d.journeyLog?.length || 0;

        return (
          <div className={`flex gap-1 p-1 border rounded-2xl ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}>
            {[
              { id: 'Aksi' as const, label: lang === 'id' ? 'Aksi & Komitmen' : 'Action & Commitments', count: undefined },
              { id: 'Jurnal' as const, label: lang === 'id' ? 'Jurnal Refleksi' : 'Reflection Journal', count: journalCount },
              { id: 'Galeri' as const, label: lang === 'id' ? 'Galeri' : 'Gallery', count: totalGalleryMedia }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === tab.id 
                    ? `${palette.disciplineBtnAction} text-white shadow-sm` 
                    : `${palette.disciplineSub} hover:${palette.disciplineTitle}`
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeTab === tab.id 
                      ? 'bg-white/20 text-white' 
                      : `${palette.disciplineInnerBorder} ${palette.disciplineSub}`
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        );
      })()}

      {/* Tab 1: Aksi & Komitmen */}
      {activeTab === 'Aksi' && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* Reward & Punishment Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Hadiah Keberhasilan (Reward) */}
            <div className={`border rounded-2xl p-4 space-y-2.5 relative overflow-hidden shadow-sm ${palette.disciplineCard} ${palette.disciplineBorder}`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 font-bold text-xs ${
                  palette.isDark ? 'text-amber-400' : 'text-amber-700'
                }`}>
                  {is3D ? <Icon3DGift size={15} /> : <Gift className="w-4 h-4 text-amber-500" />}
                  <span>{lang === 'id' ? 'Hadiah Keberhasilan' : 'Success Reward'}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  isTargetReached 
                    ? palette.isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : palette.isDark ? 'bg-amber-500/15 text-amber-300 border-amber-500/25' : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                  {isTargetReached 
                    ? (lang === 'id' ? 'Terbuka' : 'Unlocked') 
                    : (lang === 'id' ? 'Terkunci' : 'Locked')}
                </span>
              </div>

              {d.reward ? (
                <div className="space-y-1.5">
                  <p className={`text-xs font-semibold leading-relaxed p-3 rounded-xl border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle}`}>
                    {d.reward}
                  </p>
                  <div className={`flex items-center justify-between text-[10px] px-0.5 ${palette.disciplineSub}`}>
                    <span>
                      {isTargetReached 
                        ? (lang === 'id' ? 'Target tercapai! Nikmati hadiahmu!' : 'Goal achieved! Enjoy!') 
                        : (lang === 'id' ? 'Terbuka saat target tercapai.' : 'Unlocked upon completion.')}
                    </span>
                    <button
                      onClick={() => onEdit(task)}
                      className={`font-bold cursor-pointer ${
                        palette.isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-700 hover:underline'
                      }`}
                    >
                      {lang === 'id' ? 'Ubah' : 'Edit'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`text-center py-3 rounded-xl border border-dashed ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}>
                  <p className={`text-[11px] mb-2 ${palette.disciplineSub}`}>
                    {lang === 'id' ? 'Tentukan hadiah untuk memotivasi dirimu' : 'Set a reward to motivate yourself'}
                  </p>
                  <button
                    onClick={() => onEdit(task)}
                    className={`text-[11px] font-bold px-3 py-1 rounded-xl transition-colors cursor-pointer border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle}`}
                  >
                    + {lang === 'id' ? 'Tentukan Hadiah' : 'Set Reward'}
                  </button>
                </div>
              )}
            </div>

            {/* Konsekuensi Bolong (Punishment) */}
            <div className={`border rounded-2xl p-4 space-y-2.5 relative overflow-hidden shadow-sm ${
              unredeemedPunishments > 0 
                ? palette.isDark ? 'bg-rose-950/30 border-rose-900/50' : 'bg-rose-50/80 border-rose-200' 
                : `${palette.disciplineCard} ${palette.disciplineBorder}`
            }`}>
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-1.5 font-bold text-xs ${
                  palette.isDark ? 'text-rose-400' : 'text-rose-700'
                }`}>
                  {is3D ? <Icon3DWarning size={15} /> : <AlertTriangle className="w-4 h-4 text-rose-500" />}
                  <span>{lang === 'id' ? 'Konsekuensi Bolong' : 'Missed Consequence'}</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                  unredeemedPunishments > 0
                    ? palette.isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-rose-100 text-rose-800 border-rose-200'
                    : daysMissed > 0
                      ? palette.isDark ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : `${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineSub}`
                }`}>
                  {unredeemedPunishments > 0 
                    ? `${unredeemedPunishments}x ${lang === 'id' ? 'Belum Ditebus' : 'Pending'}`
                    : daysMissed > 0 
                      ? (lang === 'id' ? 'Semua Lunas' : 'All Cleared')
                      : (lang === 'id' ? 'Aman' : 'Clean')}
                </span>
              </div>

              {d.punishment ? (
                <div className="space-y-2">
                  <p className={`text-xs font-semibold leading-relaxed p-3 rounded-xl border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle}`}>
                    {d.punishment}
                  </p>
                  
                  {unredeemedPunishments > 0 ? (
                    <div className="pt-0.5 space-y-1.5">
                      <button
                        onClick={handleRedeemPunishment}
                        className={`w-full py-2 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                          palette.isDark ? 'bg-rose-600 hover:bg-rose-700' : 'bg-rose-600 hover:bg-rose-700'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>{lang === 'id' ? 'Tebus 1 Hukuman Sekarang' : 'Redeem 1 Punishment Now'}</span>
                      </button>
                      <p className={`text-[10px] text-center ${palette.disciplineSub}`}>
                        {lang === 'id' ? `${completedPunishments.length} dari ${daysMissed} hukuman telah ditebus.` : `${completedPunishments.length} of ${daysMissed} punishments completed.`}
                      </p>
                    </div>
                  ) : (
                    <div className={`flex items-center justify-between text-[10px] px-0.5 ${palette.disciplineSub}`}>
                      <span>{daysMissed === 0 ? (lang === 'id' ? 'Bagus! Belum ada hari yang terlewat.' : 'Great! No missed days.') : (lang === 'id' ? 'Semua konsekuensi telah ditebus.' : 'All punishments completed.')}</span>
                      <button
                        onClick={() => onEdit(task)}
                        className={`font-bold cursor-pointer ${
                          palette.isDark ? 'text-rose-400 hover:text-rose-300' : 'text-rose-600 hover:underline'
                        }`}
                      >
                        {lang === 'id' ? 'Ubah' : 'Edit'}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className={`text-center py-3 rounded-xl border border-dashed ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}>
                  <p className={`text-[11px] mb-2 ${palette.disciplineSub}`}>
                    {lang === 'id' ? 'Tentukan konsekuensi nyata jika kamu bolong' : 'Set a consequence if you miss a day'}
                  </p>
                  <button
                    onClick={() => onEdit(task)}
                    className={`text-[11px] font-bold px-3 py-1 rounded-xl transition-colors cursor-pointer border ${palette.disciplineInner} ${palette.disciplineInnerBorder} text-rose-500`}
                  >
                    + {lang === 'id' ? 'Tentukan Konsekuensi' : 'Set Consequence'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Milestones / Sub-targets */}
          <div className={`rounded-2xl p-4 space-y-3 shadow-sm border ${palette.disciplineCard} ${palette.disciplineBorder}`}>
            <div className="flex items-center justify-between">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${palette.disciplineTitle}`}>
                {is3D ? <Icon3DTarget size={14} /> : <Target className="w-3.5 h-3.5 text-orange-400" />}
                <span>{lang === 'id' ? 'Target Bertahap (Milestones)' : 'Sub-Targets (Milestones)'}</span>
              </h3>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineSub}`}>
                {(d.milestones || []).filter(m => m.completed).length} / {(d.milestones || []).length} {lang === 'id' ? 'Tercapai' : 'Done'}
              </span>
            </div>

            <div className="space-y-1.5">
              {(d.milestones || []).map((m) => (
                <div key={m.id} className={`p-2.5 rounded-xl flex items-center justify-between gap-2 border ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}>
                  <button
                    onClick={() => {
                      const updated = (d.milestones || []).map(item => item.id === m.id ? { ...item, completed: !item.completed } : item);
                      updateTask({ ...task, disciplineData: { ...d, milestones: updated } });
                    }}
                    className="flex items-center gap-2.5 text-left flex-1 min-w-0 cursor-pointer"
                  >
                    <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                      m.completed 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : `${palette.disciplineInnerBorder} ${palette.disciplineCard}`
                    }`}>
                      {m.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className={`text-xs font-medium truncate ${
                      m.completed 
                        ? `line-through ${palette.disciplineSub}` 
                        : palette.disciplineTitle
                    }`}>
                      {m.title}
                    </span>
                  </button>
                  <button
                    onClick={() => {
                      const updated = (d.milestones || []).filter(item => item.id !== m.id);
                      updateTask({ ...task, disciplineData: { ...d, milestones: updated } });
                    }}
                    className={`p-1 transition-colors cursor-pointer ${palette.disciplineSub} hover:text-rose-500`}
                    title={lang === 'id' ? 'Hapus' : 'Delete'}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Milestone Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const input = form.elements.namedItem('newMilestoneTitle') as HTMLInputElement;
                if (input && input.value.trim()) {
                  const newM = {
                    id: Date.now().toString(),
                    title: input.value.trim(),
                    completed: false
                  };
                  updateTask({
                    ...task,
                    disciplineData: {
                      ...d,
                      milestones: [...(d.milestones || []), newM]
                    }
                  });
                  input.value = '';
                }
              }}
              className="flex gap-2 pt-1"
            >
              <input
                name="newMilestoneTitle"
                placeholder={lang === 'id' ? 'Tambah target bertahap...' : 'Add milestone...'}
                className={`flex-1 rounded-xl px-3 py-2 text-xs focus:outline-none border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle} placeholder:${palette.disciplineSub}`}
              />
              <button 
                type="submit" 
                className={`px-3.5 py-2 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition-colors shrink-0 cursor-pointer ${palette.disciplineBtnAction}`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'id' ? 'Tambah' : 'Add'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tab 2: Jurnal & Refleksi */}
      {activeTab === 'Jurnal' && (
        <div className="space-y-3 animate-in fade-in duration-200">
          {/* Motivation / Why */}
          <div className={`rounded-2xl p-3.5 space-y-1.5 border ${palette.disciplineCard} ${palette.disciplineBorder}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${palette.disciplineTitle}`}>
              {lang === 'id' ? 'Alasan Kuat (Why)' : 'Strong Reason (Why)'}
            </h3>
            <AutoResizeTextarea 
              value={d.motivation || ''}
              onChange={(e) => updateTask({ ...task, disciplineData: { ...d, motivation: e.target.value } })}
              placeholder={lang === 'id' ? 'Kenapa target ini sangat penting bagi masa depanmu?' : 'Why is this goal important to you?'}
              minHeight={50}
              className={`w-full rounded-xl p-2.5 text-xs focus:outline-none border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle} placeholder:${palette.disciplineSub}`}
            />
          </div>

          {/* Daily Logs */}
          <div className={`rounded-2xl p-3.5 space-y-2.5 border ${palette.disciplineCard} ${palette.disciplineBorder}`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider ${palette.disciplineTitle}`}>
              {lang === 'id' ? 'Catatan Refleksi Harian' : 'Daily Reflection Logs'}
            </h3>
            <div className="space-y-2">
              <AutoResizeTextarea 
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder={lang === 'id' ? 'Tulis refleksi atau evaluasi progresmu hari ini...' : 'Write your daily reflection...'}
                minHeight={45}
                className={`w-full rounded-xl p-2.5 text-xs focus:outline-none border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineTitle} placeholder:${palette.disciplineSub}`}
              />
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (newNoteText.trim()) {
                      const newLog = [...(d.journeyLog || []), {
                        id: Date.now().toString(),
                        date: new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' }),
                        content: newNoteText.trim()
                      }];
                      updateTask({ ...task, disciplineData: { ...d, journeyLog: newLog } });
                      setNewNoteText('');
                    }
                  }}
                  className={`px-3 py-1.5 text-white font-bold text-xs rounded-xl cursor-pointer transition-colors ${palette.disciplineBtnAction}`}
                >
                  {lang === 'id' ? 'Simpan Catatan' : 'Save Log'}
                </button>
              </div>
            </div>

            {/* List of journal entries */}
            <div className="space-y-1.5 pt-1">
              {d.journeyLog?.slice().reverse().map((entry) => (
                <div key={entry.id} className={`p-2.5 rounded-xl border ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase ${palette.disciplineSub}`}>{entry.date}</span>
                    <button
                      onClick={() => {
                        const newLog = d.journeyLog?.filter(n => n.id !== entry.id);
                        updateTask({ ...task, disciplineData: { ...d, journeyLog: newLog } });
                      }}
                      className={`p-0.5 cursor-pointer ${palette.disciplineSub} hover:text-rose-500`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  <p className={`text-xs whitespace-pre-wrap ${palette.disciplineTitle}`}>{entry.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Galeri Transformasi */}
      {activeTab === 'Galeri' && (
        <div className="animate-in fade-in duration-200">
          <DisciplineGallery 
            task={task} 
            lang={lang} 
            onUpdateTask={updateTask} 
            appTheme={appTheme}
            palette={palette}
          />
        </div>
      )}

      {/* Restart Discipline Modal */}
      {showRestartModal && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200" 
          onClick={() => setShowRestartModal(false)}
        >
          <div 
            className={`border rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl text-left space-y-4 ${palette.disciplineCard} ${palette.disciplineBorder} ${palette.disciplineTitle}`} 
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border text-amber-500 ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}>
                  {is3D ? <Icon3DRotateCcw size={22} /> : <RotateCcw className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className={`text-base font-extrabold leading-snug ${palette.disciplineTitle}`}>
                    {lang === 'id' ? 'Mulai Ulang dari Awal?' : 'Restart from Beginning?'}
                  </h3>
                  <p className={`text-xs truncate max-w-[220px] sm:max-w-xs ${palette.disciplineSub}`}>
                    {task.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRestartModal(false)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineSub} hover:${palette.disciplineTitle}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Current status vs Fresh Start */}
            <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${palette.disciplineInner} ${palette.disciplineInnerBorder}`}>
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className={palette.disciplineSub}>{lang === 'id' ? 'Catatan saat ini:' : 'Current progress:'}</span>
                <span className="text-rose-400 font-bold">{daysMissed} {lang === 'id' ? 'hari bolong' : 'missed days'}</span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-semibold">
                <span className={palette.disciplineSub}>{lang === 'id' ? 'Selesai dijalani:' : 'Completed days:'}</span>
                <span className="text-emerald-400 font-bold">{daysDone} {lang === 'id' ? 'hari' : 'days'}</span>
              </div>
              <div className="pt-2 border-t border-slate-700/40 text-[11px] space-y-1">
                <p className="text-amber-400 font-semibold flex items-center gap-1.5">
                  <RotateCcw className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>{lang === 'id' ? 'Semua hari bolong & check-in di-reset ke hari ke-1.' : 'All missed days & check-ins reset to Day 1.'}</span>
                </p>
                <p className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{lang === 'id' ? 'Judul, hadiah, hukuman, dan motivasi tetap tersimpan aman.' : 'Title, reward, consequences, and why are safely kept.'}</span>
                </p>
              </div>
            </div>

            {/* Optional Target Duration for the new start */}
            <div className="space-y-1.5">
              <label className={`block text-[11px] font-extrabold uppercase tracking-wider ${palette.disciplineSub}`}>
                {lang === 'id' ? 'Durasi Target Mulai Hari Ini:' : 'Target Duration Starting Today:'}
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { days: 30, label: '30h' },
                  { days: 60, label: '60h' },
                  { days: 90, label: '90h' },
                  { days: 100, label: '100h' },
                  { days: 365, label: '1th' },
                ].map(item => (
                  <button
                    key={item.days}
                    type="button"
                    onClick={() => setRestartTargetDays(item.days)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      restartTargetDays === item.days
                        ? `${palette.disciplineBtnAction} text-white shadow-sm`
                        : `${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineSub} hover:${palette.disciplineTitle}`
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowRestartModal(false)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${palette.disciplineInner} ${palette.disciplineInnerBorder} ${palette.disciplineSub}`}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const targetObj = new Date();
                  targetObj.setDate(targetObj.getDate() + restartTargetDays);
                  const newTargetIso = getLocalIsoDate(targetObj);
                  restartTask(task.id, newTargetIso);
                  setShowRestartModal(false);
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600`}
              >
                {lang === 'id' ? 'Mulai Ulang dari Hari Ini' : 'Restart from Today'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Plus, Trash2, ClipboardList, Repeat, Bell, X, Target, 
  CheckSquare, ChevronDown, ChevronUp, Clock, CheckCircle2, 
  Calendar as CalendarIcon, Filter, AlertTriangle, Pin, Check, 
  RotateCcw
} from 'lucide-react';
import { useAppStore } from '../store';
import { useTranslation } from '../translations';
import { Task } from '../types';
import { generateId, parseDateToIso } from '../utils';
import { DisciplineView } from '../components/DisciplineView';
import {
  Icon3DNavTasks, Icon3DTarget, Icon3DRepeat, Icon3DTrash, 
  Icon3DClock, Icon3DWarning, Icon3DPlus, Icon3DRotateCcw, 
  Icon3DTaskChecked, Icon3DTaskUnchecked
} from '../components/home/Organic3DIcons';
import { getOrganicThemePalette, OrganicThemePalette } from '../components/home/organicThemePalettes';
import { TaskFormModal, TaskFormData } from '../components/TaskFormModal';
import { triggerHaptic } from '../utils/sound';

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
    const [year, month, day] = trimmed.split('T')[0].split('-').map(Number);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return new Date(year, month - 1, day);
    }
  }
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return new Date();
  return parsed;
};

// =============================================================================
// ISOLATED QUICK TASK BAR: 0ms Typing Latency, Touch-Manipulation Friendly
// =============================================================================
const QuickTaskBar = React.memo<{
  isOrganic: boolean;
  organicPalette: OrganicThemePalette;
  is3D: boolean;
  lang: string;
  icon: React.ReactNode;
  placeholder: string;
  buttonColorClass?: string;
  onSubmit: (title: string) => void;
  onOpenAdvanced: () => void;
}>(({
  isOrganic,
  organicPalette,
  lang,
  icon,
  placeholder,
  buttonColorClass,
  onSubmit,
  onOpenAdvanced
}) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    triggerHaptic('light');
    onSubmit(text.trim());
    setText('');
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 p-1.5 pl-3.5 rounded-2xl border transition-all shadow-xs select-text ${
        isOrganic 
          ? `${organicPalette.searchContainer} ${organicPalette.searchContainerActive}` 
          : 'bg-slate-900/80 border-slate-800'
      }`}
    >
      <div className={`shrink-0 pointer-events-none ${isOrganic ? organicPalette.brandText : 'text-slate-400'}`}>
        {icon}
      </div>
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
        className={`flex-1 bg-transparent text-xs sm:text-sm font-medium focus:outline-none placeholder:opacity-60 select-text ${
          isOrganic ? `${organicPalette.titleText} placeholder:${organicPalette.subText}` : 'text-slate-200 placeholder:text-slate-500'
        }`}
      />
      {text.trim() ? (
        <button
          type="submit"
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer touch-manipulation flex items-center gap-1 shrink-0 ${
            isOrganic ? `${organicPalette.chipActive} text-white` : (buttonColorClass || 'bg-indigo-600 text-white')
          }`}
          title={lang === 'id' ? 'Tambah tugas cepat' : 'Add simple task'}
        >
          <span>{lang === 'id' ? 'Tambah' : 'Add'}</span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => {
          triggerHaptic('light');
          onOpenAdvanced();
        }}
        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer touch-manipulation border flex items-center gap-1.5 shrink-0 ${
          isOrganic 
            ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.subText} hover:${organicPalette.titleText}` 
            : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
        }`}
        title={lang === 'id' ? 'Tambah dengan detail lengkap (Tanggal, Jam, Prioritas, Disiplin)' : 'Add with details (Date, Time, Priority)'}
      >
        <Plus className="w-3.5 h-3.5" />
        <span className="text-[11px] font-semibold">{lang === 'id' ? 'Detail' : 'Detail'}</span>
      </button>
    </form>
  );
});

// =============================================================================
// MAIN TASKS SCREEN
// =============================================================================
export default function TasksScreen({ 
  appTheme, 
  extra 
}: { 
  appTheme?: string; 
  onNavigate?: (s: any, extra?: any) => void; 
  extra?: any 
}) {
  const { 
    tasks, 
    addTask, 
    updateTask, 
    batchUpdateTasks, 
    restartTask, 
    deleteTask, 
    restoreTask, 
    emptyTrash, 
    restoreAllTasks, 
    toggleTask, 
    lang, 
    appVersion, 
    isLiteMode 
  } = useAppStore();
  
  const isLite = appTheme === 'lite' || appVersion === 'lite' || isLiteMode;
  const isOrganic = !isLite && (appVersion === 'organic' || appVersion === 'pro_max' || appTheme === 'organic' || appTheme === 'pro_max');
  const is3D = isOrganic;
  const organicPalette = useMemo(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : null;
    const effectiveTheme = appTheme || storedTheme || (isOrganic ? 'organic' : 'dark');
    return getOrganicThemePalette(effectiveTheme);
  }, [appTheme, isOrganic]);
  const [activeTab, setActiveTab] = useState<'Sekarang' | 'Harian' | 'Disiplin'>('Sekarang');
  const tasksScrollRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (tasksScrollRef.current) {
      tasksScrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  const [sortBy, setSortBy] = useState<'waktu' | 'level'>(() => {
    try {
      return (localStorage.getItem('tata_tasks_sort') as 'waktu' | 'level') || 'waktu';
    } catch(e) {
      return 'waktu';
    }
  });

  const [priorityFilter, setPriorityFilter] = useState<'semua' | 'Tinggi' | 'Sedang' | 'Rendah'>('semua');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const filterMenuRef = useRef<HTMLDivElement>(null);

  // Click outside listener for Priority Filter dropdown
  useEffect(() => {
    if (!showFilterMenu) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as Node)) {
        setShowFilterMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showFilterMenu]);

  const [showCompleted, setShowCompleted] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [modalInitialType, setModalInitialType] = useState<'Sekarang' | 'Harian' | 'Disiplin'>('Sekarang');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToRestart, setTaskToRestart] = useState<Task | null>(null);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>('');
  
  const t = useTranslation(lang);

  const toggleSort = () => {
    triggerHaptic('light');
    const nextSort = sortBy === 'waktu' ? 'level' : 'waktu';
    setSortBy(nextSort);
    try {
      localStorage.setItem('tata_tasks_sort', nextSort);
    } catch(e) {}
  };

  const openEditTask = useCallback((task: Task) => {
    triggerHaptic('light');
    setEditingTask(task);
    setIsAddingTask(true);
  }, []);

  const openNewTaskModal = useCallback((type: 'Sekarang' | 'Harian' | 'Disiplin') => {
    triggerHaptic('light');
    setEditingTask(null);
    setModalInitialType(type);
    setIsAddingTask(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsAddingTask(false);
    setEditingTask(null);
  }, []);

  useEffect(() => {
    if (extra?.openNewTask) {
      openNewTaskModal('Sekarang');
    } else if (extra?.openDiscipline) {
      setActiveTab('Disiplin');
      if (extra?.newDiscipline) {
        openNewTaskModal('Disiplin');
      }
    }
  }, [extra, openNewTaskModal]);

  // Task Mutations Wrapped in useCallback for 0ms Child Re-renders
  const handleToggleTask = useCallback((id: string) => {
    toggleTask(id);
  }, [toggleTask]);

  const handlePinTask = useCallback((task: Task) => {
    updateTask({ ...task, pinned: !task.pinned });
  }, [updateTask]);

  const handleDeleteTask = useCallback((id: string) => {
    deleteTask(id);
  }, [deleteTask]);

  const handleRestoreTask = useCallback((id: string) => {
    restoreTask(id);
  }, [restoreTask]);

  // Handle Save from TaskFormModal
  const handleSaveTask = useCallback((formData: TaskFormData) => {
    if (formData.alarmTime && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission().catch(() => {});
    }
    
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const todayDate = getLocalIsoDate(now);
    const isTodayTask = formData.date === 'Hari ini' || formData.date.toLowerCase() === 'today' || formData.date === todayDate || formData.repeat === 'daily';

    if (editingTask) {
      updateTask({
        ...editingTask,
        title: formData.title,
        priority: formData.priority,
        repeat: formData.repeat,
        date: formData.date,
        alarmTime: formData.alarmTime || undefined,
        isDiscipline: formData.isDiscipline,
        disciplineData: formData.isDiscipline ? {
          ...(editingTask.disciplineData || {}),
          targetDate: formData.targetDate || editingTask.disciplineData?.targetDate,
          reward: formData.reward || editingTask.disciplineData?.reward,
          punishment: formData.punishment || editingTask.disciplineData?.punishment,
          motivation: formData.motivation || editingTask.disciplineData?.motivation,
          startDate: editingTask.disciplineData?.startDate || todayDate
        } : undefined
      });
      if (formData.alarmTime && isTodayTask && formData.alarmTime <= currentTime) {
        try { localStorage.setItem(`tata_alarm_${editingTask.id}_${todayDate}`, 'true'); } catch(e){}
      }
    } else {
      const locale = lang === 'en' ? 'en-US' : 'id-ID';
      const newId = generateId();
      addTask({
        id: newId,
        title: formData.title,
        completed: false,
        priority: formData.priority,
        date: formData.date,
        createdAt: todayDate,
        time: new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
        repeat: formData.repeat,
        alarmTime: formData.alarmTime || undefined,
        isDiscipline: formData.isDiscipline,
        disciplineData: formData.isDiscipline ? {
          startDate: todayDate,
          targetDate: formData.targetDate || undefined,
          reward: formData.reward || undefined,
          punishment: formData.punishment || undefined,
          motivation: formData.motivation || undefined,
          dailyCheckins: [],
          usedRestDates: [],
          milestones: [],
          journeyLog: []
        } : undefined
      });
      if (formData.alarmTime && isTodayTask && formData.alarmTime <= currentTime) {
        try { localStorage.setItem(`tata_alarm_${newId}_${todayDate}`, 'true'); } catch(e){}
      }
    }
    setIsAddingTask(false);
    setEditingTask(null);
  }, [editingTask, updateTask, addTask, lang]);

  // Quick Inline Add Task from top bar
  const handleQuickAdd = useCallback((title: string, tab: 'Sekarang' | 'Harian') => {
    if (!title.trim()) return;
    const now = new Date();
    const todayDate = getLocalIsoDate(now);
    const locale = lang === 'en' ? 'en-US' : 'id-ID';
    const newId = generateId();
    addTask({
      id: newId,
      title: title.trim(),
      completed: false,
      priority: 'Sedang',
      date: todayDate,
      createdAt: todayDate,
      time: now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
      repeat: tab === 'Harian' ? 'daily' : 'once',
    });
  }, [addTask, lang]);

  // Pre-calculate, filter & sort tasks with Schwartzian transform for O(N) performance
  const { 
    todayNowTasks, 
    overdueTasks, 
    upcomingTasks, 
    noDateTasks, 
    completedNowTasks, 
    activeNowTasksCount,
    dailyPendingTasks, 
    dailyCompletedTasks, 
    allDailyTasks, 
    disciplineTask, 
    deletedTasks
  } = useMemo(() => {
    const todayStr = getLocalIsoDate(new Date());

    const getTaskDateStr = (t: Task) => {
      if (t.date === 'Hari ini' || t.date === 'Hari Ini') return todayStr;
      if (t.date === 'Besok') {
        const tmr = getLocalDateFromStr(todayStr);
        tmr.setDate(tmr.getDate() + 1);
        return getLocalIsoDate(tmr);
      }
      return t.date || '';
    };

    const allTasksList = (tasks || []).filter(Boolean);
    let activeTasks = allTasksList.filter(t => !t.deleted);
    let delTasks = allTasksList.filter(t => t.deleted);

    // Apply Priority Filter
    if (priorityFilter !== 'semua') {
      activeTasks = activeTasks.filter(t => t.priority === priorityFilter);
      delTasks = delTasks.filter(t => t.priority === priorityFilter);
    }

    const priorityWeight: Record<string, number> = { 'Tinggi': 3, 'Sedang': 2, 'Rendah': 1 };

    const sortTasks = (taskList: Task[]) => {
      if (taskList.length <= 1) return taskList;
      const decorated = taskList.map(task => ({
        task,
        pinned: task.pinned ? 1 : 0,
        priority: priorityWeight[task.priority] || 2,
        date: getTaskDateStr(task),
        alarmTime: task.alarmTime || '',
        time: task.time || '',
      }));

      decorated.sort((a, b) => {
        if (b.pinned !== a.pinned) return b.pinned - a.pinned;
        if (sortBy === 'level' && b.priority !== a.priority) {
          return b.priority - a.priority;
        }
        if (a.date !== b.date) {
          return a.date.localeCompare(b.date);
        }
        if (a.alarmTime || b.alarmTime) {
          if (!a.alarmTime) return 1;
          if (!b.alarmTime) return -1;
          const cmp = a.alarmTime.localeCompare(b.alarmTime);
          if (cmp !== 0) return cmp;
        }
        return a.time.localeCompare(b.time);
      });

      return decorated.map(d => d.task);
    };

    const sortedActive = sortTasks(activeTasks);
    const sortedDeleted = sortTasks(delTasks);

    // 1. TUGAS SEKARANG / SEKALI JALAN
    const isTodayTask = (t: Task) => getTaskDateStr(t) === todayStr;
    const isOverdueTask = (t: Task) => {
      const d = getTaskDateStr(t);
      return Boolean(d && d < todayStr);
    };
    const isUpcomingTask = (t: Task) => {
      const d = getTaskDateStr(t);
      return Boolean(d && d > todayStr);
    };
    const isNoDateTask = (t: Task) => !t.date;

    const nowTasks = sortedActive.filter(t => t.repeat !== 'daily' && !t.isDiscipline && !t.disciplineData);
    const uncompletedNow = nowTasks.filter(t => !t.completed);
    const completedNow = nowTasks.filter(t => t.completed);

    const overdueTasks = uncompletedNow.filter(isOverdueTask);
    const todayNowTasks = uncompletedNow.filter(isTodayTask);
    const upcomingTasks = uncompletedNow.filter(isUpcomingTask);
    const noDateTasks = uncompletedNow.filter(isNoDateTask);
    const completedNowTasks = completedNow;

    // 2. TUGAS SETIAP HARI (Daily Routines / Habits)
    const allDailyTasks = sortedActive.filter(t => t.repeat === 'daily' && !t.isDiscipline && !t.disciplineData);
    const dailyPendingTasks = allDailyTasks.filter(t => !t.completed);
    const dailyCompletedTasks = allDailyTasks.filter(t => t.completed);

    // 3. DISIPLIN
    const allDisciplineTasksList = activeTasks.filter(t => t.isDiscipline);
    const disciplineTask = (selectedDisciplineId ? allDisciplineTasksList.find(t => t.id === selectedDisciplineId) : null) || allDisciplineTasksList[0] || tasks.find(t => t.isDiscipline && !t.deleted);

    return { 
      todayNowTasks, 
      overdueTasks, 
      upcomingTasks, 
      noDateTasks, 
      completedNowTasks,
      activeNowTasksCount: uncompletedNow.length,
      dailyPendingTasks,
      dailyCompletedTasks,
      allDailyTasks,
      disciplineTask, 
      deletedTasks: sortedDeleted,
    };
  }, [tasks, sortBy, priorityFilter, selectedDisciplineId]);

  // Reschedule all overdue tasks to today in 1 tap (batch update)
  const handleRescheduleAllOverdue = () => {
    if (overdueTasks.length === 0) return;
    triggerHaptic('medium');
    const todayStr = getLocalIsoDate(new Date());
    const updated = overdueTasks.map(task => ({ ...task, date: todayStr }));
    batchUpdateTasks(updated);
  };

  const handleSelectExisting = useCallback(() => { 
    triggerHaptic('light');
    setEditingTask(null);
    setModalInitialType('Disiplin');
    setIsAddingTask(true); 
  }, []);

  const handleQuickAddNow = useCallback((title: string) => handleQuickAdd(title, 'Sekarang'), [handleQuickAdd]);
  const handleQuickAddDaily = useCallback((title: string) => handleQuickAdd(title, 'Harian'), [handleQuickAdd]);
  const handleOpenNowAdvanced = useCallback(() => openNewTaskModal('Sekarang'), [openNewTaskModal]);
  const handleOpenDailyAdvanced = useCallback(() => openNewTaskModal('Harian'), [openNewTaskModal]);

  const nowIcon = useMemo(() => is3D ? <Icon3DNavTasks size={18} /> : <CheckSquare className="w-4 h-4 text-indigo-400" />, [is3D]);
  const dailyIcon = useMemo(() => is3D ? <Icon3DRepeat size={18} /> : <Repeat className="w-4 h-4 text-violet-400" />, [is3D]);

  const dailyProgressPercent = allDailyTasks.length > 0
    ? Math.round((dailyCompletedTasks.length / allDailyTasks.length) * 100)
    : 0;

  return (
    <div className={`flex flex-col h-full font-sans relative ${organicPalette.rootText}`}>
      {/* 1. Header Bar */}
      <header className={`flex-none backdrop-blur-md px-3 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2.5 sm:pb-3 z-20 shadow-xs border-b transition-colors ${
        appTheme === 'wallpaper'
          ? 'bg-slate-950/40 border-white/10 text-white backdrop-blur-xl'
          : `${organicPalette.headerBg} ${organicPalette.headerBorder} ${organicPalette.titleText}`
      }`}>
        <div className="w-full max-w-6xl xl:max-w-7xl mx-auto space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.brandText}`}>
                {is3D ? <Icon3DNavTasks size={20} /> : <CheckSquare className="w-4 h-4" />}
              </div>
              <h1 className={`text-base sm:text-lg font-bold tracking-tight flex items-center gap-1.5 ${organicPalette.titleText}`}>
                <span>{t('tasksMenu') || (lang === 'id' ? 'Tugas' : 'Tasks')}</span>
              </h1>
            </div>

            {/* Quick Action Toolbar */}
            <div className="flex items-center gap-1.5 shrink-0 relative">
              {/* Priority Filter Dropdown */}
              <div ref={filterMenuRef} className="relative">
                <button
                  type="button"
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl text-xs font-semibold border transition-all cursor-pointer touch-manipulation active:scale-95 ${
                    priorityFilter !== 'semua'
                      ? isOrganic
                        ? `${organicPalette.chipActive} shadow-xs`
                        : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                      : isOrganic
                      ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText} hover:opacity-90`
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                  title={lang === 'id' ? 'Filter Prioritas' : 'Filter Priority'}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-medium hidden sm:inline">
                    {priorityFilter === 'semua' ? (lang === 'id' ? 'Filter' : 'Filter') : (priorityFilter === 'Tinggi' ? (lang === 'id' ? 'Wajib' : 'High') : priorityFilter)}
                  </span>
                  {priorityFilter !== 'semua' && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isOrganic ? 'bg-[#D66532]' : 'bg-indigo-400'}`} />
                  )}
                </button>

                {showFilterMenu && (
                  <div 
                    className={`absolute right-0 top-full mt-1.5 w-40 border rounded-2xl shadow-xl p-1.5 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                      isOrganic 
                        ? `${organicPalette.cardHero} ${organicPalette.cardHeroBorder}` 
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    {(['semua', 'Tinggi', 'Sedang', 'Rendah'] as const).map(p => {
                      const label = p === 'semua' ? (lang === 'id' ? 'Semua Prioritas' : 'All Priorities') : p === 'Tinggi' ? (lang === 'id' ? 'Wajib (Tinggi)' : 'High Priority') : p === 'Sedang' ? (lang === 'id' ? 'Sedang' : 'Medium') : (lang === 'id' ? 'Rendah' : 'Low');
                      const isSelected = priorityFilter === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setPriorityFilter(p);
                            setShowFilterMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 min-h-[38px] rounded-xl text-xs font-medium transition-colors flex items-center justify-between cursor-pointer touch-manipulation ${
                            isSelected 
                              ? isOrganic
                                ? `${organicPalette.chipActive} text-white font-bold`
                                : 'bg-indigo-600 text-white font-bold' 
                              : isOrganic
                              ? `${organicPalette.titleText} hover:bg-black/5 dark:hover:bg-white/5`
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>{label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sort Toggle */}
              <button
                type="button"
                onClick={toggleSort}
                title={sortBy === 'waktu' ? (lang === 'id' ? 'Urutkan: Waktu' : 'Sort: Time') : (lang === 'id' ? 'Urutkan: Prioritas' : 'Sort: Priority')}
                className={`flex items-center gap-1.5 px-3 py-2 min-h-[38px] rounded-xl text-xs font-semibold border transition-all cursor-pointer touch-manipulation active:scale-95 ${
                  isOrganic 
                    ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText} hover:opacity-90` 
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                {is3D ? <Icon3DClock size={15} /> : <Clock className={`w-3.5 h-3.5 ${isOrganic ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-400'}`} />}
                <span className="text-[11px] font-medium hidden sm:inline">{sortBy === 'waktu' ? (lang === 'id' ? 'Waktu' : 'Time') : (lang === 'id' ? 'Prioritas' : 'Priority')}</span>
              </button>

              {/* Trash Button */}
              <button
                type="button"
                onClick={() => setShowTrashModal(true)}
                className={`relative p-2 min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer touch-manipulation active:scale-95 ${
                  isOrganic 
                    ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText} hover:opacity-90` 
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
                title={lang === 'id' ? 'Tempat Sampah' : 'Trash'}
              >
                {is3D ? <Icon3DTrash size={16} /> : <Trash2 className="w-3.5 h-3.5" />}
                {deletedTasks.length > 0 && (
                  <span className={`absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center ring-2 ${
                    organicPalette.isDark ? 'ring-slate-950' : 'ring-[#FAF5EA]'
                  }`}>
                    {deletedTasks.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Segmented Tab Navigation: Sleek, Tactile & Smooth Animation */}
          <nav aria-label="Task category tabs" className={`flex p-1 rounded-2xl gap-1 relative shadow-inner border transition-colors ${
            isOrganic 
              ? `${organicPalette.streakCard} ${organicPalette.streakBorder}` 
              : 'bg-slate-950/80 border-slate-800/80'
          }`}>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('Sekarang');
              }}
              className={`flex-1 py-2 sm:py-2.5 min-h-[38px] sm:min-h-[40px] text-xs font-bold rounded-xl transition-all duration-300 ease-out flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation relative active:scale-95 ${
                activeTab === 'Sekarang'
                  ? isOrganic 
                    ? `${organicPalette.chipActive} text-white shadow-xs font-bold`
                    : 'bg-indigo-600 text-white shadow-md'
                  : isOrganic
                  ? `${organicPalette.subText} hover:${organicPalette.titleText}`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {is3D ? <Icon3DNavTasks size={15} /> : <ClipboardList className="w-3.5 h-3.5" />}
              <span>{lang === 'id' ? 'Sekarang' : 'Now'}</span>
              {activeNowTasksCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                  activeTab === 'Sekarang' 
                    ? 'bg-white/25 text-white' 
                    : isOrganic
                    ? `${organicPalette.taskCard} ${organicPalette.streakBorder} border ${organicPalette.brandText}`
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {activeNowTasksCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('Harian');
              }}
              className={`flex-1 py-2 sm:py-2.5 min-h-[38px] sm:min-h-[40px] text-xs font-bold rounded-xl transition-all duration-300 ease-out flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation relative active:scale-95 ${
                activeTab === 'Harian'
                  ? isOrganic 
                    ? `${organicPalette.chipActive} text-white shadow-xs font-bold`
                    : 'bg-violet-600 text-white shadow-md'
                  : isOrganic
                  ? `${organicPalette.subText} hover:${organicPalette.titleText}`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {is3D ? <Icon3DRepeat size={15} /> : <Repeat className="w-3.5 h-3.5" />}
              <span>{lang === 'id' ? 'Rutinitas' : 'Routines'}</span>
              {dailyPendingTasks.length > 0 ? (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                  activeTab === 'Harian' 
                    ? 'bg-white/25 text-white' 
                    : isOrganic
                    ? `${organicPalette.taskCard} ${organicPalette.streakBorder} border ${organicPalette.brandText}`
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {dailyPendingTasks.length}
                </span>
              ) : allDailyTasks.length > 0 ? (
                <Check className={`w-3.5 h-3.5 ${organicPalette.isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
              ) : null}
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('Disiplin');
              }}
              className={`flex-1 py-2 sm:py-2.5 min-h-[38px] sm:min-h-[40px] text-xs font-bold rounded-xl transition-all duration-300 ease-out flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation relative active:scale-95 ${
                activeTab === 'Disiplin'
                  ? isOrganic 
                    ? `${organicPalette.chipActive} text-white shadow-xs font-bold`
                    : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md'
                  : isOrganic
                  ? `${organicPalette.subText} hover:${organicPalette.titleText}`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {is3D ? <Icon3DTarget size={15} /> : <Target className="w-3.5 h-3.5" />}
              <span>{lang === 'id' ? 'Disiplin' : 'Discipline'}</span>
              {disciplineTask && (
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
              )}
            </button>
          </nav>
        </div>
      </header>

      {/* 2. Main Scrollable Content */}
      <main ref={tasksScrollRef} className="flex-1 overflow-y-auto custom-scrollbar px-3 sm:px-6 py-3.5 sm:py-5 pb-28 sm:pb-32 w-full max-w-6xl xl:max-w-7xl mx-auto space-y-4">
        
        {/* ========================================================================= */}
        {/* TAB 1: TUGAS SEKARANG                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'Sekarang' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Quick Task Add Bar */}
            <QuickTaskBar
              isOrganic={isOrganic}
              organicPalette={organicPalette}
              is3D={is3D}
              lang={lang}
              icon={nowIcon}
              placeholder={lang === 'id' ? 'Tulis tugas baru lalu tekan Enter...' : 'Quick add task (press Enter)...'}
              buttonColorClass="bg-indigo-600"
              onSubmit={handleQuickAddNow}
              onOpenAdvanced={handleOpenNowAdvanced}
            />

            {/* OVERDUE ALERT & SECTION */}
            {overdueTasks.length > 0 && (
              <section className={`rounded-2xl p-3 shadow-xs space-y-2.5 border ${
                isOrganic ? 'bg-rose-500/10 border-rose-500/25 text-rose-600' : 'bg-rose-500/10 border-rose-500/25'
              }`}>
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <div className="flex items-center gap-1.5 text-rose-500 font-bold text-xs">
                    {is3D ? <Icon3DWarning size={16} /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                    <span>{lang === 'id' ? `${overdueTasks.length} Terlewat` : `${overdueTasks.length} Overdue`}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRescheduleAllOverdue}
                    className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center gap-1"
                  >
                    <span>{t('rescheduleOverdue') || (lang === 'id' ? 'Jadikan Hari Ini' : 'Move to Today')}</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {overdueTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      isOverdue={true} 
                      appTheme={appTheme}
                      isOrganic={isOrganic}
                      palette={organicPalette}
                      is3D={is3D}
                      lang={lang}
                      onToggle={handleToggleTask} 
                      onEdit={openEditTask} 
                      onPin={handlePinTask}
                      onDelete={handleDeleteTask}
                      onRestore={handleRestoreTask}
                      onRestart={setTaskToRestart}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* TODAY'S TASKS SECTION */}
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  organicPalette.titleText
                }`}>
                  <span>{t('todayTasksLabel') || (lang === 'id' ? 'Hari Ini' : 'Today')}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                    isOrganic 
                      ? `${organicPalette.streakCard} ${organicPalette.brandText} ${organicPalette.streakBorder}` 
                      : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20'
                  }`}>
                    {todayNowTasks.length}
                  </span>
                </h2>
              </div>
              {todayNowTasks.length > 0 ? (
                <div className="space-y-2">
                  {todayNowTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      appTheme={appTheme}
                      isOrganic={isOrganic}
                      palette={organicPalette}
                      is3D={is3D}
                      lang={lang}
                      onToggle={handleToggleTask} 
                      onEdit={openEditTask} 
                      onPin={handlePinTask}
                      onDelete={handleDeleteTask}
                      onRestore={handleRestoreTask}
                      onRestart={setTaskToRestart} 
                    />
                  ))}
                </div>
              ) : overdueTasks.length === 0 && (
                <div className={`p-5 rounded-2xl sm:rounded-3xl border border-dashed text-center flex flex-col items-center justify-center gap-2 transition-all ${
                  isOrganic 
                    ? `${organicPalette.taskCard} ${organicPalette.taskCardBorder}` 
                    : 'bg-slate-900/40 border-slate-800/80'
                }`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                    isOrganic 
                      ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.brandText}` 
                      : 'bg-slate-800/60 border-slate-700 text-slate-400'
                  }`}>
                    {is3D ? <Icon3DNavTasks size={18} /> : <CalendarIcon className="w-4 h-4 text-indigo-400" />}
                  </div>
                  <p className={`text-xs font-bold ${organicPalette.titleText}`}>
                    {lang === 'id' ? 'Belum ada agenda tugas untuk hari ini' : 'No tasks scheduled for today'}
                  </p>
                  <p className={`text-[11px] font-medium max-w-xs ${organicPalette.subText}`}>
                    {lang === 'id' ? 'Nikmati harimu atau gunakan kolom di atas untuk menambah tugas baru.' : 'Enjoy your day or use the quick bar above to add a new task.'}
                  </p>
                </div>
              )}
            </section>

            {/* UPCOMING TASKS SECTION */}
            {upcomingTasks.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    organicPalette.subText
                  }`}>
                    <span>{t('upcomingTasks') || (lang === 'id' ? 'Mendatang' : 'Upcoming')}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isOrganic 
                        ? `${organicPalette.streakCard} ${organicPalette.subText} border ${organicPalette.streakBorder}` 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {upcomingTasks.length}
                    </span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {upcomingTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      appTheme={appTheme}
                      isOrganic={isOrganic}
                      palette={organicPalette}
                      is3D={is3D}
                      lang={lang}
                      onToggle={handleToggleTask} 
                      onEdit={openEditTask} 
                      onPin={handlePinTask}
                      onDelete={handleDeleteTask}
                      onRestore={handleRestoreTask}
                      onRestart={setTaskToRestart} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* NO DATE / ANYTIME TASKS SECTION */}
            {noDateTasks.length > 0 && (
              <section className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h2 className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    organicPalette.subText
                  }`}>
                    <span>{t('anytimeTasks') || (lang === 'id' ? 'Kapan Saja' : 'Anytime')}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isOrganic 
                        ? `${organicPalette.streakCard} ${organicPalette.subText} border ${organicPalette.streakBorder}` 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {noDateTasks.length}
                    </span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {noDateTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      appTheme={appTheme}
                      isOrganic={isOrganic}
                      palette={organicPalette}
                      is3D={is3D}
                      lang={lang}
                      onToggle={handleToggleTask} 
                      onEdit={openEditTask} 
                      onPin={handlePinTask}
                      onDelete={handleDeleteTask}
                      onRestore={handleRestoreTask}
                      onRestart={setTaskToRestart} 
                    />
                  ))}
                </div>
              </section>
            )}

            {/* COMPLETED TASKS (Collapsible Accordion) */}
            {completedNowTasks.length > 0 && (
              <section className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setShowCompleted(!showCompleted);
                  }}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-semibold transition-all active:scale-98 cursor-pointer touch-manipulation border ${
                    isOrganic 
                      ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText} hover:opacity-90` 
                      : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${organicPalette.isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                    <span>{t('completedTasks') || (lang === 'id' ? 'Selesai' : 'Completed')} ({completedNowTasks.length})</span>
                  </div>
                  {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showCompleted && (
                  <div className="space-y-2 mt-2">
                    {completedNowTasks.map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        appTheme={appTheme}
                        isOrganic={isOrganic}
                        palette={organicPalette}
                        is3D={is3D}
                        lang={lang}
                        onToggle={handleToggleTask} 
                        onEdit={openEditTask} 
                        onPin={handlePinTask}
                        onDelete={handleDeleteTask}
                        onRestore={handleRestoreTask}
                        onRestart={setTaskToRestart} 
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Empty State when no tasks match */}
            {todayNowTasks.length === 0 && overdueTasks.length === 0 && upcomingTasks.length === 0 && noDateTasks.length === 0 && completedNowTasks.length === 0 && (
              <div className={`flex flex-col items-center justify-center py-12 px-6 text-center rounded-3xl border shadow-xs transition-all relative overflow-hidden ${
                isOrganic 
                  ? `${organicPalette.cardHero} ${organicPalette.cardHeroBorder}` 
                  : 'bg-slate-900/60 border-slate-800'
              }`}>
                {isOrganic && (
                  <>
                    <div className={`absolute -right-8 -top-8 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-40 ${organicPalette.cardHeroBlob1}`} />
                    <div className={`absolute -left-6 -bottom-6 w-32 h-32 rounded-full blur-xl pointer-events-none opacity-30 ${organicPalette.cardHeroBlob2}`} />
                  </>
                )}
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border shadow-xs relative z-10 ${
                  isOrganic 
                    ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.brandText}` 
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                }`}>
                  {is3D ? <Icon3DNavTasks size={34} /> : <CheckSquare className="w-8 h-8 text-indigo-400" />}
                </div>
                <h3 className={`text-base font-extrabold mb-1.5 tracking-tight relative z-10 ${organicPalette.titleText}`}>
                  {priorityFilter !== 'semua' 
                    ? (lang === 'id' ? `Tidak Ada Tugas Prioritas ${priorityFilter === 'Tinggi' ? 'Wajib' : priorityFilter}` : `No ${priorityFilter} Priority Tasks`)
                    : (lang === 'id' ? 'Semua Agenda Telah Beres!' : 'All Tasks Completed!')}
                </h3>
                <p className={`text-xs max-w-sm mb-5 leading-relaxed font-medium relative z-10 ${organicPalette.subText}`}>
                  {priorityFilter !== 'semua'
                    ? (lang === 'id' ? 'Tidak ada tugas yang cocok dengan filter saat ini. Atur ulang filter atau buat tugas baru.' : 'No tasks match your selected filter. Reset filter or create a new one.')
                    : (lang === 'id' ? 'Bagus sekali! Tidak ada tugas mendesak untuk saat ini. Nikmati harimu atau susun rencana baru.' : 'Great job! No pending tasks right now. Relax or plan ahead.')}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5 relative z-10">
                  {priorityFilter !== 'semua' && (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setPriorityFilter('semua');
                      }}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all border active:scale-95 cursor-pointer touch-manipulation flex items-center gap-1.5 ${
                        isOrganic 
                          ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText} hover:opacity-90` 
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:text-white'
                      }`}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'Tampilkan Semua' : 'Show All'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      openNewTaskModal('Sekarang');
                    }}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer touch-manipulation flex items-center gap-2 ${
                      isOrganic 
                        ? `${organicPalette.chipActive} text-white shadow-xs` 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>{lang === 'id' ? 'Tambah Tugas' : 'Add Task'}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TUGAS SETIAP HARI (Daily Routines / Habits)                        */}
        {/* ========================================================================= */}
        {activeTab === 'Harian' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Quick Routine Add Bar */}
            <QuickTaskBar
              isOrganic={isOrganic}
              organicPalette={organicPalette}
              is3D={is3D}
              lang={lang}
              icon={dailyIcon}
              placeholder={lang === 'id' ? 'Tulis rutinitas harian cepat... (Tekan Enter)' : 'Quick add daily routine (press Enter)...'}
              buttonColorClass="bg-violet-600"
              onSubmit={handleQuickAddDaily}
              onOpenAdvanced={handleOpenDailyAdvanced}
            />
            
            {/* Daily Habit Progress Hero Card - Flagship Pro Max Design */}
            {allDailyTasks.length > 0 && (
              <div className={`rounded-3xl p-4 sm:p-5 shadow-xs border transition-all relative overflow-hidden ${
                isOrganic 
                  ? `${organicPalette.cardHero} ${organicPalette.cardHeroBorder}` 
                  : 'bg-gradient-to-br from-violet-600/15 via-slate-900 to-slate-900 border-violet-500/20'
              }`}>
                {isOrganic && (
                  <>
                    <div className={`absolute -right-8 -top-8 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-40 ${organicPalette.cardHeroBlob1}`} />
                    <div className={`absolute -left-6 -bottom-6 w-32 h-32 rounded-full blur-xl pointer-events-none opacity-30 ${organicPalette.cardHeroBlob2}`} />
                  </>
                )}

                <div className="flex items-center justify-between mb-3.5 gap-3 relative z-10">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-xs ${
                      isOrganic 
                        ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.brandText}` 
                        : 'bg-violet-500/20 border-violet-500/30 text-violet-300'
                    }`}>
                      {is3D ? <Icon3DRepeat size={28} /> : <Repeat className="w-5 h-5 text-violet-400" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-sm sm:text-base font-extrabold tracking-tight truncate ${organicPalette.titleText}`}>
                        {t('routineProgress') || (lang === 'id' ? 'Progres Rutinitas Harian' : 'Daily Routine Progress')}
                      </h3>
                      <p className={`text-xs font-semibold mt-0.5 ${organicPalette.subText}`}>
                        {dailyCompletedTasks.length} dari {allDailyTasks.length} rutinitas selesai
                      </p>
                    </div>
                  </div>

                  {/* Percentage Stat Chip */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    {dailyProgressPercent === 100 ? (
                      <span className={`text-xs font-extrabold px-3 py-1.5 rounded-xl flex items-center gap-1.5 border shadow-xs ${
                        isOrganic 
                          ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' 
                          : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                      }`}>
                        {is3D ? <Icon3DTaskChecked size={16} /> : <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 stroke-[3]" />}
                        <span>{lang === 'id' ? '100% Selesai' : '100% Done'}</span>
                      </span>
                    ) : (
                      <span className={`text-xs font-black px-2.5 py-1 rounded-xl border flex items-center gap-1 font-mono shadow-xs ${
                        isOrganic
                          ? `${organicPalette.streakCard} ${organicPalette.brandText} ${organicPalette.streakBorder}`
                          : 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                      }`}>
                        <span>{dailyProgressPercent}%</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Tactile Progress Bar with Track */}
                <div className={`w-full h-2.5 rounded-full overflow-hidden border p-0.5 relative z-10 ${
                  isOrganic 
                    ? `${organicPalette.progressBarTrack} ${organicPalette.streakBorder}` 
                    : 'bg-slate-950/80 border-slate-800/80'
                }`}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${dailyProgressPercent}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={`h-full rounded-full transition-all relative ${
                      dailyProgressPercent === 100 
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-sm shadow-emerald-500/50' 
                        : isOrganic 
                        ? organicPalette.progressBarFill 
                        : 'bg-gradient-to-r from-violet-500 to-indigo-500'
                    }`}
                  >
                    {dailyProgressPercent > 10 && (
                      <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
                    )}
                  </motion.div>
                </div>

                {/* Motivational Footnote */}
                <div className={`flex items-center justify-between mt-3 pt-2.5 border-t border-dashed text-[11px] font-medium relative z-10 ${
                  isOrganic ? 'border-[#E6DAC8] dark:border-white/10' : 'border-slate-800'
                }`}>
                  <span className={`${organicPalette.subText}`}>
                    {dailyProgressPercent === 100 
                      ? (lang === 'id' ? '🔥 Luar biasa! Semua rutinitas hari ini tuntas terjaga.' : '🔥 Outstanding! All routines completed today.')
                      : dailyProgressPercent >= 50
                      ? (lang === 'id' ? '⚡ Lebih dari separuh tuntas. Pertahankan konsistensi!' : '⚡ Over halfway done. Keep the momentum going!')
                      : dailyProgressPercent > 0
                      ? (lang === 'id' ? '✨ Langkah awal bagus. Lanjutkan rutinitas berikutnya!' : '✨ Good start. Continue to the next routine!')
                      : (lang === 'id' ? '🎯 Mulai hari dengan menyelesaikan rutinitas pertamamu.' : '🎯 Ready to start? Complete your first routine.')}
                  </span>
                  <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg border ${
                    isOrganic 
                      ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.subText}` 
                      : 'bg-slate-800/80 border-slate-700/60 text-slate-400'
                  }`}>
                    {allDailyTasks.length - dailyCompletedTasks.length} {lang === 'id' ? 'tersisa' : 'left'}
                  </span>
                </div>
              </div>
            )}

            {/* PENDING DAILY ROUTINES */}
            <section className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <h2 className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                  organicPalette.titleText
                }`}>
                  <span>{lang === 'id' ? 'Perlu Dikerjakan Hari Ini' : 'Pending Today'}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${
                    isOrganic 
                      ? `${organicPalette.streakCard} ${organicPalette.brandText} ${organicPalette.streakBorder}` 
                      : 'bg-violet-500/15 text-violet-300 border-violet-500/20'
                  }`}>
                    {dailyPendingTasks.length}
                  </span>
                </h2>
              </div>
              {dailyPendingTasks.length > 0 ? (
                <div className="space-y-2">
                  {dailyPendingTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      isDailyView={true} 
                      appTheme={appTheme}
                      isOrganic={isOrganic}
                      palette={organicPalette}
                      is3D={is3D}
                      lang={lang}
                      onToggle={handleToggleTask} 
                      onEdit={openEditTask} 
                      onPin={handlePinTask}
                      onDelete={handleDeleteTask}
                      onRestore={handleRestoreTask}
                      onRestart={setTaskToRestart}
                    />
                  ))}
                </div>
              ) : allDailyTasks.length > 0 ? (
                <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                  isOrganic 
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-200' 
                    : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-xs sm:text-sm">
                    {is3D ? <Icon3DTaskChecked size={20} /> : <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                    <span>{t('allDailyDone') || (lang === 'id' ? 'Semua rutinitas hari ini telah selesai!' : 'All routines completed today!')}</span>
                  </div>
                  <p className="text-[11px] font-medium opacity-85">
                    {lang === 'id' ? 'Konsistensimu terjaga dengan luar biasa. Rutinitas akan otomatis reset esok pagi.' : 'Great job keeping your consistency. Routines reset tomorrow morning.'}
                  </p>
                </div>
              ) : null}
            </section>

            {/* COMPLETED DAILY ROUTINES */}
            {dailyCompletedTasks.length > 0 && (
              <section className="space-y-2 pt-1">
                <div className="flex items-center justify-between px-1">
                  <h2 className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                    organicPalette.subText
                  }`}>
                    <span>{lang === 'id' ? 'Sudah Selesai' : 'Completed'}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${
                      isOrganic 
                        ? `${organicPalette.streakCard} ${organicPalette.subText} border ${organicPalette.streakBorder}` 
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {dailyCompletedTasks.length}
                    </span>
                  </h2>
                </div>
                <div className="space-y-2">
                  {dailyCompletedTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      isDailyView={true} 
                      appTheme={appTheme}
                      isOrganic={isOrganic}
                      palette={organicPalette}
                      is3D={is3D}
                      lang={lang}
                      onToggle={handleToggleTask} 
                      onEdit={openEditTask} 
                      onPin={handlePinTask}
                      onDelete={handleDeleteTask}
                      onRestore={handleRestoreTask}
                      onRestart={setTaskToRestart}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State for Daily Habits - Flagship Pro Max Design */}
            {allDailyTasks.length === 0 && (
              <div className={`flex flex-col items-center justify-center py-10 px-5 sm:px-8 text-center rounded-3xl border shadow-xs transition-all relative overflow-hidden ${
                isOrganic 
                  ? `${organicPalette.cardHero} ${organicPalette.cardHeroBorder}` 
                  : 'bg-slate-900/60 border-slate-800'
              }`}>
                {isOrganic && (
                  <>
                    <div className={`absolute -right-8 -top-8 w-36 h-36 rounded-full blur-2xl pointer-events-none opacity-40 ${organicPalette.cardHeroBlob1}`} />
                    <div className={`absolute -left-6 -bottom-6 w-32 h-32 rounded-full blur-xl pointer-events-none opacity-30 ${organicPalette.cardHeroBlob2}`} />
                  </>
                )}
                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-4 border shadow-xs relative z-10 ${
                  isOrganic 
                    ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.brandText}` 
                    : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                }`}>
                  {is3D ? <Icon3DRepeat size={34} /> : <Repeat className="w-8 h-8 text-violet-400" />}
                </div>
                <h3 className={`text-base font-extrabold mb-1.5 tracking-tight relative z-10 ${organicPalette.titleText}`}>
                  {lang === 'id' ? 'Bangun Konsistensi Rutinitas Harian' : 'Build Daily Routine Habits'}
                </h3>
                <p className={`text-xs max-w-sm mb-5 leading-relaxed font-medium relative z-10 ${organicPalette.subText}`}>
                  {lang === 'id' 
                    ? 'Kebiasaan kecil yang diulang setiap hari menciptakan perubahan besar. Rutinitas otomatis siap dikerjakan kembali setiap pagi.' 
                    : 'Small daily habits repeated consistently yield massive transformations. Routines reset automatically every morning.'}
                </p>

                {/* Quick Start Suggestions */}
                <div className="w-full max-w-md mb-5 relative z-10">
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-2.5 text-center ${organicPalette.subText}`}>
                    {lang === 'id' ? '💡 Mulai Cepat Rekomendasi Rutinitas:' : '💡 Quick Start Habit Templates:'}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    {[
                      { title: lang === 'id' ? '💧 Minum 2L Air' : '💧 Drink 2L Water' },
                      { title: lang === 'id' ? '🏃 Olahraga 15 Menit' : '🏃 15m Exercise' },
                      { title: lang === 'id' ? '📖 Membaca 10 Halaman' : '📖 Read 10 Pages' },
                      { title: lang === 'id' ? '🧘 Refleksi & Jurnal' : '🧘 Evening Reflection' },
                    ].map((habit) => (
                      <button
                        key={habit.title}
                        type="button"
                        onClick={() => {
                          triggerHaptic('success');
                          handleQuickAdd(habit.title, 'Harian');
                        }}
                        className={`p-2.5 rounded-2xl border text-xs font-semibold flex items-center justify-between transition-all active:scale-95 cursor-pointer touch-manipulation group ${
                          isOrganic 
                            ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText} hover:border-[#D66532]/50` 
                            : 'bg-slate-900/80 border-slate-800 text-slate-200 hover:border-violet-500/40'
                        }`}
                      >
                        <span className="truncate">{habit.title}</span>
                        <Plus className={`w-3.5 h-3.5 shrink-0 opacity-70 group-hover:opacity-100 ${isOrganic ? 'text-[#D66532]' : 'text-violet-400'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => openNewTaskModal('Harian')}
                  className={`px-5 py-2.5 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer touch-manipulation flex items-center gap-2 relative z-10 ${
                    isOrganic 
                      ? `${organicPalette.chipActive} text-white shadow-xs` 
                      : 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'id' ? 'Buat Rutinitas Kustom' : 'Create Custom Routine'}</span>
                </button>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FOKUS DISIPLIN                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'Disiplin' && (
          <div className="animate-in fade-in duration-200">
            <DisciplineView 
              task={disciplineTask} 
              onSelectExisting={handleSelectExisting} 
              onEdit={openEditTask} 
              onSelectDisciplineId={setSelectedDisciplineId}
              lang={lang} 
              appTheme={appTheme}
              palette={organicPalette}
            />
          </div>
        )}

      </main>

      {/* 3. Isolated TaskFormModal */}
      <TaskFormModal
        isOpen={isAddingTask}
        onClose={handleCloseModal}
        editingTask={editingTask}
        initialType={modalInitialType}
        onSave={handleSaveTask}
        onRestartRequest={setTaskToRestart}
        appTheme={appTheme}
        isOrganic={isOrganic}
        palette={organicPalette}
        lang={lang}
      />

      {/* 5. Trash Modal */}
      {showTrashModal && (
        <div className="fixed inset-0 bg-slate-950/85 z-[150] flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className={`border rounded-3xl p-5 max-w-md w-full shadow-2xl text-left animate-in zoom-in-95 duration-200 ${
            isOrganic 
              ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText}` 
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {is3D ? <Icon3DTrash size={20} /> : <Trash2 className="w-4 h-4 text-rose-400" />}
                <h3 className={`text-sm font-bold flex items-center gap-2 ${organicPalette.titleText}`}>
                  <span>{lang === 'id' ? 'Tempat Sampah Tugas' : 'Task Trash'}</span>
                  {deletedTasks.length > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-rose-500/15 text-rose-400 rounded-md border border-rose-500/20 font-bold">
                      {deletedTasks.length}
                    </span>
                  )}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowTrashModal(false);
                  setConfirmEmptyTrash(false);
                }} 
                className={`p-1 rounded-lg cursor-pointer transition-colors touch-manipulation ${
                  isOrganic ? `${organicPalette.subText} hover:${organicPalette.titleText}` : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deletedTasks.length > 0 ? (
              <div className="space-y-3">
                {!confirmEmptyTrash ? (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        restoreAllTasks();
                        setShowTrashModal(false);
                      }}
                      className="text-xs text-emerald-500 hover:text-emerald-400 font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors flex items-center gap-1.5 cursor-pointer touch-manipulation"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'Pulihkan Semua' : 'Restore All'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmEmptyTrash(true)}
                      className="text-xs text-rose-500 hover:text-rose-400 font-bold px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors flex items-center gap-1.5 cursor-pointer touch-manipulation"
                    >
                      {is3D ? <Icon3DTrash size={14} /> : <Trash2 className="w-3.5 h-3.5" />}
                      <span>{lang === 'id' ? 'Kosongkan Sampah' : 'Empty Trash'}</span>
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-2xl space-y-2 animate-in fade-in duration-150">
                    <p className="text-xs text-rose-200 font-semibold">
                      {lang === 'id' ? `Hapus permanen semua ${deletedTasks.length} tugas? Data tidak dapat dipulihkan lagi.` : `Permanently delete all ${deletedTasks.length} tasks? This cannot be undone.`}
                    </p>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmEmptyTrash(false)}
                        className={`px-2.5 py-1 text-xs rounded-lg cursor-pointer touch-manipulation ${
                          isOrganic ? `${organicPalette.chipInactive} ${organicPalette.subText}` : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {lang === 'id' ? 'Batal' : 'Cancel'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          emptyTrash();
                          setConfirmEmptyTrash(false);
                          setShowTrashModal(false);
                        }}
                        className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer touch-manipulation"
                      >
                        {lang === 'id' ? 'Ya, Kosongkan' : 'Yes, Empty'}
                      </button>
                    </div>
                  </div>
                )}

                <div className={`max-h-[50vh] overflow-y-auto custom-scrollbar divide-y rounded-2xl border ${
                  isOrganic 
                    ? `${organicPalette.taskCard} ${organicPalette.streakBorder} divide-slate-500/10` 
                    : 'divide-slate-800/80 bg-slate-950/60 border-slate-800'
                }`}>
                  {deletedTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      appTheme={appTheme}
                      isOrganic={isOrganic}
                      palette={organicPalette}
                      is3D={is3D}
                      lang={lang}
                      onToggle={handleToggleTask} 
                      onEdit={openEditTask} 
                      onPin={handlePinTask}
                      onDelete={handleDeleteTask}
                      onRestore={handleRestoreTask}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className={`py-10 px-4 text-center flex flex-col items-center justify-center gap-2.5 ${organicPalette.subText}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  isOrganic ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.subText}` : 'bg-slate-900 border-slate-800 text-slate-500'
                }`}>
                  {is3D ? <Icon3DTrash size={22} /> : <Trash2 className="w-5 h-5 opacity-70" />}
                </div>
                <p className="text-xs font-semibold">{lang === 'id' ? 'Tempat sampah kosong. Tidak ada tugas terhapus.' : 'Trash is empty. No deleted tasks.'}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Restart Task Confirmation Modal */}
      {taskToRestart && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setTaskToRestart(null)}
        >
          <div 
            className={`border rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl text-left space-y-4 ${
              isOrganic 
                ? `${organicPalette.disciplineCard} ${organicPalette.disciplineBorder} ${organicPalette.disciplineTitle}`
                : 'bg-slate-900 border-slate-800 text-slate-100'
            }`}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border text-amber-500 ${
                  isOrganic ? `${organicPalette.disciplineInner} ${organicPalette.disciplineInnerBorder}` : 'bg-slate-800/80 border-slate-700'
                }`}>
                  {is3D ? <Icon3DRotateCcw size={22} /> : <RotateCcw className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold leading-snug">
                    {taskToRestart.isDiscipline
                      ? (lang === 'id' ? 'Mulai Ulang Fokus Disiplin?' : 'Restart Focus Discipline?')
                      : (lang === 'id' ? 'Mulai Ulang Rutinitas?' : 'Restart Routine?')}
                  </h3>
                  <p className={`text-xs truncate max-w-[220px] sm:max-w-xs ${organicPalette.subText}`}>
                    {taskToRestart.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTaskToRestart(null)}
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer touch-manipulation ${
                  isOrganic ? `${organicPalette.disciplineInner} ${organicPalette.disciplineInnerBorder} ${organicPalette.disciplineSub}` : 'border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
              isOrganic ? `${organicPalette.disciplineInner} ${organicPalette.disciplineInnerBorder}` : 'bg-slate-800/80 border-slate-700'
            }`}>
              <div className="text-amber-400 font-semibold flex items-start gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {taskToRestart.isDiscipline
                    ? (lang === 'id'
                        ? 'Semua hari bolong, check-in, dan libur akan di-reset kembali ke hari ke-1 (mulai hari ini).'
                        : 'All missed days, check-ins, and rest days will reset back to Day 1 (starting today).')
                    : (lang === 'id'
                        ? 'Riwayat check-in dan catatan hari terlewat akan di-reset ke 0 hari, dan dihitung mulai baru dari hari ini.'
                        : 'Check-in history and missed days will reset to 0, starting fresh from today.')}
                </span>
              </div>
              <div className="text-emerald-400 font-semibold flex items-start gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  {taskToRestart.isDiscipline
                    ? (lang === 'id'
                        ? 'Judul target, hadiah, hukuman, dan motivasi tetap tersimpan aman.'
                        : 'Title, reward, consequences, and motivation are kept safely.')
                    : (lang === 'id'
                        ? 'Judul tugas, prioritas, dan jam alarm pengingat tetap tersimpan aman.'
                        : 'Task title, priority, and alarm time are kept safely.')}
                </span>
              </div>
            </div>

            <p className={`text-[11px] leading-relaxed ${organicPalette.subText}`}>
              {lang === 'id'
                ? 'Kamu tidak perlu menghapus tugas ini dan mengetik ulang dari awal. Tugas akan langsung aktif kembali seperti baru.'
                : 'You do not need to delete and recreate this task. It will restart cleanly like a fresh task.'}
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setTaskToRestart(null)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer touch-manipulation border ${
                  isOrganic ? `${organicPalette.disciplineInner} ${organicPalette.disciplineInnerBorder} ${organicPalette.disciplineSub}` : 'border-slate-800 bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  restartTask(taskToRestart.id);
                  setTaskToRestart(null);
                  if (editingTask && editingTask.id === taskToRestart.id) {
                    setEditingTask(null);
                    setIsAddingTask(false);
                  }
                }}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md active:scale-95 cursor-pointer touch-manipulation bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600`}
              >
                {lang === 'id' ? 'Ya, Mulai Ulang' : 'Yes, Restart'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// =============================================================================
// TASK CARD COMPONENT: Decoupled from store, Ultra Fast, Custom Memo
// =============================================================================
interface TaskCardProps {
  task: Task; 
  isDailyView?: boolean;
  isOverdue?: boolean;
  appTheme?: string;
  isOrganic: boolean;
  palette: OrganicThemePalette;
  is3D: boolean;
  lang: string;
  onToggle: (id: string) => void; 
  onEdit: (task: Task) => void; 
  onPin: (task: Task) => void;
  onDelete: (id: string) => void;
  onRestore?: (id: string) => void;
  onRestart?: (task: Task) => void;
}

const TaskCard = React.memo<TaskCardProps>(({ 
  task, 
  isOverdue, 
  isOrganic, 
  palette, 
  is3D, 
  lang, 
  onToggle, 
  onEdit, 
  onPin, 
  onDelete, 
  onRestore, 
  onRestart 
}) => {
  const isHigh = task.priority === 'Tinggi';
  const isMed = task.priority === 'Sedang';

  // Daily task statistics - O(1) instant mathematical calculation
  const dailyStats = useMemo(() => {
    if (task.repeat !== 'daily') return null;
    const today = getLocalIsoDate(new Date());
    const createdDate = parseDateToIso(task.createdAt) || today;
    const start = getLocalDateFromStr(createdDate);
    const end = getLocalDateFromStr(today);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
    const allCompleted = task.completedDates || [];
    const completedDays = allCompleted.length + (task.completed && !allCompleted.includes(today) ? 1 : 0);
    const missedDays = Math.max(0, totalDays - completedDays);

    return { completed: completedDays, missed: missedDays };
  }, [task.repeat, task.createdAt, task.completedDates, task.completed]);

  // Pre-computed due date label and overdue status
  const dueDateInfo = useMemo(() => {
    if (task.repeat === 'daily' || !task.date) return null;
    const todayIsoStr = getLocalIsoDate(new Date());
    const tmrObj = new Date(); 
    tmrObj.setDate(tmrObj.getDate() + 1);
    const tomorrowIsoStr = getLocalIsoDate(tmrObj);
    let display = '';
    let overdue = false;

    if (task.date === 'Hari ini' || task.date === 'Hari Ini' || task.date === todayIsoStr) {
      display = lang === 'id' ? 'Hari ini' : 'Today';
    } else if (task.date === 'Besok' || task.date === tomorrowIsoStr) {
      display = lang === 'id' ? 'Besok' : 'Tomorrow';
    } else if (task.date.includes('-')) {
      const dObj = getLocalDateFromStr(task.date);
      display = dObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' });
      if (task.date < todayIsoStr && !task.completed) {
        overdue = true;
      }
    } else {
      display = task.date;
    }
    return { display, overdue: overdue || isOverdue };
  }, [task.repeat, task.date, task.completed, isOverdue, lang]);

  return (
    <div
      className={`px-3.5 py-3 sm:px-4 sm:py-3.5 rounded-2xl flex items-center gap-3 transition-all group border shadow-2xs touch-manipulation ${
        isOrganic 
          ? task.deleted
            ? `${palette.streakCard} ${palette.streakBorder} opacity-60`
            : task.completed
            ? `${palette.taskCardDone} ${palette.taskCardDoneBorder} opacity-75`
            : `${palette.taskCard} ${palette.taskCardBorder} hover:${palette.taskCardHoverBorder} hover:shadow-xs`
          : task.deleted 
          ? "bg-slate-950/40 border-slate-900 opacity-60" 
          : task.completed
          ? "bg-slate-900/40 border-slate-800/60 opacity-75"
          : "bg-slate-900/80 border-slate-800 hover:border-slate-700/80 hover:bg-slate-900"
      }`}
    >
      {/* 1. Custom Tactile Checkbox */}
      {task.deleted ? (
        <div className="flex-none p-1 text-slate-500">
          {is3D ? <Icon3DTrash size={18} /> : <Trash2 className="w-4 h-4" />}
        </div>
      ) : (
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            triggerHaptic('light');
            onToggle(task.id);
          }} 
          className="flex-none p-1 sm:p-1.5 -m-1 sm:-m-0.5 min-w-[38px] min-h-[38px] flex items-center justify-center cursor-pointer focus:outline-none touch-manipulation active:scale-90 transition-transform"
          title={task.completed ? (lang === 'id' ? 'Batal Selesai' : 'Mark Incomplete') : (lang === 'id' ? 'Tandai Selesai' : 'Mark Complete')}
        >
          {is3D ? (
            <div className="flex items-center justify-center">
              {task.completed ? (
                <Icon3DTaskChecked size={22} />
              ) : (
                <Icon3DTaskUnchecked size={22} />
              )}
            </div>
          ) : (
            <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${
              task.completed 
                ? isOrganic
                  ? `${palette.actionBtn} border-transparent text-white shadow-xs`
                  : task.repeat === 'daily'
                  ? 'border-violet-500 bg-violet-500 shadow-sm shadow-violet-500/30'
                  : 'border-indigo-500 bg-indigo-500 shadow-sm shadow-indigo-500/30' 
                : isOrganic
                ? `${palette.streakBorder} ${palette.taskCard} group-hover:border-emerald-500`
                : 'border-slate-700 bg-slate-950/60 group-hover:border-indigo-500/70'
            }`}>
              {task.completed && (
                <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
              )}
            </div>
          )}
        </button>
      )}

      {/* 2. Task Details: Title & Compact Meta Row */}
      <div 
        onClick={() => { if (!task.deleted) onEdit(task); }} 
        className="flex-1 min-w-0 cursor-pointer touch-manipulation"
      >
        <h4 className={`text-xs sm:text-sm font-semibold leading-tight break-words transition-all ${
          task.completed 
            ? `${palette.subText} line-through opacity-70` 
            : `${palette.titleText} group-hover:opacity-90`
        }`}>
          {task.title}
        </h4>

        {/* Minimal Meta Row */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {/* Due Date (for non-daily tasks) */}
          {dueDateInfo && (
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
              dueDateInfo.overdue
                ? 'text-rose-500 bg-rose-500/15 border border-rose-500/25 font-bold'
                : isOrganic 
                ? `${palette.subText} ${palette.streakCard} border ${palette.streakBorder}`
                : 'text-slate-400 bg-slate-800/80 border border-slate-700/50'
            }`}>
              {dueDateInfo.display}
            </span>
          )}

          {/* Alarm Time */}
          {task.alarmTime && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 border ${
              isOrganic 
                ? `${palette.brandText} ${palette.streakCard} border ${palette.streakBorder}`
                : 'text-indigo-300 bg-indigo-500/15 border-indigo-500/20'
            }`}>
              {is3D ? <Icon3DClock size={10} /> : <Bell className="w-2.5 h-2.5 text-indigo-400" />}
              <span>{task.alarmTime}</span>
            </span>
          )}

          {/* Priority Pill */}
          {isHigh && (
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
              isOrganic
                ? 'text-rose-600 bg-rose-500/10 border-rose-500/25'
                : 'text-orange-400 bg-orange-500/10 border-orange-500/25'
            }`}>
              {lang === 'id' ? 'Wajib' : 'High'}
            </span>
          )}
          {isMed && (
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
              isOrganic
                ? `${palette.brandText} ${palette.streakCard} border ${palette.streakBorder}`
                : 'text-blue-400 bg-blue-500/10 border-blue-500/25'
            }`}>
              {lang === 'id' ? 'Sedang' : 'Medium'}
            </span>
          )}

          {/* Daily streak & missed count */}
          {task.repeat === 'daily' && dailyStats && (
            <>
              {dailyStats.completed > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                  isOrganic 
                    ? `${palette.streakCard} ${palette.streakBorder} text-emerald-600` 
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                }`}>
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                  <span>{dailyStats.completed} {lang === 'id' ? 'hari' : 'days'}</span>
                </span>
              )}
              {dailyStats.missed > 0 && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                  isOrganic 
                    ? 'bg-rose-500/10 text-rose-600 border-rose-500/25' 
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                }`}>
                  <span>{dailyStats.missed} {lang === 'id' ? 'terlewat' : 'missed'}</span>
                </span>
              )}
            </>
          )}

          {/* Pinned Tag */}
          {task.pinned && (
            <span className={`text-[9px] font-bold px-1 py-0.5 rounded-md flex items-center border ${
              isOrganic 
                ? `${palette.streakCard} ${palette.streakBorder} text-amber-600` 
                : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
            }`}>
              <Pin className={`w-2.5 h-2.5 ${palette.isDark ? 'fill-amber-400' : 'fill-amber-600'}`} />
            </span>
          )}
        </div>
      </div>

      {/* 3. Action Buttons - Comfortable Touch Targets */}
      <div className="flex items-center gap-1.5 shrink-0">
        {task.deleted ? (
          <>
            <button 
              type="button"
              onClick={(e) => { 
                e.stopPropagation(); 
                triggerHaptic('success');
                if (onRestore) onRestore(task.id); 
              }} 
              className="p-2 min-w-[36px] min-h-[36px] flex items-center justify-center text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl transition-all active:scale-90 cursor-pointer touch-manipulation"
              title={lang === 'id' ? 'Pulihkan' : 'Restore'}
            >
              <Check className="w-4 h-4" />
            </button>
            <button 
              type="button"
              onClick={(e) => { 
                e.stopPropagation(); 
                triggerHaptic('warning');
                onDelete(task.id); 
              }} 
              className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl border transition-all active:scale-90 cursor-pointer touch-manipulation ${
                isOrganic 
                  ? `${palette.streakCard} ${palette.streakBorder} ${palette.subText} hover:text-rose-500` 
                  : 'text-slate-400 hover:text-rose-400 bg-slate-800 border-slate-700'
              }`}
              title={lang === 'id' ? 'Hapus Permanen' : 'Delete Permanently'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            {(task.repeat === 'daily' || task.isDiscipline) && onRestart && (
              <button 
                type="button"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  triggerHaptic('medium');
                  onRestart(task); 
                }} 
                className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl border transition-all active:scale-90 cursor-pointer touch-manipulation ${
                  isOrganic 
                    ? `${palette.subText} hover:text-amber-500 ${palette.streakCard}/50 border-transparent hover:${palette.streakBorder}` 
                    : 'text-slate-500 hover:text-amber-400 bg-slate-800/40 border border-transparent hover:border-slate-700'
                }`}
                title={lang === 'id' ? 'Mulai Ulang dari Awal' : 'Restart from Beginning'}
              >
                {is3D ? <Icon3DRotateCcw size={15} /> : <RotateCcw className="w-3.5 h-3.5" />}
              </button>
            )}
            <button 
              type="button"
              onClick={(e) => { 
                e.stopPropagation(); 
                triggerHaptic('light');
                onPin(task); 
              }} 
              className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl border transition-all active:scale-90 cursor-pointer touch-manipulation ${
                task.pinned 
                  ? isOrganic 
                    ? `${palette.streakCard} ${palette.streakBorder} text-amber-600`
                    : 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                  : isOrganic 
                  ? `${palette.subText} hover:${palette.titleText} ${palette.streakCard}/50 border-transparent hover:${palette.streakBorder}`
                  : 'text-slate-500 hover:text-amber-400 bg-slate-800/40 border-transparent hover:border-slate-700'
              }`}
              title={lang === 'id' ? 'Sematkan' : 'Pin'}
            >
              <Pin className={`w-3.5 h-3.5 ${task.pinned ? (palette.isDark ? 'fill-amber-400' : 'fill-amber-600') : ''}`} />
            </button>
            <button 
              type="button"
              onClick={(e) => { 
                e.stopPropagation(); 
                triggerHaptic('light');
                onDelete(task.id); 
              }} 
              className={`p-2 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl border transition-all active:scale-90 cursor-pointer touch-manipulation ${
                isOrganic 
                  ? `${palette.subText} hover:text-rose-500 ${palette.streakCard}/50 border-transparent hover:${palette.streakBorder}` 
                  : 'text-slate-500 hover:text-rose-400 bg-slate-800/40 border border-transparent hover:border-slate-700'
              }`}
              title={lang === 'id' ? 'Hapus' : 'Delete'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}, (prev, next) => {
  return (
    prev.task === next.task &&
    prev.isDailyView === next.isDailyView &&
    prev.isOverdue === next.isOverdue &&
    prev.appTheme === next.appTheme &&
    prev.isOrganic === next.isOrganic &&
    prev.palette === next.palette &&
    prev.is3D === next.is3D &&
    prev.lang === next.lang
  );
});

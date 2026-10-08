import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Trash2, ClipboardList, Repeat, Bell, X, Target, 
  CheckSquare, Pencil, ChevronRight, Flame, Gift, 
  AlertTriangle, Pin, Check, RotateCcw, ArrowUpDown, 
  ChevronDown, ChevronUp, Clock, Sparkles, CheckCircle2, Calendar as CalendarIcon,
  Filter, MoreHorizontal
} from 'lucide-react';
import { useAppStore } from '../store';
import { useTranslation } from '../translations';
import { Task } from '../types';
import { generateId, parseDateToIso } from '../utils';
import { isSwipeOnInteractiveOrScrollable, MIN_SWIPE_DISTANCE, MIN_SWIPE_RATIO, MAX_SWIPE_TIME_MS } from '../utils/swipeUtils';
import { DisciplineGallery } from '../components/DisciplineGallery';
import { DisciplineView } from '../components/DisciplineView';
import {
  Icon3DNavTasks, Icon3DTarget, Icon3DCalendar, Icon3DFlame,
  Icon3DSparkles, Icon3DCheck, Icon3DTrash, Icon3DClock,
  Icon3DRepeat, Icon3DWarning, Icon3DPlus, Icon3DPin, Icon3DEdit,
  Icon3DGift, Icon3DX, Icon3DCheckSquare, Icon3DRotateCcw, Icon3DClipboard,
  Icon3DChevronRight
} from '../components/home/Organic3DIcons';
import { getOrganicThemePalette, OrganicThemePalette } from '../components/home/organicThemePalettes';

const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    minHeight?: number;
    id?: string;
    onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    autoFocus?: boolean;
  }
>(({ value, onChange, placeholder, disabled, className = '', minHeight = 40, id, onKeyDown, autoFocus }, ref) => {
  const internalRef = React.useRef<HTMLTextAreaElement | null>(null);

  const setRef = React.useCallback(
    (element: HTMLTextAreaElement | null) => {
      internalRef.current = element;
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = element;
      }
    },
    [ref]
  );

  const adjustHeight = React.useCallback(() => {
    const el = internalRef.current;
    if (el) {
      el.style.height = 'auto';
      const targetHeight = Math.max(el.scrollHeight, minHeight);
      el.style.height = `${targetHeight}px`;
    }
  }, [minHeight]);

  React.useEffect(() => {
    adjustHeight();
  }, [value, adjustHeight]);

  return (
    <textarea
      ref={setRef}
      id={id}
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => {
        onChange(e);
        adjustHeight();
      }}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full bg-transparent focus:outline-none resize-none overflow-hidden break-words whitespace-pre-wrap leading-relaxed ${className}`}
      rows={1}
    />
  );
});
AutoResizeTextarea.displayName = 'AutoResizeTextarea';

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

export default function TasksScreen({ appTheme, onNavigate, extra }: { appTheme?: string; onNavigate?: (s: any, extra?: any) => void; extra?: any }) {
  const { tasks, addTask, updateTask, restartTask, deleteTask, restoreTask, emptyTrash, restoreAllTasks, toggleTask, lang, checkInDaily, appVersion, isLiteMode } = useAppStore();
  const isLite = appTheme === 'lite' || appVersion === 'lite' || isLiteMode;
  const isOrganic = !isLite && (appVersion === 'organic' || appVersion === 'pro_max' || appTheme === 'organic');
  const is3D = isOrganic;
  const organicPalette = useMemo(() => getOrganicThemePalette(appTheme), [appTheme]);
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
  const [showCompleted, setShowCompleted] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskToRestart, setTaskToRestart] = useState<Task | null>(null);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>('');
  
  // Modal Form State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'Tinggi' | 'Sedang' | 'Rendah'>('Sedang');
  const [newTaskRepeat, setNewTaskRepeat] = useState<'once' | 'daily'>('once');
  const [newTaskDate, setNewTaskDate] = useState<string>(getLocalIsoDate(new Date()));
  const [newTaskAlarm, setNewTaskAlarm] = useState<string>('');
  const [newTaskIsDiscipline, setNewTaskIsDiscipline] = useState<boolean>(false);
  const [newTaskTargetDate, setNewTaskTargetDate] = useState<string>('');
  const [newTaskReward, setNewTaskReward] = useState<string>('');
  const [newTaskPunishment, setNewTaskPunishment] = useState<string>('');
  const [newTaskMotivation, setNewTaskMotivation] = useState<string>('');
  
  const t = useTranslation(lang);

  const toggleSort = () => {
    const nextSort = sortBy === 'waktu' ? 'level' : 'waktu';
    setSortBy(nextSort);
    try {
      localStorage.setItem('tata_tasks_sort', nextSort);
    } catch(e) {}
  };

  const openEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setNewTaskTitle(task.title);
    setNewTaskPriority(task.priority);
    setNewTaskRepeat(task.repeat || 'once');
    setNewTaskDate(task.date || getLocalIsoDate(new Date()));
    setNewTaskAlarm(task.alarmTime || '');
    setNewTaskIsDiscipline(!!task.isDiscipline);
    if (task.isDiscipline && task.disciplineData) {
      setNewTaskTargetDate(task.disciplineData.targetDate || '');
      setNewTaskReward(task.disciplineData.reward || '');
      setNewTaskPunishment(task.disciplineData.punishment || '');
      setNewTaskMotivation(task.disciplineData.motivation || '');
    } else {
      setNewTaskTargetDate('');
      setNewTaskReward('');
      setNewTaskPunishment('');
      setNewTaskMotivation('');
    }
    setIsAddingTask(true);
  }, []);

  const openNewTaskModal = (type: 'Sekarang' | 'Harian' | 'Disiplin') => {
    setEditingTask(null);
    setNewTaskTitle('');
    setNewTaskPriority('Sedang');
    setNewTaskAlarm('');
    setNewTaskReward('');
    setNewTaskPunishment('');
    setNewTaskMotivation('');
    
    if (type === 'Harian') {
      setNewTaskRepeat('daily');
      setNewTaskIsDiscipline(false);
      setNewTaskDate(getLocalIsoDate(new Date()));
      setNewTaskTargetDate('');
    } else if (type === 'Disiplin') {
      setNewTaskRepeat('daily');
      setNewTaskIsDiscipline(true);
      setNewTaskPriority('Tinggi');
      const today = new Date();
      setNewTaskDate(getLocalIsoDate(today));
      // Default target 30 days ahead
      const target30 = new Date(today);
      target30.setDate(target30.getDate() + 30);
      setNewTaskTargetDate(getLocalIsoDate(target30));
    } else {
      setNewTaskRepeat('once');
      setNewTaskIsDiscipline(false);
      setNewTaskDate(getLocalIsoDate(new Date()));
      setNewTaskTargetDate('');
    }
    setIsAddingTask(true);
  };

  useEffect(() => {
    if (extra?.openNewTask) {
      openNewTaskModal('Sekarang');
    } else if (extra?.openDiscipline) {
      setActiveTab('Disiplin');
      if (extra?.newDiscipline) {
        openNewTaskModal('Disiplin');
      }
    }
  }, [extra]);

  const handleAddTaskSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (newTaskTitle.trim()) {
       if (newTaskAlarm && 'Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
         Notification.requestPermission().catch(() => {});
       }
       
       const now = new Date();
       const currentHour = now.getHours().toString().padStart(2, '0');
       const currentMinute = now.getMinutes().toString().padStart(2, '0');
       const currentTime = `${currentHour}:${currentMinute}`;
       const todayDate = getLocalIsoDate(now);

       const isTodayTask = newTaskDate === 'Hari ini' || newTaskDate.toLowerCase() === 'today' || newTaskDate === todayDate || newTaskRepeat === 'daily';

       if (editingTask) {
         updateTask({
           ...editingTask,
           title: newTaskTitle.trim(),
           priority: newTaskPriority,
           repeat: newTaskRepeat,
           date: newTaskDate,
           alarmTime: newTaskAlarm || undefined,
           isDiscipline: newTaskIsDiscipline,
           disciplineData: newTaskIsDiscipline ? {
             ...(editingTask.disciplineData || {}),
             targetDate: newTaskTargetDate || editingTask.disciplineData?.targetDate,
             reward: newTaskReward || editingTask.disciplineData?.reward,
             punishment: newTaskPunishment || editingTask.disciplineData?.punishment,
             motivation: newTaskMotivation || editingTask.disciplineData?.motivation,
             startDate: editingTask.disciplineData?.startDate || todayDate
           } : undefined
         });
         if (newTaskAlarm && isTodayTask && newTaskAlarm <= currentTime) {
           try { localStorage.setItem(`tata_alarm_${editingTask.id}_${todayDate}`, 'true'); } catch(e){}
         }
       } else {
         const locale = lang === 'en' ? 'en-US' : 'id-ID';
         const newId = generateId();
         addTask({
           id: newId,
           title: newTaskTitle.trim(),
           completed: false,
           priority: newTaskPriority,
           date: newTaskDate,
           createdAt: todayDate,
           time: new Date().toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }),
           repeat: newTaskRepeat,
           alarmTime: newTaskAlarm || undefined,
           isDiscipline: newTaskIsDiscipline,
           disciplineData: newTaskIsDiscipline ? {
             startDate: todayDate,
             targetDate: newTaskTargetDate || undefined,
             reward: newTaskReward || undefined,
             punishment: newTaskPunishment || undefined,
             motivation: newTaskMotivation || undefined,
             dailyCheckins: [],
             usedRestDates: [],
             milestones: [],
             journeyLog: []
           } : undefined
         });
         if (newTaskAlarm && isTodayTask && newTaskAlarm <= currentTime) {
           try { localStorage.setItem(`tata_alarm_${newId}_${todayDate}`, 'true'); } catch(e){}
         }
       }
    }
    setNewTaskTitle('');
    setNewTaskPriority('Sedang');
    setNewTaskRepeat('once');
    setNewTaskDate(getLocalIsoDate(new Date()));
    setNewTaskAlarm('');
    setNewTaskIsDiscipline(false);
    setNewTaskTargetDate('');
    setNewTaskReward('');
    setNewTaskPunishment('');
    setNewTaskMotivation('');
    setIsAddingTask(false);
    setEditingTask(null);
  };

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
    deletedTasks,
    totalActiveTasksCount,
    totalCompletedTasksCount,
    highPriorityCount,
    medPriorityCount,
    lowPriorityCount,
    todayCompletedCount,
    todayScheduledTotal,
    todayCompletionPercent
  } = useMemo(() => {
    const todayStr = getLocalIsoDate(new Date());

    const getTaskDateStr = (t: any) => {
        if (t.date === 'Hari ini' || t.date === 'Hari Ini') return todayStr;
        if (t.date === 'Besok') {
            const tmr = getLocalDateFromStr(todayStr);
            tmr.setDate(tmr.getDate() + 1);
            return getLocalIsoDate(tmr);
        }
        return t.date;
    };

    let allTasksList = [...(tasks || [])].filter(t => t !== null && t !== undefined);
    let activeTasks = allTasksList.filter(t => !t.deleted);
    let delTasks = allTasksList.filter(t => t.deleted);

    // Unfiltered active tasks counts for priority pills
    const activeUnfiltered = allTasksList.filter(t => !t.deleted);
    const highPriorityCount = activeUnfiltered.filter(t => t.priority === 'Tinggi' && !t.completed).length;
    const medPriorityCount = activeUnfiltered.filter(t => t.priority === 'Sedang' && !t.completed).length;
    const lowPriorityCount = activeUnfiltered.filter(t => t.priority === 'Rendah' && !t.completed).length;

    // Apply Priority Filter
    if (priorityFilter !== 'semua') {
      activeTasks = activeTasks.filter(t => t.priority === priorityFilter);
      delTasks = delTasks.filter(t => t.priority === priorityFilter);
    }

    const sortTasks = (taskList: any[]) => {
      return [...taskList].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;

        if (sortBy === 'level') {
          const priorityMap: Record<string, number> = {
            'Tinggi': 3,
            'Sedang': 2,
            'Rendah': 1
          };
          const aPriority = priorityMap[a.priority] || 2;
          const bPriority = priorityMap[b.priority] || 2;
          if (bPriority !== aPriority) {
            return bPriority - aPriority;
          }
        }
        
        const aDate = getTaskDateStr(a) || '';
        const bDate = getTaskDateStr(b) || '';
        if (aDate !== bDate) {
          return aDate.localeCompare(bDate);
        }

        if (a.alarmTime && b.alarmTime) {
          return a.alarmTime.localeCompare(b.alarmTime);
        }
        if (a.alarmTime) return -1;
        if (b.alarmTime) return 1;

        const aTime = a.time || '';
        const bTime = b.time || '';
        return aTime.localeCompare(bTime);
      });
    };

    // 1. TUGAS SEKARANG / SEKALI JALAN (One-time tasks / scheduled)
    const nowTasks = activeTasks.filter(t => t.repeat !== 'daily' && !t.isDiscipline && !t.disciplineData);
    const uncompletedNow = nowTasks.filter(t => !t.completed);
    const completedNow = nowTasks.filter(t => t.completed);

    const isTodayTask = (t: any) => getTaskDateStr(t) === todayStr;
    const isOverdueTask = (t: any) => {
        const d = getTaskDateStr(t);
        return d && d < todayStr;
    };
    const isUpcomingTask = (t: any) => {
        const d = getTaskDateStr(t);
        return d && d > todayStr;
    };
    const isNoDateTask = (t: any) => !t.date;

    const overdueTasks = sortTasks(uncompletedNow.filter(isOverdueTask));
    const todayNowTasks = sortTasks(uncompletedNow.filter(isTodayTask));
    const upcomingTasks = sortTasks(uncompletedNow.filter(isUpcomingTask));
    const noDateTasks = sortTasks(uncompletedNow.filter(isNoDateTask));
    const completedNowTasks = sortTasks(completedNow);

    // 2. TUGAS SETIAP HARI (Daily Routines / Habits)
    const allDailyTasks = activeTasks.filter(t => t.repeat === 'daily' && !t.isDiscipline && !t.disciplineData);
    const dailyPendingTasks = sortTasks(allDailyTasks.filter(t => !t.completed));
    const dailyCompletedTasks = sortTasks(allDailyTasks.filter(t => t.completed));

    // 3. DISIPLIN
    const allDisciplineTasksList = activeTasks.filter(t => t.isDiscipline);
    const disciplineTask = (selectedDisciplineId ? allDisciplineTasksList.find(t => t.id === selectedDisciplineId) : null) || allDisciplineTasksList[0] || tasks.find(t => t.isDiscipline && !t.deleted);

    // 4. DELETED
    const sortedDeleted = sortTasks(delTasks);

    // 5. TODAY PROGRESS CALCULATIONS
    const completedTodayNow = completedNow.filter(isTodayTask);
    const todayCompletedCount = completedTodayNow.length + dailyCompletedTasks.length;
    const todayScheduledTotal = todayNowTasks.length + completedTodayNow.length + allDailyTasks.length;
    const todayCompletionPercent = todayScheduledTotal > 0 
      ? Math.round((todayCompletedCount / todayScheduledTotal) * 100) 
      : (completedNow.length + dailyCompletedTasks.length > 0 ? 100 : 0);

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
      totalActiveTasksCount: uncompletedNow.length + dailyPendingTasks.length,
      totalCompletedTasksCount: completedNow.length + dailyCompletedTasks.length,
      highPriorityCount,
      medPriorityCount,
      lowPriorityCount,
      todayCompletedCount,
      todayScheduledTotal,
      todayCompletionPercent
    };
  }, [tasks, sortBy, priorityFilter, selectedDisciplineId]);

  // Reschedule all overdue tasks to today in 1 tap
  const handleRescheduleAllOverdue = () => {
    const todayStr = getLocalIsoDate(new Date());
    overdueTasks.forEach(task => {
      updateTask({ ...task, date: todayStr });
    });
  };

  const handleSelectExisting = useCallback(() => { 
    setNewTaskIsDiscipline(true); 
    setNewTaskPriority('Tinggi');
    setNewTaskRepeat('daily');
    setNewTaskDate(getLocalIsoDate(new Date()));
    setIsAddingTask(true); 
  }, []);

  const handleEmptyTrash = () => {
    if (deletedTasks.length === 0) return;
    const confirmText = lang === 'id' 
      ? `Hapus permanen semua ${deletedTasks.length} tugas di tempat sampah?` 
      : `Permanently delete all ${deletedTasks.length} tasks in trash?`;
    if (window.confirm(confirmText)) {
      deletedTasks.forEach(t => deleteTask(t.id));
      setShowTrashModal(false);
    }
  };

  const touchStartRef = React.useRef<{ x: number; y: number; time: number; target: HTMLElement | null } | null>(null);

  const handleTasksTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    const target = e.target as HTMLElement | null;
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
      target,
    };
  };

  const handleTasksTouchEnd = (e: React.TouchEvent) => {
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

    if (deltaX < 0) {
      if (activeTab === 'Sekarang') {
        e.stopPropagation();
        setActiveTab('Harian');
      } else if (activeTab === 'Harian') {
        e.stopPropagation();
        setActiveTab('Disiplin');
      }
    } else if (deltaX > 0) {
      if (activeTab === 'Disiplin') {
        e.stopPropagation();
        setActiveTab('Harian');
      } else if (activeTab === 'Harian') {
        e.stopPropagation();
        setActiveTab('Sekarang');
      }
    }
  };

  const dailyProgressPercent = allDailyTasks.length > 0
    ? Math.round((dailyCompletedTasks.length / allDailyTasks.length) * 100)
    : 0;

  return (
    <div 
      className={`flex flex-col h-full font-sans relative select-none ${organicPalette.rootText}`}
      onTouchStart={handleTasksTouchStart}
      onTouchEnd={handleTasksTouchEnd}
    >
      {/* 1. Header Bar: Full-width, Edge-to-edge, Responsive */}
      <header className={`flex-none backdrop-blur-md px-3 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+0.5rem)] pb-2.5 sm:pb-3 z-20 shadow-sm border-b transition-colors ${
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
              {/* Priority Filter Dropdown (Simple & Compact) */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
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
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  )}
                </button>

                {/* Filter Dropdown Popover */}
                {showFilterMenu && (
                  <div 
                    className={`absolute right-0 top-full mt-1.5 w-36 border rounded-2xl shadow-xl p-1 z-50 animate-in fade-in zoom-in-95 duration-150 ${
                      isOrganic 
                        ? `${organicPalette.cardHero} ${organicPalette.cardHeroBorder}` 
                        : 'bg-slate-900 border-slate-800'
                    }`}
                    onClick={() => setShowFilterMenu(false)}
                  >
                    {(['semua', 'Tinggi', 'Sedang', 'Rendah'] as const).map(p => {
                      const label = p === 'semua' ? (lang === 'id' ? 'Semua' : 'All') : p === 'Tinggi' ? (lang === 'id' ? 'Wajib' : 'High') : p === 'Sedang' ? (lang === 'id' ? 'Sedang' : 'Medium') : (lang === 'id' ? 'Rendah' : 'Low');
                      const isSelected = priorityFilter === p;
                      return (
                        <button
                          key={p}
                          onClick={() => {
                            setPriorityFilter(p);
                            setShowFilterMenu(false);
                          }}
                          className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected 
                              ? isOrganic
                                ? `${organicPalette.chipActive} font-bold`
                                : 'bg-indigo-600 text-white font-bold' 
                              : isOrganic
                              ? `${organicPalette.titleText} hover:opacity-80`
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span>{label}</span>
                          {isSelected && <Check className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Sort Toggle */}
              <button
                onClick={toggleSort}
                title={sortBy === 'waktu' ? (lang === 'id' ? 'Urutkan: Waktu' : 'Sort: Time') : (lang === 'id' ? 'Urutkan: Prioritas' : 'Sort: Priority')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                  isOrganic 
                    ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText} hover:opacity-90` 
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                }`}
              >
                {is3D ? <Icon3DClock size={15} /> : <Clock className="w-3.5 h-3.5 text-indigo-400" />}
                <span className="text-[11px] font-medium hidden sm:inline">{sortBy === 'waktu' ? (lang === 'id' ? 'Waktu' : 'Time') : (lang === 'id' ? 'Prioritas' : 'Priority')}</span>
              </button>

              {/* Trash Button */}
              <button
                onClick={() => setShowTrashModal(true)}
                className={`relative p-2 rounded-xl border transition-colors cursor-pointer ${
                  isOrganic 
                    ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText} hover:opacity-90` 
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
                title={lang === 'id' ? 'Tempat Sampah' : 'Trash'}
              >
                {is3D ? <Icon3DTrash size={16} /> : <Trash2 className="w-3.5 h-3.5" />}
                {deletedTasks.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-500 text-white rounded-full text-[8px] font-bold flex items-center justify-center ring-2 ring-slate-950">
                    {deletedTasks.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Segmented Tab Navigation: Sleek & Tactile */}
          <nav aria-label="Task category tabs" className={`flex p-1 rounded-2xl gap-1 relative shadow-inner border ${
            isOrganic 
              ? `${organicPalette.streakCard} ${organicPalette.streakBorder}` 
              : 'bg-slate-950/80 border-slate-800/80'
          }`}>
            <button
              onClick={() => setActiveTab('Sekarang')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                activeTab === 'Sekarang'
                  ? isOrganic 
                    ? `${organicPalette.chipActive} shadow-xs`
                    : 'bg-indigo-600 text-white shadow-md'
                  : isOrganic
                  ? `${organicPalette.subText} hover:${organicPalette.titleText}`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {is3D ? <Icon3DNavTasks size={14} /> : <ClipboardList className="w-3.5 h-3.5" />}
              <span>{lang === 'id' ? 'Sekarang' : 'Now'}</span>
              {activeNowTasksCount > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'Sekarang' 
                    ? 'bg-white/20 text-white' 
                    : isOrganic ? `${organicPalette.streakCard} ${organicPalette.brandText}` : 'bg-slate-800 text-slate-400'
                }`}>
                  {activeNowTasksCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('Harian')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                activeTab === 'Harian'
                  ? isOrganic 
                    ? `${organicPalette.chipActive} shadow-xs`
                    : 'bg-violet-600 text-white shadow-md'
                  : isOrganic
                  ? `${organicPalette.subText} hover:${organicPalette.titleText}`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {is3D ? <Icon3DRepeat size={14} /> : <Repeat className="w-3.5 h-3.5" />}
              <span>{lang === 'id' ? 'Rutinitas' : 'Routines'}</span>
              {dailyPendingTasks.length > 0 ? (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === 'Harian' 
                    ? 'bg-white/20 text-white' 
                    : isOrganic ? `${organicPalette.streakCard} ${organicPalette.brandText}` : 'bg-slate-800 text-slate-400'
                }`}>
                  {dailyPendingTasks.length}
                </span>
              ) : allDailyTasks.length > 0 ? (
                <Check className={`w-3 h-3 ${isOrganic ? 'text-emerald-600' : 'text-emerald-400'}`} />
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab('Disiplin')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer relative ${
                activeTab === 'Disiplin'
                  ? isOrganic 
                    ? `${organicPalette.chipActive} shadow-xs`
                    : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md'
                  : isOrganic
                  ? `${organicPalette.subText} hover:${organicPalette.titleText}`
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {is3D ? <Icon3DTarget size={14} /> : <Target className="w-3.5 h-3.5" />}
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
        {/* TAB 1: TUGAS SEKARANG (One-time, Overdue, Today, Upcoming, Completed)   */}
        {/* ========================================================================= */}
        {activeTab === 'Sekarang' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* OVERDUE ALERT & SECTION */}
            {overdueTasks.length > 0 && (
              <section className={`rounded-2xl p-3 shadow-sm space-y-2.5 border ${
                isOrganic ? 'bg-rose-500/10 border-rose-500/25 text-rose-600' : 'bg-rose-500/10 border-rose-500/25'
              }`}>
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <div className="flex items-center gap-1.5 text-rose-500 font-bold text-xs">
                    {is3D ? <Icon3DWarning size={16} /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />}
                    <span>{lang === 'id' ? `${overdueTasks.length} Terlewat` : `${overdueTasks.length} Overdue`}</span>
                  </div>
                  <button
                    onClick={handleRescheduleAllOverdue}
                    className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-600 dark:text-rose-300 border border-rose-500/30 rounded-xl text-[11px] font-bold transition-all active:scale-95 cursor-pointer flex items-center gap-1"
                  >
                    <span>{t('rescheduleOverdue') || (lang === 'id' ? 'Jadikan Hari Ini' : 'Move to Today')}</span>
                  </button>
                </div>
                <div className={`rounded-xl border overflow-hidden divide-y ${
                  isOrganic ? 'divide-rose-500/20 bg-rose-500/5 border-rose-500/20' : 'divide-rose-500/15 bg-slate-950/60 border-rose-500/15'
                }`}>
                  {overdueTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      isOverdue={true} 
                      appTheme={appTheme}
                      onToggle={toggleTask} 
                      onEdit={openEditTask} 
                      onRestart={setTaskToRestart}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* TODAY'S TASKS SECTION */}
            <section className="space-y-1.5">
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
                <div className={`rounded-2xl divide-y overflow-hidden shadow-sm border ${
                  isOrganic 
                    ? `${organicPalette.taskCard} ${organicPalette.taskCardBorder} ${organicPalette.isDark ? 'divide-slate-800/60' : 'divide-[#EFE8DC]/80'}` 
                    : 'bg-slate-900/80 border-slate-800/80 divide-slate-800/60'
                }`}>
                  {todayNowTasks.map((task) => (
                    <TaskCard key={task.id} task={task} appTheme={appTheme} onToggle={toggleTask} onEdit={openEditTask} onRestart={setTaskToRestart} />
                  ))}
                </div>
              ) : overdueTasks.length === 0 && (
                <div className={`p-5 rounded-2xl border border-dashed text-center ${
                  isOrganic 
                    ? `${organicPalette.taskCard} ${organicPalette.taskCardBorder}` 
                    : 'bg-slate-900/40 border-slate-800/80'
                }`}>
                  <p className={`text-xs font-medium ${organicPalette.subText}`}>
                    {lang === 'id' ? 'Belum ada tugas untuk hari ini.' : 'No tasks scheduled for today.'}
                  </p>
                </div>
              )}
            </section>

            {/* UPCOMING TASKS SECTION */}
            {upcomingTasks.length > 0 && (
              <section className="space-y-1.5">
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
                <div className={`rounded-2xl divide-y overflow-hidden shadow-sm border ${
                  isOrganic 
                    ? `${organicPalette.taskCard} ${organicPalette.taskCardBorder} ${organicPalette.isDark ? 'divide-slate-800/60' : 'divide-[#EFE8DC]/80'}` 
                    : 'bg-slate-900/80 border-slate-800/80 divide-slate-800/60'
                }`}>
                  {upcomingTasks.map((task) => (
                    <TaskCard key={task.id} task={task} appTheme={appTheme} onToggle={toggleTask} onEdit={openEditTask} onRestart={setTaskToRestart} />
                  ))}
                </div>
              </section>
            )}

            {/* NO DATE / ANYTIME TASKS SECTION */}
            {noDateTasks.length > 0 && (
              <section className="space-y-1.5">
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
                <div className={`rounded-2xl divide-y overflow-hidden shadow-sm border ${
                  isOrganic 
                    ? `${organicPalette.taskCard} ${organicPalette.taskCardBorder} ${organicPalette.isDark ? 'divide-slate-800/60' : 'divide-[#EFE8DC]/80'}` 
                    : 'bg-slate-900/80 border-slate-800/80 divide-slate-800/60'
                }`}>
                  {noDateTasks.map((task) => (
                    <TaskCard key={task.id} task={task} appTheme={appTheme} onToggle={toggleTask} onEdit={openEditTask} onRestart={setTaskToRestart} />
                  ))}
                </div>
              </section>
            )}

            {/* COMPLETED TASKS (Collapsible Accordion) */}
            {completedNowTasks.length > 0 && (
              <section className="pt-1">
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className={`w-full flex items-center justify-between py-2 px-3 rounded-xl text-xs font-semibold transition-colors cursor-pointer border ${
                    isOrganic 
                      ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText} hover:opacity-90` 
                      : 'bg-slate-900/40 hover:bg-slate-900/80 border-slate-800/60 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isOrganic ? 'text-emerald-600' : 'text-emerald-400'}`} />
                    <span>{t('completedTasks') || (lang === 'id' ? 'Selesai' : 'Completed')} ({completedNowTasks.length})</span>
                  </div>
                  {showCompleted ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showCompleted && (
                  <div className={`rounded-2xl divide-y overflow-hidden shadow-sm mt-1.5 border ${
                    isOrganic 
                      ? `${organicPalette.taskCard} ${organicPalette.taskCardBorder} ${organicPalette.isDark ? 'divide-slate-800/60' : 'divide-[#EFE8DC]/80'}` 
                      : 'bg-slate-900/60 border-slate-800/60 divide-slate-800/50'
                  }`}>
                    {completedNowTasks.map((task) => (
                      <TaskCard key={task.id} task={task} appTheme={appTheme} onToggle={toggleTask} onEdit={openEditTask} onRestart={setTaskToRestart} />
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* Empty State when no tasks match */}
            {todayNowTasks.length === 0 && overdueTasks.length === 0 && upcomingTasks.length === 0 && noDateTasks.length === 0 && completedNowTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 border ${
                  isOrganic 
                    ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.brandText}` 
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                }`}>
                  {is3D ? <Icon3DNavTasks size={28} /> : <CheckSquare className="w-7 h-7" />}
                </div>
                <h3 className={`text-sm font-bold mb-1 ${organicPalette.titleText}`}>
                  {priorityFilter !== 'semua' 
                    ? (lang === 'id' ? 'Tidak ada tugas dengan prioritas ini' : 'No tasks with this priority')
                    : (lang === 'id' ? 'Semua tugas telah beres!' : 'All tasks are completed!')}
                </h3>
                <p className={`text-xs max-w-xs mb-4 ${organicPalette.subText}`}>
                  {lang === 'id' ? 'Tekan tombol + di bawah untuk mencatat tugas baru.' : 'Tap the + button below to create a new task.'}
                </p>
                <button
                  onClick={() => openNewTaskModal('Sekarang')}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    isOrganic 
                      ? `${organicPalette.actionBtn} shadow-xs` 
                      : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'id' ? 'Tambah Tugas' : 'Add Task'}</span>
                </button>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: TUGAS SETIAP HARI (Daily Routines / Habits)                        */}
        {/* ========================================================================= */}
        {activeTab === 'Harian' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* Daily Habit Progress Hero Card */}
            {allDailyTasks.length > 0 && (
              <div className={`rounded-2xl p-3.5 shadow-sm border ${
                isOrganic 
                  ? `${organicPalette.cardHero} ${organicPalette.cardHeroBorder}` 
                  : 'bg-gradient-to-br from-violet-600/15 via-slate-900 to-slate-900 border-violet-500/20'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${
                      isOrganic 
                        ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.brandText}` 
                        : 'bg-violet-500/20 border-violet-500/30 text-violet-300'
                    }`}>
                      {is3D ? <Icon3DRepeat size={15} /> : <Repeat className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <h3 className={`text-xs font-bold ${
                        organicPalette.titleText
                      }`}>
                        {t('routineProgress') || (lang === 'id' ? 'Progres Rutinitas Harian' : 'Daily Routine Progress')}
                      </h3>
                      <p className={`text-[11px] font-medium ${
                        organicPalette.subText
                      }`}>
                        {dailyCompletedTasks.length} dari {allDailyTasks.length} selesai ({dailyProgressPercent}%)
                      </p>
                    </div>
                  </div>
                  {dailyProgressPercent === 100 && (
                    <span className={`text-xs font-extrabold px-2 py-0.5 rounded-lg flex items-center gap-1 border ${
                      isOrganic 
                        ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30' 
                        : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                    }`}>
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span>{lang === 'id' ? 'Lengkap' : 'Complete'}</span>
                    </span>
                  )}
                </div>

                {/* Smooth Progress Bar */}
                <div className={`w-full h-1.5 rounded-full overflow-hidden border ${
                  isOrganic 
                    ? organicPalette.progressBarTrack 
                    : 'bg-slate-950/80 border-slate-800/80'
                }`}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${dailyProgressPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      dailyProgressPercent === 100 
                        ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' 
                        : isOrganic 
                        ? organicPalette.progressBarFill 
                        : 'bg-violet-500'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* PENDING DAILY ROUTINES */}
            <section className="space-y-1.5">
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
                <div className={`rounded-2xl divide-y overflow-hidden shadow-sm border ${
                  isOrganic 
                    ? `${organicPalette.taskCard} ${organicPalette.taskCardBorder} ${organicPalette.isDark ? 'divide-slate-800/60' : 'divide-[#EFE8DC]/80'}` 
                    : 'bg-slate-900/80 border-slate-800/80 divide-slate-800/60'
                }`}>
                  {dailyPendingTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      isDailyView={true} 
                      appTheme={appTheme}
                      onToggle={toggleTask} 
                      onEdit={openEditTask} 
                      onRestart={setTaskToRestart}
                    />
                  ))}
                </div>
              ) : allDailyTasks.length > 0 ? (
                <div className={`p-3.5 rounded-2xl border text-center ${
                  isOrganic 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300' 
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                }`}>
                  <p className="text-xs font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('allDailyDone') || (lang === 'id' ? 'Semua rutinitas hari ini telah selesai!' : 'All routines completed today!')}</span>
                  </p>
                </div>
              ) : null}
            </section>

            {/* COMPLETED DAILY ROUTINES */}
            {dailyCompletedTasks.length > 0 && (
              <section className="space-y-1.5 pt-1">
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
                <div className={`rounded-2xl divide-y overflow-hidden shadow-sm border ${
                  isOrganic 
                    ? `${organicPalette.taskCard} ${organicPalette.taskCardBorder} ${organicPalette.isDark ? 'divide-slate-800/60' : 'divide-[#EFE8DC]/80'}` 
                    : 'bg-slate-900/60 border-slate-800/60 divide-slate-800/50'
                }`}>
                  {dailyCompletedTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      isDailyView={true} 
                      appTheme={appTheme}
                      onToggle={toggleTask} 
                      onEdit={openEditTask} 
                      onRestart={setTaskToRestart}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Empty State for Daily Habits */}
            {allDailyTasks.length === 0 && (
              <div className="flex flex-col items-center justify-center py-14 px-4 text-center">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 border ${
                  isOrganic 
                    ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.brandText}` 
                    : 'bg-violet-500/10 border-violet-500/20 text-violet-400'
                }`}>
                  {is3D ? <Icon3DRepeat size={28} /> : <Repeat className="w-7 h-7" />}
                </div>
                <h3 className={`text-sm font-bold mb-1 ${
                  organicPalette.titleText
                }`}>
                  {lang === 'id' ? 'Belum Ada Rutinitas Harian' : 'No Daily Routines Yet'}
                </h3>
                <p className={`text-xs max-w-xs mb-4 ${
                  organicPalette.subText
                }`}>
                  {lang === 'id' ? 'Buat kebiasaan harian (misal: Minum Air 2L, Olahraga 15 Menit) yang otomatis di-reset setiap hari.' : 'Create daily habits (e.g. Drink 2L water, 15m exercise) that reset automatically every day.'}
                </p>
                <button
                  onClick={() => openNewTaskModal('Harian')}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    isOrganic 
                      ? `${organicPalette.actionBtn} shadow-xs` 
                      : 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/20'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === 'id' ? 'Buat Rutinitas' : 'Create Routine'}</span>
                </button>
              </div>
            )}

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: FOKUS DISIPLIN (Main Habit Contract / Transformational Goal)       */}
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

      {/* 3. Floating Action Button (FAB) */}
      {!isAddingTask && activeTab !== 'Disiplin' && (
        <motion.button 
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.05 }}
          onClick={() => openNewTaskModal(activeTab)} 
          className={`fixed bottom-22 sm:bottom-8 right-4 sm:right-8 w-13 h-13 rounded-2xl flex items-center justify-center shadow-xl transition-all z-40 cursor-pointer ${
            activeTab === 'Harian'
              ? isOrganic 
                ? 'bg-[#4A6741] hover:bg-[#3D5535] shadow-[#4A6741]/30 text-white'
                : 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/30 text-white'
              : isOrganic
              ? 'bg-[#8C4A1E] hover:bg-[#733C17] shadow-[#8C4A1E]/30 text-white'
              : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30 text-white'
          }`}
          title={lang === 'id' ? 'Tambah Tugas' : 'Add Task'}
        >
          {is3D ? <Icon3DPlus size={24} /> : <Plus className="w-5 h-5 stroke-[2.5]" />}
        </motion.button>
      )}

      {/* 4. Modal Add / Edit Task - Super Responsive (Phone, Tablet, Laptop) */}
      {isAddingTask && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsAddingTask(false);
              setEditingTask(null);
            }
          }}
        >
          <div className={`w-full max-w-lg sm:max-w-xl md:max-w-2xl max-h-[88vh] sm:max-h-[85vh] flex flex-col rounded-3xl shadow-2xl relative animate-in zoom-in-95 duration-200 overflow-hidden border ${
            isOrganic 
              ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText}` 
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}>
            
            {/* Modal Fixed Header */}
            <div className={`px-4 sm:px-6 pt-4 pb-3 flex-shrink-0 border-b relative z-10 ${
              isOrganic 
                ? `${organicPalette.headerBg} ${organicPalette.streakBorder}` 
                : 'bg-slate-900/95 border-slate-800'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {newTaskIsDiscipline ? (
                    <span className={`p-2 rounded-2xl shrink-0 ${isOrganic ? `${organicPalette.cardHero} ${organicPalette.brandText}` : 'bg-orange-500/15 text-orange-400'}`}>
                      {is3D ? <Icon3DTarget size={20} /> : <Target className="w-4 h-4 text-orange-400" />}
                    </span>
                  ) : newTaskRepeat === 'daily' ? (
                    <span className={`p-2 rounded-2xl shrink-0 ${isOrganic ? `${organicPalette.streakCard} ${organicPalette.brandText}` : 'bg-violet-500/15 text-violet-400'}`}>
                      {is3D ? <Icon3DRepeat size={20} /> : <Repeat className="w-4 h-4 text-violet-400" />}
                    </span>
                  ) : (
                    <span className={`p-2 rounded-2xl shrink-0 ${isOrganic ? `${organicPalette.streakCard} ${organicPalette.brandText}` : 'bg-indigo-500/15 text-indigo-400'}`}>
                      {is3D ? <Icon3DNavTasks size={20} /> : <ClipboardList className="w-4 h-4 text-indigo-400" />}
                    </span>
                  )}
                  <h3 className={`text-sm sm:text-base font-extrabold truncate ${organicPalette.titleText}`}>
                    {editingTask 
                      ? (newTaskIsDiscipline 
                          ? (lang === 'id' ? 'Edit Target Disiplin' : 'Edit Discipline Goal')
                          : (lang === 'id' ? 'Edit Tugas' : 'Edit Task'))
                      : (newTaskIsDiscipline 
                          ? (lang === 'id' ? 'Target Disiplin Baru' : 'New Discipline Target')
                          : (lang === 'id' ? 'Tugas Baru' : 'New Task'))}
                  </h3>
                </div>
                <button 
                  type="button"
                  onClick={() => { setIsAddingTask(false); setEditingTask(null); }} 
                  className={`p-2 rounded-full transition-colors cursor-pointer shrink-0 ${
                    isOrganic 
                      ? `hover:opacity-80 ${organicPalette.subText}` 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                  aria-label="Tutup"
                >
                  {is3D ? <Icon3DX size={16} /> : <X className="w-4 h-4" />}
                </button>
              </div>

              {/* Category Selector Tabs inside Header */}
              <div className={`flex gap-1.5 p-1 rounded-2xl border ${
                isOrganic 
                  ? organicPalette.searchContainer 
                  : 'bg-slate-950 border-slate-800'
              }`}>
                <button
                  type="button"
                  onClick={() => {
                    setNewTaskIsDiscipline(false);
                    setNewTaskRepeat('once');
                  }}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !newTaskIsDiscipline && newTaskRepeat === 'once'
                      ? isOrganic 
                        ? `${organicPalette.chipActive} shadow-sm`
                        : 'bg-indigo-600 text-white shadow-md'
                      : isOrganic
                      ? `${organicPalette.subText} hover:opacity-90`
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {is3D ? <Icon3DNavTasks size={14} /> : <ClipboardList className="w-3.5 h-3.5" />}
                  <span className="truncate">{lang === 'id' ? 'Sekali Jalan' : 'One-Time'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewTaskIsDiscipline(false);
                    setNewTaskRepeat('daily');
                  }}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    !newTaskIsDiscipline && newTaskRepeat === 'daily'
                      ? isOrganic
                        ? `${organicPalette.chipActive} shadow-sm`
                        : 'bg-violet-600 text-white shadow-md'
                      : isOrganic
                      ? `${organicPalette.subText} hover:opacity-90`
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {is3D ? <Icon3DRepeat size={14} /> : <Repeat className="w-3.5 h-3.5" />}
                  <span className="truncate">{lang === 'id' ? 'Rutinitas' : 'Daily'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setNewTaskIsDiscipline(true);
                    setNewTaskRepeat('daily');
                    setNewTaskPriority('Tinggi');
                  }}
                  className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    newTaskIsDiscipline
                      ? isOrganic
                        ? `${organicPalette.chipActive} shadow-sm`
                        : 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md'
                      : isOrganic
                      ? `${organicPalette.subText} hover:opacity-90`
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {is3D ? <Icon3DTarget size={14} /> : <Target className="w-3.5 h-3.5" />}
                  <span className="truncate">{lang === 'id' ? 'Disiplin' : 'Discipline'}</span>
                </button>
              </div>
            </div>

            {/* Scrollable Form Body */}
            <form id="task-modal-form" onSubmit={handleAddTaskSubmit} className="flex-1 overflow-y-auto overscroll-contain custom-scrollbar p-4 sm:p-6 space-y-4">
              
              {/* Task Title Input (Always firmly anchored at the top of the form, zero jitter) */}
              <div className="space-y-1.5">
                <label className={`block text-[11px] font-extrabold uppercase tracking-wider ${
                  organicPalette.subText
                }`}>
                  {newTaskIsDiscipline 
                    ? (lang === 'id' ? 'Target Disiplin Utama' : 'Main Discipline Target')
                    : newTaskRepeat === 'daily'
                    ? (lang === 'id' ? 'Judul Rutinitas Harian' : 'Daily Routine Title')
                    : (lang === 'id' ? 'Judul Tugas' : 'Task Title')}
                </label>
                <textarea 
                  rows={2}
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  placeholder={
                    newTaskIsDiscipline 
                      ? (lang === 'id' ? 'Contoh: Bangun jam 05:00 & Lari pagi 20 menit...' : 'Example: Wake up at 5 AM & run 20 mins...') 
                      : newTaskRepeat === 'daily'
                      ? (lang === 'id' ? 'Contoh: Minum air 2L, Olahraga 15 Menit...' : 'Example: Drink 2L water, Workout 15m...')
                      : (t('taskPlaceholder') || (lang === 'id' ? 'Contoh: Selesaikan laporan kantor...' : 'Example: Finish office report...'))
                  }
                  className={`w-full rounded-2xl px-3.5 py-3 text-sm sm:text-base font-medium transition-all focus:outline-none resize-none leading-relaxed border ${
                    isOrganic 
                      ? `${organicPalette.taskCard} ${organicPalette.streakBorder} ${organicPalette.titleText} placeholder:${organicPalette.subText} focus:ring-2 focus:ring-emerald-500/20` 
                      : 'bg-slate-950 border-slate-800 text-slate-100 placeholder:text-slate-500 focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20'
                  }`}
                />
              </div>

              {/* Restart from Beginning Card (Only when editing an existing routine or discipline task) */}
              {editingTask && (newTaskRepeat === 'daily' || newTaskIsDiscipline) && (
                <div className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isOrganic 
                    ? `${organicPalette.quoteCard} ${organicPalette.quoteBorder}`
                    : 'bg-amber-500/10 border-amber-500/25'
                }`}>
                  <div className="space-y-0.5 min-w-0">
                    <h5 className={`text-xs font-bold flex items-center gap-1.5 ${
                      organicPalette.brandText
                    }`}>
                      {is3D ? <Icon3DRotateCcw size={14} /> : <RotateCcw className="w-3.5 h-3.5 text-amber-400" />}
                      <span>{lang === 'id' ? 'Mulai Ulang dari Awal' : 'Restart from Beginning'}</span>
                    </h5>
                    <p className={`text-[10px] leading-relaxed ${
                      organicPalette.subText
                    }`}>
                      {lang === 'id' 
                        ? 'Banyak hari bolong? Reset riwayat dan mulai baru dari hari ini tanpa harus hapus tugas.' 
                        : 'Missed days? Reset history and start fresh from today without deleting.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setTaskToRestart(editingTask);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all active:scale-95 cursor-pointer border ${
                      isOrganic
                        ? 'bg-amber-500 text-white border-amber-500 shadow-sm hover:bg-amber-600'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                    }`}
                  >
                    {lang === 'id' ? 'Ulangi Sekarang' : 'Restart Now'}
                  </button>
                </div>
              )}

              {/* Priority Selector (Only for One-Time & Regular Routine) */}
              {!newTaskIsDiscipline && (
                <div>
                  <span className={`text-[11px] font-bold mb-1.5 block ${
                    organicPalette.subText
                  }`}>{lang === 'id' ? 'Prioritas' : 'Priority'}</span>
                  <div className={`flex gap-1.5 p-1 rounded-xl border ${
                    organicPalette.searchContainer
                  }`}>
                    {(['Rendah', 'Sedang', 'Tinggi'] as const).map(p => {
                      const pLabel = p === 'Tinggi' ? (t('high') || (lang === 'id' ? 'Wajib' : 'High')) : p === 'Sedang' ? (t('medium') || (lang === 'id' ? 'Sedang' : 'Medium')) : (t('low') || (lang === 'id' ? 'Rendah' : 'Low'));
                      const isSelected = newTaskPriority === p;
                      const activeClass = 
                        isSelected 
                          ? isOrganic
                            ? `${organicPalette.chipActive} font-bold shadow-sm`
                            : p === 'Tinggi' ? 'bg-orange-500/25 text-orange-300 font-bold border border-orange-500/40' : p === 'Sedang' ? 'bg-blue-500/25 text-blue-300 font-bold border border-blue-500/40' : 'bg-slate-700/50 text-slate-200 font-bold border border-slate-600/50'
                          : isOrganic
                          ? `${organicPalette.subText} hover:opacity-90`
                          : 'text-slate-400 hover:text-slate-200';
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setNewTaskPriority(p)}
                          className={`flex-1 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${activeClass}`}
                        >
                          {pLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Date & Time Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Due Date with Quick Chips (Only for One-Time Tasks) */}
                {!newTaskIsDiscipline && newTaskRepeat === 'once' && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-bold flex items-center gap-1 ${
                        organicPalette.subText
                      }`}>
                        {is3D ? <Icon3DCalendar size={13} /> : <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />}
                        <span>{lang === 'id' ? 'Tanggal Target' : 'Due Date'}</span>
                      </span>
                      {newTaskDate && (
                        <span className={`text-[10px] font-mono font-bold ${
                          organicPalette.brandText
                        }`}>
                          {newTaskDate}
                        </span>
                      )}
                    </div>

                    {/* Quick Date Chips */}
                    <div className="flex flex-wrap gap-1">
                      {[
                        { label: lang === 'id' ? 'Hari Ini' : 'Today', val: getLocalIsoDate(new Date()) },
                        { 
                          label: lang === 'id' ? 'Besok' : 'Tmrw', 
                          val: getLocalIsoDate(new Date(Date.now() + 86400000)) 
                        },
                        { 
                          label: lang === 'id' ? 'Lusa' : '+2d', 
                          val: getLocalIsoDate(new Date(Date.now() + 86400000 * 2)) 
                        },
                        { 
                          label: lang === 'id' ? 'Sabtu' : 'Sat', 
                          val: (() => {
                            const d = new Date();
                            const day = d.getDay();
                            const diff = (6 - day + 7) % 7 || 7;
                            d.setDate(d.getDate() + diff);
                            return getLocalIsoDate(d);
                          })() 
                        },
                        { 
                          label: lang === 'id' ? '+1 Mgg' : '+1w', 
                          val: getLocalIsoDate(new Date(Date.now() + 86400000 * 7)) 
                        },
                      ].map(chip => {
                        const isSelected = newTaskDate === chip.val;
                        return (
                          <button
                            key={chip.label}
                            type="button"
                            onClick={() => setNewTaskDate(chip.val)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                              isSelected
                                ? isOrganic 
                                  ? `${organicPalette.chipActive} shadow-sm` 
                                  : 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-600/30'
                                : isOrganic
                                ? `${organicPalette.chipInactive} hover:opacity-90`
                                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="date"
                      value={newTaskDate}
                      onChange={e => setNewTaskDate(e.target.value)}
                      style={{ colorScheme: isOrganic ? (organicPalette.isDark ? 'dark' : 'light') : 'dark' }}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none transition-colors cursor-pointer border ${
                        isOrganic 
                          ? `${organicPalette.taskCard} ${organicPalette.streakBorder} ${organicPalette.titleText}` 
                          : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500/60'
                      }`}
                    />
                  </div>
                )}

                {/* Reminder Alarm Time */}
                <div className={newTaskRepeat === 'daily' || newTaskIsDiscipline ? 'sm:col-span-2' : ''}>
                  <span className={`text-[11px] font-bold mb-1 flex items-center gap-1 ${
                    organicPalette.subText
                  }`}>
                    {is3D ? <Icon3DClock size={13} /> : <Bell className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{newTaskRepeat === 'daily' || newTaskIsDiscipline ? (lang === 'id' ? 'Jam Pengingat Harian' : 'Daily Reminder Time') : (lang === 'id' ? 'Jam Pengingat' : 'Reminder Time')}</span>
                  </span>
                  <div className="relative">
                    <input
                      type="time"
                      value={newTaskAlarm}
                      onChange={e => setNewTaskAlarm(e.target.value)}
                      style={{ colorScheme: isOrganic ? (organicPalette.isDark ? 'dark' : 'light') : 'dark' }}
                      className={`w-full rounded-xl pl-3 pr-8 py-2 text-xs font-semibold focus:outline-none transition-colors cursor-pointer border ${
                        isOrganic 
                          ? `${organicPalette.taskCard} ${organicPalette.streakBorder} ${organicPalette.titleText}` 
                          : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-indigo-500/60'
                      }`}
                    />
                    {newTaskAlarm && (
                      <button 
                        type="button" 
                        onClick={() => setNewTaskAlarm('')}
                        className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 cursor-pointer ${
                          isOrganic ? `${organicPalette.streakCard} ${organicPalette.subText} hover:${organicPalette.titleText}` : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Dedicated Discipline Configuration in Modal */}
              {newTaskIsDiscipline && (
                <div className={`space-y-3.5 pt-3 border-t ${organicPalette.streakBorder}`}>
                  
                  {/* Target Date / Duration Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-[11px] font-bold flex items-center gap-1.5 ${
                        organicPalette.brandText
                      }`}>
                        {is3D ? <Icon3DTarget size={14} /> : <Target className="w-3.5 h-3.5 text-orange-400" />}
                        <span>{lang === 'id' ? 'Target Selesai / Durasi Tantangan' : 'Target Date / Challenge Duration'}</span>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        { label: '30 Hari', days: 30 },
                        { label: '60 Hari', days: 60 },
                        { label: '90 Hari', days: 90 },
                        { label: '100 Hari', days: 100 },
                        { label: '1 Tahun', days: 365 },
                      ].map(preset => {
                        const targetD = new Date();
                        targetD.setDate(targetD.getDate() + preset.days);
                        const isoStr = getLocalIsoDate(targetD);
                        const isSelected = newTaskTargetDate === isoStr;
                        return (
                          <button
                            key={preset.days}
                            type="button"
                            onClick={() => setNewTaskTargetDate(isoStr)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer border ${
                              isSelected 
                                ? isOrganic 
                                  ? `${organicPalette.chipActive} shadow-sm` 
                                  : 'bg-orange-500 text-white border-orange-500 shadow-sm' 
                                : isOrganic
                                ? `${organicPalette.chipInactive} hover:opacity-90`
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                    <input
                      type="date"
                      value={newTaskTargetDate}
                      onChange={e => setNewTaskTargetDate(e.target.value)}
                      style={{ colorScheme: isOrganic ? (organicPalette.isDark ? 'dark' : 'light') : 'dark' }}
                      className={`w-full rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none cursor-pointer border ${
                        isOrganic 
                          ? `${organicPalette.taskCard} ${organicPalette.streakBorder} ${organicPalette.titleText}` 
                          : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-orange-500/50'
                      }`}
                    />
                  </div>

                  {/* Reward & Punishment Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Reward (Hadiah Keberhasilan) */}
                    <div className={`rounded-2xl p-3.5 space-y-2 border ${
                      isOrganic 
                        ? `${organicPalette.quoteCard} ${organicPalette.quoteBorder}` 
                        : 'bg-amber-500/10 border-amber-500/25'
                    }`}>
                      <div className={`flex items-center gap-1.5 font-bold text-xs ${
                        organicPalette.brandText
                      }`}>
                        {is3D ? <Icon3DGift size={15} /> : <Gift className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{lang === 'id' ? 'Hadiah Keberhasilan' : 'Success Reward'}</span>
                      </div>
                      <input
                        type="text"
                        value={newTaskReward}
                        onChange={e => setNewTaskReward(e.target.value)}
                        placeholder={lang === 'id' ? 'Contoh: Liburan, Beli sepatu...' : 'Example: Vacation, Buy shoes...'}
                        className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${
                          isOrganic 
                            ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText} placeholder:${organicPalette.subText}` 
                            : 'bg-slate-950/80 border-amber-500/30 text-slate-200 placeholder:text-slate-600 focus:border-amber-400'
                        }`}
                      />
                      <p className={`text-[10px] leading-tight ${
                        organicPalette.subText
                      }`}>
                        {lang === 'id' ? 'Hadiah saat target tercapai.' : 'Reward when target achieved.'}
                      </p>
                    </div>

                    {/* Punishment (Hukuman / Konsekuensi Jika Bolong) */}
                    <div className={`rounded-2xl p-3.5 space-y-2 border ${
                      isOrganic 
                        ? `${organicPalette.quoteCard} ${organicPalette.quoteBorder}` 
                        : 'bg-rose-500/10 border-rose-500/25'
                    }`}>
                      <div className={`flex items-center gap-1.5 font-bold text-xs ${
                        isOrganic ? 'text-rose-500' : 'text-rose-400'
                      }`}>
                        {is3D ? <Icon3DWarning size={15} /> : <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />}
                        <span>{lang === 'id' ? 'Konsekuensi Bolong' : 'Missed Consequence'}</span>
                      </div>
                      <input
                        type="text"
                        value={newTaskPunishment}
                        onChange={e => setNewTaskPunishment(e.target.value)}
                        placeholder={lang === 'id' ? 'Contoh: Push-up 50x, Sedekah...' : 'Example: 50 pushups, Donate...'}
                        className={`w-full rounded-xl px-3 py-2 text-xs focus:outline-none border ${
                          isOrganic 
                            ? `${organicPalette.streakCard} ${organicPalette.streakBorder} ${organicPalette.titleText} placeholder:${organicPalette.subText}` 
                            : 'bg-slate-950/80 border-rose-500/30 text-slate-200 placeholder:text-slate-600 focus:border-rose-400'
                        }`}
                      />
                      <p className={`text-[10px] leading-tight ${
                        organicPalette.subText
                      }`}>
                        {lang === 'id' ? 'Wajib dijalani jika terlewat.' : 'Must execute if missed.'}
                      </p>
                    </div>
                  </div>

                  {/* Strong Reason (Why) */}
                  <div className="space-y-1">
                    <span className={`text-[11px] font-bold block ${
                      organicPalette.subText
                    }`}>
                      {lang === 'id' ? 'Alasan Kuat (Why)' : 'Strong Reason (Why)'}
                    </span>
                    <textarea
                      rows={2}
                      value={newTaskMotivation}
                      onChange={e => setNewTaskMotivation(e.target.value)}
                      placeholder={lang === 'id' ? 'Kenapa target disiplin ini sangat penting bagimu?' : 'Why is this discipline goal important for you?'}
                      className={`w-full rounded-xl p-2.5 text-xs focus:outline-none resize-none leading-relaxed border ${
                        isOrganic 
                          ? `${organicPalette.taskCard} ${organicPalette.streakBorder} ${organicPalette.titleText} placeholder:${organicPalette.subText}` 
                          : 'bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-orange-500/50'
                      }`}
                    />
                  </div>
                </div>
              )}
            </form>

            {/* Modal Fixed Sticky Footer */}
            <div className={`px-4 sm:px-6 py-3.5 flex-shrink-0 border-t flex gap-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] relative z-10 ${
              isOrganic 
                ? `${organicPalette.headerBg} ${organicPalette.streakBorder}` 
                : 'bg-slate-900/95 border-slate-800'
            }`}>
              <button
                type="button"
                onClick={() => { setIsAddingTask(false); setEditingTask(null); }}
                className={`flex-1 py-3 rounded-2xl font-bold text-xs transition-colors cursor-pointer border ${
                  isOrganic 
                    ? `${organicPalette.chipInactive} ${organicPalette.subText}` 
                    : 'border-slate-800 bg-slate-800/80 hover:bg-slate-800 text-slate-300'
                }`}
              >
                {t('cancel') || (lang === 'id' ? 'Batal' : 'Cancel')}
              </button>
              <button
                type="submit"
                form="task-modal-form"
                disabled={!newTaskTitle.trim()}
                className={`flex-1 py-3 rounded-2xl font-bold text-xs transition-all shadow-lg active:scale-95 cursor-pointer ${
                  newTaskTitle.trim()
                    ? isOrganic 
                      ? `${organicPalette.brandBg} shadow-sm` 
                      : newTaskIsDiscipline 
                      ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-orange-500/20 hover:opacity-95'
                      : newTaskRepeat === 'daily'
                      ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-600/20'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                    : isOrganic
                    ? 'opacity-40 cursor-not-allowed bg-slate-400 text-slate-200'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {t('save') || (lang === 'id' ? 'Simpan' : 'Save')}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 5. Trash Modal */}
      {showTrashModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
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
                onClick={() => {
                  setShowTrashModal(false);
                  setConfirmEmptyTrash(false);
                }} 
                className={`p-1 rounded-lg cursor-pointer transition-colors ${
                  isOrganic ? `${organicPalette.subText} hover:${organicPalette.titleText}` : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deletedTasks.length > 0 ? (
              <div className="space-y-3">
                {/* Batch Action Buttons */}
                {!confirmEmptyTrash ? (
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        restoreAllTasks();
                        setShowTrashModal(false);
                      }}
                      className="text-xs text-emerald-500 hover:text-emerald-400 font-bold px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'Pulihkan Semua' : 'Restore All'}</span>
                    </button>
                    <button
                      onClick={() => setConfirmEmptyTrash(true)}
                      className="text-xs text-rose-500 hover:text-rose-400 font-bold px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 transition-colors flex items-center gap-1.5 cursor-pointer"
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
                        onClick={() => setConfirmEmptyTrash(false)}
                        className={`px-2.5 py-1 text-xs rounded-lg cursor-pointer ${
                          isOrganic ? `${organicPalette.chipInactive} ${organicPalette.subText}` : 'bg-slate-800 text-slate-300 hover:text-white'
                        }`}
                      >
                        {lang === 'id' ? 'Batal' : 'Cancel'}
                      </button>
                      <button
                        onClick={() => {
                          emptyTrash();
                          setConfirmEmptyTrash(false);
                          setShowTrashModal(false);
                        }}
                        className="px-3 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg cursor-pointer"
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
                      onToggle={toggleTask} 
                      onEdit={openEditTask} 
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className={`py-8 text-center ${organicPalette.subText}`}>
                <p className="text-xs">{lang === 'id' ? 'Tempat sampah kosong.' : 'Trash is empty.'}</p>
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
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isOrganic ? `${organicPalette.disciplineInner} ${organicPalette.disciplineInnerBorder} ${organicPalette.disciplineSub}` : 'border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation box */}
            <div className={`p-3.5 rounded-2xl border space-y-2 text-xs ${
              isOrganic ? `${organicPalette.disciplineInner} ${organicPalette.disciplineInnerBorder}` : 'bg-slate-950/60 border-slate-800'
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

            {/* Modal Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setTaskToRestart(null)}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-colors cursor-pointer border ${
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
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs text-white transition-all shadow-md active:scale-95 cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600`}
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
// TASK CARD COMPONENT: Ultra Clean, Spacious, High Readability
// =============================================================================
const TaskCard = React.memo<{ 
  task: Task; 
  isDailyView?: boolean;
  isOverdue?: boolean;
  appTheme?: string;
  onToggle: (id: string) => void; 
  onEdit: (task: Task) => void; 
  onRestart?: (task: Task) => void;
}>(({ task, isDailyView, isOverdue, appTheme, onToggle, onEdit, onRestart }) => {
  const isHigh = task.priority === 'Tinggi';
  const isMed = task.priority === 'Sedang';
  const { updateTask, deleteTask, restoreTask, lang, appVersion, isLiteMode } = useAppStore();
  const isLite = appTheme === 'lite' || appVersion === 'lite' || isLiteMode;
  const isOrganic = !isLite && (appVersion === 'organic' || appVersion === 'pro_max' || appTheme === 'organic');
  const palette = useMemo(() => getOrganicThemePalette(appTheme), [appTheme]);
  const is3D = isOrganic;
  const t = useTranslation(lang);

  // Daily task statistics
  let dailyStats: { completed: number; missed: number } | null = null;
  if (task.repeat === 'daily') {
    const today = getLocalIsoDate(new Date());
    const createdDate = parseDateToIso(task.createdAt) || today;
    const start = getLocalDateFromStr(createdDate);
    const end = getLocalDateFromStr(today);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const allCompletedDates = new Set(task.completedDates || []);
    if (task.completed) {
      allCompletedDates.add(today);
    } else {
      allCompletedDates.delete(today);
    }

    let completedDays = 0;
    let missedDays = 0;

    const curr = new Date(start);
    const yesterday = new Date(end);
    yesterday.setDate(yesterday.getDate() - 1);

    while (curr <= yesterday) {
      const curStr = getLocalIsoDate(curr);
      if (allCompletedDates.has(curStr)) {
        completedDays++;
      } else {
        missedDays++;
      }
      curr.setDate(curr.getDate() + 1);
    }
    if (allCompletedDates.has(today)) {
      completedDays++;
    }

    dailyStats = { completed: completedDays, missed: missedDays };
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.12 }}
      className={`px-3 py-2.5 sm:px-4 sm:py-3 flex items-center gap-3 transition-colors group ${
        isOrganic 
          ? task.deleted 
            ? `${palette.streakCard} opacity-70` 
            : `hover:${palette.streakCard}/60`
          : task.deleted 
          ? "bg-slate-950/40 opacity-70" 
          : "hover:bg-slate-800/40"
      }`}
    >
      {/* 1. Custom Tactile Checkbox */}
      {task.deleted ? (
        <div className="flex-none p-1 text-slate-500">
          {is3D ? <Icon3DTrash size={18} /> : <Trash2 className="w-4 h-4" />}
        </div>
      ) : (
        <motion.button 
          whileTap={{ scale: 0.85 }}
          onClick={() => onToggle(task.id)} 
          className="flex-none p-1 -ml-1 cursor-pointer focus:outline-none"
        >
          {is3D ? (
            <div className="flex items-center justify-center">
              {task.completed ? (
                <Icon3DCheck size={20} />
              ) : (
                <div className={`w-5 h-5 rounded-lg border-2 ${isOrganic ? `${palette.streakBorder} ${palette.taskCard} group-hover:border-emerald-500` : 'border-slate-700 bg-slate-900 group-hover:border-cyan-400'} transition-all`} />
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
        </motion.button>
      )}

      {/* 2. Task Details: Title & Compact Meta Row */}
      <div 
        onClick={() => { if (!task.deleted) onEdit(task); }} 
        className="flex-1 min-w-0 cursor-pointer"
      >
        <h4 className={`text-xs sm:text-sm font-semibold leading-tight break-words transition-all ${
          task.completed 
            ? isOrganic ? `${palette.subText} line-through opacity-70` : 'text-slate-500 line-through' 
            : isOrganic ? `${palette.titleText} group-hover:opacity-90` : 'text-slate-100 group-hover:text-white'
        }`}>
          {task.title}
        </h4>

        {/* Minimal Meta Row */}
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {/* Due Date (for non-daily tasks) */}
          {task.repeat !== 'daily' && task.date && (
            (() => {
              const todayIsoStr = getLocalIsoDate(new Date());
              const tmrObj = new Date(); tmrObj.setDate(tmrObj.getDate() + 1);
              const tomorrowIsoStr = getLocalIsoDate(tmrObj);
              let displayDateStr = '';
              let isDateOverdue = false;

              if (task.date === 'Hari ini' || task.date === 'Hari Ini' || task.date === todayIsoStr) {
                displayDateStr = lang === 'id' ? 'Hari ini' : 'Today';
              } else if (task.date === 'Besok' || task.date === tomorrowIsoStr) {
                displayDateStr = lang === 'id' ? 'Besok' : 'Tomorrow';
              } else if (task.date.includes('-')) {
                const dObj = getLocalDateFromStr(task.date);
                displayDateStr = dObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' });
                if (task.date < todayIsoStr && !task.completed) {
                  isDateOverdue = true;
                }
              } else {
                displayDateStr = task.date;
              }

              return (
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${
                  isDateOverdue || isOverdue
                    ? 'text-rose-500 bg-rose-500/15 border border-rose-500/25 font-bold'
                    : isOrganic 
                    ? `${palette.subText} ${palette.streakCard} border ${palette.streakBorder}`
                    : 'text-slate-400 bg-slate-800/80 border border-slate-700/50'
                }`}>
                  {displayDateStr}
                </span>
              );
            })()
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

          {/* Priority Pill (Only High or Medium shown prominently) */}
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
              <Pin className={`w-2.5 h-2.5 ${isOrganic ? 'fill-amber-600' : 'fill-amber-400'}`} />
            </span>
          )}
        </div>
      </div>

      {/* 3. Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {task.deleted ? (
          <>
            <button 
              onClick={(e) => { e.stopPropagation(); restoreTask(task.id); }} 
              className="p-1.5 text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-xl transition-colors cursor-pointer"
              title={lang === 'id' ? 'Pulihkan' : 'Restore'}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} 
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                isOrganic 
                  ? `${palette.streakCard} ${palette.streakBorder} ${palette.subText} hover:text-rose-500` 
                  : 'text-slate-400 hover:text-rose-400 bg-slate-800 border-slate-700'
              }`}
              title={lang === 'id' ? 'Hapus Permanen' : 'Delete Permanently'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            {(task.repeat === 'daily' || task.isDiscipline) && onRestart && (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onRestart(task); }} 
                className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                  isOrganic 
                    ? `${palette.subText} hover:text-amber-500 ${palette.streakCard}/50 border-transparent hover:${palette.streakBorder}` 
                    : 'text-slate-500 hover:text-amber-400 bg-slate-800/40 border border-transparent hover:border-slate-700'
                }`}
                title={lang === 'id' ? 'Mulai Ulang dari Awal' : 'Restart from Beginning'}
              >
                {is3D ? <Icon3DRotateCcw size={14} /> : <RotateCcw className="w-3.5 h-3.5" />}
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); updateTask({ ...task, pinned: !task.pinned }); }} 
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
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
              <Pin className={`w-3.5 h-3.5 ${task.pinned ? (isOrganic ? 'fill-amber-600' : 'fill-amber-400') : ''}`} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} 
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
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
    </motion.div>
  );
});

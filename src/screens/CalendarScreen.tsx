import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Activity, Calendar, CheckCircle2, Clock, X, 
  TrendingUp, Plus, Trash2, Edit2, Check, Sparkles, Laugh, Smile, 
  Meh, Frown, CloudRain, FileText, CalendarDays, Wallet, ArrowDownRight, 
  ArrowUpRight, Target, CheckCircle, AlertCircle, Award
} from 'lucide-react';
import { useAppStore } from '../store';
import { generateId, parseDateToIso, formatDateDisplay } from '../utils';
import { useTranslation } from '../translations';
import { Note, Task } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Icon3DMoodHappy, Icon3DMoodCalm, Icon3DMoodNeutral, Icon3DMoodSad, Icon3DMoodCry,
  Icon3DFlame, Icon3DNavCalendar, Icon3DTaskCheck, Icon3DChartPie, Icon3DClock,
  Icon3DTrash, Icon3DPlus, Icon3DActivity, Icon3DSparkles, Icon3DCheck,
  Icon3DEdit, Icon3DClose, Icon3DNavNotes
} from '../components/home/Organic3DIcons';
import { getOrganicThemePalette } from '../components/home/organicThemePalettes';
import { TaskFormModal, TaskFormData } from '../components/TaskFormModal';
import { CalendarQuickTaskBar } from '../components/CalendarQuickTaskBar';
import { triggerHaptic } from '../utils/sound';

const getLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getLocalDateFromStr = (dateStr: string) => {
  if (!dateStr) return new Date();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
};

interface HabitStats {
  createdStr: string;
  diffDays: number;
  completedCount: number;
  missedCount: number;
  compRate: number;
  hStreak: number;
}

const getHabitStats = (task: any, todayStr: string, getTaskDateStr: (d: string) => string): HabitStats => {
  const rawCreated = task.isDiscipline 
    ? (task.disciplineData?.startDate || task.createdAt || getTaskDateStr(task.date))
    : (task.createdAt || getTaskDateStr(task.date));
  let createdDateObj: Date;
  if (typeof rawCreated === 'number') {
    createdDateObj = new Date(rawCreated);
  } else {
    createdDateObj = getLocalDateFromStr(rawCreated || todayStr);
  }
  const createdStr = getLocalIsoDate(createdDateObj);

  const start = getLocalDateFromStr(createdStr);
  const end = getLocalDateFromStr(todayStr);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  if (start > end) {
    start.setTime(end.getTime());
  }

  const checkinsSet = new Set(
    task.isDiscipline 
      ? [...(task.disciplineData?.dailyCheckins || []), ...(task.disciplineData?.usedRestDates || [])]
      : (task.completedDates || [])
  );
  if (task.completed) {
    checkinsSet.add(todayStr);
  }

  let completedCount = 0;
  let missedCount = 0;
  const curr = new Date(start);
  let loopGuard = 0;
  while (curr <= end && loopGuard < 2000) {
    const curStr = getLocalIsoDate(curr);
    if (checkinsSet.has(curStr)) {
      completedCount++;
    } else {
      missedCount++;
    }
    curr.setDate(curr.getDate() + 1);
    loopGuard++;
  }

  const diffDays = completedCount + missedCount;
  const compRate = diffDays === 0 ? 0 : Math.round((completedCount / diffDays) * 100);

  // Calculate Streak
  let hStreak = 0;
  const isCompletedToday = checkinsSet.has(todayStr);
  const checkDate = new Date(end);
  if (!isCompletedToday) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let sGuard = 0;
  while (sGuard < 1000) {
    const checkStr = getLocalIsoDate(checkDate);
    if (checkinsSet.has(checkStr)) {
      hStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
      sGuard++;
    } else {
      break;
    }
  }

  return {
    createdStr,
    diffDays,
    completedCount,
    missedCount,
    compRate,
    hStreak
  };
};

interface CalendarScreenProps {
  appTheme?: string;
  onOpenNote?: (note: Note) => void;
  onNavigate?: (screen: string, extra?: any) => void;
}

export default function CalendarScreen({ appTheme, onOpenNote, onNavigate }: CalendarScreenProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'calendar' | 'stats'>('calendar');
  const calendarScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (calendarScrollRef.current) {
      calendarScrollRef.current.scrollTop = 0;
    }
  }, [activeTab]);
  const [selectedDetailTaskId, setSelectedDetailTaskId] = useState<string | null>(null);
  const [selectedDetailModalTab, setSelectedDetailModalTab] = useState<'info' | 'analytics'>('info');
  const [habitCalendarDate, setHabitCalendarDate] = useState(new Date());
  const [dailyContentFilter, setDailyContentFilter] = useState<'all' | 'tasks' | 'notes' | 'finance'>('all');
  const [statsTaskFilter, setStatsTaskFilter] = useState<'all' | 'completed' | 'active'>('all');
  const [viewType, setViewType] = useState<'Harian' | 'Mingguan' | 'Bulanan' | 'Tahunan'>('Bulanan');
  
  // Collapse / Expand "Lihat Selengkapnya" states for clean uncluttered layout
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showAllNotes, setShowAllNotes] = useState(false);
  const [showAllFinance, setShowAllFinance] = useState(false);
  const [showAllHabits, setShowAllHabits] = useState(false);

  useEffect(() => {
    setShowAllTasks(false);
    setShowAllNotes(false);
    setShowAllFinance(false);
  }, [selectedDate]);
  
  const { tasks, moods, notes, transactions, lang, streak, setMood, toggleTask, addTask, deleteTask, updateTask, isLiteMode, appVersion } = useAppStore();
  const t = useTranslation(lang);
  const isLite = appTheme === 'lite' || appVersion === 'lite' || isLiteMode;
  const isProMax = (appVersion === 'organic' || appVersion === 'pro_max') && !isLite;
  const isOrganic = !isLite && (isProMax || ['organic', 'pro_max'].includes(appTheme || (typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : '') || ''));
  const is3D = !isLite && (isProMax || appVersion === 'organic' || isOrganic);
  const palette = useMemo(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : null;
    const effectiveTheme = isOrganic ? 'organic' : (appTheme || storedTheme || 'dark');
    return getOrganicThemePalette(effectiveTheme);
  }, [appTheme, isOrganic]);

  useEffect(() => {
    if (isLiteMode && activeTab !== 'calendar') {
      setActiveTab('calendar');
    }
  }, [isLiteMode, activeTab]);

  // Task Modal state (Isolated 0ms latency full options)
  const [isAddingModalTask, setIsAddingModalTask] = useState(false);
  const [editingModalTask, setEditingModalTask] = useState<Task | null>(null);

  const selectedDetailTask = useMemo(() => {
    return tasks.find(tk => tk.id === selectedDetailTaskId) || null;
  }, [tasks, selectedDetailTaskId]);

  const locale = lang === 'en' ? 'en-US' : 'id-ID';
  
  const monthNames = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(2023, i, 1);
      const name = d.toLocaleDateString(locale, { month: 'long' });
      return name.charAt(0).toUpperCase() + name.slice(1);
    });
  }, [locale]);

  const daysOfWeek = useMemo(() => {
    return lang === 'id' 
      ? ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
      : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  }, [lang]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  
  const blanks = Array(firstDayOfMonth).fill(null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const selectedDateStr = getLocalIsoDate(selectedDate);
  const todayStr = getLocalIsoDate(new Date());
  
  const tmr = new Date();
  tmr.setDate(tmr.getDate() + 1);
  const tomorrowStr = getLocalIsoDate(tmr);

  const getTaskDateStr = (dateVal?: string | null) => {
     if (!dateVal) return '';
     return parseDateToIso(dateVal);
  };

  const isTaskActiveOnDate = (task: Task, dateStr: string, curTodayStr: string): boolean => {
    if (!task || task.deleted) return false;
    const tDateStr = parseDateToIso(task.date);
    const createdDateStr = parseDateToIso(task.createdAt) || tDateStr || curTodayStr;

    if (task.isDiscipline) {
      if (task.disciplineData?.dailyCheckins?.includes(dateStr)) return true;
      const targetDateStr = task.disciplineData?.targetDate ? parseDateToIso(task.disciplineData.targetDate) : null;
      if (targetDateStr) {
        return dateStr >= createdDateStr && dateStr <= targetDateStr;
      }
      return dateStr >= createdDateStr;
    }

    if (task.repeat === 'daily') {
      if (task.completedDates?.includes(dateStr)) return true;
      return dateStr >= createdDateStr;
    }

    return tDateStr === dateStr;
  };

  const isTaskDoneOnDate = (task: Task, dateStr: string, curTodayStr: string): boolean => {
    if (!task) return false;
    if (task.isDiscipline) {
      return Boolean(task.disciplineData?.dailyCheckins?.includes(dateStr));
    }
    if (task.repeat === 'daily') {
      return Boolean(task.completedDates?.includes(dateStr) || (dateStr === curTodayStr && task.completed));
    }
    return Boolean(task.completed || task.completedDates?.includes(dateStr));
  };

  // Map of date string to task statistics for calendar cell indicators
  const tasksByDateMap = useMemo(() => {
    const map: Record<string, { total: number; completed: number }> = {};
    const tYear = currentDate.getFullYear();
    const tMonth = currentDate.getMonth();
    const numDays = getDaysInMonth(tYear, tMonth);

    for (let day = 1; day <= numDays; day++) {
      const dateObj = new Date(tYear, tMonth, day);
      const dateStr = getLocalIsoDate(dateObj);
      
      let total = 0;
      let completed = 0;

      (tasks || []).forEach(t => {
        if (isTaskActiveOnDate(t, dateStr, todayStr)) {
          total++;
          if (isTaskDoneOnDate(t, dateStr, todayStr)) {
            completed++;
          }
        }
      });

      map[dateStr] = { total, completed };
    }

    return map;
  }, [tasks, currentDate, todayStr]);

  // Map of date string to note counts for calendar cell indicators
  const notesByDateMap = useMemo(() => {
    const map: Record<string, number> = {};
    (notes || []).forEach(n => {
      if (!n || n.isArchived) return;
      const nDate = parseDateToIso(n.date);
      if (nDate) {
        map[nDate] = (map[nDate] || 0) + 1;
      }
    });
    return map;
  }, [notes]);

  // Map of date string to transactions for calendar indicators
  const transactionsByDateMap = useMemo(() => {
    const map: Record<string, { count: number; income: number; expense: number }> = {};
    (transactions || []).forEach(tx => {
      if (!tx || !tx.date) return;
      const txDate = parseDateToIso(tx.date);
      if (txDate) {
        if (!map[txDate]) {
          map[txDate] = { count: 0, income: 0, expense: 0 };
        }
        map[txDate].count += 1;
        if (tx.type === 'income') {
          map[txDate].income += Number(tx.amount) || 0;
        } else if (tx.type === 'expense') {
          map[txDate].expense += Number(tx.amount) || 0;
        }
      }
    });
    return map;
  }, [transactions]);

  const handlePrevMonth = () => {
    const prev = new Date(currentYear, currentMonth - 1, 1);
    setCurrentDate(prev);
    setSelectedDate(prev);
  };

  const handleNextMonth = () => {
    const next = new Date(currentYear, currentMonth + 1, 1);
    setCurrentDate(next);
    setSelectedDate(next);
  };

  const isTodayDate = (day: number) => {
    const today = new Date();
    return day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
  };

  const isSelectedDate = (day: number) => {
    return day === selectedDate.getDate() && currentMonth === selectedDate.getMonth() && currentYear === selectedDate.getFullYear();
  };

  const agendaSectionRef = useRef<HTMLDivElement>(null);

  const handleSelectDay = (day: number) => {
    triggerHaptic('light');
    setSelectedDate(new Date(currentYear, currentMonth, day));
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && agendaSectionRef.current) {
      setTimeout(() => {
        agendaSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  };

  const handlePrevDay = () => {
    triggerHaptic('light');
    const prev = new Date(selectedDate);
    prev.setDate(prev.getDate() - 1);
    setSelectedDate(prev);
    if (prev.getMonth() !== currentMonth || prev.getFullYear() !== currentYear) {
      setCurrentDate(new Date(prev.getFullYear(), prev.getMonth(), 1));
    }
  };

  const handleNextDay = () => {
    triggerHaptic('light');
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + 1);
    setSelectedDate(next);
    if (next.getMonth() !== currentMonth || next.getFullYear() !== currentYear) {
      setCurrentDate(new Date(next.getFullYear(), next.getMonth(), 1));
    }
  };

  const handleJumpToday = () => {
    triggerHaptic('medium');
    const now = new Date();
    setSelectedDate(now);
    setCurrentDate(now);
  };

  const handlePrevPeriod = () => {
    if (viewType === 'Harian') {
      const prev = new Date(selectedDate);
      prev.setDate(prev.getDate() - 1);
      setSelectedDate(prev);
      setCurrentDate(prev);
    } else if (viewType === 'Mingguan') {
      const prev = new Date(selectedDate);
      prev.setDate(prev.getDate() - 7);
      setSelectedDate(prev);
      setCurrentDate(prev);
    } else if (viewType === 'Bulanan') {
      const prev = new Date(selectedDate);
      prev.setMonth(prev.getMonth() - 1);
      setSelectedDate(prev);
      setCurrentDate(prev);
    } else if (viewType === 'Tahunan') {
      const prev = new Date(selectedDate);
      prev.setFullYear(prev.getFullYear() - 1);
      setSelectedDate(prev);
      setCurrentDate(prev);
    }
  };

  const handleNextPeriod = () => {
    if (viewType === 'Harian') {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + 1);
      setSelectedDate(next);
      setCurrentDate(next);
    } else if (viewType === 'Mingguan') {
      const next = new Date(selectedDate);
      next.setDate(next.getDate() + 7);
      setSelectedDate(next);
      setCurrentDate(next);
    } else if (viewType === 'Bulanan') {
      const next = new Date(selectedDate);
      next.setMonth(next.getMonth() + 1);
      setSelectedDate(next);
      setCurrentDate(next);
    } else if (viewType === 'Tahunan') {
      const next = new Date(selectedDate);
      next.setFullYear(next.getFullYear() + 1);
      setSelectedDate(next);
      setCurrentDate(next);
    }
  };

  const handleOpenNewModalTask = useCallback(() => {
    triggerHaptic('light');
    setEditingModalTask(null);
    setIsAddingModalTask(true);
  }, []);

  const handleOpenEditModalTask = useCallback((task: Task) => {
    triggerHaptic('light');
    setEditingModalTask(task);
    setIsAddingModalTask(true);
  }, []);

  const handleSaveModalTask = useCallback((formData: TaskFormData) => {
    triggerHaptic('medium');
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMinute = now.getMinutes().toString().padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}`;
    const todayDate = getLocalIsoDate(now);

    if (editingModalTask) {
      updateTask({
        ...editingModalTask,
        title: formData.title,
        priority: formData.priority,
        repeat: formData.repeat,
        date: formData.date,
        alarmTime: formData.alarmTime || undefined,
        isDiscipline: formData.isDiscipline,
        disciplineData: formData.isDiscipline ? {
          ...(editingModalTask.disciplineData || {}),
          targetDate: formData.targetDate || editingModalTask.disciplineData?.targetDate,
          reward: formData.reward || editingModalTask.disciplineData?.reward,
          punishment: formData.punishment || editingModalTask.disciplineData?.punishment,
          motivation: formData.motivation || editingModalTask.disciplineData?.motivation,
          startDate: editingModalTask.disciplineData?.startDate || todayDate
        } : undefined
      });
    } else {
      addTask({
        id: generateId(),
        title: formData.title,
        completed: false,
        priority: formData.priority,
        repeat: formData.repeat,
        date: formData.date || selectedDateStr,
        createdAt: todayDate,
        time: formData.alarmTime || currentTime,
        alarmTime: formData.alarmTime || undefined,
        isDiscipline: formData.isDiscipline,
        disciplineData: formData.isDiscipline ? {
          targetDate: formData.targetDate,
          reward: formData.reward,
          punishment: formData.punishment,
          motivation: formData.motivation,
          startDate: todayDate,
          dailyCheckins: [],
          usedRestDates: []
        } : undefined
      });
    }
    setIsAddingModalTask(false);
    setEditingModalTask(null);
  }, [editingModalTask, selectedDateStr, updateTask, addTask]);

  const handleQuickAddFromBar = useCallback((taskData: {
    title: string;
    time: string;
    priority: 'Tinggi' | 'Sedang' | 'Rendah';
  }) => {
    addTask({
      id: generateId(),
      title: taskData.title,
      completed: false,
      priority: taskData.priority,
      date: selectedDateStr,
      createdAt: todayStr,
      time: taskData.time || '09:00',
      repeat: 'once',
    });
  }, [addTask, selectedDateStr, todayStr]);

  const handleCreateNoteForSelectedDay = () => {
    const newNote: Note = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : generateId(),
      title: '',
      content: '',
      date: selectedDateStr,
      tags: []
    };
    if (onOpenNote) {
      onOpenNote(newNote);
    } else if (onNavigate) {
      onNavigate('note-editor', newNote);
    }
  };

  const dayTasks = useMemo(() => {
    return (tasks || []).filter(t => isTaskActiveOnDate(t, selectedDateStr, todayStr));
  }, [tasks, selectedDateStr, todayStr]);

  const dayNotes = useMemo(() => {
    return (notes || []).filter(note => {
      if (!note || note.isArchived) return false;
      return parseDateToIso(note.date) === selectedDateStr;
    });
  }, [notes, selectedDateStr]);

  const dayTransactions = useMemo(() => {
    return (transactions || []).filter(tx => {
      if (!tx || !tx.date) return false;
      return parseDateToIso(tx.date) === selectedDateStr;
    });
  }, [transactions, selectedDateStr]);

  const dayIncome = useMemo(() => {
    return dayTransactions
      .filter(tx => tx.type === 'income')
      .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
  }, [dayTransactions]);

  const dayExpense = useMemo(() => {
    return dayTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((acc, tx) => acc + (Number(tx.amount) || 0), 0);
  }, [dayTransactions]);

  const { selectedTasks, startOfWeek, endOfWeek } = useMemo(() => {
    const todayDate = new Date();
    const startOfWeek = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0, 0);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day;
    startOfWeek.setDate(diff);
    
    const endOfWeek = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate(), 23, 59, 59, 999);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const sTasks = tasks.filter(t => {
       if (viewType === 'Harian') {
         return isTaskActiveOnDate(t, selectedDateStr, todayStr);
       }

       const tDateStr = getTaskDateStr(t.date);
       if (!tDateStr || !tDateStr.includes('-')) return false;
       
       const createdDateStr = parseDateToIso(t.createdAt) || tDateStr;
       
       const [y, m, d] = tDateStr.split('-').map(Number);
       const tD = new Date(y, m - 1, d, 12, 0, 0, 0);
       const [cy, cm, cd] = createdDateStr.split('-').map(Number);
       const cD = new Date(cy, cm - 1, cd, 12, 0, 0, 0);

       if (t.deleted) {
         return false;
       }

       if (viewType === 'Mingguan') {
         if (t.repeat === 'daily' || t.isDiscipline) return startOfWeek <= todayDate && endOfWeek >= cD;
         return tD >= startOfWeek && tD <= endOfWeek;
       } else if (viewType === 'Bulanan') {
         if (t.repeat === 'daily' || t.isDiscipline) {
           const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1, 0, 0, 0, 0);
           const monthEnd = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0, 23, 59, 59, 999);
           return monthStart <= todayDate && monthEnd >= cD;
         }
         return tD.getMonth() === selectedDate.getMonth() && tD.getFullYear() === selectedDate.getFullYear();
       } else if (viewType === 'Tahunan') {
         if (t.repeat === 'daily' || t.isDiscipline) {
           const yearStart = new Date(selectedDate.getFullYear(), 0, 1, 0, 0, 0, 0);
           const yearEnd = new Date(selectedDate.getFullYear(), 11, 31, 23, 59, 59, 999);
           return yearStart <= todayDate && yearEnd >= cD;
         }
         return tD.getFullYear() === selectedDate.getFullYear();
       }
       return false;
    });
    
    return { selectedTasks: sTasks, startOfWeek, endOfWeek };
  }, [tasks, selectedDate, viewType, selectedDateStr, todayStr, tomorrowStr, getTaskDateStr]);

  const { completedCount, activeCount } = useMemo(() => {
    let completed = 0;
    let active = 0;

    if (viewType === 'Harian') {
      selectedTasks.forEach(tk => {
        if (tk.isDiscipline) {
          const checkins = tk.disciplineData?.dailyCheckins || [];
          if (checkins.includes(selectedDateStr)) {
            completed++;
          } else {
            if (!tk.deleted) active++;
          }
        } else if (tk.repeat === 'daily') {
          const compDates = tk.completedDates || [];
          if (compDates.includes(selectedDateStr)) {
            completed++;
          } else {
            if (selectedDateStr === todayStr) {
               if (tk.completed) completed++;
               else { if (!tk.deleted) active++; }
            } else {
               if (!tk.deleted) active++;
            }
          }
        } else {
          if (tk.completed) {
            completed++;
          } else {
            if (!tk.deleted) active++;
          }
        }
      });
    } else {
      let startDate: Date;
      let endDate: Date;

      if (viewType === 'Mingguan') {
        startDate = new Date(startOfWeek);
        endDate = new Date(endOfWeek);
      } else if (viewType === 'Bulanan') {
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      } else {
        startDate = new Date(selectedDate.getFullYear(), 0, 1);
        endDate = new Date(selectedDate.getFullYear(), 11, 31);
      }

      const currentIter = new Date(startDate);
      const capDateStr = todayStr;
      const maxDays = viewType === 'Tahunan' ? 366 : (viewType === 'Bulanan' ? 31 : 7);
      let daysCounted = 0;

      while (currentIter <= endDate && daysCounted < maxDays) {
        const iterStr = getLocalIsoDate(currentIter);
        
        if (iterStr <= capDateStr) {
          selectedTasks.forEach(tk => {
            const tDateStr = getTaskDateStr(tk.date);
            const createdDateStr = tk.createdAt || tDateStr;

            if (iterStr < createdDateStr) {
              return;
            }

            const isDeletedNow = tk.deleted && tk.deletedAt && iterStr > tk.deletedAt;

            if (tk.isDiscipline) {
              const checkins = tk.disciplineData?.dailyCheckins || [];
              if (checkins.includes(iterStr)) {
                completed++;
              } else {
                if (!isDeletedNow) active++;
              }
            } else if (tk.repeat === 'daily') {
              const compDates = tk.completedDates || [];
              if (compDates.includes(iterStr)) {
                completed++;
              } else {
                if (iterStr === todayStr) {
                  if (tk.completed) completed++;
                  else { if (!isDeletedNow) active++; }
                } else {
                  if (!isDeletedNow) active++;
                }
              }
            } else {
              if (tDateStr === iterStr) {
                if (tk.completed) {
                  completed++;
                } else {
                  if (!isDeletedNow) active++;
                }
              }
            }
          });
        }
        currentIter.setDate(currentIter.getDate() + 1);
        daysCounted++;
      }
    }

    return { completedCount: completed, activeCount: active };
  }, [selectedTasks, viewType, selectedDate, selectedDateStr, startOfWeek, endOfWeek, todayStr, getTaskDateStr]);

  const priorityStats = useMemo(() => {
    let highCompleted = 0, highTotal = 0;
    let medCompleted = 0, medTotal = 0;
    let lowCompleted = 0, lowTotal = 0;

    if (viewType === 'Harian') {
      selectedTasks.forEach(tk => {
        const prio = tk.priority || 'Sedang';
        let isDone = false;
        let isAct = false;

        if (tk.isDiscipline) {
          const checkins = tk.disciplineData?.dailyCheckins || [];
          if (checkins.includes(selectedDateStr)) isDone = true;
          else if (!tk.deleted) isAct = true;
        } else if (tk.repeat === 'daily') {
          const compDates = tk.completedDates || [];
          if (compDates.includes(selectedDateStr)) isDone = true;
          else if (selectedDateStr === todayStr && tk.completed) isDone = true;
          else if (!tk.deleted) isAct = true;
        } else {
          if (tk.completed) isDone = true;
          else if (!tk.deleted) isAct = true;
        }

        if (isDone) {
          if (prio === 'Tinggi') highCompleted++;
          else if (prio === 'Sedang') medCompleted++;
          else lowCompleted++;
        }
        if (isDone || isAct) {
          if (prio === 'Tinggi') highTotal++;
          else if (prio === 'Sedang') medTotal++;
          else lowTotal++;
        }
      });
    } else {
      let startDate: Date;
      let endDate: Date;

      if (viewType === 'Mingguan') {
        startDate = new Date(startOfWeek);
        endDate = new Date(endOfWeek);
      } else if (viewType === 'Bulanan') {
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      } else {
        startDate = new Date(selectedDate.getFullYear(), 0, 1);
        endDate = new Date(selectedDate.getFullYear(), 11, 31);
      }

      const currentIter = new Date(startDate);
      const capDateStr = todayStr;
      const maxDays = viewType === 'Tahunan' ? 366 : (viewType === 'Bulanan' ? 31 : 7);
      let daysCounted = 0;

      while (currentIter <= endDate && daysCounted < maxDays) {
        const iterStr = getLocalIsoDate(currentIter);
        if (iterStr <= capDateStr) {
          selectedTasks.forEach(tk => {
            const tDateStr = getTaskDateStr(tk.date);
            const createdDateStr = tk.createdAt || tDateStr;
            if (iterStr >= createdDateStr) {
              const isDeletedNow = tk.deleted && tk.deletedAt && iterStr > tk.deletedAt;
              const prio = tk.priority || 'Sedang';
              
              let isCompleted = false;
              let isActive = false;

              if (tk.isDiscipline) {
                const checkins = tk.disciplineData?.dailyCheckins || [];
                if (checkins.includes(iterStr)) {
                  isCompleted = true;
                } else {
                  if (!isDeletedNow) isActive = true;
                }
              } else if (tk.repeat === 'daily') {
                const compDates = tk.completedDates || [];
                if (compDates.includes(iterStr)) {
                  isCompleted = true;
                } else {
                  if (iterStr === todayStr) {
                    if (tk.completed) isCompleted = true;
                    else { if (!isDeletedNow) isActive = true; }
                  } else {
                    if (!isDeletedNow) isActive = true;
                  }
                }
              } else {
                if (tDateStr === iterStr) {
                  if (tk.completed) {
                    isCompleted = true;
                  } else {
                    if (!isDeletedNow) isActive = true;
                  }
                }
              }

              if (isCompleted) {
                if (prio === 'Tinggi') highCompleted++;
                else if (prio === 'Sedang') medCompleted++;
                else lowCompleted++;
              }
              if (isCompleted || isActive) {
                if (prio === 'Tinggi') highTotal++;
                else if (prio === 'Sedang') medTotal++;
                else lowTotal++;
              }
            }
          });
        }
        currentIter.setDate(currentIter.getDate() + 1);
        daysCounted++;
      }
    }

    return {
      high: { completed: highCompleted, total: highTotal, rate: highTotal > 0 ? Math.round((highCompleted / highTotal) * 100) : 0 },
      medium: { completed: medCompleted, total: medTotal, rate: medTotal > 0 ? Math.round((medCompleted / medTotal) * 100) : 0 },
      low: { completed: lowCompleted, total: lowTotal, rate: lowTotal > 0 ? Math.round((lowCompleted / lowTotal) * 100) : 0 },
    };
  }, [selectedTasks, viewType, selectedDate, selectedDateStr, startOfWeek, endOfWeek, todayStr, getTaskDateStr]);

  const monthlyMoodStats = useMemo(() => {
    const targetMonth = selectedDate.getMonth();
    const targetYear = selectedDate.getFullYear();
    
    const monthlyMoods = (moods || []).filter(m => {
      if (!m || !m.date || !m.mood) return false;
      const d = getLocalDateFromStr(m.date);
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    if (monthlyMoods.length === 0) {
      return null;
    }

    const counts = {
      excellent: 0,
      good: 0,
      neutral: 0,
      bad: 0,
      terrible: 0
    };

    monthlyMoods.forEach(m => {
      if (m.mood && m.mood in counts) {
        counts[m.mood as keyof typeof counts]++;
      }
    });

    const totalMoodDays = monthlyMoods.length;

    const moodScores: Record<string, number> = {
      excellent: 5,
      good: 4,
      neutral: 3,
      bad: 2,
      terrible: 1
    };

    const totalScore = monthlyMoods.reduce((sum, m) => sum + (moodScores[m.mood as string] || 3), 0);
    const averageScore = totalScore / totalMoodDays;

    let averageDetails;
    if (averageScore >= 4.5) {
      averageDetails = { 
        label: lang === 'id' ? 'Sangat Baik' : 'Excellent', 
        id: 'excellent', 
        color: 'text-emerald-400',
        advice: lang === 'id' 
          ? 'Luar biasa! Bulan ini dipenuhi energi positif. Pertahankan kebiasaan dan keseimbangan hebat ini!' 
          : 'Outstanding! This month is filled with positive energy. Keep up this wonderful balance!'
      };
    } else if (averageScore >= 3.5) {
      averageDetails = { 
        label: lang === 'id' ? 'Baik' : 'Good', 
        id: 'good', 
        color: 'text-teal-400',
        advice: lang === 'id' 
          ? 'Bulan yang cukup tenang dan produktif. Terus rawat kebiasaan sehatmu!' 
          : 'A calm and productive month. Continue nurturing your healthy habits!'
      };
    } else if (averageScore >= 2.5) {
      averageDetails = { 
        label: lang === 'id' ? 'Biasa' : 'Neutral', 
        id: 'neutral', 
        color: 'text-indigo-400',
        advice: lang === 'id' 
          ? 'Mood stabil. Luangkan waktu untuk istirahat sejenak atau selipkan aktivitas menyenangkan di sela rutinitas.' 
          : 'Stable mood. Make time for a short break or introduce an enjoyable activity into your routine.'
      };
    } else if (averageScore >= 1.5) {
      averageDetails = { 
        label: lang === 'id' ? 'Kurang Baik' : 'Low', 
        id: 'bad', 
        color: 'text-amber-400',
        advice: lang === 'id' 
          ? 'Tampaknya ada cukup banyak beban pikiran. Kurangi tekanan berlebih dan prioritaskan pemulihan tenaga.' 
          : 'Seems like there is a bit of mental load. Take things easy and prioritize recovery.'
      };
    } else {
      averageDetails = { 
        label: lang === 'id' ? 'Sangat Berat' : 'Tough', 
        id: 'terrible', 
        color: 'text-rose-400',
        advice: lang === 'id' 
          ? 'Kamu sedang melalui masa yang menantang. Jangan ragu beristirahat total dan ceritakan pada orang terdekat.' 
          : 'You are navigating a challenging time. Rest thoroughly and reach out to someone you trust.'
      };
    }

    return {
      totalMoodDays,
      counts,
      averageScore,
      averageDetails
    };
  }, [moods, selectedDate, lang]);

  const getMoodIcon = (id: string, className = "w-5 h-5") => {
    if (is3D) {
      switch (id) {
        case 'excellent': return <Icon3DMoodHappy size={22} className="inline-block" />;
        case 'good': return <Icon3DMoodCalm size={22} className="inline-block" />;
        case 'neutral': return <Icon3DMoodNeutral size={22} className="inline-block" />;
        case 'bad': return <Icon3DMoodSad size={22} className="inline-block" />;
        case 'terrible': return <Icon3DMoodCry size={22} className="inline-block" />;
        default: return null;
      }
    }
    switch (id) {
      case 'excellent': return <Laugh className={className} strokeWidth={2.2} />;
      case 'good': return <Smile className={className} strokeWidth={2.2} />;
      case 'neutral': return <Meh className={className} strokeWidth={2.2} />;
      case 'bad': return <Frown className={className} strokeWidth={2.2} />;
      case 'terrible': return <CloudRain className={className} strokeWidth={2.2} />;
      default: return null;
    }
  };

  const totalCount = completedCount + activeCount;
  const completionPercentageNumber = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const pieData = [
    { name: t('completed') || 'Selesai', value: completedCount, color: '#10b981' },
    { name: lang === 'id' ? 'Belum Selesai' : 'Belum Selesai', value: activeCount, color: '#6366f1' }
  ].filter(d => d.value > 0);

  const getFormattedSelectedDate = () => {
    try {
      const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
      return selectedDate.toLocaleDateString(locale, options);
    } catch (e) {
      return selectedDateStr;
    }
  };

  const currentSelectedDayMood = (moods || []).find(x => x && x.date === selectedDateStr)?.mood;

  const isLight = isOrganic || isProMax || appTheme === 'light' || appTheme === 'cute' || appTheme === 'pink' || appTheme === 'organic' || appTheme === 'pro_max';
  
  const isOrganicTheme = isOrganic || isProMax || appTheme === 'organic' || appTheme === 'pro_max';

  const cardThemeClass = isLight
    ? (isOrganicTheme
        ? 'bg-[#FAF5EA] border border-[#EADCC8] text-[#2B1E14] shadow-xs'
        : appTheme === 'cute'
          ? 'bg-[#FFF9F0] border border-[#F2DEBF] text-[#38230F] shadow-xs'
          : appTheme === 'pink'
            ? 'bg-[#FFF5F8] border border-[#FBCFE8] text-[#500724] shadow-xs'
            : 'bg-white border border-slate-200 text-slate-900 shadow-xs')
    : (appTheme === 'simple'
        ? 'bg-[#1C1917]/90 border border-[#2E2823] text-stone-200'
        : appTheme === 'cool'
          ? 'bg-[#0D162B]/90 border border-[#1E3A8A]/80 text-slate-100'
          : appTheme === 'wallpaper'
            ? 'bg-slate-900/60 border border-white/10 text-white backdrop-blur-md'
            : 'bg-slate-900 border border-slate-800/80 text-slate-100');

  const innerCardThemeClass = isLight
    ? (isOrganicTheme
        ? 'bg-[#F2E8D5] border border-[#DFD0B8] text-[#2B1E14]'
        : appTheme === 'cute'
          ? 'bg-[#FDF0DE] border border-[#EED7B8] text-[#38230F]'
          : appTheme === 'pink'
            ? 'bg-[#FDE2EC] border border-[#F9A8D4] text-[#500724]'
            : 'bg-slate-50 border border-slate-200 text-slate-900')
    : (appTheme === 'simple'
        ? 'bg-[#26221E] border border-[#363029] text-stone-200'
        : appTheme === 'cool'
          ? 'bg-[#131F3B] border border-[#1E3A8A]/60 text-slate-100'
          : 'bg-slate-950/60 border border-slate-800/60 text-slate-100');

  const inputThemeClass = isLight
    ? (isOrganicTheme
        ? 'bg-[#FFFDF9] border border-[#D8C7B0] text-[#2B1E14] placeholder-[#9B876F] focus:border-[#A84A2E]'
        : appTheme === 'cute'
          ? 'bg-[#FFFDF8] border border-[#E8D0B3] text-[#38230F] placeholder-[#856543] focus:border-[#DB2777]'
          : appTheme === 'pink'
            ? 'bg-white border border-[#F9A8D4] text-[#500724] placeholder-[#BE185D]/60 focus:border-[#DB2777]'
            : 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500')
    : 'bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 focus:border-indigo-500';

  const subTextThemeClass = isLight
    ? (isOrganicTheme
        ? 'text-[#78644E]'
        : appTheme === 'cute'
          ? 'text-[#6A4D2C]'
          : appTheme === 'pink'
            ? 'text-[#9D174D]'
            : 'text-slate-600')
    : 'text-slate-400';

  const primaryTextThemeClass = isLight
    ? (isOrganicTheme
        ? 'text-[#2B1E14]'
        : appTheme === 'cute'
          ? 'text-[#38230F]'
          : appTheme === 'pink'
            ? 'text-[#500724]'
            : 'text-slate-900')
    : 'text-slate-100';

  const borderThemeClass = isLight
    ? (isOrganicTheme
        ? 'border-[#EADCC8]'
        : appTheme === 'cute'
          ? 'border-[#F2DEBF]'
          : appTheme === 'pink'
            ? 'border-[#FBCFE8]'
            : 'border-slate-200')
    : 'border-slate-800/80';

  const btnSecondaryThemeClass = isLight
    ? (isOrganicTheme
        ? 'bg-[#EFE3CF] hover:bg-[#E5D7BF] text-[#2B1E14] border border-[#DFD0B8]'
        : appTheme === 'cute'
          ? 'bg-[#FAECD5] hover:bg-[#F2DEBF] text-[#38230F] border border-[#EED7B8]'
          : appTheme === 'pink'
            ? 'bg-[#FCE7F3] hover:bg-[#FBCFE8] text-[#500724] border border-[#F9A8D4]'
            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200')
    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60';

  const modalThemeClass = isLight
    ? (isOrganicTheme
        ? 'bg-[#FAF5EA] border border-[#EADCC8] text-[#2B1E14]'
        : appTheme === 'cute'
          ? 'bg-[#FFF9F0] border border-[#F2DEBF] text-[#38230F]'
          : appTheme === 'pink'
            ? 'bg-[#FFF5F8] border border-[#FBCFE8] text-[#500724]'
            : 'bg-white border border-slate-200 text-slate-900')
    : 'bg-slate-900 border border-slate-800 text-slate-100';

  const modalHeaderThemeClass = isLight
    ? (isOrganicTheme
        ? 'bg-[#F2E8D5] border-b border-[#DFD0B8] text-[#2B1E14]'
        : appTheme === 'cute'
          ? 'bg-[#FDF0DE] border-b border-[#EED7B8] text-[#38230F]'
          : appTheme === 'pink'
            ? 'bg-[#FDE2EC] border-b border-[#F9A8D4] text-[#500724]'
            : 'bg-slate-50 border-b border-slate-200 text-slate-900')
    : 'bg-slate-950 border-b border-slate-800 text-slate-100';

  return (
    <div className={`flex flex-col h-full font-sans ${primaryTextThemeClass}`}>
      
      {/* Top Header */}
      <div className={`flex-none pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-3 px-4 sm:px-6 flex items-center justify-between border-b transition-colors backdrop-blur-md z-20 shrink-0 ${
        isOrganicTheme
          ? 'bg-[#FAF5EA]/95 border-[#EADCC8] text-[#2B1E14]'
          : appTheme === 'wallpaper'
            ? 'bg-slate-950/40 border-white/10 text-white backdrop-blur-xl'
            : appTheme === 'light'
              ? 'bg-white/95 border-slate-200 text-slate-900'
              : appTheme === 'cute'
                ? 'bg-[#FAF5EA]/95 border-[#EADCC8] text-[#38230F]'
                : appTheme === 'pink'
                  ? 'bg-[#FFF0F5]/95 border-pink-200 text-[#500724]'
                  : appTheme === 'simple'
                    ? 'bg-[#161412]/95 border-[#26221C] text-stone-200'
                    : appTheme === 'cool'
                      ? 'bg-[#0A1329]/95 border-[#1E3A8A] text-slate-100'
                      : 'bg-slate-900/90 border-slate-800/60 text-slate-100'
      }`}>
        <div className="flex flex-col justify-center min-w-0">
          <span className={`font-extrabold text-lg sm:text-xl tracking-tight leading-tight truncate ${primaryTextThemeClass}`}>
            {t('calendar') || 'Kalender'}
          </span>
          <span className={`text-[11px] font-medium leading-tight truncate ${subTextThemeClass}`}>
            {activeTab === 'calendar' 
              ? (lang === 'id' ? 'Agenda Harian & Jadwal Tugas' : 'Daily Agenda & Task Schedule')
              : (lang === 'id' ? 'Analisis Produktivitas & Konsistensi' : 'Productivity & Consistency Analytics')}
          </span>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      {!isLiteMode && (
        <div className="px-4 py-2.5 flex-none w-full max-w-md mx-auto">
          <div className={`grid grid-cols-2 rounded-2xl p-1 shadow-xs border ${
            isOrganic 
              ? `${palette.streakCard} ${palette.streakBorder}` 
              : innerCardThemeClass
          }`}>
            <button 
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('calendar');
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation active:scale-95 ${
                activeTab === 'calendar' 
                  ? isOrganic 
                    ? `${palette.chipActive} shadow-xs font-black`
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : `${subTextThemeClass} hover:${primaryTextThemeClass}`
              }`}
            >
              {is3D ? <Icon3DNavCalendar size={16} active={activeTab === 'calendar'} /> : <Calendar className="w-3.5 h-3.5" />}
              <span>{lang === 'id' ? 'Kalender & Agenda' : 'Calendar & Tasks'}</span>
            </button>
            <button 
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setActiveTab('stats');
              }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation active:scale-95 ${
                activeTab === 'stats' 
                  ? isOrganic 
                    ? `${palette.chipActive} shadow-xs font-black`
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                  : `${subTextThemeClass} hover:${primaryTextThemeClass}`
              }`}
            >
              {is3D ? <Icon3DChartPie size={16} active={activeTab === 'stats'} /> : <Activity className="w-3.5 h-3.5" />}
              <span>{lang === 'id' ? 'Statistik' : 'Analytics'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div ref={calendarScrollRef} className="flex-1 overflow-y-auto custom-scrollbar pb-24 w-full">
        <div className="w-full px-3.5 sm:px-6 py-3 max-w-6xl mx-auto">
          
          {activeTab === 'calendar' ? (
            /* =========================================================================
               TAB 1: KALENDER & AGENDA (Clean, uncluttered, focused)
               ========================================================================= */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
              
              {/* Left Column: Interactive Calendar Grid */}
              <div className="lg:col-span-7 space-y-4">
                <div className={`rounded-3xl p-5 sm:p-6 shadow-lg ${cardThemeClass}`}>
                  
                  {/* Calendar Navigation Header */}
                  <div className={`flex items-center justify-between mb-5 pb-3 border-b ${borderThemeClass}`}>
                    <button 
                      onClick={handlePrevMonth}
                      className={`p-2 rounded-xl transition-all ${btnSecondaryThemeClass}`}
                      title={lang === 'id' ? 'Bulan Sebelumnya' : 'Previous Month'}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2">
                      <h2 className={`text-base sm:text-lg font-bold tracking-tight ${primaryTextThemeClass}`}>
                        {monthNames[currentMonth]} {currentYear}
                      </h2>
                      {(currentMonth !== new Date().getMonth() || currentYear !== new Date().getFullYear()) && (
                        <button 
                          type="button"
                          onClick={() => { 
                            triggerHaptic('light');
                            const now = new Date(); 
                            setCurrentDate(now); 
                            setSelectedDate(now); 
                          }}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95 ${
                            isOrganicTheme
                              ? 'bg-[#4A6741]/15 text-[#4A6741] dark:text-[#8EBA7F] border border-[#4A6741]/30 hover:bg-[#4A6741]/25'
                              : 'bg-indigo-500/10 text-indigo-400 dark:text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/20'
                          }`}
                        >
                          {lang === 'id' ? 'Bulan Ini' : 'This Month'}
                        </button>
                      )}
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        handleNextMonth();
                      }}
                      className={`p-2 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${btnSecondaryThemeClass}`}
                      title={lang === 'id' ? 'Bulan Berikutnya' : 'Next Month'}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Weekday Initials */}
                  <div className="grid grid-cols-7 mb-2 text-center">
                    {daysOfWeek.map((day, idx) => (
                      <div key={idx} className={`text-[11px] font-bold py-1 ${subTextThemeClass}`}>
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {blanks.map((_, i) => (
                      <div key={`blank-${i}`} className="h-10 sm:h-11 md:h-12" />
                    ))}
                    {days.map((day) => {
                      const cellDateObj = new Date(currentYear, currentMonth, day);
                      const cellDateStr = getLocalIsoDate(cellDateObj);
                      const dayMood = (moods || []).find(m => m && m.date === cellDateStr)?.mood;
                      const dayTaskStats = tasksByDateMap[cellDateStr] || { total: 0, completed: 0 };
                      const dayNoteCount = notesByDateMap[cellDateStr] || 0;
                      const dayTxStats = transactionsByDateMap[cellDateStr] || { count: 0, income: 0, expense: 0 };

                      return (
                        <Day 
                          key={day} 
                          num={day.toString()} 
                          active={isSelectedDate(day)} 
                          isToday={isTodayDate(day)}
                          onClick={() => handleSelectDay(day)}
                          mood={dayMood}
                          taskCount={dayTaskStats.total}
                          completedTaskCount={dayTaskStats.completed}
                          noteCount={dayNoteCount}
                          txCount={dayTxStats.count}
                          txIncome={dayTxStats.income}
                          txExpense={dayTxStats.expense}
                          isLight={isLight}
                          isOrganic={isOrganicTheme}
                          palette={palette}
                        />
                      );
                    })}
                  </div>

                  {/* Clean, Non-distracting Legend */}
                  <div className={`flex items-center justify-center gap-4 pt-4 mt-4 border-t ${borderThemeClass} text-[11px] ${subTextThemeClass} font-medium flex-wrap`}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>{lang === 'id' ? 'Tugas Selesai' : 'Tasks Done'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isOrganicTheme ? 'bg-[#8C4A1E]' : 'bg-indigo-500'}`}></span>
                      <span>{lang === 'id' ? 'Tugas Belum Selesai' : 'Tasks Pending'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      <span>{lang === 'id' ? 'Catatan' : 'Notes'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                      <span>{lang === 'id' ? 'Keuangan' : 'Finance'}</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Right Column: Daily Agenda & Content */}
              <div ref={agendaSectionRef} className="lg:col-span-5 space-y-4 scroll-mt-20">
                <div className={`rounded-3xl p-5 sm:p-6 shadow-lg space-y-4 ${cardThemeClass}`}>
                  
                  {/* Selected Day Header */}
                  <div className={`flex items-center justify-between gap-2 pb-3 border-b ${borderThemeClass}`}>
                    <button 
                      type="button"
                      onClick={handlePrevDay}
                      className={`p-1.5 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${btnSecondaryThemeClass}`}
                      title={lang === 'id' ? 'Hari Sebelumnya' : 'Previous Day'}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <div className="text-center min-w-0 flex-1">
                      <h3 className={`text-sm sm:text-base font-bold truncate ${primaryTextThemeClass}`}>
                        {getFormattedSelectedDate()}
                      </h3>
                      {selectedDateStr !== todayStr && (
                        <button
                          type="button"
                          onClick={handleJumpToday}
                          className={`text-[10px] font-semibold mt-0.5 inline-flex items-center gap-1 transition-colors cursor-pointer touch-manipulation active:scale-95 ${
                            isOrganicTheme
                              ? 'text-[#4A6741] dark:text-[#8EBA7F] hover:underline'
                              : 'text-indigo-500 dark:text-indigo-400 hover:underline'
                          }`}
                        >
                          <CalendarDays className="w-3 h-3" />
                          <span>{lang === 'id' ? 'Kembali ke Hari Ini' : 'Back to Today'}</span>
                        </button>
                      )}
                    </div>

                    <button 
                      type="button"
                      onClick={handleNextDay}
                      className={`p-1.5 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${btnSecondaryThemeClass}`}
                      title={lang === 'id' ? 'Hari Berikutnya' : 'Next Day'}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Compact Mood Logger Strip (Lightweight & Unobtrusive) */}
                  {selectedDateStr <= todayStr && (
                    <div className={`rounded-2xl p-2.5 flex items-center justify-between gap-2 ${innerCardThemeClass}`}>
                      <span className={`text-[10px] uppercase font-bold tracking-wider pl-1 ${subTextThemeClass}`}>
                        {lang === 'id' ? 'Mood' : 'Mood'}:
                      </span>
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {[
                          { id: 'excellent', label: 'Sangat Baik' },
                          { id: 'good', label: 'Baik' },
                          { id: 'neutral', label: 'Biasa' },
                          { id: 'bad', label: 'Buruk' },
                          { id: 'terrible', label: 'Sangat Buruk' }
                        ].map(m => {
                          const isSelected = currentSelectedDayMood === m.id;
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                triggerHaptic('light');
                                setMood(selectedDateStr, m.id as any);
                              }}
                              className={`p-1.5 rounded-xl transition-all cursor-pointer touch-manipulation active:scale-95 ${
                                isSelected 
                                  ? isOrganicTheme
                                    ? 'bg-[#4A6741] text-white scale-110 shadow-sm'
                                    : 'bg-indigo-600 text-white scale-110 shadow-sm' 
                                  : `${subTextThemeClass} hover:${primaryTextThemeClass} opacity-60 hover:opacity-100`
                              }`}
                              title={m.label}
                            >
                              {getMoodIcon(m.id, "w-4 h-4")}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Filter Pills: Semua / Tugas / Catatan / Keuangan */}
                  <div className={`grid grid-cols-4 rounded-2xl p-1 text-center border ${
                    isOrganic ? `${palette.streakCard} ${palette.streakBorder}` : innerCardThemeClass
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setDailyContentFilter('all');
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        dailyContentFilter === 'all'
                          ? isOrganic
                            ? `${palette.chipActive} shadow-xs font-black`
                            : 'bg-indigo-600 text-white shadow-sm'
                          : `${subTextThemeClass} hover:${primaryTextThemeClass}`
                      }`}
                    >
                      {lang === 'id' ? 'Semua' : 'All'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setDailyContentFilter('tasks');
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-1 ${
                        dailyContentFilter === 'tasks'
                          ? isOrganic
                            ? `${palette.chipActive} shadow-xs font-black`
                            : 'bg-indigo-600 text-white shadow-sm'
                          : `${subTextThemeClass} hover:${primaryTextThemeClass}`
                      }`}
                    >
                      <span>{lang === 'id' ? 'Tugas' : 'Tasks'}</span>
                      {dayTasks.length > 0 && (
                        <span className="text-[10px] font-mono opacity-80">({dayTasks.length})</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setDailyContentFilter('notes');
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-1 ${
                        dailyContentFilter === 'notes'
                          ? isOrganic
                            ? `${palette.chipActive} shadow-xs font-black`
                            : 'bg-indigo-600 text-white shadow-sm'
                          : `${subTextThemeClass} hover:${primaryTextThemeClass}`
                      }`}
                    >
                      <span>{lang === 'id' ? 'Catatan' : 'Notes'}</span>
                      {dayNotes.length > 0 && (
                        <span className="text-[10px] font-mono opacity-80">({dayNotes.length})</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setDailyContentFilter('finance');
                      }}
                      className={`py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation active:scale-95 flex items-center justify-center gap-1 ${
                        dailyContentFilter === 'finance'
                          ? isOrganic
                            ? `${palette.chipActive} shadow-xs font-black`
                            : 'bg-indigo-600 text-white shadow-sm'
                          : `${subTextThemeClass} hover:${primaryTextThemeClass}`
                      }`}
                    >
                      <span>{lang === 'id' ? 'Uang' : 'Finance'}</span>
                      {dayTransactions.length > 0 && (
                        <span className="text-[10px] font-mono opacity-80">({dayTransactions.length})</span>
                      )}
                    </button>
                  </div>

                  {/* Tasks Section */}
                  {(dailyContentFilter === 'all' || dailyContentFilter === 'tasks') && (() => {
                    const taskLimit = dailyContentFilter === 'all' ? 3 : 5;
                    const visibleTasks = showAllTasks ? dayTasks : dayTasks.slice(0, taskLimit);
                    const hasMoreTasks = dayTasks.length > taskLimit;

                    return (
                      <div className="space-y-2.5">
                        <div className={`flex items-center justify-between text-xs font-bold ${subTextThemeClass} pt-1`}>
                          <span>{lang === 'id' ? 'Tugas Hari Ini' : 'Tasks for this Day'}</span>
                          {dayTasks.length > 0 && (
                            <span className="text-[11px] text-indigo-500 dark:text-indigo-400 font-mono">
                              {dayTasks.filter(t => t.isDiscipline 
                                ? (t.disciplineData?.dailyCheckins?.includes(selectedDateStr) || false)
                                : (t.repeat === 'daily' 
                                  ? (t.completedDates?.includes(selectedDateStr) || (selectedDateStr === todayStr && t.completed))
                                  : t.completed)
                              ).length} / {dayTasks.length} {lang === 'id' ? 'Selesai' : 'Done'}
                            </span>
                          )}
                        </div>

                        {dayTasks.length > 0 ? (
                          <div className="space-y-2">
                            {visibleTasks.map(task => {
                              const isTaskCompleted = task.isDiscipline
                                ? (task.disciplineData?.dailyCheckins?.includes(selectedDateStr) || false)
                                : (task.repeat === 'daily' 
                                  ? (task.completedDates?.includes(selectedDateStr) || (selectedDateStr === todayStr && task.completed)) 
                                  : task.completed);

                              const pColor = task.priority === 'Tinggi' ? 'bg-rose-500' : task.priority === 'Sedang' ? 'bg-amber-500' : 'bg-emerald-500';

                              return (
                                <div 
                                  key={task.id}
                                  className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                                    task.deleted 
                                      ? 'opacity-50 italic ' + innerCardThemeClass 
                                      : innerCardThemeClass
                                  }`}
                                >
                                  <button
                                    type="button"
                                    disabled={task.deleted}
                                    onClick={() => {
                                      triggerHaptic('medium');
                                      toggleTask(task.id, selectedDateStr);
                                    }}
                                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer touch-manipulation active:scale-90 ${
                                      isTaskCompleted 
                                        ? 'bg-emerald-500 border-emerald-500 text-white shadow-xs' 
                                        : isOrganic
                                        ? 'border-[#D8C7B0] hover:border-[#4A6741]'
                                        : 'border-slate-400 dark:border-slate-600 hover:border-indigo-400'
                                    }`}
                                  >
                                    {isTaskCompleted && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                                  </button>

                                  <div 
                                    onClick={() => {
                                      triggerHaptic('light');
                                      setSelectedDetailTaskId(task.id);
                                      setSelectedDetailModalTab('info');
                                    }}
                                    className="flex-1 min-w-0 cursor-pointer touch-manipulation"
                                  >
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${pColor}`} />
                                      <span className={`text-xs sm:text-sm font-semibold truncate ${isTaskCompleted ? 'opacity-50 line-through' : primaryTextThemeClass}`}>
                                        {task.title}
                                      </span>
                                    </div>
                                    <div className={`flex items-center gap-2 text-[10px] ${subTextThemeClass}`}>
                                      {task.time && <span>{task.time}</span>}
                                      {task.repeat === 'daily' && <span>• {lang === 'id' ? 'Harian' : 'Daily'}</span>}
                                      {task.isDiscipline && <span>• {lang === 'id' ? 'Disiplin' : 'Discipline'}</span>}
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      triggerHaptic('light');
                                      deleteTask(task.id);
                                    }}
                                    className={`p-1.5 ${subTextThemeClass} hover:text-rose-500 rounded-lg transition-colors cursor-pointer touch-manipulation active:scale-90`}
                                    title={lang === 'id' ? 'Hapus' : 'Delete'}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}

                            {hasMoreTasks && (
                              <button
                                type="button"
                                onClick={() => setShowAllTasks(!showAllTasks)}
                                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1.5 transition-all shadow-xs ${innerCardThemeClass}`}
                              >
                                {showAllTasks ? (
                                  <>
                                    <span>{lang === 'id' ? 'Tampilkan Lebih Sedikit' : 'Show Less'}</span>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </>
                                ) : (
                                  <>
                                    <span>
                                      {lang === 'id' 
                                        ? `Lihat Selengkapnya (+${dayTasks.length - taskLimit} tugas lagi)` 
                                        : `Show More (+${dayTasks.length - taskLimit} more)`}
                                    </span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className={`text-center py-4 text-xs ${subTextThemeClass} rounded-2xl border border-dashed ${borderThemeClass}`}>
                            {lang === 'id' ? 'Tidak ada tugas pada tanggal ini' : 'No tasks on this date'}
                          </div>
                        )}

                        {/* High-Performance 0ms Quick Task Bar + Full Option Modal Trigger */}
                        <CalendarQuickTaskBar
                          selectedDateStr={selectedDateStr}
                          isOrganic={isOrganicTheme}
                          innerCardThemeClass={innerCardThemeClass}
                          inputThemeClass={inputThemeClass}
                          subTextThemeClass={subTextThemeClass}
                          primaryTextThemeClass={primaryTextThemeClass}
                          btnSecondaryThemeClass={btnSecondaryThemeClass}
                          lang={lang}
                          onAddTask={handleQuickAddFromBar}
                          onOpenDetailedModal={handleOpenNewModalTask}
                        />
                      </div>
                    );
                  })()}

                  {/* Notes Section */}
                  {(dailyContentFilter === 'all' || dailyContentFilter === 'notes') && (() => {
                    const noteLimit = dailyContentFilter === 'all' ? 2 : 4;
                    const visibleNotes = showAllNotes ? dayNotes : dayNotes.slice(0, noteLimit);
                    const hasMoreNotes = dayNotes.length > noteLimit;

                    return (
                      <div className="space-y-2.5 pt-1">
                        <div className={`flex items-center justify-between text-xs font-bold ${subTextThemeClass}`}>
                          <span>{lang === 'id' ? 'Catatan Hari Ini' : 'Notes for this Day'}</span>
                          <button
                            onClick={handleCreateNoteForSelectedDay}
                            className="text-amber-500 hover:text-amber-400 flex items-center gap-1 text-[11px]"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{lang === 'id' ? 'Tulis' : 'Write'}</span>
                          </button>
                        </div>

                        {dayNotes.length > 0 ? (
                          <div className="space-y-2">
                            {visibleNotes.map(note => (
                              <div
                                key={note.id}
                                onClick={() => {
                                  if (onOpenNote) onOpenNote(note);
                                  else if (onNavigate) onNavigate('note-editor', note);
                                }}
                                className={`rounded-2xl p-3 cursor-pointer transition-all flex items-start gap-2.5 ${innerCardThemeClass}`}
                              >
                                <FileText className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <div className="min-w-0 flex-1">
                                  <h4 className={`text-xs font-bold truncate ${primaryTextThemeClass}`}>
                                    {note.title || (lang === 'id' ? 'Catatan Tanpa Judul' : 'Untitled Note')}
                                  </h4>
                                  <p className={`text-[11px] truncate mt-0.5 ${subTextThemeClass}`}>
                                    {note.content ? note.content.substring(0, 50) : (lang === 'id' ? 'Kosong' : 'Empty')}
                                  </p>
                                </div>
                              </div>
                            ))}

                            {hasMoreNotes && (
                              <button
                                type="button"
                                onClick={() => setShowAllNotes(!showAllNotes)}
                                className={`w-full py-2 px-3 rounded-xl text-xs font-semibold text-amber-500 hover:underline flex items-center justify-center gap-1.5 transition-all shadow-xs ${innerCardThemeClass}`}
                              >
                                {showAllNotes ? (
                                  <>
                                    <span>{lang === 'id' ? 'Tampilkan Lebih Sedikit' : 'Show Less'}</span>
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </>
                                ) : (
                                  <>
                                    <span>
                                      {lang === 'id' 
                                        ? `Lihat Selengkapnya (+${dayNotes.length - noteLimit} catatan lagi)` 
                                        : `Show More (+${dayNotes.length - noteLimit} more)`}
                                    </span>
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ) : (
                          dailyContentFilter === 'notes' && (
                            <div className={`text-center py-4 text-xs rounded-2xl border border-dashed ${borderThemeClass} ${subTextThemeClass}`}>
                              {lang === 'id' ? 'Belum ada catatan di tanggal ini' : 'No notes on this date'}
                            </div>
                          )
                        )}
                      </div>
                    );
                  })()}

                  {/* Finance Section */}
                  {(dailyContentFilter === 'all' || dailyContentFilter === 'finance') && dayTransactions.length > 0 && (() => {
                    const financeLimit = dailyContentFilter === 'all' ? 2 : 4;
                    const visibleTransactions = showAllFinance ? dayTransactions : dayTransactions.slice(0, financeLimit);
                    const hasMoreFinance = dayTransactions.length > financeLimit;

                    return (
                      <div className="space-y-2 pt-1">
                        <div className={`flex items-center justify-between text-xs font-bold ${subTextThemeClass}`}>
                          <span>{lang === 'id' ? 'Transaksi Keuangan' : 'Financial Transactions'}</span>
                          <div className="flex items-center gap-2 text-[10px] font-mono">
                            {dayIncome > 0 && <span className="text-emerald-500 font-semibold">+Rp {dayIncome.toLocaleString('id-ID')}</span>}
                            {dayExpense > 0 && <span className="text-rose-500 font-semibold">-Rp {dayExpense.toLocaleString('id-ID')}</span>}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          {visibleTransactions.map(tx => (
                            <div 
                              key={tx.id}
                              className={`rounded-xl px-3 py-2 flex items-center justify-between text-xs ${innerCardThemeClass}`}
                            >
                              <span className={`truncate max-w-[60%] ${primaryTextThemeClass}`}>{tx.category || tx.description || 'Transaksi'}</span>
                              <span className={`font-mono font-bold ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                {tx.type === 'income' ? '+' : '-'}Rp {Number(tx.amount || 0).toLocaleString('id-ID')}
                              </span>
                            </div>
                          ))}

                          {hasMoreFinance && (
                            <button
                              type="button"
                              onClick={() => setShowAllFinance(!showAllFinance)}
                              className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-teal-500 hover:underline flex items-center justify-center gap-1.5 transition-all shadow-xs ${innerCardThemeClass}`}
                            >
                              {showAllFinance ? (
                                <>
                                  <span>{lang === 'id' ? 'Tampilkan Lebih Sedikit' : 'Show Less'}</span>
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </>
                              ) : (
                                <>
                                  <span>
                                    {lang === 'id' 
                                      ? `Lihat Selengkapnya (+${dayTransactions.length - financeLimit} transaksi lagi)` 
                                      : `Show More (+${dayTransactions.length - financeLimit} more)`}
                                  </span>
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                </div>
              </div>

            </div>
          ) : (
            /* =========================================================================
               TAB 2: STATISTIK PRODUKTIVITAS (Structured, clean, digestible, not dizzying)
               ========================================================================= */
            <div className="space-y-5">
              
              {/* Period Selector Bar */}
              <div className={`flex items-center justify-between rounded-2xl p-2 max-w-2xl mx-auto shadow-xs ${cardThemeClass}`}>
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    handlePrevPeriod();
                  }}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95 ${btnSecondaryThemeClass}`}
                  title={lang === 'id' ? 'Periode Sebelumnya' : 'Previous Period'}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1">
                  {(['Harian', 'Mingguan', 'Bulanan', 'Tahunan'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setViewType(type);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation active:scale-95 ${
                        viewType === type 
                          ? isOrganicTheme
                            ? `${palette.chipActive} shadow-xs font-black`
                            : 'bg-indigo-600 text-white shadow-sm' 
                          : `${subTextThemeClass} hover:${primaryTextThemeClass}`
                      }`}
                    >
                      {type === 'Harian' ? (lang === 'id' ? 'Hari' : 'Day') :
                       type === 'Mingguan' ? (lang === 'id' ? 'Minggu' : 'Week') :
                       type === 'Bulanan' ? (lang === 'id' ? 'Bulan' : 'Month') :
                       (lang === 'id' ? 'Tahun' : 'Year')}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    handleNextPeriod();
                  }}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer touch-manipulation active:scale-95 ${btnSecondaryThemeClass}`}
                  title={lang === 'id' ? 'Periode Berikutnya' : 'Next Period'}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 3 Clear, Digestible Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Completion Rate Summary Card */}
                <div className={`rounded-3xl p-5 shadow-lg flex flex-col justify-between ${cardThemeClass}`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${subTextThemeClass}`}>
                        {lang === 'id' ? 'Tingkat Selesai' : 'Completion Rate'}
                      </span>
                      <Award className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className={`text-3xl font-black ${primaryTextThemeClass}`}>{completionPercentageNumber}%</span>
                      <span className={`text-xs font-medium ${subTextThemeClass}`}>
                        ({completedCount} dari {totalCount} tugas)
                      </span>
                    </div>
                  </div>

                  <div className={`h-2 w-full rounded-full overflow-hidden border mt-4 ${innerCardThemeClass} ${borderThemeClass}`}>
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500" 
                      style={{ width: `${completionPercentageNumber}%` }}
                    />
                  </div>
                </div>

                {/* 2. Tasks Completed Count Card */}
                <div className={`rounded-3xl p-5 shadow-lg flex flex-col justify-between ${cardThemeClass}`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${subTextThemeClass}`}>
                        {lang === 'id' ? 'Tugas Selesai' : 'Completed'}
                      </span>
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div className="text-3xl font-black text-emerald-500 mt-1">
                      {completedCount}
                    </div>
                  </div>
                  <p className={`text-[11px] mt-3 ${subTextThemeClass}`}>
                    {lang === 'id' ? 'Tugas yang berhasil kamu tuntaskan di periode ini.' : 'Tasks successfully finished in this timeframe.'}
                  </p>
                </div>

                {/* 3. Active / Pending Tasks Card */}
                <div className={`rounded-3xl p-5 shadow-lg flex flex-col justify-between ${cardThemeClass}`}>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${subTextThemeClass}`}>
                        {lang === 'id' ? 'Belum Selesai' : 'Pending'}
                      </span>
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-3xl font-black text-amber-500 mt-1">
                      {activeCount}
                    </div>
                  </div>
                  <p className={`text-[11px] mt-3 ${subTextThemeClass}`}>
                    {lang === 'id' ? 'Tugas aktif atau jadwal yang masih menunggu.' : 'Tasks that are still active or upcoming.'}
                  </p>
                </div>

              </div>

              {/* Priority Breakdown & Habits Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                
                {/* Priority Breakdown Card */}
                <div className={`rounded-3xl p-5 sm:p-6 shadow-lg space-y-4 ${cardThemeClass}`}>
                  <div className={`flex items-center gap-2 pb-2 border-b ${borderThemeClass}`}>
                    <Target className="w-4 h-4 text-indigo-500" />
                    <h3 className={`text-sm font-bold ${primaryTextThemeClass}`}>
                      {lang === 'id' ? 'Performa Menurut Prioritas' : 'Priority Breakdown'}
                    </h3>
                  </div>

                  <div className="space-y-3.5 pt-1">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-rose-500 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          {lang === 'id' ? 'Prioritas Wajib (Tinggi)' : 'High Priority'}
                        </span>
                        <span className={`font-mono ${primaryTextThemeClass}`}>
                          {priorityStats.high.completed}/{priorityStats.high.total} ({priorityStats.high.rate}%)
                        </span>
                      </div>
                      <div className={`h-2 w-full rounded-full overflow-hidden border ${innerCardThemeClass} ${borderThemeClass}`}>
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${priorityStats.high.rate}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-amber-500 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          {lang === 'id' ? 'Prioritas Sedang' : 'Medium Priority'}
                        </span>
                        <span className={`font-mono ${primaryTextThemeClass}`}>
                          {priorityStats.medium.completed}/{priorityStats.medium.total} ({priorityStats.medium.rate}%)
                        </span>
                      </div>
                      <div className={`h-2 w-full rounded-full overflow-hidden border ${innerCardThemeClass} ${borderThemeClass}`}>
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${priorityStats.medium.rate}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-emerald-500 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {lang === 'id' ? 'Prioritas Rendah' : 'Low Priority'}
                        </span>
                        <span className={`font-mono ${primaryTextThemeClass}`}>
                          {priorityStats.low.completed}/{priorityStats.low.total} ({priorityStats.low.rate}%)
                        </span>
                      </div>
                      <div className={`h-2 w-full rounded-full overflow-hidden border ${innerCardThemeClass} ${borderThemeClass}`}>
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${priorityStats.low.rate}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Habits & Recurring Consistency Card */}
                <div className={`rounded-3xl p-5 sm:p-6 shadow-lg space-y-3 ${cardThemeClass}`}>
                  <div className={`flex items-center justify-between pb-2 border-b ${borderThemeClass}`}>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-indigo-500" />
                      <h3 className={`text-sm font-bold ${primaryTextThemeClass}`}>
                        {lang === 'id' ? 'Konsistensi Kebiasaan' : 'Habit Consistency'}
                      </h3>
                    </div>
                    <span className={`text-[10px] font-medium ${subTextThemeClass}`}>
                      {lang === 'id' ? 'Klik untuk kalender habit' : 'Click for heatmap'}
                    </span>
                  </div>

                  {(() => {
                    const habitList = tasks.filter(t => !t.deleted && (t.repeat === 'daily' || t.isDiscipline));
                    if (habitList.length === 0) {
                      return (
                        <div className={`text-center py-6 text-xs rounded-2xl border border-dashed ${borderThemeClass} ${subTextThemeClass}`}>
                          {lang === 'id' ? 'Belum ada tugas rutin atau kebiasaan disiplin' : 'No recurring habits tracked yet'}
                        </div>
                      );
                    }

                    const habitLimit = 3;
                    const visibleHabits = showAllHabits ? habitList : habitList.slice(0, habitLimit);
                    const hasMoreHabits = habitList.length > habitLimit;

                    return (
                      <div className="space-y-2">
                        <div className="space-y-2">
                          {visibleHabits.map(task => {
                            const { compRate, hStreak } = getHabitStats(task, todayStr, getTaskDateStr);
                            return (
                              <div
                                key={task.id}
                                onClick={() => {
                                  setSelectedDetailTaskId(task.id);
                                  setSelectedDetailModalTab('analytics');
                                  setHabitCalendarDate(new Date());
                                }}
                                className={`rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-all border ${innerCardThemeClass}`}
                              >
                                <div className="min-w-0 flex-1 pr-3">
                                  <h4 className={`text-xs font-bold truncate ${primaryTextThemeClass}`}>{task.title}</h4>
                                  <div className={`flex items-center gap-2 text-[10px] mt-0.5 ${subTextThemeClass}`}>
                                    <span>Streak: {hStreak} hari</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs font-bold font-mono text-emerald-500">{compRate}%</span>
                                  <ChevronRight className={`w-3.5 h-3.5 ${subTextThemeClass}`} />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {hasMoreHabits && (
                          <button
                            type="button"
                            onClick={() => setShowAllHabits(!showAllHabits)}
                            className={`w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-indigo-500 dark:text-indigo-400 hover:underline flex items-center justify-center gap-1.5 transition-all shadow-xs ${innerCardThemeClass}`}
                          >
                            {showAllHabits ? (
                              <>
                                <span>{lang === 'id' ? 'Tampilkan Lebih Sedikit' : 'Show Less'}</span>
                                <ChevronUp className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <>
                                <span>
                                  {lang === 'id' 
                                    ? `Lihat Selengkapnya (+${habitList.length - habitLimit} kebiasaan lagi)` 
                                    : `Show More (+${habitList.length - habitLimit} more)`}
                                </span>
                                <ChevronDown className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

              </div>

              {/* Monthly Mood & Wellbeing Card */}
              {monthlyMoodStats && (
                <div className={`rounded-3xl p-5 sm:p-6 shadow-lg space-y-3 ${cardThemeClass}`}>
                  <div className={`flex items-center justify-between pb-2 border-b ${borderThemeClass}`}>
                    <div className="flex items-center gap-2">
                      <Smile className="w-4 h-4 text-emerald-500" />
                      <h3 className={`text-sm font-bold ${primaryTextThemeClass}`}>
                        {lang === 'id' ? 'Evaluasi Kesejahteraan Mood Bulan Ini' : 'Monthly Mood Evaluation'}
                      </h3>
                    </div>
                    <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400">
                      Rata-rata: {monthlyMoodStats.averageDetails.label} ({monthlyMoodStats.averageScore.toFixed(1)}/5)
                    </span>
                  </div>

                  <p className={`text-xs leading-relaxed rounded-2xl p-3.5 border ${innerCardThemeClass} ${subTextThemeClass}`}>
                    {monthlyMoodStats.averageDetails.advice}
                  </p>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* Task Detail & History Modal */}
      {selectedDetailTask && (() => {
        const isDaily = selectedDetailTask.repeat === 'daily' || selectedDetailTask.isDiscipline;
        const { createdStr, diffDays, completedCount, missedCount, compRate, hStreak } = getHabitStats(selectedDetailTask, todayStr, getTaskDateStr);

        const getHabitCalendar = () => {
          const list = [];
          const year = habitCalendarDate.getFullYear();
          const month = habitCalendarDate.getMonth();
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const daysInMonth = getDaysInMonth(year, month);
          const firstDayOfWeek = new Date(year, month, 1).getDay();

          for (let i = 0; i < firstDayOfWeek; i++) {
            list.push({ isDummy: true, dateStr: '', dayNum: null, isCompleted: false, isToday: false, isFuture: false, isBeforeCreation: false });
          }

          for (let day = 1; day <= daysInMonth; day++) {
            const cur = new Date(year, month, day);
            const dateStr = getLocalIsoDate(cur);
            const isCompleted = selectedDetailTask.isDiscipline 
              ? (selectedDetailTask.disciplineData?.dailyCheckins?.includes(dateStr) || false) 
              : (selectedDetailTask.completedDates?.includes(dateStr) || false);
            const isTodayDate = cur.getDate() === today.getDate() && cur.getMonth() === today.getMonth() && cur.getFullYear() === today.getFullYear();
            const isFuture = cur > today;
            const isBeforeCreation = dateStr < createdStr;

            list.push({
              isDummy: false,
              dateStr,
              dayNum: day,
              isCompleted,
              isToday: isTodayDate,
              isFuture,
              isBeforeCreation,
            });
          }

          return list;
        };

        return (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className={`rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh] ${modalThemeClass}`}>
              
              <div className={`flex justify-between items-center px-5 pt-5 pb-3 border-b ${modalHeaderThemeClass}`}>
                <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                  {lang === 'id' ? 'Detail Tugas' : 'Task Details'}
                </span>
                <button 
                  onClick={() => setSelectedDetailTaskId(null)}
                  className={`p-1 rounded-full ${subTextThemeClass} hover:${primaryTextThemeClass}`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                
                {/* Modal Tab Switcher */}
                <div className={`grid grid-cols-2 rounded-xl p-1 ${innerCardThemeClass}`}>
                  <button
                    onClick={() => setSelectedDetailModalTab('info')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedDetailModalTab === 'info' ? 'bg-indigo-600 text-white' : `${subTextThemeClass} hover:${primaryTextThemeClass}`
                    }`}
                  >
                    {lang === 'id' ? 'Informasi' : 'Information'}
                  </button>
                  <button
                    onClick={() => setSelectedDetailModalTab('analytics')}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      selectedDetailModalTab === 'analytics' ? 'bg-indigo-600 text-white' : `${subTextThemeClass} hover:${primaryTextThemeClass}`
                    }`}
                  >
                    {lang === 'id' ? 'Riwayat & Kalender' : 'History & Calendar'}
                  </button>
                </div>

                {selectedDetailModalTab === 'info' ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className={`text-base font-bold ${primaryTextThemeClass}`}>{selectedDetailTask.title}</h3>
                      <div className={`flex items-center gap-2 mt-1.5 text-xs ${subTextThemeClass}`}>
                        <span className="font-semibold">{selectedDetailTask.priority}</span>
                        <span>•</span>
                        <span>{selectedDetailTask.time || '--:--'}</span>
                        <span>•</span>
                        <span>{isDaily ? (lang === 'id' ? 'Harian' : 'Daily') : (lang === 'id' ? 'Sekali' : 'Once')}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const taskToEdit = selectedDetailTask;
                          setSelectedDetailTaskId(null);
                          handleOpenEditModalTask(taskToEdit);
                        }}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer touch-manipulation active:scale-95 ${btnSecondaryThemeClass}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>{lang === 'id' ? 'Edit Lengkap' : 'Full Edit'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('medium');
                          deleteTask(selectedDetailTask.id);
                          setSelectedDetailTaskId(null);
                        }}
                        className="flex-1 py-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-rose-500/20 cursor-pointer touch-manipulation active:scale-95"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{lang === 'id' ? 'Hapus' : 'Delete'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className={`p-2.5 rounded-xl border ${innerCardThemeClass}`}>
                        <span className={`text-[10px] block ${subTextThemeClass}`}>{lang === 'id' ? 'Konsistensi' : 'Rate'}</span>
                        <span className="text-sm font-bold text-emerald-500 mt-0.5 block">{compRate}%</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${innerCardThemeClass}`}>
                        <span className={`text-[10px] block ${subTextThemeClass}`}>Streak</span>
                        <span className="text-sm font-bold text-orange-500 mt-0.5 block">{hStreak} {lang === 'id' ? 'Hari' : 'Days'}</span>
                      </div>
                      <div className={`p-2.5 rounded-xl border ${innerCardThemeClass}`}>
                        <span className={`text-[10px] block ${subTextThemeClass}`}>{lang === 'id' ? 'Selesai' : 'Done'}</span>
                        <span className="text-sm font-bold text-indigo-500 dark:text-indigo-400 mt-0.5 block">{completedCount} {lang === 'id' ? 'Kali' : 'Times'}</span>
                      </div>
                    </div>

                    {/* Mini Check-in Calendar */}
                    <div className={`space-y-2 pt-2 border-t ${borderThemeClass}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold ${primaryTextThemeClass}`}>
                          {habitCalendarDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setHabitCalendarDate(new Date(habitCalendarDate.getFullYear(), habitCalendarDate.getMonth() - 1, 1))}
                            className={`p-1 rounded-lg ${btnSecondaryThemeClass}`}
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setHabitCalendarDate(new Date(habitCalendarDate.getFullYear(), habitCalendarDate.getMonth() + 1, 1))}
                            className={`p-1 rounded-lg ${btnSecondaryThemeClass}`}
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center">
                        {getHabitCalendar().map((day, idx) => {
                          if (day.isDummy) return <div key={idx} className="h-7 w-7" />;
                          return (
                            <button
                              key={idx}
                              disabled={day.isFuture}
                              onClick={() => toggleTask(selectedDetailTask.id, day.dateStr)}
                              className={`h-7 w-7 rounded-lg text-[10px] font-bold mx-auto flex items-center justify-center transition-all ${
                                day.isCompleted 
                                  ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm' 
                                  : day.isFuture 
                                  ? 'opacity-30 ' + subTextThemeClass 
                                  : `${subTextThemeClass} hover:${primaryTextThemeClass} ${btnSecondaryThemeClass}`
                              }`}
                            >
                              {day.dayNum}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        );
      })()}

      {/* Isolated High-Performance TaskFormModal */}
      <TaskFormModal
        isOpen={isAddingModalTask}
        onClose={() => {
          setIsAddingModalTask(false);
          setEditingModalTask(null);
        }}
        editingTask={editingModalTask}
        initialType="Sekarang"
        onSave={handleSaveModalTask}
        appTheme={appTheme}
        isOrganic={isOrganicTheme}
        palette={palette}
        lang={lang as any}
      />

    </div>
  );
}

const Day: React.FC<{ 
  num: string; 
  mute?: boolean; 
  active?: boolean; 
  isToday?: boolean; 
  onClick?: () => void; 
  mood?: string | null;
  taskCount?: number;
  completedTaskCount?: number;
  noteCount?: number;
  txCount?: number;
  txIncome?: number;
  txExpense?: number;
  isLight?: boolean;
  isOrganic?: boolean;
  palette?: any;
}> = ({ 
  num, 
  mute = false, 
  active = false, 
  isToday = false, 
  onClick, 
  taskCount = 0, 
  completedTaskCount = 0, 
  noteCount = 0, 
  txCount = 0, 
  isOrganic = false,
  palette
}) => {
  const hasTasks = taskCount > 0;
  const allTasksDone = hasTasks && completedTaskCount === taskCount;
  const hasNotes = noteCount > 0;
  const hasTx = txCount > 0;

  const handleClick = () => {
    triggerHaptic('light');
    if (onClick) onClick();
  };

  return (
    <div className="flex items-center justify-center">
      <button 
        type="button"
        onClick={handleClick} 
        className={`w-full h-10 sm:h-11 md:h-12 flex flex-col items-center justify-center rounded-2xl transition-all relative cursor-pointer touch-manipulation active:scale-95 ${
          active 
            ? isOrganic
              ? 'bg-[#4A6741] text-white font-black shadow-md shadow-[#4A6741]/30 scale-105 z-10'
              : 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-600/30 scale-105 z-10' 
            : isToday 
            ? isOrganic
              ? 'bg-[#4A6741]/15 text-[#4A6741] dark:text-[#8EBA7F] border border-[#4A6741]/50 font-bold hover:bg-[#4A6741]/25'
              : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/60 font-bold hover:bg-indigo-500/25' 
            : mute 
            ? 'text-slate-400/40 dark:text-slate-500/40' 
            : isOrganic
            ? `${palette?.titleText || 'text-[#2B1E14]'} hover:bg-[#EADCC8]/50`
            : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-slate-950 dark:hover:text-slate-50'
        }`}
      >
        <span className="text-xs sm:text-sm leading-none font-semibold">{num}</span>
        
        {/* Subtle, Non-cluttered Dots */}
        <div className="flex items-center justify-center gap-1 mt-1 h-1.5">
          {hasTasks && (
            <span className={`w-1.5 h-1.5 rounded-full ${
              allTasksDone 
                ? (active ? 'bg-white' : 'bg-emerald-500') 
                : (active ? 'bg-emerald-200' : isOrganic ? 'bg-[#8C4A1E]' : 'bg-indigo-500')
            }`} />
          )}
          {hasNotes && (
            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-amber-200' : 'bg-amber-500'}`} />
          )}
          {hasTx && (
            <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-teal-200' : 'bg-teal-500'}`} />
          )}
        </div>
      </button>
    </div>
  );
};

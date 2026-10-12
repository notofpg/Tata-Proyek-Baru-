import React, { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { triggerHaptic } from '../utils/sound';

interface CalendarQuickTaskBarProps {
  selectedDateStr: string;
  isOrganic: boolean;
  innerCardThemeClass: string;
  inputThemeClass: string;
  subTextThemeClass: string;
  primaryTextThemeClass: string;
  btnSecondaryThemeClass: string;
  lang: string;
  onAddTask: (taskData: {
    title: string;
    time: string;
    priority: 'Tinggi' | 'Sedang' | 'Rendah';
  }) => void;
  onOpenDetailedModal: () => void;
}

export const CalendarQuickTaskBar = React.memo<CalendarQuickTaskBarProps>(({
  selectedDateStr,
  isOrganic,
  innerCardThemeClass,
  inputThemeClass,
  subTextThemeClass,
  primaryTextThemeClass,
  btnSecondaryThemeClass,
  lang,
  onAddTask,
  onOpenDetailedModal
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('09:00');
  const [priority, setPriority] = useState<'Tinggi' | 'Sedang' | 'Rendah'>('Sedang');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    triggerHaptic('light');
    onAddTask({
      title: title.trim(),
      time: time || '09:00',
      priority
    });
    setTitle('');
    setIsOpen(false);
  };

  if (!isOpen) {
    return (
      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsOpen(true);
          }}
          className={`flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer touch-manipulation ${
            isOrganic
              ? 'bg-[#4A6741]/10 hover:bg-[#4A6741]/20 text-[#4A6741] dark:text-[#8EBA7F] border-[#4A6741]/25'
              : 'bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-500 dark:text-indigo-400 border-indigo-500/25'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Tambah Cepat' : 'Quick Add'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenDetailedModal();
          }}
          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer touch-manipulation border flex items-center gap-1.5 shrink-0 ${btnSecondaryThemeClass}`}
          title={lang === 'id' ? 'Tambah dengan Form Lengkap (Alarm, Rutinitas, Disiplin)' : 'Add with Full Details'}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{lang === 'id' ? 'Detail' : 'Details'}</span>
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-2xl p-3 space-y-2.5 transition-all animate-in fade-in zoom-in-95 duration-150 border ${innerCardThemeClass}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-bold uppercase tracking-wider ${subTextThemeClass}`}>
          {lang === 'id' ? 'Tugas Cepat' : 'Quick Task'} ({selectedDateStr})
        </span>
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            onOpenDetailedModal();
          }}
          className="text-[11px] text-indigo-500 hover:underline font-semibold cursor-pointer"
        >
          {lang === 'id' ? 'Buka Form Lengkap →' : 'Full Form →'}
        </button>
      </div>

      <input
        type="text"
        required
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={lang === 'id' ? 'Tulis tugas baru... lalu tekan Enter' : 'Enter task title...'}
        autoComplete="off"
        spellCheck="false"
        className={`w-full rounded-xl px-3 py-2 text-xs font-medium outline-none select-text ${inputThemeClass}`}
      />

      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={`rounded-xl px-2.5 py-1 text-xs font-semibold outline-none cursor-pointer ${inputThemeClass}`}
          />
        </div>

        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
          className={`rounded-xl px-2.5 py-1 text-xs font-semibold outline-none flex-1 cursor-pointer ${inputThemeClass}`}
        >
          <option value="Rendah">{lang === 'id' ? 'Prioritas: Rendah' : 'Priority: Low'}</option>
          <option value="Sedang">{lang === 'id' ? 'Prioritas: Sedang' : 'Priority: Medium'}</option>
          <option value="Tinggi">{lang === 'id' ? 'Prioritas: Wajib' : 'Priority: High'}</option>
        </select>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={() => {
            triggerHaptic('light');
            setIsOpen(false);
          }}
          className={`flex-1 py-1.5 rounded-xl text-xs font-semibold cursor-pointer touch-manipulation active:scale-95 ${btnSecondaryThemeClass}`}
        >
          {lang === 'id' ? 'Batal' : 'Cancel'}
        </button>
        <button
          type="submit"
          className={`flex-1 py-1.5 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer touch-manipulation active:scale-95 ${
            isOrganic
              ? 'bg-[#4A6741] hover:bg-[#3D5535]'
              : 'bg-indigo-600 hover:bg-indigo-500'
          }`}
        >
          {lang === 'id' ? 'Simpan' : 'Save'}
        </button>
      </div>
    </form>
  );
});

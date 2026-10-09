import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Flame, 
  Sun, 
  CloudRain, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  X, 
  ChevronRight, 
  CheckCircle2,
  Calendar,
  Compass
} from 'lucide-react';
import { triggerHaptic, playConfirmSound } from '../../utils/sound';
import { OrganicThemePalette } from './organicThemePalettes';
import OrganicStreakCanvas from './OrganicStreakCanvas';
import { Icon3DFlame } from './Organic3DIcons';

interface OrganicStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  journeyDay?: number;
  hasCompletedTaskToday?: boolean;
  lang: 'id' | 'en';
  palette: OrganicThemePalette;
  appTheme?: string;
  onNavigateTasks?: () => void;
  journeyStartDate?: string;
}

interface BurstParticle {
  id: number;
  x: number;
  y: number;
  char: string;
  scale: number;
}

// Stage Metadata for Sun & Flame Ecosystem
const getSunStageMetadata = (day: number, isRaining: boolean, lang: 'id' | 'en') => {
  const isId = lang === 'id';
  if (day < 15) {
    return {
      badge: isId ? '🌱 Benih Api' : '🌱 Spark Seed',
      name: isId ? 'Benih Api Kehidupan' : 'Spark Seed of Life',
      targetDay: 15,
      description: isId
        ? 'Di tanah humus yang sejuk, benih apimu baru saja menyala. Setiap tugas harian yang kamu selesaikan akan menghangatkan tubuhnya dan melindunginya dari dinginnya malam.'
        : 'In fertile soil, your spark seed has just sparked to life. Every task you finish warms its body and shelters it from the cold.',
      weatherAdvice: isRaining
        ? (isId ? 'Hujan mengguyur dan apimu mengecil drastis, kedinginan, serta hampir padam! Kerjakan 1 tugas sekarang agar apinya kembali menyala sebelum mati total! 🔥' : 'Rain is falling and your flame has shrunk to a tiny sputtering ember! Complete 1 task right now to reignite your fire before it dies out! 🔥')
        : (isId ? 'Cuaca cerah benderang! Benih apimu menari riang dan bersiap untuk bertunas lebih besar.' : 'Bright and sunny! Your flame seed dances joyfully and prepares to grow bigger.'),
      nextMilestone: isId ? 'Kobaran Ceria Si Bara' : 'Lively Flame',
      daysToNext: 15 - day,
      progressPercent: Math.min(100, Math.round((day / 15) * 100))
    };
  }
  if (day < 50) {
    return {
      badge: isId ? '🔥 Kobaran Ceria' : '🔥 Lively Flame',
      name: isId ? 'Kobaran Ceria Si Bara' : 'Lively Flame',
      targetDay: 50,
      description: isId
        ? 'Konsistensimu membuat benih bertunas menjadi Si Bara yang ramah! Padang rumput di sekitarnya mulai menghijau subur berkat hangat sinarnya.'
        : 'Your daily momentum nourished the seed into a lively flame! Green clover meadows flourish around its warm glow.',
      weatherAdvice: isRaining
        ? (isId ? 'Kobaran apimu padam tergerus hujan dan menyusut jadi bara kecil berasap. Ayo selesaikan tugasmu hari ini untuk mengobarkan apinya kembali!' : 'Your fire collapsed under the rain into a tiny smoking ember. Complete your tasks today to rekindle its lively flame!')
        : (isId ? 'Sinar kobaran apimu menyinari padang rumput dengan kehangatan penuh energi.' : 'Your lively flame bathes the meadow with vibrant, energizing warmth.'),
      nextMilestone: isId ? 'Mentari Melayang ke Angkasa' : 'Ascending Solar Orb',
      daysToNext: 50 - day,
      progressPercent: Math.min(100, Math.round(((day - 15) / 35) * 100))
    };
  }
  if (day < 100) {
    return {
      badge: isId ? '✨ Mentari Melayang' : '✨ Solar Orb',
      name: isId ? 'Bola Mentari Melayang' : 'Ascending Solar Orb',
      targetDay: 100,
      description: isId
        ? 'Apimu telah mengumpulkan daya kosmik dan terangkat melayang dari tanah menuju langit! Sedikit lagi ia akan mencapai tahta tertingginya sebagai Matahari Abadi.'
        : 'Your flame has gathered cosmic energy and levitated from the earth toward the sky! Soon it will ascend to its eternal solar throne.',
      weatherAdvice: isRaining
        ? (isId ? 'Badai hujan memadamkan daya apung mentarimu—ia meredup kelabu dan jatuh ke tanah. Tuntaskan tugasmu untuk memulihkan cahayanya!' : 'The storm quenches your solar orb’s lift—it dims to cold slate and falls to earth. Complete tasks to restore its radiance!')
        : (isId ? 'Korona mentari muda berputar keemasan di udara, menyirami seisi bumi dengan berkah kehangatan.' : 'The young solar corona spins in the sky, showering the earth with warm blessings.'),
      nextMilestone: isId ? 'MATAHARI ABADI (H-100)' : 'THE ETERNAL SUN (D-100)',
      daysToNext: 100 - day,
      progressPercent: Math.min(100, Math.round(((day - 50) / 50) * 100))
    };
  }
  if (day < 180) {
    return {
      badge: isId ? '☀️ Matahari Abadi' : '☀️ Eternal Sun',
      name: isId ? 'Sang Mentari Abadi & Pohon Kehidupan' : 'The Eternal Sun & Tree of Life',
      targetDay: 180,
      description: isId
        ? 'Matahari telah bertahta abadi di atas langit dan tidak akan pernah padam oleh hujan! Kini fokusmu beralih merawat kecambah Pohon Kehidupan di bawahnya.'
        : 'The Sun now reigns eternally in the heavens, completely immune to rain! Your quest now shifts to nurturing the Tree of Life on earth.',
      weatherAdvice: isRaining
        ? (isId ? 'Awan badai kelam menutupi mentarimu dan memudarkan kehangatannya. Selesaikan tugasmu untuk menembus badai dan menyalakan sinarnya kembali!' : 'Dark stormclouds eclipse your sun and drain its warmth. Finish your tasks to pierce the storm and reignite its shine!')
        : (isId ? 'Sinar matahari keemasan memandikan tunas hijau yang mulai membentuk cabang kayu yang kokoh.' : 'Golden sunlight bathes the green shoots as strong wooden branches begin to form.'),
      nextMilestone: isId ? 'Pohon Rimbun & Danau Kristal' : 'Lush Tree & Lake',
      daysToNext: 180 - day,
      progressPercent: Math.min(100, Math.round(((day - 100) / 80) * 100))
    };
  }
  if (day < 270) {
    return {
      badge: isId ? '🌳 Suaka Rimbun' : '🌳 Lush Haven',
      name: isId ? 'Pohon Rimbun & Danau Kristal' : 'Lush Tree & Crystal Lake',
      targetDay: 270,
      description: isId
        ? 'Pohon Kehidupanmu telah menghasilkan buah emas! Awan sejuk berarak damai dan danau kristal memantulkan gemerlap mentari abadi.'
        : 'Your Tree of Life bears golden fruit! Gentle white clouds drift by and a crystal lake reflects the eternal sun’s gleam.',
      weatherAdvice: isRaining
        ? (isId ? 'Kabut dingin dan hujan lebat membuat suakamu kedinginan dan apimu meredup. Kerjakan tugas hari ini untuk mengembalikan cahaya hangat mentari!' : 'Cold fog and heavy rain chill your sanctuary. Complete today’s tasks to bring back the warm sunlight!')
        : (isId ? 'Kupu-kupu beterbangan dan riak danau berkilau seperti permata di bawah mentari.' : 'Butterflies flutter and ripples on the water sparkle like diamonds in the sun.'),
      nextMilestone: isId ? 'Suaka Firdaus Sempurna (1 Tahun)' : 'Grand Living Sanctuary',
      daysToNext: 270 - day,
      progressPercent: Math.min(100, Math.round(((day - 180) / 90) * 100))
    };
  }
  return {
    badge: isId ? '👑 Maha Firdaus' : '👑 Living Paradise',
    name: isId ? 'Suaka Firdaus Abadi' : 'Grand Eternal Sanctuary',
    targetDay: 365,
    description: isId
      ? 'Puncak mahakarya 1 tahun! Di bawah naungan Mentari Abadi, Pohon Kehidupan berbuah emas di bukit zamrud, angsa putih berenang di danau kristal, dan pelangi firdaus melengkung damai merayakan ketekunanmu.'
      : 'A 1-year masterpiece! Under the warm Eternal Sun, the Tree of Life bears golden fruit on emerald hills, a swan glides on the crystal lake, and a gentle rainbow celebrates your steadfast journey.',
    weatherAdvice: isRaining
      ? (isId ? 'Badai dingin menggelapkan firdausmu. Selesaikan tugasmu agar mentari firdaus kembali menyinari negerimu!' : 'A cold storm shadows your sanctuary. Complete your tasks so the paradise sun shines brightly again!')
      : (isId ? 'Suaka firdausmu abadi, mandiri, dan bermandikan cahaya kedamaian.' : 'Your sanctuary thrives in eternal, radiant peace.'),
    nextMilestone: isId ? 'Mahakarya Sempurna' : 'Supreme Masterpiece',
    daysToNext: 0,
    progressPercent: 100
  };
};

export default function OrganicStreakModal({
  isOpen,
  onClose,
  streak,
  journeyDay,
  hasCompletedTaskToday = false,
  lang,
  palette,
  appTheme,
  onNavigateTasks,
  journeyStartDate
}: OrganicStreakModalProps) {
  const activeJourneyDay = journeyDay ?? streak ?? 1;

  // Tab: 'status' (real user day) vs 'simulator' (time machine)
  const [activeTab, setActiveTab] = useState<'status' | 'simulator'>('status');

  // Simulation day slider
  const [simDay, setSimDay] = useState<number>(activeJourneyDay);

  // Negative state toggle: isRaining (true if pending/missed tasks)
  const [simIsRaining, setSimIsRaining] = useState<boolean>(!hasCompletedTaskToday);
  const [isPlayingTimelapse, setIsPlayingTimelapse] = useState<boolean>(false);

  // Sparkle burst particles
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const particleIdRef = useRef(1);
  const timelapseTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync on open
  useEffect(() => {
    if (isOpen) {
      setSimDay(activeJourneyDay);
      setSimIsRaining(!hasCompletedTaskToday);
      setIsPlayingTimelapse(false);
      playConfirmSound();
      triggerHaptic('success');
    }
  }, [isOpen, activeJourneyDay, hasCompletedTaskToday]);

  // Handle timelapse loop
  useEffect(() => {
    if (isPlayingTimelapse) {
      timelapseTimerRef.current = setInterval(() => {
        setSimDay((prev) => {
          if (prev >= 365) {
            setIsPlayingTimelapse(false);
            return 365;
          }
          return Math.min(365, prev + 2);
        });
      }, 100);
    } else {
      if (timelapseTimerRef.current) {
        clearInterval(timelapseTimerRef.current);
        timelapseTimerRef.current = null;
      }
    }

    return () => {
      if (timelapseTimerRef.current) {
        clearInterval(timelapseTimerRef.current);
      }
    };
  }, [isPlayingTimelapse]);

  // Active values based on tab
  const displayDay = activeTab === 'simulator' ? simDay : activeJourneyDay;
  const isNegativeCondition = activeTab === 'simulator' ? simIsRaining : !hasCompletedTaskToday;

  const currentMeta = useMemo(() => {
    return getSunStageMetadata(displayDay, isNegativeCondition, lang);
  }, [displayDay, isNegativeCondition, lang]);

  // Particles on tap
  const handleCanvasClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    triggerHaptic('light');
    playConfirmSound();

    const icons = displayDay >= 100 
      ? ['☀️', '✨', '🍃', '⭐', '💛', '🌈'] 
      : ['🔥', '✨', '🌱', '🧡', '✨'];

    const newItems: BurstParticle[] = [];
    for (let i = 0; i < 4; i++) {
      newItems.push({
        id: particleIdRef.current++,
        x: x + (Math.random() * 30 - 15),
        y: y + (Math.random() * 30 - 15),
        char: icons[Math.floor(Math.random() * icons.length)],
        scale: 0.8 + Math.random() * 0.4
      });
    }

    setParticles((prev) => [...prev.slice(-8), ...newItems]);
  };

  // Particle cleanup
  useEffect(() => {
    if (particles.length === 0) return;
    const t = setTimeout(() => setParticles((p) => p.slice(4)), 900);
    return () => clearTimeout(t);
  }, [particles]);

  // Escape key close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const isDarkTheme = palette.isDark;
  const isCoolTheme = appTheme === 'cool';

  // Quick jump milestones
  const milestonePills = [
    { day: 1, label: lang === 'id' ? 'Benih' : 'Seed', icon: '🌱' },
    { day: 15, label: lang === 'id' ? 'Kobaran' : 'Flame', icon: '🔥' },
    { day: 50, label: lang === 'id' ? 'Melayang' : 'Orb', icon: '✨' },
    { day: 100, label: lang === 'id' ? 'Matahari ☀️' : 'Sun ☀️', icon: '☀️' },
    { day: 180, label: lang === 'id' ? 'Pohon 🌳' : 'Tree 🌳', icon: '🌳' },
    { day: 360, label: lang === 'id' ? 'Firdaus 👑' : 'Paradise 👑', icon: '👑' }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ scale: 0.94, y: 18, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 15, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
            className={`relative w-full max-w-[440px] my-auto rounded-[2rem] p-4 sm:p-5 border shadow-2xl overflow-hidden z-10 select-none ${
              isCoolTheme
                ? 'bg-[#0B132B]/98 border-[#1E3A8A] text-slate-100 shadow-[0_20px_50px_rgba(6,182,212,0.18)]'
                : isDarkTheme
                ? 'bg-slate-900/98 border-slate-700 text-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.5)]'
                : 'bg-[#FCF9F2] border-[#EADFCF] text-[#2C1C10] shadow-[0_20px_50px_rgba(234,88,12,0.14)]'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. TOP BAR: TITLE & CLOSE */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full border bg-black/5 dark:bg-white/5 text-xs font-bold">
                <Icon3DFlame size={15} />
                <span>{lang === 'id' ? 'Ekosistem Apimu' : 'Flame Ecosystem'}</span>
              </div>

              {/* Close Button */}
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onClose();
                }}
                className="w-7 h-7 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer active:scale-90 touch-manipulation"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* 2. STREAK HERO BANNER */}
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-3">
                <div className={`relative shrink-0 flex items-center justify-center w-11 h-11 rounded-2xl border shadow-2xs transition-all ${
                  isNegativeCondition
                    ? 'bg-slate-500/15 border-slate-500/25 text-slate-400'
                    : 'bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-red-500/10 border-orange-500/25'
                }`}>
                  {isNegativeCondition ? (
                    <Icon3DFlame size={24} isDelayed={true} />
                  ) : displayDay >= 100 ? (
                    <span className="text-2xl select-none">☀️</span>
                  ) : (
                    <Icon3DFlame size={24} />
                  )}
                </div>
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-2xl font-black tracking-tight leading-none ${
                      isNegativeCondition ? 'text-slate-400' : 'text-orange-500'
                    }`}>
                      {displayDay}
                    </span>
                    <span className="text-[11px] font-bold uppercase tracking-wider opacity-60">
                      {lang === 'id' ? 'Hari di Tata' : 'Days on Tata'}
                    </span>
                    <span className="text-xs font-bold">
                      {isNegativeCondition ? '💨' : displayDay >= 100 ? '☀️' : '🔥'}
                    </span>
                  </div>
                  <p className="text-[11px] font-medium opacity-70 mt-0.5">
                    {isNegativeCondition 
                      ? (lang === 'id' ? 'Api Padam Menjadi Asap (Belum ada tugas selesai hari ini)' : 'Extinguished to Smoke (No tasks finished today)')
                      : currentMeta.name}
                  </p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
                isNegativeCondition
                  ? 'bg-rose-500/10 border-rose-500/25 text-rose-500 dark:text-rose-400'
                  : displayDay >= 100
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-orange-500/10 border-orange-500/30 text-orange-600 dark:text-orange-400'
              }`}>
                {isNegativeCondition ? (lang === 'id' ? '💨 Padam (Asap)' : '💨 Extinguished') : currentMeta.badge}
              </span>
            </div>

            {/* 3. THE LIVING CANVAS */}
            <div className="relative group mb-3">
              <OrganicStreakCanvas
                day={displayDay}
                isRaining={isNegativeCondition}
                onCanvasClick={handleCanvasClick}
                isDarkTheme={isDarkTheme}
                isCoolTheme={isCoolTheme}
              />

              {/* Status / Weather Quick Badge on Canvas */}
              <button
                onClick={() => {
                  if (activeTab === 'simulator') {
                    setSimIsRaining(!simIsRaining);
                  } else {
                    setActiveTab('simulator');
                    setSimIsRaining(!isNegativeCondition);
                  }
                  triggerHaptic('light');
                  playConfirmSound();
                }}
                className={`absolute top-2.5 right-2.5 px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 backdrop-blur-md cursor-pointer transition-all active:scale-95 border shadow-2xs ${
                  isNegativeCondition
                    ? 'bg-rose-950/85 border-rose-500/40 text-rose-200'
                    : 'bg-black/40 border-white/25 text-white'
                }`}
                title={lang === 'id' ? 'Ketuk untuk menguji kondisi cuaca' : 'Tap to toggle weather'}
              >
                {isNegativeCondition ? (
                  <>
                    <CloudRain size={12} className="text-rose-300" />
                    <span>{lang === 'id' ? 'Tertunda (Padam 💨)' : 'Pending (Dying 💨)'}</span>
                  </>
                ) : (
                  <>
                    <Sun size={12} className="text-amber-300" />
                    <span>{lang === 'id' ? 'Cerah & Menyala 🔥' : 'Sunny & Blazing 🔥'}</span>
                  </>
                )}
              </button>

              {/* Sparkle Particles */}
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 1, scale: 0.4, y: 0 }}
                  animate={{ opacity: 0, scale: p.scale * 1.3, y: -38 }}
                  transition={{ duration: 0.75, ease: 'easeOut' }}
                  className="absolute pointer-events-none text-sm font-bold z-30 select-none"
                  style={{ left: p.x, top: p.y }}
                >
                  {p.char}
                </motion.div>
              ))}
            </div>

            {/* 4. SEGMENTED TAB SELECTOR */}
            <div className="flex items-center p-1 mb-2.5 rounded-xl border bg-black/5 dark:bg-white/5">
              <button
                onClick={() => {
                  setActiveTab('status');
                  setIsPlayingTimelapse(false);
                  triggerHaptic('light');
                  playConfirmSound();
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'status'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'opacity-65 hover:opacity-100'
                }`}
              >
                <Compass size={13} />
                <span>{lang === 'id' ? 'Status Nyata' : 'Your Journey'}</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('simulator');
                  triggerHaptic('light');
                  playConfirmSound();
                }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'simulator'
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'opacity-65 hover:opacity-100'
                }`}
              >
                <Sliders size={13} />
                <span>{lang === 'id' ? 'Mesin Waktu (365H)' : 'Time Machine'}</span>
              </button>
            </div>

            {/* 5. TAB A: STATUS NYATA (Current user progress) */}
            {activeTab === 'status' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-2.5"
              >
                <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                  isCoolTheme
                    ? 'bg-[#0E1B3A]/70 border-[#1D3268]'
                    : isDarkTheme
                    ? 'bg-slate-800/70 border-slate-700'
                    : 'bg-[#F7F2E9] border-[#EADFCF]'
                }`}>
                  <p className="font-normal opacity-90 mb-2">
                    {currentMeta.description}
                  </p>

                  <div className={`flex items-center gap-2 p-2 rounded-lg font-medium ${
                    isNegativeCondition
                      ? (isCoolTheme ? 'bg-rose-950/70 text-rose-200' : 'bg-rose-50 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200')
                      : (isCoolTheme ? 'bg-emerald-950/40 text-emerald-200' : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200')
                  }`}>
                    {isNegativeCondition ? (
                      <CloudRain size={14} className="shrink-0 text-blue-500" />
                    ) : (
                      <Sun size={14} className="shrink-0 text-amber-500" />
                    )}
                    <span className="text-[11px] leading-tight">
                      {currentMeta.weatherAdvice}
                    </span>
                  </div>
                </div>

                {/* Dual Stats: Journey Days vs Task Streak */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col p-2.5 rounded-xl border bg-black/5 dark:bg-white/5">
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                      {lang === 'id' ? 'Hari di Tata' : 'Days on Tata'}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className="text-xl font-black text-orange-500 font-mono">
                        {activeJourneyDay}
                      </span>
                      <span className="text-[11px] font-semibold opacity-70">
                        {lang === 'id' ? 'hari perjalanan' : 'journey days'}
                      </span>
                    </div>
                    {journeyStartDate && (
                      <span className="text-[9px] opacity-60 mt-0.5">
                        {lang === 'id' ? 'Mulai: ' : 'Since: '}
                        {new Date(journeyStartDate).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col p-2.5 rounded-xl border bg-black/5 dark:bg-white/5">
                    <span className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
                      {lang === 'id' ? 'Streak Tugas' : 'Task Streak'}
                    </span>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={`text-xl font-black font-mono ${
                        hasCompletedTaskToday ? 'text-amber-500' : 'text-slate-400 dark:text-slate-500'
                      }`}>
                        {hasCompletedTaskToday ? Math.max(1, streak) : 0}
                      </span>
                      <span className="text-[11px] font-semibold opacity-70">
                        {hasCompletedTaskToday 
                          ? (lang === 'id' ? 'hari berturut' : 'consecutive') 
                          : (lang === 'id' ? 'hari (padam)' : 'extinguished')}
                      </span>
                    </div>
                    <span className={`text-[9px] font-bold mt-0.5 ${
                      hasCompletedTaskToday ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {hasCompletedTaskToday 
                        ? (lang === 'id' ? '✓ Menyala hari ini' : '✓ Active today') 
                        : (lang === 'id' ? '💨 Padam jadi asap' : '💨 Extinguished')}
                    </span>
                  </div>
                </div>
                {currentMeta.daysToNext > 0 && (
                  <div className={`px-3 py-2 rounded-xl border ${
                    isCoolTheme
                      ? 'bg-[#0E1B3A]/40 border-[#1D3268]/60'
                      : isDarkTheme
                      ? 'bg-slate-800/40 border-slate-700/50'
                      : 'bg-[#F9F5EE] border-[#EADFCF]/70'
                  }`}>
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1.5">
                      <span className="opacity-75">
                        {lang === 'id' ? `Menuju: ${currentMeta.nextMilestone}` : `Next: ${currentMeta.nextMilestone}`}
                      </span>
                      <span className="text-orange-500 font-extrabold">
                        {lang === 'id' ? `${currentMeta.daysToNext} Hari Lagi` : `${currentMeta.daysToNext}d left`}
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          displayDay >= 100 ? 'bg-amber-500' : 'bg-orange-500'
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${currentMeta.progressPercent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* 6. TAB B: SIMULATOR CONTROLLER */}
            {activeTab === 'simulator' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-2"
              >
                {/* Timeline Controls */}
                <div className={`p-3 rounded-xl border ${
                  isCoolTheme
                    ? 'bg-[#0E1B3A]/70 border-[#1D3268]'
                    : isDarkTheme
                    ? 'bg-slate-800/70 border-slate-700'
                    : 'bg-[#F7F2E9] border-[#EADFCF]'
                }`}>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="opacity-75 flex items-center gap-1">
                      <Calendar size={13} />
                      {lang === 'id' ? 'Hari ke-' : 'Day '}{simDay}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Play/Pause Timelapse */}
                      <button
                        onClick={() => {
                          setIsPlayingTimelapse(!isPlayingTimelapse);
                          triggerHaptic('light');
                        }}
                        className="p-1 rounded-md bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title={isPlayingTimelapse ? 'Pause' : 'Play Timelapse'}
                      >
                        {isPlayingTimelapse ? <Pause size={13} /> : <Play size={13} />}
                      </button>

                      {/* Reset to actual journey day */}
                      <button
                        onClick={() => {
                          setSimDay(activeJourneyDay);
                          setIsPlayingTimelapse(false);
                          triggerHaptic('light');
                        }}
                        className="p-1 rounded-md bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title={lang === 'id' ? `Kembali ke Hari ke-${activeJourneyDay}` : `Reset to Day ${activeJourneyDay}`}
                      >
                        <RotateCcw size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Day Slider */}
                  <input
                    type="range"
                    min="0"
                    max="365"
                    value={simDay}
                    onChange={(e) => {
                      setSimDay(Number(e.target.value));
                      setIsPlayingTimelapse(false);
                    }}
                    className="w-full accent-orange-500 cursor-pointer h-1.5 rounded-lg bg-black/10 dark:bg-white/10"
                  />

                  {/* Quick Jump Milestone Buttons */}
                  <div className="grid grid-cols-6 gap-1 mt-2.5">
                    {milestonePills.map((m) => (
                      <button
                        key={m.day}
                        onClick={() => {
                          setSimDay(m.day);
                          setIsPlayingTimelapse(false);
                          triggerHaptic('light');
                        }}
                        className={`py-1 px-0.5 rounded-md text-[10px] font-bold text-center transition-all cursor-pointer border ${
                          simDay >= m.day && (m.day === 360 || simDay < (milestonePills[milestonePills.indexOf(m) + 1]?.day || 361))
                            ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                            : 'bg-black/5 dark:bg-white/5 border-transparent opacity-70 hover:opacity-100'
                        }`}
                      >
                        <span className="block text-xs leading-none mb-0.5">{m.icon}</span>
                        <span className="block truncate">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Weather Simulator Toggle */}
                <div className="flex items-center justify-between px-2 py-1.5 rounded-xl border text-xs font-semibold bg-black/5 dark:bg-white/5">
                  <span className="opacity-75">{lang === 'id' ? 'Kondisi Tugas' : 'Task Status'}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setSimIsRaining(false);
                        triggerHaptic('light');
                      }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        !simIsRaining
                          ? 'bg-amber-500 text-zinc-950 shadow-xs'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <Sun size={11} />
                      <span>{lang === 'id' ? 'Selesai (Menyala 🔥)' : 'Done (Blazing 🔥)'}</span>
                    </button>

                    <button
                      onClick={() => {
                        setSimIsRaining(true);
                        triggerHaptic('light');
                      }}
                      className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        simIsRaining
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'opacity-60 hover:opacity-100'
                      }`}
                    >
                      <CloudRain size={11} />
                      <span>{lang === 'id' ? 'Tertunda (Padam / Asap 💨)' : 'Pending (Smoke 💨)'}</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 7. ACTION BUTTON */}
            <div className="mt-3">
              {isNegativeCondition && onNavigateTasks ? (
                <button
                  onClick={() => {
                    playConfirmSound();
                    triggerHaptic('success');
                    onNavigateTasks();
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all ${
                    isCoolTheme
                      ? 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/25'
                      : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/25'
                  }`}
                >
                  <Icon3DFlame size={16} />
                  <span>
                    {lang === 'id' ? 'Nyalakan Kembali Apimu (Tuntaskan Tugas 🔥)' : 'Reignite Your Flame (Complete Tasks 🔥)'}
                  </span>
                  <ChevronRight size={14} />
                </button>
              ) : (
                <button
                  onClick={() => {
                    playConfirmSound();
                    triggerHaptic('success');
                    onClose();
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all ${
                    displayDay >= 100
                      ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-500/20'
                      : isCoolTheme
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20'
                      : 'bg-orange-500 hover:bg-orange-400 text-white shadow-orange-500/25'
                  }`}
                >
                  <CheckCircle2 size={15} />
                  <span>
                    {displayDay >= 100
                      ? (lang === 'id' ? 'Matahari Bersinar Abadi! ✨' : 'The Eternal Sun Shines! ✨')
                      : (lang === 'id' ? 'Semangat Terus Bertumbuh! 🔥' : 'Keep Nurturing Your Flame! 🔥')}
                  </span>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, Brain, Trophy, Timer, Sparkles, HelpCircle, Star, Award, Zap, Lock, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store';

interface Card {
  id: number;
  emoji: string;
  isFlipped: boolean;
  isMatched: boolean;
}

type CardTheme = 'animals' | 'food' | 'tech' | 'activities';

const THEMES: Record<CardTheme, string[]> = {
  animals: ['🐶', '🐱', '🦊', '🦁', '🐼', '🐨', '🐯', '🐰', '🐸', '🐙', '🦄', '🐝'],
  food: ['🍎', '🍕', '🍔', '🍰', '🥑', '🍓', '🍿', '🍩', '🍇', '🍒', '🍦', '🍉'],
  tech: ['💻', '📱', '🎮', '🎧', '📷', '⌚️', '🚀', '💡', '📡', '🎙️', '🕹️', '📟'],
  activities: ['⚽️', '🏀', '🎾', '🚴', '🧘', '🎨', '🎸', '🎹', '🏊', '🥋', '🛹', '🏆'],
};

interface LevelConfig {
  levelNumber: number;
  nameId: string;
  nameEn: string;
  rows: number;
  cols: number;
  pairs: number;
}

const LEVELS: LevelConfig[] = [
  { levelNumber: 1, nameId: 'Sangat Mudah 🌟', nameEn: 'Very Easy 🌟', rows: 2, cols: 3, pairs: 3 },
  { levelNumber: 2, nameId: 'Mudah ✨', nameEn: 'Easy ✨', rows: 3, cols: 4, pairs: 6 },
  { levelNumber: 3, nameId: 'Sedang ⚡️', nameEn: 'Medium ⚡️', rows: 4, cols: 4, pairs: 8 },
  { levelNumber: 4, nameId: 'Cukup Sulit 🔥', nameEn: 'Challenging 🔥', rows: 4, cols: 5, pairs: 10 },
  { levelNumber: 5, nameId: 'Sulit 💀', nameEn: 'Hard 💀', rows: 4, cols: 6, pairs: 12 },
];

let audioCtx: AudioContext | null = null;

export default function MemoryGameScreen({ onBack }: { onBack: () => void }) {
  const { lang, moods } = useAppStore();
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [unlockedLevel, setUnlockedLevel] = useState<number>(1);
  const [theme, setTheme] = useState<CardTheme>('animals');
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [highScore, setHighScore] = useState<number | null>(null);
  const [bestTime, setBestTime] = useState<number | null>(null);
  const [showVictorySparkle, setShowVictorySparkle] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const todayMood = moods.find(m => m.date === today)?.mood || 'neutral';

  const themeColorClass = {
    excellent: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20',
    good: 'text-teal-500 bg-teal-500/10 border-teal-500/30 hover:bg-teal-500/20',
    neutral: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20',
    bad: 'text-orange-500 bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
    terrible: 'text-rose-500 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20',
  }[todayMood] || 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30 hover:bg-indigo-500/20';

  const accentButtonClass = {
    excellent: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20',
    good: 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20',
    neutral: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20',
    bad: 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20',
    terrible: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20',
  }[todayMood] || 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20';

  // Sound effects
  const playSound = (type: 'flip' | 'match' | 'mismatch' | 'victory') => {
    try {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'flip') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(350, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, audioCtx.currentTime + 0.08);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } else if (type === 'match') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.35);
      } else if (type === 'mismatch') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime); // A3
        osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.25); // A2
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'victory') {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]; // Arpeggio C
        notes.forEach((freq, idx) => {
          const stepOsc = audioCtx!.createOscillator();
          const stepGain = audioCtx!.createGain();
          stepOsc.connect(stepGain);
          stepGain.connect(audioCtx!.destination);
          stepOsc.type = 'sine';
          stepOsc.frequency.setValueAtTime(freq, audioCtx!.currentTime + idx * 0.1);
          stepGain.gain.setValueAtTime(0.2, audioCtx!.currentTime + idx * 0.1);
          stepGain.gain.exponentialRampToValueAtTime(0.01, audioCtx!.currentTime + idx * 0.1 + 0.4);
          stepOsc.start(audioCtx!.currentTime + idx * 0.1);
          stepOsc.stop(audioCtx!.currentTime + idx * 0.1 + 0.4);
        });
      }
    } catch (e) {
      console.warn('Audio feedback failed to play', e);
    }
  };

  // Load unlocked level and high scores
  useEffect(() => {
    try {
      const savedUnlocked = localStorage.getItem('tata_memory_unlocked_level');
      if (savedUnlocked) {
        setUnlockedLevel(parseInt(savedUnlocked));
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    const keyScores = `tata_memory_best_moves_lvl_${currentLevel}_${theme}`;
    const keyTime = `tata_memory_best_time_lvl_${currentLevel}_${theme}`;
    try {
      const storedMoves = localStorage.getItem(keyScores);
      const storedTime = localStorage.getItem(keyTime);
      setHighScore(storedMoves ? parseInt(storedMoves) : null);
      setBestTime(storedTime ? parseInt(storedTime) : null);
    } catch (e) {}
  }, [currentLevel, theme]);

  // Start/Restart Game
  const initGameWithLevel = (levelNum: number) => {
    const lvlConfig = LEVELS[levelNum - 1] || LEVELS[0];
    const { pairs } = lvlConfig;
    const sourceEmojis = THEMES[theme].slice(0, pairs);
    const gameEmojis = [...sourceEmojis, ...sourceEmojis];
    
    // Fisher-Yates shuffle
    for (let i = gameEmojis.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gameEmojis[i], gameEmojis[j]] = [gameEmojis[j], gameEmojis[i]];
    }

    const initialCards: Card[] = gameEmojis.map((emoji, index) => ({
      id: index,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));

    setCards(initialCards);
    setSelectedIndices([]);
    setMoves(0);
    setMatches(0);
    setTimer(0);
    setIsGameOver(false);
    setIsPlaying(true);
    setShowVictorySparkle(false);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
  };

  const initGame = () => {
    initGameWithLevel(currentLevel);
  };

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Handle card click
  const handleCardClick = (index: number) => {
    if (!isPlaying || isGameOver || selectedIndices.length >= 2 || cards[index].isFlipped || cards[index].isMatched) {
      return;
    }

    playSound('flip');

    // Flip card
    const updatedCards = [...cards];
    updatedCards[index].isFlipped = true;
    setCards(updatedCards);

    const newSelected = [...selectedIndices, index];
    setSelectedIndices(newSelected);

    if (newSelected.length === 2) {
      setMoves(prev => prev + 1);
      const [firstIdx, secondIdx] = newSelected;

      // Check for match
      if (cards[firstIdx].emoji === cards[secondIdx].emoji) {
        // Matched!
        setTimeout(() => {
          playSound('match');
          const matchedCards = [...cards];
          matchedCards[firstIdx].isMatched = true;
          matchedCards[secondIdx].isMatched = true;
          setCards(matchedCards);
          setSelectedIndices([]);
          
          const newMatches = matches + 1;
          setMatches(newMatches);

          // Check if game won
          const lvlConfig = LEVELS[currentLevel - 1] || LEVELS[0];
          const { pairs } = lvlConfig;
          if (newMatches === pairs) {
            handleVictory();
          }
        }, 400);
      } else {
        // Mismatch - flip back
        setTimeout(() => {
          playSound('mismatch');
          const resetCards = [...cards];
          resetCards[firstIdx].isFlipped = false;
          resetCards[secondIdx].isFlipped = false;
          setCards(resetCards);
          setSelectedIndices([]);
        }, 1000);
      }
    }
  };

  const handleVictory = () => {
    setIsGameOver(true);
    setShowVictorySparkle(true);
    playSound('victory');
    if (timerRef.current) clearInterval(timerRef.current);

    // Save Highscore
    const keyMoves = `tata_memory_best_moves_lvl_${currentLevel}_${theme}`;
    const keyTime = `tata_memory_best_time_lvl_${currentLevel}_${theme}`;
    
    try {
      const storedMoves = localStorage.getItem(keyMoves);
      const storedTime = localStorage.getItem(keyTime);

      if (!storedMoves || moves + 1 < parseInt(storedMoves)) {
        localStorage.setItem(keyMoves, (moves + 1).toString());
        setHighScore(moves + 1);
      }

      if (!storedTime || timer < parseInt(storedTime)) {
        localStorage.setItem(keyTime, timer.toString());
        setBestTime(timer);
      }

      // Unlock next level
      if (currentLevel === unlockedLevel && unlockedLevel < LEVELS.length) {
        const nextLvl = unlockedLevel + 1;
        setUnlockedLevel(nextLvl);
        localStorage.setItem('tata_memory_unlocked_level', nextLvl.toString());
      }
    } catch (e) {}
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const currentGrid = LEVELS[currentLevel - 1] || LEVELS[0];

  const getCardSizeClasses = (cols: number) => {
    if (cols >= 6) {
      return {
        text: 'text-lg sm:text-2xl',
        icon: 'w-4 h-4 sm:w-5 sm:h-5',
        rounded: 'rounded-xl',
      };
    }
    if (cols === 5) {
      return {
        text: 'text-xl sm:text-2xl',
        icon: 'w-4 h-4 sm:w-5 sm:h-5',
        rounded: 'rounded-xl',
      };
    }
    if (cols === 4) {
      return {
        text: 'text-xl sm:text-3xl',
        icon: 'w-5 h-5 sm:w-7 sm:h-7',
        rounded: 'rounded-2xl',
      };
    }
    return {
      text: 'text-3xl sm:text-4xl',
      icon: 'w-7 h-7 sm:w-9 sm:h-9',
      rounded: 'rounded-2xl',
    };
  };

  const sizeConfig = getCardSizeClasses(currentGrid.cols);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-slate-900 border-b border-slate-800 shrink-0 transition-colors">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <h2 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
          <Brain className="text-indigo-500 w-5 h-5" />
          {lang === 'id' ? 'Asah Otak' : 'Brain Booster'}
        </h2>
        <button 
          onClick={initGame} 
          className="p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-slate-50 transition-all active:scale-90"
          title={lang === 'id' ? 'Reset Game' : 'Reset Game'}
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar">
        <div className="flex flex-col items-center justify-center p-4 py-6 min-h-[min-content] sm:min-h-full max-w-lg mx-auto w-full space-y-6 pb-12">
        
        {/* Game Stats */}
        <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-[2rem] p-4 flex justify-around items-center text-center shadow-lg">
          <div className="flex flex-col items-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              {lang === 'id' ? 'Langkah' : 'Moves'}
            </div>
            <span className="text-xl font-black text-slate-50 font-mono">{moves}</span>
          </div>

          <div className="w-[1px] h-8 bg-slate-800/60" />

          <div className="flex flex-col items-center">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
              <Timer className="w-3.5 h-3.5 text-indigo-400" />
              {lang === 'id' ? 'Waktu' : 'Time'}
            </div>
            <span className="text-xl font-black text-slate-50 font-mono">{formatTime(timer)}</span>
          </div>

          {(highScore !== null || bestTime !== null) && (
            <>
              <div className="w-[1px] h-8 bg-slate-800/60" />
              <div className="flex flex-col items-center">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                  {lang === 'id' ? 'Terbaik' : 'Best'}
                </div>
                <span className="text-xs font-bold text-yellow-400 font-mono">
                  {highScore ? `${highScore} ${lang === 'id' ? 'Langkah' : 'mv'}` : ''}
                  {bestTime ? ` (${formatTime(bestTime)})` : ''}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Configuration Setup when not playing */}
        {!isPlaying && (
          <div className="w-full bg-slate-900/60 border border-slate-800/80 rounded-[2.5rem] p-6 space-y-5 animate-in fade-in duration-300">
            <div>
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3 text-center">
                {lang === 'id' ? 'Pilih Level Tantangan' : 'Choose Challenge Level'}
              </h3>
              <div className="grid grid-cols-1 gap-2.5 max-h-[220px] overflow-y-auto pr-1 no-scrollbar border border-slate-800/50 rounded-2xl p-2.5 bg-slate-950/25">
                {LEVELS.map(lvl => {
                  const isLocked = lvl.levelNumber > unlockedLevel;
                  const isCurrent = currentLevel === lvl.levelNumber;
                  return (
                    <button
                      key={lvl.levelNumber}
                      disabled={isLocked}
                      onClick={() => setCurrentLevel(lvl.levelNumber)}
                      className={`w-full py-3 px-3.5 rounded-xl font-bold text-xs border transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/15'
                          : isLocked
                            ? 'bg-slate-950/20 border-slate-900/50 text-slate-600 cursor-not-allowed'
                            : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 text-left">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-[10px] ${
                          isCurrent 
                            ? 'bg-white/25 text-white' 
                            : isLocked 
                              ? 'bg-slate-900 text-slate-700' 
                              : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                          {lvl.levelNumber}
                        </span>
                        <div>
                          <div className="font-extrabold text-xs sm:text-sm">
                            {lang === 'id' ? lvl.nameId : lvl.nameEn}
                          </div>
                          <div className="text-[9px] opacity-60 font-mono mt-0.5">
                            {lvl.cols}x{lvl.rows} ({lvl.pairs} {lang === 'id' ? 'pasangan' : 'pairs'})
                          </div>
                        </div>
                      </div>
                      <div>
                        {isLocked ? (
                          <Lock className="w-3.5 h-3.5 text-slate-700" />
                        ) : isCurrent ? (
                          <span className="text-[8px] font-black tracking-wider uppercase bg-white/20 px-2 py-0.5 rounded">
                            {lang === 'id' ? 'Dipilih' : 'Active'}
                          </span>
                        ) : (
                          <span className="text-[8px] font-black tracking-wider uppercase text-indigo-400/80">
                            {lang === 'id' ? 'Main' : 'Play'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-3 text-center">
                {lang === 'id' ? 'Pilih Tema Kartu' : 'Choose Card Theme'}
              </h3>
              <div className="grid grid-cols-2 gap-2.5">
                {(Object.keys(THEMES) as CardTheme[]).map(tName => (
                  <button
                    key={tName}
                    onClick={() => setTheme(tName)}
                    className={`py-3 px-3 rounded-2xl font-bold text-xs capitalize border transition-all flex items-center justify-between ${
                      theme === tName
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/15'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{tName === 'animals' ? (lang === 'id' ? 'Hewan' : 'Animals') : tName === 'food' ? (lang === 'id' ? 'Makanan' : 'Food') : tName === 'tech' ? (lang === 'id' ? 'Tekno' : 'Tech') : (lang === 'id' ? 'Aktivitas' : 'Activities')}</span>
                    <span className="text-sm">{THEMES[tName][0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={initGame}
              className={`w-full py-4 text-center text-slate-50 font-black tracking-wider text-sm rounded-2xl shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98] mt-2 ${accentButtonClass}`}
            >
              {lang === 'id' ? 'Mulai Bermain 🎮' : 'Start Game 🎮'}
            </button>
          </div>
        )}

        {/* Game Grid Board */}
        {isPlaying && (
          <div className="w-full space-y-4">
            {/* Level Info Header inside Game */}
            <div className="flex justify-between items-center px-2">
              <span className="text-xs text-indigo-400 font-extrabold tracking-widest uppercase flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                Level {currentGrid.levelNumber}: {lang === 'id' ? currentGrid.nameId : currentGrid.nameEn}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {currentGrid.cols}x{currentGrid.rows} Grid
              </span>
            </div>

            <div 
              className={`grid w-full animate-in zoom-in-95 duration-300 select-none ${currentGrid.cols >= 5 ? 'gap-1.5' : 'gap-3'}`}
              style={{
                gridTemplateColumns: `repeat(${currentGrid.cols}, minmax(0, 1fr))`,
              }}
            >
              {cards.map((card, index) => {
                const isRevealed = card.isFlipped || card.isMatched;
                return (
                  <div
                    key={card.id}
                    onClick={() => handleCardClick(index)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        handleCardClick(index);
                      }
                    }}
                    className={`aspect-square w-full cursor-pointer focus:outline-none ${
                      card.isMatched 
                        ? 'opacity-40 pointer-events-none transition-opacity duration-300' 
                        : 'hover:scale-[1.04] active:scale-[0.96] transition-transform duration-200'
                    }`}
                    style={{
                      perspective: '1000px',
                      WebkitPerspective: '1000px',
                    }}
                  >
                    <div 
                      className="relative w-full h-full transition-transform duration-500"
                      style={{
                        transformStyle: 'preserve-3d',
                        WebkitTransformStyle: 'preserve-3d',
                        transform: isRevealed ? 'rotateY(180deg)' : 'rotateY(0deg)',
                      }}
                    >
                      {/* Front Side (Emoji) - Rotated by 180deg */}
                      <div 
                        className={`absolute inset-0 ${sizeConfig.rounded} border-2 flex items-center justify-center ${sizeConfig.text} shadow-md ${
                          card.isMatched
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                            : 'bg-indigo-500/10 border-indigo-500/40 text-slate-100'
                        }`}
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(180deg) translate3d(0,0,0)',
                        }}
                      >
                        <span className="select-none">{card.emoji}</span>
                      </div>

                      {/* Back Side (Help/Pattern) - Face up initially */}
                      <div 
                        className={`absolute inset-0 ${sizeConfig.rounded} border border-slate-800 bg-slate-900 flex items-center justify-center shadow-md hover:border-indigo-500/40 text-slate-500 transition-colors duration-200`}
                        style={{
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          transform: 'rotateY(0deg) translate3d(0,0,0)',
                        }}
                      >
                        <HelpCircle className={`${sizeConfig.icon} text-slate-600`} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Victory Screen Modal */}
        {isGameOver && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
              {showVictorySparkle && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl animate-pulse" />
                </div>
              )}
              
              <div className="w-16 h-16 mx-auto bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 rounded-full flex items-center justify-center mb-6">
                <Award className="w-9 h-9" />
              </div>

              <h3 className="text-2xl font-black text-slate-50 mb-2">
                {lang === 'id' ? 'Luar Biasa! 🎉' : 'Awesome Match! 🎉'}
              </h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                {lang === 'id' 
                  ? `Kamu menyelesaikan Level ${currentLevel} dalam ${moves} langkah dengan waktu ${formatTime(timer)}.`
                  : `You completed Level ${currentLevel} in ${moves} moves within ${formatTime(timer)}.`}
              </p>

              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 mb-8 space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>{lang === 'id' ? 'Level Selesai' : 'Level Completed'}</span>
                  <span className="font-bold text-slate-200">Level {currentLevel}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>{lang === 'id' ? 'Total Langkah' : 'Total Moves'}</span>
                  <span className="font-bold text-slate-100">{moves}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>{lang === 'id' ? 'Total Waktu' : 'Total Time'}</span>
                  <span className="font-bold text-slate-100">{formatTime(timer)}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {currentLevel < LEVELS.length ? (
                  <button
                    onClick={() => {
                      const nextLvl = currentLevel + 1;
                      setCurrentLevel(nextLvl);
                      initGameWithLevel(nextLvl);
                    }}
                    className={`w-full py-3.5 text-slate-50 font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] text-sm shadow-lg flex items-center justify-center gap-1.5 ${accentButtonClass}`}
                  >
                    <span>{lang === 'id' ? 'Level Selanjutnya ➡️' : 'Next Level ➡️'}</span>
                  </button>
                ) : (
                  <div className="text-xs text-yellow-400 font-bold bg-yellow-500/10 border border-yellow-500/20 py-2 rounded-xl mb-2">
                    🏆 {lang === 'id' ? 'Hebat! Kamu menyelesaikan semua level!' : 'Amazing! You completed all levels!'}
                  </div>
                )}
                
                <button
                  onClick={initGame}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-bold text-xs rounded-xl transition-all"
                >
                  {lang === 'id' ? 'Main Lagi 🔄' : 'Play Again 🔄'}
                </button>

                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setIsGameOver(false);
                  }}
                  className="w-full py-2 bg-slate-900 border border-slate-800/80 hover:bg-slate-800 text-slate-400 rounded-xl font-bold text-[11px] transition-colors"
                >
                  {lang === 'id' ? 'Pilih Level Lain' : 'Select Another Level'}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Gamepad2, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store';
import { useTranslation } from '../translations';
import { motion } from 'motion/react';

let audioCtx: AudioContext | null = null;

const getAudioCtx = () => {
  if (!audioCtx) {
    try {
      const AudioContextDef = typeof window !== 'undefined' ? (window.AudioContext || (window as any).webkitAudioContext) : null;
      if (AudioContextDef) {
        audioCtx = new AudioContextDef();
      }
    } catch (_) {}
  }
  return audioCtx;
};

export default function PuzzleScreen({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<number[]>([]);
  const [isWon, setIsWon] = useState(false);
  const [moves, setMoves] = useState(0);

  const { lang, moods } = useAppStore();
  const t = useTranslation(lang);

  const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const todayMood = moods.find(m => m.date === today)?.mood || 'neutral';

  const themeColors = {
    excellent: 'text-emerald-400 bg-emerald-500 hover:bg-emerald-600 border-emerald-500/20 shadow-emerald-500/10',
    good: 'text-teal-400 bg-teal-500 hover:bg-teal-600 border-teal-500/20 shadow-teal-500/10',
    neutral: 'text-indigo-400 bg-indigo-500 hover:bg-indigo-600 border-indigo-500/20 shadow-indigo-500/10',
    bad: 'text-orange-400 bg-orange-500 hover:bg-orange-600 border-orange-500/20 shadow-orange-500/10',
    terrible: 'text-rose-400 bg-rose-500 hover:bg-rose-600 border-rose-500/20 shadow-rose-500/10',
  }[todayMood] || 'text-indigo-400 bg-indigo-500 hover:bg-indigo-600 border-indigo-500/20 shadow-indigo-500/10';

  const accentText = themeColors.split(' ')[0];
  const accentBg = themeColors.split(' ')[1];
  const accentHover = themeColors.split(' ')[2];
  const accentBorder = themeColors.split(' ')[3];
  const accentShadow = themeColors.split(' ')[4];

  const playSound = (type: 'click' | 'win' | 'shuffle') => {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(450, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.5, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
      } else if (type === 'win') {
        // Play a nice arpeggio for victory
        osc.type = 'triangle';
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(392.00, now); // G4
        osc.frequency.setValueAtTime(523.25, now + 0.08); // C5
        osc.frequency.setValueAtTime(659.25, now + 0.16); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.24); // G5
        osc.frequency.setValueAtTime(1046.50, now + 0.32); // C6
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.setValueAtTime(0.4, now + 0.32);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'shuffle') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.12);
      }
    } catch (e) {
      console.warn('Sound play error:', e);
    }
  };

  const isSolvable = (arr: number[]) => {
    let inversions = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i] && arr[j] && arr[i] > arr[j]) {
          inversions++;
        }
      }
    }
    return inversions % 2 === 0;
  };

  const isWinning = (arr: number[]) => {
    const winState = [1, 2, 3, 4, 5, 6, 7, 8, 0];
    return arr.length === 9 && arr.every((val, index) => val === winState[index]);
  };

  const initGame = () => {
    let shuffled: number[];
    do {
      shuffled = [1, 2, 3, 4, 5, 6, 7, 8, 0].sort(() => Math.random() - 0.5);
    } while (!isSolvable(shuffled) || isWinning(shuffled));
    setBoard(shuffled);
    setIsWon(false);
    setMoves(0);
    playSound('shuffle');
  };

  useEffect(() => {
    initGame();
  }, []);

  const handleTileClick = (index: number) => {
    if (isWon) return;

    const emptyIndex = board.indexOf(0);
    if (emptyIndex === -1) return;

    const row = Math.floor(index / 3);
    const col = index % 3;
    const emptyRow = Math.floor(emptyIndex / 3);
    const emptyCol = emptyIndex % 3;

    const isAdjacent = Math.abs(row - emptyRow) + Math.abs(col - emptyCol) === 1;

    if (isAdjacent) {
      playSound('click');
      const newBoard = [...board];
      newBoard[emptyIndex] = board[index];
      newBoard[index] = 0;
      
      setBoard(newBoard);
      setMoves(m => m + 1);

      if (isWinning(newBoard)) {
        setIsWon(true);
        setTimeout(() => playSound('win'), 80);
      }
    }
  };

  // Keyboard Navigation: Arrow Keys & WASD Support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isWon) return;
      const key = e.key.toLowerCase();
      if (board.length === 0) return;

      const emptyIndex = board.indexOf(0);
      if (emptyIndex === -1) return;

      const emptyRow = Math.floor(emptyIndex / 3);
      const emptyCol = emptyIndex % 3;

      let targetRow = -1;
      let targetCol = -1;

      if (key === 'arrowup' || key === 'w') {
        // Move tile below blank up (blank moves down)
        targetRow = emptyRow + 1;
        targetCol = emptyCol;
      } else if (key === 'arrowdown' || key === 's') {
        // Move tile above blank down (blank moves up)
        targetRow = emptyRow - 1;
        targetCol = emptyCol;
      } else if (key === 'arrowleft' || key === 'a') {
        // Move tile to the right of blank left (blank moves right)
        targetRow = emptyRow;
        targetCol = emptyCol + 1;
      } else if (key === 'arrowright' || key === 'd') {
        // Move tile to the left of blank right (blank moves left)
        targetRow = emptyRow;
        targetCol = emptyCol - 1;
      }

      if (targetRow >= 0 && targetRow < 3 && targetCol >= 0 && targetCol < 3) {
        e.preventDefault();
        const targetIndex = targetRow * 3 + targetCol;
        handleTileClick(targetIndex);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [board, isWon]);

  return (
    <div className="relative flex flex-col h-full bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-slate-900/60 backdrop-blur-md border-b border-slate-800/60 shrink-0 z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800/60 transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <h2 className="font-extrabold text-lg text-slate-50 flex items-center gap-2 tracking-tight">
          <Gamepad2 className={accentText} /> {t('slidingPuzzleTitle')}
        </h2>
        <div className="w-9" />
      </div>

      {/* Main Game Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-[340px] flex flex-col items-center gap-6">
          
          {/* Stats Bar */}
          <div className="flex items-center justify-between w-full px-2 text-slate-400">
            <span className="font-mono text-sm tracking-wide font-semibold">
              {t('gameMoves')}: <span className="text-slate-200 font-black text-base">{moves}</span>
            </span>
            <button 
              onClick={initGame}
              className={`font-black text-xs uppercase tracking-wider flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:text-slate-100 hover:bg-slate-850 active:scale-95 transition-all cursor-pointer`}
            >
              <RotateCcw size={13} className="shrink-0" /> {t('gameShuffle')}
            </button>
          </div>

          {/* Puzzle Board Wrapper */}
          <div className="bg-slate-900/90 p-3 rounded-[28px] w-full aspect-square relative z-10 border border-slate-800/80 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <div className="grid grid-cols-3 gap-2.5 w-full h-full">
              {board.map((cell, index) => {
                if (cell === 0) {
                  return (
                    <motion.div 
                      layout
                      key="cell-0" 
                      transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                      className="aspect-square rounded-2xl bg-slate-950/40 border border-transparent"
                    />
                  );
                }
                
                return (
                  <motion.button
                    layout
                    key={`cell-${cell}`}
                    onClick={() => handleTileClick(index)}
                    disabled={isWon}
                    transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                    className="flex flex-col items-center justify-center text-3xl font-mono font-black rounded-2xl aspect-square relative overflow-hidden group border border-slate-700/50 cursor-pointer shadow-md bg-slate-800/80 text-slate-100 transition-[background-color,border-color] duration-200 hover:bg-slate-750 hover:border-slate-600/80 active:scale-[0.97]"
                    style={{ touchAction: 'none' }}
                  >
                    {/* Visual accent line inside tile for premium look */}
                    <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-slate-500/10 to-transparent" />
                    
                    <span className="group-hover:scale-105 transition-transform duration-200">
                      {cell}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* User tips */}
          <p className="text-slate-500 text-[11px] text-center max-w-xs leading-relaxed font-medium">
            {lang === 'id' 
              ? 'Ketuk kotak angka terdekat atau gunakan tombol panah/WASD pada keyboard untuk menggesernya.' 
              : 'Tap adjacent boxes or use Arrow keys / WASD on keyboard to slide them.'}
          </p>
        </div>
      </div>

      {/* Victory Overlay Screen */}
      {isWon && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-30 flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
          <div className={`bg-slate-900 p-8 rounded-[32px] shadow-2xl flex flex-col items-center animate-in zoom-in duration-300 transform scale-100 border-2 ${accentBorder} ${accentShadow} min-w-[290px] max-w-xs relative overflow-hidden`}>
            
            {/* Background lighting pattern */}
            <div className="absolute -top-12 -left-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 text-3xl bg-slate-850 shadow-inner relative z-10 border border-slate-800">
              🎉
            </div>
            
            <h3 className="text-2xl font-black text-slate-50 mb-1.5 tracking-tight text-center relative z-10">
              {t('gameCompleted')}
            </h3>
            
            <p className="text-slate-400 font-semibold mb-8 text-sm text-center px-1 relative z-10">
              {t('gameYouWonDesc').replace('{moves}', moves.toString())}
            </p>
            
            <button 
              onClick={initGame}
              className={`w-full text-zinc-950 font-extrabold py-4 rounded-2xl flex items-center justify-center gap-2.5 shadow-lg active:scale-[0.97] transition-all cursor-pointer relative z-10 ${accentBg} ${accentHover}`}
            >
              <RotateCcw size={18} className="stroke-[2.5px]" /> {t('gamePlayAgain')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

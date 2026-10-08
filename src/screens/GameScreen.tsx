import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Gamepad2 } from 'lucide-react';
import { useAppStore } from '../store';

const GRID_SIZE = 15;
const INITIAL_SNAKE = [{ x: 7, y: 7 }];
const INITIAL_FOOD = { x: 5, y: 5 };

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

const playSound = (type: 'eat' | 'die' | 'move') => {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    
    // Resume context if it was suspended (needs user interaction)
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (type === 'eat') {
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(400, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(1.0, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.1);
    } else if (type === 'move') {
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(300, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.05);
      gainNode.gain.setValueAtTime(0.8, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.05);
    } else {
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(200, ctx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(1.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.3);
    }
  } catch (err) {
    console.error('Audio play failed', err);
  }
};

export default function GameScreen({ onBack }: { onBack: () => void }) {
  const { moods } = useAppStore();
  
  const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const todayMood = moods.find(m => m.date === today)?.mood || 'neutral';
  
  const getMoodIcon = (id: string, className = "w-[14px] h-[14px]") => {
    switch (id) {
      case 'excellent':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
      case 'good':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 1 4 1 4-1 4-1"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
      case 'neutral':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
      case 'bad':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M8 16s1.5-1 4-1 4 1 4 1"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
      case 'terrible':
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M8 16s1.5-2 4-2 4 2 4 2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
      default:
        return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
    }
  };

  const [snake, setSnake] = useState(INITIAL_SNAKE);
  const [food, setFood] = useState(INITIAL_FOOD);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('tata_snake_highscore') || '0', 10);
    } catch {
      return 0;
    }
  });
  const [gameOver, setGameOver] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const directionRef = useRef({ x: 0, y: -1 });
  const moveQueueRef = useRef<{x: number, y: number}[]>([]);
  
  const touchStartRef = useRef<{x: number, y: number} | null>(null);

  const moodStyle = {
    excellent: {
      head: "bg-emerald-500",
      body: "bg-emerald-400 text-emerald-900",
      text: "text-emerald-400",
      dpadColor: "group-active:text-emerald-500 text-slate-400",
      dpadBg: "bg-emerald-500/10",
      boardDot: "#10b981", // emerald-500
    },
    good: {
      head: "bg-teal-500",
      body: "bg-teal-400 text-teal-900",
      text: "text-teal-400",
      dpadColor: "group-active:text-teal-500 text-slate-400",
      dpadBg: "bg-teal-500/10",
      boardDot: "#14b8a6", // teal-500
    },
    neutral: {
      head: "bg-indigo-500",
      body: "bg-indigo-400 text-indigo-900",
      text: "text-indigo-400",
      dpadColor: "group-active:text-indigo-500 text-slate-400",
      dpadBg: "bg-indigo-500/10",
      boardDot: "#6366f1", // indigo-500
    },
    bad: {
      head: "bg-orange-500",
      body: "bg-orange-400 text-orange-900",
      text: "text-orange-400",
      dpadColor: "group-active:text-orange-500 text-slate-400",
      dpadBg: "bg-orange-500/10",
      boardDot: "#f97316", // orange-500
    },
    terrible: {
      head: "bg-rose-500",
      body: "bg-rose-400 text-rose-900",
      text: "text-rose-400",
      dpadColor: "group-active:text-rose-500 text-slate-400",
      dpadBg: "bg-rose-500/10",
      boardDot: "#f43f5e", // rose-500
    }
  }[todayMood] || {
      head: "bg-indigo-500",
      body: "bg-indigo-400 text-indigo-900",
      text: "text-indigo-400",
      dpadColor: "group-active:text-indigo-500 text-slate-400",
      dpadBg: "bg-indigo-500/10",
      boardDot: "#6366f1", // indigo-500
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const dx = touchEndX - touchStartRef.current.x;
    const dy = touchEndY - touchStartRef.current.y;
    
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;
    
    if (Math.abs(dx) > Math.abs(dy)) {
      handleDirection({ x: dx > 0 ? 1 : -1, y: 0 });
    } else {
      handleDirection({ x: 0, y: dy > 0 ? 1 : -1 });
    }
    
    touchStartRef.current = null;
  };

  const handleDirection = useCallback((newDir: {x: number, y: number}) => {
    if (gameOver) return;
    if (!isPlaying) setIsPlaying(true);
    
    const lastDir = moveQueueRef.current.length > 0 
      ? moveQueueRef.current[moveQueueRef.current.length - 1] 
      : directionRef.current;
      
    if (newDir.x !== 0 && lastDir.x === -newDir.x) return;
    if (newDir.y !== 0 && lastDir.y === -newDir.y) return;
    if (newDir.x === lastDir.x && newDir.y === lastDir.y) return;
    
    if (moveQueueRef.current.length < 3) {
      moveQueueRef.current.push(newDir);
      playSound('move');
    }
  }, [gameOver, isPlaying]);

  const spawnFood = useCallback((currentSnake: {x: number, y: number}[]) => {
    let newFood = { x: 0, y: 0 };
    let attempts = 0;
    while (attempts < 400) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      if (!currentSnake.some(s => s.x === newFood.x && s.y === newFood.y)) {
        break;
      }
      attempts++;
    }
    return newFood;
  }, []);

  useEffect(() => {
    if (!isPlaying || gameOver) return;
    
    const moveSnake = () => {
      let currentDir = directionRef.current;
      if (moveQueueRef.current.length > 0) {
        currentDir = moveQueueRef.current.shift()!;
        directionRef.current = currentDir;
      }
      
      const head = snake[0];
      const newHead = {
        x: (head.x + currentDir.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + currentDir.y + GRID_SIZE) % GRID_SIZE
      };
      
      if (snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setGameOver(true);
        playSound('die');
        if (score > highScore) {
          setHighScore(score);
          try {
            localStorage.setItem('tata_snake_highscore', score.toString());
          } catch(e){}
        }
        return;
      }
      
      const newSnake = [newHead, ...snake];
      if (newHead.x === food.x && newHead.y === food.y) {
        playSound('eat');
        setScore(score + 10);
        setFood(spawnFood(newSnake));
      } else {
        newSnake.pop();
      }
      
      setSnake(newSnake);
    };
    
    const currentSpeed = Math.max(120, 500 - (score * 0.8));
    const timeoutId = setTimeout(moveSnake, currentSpeed);
    return () => clearTimeout(timeoutId);
  }, [isPlaying, gameOver, snake, food, score, highScore, spawnFood]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrow keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
      
      switch(e.key) {
        case 'ArrowUp':
          handleDirection({x: 0, y: -1});
          break;
        case 'ArrowDown':
          handleDirection({x: 0, y: 1});
          break;
        case 'ArrowLeft':
          handleDirection({x: -1, y: 0});
          break;
        case 'ArrowRight':
          handleDirection({x: 1, y: 0});
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDirection]);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    directionRef.current = { x: 0, y: -1 };
    moveQueueRef.current = [];
    setScore(0);
    setGameOver(false);
    setIsPlaying(false);
    setFood(spawnFood(INITIAL_SNAKE));
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-slate-900 border-b border-slate-800">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
          <Gamepad2 className="text-emerald-500" /> Snake Game
        </h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-slate-900">
        <div className="flex flex-col items-center justify-center p-4 min-h-[min-content] sm:min-h-full">
          <div className="w-full max-w-[320px] sm:max-w-[360px] flex flex-col gap-4 sm:gap-6 pb-6">
            
            {/* Score Header */}
            <div className="flex justify-between items-center bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-700">
              <div className="flex flex-col">
                <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Skor</span>
                <span className={`text-2xl sm:text-3xl font-black ${moodStyle.text} leading-none`}>{score}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] sm:text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                  <Trophy size={12} className="sm:w-3 sm:h-3" /> Rekor
                </span>
                <span className="text-xl sm:text-2xl font-black text-amber-500 leading-none">{highScore}</span>
              </div>
            </div>

            {/* Game Board */}
            <div 
              className={`aspect-square w-full rounded-[24px] relative overflow-hidden shadow-sm border border-slate-800 bg-slate-900/80 touch-none select-none`}
              onTouchStart={handleTouchStart} 
              onTouchEnd={handleTouchEnd}
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`,
                gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)`
              }}
            >
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
                const x = i % GRID_SIZE;
                const y = Math.floor(i / GRID_SIZE);
                
                const snakeIndex = snake.findIndex(s => s.x === x && s.y === y);
                const isSnake = snakeIndex !== -1;
                const isSnakeHead = snakeIndex === 0;
                const isFood = food.x === x && food.y === y;
                
                let snakeStyle: React.CSSProperties = {};
                let segmentClasses = "";

                if (isSnake) {
                  let transformScale = "scale(0.85)";
                  
                  if (isSnakeHead) {
                    segmentClasses = `${moodStyle.head} z-10 flex items-center justify-center text-white shadow-md rounded-[8px]`;
                    transformScale = "scale(1.05)";
                  } else {
                    segmentClasses = `${moodStyle.body} opacity-100 rounded-[6px] transition-all`;
                  }
                  
                  snakeStyle = {
                    transform: transformScale
                  };
                }
                
                return (
                  <div 
                    key={i} 
                    className="flex justify-center items-center relative"
                  >
                    {/* Subtle grid dot */}
                    <div className="absolute w-[2px] h-[2px] rounded-full bg-slate-700 opacity-50" />
                    
                    {isSnake && (
                      <div 
                        className={`w-full h-full relative z-10 ${segmentClasses}`}
                        style={snakeStyle}
                      >
                        {isSnakeHead && getMoodIcon(todayMood, "w-[60%] h-[60%]")}
                      </div>
                    )}
                    {isFood && (
                      <div className="w-full h-full relative z-10 flex items-center justify-center animate-bounce drop-shadow-md text-[20px] leading-none">
                        🍎
                      </div>
                    )}
                  </div>
                )
              })}
              
              {gameOver && (
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[4px] flex flex-col items-center justify-center z-20">
                  <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-in zoom-in duration-300 transform scale-100 border-[4px] border-slate-700">
                    <div className="w-16 h-16 bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mb-4 text-3xl">
                      😵
                    </div>
                    <h3 className="text-2xl font-black text-slate-100 mb-2 tracking-tight">Game Over</h3>
                    <p className="text-slate-400 font-medium mb-8 text-base">Skor Terakhir: <span className={`font-bold ${moodStyle.text}`}>{score}</span></p>
                    <button 
                      onClick={resetGame}
                      className={`${moodStyle.head} hover:opacity-90 text-white font-bold py-4 px-10 rounded-2xl flex items-center gap-3 shadow-lg transition-all active:scale-95`}
                    >
                      <RotateCcw size={20} /> Main Lagi
                    </button>
                  </div>
                </div>
              )}
              
              {!isPlaying && !gameOver && (
                 <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 cursor-pointer" onClick={() => setIsPlaying(true)}>
                   <button 
                    onClick={() => setIsPlaying(true)}
                    className={`${moodStyle.head} hover:opacity-90 text-white font-bold py-5 px-12 rounded-full flex items-center gap-2 shadow-xl transition-all active:scale-95 animate-pulse text-lg`}
                   >
                     <Gamepad2 size={24} /> Mulai Game
                   </button>
                 </div>
              )}
            </div>
            
            {/* D-Pad Controls (Clean layout) */}
            <div className="mt-2 flex flex-col items-center gap-3">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400 tracking-wide uppercase">Kontrol Arah</span>
              
              <div className="grid grid-cols-3 gap-2 w-48 sm:w-[200px] mx-auto">
                <div />
                <button 
                  onClick={() => handleDirection({x: 0, y: -1})} 
                  className={`bg-slate-800 h-12 sm:h-14 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 active:shadow-sm border border-slate-700 hover:bg-slate-700 ${moodStyle.text} group`}
                >
                  <ChevronUp size={28} className={`${moodStyle.dpadColor} transition-colors`} />
                </button>
                <div />
                
                <button 
                  onClick={() => handleDirection({x: -1, y: 0})} 
                  className={`bg-slate-800 h-12 sm:h-14 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 active:shadow-sm border border-slate-700 hover:bg-slate-700 ${moodStyle.text} group`}
                >
                  <ChevronLeft size={28} className={`${moodStyle.dpadColor} transition-colors`} />
                </button>
                
                <div className="flex items-center justify-center">
                  <div className={`w-5 h-5 rounded-full ${moodStyle.dpadBg} shadow-inner flex items-center justify-center`}>
                    <div className={`w-2 h-2 rounded-full ${moodStyle.head} opacity-50`} />
                  </div>
                </div>
                
                <button 
                  onClick={() => handleDirection({x: 1, y: 0})} 
                  className={`bg-slate-800 h-12 sm:h-14 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 active:shadow-sm border border-slate-700 hover:bg-slate-700 ${moodStyle.text} group`}
                >
                  <ChevronRight size={28} className={`${moodStyle.dpadColor} transition-colors`} />
                </button>
                
                <div />
                <button 
                  onClick={() => handleDirection({x: 0, y: 1})} 
                  className={`bg-slate-800 h-12 sm:h-14 rounded-2xl flex items-center justify-center transition-all shadow-md active:scale-95 active:shadow-sm border border-slate-700 hover:bg-slate-700 ${moodStyle.text} group`}
                >
                  <ChevronDown size={28} className={`${moodStyle.dpadColor} transition-colors`} />
                </button>
                <div />
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}

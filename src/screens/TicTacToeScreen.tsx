import React, { useState, useEffect } from 'react';
import { ArrowLeft, RotateCcw, Gamepad2, User, Cpu } from 'lucide-react';
import { useAppStore } from '../store';

type Player = 'X' | 'O' | null;

let audioCtx: AudioContext | null = null;

export default function TicTacToeScreen({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<Player[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState<boolean>(true);
  const [gameMode, setGameMode] = useState<'PvP' | 'PvE'>('PvE');
  const [winner, setWinner] = useState<Player | 'Draw' | null>(null);

  const { moods } = useAppStore();
  const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const todayMood = moods.find(m => m.date === today)?.mood || 'neutral';

  const themeColors = {
    excellent: 'text-emerald-500 bg-emerald-500 hover:bg-emerald-600',
    good: 'text-teal-500 bg-teal-500 hover:bg-teal-600',
    neutral: 'text-indigo-500 bg-indigo-500 hover:bg-indigo-600',
    bad: 'text-orange-500 bg-orange-500 hover:bg-orange-600',
    terrible: 'text-rose-500 bg-rose-500 hover:bg-rose-600',
  }[todayMood] || 'text-indigo-500 bg-indigo-500 hover:bg-indigo-600';

  const colorX = 'text-indigo-500';
  const colorO = 'text-rose-500';

  useEffect(() => {
    checkWinner(board);
  }, [board]);

  useEffect(() => {
    if (gameMode === 'PvE' && !isXNext && !winner) {
      const timer = setTimeout(() => {
        makeAiMove();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isXNext, gameMode, winner]);

  const checkWinner = (squares: Player[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        setWinner(squares[a]);
        playSound('win');
        return;
      }
    }
    if (!squares.includes(null)) {
      setWinner('Draw');
      playSound('draw');
    }
  };

  const handleSquareClick = (index: number) => {
    if (board[index] || winner || (gameMode === 'PvE' && !isXNext)) return;
    
    const newBoard = [...board];
    newBoard[index] = 'X';
    setBoard(newBoard);
    playSound('click');
    setIsXNext(false);
  };

  const makeAiMove = () => {
    if (winner) return;

    // Really simple random AI
    const available = board.map((val, idx) => val === null ? idx : null).filter(val => val !== null) as number[];
    if (available.length > 0) {
      const randomIndex = available[Math.floor(Math.random() * available.length)];
      const newBoard = [...board];
      newBoard[randomIndex] = 'O';
      setBoard(newBoard);
      playSound('click');
      setIsXNext(true);
    }
  };

  const resetGame = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
    setWinner(null);
  };

  const toggleMode = () => {
    setGameMode(prev => prev === 'PvP' ? 'PvE' : 'PvP');
    resetGame();
  };

  const playSound = (type: 'click' | 'win' | 'draw') => {
    try {
      const AudioContextDef = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextDef) return;
      if (!audioCtx) {
        audioCtx = new AudioContextDef();
      }
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      const ctx = audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'click') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'win') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
        osc.frequency.setValueAtTime(800, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(1.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else if (type === 'draw') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch(e) {}
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-slate-900 border-b border-slate-800 shrink-0">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
          <Gamepad2 className={themeColors.split(' ')[0]} /> Tic Tac Toe
        </h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-[320px] flex flex-col items-center gap-8 pb-10">
          
          <div className="flex items-center bg-slate-800 p-1 rounded-full shadow-sm border border-slate-700 w-full mb-2">
            <button 
              onClick={() => { setGameMode('PvE'); resetGame(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-bold transition-all ${gameMode === 'PvE' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-700 '}`}
            >
              <Cpu size={16} /> Lawan Bot
            </button>
            <button 
              onClick={() => { setGameMode('PvP'); resetGame(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-full text-sm font-bold transition-all ${gameMode === 'PvP' ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-700 '}`}
            >
              <User size={16} /> 2 Pemain
            </button>
          </div>

          <div className="flex items-center justify-between w-full px-4">
            <div className={`flex flex-col items-center transition-opacity ${!winner && isXNext ? 'opacity-100 scale-110' : 'opacity-40'}`}>
               <span className={`text-3xl font-black ${colorX}`}>X</span>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{gameMode === 'PvE' ? 'Kamu' : 'Pemain 1'}</span>
            </div>
            <div className={`flex flex-col items-center transition-opacity ${!winner && !isXNext ? 'opacity-100 scale-110' : 'opacity-40'}`}>
               <span className={`text-3xl font-black ${colorO}`}>O</span>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{gameMode === 'PvE' ? 'Bot' : 'Pemain 2'}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 w-full max-w-[300px] aspect-square relative z-10">
            {board.map((cell, idx) => (
              <button 
                key={idx}
                onClick={() => {
                  if (gameMode === 'PvE') {
                    handleSquareClick(idx);
                  } else {
                    if (board[idx] || winner) return;
                    const newBoard = [...board];
                    newBoard[idx] = isXNext ? 'X' : 'O';
                    setBoard(newBoard);
                    playSound('click');
                    setIsXNext(!isXNext);
                  }
                }}
                disabled={!!cell || !!winner || (gameMode === 'PvE' && !isXNext)}
                className={`bg-slate-800 rounded-2xl shadow-sm border border-slate-700 flex items-center justify-center text-5xl font-black leading-none transition-all active:scale-95 hover:bg-slate-700 aspect-square w-full h-full p-0 overflow-hidden ${cell === 'X' ? colorX : colorO} ${!cell && !winner && (gameMode === 'PvP' || isXNext) ? 'active:shadow-inner cursor-pointer' : 'cursor-default'}`}
              >
                <span className={cell ? "animate-in zoom-in duration-200 block" : "invisible block"}>
                  {cell || 'X'}
                </span>
              </button>
            ))}
          </div>

          {winner && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
              <div className="bg-slate-800 p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-in zoom-in duration-300 transform scale-100 border-[4px] border-indigo-100  min-w-[280px]">
                 <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4 text-3xl bg-slate-700">
                    {winner === 'Draw' ? '🤝' : '🎉'}
                 </div>
                 <h3 className="text-2xl font-black text-slate-100 mb-2 tracking-tight text-center">
                   {winner === 'Draw' ? 'Seri!' : `${winner} Menang!`}
                 </h3>
                 <p className="text-slate-400 font-medium mb-8 text-sm text-center">
                   {winner === 'Draw' ? 'Pertandingan yang seimbang.' : 'Kerja bagus!'}
                 </p>
                 <button 
                   onClick={resetGame}
                   className={`w-full text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg transition-all active:scale-95 bg-indigo-500 hover:bg-indigo-600`}
                 >
                   <RotateCcw size={20} /> Main Lagi
                 </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, ArrowDown, ArrowLeft as ArrowLeftIcon, ArrowRight, Play, Trophy, LayoutTemplate } from 'lucide-react';

const ROWS = 20;
const COLS = 10;

const SHAPES = [
  { shape: [[1, 1, 1, 1]], color: 'bg-cyan-500' }, // I
  { shape: [[1, 0, 0], [1, 1, 1]], color: 'bg-blue-600' }, // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: 'bg-orange-600' }, // L
  { shape: [[1, 1], [1, 1]], color: 'bg-yellow-500' }, // O
  { shape: [[0, 1, 1], [1, 1, 0]], color: 'bg-green-600' }, // S
  { shape: [[0, 1, 0], [1, 1, 1]], color: 'bg-purple-600' }, // T
  { shape: [[1, 1, 0], [0, 1, 1]], color: 'bg-red-600' }  // Z
];

let audioCtx: AudioContext | null = null;

function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

const checkCollision = (piece: any, grid: any[][], moveX: number, moveY: number) => {
  for (let y = 0; y < piece.shape.length; y++) {
    for (let x = 0; x < piece.shape[y].length; x++) {
      if (piece.shape[y][x]) {
        const nextX = piece.x + x + moveX;
        const nextY = piece.y + y + moveY;
        if (
          nextX < 0 ||
          nextX >= COLS ||
          nextY >= ROWS ||
          (nextY >= 0 && grid[nextY] && grid[nextY][nextX] !== null)
        ) {
          return true;
        }
      }
    }
  }
  return false;
};

const rotate = (matrix: number[][]) => {
  return matrix[0].map((_, index) => matrix.map(row => row[index]).reverse());
};

const createBoard = () => Array.from(Array(ROWS), () => Array(COLS).fill(null));

const randomTetromino = () => {
  const tetromino = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  return {
    shape: tetromino.shape,
    color: tetromino.color,
    x: Math.floor(COLS / 2) - Math.floor(tetromino.shape[0].length / 2),
    y: 0,
  };
};

export default function TetrisScreen({ onBack }: { onBack: () => void }) {
  const [board, setBoard] = useState<(string | null)[][]>(createBoard());
  const [currentPiece, setCurrentPiece] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  // Highscore simple local state
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('tetris_highscore');
      if (saved) setHighScore(parseInt(saved, 10));
    } catch(e) {}
  }, []);

  const playSound = useCallback((type: 'move' | 'clear' | 'gameover' | 'rotate') => {
    try {
      const AudioContextDef = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextDef) return;
      if (!audioCtx) audioCtx = new AudioContextDef();
      if (audioCtx.state === 'suspended') audioCtx.resume();

      const ctx = audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'move') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'rotate') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(1.0, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'clear') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.setValueAtTime(600, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(1.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(200, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.5);
        gain.gain.setValueAtTime(1.5, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) { }
  }, []);

  const startGame = () => {
    setBoard(createBoard());
    setScore(0);
    setLines(0);
    setLevel(1);
    setGameOver(false);
    setCurrentPiece(randomTetromino());
    setIsPlaying(true);
  };

  const moveDown = useCallback(() => {
    if (!isPlaying || gameOver || !currentPiece) return;

    if (!checkCollision(currentPiece, board, 0, 1)) {
      setCurrentPiece((prev: any) => prev ? { ...prev, y: prev.y + 1 } : null);
    } else {
      if (currentPiece.y <= 0) {
        setGameOver(true);
        setIsPlaying(false);
        playSound('gameover');
        if (score > highScore) {
          setHighScore(score);
          try {
            localStorage.setItem('tetris_highscore', score.toString());
          } catch(e) {}
        }
        return;
      }

      const newBoard = board.map(row => [...row]);
      currentPiece.shape.forEach((row: number[], y: number) => {
        row.forEach((value: number, x: number) => {
          if (value) {
            const boardY = currentPiece.y + y;
            const boardX = currentPiece.x + x;
            if (boardY >= 0 && boardY < ROWS) {
              newBoard[boardY][boardX] = currentPiece.color;
            }
          }
        });
      });

      let linesCleared = 0;
      const finalBoard = newBoard.filter(row => {
        const isLineFull = row.every(cell => cell !== null);
        if (isLineFull) linesCleared++;
        return !isLineFull;
      });

      while (finalBoard.length < ROWS) {
        finalBoard.unshift(Array(COLS).fill(null));
      }

      if (linesCleared > 0) {
        playSound('clear');
        const newLines = lines + linesCleared;
        const linePoints = [0, 40, 100, 300, 1200];
        const newScore = score + linePoints[linesCleared] * level;
        setLines(newLines);
        setScore(newScore);
        setLevel(Math.floor(newLines / 10) + 1);
      } else {
        playSound('move');
      }

      setBoard(finalBoard);
      setCurrentPiece(randomTetromino());
    }
  }, [board, currentPiece, isPlaying, gameOver, level, lines, score, playSound, highScore]);

  const moveLeft = useCallback(() => {
    if (isPlaying && !gameOver && currentPiece && !checkCollision(currentPiece, board, -1, 0)) {
      setCurrentPiece((prev: any) => prev ? { ...prev, x: prev.x - 1 } : null);
      playSound('move');
    }
  }, [isPlaying, gameOver, currentPiece, board, playSound]);

  const moveRight = useCallback(() => {
    if (isPlaying && !gameOver && currentPiece && !checkCollision(currentPiece, board, 1, 0)) {
      setCurrentPiece((prev: any) => prev ? { ...prev, x: prev.x + 1 } : null);
      playSound('move');
    }
  }, [isPlaying, gameOver, currentPiece, board, playSound]);

  const rotatePiece = useCallback(() => {
    if (isPlaying && !gameOver && currentPiece) {
      const rotated = rotate(currentPiece.shape);
      if (!checkCollision({ ...currentPiece, shape: rotated }, board, 0, 0)) {
        setCurrentPiece((prev: any) => prev ? { ...prev, shape: rotated } : null);
        playSound('rotate');
      }
    }
  }, [isPlaying, gameOver, currentPiece, board, playSound]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOver || !currentPiece) return;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowLeft':
          moveLeft();
          break;
        case 'ArrowRight':
          moveRight();
          break;
        case 'ArrowDown':
          moveDown();
          break;
        case 'ArrowUp':
          rotatePiece();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, gameOver, currentPiece, board, moveLeft, moveRight, moveDown, rotatePiece]);

  useInterval(() => {
    moveDown();
  }, isPlaying && !gameOver ? Math.max(100, 800 - (level - 1) * 50) : null);

  const renderBoard = board.map(row => [...row]);
  if (currentPiece && !gameOver) {
    currentPiece.shape.forEach((row: number[], y: number) => {
      row.forEach((value: number, x: number) => {
        if (value) {
          const boardY = currentPiece.y + y;
          const boardX = currentPiece.x + x;
          if (boardY >= 0 && boardY < ROWS && boardX >= 0 && boardX < COLS) {
            renderBoard[boardY][boardX] = currentPiece.color;
          }
        }
      });
    });
  }

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-slate-900 border-b border-slate-800 shrink-0">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <h2 className="font-bold text-lg text-slate-100 flex items-center gap-2">
          <LayoutTemplate className="text-cyan-400" /> Tetris
        </h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center pt-6 pb-2 overflow-y-auto">
        
        {/* Score Board */}
        <div className="w-full max-w-[280px] flex justify-between items-center mb-4 px-2">
           <div className="flex flex-col">
             <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Score</span>
             <span className="font-mono text-xl text-cyan-400">{score.toString().padStart(6, '0')}</span>
           </div>
           <div className="flex flex-col items-center">
             <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Level</span>
             <span className="font-mono text-xl text-slate-200">{level}</span>
           </div>
           <div className="flex flex-col items-end">
             <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Best</span>
             <span className="font-mono text-xl text-amber-400 flex items-center gap-1"><Trophy size={14} className="text-amber-500"/> {highScore}</span>
           </div>
        </div>

        {/* Game Canvas */}
        <div className="relative">
          <div className="bg-slate-900 border-4 border-slate-800/80 rounded-xl p-1 shadow-2xl">
            <div 
              className="bg-slate-950/80 rounded-md overflow-hidden"
              style={{
                display: 'grid',
                gridTemplateRows: `repeat(${ROWS}, 1fr)`,
                gridTemplateColumns: `repeat(${COLS}, 1fr)`,
                gap: '1px'
              }}
            >
              {renderBoard.flatMap((row, y) => 
                row.map((cell, x) => (
                  <div 
                    key={`${x}-${y}`} 
                    className={`w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] md:w-[24px] md:h-[24px] rounded-[2px] ${cell || 'bg-slate-900/30'}`} 
                    style={{
                        boxShadow: cell ? 'inset 0 0 0 1px rgba(0,0,0,0.1), inset 0 2px 0 rgba(255,255,255,0.2)' : 'none'
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Overlays */}
          {!isPlaying && !gameOver && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center rounded-xl z-20">
              <button 
                onClick={startGame}
                className="w-16 h-16 bg-cyan-500 hover:bg-cyan-400 text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-transform active:scale-95 pl-1"
              >
                <Play size={28} fill="currentColor" />
              </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-xl z-20 p-6 text-center animate-in zoom-in duration-300">
              <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Game Over!</h3>
              <p className="text-slate-400 text-sm mb-6">Score akhir: <span className="text-cyan-400 font-mono text-lg">{score}</span></p>
              <button 
                onClick={startGame}
                className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95"
              >
                <RotateCcw size={18} /> Main Lagi
              </button>
            </div>
          )}
        </div>

        {/* DPAD Controls for Mobile */}
        <div className="mt-8 flex items-center justify-between w-full max-w-[280px] px-2 select-none">
           <div className="flex gap-2">
              <button 
                onPointerDown={(e) => { e.preventDefault(); moveLeft(); }} 
                className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 active:bg-slate-700 active:scale-95 transition-all shadow-md border-b-4 border-slate-900 active:border-b-0 active:translate-y-1"
              >
                <ArrowLeftIcon size={24} />
              </button>
              <button 
                onPointerDown={(e) => { e.preventDefault(); moveRight(); }} 
                className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 active:bg-slate-700 active:scale-95 transition-all shadow-md border-b-4 border-slate-900 active:border-b-0 active:translate-y-1"
              >
                <ArrowRight size={24} />
              </button>
           </div>
           
           <div className="flex gap-2 items-end">
              <button 
                onPointerDown={(e) => { e.preventDefault(); moveDown(); }} 
                className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 active:bg-slate-700 active:scale-95 transition-all shadow-md border-b-4 border-slate-900 active:border-b-0 active:translate-y-1"
              >
                <ArrowDown size={24} />
              </button>
              <button 
                onPointerDown={(e) => { e.preventDefault(); rotatePiece(); }} 
                className="w-16 h-16 bg-cyan-500/20 text-cyan-400 border-2 border-cyan-500/30 rounded-full flex items-center justify-center active:bg-cyan-500/30 active:scale-95 transition-all shadow-lg shadow-cyan-500/10 border-b-4 active:border-b-2 active:translate-y-1 mb-1"
              >
                <RotateCcw size={28} />
              </button>
           </div>
        </div>

      </div>
    </div>
  );
}

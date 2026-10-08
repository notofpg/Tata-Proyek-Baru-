import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RotateCcw, Shield, Heart, Zap, Trophy, Play, Pause, Award } from 'lucide-react';
import { useAppStore } from '../store';
import { useTranslation } from '../translations';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
  type?: 'spark' | 'trail' | 'star';
}

interface Enemy {
  id: number;
  x: number;
  y: number;
  label: string;
  width: number;
  height: number;
  speedY: number;
  speedX: number;
  rotation: number;
  rotSpeed: number;
  points: number;
  hp: number;
  maxHp: number;
  color: string;
  isBoss?: boolean;
}

interface Laser {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  width: number;
  height: number;
  isEnemy?: boolean;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'shield' | 'life' | 'triple';
  color: string;
  width: number;
  height: number;
  speedY: number;
  pulse: number;
}

let audioCtx: AudioContext | null = null;

export default function SpaceInvadersScreen({ onBack }: { onBack: () => void }) {
  const { lang, moods } = useAppStore();
  const t = useTranslation(lang);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Game States for React HUD
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [shieldActive, setShieldActive] = useState(false);
  const [hasTripleFire, setHasTripleFire] = useState(false);

  // Mutable refs for high performance & precise simulation
  const gameRef = useRef({
    score: 0,
    level: 1,
    lives: 3,
    shipX: 150,
    shipWidth: 40,
    shipHeight: 40,
    lasers: [] as Laser[],
    enemies: [] as Enemy[],
    powerUps: [] as PowerUp[],
    particles: [] as Particle[],
    shieldTime: 0,
    tripleTime: 0,
    lastSpawnTime: 0,
    lastPowerUpSpawn: 0,
    lastShootTime: 0,
    keys: {} as Record<string, boolean>,
    touchX: null as number | null,
    canvasWidth: 320,
    canvasHeight: 480,
    gridOffset: 0,
    screenShake: 0,
    enemyIdCounter: 0,
  });

  const today = new Date(new Date().getTime() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0];
  const todayMood = moods.find(m => m.date === today)?.mood || 'neutral';

  const accentButtonClass = {
    excellent: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20',
    good: 'bg-teal-600 hover:bg-teal-500 shadow-teal-600/20',
    neutral: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20',
    bad: 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/20',
    terrible: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20',
  }[todayMood] || 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20';

  // Advanced Web Audio API Synthesizer
  const playSound = (type: 'laser' | 'hit' | 'powerup' | 'gameover' | 'damage' | 'boss_shoot') => {
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

      if (type === 'laser') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(580, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.12);
      } else if (type === 'boss_shoot') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.22);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.22);
      } else if (type === 'hit') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
      } else if (type === 'damage') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, audioCtx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, audioCtx.currentTime + 0.35);
        gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.38);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.38);
      } else if (type === 'powerup') {
        const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99];
        notes.forEach((freq, idx) => {
          const sOsc = audioCtx!.createOscillator();
          const sGain = audioCtx!.createGain();
          sOsc.connect(sGain);
          sGain.connect(audioCtx!.destination);
          sOsc.type = 'sine';
          sOsc.frequency.setValueAtTime(freq, audioCtx!.currentTime + idx * 0.06);
          sGain.gain.setValueAtTime(0.1, audioCtx!.currentTime + idx * 0.06);
          sGain.gain.exponentialRampToValueAtTime(0.01, audioCtx!.currentTime + idx * 0.06 + 0.2);
          sOsc.start(audioCtx!.currentTime + idx * 0.06);
          sOsc.stop(audioCtx!.currentTime + idx * 0.06 + 0.20);
        });
      } else if (type === 'gameover') {
        const notes = [293.66, 277.18, 246.94, 220.00, 196.00];
        notes.forEach((freq, idx) => {
          const sOsc = audioCtx!.createOscillator();
          const sGain = audioCtx!.createGain();
          sOsc.connect(sGain);
          sGain.connect(audioCtx!.destination);
          sOsc.type = 'sawtooth';
          sOsc.frequency.setValueAtTime(freq, audioCtx!.currentTime + idx * 0.16);
          sGain.gain.setValueAtTime(0.18, audioCtx!.currentTime + idx * 0.16);
          sGain.gain.exponentialRampToValueAtTime(0.01, audioCtx!.currentTime + idx * 0.16 + 0.3);
          sOsc.start(audioCtx!.currentTime + idx * 0.16);
          sOsc.stop(audioCtx!.currentTime + idx * 0.16 + 0.35);
        });
      }
    } catch (e) {
      console.warn('Web Audio Playback Error:', e);
    }
  };

  // Generate beautiful retro explosion sparks
  const createExplosion = (x: number, y: number, color: string, count: number = 18) => {
    const g = gameRef.current;
    g.screenShake = Math.max(g.screenShake, 6);

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5.5;
      g.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2.5 + Math.random() * 3.5,
        alpha: 1.0,
        decay: 0.015 + Math.random() * 0.02,
        type: 'spark',
      });
    }
  };

  // Create thruster exhaust trail
  const createThrusterTrail = (x: number, y: number) => {
    const g = gameRef.current;
    g.particles.push({
      x: x + (Math.random() - 0.5) * 8,
      y: y + 2,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2.5 + Math.random() * 2,
      color: Math.random() > 0.4 ? '#06b6d4' : '#38bdf8',
      size: 3 + Math.random() * 4,
      alpha: 0.8,
      decay: 0.04,
      type: 'trail',
    });
  };

  // Setup Responsive Canvas Boundaries
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !canvasRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      canvasRef.current.width = width;
      canvasRef.current.height = height;

      gameRef.current.canvasWidth = width;
      gameRef.current.canvasHeight = height;

      if (gameRef.current.shipX > width - gameRef.current.shipWidth) {
        gameRef.current.shipX = width - gameRef.current.shipWidth;
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) resizeObserver.observe(containerRef.current);

    handleResize();
    return () => resizeObserver.disconnect();
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      gameRef.current.keys[e.key] = true;
      if (e.key === ' ' && isPlaying && !isGameOver && !isPaused) {
        e.preventDefault();
        fireLaser();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      gameRef.current.keys[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying, isGameOver, isPaused, hasTripleFire]);

  // Handle laser fire
  const fireLaser = () => {
    const g = gameRef.current;
    const now = Date.now();
    // Fire rate limiting: max 1 shot every 180ms
    if (now - g.lastShootTime < 180) return;
    g.lastShootTime = now;

    const laserY = g.canvasHeight - g.shipHeight - 14;
    const laserSpeed = -9;

    if (hasTripleFire) {
      g.lasers.push({
        x: g.shipX + g.shipWidth / 2,
        y: laserY,
        vx: 0,
        vy: laserSpeed,
        color: '#38bdf8',
        width: 3,
        height: 18,
      });
      g.lasers.push({
        x: g.shipX + g.shipWidth / 2 - 12,
        y: laserY + 4,
        vx: -2,
        vy: laserSpeed + 0.5,
        color: '#06b6d4',
        width: 3,
        height: 16,
      });
      g.lasers.push({
        x: g.shipX + g.shipWidth / 2 + 12,
        y: laserY + 4,
        vx: 2,
        vy: laserSpeed + 0.5,
        color: '#06b6d4',
        width: 3,
        height: 16,
      });
    } else {
      g.lasers.push({
        x: g.shipX + g.shipWidth / 2,
        y: laserY,
        vx: 0,
        vy: laserSpeed,
        color: '#06b6d4',
        width: 3,
        height: 16,
      });
    }

    playSound('laser');
  };

  // Start/Reset Game Mechanics
  const startGame = () => {
    const g = gameRef.current;
    g.score = 0;
    g.level = 1;
    g.lives = 3;
    g.shipX = g.canvasWidth / 2 - g.shipWidth / 2;
    g.lasers = [];
    g.enemies = [];
    g.powerUps = [];
    g.particles = [];
    g.shieldTime = 0;
    g.tripleTime = 0;
    g.lastSpawnTime = Date.now();
    g.lastPowerUpSpawn = Date.now();
    g.screenShake = 0;
    g.enemyIdCounter = 0;

    // Load custom stars at startup
    for (let i = 0; i < 35; i++) {
      g.particles.push({
        x: Math.random() * g.canvasWidth,
        y: Math.random() * g.canvasHeight,
        vx: 0,
        vy: 0.5 + Math.random() * 1.5,
        color: '#ffffff',
        size: 0.8 + Math.random() * 1.5,
        alpha: 0.2 + Math.random() * 0.8,
        decay: 0,
        type: 'star',
      });
    }

    setScore(0);
    setLevel(1);
    setLives(3);
    setShieldActive(false);
    setHasTripleFire(false);
    setIsGameOver(false);
    setIsPaused(false);
    setIsPlaying(true);
  };

  // Game Engine Loop
  useEffect(() => {
    if (!isPlaying || isGameOver || isPaused) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const g = gameRef.current;

    const gameLoop = () => {
      if (!ctx) return;

      // Calculate screenshake displacement
      let shakeX = 0;
      let shakeY = 0;
      if (g.screenShake > 0.5) {
        shakeX = (Math.random() - 0.5) * g.screenShake;
        shakeY = (Math.random() - 0.5) * g.screenShake;
        g.screenShake *= 0.88; // decay
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      // Render dark cybernetic vector space background
      ctx.fillStyle = '#0b0f19';
      ctx.fillRect(0, 0, g.canvasWidth, g.canvasHeight);

      // Synthwave Cyber Grid Background (vector grid moving downwards)
      g.gridOffset = (g.gridOffset + 1.2) % 40;
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.08)';
      ctx.lineWidth = 1;

      // Draw horizontal lines with movement
      for (let y = g.gridOffset; y < g.canvasHeight; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(g.canvasWidth, y);
        ctx.stroke();
      }
      // Draw vertical static grid lines
      for (let x = 0; x < g.canvasWidth; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, g.canvasHeight);
        ctx.stroke();
      }

      // Parallax Stars Handling
      g.particles.forEach(p => {
        if (p.type === 'star') {
          p.y += p.vy;
          if (p.y > g.canvasHeight) {
            p.y = 0;
            p.x = Math.random() * g.canvasWidth;
          }
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fillRect(p.x, p.y, p.size, p.size);
          ctx.globalAlpha = 1.0;
        }
      });

      // Update timers for power-ups
      if (g.shieldTime > 0) {
        g.shieldTime -= 16.67;
        if (g.shieldTime <= 0) setShieldActive(false);
      }
      if (g.tripleTime > 0) {
        g.tripleTime -= 16.67;
        if (g.tripleTime <= 0) setHasTripleFire(false);
      }

      // Move player ship with keys
      const speed = 7.0;
      if (g.keys['ArrowLeft'] || g.keys['a'] || g.keys['A']) {
        g.shipX = Math.max(0, g.shipX - speed);
      }
      if (g.keys['ArrowRight'] || g.keys['d'] || g.keys['D']) {
        g.shipX = Math.min(g.canvasWidth - g.shipWidth, g.shipX + speed);
      }

      // Smooth slide control with touch / mouse drag
      if (g.touchX !== null) {
        const targetX = g.touchX - g.shipWidth / 2;
        g.shipX += (targetX - g.shipX) * 0.22;
        g.shipX = Math.max(0, Math.min(g.canvasWidth - g.shipWidth, g.shipX));

        // Auto-firing on drag
        const now = Date.now();
        if (now - g.lastShootTime > 180) {
          fireLaser();
        }
      }

      const shipY = g.canvasHeight - g.shipHeight - 16;

      // Spawn thruster particles
      createThrusterTrail(g.shipX + g.shipWidth / 2, shipY + g.shipHeight);

      // Draw Glowing Player Spaceship (Elegant Cyber Polygon design)
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#06b6d4';
      ctx.strokeStyle = '#06b6d4';
      ctx.fillStyle = '#0891b2';
      ctx.lineWidth = 2.5;

      ctx.beginPath();
      ctx.moveTo(g.shipX + g.shipWidth / 2, shipY); // Nose cone
      ctx.lineTo(g.shipX + g.shipWidth, shipY + g.shipHeight); // Right wing tip
      ctx.lineTo(g.shipX + g.shipWidth * 0.75, shipY + g.shipHeight * 0.75); // Right thruster body
      ctx.lineTo(g.shipX + g.shipWidth * 0.25, shipY + g.shipHeight * 0.75); // Left thruster body
      ctx.lineTo(g.shipX, shipY + g.shipHeight); // Left wing tip
      ctx.closePath();
      ctx.stroke();

      // Subtle neon light overlay inside ship
      ctx.fillStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.fill();
      ctx.shadowBlur = 0; // reset glow

      // Draw active shield ring
      if (g.shieldTime > 0) {
        ctx.beginPath();
        ctx.arc(g.shipX + g.shipWidth / 2, shipY + g.shipHeight / 2, g.shipWidth * 0.78, 0, Math.PI * 2);
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#6366f1';
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Spawning Level Enemies
      const spawnInterval = Math.max(700, 2400 - g.level * 220);
      if (Date.now() - g.lastSpawnTime > spawnInterval) {
        // Human feelings/Stress terms
        const feelings = [
          { word: 'ANXIETY', color: '#f43f5e' },
          { word: 'STRESS', color: '#fb7185' },
          { word: 'DEADLINE', color: '#f59e0b' },
          { word: 'BURNOUT', color: '#a855f7' },
          { word: 'OVERTHINK', color: '#ec4899' },
          { word: 'FAILURE', color: '#ef4444' },
          { word: 'DOUBT', color: '#64748b' },
          { word: 'REGRET', color: '#fda4af' },
        ];
        const picked = feelings[Math.floor(Math.random() * feelings.length)];

        // Randomly spawn special Boss occasionally
        const isBossSpawn = Math.random() < 0.08 && g.enemies.filter(e => e.isBoss).length === 0;

        g.enemyIdCounter++;
        if (isBossSpawn) {
          g.enemies.push({
            id: g.enemyIdCounter,
            x: Math.random() * (g.canvasWidth - 80) + 10,
            y: -60,
            label: lang === 'id' ? 'PIKIRAN BURUK' : 'TOXIC CORE',
            width: 72,
            height: 72,
            speedY: 0.6,
            speedX: Math.random() > 0.5 ? 1 : -1,
            rotation: 0,
            rotSpeed: 0.015,
            points: 100 * g.level,
            hp: 6 + g.level * 2,
            maxHp: 6 + g.level * 2,
            color: '#ef4444',
            isBoss: true,
          });
        } else {
          g.enemies.push({
            id: g.enemyIdCounter,
            x: Math.random() * (g.canvasWidth - 50) + 5,
            y: -30,
            label: picked.word,
            width: 44,
            height: 44,
            speedY: 1.0 + (g.level * 0.18) + Math.random() * 0.7,
            speedX: 0,
            rotation: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.03,
            points: 15 * g.level,
            hp: 1,
            maxHp: 1,
            color: picked.color,
          });
        }
        g.lastSpawnTime = Date.now();
      }

      // Spawning Power-ups (shield, life, fire rate)
      if (Date.now() - g.lastPowerUpSpawn > 13000) {
        const kinds: ('shield' | 'life' | 'triple')[] = ['shield', 'life', 'triple'];
        const pColors = { shield: '#818cf8', life: '#f43f5e', triple: '#fbbf24' };
        const kind = kinds[Math.floor(Math.random() * kinds.length)];

        g.powerUps.push({
          x: Math.random() * (g.canvasWidth - 30) + 5,
          y: -40,
          type: kind,
          color: pColors[kind],
          width: 32,
          height: 32,
          speedY: 1.5,
          pulse: 0,
        });
        g.lastPowerUpSpawn = Date.now();
      }

      // Handle lasers
      g.lasers = g.lasers.filter(l => {
        l.y += l.vy;
        l.x += l.vx;

        // Glowing vector lasers
        ctx.shadowBlur = 8;
        ctx.shadowColor = l.color;
        ctx.fillStyle = l.color;
        ctx.fillRect(l.x - l.width / 2, l.y, l.width, l.height);
        ctx.shadowBlur = 0;

        return l.y > -30 && l.y < g.canvasHeight + 30;
      });

      // Handle power-ups movement & collections
      g.powerUps = g.powerUps.filter(p => {
        p.y += p.speedY;
        p.pulse += 0.08;

        // Draw floating glowing vector capsule
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.strokeStyle = p.color;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.lineWidth = 2;

        const sizeOffset = Math.sin(p.pulse) * 2;
        ctx.beginPath();
        ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2 + sizeOffset, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw inner procedural vectors instead of emoji
        const px = p.x + p.width / 2;
        const py = p.y + p.height / 2;
        const radius = p.width / 2;

        ctx.strokeStyle = p.color;
        ctx.fillStyle = p.color;
        ctx.lineWidth = 2;

        if (p.type === 'shield') {
          ctx.beginPath();
          ctx.moveTo(px, py - radius * 0.45);
          ctx.lineTo(px + radius * 0.4, py - radius * 0.45);
          ctx.quadraticCurveTo(px + radius * 0.4, py + radius * 0.1, px, py + radius * 0.55);
          ctx.quadraticCurveTo(px - radius * 0.4, py + radius * 0.1, px - radius * 0.4, py - radius * 0.45);
          ctx.closePath();
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(px, py - radius * 0.2);
          ctx.lineTo(px, py + radius * 0.2);
          ctx.moveTo(px - radius * 0.2, py);
          ctx.lineTo(px + radius * 0.2, py);
          ctx.stroke();
        } else if (p.type === 'life') {
          ctx.beginPath();
          ctx.moveTo(px, py - radius * 0.15);
          ctx.bezierCurveTo(px - radius * 0.4, py - radius * 0.55, px - radius * 0.75, py - radius * 0.05, px, py + radius * 0.5);
          ctx.bezierCurveTo(px + radius * 0.75, py - radius * 0.05, px + radius * 0.4, py - radius * 0.55, px, py - radius * 0.15);
          ctx.closePath();
          ctx.fill();
        } else if (p.type === 'triple') {
          ctx.beginPath();
          ctx.moveTo(px + radius * 0.1, py - radius * 0.5);
          ctx.lineTo(px - radius * 0.35, py + radius * 0.05);
          ctx.lineTo(px, py + radius * 0.05);
          ctx.lineTo(px - radius * 0.1, py + radius * 0.5);
          ctx.lineTo(px + radius * 0.35, py - radius * 0.05);
          ctx.lineTo(px, py - radius * 0.05);
          ctx.closePath();
          ctx.fill();
        }

        ctx.shadowBlur = 0;

        // Collision box with Player Ship
        const shipBox = { x: g.shipX, y: shipY, w: g.shipWidth, h: g.shipHeight };
        const pBox = { x: p.x, y: p.y, w: p.width, h: p.height };

        if (
          pBox.x < shipBox.x + shipBox.w &&
          pBox.x + pBox.w > shipBox.x &&
          pBox.y < shipBox.y + shipBox.h &&
          pBox.y + pBox.h > shipBox.y
        ) {
          playSound('powerup');
          createExplosion(p.x + p.width / 2, p.y + p.height / 2, p.color, 12);

          if (p.type === 'shield') {
            g.shieldTime = 8000;
            setShieldActive(true);
          } else if (p.type === 'life') {
            g.lives = Math.min(5, g.lives + 1);
            setLives(g.lives);
          } else if (p.type === 'triple') {
            g.tripleTime = 8000;
            setHasTripleFire(true);
          }
          return false;
        }

        return p.y < g.canvasHeight + 20;
      });

      // Handle enemies movement & collisions
      g.enemies = g.enemies.filter(e => {
        e.y += e.speedY;
        e.rotation += e.rotSpeed;

        if (e.isBoss) {
          e.x += e.speedX;
          if (e.x < 10 || e.x > g.canvasWidth - e.width - 10) {
            e.speedX *= -1;
          }

          if (Math.random() < 0.015) {
            playSound('boss_shoot');
            g.lasers.push({
              x: e.x + e.width / 2,
              y: e.y + e.height - 5,
              vx: (Math.random() - 0.5) * 3,
              vy: 4.5,
              color: '#ef4444',
              width: 5,
              height: 12,
              isEnemy: true,
            });
          }
        }

        // Draw Vector Geometry Enemy Node (Spinning glowing crystal shard / geometric shape)
        ctx.save();
        ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
        ctx.rotate(e.rotation);

        ctx.shadowBlur = e.isBoss ? 16 : 8;
        ctx.shadowColor = e.color;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = e.isBoss ? 3 : 2;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';

        ctx.beginPath();
        const sides = e.isBoss ? 8 : 5;
        const radius = e.width / 2;
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI) / sides;
          ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
        ctx.shadowBlur = 0;

        // Draw beautiful label texts inside the enemy
        ctx.font = e.isBoss ? 'bold 11px sans-serif' : '9px monospace';
        ctx.fillStyle = e.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.label, e.x + e.width / 2, e.y + e.height / 2);

        // Render health bar for Bosses
        if (e.isBoss) {
          const barW = e.width - 10;
          const barH = 4;
          const barY = e.y - 10;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
          ctx.fillRect(e.x + 5, barY, barW, barH);
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(e.x + 5, barY, barW * (e.hp / e.maxHp), barH);
        }

        // Check laser collision with this enemy
        const eBox = { x: e.x, y: e.y, w: e.width, h: e.height };
        let enemyDamaged = false;

        g.lasers = g.lasers.filter(l => {
          if (l.isEnemy) return true;

          const lBox = { x: l.x - l.width / 2, y: l.y, w: l.width, h: l.height };
          if (
            lBox.x < eBox.x + eBox.w &&
            lBox.x + lBox.w > eBox.x &&
            lBox.y < eBox.y + eBox.h &&
            lBox.y + lBox.h > eBox.y
          ) {
            enemyDamaged = true;
            e.hp -= 1;
            return false; // delete laser
          }
          return true;
        });

        if (enemyDamaged) {
          playSound('hit');
          createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, e.isBoss ? 8 : 10);

          if (e.hp <= 0) {
            createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, e.isBoss ? 35 : 18);
            g.score += e.points;
            setScore(g.score);

            const nextLvlVal = Math.floor(g.score / 180) + 1;
            if (nextLvlVal > g.level) {
              g.level = nextLvlVal;
              setLevel(g.level);
              playSound('powerup');
            }
            return false; // delete enemy
          }
        }

        // Check collision of enemy lasers with player ship
        g.lasers = g.lasers.filter(l => {
          if (!l.isEnemy) return true;
          const lBox = { x: l.x - l.width / 2, y: l.y, w: l.width, h: l.height };
          const shipBox = { x: g.shipX, y: shipY, w: g.shipWidth, h: g.shipHeight };

          if (
            lBox.x < shipBox.x + shipBox.w &&
            lBox.x + lBox.w > shipBox.x &&
            lBox.y < shipBox.y + shipBox.h &&
            lBox.y + lBox.h > shipBox.y
          ) {
            if (g.shieldTime > 0) {
              playSound('hit');
              createExplosion(l.x, l.y, '#6366f1', 6);
            } else {
              g.lives -= 1;
              setLives(g.lives);
              playSound('damage');
              createExplosion(g.shipX + g.shipWidth / 2, shipY + g.shipHeight / 2, '#ef4444', 16);
              if (g.lives <= 0) {
                handleGameOver();
              }
            }
            return false; // remove enemy laser
          }
          return true;
        });

        // Check direct collision with player spaceship or if they breach base
        const shipBox = { x: g.shipX, y: shipY, w: g.shipWidth, h: g.shipHeight };
        const hitsPlayer = (
          eBox.x < shipBox.x + shipBox.w &&
          eBox.x + eBox.w > shipBox.x &&
          eBox.y < shipBox.y + shipBox.h &&
          eBox.y + eBox.h > shipBox.y
        );

        const breachesBase = e.y > g.canvasHeight - 12;

        if (hitsPlayer || breachesBase) {
          if (g.shieldTime > 0 && hitsPlayer) {
            playSound('hit');
            createExplosion(e.x + e.width / 2, e.y + e.height / 2, '#6366f1', 12);
          } else {
            g.lives -= e.isBoss ? 2 : 1;
            setLives(g.lives);
            playSound('damage');
            createExplosion(e.x + e.width / 2, e.y + e.height / 2, '#ef4444', 20);

            if (g.lives <= 0) {
              handleGameOver();
              return false;
            }
          }
          return false; // remove enemy
        }

        return true;
      });

      // Update and Draw Exploding Spark Particles
      g.particles = g.particles.filter(p => {
        if (p.type === 'star') return true;

        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.alpha);

        ctx.beginPath();
        if (p.type === 'trail') {
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          ctx.fill();
        }

        ctx.globalAlpha = 1.0;
        return p.alpha > 0;
      });

      ctx.restore();
      animId = requestAnimationFrame(gameLoop);
    };

    animId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, isGameOver, isPaused, hasTripleFire]);

  const handleGameOver = () => {
    setIsGameOver(true);
    playSound('gameover');

    const finalScore = gameRef.current.score;
    try {
      const stored = localStorage.getItem('tata_space_invaders_highscore');
      if (!stored || finalScore > parseInt(stored)) {
        localStorage.setItem('tata_space_invaders_highscore', finalScore.toString());
        setHighScore(finalScore);
      }
    } catch (e) {}
  };

  // Drag slides
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        gameRef.current.touchX = e.touches[0].clientX - rect.left;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        gameRef.current.touchX = e.touches[0].clientX - rect.left;
      }
    }
  };

  const handleTouchEnd = () => {
    gameRef.current.touchX = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      gameRef.current.touchX = e.clientX - rect.left;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (gameRef.current.touchX !== null) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        gameRef.current.touchX = e.clientX - rect.left;
      }
    }
  };

  const handleMouseUp = () => {
    gameRef.current.touchX = null;
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] bg-slate-900 border-b border-slate-800 shrink-0 transition-colors">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <h2 className="font-extrabold text-lg text-slate-100 flex items-center gap-2">
          <Zap className="text-rose-500 w-5 h-5 animate-pulse" />
          {lang === 'id' ? 'Penghancur Stres' : 'Stress Invaders'}
        </h2>
        <div className="flex items-center gap-2">
          {isPlaying && !isGameOver && (
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-300 transition-colors"
            >
              {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
          )}
          <button 
            onClick={startGame} 
            className="p-2 rounded-full hover:bg-slate-800 text-slate-300 hover:text-slate-50 transition-all active:scale-90"
            title={lang === 'id' ? 'Ulang Game' : 'Reset Game'}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-h-0 bg-[#0b0f19] relative overflow-hidden select-none">
        
        {/* Game HUD */}
        {isPlaying && !isGameOver && (
          <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center bg-slate-900/80 backdrop-blur-md border border-slate-800 px-4 py-2.5 rounded-2xl shadow-lg pointer-events-none animate-in fade-in duration-300">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">SCORE</span>
              <span className="text-base font-black font-mono text-cyan-400">{score}</span>
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">LEVEL</span>
              <span className="text-base font-black font-mono text-indigo-400">{level}</span>
            </div>

            <div className="flex gap-2 items-center">
              {shieldActive && (
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 border border-indigo-500/30 animate-pulse" title="Shield Active">
                  <Shield className="w-3.5 h-3.5" />
                </div>
              )}
              {hasTripleFire && (
                <div className="w-6 h-6 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-400 border border-yellow-500/30 animate-bounce" title="Triple Fire Active">
                  <Zap className="w-3.5 h-3.5" />
                </div>
              )}
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Heart
                    key={i}
                    className={`w-4 h-4 transition-all duration-300 ${
                      i < lives ? 'text-rose-500 fill-rose-500 scale-100' : 'text-slate-800 scale-90'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Start Game Setup */}
        {!isPlaying && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="max-w-xs w-full text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-950/40">
                <Zap className="w-10 h-10 animate-bounce" />
              </div>

              <div>
                <h3 className="text-2xl font-black text-slate-100 mb-2 tracking-wide uppercase">
                  Stress Invaders
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {lang === 'id' 
                    ? 'Tembak hancur semua pikiran negatif (STRESS, BURNOUT, ANXIETY) dengan getaran positif! Geser kapalmu ke kiri/kanan.'
                    : 'Blast away negative thoughts (STRESS, BURNOUT, ANXIETY) using cyan plasma lasers! Drag your ship left/right.'}
                </p>
              </div>

              {highScore > 0 && (
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-yellow-500 animate-pulse" />
                    {lang === 'id' ? 'REKOR TERTINGGI' : 'HIGH SCORE'}
                  </span>
                  <span className="font-black text-yellow-400">{highScore}</span>
                </div>
              )}

              <button
                onClick={startGame}
                className={`w-full py-4 rounded-2xl font-black tracking-wider text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all text-slate-50 ${accentButtonClass}`}
              >
                {lang === 'id' ? 'MULAI HANCURKAN STRES' : 'START BLASTING STRESS'}
              </button>
            </div>
          </div>
        )}

        {/* Interactive Canvas Grid */}
        <div 
          ref={containerRef} 
          className="flex-1 w-full min-h-0 relative cursor-crosshair"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas ref={canvasRef} className="block w-full h-full" />
        </div>

        {/* Retro Arcade Control Pad at Bottom */}
        {isPlaying && !isGameOver && !isPaused && (
          <div className="bg-slate-900 border-t border-slate-800 px-4 py-3 shrink-0 flex items-center justify-between gap-4 select-none pb-[calc(env(safe-area-inset-bottom)+0.75rem)] transition-colors">
            {/* Left / Right D-Pad Controls */}
            <div className="flex gap-2">
              <button
                onMouseDown={(e) => { e.stopPropagation(); gameRef.current.keys['ArrowLeft'] = true; }}
                onMouseUp={(e) => { e.stopPropagation(); gameRef.current.keys['ArrowLeft'] = false; }}
                onMouseLeave={(e) => { e.stopPropagation(); gameRef.current.keys['ArrowLeft'] = false; }}
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); gameRef.current.keys['ArrowLeft'] = true; }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); gameRef.current.keys['ArrowLeft'] = false; }}
                className="w-12 h-12 bg-slate-800 border border-slate-700 active:bg-indigo-500/20 active:border-indigo-500/50 rounded-xl flex items-center justify-center text-slate-300 active:text-indigo-400 font-bold transition-all shadow-md cursor-pointer"
              >
                ◀
              </button>
              <button
                onMouseDown={(e) => { e.stopPropagation(); gameRef.current.keys['ArrowRight'] = true; }}
                onMouseUp={(e) => { e.stopPropagation(); gameRef.current.keys['ArrowRight'] = false; }}
                onMouseLeave={(e) => { e.stopPropagation(); gameRef.current.keys['ArrowRight'] = false; }}
                onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); gameRef.current.keys['ArrowRight'] = true; }}
                onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); gameRef.current.keys['ArrowRight'] = false; }}
                className="w-12 h-12 bg-slate-800 border border-slate-700 active:bg-indigo-500/20 active:border-indigo-500/50 rounded-xl flex items-center justify-center text-slate-300 active:text-indigo-400 font-bold transition-all shadow-md cursor-pointer"
              >
                ▶
              </button>
            </div>

            {/* Instruction Banner - Clean and Elegant */}
            <div className="text-center hidden xs:block">
              <span className="text-[10px] font-mono text-slate-400 block uppercase tracking-wider">
                {lang === 'id' ? 'Sentuh & Geser Layar' : 'Touch & Drag Screen'}
              </span>
              <span className="text-[9px] font-mono text-cyan-400 block uppercase tracking-widest animate-pulse mt-0.5">
                {lang === 'id' ? 'Tembak Otomatis' : 'Auto-Fire'}
              </span>
            </div>

            {/* Manual Fire Button */}
            <button
              onMouseDown={(e) => { e.stopPropagation(); fireLaser(); }}
              onTouchStart={(e) => { e.preventDefault(); e.stopPropagation(); fireLaser(); }}
              className="h-12 px-5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 border border-cyan-400/30 rounded-xl flex items-center gap-1.5 text-slate-50 font-black text-xs shadow-lg shadow-cyan-950/50 transition-all select-none cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              {lang === 'id' ? 'TEMBAK' : 'FIRE'}
            </button>
          </div>
        )}

        {/* Game Over Panel */}
        {isGameOver && (
          <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl relative overflow-hidden">
              <div className="w-16 h-16 mx-auto bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <Award className="w-9 h-9" />
              </div>

              <h3 className="text-2xl font-black text-slate-50 mb-2 tracking-wide uppercase">
                {lang === 'id' ? 'MISI BERHASIL!' : 'MISSION CLEAR!'}
              </h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                {lang === 'id' 
                  ? `Kamu sukses membakar habis stres dan meraih skor ${score} hingga Level ${level}.`
                  : `You successfully blazed away negative thoughts, reaching a score of ${score} up to Level ${level}.`}
              </p>

              <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 mb-8 space-y-2 font-mono text-xs">
                <div className="flex justify-between items-center text-slate-400">
                  <span>{lang === 'id' ? 'Skor Akhir' : 'Final Score'}</span>
                  <span className="font-bold text-cyan-400">{score}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>{lang === 'id' ? 'Level Maksimal' : 'Max Level'}</span>
                  <span className="font-bold text-slate-100">Lv {level}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={startGame}
                  className={`w-full py-3.5 text-slate-50 font-black rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] text-sm shadow-lg ${accentButtonClass}`}
                >
                  {lang === 'id' ? 'Main Lagi' : 'Play Again'}
                </button>
                <button
                  onClick={() => {
                    setIsPlaying(false);
                    setIsGameOver(false);
                  }}
                  className="w-full py-2.5 bg-slate-800 border border-slate-700 hover:bg-slate-750 text-slate-300 rounded-xl font-bold text-xs transition-colors"
                >
                  {lang === 'id' ? 'Menu Utama' : 'Main Menu'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pause Screen Overlay */}
        {isPaused && (
          <div className="absolute inset-0 z-10 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
            <div className="text-center space-y-4">
              <h4 className="text-xl font-black text-slate-200">
                {lang === 'id' ? 'Game Dijeda' : 'Game Paused'}
              </h4>
              <p className="text-xs text-slate-400">
                {lang === 'id' ? 'Ketuk tombol di bawah untuk melanjutkan.' : 'Tap below to resume playing.'}
              </p>
              <button
                onClick={() => setIsPaused(false)}
                className={`py-3 px-8 rounded-xl font-extrabold text-xs text-slate-50 shadow-md ${accentButtonClass}`}
              >
                {lang === 'id' ? 'Lanjutkan' : 'Resume'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

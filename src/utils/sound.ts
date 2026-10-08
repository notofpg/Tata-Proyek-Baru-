// Web Audio API Sound Effects Synthesizer for Tata
let audioCtx: AudioContext | null = null;
let isSoundEnabled = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export const setSoundEnabled = (enabled: boolean) => {
  isSoundEnabled = enabled;
  try {
    localStorage.setItem('tata_sound_enabled', enabled ? 'true' : 'false');
  } catch (e) {}
};

export const getSoundEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem('tata_sound_enabled');
    if (stored !== null) return stored === 'true';
  } catch (e) {}
  return false;
};

isSoundEnabled = getSoundEnabled();

function playTone(freq1: number, freq2: number, type: OscillatorType, duration: number, vol: number = 0.05) {
  if (!isSoundEnabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq1, now);
    if (freq2 !== freq1) {
      osc.frequency.exponentialRampToValueAtTime(freq2, now + duration * 0.8);
    }
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + duration + 0.1);
  } catch (e) {}
}

// 1. Suara "Setuju" / Aksi Sukses (Confirm / Affirmative)
export function playConfirmSound() {
  if (!isSoundEnabled) return;
  // Ting-Ting! (C6, E6 - Soft Sine wave)
  playTone(1046.50, 1046.50, 'sine', 0.1, 0.03);
  setTimeout(() => {
    playTone(1318.51, 1318.51, 'sine', 0.2, 0.03);
  }, 80);
}

// 2. Suara "Batal" / Hapus / Mundur (Cancel / Negative)
export function playCancelSound() {
  if (!isSoundEnabled) return;
  // Blup. (Mellow downward triangle wave)
  playTone(400, 300, 'triangle', 0.15, 0.03);
}

// 3. Haptic Feedback (Vibration)
export function triggerHaptic(type: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (typeof window === 'undefined' || !('navigator' in window) || !('vibrate' in navigator)) return;
  try {
    switch (type) {
      case 'light':
        navigator.vibrate(15);
        break;
      case 'medium':
        navigator.vibrate(30);
        break;
      case 'success':
        navigator.vibrate([20, 60, 35, 60, 45]);
        break;
      case 'warning':
        navigator.vibrate([40, 50, 40]);
        break;
    }
  } catch (e) {}
}

// -- Memetakan semua fungsi lama ke fungsi baru --

// Sentuhan biasa / Navigasi dibuat senyap agar tidak mengganggu
export function playTapSound() { triggerHaptic('light'); }
export function playNavSound() { /* Senyap */ }
export function playOpenModalSound() { /* Senyap */ }

// Aksi "Setuju" / "Sukses"
export function playTaskCompleteSound() {
  triggerHaptic('success');
  playConfirmSound();
}
export function playCelebrationSound() {
  triggerHaptic('success');
  if (isSoundEnabled) {
    playTone(523.25, 659.25, 'sine', 0.12, 0.04);
    setTimeout(() => playTone(659.25, 783.99, 'sine', 0.12, 0.04), 100);
    setTimeout(() => playTone(1046.50, 1318.51, 'sine', 0.25, 0.05), 200);
  }
}
export function playAISendSound() { playConfirmSound(); }
export function playAIReplySound() { playConfirmSound(); }
export function playMoodSound() {
  triggerHaptic('medium');
  playConfirmSound();
}
export function playToggleSound() {
  triggerHaptic('light');
  playConfirmSound();
}

// Aksi "Batal" / "Hapus"
export function playTaskUncheckSound() {
  triggerHaptic('medium');
  playCancelSound();
}
export function playDeleteSound() {
  triggerHaptic('warning');
  playCancelSound();
}
export function playCloseModalSound() { playCancelSound(); }

// Background Timer Worker for PWA
// Overcomes browser main-thread timer throttling when tab is hidden or in background

type TickCallback = () => void;

class BackgroundTimerService {
  private worker: Worker | null = null;
  private callbacks: Set<TickCallback> = new Set();
  private fallbackInterval: number | null = null;
  private isRunning = false;

  constructor() {
    this.initWorker();
    this.setupVisibilityListener();
  }

  private initWorker() {
    if (typeof window === 'undefined') return;

    try {
      // Inline worker code to run high-precision interval in separate thread
      const workerCode = `
        let timerId = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!timerId) {
              timerId = setInterval(() => {
                self.postMessage('tick');
              }, 20000); // Clean 20s cadence for battery and CPU efficiency
            }
          } else if (e.data === 'stop') {
            if (timerId) {
              clearInterval(timerId);
              timerId = null;
            }
          } else if (e.data === 'pulse') {
            self.postMessage('tick');
          }
        };
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const workerUrl = URL.createObjectURL(blob);
      this.worker = new Worker(workerUrl);

      this.worker.onmessage = (e) => {
        if (e.data === 'tick') {
          this.triggerTicks();
        }
      };
    } catch (e) {
      // Fallback if Web Workers are restricted
      this.worker = null;
    }
  }

  private setupVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      // When user returns or leaves, trigger an immediate tick to check alarms
      this.pulse();
      if (document.visibilityState === 'visible') {
        // Also ping service worker to check pending alarms
        this.pingServiceWorker();
      }
    });
  }

  public pingServiceWorker() {
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        const sw = reg.active || navigator.serviceWorker.controller;
        if (sw) {
          sw.postMessage({ type: 'CHECK_PENDING_ALARMS' });
        }
      }).catch(() => {});
    }
  }

  public subscribe(cb: TickCallback): () => void {
    this.callbacks.add(cb);
    if (!this.isRunning) {
      this.start();
    }
    return () => {
      this.callbacks.delete(cb);
      if (this.callbacks.size === 0) {
        this.stop();
      }
    };
  }

  public start() {
    this.isRunning = true;
    if (this.worker) {
      this.worker.postMessage('start');
    } else if (!this.fallbackInterval && typeof window !== 'undefined') {
      // Fallback only if Web Worker is not available
      this.fallbackInterval = window.setInterval(() => {
        this.triggerTicks();
      }, 20000);
    }
  }

  public stop() {
    this.isRunning = false;
    if (this.worker) {
      this.worker.postMessage('stop');
    }
    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }
  }

  public pulse() {
    if (this.worker) {
      this.worker.postMessage('pulse');
    }
    this.triggerTicks();
  }

  private triggerTicks() {
    this.callbacks.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('Background timer tick callback failed:', err);
      }
    });
  }
}

export const backgroundTimer = new BackgroundTimerService();

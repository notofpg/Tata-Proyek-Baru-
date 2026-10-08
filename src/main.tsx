// Suppress benign Vite dev server and WebSocket warnings in iframe development
if (typeof window !== 'undefined') {
  const origError = console.error;
  console.error = (...args: any[]) => {
    const text = typeof args[0] === 'string' ? args[0] : '';
    if (text.includes('[vite]') || text.includes('WebSocket') || text.includes('ws://') || text.includes('wss://')) {
      return;
    }
    origError.apply(console, args);
  };

  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    const text = typeof args[0] === 'string' ? args[0] : '';
    if (text.includes('[vite]') || text.includes('WebSocket') || text.includes('ws://') || text.includes('wss://')) {
      return;
    }
    origWarn.apply(console, args);
  };
}

import { registerSW } from 'virtual:pwa-register';

// ✅ Global PWA Lifecycle Manager
class TataPWAManager {
  private prompt: any = null;
  private isInstalled = false;
  private promptListeners: Set<(p: any) => void> = new Set();

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    // ✅ Capture beforeinstallprompt - can fire multiple times across sessions
    window.addEventListener('beforeinstallprompt', (e: any) => {
      e.preventDefault();
      this.prompt = e;
      console.log('[Tata PWA Manager] beforeinstallprompt captured');
      this.notifyListeners();
      window.dispatchEvent(new CustomEvent('tata_pwa_prompt_ready'));
    });

    // ✅ Track when app is actually installed
    window.addEventListener('appinstalled', () => {
      this.isInstalled = true;
      this.prompt = null;
      console.log('[Tata PWA Manager] App installed successfully');
      window.dispatchEvent(new CustomEvent('tata_pwa_installed'));
    });

    // ✅ Check if already installed (persistent across page reloads)
    this.checkInstallationStatus();
  }

  private async checkInstallationStatus() {
    // Check if running as PWA
    const isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isPWA) {
      this.isInstalled = true;
      console.log('[Tata PWA Manager] App running as installed PWA');
    }
  }

  private notifyListeners() {
    this.promptListeners.forEach(cb => cb(this.prompt));
  }

  public getPrompt() {
    return this.prompt;
  }

  public isInstalledApp() {
    return this.isInstalled;
  }

  public onPromptReady(callback: (prompt: any) => void) {
    this.promptListeners.add(callback);
    // If already captured, call immediately
    if (this.prompt) {
      callback(this.prompt);
    }
  }

  public async install() {
    if (!this.prompt) {
      console.warn('[Tata PWA Manager] No install prompt available');
      return false;
    }
    try {
      this.prompt.prompt();
      const { outcome } = await this.prompt.userChoice;
      if (outcome === 'accepted') {
        console.log('[Tata PWA Manager] User accepted installation');
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Tata PWA Manager] Installation error:', err);
      return false;
    }
  }
}

const pwaMgr = new TataPWAManager();
(window as any).__tata_pwa_manager = pwaMgr;

// ✅ Service Worker registration with retry logic
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        console.log('[Tata PWA] New update available');
        window.dispatchEvent(new CustomEvent('tata_sw_update_available'));
      },
      onOfflineReady() {
        console.log('[Tata PWA] Offline cache ready');
        window.dispatchEvent(new CustomEvent('tata_sw_offline_ready'));
      },
      onRegistered(r: any) {
        if (!r) return;
        console.log('[Tata PWA] Service Worker registered:', r.scope);

        // ✅ Register periodic sync for alarms (Android PWA)
        if ('periodicSync' in r) {
          try {
            r.periodicSync.register('tata-alarm-check', {
              minInterval: 15 * 60 * 1000 // 15 minutes
            }).catch(() => {});
          } catch (e) {}
        }

        // ✅ Register background sync for offline tasks
        if ('sync' in r) {
          try {
            r.sync.register('tata-alarm-sync').catch(() => {});
          } catch (e) {}
        }
      },
      onRegisterError(err) {
        console.error('[Tata PWA] Service Worker error:', err);
      }
    });
    (window as any).__tata_update_sw = updateSW;
  } catch (e) {
    console.warn('[Tata PWA] SW registration failed (may be in restricted iframe):', e);
  }
}

// Clean up any stale service workers from conflicting scopes (if multiple registrations exist)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker?.getRegistrations?.();
      if (registrations && registrations.length > 1) {
        const currentScope = new URL('/', window.location.origin).href;
        for (const reg of registrations) {
          if (reg.scope !== currentScope) {
            try {
              await reg.unregister();
              console.log('[Tata PWA] Cleaned up conflicting SW registration from scope:', reg.scope);
            } catch (_) {}
          }
        }
      }
    } catch (_) {}
  });
}

import {StrictMode, useState, useEffect} from 'react';
import {createRoot} from 'react-dom/client';
const Analytics = () => null;
import App from './App.tsx';
import './index.css';
import { AppProvider } from './store.tsx';
import HydrationGate from './components/HydrationGate.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

function ConditionalAnalytics() {
  const [isDisabled, setIsDisabled] = useState<boolean>(() => {
    try {
      return typeof window !== 'undefined' && localStorage.getItem('tata_disable_telemetry') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleCheck = () => {
      try {
        setIsDisabled(localStorage.getItem('tata_disable_telemetry') === 'true');
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleCheck);
    window.addEventListener('tata_telemetry_changed', handleCheck);
    return () => {
      window.removeEventListener('storage', handleCheck);
      window.removeEventListener('tata_telemetry_changed', handleCheck);
    };
  }, []);

  if (isDisabled) {
    return null;
  }

  return <Analytics />;
}

window.addEventListener('error', (e) => {
  const msg = e.message || '';
  const lowerMsg = msg.toLowerCase();
  if (
    lowerMsg.includes('websocket') ||
    lowerMsg.includes('vite') ||
    lowerMsg.includes('hmr') ||
    lowerMsg.includes('extension') ||
    lowerMsg.includes('scripterror')
  ) {
    return; // Ignore benign HMR/development socket errors
  }
  console.error('Global Error:', e.message, e.filename, e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason;
  const reasonStr = reason ? (reason.message || String(reason)) : '';
  const lowerReason = reasonStr.toLowerCase();
  if (
    lowerReason.includes('websocket') ||
    lowerReason.includes('vite') ||
    lowerReason.includes('hmr') ||
    lowerReason.includes('extension') ||
    lowerReason.includes('unopened') ||
    lowerReason.includes('closed without opened')
  ) {
    return; // Ignore benign HMR/development promise rejections
  }
  console.error('Unhandled Promise Rejection:', e.reason);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <HydrationGate>
        <AppProvider>
          <App />
          <ConditionalAnalytics />
        </AppProvider>
      </HydrationGate>
    </ErrorBoundary>
  </StrictMode>
);

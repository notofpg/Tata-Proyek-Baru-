import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShieldCheck, X, Crown, AlertCircle, RefreshCw, 
  Check, Sparkles, KeyRound, ExternalLink
} from 'lucide-react';
import { useAppStore, TataAccount } from '../store';
import { playTapSound, playCelebrationSound } from '../utils/sound';
import { loadGoogleGisScript, resetGisLoadPromise } from '../utils/loadGoogleGis';

interface GoogleAccountPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (account: TataAccount, isPremium: boolean) => void;
  flow?: 'upgrade' | 'restore' | 'general' | 'trial';
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string; select_by?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            context?: string;
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement, 
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
            }
          ) => void;
          prompt: (momentListener?: (notification: any) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

export default function GoogleAccountPromptModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  flow = 'upgrade'
}: GoogleAccountPromptModalProps) {
  const { lang, loginWithGoogleCredential, tataAccount } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [isGisReady, setIsGisReady] = useState(false);
  const [gisError, setGisError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [clientId, setClientId] = useState<string>(() => {
    // 1. Check Vite & process.env define, with fallback to configured Client ID
    const envClientId = (
      (typeof process !== 'undefined' && process.env?.GOOGLE_CLIENT_ID) ||
      import.meta.env.VITE_GOOGLE_CLIENT_ID ||
      '657688833286-grcpnsga3fc82kdtcnr2qtkchiqkd8r8.apps.googleusercontent.com'
    ).trim();
    return envClientId;
  });
  const [customClientIdInput, setCustomClientIdInput] = useState('');
  const [showConfigInput, setShowConfigInput] = useState(false);

  const googleButtonRef = useRef<HTMLDivElement>(null);
  const isRestoreFlow = flow === 'restore';

  // 1. Fetch server-side GOOGLE_CLIENT_ID if not already defined in client environment
  useEffect(() => {
    let isMounted = true;
    if (!clientId) {
      fetch('/api/auth/google-client-id')
        .then(res => res.json())
        .then(data => {
          if (isMounted && data?.clientId) {
            setClientId(data.clientId.trim());
          }
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [clientId]);

  // Reset internal states when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setStatusFeedback(null);
      setGisError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // 2. Handle Google Identity Services (GIS) Credential Response
  const handleCredentialResponse = async (response: { credential: string; select_by?: string }) => {
    if (!response || !response.credential) {
      setErrorMessage(
        lang === 'id' 
          ? 'Gagal menerima kredensial ID token dari Google Identity Services.' 
          : 'Failed to receive credential ID token from Google Identity Services.'
      );
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setStatusFeedback(
      lang === 'id'
        ? 'Memverifikasi Google Identity Services & mengecek lisensi Tata Pro & Pro Max...'
        : 'Verifying Google Identity Services & checking Tata Pro & Pro Max status...'
    );

    try {
      const result = await loginWithGoogleCredential(response.credential);

      if (result.isPremium) {
        setStatusFeedback(
          lang === 'id' 
            ? 'Berhasil! Akun memiliki Lisensi Tata Pro / Pro Max Aktif.' 
            : 'Verified! Account has active Tata Pro / Pro Max license.'
        );
      } else {
        setStatusFeedback(
          lang === 'id' 
            ? 'Berhasil masuk dengan Akun Google.' 
            : 'Signed in successfully with Google Account.'
        );
      }

      playCelebrationSound();
      if (onSuccess) {
        onSuccess(result.account, result.isPremium);
      }
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || (lang === 'id' ? 'Verifikasi Google Identity Services gagal.' : 'Google authentication verification failed.'));
      setStatusFeedback(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Initialize Google Identity Services (GIS) dynamically on demand
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsGisReady(false);
    setGisError(null);

    const initGis = () => {
      if (!window.google?.accounts?.id) return false;
      if (!clientId) return false;

      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (res: any) => {
            if (isMounted) {
              handleCredentialResponse(res);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
          context: isRestoreFlow ? 'use' : 'signin',
          use_fedcm_for_prompt: true,
        });

        if (googleButtonRef.current) {
          googleButtonRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleButtonRef.current, {
            type: 'standard',
            theme: 'filled_black',
            size: 'large',
            text: isRestoreFlow ? 'signin_with' : 'continue_with',
            shape: 'pill',
            logo_alignment: 'left',
            width: 280,
            locale: lang === 'id' ? 'id' : 'en'
          });
        }

        // Trigger native Google Account One-Tap bottom sheet on mobile device
        try {
          window.google.accounts.id.prompt((notification: any) => {
            if (notification && typeof notification.isNotDisplayed === 'function' && notification.isNotDisplayed()) {
              console.log('[GIS] Prompt not displayed:', notification.getNotDisplayedReason?.() || 'dismissed');
            }
          });
        } catch (_) {}

        if (isMounted) {
          setIsGisReady(true);
          setGisError(null);
        }
        return true;
      } catch (err: any) {
        console.warn('[GIS Init Error]:', err);
        return false;
      }
    };

    // Dynamically load Google Identity Services only when modal is open
    loadGoogleGisScript()
      .then(() => {
        if (!isMounted) return;
        let attempts = 0;
        const tryInit = () => {
          if (!isMounted) return;
          if (initGis()) return;
          attempts++;
          if (attempts < 25) {
            setTimeout(tryInit, 80);
          } else {
            setGisError(
              lang === 'id'
                ? 'Gagal memuat Google Sign-In. Anda sedang offline atau koneksi internet terputus.'
                : 'Failed to load Google Sign-In. You are offline or disconnected.'
            );
          }
        };
        tryInit();
      })
      .catch(() => {
        if (!isMounted) return;
        setIsGisReady(false);
        setGisError(
          lang === 'id'
            ? 'Gagal memuat Google Sign-In. Anda sedang offline atau koneksi internet terputus.'
            : 'Failed to load Google Sign-In. You are offline or disconnected.'
        );
      });

    return () => {
      isMounted = false;
      try {
        window.google?.accounts?.id?.cancel();
      } catch (e) {}
    };
  }, [isOpen, clientId, isRestoreFlow, lang, retryKey]);

  const handleRetryGis = () => {
    resetGisLoadPromise();
    setGisError(null);
    setIsGisReady(false);
    setRetryKey(prev => prev + 1);
  };

  if (!isOpen) return null;

  const handleDismiss = () => {
    if (isLoading) return;
    playTapSound();
    onClose();
  };

  const handleSaveCustomClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = customClientIdInput.trim();
    if (cleanId) {
      setClientId(cleanId);
      setShowConfigInput(false);
      setErrorMessage(null);
    }
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
        onClick={handleDismiss}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-sm bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl p-5 sm:p-6 shadow-2xl relative my-auto overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleDismiss}
            disabled={isLoading}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50 z-20"
            title={lang === 'id' ? 'Tutup' : 'Close'}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Authentic Google Header */}
          <div className="flex flex-col items-center text-center pt-1 pb-3">
            {/* Google Logo */}
            <div className="w-13 h-13 rounded-full bg-white flex items-center justify-center shadow-md mb-3 ring-4 ring-slate-800">
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
            </div>

            <div className="flex items-center gap-1.5 mb-1 flex-wrap justify-center">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Google Identity Services
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span>{lang === 'id' ? 'Paket Lite (Gratis)' : 'Lite Plan (Free)'}</span>
              </span>
            </div>

            <h3 className="text-base font-bold text-slate-50 tracking-tight">
              {isRestoreFlow 
                ? (lang === 'id' ? 'Pulihkan Akun dengan Google' : 'Restore Account with Google')
                : (lang === 'id' ? 'Masuk dengan Akun Google' : 'Sign In with Google Account')}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[280px]">
              {lang === 'id'
                ? 'Login Google hanya untuk verifikasi akun dan status paket. Seluruh data catatan, tugas, dan keuangan tetap 100% lokal di perangkat Anda.'
                : 'Google Sign-in is only used to verify your account and plan status. All notes, tasks, and finance data remain 100% local on your device.'}
            </p>
          </div>

          {/* Status Feedback Banner */}
          {statusFeedback && (
            <div className="p-3 mb-3 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs flex items-center gap-2.5 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-blue-400" />
              <span className="leading-tight font-medium">{statusFeedback}</span>
            </div>
          )}

          {/* Error message */}
          {errorMessage && (
            <div className="p-3 mb-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="leading-tight">{errorMessage}</span>
            </div>
          )}

          {/* GOOGLE IDENTITY SERVICES (GIS) BUTTON CONTAINER */}
          <div className="my-3 flex flex-col items-center justify-center min-h-[56px]">
            {clientId ? (
              <div className="flex flex-col items-center justify-center w-full py-1">
                {/* Official Google-rendered button */}
                <div 
                  ref={googleButtonRef} 
                  className={`flex justify-center min-h-[44px] w-full ${!isGisReady ? 'hidden' : ''}`}
                />

                {!isGisReady && !gisError && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>{lang === 'id' ? 'Memuat Google Identity Services...' : 'Loading Google Identity Services...'}</span>
                  </div>
                )}

                {gisError && (
                  <div className="p-3.5 bg-rose-500/10 border border-rose-500/25 rounded-2xl text-rose-300 text-xs w-full flex flex-col items-center gap-2.5 text-center animate-in fade-in duration-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="font-medium leading-relaxed">{gisError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRetryGis}
                      className="px-3.5 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'Coba Lagi' : 'Retry'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Notice when GOOGLE_CLIENT_ID is not configured in environment */
              <div className="w-full p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-left space-y-2">
                <div className="flex items-start gap-2.5">
                  <KeyRound className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs text-amber-200">
                      {lang === 'id' ? 'GOOGLE_CLIENT_ID Belum Dikonfigurasi' : 'GOOGLE_CLIENT_ID Not Configured'}
                    </h4>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {lang === 'id'
                        ? 'Google Identity Services (GIS) memerlukan GOOGLE_CLIENT_ID di environment variables proyek.'
                        : 'Google Identity Services (GIS) requires GOOGLE_CLIENT_ID in project environment variables.'}
                    </p>
                  </div>
                </div>

                {!showConfigInput ? (
                  <button
                    type="button"
                    onClick={() => setShowConfigInput(true)}
                    className="w-full mt-2 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>{lang === 'id' ? 'Atur Google Client ID Sementara' : 'Set Temporary Google Client ID'}</span>
                  </button>
                ) : (
                  <form onSubmit={handleSaveCustomClientId} className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={customClientIdInput}
                      onChange={(e) => setCustomClientIdInput(e.target.value)}
                      placeholder="xxxx-xxxx.apps.googleusercontent.com"
                      className="w-full px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
                      autoFocus
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={!customClientIdInput.trim()}
                        className="flex-1 py-1.5 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {lang === 'id' ? 'Gunakan Client ID' : 'Apply Client ID'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowConfigInput(false)}
                        className="py-1.5 px-3 rounded-xl text-xs text-slate-400 hover:text-slate-200"
                      >
                        {lang === 'id' ? 'Batal' : 'Cancel'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Current Active User Info if available */}
          {tataAccount && (
            <div className="p-3 mb-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">
                  {(tataAccount.name || tataAccount.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 truncate">
                  <div className="font-semibold text-slate-200 truncate">{tataAccount.name || tataAccount.email}</div>
                  <div className="text-[10px] text-slate-500 truncate">{tataAccount.email}</div>
                </div>
              </div>
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                {lang === 'id' ? 'Terhubung' : 'Connected'}
              </span>
            </div>
          )}

          {/* Privacy & Guarantee Note */}
          <div className="pt-3 border-t border-slate-800/80 text-center space-y-1.5">
            <p className="text-[11px] text-slate-400 leading-relaxed px-1">
              {lang === 'id'
                ? 'Semua catatan, keuangan, dan tugas Anda tetap 100% tersimpan secara offline di HP ini. Login Google murni untuk verifikasi identitas lisensi Tata Pro & Pro Max.'
                : 'All your notes, finances, and tasks remain 100% stored offline on this device. Google login is strictly for Tata Pro & Pro Max license identity verification.'}
            </p>
            <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>100% Offline & Privacy First</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

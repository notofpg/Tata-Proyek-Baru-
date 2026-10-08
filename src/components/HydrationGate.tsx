import React, { useEffect, useState, useRef } from 'react';
import { preloadLargeItems, isStorageHydrated } from '../utils/db';
import { RefreshCw, Database, AlertCircle } from 'lucide-react';

interface HydrationGateProps {
  children: React.ReactNode;
}

export default function HydrationGate({ children }: HydrationGateProps) {
  const [hydrated, setHydrated] = useState<boolean>(() => isStorageHydrated());
  const [hasTimeout, setHasTimeout] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);

  const isMountedRef = useRef<boolean>(true);
  const isHydratedRef = useRef<boolean>(isStorageHydrated());

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Jika sudah di-hidrasi, tidak perlu mengulang
    if (isHydratedRef.current) {
      setHydrated(true);
      return;
    }

    setHasError(false);
    setHasTimeout(false);

    // Timeout 8 detik sebagai batas UI (Aturan 4)
    const timer = setTimeout(() => {
      if (isMountedRef.current && !isHydratedRef.current) {
        setHasTimeout(true);
      }
    }, 8000);

    // Mulai proses preloading IndexedDB
    preloadLargeItems()
      .then((res) => {
        if (!isMountedRef.current) return;
        clearTimeout(timer);

        if (res.success) {
          isHydratedRef.current = true;
          // Timeout 8 detik hanya batas UI: jika proses selesai setelahnya, lanjutkan otomatis!
          setHydrated(true);
          setHasTimeout(false);
          setHasError(false);
        } else {
          setHasError(true);
        }
      })
      .catch((err) => {
        if (!isMountedRef.current) return;
        clearTimeout(timer);
        console.error('[Tata Hydration] Gagal memuat data lokal:', err);
        setHasError(true);
      });

    return () => {
      clearTimeout(timer);
    };
  }, [retryCount]);

  // Jika sudah berhasil hidrasi, render aplikasi utama
  if (hydrated) {
    return <>{children}</>;
  }

  const handleRetry = () => {
    setHasTimeout(false);
    setHasError(false);
    setRetryCount(c => c + 1);
  };

  // Tampilan jika melebihi 8 detik atau terjadi error (Aturan 4)
  if (hasTimeout || hasError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-slate-100 p-6 select-none font-sans">
        <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-7 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            {hasError ? <AlertCircle className="w-8 h-8" /> : <Database className="w-8 h-8 animate-pulse" />}
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">
              {hasError ? 'Kendala Memuat Data Lokal' : 'Pemuatan Data Memerlukan Waktu'}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {hasError
                ? 'Penyimpanan lokal di browser membutuhkan inisialisasi ulang. Demi melindungi catatan dan tugas Anda agar tidak tertimpa data kosong, aplikasi ditahan sejenak.'
                : 'Penyimpanan lokal Anda sedang diproses. Mohon tunggu sejenak atau tekan tombol di bawah untuk mencoba kembali.'}
            </p>
          </div>

          <div className="p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs text-slate-400 text-left space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Prinsip Privasi & Offline:
            </div>
            <p>Seluruh catatan, tugas, dan keuangan Anda tersimpan 100% aman di perangkat ini.</p>
          </div>

          <button
            onClick={handleRetry}
            className="w-full py-3.5 px-5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-medium rounded-2xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
            <span>Coba Lagi</span>
          </button>
        </div>
      </div>
    );
  }

  // Tampilan Loading Awal Sederhana (Aturan 1)
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-6 select-none font-sans">
      <div className="flex flex-col items-center text-center space-y-5 animate-in fade-in duration-300">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-xl shadow-amber-500/20 border border-slate-700/60 bg-slate-900 flex items-center justify-center">
            <img src="/icon.png" alt="Tata Logo" className="w-full h-full object-cover" />
          </div>
          <div className="absolute -inset-1.5 rounded-3xl bg-amber-500/20 animate-pulse -z-10"></div>
        </div>

        <div className="space-y-1.5">
          <div className="text-base font-semibold text-white tracking-wide">
            Menyiapkan Tata Hidup Mu
          </div>
          <div className="text-xs text-slate-400">
            Memuat catatan dan tugas dari penyimpanan lokal...
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse delay-75"></span>
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse delay-150"></span>
        </div>
      </div>
    </div>
  );
}

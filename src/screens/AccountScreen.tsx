import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeft, ShieldCheck, CheckCircle2, LogOut, Sparkles, 
  CreditCard, History, RefreshCw, AlertCircle, ExternalLink,
  Lock, Check, Crown, ArrowRight, UserCheck, Shield, X, Copy,
  Info, Gift, Tag, Zap
} from 'lucide-react';
import { useAppStore, TataAccount } from '../store';
import { useTranslation } from '../translations';
import { ScreenItem } from '../App';
import { LiteStickerIcon } from '../components/LiteModeIcons';
import { playTapSound, playCelebrationSound } from '../utils/sound';
import { sanitizeAvatarUrl } from '../utils/avatar';
import GoogleAccountPromptModal from '../components/GoogleAccountPromptModal';
import { getActivePaymentOrder, setActivePaymentOrderStorage } from '../utils/notifications';
import { getOrganicThemePalette } from '../components/home/organicThemePalettes';
import { TATA_CANONICAL_PLANS, getCanonicalPlan, calculateDiscount } from '../plans';

function loadMidtransSnap(clientKey: string, isProduction: boolean = false): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    if ((window as any).snap) {
      resolve();
      return;
    }
    const scriptId = 'midtrans-snap-script';
    if (document.getElementById(scriptId)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = isProduction 
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    if (clientKey) {
      script.setAttribute('data-client-key', clientKey);
    }
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.body.appendChild(script);
  });
}

interface AccountScreenProps {
  appTheme: string;
  onBack: () => void;
  onNavigate: (screen: ScreenItem, extra?: any) => void;
}

export default function AccountScreen({ appTheme, onBack, onNavigate }: AccountScreenProps) {
  const store = useAppStore();
  const { 
    lang, appVersion, isLiteMode, tataAccount, loginTataAccount, 
    logoutTataAccount, createPaymentOrder, upgradeTataAccountPremium, restoreTataAccountPremium,
    redeemPromoCode, activateTataTrial, isAccountPremium, fetchTataAccountProfile, checkPromoCode
  } = store;
  
  const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : null;
  const effectiveTheme = appTheme || storedTheme || 'dark';
  const palette = React.useMemo(() => getOrganicThemePalette(effectiveTheme), [effectiveTheme]);
  const isLite = effectiveTheme === 'lite' || appVersion === 'lite' || isLiteMode;
  const isDark = palette.isDark;
  const isOrganic = !isLite && ['organic', 'pro_max', 'cute', 'warm'].includes(effectiveTheme);

  // 6-Day Trial Calculation
  const isTrialActive = Boolean(
    tataAccount?.isTrial &&
    tataAccount?.trialExpiresAt &&
    new Date(tataAccount.trialExpiresAt).getTime() > Date.now()
  );

  const trialDaysLeft = isTrialActive && tataAccount?.trialExpiresAt
    ? Math.max(1, Math.ceil((new Date(tataAccount.trialExpiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  const [isLoading, setIsLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleModalFlow, setGoogleModalFlow] = useState<'upgrade' | 'restore' | 'general' | 'trial'>('upgrade');

  const [activeTierTab, setActiveTierTab] = useState<'pro' | 'pro_max'>('pro_max');
  const [selectedPlan, setSelectedPlan] = useState<string>('promax_lifetime');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [paymentsEnabled, setPaymentsEnabled] = useState<boolean>(false);

  useEffect(() => {
    fetch('/api/payment/config')
      .then(res => res.json())
      .then(data => {
        if (typeof data?.paymentsEnabled === 'boolean') {
          setPaymentsEnabled(data.paymentsEnabled);
        }
      })
      .catch(() => {});
  }, []);

  // Promo Code Voucher State
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [isRedeemingPromo, setIsRedeemingPromo] = useState(false);
  const [promoFeedback, setPromoFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [appliedDiscountPromo, setAppliedDiscountPromo] = useState<{
    code: string;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    discountType: string;
    discountValue: number;
    message: string;
  } | null>(null);

  // Re-calculate promo discount from server whenever selectedPlan changes
  useEffect(() => {
    if (!appliedDiscountPromo) return;
    const token = tataAccount?.sessionToken || (typeof window !== 'undefined' ? localStorage.getItem('tata_session_token') : null);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    fetch('/api/payment/check-promo', {
      method: 'POST',
      headers,
      body: JSON.stringify({ code: appliedDiscountPromo.code, plan: selectedPlan })
    })
      .then(res => res.json())
      .then(data => {
        if (data.valid && data.type === 'discount') {
          setAppliedDiscountPromo({
            code: data.code,
            originalAmount: data.originalAmount,
            discountAmount: data.discountAmount,
            finalAmount: data.finalAmount,
            discountType: data.discountType,
            discountValue: data.discountValue,
            message: data.message
          });
        }
      })
      .catch(() => {});
  }, [selectedPlan]);

  // Midtrans Payment Workflow
  const [paymentStep, setPaymentStep] = useState<'select_plan' | 'pending_payment'>('select_plan');
  const accountScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (accountScrollRef.current) {
      accountScrollRef.current.scrollTop = 0;
    }
  }, []);
  const [activePaymentOrder, setActivePaymentOrder] = useState<{
    orderId: string;
    amount: number;
    originalAmount?: number;
    promoCode?: string | null;
    planName: string;
    plan?: string;
    snapToken?: string;
    redirectUrl?: string;
    clientKey?: string;
    isProduction?: boolean;
  } | null>(null);
  const [manualOrderIdInput, setManualOrderIdInput] = useState('');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string | null>(null);

  // Restore Modal State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreOrderIdInput, setRestoreOrderIdInput] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Sync profile & latest subscription status securely from server
  useEffect(() => {
    if (tataAccount?.sessionToken) {
      fetchTataAccountProfile();
    }
    const savedOrder = getActivePaymentOrder();
    if (savedOrder && savedOrder.orderId) {
      setActivePaymentOrder(savedOrder);
      setManualOrderIdInput(savedOrder.orderId);
    }
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleGoogleAuthSuccess = (account: TataAccount, isPremium: boolean) => {
    setShowGoogleModal(false);
    if (isPremium) {
      playCelebrationSound();
      showToast(lang === 'id' ? `Selamat! Tata Pro aktif untuk ${account.email}. Iklan dinonaktifkan.` : `Welcome! Tata Pro is active for ${account.email}. Ads disabled.`);
    } else if (googleModalFlow === 'upgrade') {
      setShowUpgradeModal(true);
      setPaymentStep('select_plan');
    } else if (googleModalFlow === 'restore') {
      setRestoreOrderIdInput('');
      setRestoreError(null);
      setShowRestoreModal(true);
    } else {
      showToast(lang === 'id' ? `Berhasil masuk sebagai ${account.email}` : `Signed in as ${account.email}`);
    }
  };

  const handleLogoutClick = () => {
    playTapSound();
    setShowLogoutConfirmModal(true);
  };

  const handleLogoutConfirm = async () => {
    playTapSound();
    setIsLoading(true);
    try {
      await logoutTataAccount();
      setShowLogoutConfirmModal(false);
      showToast(lang === 'id' ? 'Berhasil keluar dari Akun Tata' : 'Signed out of Tata Account');
    } catch (e: any) {
      showToast(e.message || (lang === 'id' ? 'Gagal keluar dari akun' : 'Failed to sign out'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartPayment = async () => {
    if (!paymentsEnabled) {
      playTapSound();
      const msg = lang === 'id' 
        ? 'Fitur upgrade akan segera hadir. Saat ini pembayaran belum diaktifkan.' 
        : 'Upgrade feature will be available soon. Payments are currently disabled.';
      showToast(lang === 'id' ? 'Fitur upgrade akan segera hadir' : 'Upgrade feature coming soon');
      setPaymentErrorMessage(msg);
      return;
    }

    if (!tataAccount) {
      setGoogleModalFlow('upgrade');
      setShowGoogleModal(true);
      return;
    }
    setIsLoading(true);
    setPaymentErrorMessage(null);
    playTapSound();
    try {
      const promoToApply = appliedDiscountPromo?.code;
      const order = await createPaymentOrder(selectedPlan, promoToApply);
      const orderPayload = {
        orderId: order.orderId,
        amount: order.amount,
        originalAmount: (order as any).originalAmount,
        promoCode: (order as any).promoCode,
        planName: order.planName,
        plan: selectedPlan,
        createdAt: Date.now(),
        snapToken: order.snapToken,
        redirectUrl: order.redirectUrl,
        clientKey: order.clientKey,
        isProduction: order.isProduction
      };
      setActivePaymentOrder(orderPayload);
      setActivePaymentOrderStorage(orderPayload);
      setManualOrderIdInput(order.orderId);
      setPaymentStep('pending_payment');

      if (order.clientKey) {
        await loadMidtransSnap(order.clientKey, order.isProduction);
      }

      if ((window as any).snap && order.snapToken) {
        (window as any).snap.pay(order.snapToken, {
          onSuccess: async () => {
            await handleVerifyPayment(order.orderId);
          },
          onPending: () => {
            showToast(lang === 'id' ? 'Pembayaran sedang diproses. Selesaikan transaksi lalu tekan Verifikasi.' : 'Payment pending. Please complete transaction then verify.');
          },
          onError: () => {
            showToast(lang === 'id' ? 'Pembayaran gagal di Midtrans.' : 'Payment failed at Midtrans.');
          },
          onClose: () => {
            // Popup closed by user
          }
        });
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Gagal membuat pesanan pembayaran';
      setPaymentErrorMessage(errorMsg);
      showToast(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPromoCode = async () => {
    const clean = promoCodeInput.trim().toUpperCase();
    if (!clean) {
      setPromoFeedback({
        type: 'error',
        message: lang === 'id' ? 'Silakan masukkan kode promo / voucher terlebih dahulu.' : 'Please enter a promo code.'
      });
      return;
    }

    setIsRedeemingPromo(true);
    setPromoFeedback(null);
    playTapSound();

    try {
      const data = await checkPromoCode(clean, selectedPlan);

      if (data.type === 'discount') {
        playCelebrationSound();
        setAppliedDiscountPromo({
          code: data.code,
          originalAmount: data.originalAmount,
          discountAmount: data.discountAmount,
          finalAmount: data.finalAmount,
          discountType: data.discountType,
          discountValue: data.discountValue,
          message: data.message
        });
        setPromoFeedback({
          type: 'success',
          message: data.message || (lang === 'id' ? 'Diskon berhasil diterapkan!' : 'Discount applied!')
        });
      } else if (data.type === 'free') {
        const redeemRes = await redeemPromoCode(clean);
        playCelebrationSound();
        setPromoFeedback({
          type: 'success',
          message: redeemRes.message
        });
        showToast(redeemRes.message);
        setTimeout(() => {
          setShowUpgradeModal(false);
          setPromoFeedback(null);
          setPromoCodeInput('');
        }, 2200);
      }
    } catch (err: any) {
      setAppliedDiscountPromo(null);
      setPromoFeedback({
        type: 'error',
        message: err.message || (lang === 'id' ? 'Kode promo tidak valid atau telah kedaluwarsa.' : 'Invalid promo code.')
      });
    } finally {
      setIsRedeemingPromo(false);
    }
  };

  const handleRedeemPromo = async () => {
    const clean = promoCodeInput.trim().toUpperCase();
    if (!clean) {
      setPromoFeedback({
        type: 'error',
        message: lang === 'id' ? 'Silakan masukkan kode promo / voucher terlebih dahulu.' : 'Please enter a promo code.'
      });
      return;
    }

    setIsRedeemingPromo(true);
    setPromoFeedback(null);
    playTapSound();

    try {
      const res = await redeemPromoCode(clean);
      playCelebrationSound();
      setPromoFeedback({
        type: 'success',
        message: res.message
      });
      showToast(res.message);
      setTimeout(() => {
        setShowUpgradeModal(false);
        setPromoFeedback(null);
        setPromoCodeInput('');
      }, 2200);
    } catch (err: any) {
      setPromoFeedback({
        type: 'error',
        message: err.message || (lang === 'id' ? 'Kode promo tidak valid atau telah kedaluwarsa.' : 'Invalid promo code.')
      });
    } finally {
      setIsRedeemingPromo(false);
    }
  };

  const handleVerifyPayment = async (orderIdToVerify?: string) => {
    const orderId = (orderIdToVerify || manualOrderIdInput || activePaymentOrder?.orderId || '').trim();
    if (!orderId) {
      showToast(lang === 'id' ? 'Masukkan Order ID Midtrans untuk diverifikasi.' : 'Enter Midtrans Order ID.');
      return;
    }

    setIsVerifyingPayment(true);
    playTapSound();
    try {
      await upgradeTataAccountPremium(activePaymentOrder?.plan || selectedPlan, {
        provider: 'midtrans',
        orderId
      });
      playCelebrationSound();
      setShowUpgradeModal(false);
      setPaymentStep('select_plan');
      setActivePaymentOrder(null);
      setActivePaymentOrderStorage(null);
      showToast(lang === 'id' ? 'Verifikasi resmi berhasil! Akun Tata Premium aktif.' : 'Official verification succeeded! Premium is active.');
    } catch (err: any) {
      showToast(err.message || 'Verifikasi ke server Midtrans gagal. Akun belum aktif.');
    } finally {
      setIsVerifyingPayment(false);
    }
  };

  const handleRestoreClick = async () => {
    if (!tataAccount) {
      setGoogleModalFlow('restore');
      setShowGoogleModal(true);
      return;
    }
    playTapSound();
    
    // Alur utama: Periksa status premium tersimpan pada server untuk akun login saat ini
    setIsRestoring(true);
    try {
      const success = await restoreTataAccountPremium(tataAccount.email);
      if (success) {
        playCelebrationSound();
        showToast(lang === 'id' ? 'Status Tata Premium Anda aktif dan berhasil dipulihkan!' : 'Tata Premium status is active and restored!');
        return;
      }
    } catch (e) {
      // Lanjut ke opsi recovery via Order ID jika belum aktif
    } finally {
      setIsRestoring(false);
    }

    // Jika belum aktif, tetapi ada riwayat transaksi dengan orderId di akun:
    const existingTxn = tataAccount.transactions?.find(t => t.orderId || t.status === 'success');
    if (existingTxn?.orderId) {
      setIsRestoring(true);
      try {
        const success = await restoreTataAccountPremium(tataAccount.email, {
          provider: 'midtrans',
          orderId: existingTxn.orderId
        });
        if (success) {
          playCelebrationSound();
          showToast(lang === 'id' ? 'Status Tata Premium berhasil diverifikasi & dipulihkan!' : 'Premium verified & restored!');
          return;
        }
      } catch (e) {
        // Fallback to restore modal
      } finally {
        setIsRestoring(false);
      }
    }

    setRestoreOrderIdInput('');
    setRestoreError(null);
    setShowRestoreModal(true);
  };

  const handleConfirmRestoreWithOrderId = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderId = restoreOrderIdInput.trim();
    if (!orderId) {
      setRestoreError(lang === 'id' ? 'Masukkan Order ID Midtrans Anda.' : 'Please enter your Midtrans Order ID.');
      return;
    }

    setIsRestoring(true);
    setRestoreError(null);
    playTapSound();
    try {
      const success = await restoreTataAccountPremium(tataAccount?.email, {
        provider: 'midtrans',
        orderId
      });
      if (success) {
        playCelebrationSound();
        setShowRestoreModal(false);
        showToast(lang === 'id' ? 'Status Tata Premium berhasil dipulihkan dari server Midtrans!' : 'Premium status restored from Midtrans!');
      } else {
        setRestoreError(lang === 'id' ? 'Verifikasi ke server Midtrans gagal. Pembayaran tidak ditemukan atau belum lunas.' : 'Midtrans verification failed. Order not found or unpaid.');
      }
    } catch (err: any) {
      setRestoreError(err.message || (lang === 'id' ? 'Gagal memverifikasi ke Midtrans.' : 'Failed to verify with Midtrans.'));
    } finally {
      setIsRestoring(false);
    }
  };

  const formatDate = (isoStr?: string | null) => {
    if (!isoStr) return lang === 'id' ? 'Seumur Hidup (Lifetime)' : 'Lifetime';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div ref={accountScrollRef} className={`flex flex-col h-full overflow-y-auto font-sans relative transition-colors ${
      isDark ? 'bg-slate-950 text-slate-100' : 'bg-[#FAF8F5] text-slate-900'
    }`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-11/12 bg-indigo-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-indigo-400/40 text-sm font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
          <span className="flex-1">{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <div className={`sticky top-0 z-20 px-4 py-3.5 flex items-center justify-between backdrop-blur-md border-b transition-colors ${
        isDark ? 'bg-slate-950/90 border-slate-800' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        <button
          onClick={() => { playTapSound(); onBack(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-sm transition-all active:scale-95 cursor-pointer ${
            isDark 
              ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700' 
              : 'bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-300'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>{lang === 'id' ? 'Kembali' : 'Back'}</span>
        </button>

        <div className="flex items-center gap-2">
          {isLite ? (
            <LiteStickerIcon variant="user" size="xs" />
          ) : (
            <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
              T
            </div>
          )}
          <h1 className={`font-extrabold text-base sm:text-lg tracking-tight ${
            isDark ? 'text-slate-100' : 'text-slate-900'
          }`}>
            {lang === 'id' ? 'Akun Tata' : 'Tata Account'}
          </h1>
        </div>

        <div className="w-16 flex justify-end">
          {tataAccount && (
            <span className={`text-[11px] font-black uppercase px-2 py-0.5 rounded-full ${
              isAccountPremium 
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            }`}>
              {isAccountPremium ? 'PREMIUM' : 'FREE'}
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* ========================================================================= */}
        {/* CASE 1: USER IS NOT LOGGED IN (GUEST MODE) */}
        {/* ========================================================================= */}
        {!tataAccount ? (
          <div className="space-y-6">
            {/* Guest Banner */}
            <div className={`p-5 rounded-3xl border flex items-start gap-3.5 transition-colors ${
              isDark ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="p-2.5 rounded-2xl bg-sky-500/10 text-sky-500 shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className={`font-bold text-sm sm:text-base ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    {lang === 'id' ? 'Mode Tanpa Akun Aktif' : 'Guest Mode Active'}
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {lang === 'id' ? '100% Offline' : '100% Offline'}
                  </span>
                </div>
                <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {lang === 'id' 
                    ? 'Tata dapat digunakan sepenuhnya tanpa akun. Catatan, tugas, keuangan, kalender, dan mood kamu tersimpan aman secara lokal di perangkat ini.' 
                    : 'Tata can be used completely without an account. Notes, tasks, finances, calendar, and mood are safely stored locally on this device.'}
                </p>
              </div>
            </div>

            {/* Direct Login Card for Guests - Google Sign In Only */}
            <div className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center gap-3.5 text-left w-full sm:w-auto">
                <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                </div>
                <div>
                  <h3 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                    <span>{lang === 'id' ? 'Masuk dengan Akun Google' : 'Sign In with Google Account'}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                      {lang === 'id' ? 'Cek Premium' : 'Check Premium'}
                    </span>
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    {lang === 'id' 
                      ? 'Pencet logo Google untuk memilih akun di HP dan otomatis memeriksa status lisensi Tata Pro.' 
                      : 'Tap Google logo to select account on device and automatically check Tata Pro status.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  playTapSound();
                  setGoogleModalFlow('general');
                  setShowGoogleModal(true);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-full font-bold text-xs bg-white hover:bg-slate-100 text-zinc-950 border border-slate-300 shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                </svg>
                <span>{lang === 'id' ? 'Pilih Akun Google di HP' : 'Select Google Account'}</span>
              </button>
            </div>

            {/* Tata Pro & Pro Max Showcase & Upgrade Flow for Guests */}
            <div className={`p-6 sm:p-8 rounded-3xl border text-center space-y-5 shadow-sm relative overflow-hidden transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
                <Crown className="w-8 h-8 fill-current" />
              </div>

              <div className="space-y-2 max-w-md mx-auto">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Tata Pro & Tata Pro Max</span>
                </div>
                <h3 className={`font-black text-xl sm:text-2xl tracking-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {lang === 'id' ? 'Tingkatkan ke Pro atau Pro Max' : 'Upgrade to Pro or Pro Max'}
                </h3>
                <p className={`text-xs sm:text-sm leading-relaxed px-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {lang === 'id'
                    ? '100% bebas iklan, kustomisasi penuh tema Pro, antarmuka Pro Max 3D eksklusif, atau masukkan kode promo voucher untuk klaim gratis.'
                    : '100% ad-free, full Pro themes customization, Pro Max exclusive 3D UI, or enter a promo voucher code to claim for free.'}
                </p>
              </div>

              {/* Action Buttons: Upgrade to Pro/Pro Max, Promo Code, & Restore Purchase */}
              <div className="pt-2 max-w-sm mx-auto space-y-2.5">
                {/* Google Sign In Button for Guests */}
                <button
                  onClick={() => {
                    playTapSound();
                    setGoogleModalFlow('general');
                    setShowGoogleModal(true);
                  }}
                  className={`w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all duration-150 active:scale-95 cursor-pointer border ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700' 
                      : 'bg-white hover:bg-slate-50 text-slate-900 border-slate-300'
                  }`}
                >
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  <span>{lang === 'id' ? 'Masuk dengan Akun Google (Paket Lite)' : 'Sign In with Google Account (Lite)'}</span>
                </button>

                <button
                  onClick={() => {
                    playTapSound();
                    setPaymentErrorMessage(null);
                    setActiveTierTab('pro_max');
                    setSelectedPlan('promax_yearly');
                    setShowUpgradeModal(true);
                    setPaymentStep('select_plan');
                    setShowPromoInput(false);
                  }}
                  className={`w-full flex items-center justify-center gap-2.5 py-3 px-6 rounded-2xl font-bold text-xs border transition-all duration-150 active:scale-95 cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  <Crown className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{lang === 'id' ? 'Lihat Pilihan Paket Berbayar' : 'View Paid Plans'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <button
                  onClick={() => {
                    playTapSound();
                    setPaymentErrorMessage(null);
                    setActiveTierTab('pro_max');
                    setSelectedPlan('promax_yearly');
                    setShowUpgradeModal(true);
                    setPaymentStep('select_plan');
                    setShowPromoInput(true);
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs border transition-all duration-150 cursor-pointer ${
                    isDark 
                      ? 'bg-slate-800/80 hover:bg-slate-800 text-amber-300 border-amber-500/20' 
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                  }`}
                >
                  <Gift className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{lang === 'id' ? 'Punya Kode Promo / Voucher? Klaim Gratis' : 'Have a Promo / Voucher Code? Redeem Free'}</span>
                </button>

                <button
                  onClick={() => {
                    playTapSound();
                    if (!tataAccount) {
                      setGoogleModalFlow('restore');
                      setShowGoogleModal(true);
                    } else {
                      handleRestoreClick();
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-medium text-xs transition-all duration-150 cursor-pointer ${
                    isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>{lang === 'id' ? 'Sudah pernah beli Tata Pro? Pulihkan lisensi' : 'Already purchased Tata Pro? Restore license'}</span>
                </button>
              </div>

              {/* Privacy Guarantee Chips */}
              <div className={`pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-left text-xs ${
                isDark ? 'border-slate-800/60' : 'border-slate-200'
              }`}>
                <div className={`flex items-center gap-2 p-2 rounded-xl ${
                  isDark ? 'bg-slate-800/40 text-slate-300' : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}>
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{lang === 'id' ? 'Bukan untuk sinkronisasi' : 'No cloud sync'}</span>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-xl ${
                  isDark ? 'bg-slate-800/40 text-slate-300' : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}>
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{lang === 'id' ? 'Data 100% di perangkat' : '100% on device'}</span>
                </div>
                <div className={`flex items-center gap-2 p-2 rounded-xl ${
                  isDark ? 'bg-slate-800/40 text-slate-300' : 'bg-slate-50 text-slate-700 border border-slate-200'
                }`}>
                  <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{lang === 'id' ? 'Login hanya untuk lisensi' : 'Login only for license'}</span>
                </div>
              </div>
            </div>

            {/* Offline Features Guarantee List */}
            <div className={`p-5 sm:p-6 rounded-3xl border space-y-3.5 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <h4 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                <Lock className="w-4 h-4 text-indigo-500" />
                <span>{lang === 'id' ? 'Semua Fitur Berfungsi Penuh Tanpa Login' : 'All Features Work Fully Offline Without Login'}</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { name: lang === 'id' ? 'Catatan & Dokumen' : 'Notes & Docs', icon: '📝', onClick: () => onNavigate('home') },
                  { name: lang === 'id' ? 'Tugas & To-Do List' : 'Tasks & To-Dos', icon: '✅', onClick: () => onNavigate('tasks') },
                  { name: lang === 'id' ? 'Kalender & Agenda' : 'Calendar & Agenda', icon: '📅', onClick: () => onNavigate('calendar') },
                  { name: lang === 'id' ? 'Keuangan & Tabungan' : 'Finance & Savings', icon: '💰', onClick: () => onNavigate('finance') },
                  { name: lang === 'id' ? 'Mood Tracker' : 'Mood Tracker', icon: '✨', onClick: () => onNavigate('home') },
                  { name: lang === 'id' ? 'Backup & Restore File' : 'Local Backup/Restore', icon: '💾', onClick: () => onNavigate('settings', 'backup') },
                ].map((item, idx) => (
                  <button 
                    key={idx} 
                    type="button"
                    onClick={item.onClick}
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 transition-all text-left cursor-pointer active:scale-95 hover:border-indigo-500/40 ${
                      isDark ? 'bg-slate-800/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/70' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="font-semibold truncate">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* CASE 2: USER IS LOGGED IN */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* User Profile Card */}
            <div className={`p-6 sm:p-7 rounded-3xl border space-y-5 shadow-sm transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}>
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left min-w-0 flex-1">
                  {/* Profile Photo */}
                  <div className="relative w-20 h-20 rounded-3xl overflow-hidden ring-4 ring-indigo-500/20 shadow-md shrink-0 bg-slate-800">
                    <img 
                      src={sanitizeAvatarUrl(tataAccount.avatarUrl, tataAccount.name || tataAccount.email)} 
                      alt={tataAccount.name} 
                      className="w-full h-full object-cover"
                    />
                    {isAccountPremium && (
                      <div className="absolute bottom-0 right-0 p-1 bg-amber-500 text-zinc-950 rounded-tl-xl" title="Premium Active">
                        <Crown className="w-3.5 h-3.5 fill-current" />
                      </div>
                    )}
                  </div>

                  {/* Name, Email, Status */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <h3 className={`font-black text-lg sm:text-xl truncate ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                        {tataAccount.name}
                      </h3>
                      <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0 ${
                        isAccountPremium 
                          ? isTrialActive
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                          : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                      }`}>
                        {isTrialActive 
                          ? (lang === 'id' ? `⚡ Uji Coba Pro Max (${trialDaysLeft} Hari)` : `⚡ Pro Max Trial (${trialDaysLeft} Days)`)
                          : isAccountPremium 
                            ? (lang === 'id' ? 'Tata Premium' : 'Tata Premium') 
                            : (lang === 'id' ? 'Tata Lite' : 'Tata Lite')}
                      </span>
                    </div>
                    
                    <p className={`text-xs sm:text-sm font-medium break-all ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {tataAccount.email}
                    </p>

                    <p className={`text-[11px] pt-0.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                      User ID: <span className={`font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{tataAccount.userId}</span>
                    </p>

                    {/* Trial / Lite Transition Status Banners */}
                    {isTrialActive ? (
                      <div className="p-3 mt-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-left space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xs">
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>{lang === 'id' ? 'Uji Coba Gratis 6 Hari Sedang Aktif' : '6-Day Free Trial Active'}</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {lang === 'id'
                            ? `Nikmati seluruh fitur Tata Pro & Pro Max (tersisa ${trialDaysLeft} hari). Setelah selesai, Anda langsung beralih ke Tata Lite tanpa ada catatan atau data yang hilang!`
                            : `Enjoy all Pro & Pro Max features (${trialDaysLeft} days left). Seamlessly transitions to Tata Lite with zero data loss!`}
                        </p>
                      </div>
                    ) : (!isAccountPremium && tataAccount.trialUsed) ? (
                      <div className={`p-3 mt-3 rounded-2xl border text-left space-y-1.5 ${
                        isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                          <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{lang === 'id' ? 'Masa Uji Coba 6 Hari Telah Selesai' : '6-Day Trial Completed'}</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {lang === 'id'
                            ? 'Akun Anda saat ini menggunakan Tata Lite. Tenang saja, 100% catatan, tugas, dan data Anda tetap tersimpan utuh di perangkat ini! Masukkan kode promo voucher atau beli lisensi untuk membuka kembali fitur Pro Max.'
                            : 'You are now on Tata Lite. All your notes and data remain 100% intact locally! Redeem a voucher or purchase a license to unlock Pro Max again.'}
                        </p>
                      </div>
                    ) : (!isAccountPremium && !tataAccount.trialUsed) ? (
                      <div className={`p-3 mt-3 rounded-2xl border text-left space-y-2 ${
                        isDark ? 'bg-amber-500/10 border-amber-500/25' : 'bg-amber-50/80 border-amber-200'
                      }`}>
                        <div className="flex items-center gap-1.5 text-amber-500 font-bold text-xs">
                          <Gift className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>{lang === 'id' ? 'Uji Coba 6 Hari Pro Max Tersedia' : '6-Day Free Trial Available'}</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {lang === 'id' 
                            ? 'Akun Google Anda berhak mendapatkan uji coba 6 hari gratis Tata Pro & Pro Max.' 
                            : 'Your Google account is eligible for a 6-day free trial of Tata Pro & Pro Max.'}
                        </p>
                        <button
                          onClick={async () => {
                            try {
                              playTapSound();
                              setIsLoading(true);
                              await activateTataTrial();
                              playCelebrationSound();
                              showToast(lang === 'id' ? 'Uji coba 6 hari Tata Pro Max aktif!' : '6-day Pro Max trial activated!');
                            } catch (err: any) {
                              showToast(err.message || 'Gagal mengaktifkan uji coba.');
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                          className="py-1.5 px-3 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:bg-amber-400 transition-all cursor-pointer active:scale-95"
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>{lang === 'id' ? 'Aktifkan Uji Coba 6 Hari' : 'Activate 6-Day Trial'}</span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Action Buttons: Switch Account & Logout */}
                <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end shrink-0">
                  <button
                    onClick={() => {
                      playTapSound();
                      setGoogleModalFlow('general');
                      setShowGoogleModal(true);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold text-xs border transition-all active:scale-95 cursor-pointer shrink-0 ${
                      isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                    title={lang === 'id' ? 'Ganti akun Google' : 'Switch Google account'}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                    </svg>
                    <span>{lang === 'id' ? 'Ganti Akun' : 'Switch Account'}</span>
                  </button>

                  <button
                    onClick={async () => {
                      playTapSound();
                      setIsLoading(true);
                      try {
                        await fetchTataAccountProfile();
                        showToast(lang === 'id' ? 'Status akun Google berhasil diperbarui!' : 'Account status updated!');
                      } catch (e: any) {
                        showToast(e.message || 'Gagal memeriksa status');
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl font-bold text-xs border transition-all active:scale-95 cursor-pointer shrink-0 ${
                      isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                    }`}
                    title={lang === 'id' ? 'Cek ulang status lisensi' : 'Refresh status'}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>{lang === 'id' ? 'Cek Status' : 'Check Status'}</span>
                  </button>

                  <button
                    onClick={handleLogoutClick}
                    className="flex items-center gap-2 px-3 py-2 rounded-2xl font-bold text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 transition-all active:scale-95 cursor-pointer shrink-0"
                    title={lang === 'id' ? 'Keluar dari Akun Tata' : 'Sign out'}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{lang === 'id' ? 'Keluar' : 'Sign Out'}</span>
                  </button>
                </div>
              </div>

              {/* Status Details Bar */}
              <div className={`pt-4 border-t grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs ${
                isDark ? 'border-slate-800/60' : 'border-slate-200'
              }`}>
                <div className={`p-3 rounded-2xl border space-y-0.5 ${
                  isDark ? 'bg-slate-800/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lang === 'id' ? 'Status Lisensi' : 'License Status'}</span>
                  <div className={`font-bold text-sm flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {isTrialActive ? (
                      <>
                        <Sparkles className="w-4 h-4 text-emerald-400 fill-current shrink-0" />
                        <span className="text-emerald-500 font-bold">
                          {lang === 'id' ? 'Uji Coba 6 Hari Tata Pro Max' : '6-Day Pro Max Trial'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-500 font-mono font-bold">
                          TRIAL
                        </span>
                      </>
                    ) : isAccountPremium ? (
                      <>
                        <Crown className="w-4 h-4 text-amber-500 fill-current shrink-0" />
                        <span className="text-amber-500">
                          {tataAccount.premiumType?.includes('pro_max') || tataAccount.premiumType === 'lifetime'
                            ? (lang === 'id' ? 'Tata Pro Max' : 'Tata Pro Max')
                            : (lang === 'id' ? 'Tata Pro' : 'Tata Pro')}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-500 font-mono font-bold">
                          {tataAccount.premiumType?.includes('lifetime') ? 'LIFETIME' : 'ACTIVE'}
                        </span>
                      </>
                    ) : (
                      <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>{lang === 'id' ? 'Tata Lite (Mode Gratis)' : 'Tata Lite (Free Tier)'}</span>
                    )}
                  </div>
                </div>
                <div className={`p-3 rounded-2xl border space-y-0.5 ${
                  isDark ? 'bg-slate-800/40 border-slate-800/60' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{lang === 'id' ? 'Masa Berlaku' : 'Valid Until'}</span>
                  <div className={`font-bold text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                    {isTrialActive
                      ? (lang === 'id' 
                          ? `${formatDate(tataAccount.trialExpiresAt)} (${trialDaysLeft} hari lagi)` 
                          : `${formatDate(tataAccount.trialExpiresAt)} (${trialDaysLeft} days left)`)
                      : isAccountPremium 
                        ? (tataAccount.premiumType?.includes('lifetime') 
                            ? (lang === 'id' ? 'Seumur Hidup (Selamanya)' : 'Lifetime (Forever)') 
                            : formatDate(tataAccount.premiumExpiresAt)) 
                        : (tataAccount.trialUsed 
                            ? (lang === 'id' ? 'Uji Coba Selesai (Tata Lite)' : 'Trial Ended (Tata Lite)') 
                            : '-')}
                  </div>
                </div>
              </div>
            </div>

            {/* Premium Benefits & Upgrade Actions */}
            <div className={`p-6 rounded-3xl border space-y-4 transition-colors ${
              isAccountPremium 
                ? isDark
                  ? 'bg-gradient-to-br from-amber-500/10 via-slate-900 to-indigo-500/10 border-amber-500/30' 
                  : 'bg-gradient-to-br from-amber-50 via-white to-orange-50 border-amber-300 shadow-sm'
                : isDark
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-500 shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-bold text-sm sm:text-base flex items-center gap-2 ${
                      isDark ? 'text-slate-100' : 'text-slate-900'
                    }`}>
                      <span className="truncate">
                        {isAccountPremium 
                          ? (tataAccount.premiumType?.includes('pro_max') || tataAccount.premiumType === 'lifetime'
                              ? (lang === 'id' ? 'Tata Pro Max Aktif' : 'Tata Pro Max Active')
                              : (lang === 'id' ? 'Tata Pro Aktif' : 'Tata Pro Active')) 
                          : (lang === 'id' ? 'Tingkatkan ke Tata Pro & Pro Max' : 'Upgrade to Tata Pro & Pro Max')}
                      </span>
                    </h4>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'} line-clamp-2 mt-0.5`}>
                      {isAccountPremium 
                        ? (lang === 'id' ? 'Semua hak akses layanan resmi Tata telah terbuka di perangkat ini.' : 'All official Tata perks are unlocked on this device.') 
                        : (lang === 'id' ? 'Pilih paket hemat atau gunakan kode promo voucher untuk aktivasi gratis.' : 'Choose a plan or redeem a promo voucher code for free.')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleRestoreClick}
                  disabled={isRestoring}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border transition-all cursor-pointer shrink-0 w-full sm:w-auto ${
                    isDark
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                  title="Pulihkan Pembelian"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRestoring ? 'animate-spin' : ''}`} />
                  <span>{isRestoring ? (lang === 'id' ? 'Memulihkan...' : 'Restoring...') : (lang === 'id' ? 'Pulihkan Pembelian' : 'Restore')}</span>
                </button>
              </div>

              {/* Action Buttons for Logged In User */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                {!isAccountPremium ? (
                  <>
                    <button
                      onClick={() => { 
                        playTapSound(); 
                        setPaymentErrorMessage(null);
                        setShowUpgradeModal(true); 
                        setPaymentStep('select_plan');
                        setShowPromoInput(false);
                      }}
                      className="flex-1 py-3 px-5 rounded-2xl font-bold text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-md shadow-amber-500/10 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 fill-current shrink-0" />
                      <span>{lang === 'id' ? 'Beli Tata Pro / Pro Max' : 'Get Tata Pro / Pro Max'}</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </button>
                    <button
                      onClick={() => {
                        playTapSound(); 
                        setPaymentErrorMessage(null);
                        setShowUpgradeModal(true); 
                        setPaymentStep('select_plan');
                        setShowPromoInput(true);
                      }}
                      className={`py-3 px-4 rounded-2xl font-bold text-xs border transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800/90 hover:bg-slate-800 text-amber-300 border-amber-500/30' 
                          : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                      }`}
                    >
                      <Gift className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>{lang === 'id' ? 'Klaim Kode Promo' : 'Redeem Promo'}</span>
                    </button>
                  </>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full">
                    {!(tataAccount.premiumType?.includes('pro_max') || tataAccount.premiumType === 'lifetime') && (
                      <button
                        onClick={() => {
                          playTapSound();
                          setActiveTierTab('pro_max');
                          setSelectedPlan('promax_lifetime');
                          setPaymentErrorMessage(null);
                          setShowUpgradeModal(true);
                          setPaymentStep('select_plan');
                          setShowPromoInput(false);
                        }}
                        className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all"
                      >
                        <Crown className="w-3.5 h-3.5 fill-current shrink-0" />
                        <span>{lang === 'id' ? 'Upgrade ke Tata Pro Max' : 'Upgrade to Tata Pro Max'}</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        playTapSound();
                        setPaymentErrorMessage(null);
                        setShowUpgradeModal(true);
                        setPaymentStep('select_plan');
                        setShowPromoInput(true);
                      }}
                      className={`py-2.5 px-4 rounded-xl font-bold text-xs border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                        isDark 
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                    >
                      <Gift className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{lang === 'id' ? 'Gunakan Kode Promo Lain' : 'Use Another Promo Code'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Transaction & Purchase History */}
            <div className={`p-5 sm:p-6 rounded-3xl border space-y-4 transition-colors ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between">
                <h4 className={`font-bold text-sm flex items-center gap-2 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  <History className="w-4 h-4 text-indigo-500" />
                  <span>{lang === 'id' ? 'Riwayat Transaksi Akun' : 'Account Transaction History'}</span>
                </h4>
                <span className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {tataAccount.transactions?.length || 0} {lang === 'id' ? 'transaksi' : 'transactions'}
                </span>
              </div>

              {(!tataAccount.transactions || tataAccount.transactions.length === 0) ? (
                <div className={`p-6 text-center rounded-2xl border space-y-1 ${
                  isDark ? 'bg-slate-800/30 border-slate-800/50' : 'bg-slate-50 border-slate-200'
                }`}>
                  <CreditCard className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {lang === 'id' ? 'Belum ada transaksi pembayaran.' : 'No payment transactions yet.'}
                  </p>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {lang === 'id' ? 'Riwayat pembelian lisensi Tata Premium akan muncul di sini.' : 'Your Tata Premium purchases will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {tataAccount.transactions.map((txn) => (
                    <div key={txn.id || txn.transactionId} className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                      isDark ? 'bg-slate-800/40 border-slate-800/70' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{txn.planName}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 border border-emerald-500/30">
                            {txn.status.toUpperCase()}
                          </span>
                        </div>
                        <p className={`text-[11px] font-mono ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          ID: {txn.transactionId}
                        </p>
                      </div>

                      <div className="sm:text-right space-y-0.5">
                        <div className={`font-black text-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                          Rp {txn.amount.toLocaleString('id-ID')}
                        </div>
                        <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          {formatDate(txn.paidAt)} • {txn.paymentMethod}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Strict Privacy Guarantee Banner */}
            <div className={`p-5 rounded-3xl border flex items-start gap-3.5 text-xs ${
              isDark ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300' : 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
            }`}>
              <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-emerald-500 block">
                  {lang === 'id' ? 'Privasi Mutlak Terjamin' : 'Absolute Privacy Guaranteed'}
                </span>
                <p className={`leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {lang === 'id'
                    ? 'Akun Tata hanya menyimpan identitas dan status langganan kamu. Server Tata TIDAK PERNAH membaca atau menerima isi catatan, data keuangan, tugas, kalender, mood, atau database lokal kamu. Semua data pribadi tetap 100% tersimpan di perangkat ini.'
                    : 'Tata Account only stores your identity and subscription status. Tata servers NEVER read or receive your notes, finances, tasks, calendar, mood, or local database. All personal data remains 100% on this device.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* OFFICIAL GOOGLE IDENTITY SERVICES MODAL (UPGRADE / RESTORE FLOWS ONLY) */}
      {/* ========================================================================= */}
      <GoogleAccountPromptModal
        isOpen={showGoogleModal}
        flow={googleModalFlow}
        onClose={() => setShowGoogleModal(false)}
        onSuccess={handleGoogleAuthSuccess}
      />

      {/* ========================================================================= */}
      {/* UPGRADE PREMIUM MODAL (WITH STRICT MIDTRANS VERIFICATION & PROMO CODE) */}
      {/* ========================================================================= */}
      {showUpgradeModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-hidden animate-in fade-in duration-150"
          onClick={() => {
            if (!isVerifyingPayment && !isLoading && !isRedeemingPromo) {
              setShowUpgradeModal(false);
              setPaymentStep('select_plan');
              setPaymentErrorMessage(null);
              setPromoFeedback(null);
            }
          }}
        >
          <div 
            className={`w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] flex flex-col rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-150 overflow-hidden transition-colors ${
              isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Sticky at top */}
            <div className={`shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-b flex items-center justify-between transition-colors ${
              isDark ? 'border-slate-800/80 bg-slate-900/95' : 'border-slate-200 bg-slate-50/95'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-amber-500">
                  <Crown className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className={`font-extrabold text-base sm:text-lg flex items-center gap-1.5 ${
                    isDark ? 'text-slate-100' : 'text-slate-900'
                  }`}>
                    <span>
                      {paymentStep === 'select_plan' 
                        ? (lang === 'id' ? 'Upgrade Tata Pro & Pro Max' : 'Upgrade Tata Pro & Pro Max')
                        : (lang === 'id' ? 'Pembayaran & Verifikasi Resmi' : 'Payment & Official Verification')}
                    </span>
                  </h3>
                  <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {paymentStep === 'select_plan'
                      ? (lang === 'id' ? 'Bebas iklan, tema eksklusif, atau klaim kode promo gratis' : 'Ad-free, exclusive themes, or claim free promo vouchers')
                      : (lang === 'id' ? 'Penyelesaian transaksi & validasi server resmi' : 'Transaction completion & server validation')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowUpgradeModal(false);
                  setPaymentStep('select_plan');
                  setPaymentErrorMessage(null);
                  setPromoFeedback(null);
                }}
                disabled={isVerifyingPayment || isLoading || isRedeemingPromo}
                className={`p-1.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer ${
                  isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Body: Smooth, device-adaptive */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-4 overscroll-contain">
              {paymentStep === 'select_plan' ? (
                <>
                  {/* Notice when payments are not yet enabled */}
                  {!paymentsEnabled && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start gap-2.5">
                      <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold block">
                          {lang === 'id' ? 'Fitur Upgrade Segera Hadir' : 'Upgrade Feature Coming Soon'}
                        </span>
                        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {lang === 'id'
                            ? 'Pilihan upgrade paket Pro & Pro Max saat ini sedang dipersiapkan dan akan segera hadir. Anda tetap dapat menikmati seluruh fitur pencatatan, agenda, dan finansial Tata secara gratis di paket Lite.'
                            : 'Pro & Pro Max upgrade will be available soon. All core note, task, and finance features are free to use in Lite.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Tier Selection Tabs: Tata Pro vs Tata Pro Max */}
                  <div className={`grid grid-cols-2 p-1 rounded-2xl border gap-1 transition-colors ${
                    isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <button
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setActiveTierTab('pro');
                        if (!selectedPlan.startsWith('pro_')) {
                          setSelectedPlan('pro_yearly');
                        }
                        setPaymentErrorMessage(null);
                      }}
                      className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                        activeTierTab === 'pro'
                          ? isDark
                            ? 'bg-slate-800 text-amber-300 shadow-sm border border-amber-500/30'
                            : 'bg-white text-amber-700 shadow-sm border border-amber-500/30'
                          : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">Tata Pro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        playTapSound();
                        setActiveTierTab('pro_max');
                        if (!selectedPlan.startsWith('promax_')) {
                          setSelectedPlan('promax_yearly');
                        }
                        setPaymentErrorMessage(null);
                      }}
                      className={`relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                        activeTierTab === 'pro_max'
                          ? isDark
                            ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 text-amber-300 shadow-sm border border-amber-500/50'
                            : 'bg-gradient-to-r from-amber-100 via-orange-100 to-amber-100 text-amber-900 shadow-sm border border-amber-300'
                          : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Crown className="w-3.5 h-3.5 fill-current text-amber-500 shrink-0" />
                      <span className="truncate">Tata Pro Max</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 uppercase tracking-tight shrink-0 hidden sm:inline-block">
                        TOP
                      </span>
                    </button>
                  </div>

                  {/* Tier Features Highlights */}
                  <div className={`p-3.5 rounded-2xl border text-xs space-y-2 transition-colors ${
                    activeTierTab === 'pro_max'
                      ? isDark
                        ? 'bg-gradient-to-br from-amber-500/10 via-slate-900 to-orange-500/10 border-amber-500/30'
                        : 'bg-gradient-to-br from-amber-50/80 via-white to-orange-50/80 border-amber-300/60'
                      : isDark
                        ? 'bg-slate-800/40 border-slate-800'
                        : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {activeTierTab === 'pro_max' ? (
                          <>
                            <Crown className="w-4 h-4 text-amber-500 fill-current shrink-0" />
                            <span>{lang === 'id' ? 'Keunggulan Tata Pro Max (Flagship):' : 'Tata Pro Max Flagship Perks:'}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>{lang === 'id' ? 'Keunggulan Tata Pro:' : 'Tata Pro Perks:'}</span>
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-emerald-500 font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 shrink-0">
                        {lang === 'id' ? '100% Offline' : '100% Offline'}
                      </span>
                    </div>

                    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      {activeTierTab === 'pro_max' ? (
                        <>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{lang === 'id' ? 'Semua Hak Akses Tata Pro' : 'All Tata Pro Perks'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{lang === 'id' ? 'Tampilan Pro Max 3D Eksklusif' : 'Exclusive Pro Max 3D UI'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{lang === 'id' ? 'Mesin Live Wallpaper Dinamis' : 'Live Wallpaper Engine'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{lang === 'id' ? 'Mahkota Emas & Update Prioritas' : 'Gold Crown & Priority Updates'}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{lang === 'id' ? '100% Bebas Iklan & Pelacak' : '100% Ad-Free & No Trackers'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{lang === 'id' ? 'Akses Semua Tema Pro Lengkap' : 'All Pro Themes Unlocked'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{lang === 'id' ? 'Cadangan & Ekspor Tanpa Batas' : 'Unlimited Local Backup/Export'}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>{lang === 'id' ? 'Pengingat Fleksibel & Tepat Waktu' : 'Precision Reminders'}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pricing Cards List */}
                  <div className="space-y-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider block ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      {lang === 'id' ? 'Pilih Masa Berlaku Lisensi:' : 'Select License Period:'}
                    </span>
                    {(activeTierTab === 'pro_max' ? [
                      TATA_CANONICAL_PLANS.promax_monthly,
                      TATA_CANONICAL_PLANS.promax_yearly,
                      TATA_CANONICAL_PLANS.promax_lifetime,
                    ] : [
                      TATA_CANONICAL_PLANS.pro_monthly,
                      TATA_CANONICAL_PLANS.pro_yearly,
                      TATA_CANONICAL_PLANS.pro_lifetime,
                    ]).map((plan) => {
                      const isSelected = selectedPlan === plan.id;
                      const hasDiscount = isSelected && appliedDiscountPromo && appliedDiscountPromo.finalAmount < plan.price;
                      return (
                        <div
                          key={plan.id}
                          onClick={() => { 
                            playTapSound(); 
                            setSelectedPlan(plan.id);
                            setPaymentErrorMessage(null);
                          }}
                          className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            isSelected
                              ? isDark
                                ? 'bg-amber-500/10 border-amber-500/60 ring-2 ring-amber-500/20'
                                : 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/25'
                              : isDark
                                ? 'bg-slate-800/40 border-slate-800/80 hover:bg-slate-800/70 hover:border-slate-700'
                                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected 
                                ? 'border-amber-400 bg-amber-400' 
                                : isDark ? 'border-slate-600 bg-slate-900' : 'border-slate-400 bg-white'
                            }`}>
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                            </div>

                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`font-bold text-xs sm:text-sm leading-tight ${
                                  isDark ? 'text-slate-100' : 'text-slate-900'
                                }`}>
                                  {plan.name}
                                </span>
                                {(lang === 'id' ? plan.badgeId : plan.badgeEn) && (
                                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase shrink-0 leading-none ${
                                    (plan.badgeId || '').includes('MAHKOTA') || (plan.badgeId || '').includes('POPULER')
                                      ? isDark ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-amber-100 text-amber-800 border border-amber-300'
                                      : isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  }`}>
                                    {lang === 'id' ? plan.badgeId : plan.badgeEn}
                                  </span>
                                )}
                                {hasDiscount && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase shrink-0">
                                    {lang === 'id' ? `Diskon ${appliedDiscountPromo.discountType === 'percent' ? `${appliedDiscountPromo.discountValue}%` : 'Promo'}` : 'Promo Discount'}
                                  </span>
                                )}
                              </div>
                              <p className={`text-[11px] leading-snug line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                                {lang === 'id' ? plan.descId : plan.descEn}
                              </p>
                            </div>
                          </div>

                          <div className="text-right shrink-0 min-w-[70px] sm:min-w-[80px]">
                            {hasDiscount ? (
                              <>
                                <div className="text-[10px] text-slate-400 line-through">
                                  Rp {appliedDiscountPromo.originalAmount.toLocaleString('id-ID')}
                                </div>
                                <div className="font-black text-xs sm:text-sm leading-tight text-emerald-500">
                                  Rp {appliedDiscountPromo.finalAmount.toLocaleString('id-ID')}
                                </div>
                              </>
                            ) : (
                              <div className={`font-black text-xs sm:text-sm leading-tight ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                                Rp {plan.price.toLocaleString('id-ID')}
                              </div>
                            )}
                            <div className={`text-[10px] leading-tight mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                              {lang === 'id' ? plan.periodId : plan.periodEn}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* PROMO CODE / VOUCHER SECTION */}
                  <div className={`p-3.5 sm:p-4 rounded-2xl border space-y-2.5 transition-colors ${
                    appliedDiscountPromo
                      ? isDark ? 'bg-emerald-950/20 border-emerald-500/40' : 'bg-emerald-50/80 border-emerald-300'
                      : isDark 
                        ? 'bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/30' 
                        : 'bg-indigo-50/70 border-indigo-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tag className="w-4 h-4 text-amber-500 shrink-0" />
                        <span className={`font-bold text-xs ${isDark ? 'text-indigo-200' : 'text-indigo-950'}`}>
                          {lang === 'id' ? 'Punya Kode Promo atau Diskon?' : 'Have a Promo or Discount Code?'}
                        </span>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        appliedDiscountPromo
                          ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                          : isDark ? 'text-amber-300 bg-amber-500/10 border-amber-500/20' : 'text-amber-800 bg-amber-100 border-amber-300'
                      }`}>
                        {appliedDiscountPromo 
                          ? (lang === 'id' ? 'Diskon Terpasang' : 'Discount Applied') 
                          : (lang === 'id' ? 'Potongan / Gratis' : 'Discount / Free')}
                      </span>
                    </div>

                    {appliedDiscountPromo ? (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Kode: <span className="font-mono uppercase">{appliedDiscountPromo.code}</span></span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAppliedDiscountPromo(null);
                              setPromoFeedback(null);
                              setPromoCodeInput('');
                            }}
                            className="text-[11px] text-rose-400 hover:text-rose-300 underline font-medium cursor-pointer"
                          >
                            {lang === 'id' ? 'Hapus Promo' : 'Remove Promo'}
                          </button>
                        </div>
                        <div className="text-[11px] space-y-1 text-slate-300">
                          <div className="flex justify-between">
                            <span className="text-slate-400">{lang === 'id' ? 'Harga Normal:' : 'Base Price:'}</span>
                            <span className="line-through">Rp {appliedDiscountPromo.originalAmount.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between text-emerald-400 font-medium">
                            <span>{lang === 'id' ? 'Potongan Diskon (Server):' : 'Server Discount:'}</span>
                            <span>-Rp {appliedDiscountPromo.discountAmount.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between font-bold text-xs pt-1 border-t border-emerald-500/20 text-slate-100">
                            <span>{lang === 'id' ? 'Harga Akhir Resmi:' : 'Official Final Price:'}</span>
                            <span className="text-emerald-400">Rp {appliedDiscountPromo.finalAmount.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {lang === 'id' 
                            ? 'Masukkan kode promo untuk mendapatkan potongan harga (diskon nominal/persen) atau voucher langganan gratis.'
                            : 'Enter a promo code for price discount (fixed/percent) or free subscription voucher.'}
                        </p>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={promoCodeInput}
                            onChange={(e) => {
                              setPromoCodeInput(e.target.value.toUpperCase());
                              if (promoFeedback) setPromoFeedback(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleApplyPromoCode();
                            }}
                            placeholder={lang === 'id' ? 'Contoh: DISKON20...' : 'e.g. DISKON20...'}
                            className={`flex-1 px-3 py-2 rounded-xl border text-xs font-mono uppercase tracking-wider focus:outline-none focus:border-indigo-400 ${
                              isDark 
                                ? 'bg-slate-950 border-slate-700 text-slate-100 placeholder:text-slate-500' 
                                : 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                            }`}
                          />
                          <button
                            type="button"
                            onClick={() => handleApplyPromoCode()}
                            disabled={isRedeemingPromo || !promoCodeInput.trim()}
                            className="py-2 px-3.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
                          >
                            {isRedeemingPromo ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Tag className="w-3.5 h-3.5 text-amber-300" />
                            )}
                            <span>{isRedeemingPromo ? (lang === 'id' ? 'Memeriksa...' : 'Checking...') : (lang === 'id' ? 'Terapkan' : 'Apply')}</span>
                          </button>
                        </div>
                      </>
                    )}

                    {promoFeedback && (
                      <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                        promoFeedback.type === 'success'
                          ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400'
                          : 'bg-rose-500/15 border border-rose-500/30 text-rose-400'
                      }`}>
                        {promoFeedback.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                        )}
                        <span className="text-[11px] leading-tight font-medium">{promoFeedback.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Gateway unconfigured error banner if triggered */}
                  {paymentErrorMessage && (
                    <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs flex items-start gap-2.5">
                      <Info className="w-4 h-4 shrink-0 text-amber-500 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-bold block">
                          {lang === 'id' ? 'Pemberitahuan Transaksi' : 'Transaction Notice'}
                        </span>
                        <p className="text-[11px] leading-relaxed">
                          {paymentErrorMessage}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Security Guarantee Note */}
                  <div className={`p-2.5 rounded-2xl border flex items-center gap-2.5 text-xs ${
                    isDark ? 'bg-slate-800/40 border-slate-800/80 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                    <span className="text-[11px]">
                      {lang === 'id'
                        ? 'Seluruh catatan, agenda, dan data keuangan Anda tetap 100% tersimpan aman di perangkat lokal.'
                        : 'All your notes, agenda, and finance data remain 100% stored securely on your local device.'}
                    </span>
                  </div>
                </>
              ) : (
                /* Step 2: Pending Payment & Verification */
                <div className="space-y-4">
                  <div className={`p-4 rounded-2xl border space-y-3 ${
                    isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between text-xs">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{lang === 'id' ? 'Paket Dipilih' : 'Selected Plan'}</span>
                      <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>{activePaymentOrder?.planName}</span>
                    </div>
                    {activePaymentOrder?.originalAmount && activePaymentOrder.originalAmount > activePaymentOrder.amount && (
                      <div className="flex items-center justify-between text-xs">
                        <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{lang === 'id' ? 'Harga Normal' : 'Original Price'}</span>
                        <span className="line-through text-slate-400 font-medium">
                          Rp {activePaymentOrder.originalAmount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                    {activePaymentOrder?.promoCode && (
                      <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
                        <span>{lang === 'id' ? `Diskon Promo (${activePaymentOrder.promoCode})` : `Promo Discount (${activePaymentOrder.promoCode})`}</span>
                        <span>
                          -Rp {((activePaymentOrder.originalAmount || activePaymentOrder.amount) - activePaymentOrder.amount).toLocaleString('id-ID')}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{lang === 'id' ? 'Total Tagihan' : 'Total Amount'}</span>
                      <span className="font-extrabold text-base text-amber-500">
                        Rp {activePaymentOrder?.amount?.toLocaleString('id-ID')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>{lang === 'id' ? 'Metode' : 'Method'}</span>
                      <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Midtrans QRIS / VA / E-Wallet</span>
                    </div>
                    <div className={`pt-2 border-t flex items-center justify-between gap-2 ${
                      isDark ? 'border-slate-700/50' : 'border-slate-200'
                    }`}>
                      <div className="space-y-0.5 min-w-0">
                        <span className={`text-[10px] uppercase font-mono tracking-wider block ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>ORDER ID BUKTI PEMBAYARAN</span>
                        <div className="font-mono text-xs font-bold text-indigo-500 select-all break-all">
                          {activePaymentOrder?.orderId}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if (activePaymentOrder?.orderId) {
                            navigator.clipboard.writeText(activePaymentOrder.orderId);
                            showToast(lang === 'id' ? 'Order ID disalin ke clipboard' : 'Order ID copied');
                          }
                        }}
                        className={`p-2 rounded-xl shrink-0 cursor-pointer ${
                          isDark ? 'bg-slate-700 hover:bg-slate-600 text-slate-200' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
                        }`}
                        title="Salin Order ID"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 leading-relaxed space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      <span>{lang === 'id' ? 'Instruksi Verifikasi Resmi:' : 'Official Verification Instruction:'}</span>
                    </div>
                    <p className={`text-[11px] ${isDark ? 'text-amber-200/90' : 'text-amber-900'}`}>
                      {lang === 'id'
                        ? '1. Lakukan pembayaran via Midtrans popup / QRIS. \n2. Setelah pembayaran selesai, klik tombol "Verifikasi Pembayaran" di bawah untuk validasi langsung ke server resmi.'
                        : '1. Complete payment via Midtrans popup / QRIS. \n2. Click "Verify Payment" below to validate directly with the official server.'}
                    </p>
                  </div>

                  {/* Button to reopen Midtrans Snap popup if closed */}
                  {activePaymentOrder?.snapToken && (
                    <button
                      onClick={() => {
                        if ((window as any).snap && activePaymentOrder.snapToken) {
                          (window as any).snap.pay(activePaymentOrder.snapToken, {
                            onSuccess: async () => {
                              await handleVerifyPayment(activePaymentOrder.orderId);
                            },
                            onPending: () => {
                              showToast(lang === 'id' ? 'Pembayaran pending, klik Verifikasi setelah membayar.' : 'Payment pending, verify after paying.');
                            },
                            onError: () => {
                              showToast(lang === 'id' ? 'Pembayaran gagal di Midtrans.' : 'Payment failed.');
                            }
                          });
                        } else if (activePaymentOrder.redirectUrl) {
                          window.open(activePaymentOrder.redirectUrl, '_blank');
                        }
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{lang === 'id' ? 'Buka Ulang Jendela Pembayaran (Midtrans QRIS)' : 'Re-open Midtrans Payment Window'}</span>
                    </button>
                  )}

                  {/* Manual Order ID confirmation field */}
                  <div className="space-y-1 text-left">
                    <label className={`text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {lang === 'id' ? 'Order ID yang akan diverifikasi:' : 'Order ID to verify:'}
                    </label>
                    <input
                      type="text"
                      value={manualOrderIdInput}
                      onChange={(e) => setManualOrderIdInput(e.target.value)}
                      placeholder="Contoh: TATA-YEARLY-XXXXX"
                      className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none focus:border-indigo-500 ${
                        isDark ? 'bg-slate-950 border border-slate-700 text-slate-100' : 'bg-white border border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Sticky Footer: Never cut off */}
            <div className={`shrink-0 px-4 sm:px-6 py-3.5 sm:py-4 border-t flex items-center gap-2.5 transition-colors ${
              isDark ? 'border-slate-800/80 bg-slate-900/95' : 'border-slate-200 bg-slate-50/95'
            }`}>
              {paymentStep === 'select_plan' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowUpgradeModal(false);
                      setPaymentStep('select_plan');
                      setPaymentErrorMessage(null);
                      setPromoFeedback(null);
                    }}
                    className={`py-2.5 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer shrink-0 ${
                      isDark 
                        ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700/80' 
                        : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                    }`}
                  >
                    {lang === 'id' ? 'Tutup' : 'Close'}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!paymentsEnabled) {
                        playTapSound();
                        const msg = lang === 'id' 
                          ? 'Fitur upgrade akan segera hadir. Saat ini pembayaran belum diaktifkan.' 
                          : 'Upgrade feature will be available soon. Payments are currently disabled.';
                        showToast(lang === 'id' ? 'Fitur upgrade akan segera hadir' : 'Upgrade feature coming soon');
                        setPaymentErrorMessage(msg);
                        return;
                      }
                      handleStartPayment();
                    }}
                    disabled={isLoading}
                    className="flex-1 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-zinc-950 shadow-md shadow-amber-500/10 transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      {!paymentsEnabled
                        ? (lang === 'id' ? 'Fitur Upgrade Akan Segera Hadir' : 'Upgrade Feature Coming Soon')
                        : (isLoading 
                          ? (lang === 'id' ? 'Menyiapkan...' : 'Preparing...') 
                          : appliedDiscountPromo
                            ? (lang === 'id' ? `Bayar Rp ${appliedDiscountPromo.finalAmount.toLocaleString('id-ID')} (Midtrans)` : `Pay Rp ${appliedDiscountPromo.finalAmount.toLocaleString('id-ID')} (Midtrans)`)
                            : (lang === 'id' ? 'Lanjut Pembayaran (Midtrans)' : 'Proceed to Payment (Midtrans)'))}
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setPaymentStep('select_plan')}
                    disabled={isVerifyingPayment}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs border transition-all cursor-pointer disabled:opacity-50 ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300'
                    }`}
                  >
                    {lang === 'id' ? 'Ganti Paket' : 'Change Plan'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerifyPayment()}
                    disabled={isVerifyingPayment}
                    className="flex-2 py-2.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>
                      {isVerifyingPayment 
                        ? (lang === 'id' ? 'Memverifikasi...' : 'Verifying...') 
                        : (lang === 'id' ? 'Verifikasi Pembayaran' : 'Verify Payment')}
                    </span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESTORE PREMIUM MODAL */}
      {/* ========================================================================= */}
      {showRestoreModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => {
            if (!isRestoring) setShowRestoreModal(false);
          }}
        >
          <div 
            className={`w-full max-w-md rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl border animate-in zoom-in-95 duration-150 transition-colors ${
              isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-500">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <h3 className={`font-extrabold text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                  {lang === 'id' ? 'Pulihkan Tata Premium' : 'Restore Tata Premium'}
                </h3>
              </div>
              <button
                onClick={() => setShowRestoreModal(false)}
                disabled={isRestoring}
                className={`p-1 rounded-xl disabled:opacity-50 ${
                  isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                ✕
              </button>
            </div>

            <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {lang === 'id'
                ? 'Masukkan Order ID Midtrans dari bukti pembayaran Anda (tersedia di email konfirmasi transaksi Midtrans). Server akan memverifikasi keabsahan lisensi secara langsung.'
                : 'Enter your Midtrans Order ID from your receipt. The server will verify validity directly with Midtrans.'}
            </p>

            {restoreError && (
              <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-500 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
                <span>{restoreError}</span>
              </div>
            )}

            <form onSubmit={handleConfirmRestoreWithOrderId} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {lang === 'id' ? 'Order ID Bukti Pembelian' : 'Purchase Order ID'}
                </label>
                <input
                  type="text"
                  value={restoreOrderIdInput}
                  onChange={(e) => setRestoreOrderIdInput(e.target.value)}
                  placeholder="Contoh: TATA-YEARLY-1726000000000"
                  className={`w-full px-3.5 py-2.5 rounded-xl font-mono text-xs focus:outline-none focus:border-indigo-500 ${
                    isDark ? 'bg-slate-950 border border-slate-700 text-slate-100' : 'bg-white border border-slate-300 text-slate-900'
                  }`}
                  autoFocus
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowRestoreModal(false)}
                  disabled={isRestoring}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs border transition-all cursor-pointer disabled:opacity-50 ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-300'
                  }`}
                >
                  {lang === 'id' ? 'Batal' : 'Cancel'}
                </button>

                <button
                  type="submit"
                  disabled={isRestoring}
                  className="flex-2 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRestoring ? 'animate-spin' : ''}`} />
                  <span>{isRestoring ? (lang === 'id' ? 'Memverifikasi...' : 'Verifying...') : (lang === 'id' ? 'Verifikasi & Pulihkan' : 'Verify & Restore')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LOGOUT CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showLogoutConfirmModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setShowLogoutConfirmModal(false)}
        >
          <div 
            className={`w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl border animate-in zoom-in-95 duration-150 text-center transition-colors ${
              isDark ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-white text-slate-900 border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
              <LogOut className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h3 className={`font-extrabold text-lg ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {lang === 'id' ? 'Keluar dari Akun Tata?' : 'Sign Out of Tata Account?'}
              </h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {lang === 'id'
                  ? 'Akun Google kamu akan dilepas dari sesi ini. Semua catatan, tugas, kalender, dan keuangan kamu tetap 100% aman dan tersimpan di perangkat ini (Offline First).'
                  : 'Your Google account will be signed out. All notes, tasks, calendar, and finances remain 100% safe and stored on this device (Offline First).'}
              </p>
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  playTapSound();
                  setShowLogoutConfirmModal(false);
                }}
                className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  isDark ? 'bg-slate-800 hover:bg-slate-750 text-slate-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                }`}
              >
                {lang === 'id' ? 'Batal' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                disabled={isLoading}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-all active:scale-95 shadow-lg shadow-red-600/30 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{isLoading ? (lang === 'id' ? 'Keluar...' : 'Signing out...') : (lang === 'id' ? 'Ya, Keluar' : 'Yes, Sign Out')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

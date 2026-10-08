import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Share2, X, Copy, Check, QrCode, Download, Send, MessageCircle, 
  CheckCircle2, Globe
} from 'lucide-react';
import QRCode from 'qrcode';
import { useAppStore } from '../store';
import { Icon3DShare } from './home/Organic3DIcons';

interface InviteFriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: string;
  appTheme?: string;
}

export default function InviteFriendsModal({
  isOpen,
  onClose,
  lang = 'id',
  appTheme,
}: InviteFriendsModalProps) {
  const { appVersion } = useAppStore();
  const isOrganic = (appTheme || (typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : '')) === 'organic';

  // Canonical App URL
  const appUrl = 'https://tatanoto.vercel.app/';

  // Simple, concise invitation message (no hype, clean & practical)
  const shareMessage = lang === 'id'
    ? `Tata - Aplikasi Produktivitas & Keuangan Offline:\n${appUrl}`
    : `Tata - Offline Productivity & Finance App:\n${appUrl}`;

  const [copied, setCopied] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Generate QR Code on demand
  useEffect(() => {
    if (showQrCode && appUrl && !qrDataUrl) {
      QRCode.toDataURL(appUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: isOrganic ? '#2C1C10' : '#0f172a',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M'
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Error generating QR code:', err));
    }
  }, [showQrCode, appUrl, qrDataUrl, isOrganic]);

  if (!isOpen) return null;

  // 1-Click Copy (Link + Short Message)
  const handleCopyLink = () => {
    const textToCopy = shareMessage;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(() => {
        setCopied(true);
        showToast(lang === 'id' ? 'Link berhasil disalin!' : 'Link copied!');
        setTimeout(() => setCopied(false), 2200);
      }).catch(() => fallbackCopy(textToCopy));
    } else {
      fallbackCopy(textToCopy);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      showToast(lang === 'id' ? 'Link berhasil disalin!' : 'Link copied!');
      setTimeout(() => setCopied(false), 2200);
    } catch (e) {}
    document.body.removeChild(textArea);
  };

  const handleShareWhatsApp = () => {
    const encoded = encodeURIComponent(shareMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  const handleShareTelegram = () => {
    const encodedUrl = encodeURIComponent(appUrl);
    const encodedText = encodeURIComponent(lang === 'id' ? 'Tata - Aplikasi Produktivitas Offline' : 'Tata - Offline Productivity App');
    window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
  };

  const handleShareTwitter = () => {
    const encodedText = encodeURIComponent(shareMessage);
    window.open(`https://twitter.com/intent/tweet?text=${encodedText}`, '_blank');
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Tata App',
          text: shareMessage,
          url: appUrl,
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = 'tata-app-qr.png';
    link.click();
    showToast(lang === 'id' ? 'QR Code diunduh!' : 'QR Code downloaded!');
  };

  return (
    <AnimatePresence>
      <div 
        id="invite-friends-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div 
          id="invite-friends-modal-container"
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.16 }}
          className={`relative w-full max-w-sm rounded-3xl p-5 shadow-2xl my-auto overflow-hidden border ${
            isOrganic 
              ? 'bg-[#FDFBF7] border-[#D8C7B5] text-[#2C1C10]' 
              : 'bg-slate-900 border-slate-800 text-slate-100'
          }`}
        >
          {/* Close button */}
          <button 
            id="btn-close-invite-modal"
            onClick={onClose}
            className={`absolute top-4 right-4 p-1.5 rounded-full transition-colors z-10 cursor-pointer active:scale-95 ${
              isOrganic 
                ? 'text-[#7A6754] hover:text-[#2C1C10] bg-[#F2ECE1] hover:bg-[#EAE2D5]' 
                : 'text-slate-400 hover:text-slate-100 bg-slate-800/80 hover:bg-slate-800'
            }`}
            title={lang === 'id' ? 'Tutup' : 'Close'}
          >
            <X size={16} />
          </button>

          {/* Header */}
          <div className="flex items-center gap-3 mb-4 pr-6">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
              isOrganic 
                ? 'bg-[#EEDBC5] border-[#DFC3A6] text-[#8C4A1E]' 
                : 'bg-indigo-500/15 border-indigo-500/25 text-indigo-400'
            }`}>
              {isOrganic ? <Icon3DShare size={24} /> : <Share2 size={20} />}
            </div>
            <div>
              <h3 className={`text-base font-bold leading-tight ${isOrganic ? 'text-[#2C1C10]' : 'text-slate-100'}`}>
                {lang === 'id' ? 'Bagikan Aplikasi' : 'Share App'}
              </h3>
              <p className={`text-xs ${isOrganic ? 'text-[#7A6754]' : 'text-slate-400'}`}>
                {lang === 'id' ? 'Salin link atau bagikan langsung' : 'Copy link or share directly'}
              </p>
            </div>
          </div>

          {/* Toast Notification */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={`mb-3 p-2.5 text-xs font-semibold rounded-xl flex items-center gap-2 border ${
                  isOrganic 
                    ? 'bg-[#E2EFE0] border-[#B7D8B2] text-[#245927]' 
                    : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                }`}
              >
                <CheckCircle2 size={15} className={isOrganic ? 'text-[#245927] shrink-0' : 'text-emerald-400 shrink-0'} />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Link Box & Copy Button */}
          <div className={`rounded-2xl p-3 mb-4 space-y-2 border ${
            isOrganic 
              ? 'bg-[#F2ECE1] border-[#D5C4B1]' 
              : 'bg-slate-950 border-slate-800'
          }`}>
            <div className="flex items-center gap-2">
              <Globe size={14} className={isOrganic ? 'text-[#8C4A1E] shrink-0' : 'text-indigo-400 shrink-0'} />
              <span className={`text-xs font-mono truncate select-all ${
                isOrganic ? 'text-[#2C1C10]' : 'text-slate-300'
              }`}>{appUrl}</span>
            </div>

            <button
              id="btn-copy-link-main"
              onClick={handleCopyLink}
              className={`w-full py-2.5 px-3 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98 shadow-sm ${
                copied
                  ? isOrganic ? 'bg-[#4A6741] text-white' : 'bg-emerald-500 text-zinc-950 font-black'
                  : isOrganic ? 'bg-[#8C4A1E] hover:bg-[#733C17] text-white shadow-[#8C4A1E]/20' : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
              }`}
            >
              {copied ? <Check size={14} className="stroke-[3]" /> : <Copy size={14} />}
              <span>{copied ? (lang === 'id' ? 'Link Berhasil Disalin!' : 'Link Copied!') : (lang === 'id' ? 'Salin Link' : 'Copy Link')}</span>
            </button>
          </div>

          {/* Direct Share Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              id="btn-share-whatsapp"
              onClick={handleShareWhatsApp}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
                isOrganic 
                  ? 'bg-[#E2EFE0] hover:bg-[#D4E7D2] text-[#245927] border-[#B7D8B2]' 
                  : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/20'
              }`}
            >
              <MessageCircle size={18} />
              <span className="text-[11px]">WhatsApp</span>
            </button>

            <button
              id="btn-share-telegram"
              onClick={handleShareTelegram}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
                isOrganic 
                  ? 'bg-[#E6F0FA] hover:bg-[#D8E7F5] text-[#2563EB] border-[#BFDBFE]' 
                  : 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/20'
              }`}
            >
              <Send size={18} />
              <span className="text-[11px]">Telegram</span>
            </button>

            <button
              id="btn-share-twitter"
              onClick={handleShareTwitter}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
                isOrganic 
                  ? 'bg-[#F2ECE1] hover:bg-[#EAE2D5] text-[#2C1C10] border-[#D5C4B1]' 
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
            >
              <span className="font-mono font-bold text-sm leading-none">𝕏</span>
              <span className="text-[11px]">Twitter</span>
            </button>

            <button
              id="btn-main-share-native"
              onClick={handleNativeShare}
              className={`py-2.5 px-1 rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 border ${
                isOrganic 
                  ? 'bg-[#FAF5E6] hover:bg-[#F2ECE1] text-[#8C6B1E] border-[#DFCFB2]' 
                  : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/20'
              }`}
            >
              <Share2 size={18} />
              <span className="text-[11px]">{lang === 'id' ? 'Lainnya' : 'More'}</span>
            </button>
          </div>

          {/* Minimal QR Code Toggle */}
          <div className={`pt-2 flex items-center justify-between border-t ${
            isOrganic ? 'border-[#DDD0C0]' : 'border-slate-800/60'
          }`}>
            <button
              type="button"
              onClick={() => setShowQrCode(!showQrCode)}
              className={`text-xs flex items-center gap-1.5 cursor-pointer py-1 transition-colors ${
                isOrganic ? 'text-[#7A6754] hover:text-[#2C1C10]' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <QrCode size={14} className={isOrganic ? 'text-[#8C4A1E]' : 'text-indigo-400'} />
              <span>{showQrCode ? (lang === 'id' ? 'Tutup QR' : 'Hide QR') : (lang === 'id' ? 'QR Code' : 'QR Code')}</span>
            </button>

            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
              isOrganic 
                ? 'bg-[#E2EFE0] text-[#245927] border-[#B7D8B2]' 
                : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
            }`}>
              100% Offline
            </span>
          </div>

          {/* QR Code Section (Collapsible) */}
          <AnimatePresence>
            {showQrCode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className={`mt-3 pt-3 flex flex-col items-center justify-center space-y-2 overflow-hidden border-t ${
                  isOrganic ? 'border-[#DDD0C0]' : 'border-slate-800'
                }`}
              >
                <div className="p-2 bg-white rounded-xl shadow border border-slate-200">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Tata QR" className="w-32 h-32 object-contain rounded" />
                  ) : (
                    <div className="w-32 h-32 bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
                      Loading...
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors border ${
                    isOrganic 
                      ? 'bg-[#F2ECE1] hover:bg-[#EAE2D5] text-[#5C4A38] border-[#D5C4B1]' 
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                >
                  <Download size={12} />
                  <span>{lang === 'id' ? 'Simpan QR' : 'Save QR'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}


import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { Sparkles, Megaphone } from 'lucide-react';

interface AdBannerProps {
  className?: string;
  slotId?: string;
  adFormat?: 'auto' | 'fluid' | 'rectangle' | 'horizontal';
  responsive?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export const AdBanner: React.FC<AdBannerProps> = ({
  className = '',
  slotId: customSlotId,
  adFormat = 'auto',
  responsive = true,
}) => {
  const { tataAccount, lang } = useAppStore();
  const adRef = useRef<HTMLModElement | null>(null);
  const isInitialized = useRef<boolean>(false);

  // Strictly respect subscription: Premium/Pro users NEVER see ads
  const isPremium = Boolean(
    tataAccount?.isPremium &&
      (!tataAccount.premiumExpiresAt || new Date(tataAccount.premiumExpiresAt).getTime() > Date.now())
  );

  const clientId = (import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined)?.trim();
  const slotId = (customSlotId || (import.meta.env.VITE_ADSENSE_SLOT_ID as string | undefined))?.trim();

  // Load Google AdSense library script when client ID is provided
  useEffect(() => {
    if (isPremium || !clientId) return;

    const existingScript = document.querySelector(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
    );

    if (!existingScript) {
      const script = document.createElement('script');
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
      script.async = true;
      script.crossOrigin = 'anonymous';
      document.head.appendChild(script);
    }
  }, [isPremium, clientId]);

  // Push ad slot to Google AdSense queue once mounted
  useEffect(() => {
    if (isPremium || !clientId || !slotId) return;

    if (adRef.current && !isInitialized.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        isInitialized.current = true;
      } catch (err) {
        console.warn('[Tata AdSense] Notice initializing ad unit:', err);
      }
    }
  }, [isPremium, clientId, slotId]);

  // Total suppression for active Premium subscribers
  if (isPremium) {
    return null;
  }

  // If AdSense credentials have not been configured yet, display a subtle compliant placeholder
  if (!clientId || !slotId) {
    return (
      <div
        className={`w-full rounded-2xl border border-dashed border-slate-700/80 bg-slate-900/40 p-4 sm:p-5 text-center transition-all ${className}`}
        aria-label="AdSense Placement"
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase bg-slate-800 text-slate-400 border border-slate-700/60">
            <Megaphone className="w-3 h-3 text-indigo-400" />
            {lang === 'id' ? 'Slot Iklan Google AdSense' : 'Google AdSense Ad Slot'}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
            <Sparkles className="w-2.5 h-2.5" />
            {lang === 'id' ? 'Bebas Iklan di Tata Premium' : 'Ad-free on Tata Premium'}
          </span>
        </div>

        <div className="py-3 px-2 flex flex-col items-center justify-center">
          <p className="text-xs text-slate-300 font-medium max-w-md">
            {lang === 'id'
              ? 'Ruang iklan Google AdSense khusus tier Free/Lite. Iklan akan aktif secara otomatis begitu VITE_ADSENSE_CLIENT_ID dan VITE_ADSENSE_SLOT_ID dikonfigurasi.'
              : 'Google AdSense ad placement for Free/Lite tier. Ads will activate automatically once VITE_ADSENSE_CLIENT_ID and VITE_ADSENSE_SLOT_ID are configured.'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {lang === 'id'
              ? 'Pengguna dengan akun Premium tidak akan melihat slot ini sama sekali.'
              : 'Users with an active Premium subscription will never see this ad space.'}
          </p>
        </div>
      </div>
    );
  }

  // Render actual Google AdSense Unit
  return (
    <div
      className={`w-full rounded-2xl border border-slate-800 bg-slate-900/50 p-2 sm:p-3 overflow-hidden shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between px-2 pb-1.5 mb-1 text-[10px] uppercase font-bold tracking-wider text-slate-500 border-b border-slate-800/80">
        <span>{lang === 'id' ? 'Iklan Bersponsor' : 'Advertisement'}</span>
        <span className="text-[9px] text-indigo-400 lowercase hover:underline">
          {lang === 'id' ? 'Tata Premium Bebas Iklan' : 'Go Ad-Free with Premium'}
        </span>
      </div>

      <div className="w-full flex justify-center items-center min-h-[90px] overflow-hidden">
        <ins
          ref={adRef}
          className="adsbygoogle w-full block text-center"
          style={{ display: 'block' }}
          data-ad-client={clientId}
          data-ad-slot={slotId}
          data-ad-format={adFormat}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      </div>
    </div>
  );
};

export default AdBanner;

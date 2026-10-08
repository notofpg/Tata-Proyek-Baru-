import React from 'react';

export interface Icon3DProps {
  size?: number;
  className?: string;
  active?: boolean;
}

/**
 * High-definition 3D Tactile Vector Icons
 * Inspired by AlloBank's clean glossy/claymorphic badge design system,
 * tailored to Tata's warm organic aesthetic (Terracotta, Cream, Sage Green, Warm Amber).
 */

// 1. TATA AI COMPANION (Playful 3D AI mascot / core with sprout)
export const Icon3DTataAI = React.memo(function Icon3DTataAI({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <radialGradient id="aiHeadGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFF9F2" />
          <stop offset="60%" stopColor="#F0DFCE" />
          <stop offset="100%" stopColor="#D9C0A7" />
        </radialGradient>
        <linearGradient id="aiFaceScreen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2E1C12" />
          <stop offset="100%" stopColor="#1B1009" />
        </linearGradient>
        <linearGradient id="aiCheekGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E06D34" />
          <stop offset="100%" stopColor="#C35E40" />
        </linearGradient>
        <linearGradient id="aiLeafGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#689F6E" />
          <stop offset="100%" stopColor="#3E6B43" />
        </linearGradient>
        <linearGradient id="aiEarGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E8824A" />
          <stop offset="100%" stopColor="#B34B1E" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="42" rx="14" ry="3.5" fill="#3D200E" fillOpacity="0.18" />
      <circle cx="8" cy="25" r="4.5" fill="url(#aiEarGrad)" />
      <circle cx="40" cy="25" r="4.5" fill="url(#aiEarGrad)" />
      <circle cx="8" cy="25" r="2.5" fill="#FFF4EB" opacity="0.6" />
      <circle cx="40" cy="25" r="2.5" fill="#FFF4EB" opacity="0.6" />
      <rect x="9" y="11" width="30" height="28" rx="14" fill="url(#aiHeadGrad)" />
      <ellipse cx="24" cy="15" rx="9" ry="2.5" fill="#FFFFFF" fillOpacity="0.8" />
      <rect x="13" y="17" width="22" height="15" rx="7.5" fill="url(#aiFaceScreen)" />
      <path d="M16 19 C20 18, 28 18, 32 19" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeOpacity="0.4" />
      <ellipse cx="19" cy="24" rx="2.2" ry="2.8" fill="#4ADE80" />
      <ellipse cx="29" cy="24" rx="2.2" ry="2.8" fill="#4ADE80" />
      <circle cx="18.5" cy="23" r="0.9" fill="#FFFFFF" />
      <circle cx="28.5" cy="23" r="0.9" fill="#FFFFFF" />
      <path d="M22 27.5 Q24 29.5 26 27.5" stroke="#4ADE80" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      <circle cx="16" cy="27" r="1.5" fill="url(#aiCheekGrad)" opacity="0.8" />
      <circle cx="32" cy="27" r="1.5" fill="url(#aiCheekGrad)" opacity="0.8" />
      <path d="M24 11 Q24 6 27 5" stroke="#3E6B43" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <path d="M27 5 C29 3, 33 4, 32 7 C31 9, 28 8, 27 5 Z" fill="url(#aiLeafGrad)" />
    </svg>
  );
});

// 2. KEUANGAN / WALLET (Glossy 3D leather pouch with gold coins - AlloBank style)
export const Icon3DWallet = React.memo(function Icon3DWallet({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="wallCoinGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="wallBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2783F" />
          <stop offset="60%" stopColor="#C35E40" />
          <stop offset="100%" stopColor="#9C3F22" />
        </linearGradient>
        <linearGradient id="wallFlapGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5A574" />
          <stop offset="100%" stopColor="#C35E40" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="42" rx="15" ry="3.5" fill="#3D200E" fillOpacity="0.18" />
      <circle cx="28" cy="15" r="8" fill="url(#wallCoinGrad)" />
      <circle cx="28" cy="15" r="6.2" stroke="#FFF7CC" strokeWidth="1.2" fill="none" opacity="0.8" />
      <text x="28" y="18" fontSize="8" fontWeight="bold" fill="#78350F" textAnchor="middle" fontFamily="sans-serif">Rp</text>
      <circle cx="24.5" cy="11.5" r="1.5" fill="#FFFFFF" />
      <rect x="7" y="17" width="34" height="23" rx="7" fill="url(#wallBodyGrad)" />
      <rect x="11" y="20" width="26" height="4" rx="2" fill="#7C2D12" opacity="0.35" />
      <path d="M7 23 C7 23, 20 30, 24 30 C28 30, 41 23, 41 23 L41 33 C41 37, 37 40, 33 40 L15 40 C11 40, 7 37, 7 33 Z" fill="url(#wallFlapGrad)" />
      <circle cx="24" cy="30" r="3.5" fill="url(#wallCoinGrad)" />
      <circle cx="24" cy="30" r="1.8" fill="#FFFDF0" />
      <path d="M10 38 L38 38" stroke="#FDE8D7" strokeWidth="1" strokeDasharray="2 2" strokeOpacity="0.6" />
    </svg>
  );
});

// 3. NOTIFIKASI / CHIME BELL (Glossy 3D Gold Chime Bell)
export const Icon3DBell = React.memo(function Icon3DBell({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="bellGoldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFECA8" />
          <stop offset="40%" stopColor="#FBBF24" />
          <stop offset="85%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="bellClapperGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E06D34" />
          <stop offset="100%" stopColor="#9C3F22" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="43" rx="13" ry="3" fill="#3D200E" fillOpacity="0.18" />
      <circle cx="24" cy="10" r="4.5" stroke="url(#bellGoldGrad)" strokeWidth="3" fill="none" />
      <circle cx="24" cy="39" r="4" fill="url(#bellClapperGrad)" />
      <circle cx="24" cy="38" r="1.5" fill="#FFE5D6" opacity="0.8" />
      <path 
        d="M24 12 C16 12, 12 18, 12 26 C12 30, 9 33, 9 35 C9 36.5, 10.5 37, 13 37 L35 37 C37.5 37, 39 36.5, 39 35 C39 33, 36 30, 36 26 C36 18, 32 12, 24 12 Z" 
        fill="url(#bellGoldGrad)" 
      />
      <path d="M17 17 C15 21, 14 26, 13 32" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.75" />
      <rect x="10" y="34" width="28" height="3" rx="1.5" fill="#B45309" fillOpacity="0.4" />
      <circle cx="36" cy="12" r="3.5" fill="#EF4444" />
      <circle cx="35" cy="11" r="1" fill="#FFFFFF" />
    </svg>
  );
});

// 4. PENCARIAN / SEARCH (3D Magnifying Glass with Glass Gloss)
export const Icon3DSearch = React.memo(function Icon3DSearch({ size = 20, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="searchRimGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="searchHandleGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E2783F" />
          <stop offset="100%" stopColor="#8C3315" />
        </linearGradient>
        <radialGradient id="searchLensGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#E0F2FE" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.3" />
        </radialGradient>
      </defs>
      <rect x="28" y="28" width="8" height="18" rx="4" transform="rotate(-45 28 28)" fill="url(#searchHandleGrad)" />
      <circle cx="39" cy="39" r="3.5" fill="#FFE082" />
      <circle cx="19" cy="19" r="14" fill="url(#searchRimGrad)" />
      <circle cx="19" cy="19" r="10.5" fill="url(#searchLensGrad)" />
      <path d="M13 14 C15 11, 20 10, 23 11" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
});

// 5. STREAK FLAME (3D Sculpted Fire Flame - High Definition & Tactile)
export interface Icon3DFlameProps extends Icon3DProps {
  isDelayed?: boolean;
}

export const Icon3DFlame = React.memo(function Icon3DFlame({ size = 24, className = '', isDelayed = false }: Icon3DFlameProps) {
  if (isDelayed) {
    return (
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={`shrink-0 transition-all ${className}`}
      >
        <defs>
          <radialGradient id="flameDelayedAura" cx="50%" cy="70%" r="50%">
            <stop offset="0%" stopColor="#94A3B8" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#64748B" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="flameDelayedBody" x1="0.3" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#64748B" />
            <stop offset="45%" stopColor="#475569" />
            <stop offset="80%" stopColor="#334155" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
          <radialGradient id="flameDyingEmber" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#F87171" stopOpacity="0.85" />
            <stop offset="65%" stopColor="#EF4444" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Cold Ash Bed */}
        <ellipse cx="24" cy="38" rx="14" ry="4" fill="#1E293B" opacity="0.6" />
        <ellipse cx="24" cy="37" rx="10" ry="3" fill="#334155" opacity="0.8" />

        {/* Shrunk Sputtering Flame Body */}
        <path 
          d="M24 16 C25 20 28 23 29 27 C30 31 28 36 24 37 C20 36 18 31 19 27 C20 23 23 20 24 16 Z" 
          fill="url(#flameDelayedBody)" 
        />

        {/* Dying Ember Core */}
        <ellipse cx="24" cy="31" rx="4" ry="4.5" fill="url(#flameDyingEmber)" />

        {/* Rising Smoke Puff */}
        <path 
          d="M23 14 C22 11 25 9 24 6 C23.5 4.5 22 4 23 2" 
          stroke="#94A3B8" 
          strokeWidth="1.4" 
          strokeLinecap="round" 
          strokeDasharray="2 3"
          opacity="0.8"
        />
        <circle cx="25" cy="5" r="1" fill="#CBD5E1" opacity="0.6" />

        {/* Rain droplet quenching the spark */}
        <path 
          d="M29 18 C29 18 31 21 31 22.5 C31 23.6 30.1 24.5 29 24.5 C27.9 24.5 27 23.6 27 22.5 C27 21 29 18 29 18 Z" 
          fill="#60A5FA" 
          opacity="0.85"
        />
      </svg>
    );
  }

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform hover:scale-105 ${className}`}
    >
      <defs>
        {/* Soft Ambient Radiance Aura */}
        <radialGradient id="flameAmbientAura" cx="50%" cy="65%" r="50%">
          <stop offset="0%" stopColor="#F97316" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#EA580C" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
        </radialGradient>

        {/* Outer Flame Sculpted Shell - Rich Radiant Spectrum */}
        <linearGradient id="flameOuterGrad" x1="0.15" y1="0" x2="0.85" y2="1">
          <stop offset="0%" stopColor="#FF6B00" />
          <stop offset="28%" stopColor="#F97316" />
          <stop offset="65%" stopColor="#EA580C" />
          <stop offset="85%" stopColor="#DC2626" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>

        {/* Mid Lively Dancing Tongue */}
        <linearGradient id="flameMidGrad" x1="0.2" y1="0.05" x2="0.8" y2="0.95">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="35%" stopColor="#FBBF24" />
          <stop offset="70%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>

        {/* Brilliant Luminous Solar Heart */}
        <linearGradient id="flameCoreGrad" x1="0.5" y1="0.1" x2="0.5" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#FFFBEB" />
          <stop offset="75%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>

        {/* Tactile Edge Gloss Highlight */}
        <linearGradient id="flameGlossGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Ambient Heat Glow at Base */}
      <circle cx="24" cy="30" r="18" fill="url(#flameAmbientAura)" />

      {/* Main Outer Sculpted Flame (Graceful organic teardrop with crest tips) */}
      <path 
        d="M24 2.5 C25.8 7.5 28.5 11 32.5 13.8 C37.2 17.2 39.5 22 39 27.5 C38.2 36 31.8 43.5 24 43.5 C16.2 43.5 9.8 36 9 27.5 C8.5 20.2 13 14.8 16.5 10.8 C17.8 13.8 20.2 16.2 22 16.2 C23.2 16.2 23.6 11 24 2.5 Z" 
        fill="url(#flameOuterGrad)" 
      />

      {/* Left Glossy Clay Highlight Contour */}
      <path 
        d="M16.5 11.5 C13.8 15.5 10.8 20.5 11.2 27.5 C11.5 33 14 38 18 41 C14.8 37.5 13 32.8 13 27.5 C13 21 15.5 15.8 16.5 11.5 Z" 
        fill="url(#flameGlossGrad)" 
      />

      {/* Right Subtle Rim Glow */}
      <path 
        d="M32 14.5 C35.5 18 37 22.5 36.8 27 C36.5 32 34 37 30 40.5 C33.5 37 35 32.5 35 27 C35 22.5 33.8 18 32 14.5 Z" 
        fill="#FFFFFF" 
        fillOpacity="0.18"
      />

      {/* Dancing Middle Flame Tongue */}
      <path 
        d="M24 14 C25.8 18.5 28.8 20.5 31.5 22.8 C33.8 24.8 34.2 28.2 33.5 31.5 C32.5 37 28.5 40.5 24 40.5 C19.5 40.5 15.5 37 14.5 30.5 C14.5 24.2 19 20 21.5 17.5 C22.4 19.2 23.2 19.8 23.8 19.8 C24.5 19.8 24 17.5 24 14 Z" 
        fill="url(#flameMidGrad)" 
      />

      {/* Brightest Luminous Inner Core Heart */}
      <path 
        d="M24 23 C26 26.5 28 28.5 28 32 C28 35.8 26.2 38 24 38 C21.8 38 20 35.8 20 32 C20 27.8 22.8 25 24 23 Z" 
        fill="url(#flameCoreGrad)" 
      />

      {/* Polished Glass Specular Sparkles */}
      <circle cx="21" cy="18" r="1.8" fill="#FFFFFF" fillOpacity="0.95" />
      <circle cx="27.5" cy="13.5" r="1.2" fill="#FEF08A" fillOpacity="0.9" />
      <circle cx="23" cy="27" r="1" fill="#FFFFFF" fillOpacity="0.8" />
    </svg>
  );
});

// 6. INSPIRASI / IDEA BULB (3D Glowing Idea Bulb)
export const Icon3DBulbZap = React.memo(function Icon3DBulbZap({ size = 22, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="bulbGlassGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="50%" stopColor="#FDE68A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <linearGradient id="bulbBaseGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#A8A29E" />
          <stop offset="100%" stopColor="#57534E" />
        </linearGradient>
      </defs>
      <path d="M24 6 C15.5 6, 10 12, 10 19 C10 24, 14 28, 17 32 L31 32 C34 28, 38 24, 38 19 C38 12, 32.5 6, 24 6 Z" fill="url(#bulbGlassGrad)" />
      <path d="M15 13 C17 9, 22 8, 26 8" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M22 17 L25 21 L23 23 L26 27" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="18" y="33" width="12" height="3" rx="1.5" fill="url(#bulbBaseGrad)" />
      <rect x="19" y="37" width="10" height="3" rx="1.5" fill="url(#bulbBaseGrad)" />
      <path d="M21 41 Q24 43 27 41" stroke="#44403C" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
});

// 7. NAV: BERANDA (3D Cozy Cottage House)
export const Icon3DNavHome = React.memo(function Icon3DNavHome({ size = 26, active = false, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${active ? 'scale-110' : 'opacity-85 hover:opacity-100'} ${className}`}
    >
      <defs>
        <linearGradient id="homeRoofGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F58A54" />
          <stop offset="60%" stopColor="#C35E40" />
          <stop offset="100%" stopColor="#96381C" />
        </linearGradient>
        <linearGradient id="homeWallGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="100%" stopColor="#EFE3D3" />
        </linearGradient>
        <linearGradient id="homeDoorGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4E7651" />
          <stop offset="100%" stopColor="#2E4A30" />
        </linearGradient>
      </defs>
      <rect x="30" y="10" width="5" height="10" rx="1.5" fill="#96381C" />
      <ellipse cx="32.5" cy="10" rx="2.5" ry="1" fill="#D97706" />
      <rect x="11" y="21" width="26" height="20" rx="4" fill="url(#homeWallGrad)" stroke="#DECBB5" strokeWidth="1" />
      <path d="M6 21 L21.5 7.5 C23 6.2, 25 6.2, 26.5 7.5 L42 21 C43 22, 42.5 23.5, 41 23.5 L7 23.5 C5.5 23.5, 5 22, 6 21 Z" fill="url(#homeRoofGrad)" />
      <path d="M10 20 L24 8 L38 20" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
      <rect x="20" y="27" width="8" height="14" rx="3.5" fill="url(#homeDoorGrad)" />
      <circle cx="22" cy="34" r="1" fill="#FFE082" />
      <circle cx="24" cy="16" r="3.2" fill="#FFEAA7" stroke="#C35E40" strokeWidth="1" />
      <circle cx="23" cy="15" r="1" fill="#FFFFFF" />
    </svg>
  );
});

// 8. NAV: TUGAS (3D Clipboard Checklist)
export const Icon3DNavTasks = React.memo(function Icon3DNavTasks({ size = 26, active = false, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${active ? 'scale-110' : 'opacity-85 hover:opacity-100'} ${className}`}
    >
      <defs>
        <linearGradient id="taskBoardGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E89B6C" />
          <stop offset="100%" stopColor="#B8582C" />
        </linearGradient>
        <linearGradient id="taskPaperGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F5EFE6" />
        </linearGradient>
        <linearGradient id="taskClipGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect x="8" y="9" width="32" height="34" rx="6" fill="url(#taskBoardGrad)" />
      <rect x="12" y="14" width="24" height="26" rx="3.5" fill="url(#taskPaperGrad)" />
      <rect x="18" y="6" width="12" height="7" rx="3" fill="url(#taskClipGrad)" />
      <circle cx="24" cy="9.5" r="1.5" fill="#78350F" />
      <circle cx="17" cy="21" r="2.8" fill="#4E7651" />
      <path d="M15.5 21 L16.8 22.3 L18.8 19.8" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="22" y="19.5" width="11" height="2.5" rx="1.25" fill="#8C7A6B" />
      <circle cx="17" cy="28" r="2.8" fill="#4E7651" />
      <path d="M15.5 28 L16.8 29.3 L18.8 26.8" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="22" y="26.5" width="9" height="2.5" rx="1.25" fill="#8C7A6B" />
      <circle cx="17" cy="34.5" r="2.5" fill="#E2D4BE" />
      <rect x="22" y="33.5" width="11" height="2.5" rx="1.25" fill="#C5B4A0" />
    </svg>
  );
});

// 9. NAV: KALENDER (3D Spiral Flip Calendar)
export const Icon3DNavCalendar = React.memo(function Icon3DNavCalendar({ size = 26, active = false, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${active ? 'scale-110' : 'opacity-85 hover:opacity-100'} ${className}`}
    >
      <defs>
        <linearGradient id="calTopGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F57C48" />
          <stop offset="100%" stopColor="#C35E40" />
        </linearGradient>
        <linearGradient id="calRingGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect x="8" y="11" width="32" height="31" rx="6" fill="#FFFDF9" stroke="#E2D4BE" strokeWidth="1" />
      <path d="M8 17 C8 13.5, 11.5 11, 14 11 L34 11 C36.5 11, 40 13.5, 40 17 L40 21 L8 21 Z" fill="url(#calTopGrad)" />
      <rect x="13" y="7" width="3.5" height="7" rx="1.75" fill="url(#calRingGrad)" />
      <rect x="22" y="7" width="3.5" height="7" rx="1.75" fill="url(#calRingGrad)" />
      <rect x="31" y="7" width="3.5" height="7" rx="1.75" fill="url(#calRingGrad)" />
      <text x="24" y="34" fontSize="13" fontWeight="900" fill="#2E1C12" textAnchor="middle" fontFamily="sans-serif">26</text>
      <circle cx="33" cy="35" r="2" fill="#4E7651" />
    </svg>
  );
});

// 10. NAV: CATATAN (3D Leather Journal Book)
export const Icon3DNavNotes = React.memo(function Icon3DNavNotes({ size = 26, active = false, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${active ? 'scale-110' : 'opacity-85 hover:opacity-100'} ${className}`}
    >
      <defs>
        <linearGradient id="bookCoverGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#628E65" />
          <stop offset="60%" stopColor="#4E7651" />
          <stop offset="100%" stopColor="#2E4D31" />
        </linearGradient>
        <linearGradient id="bookRibbonGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect x="13" y="8" width="27" height="34" rx="4" fill="#FBF7EE" stroke="#E2D4BE" strokeWidth="1" />
      <path d="M10 8 C10 8, 14 8, 38 8 C39.5 8, 40 9, 40 10 L40 40 C40 41.5, 39 42, 37 42 L10 42 C8.5 42, 7 40.5, 7 39 L7 11 C7 9.5, 8.5 8, 10 8 Z" fill="url(#bookCoverGrad)" />
      <rect x="7" y="8" width="4.5" height="34" rx="2" fill="#243E26" fillOpacity="0.4" />
      <path d="M10 10 L10 40" stroke="#84B087" strokeWidth="1" strokeLinecap="round" />
      <path d="M28 8 L28 20 L31 17 L34 20 L34 8 Z" fill="url(#bookRibbonGrad)" />
      <circle cx="24" cy="27" r="5" fill="#365A39" opacity="0.6" />
      <path d="M24 23 C22 25, 22 28, 25 30 C27 28, 27 25, 24 23 Z" fill="#E8F4E5" />
    </svg>
  );
});

// 11. NAV: PENGATURAN (3D Dual Cogwheel Gear)
export const Icon3DNavSettings = React.memo(function Icon3DNavSettings({ size = 26, active = false, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform ${active ? 'scale-110' : 'opacity-85 hover:opacity-100'} ${className}`}
    >
      <defs>
        <linearGradient id="gearMainGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8C7A6B" />
          <stop offset="60%" stopColor="#6B594B" />
          <stop offset="100%" stopColor="#4A3B2F" />
        </linearGradient>
        <linearGradient id="gearBrassGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE082" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="14" fill="url(#gearMainGrad)" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <rect 
          key={i}
          x="21" 
          y="6" 
          width="6" 
          height="6" 
          rx="1.5" 
          transform={`rotate(${angle} 24 24)`} 
          fill="url(#gearMainGrad)" 
        />
      ))}
      <circle cx="24" cy="24" r="7.5" fill="url(#gearBrassGrad)" />
      <circle cx="24" cy="24" r="4" fill="#2E1C12" />
      <path d="M14 17 C16 13, 20 11, 24 11" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
    </svg>
  );
});

// 12. TASK: CHECKED (Glossy Emerald 3D Pill Button)
export const Icon3DTaskChecked = React.memo(function Icon3DTaskChecked({ size = 22, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="taskCheckGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#68A56D" />
          <stop offset="60%" stopColor="#4E7651" />
          <stop offset="100%" stopColor="#2E4F31" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#taskCheckGrad)" />
      <ellipse cx="16" cy="7" rx="8" ry="2.5" fill="#FFFFFF" fillOpacity="0.35" />
      <path d="M10 16.5 L14 20.5 L22 11.5" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

// 13. TASK: UNCHECKED (Tactile Off-White 3D Ring Button)
export const Icon3DTaskUnchecked = React.memo(function Icon3DTaskUnchecked({ size = 22, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 opacity-90 hover:opacity-100 ${className}`}
    >
      <circle cx="16" cy="16" r="13" fill="#FAF6EE" stroke="#D8C8B4" strokeWidth="2.5" />
      <circle cx="16" cy="16" r="8" fill="#EFE5D6" opacity="0.4" />
    </svg>
  );
});

// 14. FAB: PLUS (Vibrant 3D Terracotta Embossed Button)
export const Icon3DFabPlus = React.memo(function Icon3DFabPlus({ size = 28, className = '' }: Icon3DProps) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="fabPlusGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFA06D" />
          <stop offset="40%" stopColor="#E06D34" />
          <stop offset="100%" stopColor="#B34B1E" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#fabPlusGrad)" />
      <ellipse cx="24" cy="9" rx="14" ry="4" fill="#FFFFFF" fillOpacity="0.4" />
      <path d="M24 14 L24 34 M14 24 L34 24" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
    </svg>
  );
});

// -------------------------------------------------------------
// SETTINGS & COMMON 3D ICONS
// -------------------------------------------------------------

// 15. TEMA & TAMPILAN / PALETTE (3D Wooden Artist Palette with Paint Dabs)
export const Icon3DPalette = React.memo(function Icon3DPalette({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="palWood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F5A874" />
          <stop offset="50%" stopColor="#D97843" />
          <stop offset="100%" stopColor="#9C441A" />
        </linearGradient>
      </defs>
      <path d="M24 6 C13 6 5 14 5 24 C5 33 13 41 22 41 C24 41 26 39.5 26 37.5 C26 36.5 25.5 35.5 25 34.5 C24.5 33.5 24 32.5 24 31 C24 28.5 26 26.5 28.5 26.5 L33 26.5 C38.5 26.5 43 22 43 16.5 C43 10.5 34.5 6 24 6 Z" fill="url(#palWood)" />
      <circle cx="14" cy="18" r="3.5" fill="#EF4444" />
      <circle cx="22" cy="13" r="3.5" fill="#FBBF24" />
      <circle cx="31" cy="16" r="3.5" fill="#4E7651" />
      <circle cx="15" cy="28" r="3.5" fill="#3B82F6" />
      <circle cx="34" cy="33" r="3.5" fill="#2E1C12" />
      <path d="M12 12 C16 8 26 8 32 10" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
});

// 16. BAHASA / GLOBE (3D Earth Globe on Stand)
export const Icon3DGlobe = React.memo(function Icon3DGlobe({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <radialGradient id="globeOcean" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="60%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="22" r="14" fill="url(#globeOcean)" />
      <path d="M15 18 C17 14, 21 15, 23 18 C25 21, 23 25, 20 27 C18 29, 13 25, 15 18 Z" fill="#4ADE80" />
      <path d="M27 12 C31 13, 34 16, 33 20 C32 23, 28 22, 28 17 Z" fill="#4ADE80" />
      <path d="M25 27 C28 27, 32 30, 31 34 C28 36, 23 34, 25 27 Z" fill="#4ADE80" />
      <ellipse cx="20" cy="14" rx="5" ry="2" fill="#FFFFFF" opacity="0.6" />
      <path d="M38 22 C38 30 32 36 24 36 C16 36 10 30 10 22" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <rect x="22" y="36" width="4" height="6" fill="#B45309" />
      <rect x="15" y="41" width="18" height="4" rx="2" fill="#D97706" />
    </svg>
  );
});

// 17. SMARTPHONE / DISPLAY MODE (3D Curved Glass Smartphone)
export const Icon3DSmartphone = React.memo(function Icon3DSmartphone({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="phoneBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#689F6E" />
          <stop offset="100%" stopColor="#315B36" />
        </linearGradient>
      </defs>
      <rect x="13" y="6" width="22" height="36" rx="5" fill="url(#phoneBody)" />
      <rect x="15" y="10" width="18" height="27" rx="3" fill="#1C2D1F" />
      <path d="M16 12 L31 27" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.2" />
      <circle cx="24" cy="39.5" r="1.5" fill="#A7D5AC" />
      <rect x="21" y="8" width="6" height="1.5" rx="0.75" fill="#A7D5AC" />
    </svg>
  );
});

// 18. EFEK SUARA / VOLUME (3D Audio Speaker with Soundwaves)
export const Icon3DVolume = React.memo(function Icon3DVolume({ size = 24, active = true, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="spkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <path d="M10 18 L16 18 L24 11 L24 37 L16 30 L10 30 Z" fill="url(#spkGrad)" />
      <rect x="8" y="18" width="6" height="12" rx="2" fill="#B45309" />
      {active ? (
        <>
          <path d="M29 17 C32 20 32 28 29 31" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
          <path d="M35 12 C40 18 40 30 35 36" stroke="#D97706" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <path d="M30 18 L40 30 M40 18 L30 30" stroke="#EF4444" strokeWidth="3" strokeLinecap="round" />
      )}
    </svg>
  );
});

// 19. KUNCI LAYAR / LOCK (3D Brass Padlock)
export const Icon3DLock = React.memo(function Icon3DLock({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="lockBodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="60%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#B91C1C" />
        </linearGradient>
        <linearGradient id="lockShackleGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <path d="M16 20 V14 C16 9.5 19.5 6 24 6 C28.5 6 32 9.5 32 14 V20" stroke="url(#lockShackleGrad)" strokeWidth="4.5" strokeLinecap="round" fill="none" />
      <rect x="11" y="19" width="26" height="22" rx="6" fill="url(#lockBodyGrad)" />
      <ellipse cx="24" cy="22" rx="9" ry="2" fill="#FFFFFF" fillOpacity="0.4" />
      <circle cx="24" cy="28" r="3" fill="#FFE4E6" />
      <path d="M24 30 L24 36" stroke="#FFE4E6" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
});

// 20. PIN CATATAN RAHASIA / SECRET NOTE (3D Document with Golden Key)
export const Icon3DSecretNote = React.memo(function Icon3DSecretNote({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="docGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFDF9" />
          <stop offset="100%" stopColor="#EFE3D3" />
        </linearGradient>
        <linearGradient id="keyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect x="10" y="8" width="24" height="32" rx="4" fill="url(#docGrad)" stroke="#DECBB5" strokeWidth="1.5" />
      <rect x="15" y="14" width="14" height="2.5" rx="1.25" fill="#8C7A6B" />
      <rect x="15" y="19" width="10" height="2.5" rx="1.25" fill="#C5B4A0" />
      {/* Golden Key on top */}
      <circle cx="31" cy="27" r="6" fill="url(#keyGrad)" />
      <circle cx="31" cy="27" r="3" fill="#FFFDF0" />
      <path d="M35 31 L42 38 L40 40 L38 38 L36 40 L33 37" stroke="url(#keyGrad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

// 21. ACAK TOMBOL PIN / SCRAMBLE KEYPAD (3D Tactile Keypad Grid)
export const Icon3DShuffle = React.memo(function Icon3DShuffle({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="padGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="100%" stopColor="#7E22CE" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="32" height="32" rx="8" fill="url(#padGrad)" />
      <ellipse cx="24" cy="11" rx="12" ry="2" fill="#FFFFFF" opacity="0.3" />
      <circle cx="16" cy="16" r="3" fill="#FFFFFF" />
      <circle cx="24" cy="16" r="3" fill="#FFFFFF" />
      <circle cx="32" cy="16" r="3" fill="#FFFFFF" />
      <circle cx="16" cy="24" r="3" fill="#FFFFFF" />
      <circle cx="24" cy="24" r="3" fill="#FDE047" />
      <circle cx="32" cy="24" r="3" fill="#FFFFFF" />
      <circle cx="16" cy="32" r="3" fill="#FFFFFF" />
      <circle cx="24" cy="32" r="3" fill="#FFFFFF" />
      <circle cx="32" cy="32" r="3" fill="#FFFFFF" />
    </svg>
  );
});

// 22. CADANGAN OTOMATIS / DATABASE (3D Layered Server Disks)
export const Icon3DDatabase = React.memo(function Icon3DDatabase({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="dbDiskGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#689F6E" />
          <stop offset="100%" stopColor="#315B36" />
        </linearGradient>
      </defs>
      {/* Bottom Disk */}
      <path d="M10 28 C10 24 38 24 38 28 V35 C38 39 10 39 10 35 Z" fill="url(#dbDiskGrad)" />
      <ellipse cx="24" cy="28" rx="14" ry="4.5" fill="#88C08E" />
      {/* Mid Disk */}
      <path d="M10 19 C10 15 38 15 38 19 V26 C38 30 10 30 10 26 Z" fill="url(#dbDiskGrad)" />
      <ellipse cx="24" cy="19" rx="14" ry="4.5" fill="#88C08E" />
      {/* Top Disk */}
      <path d="M10 10 C10 6 38 6 38 10 V17 C38 21 10 21 10 17 Z" fill="url(#dbDiskGrad)" />
      <ellipse cx="24" cy="10" rx="14" ry="4.5" fill="#A8D8AE" />
      <circle cx="32" cy="14" r="1.5" fill="#4ADE80" />
      <circle cx="32" cy="23" r="1.5" fill="#4ADE80" />
      <circle cx="32" cy="32" r="1.5" fill="#4ADE80" />
    </svg>
  );
});

// 23. EKSPOR CADANGAN / DOWNLOAD (3D Folder with Down Arrow)
export const Icon3DDownload = React.memo(function Icon3DDownload({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="dlBoxGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <rect x="8" y="24" width="32" height="17" rx="4" fill="url(#dlBoxGrad)" />
      <rect x="12" y="27" width="24" height="4" rx="2" fill="#1E40AF" opacity="0.4" />
      <path d="M24 7 V25 M18 19 L24 25 L30 19" stroke="#3B82F6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

// 24. IMPOR CADANGAN / UPLOAD (3D Folder with Up Arrow)
export const Icon3DUpload = React.memo(function Icon3DUpload({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="ulBoxGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="100%" stopColor="#0F766E" />
        </linearGradient>
      </defs>
      <rect x="8" y="24" width="32" height="17" rx="4" fill="url(#ulBoxGrad)" />
      <rect x="12" y="27" width="24" height="4" rx="2" fill="#115E59" opacity="0.4" />
      <path d="M24 25 V7 M18 13 L24 7 L30 13" stroke="#0D9488" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

// 25. RESET DATA / TRASH (3D Terracotta Trash Bin with Warning)
export const Icon3DTrash = React.memo(function Icon3DTrash({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="trashBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="100%" stopColor="#DC2626" />
        </linearGradient>
      </defs>
      <rect x="14" y="9" width="20" height="4" rx="2" fill="#B91C1C" />
      <rect x="10" y="13" width="28" height="4" rx="2" fill="#EF4444" />
      <path d="M12 17 L15 39 C15.5 41 17 42 19 42 H29 C31 42 32.5 41 33 39 L36 17 Z" fill="url(#trashBodyGrad)" />
      <rect x="18" y="22" width="2.5" height="14" rx="1.25" fill="#FFFFFF" opacity="0.6" />
      <rect x="23" y="22" width="2.5" height="14" rx="1.25" fill="#FFFFFF" opacity="0.6" />
      <rect x="28" y="22" width="2.5" height="14" rx="1.25" fill="#FFFFFF" opacity="0.6" />
    </svg>
  );
});

// 26. SEGARAN CACHE / REFRESH (3D Cyan Twirling Arrows)
export const Icon3DRefresh = React.memo(function Icon3DRefresh({ size = 24, spinning = false, className = '' }: Icon3DProps & { spinning?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${spinning ? 'animate-spin' : ''} ${className}`}>
      <defs>
        <linearGradient id="refGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>
      <path d="M38 24 C38 31.7 31.7 38 24 38 C17.5 38 12 33.5 10.4 27" stroke="url(#refGrad)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M10 24 C10 16.3 16.3 10 24 10 C30.5 10 36 14.5 37.6 21" stroke="url(#refGrad)" strokeWidth="4.5" strokeLinecap="round" />
      <polygon points="34,22 41,22 37.5,15" fill="#0284C7" />
      <polygon points="14,26 7,26 10.5,33" fill="#0284C7" />
    </svg>
  );
});

// 27. PUSAT GAME / GAMEPAD (3D Retro Gaming Console Controller)
export const Icon3DGamepad = React.memo(function Icon3DGamepad({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="padBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      <path d="M14 15 C8 15 5 22 7 34 C8 37 12 38 15 35 L19 30 H29 L33 35 C36 38 40 37 41 34 C43 22 40 15 34 15 Z" fill="url(#padBodyGrad)" />
      <path d="M12 18 C16 16 32 16 36 18" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
      {/* D-Pad */}
      <rect x="14" y="21" width="3" height="9" rx="1.5" fill="#1C1917" />
      <rect x="11" y="24" width="9" height="3" rx="1.5" fill="#1C1917" />
      {/* Buttons */}
      <circle cx="33" cy="22.5" r="2" fill="#EF4444" />
      <circle cx="36" cy="25.5" r="2" fill="#FBBF24" />
      <circle cx="30" cy="25.5" r="2" fill="#3B82F6" />
      <circle cx="33" cy="28.5" r="2" fill="#22C55E" />
    </svg>
  );
});

// 28. TENTANG TATA / INFO (3D Soft Pill Badge with "i")
export const Icon3DInfo = React.memo(function Icon3DInfo({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="infoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#infoGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.4" />
      <circle cx="24" cy="17" r="2.5" fill="#FFFFFF" />
      <rect x="22" y="22" width="4" height="12" rx="2" fill="#FFFFFF" />
    </svg>
  );
});

// 29. KEBIJAKAN PRIVASI / SHIELD (3D Emerald Security Shield)
export const Icon3DShield = React.memo(function Icon3DShield({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="60%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>
      <path d="M24 6 L38 11 C38 25 32 37 24 42 C16 37 10 25 10 11 Z" fill="url(#shieldGrad)" />
      <path d="M24 10 L34 14 C34 23 29 32 24 37 C19 32 14 23 14 14 Z" stroke="#FFFFFF" strokeWidth="1.5" strokeOpacity="0.4" fill="none" />
      <path d="M19 23 L23 27 L30 19" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

// -------------------------------------------------------------
// CALENDAR & MOOD 3D ICONS
// -------------------------------------------------------------

// 30. MOOD: HAPPY (3D Glowing Smile Face)
export const Icon3DMoodHappy = React.memo(function Icon3DMoodHappy({ size = 28, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <radialGradient id="happyGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#happyGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.5" />
      {/* Eyes */}
      <path d="M16 19 C17 17 20 17 21 19" stroke="#713F12" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M27 19 C28 17 31 17 32 19" stroke="#713F12" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Big Smile */}
      <path d="M16 26 C16 32 32 32 32 26 Z" fill="#713F12" />
      <ellipse cx="24" cy="28.5" rx="4" ry="2" fill="#EF4444" />
      {/* Cheeks */}
      <circle cx="13" cy="26" r="2.5" fill="#F87171" opacity="0.7" />
      <circle cx="35" cy="26" r="2.5" fill="#F87171" opacity="0.7" />
    </svg>
  );
});

// 31. MOOD: CALM / PEACEFUL (3D Gentle Sage Smile)
export const Icon3DMoodCalm = React.memo(function Icon3DMoodCalm({ size = 28, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <radialGradient id="calmGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#BBF7D0" />
          <stop offset="60%" stopColor="#4ADE80" />
          <stop offset="100%" stopColor="#16A34A" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#calmGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.5" />
      {/* Peaceful closed eyes */}
      <path d="M16 21 Q19 24 22 21" stroke="#14532D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M26 21 Q29 24 32 21" stroke="#14532D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Gentle smile */}
      <path d="M19 28 Q24 32 29 28" stroke="#14532D" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="14" cy="26" r="2.2" fill="#86EFAC" opacity="0.8" />
      <circle cx="34" cy="26" r="2.2" fill="#86EFAC" opacity="0.8" />
    </svg>
  );
});

// 32. MOOD: NEUTRAL (3D Neutral Face)
export const Icon3DMoodNeutral = React.memo(function Icon3DMoodNeutral({ size = 28, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <radialGradient id="neuGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FED7AA" />
          <stop offset="60%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EA580C" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#neuGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.5" />
      <circle cx="18" cy="20" r="2.5" fill="#7C2D12" />
      <circle cx="30" cy="20" r="2.5" fill="#7C2D12" />
      <path d="M18 29 L30 29" stroke="#7C2D12" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
});

// 33. MOOD: SAD (3D Sad Face)
export const Icon3DMoodSad = React.memo(function Icon3DMoodSad({ size = 28, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <radialGradient id="sadGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#BAE6FD" />
          <stop offset="60%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#sadGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.5" />
      <circle cx="18" cy="21" r="2.5" fill="#0C4A6E" />
      <circle cx="30" cy="21" r="2.5" fill="#0C4A6E" />
      <path d="M18 31 Q24 26 30 31" stroke="#0C4A6E" strokeWidth="2.8" strokeLinecap="round" fill="none" />
    </svg>
  );
});

// 34. MOOD: CRY / TIRED (3D Blue Crying Face with Tears)
export const Icon3DMoodCry = React.memo(function Icon3DMoodCry({ size = 28, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <radialGradient id="cryGrad" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#C7D2FE" />
          <stop offset="60%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </radialGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#cryGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.5" />
      <path d="M16 19 Q19 16 22 19" stroke="#312E81" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M26 19 Q29 16 32 19" stroke="#312E81" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M19 32 Q24 27 29 32" stroke="#312E81" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      {/* Tear Drops */}
      <path d="M17 23 C17 26 15 28 15 28 C15 28 13 26 13 23 C13 21 17 21 17 23 Z" fill="#67E8F9" />
      <path d="M35 23 C35 26 33 28 33 28 C33 28 31 26 31 23 C31 21 35 21 35 23 Z" fill="#67E8F9" />
    </svg>
  );
});

// -------------------------------------------------------------
// FINANCE & STATS 3D ICONS
// -------------------------------------------------------------

// 35. INCOME / PEMASUKAN (3D Green Circular Badge with Up Arrow)
export const Icon3DIncome = React.memo(function Icon3DIncome({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="incGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#86EFAC" />
          <stop offset="50%" stopColor="#4E7651" />
          <stop offset="100%" stopColor="#244427" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#incGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.4" />
      <path d="M18 28 L30 16 M20 16 L30 16 L30 26" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

// 36. EXPENSE / PENGELUARAN (3D Terracotta Circular Badge with Down Arrow)
export const Icon3DExpense = React.memo(function Icon3DExpense({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="expGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCA5A5" />
          <stop offset="50%" stopColor="#C35E40" />
          <stop offset="100%" stopColor="#882E16" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#expGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.4" />
      <path d="M18 18 L30 30 M30 20 L30 30 L20 30" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

// 37. PIGGY BANK / TABUNGAN (3D Pink & Terracotta Piggy Bank with Coin)
export const Icon3DPiggyBank = React.memo(function Icon3DPiggyBank({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="pigGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F472B6" />
          <stop offset="60%" stopColor="#DB2777" />
          <stop offset="100%" stopColor="#9D174D" />
        </linearGradient>
        <linearGradient id="pigCoin" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      {/* Falling Coin */}
      <ellipse cx="24" cy="9" rx="5" ry="3" fill="url(#pigCoin)" />
      {/* Body */}
      <ellipse cx="24" cy="27" rx="14" ry="11" fill="url(#pigGrad)" />
      {/* Snout */}
      <rect x="8" y="24" width="5" height="7" rx="2.5" fill="#BE185D" />
      <circle cx="10.5" cy="27.5" r="1" fill="#FFFFFF" />
      {/* Ear */}
      <path d="M19 18 L23 12 L25 18 Z" fill="#BE185D" />
      {/* Legs */}
      <rect x="15" y="35" width="4" height="6" rx="2" fill="#9D174D" />
      <rect x="27" y="35" width="4" height="6" rx="2" fill="#9D174D" />
      {/* Eye */}
      <circle cx="16" cy="23" r="1.5" fill="#1C1917" />
    </svg>
  );
});

// 38. GRAFIK / STATS (3D Pie Chart with Raised Wedge)
export const Icon3DChart = React.memo(function Icon3DChart({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="pie1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
        <linearGradient id="pie2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#C2410C" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="16" fill="url(#pie1)" />
      {/* Raised Wedge */}
      <path d="M24 24 L24 8 A16 16 0 0 1 40 24 Z" fill="url(#pie2)" />
      <ellipse cx="24" cy="12" rx="6" ry="1.5" fill="#FFFFFF" opacity="0.4" />
    </svg>
  );
});

// 39. TARGET / FOKUS DISIPLIN / GOAL (3D Red-White-Gold Bullseye Target)
export const Icon3DTarget = React.memo(function Icon3DTarget({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="tgtOuter" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <linearGradient id="tgtMid" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFDF7" />
          <stop offset="100%" stopColor="#E2DCD2" />
        </linearGradient>
        <linearGradient id="tgtInner" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      {/* Outer Ring */}
      <circle cx="24" cy="24" r="18" fill="url(#tgtOuter)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.4" />
      {/* Middle Ring */}
      <circle cx="24" cy="24" r="12" fill="url(#tgtMid)" />
      {/* Inner Bullseye */}
      <circle cx="24" cy="24" r="6" fill="url(#tgtInner)" />
      <circle cx="24" cy="24" r="2.5" fill="#FFFFFF" />
    </svg>
  );
});

// 41. STRUK / RECEIPT (3D Paper Receipt with Zigzag Edges)
export const Icon3DReceipt = React.memo(function Icon3DReceipt({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="recPaper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="70%" stopColor="#F1F5F9" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
      </defs>
      <path d="M12 8 L36 8 L36 38 L33 36 L30 38 L27 36 L24 38 L21 36 L18 38 L15 36 L12 38 Z" fill="url(#recPaper)" />
      <ellipse cx="24" cy="11" rx="9" ry="1.5" fill="#FFFFFF" opacity="0.6" />
      {/* Receipt text lines */}
      <rect x="17" y="15" width="14" height="2.5" rx="1.25" fill="#3B82F6" />
      <rect x="17" y="21" width="10" height="2" rx="1" fill="#94A3B8" />
      <rect x="17" y="26" width="14" height="2" rx="1" fill="#94A3B8" />
      <rect x="17" y="31" width="8" height="2.5" rx="1.25" fill="#10B981" />
    </svg>
  );
});

// 42. KARTU / CREDIT CARD (3D Vibrant Teal & Gold Card with Chip)
export const Icon3DCreditCard = React.memo(function Icon3DCreditCard({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="cardGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2DD4BF" />
          <stop offset="60%" stopColor="#0F766E" />
          <stop offset="100%" stopColor="#134E4A" />
        </linearGradient>
        <linearGradient id="cardChip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
      </defs>
      <rect x="8" y="12" width="32" height="24" rx="5" fill="url(#cardGrad)" />
      <ellipse cx="24" cy="15" rx="12" ry="2" fill="#FFFFFF" opacity="0.3" />
      {/* Mag Stripe */}
      <rect x="8" y="18" width="32" height="5" fill="#115E59" />
      {/* EMV Chip */}
      <rect x="13" y="26" width="6" height="5" rx="1.5" fill="url(#cardChip)" />
      {/* Contactless wave */}
      <path d="M32 27 C34 29 34 31 32 33" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
});

// 43. BANK / LANDMARK (3D Classical Bank Building)
export const Icon3DBank = React.memo(function Icon3DBank({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="bankGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="60%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      {/* Roof Pediment */}
      <path d="M24 10 L8 18 L40 18 Z" fill="#64748B" />
      <path d="M24 12 L12 18 L36 18 Z" fill="url(#bankGrad)" />
      {/* Architrave */}
      <rect x="10" y="18" width="28" height="3" rx="1" fill="#475569" />
      {/* Columns */}
      <rect x="13" y="21" width="4" height="15" rx="1.5" fill="url(#bankGrad)" />
      <rect x="22" y="21" width="4" height="15" rx="1.5" fill="url(#bankGrad)" />
      <rect x="31" y="21" width="4" height="15" rx="1.5" fill="url(#bankGrad)" />
      {/* Base */}
      <rect x="8" y="36" width="32" height="4" rx="2" fill="#334155" />
    </svg>
  );
});

// 44. KOIN / COINS (3D Stacked Golden Coins)
export const Icon3DCoins = React.memo(function Icon3DCoins({ size = 26, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="coinGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#A16207" />
        </linearGradient>
      </defs>
      {/* Bottom coin */}
      <ellipse cx="20" cy="34" rx="11" ry="4.5" fill="#854D0E" />
      <path d="M9 31 C9 34 14 36 20 36 C26 36 31 34 31 31 L31 34 C31 37 26 39 20 39 C14 39 9 37 9 34 Z" fill="url(#coinGold)" />
      <ellipse cx="20" cy="31" rx="11" ry="4.5" fill="url(#coinGold)" />
      {/* Middle coin */}
      <path d="M11 24 C11 27 15 29 21 29 C27 29 31 27 31 24 L31 27 C31 30 27 32 21 32 C15 32 11 30 11 27 Z" fill="url(#coinGold)" />
      <ellipse cx="21" cy="24" rx="10" ry="4" fill="url(#coinGold)" />
      {/* Top coin leaning */}
      <ellipse cx="32" cy="18" rx="8" ry="11" transform="rotate(-25 32 18)" fill="url(#coinGold)" />
      <ellipse cx="32" cy="18" rx="6" ry="9" transform="rotate(-25 32 18)" fill="#FEF08A" opacity="0.6" />
    </svg>
  );
});

// 45. PERINGATAN / WARNING (3D Golden Amber Hazard Triangle)
export const Icon3DWarning = React.memo(function Icon3DWarning({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="warnGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <path d="M24 6 L44 40 H4 Z" fill="url(#warnGrad)" />
      <path d="M24 10 L40 38 H8 Z" fill="#FEF08A" opacity="0.4" />
      <rect x="22.5" y="18" width="3" height="11" rx="1.5" fill="#78350F" />
      <circle cx="24" cy="33.5" r="1.75" fill="#78350F" />
    </svg>
  );
});

// 46. JAM / WAKTU / CLOCK (3D Cyan-Slate Mechanical Clock Face)
export const Icon3DClock = React.memo(function Icon3DClock({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="clkRim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7DD3FC" />
          <stop offset="50%" stopColor="#0284C7" />
          <stop offset="100%" stopColor="#0369A1" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#clkRim)" />
      <circle cx="24" cy="24" r="14" fill="#F0F9FF" />
      <ellipse cx="24" cy="12" rx="8" ry="2" fill="#FFFFFF" opacity="0.6" />
      {/* Clock Hands */}
      <path d="M24 24 V15" stroke="#0369A1" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M24 24 L31 24" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2.5" fill="#0C4A6E" />
    </svg>
  );
});

// 47. PENGULANGAN / REPEAT (3D Green Loop Arrows)
export const Icon3DRepeat = React.memo(function Icon3DRepeat({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="repGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#86EFAC" />
          <stop offset="60%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
      </defs>
      <path d="M12 20 H34 C37 20 39 22 39 25 V26" stroke="url(#repGrad)" strokeWidth="3.5" strokeLinecap="round" />
      <polyline points="30 14 36 20 30 26" stroke="url(#repGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M36 28 H14 C11 28 9 26 9 23 V22" stroke="url(#repGrad)" strokeWidth="3.5" strokeLinecap="round" />
      <polyline points="18 34 12 28 18 22" stroke="url(#repGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
});

// 49. LABEL / TAG (3D Terracotta Price Tag with String Hole)
export const Icon3DTag = React.memo(function Icon3DTag({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="tagGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="60%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
      </defs>
      <path d="M12 24 L24 12 L38 12 L38 26 L26 38 L12 24 Z" fill="url(#tagGrad)" />
      <ellipse cx="25" cy="18" rx="8" ry="2" transform="rotate(-45 25 18)" fill="#FFFFFF" opacity="0.35" />
      <circle cx="32" cy="18" r="2.5" fill="#FFFDF0" />
      <circle cx="32" cy="18" r="1.2" fill="#7C2D12" />
    </svg>
  );
});

// 50. ARSIP / ARCHIVE (3D Cardboard Archive Box with Lid)
export const Icon3DArchive = React.memo(function Icon3DArchive({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="boxLidGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
        <linearGradient id="boxBodyGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D97706" />
          <stop offset="60%" stopColor="#B45309" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
      </defs>
      {/* Box Body */}
      <path d="M8 18 L40 18 L37 40 H11 L8 18 Z" fill="url(#boxBodyGrad)" />
      {/* Handle slot */}
      <rect x="20" y="24" width="8" height="3" rx="1.5" fill="#451A03" />
      {/* Lid */}
      <rect x="6" y="10" width="36" height="9" rx="3" fill="url(#boxLidGrad)" />
      <ellipse cx="24" cy="12" rx="14" ry="1.5" fill="#FFFFFF" opacity="0.4" />
    </svg>
  );
});

// 51. SEMAT / PIN (3D Red Pushpin with Shadow)
export const Icon3DPin = React.memo(function Icon3DPin({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="pinHeadGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F87171" />
          <stop offset="50%" stopColor="#EF4444" />
          <stop offset="100%" stopColor="#991B1B" />
        </linearGradient>
        <linearGradient id="pinNeedleGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      {/* Needle */}
      <path d="M24 28 L24 42 L22 28 Z" fill="url(#pinNeedleGrad)" />
      {/* Pin Body */}
      <circle cx="24" cy="14" r="9" fill="url(#pinHeadGrad)" />
      <ellipse cx="24" cy="9" rx="5" ry="2" fill="#FFFFFF" opacity="0.6" />
      {/* Pin Base ring */}
      <rect x="17" y="22" width="14" height="6" rx="3" fill="#B91C1C" />
    </svg>
  );
});

// 52. HATI / HEART (3D Glossy Pink-Rose Heart for Dev Message)
export const Icon3DHeart = React.memo(function Icon3DHeart({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="heartGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="50%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
      </defs>
      <path 
        d="M24 41 C24 41 7 28 7 17 C7 11 12 6.5 18 6.5 C21.5 6.5 24 8.5 24 8.5 C24 8.5 26.5 6.5 30 6.5 C36 6.5 41 11 41 17 C41 28 24 41 24 41 Z" 
        fill="url(#heartGrad)" 
      />
      <ellipse cx="16" cy="14" rx="4" ry="2" transform="rotate(-30 16 14)" fill="#FFFFFF" opacity="0.6" />
      <ellipse cx="32" cy="14" rx="2.5" ry="1.2" transform="rotate(30 32 14)" fill="#FFFFFF" opacity="0.4" />
    </svg>
  );
});

// 53. INSTAGRAM (3D Sunset Gradient Camera)
export const Icon3DInstagram = React.memo(function Icon3DInstagram({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="igGrad" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#FCAF45" />
          <stop offset="30%" stopColor="#F77737" />
          <stop offset="60%" stopColor="#E1306C" />
          <stop offset="85%" stopColor="#C13584" />
          <stop offset="100%" stopColor="#833AB4" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="32" height="32" rx="10" fill="url(#igGrad)" />
      <circle cx="24" cy="24" r="8" stroke="#FFFFFF" strokeWidth="3" fill="none" />
      <circle cx="24" cy="24" r="3.5" fill="#FFFFFF" opacity="0.4" />
      <circle cx="33" cy="15" r="2.2" fill="#FFFFFF" />
      <ellipse cx="24" cy="11" rx="10" ry="1.5" fill="#FFFFFF" opacity="0.4" />
    </svg>
  );
});

// 54. EMAIL / MAIL (3D Amber-Orange Envelope)
export const Icon3DMail = React.memo(function Icon3DMail({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="mailBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="mailFlapGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <rect x="6" y="12" width="36" height="26" rx="6" fill="url(#mailBodyGrad)" />
      <path d="M6 16 L24 28 L42 16" fill="url(#mailFlapGrad)" />
      <path d="M6 38 L19 25" stroke="#B45309" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M42 38 L29 25" stroke="#B45309" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <ellipse cx="24" cy="15" rx="12" ry="1.5" fill="#FFFFFF" opacity="0.5" />
    </svg>
  );
});

// 55. KUNCI / KEY (3D Golden Metallic Key)
export const Icon3DKey = React.memo(function Icon3DKey({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="keyGoldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#CA8A04" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="18" r="10" fill="url(#keyGoldGrad)" />
      <circle cx="16" cy="18" r="5" fill="#78350F" opacity="0.4" />
      <ellipse cx="14" cy="13" rx="4" ry="1.5" fill="#FFFFFF" opacity="0.6" />
      <path d="M23 23 L39 39" stroke="url(#keyGoldGrad)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M32 32 L36 28 M37 37 L41 33" stroke="url(#keyGoldGrad)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
});

// 56. PENGGUNA / USER / AVATAR (3D Indigo Friendly User Badge)
export const Icon3DUser = React.memo(function Icon3DUser({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="usrGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A5B4FC" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="16" r="9" fill="url(#usrGrad)" />
      <ellipse cx="24" cy="11" rx="5" ry="2" fill="#FFFFFF" opacity="0.6" />
      <path d="M8 40 C8 32 15 28 24 28 C33 28 40 32 40 40 Z" fill="url(#usrGrad)" />
      <ellipse cx="24" cy="30" rx="10" ry="2" fill="#FFFFFF" opacity="0.3" />
    </svg>
  );
});

// 57. BANTUAN / HELP / INFO (3D Cyan-Indigo Help Question Orb)
export const Icon3DHelp = React.memo(function Icon3DHelp({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="hlpGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="50%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#312E81" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#hlpGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2.5" fill="#FFFFFF" opacity="0.4" />
      <path d="M19 18 C19 14.5 21.5 13 24 13 C26.5 13 29 14.5 29 17 C29 21 24 22 24 26" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      <circle cx="24" cy="33" r="2" fill="#FFFFFF" />
    </svg>
  );
});

// 58. CROP / POTONG GAMBAR (3D Indigo Crop Tool Frame)
export const Icon3DCrop = React.memo(function Icon3DCrop({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="crpGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
      </defs>
      <path d="M14 6 V34 H42" stroke="url(#crpGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 42 V14 H6" stroke="url(#crpGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

// 59. KAMERA / FOTO (3D Camera with Lens Glow)
export const Icon3DCamera = React.memo(function Icon3DCamera({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="camGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#3730A3" />
        </linearGradient>
      </defs>
      <rect x="6" y="14" width="36" height="26" rx="7" fill="url(#camGrad)" />
      <path d="M16 14 L19 9 H29 L32 14 Z" fill="url(#camGrad)" />
      <circle cx="24" cy="27" r="8" fill="#1E1B4B" />
      <circle cx="24" cy="27" r="6" fill="#38BDF8" opacity="0.8" />
      <circle cx="22" cy="25" r="2" fill="#FFFFFF" />
      <circle cx="35" cy="18" r="1.5" fill="#F43F5E" />
    </svg>
  );
});

// 60. RIWAYAT / AUDIT / HISTORY (3D Purple Clock History Arrow)
export const Icon3DHistory = React.memo(function Icon3DHistory({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="histGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#7E22CE" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="16" stroke="url(#histGrad)" strokeWidth="4" strokeDasharray="80 20" strokeLinecap="round" />
      <path d="M12 16 L12 24 L20 24" stroke="url(#histGrad)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M24 16 V24 L29 28" stroke="url(#histGrad)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
});

// 61. SCAN / OCR SCANNER (3D Laser Scanner Sheet)
export const Icon3DScan = React.memo(function Icon3DScan({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="scanCornerGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id="scanDocGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
        <linearGradient id="scanLaser" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#38BDF8" stopOpacity="1" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.2" />
        </linearGradient>
      </defs>
      {/* Target brackets */}
      <path d="M14 8 H8 V14" stroke="url(#scanCornerGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 8 H40 V14" stroke="url(#scanCornerGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 40 H8 V34" stroke="url(#scanCornerGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M34 40 H40 V34" stroke="url(#scanCornerGrad)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Mini document in center */}
      <rect x="14" y="12" width="20" height="24" rx="4" fill="url(#scanDocGrad)" />
      <rect x="18" y="17" width="12" height="2.5" rx="1.25" fill="#94A3B8" />
      <rect x="18" y="22" width="10" height="2" rx="1" fill="#CBD5E1" />
      <rect x="18" y="26" width="12" height="2" rx="1" fill="#CBD5E1" />
      {/* Laser line */}
      <line x1="10" y1="24" x2="38" y2="24" stroke="url(#scanLaser)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
});

// 62. DOKUMEN / FILE TEXT (3D Blue Document)
export const Icon3DFileText = React.memo(function Icon3DFileText({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="fileTextGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#93C5FD" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
      <rect x="10" y="6" width="28" height="36" rx="6" fill="url(#fileTextGrad)" />
      <path d="M28 6 L38 16 H30 C28.8954 16 28 15.1046 28 14 V6 Z" fill="#BFDBFE" />
      <rect x="16" y="22" width="16" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.9" />
      <rect x="16" y="28" width="12" height="3" rx="1.5" fill="#FFFFFF" fillOpacity="0.7" />
      <rect x="16" y="34" width="14" height="2.5" rx="1.25" fill="#FFFFFF" fillOpacity="0.5" />
    </svg>
  );
});

// 63. GAMBAR / FOTO / IMAGE (3D Vibrant Landscape Card)
export const Icon3DImage = React.memo(function Icon3DImage({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="imgBgGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <radialGradient id="sunGrad" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="100%" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
      <rect x="6" y="8" width="36" height="32" rx="7" fill="url(#imgBgGrad)" />
      <circle cx="17" cy="18" r="4.5" fill="url(#sunGrad)" />
      <path d="M8 34 L18 23 L27 31 L33 25 L40 33 V36 C40 37.6569 38.6569 39 37 39 H11 C9.34315 39 8 37.6569 8 36 V34 Z" fill="#064E3B" fillOpacity="0.75" />
      <path d="M12 36 L21 27 L30 35 L35 30 L40 35 V37 C40 38.6569 38.6569 40 37 40 H11 C9.34315 40 8 38.6569 8 37 V36 Z" fill="#022C22" />
    </svg>
  );
});

// 64. BACK ARROW / KEMBALI (3D Warm Rounded Arrow)
export const Icon3DArrowLeft = React.memo(function Icon3DArrowLeft({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="backGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#backGrad)" />
      <path d="M26 16 L18 24 L26 32" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 24 H32" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
});

// 65. UNLOCK / BUKA KUNCI (3D Open Gold Padlock)
export const Icon3DUnlock = React.memo(function Icon3DUnlock({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="unlockBody" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="unlockShackle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
      </defs>
      {/* Open shackle */}
      <path d="M28 20 V12 C28 8.13401 24.866 5 21 5 C17.134 5 14 8.13401 14 12 V18" stroke="url(#unlockShackle)" strokeWidth="4.5" strokeLinecap="round" />
      {/* Body */}
      <rect x="10" y="18" width="28" height="24" rx="6" fill="url(#unlockBody)" />
      <circle cx="24" cy="28" r="3" fill="#78350F" />
      <path d="M24 31 V35" stroke="#78350F" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
});

// 66. COPY / SALIN (3D Tactile Double Clipboard)
export const Icon3DCopy = React.memo(function Icon3DCopy({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="copyBack" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient id="copyFront" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C7D2FE" />
          <stop offset="100%" stopColor="#A5B4FC" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="24" height="26" rx="5" fill="url(#copyBack)" />
      <rect x="16" y="14" width="24" height="26" rx="5" fill="url(#copyFront)" />
      <rect x="21" y="20" width="14" height="2.5" rx="1.25" fill="#3730A3" />
      <rect x="21" y="26" width="11" height="2.5" rx="1.25" fill="#4338CA" />
      <rect x="21" y="32" width="13" height="2" rx="1" fill="#4F46E5" />
    </svg>
  );
});

// 67. PAPERCLIP / LAMPIRAN (3D Metallic Clip)
export const Icon3DPaperclip = React.memo(function Icon3DPaperclip({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="clipGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E2E8F0" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
      </defs>
      <path 
        d="M32 18 L19.5 30.5 C16.5 33.5 11.5 33.5 8.5 30.5 C5.5 27.5 5.5 22.5 8.5 19.5 L24 4 C26.2 1.8 29.8 1.8 32 4 C34.2 6.2 34.2 9.8 32 12 L16.5 27.5 C15.4 28.6 13.6 28.6 12.5 27.5 C11.4 26.4 11.4 24.6 12.5 23.5 L25 11" 
        stroke="url(#clipGrad)" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </svg>
  );
});

// 68. ACTIVITY / PULSE / PROGRES (3D Vibrant Pulse Wave)
export const Icon3DActivity = React.memo(function Icon3DActivity({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="actGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
        <linearGradient id="actLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E0E7FF" />
        </linearGradient>
      </defs>
      <rect x="6" y="8" width="36" height="32" rx="10" fill="url(#actGrad)" />
      <path 
        d="M10 25 H16 L20 16 L27 33 L32 21 L35 25 H38" 
        stroke="url(#actLine)" 
        strokeWidth="3.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <circle cx="20" cy="16" r="2.5" fill="#FFFFFF" />
      <circle cx="27" cy="33" r="2.5" fill="#C7D2FE" />
      <circle cx="32" cy="21" r="2" fill="#FFFFFF" />
    </svg>
  );
});

// 69. CLOSE / BATAL / X (3D Rounded Cross)
export const Icon3DClose = React.memo(function Icon3DClose({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="clsGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="50%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#clsGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.4" />
      <path d="M17 17 L31 31 M31 17 L17 31" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
});

// 70. EDIT / PENCIL (3D Golden Stylus / Pencil)
export const Icon3DEdit = React.memo(function Icon3DEdit({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="editPenGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <path d="M12 36 L12 30 L30 12 L36 18 L18 36 Z" fill="url(#editPenGrad)" />
      <path d="M30 12 L34 8 L40 14 L36 18 Z" fill="#D97706" />
      <path d="M12 36 L16 36 L12 32 Z" fill="#78350F" />
      <path d="M16 28 L20 32" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
});

// 71. SEND (3D Terracotta Paper Plane)
export const Icon3DSend = React.memo(function Icon3DSend({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="sendWing1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
        <linearGradient id="sendWing2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FED7AA" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <path d="M42 6 L6 22 L22 28 L42 6 Z" fill="url(#sendWing1)" />
      <path d="M42 6 L28 42 L22 28 L42 6 Z" fill="url(#sendWing2)" />
      <path d="M22 28 L28 36 L32 28 Z" fill="#7C2D12" />
      <path d="M42 6 L22 28" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
});

// 72. PLAY (3D Emerald / Amber Glossy Play Button)
export const Icon3DPlay = React.memo(function Icon3DPlay({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="playGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#playGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.4" />
      <path d="M19 16 L33 24 L19 32 Z" fill="#FFFFFF" />
    </svg>
  );
});

// 73. PAUSE (3D Indigo / Amber Glossy Pause)
export const Icon3DPause = React.memo(function Icon3DPause({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="pauseGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#pauseGrad)" />
      <ellipse cx="24" cy="10" rx="10" ry="2" fill="#FFFFFF" opacity="0.4" />
      <rect x="17" y="16" width="4" height="16" rx="2" fill="#FFFFFF" />
      <rect x="27" y="16" width="4" height="16" rx="2" fill="#FFFFFF" />
    </svg>
  );
});

// 74. STOP (3D Ruby Glossy Stop)
export const Icon3DStop = React.memo(function Icon3DStop({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="stopGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="50%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#9F1239" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="url(#stopGrad)" />
      <rect x="17" y="17" width="14" height="14" rx="3" fill="#FFFFFF" />
    </svg>
  );
});

// 75. TROPHY / AWARD (3D Golden Championship Cup)
export const Icon3DTrophy = React.memo(function Icon3DTrophy({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="trophyGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <path d="M14 10 H34 V22 C34 27.5 29.5 32 24 32 C18.5 32 14 27.5 14 22 Z" fill="url(#trophyGold)" />
      <path d="M14 14 H8 C8 20 12 22 14 22 Z" fill="#D97706" />
      <path d="M34 14 H40 C40 20 36 22 34 22 Z" fill="#D97706" />
      <path d="M21 32 H27 V38 H21 Z" fill="#B45309" />
      <rect x="16" y="38" width="16" height="5" rx="2.5" fill="url(#trophyGold)" />
      <polygon points="24,16 25.5,20 29.5,20 26.5,22.5 27.5,26.5 24,24 20.5,26.5 21.5,22.5 18.5,20 22.5,20" fill="#FFFFFF" />
    </svg>
  );
});

// 76. GIFT / REWARD (3D Wrapped Gift Box)
export const Icon3DGift = React.memo(function Icon3DGift({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="giftBoxGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDA4AF" />
          <stop offset="50%" stopColor="#F43F5E" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
        <linearGradient id="giftRibbon" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <rect x="10" y="20" width="28" height="22" rx="4" fill="url(#giftBoxGrad)" />
      <rect x="8" y="14" width="32" height="7" rx="3" fill="url(#giftBoxGrad)" />
      <rect x="22" y="14" width="4" height="28" fill="url(#giftRibbon)" />
      <path d="M24 14 C20 8 15 10 18 14 Z" fill="url(#giftRibbon)" />
      <path d="M24 14 C28 8 33 10 30 14 Z" fill="url(#giftRibbon)" />
    </svg>
  );
});

// 77. CLIPBOARD / LIST (3D Checklist Board)
export const Icon3DClipboard = React.memo(function Icon3DClipboard({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="clipBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <rect x="10" y="8" width="28" height="34" rx="6" fill="url(#clipBg)" />
      <rect x="18" y="4" width="12" height="6" rx="3" fill="#FDE047" />
      <rect x="14" y="16" width="20" height="3" rx="1.5" fill="#FFFFFF" opacity="0.85" />
      <rect x="14" y="23" width="16" height="3" rx="1.5" fill="#FFFFFF" opacity="0.85" />
      <rect x="14" y="30" width="12" height="3" rx="1.5" fill="#FFFFFF" opacity="0.85" />
    </svg>
  );
});

// 78. COMPASS / EXPLORE (3D Golden Navigator)
export const Icon3DCompass = React.memo(function Icon3DCompass({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="compBrass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#92400E" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="18" fill="#1E293B" stroke="url(#compBrass)" strokeWidth="3" />
      <polygon points="24,10 28,24 24,22 20,24" fill="#F43F5E" />
      <polygon points="24,38 28,24 24,26 20,24" fill="#38BDF8" />
      <circle cx="24" cy="24" r="2.5" fill="#FDE047" />
    </svg>
  );
});

// 79. LIGHTBULB / IDEA (3D Glowing Amber Bulb)
export const Icon3DLightbulb = React.memo(function Icon3DLightbulb({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="bulbGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="60%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="18" r="12" fill="url(#bulbGlass)" />
      <path d="M16 24 C16 27 18 30 20 32 H28 C30 30 32 27 32 24 Z" fill="url(#bulbGlass)" />
      <rect x="20" y="33" width="8" height="5" rx="1.5" fill="#94A3B8" />
      <ellipse cx="24" cy="39" rx="3" ry="1.5" fill="#64748B" />
      <ellipse cx="22" cy="14" rx="3" ry="1.5" fill="#FFFFFF" opacity="0.6" />
    </svg>
  );
});

// 80. ZAP / ENERGY (3D Electric Lightning Bolt)
export const Icon3DZap = React.memo(function Icon3DZap({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="zapGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FEF08A" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <polygon points="26,4 12,26 24,26 22,44 36,20 24,20" fill="url(#zapGrad)" />
      <polygon points="25,7 15,25 24,25 23,38 33,21 24,21" fill="#FEF9C3" opacity="0.5" />
    </svg>
  );
});

// 81. SLIDERS / ADJUST (3D Tuning Controls)
export const Icon3DSliders = React.memo(function Icon3DSliders({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <line x1="14" y1="8" x2="14" y2="40" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="8" x2="24" y2="40" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
      <line x1="34" y1="8" x2="34" y2="40" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
      <circle cx="14" cy="18" r="5" fill="#818CF8" />
      <circle cx="24" cy="30" r="5" fill="#F59E0B" />
      <circle cx="34" cy="20" r="5" fill="#10B981" />
    </svg>
  );
});

// 82. FILTER / FUNNEL (3D Filter Funnel)
export const Icon3DFilter = React.memo(function Icon3DFilter({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="filtGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <path d="M8 10 H40 L28 26 V38 L20 42 V26 Z" fill="url(#filtGrad)" />
      <ellipse cx="24" cy="10" rx="16" ry="3" fill="#C7D2FE" opacity="0.6" />
    </svg>
  );
});

// 83. SHARE / NODE (3D Connected Nodes)
export const Icon3DShare = React.memo(function Icon3DShare({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <line x1="16" y1="24" x2="32" y2="14" stroke="#94A3B8" strokeWidth="3" />
      <line x1="16" y1="24" x2="32" y2="34" stroke="#94A3B8" strokeWidth="3" />
      <circle cx="16" cy="24" r="6" fill="#3B82F6" />
      <circle cx="32" cy="14" r="6" fill="#F59E0B" />
      <circle cx="32" cy="34" r="6" fill="#10B981" />
      <circle cx="15" cy="22" r="2" fill="#FFFFFF" opacity="0.6" />
    </svg>
  );
});

// 84. BOOKMARK (3D Ribbon Badge)
export const Icon3DBookmark = React.memo(function Icon3DBookmark({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="bookGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#E11D48" />
        </linearGradient>
      </defs>
      <path d="M14 8 H34 V40 L24 32 L14 40 Z" fill="url(#bookGrad)" />
      <path d="M14 8 H34 V12 H14 Z" fill="#FDA4AF" opacity="0.6" />
    </svg>
  );
});

// 85. FEATHER / WRITE (3D Quill Plume)
export const Icon3DFeather = React.memo(function Icon3DFeather({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="feathGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#C084FC" />
          <stop offset="50%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#6B21A8" />
        </linearGradient>
      </defs>
      <path d="M38 6 C38 6 22 12 16 26 C13 33 10 42 10 42 C10 42 18 38 24 34 C36 26 40 10 40 10 Z" fill="url(#feathGrad)" />
      <path d="M10 42 L28 20" stroke="#F3E8FF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
});

// 86. ROTATE CCW / RESET / UNDO (3D Reset Loop)
export const Icon3DRotateCcw = React.memo(function Icon3DRotateCcw({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="rotGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <path d="M14 20 H6 V12" stroke="url(#rotGrad)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 24 C10 32.8 17.2 40 26 40 C34.8 40 42 32.8 42 24 C42 15.2 34.8 8 26 8 C19.5 8 13.9 11.9 11.4 17.5" stroke="url(#rotGrad)" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
});

// 87. CHEVRON RIGHT (3D Directional Pill)
export const Icon3DChevronRight = React.memo(function Icon3DChevronRight({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <circle cx="24" cy="24" r="16" fill="#334155" opacity="0.4" />
      <path d="M20 16 L28 24 L20 32" stroke="#CBD5E1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

// 88. FOCUS / STOPWATCH (3D Tactile Focus Dial)
export const Icon3DFocus = React.memo(function Icon3DFocus({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="focDial" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="50%" stopColor="#EA580C" />
          <stop offset="100%" stopColor="#9A3412" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="26" r="16" fill="url(#focDial)" />
      <circle cx="24" cy="26" r="12" fill="#18181B" />
      <rect x="22" y="6" width="4" height="6" rx="2" fill="#FB923C" />
      <circle cx="24" cy="26" r="3" fill="#FB923C" />
      <line x1="24" y1="26" x2="30" y2="20" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
});

// 89. MICROPHONE (3D Studio Mic)
export const Icon3DMic = React.memo(function Icon3DMic({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="micGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
      </defs>
      <rect x="18" y="8" width="12" height="20" rx="6" fill="url(#micGrad)" />
      <path d="M12 22 C12 28.6 17.4 34 24 34 C30.6 34 36 28.6 36 22" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="34" x2="24" y2="42" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
      <line x1="16" y1="42" x2="32" y2="42" stroke="#94A3B8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
});

// 90. SPEAKER / AUDIO (3D Sound Wave)
export const Icon3DSpeaker = React.memo(function Icon3DSpeaker({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="spkGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <path d="M12 18 H18 L28 10 V38 L18 30 H12 Z" fill="url(#spkGrad)" />
      <path d="M34 16 C37 19 37 29 34 32" stroke="#6EE7B7" strokeWidth="3" strokeLinecap="round" />
      <path d="M39 11 C44 16 44 32 39 37" stroke="#A7F3D0" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
});

// 91. EYE / VISUAL (3D Eye Badge)
export const Icon3DEye = React.memo(function Icon3DEye({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="eyeGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="100%" stopColor="#2563EB" />
        </linearGradient>
      </defs>
      <path d="M6 24 C6 24 13 12 24 12 C35 12 42 24 42 24 C42 24 35 36 24 36 C13 36 6 24 6 24 Z" fill="#F8FAFC" />
      <circle cx="24" cy="24" r="7" fill="url(#eyeGrad)" />
      <circle cx="24" cy="24" r="3.5" fill="#0F172A" />
      <circle cx="22" cy="22" r="1.5" fill="#FFFFFF" />
    </svg>
  );
});

// 92. CHECK SQUARE (3D Emerald Checkbox)
export const Icon3DCheckSquare = React.memo(function Icon3DCheckSquare({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="chkSqGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="50%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="32" height="32" rx="8" fill="url(#chkSqGrad)" />
      <ellipse cx="24" cy="12" rx="10" ry="2" fill="#FFFFFF" opacity="0.35" />
      <path d="M16 24 L22 30 L32 18" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

// 92. KUNCI EMAS BRANKAS / GOLD VAULT LOCK (3D Tactile Golden Padlock)
export const Icon3DGoldLock = React.memo(function Icon3DGoldLock({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="goldLockBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="25%" stopColor="#F59E0B" />
          <stop offset="65%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
        <linearGradient id="goldLockShackle" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <radialGradient id="goldLockGlint" cx="30%" cy="25%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="24" cy="43" rx="14" ry="3.5" fill="#451A03" fillOpacity="0.22" />
      {/* Heavy Steel Shackle */}
      <path d="M16 22 V14 C16 9.5 19.6 5 24 5 C28.4 5 32 9.5 32 14 V22" stroke="url(#goldLockShackle)" strokeWidth="5.5" strokeLinecap="round" fill="none" />
      {/* 3D Solid Brass Body */}
      <rect x="9" y="19" width="30" height="23" rx="7" fill="url(#goldLockBody)" />
      {/* Curved Gloss Highlight */}
      <rect x="9" y="19" width="30" height="23" rx="7" fill="url(#goldLockGlint)" />
      <ellipse cx="24" cy="22" rx="11" ry="2.2" fill="#FFFFFF" fillOpacity="0.5" />
      {/* Deep Keyhole */}
      <circle cx="24" cy="29" r="3.2" fill="#2E1303" />
      <path d="M24 31.5 L24 37" stroke="#2E1303" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
});

// 93. HAPUS / BACKSPACE / DELETE (3D Tactile Backspace Key with Gloss)
export const Icon3DBackspace = React.memo(function Icon3DBackspace({ size = 24, className = '' }: Icon3DProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" className={`shrink-0 ${className}`}>
      <defs>
        <linearGradient id="backspaceBodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FB7185" />
          <stop offset="45%" stopColor="#E11D48" />
          <stop offset="100%" stopColor="#BE123C" />
        </linearGradient>
        <linearGradient id="backspaceGlint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse cx="25" cy="41" rx="15" ry="3.5" fill="#4C0519" fillOpacity="0.2" />
      {/* 3D Tag Body */}
      <path
        d="M17 11 L6 24 L17 37 H38 C41.3 37 44 34.3 44 31 V17 C44 13.7 41.3 11 38 11 H17 Z"
        fill="url(#backspaceBodyGrad)"
      />
      {/* Bevel Highlight */}
      <path
        d="M17 12.5 L7.5 24 L17 35.5 H38 C40.5 35.5 42.5 33.5 42.5 31 V17 C42.5 14.5 40.5 12.5 38 12.5 H17 Z"
        stroke="url(#backspaceGlint)"
        strokeWidth="1.2"
        fill="none"
      />
      {/* Inner White ✕ */}
      <path
        d="M23 18 L33 28 M33 18 L23 28"
        stroke="#FFFFFF"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});

// Aliases for compatibility
export const Icon3DDelete = Icon3DBackspace;
export const Icon3DPiggy = Icon3DPiggyBank;
export const Icon3DCheck = Icon3DTaskChecked;
export const Icon3DTaskCheck = Icon3DTaskChecked;
export const Icon3DPlus = Icon3DFabPlus;
export const Icon3DChartPie = Icon3DChart;
export const Icon3DCalendar = Icon3DNavCalendar;
export const Icon3DSparkles = Icon3DTataAI;
export const Icon3DX = Icon3DClose;
export const Icon3DPencil = Icon3DEdit;
export const Icon3DUndo = Icon3DRotateCcw;
export const Icon3DReset = Icon3DRotateCcw;
export const Icon3DForward = Icon3DChevronRight;











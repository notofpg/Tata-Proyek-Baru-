export interface WallpaperPreset {
  id: string;
  nameId: string;
  nameEn: string;
  colorPreview: string;
  dataUrl: string;
}

// Crisp, high-resolution aesthetic vector wallpapers stored offline
export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  {
    id: 'midnight_horizon',
    nameId: 'Malam',
    nameEn: 'Night',
    colorPreview: 'from-slate-950 via-indigo-950 to-slate-900',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#020617"/>
            <stop offset="45%" stop-color="#090d24"/>
            <stop offset="75%" stop-color="#1e1b4b"/>
            <stop offset="100%" stop-color="#311042"/>
          </linearGradient>
          <radialGradient id="glow" cx="50%" cy="65%" r="45%">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.45"/>
            <stop offset="60%" stop-color="#4338ca" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#020617" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#sky)"/>
        <circle cx="540" cy="1200" r="500" fill="url(#glow)"/>
        <!-- Subtle Star field -->
        <circle cx="120" cy="240" r="2.5" fill="#ffffff" opacity="0.75"/>
        <circle cx="280" cy="180" r="1.8" fill="#ffffff" opacity="0.6"/>
        <circle cx="450" cy="320" r="2.8" fill="#ffffff" opacity="0.8"/>
        <circle cx="680" cy="150" r="2" fill="#ffffff" opacity="0.7"/>
        <circle cx="890" cy="270" r="3" fill="#ffffff" opacity="0.85"/>
        <circle cx="820" cy="420" r="1.5" fill="#ffffff" opacity="0.5"/>
        <circle cx="230" cy="520" r="2" fill="#ffffff" opacity="0.65"/>
        <circle cx="560" cy="480" r="2.2" fill="#ffffff" opacity="0.7"/>
        <!-- Soft mountain peaks -->
        <path d="M0 1920 L0 1550 Q280 1350 540 1480 T1080 1420 L1080 1920 Z" fill="#0b0f19" opacity="0.85"/>
        <path d="M0 1920 L0 1620 Q320 1480 620 1580 T1080 1510 L1080 1920 Z" fill="#020617"/>
      </svg>
    `)}`
  },
  {
    id: 'emerald_mist',
    nameId: 'Hutan',
    nameEn: 'Forest',
    colorPreview: 'from-slate-950 via-emerald-950 to-teal-950',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
        <defs>
          <linearGradient id="emeraldSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#021f15"/>
            <stop offset="40%" stop-color="#062e22"/>
            <stop offset="80%" stop-color="#064e3b"/>
            <stop offset="100%" stop-color="#022c22"/>
          </linearGradient>
          <radialGradient id="emeraldGlow" cx="50%" cy="40%" r="50%">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
            <stop offset="70%" stop-color="#047857" stop-opacity="0.08"/>
            <stop offset="100%" stop-color="#021f15" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#emeraldSky)"/>
        <circle cx="540" cy="760" r="600" fill="url(#emeraldGlow)"/>
        <path d="M0 1920 L0 1480 Q270 1320 540 1430 T1080 1360 L1080 1920 Z" fill="#031d15" opacity="0.75"/>
        <path d="M0 1920 L0 1590 Q340 1460 680 1540 T1080 1490 L1080 1920 Z" fill="#01140e"/>
      </svg>
    `)}`
  },
  {
    id: 'warm_sunset',
    nameId: 'Senja',
    nameEn: 'Sunset',
    colorPreview: 'from-slate-950 via-rose-950 to-amber-950',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
        <defs>
          <linearGradient id="sunsetSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0f0c29"/>
            <stop offset="45%" stop-color="#302b63"/>
            <stop offset="75%" stop-color="#48183c"/>
            <stop offset="100%" stop-color="#7c2d12"/>
          </linearGradient>
          <radialGradient id="sunGlow" cx="50%" cy="70%" r="40%">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.5"/>
            <stop offset="50%" stop-color="#e11d48" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#0f0c29" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#sunsetSky)"/>
        <circle cx="540" cy="1340" r="450" fill="url(#sunGlow)"/>
        <path d="M0 1920 L0 1600 Q300 1480 580 1560 T1080 1510 L1080 1920 Z" fill="#180a14" opacity="0.85"/>
        <path d="M0 1920 L0 1680 Q320 1580 640 1640 T1080 1600 L1080 1920 Z" fill="#0b0409"/>
      </svg>
    `)}`
  },
  {
    id: 'deep_ocean',
    nameId: 'Laut',
    nameEn: 'Ocean',
    colorPreview: 'from-slate-950 via-sky-950 to-blue-950',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
        <defs>
          <linearGradient id="oceanSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#020d1a"/>
            <stop offset="50%" stop-color="#082847"/>
            <stop offset="85%" stop-color="#03456b"/>
            <stop offset="100%" stop-color="#021b30"/>
          </linearGradient>
          <radialGradient id="oceanGlow" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stop-color="#0284c7" stop-opacity="0.35"/>
            <stop offset="70%" stop-color="#0369a1" stop-opacity="0.1"/>
            <stop offset="100%" stop-color="#020d1a" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#oceanSky)"/>
        <circle cx="540" cy="960" r="650" fill="url(#oceanGlow)"/>
        <path d="M0 1920 L0 1540 Q250 1400 520 1500 T1080 1430 L1080 1920 Z" fill="#011224" opacity="0.8"/>
        <path d="M0 1920 L0 1640 Q350 1520 700 1600 T1080 1540 L1080 1920 Z" fill="#010912"/>
      </svg>
    `)}`
  },
  {
    id: 'minimalist_obsidian',
    nameId: 'Hitam',
    nameEn: 'Dark',
    colorPreview: 'from-neutral-950 via-zinc-900 to-stone-950',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
        <defs>
          <linearGradient id="obsidian" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#09090b"/>
            <stop offset="40%" stop-color="#18181b"/>
            <stop offset="70%" stop-color="#111113"/>
            <stop offset="100%" stop-color="#09090b"/>
          </linearGradient>
          <radialGradient id="softLight" cx="50%" cy="30%" r="60%">
            <stop offset="0%" stop-color="#3f3f46" stop-opacity="0.25"/>
            <stop offset="100%" stop-color="#09090b" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#obsidian)"/>
        <circle cx="540" cy="576" r="700" fill="url(#softLight)"/>
        <!-- Geometric architectural lines -->
        <line x1="0" y1="400" x2="1080" y2="700" stroke="#27272a" stroke-width="1.5" opacity="0.4"/>
        <line x1="0" y1="1200" x2="1080" y2="900" stroke="#27272a" stroke-width="1.5" opacity="0.4"/>
        <line x1="0" y1="1600" x2="1080" y2="1750" stroke="#27272a" stroke-width="1.5" opacity="0.3"/>
      </svg>
    `)}`
  },
  {
    id: 'cosmic_violet',
    nameId: 'Ungu',
    nameEn: 'Violet',
    colorPreview: 'from-slate-950 via-purple-950 to-fuchsia-950',
    dataUrl: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
        <defs>
          <linearGradient id="violetSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#0d041c"/>
            <stop offset="50%" stop-color="#220738"/>
            <stop offset="85%" stop-color="#3b0764"/>
            <stop offset="100%" stop-color="#140224"/>
          </linearGradient>
          <radialGradient id="purpleGlow" cx="50%" cy="55%" r="50%">
            <stop offset="0%" stop-color="#c026d3" stop-opacity="0.4"/>
            <stop offset="60%" stop-color="#9333ea" stop-opacity="0.15"/>
            <stop offset="100%" stop-color="#0d041c" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <rect width="1080" height="1920" fill="url(#violetSky)"/>
        <circle cx="540" cy="1050" r="550" fill="url(#purpleGlow)"/>
        <circle cx="200" cy="300" r="2.5" fill="#ffffff" opacity="0.8"/>
        <circle cx="420" cy="180" r="1.8" fill="#ffffff" opacity="0.6"/>
        <circle cx="780" cy="260" r="2.4" fill="#ffffff" opacity="0.75"/>
        <circle cx="910" cy="450" r="1.5" fill="#ffffff" opacity="0.5"/>
        <circle cx="310" cy="560" r="2" fill="#ffffff" opacity="0.65"/>
      </svg>
    `)}`
  }
];

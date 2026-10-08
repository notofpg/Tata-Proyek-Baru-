import React, { useMemo } from 'react';
import { motion } from 'motion/react';

interface OrganicStreakCanvasProps {
  day: number; // 0 to 365+
  isRaining: boolean;
  onCanvasClick?: (e: React.MouseEvent<SVGSVGElement>) => void;
  isDarkTheme?: boolean;
  isCoolTheme?: boolean;
}

export default function OrganicStreakCanvas({
  day,
  isRaining,
  onCanvasClick,
  isDarkTheme = false,
  isCoolTheme = false
}: OrganicStreakCanvasProps) {
  // Clamp day between 0 and 365
  const currentDay = Math.max(0, Math.min(365, day));

  // Evolution stage classification
  const isSeed = currentDay < 15;
  const isGrowingFlame = currentDay >= 15 && currentDay < 50;
  const isAscendingOrb = currentDay >= 50 && currentDay < 100;
  const isSunStage = currentDay >= 100;
  const isOneYearParadise = currentDay >= 360;

  // Tree stage on the right hillside
  const treeStage = useMemo<'none' | 'sprout' | 'sapling' | 'lush' | 'ancient' | 'paradise'>(() => {
    if (currentDay < 100) return 'none';
    if (currentDay < 140) return 'sprout';
    if (currentDay < 180) return 'sapling';
    if (currentDay < 270) return 'lush';
    if (currentDay < 360) return 'ancient';
    return 'paradise';
  }, [currentDay]);

  // Atmosphere elements
  const hasLake = currentDay >= 150;
  const hasRainbow = (currentDay >= 250 && !isRaining) || (isOneYearParadise && !isRaining);
  const hasButterflies = currentDay >= 180 && !isRaining;
  const hasWildflowers = currentDay >= 20;

  // Smooth continuous positioning of flame/sun
  const flamePos = useMemo(() => {
    if (isRaining) {
      // When raining/delayed (no tasks completed today), the flame is extinguished on the ground into cold ash & smoke
      return { x: 105, y: 164 };
    }
    if (currentDay < 50) {
      return { x: 105, y: 154 };
    }
    if (currentDay < 100) {
      const p = (currentDay - 50) / 50;
      return {
        x: 105 - p * 25,
        y: 154 - p * 102
      };
    }
    return { x: 80, y: 52 };
  }, [currentDay, isRaining]);

  return (
    <div className="relative w-full aspect-[16/10] max-h-[250px] rounded-2xl overflow-hidden border border-black/8 dark:border-white/10 shadow-sm select-none transition-all">
      <svg
        viewBox="0 0 400 240"
        className="w-full h-full cursor-pointer touch-none block"
        onClick={onCanvasClick}
      >
        <defs>
          {/* Sky Gradients */}
          <linearGradient id="skyParadise" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" />
            <stop offset="40%" stopColor="#38BDF8" />
            <stop offset="75%" stopColor="#BAE6FD" />
            <stop offset="100%" stopColor="#FEF08A" />
          </linearGradient>

          <linearGradient id="skySunny" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="55%" stopColor="#BAE6FD" />
            <stop offset="100%" stopColor="#FEF9C3" />
          </linearGradient>

          <linearGradient id="skyDawn" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7DD3FC" />
            <stop offset="60%" stopColor="#BAE6FD" />
            <stop offset="100%" stopColor="#FFEDD5" />
          </linearGradient>

          <linearGradient id="skyRain" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="60%" stopColor="#475569" />
            <stop offset="100%" stopColor="#64748B" />
          </linearGradient>

          <linearGradient id="skyNight" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="60%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>

          {/* Mountains & Hills */}
          <linearGradient id="mountGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6EE7B7" stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="hillBackGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isOneYearParadise ? '#34D399' : '#10B981'} />
            <stop offset="100%" stopColor={isOneYearParadise ? '#059669' : '#047857'} />
          </linearGradient>

          <linearGradient id="hillForeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isOneYearParadise ? '#10B981' : '#059669'} />
            <stop offset="100%" stopColor={isOneYearParadise ? '#047857' : '#065F46'} />
          </linearGradient>

          {/* Lake Gradient */}
          <linearGradient id="lakeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#0284C7" stopOpacity="0.9" />
          </linearGradient>

          {/* Sun disc & auras */}
          <linearGradient id="sunDiscGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          <radialGradient id="sunAuraGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FDE047" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
          </radialGradient>

          {/* Flame Radiant Auras & Shaders */}
          <radialGradient id="flameAmbientAura" cx="50%" cy="60%" r="50%">
            <stop offset="0%" stopColor="#F97316" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#EA580C" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#EA580C" stopOpacity="0" />
          </radialGradient>

          <linearGradient id="flameBodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF4500" />
            <stop offset="35%" stopColor="#EA580C" />
            <stop offset="70%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>

          <linearGradient id="flameMidGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="45%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#EA580C" />
          </linearGradient>

          <linearGradient id="flameCoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="45%" stopColor="#FEF08A" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>

          <linearGradient id="flameGlossGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </linearGradient>

          {/* Dying / Extinguished Flame Shaders (Kondisi Tertunda / Hujan) */}
          <linearGradient id="flameDyingBodyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4B5563" />
            <stop offset="40%" stopColor="#374151" />
            <stop offset="75%" stopColor="#1F2937" />
            <stop offset="100%" stopColor="#7F1D1D" />
          </linearGradient>

          <linearGradient id="flameDyingCoreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F87171" stopOpacity="0.75" />
            <stop offset="60%" stopColor="#DC2626" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0" />
          </linearGradient>

          <radialGradient id="smokePuffGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#E2E8F0" stopOpacity="0.75" />
            <stop offset="55%" stopColor="#94A3B8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#64748B" stopOpacity="0" />
          </radialGradient>

          {/* Rainbow */}
          <linearGradient id="rainbowGradClean" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#F43F5E" stopOpacity="0.6" />
            <stop offset="25%" stopColor="#F59E0B" stopOpacity="0.65" />
            <stop offset="50%" stopColor="#10B981" stopOpacity="0.65" />
            <stop offset="75%" stopColor="#06B6D4" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.6" />
          </linearGradient>

          {/* Tree Shaders */}
          <linearGradient id="treeTrunkGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="50%" stopColor="#92400E" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>

          <linearGradient id="treeCanopyEmerald" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6EE7B7" />
            <stop offset="50%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          <linearGradient id="treeCanopyGolden" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="40%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#10B981" />
          </linearGradient>
        </defs>

        {/* 1. SKY */}
        <rect
          width="400"
          height="240"
          fill={
            isRaining
              ? 'url(#skyRain)'
              : isOneYearParadise
              ? 'url(#skyParadise)'
              : isSunStage
              ? 'url(#skySunny)'
              : isDarkTheme || isCoolTheme
              ? 'url(#skyNight)'
              : 'url(#skyDawn)'
          }
        />

        {/* 2. RAINBOW (Clean, Elegant, Subtle Arc) */}
        {hasRainbow && (
          <g opacity={isOneYearParadise ? '0.75' : '0.5'}>
            <path
              d="M 60 215 A 155 120 0 0 1 365 205"
              fill="none"
              stroke="url(#rainbowGradClean)"
              strokeWidth={isOneYearParadise ? '7' : '5'}
              strokeLinecap="round"
            />
          </g>
        )}

        {/* 3. DISTANT MOUNTAINS */}
        <path
          d="M -10 178 Q 70 148 150 165 T 300 152 T 410 170 L 410 240 L -10 240 Z"
          fill="url(#mountGrad)"
          opacity={isRaining ? '0.35' : '0.6'}
        />

        {/* 4. ROLLING HILLS */}
        {/* Back Hill */}
        <path
          d="M -10 190 Q 110 155 220 175 T 410 166 L 410 240 L -10 240 Z"
          fill="url(#hillBackGrad)"
          opacity="0.9"
        />

        {/* Fore Hill (Lush Greenery) */}
        <path
          d="M -10 180 Q 115 158 215 186 T 410 176 L 410 240 L -10 240 Z"
          fill="url(#hillForeGrad)"
        />

        {/* 5. LAKE (Right Valley Basin) */}
        {hasLake && (
          <g>
            <path
              d="M 265 204 C 295 196, 345 198, 410 210 L 410 240 L 250 240 C 255 222, 260 212, 265 204 Z"
              fill="url(#lakeGrad)"
            />
            {/* Water shimmer */}
            <motion.ellipse
              cx="335"
              cy="215"
              rx="18"
              ry="2"
              fill="#FFFFFF"
              animate={{ opacity: [0.3, 0.75, 0.3], scaleX: [0.9, 1.1, 0.9] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Swan or Water Lily */}
            {isOneYearParadise ? (
              /* Serene White Swan */
              <motion.g
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                transform="translate(325, 209)"
              >
                <path d="M 0 4 C 3 2, 11 2, 14 5 C 16 7, 11 9, 6 9 C 1 9, -2 7, 0 4 Z" fill="#FFFFFF" />
                <path d="M 2 5 C 2 2, 3 -1, 6 -1 C 7 -1, 7 0, 6 2" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                <circle cx="7" cy="-0.5" r="0.8" fill="#F59E0B" />
              </motion.g>
            ) : (
              /* Water Lily */
              <g transform="translate(330, 214)">
                <ellipse cx="0" cy="2" rx="5" ry="1.5" fill="#15803D" />
                <circle cx="0" cy="0" r="2.5" fill="#F43F5E" />
              </g>
            )}
          </g>
        )}

        {/* 6. WILDFLOWERS (Subtle, Clean Accents) */}
        {hasWildflowers && (
          <g opacity="0.85">
            <circle cx="50" cy="182" r="2.4" fill="#F43F5E" />
            <circle cx="58" cy="185" r="2" fill="#FBBF24" />
            <circle cx="150" cy="192" r="2.4" fill="#8B5CF6" />
            <circle cx="156" cy="194" r="1.8" fill="#FDE047" />
            {currentDay >= 100 && (
              <>
                <circle cx="230" cy="196" r="2.2" fill="#38BDF8" />
                <circle cx="236" cy="198" r="2" fill="#FBBF24" />
              </>
            )}
          </g>
        )}

        {/* 7. BUTTERFLIES */}
        {hasButterflies && (
          <motion.g
            animate={{
              x: [210, 225, 215, 210],
              y: [145, 135, 138, 145]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ellipse cx="0" cy="0" rx="3" ry="2" fill={isOneYearParadise ? '#38BDF8' : '#F43F5E'} transform="rotate(-20)" />
            <ellipse cx="4" cy="-1.5" rx="3" ry="2" fill={isOneYearParadise ? '#38BDF8' : '#F43F5E'} transform="rotate(20)" />
          </motion.g>
        )}

        {/* 8. TREE OF LIFE (Right Hill, Clean & Balanced) */}
        {treeStage !== 'none' && (
          <g transform="translate(305, 192)">
            {/* Sprout (100-139) */}
            {treeStage === 'sprout' && (
              <motion.g initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <path d="M 0 0 Q -2 -10 0 -16" stroke="#10B981" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M 0 -12 Q -6 -17 -8 -12 Q -4 -9 0 -12" fill="#34D399" />
                <path d="M 0 -14 Q 6 -19 8 -14 Q 4 -11 0 -14" fill="#10B981" />
              </motion.g>
            )}

            {/* Sapling (140-179) */}
            {treeStage === 'sapling' && (
              <g>
                <path d="M -2.5 0 Q -1 -15 -2.5 -30 Q 2.5 -30 2.5 0 Z" fill="url(#treeTrunkGrad)" />
                <circle cx="-7" cy="-36" r="13" fill="url(#treeCanopyEmerald)" />
                <circle cx="7" cy="-38" r="12" fill="url(#treeCanopyEmerald)" />
                <circle cx="0" cy="-45" r="14" fill="url(#treeCanopyEmerald)" />
              </g>
            )}

            {/* Lush Tree (180-269) */}
            {treeStage === 'lush' && (
              <g>
                <path d="M -5 0 C -3 -16 -8 -34 -10 -50 C -4 -42 0 -38 1 -38 C 5 -38 10 -44 12 -52 C 8 -34 4 -14 5 0 Z" fill="url(#treeTrunkGrad)" />
                <circle cx="-18" cy="-58" r="18" fill="url(#treeCanopyEmerald)" />
                <circle cx="18" cy="-60" r="17" fill="url(#treeCanopyEmerald)" />
                <circle cx="-4" cy="-72" r="22" fill="url(#treeCanopyGolden)" />
                <circle cx="10" cy="-68" r="20" fill="url(#treeCanopyEmerald)" />
                {/* Apples */}
                <circle cx="-9" cy="-56" r="2.6" fill="#F59E0B" />
                <circle cx="12" cy="-62" r="2.6" fill="#F59E0B" />
              </g>
            )}

            {/* Ancient Tree (270-359) */}
            {treeStage === 'ancient' && (
              <g>
                <path d="M -8 0 C -5 -18 -12 -42 -16 -62 C -6 -50 0 -45 2 -45 C 8 -45 14 -52 18 -64 C 12 -40 6 -16 8 0 Z" fill="url(#treeTrunkGrad)" />
                <circle cx="-22" cy="-74" r="24" fill="url(#treeCanopyEmerald)" />
                <circle cx="22" cy="-76" r="23" fill="url(#treeCanopyEmerald)" />
                <circle cx="-6" cy="-90" r="28" fill="url(#treeCanopyGolden)" />
                <circle cx="12" cy="-86" r="26" fill="url(#treeCanopyEmerald)" />
                <circle cx="0" cy="-70" r="20" fill="url(#treeCanopyGolden)" />
                {[-12, 4, 16, -2].map((x, i) => (
                  <circle key={i} cx={x} cy={-74 - i * 5} r="3" fill="#FEF08A" stroke="#F59E0B" strokeWidth="0.8" />
                ))}
              </g>
            )}

            {/* Paradise Tree (360-365 Days) */}
            {treeStage === 'paradise' && (
              <motion.g
                animate={{ rotate: [-0.4, 0.4, -0.4] }}
                transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                style={{ originX: '0px', originY: '0px' }}
              >
                {/* Soft ambient tree glow */}
                <circle cx="0" cy="-85" r="55" fill="url(#sunAuraGrad)" opacity="0.35" />

                {/* Trunk */}
                <path
                  d="M -12 0 C -8 -15 -14 -40 -18 -66 C -8 -54 0 -48 2 -48 C 8 -48 16 -56 20 -70 C 14 -42 8 -16 12 0 Z"
                  fill="url(#treeTrunkGrad)"
                />
                {/* Roots */}
                <path d="M -10 0 Q -16 2 -20 1" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />
                <path d="M 10 0 Q 16 2 20 1" stroke="#78350F" strokeWidth="2.2" strokeLinecap="round" />

                {/* Harmonious Golden Canopy */}
                <circle cx="-26" cy="-80" r="26" fill="url(#treeCanopyEmerald)" />
                <circle cx="26" cy="-82" r="25" fill="url(#treeCanopyEmerald)" />
                <circle cx="-10" cy="-100" r="32" fill="url(#treeCanopyGolden)" />
                <circle cx="14" cy="-96" r="30" fill="url(#treeCanopyGolden)" />
                <circle cx="0" cy="-76" r="24" fill="url(#treeCanopyEmerald)" />

                {/* 5 Golden Star Fruits */}
                {[
                  { x: -16, y: -82 },
                  { x: 16, y: -86 },
                  { x: 0, y: -108 },
                  { x: -22, y: -98 },
                  { x: 18, y: -102 }
                ].map((fruit, idx) => (
                  <motion.circle
                    key={idx}
                    cx={fruit.x}
                    cy={fruit.y}
                    r="3.5"
                    fill="#FEF08A"
                    stroke="#F59E0B"
                    strokeWidth="1.2"
                    animate={{ scale: [0.95, 1.15, 0.95] }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: idx * 0.4 }}
                  />
                ))}
              </motion.g>
            )}
          </g>
        )}

        {/* 9. CLOUDS (Positioned to not block the Sun) */}
        {!isOneYearParadise && (
          <g opacity={isRaining ? '0.9' : '0.65'}>
            <motion.g
              animate={{ x: [-4, 6, -4] }}
              transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ellipse cx="230" cy="38" rx="26" ry="11" fill={isRaining ? '#475569' : '#FFFFFF'} />
              <circle cx="220" cy="34" r="12" fill={isRaining ? '#475569' : '#FFFFFF'} />
              <circle cx="240" cy="32" r="11" fill={isRaining ? '#475569' : '#FFFFFF'} />
            </motion.g>
          </g>
        )}

        {/* 10. RAIN DROPS */}
        {isRaining && (
          <g stroke="#93C5FD" strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
            {[
              { x: 40, y: 60, l: 12, d: 0 },
              { x: 80, y: 110, l: 14, d: 0.15 },
              { x: 120, y: 75, l: 13, d: 0.3 },
              { x: 160, y: 125, l: 15, d: 0.45 },
              { x: 200, y: 70, l: 14, d: 0.1 },
              { x: 240, y: 100, l: 15, d: 0.25 },
              { x: 280, y: 80, l: 13, d: 0.4 },
              { x: 320, y: 120, l: 14, d: 0.2 }
            ].map((r, i) => (
              <motion.line
                key={i}
                x1={r.x}
                y1={r.y}
                x2={r.x - 2}
                y2={r.y + r.l}
                animate={{
                  y1: [r.y, r.y + 55],
                  y2: [r.y + r.l, r.y + r.l + 55],
                  opacity: [0.1, 0.9, 0]
                }}
                transition={{
                  duration: 0.75,
                  repeat: Infinity,
                  delay: r.d,
                  ease: 'linear'
                }}
              />
            ))}
          </g>
        )}

        {/* 10.5 ECLIPSED DORMANT SUN (When Day >= 100 and no tasks completed today) */}
        {isSunStage && isRaining && (
          <g transform="translate(80, 52)" opacity="0.55">
            {/* Eclipsed Solar Disc */}
            <circle cx="0" cy="0" r="26" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="32" stroke="#475569" strokeWidth="1" strokeDasharray="3 3" fill="none" />
            {/* Somber Closed Eyes & Gentle Curve */}
            <path d="M -8 -1 Q -5 -4 -2 -1" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M 2 -1 Q 5 -4 8 -1" stroke="#64748B" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            <path d="M -2 5 Q 0 4 2 5" stroke="#64748B" strokeWidth="1" strokeLinecap="round" fill="none" />
            {/* Rain Cloud obscuring solar disc */}
            <ellipse cx="6" cy="8" rx="24" ry="11" fill="#0F172A" opacity="0.85" />
            <circle cx="-5" cy="4" r="11" fill="#1E293B" opacity="0.85" />
            <circle cx="15" cy="5" r="9" fill="#1E293B" opacity="0.85" />
          </g>
        )}

        {/* 11. LIVING ENTITY: BENIH -> BARA -> MATAHARI */}
        <g transform={`translate(${flamePos.x}, ${flamePos.y})`}>
          {isRaining ? (
            /* KONDISI TERTUNDA / HUJAN: Api tidak hidup, makin kecil lalu mati total menjadi abu dingin & asap */
            <g>
              {/* Cold Wet Soil & Extinguished Charcoal Ash Bed */}
              <ellipse cx="0" cy="15" rx="22" ry="6" fill="#0B1120" opacity="0.85" />
              <ellipse cx="0" cy="13.5" rx="16" ry="4.5" fill="#1E293B" opacity="0.9" />
              <ellipse cx="0" cy="12" rx="11" ry="3" fill="#334155" opacity="0.8" />

              {/* Rain Ripple Puddle on Wet Ash */}
              <motion.ellipse
                cx="0"
                cy="13.5"
                rx="7"
                ry="2.2"
                fill="none"
                stroke="#38BDF8"
                strokeWidth="1.2"
                animate={{ rx: [3, 16], ry: [1, 4.5], opacity: [0.8, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />

              {/* Animated Rain Droplet Splashes hitting the extinguishing flame */}
              <motion.g
                animate={{ opacity: [0.3, 0.9, 0.3] }}
                transition={{ duration: 0.6, repeat: Infinity }}
              >
                <circle cx="-6" cy="10" r="1" fill="#60A5FA" opacity="0.7" />
                <circle cx="7" cy="9" r="1.2" fill="#60A5FA" opacity="0.8" />
                <circle cx="2" cy="12" r="0.8" fill="#93C5FD" opacity="0.7" />
              </motion.g>

              {/* Shrinking & Dying Flame Animation ("ga hidup makin kecil terus mati gitu") */}
              <motion.g
                animate={{
                  scale: [0.85, 0.5, 0.22, 0.05, 0, 0, 0, 0],
                  opacity: [1, 0.85, 0.45, 0.15, 0, 0, 0, 0],
                  y: [0, 4, 8, 11, 13, 13, 13, 13]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                  times: [0, 0.25, 0.5, 0.7, 0.78, 0.85, 0.95, 1],
                  ease: 'easeInOut'
                }}
              >
                {/* Sputtering Charcoal Shrunk Flame Body */}
                <path
                  d="M 0 -15 C 3.5 -8, 10 -2, 10 7 C 10 14, 5 18, 0 18 C -5 18, -10 14, -10 7 C -10 -2, -3.5 -8, 0 -15 Z"
                  fill="url(#flameDyingBodyGrad)"
                />

                {/* Dying Ember Core Spark */}
                <ellipse cx="0" cy="8.5" rx="3.5" ry="4.5" fill="url(#flameDyingCoreGrad)" />

                {/* Shivering Distressed Eyes (> <) and Trembling Mouth */}
                <path d="M -4.5 4 L -2.5 5.5 L -4.5 7" stroke="#CBD5E1" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M 4.5 4 L 2.5 5.5 L 4.5 7" stroke="#CBD5E1" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M -2 9.5 Q 0 8 2 9.5" stroke="#CBD5E1" strokeWidth="1" strokeLinecap="round" fill="none" />

                {/* Pale Freezing Cheeks */}
                <ellipse cx="-5.5" cy="7.5" rx="1.5" ry="0.9" fill="#93C5FD" opacity="0.65" />
                <ellipse cx="5.5" cy="7.5" rx="1.5" ry="0.9" fill="#93C5FD" opacity="0.65" />
              </motion.g>

              {/* Billowing Smoke & Steam Clouds as Flame Dies Out ("maka jadi asap itu") */}
              <motion.circle
                cx="0"
                cy="2"
                r="5"
                fill="url(#smokePuffGrad)"
                animate={{ y: [0, -38], x: [0, -6, 5], scale: [0.6, 3], opacity: [0.9, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
              />
              <motion.circle
                cx="4"
                cy="0"
                r="6"
                fill="url(#smokePuffGrad)"
                animate={{ y: [0, -48], x: [0, 8, -4], scale: [0.7, 3.4], opacity: [0.85, 0] }}
                transition={{ duration: 3.1, repeat: Infinity, delay: 0.7, ease: 'easeOut' }}
              />
              <motion.circle
                cx="-4"
                cy="3"
                r="4.5"
                fill="url(#smokePuffGrad)"
                animate={{ y: [0, -32], x: [0, -5, 3], scale: [0.5, 2.4], opacity: [0.8, 0] }}
                transition={{ duration: 2.2, repeat: Infinity, delay: 1.3, ease: 'easeOut' }}
              />
              <motion.circle
                cx="1"
                cy="-2"
                r="7"
                fill="url(#smokePuffGrad)"
                animate={{ y: [0, -54], x: [0, 3, -6], scale: [0.8, 4], opacity: [0.75, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, delay: 1.8, ease: 'easeOut' }}
              />

              {/* Steam Sizzle Text */}
              <motion.text
                x="0"
                y="-20"
                textAnchor="middle"
                fill="#CBD5E1"
                fontSize="7.5"
                fontWeight="bold"
                animate={{ opacity: [0.4, 0.95, 0.4] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              >
                pssshh... api padam jadi asap 💨
              </motion.text>
            </g>
          ) : (
            /* KONDISI AKTIF: Api hidup membara, rapih & indah sesuai milestone */
            <>
              {/* SEED (Hari 0 - 14) - Cute Benih Api Bersih & Rapih */}
              {isSeed && (
                <motion.g
                  animate={{ y: [0, -3.5, 0], scale: [1, 1.03, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {/* Ambient Ember Glow */}
                  <circle cx="0" cy="6" r="24" fill="url(#flameAmbientAura)" />

                  {/* Ground Moss & Sprout Base */}
                  <ellipse cx="0" cy="18" rx="16" ry="4" fill="#047857" opacity="0.6" />
                  <path d="M -6 17 C -12 15, -15 10, -10 8 C -6 9, -5 13, -6 17 Z" fill="#34D399" />
                  <path d="M 6 17 C 12 15, 15 10, 10 8 C 6 9, 5 13, 6 17 Z" fill="#10B981" />

                  {/* Sculpted Seed Flame Body */}
                  <path
                    d="M 0 -21 C 4.8 -12, 14 -3, 14 7.5 C 14 16.5, 7.8 21.5, 0 21.5 C -7.8 21.5, -14 16.5, -14 7.5 C -14 -3, -4.8 -12, 0 -21 Z"
                    fill="url(#flameBodyGrad)"
                  />

                  {/* Glossy Clay Highlight Rim */}
                  <path
                    d="M -3.5 -13 C -8 -7, -11 0, -11 7 C -11 13, -8 17.5, -4.5 19.5 C -7.5 17.5, -9.5 12.5, -9.5 7 C -9.5 1, -6.5 -6, -3.5 -13 Z"
                    fill="url(#flameGlossGrad)"
                  />

                  {/* Mid Layer Flame Tongue */}
                  <path
                    d="M 0 -11 C 3.5 -5, 9 0, 9 8 C 9 14, 5 17.5, 0 17.5 C -5 17.5, -9 14, -9 8 C -9 0, -3.5 -5, 0 -11 Z"
                    fill="url(#flameMidGrad)"
                  />

                  {/* Glowing Luminous Core */}
                  <ellipse cx="0" cy="10.5" rx="4" ry="5.5" fill="url(#flameCoreGrad)" />

                  {/* Cute Expressive Face */}
                  <ellipse cx="-4.5" cy="7.5" rx="1.8" ry="2.2" fill="#18181B" />
                  <circle cx="-5.2" cy="6.6" r="0.7" fill="#FFFFFF" />
                  <ellipse cx="4.5" cy="7.5" rx="1.8" ry="2.2" fill="#18181B" />
                  <circle cx="3.8" cy="6.6" r="0.7" fill="#FFFFFF" />

                  {/* Rosy Blushing Cheeks */}
                  <ellipse cx="-8" cy="10.5" rx="2.2" ry="1.2" fill="#FB7185" opacity="0.7" />
                  <ellipse cx="8" cy="10.5" rx="2.2" ry="1.2" fill="#FB7185" opacity="0.7" />

                  {/* Sweet Smile */}
                  <path d="M -2.5 12 Q 0 14.5 2.5 12" stroke="#18181B" strokeWidth="1.3" strokeLinecap="round" fill="none" />

                  {/* Floating Embers */}
                  <motion.circle
                    cx="-8"
                    cy="0"
                    r="1.2"
                    fill="#FEF08A"
                    animate={{ y: [0, -20], opacity: [0.9, 0], scale: [1, 0.4] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.circle
                    cx="8"
                    cy="-6"
                    r="1"
                    fill="#FDE047"
                    animate={{ y: [0, -22], opacity: [0.9, 0], scale: [1, 0.3] }}
                    transition={{ duration: 2.2, repeat: Infinity, delay: 0.8, ease: 'easeOut' }}
                  />
                </motion.g>
              )}

              {/* GROWING FLAME (Hari 15 - 49) - Si Bara Kobaran Ceria */}
              {isGrowingFlame && (
                <motion.g
                  animate={{ y: [0, -4.5, 0], rotate: [-1.2, 1.2, -1.2] }}
                  transition={{ duration: 2.3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {/* Radiant Heat Aura */}
                  <circle cx="0" cy="6" r="32" fill="url(#flameAmbientAura)" />

                  {/* Main Outer Sculpted Flame */}
                  <path
                    d="M 0 -31 C 5 -19, 19 -11, 19 8 C 19 22, 11 29, 0 29 C -11 29, -19 22, -19 8 C -19 -11, -5 -19, 0 -31 Z"
                    fill="url(#flameBodyGrad)"
                  />

                  {/* Glossy Clay Highlight Rim */}
                  <path
                    d="M -5 -19 C -12 -10, -15 -1, -15 8 C -15 16, -11 22, -5 25 C -9 22, -12 16, -12 8 C -12 -1, -8 -10, -5 -19 Z"
                    fill="url(#flameGlossGrad)"
                  />

                  {/* Secondary dancing side flick */}
                  <path
                    d="M 12 -13 C 17 -7, 21 1, 19 8 C 17 11, 13 10, 11 5 Z"
                    fill="url(#flameMidGrad)"
                  />

                  {/* Mid Layer Flame Tongue */}
                  <path
                    d="M 0 -18 C 4 -8, 12 0, 12 11 C 12 19, 6 23.5, 0 23.5 C -6 23.5, -12 19, -12 11 C -12 0, -4 -8, 0 -18 Z"
                    fill="url(#flameMidGrad)"
                  />

                  {/* Bright Core */}
                  <ellipse cx="0" cy="12.5" rx="5.5" ry="7.5" fill="url(#flameCoreGrad)" />

                  {/* Lively Face */}
                  <ellipse cx="-5" cy="8" rx="2" ry="2.6" fill="#18181B" />
                  <circle cx="-5.8" cy="7" r="0.8" fill="#FFFFFF" />
                  <ellipse cx="5" cy="8" rx="2" ry="2.6" fill="#18181B" />
                  <circle cx="4.2" cy="7" r="0.8" fill="#FFFFFF" />

                  {/* Rosy Cheeks */}
                  <ellipse cx="-9.5" cy="11.5" rx="2.6" ry="1.4" fill="#FB7185" opacity="0.65" />
                  <ellipse cx="9.5" cy="11.5" rx="2.6" ry="1.4" fill="#FB7185" opacity="0.65" />

                  {/* Cheerful Smile */}
                  <path d="M -3 13.5 Q 0 17.5 3 13.5" stroke="#18181B" strokeWidth="1.4" strokeLinecap="round" fill="none" />

                  {/* Floating Dancing Embers */}
                  <motion.circle
                    cx="-12"
                    cy="-5"
                    r="1.4"
                    fill="#FEF08A"
                    animate={{ y: [0, -26], opacity: [0.95, 0], scale: [1, 0.4] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
                  />
                  <motion.circle
                    cx="11"
                    cy="-14"
                    r="1.2"
                    fill="#FDE047"
                    animate={{ y: [0, -24], opacity: [0.95, 0], scale: [1, 0.3] }}
                    transition={{ duration: 2.4, repeat: Infinity, delay: 0.9, ease: 'easeOut' }}
                  />
                  <motion.circle
                    cx="0"
                    cy="-22"
                    r="1"
                    fill="#FFFBEB"
                    animate={{ y: [0, -20], opacity: [0.85, 0], scale: [1, 0.2] }}
                    transition={{ duration: 1.6, repeat: Infinity, delay: 0.4, ease: 'easeOut' }}
                  />
                </motion.g>
              )}

              {/* ASCENDING ORB (Hari 50 - 99) - Bola Mentari Melayang */}
              {isAscendingOrb && (
                <motion.g
                  animate={{ scale: [1, 1.04, 1], y: [0, -2, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {/* Outer Radiant Heat Aura */}
                  <circle cx="0" cy="0" r="42" fill="url(#flameAmbientAura)" opacity="0.75" />
                  <circle cx="0" cy="0" r="28" fill="url(#sunAuraGrad)" opacity="0.9" />

                  {/* Outer Golden Ring Corona */}
                  <motion.circle
                    cx="0"
                    cy="0"
                    r="33"
                    stroke="#FBBF24"
                    strokeWidth="1.2"
                    strokeDasharray="4 4"
                    fill="none"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
                  />

                  {/* Sun Disc */}
                  <circle cx="0" cy="0" r="22" fill="url(#sunDiscGrad)" />
                  <circle cx="0" cy="0" r="22" stroke="#F59E0B" strokeWidth="1.2" fill="none" />

                  {/* Serene Smiling Face */}
                  <ellipse cx="-5.5" cy="-2" rx="1.8" ry="2.2" fill="#18181B" />
                  <circle cx="-6.2" cy="-2.8" r="0.6" fill="#FFFFFF" />
                  <ellipse cx="5.5" cy="-2" rx="1.8" ry="2.2" fill="#18181B" />
                  <circle cx="4.8" cy="-2.8" r="0.6" fill="#FFFFFF" />
                  <ellipse cx="-8.5" cy="1" rx="2" ry="1.2" fill="#FB7185" opacity="0.6" />
                  <ellipse cx="8.5" cy="1" rx="2" ry="1.2" fill="#FB7185" opacity="0.6" />
                  <path d="M -3.5 3.5 Q 0 7 3.5 3.5" stroke="#18181B" strokeWidth="1.4" strokeLinecap="round" fill="none" />
                </motion.g>
              )}

              {/* ETERNAL MENTARI / SUN (Hari 100+) - Sang Mentari Abadi */}
              {isSunStage && (
                <motion.g
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  {/* Outer Ambient Glow */}
                  <circle cx="0" cy="0" r={isOneYearParadise ? '68' : '54'} fill="url(#sunAuraGrad)" opacity="0.85" />

                  {/* Rotating Rays (Clean 12 Rays with rounded tips) */}
                  <motion.g
                    animate={{ rotate: 360 }}
                    transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
                  >
                    {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle) => (
                      <path
                        key={angle}
                        d="M -2.5 -27 L 0 -39 L 2.5 -27 Z"
                        fill="#FBBF24"
                        transform={`rotate(${angle})`}
                      />
                    ))}
                  </motion.g>

                  {/* Sun Body Disc */}
                  <circle cx="0" cy="0" r="26" fill="url(#sunDiscGrad)" />
                  <circle cx="0" cy="0" r="26" stroke="#F59E0B" strokeWidth="1.5" fill="none" />

                  {/* Gentle Smiling Eyes & Cheeks */}
                  <g>
                    <ellipse cx="-7.5" cy="-2" rx="2" ry="2.4" fill="#18181B" />
                    <circle cx="-8.3" cy="-2.8" r="0.7" fill="#FFFFFF" />
                    <ellipse cx="7.5" cy="-2" rx="2" ry="2.4" fill="#18181B" />
                    <circle cx="6.7" cy="-2.8" r="0.7" fill="#FFFFFF" />
                    <path d="M -4.5 5 Q 0 9.5 4.5 5" stroke="#18181B" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                    <circle cx="-12" cy="2.5" r="2.6" fill="#F43F5E" opacity="0.6" />
                    <circle cx="12" cy="2.5" r="2.6" fill="#F43F5E" opacity="0.6" />
                  </g>

                  {/* Crown for Sun at 1 Year */}
                  {isOneYearParadise && (
                    <g transform="translate(-10, -33)">
                      <path d="M 1 9 L 4 3 L 10 6 L 16 3 L 19 9 Z" fill="#FDE047" stroke="#D97706" strokeWidth="1.2" />
                      <circle cx="4" cy="3" r="1.2" fill="#EF4444" />
                      <circle cx="10" cy="6" r="1.4" fill="#3B82F6" />
                      <circle cx="16" cy="3" r="1.2" fill="#10B981" />
                    </g>
                  )}
                </motion.g>
              )}
            </>
          )}
        </g>
      </svg>
    </div>
  );
}

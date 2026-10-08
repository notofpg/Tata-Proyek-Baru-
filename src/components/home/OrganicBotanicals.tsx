import React from 'react';

/**
 * High quality handcrafted tactile botanical plant & tree illustration
 * Rendered using lightweight scalable vector graphics (SVG) with soft earthy gradients
 * matching the exact visual style in the reference image.
 */
export function OrganicPottedPlant({ className = "w-28 h-36" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 160 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 12px 16px rgba(50, 35, 20, 0.12))' }}
    >
      {/* Background Soft Shadow */}
      <ellipse cx="80" cy="198" rx="42" ry="8" fill="#422E1A" fillOpacity="0.18" />

      {/* Ceramic Pot */}
      {/* Pot Rim */}
      <path
        d="M48 138 C48 135, 112 135, 112 138 C112 142, 48 142, 48 138 Z"
        fill="#C9A381"
      />
      {/* Pot Body */}
      <path
        d="M50 139 C46 160, 48 184, 58 194 C68 200, 92 200, 102 194 C112 184, 114 160, 110 139 Z"
        fill="url(#potGradient)"
        stroke="#8A603E"
        strokeWidth="1.5"
      />
      {/* Pot Texture subtle band */}
      <path
        d="M52 152 C65 156, 95 156, 108 152"
        stroke="#7A5333"
        strokeWidth="1"
        strokeOpacity="0.4"
        strokeDasharray="2 2"
      />

      {/* Plant Stems */}
      <path
        d="M80 145 Q80 100, 78 50"
        stroke="#4A6546"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M79 110 Q60 85, 38 75"
        stroke="#4A6546"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M80 95 Q100 70, 122 62"
        stroke="#4A6546"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M79 125 Q105 105, 128 98"
        stroke="#4A6546"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M79 130 Q52 115, 30 112"
        stroke="#4A6546"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Leaves with multi-tone layers & natural veins */}
      
      {/* Top Center Leaf */}
      <g>
        <path
          d="M78 50 C68 32, 70 12, 78 5 C86 12, 88 32, 78 50 Z"
          fill="url(#leafTop)"
          stroke="#385338"
          strokeWidth="1.5"
        />
        <path d="M78 50 Q78 25, 78 8" stroke="#314B31" strokeWidth="1" />
        <path d="M78 35 Q73 28, 70 26" stroke="#314B31" strokeWidth="0.8" />
        <path d="M78 30 Q83 24, 86 22" stroke="#314B31" strokeWidth="0.8" />
      </g>

      {/* Upper Left Leaf */}
      <g>
        <path
          d="M38 75 C30 60, 32 40, 48 30 C58 42, 54 65, 38 75 Z"
          fill="url(#leafMidLeft)"
          stroke="#385338"
          strokeWidth="1.5"
        />
        <path d="M38 75 Q42 55, 48 30" stroke="#314B31" strokeWidth="1" />
        <path d="M42 62 Q36 54, 34 50" stroke="#314B31" strokeWidth="0.8" />
        <path d="M44 50 Q50 44, 52 40" stroke="#314B31" strokeWidth="0.8" />
      </g>

      {/* Upper Right Leaf */}
      <g>
        <path
          d="M122 62 C135 50, 142 32, 130 22 C115 28, 110 48, 122 62 Z"
          fill="url(#leafMidRight)"
          stroke="#385338"
          strokeWidth="1.5"
        />
        <path d="M122 62 Q125 42, 130 22" stroke="#314B31" strokeWidth="1" />
        <path d="M124 50 Q132 44, 136 40" stroke="#314B31" strokeWidth="0.8" />
        <path d="M123 38 Q118 34, 115 32" stroke="#314B31" strokeWidth="0.8" />
      </g>

      {/* Mid Right Leaf (Prominent) */}
      <g>
        <path
          d="M128 98 C144 90, 155 72, 148 58 C132 64, 120 82, 128 98 Z"
          fill="url(#leafRightLarge)"
          stroke="#385338"
          strokeWidth="1.5"
        />
        <path d="M128 98 Q138 78, 148 58" stroke="#314B31" strokeWidth="1" />
        <path d="M133 86 Q142 80, 147 75" stroke="#314B31" strokeWidth="0.8" />
        <path d="M136 74 Q130 68, 126 66" stroke="#314B31" strokeWidth="0.8" />
      </g>

      {/* Mid Left Leaf */}
      <g>
        <path
          d="M30 112 C18 100, 15 80, 26 68 C38 78, 38 98, 30 112 Z"
          fill="url(#leafLeftLarge)"
          stroke="#385338"
          strokeWidth="1.5"
        />
        <path d="M30 112 Q25 90, 26 68" stroke="#314B31" strokeWidth="1" />
        <path d="M28 98 Q22 90, 19 86" stroke="#314B31" strokeWidth="0.8" />
        <path d="M27 84 Q32 78, 35 74" stroke="#314B31" strokeWidth="0.8" />
      </g>

      {/* Gradients */}
      <defs>
        <linearGradient id="potGradient" x1="50" y1="140" x2="110" y2="195" gradientUnits="userSpaceOnUse">
          <stop stopColor="#D8A983" />
          <stop offset="0.5" stopColor="#BD8C64" />
          <stop offset="1" stopColor="#9C6B46" />
        </linearGradient>

        <linearGradient id="leafTop" x1="70" y1="10" x2="85" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#87A985" />
          <stop offset="0.6" stopColor="#648862" />
          <stop offset="1" stopColor="#4A6E48" />
        </linearGradient>

        <linearGradient id="leafMidLeft" x1="30" y1="35" x2="55" y2="75" gradientUnits="userSpaceOnUse">
          <stop stopColor="#93B490" />
          <stop offset="0.7" stopColor="#6C9069" />
          <stop offset="1" stopColor="#4F734C" />
        </linearGradient>

        <linearGradient id="leafMidRight" x1="110" y1="25" x2="135" y2="62" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7DA07A" />
          <stop offset="0.8" stopColor="#5B7E58" />
          <stop offset="1" stopColor="#456543" />
        </linearGradient>

        <linearGradient id="leafRightLarge" x1="120" y1="60" x2="150" y2="98" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8EB08B" />
          <stop offset="0.6" stopColor="#698C66" />
          <stop offset="1" stopColor="#4A6D47" />
        </linearGradient>

        <linearGradient id="leafLeftLarge" x1="15" y1="70" x2="38" y2="112" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7E9F7B" />
          <stop offset="0.7" stopColor="#5E815B" />
          <stop offset="1" stopColor="#476644" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Organic Growth Tree Emblem for Streak / Progress stats
 */
export function OrganicGrowthTree({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="24" cy="24" r="22" fill="#EAD9C6" fillOpacity="0.5" />
      {/* Trunk */}
      <path
        d="M24 38 L24 24 M24 28 L20 22 M24 26 L28 20"
        stroke="#7A5333"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Foliage / Organic Crown */}
      <path
        d="M24 8 C16 8 12 16 16 23 C14 28 20 31 24 30 C28 31 34 28 32 23 C36 16 32 8 24 8 Z"
        fill="#5E8360"
        stroke="#456543"
        strokeWidth="1.2"
      />
      {/* Accent leaf highlights */}
      <circle cx="21" cy="16" r="2.5" fill="#88AD85" />
      <circle cx="27" cy="18" r="2" fill="#88AD85" />
    </svg>
  );
}

/**
 * Handcrafted Tactile Blooming Rose in Ceramic Pot for Ecy Mawar Theme
 * Featuring layered velvety rose petals, dewdrops, organic foliage, and soft warm rose gradients.
 */
export function OrganicBloomingRose({ className = "w-28 h-36" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 170 220"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 14px 20px rgba(225, 29, 72, 0.16))' }}
    >
      {/* Ground soft romantic shadow */}
      <ellipse cx="85" cy="208" rx="46" ry="9" fill="#881337" fillOpacity="0.14" />

      {/* Ceramic Blush Planter / Pot */}
      <ellipse cx="85" cy="154" rx="34" ry="5.5" fill="#FFE4E6" stroke="#FDA4AF" strokeWidth="1.2" />
      <path
        d="M52 154 C50 175, 54 195, 64 204 C73 210, 97 210, 106 204 C116 195, 120 175, 118 154 Z"
        fill="url(#potRoseGradient)"
        stroke="#FB7185"
        strokeWidth="1.5"
      />
      {/* Pot Decorative Golden Ribbon / Band */}
      <path
        d="M53 168 C66 172, 104 172, 117 168"
        stroke="#F43F5E"
        strokeWidth="1.5"
        strokeOpacity="0.4"
      />
      <circle cx="85" cy="170" r="2.5" fill="#F43F5E" fillOpacity="0.6" />

      {/* Botanical Stems */}
      {/* Main Rose Stem */}
      <path
        d="M85 155 Q83 115, 85 70"
        stroke="#3F623C"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      {/* Left Branch Stem to Rosebud */}
      <path
        d="M84 125 Q64 105, 48 85"
        stroke="#3F623C"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Right Branch Leaf Stem */}
      <path
        d="M85 110 Q108 98, 125 90"
        stroke="#3F623C"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* Lower Leaf Stems */}
      <path
        d="M84 138 Q58 132, 38 126"
        stroke="#3F623C"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M86 132 Q112 124, 132 118"
        stroke="#3F623C"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Botanical Foliage with Rich Veins */}
      {/* Lower Left Leaf */}
      <g>
        <path
          d="M38 126 C26 116, 25 98, 38 88 C49 98, 48 116, 38 126 Z"
          fill="url(#roseLeaf1)"
          stroke="#2E4A2C"
          strokeWidth="1.2"
        />
        <path d="M38 126 Q35 106, 38 88" stroke="#233A21" strokeWidth="1" />
        <path d="M36 112 Q30 106, 28 102" stroke="#233A21" strokeWidth="0.8" />
        <path d="M37 100 Q43 96, 45 92" stroke="#233A21" strokeWidth="0.8" />
      </g>

      {/* Lower Right Leaf */}
      <g>
        <path
          d="M132 118 C145 108, 148 90, 136 80 C124 90, 122 108, 132 118 Z"
          fill="url(#roseLeaf2)"
          stroke="#2E4A2C"
          strokeWidth="1.2"
        />
        <path d="M132 118 Q138 98, 136 80" stroke="#233A21" strokeWidth="1" />
        <path d="M134 104 Q142 98, 144 94" stroke="#233A21" strokeWidth="0.8" />
        <path d="M132 94 Q126 88, 124 86" stroke="#233A21" strokeWidth="0.8" />
      </g>

      {/* Mid Right Leaf */}
      <g>
        <path
          d="M125 90 C138 78, 142 60, 130 50 C116 58, 114 78, 125 90 Z"
          fill="url(#roseLeaf3)"
          stroke="#2E4A2C"
          strokeWidth="1.2"
        />
        <path d="M125 90 Q128 70, 130 50" stroke="#233A21" strokeWidth="1" />
      </g>

      {/* Tender Rosebud on Left */}
      <g>
        {/* Calyx sepals */}
        <path d="M48 85 Q42 74, 38 68 C42 68, 48 76, 48 85 Z" fill="#4B6E47" stroke="#2E4A2C" strokeWidth="0.8" />
        <path d="M48 85 Q54 74, 58 68 C54 68, 48 76, 48 85 Z" fill="#4B6E47" stroke="#2E4A2C" strokeWidth="0.8" />
        {/* Bud Petals */}
        <path
          d="M48 84 C40 76, 42 60, 48 54 C54 60, 56 76, 48 84 Z"
          fill="url(#roseBudGrad)"
          stroke="#E11D48"
          strokeWidth="1"
        />
        <path
          d="M46 76 C44 68, 48 60, 49 56"
          stroke="#FFE4E6"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>

      {/* ============================================================ */}
      {/* MAGNIFICENT BLOOMING ROSE (Main Centerpiece) */}
      {/* ============================================================ */}
      <g id="mainRoseFlower">
        {/* Rose Calyx Base */}
        <path d="M85 70 Q75 62, 70 54 C76 56, 83 62, 85 70 Z" fill="#3F623C" />
        <path d="M85 70 Q95 62, 100 54 C94 56, 87 62, 85 70 Z" fill="#3F623C" />

        {/* Outer Back Petals (Broad & Flared) */}
        <path
          d="M85 68 C62 68, 50 48, 54 34 C64 36, 78 48, 85 68 Z"
          fill="url(#roseOuterPetal1)"
          stroke="#E11D48"
          strokeWidth="1.2"
        />
        <path
          d="M85 68 C108 68, 120 48, 116 34 C106 36, 92 48, 85 68 Z"
          fill="url(#roseOuterPetal2)"
          stroke="#E11D48"
          strokeWidth="1.2"
        />
        <path
          d="M85 68 C68 76, 52 64, 52 50 C62 52, 76 60, 85 68 Z"
          fill="url(#roseOuterPetal3)"
          stroke="#E11D48"
          strokeWidth="1.2"
        />
        <path
          d="M85 68 C102 76, 118 64, 118 50 C108 52, 94 60, 85 68 Z"
          fill="url(#roseOuterPetal4)"
          stroke="#E11D48"
          strokeWidth="1.2"
        />

        {/* Mid-Layer Velvet Petals */}
        <path
          d="M58 46 C56 30, 72 20, 85 24 C78 35, 68 44, 58 46 Z"
          fill="url(#roseMidPetal1)"
          stroke="#BE123C"
          strokeWidth="1"
        />
        <path
          d="M112 46 C114 30, 98 20, 85 24 C92 35, 102 44, 112 46 Z"
          fill="url(#roseMidPetal2)"
          stroke="#BE123C"
          strokeWidth="1"
        />
        <path
          d="M62 56 C60 40, 80 32, 92 38 C84 48, 74 54, 62 56 Z"
          fill="url(#roseMidPetal3)"
          stroke="#E11D48"
          strokeWidth="1"
        />
        <path
          d="M108 56 C110 40, 90 32, 78 38 C86 48, 96 54, 108 56 Z"
          fill="url(#roseMidPetal4)"
          stroke="#E11D48"
          strokeWidth="1"
        />

        {/* Front Wrapping Petals (Soft Heart-Shaped Curve) */}
        <path
          d="M66 64 C64 48, 85 40, 104 48 C96 58, 82 66, 66 64 Z"
          fill="url(#roseFrontPetal1)"
          stroke="#BE123C"
          strokeWidth="1"
        />
        <path
          d="M104 64 C106 48, 85 40, 66 48 C74 58, 88 66, 104 64 Z"
          fill="url(#roseFrontPetal2)"
          stroke="#BE123C"
          strokeWidth="1"
        />

        {/* Inner Rose Heart Spiral (Tight Tender Swirl) */}
        <path
          d="M74 38 C72 28, 82 22, 90 25 C96 28, 96 36, 88 38 C80 40, 76 34, 78 30 C80 26, 86 26, 88 29"
          fill="url(#roseHeartSwirl)"
          stroke="#9F1239"
          strokeWidth="1.2"
        />

        {/* Dewdrop Glistening Accents */}
        <circle cx="70" cy="42" r="1.5" fill="#FFFFFF" fillOpacity="0.85" />
        <circle cx="98" cy="46" r="1.8" fill="#FFFFFF" fillOpacity="0.85" />
        <circle cx="82" cy="28" r="1.2" fill="#FFFFFF" fillOpacity="0.9" />

        {/* Golden Pollen Sparkle Accents Floating Gently */}
        <circle cx="58" cy="26" r="1" fill="#FBBF24" fillOpacity="0.8" />
        <circle cx="114" cy="24" r="1.2" fill="#FBBF24" fillOpacity="0.8" />
        <circle cx="86" cy="14" r="1.2" fill="#FDA4AF" fillOpacity="0.9" />
        <path d="M120 18 Q122 14, 126 16" stroke="#FDA4AF" strokeWidth="0.8" strokeLinecap="round" />
      </g>

      {/* Floating Gentle Petal Drift */}
      <path
        d="M136 142 C142 138, 146 144, 144 148 C140 152, 134 148, 136 142 Z"
        fill="url(#floatingPetalGrad)"
        stroke="#FB7185"
        strokeWidth="0.8"
        transform="rotate(15 140 145)"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(225, 29, 72, 0.2))' }}
      />
      <path
        d="M32 150 C38 146, 42 152, 40 156 C36 160, 30 156, 32 150 Z"
        fill="url(#floatingPetalGrad)"
        stroke="#FB7185"
        strokeWidth="0.8"
        transform="rotate(-25 36 153)"
        style={{ filter: 'drop-shadow(0 2px 4px rgba(225, 29, 72, 0.2))' }}
      />

      {/* Rich Color Gradients */}
      <defs>
        {/* Pot Gradient */}
        <linearGradient id="potRoseGradient" x1="55" y1="155" x2="115" y2="210" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.4" stopColor="#FFE4E6" />
          <stop offset="0.8" stopColor="#FECDD3" />
          <stop offset="1" stopColor="#FDA4AF" />
        </linearGradient>

        {/* Leaves Gradients */}
        <linearGradient id="roseLeaf1" x1="25" y1="90" x2="48" y2="126" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6E9A68" />
          <stop offset="0.7" stopColor="#4D7747" />
          <stop offset="1" stopColor="#365731" />
        </linearGradient>

        <linearGradient id="roseLeaf2" x1="120" y1="80" x2="145" y2="118" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7DA677" />
          <stop offset="0.7" stopColor="#55804F" />
          <stop offset="1" stopColor="#3A5C35" />
        </linearGradient>

        <linearGradient id="roseLeaf3" x1="115" y1="50" x2="140" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#87B081" />
          <stop offset="0.8" stopColor="#5B8755" />
          <stop offset="1" stopColor="#3E6139" />
        </linearGradient>

        {/* Rose Bud Gradient */}
        <linearGradient id="roseBudGrad" x1="42" y1="55" x2="52" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDA4AF" />
          <stop offset="0.5" stopColor="#F43F5E" />
          <stop offset="1" stopColor="#BE123C" />
        </linearGradient>

        {/* Petal Layer Gradients */}
        <linearGradient id="roseOuterPetal1" x1="52" y1="35" x2="85" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FECDD3" />
          <stop offset="0.5" stopColor="#FB7185" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>

        <linearGradient id="roseOuterPetal2" x1="118" y1="35" x2="85" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FECDD3" />
          <stop offset="0.5" stopColor="#FB7185" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>

        <linearGradient id="roseOuterPetal3" x1="52" y1="50" x2="85" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDA4AF" />
          <stop offset="0.6" stopColor="#F43F5E" />
          <stop offset="1" stopColor="#BE123C" />
        </linearGradient>

        <linearGradient id="roseOuterPetal4" x1="118" y1="50" x2="85" y2="70" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDA4AF" />
          <stop offset="0.6" stopColor="#F43F5E" />
          <stop offset="1" stopColor="#BE123C" />
        </linearGradient>

        <linearGradient id="roseMidPetal1" x1="60" y1="20" x2="85" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.5" stopColor="#FDA4AF" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>

        <linearGradient id="roseMidPetal2" x1="110" y1="20" x2="85" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.5" stopColor="#FDA4AF" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>

        <linearGradient id="roseMidPetal3" x1="62" y1="32" x2="90" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE4E6" />
          <stop offset="0.5" stopColor="#FB7185" />
          <stop offset="1" stopColor="#BE123C" />
        </linearGradient>

        <linearGradient id="roseMidPetal4" x1="108" y1="32" x2="80" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE4E6" />
          <stop offset="0.5" stopColor="#FB7185" />
          <stop offset="1" stopColor="#BE123C" />
        </linearGradient>

        <linearGradient id="roseFrontPetal1" x1="65" y1="42" x2="100" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.4" stopColor="#FECDD3" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>

        <linearGradient id="roseFrontPetal2" x1="105" y1="42" x2="70" y2="65" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.4" stopColor="#FECDD3" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>

        <linearGradient id="roseHeartSwirl" x1="75" y1="22" x2="95" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDA4AF" />
          <stop offset="0.4" stopColor="#F43F5E" />
          <stop offset="1" stopColor="#881337" />
        </linearGradient>

        <linearGradient id="floatingPetalGrad" x1="135" y1="140" x2="145" y2="150" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE4E6" />
          <stop offset="0.6" stopColor="#FDA4AF" />
          <stop offset="1" stopColor="#F43F5E" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Compact Multi-Petal Blooming Flower Blossom
 * Great for badges, buttons, cards, and header decoration in Ecy Rose theme.
 */
export function OrganicFlowerBlossom({ className = "w-6 h-6", glow = false }: { className?: string; glow?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={glow ? { filter: 'drop-shadow(0 2px 6px rgba(244, 63, 94, 0.4))' } : undefined}
    >
      {/* 5 Layered Blossom Petals */}
      {/* Top Petal */}
      <path
        d="M24 24 C20 16, 20 8, 24 6 C28 8, 28 16, 24 24 Z"
        fill="url(#blossomPetal1)"
        stroke="#FB7185"
        strokeWidth="1"
      />
      {/* Top-Right Petal */}
      <path
        d="M24 24 C31 18, 38 16, 41 19 C41 24, 35 28, 24 24 Z"
        fill="url(#blossomPetal2)"
        stroke="#FB7185"
        strokeWidth="1"
      />
      {/* Bottom-Right Petal */}
      <path
        d="M24 24 C33 26, 38 34, 36 38 C31 40, 26 34, 24 24 Z"
        fill="url(#blossomPetal3)"
        stroke="#FB7185"
        strokeWidth="1"
      />
      {/* Bottom-Left Petal */}
      <path
        d="M24 24 C22 34, 17 40, 12 38 C10 34, 15 26, 24 24 Z"
        fill="url(#blossomPetal4)"
        stroke="#FB7185"
        strokeWidth="1"
      />
      {/* Top-Left Petal */}
      <path
        d="M24 24 C13 28, 7 24, 7 19 C10 16, 17 18, 24 24 Z"
        fill="url(#blossomPetal5)"
        stroke="#FB7185"
        strokeWidth="1"
      />

      {/* Inner Tender Petal Highlights */}
      <circle cx="24" cy="24" r="6" fill="#F43F5E" fillOpacity="0.3" />
      <circle cx="24" cy="24" r="4" fill="url(#blossomCenter)" />

      {/* Golden Pistil Pollen Dots */}
      <circle cx="24" cy="24" r="2.2" fill="#F59E0B" />
      <circle cx="22" cy="22.5" r="0.7" fill="#FDE68A" />
      <circle cx="26" cy="23" r="0.7" fill="#FDE68A" />
      <circle cx="23.5" cy="25.5" r="0.7" fill="#FDE68A" />

      <defs>
        <linearGradient id="blossomPetal1" x1="20" y1="6" x2="26" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.6" stopColor="#FDA4AF" />
          <stop offset="1" stopColor="#F43F5E" />
        </linearGradient>
        <linearGradient id="blossomPetal2" x1="25" y1="16" x2="41" y2="23" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.6" stopColor="#FDA4AF" />
          <stop offset="1" stopColor="#F43F5E" />
        </linearGradient>
        <linearGradient id="blossomPetal3" x1="24" y1="24" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.6" stopColor="#FDA4AF" />
          <stop offset="1" stopColor="#F43F5E" />
        </linearGradient>
        <linearGradient id="blossomPetal4" x1="24" y1="24" x2="12" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.6" stopColor="#FDA4AF" />
          <stop offset="1" stopColor="#F43F5E" />
        </linearGradient>
        <linearGradient id="blossomPetal5" x1="24" y1="24" x2="7" y2="19" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.6" stopColor="#FDA4AF" />
          <stop offset="1" stopColor="#F43F5E" />
        </linearGradient>
        <radialGradient id="blossomCenter" cx="24" cy="24" r="4" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF3C7" />
          <stop offset="0.7" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#F59E0B" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/**
 * Gorgeous Tactile 3D Rose Flower for Floating Action Button (FAB)
 * Custom sculpted with layered blooming petals, pistil glow, and luminous rose gradients.
 */
export function OrganicFabRoseFlower({ className = "w-11 h-11" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: 'drop-shadow(0 3px 6px rgba(190, 18, 60, 0.45))' }}
    >
      {/* Outer Glow Halo */}
      <circle cx="32" cy="32" r="27" fill="url(#fabHaloGlow)" opacity="0.45" />

      {/* 2 Delicate Green Sepals Peeking Out Behind */}
      <path d="M32 32 Q14 20, 8 28 Q20 38, 32 32 Z" fill="#4B7247" stroke="#2F4C2C" strokeWidth="0.8" />
      <path d="M32 32 Q50 44, 56 36 Q44 26, 32 32 Z" fill="#4B7247" stroke="#2F4C2C" strokeWidth="0.8" />

      {/* Layer 1: Outer Flared Rose Petals (8 Directions) */}
      {/* Top Petal */}
      <path
        d="M32 32 C20 18, 24 6, 32 6 C40 6, 44 18, 32 32 Z"
        fill="url(#fabPetalGrad1)"
        stroke="#E11D48"
        strokeWidth="1"
      />
      {/* Top-Right Petal */}
      <path
        d="M32 32 C42 20, 52 14, 55 21 C56 29, 44 34, 32 32 Z"
        fill="url(#fabPetalGrad2)"
        stroke="#E11D48"
        strokeWidth="1"
      />
      {/* Right Petal */}
      <path
        d="M32 32 C46 24, 58 28, 58 36 C56 44, 44 40, 32 32 Z"
        fill="url(#fabPetalGrad1)"
        stroke="#E11D48"
        strokeWidth="1"
      />
      {/* Bottom-Right Petal */}
      <path
        d="M32 32 C44 44, 48 54, 41 57 C33 58, 28 46, 32 32 Z"
        fill="url(#fabPetalGrad2)"
        stroke="#E11D48"
        strokeWidth="1"
      />
      {/* Bottom Petal */}
      <path
        d="M32 32 C40 46, 36 58, 28 58 C20 56, 24 44, 32 32 Z"
        fill="url(#fabPetalGrad1)"
        stroke="#E11D48"
        strokeWidth="1"
      />
      {/* Bottom-Left Petal */}
      <path
        d="M32 32 C22 44, 12 50, 9 43 C8 35, 20 30, 32 32 Z"
        fill="url(#fabPetalGrad2)"
        stroke="#E11D48"
        strokeWidth="1"
      />
      {/* Left Petal */}
      <path
        d="M32 32 C18 40, 6 36, 6 28 C8 20, 20 24, 32 32 Z"
        fill="url(#fabPetalGrad1)"
        stroke="#E11D48"
        strokeWidth="1"
      />
      {/* Top-Left Petal */}
      <path
        d="M32 32 C20 20, 16 10, 23 7 C31 6, 36 18, 32 32 Z"
        fill="url(#fabPetalGrad2)"
        stroke="#E11D48"
        strokeWidth="1"
      />

      {/* Layer 2: Middle Velvet Petals (Cupped Wrapping Petals) */}
      <path
        d="M17 28 C15 17, 30 14, 39 19 C35 28, 25 33, 17 28 Z"
        fill="url(#fabPetalGradMid)"
        stroke="#BE123C"
        strokeWidth="0.9"
      />
      <path
        d="M47 36 C49 47, 34 50, 25 45 C29 36, 39 31, 47 36 Z"
        fill="url(#fabPetalGradMid)"
        stroke="#BE123C"
        strokeWidth="0.9"
      />
      <path
        d="M23 45 C14 43, 15 29, 24 23 C29 29, 29 40, 23 45 Z"
        fill="url(#fabPetalGradMid)"
        stroke="#BE123C"
        strokeWidth="0.9"
      />
      <path
        d="M41 19 C50 21, 49 35, 40 41 C35 35, 35 24, 41 19 Z"
        fill="url(#fabPetalGradMid)"
        stroke="#BE123C"
        strokeWidth="0.9"
      />

      {/* Layer 3: Inner Rosebud Spiral Heart */}
      <circle cx="32" cy="32" r="10" fill="url(#fabRoseHeartGrad)" stroke="#9F1239" strokeWidth="1" />
      <path
        d="M26 31 C25 26, 31 23, 36 24 C40 26, 40 32, 36 35 C31 38, 27 34, 28 30 C29 27, 34 27, 36 29 C37 31, 35 33, 33 33"
        stroke="#FFF1F2"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Golden Pistil Dewdrops & Sparkles */}
      <circle cx="32" cy="32" r="1.8" fill="#FBBF24" />
      <circle cx="29.5" cy="28.5" r="1" fill="#FEF08A" />
      <circle cx="35" cy="35" r="0.9" fill="#FEF08A" />

      {/* Dewdrops glistening on outer petal */}
      <circle cx="21" cy="18" r="1.3" fill="#FFFFFF" fillOpacity="0.9" />
      <circle cx="43" cy="45" r="1.1" fill="#FFFFFF" fillOpacity="0.9" />

      <defs>
        <radialGradient id="fabHaloGlow" cx="32" cy="32" r="27" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDA4AF" stopOpacity="0.8" />
          <stop offset="0.7" stopColor="#F43F5E" stopOpacity="0.3" />
          <stop offset="1" stopColor="#BE123C" stopOpacity="0" />
        </radialGradient>

        <linearGradient id="fabPetalGrad1" x1="20" y1="10" x2="44" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.45" stopColor="#FECDD3" />
          <stop offset="0.8" stopColor="#FB7185" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>

        <linearGradient id="fabPetalGrad2" x1="44" y1="12" x2="20" y2="50" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE4E6" />
          <stop offset="0.5" stopColor="#FDA4AF" />
          <stop offset="0.85" stopColor="#F43F5E" />
          <stop offset="1" stopColor="#BE123C" />
        </linearGradient>

        <linearGradient id="fabPetalGradMid" x1="20" y1="20" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF1F2" />
          <stop offset="0.4" stopColor="#FDA4AF" />
          <stop offset="0.75" stopColor="#FB7185" />
          <stop offset="1" stopColor="#E11D48" />
        </linearGradient>

        <radialGradient id="fabRoseHeartGrad" cx="32" cy="31" r="10" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FB7185" />
          <stop offset="0.5" stopColor="#E11D48" />
          <stop offset="1" stopColor="#881337" />
        </radialGradient>
      </defs>
    </svg>
  );
}



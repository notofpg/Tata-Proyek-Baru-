/**
 * Tata Subscription Plans - Single Source of Truth
 * 
 * Modul ini HANYA berisi data publik (tanpa rahasia/API key),
 * aman digunakan secara konsisten oleh frontend maupun backend.
 */

export interface TataPlan {
  id: string; // Canonical Plan ID
  name: string;
  price: number; // IDR
  tier: 'pro' | 'pro_max';
  durationDays: number | null; // null = Seumur Hidup (Lifetime)
  periodId: string;
  periodEn: string;
  descId: string;
  descEn: string;
  badgeId?: string;
  badgeEn?: string;
}

export const TATA_CANONICAL_PLANS: Record<string, TataPlan> = {
  promax_monthly: {
    id: 'promax_monthly',
    name: 'Tata Pro Max Bulanan',
    price: 29000,
    tier: 'pro_max',
    durationDays: 30,
    periodId: '/ bulan',
    periodEn: '/ month',
    descId: 'Masa aktif 30 hari + Tampilan Pro Max 3D.',
    descEn: '30-day Pro Max perks.'
  },
  promax_yearly: {
    id: 'promax_yearly',
    name: 'Tata Pro Max Tahunan',
    price: 149000,
    tier: 'pro_max',
    durationDays: 365,
    periodId: '/ tahun',
    periodEn: '/ year',
    badgeId: 'PALING POPULER',
    badgeEn: 'MOST POPULAR',
    descId: 'Masa aktif 365 hari. Akses penuh fitur flagship.',
    descEn: '365 days full flagship perks.'
  },
  promax_lifetime: {
    id: 'promax_lifetime',
    name: 'Tata Pro Max Seumur Hidup',
    price: 299000,
    tier: 'pro_max',
    durationDays: null,
    periodId: 'sekali bayar',
    periodEn: 'one-time',
    badgeId: 'MAHKOTA EMAS',
    badgeEn: 'GOLD CROWN',
    descId: 'Investasi terbaik seumur hidup! Hak akses tak terbatas.',
    descEn: 'Lifetime unlimited flagship access.'
  },
  pro_monthly: {
    id: 'pro_monthly',
    name: 'Tata Pro Bulanan',
    price: 19000,
    tier: 'pro',
    durationDays: 30,
    periodId: '/ bulan',
    periodEn: '/ month',
    descId: 'Masa aktif 30 hari. Bebas iklan & fleksibel.',
    descEn: '30-day ad-free access.'
  },
  pro_yearly: {
    id: 'pro_yearly',
    name: 'Tata Pro Tahunan',
    price: 99000,
    tier: 'pro',
    durationDays: 365,
    periodId: '/ tahun',
    periodEn: '/ year',
    badgeId: 'HEMAT 50%',
    badgeEn: 'SAVE 50%',
    descId: 'Masa aktif 365 hari. Sangat hemat harian.',
    descEn: '365 days ad-free.'
  },
  pro_lifetime: {
    id: 'pro_lifetime',
    name: 'Tata Pro Seumur Hidup',
    price: 199000,
    tier: 'pro',
    durationDays: null,
    periodId: 'sekali bayar',
    periodEn: 'one-time',
    badgeId: 'SEUMUR HIDUP',
    badgeEn: 'LIFETIME',
    descId: 'Akses selamanya tanpa biaya berkala.',
    descEn: 'Forever access, no renewals.'
  }
};

// Pemetaan alias lama agar kompatibel dengan sistem pembayaran sebelumnya
export const TATA_PLAN_ALIASES: Record<string, string> = {
  monthly: 'pro_monthly',
  yearly: 'pro_yearly',
  lifetime: 'pro_lifetime',
  pro: 'pro_yearly',
  pro_max: 'promax_lifetime'
};

/**
 * Mencari detail paket canonical berdasarkan ID atau alias.
 * Mengembalikan objek TataPlan jika ditemukan, atau null jika ID paket tidak dikenal.
 */
export function getCanonicalPlan(planId: string): TataPlan | null {
  if (!planId || typeof planId !== 'string') return null;
  const cleanId = planId.trim().toLowerCase();
  
  if (TATA_CANONICAL_PLANS[cleanId]) {
    return TATA_CANONICAL_PLANS[cleanId];
  }
  
  const resolvedAlias = TATA_PLAN_ALIASES[cleanId];
  if (resolvedAlias && TATA_CANONICAL_PLANS[resolvedAlias]) {
    return TATA_CANONICAL_PLANS[resolvedAlias];
  }
  
  return null;
}

export function isValidPlan(planId: string): boolean {
  return getCanonicalPlan(planId) !== null;
}

/**
 * Menghitung harga setelah diskon (persen atau nominal tetap)
 */
export function calculateDiscount(
  basePrice: number,
  discountType?: 'percent' | 'fixed',
  discountValue?: number
): {
  finalAmount: number;
  discountAmount: number;
} {
  if (!discountType || typeof discountValue !== 'number' || discountValue <= 0) {
    return { finalAmount: basePrice, discountAmount: 0 };
  }

  let discountAmount = 0;
  if (discountType === 'percent') {
    const validPct = Math.min(100, Math.max(0, discountValue));
    discountAmount = Math.round((basePrice * validPct) / 100);
  } else if (discountType === 'fixed') {
    discountAmount = Math.round(discountValue);
  }

  // Harga tidak boleh negatif.
  const finalAmount = Math.max(0, basePrice - discountAmount);
  return {
    finalAmount,
    discountAmount: basePrice - finalAmount
  };
}

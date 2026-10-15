export type Priority = 'Tinggi' | 'Sedang' | 'Rendah';

export type Mood = 'excellent' | 'good' | 'neutral' | 'bad' | 'terrible' | null;

export interface MoodEntry {
  date: string; // ISO date YYYY-MM-DD
  mood: Mood;
  note?: string;
}

export interface User {
  name: string;
  avatarUrl: string;
}

export type TataPlanType = 
  | 'monthly' | 'yearly' | 'lifetime' | 'pro' | 'pro_max' 
  | 'promax_monthly' | 'promax_yearly' | 'promax_lifetime' 
  | 'pro_monthly' | 'pro_yearly' | 'pro_lifetime' 
  | string;

export interface PaymentProof {
  provider: 'midtrans' | 'google_play' | 'promo_code';
  orderId: string;
  transactionId?: string;
  purchaseToken?: string;
  productId?: string;
}

export interface TataAccountTransaction {
  id: string;
  transactionId: string;
  amount: number;
  currency: string;
  planName: string;
  paymentMethod: string;
  paidAt: string; // ISO date
  status: 'success' | 'pending' | 'expired';
  orderId?: string;
  provider?: 'midtrans' | 'google_play' | 'promo_code';
}

export interface TataAccount {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isPremium: boolean;
  isBlocked?: boolean;
  blockedReason?: string | null;
  blockedAt?: string | null;
  isTrial?: boolean;
  trialUsed?: boolean;
  trialExpiresAt?: string | null; // ISO date string for 6-day trial
  premiumType?: 'monthly' | 'yearly' | 'lifetime' | 'pro' | 'pro_max' | 'pro_monthly' | 'pro_yearly' | 'pro_lifetime' | 'promax_monthly' | 'promax_yearly' | 'promax_lifetime' | 'free' | string;
  premiumExpiresAt?: string | null; // ISO date string or null for lifetime
  subscribedAt?: string;
  transactions: TataAccountTransaction[];
  lastLoginAt?: string;
  sessionToken?: string;
}

export interface Note {
  id: string;
  title: string;
  date: string; // ISO or formatted string for dummy
  updatedAt?: number;
  tags: string[];
  thumbnailUrl?: string;
  content: string;
  pinned?: boolean;
  isArchived?: boolean;
  isLocked?: boolean;
  reminder?: string; // ISO datetime string: YYYY-MM-DDTHH:mm
  sharedWithAI?: boolean;
}

export interface DisciplineMediaItem {
  id: string;
  name?: string;
  type: 'image' | 'video';
  url: string; // "indexeddb:tata_disc_media_<id>" or direct data url
  thumbnailUrl?: string; // fast thumbnail
  createdAt: string; // ISO string
  caption?: string;
  category?: 'before' | 'after' | 'milestone_1m' | 'milestone_6m' | 'milestone_1y' | 'custom';
  duration?: number; // seconds for video
  size?: number; // bytes
}

export interface DisciplineData {
  beforePhotoUrl?: string; // legacy single before photo
  afterPhotoUrl?: string; // legacy single after photo
  after1MonthPhotoUrl?: string;
  after6MonthsPhotoUrl?: string;
  after1YearPhotoUrl?: string;
  beforeMedia?: DisciplineMediaItem[]; // multi-photo & video support stored in IndexedDB
  afterMedia?: DisciplineMediaItem[]; // multi-photo & video support stored in IndexedDB
  startDate?: string;
  targetDate?: string;
  motivation?: string;
  reward?: string;
  punishment?: string;
  dailyCheckins?: string[];
  usedRestDates?: string[];
  milestones?: { id: string; title: string; completed: boolean }[];
  journeyLog?: { id: string; date: string; content: string }[];
  punishmentCompletedDates?: string[];
}

export interface Task {
  id: string;
  title: string;
  time: string;
  date: string; // 'Hari ini', 'Besok', etc or ISO date
  createdAt?: string;
  priority: Priority;
  completed: boolean;
  pinned?: boolean;
  repeat?: 'once' | 'daily';
  alarmTime?: string;
  completedDates?: string[];
  isDiscipline?: boolean;
  disciplineData?: DisciplineData;
  deleted?: boolean;
  deletedAt?: string;
}

export interface DebtItem {
  id: string;
  title: string;
  lender?: string;
  totalAmount: number;
  remainingAmount: number;
  installmentCount: number;
  paidInstallments: number;
  paymentFrequency: 'monthly' | 'weekly' | 'custom';
  installmentAmount: number;
  dueDate?: string;
  notes?: string;
  isPaidOff: boolean;
  createdAt: string;
}

export interface SavingsGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category?: string;
  emoji?: string;
  targetDate?: string;
  notes?: string;
  isCompleted?: boolean;
  createdAt: string;
  // Interest / Yield details
  instrumentType?: 'cash' | 'bank' | 'deposito' | 'reksadana' | 'obligasi' | 'emas' | 'p2p' | 'crypto' | 'lainnya';
  institutionName?: string;
  interestRate?: number; // % p.a. (e.g. 5.5)
  taxRate?: number; // % tax (e.g. 20 for bank/deposito, 10 for bonds, 0 for mutual funds)
  isCompound?: boolean; // compound interest
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  date: string;
  createdAt?: string;
  description: string;
  currency?: 'IDR' | 'USD';
  linkedDebtId?: string;
  installmentIndex?: number;
}

export interface PinHistoryEntry {
  id: string;
  hashedPin: string;
  startDate: string; // ISO date string or formatted date
  endDate: string | null; // ISO date string or null if currently active
}

import React from 'react';
import { 
  Home, 
  CheckCircle2, 
  Calendar, 
  FileText, 
  Settings, 
  Bot, 
  Wallet, 
  Bell, 
  Flame, 
  Plus, 
  RefreshCw,
  Search,
  CheckSquare,
  Clock,
  Sparkles,
  Camera,
  Calculator,
  Smile,
  Heart,
  Meh,
  Frown,
  Angry,
  Palette,
  Globe,
  Smartphone,
  Lock,
  ShieldCheck,
  Share2,
  HelpCircle,
  Info,
  Key,
  Volume2,
  Database,
  Download,
  Upload,
  Trash2,
  User,
  History,
  Gamepad2,
  Mail,
  Instagram,
  Crop,
  Shuffle,
  Check,
  Gift,
  QrCode
} from 'lucide-react';

export type LiteStickerVariant = 
  | 'home' 
  | 'tasks' 
  | 'calendar' 
  | 'search' 
  | 'notes' 
  | 'settings' 
  | 'ai' 
  | 'finance' 
  | 'bell' 
  | 'flame' 
  | 'plus' 
  | 'refresh'
  | 'camera'
  | 'calculator'
  | 'clock'
  | 'palette'
  | 'globe'
  | 'smartphone'
  | 'lock'
  | 'shield'
  | 'share'
  | 'help'
  | 'info'
  | 'heart'
  | 'key'
  | 'volume'
  | 'database'
  | 'download'
  | 'upload'
  | 'trash'
  | 'user'
  | 'history'
  | 'game'
  | 'mail'
  | 'instagram'
  | 'crop'
  | 'shuffle'
  | 'check'
  | 'gift'
  | 'qrcode'
  | 'sparkles'
  | 'mood-excellent'
  | 'mood-good'
  | 'mood-neutral'
  | 'mood-bad'
  | 'mood-terrible';

export type LiteStickerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LiteStickerIconProps {
  variant: LiteStickerVariant;
  size?: LiteStickerSize;
  active?: boolean;
  className?: string;
  customIcon?: React.ReactNode;
}

interface VariantStyle {
  bg: string;
  iconColor: string;
  shape: 'circle' | 'squircle';
  defaultIcon: React.ReactNode;
  activeGlow: string;
}

const VARIANT_CONFIGS: Record<LiteStickerVariant, VariantStyle> = {
  // WhatsApp inspired: Solid emerald green, dark green stroke, bold white contour
  home: {
    bg: 'bg-[#22c55e]',
    iconColor: 'text-[#052e16]',
    shape: 'squircle',
    defaultIcon: <Home className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(34,197,94,0.6)]'
  },
  // Tasks inspired: Sky blue, dark navy stroke, bold white contour
  tasks: {
    bg: 'bg-[#38bdf8]',
    iconColor: 'text-[#082f49]',
    shape: 'squircle',
    defaultIcon: <CheckCircle2 className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(56,189,248,0.6)]'
  },
  // Calendar / Calculator inspired: Bright blue, dark royal blue stroke, bold white contour
  calendar: {
    bg: 'bg-[#3b82f6]',
    iconColor: 'text-[#172554]',
    shape: 'squircle',
    defaultIcon: <Calendar className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(59,130,246,0.6)]'
  },
  // Clock inspired (from Jam in reference photo): Blue circle, dark blue hands
  clock: {
    bg: 'bg-[#60a5fa]',
    iconColor: 'text-[#1e3a8a]',
    shape: 'circle',
    defaultIcon: <Clock className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(96,165,250,0.6)]'
  },
  // Calculator inspired (from Kalkulator in reference photo): Indigo/Blue squircle
  calculator: {
    bg: 'bg-[#6366f1]',
    iconColor: 'text-[#1e1b4b]',
    shape: 'squircle',
    defaultIcon: <Calculator className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(99,102,241,0.6)]'
  },
  // Search / Notes: Amber / Golden yellow, dark brown stroke, bold white contour
  search: {
    bg: 'bg-[#f59e0b]',
    iconColor: 'text-[#451a03]',
    shape: 'squircle',
    defaultIcon: <Search className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(245,158,11,0.6)]'
  },
  notes: {
    bg: 'bg-[#fbbf24]',
    iconColor: 'text-[#451a03]',
    shape: 'squircle',
    defaultIcon: <FileText className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(251,191,36,0.6)]'
  },
  // Camera inspired (from Timestamp Camera in reference photo): Hot Pink / Magenta squircle
  camera: {
    bg: 'bg-[#f472b6]',
    iconColor: 'text-[#701a75]',
    shape: 'squircle',
    defaultIcon: <Camera className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(244,114,182,0.6)]'
  },
  // Settings: Pink / Rose squircle, dark magenta stroke, bold white contour
  settings: {
    bg: 'bg-[#ec4899]',
    iconColor: 'text-[#500724]',
    shape: 'squircle',
    defaultIcon: <Settings className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(236,72,153,0.6)]'
  },
  // AI Companion: Vivid Purple, dark purple stroke, bold white contour
  ai: {
    bg: 'bg-[#a855f7]',
    iconColor: 'text-[#3b0764]',
    shape: 'squircle',
    defaultIcon: <Bot className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(168,85,247,0.6)]'
  },
  // Finance / Wallet: Emerald, dark green stroke, bold white contour
  finance: {
    bg: 'bg-[#10b981]',
    iconColor: 'text-[#064e3b]',
    shape: 'squircle',
    defaultIcon: <Wallet className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(16,185,129,0.6)]'
  },
  // Bell / Notifications: Tangerine Orange, dark orange stroke, bold white contour
  bell: {
    bg: 'bg-[#f97316]',
    iconColor: 'text-[#431407]',
    shape: 'squircle',
    defaultIcon: <Bell className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(249,115,22,0.6)]'
  },
  // Flame Streak: Bright Orange, dark red stroke, bold white contour
  flame: {
    bg: 'bg-[#ea580c]',
    iconColor: 'text-[#450a0a]',
    shape: 'circle',
    defaultIcon: <Flame className="w-full h-full stroke-[2.7] fill-current" />,
    activeGlow: 'shadow-[0_0_14px_rgba(234,88,12,0.6)]'
  },
  // Plus / FAB: Emerald Green or Indigo
  plus: {
    bg: 'bg-[#22c55e]',
    iconColor: 'text-[#052e16]',
    shape: 'squircle',
    defaultIcon: <Plus className="w-full h-full stroke-[3]" />,
    activeGlow: 'shadow-[0_0_16px_rgba(34,197,94,0.7)]'
  },
  // Refresh: Cyan, dark cyan stroke, bold white contour
  refresh: {
    bg: 'bg-[#06b6d4]',
    iconColor: 'text-[#083344]',
    shape: 'circle',
    defaultIcon: <RefreshCw className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(6,182,212,0.6)]'
  },
  // Palette / Theme
  palette: {
    bg: 'bg-[#a855f7]',
    iconColor: 'text-[#3b0764]',
    shape: 'squircle',
    defaultIcon: <Palette className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(168,85,247,0.6)]'
  },
  // Globe / Language
  globe: {
    bg: 'bg-[#0ea5e9]',
    iconColor: 'text-[#082f49]',
    shape: 'squircle',
    defaultIcon: <Globe className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(14,165,233,0.6)]'
  },
  // Smartphone / Mode
  smartphone: {
    bg: 'bg-[#10b981]',
    iconColor: 'text-[#064e3b]',
    shape: 'squircle',
    defaultIcon: <Smartphone className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(16,185,129,0.6)]'
  },
  // Lock / Screen Lock
  lock: {
    bg: 'bg-[#f59e0b]',
    iconColor: 'text-[#451a03]',
    shape: 'squircle',
    defaultIcon: <Lock className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(245,158,11,0.6)]'
  },
  // Shield / Security
  shield: {
    bg: 'bg-[#22c55e]',
    iconColor: 'text-[#052e16]',
    shape: 'squircle',
    defaultIcon: <ShieldCheck className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(34,197,94,0.6)]'
  },
  // Share / Invite
  share: {
    bg: 'bg-[#ec4899]',
    iconColor: 'text-[#500724]',
    shape: 'squircle',
    defaultIcon: <Share2 className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(236,72,153,0.6)]'
  },
  // Help / FAQ
  help: {
    bg: 'bg-[#3b82f6]',
    iconColor: 'text-[#172554]',
    shape: 'squircle',
    defaultIcon: <HelpCircle className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(59,130,246,0.6)]'
  },
  // Info / About
  info: {
    bg: 'bg-[#6366f1]',
    iconColor: 'text-[#1e1b4b]',
    shape: 'squircle',
    defaultIcon: <Info className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(99,102,241,0.6)]'
  },
  // Heart / Dev Note
  heart: {
    bg: 'bg-[#f43f5e]',
    iconColor: 'text-[#4c0519]',
    shape: 'squircle',
    defaultIcon: <Heart className="w-full h-full stroke-[2.7] fill-current" />,
    activeGlow: 'shadow-[0_0_14px_rgba(244,63,94,0.6)]'
  },
  // Key / Security Key
  key: {
    bg: 'bg-[#eab308]',
    iconColor: 'text-[#422006]',
    shape: 'squircle',
    defaultIcon: <Key className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(234,179,8,0.6)]'
  },
  // Volume / Sound Effects
  volume: {
    bg: 'bg-[#f59e0b]',
    iconColor: 'text-[#451a03]',
    shape: 'squircle',
    defaultIcon: <Volume2 className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(245,158,11,0.6)]'
  },
  // Database / Backup
  database: {
    bg: 'bg-[#10b981]',
    iconColor: 'text-[#064e3b]',
    shape: 'squircle',
    defaultIcon: <Database className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(16,185,129,0.6)]'
  },
  // Download / Export
  download: {
    bg: 'bg-[#38bdf8]',
    iconColor: 'text-[#082f49]',
    shape: 'squircle',
    defaultIcon: <Download className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(56,189,248,0.6)]'
  },
  // Upload / Import
  upload: {
    bg: 'bg-[#14b8a6]',
    iconColor: 'text-[#042f2e]',
    shape: 'squircle',
    defaultIcon: <Upload className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(20,184,166,0.6)]'
  },
  // Trash / Delete / Reset
  trash: {
    bg: 'bg-[#f43f5e]',
    iconColor: 'text-[#4c0519]',
    shape: 'squircle',
    defaultIcon: <Trash2 className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(244,63,94,0.6)]'
  },
  // User / Profile
  user: {
    bg: 'bg-[#6366f1]',
    iconColor: 'text-[#1e1b4b]',
    shape: 'squircle',
    defaultIcon: <User className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(99,102,241,0.6)]'
  },
  // History / Logs
  history: {
    bg: 'bg-[#8b5cf6]',
    iconColor: 'text-[#2e1065]',
    shape: 'squircle',
    defaultIcon: <History className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(139,92,246,0.6)]'
  },
  // Game / Gamification
  game: {
    bg: 'bg-[#ec4899]',
    iconColor: 'text-[#500724]',
    shape: 'squircle',
    defaultIcon: <Gamepad2 className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(236,72,153,0.6)]'
  },
  // Mail / Developer
  mail: {
    bg: 'bg-[#f43f5e]',
    iconColor: 'text-[#4c0519]',
    shape: 'squircle',
    defaultIcon: <Mail className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(244,63,94,0.6)]'
  },
  // Instagram / Social
  instagram: {
    bg: 'bg-[#d946ef]',
    iconColor: 'text-[#4a044e]',
    shape: 'squircle',
    defaultIcon: <Instagram className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(217,70,239,0.6)]'
  },
  // Crop / Image Tools
  crop: {
    bg: 'bg-[#6366f1]',
    iconColor: 'text-[#1e1b4b]',
    shape: 'squircle',
    defaultIcon: <Crop className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(99,102,241,0.6)]'
  },
  // Shuffle / Scramble
  shuffle: {
    bg: 'bg-[#a855f7]',
    iconColor: 'text-[#3b0764]',
    shape: 'squircle',
    defaultIcon: <Shuffle className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(168,85,247,0.6)]'
  },
  // Checkmark
  check: {
    bg: 'bg-[#22c55e]',
    iconColor: 'text-[#052e16]',
    shape: 'circle',
    defaultIcon: <Check className="w-full h-full stroke-[3]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(34,197,94,0.6)]'
  },
  // Gift
  gift: {
    bg: 'bg-[#f472b6]',
    iconColor: 'text-[#701a75]',
    shape: 'squircle',
    defaultIcon: <Gift className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(244,114,182,0.6)]'
  },
  // QR Code
  qrcode: {
    bg: 'bg-[#0ea5e9]',
    iconColor: 'text-[#082f49]',
    shape: 'squircle',
    defaultIcon: <QrCode className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(14,165,233,0.6)]'
  },
  // Sparkles
  sparkles: {
    bg: 'bg-[#a855f7]',
    iconColor: 'text-[#3b0764]',
    shape: 'circle',
    defaultIcon: <Sparkles className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(168,85,247,0.6)]'
  },
  // Mood variants
  'mood-excellent': {
    bg: 'bg-[#4ade80]',
    iconColor: 'text-[#052e16]',
    shape: 'circle',
    defaultIcon: <Smile className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(74,222,128,0.6)]'
  },
  'mood-good': {
    bg: 'bg-[#2dd4bf]',
    iconColor: 'text-[#042f2e]',
    shape: 'circle',
    defaultIcon: <Heart className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(45,212,191,0.6)]'
  },
  'mood-neutral': {
    bg: 'bg-[#60a5fa]',
    iconColor: 'text-[#082f49]',
    shape: 'circle',
    defaultIcon: <Meh className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(96,165,250,0.6)]'
  },
  'mood-bad': {
    bg: 'bg-[#fb923c]',
    iconColor: 'text-[#431407]',
    shape: 'circle',
    defaultIcon: <Frown className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(251,146,60,0.6)]'
  },
  'mood-terrible': {
    bg: 'bg-[#f43f5e]',
    iconColor: 'text-[#4c0519]',
    shape: 'circle',
    defaultIcon: <Angry className="w-full h-full stroke-[2.7]" />,
    activeGlow: 'shadow-[0_0_14px_rgba(244,63,94,0.6)]'
  }
};

const SIZE_CONFIGS = {
  xs: {
    container: 'w-6 h-6 border-[1.5px]',
    icon: 'w-3.5 h-3.5',
    roundedSquircle: 'rounded-[8px]',
  },
  sm: {
    container: 'w-7 h-7 sm:w-8 sm:h-8 border-2',
    icon: 'w-4 h-4 sm:w-4.5 sm:h-4.5',
    roundedSquircle: 'rounded-xl',
  },
  md: {
    container: 'w-9 h-9 sm:w-10 sm:h-10 border-2',
    icon: 'w-5 h-5 sm:w-5.5 sm:h-5.5',
    roundedSquircle: 'rounded-2xl',
  },
  lg: {
    container: 'w-11 h-11 sm:w-12 sm:h-12 border-2',
    icon: 'w-6 h-6 sm:w-6.5 sm:h-6.5',
    roundedSquircle: 'rounded-2xl',
  },
  xl: {
    container: 'w-14 h-14 sm:w-16 sm:h-16 border-[2.5px]',
    icon: 'w-7 h-7 sm:w-8 sm:h-8',
    roundedSquircle: 'rounded-[1.25rem]',
  }
};

export function LiteStickerIcon({
  variant,
  size = 'md',
  active = false,
  className = '',
  customIcon
}: LiteStickerIconProps) {
  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.home;
  const sizeConfig = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;
  
  const shapeClass = config.shape === 'circle' ? 'rounded-full' : sizeConfig.roundedSquircle;
  const activeClass = active ? 'scale-105 opacity-100' : 'opacity-90 hover:opacity-100';

  return (
    <div
      className={`relative flex items-center justify-center shrink-0 select-none border-white shadow-[0_2px_5px_rgba(0,0,0,0.35)] transition-all duration-200 ${config.bg} ${config.iconColor} ${shapeClass} ${sizeConfig.container} ${activeClass} ${className}`}
    >
      <div className={`flex items-center justify-center ${sizeConfig.icon}`}>
        {customIcon || config.defaultIcon}
      </div>
    </div>
  );
}

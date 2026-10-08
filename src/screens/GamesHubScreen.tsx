import React from 'react';
import { ArrowLeft, Gamepad2, Grid3X3, Joystick, LayoutGrid, Brain, Zap } from 'lucide-react';
import { useAppStore } from '../store';
import { useTranslation } from '../translations';
import { getOrganicThemePalette } from '../components/home/organicThemePalettes';

export default function GamesHubScreen({ onSelectGame, onBack, appTheme }: { onSelectGame: (game: 'game' | 'tictactoe' | 'puzzle' | 'tetris' | 'memory' | 'space-invaders') => void, onBack: () => void, appTheme?: string }) {
  const { lang } = useAppStore();
  const t = useTranslation(lang);
  const palette = React.useMemo(() => {
    const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('tata_theme') : null;
    return getOrganicThemePalette(appTheme || storedTheme || 'dark');
  }, [appTheme]);

  return (
    <div className={`flex flex-col h-full ${palette.rootText}`}>
      <div className={`flex items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+1rem)] border-b shrink-0 transition-colors ${palette.headerBg} ${palette.headerBorder}`}>
        <button onClick={onBack} className={`p-2 rounded-full transition-colors cursor-pointer ${palette.subText} hover:${palette.titleText}`}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className={`font-bold text-lg flex items-center gap-2 ${palette.titleText}`}>
          <Joystick className="text-indigo-500" /> {t('gamesHubTitle')}
        </h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 content-start space-y-4 max-w-sm mx-auto w-full pt-8 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-12">
        <p className={`text-sm text-center mb-6 ${palette.subText}`}>{t('gamesHubDesc')}</p>
        
        {/* Stress Invaders - Highlighted Feature Game */}
        <button 
          onClick={() => onSelectGame('space-invaders')}
          className={`w-full border rounded-3xl p-4 flex items-center gap-4 hover:shadow-md transition-all active:scale-95 cursor-pointer ${palette.cardHero} ${palette.cardHeroBorder} hover:border-rose-500/50`}
        >
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-400 shrink-0 animate-pulse">
            <Zap size={24} />
          </div>
          <div className="flex flex-col text-left">
            <span className={`font-bold flex items-center gap-1.5 ${palette.titleText}`}>
              {t('spaceInvadersTitle')}
              <span className="bg-rose-500/10 text-rose-500 text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase">HOT</span>
            </span>
            <span className={`text-xs mt-0.5 ${palette.subText}`}>{t('spaceInvadersDesc')}</span>
          </div>
        </button>

        <button 
          onClick={() => onSelectGame('memory')}
          className={`w-full border rounded-3xl p-4 flex items-center gap-4 hover:shadow-md transition-all active:scale-95 cursor-pointer ${palette.cardHero} ${palette.cardHeroBorder} hover:border-indigo-500/50`}
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Brain size={24} />
          </div>
          <div className="flex flex-col text-left">
            <span className={`font-bold flex items-center gap-1.5 ${palette.titleText}`}>
              {t('memoryTitle')}
              <span className="bg-indigo-500/10 text-indigo-500 text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-widest uppercase">NEW</span>
            </span>
            <span className={`text-xs mt-0.5 ${palette.subText}`}>{t('memoryDesc')}</span>
          </div>
        </button>

        <button 
          onClick={() => onSelectGame('tetris')}
          className={`w-full border rounded-3xl p-4 flex items-center gap-4 hover:shadow-md transition-all active:scale-95 cursor-pointer ${palette.cardHero} ${palette.cardHeroBorder}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <LayoutGrid size={24} />
          </div>
          <div className="flex flex-col text-left">
            <span className={`font-bold ${palette.titleText}`}>{t('tetrisTitle')}</span>
            <span className={`text-xs mt-0.5 ${palette.subText}`}>{t('tetrisDesc')}</span>
          </div>
        </button>

        <button 
          onClick={() => onSelectGame('game')}
          className={`w-full border rounded-3xl p-4 flex items-center gap-4 hover:shadow-md transition-all active:scale-95 cursor-pointer ${palette.cardHero} ${palette.cardHeroBorder}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <Gamepad2 size={24} />
          </div>
          <div className="flex flex-col text-left">
            <span className={`font-bold ${palette.titleText}`}>{t('snakeTitle')}</span>
            <span className={`text-xs mt-0.5 ${palette.subText}`}>{t('snakeDesc')}</span>
          </div>
        </button>

        <button 
          onClick={() => onSelectGame('tictactoe')}
          className={`w-full border rounded-3xl p-4 flex items-center gap-4 hover:shadow-md transition-all active:scale-95 cursor-pointer ${palette.cardHero} ${palette.cardHeroBorder}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Grid3X3 size={24} />
          </div>
          <div className="flex flex-col text-left">
            <span className={`font-bold ${palette.titleText}`}>{t('tictactoeTitle')}</span>
            <span className={`text-xs mt-0.5 ${palette.subText}`}>{t('tictactoeDesc')}</span>
          </div>
        </button>

        <button 
          onClick={() => onSelectGame('puzzle')}
          className={`w-full border rounded-3xl p-4 flex items-center gap-4 hover:shadow-md transition-all active:scale-95 cursor-pointer ${palette.cardHero} ${palette.cardHeroBorder}`}
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <LayoutGrid size={24} />
          </div>
          <div className="flex flex-col text-left">
            <span className={`font-bold ${palette.titleText}`}>{t('slidingPuzzleTitle')}</span>
            <span className={`text-xs mt-0.5 ${palette.subText}`}>{t('slidingPuzzleDesc')}</span>
          </div>
        </button>
      </div>
    </div>
  );
}

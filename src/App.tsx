import React, { useState, useEffect, useMemo } from 'react';
import type { Note } from './types';
import { useAppStore } from './store';
import { useTranslation } from './translations';
import { safeReadStorage, safeWriteStorage } from './store-safety';

import HomeScreen from './screens/HomeScreen';
import TasksScreen from './screens/TasksScreen';
import CalendarScreen from './screens/CalendarScreen';
import NoteEditorScreen from './screens/NoteEditorScreen';
import SearchScreen from './screens/SearchScreen';
import SettingsScreen from './screens/SettingsScreen';
import OnboardingScreen from './screens/OnboardingScreen';
import FinanceScreen from './screens/FinanceScreen';
import AccountScreen from './screens/AccountScreen';
import AICompanionScreen from './screens/AICompanionScreen';
import GamesHubScreen from './screens/GamesHubScreen';
import GameScreen from './screens/GameScreen';
import TicTacToeScreen from './screens/TicTacToeScreen';
import PuzzleScreen from './screens/PuzzleScreen';
import TetrisScreen from './screens/TetrisScreen';
import MemoryGameScreen from './screens/MemoryGameScreen';
import SpaceInvadersScreen from './screens/SpaceInvadersScreen';
import type { SettingsSectionType } from './screens/SettingsScreen';
import { getOrganicThemePalette } from './components/home/organicThemePalettes';

export type ScreenItem =
  | 'home'
  | 'tasks'
  | 'search'
  | 'calendar'
  | 'finance'
  | 'settings'
  | 'note-editor'
  | 'game'
  | 'tictactoe'
  | 'puzzle'
  | 'tetris'
  | 'games-hub'
  | 'memory'
  | 'space-invaders'
  | 'ai-companion'
  | 'account';

export default function App() {
  const store = useAppStore();
  const {
    hasCompletedOnboarding,
    setHasCompletedOnboarding,
    lang,
    isUnlocked,
    setIsUnlocked,
  } = store;

  const t = useTranslation(lang);

  const appThemeInit = () => {
    const stored = safeReadStorage('tata_theme') as
      | 'dark'
      | 'light'
      | 'pink'
      | 'cool'
      | 'cute'
      | 'simple'
      | 'organic'
      | 'wallpaper'
      | null;
    const currentVersion = safeReadStorage('tata_app_version') || 'lite';
    const base = stored || 'dark';

    if (currentVersion === 'lite' && (base === 'organic' || base === 'wallpaper')) return 'dark';
    if (currentVersion !== 'organic' && currentVersion !== 'pro_max' && base === 'organic') return 'dark';
    if (currentVersion === 'organic' || currentVersion === 'pro_max') return base || 'organic';
    return base;
  };

  const [appTheme, setAppTheme] = useState<'dark' | 'light' | 'pink' | 'cool' | 'cute' | 'simple' | 'organic' | 'wallpaper'>(appThemeInit);
  const [currentScreen, setCurrentScreen] = useState<ScreenItem>('home');
  const [screenExtra, setScreenExtra] = useState<any>(null);
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSectionType>(null);

  useEffect(() => {
    safeWriteStorage('tata_theme', appTheme);
  }, [appTheme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const state = { screen: currentScreen, section: activeSettingsSection };
      window.history.replaceState(state, '', window.location.href);
    } catch (e) {
      console.warn('[Tata App] Failed to replace history state safely.', e);
    }
  }, [currentScreen, activeSettingsSection]);

  const palette = useMemo(() => getOrganicThemePalette(appTheme), [appTheme]);

  const navigate = (screen: ScreenItem, extra?: any) => {
    setCurrentScreen(screen);
    setScreenExtra(extra ?? null);
    setActiveSettingsSection(null);
  };

  const openNote = (note: Note) => {
    setCurrentScreen('note-editor');
    setScreenExtra(note);
  };

  const onBack = () => {
    setCurrentScreen('home');
    setScreenExtra(null);
    setActiveSettingsSection(null);
  };

  if (!hasCompletedOnboarding) {
    return <OnboardingScreen onFinish={() => setHasCompletedOnboarding(true)} />;
  }

  if (!isUnlocked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center">
          <div className="text-3xl font-black tracking-tight">Tata</div>
          <div className="mt-2 text-sm text-slate-400">{t('lockScreen') || 'Locked'}</div>
          <button
            type="button"
            onClick={() => setIsUnlocked(true)}
            className="mt-5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500"
          >
            {t('unlock') || 'Unlock'}
          </button>
        </div>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'tasks':
        return <TasksScreen appTheme={appTheme} onBack={onBack} onNavigate={navigate} extra={screenExtra} />;
      case 'calendar':
        return <CalendarScreen appTheme={appTheme} onBack={onBack} onNavigate={navigate} extra={screenExtra} />;
      case 'search':
        return <SearchScreen appTheme={appTheme} onOpenNote={openNote} onNavigate={navigate} />;
      case 'finance':
        return <FinanceScreen appTheme={appTheme} onBack={onBack} onNavigate={navigate} extra={screenExtra} />;
      case 'settings':
        return <SettingsScreen appTheme={appTheme} onBack={onBack} onNavigate={navigate} activeSection={activeSettingsSection} setActiveSection={setActiveSettingsSection} extra={screenExtra} />;
      case 'note-editor':
        return <NoteEditorScreen appTheme={appTheme} note={screenExtra ?? null} onBack={onBack} onNavigate={navigate} />;
      case 'account':
        return <AccountScreen appTheme={appTheme} onBack={onBack} onNavigate={navigate} />;
      case 'ai-companion':
        return <AICompanionScreen appTheme={appTheme} onBack={onBack} onNavigate={navigate} extra={screenExtra} />;
      case 'games-hub':
        return <GamesHubScreen appTheme={appTheme} onSelectGame={(game) => navigate(game as ScreenItem)} onBack={onBack} />;
      case 'game':
        return <GameScreen onBack={onBack} />;
      case 'tictactoe':
        return <TicTacToeScreen onBack={onBack} />;
      case 'puzzle':
        return <PuzzleScreen onBack={onBack} />;
      case 'tetris':
        return <TetrisScreen onBack={onBack} />;
      case 'memory':
        return <MemoryGameScreen onBack={onBack} />;
      case 'space-invaders':
        return <SpaceInvadersScreen onBack={onBack} />;
      default:
        return (
          <HomeScreen
            appTheme={appTheme}
            setAppTheme={setAppTheme}
            onOpenNote={openNote}
            onNavigate={navigate}
          />
        );
    }
  };

  return (
    <div className={`min-h-screen w-full ${palette.rootBg || 'bg-slate-950'} ${palette.rootText}`}>
      {renderScreen()}
    </div>
  );
}

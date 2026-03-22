import { useState, useCallback, useEffect } from 'react';
import { storage } from '@/lib/storage';

export type AppScreen = 'onboarding' | 'pin' | 'splash' | 'hub' | 'app';
export type ActiveApp = 'import' | 'design';

export function useAppState() {
  const [screen, setScreen] = useState<AppScreen>(() => {
    if (storage.isFirstLaunch()) return 'onboarding';
    return 'pin';
  });
  const [lang, setLangState] = useState<'fr' | 'en'>(storage.getLang());
  const [theme, setThemeState] = useState<'dark' | 'light'>(storage.getTheme());
  const [userName, setUserName] = useState(storage.getUser() || '');
  const [activeApp, setActiveApp] = useState<ActiveApp>('import');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const setLang = useCallback((l: 'fr' | 'en') => {
    storage.setLang(l);
    setLangState(l);
  }, []);

  const setTheme = useCallback((t: 'dark' | 'light') => {
    storage.setTheme(t);
    setThemeState(t);
  }, []);

  const completeOnboarding = useCallback(() => {
    setUserName(storage.getUser() || '');
    setScreen('pin');
  }, []);

  const unlockPin = useCallback(() => {
    setScreen('splash');
  }, []);

  const enterApp = useCallback(() => {
    setScreen('hub');
  }, []);

  const selectApp = useCallback((app: ActiveApp) => {
    setActiveApp(app);
    setScreen('app');
  }, []);

  const goToHub = useCallback(() => {
    setScreen('hub');
  }, []);

  return {
    screen, lang, theme, userName, activeApp,
    setLang, setTheme,
    completeOnboarding, unlockPin, enterApp,
    selectApp, goToHub,
    setUserName,
  };
}

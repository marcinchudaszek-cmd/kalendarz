import { useCallback, useEffect, useState } from 'react';
import { ThemeMode } from '../types';
import { loadTheme, saveTheme } from '../storage';

function applyTheme(mode: ThemeMode): void {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const dark = mode === 'dark' || (mode === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
}

export function useTheme(): [ThemeMode, (mode: ThemeMode) => void] {
  const [theme, setThemeState] = useState<ThemeMode>(() => loadTheme());

  useEffect(() => {
    applyTheme(theme);
    saveTheme(theme);

    if (theme !== 'system') return;
    // Przy ustawieniu „jak w systemie" reagujemy na zmianę motywu systemowego.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((mode: ThemeMode) => setThemeState(mode), []);

  return [theme, setTheme];
}

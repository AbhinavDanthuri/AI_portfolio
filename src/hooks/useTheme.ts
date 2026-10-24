import { useCallback, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const readExplicit = (): Theme | null => {
  const attr = document.documentElement.getAttribute('data-theme');
  return attr === 'light' || attr === 'dark' ? attr : null;
};

const systemTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';

/** Resolved theme for the page. Follows the OS until the visitor picks one. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readExplicit() ?? systemTheme());

  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: light)');
    const sync = () => setTheme(readExplicit() ?? systemTheme());
    mql.addEventListener('change', sync);
    // The host page (or another tab of code) may set data-theme too.
    const mo = new MutationObserver(sync);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => {
      mql.removeEventListener('change', sync);
      mo.disconnect();
    };
  }, []);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem('theme', next);
    } catch {
      /* storage can be unavailable; the choice still applies for this visit */
    }
    setTheme(next);
  }, [theme]);

  return { theme, toggle };
}

import { useSyncExternalStore, useCallback } from 'react';
import { t as translate, getLocale, setLocale as setI18nLocale, type Locale } from '@/lib/i18n';

const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return getLocale();
}

function getServerSnapshot() {
  return 'en' as Locale;
}

export function useI18n() {
  const locale = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    return translate(key, params);
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setI18nLocale(newLocale);
    listeners.forEach((l) => l());
  }, []);

  const getDocsUrl = useCallback(
    (path: string = '') => {
      const base = 'https://www.firsttx.store';
      if (path) {
        return `${base}/${locale}/docs/${path}`;
      }
      return `${base}/${locale}`;
    },
    [locale],
  );

  return { t, locale, setLocale, getDocsUrl };
}

export type { Locale };

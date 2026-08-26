'use client';

import { useSyncExternalStore } from 'react';

export type Language = 'th' | 'en' | 'zh-CN' | 'ja';

const LANGUAGE_KEY = 'institute-x:language';
const DEFAULT_LANGUAGE: Language = 'th';
const supportedLanguages: readonly Language[] = ['th', 'en', 'zh-CN', 'ja'];
const listeners = new Set<() => void>();

function isLanguage(value: string | null): value is Language {
  return supportedLanguages.includes(value as Language);
}

function readLanguage(): Language {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE;
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return isLanguage(stored) ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === LANGUAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function setAppLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // The selected language still applies to the current render when storage is unavailable.
  }
  document.documentElement.lang = language;
  listeners.forEach((listener) => listener());
}

export function useAppLanguage(): readonly [Language, (language: Language) => void] {
  const language = useSyncExternalStore(subscribe, readLanguage, () => DEFAULT_LANGUAGE);
  return [language, setAppLanguage] as const;
}

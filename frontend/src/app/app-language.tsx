'use client';

import { useEffect } from 'react';
import { useAppLanguage } from '../lib/language';

export default function AppLanguage() {
  const [language] = useAppLanguage();
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  return null;
}

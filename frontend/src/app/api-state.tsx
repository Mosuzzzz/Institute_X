'use client';

import { commonCopy } from '../lib/app-copy';
import { useAppLanguage } from '../lib/language';

export default function ApiState({ loading, error }: { loading: boolean; error: string | null }) {
  const [language] = useAppLanguage();
  const text = commonCopy[language];
  if (loading) return <section className="api-state" aria-live="polite"><span className="callback-spinner" aria-hidden="true" /><strong>{text.loading}</strong><p>{text.connecting}</p></section>;
  if (error) return <section className="api-state is-error" role="alert"><strong>{text.loadError}</strong><p>{error}</p><small>{text.retryHint}</small></section>;
  return null;
}

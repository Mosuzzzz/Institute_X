'use client';

import { commonCopy } from '../lib/app-copy';
import { useAppLanguage } from '../lib/language';

export default function ApiState({ loading, error }: { loading: boolean; error: string | null }) {
  const [language] = useAppLanguage();
  const text = commonCopy[language];

  const stateClasses =
    'grid min-h-[280px] place-content-center justify-items-center gap-2.5 border border-[#d8dde5] bg-surface p-10 text-center text-[#4f5b6b]';

  if (loading) {
    return (
      <section className={stateClasses} aria-live="polite">
        <span className="callback-spinner" aria-hidden="true" />
        <strong className="text-[1.1rem] text-[#202a38]">{text.loading}</strong>
        <p className="max-w-[520px] leading-[1.55]">{text.connecting}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`${stateClasses} border-l-4 border-l-[#ad424b]`} role="alert">
        <strong className="text-[1.1rem] text-[#8d3039]">{text.loadError}</strong>
        <p className="max-w-[520px] leading-[1.55]">{error}</p>
        <small className="text-[#7a8492]">{text.retryHint}</small>
      </section>
    );
  }

  return null;
}

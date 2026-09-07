'use client';

import { commonCopy } from '../lib/app-copy';
import { useAppLanguage } from '../lib/language';
import { commonUi } from './ui-styles';

export default function ApiState({ loading, error }: { loading: boolean; error: string | null }) {
  const [language] = useAppLanguage();
  const text = commonCopy[language];

  const stateClasses =
    'grid min-h-[280px] place-content-center justify-items-center gap-3 rounded-2xl border border-line bg-surface px-6 py-12 text-center text-muted shadow-[0_2px_10px_rgb(25_48_80_/_3%)]';

  if (loading) {
    return (
      <section className={stateClasses} role="status" aria-live="polite" aria-busy="true">
        <span className={commonUi.spinner} aria-hidden="true" />
        <strong className="text-[1.1rem] text-[#202a38]">{text.loading}</strong>
        <p className="max-w-[520px] leading-[1.55]">{text.connecting}</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className={`${stateClasses} border-l-4 border-l-[#ad424b]`} role="alert">
        <span className="mb-1 grid size-11 place-items-center rounded-full bg-[#fff1f2] text-xl font-medium text-[#8d3039]" aria-hidden="true">!</span>
        <strong className="text-[1.1rem] text-[#8d3039]">{text.loadError}</strong>
        <p className="max-w-[520px] leading-[1.55]">{error}</p>
        <small className="text-[#7a8492]">{text.retryHint}</small>
      </section>
    );
  }

  return null;
}

import type { Language } from '../../lib/language';
import { translateUi } from '../../lib/ui-translations';

export function formatSubmitted(value: string | null, language: Language = 'th') {
  return value ? new Date(value).toLocaleDateString(language, { day: '2-digit', month: 'short', year: 'numeric' }) : translateUi('Unknown', language);
}

export function formatWaiting(value: string | null, language: Language = 'th') {
  if (!value) return translateUi('Unknown', language);
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
  if (hours < 24) return translateUi('{count} hours', language, { count: hours });
  return translateUi('{count} days', language, { count: Math.floor(hours / 24) });
}

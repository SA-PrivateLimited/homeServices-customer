/**
 * First meaningful word from a provider display name for Call CTA labels.
 * Falls back to empty string when nothing usable is found.
 */
export function firstMeaningfulName(fullName?: string | null): string {
  const raw = String(fullName || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';
  const token = raw.split(' ')[0] || '';
  // Keep letters/digits (Latin + Devanagari); drop pure punctuation tokens.
  const cleaned = token.replace(/^[^A-Za-z0-9\u0900-\u097F]+|[^A-Za-z0-9\u0900-\u097F]+$/g, '');
  return cleaned;
}

export function callButtonLabel(
  fullName: string | null | undefined,
  t: (key: string, opts?: Record<string, unknown>) => unknown,
): string {
  const first = firstMeaningfulName(fullName);
  if (first) {
    const named = String(t('providers.callNamed', {name: first}) || '').trim();
    if (named && !named.includes('providers.callNamed')) {
      return named;
    }
    return `Call ${first}`;
  }
  return String(t('providers.call') || t('common.call') || 'Call');
}

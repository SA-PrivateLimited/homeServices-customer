/**
 * Provider phone from API only — never invent or mask a number on the client.
 */

export function providerPhoneFromApi(p?: {
  phone?: string | null;
  phoneNumber?: string | null;
}): string {
  return String(p?.phone || p?.phoneNumber || '').trim();
}

export function contactHintMessage(
  t: (key: string) => string,
  hint?: string | null,
  policy?: string | null,
): string {
  if (hint === 'waiting_acceptance') return t('contact.afterAccept');
  if (hint === 'inactive') return t('contact.inactive');
  if (hint === 'masked' || policy === 'MASKED') return t('contact.masked');
  if (policy === 'ACCEPTED_ONLY') return t('contact.afterAccept');
  if (policy === 'ACTIVE_REQUEST_ONLY') return t('contact.activeOnly');
  return t('contact.unavailableGeneric');
}

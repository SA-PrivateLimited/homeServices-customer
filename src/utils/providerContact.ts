/**
 * Provider phone from API only — never invent or mask a number on the client.
 */

export function providerPhoneFromApi(p?: {
  phone?: string | null;
  phoneNumber?: string | null;
  providerPhone?: string | null;
}): string {
  return String(p?.phone || p?.phoneNumber || p?.providerPhone || '').trim();
}

export function contactHintMessage(
  t: (key: string) => string,
  hint?: string | null,
  policy?: string | null,
): string {
  if (hint === 'waiting_acceptance') return t('providers.contactAfterAccept');
  if (hint === 'inactive') return t('providers.contactInactive');
  if (hint === 'masked' || policy === 'MASKED') return t('providers.contactMasked');
  if (policy === 'ACCEPTED_ONLY') return t('providers.contactAfterAccept');
  if (policy === 'ACTIVE_REQUEST_ONLY') return t('providers.contactActiveOnly');
  return t('providers.contactUnavailableGeneric');
}

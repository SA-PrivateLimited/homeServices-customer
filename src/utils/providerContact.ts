/**
 * Provider phone from API only — never invent or mask a number on the client.
 * Respects admin contact policy when the API provides it.
 */

export function providerPhoneFromApi(p?: {
  phone?: string | null;
  phoneNumber?: string | null;
  contactAvailable?: boolean;
}): string {
  if (p && p.contactAvailable === false) return '';
  return String(p?.phone || p?.phoneNumber || '').trim();
}

export function contactHintMessage(
  t: (key: string) => string,
  hint?: string | null,
  policy?: string | null,
): string {
  if (hint === 'waiting_acceptance') {
    return t('providers.contactAfterAccept') || t('contact.afterAccept') ||
      'सेवा अनुरोध स्वीकार होने के बाद आप सेवा प्रदाता से संपर्क कर सकते हैं।';
  }
  if (hint === 'inactive') {
    return t('providers.contactInactive') ||
      'इस अनुरोध के लिए सेवा प्रदाता का फ़ोन नंबर अब उपलब्ध नहीं है।';
  }
  if (hint === 'masked' || policy === 'MASKED') {
    return t('providers.contactMasked') ||
      'सीधे कॉल उपलब्ध नहीं है। सेवा अनुरोध भेजें।';
  }
  if (policy === 'ACCEPTED_ONLY') {
    return t('providers.contactAfterAccept') ||
      'सेवा अनुरोध स्वीकार होने के बाद आप सेवा प्रदाता से संपर्क कर सकते हैं।';
  }
  if (policy === 'ACTIVE_REQUEST_ONLY') {
    return t('providers.contactActiveOnly') ||
      'सेवा प्रदाता का फ़ोन नंबर केवल सक्रिय अनुरोध के दौरान दिखता है।';
  }
  return (
    t('providers.contactUnavailable') ||
    'सेवा प्रदाता से संपर्क अभी उपलब्ध नहीं है।'
  );
}

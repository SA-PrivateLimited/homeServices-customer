import {contactHintMessage, providerPhoneFromApi} from '../src/utils/providerContact';

describe('providerContact', () => {
  const t = (key: string) => key;

  it('uses only API phone fields', () => {
    expect(providerPhoneFromApi({phone: '+91111', phoneNumber: ''})).toBe(
      '+91111',
    );
    expect(providerPhoneFromApi({})).toBe('');
  });

  it('maps backend hint/policy to copy keys', () => {
    expect(contactHintMessage(t, 'waiting_acceptance', null)).toBe(
      'providers.contactAfterAccept',
    );
    expect(contactHintMessage(t, 'masked', null)).toBe(
      'providers.contactMasked',
    );
    expect(contactHintMessage(t, null, 'MASKED')).toBe(
      'providers.contactMasked',
    );
    expect(contactHintMessage(t, null, 'ACCEPTED_ONLY')).toBe(
      'providers.contactAfterAccept',
    );
    expect(contactHintMessage(t, null, 'ACTIVE_REQUEST_ONLY')).toBe(
      'providers.contactActiveOnly',
    );
    expect(contactHintMessage(t, 'inactive', null)).toBe(
      'providers.contactInactive',
    );
  });
});

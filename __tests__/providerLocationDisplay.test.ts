import {
  formatProviderLocationLine,
  formatProviderProfileAddressLine,
} from '../src/utils/addressDisplay';

describe('formatProviderLocationLine', () => {
  it('formats district, state, and pincode compactly', () => {
    expect(
      formatProviderLocationLine({
        address: {
          district: 'Garhwa',
          state: 'Jharkhand',
          pincode: '822114',
        },
      }),
    ).toBe('Garhwa, Jharkhand · 822114');
  });

  it('includes shared landmark/locality when present', () => {
    expect(
      formatProviderLocationLine({
        address: {
          landmark: 'Near Bus Stand',
          district: 'Garhwa',
          state: 'Jharkhand',
          pincode: '822114',
        },
      }),
    ).toBe('Near Bus Stand, Garhwa, Jharkhand · 822114');
  });

  it('falls back to district/state without fabricating pin', () => {
    expect(
      formatProviderLocationLine({
        address: {city: 'Garhwa', state: 'Jharkhand'},
      }),
    ).toBe('Garhwa, Jharkhand');
  });

  it('ignores empty/nullish parts', () => {
    expect(
      formatProviderLocationLine({
        address: {district: 'Garhwa', state: '', pincode: null},
      }),
    ).toBe('Garhwa');
  });
});

describe('formatProviderProfileAddressLine', () => {
  it('shows fuller shared street context on details', () => {
    expect(
      formatProviderProfileAddressLine({
        address: {
          address: 'Main Road',
          district: 'Garhwa',
          state: 'Jharkhand',
          pincode: '822114',
        },
      }),
    ).toContain('Main Road');
  });
});

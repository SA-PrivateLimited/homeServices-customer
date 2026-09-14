import {
  callButtonLabel,
  firstMeaningfulName,
} from '../src/utils/providerCallLabel';

describe('providerCallLabel', () => {
  it('extracts the first meaningful name token', () => {
    expect(firstMeaningfulName('Sandeep K Gupta')).toBe('Sandeep');
    expect(firstMeaningfulName('Subhash gupta')).toBe('Subhash');
    expect(firstMeaningfulName('Suresh Ram')).toBe('Suresh');
    expect(firstMeaningfulName('  Abid Ansari ')).toBe('Abid');
  });

  it('returns empty for missing/malformed names', () => {
    expect(firstMeaningfulName('')).toBe('');
    expect(firstMeaningfulName(null)).toBe('');
    expect(firstMeaningfulName('...')).toBe('');
  });

  it('builds Call {FirstName} labels with fallback', () => {
    const t = (key: string, opts?: Record<string, unknown>) => {
      if (key === 'providers.callNamed') return `Call ${opts?.name}`;
      if (key === 'providers.call') return 'Call';
      return key;
    };
    expect(callButtonLabel('Sandeep K Gupta', t)).toBe('Call Sandeep');
    expect(callButtonLabel('', t)).toBe('Call');
  });
});

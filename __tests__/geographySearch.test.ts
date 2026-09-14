import {
  GEOGRAPHY_SEARCH_DEBOUNCE_MS,
  filterLabeledOptions,
  foldSearchQuery,
} from '../src/utils/geographySearch';

describe('geographySearch', () => {
  const states = [
    {value: 'jh', label: 'Jharkhand'},
    {value: 'br', label: 'Bihar'},
    {value: 'up', label: 'Uttar Pradesh'},
  ];

  it('exports a 300–400ms debounce constant', () => {
    expect(GEOGRAPHY_SEARCH_DEBOUNCE_MS).toBeGreaterThanOrEqual(300);
    expect(GEOGRAPHY_SEARCH_DEBOUNCE_MS).toBeLessThanOrEqual(400);
  });

  it('folds queries case-insensitively', () => {
    expect(foldSearchQuery('  Jhar  ')).toBe('jhar');
  });

  it('filters by partial case-insensitive match', () => {
    expect(filterLabeledOptions(states, 'jh').map(s => s.label)).toEqual([
      'Jharkhand',
    ]);
    expect(filterLabeledOptions(states, 'BI').map(s => s.label)).toEqual([
      'Bihar',
    ]);
    expect(filterLabeledOptions(states, 'jhar').map(s => s.label)).toEqual([
      'Jharkhand',
    ]);
  });

  it('returns full list when query is empty', () => {
    expect(filterLabeledOptions(states, '   ')).toEqual(states);
  });

  it('returns empty array for nonexistent names', () => {
    expect(filterLabeledOptions(states, 'zzzz')).toEqual([]);
  });
});

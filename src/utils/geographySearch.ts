/**
 * Shared client-side filter for geography / labeled option lists.
 * Local filtering only — no API calls.
 */

export const GEOGRAPHY_SEARCH_DEBOUNCE_MS = 300;

export function foldSearchQuery(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function filterLabeledOptions<T extends {label: string; value?: string}>(
  options: T[],
  query: string,
): T[] {
  const q = foldSearchQuery(query);
  if (!q) return options;
  return options.filter(opt => {
    const label = foldSearchQuery(String(opt.label || ''));
    return label.includes(q);
  });
}

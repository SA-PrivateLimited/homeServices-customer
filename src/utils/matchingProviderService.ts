import type {Provider} from '../services/api/providersApi';
import {resolveServiceMeta} from '../services/serviceCatalog';

/** Service names the Customer is allowed to see for this Partner. */
export function visibleProviderServices(provider: Provider): string[] {
  const fromCustomerView = [
    provider.matchedService,
    ...(provider.serviceCategories || []),
  ].filter((name): name is string => Boolean(name && name.trim()));
  const names =
    fromCustomerView.length > 0
      ? fromCustomerView
      : [provider.specialization, provider.serviceType].filter(
          (name): name is string => Boolean(name && name.trim()),
        );
  const out: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const key = resolveServiceMeta(name).key || name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

const HOME_TRADE_KEYS = [
  'plumber',
  'electrician',
  'carpenter',
  'painter',
] as const;

/**
 * Customer results are service-contextual: show the searched service,
 * not every profession the same Partner offers.
 */
export function matchingProviderService(
  provider: Provider,
  selectedService?: string,
): string {
  const visible = visibleProviderServices(provider);
  const selected = String(selectedService || '').trim();
  if (selected) {
    const key = resolveServiceMeta(selected).key;
    const match = visible.find(
      (name) => resolveServiceMeta(name).key === key,
    );
    if (match) return match;
  } else {
    for (const trade of HOME_TRADE_KEYS) {
      const match = visible.find(
        (name) => resolveServiceMeta(name).key === trade,
      );
      if (match) return match;
    }
  }
  return provider.matchedService || visible[0] || '';
}

/**
 * Extra trades to show on unfiltered browse cards.
 * When the customer already picked a service, return none.
 */
export function otherVisibleProviderServices(
  provider: Provider,
  selectedService?: string,
): string[] {
  if (String(selectedService || '').trim()) return [];
  const visible = visibleProviderServices(provider);
  const shown = matchingProviderService(provider);
  const shownKey = resolveServiceMeta(shown).key || shown.toLowerCase();
  return visible.filter((name) => {
    const key = resolveServiceMeta(name).key || name.toLowerCase();
    return key !== shownKey;
  });
}

/**
 * Browse helpers on top of Admin-hydrated serviceCatalog.
 */

import {
  getFeaturedServiceKeys,
  getServiceCatalog,
  getServiceGroups,
  hydrateServiceCatalogFromApi,
  matchesServiceSearch,
  type ServiceMeta,
} from './serviceCatalog';

export type BrowseService = ServiceMeta;

export async function loadBrowseServices(
  options?: {force?: boolean},
): Promise<BrowseService[]> {
  return hydrateServiceCatalogFromApi(options);
}

export function popularBrowseServices(all: BrowseService[]): BrowseService[] {
  const keys = new Set(getFeaturedServiceKeys());
  const popular = all.filter((s) => keys.has(s.key) || s.isPopular);
  const list = popular.length ? popular : all.slice(0, 8);
  const priority = ['plumber', 'electrician'];
  return [...list].sort((a, b) => {
    const ai = priority.indexOf(a.key);
    const bi = priority.indexOf(b.key);
    if (ai !== -1 || bi !== -1) {
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    }
    return (a.order ?? 999) - (b.order ?? 999);
  });
}

export function groupBrowseServices(
  all: BrowseService[],
): Array<{key: string; titleHi: string; titleEn: string; items: BrowseService[]}> {
  // Prefer backend section order/titles; fall back to keys present on items.
  const groups = getServiceGroups().map((g) => ({
    key: g.key,
    titleHi: g.titleHi,
    titleEn: g.titleEn,
    items: all.filter((s) => (s.sectionKey || 'other') === g.key),
  }));
  if (groups.some((g) => g.items.length > 0)) {
    return groups.filter((g) => g.items.length > 0);
  }

  const map = new Map<
    string,
    {key: string; titleHi: string; titleEn: string; items: BrowseService[]}
  >();
  for (const s of all) {
    const key = s.sectionKey || 'other';
    const existing = map.get(key);
    if (existing) {
      existing.items.push(s);
      continue;
    }
    map.set(key, {
      key,
      titleEn: s.sectionTitleEn || key,
      titleHi: s.sectionTitleHi || s.sectionTitleEn || key,
      items: [s],
    });
  }
  return [...map.values()];
}

export function matchesBrowseSearch(
  service: BrowseService,
  query: string,
): boolean {
  return matchesServiceSearch(query, service);
}

export {getServiceCatalog, hydrateServiceCatalogFromApi};

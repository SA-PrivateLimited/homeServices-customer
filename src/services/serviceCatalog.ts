/**
 * Service catalog — Admin/backend is the source of truth.
 * Hydrate via hydrateServiceCatalogFromApi() (boot + browse).
 * Sync helpers keep working after hydrate; unknown names fall back gracefully.
 */

import {
  getServiceCategories,
  getServiceCategorySections,
  type ServiceCategory,
} from './api/serviceCategoriesApi';

export type AppLang = 'hi' | 'en';

export interface LocalizedText {
  hi: string;
  en: string;
}

export interface ServiceMeta {
  key: string;
  apiName: string;
  name: LocalizedText;
  description: LocalizedText;
  searchTerms: string[];
  isPopular?: boolean;
  sectionKey?: string;
  sectionTitleEn?: string;
  sectionTitleHi?: string;
  icon?: string;
  /** Admin-managed accent for Popular / browse cards. */
  color?: string;
  order?: number;
}

export interface ServiceSectionLabel {
  key: string;
  titleHi: string;
  titleEn: string;
  order?: number;
}

/** Filled from GET /serviceCategories/sections (backend SoT). */
export const SERVICE_SECTION_LABELS: ServiceSectionLabel[] = [];

/** Mutable catalog filled from Admin service categories. */
export const SERVICE_CATALOG: ServiceMeta[] = [];

const BY_KEY = new Map<string, ServiceMeta>();
const BY_ALIAS = new Map<string, ServiceMeta>();

let hydratePromise: Promise<ServiceMeta[]> | null = null;

function fold(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Catalog apiName stays for matching; English tiles should not say “Mistry”. */
export function friendlyEnglishServiceName(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return value;
  return value
    .replace(/\bTiles?\s+Mistry\b/gi, 'Tile mason')
    .replace(/\bMistry\b/gi, 'Mason');
}

function slug(value: string): string {
  return fold(value)
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\u0900-\u097f]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function registerAlias(alias: string, meta: ServiceMeta) {
  const key = fold(alias);
  if (key && !BY_ALIAS.has(key)) BY_ALIAS.set(key, meta);
}

function rebuildIndexes(list: ServiceMeta[]) {
  BY_KEY.clear();
  BY_ALIAS.clear();
  for (const meta of list) {
    BY_KEY.set(meta.key, meta);
    registerAlias(meta.key, meta);
    registerAlias(meta.key.replace(/_/g, ' '), meta);
    registerAlias(meta.apiName, meta);
    registerAlias(meta.name.en, meta);
    registerAlias(meta.name.hi, meta);
    for (const term of meta.searchTerms) {
      registerAlias(term, meta);
    }
  }
}

export function categoryToServiceMeta(cat: ServiceCategory): ServiceMeta {
  const apiName = String(cat.name || '').trim() || 'Service';
  // Prefer name slug so icon CSS / fallbacks (plumber, electrician, …) still match.
  // Fall back to Mongo id only when the name cannot be slugified.
  const id = String(cat._id || '').trim();
  const key = slug(apiName) || id || 'other';
  const nameHi = String(cat.nameHi || apiName).trim() || apiName;
  const sectionKey = String(cat.sectionKey || 'other').trim() || 'other';
  return {
    key,
    apiName,
    name: {en: friendlyEnglishServiceName(apiName), hi: nameHi},
    description: {
      en: String(cat.description || '').trim(),
      hi: String(cat.descriptionHi || cat.description || '').trim(),
    },
    searchTerms: Array.isArray(cat.searchTerms)
      ? cat.searchTerms.map((t) => String(t).trim()).filter(Boolean)
      : [],
    isPopular: Boolean(cat.isPopular),
    sectionKey,
    sectionTitleEn: String(cat.sectionLabelEn || '').trim() || undefined,
    sectionTitleHi: String(cat.sectionLabelHi || '').trim() || undefined,
    icon: cat.icon,
    color: String(cat.color || '').trim() || undefined,
    order: typeof cat.order === 'number' ? cat.order : 999,
  };
}

/** Replace in-memory catalog (tests + API hydrate). */
export function setServiceCatalog(next: ServiceMeta[]): ServiceMeta[] {
  const sorted = [...next]
    .filter((m) => m.key && m.apiName)
    .sort(
      (a, b) =>
        (a.order ?? 999) - (b.order ?? 999) ||
        a.apiName.localeCompare(b.apiName),
    );
  SERVICE_CATALOG.length = 0;
  SERVICE_CATALOG.push(...sorted);
  rebuildIndexes(SERVICE_CATALOG);
  return SERVICE_CATALOG;
}

export function setServiceSections(
  next: ServiceSectionLabel[],
): ServiceSectionLabel[] {
  const sorted = [...next]
    .filter((s) => s.key)
    .sort(
      (a, b) =>
        (a.order ?? 999) - (b.order ?? 999) || a.key.localeCompare(b.key),
    );
  SERVICE_SECTION_LABELS.length = 0;
  SERVICE_SECTION_LABELS.push(...sorted);
  return SERVICE_SECTION_LABELS;
}

export function getServiceCatalog(): ServiceMeta[] {
  return SERVICE_CATALOG;
}

export function getServiceSections(): ServiceSectionLabel[] {
  return SERVICE_SECTION_LABELS;
}

/** Load Admin service categories + section titles and make them the live catalog. */
export async function hydrateServiceCatalogFromApi(): Promise<ServiceMeta[]> {
  if (hydratePromise) return hydratePromise;
  hydratePromise = (async () => {
    try {
      const [rows, sections] = await Promise.all([
        getServiceCategories(),
        getServiceCategorySections().catch(() => []),
      ]);
      if (sections.length) {
        setServiceSections(
          sections.map((s) => ({
            key: s.key,
            titleEn: s.labelEn,
            titleHi: s.labelHi,
            order: s.order,
          })),
        );
      } else {
        // Derive section titles from enriched category payloads if sections call fails.
        const derived = new Map<string, ServiceSectionLabel>();
        for (const cat of rows) {
          const key = String(cat.sectionKey || 'other').trim() || 'other';
          if (derived.has(key)) continue;
          derived.set(key, {
            key,
            titleEn: cat.sectionLabelEn || key,
            titleHi: cat.sectionLabelHi || cat.sectionLabelEn || key,
          });
        }
        setServiceSections([...derived.values()]);
      }
      const metas = rows
        .filter((c) => c.isActive !== false)
        .map(categoryToServiceMeta);
      return setServiceCatalog(metas);
    } finally {
      hydratePromise = null;
    }
  })();
  return hydratePromise;
}

/** Popular services (Admin `isPopular`). */
export function getFeaturedServiceKeys(): string[] {
  const popular = SERVICE_CATALOG.filter((m) => m.isPopular).map((m) => m.key);
  if (popular.length) return popular;
  return SERVICE_CATALOG.slice(0, 8).map((m) => m.key);
}

/** All-services sections from backend section catalog + Admin `sectionKey`. */
export function getServiceGroups(): Array<{
  key: string;
  titleHi: string;
  titleEn: string;
  keys: string[];
}> {
  const sections =
    SERVICE_SECTION_LABELS.length > 0
      ? SERVICE_SECTION_LABELS
      : deriveSectionsFromCatalog();

  return sections
    .map((section) => ({
      key: section.key,
      titleHi: section.titleHi,
      titleEn: section.titleEn,
      keys: SERVICE_CATALOG.filter(
        (m) => (m.sectionKey || 'other') === section.key,
      ).map((m) => m.key),
    }))
    .filter((g) => g.keys.length > 0);
}

function deriveSectionsFromCatalog(): ServiceSectionLabel[] {
  const map = new Map<string, ServiceSectionLabel>();
  for (const meta of SERVICE_CATALOG) {
    const key = meta.sectionKey || 'other';
    if (map.has(key)) continue;
    map.set(key, {
      key,
      titleEn: meta.sectionTitleEn || key,
      titleHi: meta.sectionTitleHi || meta.sectionTitleEn || key,
    });
  }
  return [...map.values()];
}

function splitBilingualDisplay(raw: string): {hi: string; en: string} | null {
  const parts = raw.split(/\s*\/\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  const hi = parts.find((part) => /[\u0900-\u097F]/.test(part));
  const en = parts.find((part) => !/[\u0900-\u097F]/.test(part));
  if (hi && en) return {hi, en};
  return null;
}

function unknownMeta(raw: string, nameHi?: string): ServiceMeta {
  const trimmed = raw.trim();
  const split = splitBilingualDisplay(trimmed);
  return {
    key: slug(trimmed) || 'other',
    apiName: trimmed || 'Service',
    name: {
      hi: nameHi?.trim() || split?.hi || trimmed || 'सेवा',
      en: friendlyEnglishServiceName(split?.en || trimmed || 'Service'),
    },
    description: {hi: '', en: ''},
    searchTerms: [trimmed, nameHi || ''].filter(Boolean),
    sectionKey: 'other',
    isPopular: false,
  };
}

export function resolveServiceMeta(
  raw?: string | null,
  extras?: {nameHi?: string},
): ServiceMeta {
  const trimmed = (raw || '').trim();
  if (!trimmed) return unknownMeta('', extras?.nameHi);

  const folded = fold(trimmed);
  const fromKey = BY_KEY.get(folded) || BY_KEY.get(slug(trimmed));
  if (fromKey) return fromKey;

  const fromAlias = BY_ALIAS.get(folded);
  if (fromAlias) return fromAlias;

  if (extras?.nameHi) {
    const fromHi = BY_ALIAS.get(fold(extras.nameHi));
    if (fromHi) return fromHi;
  }

  return unknownMeta(trimmed, extras?.nameHi);
}

export function serviceSearchTerms(
  meta: ServiceMeta,
  extra: string[] = [],
): string[] {
  return [
    meta.key,
    meta.key.replace(/_/g, ' '),
    meta.apiName,
    meta.name.hi,
    meta.name.en,
    ...meta.searchTerms,
    ...extra,
  ].filter(Boolean);
}

export function matchesServiceSearch(
  query: string,
  meta: ServiceMeta,
  extra: string[] = [],
): boolean {
  const q = fold(query);
  if (!q) return true;
  return serviceSearchTerms(meta, extra).some((term) => fold(term).includes(q));
}

export function filterByServiceSearch<T>(
  items: T[],
  query: string,
  getRawName: (item: T) => string,
  extraTerms?: (item: T) => string[],
): T[] {
  const q = query.trim();
  if (!q) return items;
  return items.filter((item) =>
    matchesServiceSearch(
      q,
      resolveServiceMeta(getRawName(item)),
      extraTerms?.(item) || [],
    ),
  );
}

export function servicePrimaryName(
  raw: string | null | undefined,
  lang: AppLang,
  extras?: {nameHi?: string},
): string {
  const meta = resolveServiceMeta(raw, extras);
  return meta.name[lang] || meta.name.en;
}

export function serviceSecondaryName(
  raw: string | null | undefined,
  lang: AppLang,
  extras?: {nameHi?: string},
): string {
  const meta = resolveServiceMeta(raw, extras);
  const other = lang === 'hi' ? meta.name.en : meta.name.hi;
  const primary = meta.name[lang] || meta.name.en;
  return other && other !== primary ? other : '';
}

export function bilingualServiceNames(
  raw: string | null | undefined,
  lang: AppLang,
  extras?: {nameHi?: string},
): {primary: string; secondary: string} {
  return {
    primary: servicePrimaryName(raw, lang, extras),
    secondary: serviceSecondaryName(raw, lang, extras),
  };
}

export function bilingualProfessionLine(
  raw: string | null | undefined,
  extras?: {nameHi?: string},
): string {
  const meta = resolveServiceMeta(raw, extras);
  if (!meta.name.hi || meta.name.hi === meta.name.en) return meta.name.en;
  return `${meta.name.hi} / ${meta.name.en}`;
}

export function serviceDescription(
  raw: string | null | undefined,
  lang: AppLang,
  fallback?: string,
  extras?: {nameHi?: string; description?: string; descriptionHi?: string},
): string {
  const meta = resolveServiceMeta(raw, extras);
  const fromCatalog = meta.description[lang] || meta.description.hi;
  if (fromCatalog) return fromCatalog;
  if (lang === 'hi') {
    return extras?.descriptionHi || extras?.description || fallback || '';
  }
  return extras?.description || extras?.descriptionHi || fallback || '';
}

export function serviceSelectSearchText(
  raw: string | null | undefined,
  extras?: {nameHi?: string},
): string {
  return serviceSearchTerms(resolveServiceMeta(raw, extras)).join(' ');
}

export function findCatalogMatch(query: string): ServiceMeta | null {
  const q = query.trim();
  if (!q) return null;
  return SERVICE_CATALOG.find((meta) => matchesServiceSearch(q, meta)) || null;
}

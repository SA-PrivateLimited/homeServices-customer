/**
 * Service category icons from the API / RN use Material Icons hyphen names
 * (e.g. `electrical-services`). Material Symbols Outlined ligatures use
 * underscores (`electrical_services`). Invalid names render as giant text.
 */

/** When API stores a non-symbol (or unknown) name, map to a safe ligature. */
const ICON_ALIASES: Record<string, string> = {
  miscellaneous_services: 'category',
  miscellaneous: 'category',
  misc: 'category',
  more: 'more_horiz',
};

const CATEGORY_FALLBACKS: Record<string, string> = {
  plumber: 'plumbing',
  electrician: 'electrical_services',
  carpenter: 'carpenter',
  painter: 'format_paint',
  'ac repair': 'ac_unit',
  ac_repair: 'ac_unit',
  'cleaning service': 'cleaning_services',
  cleaning: 'cleaning_services',
  cleaner: 'cleaning_services',
  driver: 'directions_car',
  pest: 'bug_report',
  'pest control': 'bug_report',
  appliance: 'kitchen',
  appliance_repair: 'kitchen',
  mason: 'construction',
  welder: 'construction',
  gardener: 'yard',
  cook: 'restaurant',
  beautician: 'spa',
  car_mechanic: 'car_repair',
  'car mechanic': 'car_repair',
  bike_mechanic: 'two_wheeler',
  'bike mechanic': 'two_wheeler',
  'bike repair': 'two_wheeler',
  locksmith: 'vpn_key',
  'lock & key': 'vpn_key',
  pest_control: 'bug_report',
  florist: 'local_florist',
  flower: 'local_florist',
  event_decorator: 'celebration',
  decorator: 'celebration',
  car_rental: 'directions_car',
  'car rental': 'directions_car',
  car_wash: 'local_car_wash',
  'car wash': 'local_car_wash',
  bike_rental: 'two_wheeler',
  'bike rental': 'two_wheeler',
  tent: 'camping',
  'tent / shamiana': 'camping',
  shamiana: 'camping',
  water_tanker: 'water_drop',
  'water tanker': 'water_drop',
  photographer: 'photo_camera',
  photo: 'photo_camera',
  water_jar: 'water_bottle',
  'water jar': 'water_bottle',
  ice_supplier: 'ac_unit',
  ice: 'ac_unit',
  packed_water: 'local_drink',
  cold_drinks: 'liquor',
  roofer: 'roofing',
  flooring: 'layers',
  tiles_marble: 'grid_on',
  interior_designer: 'design_services',
  'interior design': 'design_services',
  interior: 'design_services',
  sim_supplier: 'sim_card',
  'sim supplier': 'sim_card',
  sim: 'sim_card',
  tiles_mistry: 'grid_on',
  'tiles mistry': 'grid_on',
  'tile mason': 'grid_on',
  handyman: 'handyman',
  other: 'category',
  landlord: 'home',
};

import {resolveServiceMeta} from '../services/serviceCatalog';

/** Hyphen / space Material names → underscore ligatures. */
export function toMaterialSymbolName(raw?: string | null): string {
  if (!raw || typeof raw !== 'string') return 'build';
  const trimmed = raw.trim();
  if (!trimmed) return 'build';

  // Already a valid-looking ligature
  const underscored = trimmed
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();

  // Reject empty / pure punctuation
  if (!/^[a-z][a-z0-9_]*$/.test(underscored)) return 'build';
  return ICON_ALIASES[underscored] || underscored;
}

export function serviceCategoryIcon(
  icon?: string | null,
  categoryName?: string | null,
): string {
  if (icon) return toMaterialSymbolName(icon);
  const meta = resolveServiceMeta(categoryName);
  if (CATEGORY_FALLBACKS[meta.key]) return CATEGORY_FALLBACKS[meta.key];
  const key = (categoryName || '').trim().toLowerCase();
  if (key && CATEGORY_FALLBACKS[key]) return CATEGORY_FALLBACKS[key];
  // fuzzy: match if name contains known key
  for (const [k, v] of Object.entries(CATEGORY_FALLBACKS)) {
    if (key.includes(k)) return v;
  }
  return 'build';
}

/** MaterialIcons-safe hyphen name (rejects unknown API / Symbols glyphs). */
let MATERIAL_GLYPHS: Record<string, number> | null = null;
try {
  MATERIAL_GLYPHS = require('react-native-vector-icons/glyphmaps/MaterialIcons.json');
} catch {
  MATERIAL_GLYPHS = null;
}

const VECTOR_FALLBACKS: Record<string, string> = {
  'water-bottle': 'local-drink',
  water_bottle: 'local-drink',
  camping: 'nature-people',
  roofing: 'home',
  layers: 'view-module',
  liquor: 'local-bar',
};

export function toSafeMaterialIcon(
  icon?: string | null,
  categoryName?: string | null,
): string {
  const candidates = [
    serviceCategoryIcon(icon, categoryName),
    // If API icon is junk (e.g. help/?), prefer category-based fallback
    categoryName ? serviceCategoryIcon(null, categoryName) : null,
    'build',
  ].filter(Boolean) as string[];

  for (const symbol of candidates) {
    const hyphen = symbol.replace(/_/g, '-');
    if (MATERIAL_GLYPHS && MATERIAL_GLYPHS[hyphen] != null) {
      // Prefer category-derived icons over generic help/question glyphs
      if (
        (hyphen === 'help' || hyphen === 'help-outline') &&
        categoryName &&
        symbol === candidates[0]
      ) {
        continue;
      }
      return hyphen;
    }
    const alt = VECTOR_FALLBACKS[symbol] || VECTOR_FALLBACKS[hyphen];
    if (alt && (!MATERIAL_GLYPHS || MATERIAL_GLYPHS[alt] != null)) return alt;
  }
  return 'build';
}

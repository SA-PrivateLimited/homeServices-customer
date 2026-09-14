/** Compact place line for GPS-detected location chips. */
export function formatDetectedPlaceLine(parts: {
  block?: string;
  district?: string;
  city?: string;
  state?: string;
}): string {
  return [parts.block, parts.district || parts.city, parts.state]
    .filter(Boolean)
    .join(', ');
}

export type AreaPinInput = {
  address?: string;
  landmark?: string;
  city?: string;
  district?: string;
  block?: string;
  state?: string;
  pincode?: string | number | null;
};

export function normalizePincode(value?: string | number | null): string {
  return String(value ?? '')
    .replace(/\D/g, '')
    .slice(0, 6);
}

function shortStreet(raw: string, max = 28): string {
  const street = raw.replace(/\s+/g, ' ').trim();
  if (!street) return '';
  return street.length > max ? `${street.slice(0, max - 1).trim()}…` : street;
}

/** Compact area line for chips: district · pincode. */
export function formatAreaPinLine(addr?: AreaPinInput | null): string {
  if (!addr || typeof addr !== 'object') return '';

  const pin = normalizePincode(addr.pincode);
  const place = String(addr.district || addr.city || '').trim();
  const block = String(addr.block || '').trim();
  const state = String(addr.state || '').trim();

  const areaParts = [block, place].filter(Boolean).join(', ');

  if (areaParts && pin) return `${areaParts} · ${pin}`;
  if (areaParts) return areaParts;
  if (state && pin) return `${state} · ${pin}`;
  if (pin) return pin;
  if (state) return state;

  return shortStreet(String(addr.address || ''), 36);
}

/**
 * Request-card location: street + place · PIN.
 * e.g. "Near Bus Stand, Garhwa · 822114"
 */
export function formatCardAddressLine(addr?: AreaPinInput | null): string {
  if (!addr || typeof addr !== 'object') return '';

  const street = shortStreet(String(addr.address || ''), 40);
  const place = String(addr.district || addr.city || '').trim();
  const pin = normalizePincode(addr.pincode);
  const area = place && pin ? `${place} · ${pin}` : place || pin;

  if (street && area) return `${street}, ${area}`;
  if (street) return street;
  return area || formatAreaPinLine(addr);
}

/**
 * Full readable address for detail surfaces (Active Service, provider about).
 * Does not truncate. District alone is not enough — callers should check
 * street/landmark before treating this as a "shared" provider address.
 */
export function formatFullAddressLine(addr?: AreaPinInput | null): string {
  if (!addr || typeof addr !== 'object') return '';

  const street = String(addr.address || '')
    .replace(/\s+/g, ' ')
    .trim();
  const landmark = String(addr.landmark || '')
    .replace(/\s+/g, ' ')
    .trim();
  const place = String(addr.district || addr.city || '').trim();
  const block = String(addr.block || '').trim();
  const state = String(addr.state || '').trim();
  const pin = normalizePincode(addr.pincode);

  const head = dedupePlaceParts([street, landmark, block, place, state]);
  if (head.length && pin) return `${head.join(', ')} — ${pin}`;
  if (head.length) return head.join(', ');
  return pin;
}

/**
 * Multi-line address for detail screens (street / landmark / place — pin).
 * Presentation only — does not change stored address data.
 */
export function formatAddressDisplayLines(
  addr?: AreaPinInput | null,
): string[] {
  if (!addr || typeof addr !== 'object') return [];

  const street = String(addr.address || '')
    .replace(/\s+/g, ' ')
    .trim();
  const landmark = String(addr.landmark || '')
    .replace(/\s+/g, ' ')
    .trim();
  const place = String(addr.district || addr.city || '').trim();
  const block = String(addr.block || '').trim();
  const state = String(addr.state || '').trim();
  const pin = normalizePincode(addr.pincode);

  const lines: string[] = [];
  if (street) lines.push(street);
  if (landmark) lines.push(landmark);

  const placeParts = dedupePlaceParts([block, place, state]);
  if (placeParts.length && pin) {
    lines.push(`${placeParts.join(', ')} — ${pin}`);
  } else if (placeParts.length) {
    lines.push(placeParts.join(', '));
  } else if (pin) {
    lines.push(pin);
  }

  return lines;
}

export function dedupePlaceParts(parts: Array<string | undefined | null>): string[] {
  const out: string[] = [];
  for (const raw of parts) {
    const part = String(raw || '').trim();
    if (!part) continue;
    const prev = out[out.length - 1];
    if (prev && prev.toLowerCase() === part.toLowerCase()) continue;
    out.push(part);
  }
  return out;
}

/**
 * Customer-facing service area (block + district/city + state + PIN) — no street.
 * Avoids implying the partner's home address when only area is known.
 * Dedupes cases like "Kota, Kota, Rajasthan".
 */
export function formatServiceAreaLine(addr?: AreaPinInput | null): string {
  if (!addr || typeof addr !== 'object') return '';

  const block = String(addr.block || '').trim();
  const place = String(addr.district || addr.city || '').trim();
  const state = String(addr.state || '').trim();
  const pin = normalizePincode(addr.pincode);

  const head = dedupePlaceParts([block, place, state]);
  if (head.length && pin) return `${head.join(', ')} · ${pin}`;
  if (head.length) return head.join(', ');
  return pin;
}

export type ProviderAddressSource = {
  address?: AreaPinInput | null;
  location?: AreaPinInput | null;
};

/** Merge partner profile address fields from API location + address objects. */
export function mergeProviderAddressFields(
  source: ProviderAddressSource,
): AreaPinInput {
  const fromAddress = source.address;
  const fromLocation = source.location;
  return {
    address: fromAddress?.address || fromLocation?.address || '',
    landmark: fromAddress?.landmark || fromLocation?.landmark || '',
    city: fromAddress?.city || fromLocation?.city || '',
    district: fromAddress?.district || fromLocation?.district || '',
    block: fromAddress?.block || fromLocation?.block || '',
    state: fromAddress?.state || fromLocation?.state || '',
    pincode: fromAddress?.pincode || fromLocation?.pincode || '',
  };
}

/** Compact browse-card location — locality + area + PIN when available. */
export function formatProviderLocationLine(
  source: ProviderAddressSource,
): string {
  const addr = mergeProviderAddressFields(source);
  const pin = normalizePincode(addr.pincode);
  // Prefer landmark ("Near Bus Stand") when shared; else short street line.
  const localityRaw = String(addr.landmark || addr.address || '').trim();
  const locality = shortStreet(localityRaw, 28);
  const areaParts = dedupePlaceParts([
    addr.block,
    addr.district || addr.city,
    addr.state,
  ]);
  const head = locality
    ? dedupePlaceParts([locality, ...areaParts])
    : areaParts;

  if (head.length && pin) return `${head.join(', ')} · ${pin}`;
  if (head.length) return head.join(', ');
  return pin;
}

/** Full shared profile address for provider detail — street when partner shared it. */
export function formatProviderProfileAddressLine(
  source: ProviderAddressSource,
): string {
  const addr = mergeProviderAddressFields(source);
  const full = formatFullAddressLine(addr);
  if (full) return full;
  return formatServiceAreaLine(addr);
}

export function hasProviderAddress(source: ProviderAddressSource): boolean {
  const addr = mergeProviderAddressFields(source);
  return (
    hasSharedStreetAddress(addr) ||
    hasServiceArea(addr) ||
    Boolean(String(addr.block || '').trim())
  );
}

/** True when the provider has shared street-level profile address (not district-only). */
export function hasSharedStreetAddress(addr?: AreaPinInput | null): boolean {
  if (!addr || typeof addr !== 'object') return false;
  return Boolean(
    String(addr.address || '').trim() || String(addr.landmark || '').trim(),
  );
}

/** True when district/city/state/PIN can describe a service area. */
export function hasServiceArea(addr?: AreaPinInput | null): boolean {
  if (!addr || typeof addr !== 'object') return false;
  return Boolean(
    String(addr.block || '').trim() ||
      String(addr.district || '').trim() ||
      String(addr.city || '').trim() ||
      String(addr.state || '').trim() ||
      normalizePincode(addr.pincode),
  );
}

const GARBAGE_NICKNAME = /^(vs+|asdf+|test|xxx+|kmi|abc|qwe|zzz+)$/i;

/**
 * Saved-place nicknames like "Mum's" — not road codes, PIN, or keyboard mash.
 */
export function isUsefulAddressNickname(
  raw?: string | null,
  street?: string | null,
): boolean {
  const s = String(raw || '').replace(/\s+/g, ' ').trim();
  if (s.length < 3 || s.length > 28) return false;
  if (!/[a-zA-Z\u0900-\u097f]/.test(s)) return false;
  if (/\d{3,}/.test(s)) return false;
  if (GARBAGE_NICKNAME.test(s)) return false;
  if (/^[\sA-Za-z.'’-]+$/.test(s) && !/[aeiou]/i.test(s)) return false;
  const streetFold = String(street || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
  if (streetFold && streetFold.includes(s.toLowerCase())) return false;
  return true;
}

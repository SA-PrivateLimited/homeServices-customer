/**
 * Normalize service-request photo payloads from the API.
 * Backend stores URL strings; create may send {key,url} refs.
 */

export type PhotoRef = {
  key?: string;
  url?: string;
};

export type RequestPhotoInput = string | PhotoRef | null | undefined;

export function photoUrlFromRef(item: RequestPhotoInput): string {
  if (!item) return '';
  if (typeof item === 'string') return item.trim();
  const url = typeof item.url === 'string' ? item.url.trim() : '';
  return url;
}

export function photoUrlsFromRequest(
  photos?: RequestPhotoInput[] | null,
): string[] {
  if (!Array.isArray(photos) || photos.length === 0) return [];
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const item of photos) {
    const url = photoUrlFromRef(item);
    if (!url || seen.has(url)) continue;
    if (!/^https?:\/\//i.test(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

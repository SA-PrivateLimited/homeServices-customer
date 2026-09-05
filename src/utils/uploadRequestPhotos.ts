import {uploadAssetFromUri} from '../services/api/assetsApi';

/** Upload local URIs; pass through existing CDN/upload refs. */
export async function uploadRequestPhotos(
  uris: string[],
  purpose: 'service-request-photo' | 'provider-request-photo' = 'service-request-photo',
): Promise<Array<string | {key: string; url: string}>> {
  const out: Array<string | {key: string; url: string}> = [];
  for (const uri of uris) {
    const value = String(uri || '').trim();
    if (!value) continue;
    if (
      /^https?:\/\//i.test(value) ||
      value.startsWith('/uploads/')
    ) {
      out.push(value);
      continue;
    }
    const ref = await uploadAssetFromUri(value, {purpose});
    out.push({key: ref.key, url: ref.url});
  }
  return out;
}

/**
 * Guard <img> src so CloudFront SPA fallback (403 → index.html) is never
 * loaded as an image (Chrome net::ERR_BLOCKED_BY_ORB).
 */

const BARE_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\.[a-z0-9]+)?$/i;

const SAME_ORIGIN_STATIC = /^\/(login|assets|pwa)\//;

function isBareUuidPath(pathname: string): boolean {
  const rest = pathname.replace(/^\/+/, '');
  return Boolean(rest) && !rest.includes('/') && BARE_UUID.test(rest);
}

export function isUsableMediaUrl(raw: string): boolean {
  const url = String(raw || '').trim();
  if (!url) return false;
  if (/^(data|blob):/i.test(url)) return true;

  try {
    const origin =
      typeof window !== 'undefined'
        ? window.location.origin
        : 'https://akansho.com';
    const parsed = new URL(url, origin);
    const path = parsed.pathname;

    if (isBareUuidPath(path)) return false;

    if (/^assets\.(akanso\.in|akansho\.com)$/i.test(parsed.hostname)) return true;
    if (path.startsWith('/uploads/')) return true;
    if (SAME_ORIGIN_STATIC.test(path) || /^\/logo\.(png|svg)$/i.test(path)) {
      return true;
    }
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

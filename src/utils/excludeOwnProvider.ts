/**
 * Defensive filter: never present the current Akanso user's own Partner
 * profile as a hireable provider. Authoritative exclusion lives on the API.
 * Provider._id === User._id in this codebase.
 */

export function currentUserId(
  user?: {_id?: string; id?: string} | null,
): string {
  return String(user?._id || user?.id || '').trim();
}

export function isOwnProvider(
  provider: {_id?: string; id?: string} | null | undefined,
  user?: {_id?: string; id?: string} | null,
): boolean {
  const uid = currentUserId(user);
  const pid = String(provider?._id || provider?.id || '').trim();
  return Boolean(uid && pid && uid === pid);
}

export function filterOutOwnProvider<T extends {_id?: string; id?: string}>(
  providers: T[],
  user?: {_id?: string; id?: string} | null,
): T[] {
  const uid = currentUserId(user);
  if (!uid) return providers;
  return providers.filter((p) => String(p._id || p.id || '') !== uid);
}

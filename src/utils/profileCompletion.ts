/** Matches signup placeholders and generated defaults — not real people names. */
const PLACEHOLDER_DISPLAY_NAME =
  /^(customer|provider|user)([-\s]\d{1,4})?$/i;

function isPlaceholderDisplayName(value?: string | null): boolean {
  const s = String(value || '').trim();
  return !s || PLACEHOLDER_DISPLAY_NAME.test(s);
}

/** Soft completeness score for Settings — never blocking. */
export function customerProfileCompletionPercent(user?: {
  name?: string | null;
  displayName?: string | null;
  gender?: string | null;
  homeAddress?: {address?: string | null; pincode?: string | null} | null;
  profileImage?: string | null;
  photoURL?: string | null;
} | null): number {
  if (!user) return 0;
  const checks = [
    !isPlaceholderDisplayName(user.name || user.displayName),
    Boolean(String(user.gender || '').trim()),
    Boolean(
      String(user.homeAddress?.address || '').trim() ||
        String(user.homeAddress?.pincode || '').trim(),
    ),
    Boolean(user.profileImage || user.photoURL),
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

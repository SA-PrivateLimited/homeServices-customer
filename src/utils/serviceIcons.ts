const CATEGORY_ICONS: Record<string, string> = {
  plumber: 'plumbing',
  electrician: 'electrical-services',
  carpenter: 'carpenter',
  painter: 'format-paint',
  'ac repair': 'ac-unit',
  'cleaning service': 'cleaning-services',
  cleaner: 'cleaning-services',
  driver: 'directions-car',
  mason: 'construction',
  handyman: 'handyman',
};

export function serviceCategoryIcon(categoryName?: string | null): string {
  const key = (categoryName || '').trim().toLowerCase();
  if (key && CATEGORY_ICONS[key]) return CATEGORY_ICONS[key];
  for (const [k, v] of Object.entries(CATEGORY_ICONS)) {
    if (key.includes(k)) return v;
  }
  return 'build';
}

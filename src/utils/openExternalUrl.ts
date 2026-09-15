import {Linking} from 'react-native';

/**
 * Open an external URL (tel:, https://wa.me/, mailto:, …).
 * Returns false when no handler exists (common on emulators) — never throws.
 */
export async function openExternalUrl(url: string): Promise<boolean> {
  const target = String(url || '').trim();
  if (!target) return false;
  try {
    await Linking.openURL(target);
    return true;
  } catch {
    return false;
  }
}

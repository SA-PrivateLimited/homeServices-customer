/**
 * Remote branding — themeColors, product name, and logo from GET /api/branding.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_BASE_URL} from '../config/api';
import {apiGet} from './api/apiClient';
import {applyColorPalette, type ColorPalette} from '../utils/theme';

const CACHE_KEY = '@hs_branding_themeColors';
const DEFAULT_BRAND_NAME = 'HomeServices';

export interface BrandingResponse {
  clientId: string;
  clientName: string;
  customerProductName?: string;
  providerProductName?: string;
  logoUrl?: string;
  themeColors: ColorPalette;
}

interface BrandingCache {
  themeColors: ColorPalette;
  brandName: string;
  logoUrl: string;
}

type BrandingListener = () => void;

let brandName = DEFAULT_BRAND_NAME;
let logoUrl = '';
const listeners = new Set<BrandingListener>();

function notifyListeners(): void {
  listeners.forEach(listener => {
    try {
      listener();
    } catch {
      // ignore listener errors
    }
  });
}

function setBrandingState(nextName: string, nextLogo: string): void {
  const name = nextName.trim() || DEFAULT_BRAND_NAME;
  const logo = nextLogo.trim();
  if (name === brandName && logo === logoUrl) return;
  brandName = name;
  logoUrl = logo;
  notifyListeners();
}

/** Resolve relative logo paths against the API host (strip trailing /api). */
export function resolveLogoUrl(rawLogoUrl?: string): string {
  const raw = (rawLogoUrl || '').trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw) || raw.startsWith('data:')) return raw;
  const base = API_BASE_URL.replace(/\/api\/?$/, '');
  return raw.startsWith('/') ? `${base}${raw}` : `${base}/${raw}`;
}

function productNameFrom(data: BrandingResponse): string {
  return (
    (data.customerProductName || '').trim() ||
    (data.clientName || '').trim() ||
    DEFAULT_BRAND_NAME
  );
}

async function readCache(): Promise<BrandingCache | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BrandingCache | ColorPalette;
    if (parsed && typeof parsed === 'object' && 'themeColors' in parsed) {
      const cache = parsed as BrandingCache;
      return {
        themeColors: cache.themeColors,
        brandName: cache.brandName || DEFAULT_BRAND_NAME,
        logoUrl: cache.logoUrl || '',
      };
    }
    // Legacy: cache was themeColors only
    return {
      themeColors: parsed as ColorPalette,
      brandName: DEFAULT_BRAND_NAME,
      logoUrl: '',
    };
  } catch {
    return null;
  }
}

async function writeCache(cache: BrandingCache): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

export function getBrandName(): string {
  return brandName || DEFAULT_BRAND_NAME;
}

export function getLogoUrl(): string {
  return logoUrl;
}

/** Subscribe to branding updates (brand name / logo). Returns unsubscribe. */
export function subscribeBranding(listener: BrandingListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function loadAndApplyBranding(): Promise<void> {
  const cached = await readCache();
  if (cached) {
    applyColorPalette(cached.themeColors);
    setBrandingState(cached.brandName, cached.logoUrl);
  }

  try {
    const data = await apiGet<BrandingResponse>('/branding', {skipAuth: true});
    if (!data) return;

    const nextName = productNameFrom(data);
    const nextLogo = resolveLogoUrl(data.logoUrl);
    const themeColors = data.themeColors || cached?.themeColors;

    if (data.themeColors) {
      applyColorPalette(data.themeColors);
    }

    setBrandingState(nextName, nextLogo);

    if (themeColors) {
      await writeCache({
        themeColors,
        brandName: nextName,
        logoUrl: nextLogo,
      });
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[branding] fetch failed, using cache/defaults', err);
    }
  }
}

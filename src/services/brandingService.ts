/**
 * Remote branding — themeColors from GET /api/branding applied as colorPalette.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {apiGet} from './api/apiClient';
import {applyColorPalette, type ColorPalette} from '../utils/theme';

const CACHE_KEY = '@hs_branding_themeColors';

export interface BrandingResponse {
  clientId: string;
  clientName: string;
  themeColors: ColorPalette;
}

async function readCache(): Promise<ColorPalette | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ColorPalette;
  } catch {
    return null;
  }
}

async function writeCache(themeColors: ColorPalette): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(themeColors));
  } catch {
    // ignore
  }
}

export async function loadAndApplyBranding(): Promise<void> {
  const cached = await readCache();
  if (cached) {
    applyColorPalette(cached);
  }

  try {
    const data = await apiGet<BrandingResponse>('/branding', {skipAuth: true});
    if (data?.themeColors) {
      const colorPalette = data.themeColors;
      applyColorPalette(colorPalette);
      await writeCache(colorPalette);
    }
  } catch (err) {
    if (__DEV__) {
      console.warn('[branding] fetch failed, using cache/defaults', err);
    }
  }
}

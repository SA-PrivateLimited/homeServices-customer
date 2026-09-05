import AsyncStorage from '@react-native-async-storage/async-storage';
import {CUSTOMER_WEB} from 'sapvt-ltd-app-packages';

export interface Theme {
  background: string;
  card: string;
  text: string;
  textSecondary: string;
  primary: string;
  primaryDark: string;
  secondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  shadow: string;
  tabBar: string;
  placeholder: string;
}

/** Remote themeColors / colorPalette shape (subset used by mobile Theme). */
export interface ColorPalette {
  primary: string;
  primaryDark: string;
  secondary?: string;
  secondaryDark?: string;
  background?: string;
  surface?: string;
  text?: string;
  textSecondary?: string;
  border?: string;
  error?: string;
  success?: string;
  warning?: string;
  [key: string]: string | undefined;
}

/** Match customer-web DEFAULT_LIGHT_THEME */
const defaultLight: Theme = {
  background: '#F5F7FA',
  card: '#FFFFFF',
  text: '#1A202C',
  textSecondary: '#718096',
  primary: '#3182CE',
  primaryDark: '#2C5282',
  secondary: '#38B2AC',
  border: '#E2E8F0',
  error: '#E53E3E',
  success: '#38A169',
  warning: '#DD6B20',
  shadow: '#000000',
  tabBar: 'rgba(255,255,255,0.92)',
  placeholder: '#A0AEC0',
};

/**
 * Night-vision surfaces — match customer-web `NIGHT_VISION_SURFACES`.
 * Accents (primary/success/…) stay on the branded light theme values.
 */
export const NIGHT_VISION_SURFACES: Pick<
  Theme,
  | 'background'
  | 'card'
  | 'text'
  | 'textSecondary'
  | 'border'
  | 'tabBar'
  | 'placeholder'
  | 'shadow'
> = {
  background: '#0B1220',
  card: '#151E2E',
  text: '#E8EDF5',
  textSecondary: '#94A3B8',
  border: '#273449',
  tabBar: '#151E2E',
  placeholder: '#64748B',
  shadow: '#000000',
};

const defaultDark: Theme = {
  ...defaultLight,
  ...NIGHT_VISION_SURFACES,
};

/** Mutable — applyColorPalette updates in place before first paint. */
export const lightTheme: Theme = {...defaultLight};
export const darkTheme: Theme = {...defaultDark};

/** Customer account-level color themes (accents). Brand = admin client colors. */
export type CustomerColorThemeId = 'brand' | 'cool' | 'warm';

export const CUSTOMER_COLOR_THEMES: Array<{
  id: CustomerColorThemeId;
  swatch: string;
}> = [
  {id: 'brand', swatch: '#3182CE'},
  {id: 'cool', swatch: '#0D9488'},
  {id: 'warm', swatch: '#C2410C'},
];

const CUSTOMER_ACCENTS: Record<
  Exclude<CustomerColorThemeId, 'brand'>,
  Pick<Theme, 'primary' | 'primaryDark' | 'secondary'>
> = {
  cool: {
    primary: '#0D9488',
    primaryDark: '#0F766E',
    secondary: '#2563EB',
  },
  warm: {
    primary: '#C2410C',
    primaryDark: '#9A3412',
    secondary: '#CA8A04',
  },
};

const CUSTOMER_COLOR_THEME_KEY = 'akanso-customer-color-theme';

/** Last admin branding palette (Brand theme). Null until branding applies. */
let adminBrandPalette: ColorPalette | null = null;
let currentCustomerColorTheme: CustomerColorThemeId = 'brand';
let nightVisionActive = false;

function writeBrandBaseFromPalette(colorPalette: ColorPalette): void {
  lightTheme.primary = colorPalette.primary;
  lightTheme.primaryDark = colorPalette.primaryDark || colorPalette.primary;
  if (colorPalette.secondary) lightTheme.secondary = colorPalette.secondary;
  if (colorPalette.background) lightTheme.background = colorPalette.background;
  if (colorPalette.surface) {
    lightTheme.card = colorPalette.surface;
    lightTheme.tabBar = colorPalette.surface;
  }
  if (colorPalette.text) lightTheme.text = colorPalette.text;
  if (colorPalette.textSecondary) {
    lightTheme.textSecondary = colorPalette.textSecondary;
  }
  if (colorPalette.border) lightTheme.border = colorPalette.border;
  if (colorPalette.error) lightTheme.error = colorPalette.error;
  if (colorPalette.success) lightTheme.success = colorPalette.success;
  if (colorPalette.warning) lightTheme.warning = colorPalette.warning;
}

function restoreBrandBase(): void {
  if (adminBrandPalette?.primary) {
    writeBrandBaseFromPalette(adminBrandPalette);
    return;
  }
  Object.assign(lightTheme, defaultLight);
}

/** Keep darkTheme = light accents + night surfaces (web resolveTheme parity). */
export function syncDarkThemeFromLight(): void {
  Object.assign(darkTheme, {
    ...lightTheme,
    ...NIGHT_VISION_SURFACES,
  });
}

export function getCustomerColorTheme(): CustomerColorThemeId {
  return currentCustomerColorTheme;
}

/** Preview color for the Brand swatch (admin client primary). */
export function getBrandThemeSwatch(): string {
  return adminBrandPalette?.primary || defaultLight.primary;
}

/**
 * Apply customer accent theme on top of admin brand colors.
 * Night vision continues to override surfaces only.
 */
export function applyCustomerColorTheme(
  id: CustomerColorThemeId,
  opts: {persist?: boolean} = {},
): void {
  const persist = opts.persist !== false;
  restoreBrandBase();

  if (id !== 'brand') {
    const accents = CUSTOMER_ACCENTS[id];
    lightTheme.primary = accents.primary;
    lightTheme.primaryDark = accents.primaryDark;
    lightTheme.secondary = accents.secondary;
  }

  currentCustomerColorTheme = id;

  const brandSwatch = CUSTOMER_COLOR_THEMES.find(t => t.id === 'brand');
  if (brandSwatch) {
    brandSwatch.swatch = getBrandThemeSwatch();
  }

  syncDarkThemeFromLight();
  paintCustomerWebChrome(nightVisionActive);

  if (persist) {
    void AsyncStorage.setItem(CUSTOMER_COLOR_THEME_KEY, id).catch(() => {
      /* ignore */
    });
  }
}

export function setCustomerColorTheme(id: CustomerColorThemeId): void {
  applyCustomerColorTheme(id, {persist: true});
}

export async function hydrateCustomerColorTheme(): Promise<CustomerColorThemeId> {
  let id: CustomerColorThemeId = 'brand';
  try {
    const stored = await AsyncStorage.getItem(CUSTOMER_COLOR_THEME_KEY);
    if (stored === 'brand' || stored === 'cool' || stored === 'warm') {
      id = stored;
    }
  } catch {
    /* ignore */
  }
  applyCustomerColorTheme(id, {persist: false});
  return id;
}

/**
 * Apply remote themeColors as colorPalette.
 * Saves admin brand, then re-applies the customer's chosen accent theme.
 */
export function applyColorPalette(colorPalette: ColorPalette): void {
  if (!colorPalette?.primary) return;
  adminBrandPalette = {...colorPalette};
  writeBrandBaseFromPalette(colorPalette);
  applyCustomerColorTheme(currentCustomerColorTheme, {persist: false});
}

/**
 * Web parity: night vision only swaps surfaces; accents stay branded.
 */
export function resolveTheme(isNightVision: boolean): Theme {
  if (!isNightVision) {
    return {...lightTheme};
  }
  return {...lightTheme, ...NIGHT_VISION_SURFACES};
}

/**
 * Paint mutable CUSTOMER_WEB tokens so StyleSheets / tab bar follow night vision.
 */
export function paintCustomerWebChrome(isNightVision: boolean): void {
  nightVisionActive = isNightVision;
  const t = resolveTheme(isNightVision);
  (CUSTOMER_WEB as {background: string}).background = t.background;
  (CUSTOMER_WEB as {card: string}).card = isNightVision
    ? t.card
    : 'rgba(255,255,255,0.82)';
  (CUSTOMER_WEB as {text: string}).text = t.text;
  (CUSTOMER_WEB as {textSecondary: string}).textSecondary = t.textSecondary;
  (CUSTOMER_WEB as {border: string}).border = t.border;
  (CUSTOMER_WEB as {tabBar: string}).tabBar = t.tabBar;
  (CUSTOMER_WEB as {placeholder: string}).placeholder = t.placeholder;
  (CUSTOMER_WEB as {primary: string}).primary = t.primary;
  (CUSTOMER_WEB as {primaryDark: string}).primaryDark = t.primaryDark;
  (CUSTOMER_WEB as {secondary: string}).secondary = t.secondary;
  (CUSTOMER_WEB as {error: string}).error = t.error;
  (CUSTOMER_WEB as {success: string}).success = t.success;
  (CUSTOMER_WEB as {warning: string}).warning = t.warning;
  (CUSTOMER_WEB as {border50: string}).border50 = isNightVision
    ? 'rgba(39, 52, 73, 0.55)'
    : 'rgba(226, 232, 240, 0.5)';
  (CUSTOMER_WEB as {border55: string}).border55 = isNightVision
    ? 'rgba(39, 52, 73, 0.6)'
    : 'rgba(226, 232, 240, 0.55)';
  (CUSTOMER_WEB as {highlightInset: string}).highlightInset = isNightVision
    ? 'rgba(255, 255, 255, 0.1)'
    : 'rgba(255, 255, 255, 0.65)';
  (CUSTOMER_WEB as {tabShadow: string}).tabShadow = isNightVision
    ? 'rgba(0, 0, 0, 0.28)'
    : 'rgba(30, 60, 90, 0.04)';
}

/** Call when Night vision toggles or after hydrate. */
export function applyNightVisionMode(isNightVision: boolean): void {
  syncDarkThemeFromLight();
  paintCustomerWebChrome(isNightVision);
}

export const commonStyles = {
  shadowSmall: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  shadowMedium: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  shadowLarge: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
};

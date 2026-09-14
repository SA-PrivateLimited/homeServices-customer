import Geolocation from 'react-native-geolocation-service';
import GeolocationCommunity from '@react-native-community/geolocation';
import {
  AppState,
  Linking,
  NativeModules,
  Platform,
  PermissionsAndroid,
  type AppStateStatus,
} from 'react-native';
import {logger} from '../utils/logger';

export type LocationErrorCode =
  | 'services_off'
  | 'denied'
  | 'never_ask_again'
  | 'timeout'
  | 'unsupported'
  | 'unavailable'
  | 'geocode'
  | 'nomatch'
  | 'invalid';

export type DeviceLocationPromptResult =
  | 'enabled'
  | 'cancelled'
  | 'opened_settings';

type NativeLocationSettings = {
  isLocationEnabled: () => Promise<boolean>;
  openLocationSettings: () => Promise<void>;
  promptEnableLocation: () => Promise<DeviceLocationPromptResult>;
};

const NativeLocationSettingsModule = NativeModules.AkanshoLocationSettings as
  | NativeLocationSettings
  | undefined;

function locationError(code: LocationErrorCode, message?: string): Error {
  return Object.assign(new Error(message || code), {code});
}

function readErrorCode(error: unknown): number | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const raw = (error as {code?: unknown}).code;
    const n = typeof raw === 'number' ? raw : Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function mapGeolocationFailure(error: unknown): Error {
  const numeric = readErrorCode(error);
  // @react-native-community/geolocation PositionError
  if (numeric === 1) {
    return locationError('denied');
  }
  if (numeric === 3) {
    return locationError('timeout');
  }
  // 2 = POSITION_UNAVAILABLE; 5 = SETTINGS_NOT_SATISFIED (fused)
  if (numeric === 2 || numeric === 5) {
    return locationError('unavailable');
  }

  if (error && typeof error === 'object' && 'code' in error) {
    const coded = String((error as {code?: unknown}).code || '');
    if (
      [
        'services_off',
        'denied',
        'never_ask_again',
        'timeout',
        'unsupported',
        'unavailable',
        'geocode',
        'nomatch',
        'invalid',
      ].includes(coded)
    ) {
      return locationError(coded as LocationErrorCode);
    }
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const lower = message.toLowerCase();
  if (lower.includes('permission') || lower.includes('denied')) {
    return locationError('denied', message);
  }
  if (lower.includes('timeout')) {
    return locationError('timeout', message);
  }
  if (lower.includes('unsupported')) {
    return locationError('unsupported', message);
  }
  if (
    lower.includes('location services') ||
    lower.includes('settings') ||
    lower.includes('disabled') ||
    lower.includes('provider')
  ) {
    return locationError('services_off', message);
  }
  return locationError('unavailable', message);
}

export interface LocationData {
  latitude: number;
  longitude: number;
  pincode?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
}

/**
 * Geolocation Service
 * Handles location detection and reverse geocoding for pincode detection
 */
class GeolocationService {
  /**
   * Check location permission status without requesting it
   */
  async checkLocationPermission(): Promise<
    'granted' | 'denied' | 'never_ask_again' | 'not_determined'
  > {
    if (Platform.OS === 'android') {
      try {
        const checkFineLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (checkFineLocation) {
          return 'granted';
        }

        const checkCoarseLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        );
        if (checkCoarseLocation) {
          return 'granted';
        }

        return 'denied';
      } catch (err: unknown) {
        if (__DEV__) {
          logger.error('Error checking location permission:', err);
        }
        return 'denied';
      }
    }
    return 'not_determined';
  }

  /**
   * Request foreground location permission (fine, then coarse fallback).
   * Approximate location alone is accepted when granted.
   * Shows Akansho explanation first (Not now | Allow), then the native dialog.
   */
  async requestLocationPermission(): Promise<
    'granted' | 'denied' | 'never_ask_again'
  > {
    if (Platform.OS === 'android') {
      try {
        const checkFineLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (checkFineLocation) {
          return 'granted';
        }
        const checkCoarseLocation = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
        );
        if (checkCoarseLocation) {
          return 'granted';
        }

        const {requestLocationConsent} = await import(
          './locationConsentBridge'
        );
        const consent = await requestLocationConsent();
        if (consent !== 'allow') {
          return 'denied';
        }

        // No RN rationale object — avoid Ask Me Later / Cancel / Allow triple alert.
        // Native Android permission dialog follows.
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          return 'granted';
        }
        if (granted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
          return 'never_ask_again';
        }

        try {
          const coarseGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          );
          if (coarseGranted === PermissionsAndroid.RESULTS.GRANTED) {
            return 'granted';
          }
          if (coarseGranted === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            return 'never_ask_again';
          }
        } catch {
          // Fall through
        }
        return 'denied';
      } catch (err: unknown) {
        if (__DEV__) {
          logger.error('Error requesting location permission:', err);
        }
        return 'denied';
      }
    }
    return 'granted';
  }

  /**
   * Device Location services ON/OFF (independent of app permission).
   */
  async isDeviceLocationEnabled(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }
    if (!NativeLocationSettingsModule?.isLocationEnabled) {
      // Without native module, do not block — permission + fetch still run.
      return true;
    }
    try {
      return Boolean(await NativeLocationSettingsModule.isLocationEnabled());
    } catch (err) {
      if (__DEV__) {
        logger.warn('isDeviceLocationEnabled failed:', err);
      }
      return true;
    }
  }

  /**
   * Android SettingsClient resolution when possible; else opens Location settings.
   */
  async promptEnableDeviceLocation(): Promise<DeviceLocationPromptResult> {
    if (Platform.OS !== 'android') {
      return 'enabled';
    }
    if (await this.isDeviceLocationEnabled()) {
      return 'enabled';
    }
    if (NativeLocationSettingsModule?.promptEnableLocation) {
      try {
        const result = await NativeLocationSettingsModule.promptEnableLocation();
        if (
          result === 'enabled' ||
          result === 'cancelled' ||
          result === 'opened_settings'
        ) {
          return result;
        }
      } catch (err) {
        if (__DEV__) {
          logger.warn('promptEnableLocation failed, opening settings:', err);
        }
      }
    }
    await this.openDeviceLocationSettings();
    return 'opened_settings';
  }

  async openDeviceLocationSettings(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }
    if (NativeLocationSettingsModule?.openLocationSettings) {
      await NativeLocationSettingsModule.openLocationSettings();
      return;
    }
    await Linking.openSettings();
  }

  /** App details settings — for permanent permission denial. */
  async openAppPermissionSettings(): Promise<void> {
    await Linking.openSettings();
  }

  private shouldSkipFusedLocation(): boolean {
    if (Platform.OS === 'android') {
      return true;
    }
    return false;
  }

  async getCurrentLocation(): Promise<LocationData> {
    const hasPermission = await this.checkLocationPermission();
    if (hasPermission !== 'granted') {
      throw locationError(
        'denied',
        'Location permission not granted. Please enable location permission in settings.',
      );
    }

    try {
      const useCommunityFirst = this.shouldSkipFusedLocation();

      if (useCommunityFirst) {
        return await this.getCurrentLocationWithCommunity();
      }

      try {
        return await this.getCurrentLocationWithFusedLocation();
      } catch (fusedError: unknown) {
        if (__DEV__) {
          logger.warn(
            'Fused location failed, falling back to community geolocation:',
            fusedError,
          );
        }
        return await this.getCurrentLocationWithCommunity();
      }
    } catch (error: unknown) {
      const mapped = mapGeolocationFailure(error);
      const code = String((mapped as {code?: string}).code || '');
      if (code === 'denied' || code === 'never_ask_again' || code === 'services_off') {
        throw mapped;
      }

      try {
        return await this.getCurrentLocationWithCommunity();
      } catch (fallbackError) {
        if (__DEV__) {
          logger.error('All location methods failed:', fallbackError);
        }
        throw mapGeolocationFailure(fallbackError);
      }
    }
  }

  private async getCurrentLocationWithFusedLocation(): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      const tryCommunityGeolocation = () => {
        this.getCurrentLocationWithCommunity().then(resolve).catch(reject);
      };

      try {
        if (!Geolocation || typeof Geolocation.getCurrentPosition !== 'function') {
          tryCommunityGeolocation();
          return;
        }

        Geolocation.getCurrentPosition(
          async position => {
            const locationData: LocationData = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            try {
              const addressData = await this.reverseGeocode(
                position.coords.latitude,
                position.coords.longitude,
              );
              resolve({...locationData, ...addressData});
            } catch {
              resolve(locationData);
            }
          },
          error => {
            const errorMessage = error?.message || String(error) || '';
            const errorCode = String(error?.code ?? '');

            if (
              errorMessage.includes('RNFusedLocation') ||
              errorMessage.includes('FusedLocationProviderClient') ||
              errorMessage.includes('Could not invoke') ||
              (errorMessage.includes('interface') &&
                errorMessage.includes('class was expected')) ||
              errorCode === 'UNAVAILABLE' ||
              errorCode === 'UNAUTHORIZED'
            ) {
              tryCommunityGeolocation();
            } else {
              reject(mapGeolocationFailure(error));
            }
          },
          {
            accuracy: {
              android: 'high',
              ios: 'best',
            },
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 10000,
            showLocationDialog: true,
          },
        );
      } catch {
        tryCommunityGeolocation();
      }
    });
  }

  private requestCommunityPosition(options: {
    enableHighAccuracy: boolean;
    timeout: number;
    maximumAge: number;
  }): Promise<LocationData> {
    return new Promise((resolve, reject) => {
      if (
        !GeolocationCommunity ||
        typeof GeolocationCommunity.getCurrentPosition !== 'function'
      ) {
        reject(locationError('unsupported'));
        return;
      }

      GeolocationCommunity.getCurrentPosition(
        async position => {
          const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          try {
            const addressData = await this.reverseGeocode(
              position.coords.latitude,
              position.coords.longitude,
            );
            resolve({...locationData, ...addressData});
          } catch {
            resolve(locationData);
          }
        },
        error => {
          if (__DEV__) {
            logger.error('Geolocation error:', error);
          }
          reject(mapGeolocationFailure(error));
        },
        options,
      );
    });
  }

  private async getCurrentLocationWithCommunity(): Promise<LocationData> {
    if (Platform.OS === 'android') {
      const hasFineLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      const hasCoarseLocation = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      );
      if (!hasFineLocation && !hasCoarseLocation) {
        throw locationError(
          'denied',
          'Location permission not granted. Please enable location permission in settings.',
        );
      }
    }

    const attempts: Array<{
      enableHighAccuracy: boolean;
      timeout: number;
      maximumAge: number;
    }> = [
      {enableHighAccuracy: true, timeout: 15000, maximumAge: 10000},
      {enableHighAccuracy: false, timeout: 20000, maximumAge: 60000},
    ];

    let lastError: Error | null = null;
    for (const options of attempts) {
      try {
        return await this.requestCommunityPosition(options);
      } catch (err) {
        lastError = err instanceof Error ? err : mapGeolocationFailure(err);
        const code = String((lastError as {code?: string}).code || '');
        if (
          code === 'denied' ||
          code === 'never_ask_again' ||
          code === 'unsupported' ||
          code === 'services_off'
        ) {
          throw lastError;
        }
      }
    }

    throw lastError || locationError('unavailable');
  }

  async reverseGeocode(
    latitude: number,
    longitude: number,
  ): Promise<{
    pincode?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  }> {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'HomeServices-App/1.0',
        },
      });

      if (!response.ok) {
        throw new Error('Reverse geocoding failed');
      }

      const data = await response.json();
      const address = data.address || {};

      const pincode = address.postcode || address.pin_code || undefined;
      const city =
        address.city ||
        address.town ||
        address.village ||
        address.county ||
        undefined;
      const state = address.state || undefined;
      let country = address.country || undefined;

      if (pincode && /^[1-8]\d{5}$/.test(pincode)) {
        country = 'India';

        if (address.country && address.country !== 'India') {
          try {
            const pincodeData = await this.geocodePincode(pincode);
            if (pincodeData.address) {
              return {
                pincode,
                address: pincodeData.address,
                city: pincodeData.city,
                state: pincodeData.state,
                country: 'India',
              };
            }
          } catch {
            // Continue with current data
          }
        }
      }

      const addressParts = [];
      if (address.house_number || address.house_name) {
        addressParts.push(address.house_number || address.house_name);
      }
      if (address.road) {
        addressParts.push(address.road);
      }
      if (address.neighbourhood || address.suburb) {
        addressParts.push(address.neighbourhood || address.suburb);
      }
      if (city) {
        addressParts.push(city);
      }
      if (state) {
        addressParts.push(state);
      }
      if (pincode) {
        addressParts.push(pincode);
      }
      if (country) {
        addressParts.push(country);
      }

      const fullAddress = addressParts.join(', ');

      return {
        pincode,
        address: fullAddress || data.display_name || undefined,
        city,
        state,
        country,
      };
    } catch {
      return {};
    }
  }

  async geocodePincode(pincode: string): Promise<{
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  }> {
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&postalcode=${encodeURIComponent(pincode)}&country=India&addressdetails=1&limit=1`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'HomeServices-App/1.0',
        },
      });

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();

      if (!data || data.length === 0) {
        return {};
      }

      const result = data[0];
      const address = result.address || {};

      const city =
        address.city ||
        address.town ||
        address.village ||
        address.county ||
        undefined;
      const state = address.state || undefined;
      const country = address.country || undefined;

      const addressParts = [];
      if (address.road) {
        addressParts.push(address.road);
      }
      if (address.neighbourhood || address.suburb) {
        addressParts.push(address.neighbourhood || address.suburb);
      }
      if (city) {
        addressParts.push(city);
      }
      if (state) {
        addressParts.push(state);
      }
      addressParts.push(pincode);
      if (country) {
        addressParts.push(country);
      }

      const fullAddress = addressParts.join(', ');

      return {
        address: fullAddress || result.display_name || undefined,
        city,
        state,
        country,
        latitude: result.lat ? parseFloat(result.lat) : undefined,
        longitude: result.lon ? parseFloat(result.lon) : undefined,
      };
    } catch {
      return {};
    }
  }

  /**
   * True only when device Location is ON and a get succeeds.
   * Prefer isDeviceLocationEnabled() for settings state alone.
   */
  async checkLocationEnabled(): Promise<boolean> {
    try {
      if (!(await this.isDeviceLocationEnabled())) {
        return false;
      }
      const permission = await this.checkLocationPermission();
      if (permission !== 'granted') {
        return false;
      }
      await this.getCurrentLocation();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Browse / "Use current location" entry:
   * device Location → app permission → fetch.
   * Throws Error with .code for UI mapping.
   */
  async getLocationWithPrompt(): Promise<LocationData> {
    if (Platform.OS === 'android') {
      const servicesOn = await this.isDeviceLocationEnabled();
      if (!servicesOn) {
        throw locationError('services_off');
      }
    }

    let permission = await this.checkLocationPermission();
    if (permission !== 'granted') {
      // Explicit runtime request — required when Location is ON but permission missing.
      permission = await this.requestLocationPermission();
    }

    if (permission === 'never_ask_again') {
      throw locationError('never_ask_again');
    }
    if (permission !== 'granted') {
      throw locationError('denied');
    }

    // Re-check device Location in case user disabled it while granting permission.
    if (Platform.OS === 'android') {
      const stillOn = await this.isDeviceLocationEnabled();
      if (!stillOn) {
        throw locationError('services_off');
      }
    }

    try {
      return await this.getCurrentLocation();
    } catch (error) {
      throw mapGeolocationFailure(error);
    }
  }

  /**
   * Wait until the app is active again (e.g. after Settings), then resolve.
   */
  waitForAppActive(timeoutMs = 120_000): Promise<void> {
    return new Promise(resolve => {
      if (AppState.currentState === 'active') {
        resolve();
        return;
      }
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        sub.remove();
        resolve();
      };
      const timer = setTimeout(finish, timeoutMs);
      const sub = AppState.addEventListener(
        'change',
        (next: AppStateStatus) => {
          if (next === 'active') {
            finish();
          }
        },
      );
    });
  }
}

export default new GeolocationService();

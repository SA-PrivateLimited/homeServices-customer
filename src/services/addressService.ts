/**
 * Address Service — MongoDB user profile (home / office / serviceAddresses).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {UserLocation} from '../types/common';
import {usersApi} from './api/usersApi';
import {getStoredJwt, setSession} from './session';

export interface SavedAddress extends UserLocation {
  id?: string;
  label: 'home' | 'office' | 'other';
  customLabel?: string;
  isDefault?: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  landmark?: string;
  district?: string;
  stateId?: string;
  districtId?: string;
}

const EXTRA_ADDRESSES_KEY = 'hs_extra_addresses';

const cleanAddressData = (data: any): any => {
  const cleaned: any = {};
  Object.keys(data || {}).forEach(key => {
    const value = data[key];
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

function addressKey(a: Partial<SavedAddress>): string {
  return [
    String(a.pincode || '').trim(),
    String(a.address || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim(),
  ].join('|');
}

async function readLegacyExtras(): Promise<SavedAddress[]> {
  try {
    const raw = await AsyncStorage.getItem(EXTRA_ADDRESSES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedAddress[];
  } catch {
    return [];
  }
}

async function clearLegacyExtras(): Promise<void> {
  try {
    await AsyncStorage.removeItem(EXTRA_ADDRESSES_KEY);
  } catch {
    // ignore
  }
}

function fromUserProfileField(
  label: 'home' | 'office',
  field?: UserLocation | null,
): SavedAddress | null {
  if (!field?.address && !field?.pincode) return null;
  return {
    id: label,
    label,
    customLabel: (field as any).customLabel,
    isDefault: label === 'home',
    ...field,
  };
}

async function persistSessionUser(user: any): Promise<void> {
  const jwt = await getStoredJwt();
  if (jwt && user) {
    await setSession(jwt, user as any);
  }
}

export const getSavedAddresses = async (): Promise<SavedAddress[]> => {
  try {
    if (!(await getStoredJwt())) return [];

    const me = await usersApi.getMe();
    const list: SavedAddress[] = [];
    const home = fromUserProfileField('home', me?.homeAddress as any);
    const office = fromUserProfileField('office', me?.officeAddress as any);
    if (home) list.push(home);
    if (office) list.push(office);

    if (!home && me?.location && (me.location.address || (me.location as any).pincode)) {
      list.push({
        id: 'home',
        label: 'home',
        isDefault: true,
        address: me.location.address || '',
        city: (me.location as any).city,
        district: (me.location as any).district || (me.location as any).city,
        state: (me.location as any).state,
        pincode: (me.location as any).pincode || '',
        latitude: me.location.latitude,
        longitude: me.location.longitude,
      });
    }

    const serverExtras = ((me as any)?.serviceAddresses || []) as SavedAddress[];
    for (const extra of serverExtras) {
      if (!extra?.address && !extra?.pincode) continue;
      list.push({
        ...extra,
        id: extra.id || `other_${Date.now()}`,
        label: (extra.label as any) || 'other',
      });
    }

    // One-time migrate AsyncStorage "other" addresses into profile
    const legacy = await readLegacyExtras();
    if (legacy.length > 0) {
      const existingKeys = new Set(list.map(addressKey));
      const toMerge = legacy.filter(a => a.address || a.pincode);
      const merged = [...serverExtras];
      let changed = false;
      for (const item of toMerge) {
        const key = addressKey(item);
        if (existingKeys.has(key)) continue;
        const saved: SavedAddress = {
          ...cleanAddressData(item),
          id: item.id || `other_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          label: 'other',
          customLabel: item.customLabel,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        merged.push(saved);
        list.push(saved);
        existingKeys.add(key);
        changed = true;
      }
      if (changed) {
        const updated = await usersApi.updateMe({serviceAddresses: merged} as any);
        await persistSessionUser(updated);
      }
      await clearLegacyExtras();
    }

    return list;
  } catch (e) {
    console.warn('[ADDRESS] getSavedAddresses failed:', e);
    return [];
  }
};

export const saveAddress = async (
  address: Omit<SavedAddress, 'id' | 'createdAt' | 'updatedAt'> & {id?: string},
): Promise<SavedAddress> => {
  if (!(await getStoredJwt())) {
    throw new Error('Please login to save addresses');
  }

  const cleaned = cleanAddressData(address);
  const label = address.label || 'other';

  if (label === 'home' || label === 'office') {
    const payload = {
      ...cleaned,
      label,
      customLabel: undefined,
    };
    const updates: any =
      label === 'home' ? {homeAddress: payload} : {officeAddress: payload};
    const updated = await usersApi.updateMe(updates);
    await persistSessionUser(updated);
    return {
      id: label,
      label,
      isDefault: label === 'home',
      ...cleaned,
    };
  }

  const me = await usersApi.getMe();
  const extras = ([...((me as any)?.serviceAddresses || [])] as SavedAddress[]).map(
    a => ({...a}),
  );
  const key = addressKey(cleaned);
  const existingIdx = extras.findIndex(a => addressKey(a) === key);
  const now = new Date().toISOString();

  let saved: SavedAddress;
  if (existingIdx >= 0) {
    saved = {
      ...extras[existingIdx],
      ...cleaned,
      label: 'other',
      customLabel: address.customLabel || extras[existingIdx].customLabel,
      updatedAt: now,
    };
    extras[existingIdx] = saved;
  } else {
    saved = {
      ...cleaned,
      id: `other_${Date.now()}`,
      label: 'other',
      customLabel: address.customLabel,
      createdAt: now,
      updatedAt: now,
    };
    extras.push(saved);
  }

  const updated = await usersApi.updateMe({serviceAddresses: extras} as any);
  await persistSessionUser(updated);
  return saved;
};

/** Save address used in a service request if not already stored */
export const rememberServiceAddress = async (
  address: Partial<SavedAddress> & {label?: SavedAddress['label']},
): Promise<SavedAddress | null> => {
  if (!address?.address || !address?.pincode) return null;
  const label = address.label || 'other';
  try {
    return await saveAddress({
      ...(address as any),
      label,
      customLabel:
        label === 'other'
          ? address.customLabel || address.label || 'Other'
          : undefined,
    });
  } catch (e) {
    console.warn('[ADDRESS] rememberServiceAddress failed:', e);
    return null;
  }
};

export const updateAddress = async (
  addressId: string,
  updates: Partial<SavedAddress>,
): Promise<SavedAddress> => {
  if (!(await getStoredJwt())) {
    throw new Error('Please login to update addresses');
  }

  const cleaned = cleanAddressData(updates);

  if (addressId === 'home' || updates.label === 'home') {
    const me = await usersApi.updateMe({
      homeAddress: {...(await usersApi.getMe())?.homeAddress, ...cleaned, label: 'home'},
    });
    await persistSessionUser(me);
    return {id: 'home', label: 'home', ...cleaned};
  }

  if (addressId === 'office' || updates.label === 'office') {
    const me = await usersApi.updateMe({
      officeAddress: {
        ...(await usersApi.getMe())?.officeAddress,
        ...cleaned,
        label: 'office',
      },
    });
    await persistSessionUser(me);
    return {id: 'office', label: 'office', ...cleaned};
  }

  const me = await usersApi.getMe();
  const extras = ([...((me as any)?.serviceAddresses || [])] as SavedAddress[]);
  const idx = extras.findIndex(a => a.id === addressId);
  if (idx < 0) throw new Error('Address not found');
  extras[idx] = {
    ...extras[idx],
    ...cleaned,
    updatedAt: new Date().toISOString(),
  };
  const updated = await usersApi.updateMe({serviceAddresses: extras} as any);
  await persistSessionUser(updated);
  return extras[idx];
};

export const deleteAddress = async (addressId: string): Promise<void> => {
  if (!(await getStoredJwt())) {
    throw new Error('Please login to delete addresses');
  }

  if (addressId === 'home') {
    await usersApi.updateMe({homeAddress: null as any});
    return;
  }
  if (addressId === 'office') {
    await usersApi.updateMe({officeAddress: null as any});
    return;
  }

  const me = await usersApi.getMe();
  const extras = ((me as any)?.serviceAddresses || []).filter(
    (a: SavedAddress) => a.id !== addressId,
  );
  const updated = await usersApi.updateMe({serviceAddresses: extras} as any);
  await persistSessionUser(updated);
};

export const setDefaultAddress = async (addressId: string): Promise<void> => {
  if (addressId === 'home') return;
  const list = await getSavedAddresses();
  const target = list.find(a => a.id === addressId);
  if (!target) return;
  await saveAddress({...target, label: 'home', isDefault: true});
};

export function formatAddressLabel(
  address: SavedAddress,
  t?: (key: string) => string,
): string {
  if (address.label === 'home') return t?.('services.home') || 'Home';
  if (address.label === 'office') {
    return t?.('services.work') || t?.('services.office') || 'Office';
  }
  return address.customLabel || t?.('services.other') || 'Other';
}

export default {
  getSavedAddresses,
  saveAddress,
  rememberServiceAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  formatAddressLabel,
};

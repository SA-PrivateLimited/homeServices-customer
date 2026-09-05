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
  // Spread field first, then lock id/label/isDefault so mirrors cannot clobber them.
  return {
    ...field,
    id: label,
    label,
    customLabel: (field as any).customLabel,
    isDefault: Boolean((field as any).isDefault),
  };
}

/** Exactly one default when the book is non-empty (web parity). */
function ensureOneDefault(list: SavedAddress[]): SavedAddress[] {
  if (list.length === 0) return list;
  const defaultIdx = list.findIndex(a => a.isDefault);
  if (defaultIdx >= 0) {
    return list.map((a, i) => ({...a, isDefault: i === defaultIdx}));
  }
  const homeIdx = list.findIndex(a => a.id === 'home' || a.label === 'home');
  const idx = homeIdx >= 0 ? homeIdx : 0;
  return list.map((a, i) => ({...a, isDefault: i === idx}));
}

/**
 * Flat book: serviceAddresses + legacy home/office slots not already listed.
 * Matches customer-web `buildFlatList` so isDefault is respected.
 */
function buildFlatList(me: any): SavedAddress[] {
  const extras = (((me as any)?.serviceAddresses || []) as SavedAddress[])
    .filter(a => a?.address || a?.pincode)
    .map(a => ({
      ...a,
      id: a.id || `other_${Date.now()}`,
      label: (a.label as SavedAddress['label']) || 'other',
      isDefault: Boolean(a.isDefault),
    }));

  const keys = new Set(extras.map(a => addressKey(a)).filter(Boolean));
  const list: SavedAddress[] = [...extras];

  const home = fromUserProfileField('home', me?.homeAddress as any);
  if (home && !keys.has(addressKey(home))) {
    list.unshift(home);
    keys.add(addressKey(home));
  }

  const office = fromUserProfileField('office', me?.officeAddress as any);
  if (office && !keys.has(addressKey(office))) {
    list.push(office);
    keys.add(addressKey(office));
  }

  if (
    list.length === 0 &&
    me?.location &&
    (me.location.address || (me.location as any).pincode)
  ) {
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

  return ensureOneDefault(list);
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
    let list = buildFlatList(me);

    // One-time migrate AsyncStorage "other" addresses into profile
    const legacy = await readLegacyExtras();
    if (legacy.length > 0) {
      const existingKeys = new Set(list.map(addressKey));
      const serverExtras = ((me as any)?.serviceAddresses || []) as SavedAddress[];
      const merged = [...serverExtras];
      let changed = false;
      for (const item of legacy.filter(a => a.address || a.pincode)) {
        const key = addressKey(item);
        if (existingKeys.has(key)) continue;
        const saved: SavedAddress = {
          ...cleanAddressData(item),
          id:
            item.id ||
            `other_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          label: 'other',
          customLabel: item.customLabel,
          isDefault: false,
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
        list = buildFlatList(updated);
      }
      await clearLegacyExtras();
    }

    return ensureOneDefault(list);
  } catch (e) {
    console.warn('[ADDRESS] getSavedAddresses failed:', e);
    return [];
  }
};

function newAddressId(): string {
  return `addr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function toPersistable(a: SavedAddress): Record<string, unknown> {
  return cleanAddressData({
    id: a.id,
    label: a.label,
    customLabel: a.label === 'other' ? a.customLabel : undefined,
    isDefault: Boolean(a.isDefault),
    address: a.address,
    landmark: a.landmark,
    city: a.city,
    district: a.district,
    state: a.state,
    stateId: a.stateId,
    districtId: a.districtId,
    pincode: a.pincode,
    latitude: a.latitude,
    longitude: a.longitude,
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  });
}

function mirrorsFromList(list: SavedAddress[]): {
  homeAddress: Record<string, unknown> | null;
  officeAddress: Record<string, unknown> | null;
} {
  const defaultAddr = list.find(a => a.isDefault) || list[0];
  // Prefer the home-labeled default when present (web parity).
  const homeSrc =
    list.find(a => a.label === 'home' && a.isDefault) ||
    list.find(a => a.label === 'home') ||
    (defaultAddr?.label !== 'office' ? defaultAddr : undefined);
  const officeSrc = list.find(a => a.label === 'office');
  const strip = (a: SavedAddress) => {
    const row = toPersistable(a);
    delete row.id;
    return row;
  };
  return {
    homeAddress: homeSrc ? strip(homeSrc) : null,
    officeAddress: officeSrc ? strip(officeSrc) : null,
  };
}

/** Persist flat list to serviceAddresses + Settings mirrors (web parity). */
async function persistFlatList(list: SavedAddress[]): Promise<SavedAddress[]> {
  const normalized = ensureOneDefault(
    list.map(a => ({
      ...a,
      id:
        !a.id || a.id === 'home' || a.id === 'office' ? newAddressId() : a.id,
    })),
  );
  const mirrors = mirrorsFromList(normalized);
  const updated = await usersApi.updateMe({
    serviceAddresses: normalized.map(toPersistable),
    homeAddress: mirrors.homeAddress,
    officeAddress: mirrors.officeAddress,
  } as any);
  await persistSessionUser(updated);
  // Return what we wrote (web parity). Rebuilding from the response can lose
  // selection when legacy home/office ids were remapped on this write.
  return normalized;
}

/** Find an address after persist (ids may change when migrating home/office). */
export function findPersistedAddress(
  list: SavedAddress[],
  opts: {id?: string | null; before?: SavedAddress | null; preferDefault?: boolean},
): SavedAddress | undefined {
  const {id, before, preferDefault} = opts;
  if (id) {
    const byId = list.find(a => a.id === id);
    if (byId) return byId;
  }
  if (before) {
    const key = addressKey(before);
    if (key) {
      const byKey = list.find(a => addressKey(a) === key);
      if (byKey) return byKey;
    }
  }
  if (preferDefault) {
    return list.find(a => a.isDefault) || list[0];
  }
  return undefined;
}

export const saveAddress = async (
  address: Omit<SavedAddress, 'id' | 'createdAt' | 'updatedAt'> & {id?: string},
): Promise<SavedAddress> => {
  if (!(await getStoredJwt())) {
    throw new Error('Please login to save addresses');
  }

  const me = await usersApi.getMe();
  const list = buildFlatList(me);
  const cleaned = cleanAddressData(address);
  const label = (address.label as SavedAddress['label']) || 'other';
  const now = new Date().toISOString();
  const key = addressKey(cleaned);

  const existingIdx = key ? list.findIndex(a => addressKey(a) === key) : -1;
  let saved: SavedAddress;
  if (existingIdx >= 0) {
    saved = {
      ...list[existingIdx],
      ...cleaned,
      label,
      customLabel:
        label === 'other'
          ? address.customLabel || list[existingIdx].customLabel
          : undefined,
      updatedAt: now,
    };
    list[existingIdx] = saved;
  } else {
    saved = {
      ...cleaned,
      id: newAddressId(),
      label,
      customLabel: label === 'other' ? address.customLabel : undefined,
      createdAt: now,
      updatedAt: now,
      isDefault: list.length === 0 || Boolean(address.isDefault),
    };
    list.push(saved);
  }

  if (address.isDefault || list.length === 1) {
    for (let i = 0; i < list.length; i++) {
      list[i] = {...list[i], isDefault: list[i].id === saved.id};
    }
    saved = {...saved, isDefault: true};
  }

  const persisted = await persistFlatList(list);
  return (
    findPersistedAddress(persisted, {id: saved.id, before: saved, preferDefault: true}) ||
    saved
  );
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

  const me = await usersApi.getMe();
  const list = buildFlatList(me);
  const idx = list.findIndex(a => a.id === addressId);
  if (idx < 0) throw new Error('Address not found');

  const cleaned = cleanAddressData(updates);
  const nextLabel = updates.label
    ? ((updates.label as SavedAddress['label']) || list[idx].label)
    : undefined;
  const wasDefault = Boolean(list[idx].isDefault);

  list[idx] = {
    ...list[idx],
    ...cleaned,
    ...(nextLabel ? {label: nextLabel} : {}),
    customLabel:
      (nextLabel || list[idx].label) === 'other'
        ? updates.customLabel ?? list[idx].customLabel
        : undefined,
    isDefault:
      updates.isDefault !== undefined ? Boolean(updates.isDefault) : wasDefault,
    updatedAt: new Date().toISOString(),
  };

  if (list[idx].isDefault) {
    for (let i = 0; i < list.length; i++) {
      if (i !== idx) list[i] = {...list[i], isDefault: false};
    }
  }

  const before = list[idx];
  const persisted = await persistFlatList(list);
  const found = findPersistedAddress(persisted, {
    id: before.id,
    before,
    preferDefault: Boolean(before.isDefault),
  });
  if (!found) throw new Error('Address not found');
  return found;
};

export const deleteAddress = async (addressId: string): Promise<void> => {
  if (!(await getStoredJwt())) {
    throw new Error('Please login to delete addresses');
  }
  const me = await usersApi.getMe();
  const list = buildFlatList(me).filter(a => a.id !== addressId);
  await persistFlatList(list);
};

/** Mark one address as the usual/default (web parity). */
export const setDefaultAddress = async (
  addressId: string,
): Promise<SavedAddress[]> => {
  if (!(await getStoredJwt())) {
    throw new Error('Please login to update addresses');
  }
  const me = await usersApi.getMe();
  const list = buildFlatList(me);
  if (!list.some(a => a.id === addressId)) {
    throw new Error('Address not found');
  }
  const next = list.map(a => ({
    ...a,
    isDefault: a.id === addressId,
  }));
  return persistFlatList(next);
};

export function formatAddressLabel(
  address: SavedAddress,
  t?: (key: string) => string,
): string {
  if (address.label === 'home') return t?.('services.home') || t?.('request.home') || 'Home';
  if (address.label === 'office') {
    return t?.('services.work') || t?.('services.office') || t?.('request.office') || 'Office';
  }
  return address.customLabel || t?.('services.other') || t?.('request.other') || 'Other';
}

export default {
  getSavedAddresses,
  saveAddress,
  rememberServiceAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  findPersistedAddress,
  formatAddressLabel,
};

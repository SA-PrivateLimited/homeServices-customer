/**
 * Address Service — MongoDB user profile + local extras (no Firebase).
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
  createdAt?: Date;
  updatedAt?: Date;
}

const EXTRA_ADDRESSES_KEY = 'hs_extra_addresses';

const cleanAddressData = (data: any): any => {
  const cleaned: any = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

async function readExtraAddresses(): Promise<SavedAddress[]> {
  try {
    const raw = await AsyncStorage.getItem(EXTRA_ADDRESSES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedAddress[];
  } catch {
    return [];
  }
}

async function writeExtraAddresses(list: SavedAddress[]): Promise<void> {
  await AsyncStorage.setItem(EXTRA_ADDRESSES_KEY, JSON.stringify(list));
}

function fromUserProfileField(
  label: 'home' | 'office',
  field?: UserLocation | null,
): SavedAddress | null {
  if (!field?.address && !field?.pincode) return null;
  return {
    id: label,
    label,
    isDefault: label === 'home',
    ...field,
  };
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

    // Fallback: map generic profile location as home if no homeAddress yet
    if (!home && me?.location && (me.location.address || (me.location as any).pincode)) {
      list.push({
        id: 'home',
        label: 'home',
        isDefault: true,
        address: me.location.address || '',
        city: (me.location as any).city,
        state: (me.location as any).state,
        pincode: (me.location as any).pincode || '',
        latitude: me.location.latitude,
        longitude: me.location.longitude,
      });
    }

    const extras = await readExtraAddresses();
    return [...list, ...extras];
  } catch (e) {
    console.warn('[ADDRESS] getSavedAddresses failed:', e);
    return [];
  }
};

export const saveAddress = async (
  address: Omit<SavedAddress, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<SavedAddress> => {
  if (!(await getStoredJwt())) {
    throw new Error('Please login to save addresses');
  }

  const cleaned = cleanAddressData(address);

  if (address.label === 'home' || address.label === 'office') {
    const updates: any =
      address.label === 'home'
        ? {homeAddress: cleaned}
        : {officeAddress: cleaned};
    const updated = await usersApi.updateMe(updates);
    const jwt = await getStoredJwt();
    if (jwt) await setSession(jwt, updated as any);
    return {
      id: address.label,
      label: address.label,
      isDefault: address.label === 'home',
      ...cleaned,
    };
  }

  const extras = await readExtraAddresses();
  const saved: SavedAddress = {
    ...cleaned,
    id: `other_${Date.now()}`,
    label: 'other',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  extras.push(saved);
  await writeExtraAddresses(extras);
  return saved;
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
      homeAddress: {...(await usersApi.getMe())?.homeAddress, ...cleaned},
    });
    const jwt = await getStoredJwt();
    if (jwt) await setSession(jwt, me as any);
    return {id: 'home', label: 'home', ...cleaned};
  }

  if (addressId === 'office' || updates.label === 'office') {
    const me = await usersApi.updateMe({
      officeAddress: {...(await usersApi.getMe())?.officeAddress, ...cleaned},
    });
    const jwt = await getStoredJwt();
    if (jwt) await setSession(jwt, me as any);
    return {id: 'office', label: 'office', ...cleaned};
  }

  const extras = await readExtraAddresses();
  const idx = extras.findIndex(a => a.id === addressId);
  if (idx < 0) throw new Error('Address not found');
  extras[idx] = {
    ...extras[idx],
    ...cleaned,
    updatedAt: new Date(),
  };
  await writeExtraAddresses(extras);
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

  const extras = await readExtraAddresses();
  await writeExtraAddresses(extras.filter(a => a.id !== addressId));
};

export const setDefaultAddress = async (addressId: string): Promise<void> => {
  // Home is treated as default in this Mongo-backed model.
  if (addressId === 'home') return;
  const list = await getSavedAddresses();
  const target = list.find(a => a.id === addressId);
  if (!target) return;
  await saveAddress({...target, label: 'home', isDefault: true});
};

export default {
  getSavedAddresses,
  saveAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
};

import {PermissionsAndroid, Platform} from 'react-native';
import {
  registerNativeContactPicker,
  type NativeContactRecord,
} from 'sapvt-ltd-app-packages';

async function ensureContactsPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}

function loadContactsModule(): {
  getAll: () => Promise<NativeContactRecord[]>;
} | null {
  try {
    // Optional native module — host app must install react-native-contacts.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('react-native-contacts').default;
  } catch {
    return null;
  }
}

/** Pick the first contact with a usable Indian mobile (native sheet TBD). */
export function registerDeviceContactPicker(): void {
  registerNativeContactPicker(async () => {
    const allowed = await ensureContactsPermission();
    if (!allowed) return null;
    const Contacts = loadContactsModule();
    if (!Contacts) return null;
    const rows = await Contacts.getAll();
    const withPhone = (rows || []).find(row =>
      (row.phoneNumbers || []).some(p => Boolean(p.number)),
    );
    return withPhone || null;
  });
}

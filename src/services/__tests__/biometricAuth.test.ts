import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Keychain from 'react-native-keychain';
import {
  bindingServiceId,
  classifyKeychainError,
  normalizeBindingPhone,
} from '../biometricBinding';
import {
  clearBinding,
  enrollBiometric,
  hasBinding,
  unlockWithBiometrics,
  updateStoredPin,
} from '../biometricAuth';

jest.mock('react-native-keychain', () => ({
  ACCESS_CONTROL: {BIOMETRY_CURRENT_SET: 'BiometryCurrentSet'},
  ACCESSIBLE: {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'AccessibleWhenUnlockedThisDeviceOnly',
  },
  AUTHENTICATION_TYPE: {BIOMETRICS: 'AuthenticationWithBiometrics'},
  STORAGE_TYPE: {RSA: 'KeystoreRSAECB'},
  BIOMETRY_TYPE: {
    FINGERPRINT: 'Fingerprint',
    TOUCH_ID: 'TouchID',
    FACE: 'Face',
    FACE_ID: 'FaceID',
    IRIS: 'Iris',
    OPTIC_ID: 'OpticID',
  },
  getSupportedBiometryType: jest.fn(),
  getAllGenericPasswordServices: jest.fn(),
  setGenericPassword: jest.fn(),
  getGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
}));

const PHONE_A = '+919876543210';
const PHONE_B = '+919123456789';
const PROMPT = {title: 'Unlock', cancel: 'Cancel'};

describe('biometricBinding', () => {
  it('binds a unique Keystore service per mobile number', () => {
    const a = bindingServiceId(PHONE_A);
    const b = bindingServiceId(PHONE_B);
    expect(a).toBe('com.akansho.customer.bio.919876543210');
    expect(b).toBe('com.akansho.customer.bio.919123456789');
    expect(a).not.toBe(b);
  });

  it('normalizes local 10-digit numbers to the same E.164 identity', () => {
    expect(normalizeBindingPhone('9876543210')).toBe(PHONE_A);
    expect(normalizeBindingPhone(PHONE_A)).toBe(PHONE_A);
  });

  it('classifies OS biometric errors without treating cancel as lockout', () => {
    expect(classifyKeychainError({message: 'User canceled'})).toBe('cancelled');
    expect(
      classifyKeychainError({message: 'Key permanently invalidated'}),
    ).toBe('invalidated');
    expect(classifyKeychainError({message: 'No fingerprints enrolled'})).toBe(
      'not_enrolled',
    );
    expect(classifyKeychainError({message: 'Fingerprint hardware not available'})).toBe(
      'unavailable',
    );
  });
});

describe('biometricAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValue(
      'Fingerprint',
    );
    (Keychain.getAllGenericPasswordServices as jest.Mock).mockResolvedValue([]);
    (Keychain.setGenericPassword as jest.Mock).mockResolvedValue({
      service: 'x',
      storage: 'rsa',
    });
    (Keychain.resetGenericPassword as jest.Mock).mockResolvedValue(true);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.multiRemove as jest.Mock).mockResolvedValue(undefined);
  });

  it('rejects Account B credentials when Account A is selected', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1');
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
      username: PHONE_B,
      password: '5678',
      service: bindingServiceId(PHONE_A),
      storage: 'rsa',
    });

    const result = await unlockWithBiometrics(PHONE_A, PROMPT);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('mismatch');
    }
  });

  it('returns the PIN only after OS biometric success for the same number', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1');
    (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
      username: PHONE_A,
      password: '4321',
      service: bindingServiceId(PHONE_A),
      storage: 'rsa',
    });

    const result = await unlockWithBiometrics(PHONE_A, PROMPT);
    expect(result).toEqual({ok: true, pin: '4321', phone: PHONE_A});
  });

  it('does not disable biometrics when a PIN update write fails', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1');
    (Keychain.setGenericPassword as jest.Mock).mockRejectedValue(
      new Error('User canceled'),
    );

    await updateStoredPin(PHONE_A, '8888');
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalled();
    expect(AsyncStorage.multiRemove).not.toHaveBeenCalled();
  });

  it('clears only the selected account binding', async () => {
    await clearBinding(PHONE_A);
    expect(Keychain.resetGenericPassword).toHaveBeenCalledTimes(1);
    expect(Keychain.resetGenericPassword).toHaveBeenCalledWith({
      service: bindingServiceId(PHONE_A),
    });
    expect(Keychain.resetGenericPassword).not.toHaveBeenCalledWith({
      service: bindingServiceId(PHONE_B),
    });
  });

  it('enrolls against the phone-specific service, not a global flag', async () => {
    await enrollBiometric(PHONE_A, '2468', PROMPT);
    expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
      PHONE_A,
      '2468',
      expect.objectContaining({service: bindingServiceId(PHONE_A)}),
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      `hs_customer_bio_on.${bindingServiceId(PHONE_A)}`,
      '1',
    );
  });

  it('does not treat an enrollment index as authentication', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('1');
    expect(await hasBinding(PHONE_A)).toBe(true);
    expect(Keychain.getGenericPassword).not.toHaveBeenCalled();
  });
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {PermissionsAndroid, Platform} from 'react-native';
import messaging from '@react-native-firebase/messaging';

const SEEN_KEY = 'akanso_push_enable_prompt_v1';

export async function hasDeferredPushEnablePrompt(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(SEEN_KEY)) === '1';
  } catch {
    return false;
  }
}

export async function markPushEnablePromptSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}

export async function isPushPermissionDefault(): Promise<boolean> {
  try {
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      return !granted;
    }
    const status = await messaging().hasPermission();
    return status === messaging.AuthorizationStatus.NOT_DETERMINED;
  } catch {
    return false;
  }
}

export async function shouldOfferPushEnablePrompt(): Promise<boolean> {
  if (!(await isPushPermissionDefault())) return false;
  if (await hasDeferredPushEnablePrompt()) return false;
  return true;
}

import {NativeModules, Platform} from 'react-native';

const {NativeSplashModule} = NativeModules;

/** Dismiss the Android system splash once the JS 3D overlay is painted. */
export function hideNativeSplash() {
  if (Platform.OS !== 'android') {
    return;
  }
  NativeSplashModule?.hide?.();
}

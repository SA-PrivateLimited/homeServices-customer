export {};

declare global {
  // Metro / RN sometimes expose a browser-like window for polyfills.
  // eslint-disable-next-line no-var
  var window:
    | (typeof globalThis & {
        TextEncoder?: typeof TextEncoder;
        TextDecoder?: typeof TextDecoder;
        addEventListener?: (
          type: string,
          listener: (...args: any[]) => void,
        ) => void;
        removeEventListener?: (
          type: string,
          listener: (...args: any[]) => void,
        ) => void;
        location?: {origin: string; href?: string};
      })
    | undefined;

  var addEventListener:
    | ((type: string, listener: (...args: any[]) => void) => void)
    | undefined;
  var removeEventListener:
    | ((type: string, listener: (...args: any[]) => void) => void)
    | undefined;
}

declare module 'react-native-push-notification';
declare module 'react-native-html-to-pdf';
declare module 'react-native-vector-icons/MaterialIcons';
declare module 'react-native-vector-icons/Ionicons';
declare module 'react-native-contacts';

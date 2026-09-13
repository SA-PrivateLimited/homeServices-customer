import type {LinkingOptions} from '@react-navigation/native';

/** Open `/auth/handoff?code=` from Partner web or App Links. */
export const customerLinking: LinkingOptions<any> = {
  prefixes: ['https://akansho.com', 'https://www.akansho.com', 'akansho://'],
  config: {
    screens: {
      AuthHandoff: 'auth/handoff',
      Login: 'login',
      Main: {
        path: '',
        screens: {
          Providers: {
            path: 'browse',
            screens: {
              ProvidersList: '',
            },
          },
        },
      },
    },
  },
};

import {create} from 'zustand';
import {
  getGreetingStatus,
  type GreetingConfig,
} from '../services/api/greetingApi';

type GreetingStore = {
  config: GreetingConfig | null;
  setConfig: (config: GreetingConfig | null) => void;
  hydrate: () => Promise<void>;
};

export const useGreetingStore = create<GreetingStore>(set => ({
  config: null,
  setConfig: config => set({config}),
  hydrate: async () => {
    try {
      const config = await getGreetingStatus();
      set({config});
    } catch {
      set({config: null});
    }
  },
}));

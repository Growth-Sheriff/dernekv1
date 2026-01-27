import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  // TODO: Define state
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // TODO: Implement store
    }),
    {
      name: 'settings-storage',
    }
  )
);

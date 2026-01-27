import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiState {
  // TODO: Define state
}

export const useUiStore = create<UiState>()(
  persist(
    (set, get) => ({
      // TODO: Implement store
    }),
    {
      name: 'ui-storage',
    }
  )
);

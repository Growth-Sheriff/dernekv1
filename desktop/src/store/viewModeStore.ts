import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ViewMode = 'simple' | 'expert';

interface ViewModeState {
    mode: ViewMode;
    setMode: (mode: ViewMode) => void;
    toggleMode: () => void;
}

export const useViewModeStore = create<ViewModeState>()(
    persist(
        (set, get) => ({
            mode: 'simple', // Varsayılan basit mod
            setMode: (mode) => set({ mode }),
            toggleMode: () => set({ mode: get().mode === 'simple' ? 'expert' : 'simple' }),
        }),
        {
            name: 'view-mode-storage',
        }
    )
);

// Hook for easy access
export const useViewMode = () => {
    const { mode, setMode, toggleMode } = useViewModeStore();
    return {
        mode,
        isSimple: mode === 'simple',
        isExpert: mode === 'expert',
        setMode,
        toggleMode,
    };
};

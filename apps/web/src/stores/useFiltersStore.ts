import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FiltersState {
  // Category and price band filters
  selectedCategories: string[];
  selectedPriceBands: string[];

  // Context-based filters
  isOpenNow: boolean;
  hasEventToday: boolean;
  within30Minutes: boolean;
  rainSafe: boolean;

  // User location for distance-based filters
  userLocation: { lat: number; lng: number } | null;

  // Show user location toggle
  showUserLocation: boolean;

  // Hydration state
  _hasHydrated: boolean;

  // Actions
  setSelectedCategories: (categories: string[]) => void;
  setSelectedPriceBands: (priceBands: string[]) => void;
  setIsOpenNow: (value: boolean) => void;
  setHasEventToday: (value: boolean) => void;
  setWithin30Minutes: (value: boolean) => void;
  setRainSafe: (value: boolean) => void;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  setShowUserLocation: (show: boolean) => void;
  resetFilters: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
}

const initialState = {
  selectedCategories: [] as string[],
  selectedPriceBands: [] as string[],
  isOpenNow: false,
  hasEventToday: false,
  within30Minutes: false,
  rainSafe: false,
  userLocation: null as { lat: number; lng: number } | null,
  showUserLocation: false,
  _hasHydrated: false,
};

export const useFiltersStore = create<FiltersState>()(
  persist(
    (set) => ({
      ...initialState,

      setSelectedCategories: (categories) => set({ selectedCategories: categories }),
      setSelectedPriceBands: (priceBands) => set({ selectedPriceBands: priceBands }),
      setIsOpenNow: (value) => set({ isOpenNow: value }),
      setHasEventToday: (value) => set({ hasEventToday: value }),
      setWithin30Minutes: (value) => set({ within30Minutes: value }),
      setRainSafe: (value) => set({ rainSafe: value }),
      setUserLocation: (location) => set({ userLocation: location }),
      setShowUserLocation: (show) => set({ showUserLocation: show }),
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),

      resetFilters: () => set(initialState),
    }),
    {
      name: "home-filters-storage", // localStorage key
      // Do not persist userLocation — stale coords after moving / PWA resume.
      // Prefer showUserLocation + a fresh GPS fix (see useLiveUserGeolocation).
      partialize: (state) => ({
        selectedCategories: state.selectedCategories,
        selectedPriceBands: state.selectedPriceBands,
        isOpenNow: state.isOpenNow,
        hasEventToday: state.hasEventToday,
        within30Minutes: state.within30Minutes,
        rainSafe: state.rainSafe,
        showUserLocation: state.showUserLocation,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && typeof state.showUserLocation === "undefined") {
          state.showUserLocation = false;
        }
        // Drop any legacy persisted pin from older clients.
        if (state) {
          state.userLocation = null;
        }
        state?.setHasHydrated(true);
      },
    }
  )
);

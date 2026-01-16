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
      // Persist userLocation for a short time (max 5 minutes old) to show on page refresh
      partialize: (state) => ({
        selectedCategories: state.selectedCategories,
        selectedPriceBands: state.selectedPriceBands,
        isOpenNow: state.isOpenNow,
        hasEventToday: state.hasEventToday,
        within30Minutes: state.within30Minutes,
        rainSafe: state.rainSafe,
        // Persist userLocation if it exists (will be validated on load)
        userLocation: state.userLocation,
        // Persist showUserLocation toggle state
        showUserLocation: state.showUserLocation,
        // Don't persist _hasHydrated - it's runtime state
      }),
      onRehydrateStorage: () => (state) => {
        // This callback is called after rehydration is complete
        // Ensure showUserLocation has a default value if missing (migration)
        if (state && typeof state.showUserLocation === "undefined") {
          state.showUserLocation = false;
        }
        state?.setHasHydrated(true);
      },
    }
  )
);

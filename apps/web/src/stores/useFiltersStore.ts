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
  
  // Actions
  setSelectedCategories: (categories: string[]) => void;
  setSelectedPriceBands: (priceBands: string[]) => void;
  setIsOpenNow: (value: boolean) => void;
  setHasEventToday: (value: boolean) => void;
  setWithin30Minutes: (value: boolean) => void;
  setRainSafe: (value: boolean) => void;
  setUserLocation: (location: { lat: number; lng: number } | null) => void;
  resetFilters: () => void;
}

const initialState = {
  selectedCategories: [] as string[],
  selectedPriceBands: [] as string[],
  isOpenNow: false,
  hasEventToday: false,
  within30Minutes: false,
  rainSafe: false,
  userLocation: null as { lat: number; lng: number } | null,
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
      
      resetFilters: () => set(initialState),
    }),
    {
      name: "home-filters-storage", // localStorage key
      // Only persist certain fields (exclude userLocation as it's temporary)
      partialize: (state) => ({
        selectedCategories: state.selectedCategories,
        selectedPriceBands: state.selectedPriceBands,
        isOpenNow: state.isOpenNow,
        hasEventToday: state.hasEventToday,
        within30Minutes: state.within30Minutes,
        rainSafe: state.rainSafe,
        // userLocation is not persisted (temporary)
      }),
    }
  )
);


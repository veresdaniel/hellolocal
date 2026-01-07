import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ViewState {
  // View preferences
  showMap: boolean; // true = map view, false = list view
  mapHeight: number;
  mapCenter: { lat: number; lng: number; zoom: number } | null;
  
  // Actions
  setShowMap: (show: boolean) => void;
  setMapHeight: (height: number) => void;
  setMapCenter: (center: { lat: number; lng: number; zoom: number } | null) => void;
  resetView: () => void;
}

const initialViewState = {
  showMap: true, // Default to map view
  mapHeight: typeof window !== "undefined" ? window.innerHeight - 56 : 600, // 56 = compact footer height
  mapCenter: null as { lat: number; lng: number; zoom: number } | null,
};

export const useViewStore = create<ViewState>()(
  persist(
    (set) => ({
      ...initialViewState,
      
      setShowMap: (show) => set({ showMap: show }),
      setMapHeight: (height) => set({ mapHeight: height }),
      setMapCenter: (center) => set({ mapCenter: center }),
      
      resetView: () => set(initialViewState),
    }),
    {
      name: "home-view-storage", // localStorage key
      // Only persist view preference, not map center/height (they're UI state)
      partialize: (state) => ({
        showMap: state.showMap,
        // mapHeight and mapCenter are not persisted (UI state)
      }),
    }
  )
);


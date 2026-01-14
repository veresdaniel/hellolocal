import { create } from "zustand";

type ActiveBoxType = "filters" | "events" | null;

interface ActiveBoxState {
  activeBox: ActiveBoxType;
  setActiveBox: (box: ActiveBoxType) => void;
}

export const useActiveBoxStore = create<ActiveBoxState>((set) => ({
  activeBox: null,
  setActiveBox: (box) => set({ activeBox: box }),
}));

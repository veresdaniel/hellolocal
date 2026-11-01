import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type PublicGaOverrideContextValue = {
  /** Active override from the most specific page (place/event/town), or null. */
  overrideId: string | null;
  setOverrideId: (id: string | null) => void;
};

const PublicGaOverrideContext = createContext<PublicGaOverrideContextValue | null>(null);

export function PublicGaOverrideProvider({ children }: { children: ReactNode }) {
  const [overrideId, setOverrideIdState] = useState<string | null>(null);
  const setOverrideId = useCallback((id: string | null) => {
    setOverrideIdState(id?.trim() ? id.trim().toUpperCase() : null);
  }, []);
  const value = useMemo(
    () => ({ overrideId, setOverrideId }),
    [overrideId, setOverrideId]
  );
  return (
    <PublicGaOverrideContext.Provider value={value}>{children}</PublicGaOverrideContext.Provider>
  );
}

/** While mounted, overrides site-level GA with a more specific resolved ID. Clears on unmount. */
export function usePublicGaOverride(measurementId: string | null | undefined) {
  const ctx = useContext(PublicGaOverrideContext);
  // Depend on the stable setter only — putting `ctx` in deps re-runs when overrideId
  // changes, which clears then re-sets the ID and can infinite-loop.
  const setOverrideId = ctx?.setOverrideId;
  useEffect(() => {
    if (!setOverrideId) return;
    setOverrideId(measurementId ?? null);
    return () => setOverrideId(null);
  }, [setOverrideId, measurementId]);
}

export function usePublicGaOverrideId(): string | null {
  return useContext(PublicGaOverrideContext)?.overrideId ?? null;
}

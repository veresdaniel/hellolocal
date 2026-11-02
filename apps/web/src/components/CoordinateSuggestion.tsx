import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiGet } from "../api/client";

type GeocodeHit = { lat: number; lng: number; label: string };

type CoordinateSuggestionProps = {
  /** Town name, or place name plus street address. */
  query: string;
  /** When false, a name change fills empty coordinates. A filled pin is left alone. */
  filled: boolean;
  onApply: (lat: number, lng: number) => void;
};

export function CoordinateSuggestion({ query, filled, onApply }: CoordinateSuggestionProps) {
  const { t } = useTranslation();
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;
  const trimmed = query.trim();

  const lookup = async (apply: boolean) => {
    if (trimmed.length < 3) return;
    setBusy(true);
    setError("");
    try {
      const hit = await apiGet<GeocodeHit>(`/admin/geocode?q=${encodeURIComponent(trimmed)}`);
      if (apply) onApplyRef.current(hit.lat, hit.lng);
      setHint(t("admin.geocode.suggested", { label: hit.label }));
    } catch {
      setHint("");
      setError(t("admin.geocode.missing"));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (filled || trimmed.length < 3) return;
    const timer = window.setTimeout(() => {
      void lookup(true);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [trimmed, filled]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
      <button
        type="button"
        className="admin-btn"
        disabled={busy || trimmed.length < 3}
        onClick={() => void lookup(true)}
      >
        {t("admin.geocode.suggest")}
      </button>
      {hint ? <p style={{ margin: 0, color: "#166534", fontSize: 13 }}>{hint}</p> : null}
      {error ? <p style={{ margin: 0, color: "#991b1b", fontSize: 13 }}>{error}</p> : null}
    </div>
  );
}

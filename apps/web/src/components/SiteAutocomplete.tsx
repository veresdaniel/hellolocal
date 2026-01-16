import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { Site } from "../api/admin.api";
import { getHuTranslation } from "../utils/langHelpers";

interface SiteAutocompleteProps {
  selectedSiteIds: string[];
  onSiteIdsChange: (siteIds: string[]) => void;
  allSites: Site[]; // Pass all available sites as a prop
}

export function SiteAutocomplete({
  selectedSiteIds,
  onSiteIdsChange,
  allSites,
}: SiteAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Site[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableSites = useMemo(
    () => allSites.filter((site) => !selectedSiteIds.includes(site.id)),
    [allSites, selectedSiteIds]
  );

  useEffect(() => {
    if (inputValue.length > 0) {
      const filtered = availableSites.filter(
        (site) =>
          site.translations.some((t) => t.name.toLowerCase().includes(inputValue.toLowerCase())) ||
          site.slug.toLowerCase().includes(inputValue.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, availableSites]);

  const handleAddSite = (site: Site) => {
    if (!selectedSiteIds.includes(site.id)) {
      onSiteIdsChange([...selectedSiteIds, site.id]);
      setInputValue("");
      setSuggestions([]);
    }
  };

  const handleRemoveSite = (siteId: string) => {
    onSiteIdsChange(selectedSiteIds.filter((id) => id !== siteId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      handleAddSite(suggestions[0]);
    }
  };

  const getSiteName = (siteId: string) => {
    const site = allSites.find((s) => s.id === siteId);
    const huTranslation = site ? getHuTranslation(site.translations) : undefined;
    return huTranslation?.name || site?.slug || siteId;
  };

  return (
    <div style={{ position: "relative", marginBottom: 16 }}>
      <label
        style={{
          display: "block",
          marginBottom: 4,
          fontFamily:
            "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        {t("admin.sites")}
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {selectedSiteIds.map((siteId) => (
          <span
            key={siteId}
            style={{
              background: "#007bff",
              color: "white",
              padding: "4px 8px",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontFamily:
                "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            }}
          >
            {getSiteName(siteId)}
            <button
              type="button"
              onClick={() => handleRemoveSite(siteId)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: "clamp(14px, 3.5vw, 16px)",
                fontFamily:
                  "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t("admin.forms.addSites")}
        style={{
          width: "100%",
          padding: 8,
          fontSize: 16,
          border: "1px solid #ddd",
          borderRadius: 4,
        }}
      />
      {suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "white",
            border: "1px solid #ddd",
            borderRadius: 4,
            listStyle: "none",
            padding: 0,
            margin: "4px 0 0 0",
            zIndex: 100,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {suggestions.map((site) => (
            <li
              key={site.id}
              onClick={() => handleAddSite(site)}
              style={{
                padding: "8px 12px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#f0f0f0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "white";
              }}
            >
              {getHuTranslation(site.translations)?.name || site.slug}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { Tenant } from "../api/admin.api";

interface TenantAutocompleteProps {
  selectedTenantIds: string[];
  onTenantIdsChange: (tenantIds: string[]) => void;
  allTenants: Tenant[]; // Pass all available tenants as a prop
}

export function TenantAutocomplete({ selectedTenantIds, onTenantIdsChange, allTenants }: TenantAutocompleteProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState<Tenant[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const availableTenants = allTenants.filter(
    (tenant) => !selectedTenantIds.includes(tenant.id)
  );

  useEffect(() => {
    if (inputValue.length > 0) {
      const filtered = availableTenants.filter((tenant) =>
        tenant.translations.some((t) =>
          t.name.toLowerCase().includes(inputValue.toLowerCase())
        ) || tenant.slug.toLowerCase().includes(inputValue.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [inputValue, availableTenants]);

  const handleAddTenant = (tenant: Tenant) => {
    if (!selectedTenantIds.includes(tenant.id)) {
      onTenantIdsChange([...selectedTenantIds, tenant.id]);
      setInputValue("");
      setSuggestions([]);
    }
  };

  const handleRemoveTenant = (tenantId: string) => {
    onTenantIdsChange(selectedTenantIds.filter((id) => id !== tenantId));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      handleAddTenant(suggestions[0]);
    }
  };

  const getTenantName = (tenantId: string) => {
    const tenant = allTenants.find((t) => t.id === tenantId);
    return tenant?.translations.find((t) => t.lang === "hu")?.name || tenant?.slug || tenantId;
  };

  return (
    <div style={{ position: "relative", marginBottom: 16 }}>
      <label style={{ display: "block", marginBottom: 4 }}>{t("admin.tenants")}</label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {selectedTenantIds.map((tenantId) => (
          <span
            key={tenantId}
            style={{
              background: "#007bff",
              color: "white",
              padding: "4px 8px",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {getTenantName(tenantId)}
            <button
              type="button"
              onClick={() => handleRemoveTenant(tenantId)}
              style={{
                background: "none",
                border: "none",
                color: "white",
                cursor: "pointer",
                fontSize: 14,
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
        placeholder={t("admin.forms.addTenants")}
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
          {suggestions.map((tenant) => (
            <li
              key={tenant.id}
              onClick={() => handleAddTenant(tenant)}
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
              {tenant.translations.find((t) => t.lang === "hu")?.name || tenant.slug}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}


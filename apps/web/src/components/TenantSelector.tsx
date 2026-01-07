// src/components/TenantSelector.tsx
import { useTranslation } from "react-i18next";
import { useContext } from "react";
import { AdminTenantContext } from "../contexts/AdminTenantContext";
import { LoadingSpinner } from "./LoadingSpinner";

export function TenantSelector() {
  const { t } = useTranslation();
  const context = useContext(AdminTenantContext);
  
  // If context is not available, don't render anything (or render a placeholder)
  if (!context) {
    return null;
  }
  
  const { selectedTenantId, tenants, setSelectedTenantId, isLoading } = context;

  if (isLoading) {
    return (
      <>
        <LoadingSpinner isLoading={isLoading} delay={0} />
        <div style={{ padding: "8px 16px", background: "#f5f5f5", borderRadius: 4, color: "#666", visibility: "hidden" }}>
          {t("common.loading")}...
        </div>
      </>
    );
  }

  if (tenants.length === 0) {
    return (
      <div style={{ padding: "8px 16px", background: "#fee", borderRadius: 4, color: "#c00", fontSize: 14 }}>
        {t("admin.noTenants")}
      </div>
    );
  }

  // Helper function to get tenant name in Hungarian (or first available)
  const getTenantName = (tenant: typeof tenants[0]) => {
    const huTranslation = tenant.translations.find((t) => t.lang === "hu");
    return huTranslation?.name || tenant.translations[0]?.name || tenant.slug;
  };


  if (tenants.length === 1) {
    return (
      <div style={{ padding: "8px 16px", background: "#f5f5f5", borderRadius: 4 }}>
        {getTenantName(tenants[0])}
      </div>
    );
  }

  return (
    <select
      value={selectedTenantId || ""}
      onChange={(e) => setSelectedTenantId(e.target.value || null)}
      style={{
        padding: "8px 16px",
        fontSize: 16,
        borderRadius: 4,
        border: "1px solid #ddd",
        background: "white",
        cursor: "pointer",
      }}
    >
      {tenants.map((tenant) => (
        <option key={tenant.id} value={tenant.id}>
          {getTenantName(tenant)}
        </option>
      ))}
    </select>
  );
}


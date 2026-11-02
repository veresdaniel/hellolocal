import { useTranslation } from "react-i18next";

export function CrawlableToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{
            width: 20,
            height: 20,
            marginTop: 2,
            cursor: "pointer",
            accentColor: "var(--admin-primary)",
          }}
        />
        <span>
          <span style={{ color: "#333", fontWeight: 500 }}>{t("admin.isCrawlable")}</span>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
            {t("admin.isCrawlableDescription")}
          </div>
        </span>
      </label>
    </div>
  );
}

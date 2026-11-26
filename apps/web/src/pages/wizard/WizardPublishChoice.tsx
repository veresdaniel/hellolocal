import { useTranslation } from "react-i18next";
import { wizardLabel } from "./wizardStyles";

export type WizardPublishMode = "draft" | "publish";

type WizardPublishChoiceProps = {
  /** Superadmin or paid place plan — free-only users stay on draft. */
  canPublish: boolean;
  value: WizardPublishMode;
  onChange: (mode: WizardPublishMode) => void;
};

/**
 * Review-step publish mode. Free plan: draft only (notice).
 * Superadmin / paid: draft vs immediate publish.
 */
export function WizardPublishChoice({ canPublish, value, onChange }: WizardPublishChoiceProps) {
  const { t } = useTranslation();

  if (!canPublish) {
    return (
      <p style={{ margin: "16px 0 0", fontSize: 13, lineHeight: 1.45, color: "rgba(27,23,48,0.72)" }}>
        {t("admin.wizard.draftNotice")}
      </p>
    );
  }

  const option = (mode: WizardPublishMode, titleKey: string, bodyKey: string) => {
    const selected = value === mode;
    return (
      <label
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          padding: "12px 12px",
          borderRadius: 10,
          border: selected ? "2px solid var(--admin-primary, #1b1730)" : "2px solid rgba(27,23,48,0.14)",
          background: selected ? "rgba(27,23,48,0.04)" : "#fff",
          cursor: "pointer",
          boxSizing: "border-box",
        }}
      >
        <input
          type="radio"
          name="wizard-publish-mode"
          checked={selected}
          onChange={() => onChange(mode)}
          style={{ marginTop: 3, flexShrink: 0, width: 18, height: 18 }}
        />
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
            {t(titleKey)}
          </span>
          <span style={{ display: "block", fontSize: 13, lineHeight: 1.4, color: "rgba(27,23,48,0.7)" }}>
            {t(bodyKey)}
          </span>
        </span>
      </label>
    );
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ ...wizardLabel, marginBottom: 10 }}>{t("admin.wizard.publishMode")}</div>
      <div style={{ display: "grid", gap: 8 }}>
        {option("draft", "admin.wizard.publishDraft", "admin.wizard.publishDraftHint")}
        {option("publish", "admin.wizard.publishNow", "admin.wizard.publishNowHint")}
      </div>
    </div>
  );
}

/** True for superadmin, or when place plan is paid (not free). */
export function canChooseWizardPublish(
  role: string | null | undefined,
  plan?: string | null
): boolean {
  if (role === "superadmin") return true;
  if (!plan) return false;
  const p = String(plan).toLowerCase();
  return p !== "free" && p !== "";
}

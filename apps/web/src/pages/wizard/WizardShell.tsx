import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  wizardFooter,
  wizardPage,
  wizardPrimaryBtn,
  wizardSecondaryBtn,
} from "./wizardStyles";

type WizardShellProps = {
  title: string;
  stepIndex: number;
  stepCount: number;
  children: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  busy?: boolean;
  hideFooter?: boolean;
};

export function WizardShell({
  title,
  stepIndex,
  stepCount,
  children,
  onBack,
  onNext,
  nextLabel,
  nextDisabled,
  busy,
  hideFooter,
}: WizardShellProps) {
  const { t } = useTranslation();
  const progress = stepCount > 0 ? ((stepIndex + 1) / stepCount) * 100 : 0;

  return (
    <div style={wizardPage}>
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.02em",
            color: "rgba(255,255,255,0.88)",
            marginBottom: 4,
          }}
        >
          {t("admin.wizard.stepOf", { current: stepIndex + 1, total: stepCount })}
        </div>
        <h1
          style={{
            margin: "0 0 12px",
            fontSize: 22,
            lineHeight: 1.25,
            color: "#fff",
          }}
        >
          {title}
        </h1>
        <div
          style={{
            height: 6,
            borderRadius: 99,
            background: "rgba(255,255,255,0.28)",
            overflow: "hidden",
          }}
          role="progressbar"
          aria-valuenow={stepIndex + 1}
          aria-valuemin={1}
          aria-valuemax={stepCount}
        >
          <div
            style={{
              height: "100%",
              width: `${progress}%`,
              background: "#fff",
              transition: "width 0.2s ease",
            }}
          />
        </div>
      </div>

      {children}

      {!hideFooter && (
        <div style={wizardFooter}>
          {onBack ? (
            <button type="button" style={wizardSecondaryBtn} onClick={onBack} disabled={busy}>
              {t("admin.wizard.back")}
            </button>
          ) : (
            <div style={{ flex: 1 }} />
          )}
          {onNext && (
            <button
              type="button"
              style={{
                ...wizardPrimaryBtn,
                opacity: nextDisabled || busy ? 0.5 : 1,
              }}
              onClick={onNext}
              disabled={nextDisabled || busy}
            >
              {busy ? t("admin.wizard.saving") : nextLabel || t("admin.wizard.next")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  getVisitorLadder,
  saveVisitorLadder,
  type LadderAction,
  type LadderPlan,
  type VisitorLadderConfig,
} from "../api/admin.api";
import { LoadingSpinner } from "./LoadingSpinner";
import { useToast } from "../contexts/ToastContext";

const ACTIONS: LadderAction[] = ["notify", "apply-plan", "suspend"];
const PLANS: LadderPlan[] = ["FREE", "BASIC", "PRO", "BUSINESS", "MUNICIPAL"];

const empty: VisitorLadderConfig = {
  freeUntil: 1000,
  stepTwoFrom: 5000,
  stepThreeFrom: 20000,
  steps: [
    { action: "apply-plan", plan: "FREE" },
    { action: "notify", plan: "PRO" },
    { action: "notify", plan: "BUSINESS" },
  ],
};

export function VisitorLadderSettings() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [config, setConfig] = useState<VisitorLadderConfig>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getVisitorLadder()
      .then((row) => {
        if (!cancelled) setConfig(row);
      })
      .catch((err) => {
        if (!cancelled) {
          showToast(
            err instanceof Error ? err.message : t("admin.visitorLadder.loadFailed"),
            "error"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showToast, t]);

  const setThreshold = (key: "freeUntil" | "stepTwoFrom" | "stepThreeFrom", raw: string) => {
    const value = Number(raw);
    setConfig((prev) => ({ ...prev, [key]: Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0 }));
  };

  const setStep = (index: 0 | 1 | 2, patch: Partial<VisitorLadderConfig["steps"][number]>) => {
    setConfig((prev) => {
      const steps = [...prev.steps] as VisitorLadderConfig["steps"];
      steps[index] = { ...steps[index], ...patch };
      return { ...prev, steps };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const saved = await saveVisitorLadder(config);
      setConfig(saved);
      showToast(t("admin.visitorLadder.saved"), "success");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : t("admin.visitorLadder.saveFailed"),
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner isLoading={true} />;

  const labels = [
    t("admin.visitorLadder.step0"),
    t("admin.visitorLadder.step1"),
    t("admin.visitorLadder.step2"),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ margin: 0, color: "#666", fontSize: 15 }}>
        {t("admin.visitorLadder.help")}
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: 12,
        }}
      >
        {(
          [
            ["freeUntil", "X", t("admin.visitorLadder.freeUntil")],
            ["stepTwoFrom", "Y", t("admin.visitorLadder.stepTwoFrom")],
            ["stepThreeFrom", "Z", t("admin.visitorLadder.stepThreeFrom")],
          ] as const
        ).map(([key, mark, label]) => (
          <label key={key} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>
              {mark} · {label}
            </span>
            <input
              type="number"
              min={0}
              step={1}
              value={config[key]}
              onChange={(e) => setThreshold(key, e.target.value)}
              style={{
                minHeight: 40,
                padding: "0 12px",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                font: "inherit",
              }}
            />
          </label>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {([0, 1, 2] as const).map((index) => (
          <div
            key={index}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(140px, 1.2fr) 1fr 1fr",
              gap: 10,
              alignItems: "end",
              padding: 12,
              background: "#f8f9fa",
              borderRadius: 8,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, paddingBottom: 8 }}>{labels[index]}</div>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#666" }}>{t("admin.visitorLadder.action")}</span>
              <select
                value={config.steps[index].action}
                onChange={(e) => setStep(index, { action: e.target.value as LadderAction })}
                style={{ minHeight: 38, padding: "0 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
              >
                {ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {t(`admin.visitorLadder.actions.${action}`) || action}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#666" }}>{t("admin.visitorLadder.plan")}</span>
              <select
                value={config.steps[index].plan}
                onChange={(e) => setStep(index, { plan: e.target.value as LadderPlan })}
                style={{ minHeight: 38, padding: "0 10px", borderRadius: 8, border: "1px solid #d1d5db" }}
              >
                {PLANS.map((plan) => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ))}
      </div>

      <p style={{ margin: 0, color: "#666", fontSize: 13 }}>{t("admin.visitorLadder.note")}</p>

      <div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            minHeight: 42,
            padding: "0 18px",
            border: 0,
            borderRadius: 8,
            background: saving ? "#999" : "#16131f",
            color: "#fff",
            fontWeight: 600,
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? t("common.loading") : t("common.save")}
        </button>
      </div>
    </div>
  );
}

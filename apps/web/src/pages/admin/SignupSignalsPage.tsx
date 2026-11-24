import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { getSignupSignals, type SignupSignalRow } from "../../api/signupAbuse.api";
import { getAppSetting, updateAppSetting } from "../../api/admin.api";
import { useToast } from "../../contexts/ToastContext";
import { usePageTitle } from "../../hooks/usePageTitle";

const REQUIRE_CARD_KEY = "platform.freeTrialRequireCard";
const DISPOSABLE_KEY = "platform.disposableEmailDomains";

export function SignupSignalsPage() {
  const { t } = useTranslation();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang = langParam || "hu";
  const { showToast } = useToast();
  usePageTitle("admin.signupAbuse.title");

  const [rows, setRows] = useState<SignupSignalRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [requireCard, setRequireCard] = useState(false);
  const [disposableDraft, setDisposableDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [signals, cardSetting, disposable] = await Promise.all([
        getSignupSignals({ minScore: 0, limit: 200 }),
        getAppSetting(REQUIRE_CARD_KEY).catch(() => null),
        getAppSetting(DISPOSABLE_KEY).catch(() => null),
      ]);
      setRows(signals);
      const cardVal = String(cardSetting?.value || "")
        .trim()
        .toLowerCase();
      setRequireCard(cardVal === "true" || cardVal === "1" || cardVal === "yes");
      setDisposableDraft(disposable?.value || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const saveFlags = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateAppSetting(REQUIRE_CARD_KEY, {
          value: requireCard ? "true" : "false",
          type: "boolean",
          description: "Require Stripe SetupIntent card fingerprint for free trial",
        }),
        updateAppSetting(DISPOSABLE_KEY, {
          value: disposableDraft.trim(),
          type: "string",
          description: "Extra disposable email domains (JSON array or CSV)",
        }),
      ]);
      showToast(t("admin.signupAbuse.settingsSaved"), "success");
    } catch {
      showToast(t("common.error"), "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <AdminPageHeader
        title={t("admin.signupAbuse.title")}
        subtitle={t("admin.signupAbuse.subtitle")}
      />

      <section
        style={{
          marginBottom: 24,
          padding: 20,
          borderRadius: 12,
          border: "1px solid var(--admin-border-subtle)",
          background: "var(--admin-surface)",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 18 }}>{t("admin.signupAbuse.settings")}</h2>
        <p style={{ color: "var(--admin-muted)", marginTop: 0 }}>
          {t("admin.signupAbuse.settingsLead")}
        </p>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <input
            type="checkbox"
            checked={requireCard}
            onChange={(e) => setRequireCard(e.target.checked)}
          />
          <span>{t("admin.signupAbuse.requireCard")}</span>
        </label>
        <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>
          {t("admin.signupAbuse.disposableDomains")}
        </label>
        <textarea
          value={disposableDraft}
          onChange={(e) => setDisposableDraft(e.target.value)}
          rows={3}
          placeholder='["tempmail.com"] vagy tempmail.com, throwaway.email'
          style={{
            width: "100%",
            maxWidth: 560,
            padding: 10,
            borderRadius: 8,
            border: "1px solid var(--admin-border-subtle)",
            boxSizing: "border-box",
          }}
        />
        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            disabled={saving}
            onClick={() => void saveFlags()}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: "var(--admin-primary)",
              color: "#fff",
              fontWeight: 600,
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {t("common.save")}
          </button>
        </div>
      </section>

      {error && (
        <p role="alert" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}
      {loading ? (
        <p>{t("common.loading")}</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--admin-muted)" }}>{t("admin.signupAbuse.empty")}</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 14,
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid var(--admin-border-subtle)" }}>
                <th style={{ padding: 8 }}>{t("admin.signupAbuse.colWhen")}</th>
                <th style={{ padding: 8 }}>{t("admin.signupAbuse.colUser")}</th>
                <th style={{ padding: 8 }}>{t("admin.signupAbuse.colScore")}</th>
                <th style={{ padding: 8 }}>{t("admin.signupAbuse.colFlags")}</th>
                <th style={{ padding: 8 }}>{t("admin.signupAbuse.colNote")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  style={{
                    borderBottom: "1px solid var(--admin-border-subtle)",
                    background: row.riskScore >= 40 ? "rgba(254, 226, 226, 0.35)" : undefined,
                  }}
                >
                  <td style={{ padding: 8, whiteSpace: "nowrap" }}>
                    {new Date(row.createdAt).toLocaleString(lang)}
                  </td>
                  <td style={{ padding: 8 }}>
                    {row.user ? (
                      <>
                        <Link to={`/${lang}/admin/users`}>{row.user.email}</Link>
                        <br />
                        <span style={{ color: "var(--admin-muted)", fontSize: 12 }}>
                          {row.emailNormalized}
                        </span>
                      </>
                    ) : (
                      row.emailNormalized
                    )}
                  </td>
                  <td style={{ padding: 8, fontWeight: 600 }}>{row.riskScore}</td>
                  <td style={{ padding: 8 }}>
                    {(row.flags || []).map((flag) => (
                      <span
                        key={flag}
                        style={{
                          display: "inline-block",
                          margin: "0 4px 4px 0",
                          padding: "2px 8px",
                          borderRadius: 6,
                          background: "var(--admin-border-subtle)",
                          fontSize: 12,
                        }}
                      >
                        {flag}
                      </span>
                    ))}
                  </td>
                  <td style={{ padding: 8, maxWidth: 280 }}>{row.note || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import {
  getQuoteRequests,
  setQuoteRequestContacted,
  type QuoteRequestRow,
} from "../../api/admin.api";
import { useToast } from "../../contexts/ToastContext";
import { usePageTitle } from "../../hooks/usePageTitle";

type PlanFilter = "all" | "demo" | "municipal";

export function QuoteRequestsPage() {
  const { t, i18n } = useTranslation();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang = langParam || "hu";
  const { showToast } = useToast();
  usePageTitle("admin.quoteRequests.title");

  const [plan, setPlan] = useState<PlanFilter>("demo");
  const [items, setItems] = useState<QuoteRequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const take = 50;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getQuoteRequests({
        plan: plan === "all" ? undefined : plan,
        take,
        skip,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [plan, skip]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatWhen = (iso: string) => {
    try {
      return new Intl.DateTimeFormat(i18n.language || "hu", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  const toggleContacted = async (row: QuoteRequestRow) => {
    const next = !row.contactedAt;
    setBusyId(row.id);
    setItems((current) =>
      current.map((item) =>
        item.id === row.id
          ? { ...item, contactedAt: next ? new Date().toISOString() : null }
          : item
      )
    );
    try {
      const updated = await setQuoteRequestContacted(row.id, next);
      setItems((current) =>
        current.map((item) => (item.id === row.id ? { ...item, ...updated } : item))
      );
    } catch (err) {
      setItems((current) =>
        current.map((item) =>
          item.id === row.id ? { ...item, contactedAt: row.contactedAt } : item
        )
      );
      showToast(err instanceof Error ? err.message : t("admin.errors.updateFailed"), "error");
    } finally {
      setBusyId("");
    }
  };

  return (
    <div>
      <AdminPageHeader
        title={t("admin.quoteRequests.title")}
        subtitle={t("admin.quoteRequests.subtitle")}
      />

      <section style={panel}>
        <p style={{ marginTop: 0, marginBottom: 16 }}>
          <Link to={`/${lang}/admin/platform-settings`}>
            {t("admin.quoteRequests.recipientLink")}
          </Link>
        </p>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {(["demo", "municipal", "all"] as PlanFilter[]).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setSkip(0);
                setPlan(id);
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: plan === id ? "none" : "1px solid var(--admin-border-subtle)",
                background: plan === id ? "var(--admin-primary)" : "#fff",
                color: plan === id ? "#fff" : "inherit",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t(`admin.quoteRequests.filter.${id}`)}
            </button>
          ))}
        </div>

        {error ? (
          <p role="alert" style={{ color: "#991b1b" }}>
            {error}
          </p>
        ) : null}
        {loading ? <p>{t("admin.quoteRequests.loading")}</p> : null}
        {!loading && items.length === 0 ? (
          <p style={{ color: "var(--admin-muted)" }}>{t("admin.quoteRequests.empty")}</p>
        ) : null}

        {!loading && items.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: 14,
              }}
            >
              <thead>
                <tr>
                  <th style={th}>{t("admin.quoteRequests.cols.contacted")}</th>
                  <th style={th}>{t("admin.quoteRequests.cols.when")}</th>
                  <th style={th}>{t("admin.quoteRequests.cols.plan")}</th>
                  <th style={th}>{t("admin.quoteRequests.cols.contact")}</th>
                  <th style={th}>{t("admin.quoteRequests.cols.email")}</th>
                  <th style={th}>{t("admin.quoteRequests.cols.phone")}</th>
                  <th style={th}>{t("admin.quoteRequests.cols.organization")}</th>
                  <th style={th}>{t("admin.quoteRequests.cols.message")}</th>
                  <th style={th}>{t("admin.quoteRequests.cols.emailed")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => {
                  const done = Boolean(row.contactedAt);
                  return (
                    <tr
                      key={row.id}
                      style={{
                        opacity: done ? 0.72 : 1,
                        background: done ? "var(--admin-surface-subtle, #f8fafc)" : undefined,
                      }}
                    >
                      <td style={td}>
                        <label
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            cursor: busyId === row.id ? "wait" : "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={done}
                            disabled={busyId === row.id}
                            onChange={() => void toggleContacted(row)}
                            aria-label={t("admin.quoteRequests.contactedToggle")}
                          />
                          <span style={{ fontSize: 13 }}>
                            {done
                              ? t("admin.quoteRequests.contactedYes")
                              : t("admin.quoteRequests.contactedNo")}
                          </span>
                        </label>
                        {done && row.contactedAt ? (
                          <div style={{ fontSize: 12, color: "var(--admin-muted)", marginTop: 4 }}>
                            {formatWhen(row.contactedAt)}
                          </div>
                        ) : null}
                      </td>
                      <td style={td}>{formatWhen(row.createdAt)}</td>
                      <td style={td}>
                        {row.plan === "demo"
                          ? t("admin.quoteRequests.filter.demo")
                          : t("admin.quoteRequests.filter.municipal")}
                      </td>
                      <td style={td}>{row.contactName}</td>
                      <td style={td}>
                        <a href={`mailto:${row.email}`}>{row.email}</a>
                      </td>
                      <td style={td}>
                        {row.phone ? <a href={`tel:${row.phone}`}>{row.phone}</a> : "—"}
                      </td>
                      <td style={td}>{row.organization || "—"}</td>
                      <td style={{ ...td, maxWidth: 280, whiteSpace: "pre-wrap" }}>
                        {row.message || "—"}
                      </td>
                      <td style={td}>
                        {row.emailed
                          ? t("admin.quoteRequests.emailedYes")
                          : t("admin.quoteRequests.emailedNo")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}

        {total > take ? (
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 16 }}>
            <button
              type="button"
              disabled={skip <= 0 || loading}
              onClick={() => setSkip(Math.max(0, skip - take))}
            >
              {t("admin.quoteRequests.prev")}
            </button>
            <span>
              {skip + 1}–{Math.min(skip + take, total)} / {total}
            </span>
            <button
              type="button"
              disabled={skip + take >= total || loading}
              onClick={() => setSkip(skip + take)}
            >
              {t("admin.quoteRequests.next")}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

const panel: CSSProperties = {
  marginBottom: 24,
  padding: 20,
  borderRadius: 12,
  border: "1px solid var(--admin-border-subtle)",
  background: "var(--admin-surface, #fff)",
  color: "var(--admin-ink, #1b1730)",
};

const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid var(--admin-border-subtle)",
  whiteSpace: "nowrap",
  color: "var(--admin-muted, #5c4638)",
  fontWeight: 600,
};

const td: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid var(--admin-border-subtle)",
  verticalAlign: "top",
};

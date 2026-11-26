import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import { getQuoteRequests, type QuoteRequestRow } from "../../api/admin.api";
import { usePageTitle } from "../../hooks/usePageTitle";

type PlanFilter = "all" | "demo" | "municipal";

export function QuoteRequestsPage() {
  const { t, i18n } = useTranslation();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang = langParam || "hu";
  usePageTitle("admin.quoteRequests.title");

  const [plan, setPlan] = useState<PlanFilter>("demo");
  const [items, setItems] = useState<QuoteRequestRow[]>([]);
  const [total, setTotal] = useState(0);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  return (
    <div>
      <AdminPageHeader
        title={t("admin.quoteRequests.title")}
        subtitle={t("admin.quoteRequests.subtitle")}
      />

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
              background: plan === id ? "var(--admin-primary)" : "var(--admin-surface)",
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
              {items.map((row) => (
                <tr key={row.id}>
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
              ))}
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
    </div>
  );
}

const th: CSSProperties = {
  textAlign: "left",
  padding: "10px 8px",
  borderBottom: "1px solid var(--admin-border-subtle)",
  whiteSpace: "nowrap",
};

const td: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid var(--admin-border-subtle)",
  verticalAlign: "top",
};

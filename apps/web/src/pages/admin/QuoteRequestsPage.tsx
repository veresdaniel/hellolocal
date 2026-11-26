import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { AdminDataTable } from "../../components/AdminDataTable";
import { AdminPageHeader } from "../../components/AdminPageHeader";
import {
  deleteQuoteRequest,
  getQuoteRequests,
  setQuoteRequestContacted,
  type QuoteRequestRow,
} from "../../api/admin.api";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../hooks/useConfirm";
import { usePageTitle } from "../../hooks/usePageTitle";

type PlanFilter = "all" | "demo" | "municipal";

export function QuoteRequestsPage() {
  const { t, i18n } = useTranslation();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang = langParam || "hu";
  const { showToast } = useToast();
  const confirm = useConfirm();
  usePageTitle("admin.quoteRequests.title");

  const [plan, setPlan] = useState<PlanFilter>("demo");
  const [items, setItems] = useState<QuoteRequestRow[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getQuoteRequests({
        plan: plan === "all" ? undefined : plan,
        take: pagination.limit,
        skip: (pagination.page - 1) * pagination.limit,
      });
      setItems(data.items);
      setPagination((prev) => ({ ...prev, total: data.total }));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [plan, pagination.page, pagination.limit]);

  useEffect(() => {
    void load();
  }, [load]);

  const formatWhen = useCallback(
    (iso: string) => {
      try {
        return new Intl.DateTimeFormat(i18n.language || "hu", {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(new Date(iso));
      } catch {
        return iso;
      }
    },
    [i18n.language]
  );

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

  const handleDelete = async (row: QuoteRequestRow) => {
    const ok = await confirm({
      message: t("admin.quoteRequests.deleteConfirm", { name: row.contactName }),
      confirmLabel: t("common.delete"),
      cancelLabel: t("common.cancel"),
      confirmVariant: "danger",
    });
    if (!ok) return;
    try {
      await deleteQuoteRequest(row.id);
      showToast(t("admin.quoteRequests.deleted"), "success");
      if (items.length <= 1 && pagination.page > 1) {
        setPagination((prev) => ({ ...prev, page: prev.page - 1 }));
      } else {
        await load();
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : t("admin.errors.deleteFailed"), "error");
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "contacted",
        label: t("admin.quoteRequests.cols.contacted"),
        sortable: true,
        filterable: true,
        getText: (row: QuoteRequestRow) =>
          row.contactedAt
            ? t("admin.quoteRequests.contactedYes")
            : t("admin.quoteRequests.contactedNo"),
        render: (row: QuoteRequestRow) => {
          const done = Boolean(row.contactedAt);
          return (
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
              <span>
                {done
                  ? t("admin.quoteRequests.contactedYes")
                  : t("admin.quoteRequests.contactedNo")}
              </span>
              {done && row.contactedAt ? (
                <span style={{ color: "var(--admin-muted)", fontSize: 12 }}>
                  {formatWhen(row.contactedAt)}
                </span>
              ) : null}
            </label>
          );
        },
      },
      {
        key: "when",
        label: t("admin.quoteRequests.cols.when"),
        sortable: true,
        getText: (row: QuoteRequestRow) => row.createdAt,
        render: (row: QuoteRequestRow) => formatWhen(row.createdAt),
      },
      {
        key: "plan",
        label: t("admin.quoteRequests.cols.plan"),
        sortable: true,
        filterable: true,
        getText: (row: QuoteRequestRow) =>
          row.plan === "demo"
            ? t("admin.quoteRequests.filter.demo")
            : t("admin.quoteRequests.filter.municipal"),
        render: (row: QuoteRequestRow) =>
          row.plan === "demo"
            ? t("admin.quoteRequests.filter.demo")
            : t("admin.quoteRequests.filter.municipal"),
      },
      {
        key: "contact",
        label: t("admin.quoteRequests.cols.contact"),
        sortable: true,
        filterable: true,
        getText: (row: QuoteRequestRow) => row.contactName,
        render: (row: QuoteRequestRow) => row.contactName,
      },
      {
        key: "email",
        label: t("admin.quoteRequests.cols.email"),
        sortable: true,
        filterable: true,
        getText: (row: QuoteRequestRow) => row.email,
        render: (row: QuoteRequestRow) => <a href={`mailto:${row.email}`}>{row.email}</a>,
      },
      {
        key: "phone",
        label: t("admin.quoteRequests.cols.phone"),
        sortable: true,
        filterable: true,
        getText: (row: QuoteRequestRow) => row.phone || "",
        render: (row: QuoteRequestRow) =>
          row.phone ? <a href={`tel:${row.phone}`}>{row.phone}</a> : "—",
      },
      {
        key: "organization",
        label: t("admin.quoteRequests.cols.organization"),
        sortable: true,
        filterable: true,
        getText: (row: QuoteRequestRow) => row.organization || "",
        render: (row: QuoteRequestRow) => row.organization || "—",
      },
      {
        key: "message",
        label: t("admin.quoteRequests.cols.message"),
        sortable: false,
        filterable: true,
        getText: (row: QuoteRequestRow) => row.message || "",
        render: (row: QuoteRequestRow) => (
          <span style={{ whiteSpace: "pre-wrap" }}>{row.message || "—"}</span>
        ),
      },
      {
        key: "emailed",
        label: t("admin.quoteRequests.cols.emailed"),
        sortable: true,
        filterable: true,
        getText: (row: QuoteRequestRow) =>
          row.emailed ? t("admin.quoteRequests.emailedYes") : t("admin.quoteRequests.emailedNo"),
        render: (row: QuoteRequestRow) =>
          row.emailed ? t("admin.quoteRequests.emailedYes") : t("admin.quoteRequests.emailedNo"),
      },
    ],
    [busyId, formatWhen, t]
  );

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={t("admin.quoteRequests.title")}
        subtitle={t("admin.quoteRequests.subtitle")}
      />

      <section className="admin-section-card">
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
              className={plan === id ? "admin-btn admin-btn--primary" : "admin-btn admin-btn--secondary"}
              onClick={() => {
                setPlan(id);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              style={filterBtn}
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

        <AdminDataTable
          items={items}
          getItemId={(row) => row.id}
          stateKey="quote-requests"
          isLoading={loading}
          emptyMessage={t("admin.quoteRequests.empty")}
          columns={columns}
          onDelete={(row) => void handleDelete(row)}
          pagination={{
            page: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            onPageChange: (page) => setPagination((prev) => ({ ...prev, page })),
            onPageSizeChange: (pageSize) =>
              setPagination((prev) => ({ ...prev, limit: pageSize, page: 1 })),
          }}
        />
      </section>
    </div>
  );
}

const filterBtn: CSSProperties = {
  padding: "8px 14px",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
};

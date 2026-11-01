// src/components/Pagination.tsx
import { useTranslation } from "react-i18next";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  total,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const { t } = useTranslation();

  const startItem = total === 0 ? 0 : (currentPage - 1) * limit + 1;
  const endItem = Math.min(currentPage * limit, total);
  const prevDisabled = currentPage === 1;
  const nextDisabled = currentPage === totalPages || totalPages === 0;

  return (
    <div
      className="admin-pagination"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px)",
        borderTop: "1px solid var(--hl-line-on-card, rgba(27, 23, 48, 0.1))",
        background: "var(--hl-card, #fffdf9)",
        color: "var(--hl-ink, #1b1730)",
        flexWrap: "wrap",
        gap: 12,
        borderRadius: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            color: "var(--hl-muted, #665d78)",
            fontSize: "clamp(13px, 3vw, 15px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            whiteSpace: "nowrap",
          }}
        >
          {t("admin.pagination.showing", { start: startItem, end: endItem, total })}
        </span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(parseInt(e.target.value))}
          style={{
            padding: "6px 10px",
            fontSize: "clamp(13px, 3vw, 15px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            border: "1px solid var(--hl-line-on-card, rgba(27, 23, 48, 0.16))",
            borderRadius: 6,
            cursor: "pointer",
            background: "var(--hl-card, #fffdf9)",
            color: "var(--hl-ink, #1b1730)",
          }}
        >
          <option value={10}>10 / {t("admin.pagination.page")}</option>
          <option value={20}>20 / {t("admin.pagination.page")}</option>
          <option value={25}>25 / {t("admin.pagination.page")}</option>
          <option value={50}>50 / {t("admin.pagination.page")}</option>
          <option value={100}>100 / {t("admin.pagination.page")}</option>
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={prevDisabled}
          style={{
            padding: "8px 16px",
            background: prevDisabled
              ? "rgba(27, 23, 48, 0.06)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: prevDisabled ? "var(--hl-muted, #665d78)" : "var(--hl-on-dark-strong, #ffffff)",
            border: prevDisabled ? "1px solid var(--hl-line-on-card, rgba(27, 23, 48, 0.12))" : "none",
            borderRadius: 6,
            cursor: prevDisabled ? "not-allowed" : "pointer",
            fontSize: "clamp(13px, 3vw, 15px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 600,
            transition: "all 0.2s ease",
            boxShadow: prevDisabled ? "none" : "0 2px 8px rgba(102, 126, 234, 0.3)",
          }}
        >
          {t("admin.pagination.previous")}
        </button>

        <span
          style={{
            fontSize: "clamp(13px, 3vw, 15px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            color: "var(--hl-ink, #1b1730)",
            minWidth: "clamp(80px, 20vw, 100px)",
            textAlign: "center",
            fontWeight: 600,
          }}
        >
          {t("admin.pagination.pageInfo", { current: currentPage, total: totalPages })}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={nextDisabled}
          style={{
            padding: "8px 16px",
            background: nextDisabled
              ? "rgba(27, 23, 48, 0.06)"
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: nextDisabled ? "var(--hl-muted, #665d78)" : "var(--hl-on-dark-strong, #ffffff)",
            border: nextDisabled ? "1px solid var(--hl-line-on-card, rgba(27, 23, 48, 0.12))" : "none",
            borderRadius: 6,
            cursor: nextDisabled ? "not-allowed" : "pointer",
            fontSize: "clamp(13px, 3vw, 15px)",
            fontFamily:
              "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 600,
            transition: "all 0.2s ease",
            boxShadow: nextDisabled ? "none" : "0 2px 8px rgba(102, 126, 234, 0.3)",
          }}
        >
          {t("admin.pagination.next")}
        </button>
      </div>
    </div>
  );
}

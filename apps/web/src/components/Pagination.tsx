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

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 24px",
        borderTop: "1px solid #ddd",
        background: "#f9fafb",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: "#666", fontSize: 14 }}>
          {t("admin.pagination.showing", { start: startItem, end: endItem, total })}
        </span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(parseInt(e.target.value))}
          style={{
            padding: "4px 8px",
            fontSize: 14,
            border: "1px solid #ddd",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          <option value={10}>10 / {t("admin.pagination.page")}</option>
          <option value={25}>25 / {t("admin.pagination.page")}</option>
          <option value={50}>50 / {t("admin.pagination.page")}</option>
          <option value={100}>100 / {t("admin.pagination.page")}</option>
        </select>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "6px 12px",
            background: currentPage === 1 ? "#e5e7eb" : "#3b82f6",
            color: currentPage === 1 ? "#9ca3af" : "white",
            border: "none",
            borderRadius: 4,
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {t("admin.pagination.previous")}
        </button>

        <span style={{ fontSize: 14, color: "#666", minWidth: 100, textAlign: "center" }}>
          {t("admin.pagination.pageInfo", { current: currentPage, total: totalPages })}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          style={{
            padding: "6px 12px",
            background: currentPage === totalPages || totalPages === 0 ? "#e5e7eb" : "#3b82f6",
            color: currentPage === totalPages || totalPages === 0 ? "#9ca3af" : "white",
            border: "none",
            borderRadius: 4,
            cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {t("admin.pagination.next")}
        </button>
      </div>
    </div>
  );
}

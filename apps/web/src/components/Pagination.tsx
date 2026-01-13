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
        padding: "clamp(12px, 3vw, 16px) clamp(16px, 4vw, 24px)",
        borderTop: "1px solid #ddd",
        background: "#f9fafb",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      {/* Megjelenítés info + limit selector */}
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: 8,
        flexWrap: "wrap",
      }}>
        <span style={{ 
          color: "#666", 
          fontSize: "clamp(13px, 3vw, 15px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          whiteSpace: "nowrap",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
          {t("admin.pagination.showing", { start: startItem, end: endItem, total })}
        </span>
        <select
          value={limit}
          onChange={(e) => onLimitChange(parseInt(e.target.value))}
          style={{
            padding: "6px 10px",
            fontSize: "clamp(13px, 3vw, 15px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            border: "1px solid #ddd",
            borderRadius: 6,
            cursor: "pointer",
            background: "white",
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          }}
        >
          <option value={10}>10 / {t("admin.pagination.page")}</option>
          <option value={25}>25 / {t("admin.pagination.page")}</option>
          <option value={50}>50 / {t("admin.pagination.page")}</option>
          <option value={100}>100 / {t("admin.pagination.page")}</option>
        </select>
      </div>

      {/* Navigációs gombok */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          style={{
            padding: "8px 16px",
            background: currentPage === 1 
              ? "#e5e7eb" 
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: currentPage === 1 ? "#9ca3af" : "white",
            border: "none",
            borderRadius: 6,
            cursor: currentPage === 1 ? "not-allowed" : "pointer",
            fontSize: "clamp(13px, 3vw, 15px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            transition: "all 0.2s ease",
            boxShadow: currentPage === 1 ? "none" : "0 2px 8px rgba(102, 126, 234, 0.3)",
          }}
        >
          {t("admin.pagination.previous")}
        </button>

        <span style={{ 
          fontSize: "clamp(13px, 3vw, 15px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", 
          color: "#666", 
          minWidth: "clamp(80px, 20vw, 100px)", 
          textAlign: "center",
          fontWeight: 600,
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}>
          {t("admin.pagination.pageInfo", { current: currentPage, total: totalPages })}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          style={{
            padding: "8px 16px",
            background: currentPage === totalPages || totalPages === 0 
              ? "#e5e7eb" 
              : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: currentPage === totalPages || totalPages === 0 ? "#9ca3af" : "white",
            border: "none",
            borderRadius: 6,
            cursor: currentPage === totalPages || totalPages === 0 ? "not-allowed" : "pointer",
            fontSize: "clamp(13px, 3vw, 15px)",
          fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            fontWeight: 600,
            fontFamily: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            transition: "all 0.2s ease",
            boxShadow: currentPage === totalPages || totalPages === 0 ? "none" : "0 2px 8px rgba(102, 126, 234, 0.3)",
          }}
        >
          {t("admin.pagination.next")}
        </button>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getEventLogs, type EventLog } from "../api/admin.api";
import { AdminDataTable } from "./AdminDataTable";
import { AdminPageHeader } from "./AdminPageHeader";

export function ActivityLogTable({ mode }: { mode: "scope" | "global" }) {
  const { t, i18n } = useTranslation();
  const [rows, setRows] = useState<EventLog[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getEventLogs({
      scope: mode === "global" ? "global" : undefined,
      page: 1,
      limit: 200,
    })
      .then((response) => {
        if (active) setRows(response.logs || []);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode]);

  const when = (value: string) =>
    new Date(value).toLocaleString((i18n.language || "hu").slice(0, 2));

  return (
    <div className="admin-page-content">
      <AdminPageHeader
        title={mode === "global" ? t("admin.eventLog.globalTitle") : t("admin.eventLog.title")}
        subtitle={mode === "global" ? t("admin.eventLog.globalHint") : t("admin.eventLog.scopedHint")}
        showNewButton={false}
      />
      {error ? (
        <p role="alert" style={{ color: "#991b1b" }}>
          {error}
        </p>
      ) : null}
      <AdminDataTable
        items={rows}
        getItemId={(row) => row.id}
        stateKey={mode === "global" ? "event-log-global" : "event-log"}
        isLoading={loading}
        emptyMessage={t("admin.eventLog.empty", { defaultValue: t("admin.table.noData") })}
        columns={[
          {
            key: "createdAt",
            label: t("admin.eventLog.date"),
            getText: (row) => row.createdAt,
            render: (row) => when(row.createdAt),
          },
          {
            key: "user",
            label: t("admin.user"),
            getText: (row) =>
              row.user ? `${row.user.firstName} ${row.user.lastName} ${row.user.email}` : row.userId,
            render: (row) =>
              row.user ? `${row.user.firstName} ${row.user.lastName}` : row.userId,
          },
          {
            key: "action",
            label: t("admin.eventLog.filterAction"),
            getText: (row) => row.action,
            render: (row) => row.action,
          },
          {
            key: "entity",
            label: t("admin.eventLog.filterEntityType"),
            getText: (row) => `${row.entityType || ""} ${row.entityId || ""}`,
            render: (row) => row.entityType || "—",
          },
          {
            key: "description",
            label: t("admin.eventLog.description"),
            getText: (row) => row.description || "",
            render: (row) => row.description || "—",
          },
          {
            key: "site",
            label: t("admin.eventLog.filterSite"),
            getText: (row) => row.site?.slug || row.siteId || "",
            render: (row) => row.site?.slug || row.siteId || "—",
          },
        ]}
      />
    </div>
  );
}

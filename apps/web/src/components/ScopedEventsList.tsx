import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AdminDataTable } from "./AdminDataTable";
import { deleteEvent, getEvents, type Event } from "../api/admin.api";
import { useConfirm } from "../hooks/useConfirm";
import { findTranslation } from "../utils/langHelpers";
import type { Lang } from "../types/enums";

type ScopedEventsListProps = {
  siteId?: string;
  townId?: string;
  placeId?: string;
};

function eventTitle(event: Event, lang: Lang): string {
  const rows = event.translations || [];
  return findTranslation(rows, lang)?.title || findTranslation(rows, "hu")?.title || event.id;
}

function placeName(event: Event, lang: Lang): string {
  const rows = event.place?.translations || [];
  return findTranslation(rows, lang)?.name || findTranslation(rows, "hu")?.name || "";
}

/** Events of one town or one place. The API only returns rows inside the caller's scope. */
export function ScopedEventsList({ siteId, townId, placeId }: ScopedEventsListProps) {
  const { t, i18n } = useTranslation();
  const { lang: langParam } = useParams<{ lang?: string }>();
  const lang = (langParam || i18n.language || "hu").slice(0, 2);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [events, setEvents] = useState<Event[]>([]);
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      const data = await getEvents(siteId, 1, 100, placeId, townId);
      setEvents(data.events || []);
    } catch (err) {
      setEvents([]);
      setError(err instanceof Error ? err.message : t("admin.errors.deleteEventFailed"));
    }
  };

  useEffect(() => {
    void load();
  }, [siteId, townId, placeId]);

  const openNew = () => {
    const params = new URLSearchParams({ new: "true" });
    if (placeId) params.set("placeId", placeId);
    if (townId) params.set("townId", townId);
    navigate(`/${lang}/admin/events?${params.toString()}`);
  };

  return (
    <section style={{ marginTop: 28 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>{t("admin.events")}</h3>
        <button type="button" className="admin-btn admin-btn--primary" onClick={openNew}>
          {t("admin.dashboardCards.newEvent")}
        </button>
      </div>
      {error ? (
        <p role="alert" style={{ color: "#991b1b" }}>
          {error}
        </p>
      ) : null}
      <AdminDataTable
        items={events}
        getItemId={(event) => event.id}
        stateKey={placeId ? `place-events-${placeId}` : `town-events-${townId || "town"}`}
        emptyMessage={t("admin.noEvents")}
        columns={[
          {
            key: "title",
            label: t("common.name"),
            getText: (event) => eventTitle(event, lang as Lang),
            render: (event) => eventTitle(event, lang as Lang),
          },
          {
            key: "place",
            label: t("admin.places"),
            getText: (event) => placeName(event, lang as Lang),
            render: (event) => placeName(event, lang as Lang) || "—",
          },
          {
            key: "start",
            label: t("admin.startDate"),
            getText: (event) => event.startDate || "",
            render: (event) => (event.startDate ? event.startDate.slice(0, 16).replace("T", " ") : "—"),
          },
        ]}
        onEdit={(event) => navigate(`/${lang}/admin/events?edit=${event.id}`)}
        onDelete={async (event) => {
          const ok = await confirm({ message: t("admin.confirmations.deleteEvent") });
          if (!ok) return;
          try {
            await deleteEvent(event.id, siteId);
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : t("admin.errors.deleteEventFailed"));
          }
        }}
      />
    </section>
  );
}

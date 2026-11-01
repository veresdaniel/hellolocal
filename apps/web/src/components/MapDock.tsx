import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getEvents, getPlatformSettings, type Event } from "../api/places.api";
import { useRouteCtx } from "../app/useRouteCtx";
import { buildUrl } from "../app/urls";
import {
  FilterControls,
  activeFilterCount,
  clearFilters,
  type FilterControlProps,
} from "./FilterControls";
import "../styles/map-dock.css";

type Panel = "filters" | "events" | null;

function upcomingEvents(data: Event[]) {
  const now = new Date();
  const filtered = data.filter((event) => {
    if (event.showOnMap === false) return false;
    if (event.endDate) return new Date(event.endDate) >= now;
    return new Date(event.startDate) >= now;
  });

  const seenById = new Map<string, Event>();
  const seenBySlug = new Map<string, Event>();
  filtered.forEach((event) => {
    const hasValidSlug = !!event.slug && event.slug !== event.id;
    const existingById = seenById.get(event.id);
    if (existingById) {
      const existingHasValidSlug = !!existingById.slug && existingById.slug !== existingById.id;
      if (hasValidSlug && !existingHasValidSlug) {
        seenById.set(event.id, event);
        seenBySlug.set(event.slug, event);
      }
      return;
    }
    if (hasValidSlug) {
      const existingBySlug = seenBySlug.get(event.slug);
      if (existingBySlug) {
        const existingHasValidSlug =
          !!existingBySlug.slug && existingBySlug.slug !== existingBySlug.id;
        if (!existingHasValidSlug) {
          seenById.delete(existingBySlug.id);
          seenById.set(event.id, event);
          seenBySlug.set(event.slug, event);
        }
        return;
      }
      seenBySlug.set(event.slug, event);
    }
    seenById.set(event.id, event);
  });

  return Array.from(seenById.values()).sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
  });
}

export function MapDock(props: FilterControlProps) {
  const { t, i18n } = useTranslation();
  const { siteKey } = useRouteCtx();
  const [panel, setPanel] = useState<Panel>(null);
  const filterCount = activeFilterCount(props);

  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", props.lang, siteKey],
    queryFn: () => getPlatformSettings(props.lang, siteKey),
    staleTime: 5 * 60 * 1000,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", props.lang, siteKey],
    queryFn: () => getEvents(props.lang, siteKey ?? "", undefined, undefined, 50, 0),
    staleTime: 5 * 60 * 1000,
    select: upcomingEvents,
    refetchInterval: 5 * 60 * 1000,
  });

  const locale = props.lang === "hu" ? "hu-HU" : props.lang === "de" ? "de-DE" : "en-US";
  const open = (next: Exclude<Panel, null>) => setPanel((current) => (current === next ? null : next));

  return (
    <div className="map-dock">
      <div className="map-dock__bar" role="tablist">
        <button
          type="button"
          className="map-dock__tab"
          role="tab"
          aria-selected={panel === "filters"}
          aria-pressed={panel === "filters"}
          onClick={() => open("filters")}
        >
          {t("public.filtersTitle")}
          {filterCount > 0 && <span className="map-dock__count">{filterCount}</span>}
        </button>
        <button
          type="button"
          className="map-dock__tab"
          role="tab"
          aria-selected={panel === "events"}
          aria-pressed={panel === "events"}
          onClick={() => open("events")}
        >
          {t("public.events")}
          {events.length > 0 && <span className="map-dock__count">{events.length}</span>}
        </button>
      </div>

      {panel && (
        <div className="map-dock__panel" role="tabpanel">
          <div className="map-dock__panel-head">
            <h2>{panel === "filters" ? t("public.filtersTitle") : t("public.events")}</h2>
            {panel === "filters" && filterCount > 0 ? (
              <button type="button" className="map-dock__clear" onClick={() => clearFilters(props)}>
                {t("public.filters.clear")}
              </button>
            ) : (
              <button
                type="button"
                className="map-dock__close"
                aria-label={t("public.close", { defaultValue: i18n.language === "hu" ? "Bezárás" : "Close" })}
                onClick={() => setPanel(null)}
              >
                ×
              </button>
            )}
          </div>

          {panel === "filters" ? (
            <FilterControls {...props} />
          ) : isLoading ? (
            <p className="map-dock__empty">{t("common.loading")}</p>
          ) : events.length === 0 ? (
            <p className="map-dock__empty">{t("public.noEvents")}</p>
          ) : (
            <div className="map-dock__events">
              {events.map((event) => {
                const image =
                  event.heroImage?.trim() ||
                  platformSettings?.defaultEventPlaceholderCardImage?.trim() ||
                  "";
                const when = new Date(event.startDate).toLocaleString(locale, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const body = (
                  <>
                    {image ? (
                      <span className="map-dock__photo" style={{ backgroundImage: `url(${image})` }} />
                    ) : (
                      <span className="map-dock__photo" />
                    )}
                    <span className="map-dock__event-body">
                      {event.isPinned && <span className="map-dock__pin">{t("public.featured")}</span>}
                      <strong>{event.name}</strong>
                      <span className="map-dock__meta">{when}</span>
                      {event.placeName && <span className="map-dock__meta">{event.placeName}</span>}
                    </span>
                  </>
                );
                const hasValidSlug = !!event.slug && event.slug !== event.id;
                if (!hasValidSlug) {
                  return (
                    <div key={event.id} className="map-dock__event">
                      {body}
                    </div>
                  );
                }
                return (
                  <Link
                    key={event.id}
                    className="map-dock__event"
                    to={buildUrl({ lang: props.lang, siteKey, path: `event/${event.slug}` })}
                  >
                    {body}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

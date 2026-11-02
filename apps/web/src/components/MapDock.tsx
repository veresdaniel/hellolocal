import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { getEvents, getPlaces, getPlatformSettings, type Event } from "../api/places.api";
import type { Place } from "../types/place";
import { useRouteCtx } from "../app/useRouteCtx";
import { buildUrl } from "../app/urls";
import { placeEntityPath } from "../app/entityPaths";
import {
  FilterControls,
  activeFilterCount,
  clearFilters,
  type FilterControlProps,
} from "./FilterControls";
import "../styles/map-dock.css";

type Panel = "filters" | "events" | "services" | null;
type Point = { left: number; top: number };

const MOBILE_MQ = "(max-width: 767px)";
const POS_KEY = "map-dock-pos";

function storageKey(mobile: boolean) {
  return mobile ? `${POS_KEY}-mobile` : POS_KEY;
}

function readPosition(mobile: boolean): Point | null {
  try {
    const raw = localStorage.getItem(storageKey(mobile));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Point;
    if (typeof parsed.left === "number" && typeof parsed.top === "number") return parsed;
  } catch {
    return null;
  }
  return null;
}

function savePosition(mobile: boolean, pos: Point) {
  localStorage.setItem(storageKey(mobile), JSON.stringify(pos));
}

function clampPosition(
  pos: Point,
  parentWidth: number,
  parentHeight: number,
  width: number,
  height: number
): Point {
  const maxLeft = Math.max(8, parentWidth - width - 8);
  const maxTop = Math.max(8, parentHeight - Math.min(height, parentHeight - 16) - 8);
  return {
    left: Math.min(Math.max(8, pos.left), maxLeft),
    top: Math.min(Math.max(8, pos.top), maxTop),
  };
}

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

export function MapDock(props: FilterControlProps & { onPanelChange?: (panel: Panel) => void }) {
  const { t, i18n } = useTranslation();
  const { siteKey } = useRouteCtx();
  const [panel, setPanel] = useState<Panel>(null);
  const [pos, setPos] = useState<Point | null>(null);
  const [mobile, setMobile] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<Panel>(null);
  const dragRef = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
    moved: boolean;
  } | null>(null);
  const suppressClick = useRef(false);
  panelRef.current = panel;
  const filterCount = activeFilterCount(props);

  useLayoutEffect(() => {
    let lastMobile = window.matchMedia(MOBILE_MQ).matches;
    let placed = false;
    const place = () => {
      const dock = dockRef.current;
      const parent = dock?.parentElement;
      if (!dock || !parent) return;
      const isMobile = window.matchMedia(MOBILE_MQ).matches;
      const crossed = placed && isMobile !== lastMobile;
      lastMobile = isMobile;
      placed = true;
      setMobile(isMobile);
      const parentBox = parent.getBoundingClientRect();
      const width = isMobile ? Math.max(280, parentBox.width - 16) : dock.offsetWidth || 360;
      const height = dock.offsetHeight || 56;
      const fallback = isMobile
        ? { left: 8, top: Math.max(8, parentBox.height - height - 8) }
        : { left: Math.max(8, parentBox.width - width - 16), top: 64 };
      setPos((current) => {
        const base = crossed || !current ? readPosition(isMobile) ?? fallback : current;
        const clamped = clampPosition(base, parentBox.width, parentBox.height, width, height);
        // Mobile: full-width dock — keep left edge fixed, allow vertical offset only.
        return isMobile ? { left: 8, top: clamped.top } : clamped;
      });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, []);

  useLayoutEffect(() => {
    const dock = dockRef.current;
    const parent = dock?.parentElement;
    if (!dock || !parent || !panel) return;
    const parentBox = parent.getBoundingClientRect();
    const dockBox = dock.getBoundingClientRect();
    const overflow = dockBox.bottom - (parentBox.bottom - 8);
    if (overflow > 1) {
      setPos((current) =>
        current ? { ...current, top: Math.max(8, current.top - overflow) } : current
      );
    }
  }, [panel]);

  const { data: platformSettings } = useQuery({
    queryKey: ["platformSettings", props.lang, siteKey],
    queryFn: () => getPlatformSettings(props.lang, siteKey),
    staleTime: 5 * 60 * 1000,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", props.lang, siteKey],
    queryFn: () => getEvents(props.lang, siteKey ?? "", undefined, undefined, 100, 0),
    staleTime: 5 * 60 * 1000,
    select: upcomingEvents,
    refetchInterval: 5 * 60 * 1000,
  });

  const { data: services = [], isLoading: servicesLoading } = useQuery({
    queryKey: ["places", props.lang, siteKey, "service"],
    queryFn: () =>
      getPlaces(props.lang, siteKey ?? "", undefined, undefined, undefined, 200, 0, "service"),
    staleTime: 5 * 60 * 1000,
    select: (rows: Place[]) => rows.filter((place) => place.categoryKind === "service"),
  });

  const locale = props.lang === "hu" ? "hu-HU" : props.lang === "de" ? "de-DE" : "en-US";
  const open = (next: Exclude<Panel, null>) => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    const value = panel === next ? null : next;
    setPanel(value);
    props.onPanelChange?.(value);
  };

  const mobileRef = useRef(mobile);
  mobileRef.current = mobile;

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !pos) return;
    dragRef.current = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      left: pos.left,
      top: pos.top,
      moved: false,
    };
  };

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      const parent = dockRef.current?.parentElement;
      if (!drag || drag.id !== event.pointerId || !parent) return;
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      drag.moved = true;
      setDragging(true);
      const parentBox = parent.getBoundingClientRect();
      const isMobile = mobileRef.current;
      const width = isMobile
        ? Math.max(280, parentBox.width - 16)
        : dockRef.current?.offsetWidth || 320;
      const height = dockRef.current?.offsetHeight || 56;
      const next = clampPosition(
        {
          left: isMobile ? 8 : drag.left + dx,
          top: drag.top + dy,
        },
        parentBox.width,
        parentBox.height,
        width,
        height
      );
      setPos(isMobile ? { left: 8, top: next.top } : next);
    };
    const onPointerUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || drag.id !== event.pointerId) return;
      dragRef.current = null;
      setDragging(false);
      if (!drag.moved) return;
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      const parent = dockRef.current?.parentElement;
      if (!parent) return;
      const parentBox = parent.getBoundingClientRect();
      const isMobile = mobileRef.current;
      const width = isMobile
        ? Math.max(280, parentBox.width - 16)
        : dockRef.current?.offsetWidth || 320;
      const height = dockRef.current?.offsetHeight || 56;
      const next = clampPosition(
        {
          left: isMobile ? 8 : drag.left + (event.clientX - drag.x),
          top: drag.top + (event.clientY - drag.y),
        },
        parentBox.width,
        parentBox.height,
        width,
        height
      );
      const saved = isMobile ? { left: 8, top: next.top } : next;
      setPos(saved);
      savePosition(isMobile, saved);
    };
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const panelTitle =
    panel === "filters"
      ? t("public.filtersTitle")
      : panel === "services"
        ? t("public.servicesTab")
        : t("public.events");

  return (
    <div
      ref={dockRef}
      className={`map-dock${mobile ? " map-dock--mobile" : ""}${dragging ? " is-dragging" : ""}`}
      style={
        pos
          ? {
              left: pos.left,
              top: pos.top,
              right: "auto",
              bottom: "auto",
              ...(mobile ? { width: "calc(100% - 16px)", maxWidth: "none" } : null),
            }
          : undefined
      }
    >
      <div
        className="map-dock__bar"
        role="toolbar"
        aria-label={t("public.mapDock.label", { defaultValue: "Térkép eszközök" })}
        onPointerDown={onPointerDown}
      >
        <span className="map-dock__grip" aria-hidden="true" />
        <button
          type="button"
          className="map-dock__tab"
          aria-pressed={panel === "filters"}
          onClick={() => open("filters")}
        >
          {t("public.filtersTitle")}
          {filterCount > 0 && <span className="map-dock__count">{filterCount}</span>}
        </button>
        <button
          type="button"
          className="map-dock__tab"
          aria-pressed={panel === "events"}
          onClick={() => open("events")}
        >
          {t("public.events")}
          {events.length > 0 && <span className="map-dock__count">{events.length}</span>}
        </button>
        <button
          type="button"
          className="map-dock__tab"
          aria-pressed={panel === "services"}
          onClick={() => open("services")}
        >
          {t("public.servicesTab")}
          {services.length > 0 && <span className="map-dock__count">{services.length}</span>}
        </button>
      </div>

      {panel && (
        <div
          className="map-dock__panel"
          role="region"
          aria-label={panelTitle}
        >
          <div className="map-dock__panel-head">
            <h2>{panelTitle}</h2>
            {panel === "filters" && filterCount > 0 ? (
              <button type="button" className="map-dock__clear" onClick={() => clearFilters(props)}>
                {t("public.filters.clear")}
              </button>
            ) : (
              <button
                type="button"
                className="map-dock__close"
                aria-label={t("public.close", {
                  defaultValue: i18n.language === "hu" ? "Bezárás" : "Close",
                })}
                onClick={() => {
                  setPanel(null);
                  props.onPanelChange?.(null);
                }}
              >
                ×
              </button>
            )}
          </div>

          {panel === "filters" ? (
            <FilterControls {...props} />
          ) : panel === "services" ? (
            servicesLoading ? (
              <p className="map-dock__empty">{t("common.loading")}</p>
            ) : services.length === 0 ? (
              <p className="map-dock__empty">{t("public.noServices")}</p>
            ) : (
              <div className="map-dock__events">
                {services.map((place) => {
                  const body = (
                    <>
                      <span className="map-dock__event-body">
                        <strong>{place.name}</strong>
                        {place.category && <span className="map-dock__meta">{place.category}</span>}
                      </span>
                    </>
                  );
                  const hasValidSlug = !!place.slug && place.slug !== place.id;
                  if (!hasValidSlug) {
                    return (
                      <div key={place.id} className="map-dock__event">
                        {body}
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={place.id}
                      className="map-dock__event"
                      to={buildUrl({
                        lang: props.lang,
                        siteKey,
                        path: placeEntityPath(props.lang, place.slug),
                      })}
                    >
                      {body}
                    </Link>
                  );
                })}
              </div>
            )
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
                      <span
                        className="map-dock__photo"
                        style={{ backgroundImage: `url(${image})` }}
                      />
                    ) : (
                      <span className="map-dock__photo" />
                    )}
                    <span className="map-dock__event-body">
                      {event.isPinned && (
                        <span className="map-dock__pin">{t("public.featured")}</span>
                      )}
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

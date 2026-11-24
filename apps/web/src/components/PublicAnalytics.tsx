import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { COOKIE_CONSENT_EVENT, hasCookieConsent } from "../lib/cookieConsent";
import {
  isPublicAnalyticsPath,
  trackGtmPageView,
  trackGtmScroll,
} from "../lib/gtmEvents";

function inferPageType(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  // /:lang/admin/... already filtered out
  if (parts.length <= 1) return "home_or_lang";
  const tail = parts[parts.length - 1] || "";
  const prev = parts[parts.length - 2] || "";
  if (["pricing", "tarife", "preise"].includes(tail)) return "pricing";
  if (["overview", "atmenet", "uberblick", "áttekintés"].some((s) => pathname.includes(s))) {
    return "overview";
  }
  if (["login", "register", "forgot-password", "reset-password"].includes(tail)) return "auth";
  if (prev === "event" || tail === "event") return "event_detail";
  if (["hely", "place", "ort", "places"].includes(prev)) return "place_detail";
  if (["telepules", "town", "gemeinde"].includes(prev)) return "town";
  if (pathname.includes("static-page")) return "static_page";
  if (pathname.includes("map") || pathname.includes("terkep")) return "map";
  return "public";
}

const SCROLL_MARKS = [25, 50, 75, 90] as const;

/**
 * Public-only analytics: SPA page_view + scroll depth.
 * Admin paths are ignored. Events go to dataLayer after consent — GTM ID optional.
 */
export function PublicAnalytics() {
  const location = useLocation();
  const firedScroll = useRef<Set<number>>(new Set());

  useEffect(() => {
    firedScroll.current = new Set();
  }, [location.pathname, location.search]);

  useEffect(() => {
    const path = `${location.pathname}${location.search}`;
    if (!isPublicAnalyticsPath(location.pathname)) return;

    const send = () => {
      if (!hasCookieConsent()) return;
      trackGtmPageView(path, {
        page_type: inferPageType(location.pathname),
        page_title: document.title,
      });
    };
    send();
    window.addEventListener(COOKIE_CONSENT_EVENT, send);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, send);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!isPublicAnalyticsPath(location.pathname)) return;

    const onScroll = () => {
      if (!hasCookieConsent()) return;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable <= 0) return;
      const pct = Math.round((window.scrollY / scrollable) * 100);
      for (const mark of SCROLL_MARKS) {
        if (pct >= mark && !firedScroll.current.has(mark)) {
          firedScroll.current.add(mark);
          trackGtmScroll(mark);
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname, location.search]);

  return null;
}

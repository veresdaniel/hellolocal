// Loads gtag only when a measurement ID is set and cookie consent was given.
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { COOKIE_CONSENT_EVENT, hasCookieConsent } from "../lib/cookieConsent";
import { GA_MEASUREMENT_ID_PATTERN } from "../lib/gaMeasurementId";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __hlGaConfigured?: Record<string, boolean>;
  }
}

type Props = {
  measurementId?: string | null;
};

function ensureGtag(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
}

function loadGtagScript(measurementId: string): Promise<void> {
  ensureGtag();
  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-hl-ga="${measurementId}"]`
  );
  if (existing) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    script.dataset.hlGa = measurementId;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("gtag script failed"));
    document.head.appendChild(script);
  });
}

/**
 * Consent-gated GA4 loader. No ID or no consent → nothing loads.
 * Prefer most-specific ID (Event > Place > Town > Site) on site routes;
 * platform ID on platform routes (no cross-fallback).
 */
export function GoogleAnalytics({ measurementId }: Props) {
  const location = useLocation();
  const [consent, setConsent] = useState(() => hasCookieConsent());
  const [ready, setReady] = useState(false);
  const id = (() => {
    const trimmed = measurementId?.trim();
    if (!trimmed) return null;
    const upper = trimmed.toUpperCase();
    // Never inject gtag/js?id= unless the ID matches G-…
    return GA_MEASUREMENT_ID_PATTERN.test(upper) ? upper : null;
  })();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const onConsent = () => setConsent(true);
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }, []);

  useEffect(() => {
    setReady(false);
    if (!consent || !id) return;
    let cancelled = false;

    void (async () => {
      try {
        await loadGtagScript(id);
        if (cancelled) return;
        ensureGtag();
        window.__hlGaConfigured = window.__hlGaConfigured || {};
        if (!window.__hlGaConfigured[id]) {
          window.gtag?.("js", new Date());
          window.gtag?.("config", id, {
            send_page_view: false,
            anonymize_ip: true,
          });
          window.__hlGaConfigured[id] = true;
        }
        setReady(true);
      } catch {
        /* network / blocked — stay silent */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [consent, id]);

  useEffect(() => {
    if (!ready || !id || typeof window.gtag !== "function") return;
    const path = location.pathname + location.search;
    if (lastPath.current === path) return;
    lastPath.current = path;
    window.gtag("event", "page_view", {
      page_path: path,
      send_to: id,
    });
  }, [ready, id, location.pathname, location.search]);

  return null;
}

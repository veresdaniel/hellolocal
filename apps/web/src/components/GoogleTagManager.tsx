/** Consent-gated Google Tag Manager loader for platform public hosts. */
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_EVENT, hasCookieConsent } from "../lib/cookieConsent";
import { GTM_CONTAINER_ID_PATTERN } from "../lib/gtmContainerId";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __hlGtmLoaded?: Record<string, boolean>;
  }
}

type Props = {
  containerId?: string | null;
};

function ensureDataLayer(): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer!.push(args);
    };
  }
}

function loadGtmScript(containerId: string): Promise<void> {
  ensureDataLayer();
  if (window.__hlGtmLoaded?.[containerId]) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(
    `script[data-hl-gtm="${containerId}"]`
  );
  if (existing) {
    window.__hlGtmLoaded = { ...(window.__hlGtmLoaded || {}), [containerId]: true };
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    window.dataLayer!.push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js",
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(containerId)}`;
    script.dataset.hlGtm = containerId;
    script.onload = () => {
      window.__hlGtmLoaded = { ...(window.__hlGtmLoaded || {}), [containerId]: true };
      window.gtag?.("js", new Date());
      resolve();
    };
    script.onerror = () => reject(new Error("gtm script failed"));
    document.head.appendChild(script);
  });
}

/**
 * Platform GTM only (hellolocal.hu shell). No ID or no consent → nothing loads.
 * Custom-domain sites keep their own GA hierarchy and do not receive this tag.
 */
export function GoogleTagManager({ containerId }: Props) {
  const [consent, setConsent] = useState(() => hasCookieConsent());
  const id = (() => {
    const trimmed = containerId?.trim();
    if (!trimmed) return null;
    const upper = trimmed.toUpperCase();
    return GTM_CONTAINER_ID_PATTERN.test(upper) ? upper : null;
  })();

  useEffect(() => {
    const onConsent = () => setConsent(true);
    window.addEventListener(COOKIE_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onConsent);
  }, []);

  useEffect(() => {
    if (!consent || !id) return;
    let cancelled = false;
    void (async () => {
      try {
        await loadGtmScript(id);
        if (cancelled) return;
      } catch {
        /* network / blocked — stay silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [consent, id]);

  if (!consent || !id) return null;

  return (
    <noscript>
      <iframe
        title="Google Tag Manager"
        src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(id)}`}
        height={0}
        width={0}
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}

// Platform public shell: cookie consent + host-scoped GTM (not legacy GA4).
import { createContext, Suspense, useContext, useEffect, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { CookieConsent } from "./CookieConsent";
import { GoogleTagManager } from "./GoogleTagManager";
import { PublicBootShell } from "./PublicSkeleton";
import { resolvePublicHostGtm } from "../api/public.api";

/** Set around a region layout so this shell does not add a second consent banner. */
export const InsideSiteChrome = createContext(false);

type Props = {
  children?: ReactNode;
};

export function PlatformGaShell({ children }: Props) {
  const insideSite = useContext(InsideSiteChrome);
  const [gtmContainerId, setGtmContainerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const host = typeof window !== "undefined" ? window.location.hostname : "";
    void resolvePublicHostGtm(host)
      .then((id) => {
        if (!cancelled) setGtmContainerId(id);
      })
      .catch(() => {
        if (!cancelled) setGtmContainerId(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Navy boot shell — white LoadingSpinner was flashing over SSR overview and
  // competing with LCP when a lazy child still suspends.
  const fallback = <PublicBootShell />;

  return (
    <>
      <Suspense fallback={fallback}>{children ?? <Outlet />}</Suspense>
      {!insideSite ? <CookieConsent /> : null}
      {/* Host-scoped GTM on every public page for this hostname (platform + custom). */}
      <GoogleTagManager containerId={gtmContainerId} />
    </>
  );
}

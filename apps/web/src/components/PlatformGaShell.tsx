// Platform public shell: cookie consent + host-scoped GTM (not legacy GA4).
import { createContext, Suspense, useEffect, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { GoogleTagManager } from "./GoogleTagManager";
import { PublicBootShell } from "./PublicSkeleton";
import { resolvePublicHostGtm } from "../api/public.api";

/** Set around a region layout so nested shells know site chrome is already mounted. */
export const InsideSiteChrome = createContext(false);

type Props = {
  children?: ReactNode;
};

export function PlatformGaShell({ children }: Props) {
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
      {/* Host-scoped GTM on every public page for this hostname (platform + custom). */}
      <GoogleTagManager containerId={gtmContainerId} />
    </>
  );
}

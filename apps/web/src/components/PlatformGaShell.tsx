// Platform public shell: cookie consent + platform-wide GA4 (not site IDs).
import { createContext, Suspense, useContext, useEffect, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { CookieConsent } from "./CookieConsent";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { LoadingSpinner } from "./LoadingSpinner";
import { getPublicPlatformGa } from "../api/public.api";

/** Set around a region layout so this shell does not add a second consent banner. */
export const InsideSiteChrome = createContext(false);

type Props = {
  children?: ReactNode;
};

export function PlatformGaShell({ children }: Props) {
  const insideSite = useContext(InsideSiteChrome);
  const [measurementId, setMeasurementId] = useState<string | null>(null);

  useEffect(() => {
    if (insideSite) return;
    let cancelled = false;
    getPublicPlatformGa()
      .then((row) => {
        if (!cancelled) setMeasurementId(row.gaMeasurementId);
      })
      .catch(() => {
        if (!cancelled) setMeasurementId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [insideSite]);

  if (insideSite) {
    return (
      <Suspense fallback={<LoadingSpinner isLoading={true} delay={200} />}>
        {children ?? <Outlet />}
      </Suspense>
    );
  }

  return (
    <>
      <Suspense fallback={<LoadingSpinner isLoading={true} delay={200} />}>
        {children ?? <Outlet />}
      </Suspense>
      <CookieConsent />
      <GoogleAnalytics measurementId={measurementId} />
    </>
  );
}

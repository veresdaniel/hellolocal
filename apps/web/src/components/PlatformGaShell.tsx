// Platform public shell: cookie consent + platform-wide GA4 (not site IDs).
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { Outlet } from "react-router-dom";
import { CookieConsent } from "./CookieConsent";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { LoadingSpinner } from "./LoadingSpinner";
import { getPublicPlatformGa } from "../api/public.api";

type Props = {
  children?: ReactNode;
};

export function PlatformGaShell({ children }: Props) {
  const [measurementId, setMeasurementId] = useState<string | null>(null);

  useEffect(() => {
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
  }, []);

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

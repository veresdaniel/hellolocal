// src/components/RootRedirect.tsx
import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { preferredLang } from "../app/browserLang";
import { platformLandingPath } from "../app/entityPaths";
import { isPlatformHost } from "../app/urls";
import { pathForHostResolve, siteForHost } from "../app/hostResolve";
import { platformHostLanguage, setPlatformPublicHostEntries, setPlatformPublicHosts } from "../app/platformOrigin";
import { getPublicPlatformHost } from "../api/public.api";
import { LoadingSpinner } from "./LoadingSpinner";
import { PlatformGaShell } from "./PlatformGaShell";

const OverviewPage = lazy(() =>
  import("../pages/OverviewPage").then((m) => ({ default: m.OverviewPage }))
);

/** Sentinel: stay on `/` and render the platform marketing landing. */
const PLATFORM_APEX = "__platform_apex__";

export function RootRedirect() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const [publicTarget, setPublicTarget] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminRoute) return;
    const ac = new AbortController();
    void (async () => {
      try {
        const row = await getPublicPlatformHost();
        if (ac.signal.aborted) return;
        if (row.entries.length) setPlatformPublicHostEntries(row.entries);
        else setPlatformPublicHosts(row.hosts);
      } catch {
        if (!ac.signal.aborted) setPlatformPublicHosts([]);
      }
      if (ac.signal.aborted || typeof window === "undefined") return;
      const host = window.location.hostname;
      if (isPlatformHost(host)) {
        // Language-specific platform hosts keep the bare domain as the opener URL.
        setPublicTarget(PLATFORM_APEX);
        return;
      }
      const site = await siteForHost(host, ac.signal);
      if (ac.signal.aborted) return;
      setPublicTarget(
        site
          ? pathForHostResolve(site, location.search)
          : platformLandingPath(platformHostLanguage(host) || preferredLang())
      );
    })();
    return () => ac.abort();
  }, [isAdminRoute, location.search]);

  if (!isAdminRoute && !publicTarget) return <LoadingSpinner />;
  if (!isAdminRoute && publicTarget === PLATFORM_APEX) {
    return (
      <PlatformGaShell>
        <Suspense fallback={<LoadingSpinner />}>
          <OverviewPage />
        </Suspense>
      </PlatformGaShell>
    );
  }
  if (!isAdminRoute && publicTarget) return <Navigate to={publicTarget} replace />;

  if (isAdminRoute) {
    // Extract the path after /admin (e.g., "/login" from "/admin/login", or "" from "/admin")
    // Handle both "/admin" and "/admin/login" cases
    let adminPath = location.pathname.replace(/^\/admin/, "") || "";

    // Ensure adminPath starts with / if it's not empty
    if (adminPath && !adminPath.startsWith("/")) {
      adminPath = `/${adminPath}`;
    }

    const finalPath = `/${preferredLang()}/admin${adminPath}`;

    return <Navigate to={finalPath} replace />;
  }

  return <LoadingSpinner />;
}

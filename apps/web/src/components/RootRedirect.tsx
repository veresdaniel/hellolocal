// src/components/RootRedirect.tsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { preferredLang } from "../app/browserLang";
import { isPlatformHost } from "../app/urls";
import { pathForHostResolve, siteForHost } from "../app/hostResolve";
import { platformHostLanguage, setPlatformPublicHostEntries, setPlatformPublicHosts } from "../app/platformOrigin";
import { getPublicPlatformHost } from "../api/public.api";
import { LoadingSpinner } from "./LoadingSpinner";

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
        setPublicTarget(`/${platformHostLanguage(host) || preferredLang()}/overview`);
        return;
      }
      const site = await siteForHost(host, ac.signal);
      if (ac.signal.aborted) return;
      setPublicTarget(
        site ? pathForHostResolve(site, location.search) : `/${preferredLang()}/overview`
      );
    })();
    return () => ac.abort();
  }, [isAdminRoute, location.search]);

  if (!isAdminRoute && !publicTarget) return <LoadingSpinner />;
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

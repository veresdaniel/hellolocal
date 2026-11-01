// src/components/RootRedirect.tsx
import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { preferredLang } from "../app/browserLang";
import { isPlatformHost } from "../app/urls";
import { pathForHostResolve, siteForHost } from "../app/hostResolve";
import { LoadingSpinner } from "./LoadingSpinner";

export function RootRedirect() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const customHost =
    !isAdminRoute && typeof window !== "undefined" && !isPlatformHost(window.location.hostname);
  const [customTarget, setCustomTarget] = useState<string | null>(null);
  const [customReady, setCustomReady] = useState(!customHost);

  useEffect(() => {
    if (!customHost) return;
    const ac = new AbortController();
    void siteForHost(window.location.hostname, ac.signal).then((site) => {
      if (ac.signal.aborted) return;
      setCustomTarget(site ? pathForHostResolve(site, location.search) : null);
      setCustomReady(true);
    });
    return () => {
      ac.abort();
    };
  }, [customHost, location.search]);

  if (customHost && !customReady) return <LoadingSpinner />;
  if (customHost && customTarget) return <Navigate to={customTarget} replace />;

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

  // Public entry is the marketing overview. Region homes stay at /:lang/:siteKey.
  return <Navigate to={`/${preferredLang()}/overview`} replace />;
}

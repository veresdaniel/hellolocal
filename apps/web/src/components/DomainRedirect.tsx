import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { pathForHostResolve, siteForHost } from "../app/hostResolve";
import { isPlatformHost } from "../app/urls";
import { isLang } from "../types/enums";
import { devLog } from "../lib/devLog";

/**
 * On a region's / town's / place's own domain, / and /:lang open that entity.
 * On the platform host the address stays /:lang/:slug.
 */
export function DomainRedirect() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);
  const langFromPath = parts[0];
  const bareLanguage = parts.length === 1 && isLang(langFromPath);
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const shouldResolve =
    !!host && !isPlatformHost(host) && !location.pathname.includes("/admin") && bareLanguage;

  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!shouldResolve) return;
    const ac = new AbortController();
    void siteForHost(host, ac.signal).then((site) => {
      if (ac.signal.aborted) return;
      if (!site) {
        devLog.debug("[DomainRedirect] no site for host", host);
        setTarget(null);
        return;
      }
      const lang = langFromPath || site.defaultLang || "hu";
      const next = pathForHostResolve({ ...site, defaultLang: lang }, location.search);
      devLog.debug("[DomainRedirect] redirect", host, "→", next);
      setTarget(next);
    });
    return () => {
      ac.abort();
    };
  }, [shouldResolve, host, langFromPath, location.search]);

  if (!shouldResolve || !target || target === location.pathname + location.search) return null;
  return <Navigate to={target} replace />;
}

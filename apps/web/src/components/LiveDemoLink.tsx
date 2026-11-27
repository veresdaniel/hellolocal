import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicLiveDemo } from "../api/public.api";
import { REGION_LIST_PATH } from "../app/entityPaths";
import { liveDemoMapHref, resolveLiveDemoHref } from "../app/liveDemoUrl";
import { buildUrl } from "../app/urls";
import type { Lang } from "../app/config";
import { trackGtmCtaClick } from "../lib/gtmEvents";

export function LiveDemoLink({
  lang,
  className,
  children,
  ctaId = "live_demo",
  map = false,
}: {
  lang: Lang;
  className?: string;
  children: ReactNode;
  ctaId?: string;
  /** Open the demo’s map (`/hu/terkep`) instead of the configured directory URL. */
  map?: boolean;
}) {
  const onTrack = () => {
    const label =
      typeof children === "string"
        ? children
        : Array.isArray(children) && typeof children[0] === "string"
          ? children[0]
          : undefined;
    trackGtmCtaClick(ctaId, label);
  };
  const fallback = buildUrl({ lang, path: REGION_LIST_PATH[lang] });
  // Don't contend with overview LCP / first API burst — resolve demo URL once idle.
  const [allowFetch, setAllowFetch] = useState(false);
  useEffect(() => {
    let idleId = 0;
    let timeoutId = 0;
    const enable = () => setAllowFetch(true);
    if (typeof requestIdleCallback === "function") {
      idleId = requestIdleCallback(enable, { timeout: 4000 });
    } else {
      timeoutId = window.setTimeout(enable, 1200);
    }
    return () => {
      if (idleId && typeof cancelIdleCallback === "function") cancelIdleCallback(idleId);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  const { data } = useQuery({
    queryKey: ["live-demo-url"],
    queryFn: getPublicLiveDemo,
    staleTime: 60_000,
    enabled: allowFetch,
  });
  const resolved = resolveLiveDemoHref(data?.url, fallback);
  const target = map
    ? { ...resolved, href: liveDemoMapHref(resolved.href, lang) }
    : resolved;
  if (target.external) {
    return (
      <a className={className} href={target.href} onClick={onTrack}>
        {children}
      </a>
    );
  }
  return (
    <Link className={className} to={target.href} onClick={onTrack}>
      {children}
    </Link>
  );
}

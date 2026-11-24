import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getPublicLiveDemo } from "../api/public.api";
import { REGION_LIST_PATH } from "../app/entityPaths";
import { resolveLiveDemoHref } from "../app/liveDemoUrl";
import { buildUrl } from "../app/urls";
import type { Lang } from "../app/config";

export function LiveDemoLink({
  lang,
  className,
  children,
}: {
  lang: Lang;
  className?: string;
  children: ReactNode;
}) {
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
  const target = resolveLiveDemoHref(data?.url, fallback);
  if (target.external) {
    return (
      <a className={className} href={target.href}>
        {children}
      </a>
    );
  }
  return (
    <Link className={className} to={target.href}>
      {children}
    </Link>
  );
}

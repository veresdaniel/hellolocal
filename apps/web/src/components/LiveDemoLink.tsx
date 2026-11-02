import type { ReactNode } from "react";
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
  const { data } = useQuery({
    queryKey: ["live-demo-url"],
    queryFn: getPublicLiveDemo,
    staleTime: 60_000,
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

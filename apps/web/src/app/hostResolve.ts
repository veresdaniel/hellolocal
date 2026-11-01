import { placeEntityPath, townEntityPath } from "./entityPaths";
import { devLog } from "../lib/devLog";

export type HostResolve = {
  kind?: "site" | "town" | "place";
  slug: string;
  defaultLang: string;
  entitySlug?: string;
};

/** Build the in-app path for a resolved custom hostname. */
export function pathForHostResolve(resolved: HostResolve, search = ""): string {
  const lang = resolved.defaultLang || "hu";
  const siteSlug = resolved.slug;
  if (resolved.kind === "town" && resolved.entitySlug) {
    return `/${lang}/${siteSlug}/${townEntityPath(lang, resolved.entitySlug)}${search}`;
  }
  if (resolved.kind === "place" && resolved.entitySlug) {
    return `/${lang}/${siteSlug}/${placeEntityPath(lang, resolved.entitySlug)}${search}`;
  }
  return `/${lang}/${siteSlug}${search}`;
}

export async function siteForHost(
  host: string,
  signal?: AbortSignal
): Promise<HostResolve | null> {
  const apiUrl = import.meta.env.VITE_API_URL;
  const base = apiUrl ? String(apiUrl).replace(/\/$/, "") : "";
  try {
    devLog.debug("[domain] resolve host", host);
    const response = await fetch(`${base}/api/domain/${encodeURIComponent(host)}`, {
      headers: { accept: "application/json" },
      signal,
    });
    if (!response.ok) {
      devLog.warn("[domain] resolve failed", host, response.status);
      return null;
    }
    const data = (await response.json()) as HostResolve;
    if (!data?.slug) {
      devLog.warn("[domain] resolve missing slug", host, data);
      return null;
    }
    devLog.debug("[domain] resolved", host, data.kind, data.slug);
    return data;
  } catch (err) {
    if ((err as { name?: string })?.name !== "AbortError") {
      devLog.error("[domain] resolve error", host, err);
    }
    return null;
  }
}

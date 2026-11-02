import { devLog } from "../lib/devLog";

export type HostResolve = {
  kind?: "site" | "town" | "place" | "collection" | "event";
  slug: string;
  defaultLang: string;
  entitySlug?: string;
};

/**
 * Custom host already names the region, town, place, or collection.
 * The in-app path is /:lang, without that slug.
 */
export function pathForHostResolve(resolved: HostResolve, search = ""): string {
  const lang = resolved.defaultLang || "hu";
  return `/${lang}${search}`;
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

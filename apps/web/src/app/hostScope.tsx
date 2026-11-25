/**
 * Host-scoped public routing: maps the browser hostname to platform vs custom
 * region/town/place/event/collection scope for URL building and route guards.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { isPlacePathSegment } from "./entityPaths";
import { siteForHost, type HostResolve } from "./hostResolve";
import { isPlatformHost } from "./urls";
import { setPlatformPublicHostEntries, setPlatformPublicHosts } from "./platformOrigin";
import { getPublicPlatformHost } from "../api/public.api";

/** Resolved hostname ownership for public paths (loading until domain-resolve returns). */
export type HostScope =
  | { status: "loading"; kind: "platform" }
  | { status: "ready"; kind: "platform" }
  | { status: "ready"; kind: "site"; siteSlug: string; defaultLang: string }
  | { status: "ready"; kind: "town"; siteSlug: string; entitySlug: string; defaultLang: string }
  | { status: "ready"; kind: "place"; siteSlug: string; entitySlug: string; defaultLang: string }
  | { status: "ready"; kind: "event"; siteSlug: string; entitySlug: string; defaultLang: string }
  | { status: "ready"; kind: "collection"; slug: string; defaultLang: string };

const PLATFORM: HostScope = { status: "ready", kind: "platform" };

let current: HostScope = PLATFORM;

/** SSR-injected domain resolve (`#hl-host-bootstrap`) — skips /api/domain on first paint. */
function readHostBootstrap(): HostResolve | null {
  if (typeof document === "undefined") return null;
  const el = document.getElementById("hl-host-bootstrap");
  if (!el?.textContent?.trim()) return null;
  try {
    const data = JSON.parse(el.textContent) as HostResolve;
    return data?.slug ? data : null;
  } catch {
    return null;
  }
}

/** Imperative read of the latest host scope (used by `buildUrl` outside React). */
export function getHostScope(): HostScope {
  return current;
}

function scopeFromResolve(site: HostResolve | null): HostScope {
  if (!site) return PLATFORM;
  if (site.kind === "collection") {
    return { status: "ready", kind: "collection", slug: site.slug, defaultLang: site.defaultLang || "hu" };
  }
  if (site.kind === "town" && site.entitySlug) {
    return {
      status: "ready",
      kind: "town",
      siteSlug: site.slug,
      entitySlug: site.entitySlug,
      defaultLang: site.defaultLang || "hu",
    };
  }
  if (site.kind === "place" && site.entitySlug) {
    return {
      status: "ready",
      kind: "place",
      siteSlug: site.slug,
      entitySlug: site.entitySlug,
      defaultLang: site.defaultLang || "hu",
    };
  }
  if (site.kind === "event" && site.entitySlug) {
    return {
      status: "ready",
      kind: "event",
      siteSlug: site.slug,
      entitySlug: site.entitySlug,
      defaultLang: site.defaultLang || "hu",
    };
  }
  return { status: "ready", kind: "site", siteSlug: site.slug, defaultLang: site.defaultLang || "hu" };
}

const HostScopeContext = createContext<HostScope>(PLATFORM);

/** React access to the current {@link HostScope}. */
export function useHostScope(): HostScope {
  return useContext(HostScopeContext);
}

/**
 * Loads platform host allowlist + domain-resolve for the current hostname.
 * Sets scope to platform immediately for known platform hosts; otherwise stays
 * `loading` until `/api/domain/:host` returns.
 */
/** Server painted platform marketing overview → treat host as platform before API hosts load. */
function hasOverviewSsr(): boolean {
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector(".overview--ssr, #root > .overview"));
}

export function HostScopeProvider({ children }: { children: ReactNode }) {
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const [scope, setScope] = useState<HostScope>(() => {
    if (!host || isPlatformHost(host) || hasOverviewSsr()) return PLATFORM;
    const boot = readHostBootstrap();
    if (boot) return scopeFromResolve(boot);
    return { status: "loading", kind: "platform" };
  });
  current = scope;

  useEffect(() => {
    const ac = new AbortController();
    const boot = readHostBootstrap();
    void (async () => {
      try {
        const row = await getPublicPlatformHost();
        if (!ac.signal.aborted) {
          if (row.entries.length) setPlatformPublicHostEntries(row.entries);
          else setPlatformPublicHosts(row.hosts);
        }
      } catch {
        if (!ac.signal.aborted) setPlatformPublicHosts([]);
      }
      if (ac.signal.aborted) return;
      if (!host || isPlatformHost(host)) {
        current = PLATFORM;
        setScope(PLATFORM);
        return;
      }
      // SSR bootstrap already painted a ready scope — skip /api/domain round-trip.
      if (boot?.slug) return;
      const site = await siteForHost(host, ac.signal);
      if (ac.signal.aborted) return;
      const next = scopeFromResolve(site);
      current = next;
      setScope(next);
    })();
    return () => ac.abort();
  }, [host]);

  return <HostScopeContext.Provider value={scope}>{children}</HostScopeContext.Provider>;
}

/** Short path on a custom host. Null when the current path is already canonical. */
export function canonicalHostPath(pathname: string, scope: HostScope): string | null {
  if (scope.status !== "ready" || scope.kind === "platform") return null;
  const parts = pathname.split("/").filter(Boolean);
  const lang = parts[0];
  if (!lang) return null;
  const original = pathname.replace(/\/$/, "") || "/";
  let tail = parts.slice(1);

  if (scope.kind === "collection") {
    if (tail[0] === "collections" && tail[1] === scope.slug) {
      const next = `/${lang}`;
      return next === original ? null : next;
    }
    return null;
  }

  if (tail[0] === scope.siteSlug) tail = tail.slice(1);
  if (scope.kind === "town" && tail[0] === scope.entitySlug) {
    tail = tail.slice(1);
  }
  if (scope.kind === "place" && isPlacePathSegment(tail[0]) && tail[1] === scope.entitySlug) {
    tail = tail.slice(2);
  }
  if (scope.kind === "event" && tail[0] === "event" && tail[1] === scope.entitySlug) {
    tail = tail.slice(2);
  }

  const next = tail.length ? `/${lang}/${tail.join("/")}` : `/${lang}`;
  return next === original ? null : next;
}

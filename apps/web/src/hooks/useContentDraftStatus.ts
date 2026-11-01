import { useEffect, useState } from "react";
import { getContentDraftStatus, type ContentDraftStatus } from "../api/admin.api";

type CacheEntry = {
  status: ContentDraftStatus;
  at: number;
};

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ContentDraftStatus>>();

function cacheKey(siteId?: string, placeId?: string) {
  return `${siteId || ""}::${placeId || ""}`;
}

async function loadStatus(siteId?: string, placeId?: string): Promise<ContentDraftStatus> {
  const key = cacheKey(siteId, placeId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.status;

  const pending = inflight.get(key);
  if (pending) return pending;

  const request = getContentDraftStatus(siteId, placeId)
    .then((status) => {
      cache.set(key, { status, at: Date.now() });
      return status;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, request);
  return request;
}

/** Shared status for AI draft postfix buttons (cached per site/place). */
export function useContentDraftStatus(siteId?: string, placeId?: string) {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    loadStatus(siteId, placeId)
      .then((status) => {
        if (cancelled) return;
        setEnabled(Boolean(status.enabled));
        setAllowed(Boolean(status.allowed));
      })
      .catch(() => {
        if (cancelled) return;
        setEnabled(false);
        setAllowed(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, placeId]);

  return { ready, enabled, allowed, visible: ready && allowed };
}

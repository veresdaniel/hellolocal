import { useEffect, useState } from "react";
import { getContentDraftStatus, type ContentDraftStatus } from "../api/admin.api";

type CacheEntry = {
  status: ContentDraftStatus;
  at: number;
};

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ContentDraftStatus>>();
let cacheEpoch = 0;
const epochListeners = new Set<() => void>();

function cacheKey(siteId?: string, placeId?: string) {
  return `${siteId || ""}::${placeId || ""}`;
}

/** Drop cached status after App Settings save so AI controls re-enable promptly. */
export function clearContentDraftStatusCache() {
  cache.clear();
  inflight.clear();
  cacheEpoch += 1;
  for (const listener of epochListeners) listener();
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
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [epoch, setEpoch] = useState(cacheEpoch);

  useEffect(() => {
    const onBump = () => setEpoch(cacheEpoch);
    epochListeners.add(onBump);
    return () => {
      epochListeners.delete(onBump);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    loadStatus(siteId, placeId)
      .then((status) => {
        if (cancelled) return;
        setEnabled(Boolean(status.enabled));
        setAllowed(Boolean(status.allowed));
        setKeyConfigured(Boolean(status.keyConfigured ?? status.enabled));
      })
      .catch(() => {
        if (cancelled) return;
        setEnabled(false);
        setAllowed(false);
        setKeyConfigured(false);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId, placeId, epoch]);

  return { ready, enabled, allowed, keyConfigured, visible: ready && allowed };
}

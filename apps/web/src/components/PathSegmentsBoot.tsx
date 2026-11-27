import { useEffect } from "react";
import { getPublicPathSegments } from "../api/uiCopy.api";
import { setPathSegmentsPayload } from "../app/pathSegmentsStore";
import type { PathSegmentsPayload } from "../app/pathSegmentKeys";

/**
 * Loads localized URL path words once at app start.
 * Safe to mount under the router; getters already have a dictionary fallback.
 */
export function PathSegmentsBoot() {
  useEffect(() => {
    let cancelled = false;
    void getPublicPathSegments()
      .then((payload) => {
        if (cancelled || !payload) return;
        setPathSegmentsPayload(payload as PathSegmentsPayload);
      })
      .catch(() => {
        /* keep boot fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

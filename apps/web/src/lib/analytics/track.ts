import { getVisitorId } from "./visitor";

export type TrackEventType = "page_view" | "place_view" | "cta_click";
export type CtaType = "phone" | "email" | "website" | "maps" | "floorplan";

export type TrackPayload = {
  type: TrackEventType;
  path?: string;
  placeId?: string;
  ctaType?: CtaType;
  referrer?: string;
};

export async function track(payload: TrackPayload): Promise<void> {
  try {
    const lang = window.location.pathname.split("/")[1] || "hu";
    await fetch(`/api/${lang}/analytics/track`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Visitor-Id": getVisitorId(),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.debug("Analytics track failed:", error);
  }
}

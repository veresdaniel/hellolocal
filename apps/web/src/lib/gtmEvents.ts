/**
 * Public analytics → `dataLayer` (GTM / GA4).
 *
 * Safe without a container ID: events queue into `dataLayer` after cookie consent.
 * When a GTM container later loads on this host, it reads the queue and can forward
 * to GA4 via Custom Event triggers. Admin routes must not call these helpers.
 */
import { hasCookieConsent } from "./cookieConsent";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export type AnalyticsItemType = "place" | "event" | "town" | "site" | "product" | "content";

export type ContactMethod =
  | "phone"
  | "email"
  | "website"
  | "maps"
  | "whatsapp"
  | "facebook"
  | "other";

function push(payload: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  if (!hasCookieConsent()) return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    ...payload,
    // Help GTM filters / debug
    transport_timestamp: Date.now(),
  });
}

/** Skip /admin (with or without lang prefix). */
export function isPublicAnalyticsPath(pathname: string): boolean {
  return !/\/admin(\/|$)/.test(pathname);
}

/** GA4-style SPA page_view. */
export function trackGtmPageView(
  path = typeof window !== "undefined" ? window.location.pathname : "/",
  extras?: { page_type?: string; page_title?: string }
): void {
  if (typeof window === "undefined") return;
  if (!isPublicAnalyticsPath(path)) return;
  push({
    event: "page_view",
    page_path: path,
    page_location: window.location.href,
    page_title: extras?.page_title || document.title,
    page_type: extras?.page_type,
  });
}

/** Recommended: view_item (detail pages). */
export function trackGtmViewItem(item: {
  itemId: string;
  itemName?: string;
  itemCategory?: string;
  itemType?: AnalyticsItemType;
}): void {
  push({
    event: "view_item",
    item_id: item.itemId,
    item_name: item.itemName,
    item_category: item.itemCategory,
    item_type: item.itemType || "place",
  });
}

/** Recommended: select_item (list / card click before navigation). */
export function trackGtmSelectItem(item: {
  itemId: string;
  itemName?: string;
  itemCategory?: string;
  itemType?: AnalyticsItemType;
  listName?: string;
}): void {
  push({
    event: "select_item",
    item_id: item.itemId,
    item_name: item.itemName,
    item_category: item.itemCategory,
    item_type: item.itemType || "place",
    item_list_name: item.listName,
  });
}

/** Contact / outbound CTA on place or event. */
export function trackGtmContactClick(input: {
  method: ContactMethod;
  itemId?: string;
  itemName?: string;
  itemType?: AnalyticsItemType;
}): void {
  push({
    event: "contact_click",
    contact_method: input.method,
    item_id: input.itemId,
    item_name: input.itemName,
    item_type: input.itemType,
  });
}

/** Social share. */
export function trackGtmShare(input: {
  method: string;
  contentType?: string;
  itemId?: string;
}): void {
  push({
    event: "share",
    method: input.method,
    content_type: input.contentType,
    item_id: input.itemId,
  });
}

/** Primary marketing CTA. */
export function trackGtmCtaClick(ctaId: string, ctaText?: string): void {
  push({
    event: "cta_click",
    cta_id: ctaId,
    cta_text: ctaText || undefined,
  });
}

/** Auth entry points. */
export function trackGtmAuthClick(action: "login" | "register"): void {
  push({
    event: action === "login" ? "login_click" : "sign_up_click",
  });
}

/** Lead / demo form. */
export function trackGtmGenerateLead(formId = "demo_request"): void {
  push({
    event: "generate_lead",
    form_id: formId,
  });
}

/** Soft engagement / nav content. */
export function trackGtmSelectContent(contentId: string, contentType?: string): void {
  push({
    event: "select_content",
    content_id: contentId,
    content_type: contentType,
  });
}

/** Search (when a public search exists). */
export function trackGtmSearch(searchTerm: string): void {
  const term = searchTerm.trim();
  if (!term) return;
  push({
    event: "search",
    search_term: term,
  });
}

/** Scroll depth milestones (25/50/75/90). */
export function trackGtmScroll(percent: number): void {
  push({
    event: "scroll",
    percent_scrolled: percent,
  });
}

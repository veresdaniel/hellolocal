import type { CSSProperties } from "react";
import { SafeHtml } from "./SafeHtml";
import { sanitizeHtml } from "../utils/sanitizeHtml";
import { stripHtml } from "../utils/htmlUtils";
import { hasVisibleHtml } from "../utils/hasVisibleHtml";

type BlockProps = {
  html: string | null | undefined;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "span" | "p" | "section" | "article" | "small";
};

type InlineProps = {
  html: string | null | undefined;
  className?: string;
  style?: CSSProperties;
};

/** True when landing/UiMessage copy has visible content (plain or HTML). */
export function landingHasText(value: string | null | undefined): boolean {
  if (!value) return false;
  if (/<[a-z]/i.test(value)) return hasVisibleHtml(value);
  return value.trim().length > 0;
}

/** Plain text for attrs, SEO, JSON-LD, placeholders. */
export function landingPlain(value: string | null | undefined): string {
  return stripHtml(value ?? "").trim();
}

/**
 * Block HTML for landing body copy. TipTap values keep structure;
 * legacy plain strings render as escaped text via SafeHtml.
 */
export function LandingHtml({ html, className, style, as = "div" }: BlockProps) {
  if (!landingHasText(html)) return null;
  return <SafeHtml html={html} className={className} style={style} as={as} />;
}

/**
 * Inline HTML for headings, buttons, kickers — unwraps a single outer <p>
 * and drops remaining block tags so bold/italic/links still work.
 */
export function LandingInline({ html, className, style }: InlineProps) {
  const clean = toInlineHtml(html);
  if (!clean) return null;
  return (
    <span className={className} style={style} dangerouslySetInnerHTML={{ __html: clean }} />
  );
}

export function toInlineHtml(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  let html = sanitizeHtml(value).trim();
  if (!html) return "";

  const single = html.match(/^<p(?:\s[^>]*)?>([\s\S]*)<\/p>$/i);
  if (single) html = single[1].trim();

  html = html
    .replace(/<\/?(?:p|div|h[1-6]|blockquote|ul|ol|li|pre|figure|figcaption)(?:\s[^>]*)?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  return html;
}

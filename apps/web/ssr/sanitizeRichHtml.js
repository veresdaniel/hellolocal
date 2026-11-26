/**
 * Lightweight allowlist sanitizer for overview SSR (no DOMParser in Node).
 * Mirrors apps/web/src/utils/sanitizeHtml.ts intent for TipTap/UiMessage HTML.
 */

const ALLOWED = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "div",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "hr",
  "i",
  "li",
  "ol",
  "p",
  "pre",
  "s",
  "span",
  "strong",
  "sub",
  "sup",
  "u",
  "ul",
]);

const VOID = new Set(["br", "hr"]);

function escapeText(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isSafeHref(raw) {
  const value = String(raw ?? "").trim();
  if (!value) return false;
  if (/^\s*(javascript|vbscript|data)\s*:/i.test(value)) return false;
  if (value.startsWith("//")) return false;
  return /^(https?:|mailto:|tel:|\/|#)/i.test(value);
}

function sanitizeAttrs(tag, rawAttrs) {
  if (!rawAttrs) return "";
  const out = [];
  const re = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  let match;
  while ((match = re.exec(rawAttrs))) {
    const name = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? "";
    if (name.startsWith("on") || name === "style" || name === "srcdoc") continue;
    if (tag === "a" && name === "href" && isSafeHref(value)) {
      out.push(`href="${escapeText(value)}"`);
      continue;
    }
    if (tag === "a" && name === "target" && value === "_blank") {
      out.push('target="_blank"');
      out.push('rel="noopener noreferrer"');
      continue;
    }
    if (tag === "a" && name === "rel") continue;
    if (name === "class" || name === "title") {
      out.push(`${name}="${escapeText(value)}"`);
    }
  }
  return out.length ? ` ${out.join(" ")}` : "";
}

/**
 * Sanitize rich copy for SSR injection. Plain text is escaped.
 * Disallowed tags are unwrapped (children kept); script/iframe-like tags dropped.
 */
export function sanitizeRichHtml(dirty) {
  const raw = String(dirty ?? "");
  if (!raw.trim()) return "";
  if (!/<[a-z]/i.test(raw)) return escapeText(raw);

  let html = raw
    .replace(
      /<(script|iframe|object|embed|form|style|svg|math)(?:\s[^>]*)?>[\s\S]*?<\/\1>/gi,
      ""
    )
    .replace(
      /<\/?(?:script|iframe|object|embed|form|input|button|textarea|link|meta|base|svg|math|video|source|img|figure|figcaption|style)(?:\s[^>]*)?>/gi,
      ""
    )
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  html = html.replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (full, tagName, attrs = "") => {
    const tag = String(tagName).toLowerCase();
    const closing = full.startsWith("</");
    if (!ALLOWED.has(tag)) return "";
    if (closing) return VOID.has(tag) ? "" : `</${tag}>`;
    if (VOID.has(tag)) return `<${tag}>`;
    return `<${tag}${sanitizeAttrs(tag, attrs)}>`;
  });

  return html;
}

/** Inline variant for headings/CTAs: unwrap single <p>, drop leftover blocks. */
export function sanitizeInlineHtml(dirty) {
  let html = sanitizeRichHtml(dirty).trim();
  if (!html) return "";
  const single = html.match(/^<p(?:\s[^>]*)?>([\s\S]*)<\/p>$/i);
  if (single) html = single[1].trim();
  return html
    .replace(/<\/?(?:p|div|h[1-6]|blockquote|ul|ol|li|pre)(?:\s[^>]*)?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Plain text for JSON-LD / alt / meta. */
export function richToPlain(dirty) {
  return String(dirty ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

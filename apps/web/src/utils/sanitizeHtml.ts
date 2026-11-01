/**
 * Allowlist HTML sanitizer for TipTap / public rich text.
 * Strips scripts, event handlers, and dangerous URLs before dangerouslySetInnerHTML.
 */

const ALLOWED_TAGS = new Set([
  "A",
  "B",
  "BLOCKQUOTE",
  "BR",
  "CODE",
  "DIV",
  "EM",
  "FIGCAPTION",
  "FIGURE",
  "H1",
  "H2",
  "H3",
  "H4",
  "HR",
  "I",
  "IMG",
  "LI",
  "OL",
  "P",
  "PRE",
  "S",
  "SOURCE",
  "SPAN",
  "STRONG",
  "SUB",
  "SUP",
  "U",
  "UL",
  "VIDEO",
]);

const GLOBAL_ATTRS = new Set(["class", "title"]);

const TAG_ATTRS: Record<string, Set<string>> = {
  A: new Set(["href", "target", "rel", "name"]),
  IMG: new Set(["src", "alt", "width", "height", "loading", "style"]),
  VIDEO: new Set(["src", "controls", "width", "height", "poster", "preload", "style"]),
  SOURCE: new Set(["src", "type"]),
  SPAN: new Set(["style"]),
  DIV: new Set(["style"]),
  P: new Set(["style"]),
};

const SAFE_URL = /^(https?:|mailto:|tel:|\/|#)/i;
const DANGEROUS_PROTOCOL = /^\s*(javascript|vbscript|data)\s*:/i;

/** True for http(s), mailto, tel, same-origin paths, and hash links. */
export function isSafeHref(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const value = raw.trim();
  if (!value) return false;
  if (DANGEROUS_PROTOCOL.test(value)) return false;
  if (value.startsWith("//")) return false;
  return SAFE_URL.test(value);
}

function sanitizeStyle(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/expression\s*\(|url\s*\(\s*['"]?\s*(javascript|data|vbscript)/i.test(trimmed)) {
    return null;
  }
  // Keep layout helpers TipTap emits (float, width, margin, display, max-width, height)
  const allowed = trimmed
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((decl) => {
      const prop = decl.split(":")[0]?.trim().toLowerCase() ?? "";
      return (
        prop === "float" ||
        prop === "width" ||
        prop === "height" ||
        prop === "max-width" ||
        prop === "margin" ||
        prop === "margin-left" ||
        prop === "margin-right" ||
        prop === "margin-top" ||
        prop === "margin-bottom" ||
        prop === "display" ||
        prop === "text-align"
      );
    });
  return allowed.length ? allowed.join("; ") : null;
}

function allowAttr(tag: string, name: string, value: string): string | null {
  const lower = name.toLowerCase();
  if (lower.startsWith("on") || lower === "srcdoc") return null;

  if (GLOBAL_ATTRS.has(lower)) return value;

  if (lower === "style") {
    if (tag === "IMG" || tag === "VIDEO" || tag === "SPAN" || tag === "DIV" || tag === "P") {
      return sanitizeStyle(value);
    }
    return null;
  }

  const allowed = TAG_ATTRS[tag];
  if (!allowed?.has(lower)) return null;

  if (lower === "href" || lower === "src" || lower === "poster") {
    return isSafeHref(value) ? value.trim() : null;
  }

  if (lower === "target") {
    return value === "_blank" ? "_blank" : null;
  }

  if (lower === "rel") {
    // Always force noopener when target=_blank is set separately
    return value;
  }

  if (lower === "controls" || lower === "loading" || lower === "preload") {
    return value;
  }

  return value;
}

function cleanNode(node: Node, doc: Document): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    return doc.createTextNode(node.textContent ?? "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return null;
  }

  const el = node as Element;
  const tag = el.tagName.toUpperCase();

  if (!ALLOWED_TAGS.has(tag)) {
    // Unwrap children of disallowed wrappers (e.g. font) but drop script/iframe entirely
    if (tag === "SCRIPT" || tag === "IFRAME" || tag === "OBJECT" || tag === "EMBED" || tag === "LINK" || tag === "META" || tag === "BASE" || tag === "FORM" || tag === "INPUT" || tag === "BUTTON" || tag === "TEXTAREA" || tag === "SVG" || tag === "MATH") {
      return null;
    }
    const frag = doc.createDocumentFragment();
    Array.from(el.childNodes).forEach((child) => {
      const cleaned = cleanNode(child, doc);
      if (cleaned) frag.appendChild(cleaned);
    });
    return frag;
  }

  const out = doc.createElement(tag.toLowerCase());
  Array.from(el.attributes).forEach((attr) => {
    const safe = allowAttr(tag, attr.name, attr.value);
    if (safe != null) out.setAttribute(attr.name.toLowerCase(), safe);
  });

  if (tag === "A" && out.getAttribute("target") === "_blank") {
    const rel = out.getAttribute("rel") || "";
    const parts = new Set(rel.split(/\s+/).filter(Boolean));
    parts.add("noopener");
    parts.add("noreferrer");
    out.setAttribute("rel", Array.from(parts).join(" "));
  }

  Array.from(el.childNodes).forEach((child) => {
    const cleaned = cleanNode(child, doc);
    if (cleaned) out.appendChild(cleaned);
  });

  return out;
}

/**
 * Sanitize untrusted HTML for safe insertion via dangerouslySetInnerHTML.
 * Without DOMParser (SSR/node), returns plain text with tags stripped.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return "";
  if (typeof DOMParser === "undefined") {
    return dirty.replace(/<[^>]*>/g, "");
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirty, "text/html");
  const body = doc.body;
  const out = doc.createElement("div");

  Array.from(body.childNodes).forEach((child) => {
    const cleaned = cleanNode(child, doc);
    if (cleaned) out.appendChild(cleaned);
  });

  return out.innerHTML;
}

/**
 * Email normalization for multi-account abuse checks.
 * Gmail: strip dots + plus-tags. Most providers: lowercase + plus-tag strip.
 */

const GMAIL_HOSTS = new Set(["gmail.com", "googlemail.com"]);

/** Curated disposable / throwaway hosts (extend via AppSetting `platform.disposableEmailDomains`). */
export const DEFAULT_DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.de",
  "sharklasers.com",
  "grr.la",
  "yopmail.com",
  "tempmail.com",
  "temp-mail.org",
  "10minutemail.com",
  "trashmail.com",
  "discard.email",
  "getnada.com",
  "maildrop.cc",
  "mailnesia.com",
  "fakeinbox.com",
  "throwaway.email",
  "tempail.com",
  "emailondeck.com",
  "moakt.com",
  "mintemail.com",
]);

export function splitEmail(raw: string): { local: string; domain: string } | null {
  const trimmed = String(raw || "").trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;
  return { local: trimmed.slice(0, at), domain: trimmed.slice(at + 1) };
}

/** Canonical form used to detect same-person aliases across accounts. */
export function normalizeEmail(raw: string): string | null {
  const parts = splitEmail(raw);
  if (!parts) return null;
  let { local, domain } = parts;
  if (domain === "googlemail.com") domain = "gmail.com";
  const plus = local.indexOf("+");
  if (plus >= 0) local = local.slice(0, plus);
  if (GMAIL_HOSTS.has(domain)) {
    local = local.replace(/\./g, "");
  }
  if (!local || !domain.includes(".")) return null;
  return `${local}@${domain}`;
}

export function isDisposableEmail(
  raw: string,
  extraDomains: Iterable<string> = []
): boolean {
  const parts = splitEmail(raw);
  if (!parts) return true;
  const domain = parts.domain === "googlemail.com" ? "gmail.com" : parts.domain;
  if (DEFAULT_DISPOSABLE_DOMAINS.has(domain)) return true;
  for (const item of extraDomains) {
    const host = String(item || "")
      .trim()
      .toLowerCase();
    if (host && host === domain) return true;
  }
  return false;
}

export function parseDisposableDomainList(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    }
  } catch {
    /* fall through to CSV */
  }
  return raw
    .split(/[\s,;]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

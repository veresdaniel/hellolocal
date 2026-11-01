/**
 * Who may edit translated copy.
 * Platform UI strings are superadmin only.
 * Site copy belongs to that site's owner (siteadmin).
 * Place copy belongs to that site's owner or the place owner/manager.
 * The site/place role is the membership on the target resource, never another site.
 */
export type CopyScope = "platform" | "site" | "place";

export type CopyActor = {
  role?: string | null;
  siteRole?: string | null;
  placeRole?: string | null;
};

export function canEditCopy(actor: CopyActor, scope: CopyScope): boolean {
  if (actor.role === "superadmin") return true;
  if (scope === "platform") return false;
  if (scope === "site") return actor.siteRole === "siteadmin";
  if (actor.siteRole === "siteadmin") return true;
  return actor.placeRole === "owner" || actor.placeRole === "manager";
}

const OWNER_BLOCKED_SITE_FIELDS = [
  "slug",
  "primaryDomain",
  "planLimits",
  "billingEmail",
  "allowPublicRegistration",
  "domains",
] as const;

const OWNER_ECHO_SITE_FIELDS = ["brandId", "isActive", "plan", "planStatus", "planValidUntil"] as const;

export const SITE_OWNER_STRIPPED_FIELDS = [
  ...OWNER_ECHO_SITE_FIELDS,
  ...OWNER_BLOCKED_SITE_FIELDS,
] as const;

function sameCalendarDay(current: unknown, next: unknown): boolean {
  const day = (value: unknown) => {
    if (value == null || value === "") return "";
    const date = new Date(value as string | number | Date);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toISOString().slice(0, 10);
  };
  return day(current) === day(next);
}

/** A non-superadmin may resend unchanged site settings, but may not change them. */
export function siteSettingBlockedForOwner(
  current: Record<string, unknown>,
  dto: Record<string, unknown>
): string | null {
  for (const key of OWNER_BLOCKED_SITE_FIELDS) {
    if (dto[key] !== undefined) return key;
  }
  for (const key of OWNER_ECHO_SITE_FIELDS) {
    if (dto[key] === undefined) continue;
    if (key === "planValidUntil") {
      if (!sameCalendarDay(current.planValidUntil, dto.planValidUntil)) return key;
      continue;
    }
    if ((dto[key] ?? null) !== (current[key] ?? null)) return key;
  }
  return null;
}

const PLACE_COPY_FIELDS = [
  "name",
  "shortDescription",
  "description",
  "address",
  "phone",
  "email",
  "website",
  "accessibility",
  "seoTitle",
  "seoDescription",
  "seoImage",
] as const;

function text(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

export function placeCopyChanged(
  current: Array<{ lang: string; seoKeywords?: string[] | null } & Record<string, unknown>>,
  next: Array<{ lang: string; seoKeywords?: string[] | null } & Record<string, unknown>>
): boolean {
  const byLang = new Map(current.map((row) => [row.lang, row]));
  for (const row of next) {
    const prev = byLang.get(row.lang);
    if (!prev) return true;
    for (const field of PLACE_COPY_FIELDS) {
      if (row[field] !== undefined && text(row[field]) !== text(prev[field])) return true;
    }
    if (row.seoKeywords !== undefined) {
      const left = row.seoKeywords ?? [];
      const right = prev.seoKeywords ?? [];
      if (left.length !== right.length || left.some((keyword, index) => keyword !== right[index])) {
        return true;
      }
    }
  }
  return false;
}

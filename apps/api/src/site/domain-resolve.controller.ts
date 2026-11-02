import { Controller, Get, NotFoundException, Param } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { SlugEntityType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeDomainHost } from "../common/domain-host";
import { generateSlug } from "../slug/slug.helper";
import { devLog } from "../common/dev-log";

export type DomainResolveKind = "site" | "town" | "place" | "collection" | "event";

export type DomainResolveResponse = {
  kind: DomainResolveKind;
  /** Parent region (Site) public slug — always present when resolution succeeds. */
  slug: string;
  defaultLang: string;
  /** Hostname that matched (primary or subdomain / town-place custom host). */
  domain: string;
  /** True when the matched host is the region's primary domain (Site only). */
  isPrimary?: boolean;
  townId?: string;
  placeId?: string;
  /** Public entity slug for town/place so the frontend can open the entity path. */
  entitySlug?: string;
};

/**
 * Which geo entity a custom domain belongs to.
 * Site: SiteDomain rows (primary + subdomains) with Site.primaryDomain fallback.
 * Town/Place: single customDomain (primary host only for that entity).
 * The public path on that host omits the entity the hostname already is: /:lang, not /:lang/:slug.
 * Town/Place still return entitySlug so the app can open that entity at /:lang.
 * Event has no customDomain (N/A).
 */
@Controller("/api/domain")
@SkipThrottle({ default: true, strict: true })
export class DomainResolveController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":host")
  async resolve(@Param("host") host: string): Promise<DomainResolveResponse> {
    const domain = normalizeDomainHost(decodeURIComponent(host));
    if (!domain) {
      devLog.warn("[domain-resolve] invalid host", host);
      throw new NotFoundException();
    }
    devLog.debug("[domain-resolve] lookup", domain);

    const siteDomain = await this.prisma.siteDomain.findUnique({
      where: { domain },
      select: {
        isActive: true,
        isPrimary: true,
        defaultLang: true,
        site: { select: { id: true, slug: true, isActive: true, primaryDomain: true } },
      },
    });
    if (siteDomain?.isActive && siteDomain.site?.isActive) {
      devLog.debug("[domain-resolve] matched site", domain, siteDomain.site.slug);
      return {
        kind: "site",
        slug: siteDomain.site.slug,
        defaultLang: siteDomain.defaultLang,
        domain,
        isPrimary: siteDomain.isPrimary || siteDomain.site.primaryDomain === domain,
      };
    }

    // Legacy / partial sync: Site.primaryDomain without a SiteDomain row still resolves.
    const siteByPrimary = await this.prisma.site.findFirst({
      where: { primaryDomain: domain, isActive: true },
      select: { slug: true, languages: true },
    });
    if (siteByPrimary?.slug) {
      devLog.debug("[domain-resolve] matched site via primaryDomain", domain, siteByPrimary.slug);
      return {
        kind: "site",
        slug: siteByPrimary.slug,
        defaultLang: siteByPrimary.languages?.[0] || "hu",
        domain,
        isPrimary: true,
      };
    }

    const town = await this.prisma.town.findUnique({
      where: { customDomain: domain },
      select: {
        id: true,
        isActive: true,
        siteId: true,
        site: { select: { id: true, slug: true, isActive: true, languages: true } },
        translations: { select: { lang: true, name: true } },
        domainLang: true,
      },
    });
    if (town?.isActive && town.site?.isActive && town.site.slug && town.siteId) {
      const defaultLang = town.domainLang || town.site.languages?.[0] || "hu";
      const entitySlug = await this.resolveEntitySlug({
        siteId: town.siteId,
        entityType: SlugEntityType.town,
        entityId: town.id,
        lang: defaultLang,
        translations: town.translations,
      });
      if (!entitySlug) {
        devLog.warn("[domain-resolve] town missing entitySlug", domain, town.id);
        throw new NotFoundException();
      }
      devLog.debug("[domain-resolve] matched town", domain, town.site.slug, entitySlug);
      return {
        kind: "town",
        townId: town.id,
        slug: town.site.slug,
        entitySlug,
        defaultLang,
        domain,
        isPrimary: true,
      };
    }

    const place = await this.prisma.place.findUnique({
      where: { customDomain: domain },
      select: {
        id: true,
        isActive: true,
        siteId: true,
        site: { select: { slug: true, isActive: true, languages: true } },
        translations: { select: { lang: true, name: true } },
        domainLang: true,
      },
    });
    if (place?.isActive && place.site?.isActive) {
      const defaultLang = place.domainLang || place.site.languages?.[0] || "hu";
      const entitySlug = await this.resolveEntitySlug({
        siteId: place.siteId,
        entityType: SlugEntityType.place,
        entityId: place.id,
        lang: defaultLang,
        translations: place.translations,
      });
      if (!entitySlug) {
        devLog.warn("[domain-resolve] place missing entitySlug", domain, place.id);
        throw new NotFoundException();
      }
      devLog.debug("[domain-resolve] matched place", domain, place.site.slug, entitySlug);
      return {
        kind: "place",
        placeId: place.id,
        slug: place.site.slug,
        entitySlug,
        defaultLang,
        domain,
        isPrimary: true,
      };
    }

    const collection = await this.prisma.collection.findUnique({
      where: { domain },
      select: { slug: true, isActive: true, domainLang: true },
    });
    if (collection?.isActive && collection.slug) {
      devLog.debug("[domain-resolve] matched collection", domain, collection.slug);
      return {
        kind: "collection",
        slug: collection.slug,
        defaultLang: collection.domainLang || "hu",
        domain,
        isPrimary: true,
      };
    }

    const event = await this.prisma.event.findUnique({
      where: { customDomain: domain },
      select: {
        id: true,
        isActive: true,
        siteId: true,
        domainLang: true,
        site: { select: { slug: true, isActive: true } },
        translations: { select: { lang: true, title: true } },
      },
    });
    if (event?.isActive && event.site?.isActive && event.site.slug) {
      const defaultLang = event.domainLang || "hu";
      const entitySlug = await this.resolveEntitySlug({
        siteId: event.siteId,
        entityType: SlugEntityType.event,
        entityId: event.id,
        lang: defaultLang,
        translations: event.translations.map((row) => ({ lang: row.lang, name: row.title })),
      });
      if (!entitySlug) {
        devLog.warn("[domain-resolve] event missing entitySlug", domain, event.id);
        throw new NotFoundException();
      }
      return {
        kind: "event",
        slug: event.site.slug,
        entitySlug,
        defaultLang,
        domain,
        isPrimary: true,
      };
    }

    devLog.warn("[domain-resolve] no match", domain);
    throw new NotFoundException();
  }

  private async resolveEntitySlug(args: {
    siteId: string;
    entityType: typeof SlugEntityType.town | typeof SlugEntityType.place | typeof SlugEntityType.event;
    entityId: string;
    lang: string;
    translations: Array<{ lang: string; name: string }>;
  }): Promise<string | null> {
    const primary = await this.prisma.slug.findFirst({
      where: {
        siteId: args.siteId,
        entityType: args.entityType,
        entityId: args.entityId,
        isActive: true,
        isPrimary: true,
        lang: args.lang,
      },
      select: { slug: true },
    });
    if (primary?.slug) return primary.slug;

    const anySlug = await this.prisma.slug.findFirst({
      where: {
        siteId: args.siteId,
        entityType: args.entityType,
        entityId: args.entityId,
        isActive: true,
      },
      select: { slug: true },
      orderBy: { updatedAt: "desc" },
    });
    if (anySlug?.slug) return anySlug.slug;

    const tr =
      args.translations.find((row) => row.lang === args.lang) ||
      args.translations.find((row) => row.lang === "hu") ||
      args.translations[0];
    const fromName = tr?.name ? generateSlug(tr.name) : "";
    return fromName || null;
  }
}

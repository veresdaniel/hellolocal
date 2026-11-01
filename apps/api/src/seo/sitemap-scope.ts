import { Injectable } from "@nestjs/common";
import { SlugEntityType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeDomainHost } from "../common/domain-host";
import {
  isPlatformHostname,
  publicOriginForHost,
  requestHostname,
  requestProto,
} from "./public-path.util";

/**
 * Request-time SEO scope derived from Host / X-Forwarded-Host.
 * Custom domains come from admin DB (SiteDomain, Town/Place/Collection custom host) —
 * adding a domain in admin takes effect immediately without redeploy.
 */
export type SitemapScope =
  | { kind: "platform"; origin: string; host: string }
  | { kind: "site"; origin: string; host: string; siteId: string }
  | {
      kind: "town";
      origin: string;
      host: string;
      siteId: string;
      townId: string;
    }
  | {
      kind: "place";
      origin: string;
      host: string;
      siteId: string;
      placeId: string;
    }
  | {
      kind: "collection";
      origin: string;
      host: string;
      collectionId: string;
    }
  /** Hostname is not platform and not configured in admin. */
  | { kind: "unknown"; origin: string; host: string };

@Injectable()
export class SitemapScopeResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolveFromHeaders(headers: {
    host?: string;
    "x-forwarded-host"?: string | string[];
    "x-forwarded-proto"?: string | string[];
  }): Promise<SitemapScope> {
    const host = requestHostname(headers);
    const proto = requestProto(headers);
    return this.resolveHost(host, proto);
  }

  async resolveHost(rawHost: string, proto = "https"): Promise<SitemapScope> {
    const host = (rawHost || "").toLowerCase().split(":")[0].replace(/\.$/, "");
    const origin = publicOriginForHost(host, proto);

    if (!host || isPlatformHostname(host)) {
      return { kind: "platform", origin, host: host || "platform" };
    }

    // Registrable custom hosts only (same rules as Domains admin / domain-resolve).
    const domain = normalizeDomainHost(host) || host;

    const siteDomain = await this.prisma.siteDomain.findUnique({
      where: { domain },
      select: {
        isActive: true,
        siteId: true,
        site: { select: { isActive: true } },
      },
    });
    if (siteDomain?.isActive && siteDomain.site?.isActive) {
      return { kind: "site", origin, host: domain, siteId: siteDomain.siteId };
    }

    const siteByPrimary = await this.prisma.site.findFirst({
      where: { primaryDomain: domain, isActive: true },
      select: { id: true },
    });
    if (siteByPrimary) {
      return { kind: "site", origin, host: domain, siteId: siteByPrimary.id };
    }

    const town = await this.prisma.town.findUnique({
      where: { customDomain: domain },
      select: {
        id: true,
        isActive: true,
        siteId: true,
        site: { select: { isActive: true } },
      },
    });
    if (town?.isActive && town.siteId && town.site?.isActive) {
      return {
        kind: "town",
        origin,
        host: domain,
        siteId: town.siteId,
        townId: town.id,
      };
    }

    const place = await this.prisma.place.findUnique({
      where: { customDomain: domain },
      select: {
        id: true,
        isActive: true,
        siteId: true,
        site: { select: { isActive: true } },
      },
    });
    if (place?.isActive && place.site?.isActive) {
      return {
        kind: "place",
        origin,
        host: domain,
        siteId: place.siteId,
        placeId: place.id,
      };
    }

    const collection = await this.prisma.collection.findUnique({
      where: { domain },
      select: { id: true, isActive: true, isCrawlable: true },
    });
    if (collection?.isActive && collection.isCrawlable) {
      return {
        kind: "collection",
        origin,
        host: domain,
        collectionId: collection.id,
      };
    }

    return { kind: "unknown", origin, host: domain };
  }

  /**
   * Sites whose public URLs live on the platform host (no SiteDomain / primaryDomain).
   * Sites with admin-configured custom domains are excluded — they get their own host sitemap.
   */
  async platformTenantSiteIds(): Promise<string[]> {
    const sites = await this.prisma.site.findMany({
      where: {
        isActive: true,
        primaryDomain: null,
        siteDomains: { none: { isActive: true } },
      },
      select: { id: true },
    });
    return sites.map((s) => s.id);
  }

  async primaryEntitySlug(
    siteId: string,
    entityType: typeof SlugEntityType.town | typeof SlugEntityType.place,
    entityId: string,
    lang: string
  ): Promise<string | null> {
    const primary = await this.prisma.slug.findFirst({
      where: {
        siteId,
        entityType,
        entityId,
        lang,
        isActive: true,
        isPrimary: true,
      },
      select: { slug: true },
    });
    if (primary?.slug) return primary.slug;
    const any = await this.prisma.slug.findFirst({
      where: { siteId, entityType, entityId, isActive: true },
      select: { slug: true },
      orderBy: { updatedAt: "desc" },
    });
    return any?.slug ?? null;
  }
}

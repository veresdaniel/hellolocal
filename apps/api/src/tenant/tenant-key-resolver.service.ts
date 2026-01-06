import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Lang } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

type ResolveTenantArgs = {
  lang: string;
  tenantKey?: string; // Optional tenant key from URL (for multi-tenant support)
};

export type ResolvedTenant = {
  tenantId: string;
  tenantInternalSlug: string; // Tenant.slug (internal key, used in database)
  lang: Lang;
  canonicalTenantKey?: string; // Public tenant key for multi-tenant URLs (if applicable)
  redirected: boolean; // Whether the request was redirected to a canonical tenant key
};

@Injectable()
export class TenantKeyResolverService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeLang(lang: string): Lang {
    if (lang === "hu" || lang === "en" || lang === "de") return lang;
    throw new BadRequestException("Unsupported lang. Use hu|en|de.");
  }

  private defaultTenantInternalSlug(): string {
    return process.env.DEFAULT_TENANT_SLUG ?? "etyek-budai";
  }

  /**
   * Resolves the tenant ID from the request:
   * - If no tenantKey in path -> uses DEFAULT_TENANT_SLUG (single-tenant mode)
   * - If tenantKey provided -> looks up in TenantKey table (lang+slug), with redirect support
   * 
   * This service supports both single-tenant (implicit) and multi-tenant (explicit) modes.
   * In multi-tenant mode, the tenantKey is a public-facing slug that maps to an internal tenant.
   */
  async resolve(args: ResolveTenantArgs): Promise<ResolvedTenant> {
    const lang = this.normalizeLang(args.lang);

    // Single-tenant / implicit tenant: use default Tenant.slug (internal key)
    if (!args.tenantKey) {
      const t = await this.prisma.tenant.findUnique({
        where: { slug: this.defaultTenantInternalSlug() },
        select: { id: true, slug: true },
      });
      if (!t) throw new NotFoundException("Tenant not found (default)");
      return {
        tenantId: t.id,
        tenantInternalSlug: t.slug,
        lang,
        canonicalTenantKey: undefined,
        redirected: false,
      };
    }

    // Multi-tenant / explicit tenant: lookup TenantKey (public-facing slug)
    // The TenantKey table maps public slugs (per language) to internal tenant IDs
    const hit = await this.prisma.tenantKey.findUnique({
      where: { lang_slug: { lang, slug: args.tenantKey } },
      select: { id: true, tenantId: true, slug: true, isActive: true, redirectToId: true },
    });

    if (!hit || !hit.isActive) throw new NotFoundException("Tenant key not found");

    // Handle redirects: if this tenant key redirects to another (canonical) key
    // This allows URL aliases and URL migrations
    if (hit.redirectToId) {
      const target = await this.prisma.tenantKey.findUnique({
        where: { id: hit.redirectToId },
        select: { tenantId: true, slug: true, isActive: true },
      });

      if (target && target.isActive) {
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: target.tenantId },
          select: { id: true, slug: true },
        });
        if (!tenant) throw new NotFoundException("Tenant not found (redirect target)");

        return {
          tenantId: tenant.id,
          tenantInternalSlug: tenant.slug,
          lang,
          canonicalTenantKey: target.slug,
          redirected: true,
        };
      }
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: hit.tenantId },
      select: { id: true, slug: true },
    });
    if (!tenant) throw new NotFoundException("Tenant not found");

    return {
      tenantId: tenant.id,
      tenantInternalSlug: tenant.slug,
      lang,
      canonicalTenantKey: hit.slug,
      redirected: false,
    };
  }
}
import { Injectable, NotFoundException } from "@nestjs/common";
import { Lang, SlugEntityType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type ResolvedSlug = {
  tenantId: string;
  lang: Lang;
  entityType: SlugEntityType; // Type of entity this slug points to (place, town, page, etc.)
  entityId: string; // ID of the entity in its respective table
  canonicalSlug: string; // The canonical (primary) slug for this entity
  redirected: boolean; // Whether this slug redirected to a canonical slug
};

/**
 * Service for resolving public-facing URL slugs to their corresponding entities.
 * 
 * The Slug table stores public slugs that map to various entities (places, towns, pages, etc.)
 * This service handles slug resolution with support for redirects to canonical slugs.
 */
@Injectable()
export class SlugResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves a slug to its corresponding entity.
   * 
   * @param args - Resolution arguments
   * @param args.tenantId - The tenant ID to scope the slug lookup
   * @param args.lang - Language for the slug
   * @param args.slug - The public-facing slug to resolve
   * @returns Resolved slug information including entity type and ID
   * @throws NotFoundException if the slug doesn't exist or is inactive
   */
  async resolve(args: { tenantId: string; lang: Lang; slug: string }): Promise<ResolvedSlug> {
    // Look up the slug in the Slug table
    // The unique constraint is on (tenantId, lang, slug)
    const hit = await this.prisma.slug.findUnique({
      where: { tenantId_lang_slug: { tenantId: args.tenantId, lang: args.lang, slug: args.slug } },
      select: {
        id: true,
        tenantId: true,
        lang: true,
        slug: true,
        entityType: true, // What type of entity this slug points to
        entityId: true, // The ID of the entity
        isActive: true,
        redirectToId: true, // If this slug redirects to another (canonical) slug
      },
    });

    if (!hit || !hit.isActive) throw new NotFoundException("Slug not found");

    // Handle redirects: if this slug redirects to a canonical slug
    // This allows URL aliases and URL migrations (e.g., old-slug -> new-slug)
    if (hit.redirectToId) {
      const target = await this.prisma.slug.findUnique({
        where: { id: hit.redirectToId },
        select: { tenantId: true, lang: true, slug: true, entityType: true, entityId: true, isActive: true },
      });

      if (target && target.isActive) {
        // Return the canonical slug information
        return {
          tenantId: target.tenantId,
          lang: target.lang,
          entityType: target.entityType,
          entityId: target.entityId,
          canonicalSlug: target.slug, // The canonical slug, not the original
          redirected: true,
        };
      }
    }

    // No redirect: return the slug as-is
    return {
      tenantId: hit.tenantId,
      lang: hit.lang,
      entityType: hit.entityType,
      entityId: hit.entityId,
      canonicalSlug: hit.slug,
      redirected: false,
    };
  }
}
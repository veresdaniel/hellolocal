import { Injectable, NotFoundException } from "@nestjs/common";
import { Lang, SlugEntityType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export type ResolvedSlug = {
  siteId: string;
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
   * Consistent redirect rules:
   * 1. If redirectToId exists and target is active → redirected=true, canonicalSlug = redirectTo.slug
   * 2. If not primary and no redirectToId → find primary slug, redirected=true, canonicalSlug = primary.slug
   * 3. If primary and no redirectToId → redirected=false, canonicalSlug = self.slug
   * 
   * @param args - Resolution arguments
   * @param args.siteId - The site ID to scope the slug lookup
   * @param args.lang - Language for the slug
   * @param args.slug - The public-facing slug to resolve
   * @returns Resolved slug information including entity type and ID
   * @throws NotFoundException if the slug doesn't exist or is inactive
   */
  async resolve(args: { siteId: string; lang: Lang; slug: string }): Promise<ResolvedSlug> {
    // Look up the slug in the Slug table
    // The unique constraint is on (siteId, lang, slug)
    const hit = await this.prisma.slug.findUnique({
      where: { siteId_lang_slug: { siteId: args.siteId, lang: args.lang, slug: args.slug } },
      select: {
        id: true,
        siteId: true,
        lang: true,
        slug: true,
        entityType: true, // What type of entity this slug points to
        entityId: true, // The ID of the entity
        isActive: true,
        isPrimary: true, // Whether this is the primary (canonical) slug
        redirectToId: true, // If this slug redirects to another (canonical) slug
        redirectTo: {
          select: {
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (!hit || !hit.isActive) throw new NotFoundException("Slug not found");

    // Rule 1: Handle explicit redirects (redirectToId)
    // This allows URL aliases and URL migrations (e.g., old-slug -> new-slug)
    if (hit.redirectToId && hit.redirectTo?.isActive) {
      const target = await this.prisma.slug.findUnique({
        where: { id: hit.redirectToId },
        select: { siteId: true, lang: true, slug: true, entityType: true, entityId: true, isActive: true },
      });

      if (target && target.isActive) {
        // Return the canonical slug information
        return {
          siteId: target.siteId,
          lang: target.lang,
          entityType: target.entityType,
          entityId: target.entityId,
          canonicalSlug: target.slug, // The canonical slug, not the original
          redirected: true,
        };
      }
    }

    // Rule 2: If slug is not primary, find the primary slug for this entity
    if (!hit.isPrimary) {
      const primarySlug = await this.prisma.slug.findFirst({
        where: {
          siteId: hit.siteId,
          lang: hit.lang,
          entityType: hit.entityType,
          entityId: hit.entityId,
          isPrimary: true,
          isActive: true,
        },
        select: { slug: true },
      });

      if (primarySlug) {
        return {
          siteId: hit.siteId,
          lang: hit.lang,
          entityType: hit.entityType,
          entityId: hit.entityId,
          canonicalSlug: primarySlug.slug,
          redirected: true,
        };
      }
      // Fallback: if no primary found, use current slug (shouldn't happen in normal operation)
      return {
        siteId: hit.siteId,
        lang: hit.lang,
        entityType: hit.entityType,
        entityId: hit.entityId,
        canonicalSlug: hit.slug,
        redirected: false,
      };
    }

    // Rule 3: Slug is primary and has no redirect - this is canonical
    return {
      siteId: hit.siteId,
      lang: hit.lang,
      entityType: hit.entityType,
      entityId: hit.entityId,
      canonicalSlug: hit.slug,
      redirected: false,
    };
  }
}
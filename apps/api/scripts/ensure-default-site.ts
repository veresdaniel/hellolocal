#!/usr/bin/env tsx
/**
 * Ensure default site exists and is active
 * Creates "etyek-budai" site if it doesn't exist, or activates it if it's inactive
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Lang } from "../src/common/language-code";
import { PrismaPg } from "@prisma/adapter-pg";

const DEFAULT_SITE_SLUG = process.env.DEFAULT_SITE_SLUG || "etyek-budai";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    console.log(`🔍 Checking for default site: ${DEFAULT_SITE_SLUG}...`);
    
    // Check if default site exists
    let defaultSite = await prisma.site.findUnique({
      where: { slug: DEFAULT_SITE_SLUG },
      include: {
        brand: true,
        translations: true,
        siteKeys: true,
      },
    });

    if (!defaultSite) {
      console.log(`⚠️  Default site "${DEFAULT_SITE_SLUG}" not found`);
      
      // Check if there are any active sites
      const activeSites = await prisma.site.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      });

      if (activeSites.length > 0) {
        console.log(`ℹ️  Found active site: ${activeSites[0].slug}`);
        console.log(`ℹ️  You can either:`);
        console.log(`   1. Create the "${DEFAULT_SITE_SLUG}" site manually via admin panel`);
        console.log(`   2. Set DEFAULT_SITE_SLUG=${activeSites[0].slug} environment variable`);
        return;
      }

      // No active sites found - need to create one
      console.log(`❌ No active sites found. Please create at least one site via admin panel.`);
      return;
    }

    // Site exists - check if it's active
    if (!defaultSite.isActive) {
      console.log(`🔧 Activating default site: ${DEFAULT_SITE_SLUG}...`);
      await prisma.site.update({
        where: { id: defaultSite.id },
        data: { isActive: true },
      });
      console.log(`✅ Default site activated`);
    } else {
      console.log(`✅ Default site is active`);
    }

    // Check if SiteKey entries exist for all languages
    const languages: Lang[] = ["hu", "en", "de"];
    let createdKeys = 0;
    
    for (const lang of languages) {
      const existingKey = defaultSite.siteKeys.find(
        (key) => key.lang === lang && key.slug === DEFAULT_SITE_SLUG
      );

      if (!existingKey) {
        console.log(`🔧 Creating SiteKey for ${lang}...`);
        await prisma.siteKey.create({
          data: {
            siteId: defaultSite.id,
            lang,
            slug: DEFAULT_SITE_SLUG,
            isActive: true,
            isPrimary: true,
          },
        });
        createdKeys++;
      } else if (!existingKey.isActive || !existingKey.isPrimary) {
        console.log(`🔧 Activating SiteKey for ${lang}...`);
        await prisma.siteKey.update({
          where: { id: existingKey.id },
          data: { isActive: true, isPrimary: true },
        });
      }
    }

    if (createdKeys > 0) {
      console.log(`✅ Created ${createdKeys} SiteKey entries`);
    }

    console.log(`✅ Default site "${DEFAULT_SITE_SLUG}" is ready`);
  } catch (error: any) {
    console.error("❌ Error ensuring default site:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Script failed");
  console.error(e);
  process.exit(1);
});

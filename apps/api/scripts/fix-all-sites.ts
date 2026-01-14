#!/usr/bin/env tsx
/**
 * Comprehensive script to fix all sites in the database
 * - Activates all sites
 * - Ensures all sites have SiteKey entries for all languages
 * - Logs detailed information about each site
 */

import "dotenv/config";
import { PrismaClient, Lang } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const LANGUAGES: Lang[] = ["hu", "en", "de"];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    console.log("🔍 Finding all sites...");
    
    const sites = await prisma.site.findMany({
      include: {
        translations: true,
        siteKeys: true,
        brand: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${sites.length} sites\n`);

    if (sites.length === 0) {
      console.log("⚠️  No sites found in database.");
      return;
    }

    let activatedCount = 0;
    let siteKeyCreatedCount = 0;
    let siteKeyActivatedCount = 0;

    for (const site of sites) {
      console.log(`\n📋 Processing site: ${site.slug}`);
      console.log(`   ID: ${site.id}`);
      console.log(`   isActive: ${site.isActive}`);
      console.log(`   Brand: ${site.brand.name}`);
      console.log(`   Translations: ${site.translations.length} (${site.translations.map(t => t.lang).join(", ")})`);
      console.log(`   SiteKeys: ${site.siteKeys.length}`);

      // Step 1: Activate site if inactive
      if (!site.isActive) {
        await prisma.site.update({
          where: { id: site.id },
          data: { isActive: true },
        });
        activatedCount++;
        console.log(`   ✅ Activated site`);
      }

      // Step 2: Ensure SiteKeys for all languages
      for (const lang of LANGUAGES) {
        const existing = site.siteKeys.find(
          (key) => key.lang === lang && key.slug === site.slug
        );

        if (existing) {
          // Update if not active or not primary
          if (!existing.isActive || !existing.isPrimary) {
            await prisma.siteKey.update({
              where: { id: existing.id },
              data: { isActive: true, isPrimary: true },
            });
            siteKeyActivatedCount++;
            console.log(`   ✅ Activated SiteKey: ${lang}`);
          } else {
            console.log(`   ✓ SiteKey already active: ${lang}`);
          }
        } else {
          // Create new SiteKey
          await prisma.siteKey.create({
            data: {
              siteId: site.id,
              lang,
              slug: site.slug,
              isActive: true,
              isPrimary: true,
            },
          });
          siteKeyCreatedCount++;
          console.log(`   ✅ Created SiteKey: ${lang}`);
        }
      }
    }

    console.log(`\n\n✅ Summary:`);
    console.log(`  - Sites processed: ${sites.length}`);
    console.log(`  - Sites activated: ${activatedCount}`);
    console.log(`  - SiteKeys created: ${siteKeyCreatedCount}`);
    console.log(`  - SiteKeys activated: ${siteKeyActivatedCount}`);
    console.log(`\n✅ All sites are now active and have SiteKey entries for all languages!`);

  } catch (error: any) {
    console.error("❌ Error fixing sites:", error);
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

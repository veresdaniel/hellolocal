#!/usr/bin/env tsx
/**
 * Comprehensive script to fix all sites:
 * 1. Activates all sites
 * 2. Ensures all sites have SiteKey entries for all languages
 * 3. Ensures all sites have SiteInstance entries for all languages that have translations
 * This script is designed to be run after deployment or when sites are missing SiteKeys/SiteInstances
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
        translations: {
          select: { lang: true },
        },
        siteKeys: {
          select: { id: true, lang: true, slug: true, isActive: true, isPrimary: true },
        },
        siteInstances: {
          select: { id: true, lang: true, isDefault: true },
        },
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
    let siteInstanceCreatedCount = 0;

    for (const site of sites) {
      console.log(`\n📋 Processing site: ${site.slug} (${site.id})`);
      console.log(`   isActive: ${site.isActive}`);
      console.log(`   Brand: ${site.brand.name}`);
      console.log(`   Translations: ${site.translations.length} (${site.translations.map(t => t.lang).join(", ")})`);
      console.log(`   SiteKeys: ${site.siteKeys.length} (${site.siteKeys.map(k => k.lang).join(", ")})`);
      console.log(`   SiteInstances: ${site.siteInstances.length} (${site.siteInstances.map(si => si.lang).join(", ")})`);

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
        const existingKey = site.siteKeys.find(
          (key) => key.lang === lang && key.slug === site.slug
        );

        if (existingKey) {
          // Update if not active or not primary
          if (!existingKey.isActive || !existingKey.isPrimary) {
            await prisma.siteKey.update({
              where: { id: existingKey.id },
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

      // Step 3: Ensure SiteInstances for all languages that have translations
      const existingInstanceLangs = new Set(site.siteInstances.map(si => si.lang));
      const translationLangs = site.translations.map(t => t.lang);
      const missingInstanceLangs = translationLangs.filter(lang => !existingInstanceLangs.has(lang));

      if (missingInstanceLangs.length > 0) {
        console.log(`   ⚠️  Missing SiteInstances for languages: ${missingInstanceLangs.join(", ")}`);
        
        // Determine which should be default (first one, or if none exist, the first missing one)
        const hasAnyInstance = site.siteInstances.length > 0;
        let isFirst = !hasAnyInstance;

        for (const lang of missingInstanceLangs) {
          try {
            await prisma.siteInstance.create({
              data: {
                siteId: site.id,
                lang,
                isDefault: isFirst,
                features: {
                  isCrawlable: true, // Default: allow crawling
                  enableEvents: true, // Default: enable events
                  enableBlog: false, // Default: disable blog
                  enableStaticPages: true, // Default: enable static pages
                },
              },
            });
            siteInstanceCreatedCount++;
            console.log(`   ✅ Created SiteInstance: ${lang} (isDefault: ${isFirst})`);
            isFirst = false;
          } catch (error: any) {
            console.error(`   ❌ Failed to create SiteInstance for lang ${lang}:`, error.message);
          }
        }
      } else {
        console.log(`   ✓ All translations have SiteInstances`);
      }
    }

    console.log(`\n\n✅ Summary:`);
    console.log(`  - Sites processed: ${sites.length}`);
    console.log(`  - Sites activated: ${activatedCount}`);
    console.log(`  - SiteKeys created: ${siteKeyCreatedCount}`);
    console.log(`  - SiteKeys activated: ${siteKeyActivatedCount}`);
    console.log(`  - SiteInstances created: ${siteInstanceCreatedCount}`);
    console.log(`\n✅ All sites are now active and have SiteKey + SiteInstance entries!`);

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

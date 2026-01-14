#!/usr/bin/env tsx
/**
 * Ensure all sites have SiteInstance entries for all languages that have translations
 * This script creates missing SiteInstance entries
 */

import "dotenv/config";
import { PrismaClient, Lang } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    console.log("🔍 Finding all sites with translations...");
    
    const sites = await prisma.site.findMany({
      include: {
        translations: {
          select: { lang: true },
        },
        siteInstances: {
          select: { lang: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    console.log(`Found ${sites.length} sites\n`);

    if (sites.length === 0) {
      console.log("⚠️  No sites found in database.");
      return;
    }

    let createdCount = 0;
    let skippedCount = 0;

    for (const site of sites) {
      console.log(`\n📋 Processing site: ${site.slug} (${site.id})`);
      console.log(`   Translations: ${site.translations.length} (${site.translations.map(t => t.lang).join(", ")})`);
      console.log(`   SiteInstances: ${site.siteInstances.length} (${site.siteInstances.map(si => si.lang).join(", ")})`);

      // Find missing SiteInstances
      const existingLangs = new Set(site.siteInstances.map(si => si.lang));
      const translationLangs = site.translations.map(t => t.lang);
      const missingLangs = translationLangs.filter(lang => !existingLangs.has(lang));

      if (missingLangs.length === 0) {
        console.log(`   ✅ All translations have SiteInstances`);
        skippedCount++;
        continue;
      }

      console.log(`   ⚠️  Missing SiteInstances for languages: ${missingLangs.join(", ")}`);

      // Determine which should be default (first one, or if none exist, the first missing one)
      const hasAnyInstance = site.siteInstances.length > 0;
      let isFirst = !hasAnyInstance;

      for (const lang of missingLangs) {
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
          createdCount++;
          console.log(`   ✅ Created SiteInstance: ${lang} (isDefault: ${isFirst})`);
          isFirst = false;
        } catch (error: any) {
          console.error(`   ❌ Failed to create SiteInstance for lang ${lang}:`, error.message);
        }
      }
    }

    console.log(`\n\n✅ Summary:`);
    console.log(`  - Sites processed: ${sites.length}`);
    console.log(`  - SiteInstances created: ${createdCount}`);
    console.log(`  - Sites already complete: ${skippedCount}`);
    console.log(`\n✅ All sites now have SiteInstance entries for their translations!`);

  } catch (error: any) {
    console.error("❌ Error ensuring SiteInstances:", error);
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

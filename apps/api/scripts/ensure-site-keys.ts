#!/usr/bin/env tsx
/**
 * Ensure all sites have active SiteKey entries for all languages
 * This script creates missing SiteKey entries and activates existing ones
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
      where: { isActive: true },
      select: { id: true, slug: true },
    });

    console.log(`Found ${sites.length} active sites`);

    if (sites.length === 0) {
      console.log("⚠️  No active sites found. Make sure to activate sites first.");
      return;
    }

    let createdCount = 0;
    let activatedCount = 0;

    for (const site of sites) {
      console.log(`\n📝 Processing site: ${site.slug} (${site.id})`);
      
      for (const lang of LANGUAGES) {
        // Check if SiteKey exists
        const existing = await prisma.siteKey.findFirst({
          where: {
            siteId: site.id,
            lang,
            slug: site.slug,
          },
          select: { id: true, isActive: true, isPrimary: true },
        });

        if (existing) {
          // Update if not active or not primary
          if (!existing.isActive || !existing.isPrimary) {
            await prisma.siteKey.update({
              where: { id: existing.id },
              data: { isActive: true, isPrimary: true },
            });
            activatedCount++;
            console.log(`  ✓ Activated SiteKey: ${site.slug} (${lang})`);
          } else {
            console.log(`  ✓ SiteKey already active: ${site.slug} (${lang})`);
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
          createdCount++;
          console.log(`  ✓ Created SiteKey: ${site.slug} (${lang})`);
        }
      }
    }

    console.log(`\n✅ Summary:`);
    console.log(`  - Created: ${createdCount} SiteKey entries`);
    console.log(`  - Activated: ${activatedCount} SiteKey entries`);
    console.log(`  - Total sites processed: ${sites.length}`);
  } catch (error: any) {
    console.error("❌ Error ensuring SiteKeys:", error);
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

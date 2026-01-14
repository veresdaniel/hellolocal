/**
 * Script to fix duplicate slug records for events (and places)
 * 
 * This script:
 * 1. Finds all events/places with multiple isPrimary=true slugs in the same language
 * 2. Keeps the most recent one as primary, sets others to isPrimary=false
 * 3. Reports any issues found
 */

import { PrismaClient, SlugEntityType } from "@prisma/client";

const prisma = new PrismaClient();

async function fixDuplicateSlugs() {
  console.log("🔍 Checking for duplicate slugs...\n");

  // Find all slugs grouped by entityType, entityId, siteId, lang
  const allSlugs = await prisma.slug.findMany({
    where: {
      isPrimary: true,
      isActive: true,
    },
    orderBy: [
      { entityType: "asc" },
      { entityId: "asc" },
      { siteId: "asc" },
      { lang: "asc" },
      { createdAt: "desc" },
    ],
  });

  // Group by entityType, entityId, siteId, lang
  const grouped = new Map<string, typeof allSlugs>();
  
  for (const slug of allSlugs) {
    const key = `${slug.entityType}:${slug.entityId}:${slug.siteId}:${slug.lang}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(slug);
  }

  // Find duplicates (groups with more than 1 slug)
  const duplicates: Array<{
    entityType: SlugEntityType;
    entityId: string;
    siteId: string;
    lang: string;
    slugs: typeof allSlugs;
  }> = [];

  for (const [key, slugs] of grouped.entries()) {
    if (slugs.length > 1) {
      const [entityType, entityId, siteId, lang] = key.split(":");
      duplicates.push({
        entityType: entityType as SlugEntityType,
        entityId,
        siteId,
        lang,
        slugs,
      });
    }
  }

  if (duplicates.length === 0) {
    console.log("✅ No duplicate primary slugs found!");
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} entities with duplicate primary slugs:\n`);

  let fixed = 0;
  let errors = 0;

  for (const dup of duplicates) {
    // Sort by createdAt desc to get the most recent first
    const sorted = [...dup.slugs].sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
    
    const keepSlug = sorted[0]; // Most recent
    const removeSlugs = sorted.slice(1); // Older ones

    console.log(
      `  ${dup.entityType} ${dup.entityId} (${dup.lang}): ${dup.slugs.length} primary slugs`
    );
    console.log(`    Keeping: ${keepSlug.slug} (created: ${keepSlug.createdAt.toISOString()})`);
    
    for (const removeSlug of removeSlugs) {
      console.log(`    Setting to non-primary: ${removeSlug.slug} (created: ${removeSlug.createdAt.toISOString()})`);
      
      try {
        await prisma.slug.update({
          where: { id: removeSlug.id },
          data: {
            isPrimary: false,
            // Keep isActive: true so redirects still work if needed
          },
        });
        fixed++;
      } catch (error) {
        console.error(`    ❌ Error updating slug ${removeSlug.id}:`, error);
        errors++;
      }
    }
    console.log();
  }

  console.log(`\n✅ Fixed ${fixed} duplicate slugs`);
  if (errors > 0) {
    console.log(`❌ ${errors} errors occurred`);
  }
}

async function main() {
  try {
    await fixDuplicateSlugs();
  } catch (error) {
    console.error("❌ Error fixing duplicate slugs:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

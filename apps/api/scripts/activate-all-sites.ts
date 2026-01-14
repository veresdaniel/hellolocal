#!/usr/bin/env tsx
/**
 * Activate all sites in the database
 * Useful for production deployments where sites need to be enabled
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
      select: { id: true, slug: true, isActive: true },
    });

    console.log(`Found ${sites.length} sites`);

    if (sites.length === 0) {
      console.log("⚠️  No sites found. Make sure to run the seed script first.");
      return;
    }

    const inactiveSites = sites.filter(s => !s.isActive);
    
    if (inactiveSites.length === 0) {
      console.log("✅ All sites are already active");
      return;
    }

    console.log(`🔧 Activating ${inactiveSites.length} inactive site(s)...`);

    for (const site of inactiveSites) {
      await prisma.site.update({
        where: { id: site.id },
        data: { isActive: true },
      });
      console.log(`  ✓ Activated site: ${site.slug} (${site.id})`);
    }

    console.log("✅ All sites have been activated");
  } catch (error: any) {
    console.error("❌ Error activating sites:", error);
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

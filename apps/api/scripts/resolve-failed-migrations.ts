#!/usr/bin/env tsx
/**
 * Script to resolve failed migrations in production database
 * This script marks failed migrations as rolled back and allows new migrations to proceed
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  console.log("🔍 Checking for failed migrations...");

  // Find failed migrations (started_at is set but finished_at is null)
  const failedMigrations = await prisma.$queryRaw<Array<{
    id: string;
    migration_name: string;
    started_at: Date;
    finished_at: Date | null;
    rolled_back_at: Date | null;
  }>>`
    SELECT 
      id,
      migration_name,
      started_at,
      finished_at,
      rolled_back_at
    FROM "_prisma_migrations"
    WHERE finished_at IS NULL
    ORDER BY started_at DESC
  `;

  if (failedMigrations.length === 0) {
    console.log("✅ No failed migrations found");
    return;
  }

  console.log(`⚠️  Found ${failedMigrations.length} failed migration(s):`);
  failedMigrations.forEach((m) => {
    console.log(`   - ${m.migration_name} (started: ${m.started_at})`);
  });

  // Mark failed migrations as rolled back
  for (const migration of failedMigrations) {
    console.log(`🔄 Marking ${migration.migration_name} as rolled back...`);
    
    await prisma.$executeRaw`
      UPDATE "_prisma_migrations"
      SET 
        rolled_back_at = CURRENT_TIMESTAMP,
        finished_at = CURRENT_TIMESTAMP
      WHERE id = ${migration.id}
    `;

    console.log(`✅ ${migration.migration_name} marked as rolled back`);
  }

  console.log("✅ All failed migrations resolved");
  console.log("📦 You can now run 'prisma migrate deploy' to apply new migrations");
}

main()
  .catch((e) => {
    console.error("❌ Failed to resolve migrations");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


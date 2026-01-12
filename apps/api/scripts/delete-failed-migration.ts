#!/usr/bin/env tsx
/**
 * Delete a failed migration record so it can be retried
 * Usage: tsx scripts/delete-failed-migration.ts <migration_name>
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set");
    process.exit(1);
  }

  const migrationName = process.argv[2];

  if (!migrationName) {
    console.log("❌ Usage: tsx scripts/delete-failed-migration.ts <migration_name>");
    console.log("   Example: tsx scripts/delete-failed-migration.ts 20260112020000_fix_tenant_role_enum");
    process.exit(1);
  }

  console.log(`🔍 Deleting failed migration record: ${migrationName}...`);

  try {
    // Check if migration exists and is failed
    const failedMigrations = await prisma.$queryRaw<Array<{
      id: string;
      migration_name: string;
      started_at: Date;
      finished_at: Date | null;
    }>>`
      SELECT 
        id,
        migration_name,
        started_at,
        finished_at
      FROM "_prisma_migrations"
      WHERE "migration_name" = ${migrationName}
      AND finished_at IS NULL
    `;

    if (failedMigrations.length === 0) {
      console.log(`ℹ️  No failed migration record found for: ${migrationName}`);
      console.log(`   It may have already been resolved or doesn't exist.`);
      
      // Check if it exists as successful
      const successful = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "_prisma_migrations"
        WHERE "migration_name" = ${migrationName}
        AND finished_at IS NOT NULL
      `;
      
      if (successful.length > 0) {
        console.log(`✅ Migration is already marked as successful`);
      }
      return;
    }

    console.log(`⚠️  Found ${failedMigrations.length} failed record(s) for: ${migrationName}`);
    
    // Delete all failed records
    await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations"
      WHERE "migration_name" = ${migrationName}
      AND finished_at IS NULL
    `;

    console.log(`✅ Deleted failed migration record(s)`);
    console.log(`📦 You can now run 'npx prisma migrate deploy' to retry the migration`);
  } catch (error) {
    console.error(`❌ Error deleting failed migration: ${error}`);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Failed to delete failed migration");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

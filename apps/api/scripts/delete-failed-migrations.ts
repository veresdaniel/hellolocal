#!/usr/bin/env tsx
/**
 * Delete all failed migration records from the database
 * This allows new migrations to proceed
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
    return;
  }

  console.log("🗑️  Deleting all failed migration records...");

  try {
    // Delete all failed migrations (where finished_at IS NULL)
    const result = await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations"
      WHERE finished_at IS NULL
    `;

    console.log(`✅ Deleted failed migration records`);
    
    // Now check if the problematic migration actually succeeded
    const enumExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'event' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SlugEntityType')
      );
    `;
    
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'StaticPage'
      );
    `;

    // If the migration actually succeeded, mark it as finished
    if (enumExists[0]?.exists && tableExists[0]?.exists) {
      console.log("✅ Migration 20260107155301_add_static_pages actually succeeded, marking as finished...");
      
      const { readFileSync, existsSync } = await import("fs");
      const { join, resolve } = await import("path");
      const { createHash, randomUUID } = await import("crypto");
      
      let apiDir = process.cwd();
      if (!existsSync(resolve(apiDir, "prisma"))) {
        const parentDir = resolve(apiDir, "..");
        if (existsSync(resolve(parentDir, "prisma"))) {
          apiDir = parentDir;
        }
      }
      
      const migrationName = "20260107155301_add_static_pages";
      const migrationPath = join(apiDir, "prisma/migrations", migrationName, "migration.sql");
      
      if (existsSync(migrationPath)) {
        const migrationSql = readFileSync(migrationPath, "utf-8");
        const checksum = createHash("sha256").update(migrationSql).digest("hex");
        const migrationId = randomUUID();
        
        // Check if it already exists as successful
        const existing = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "_prisma_migrations" 
          WHERE "migration_name" = ${migrationName}
          AND finished_at IS NOT NULL
        `;

        if (existing.length === 0) {
          await prisma.$executeRaw`
            INSERT INTO "_prisma_migrations" (
              "id",
              "checksum",
              "finished_at",
              "migration_name",
              "started_at",
              "applied_steps_count"
            ) VALUES (
              ${migrationId},
              ${checksum},
              CURRENT_TIMESTAMP,
              ${migrationName},
              CURRENT_TIMESTAMP,
              1
            )
          `;
          console.log(`✅ Migration ${migrationName} marked as finished`);
        } else {
          console.log(`✅ Migration ${migrationName} already marked as finished`);
        }
      }
    }
    
    console.log("✅ All failed migrations deleted/resolved");
  } catch (error) {
    console.error(`❌ Error deleting failed migrations: ${error}`);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Failed to delete failed migrations");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


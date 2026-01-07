#!/usr/bin/env tsx
/**
 * Force resolve a specific failed migration by checking if it actually succeeded
 * and marking it as finished if so, or deleting it if it needs to be retried
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

  const migrationName = "20260107155301_add_static_pages";

  console.log(`🔍 Force resolving migration: ${migrationName}...`);

  try {
    // Check if the migration actually succeeded
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

    if (enumExists[0]?.exists && tableExists[0]?.exists) {
      console.log(`✅ Migration actually succeeded, fixing migration record...`);
      
      // Delete all failed records for this migration
      await prisma.$executeRaw`
        DELETE FROM "_prisma_migrations"
        WHERE "migration_name" = ${migrationName}
        AND finished_at IS NULL
      `;

      // Check if there's already a successful record
      const existing = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "_prisma_migrations" 
        WHERE "migration_name" = ${migrationName}
        AND finished_at IS NOT NULL
      `;

      if (existing.length === 0) {
        // Insert as successful
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
        
        const migrationPath = join(apiDir, "prisma/migrations", migrationName, "migration.sql");
        if (existsSync(migrationPath)) {
          const migrationSql = readFileSync(migrationPath, "utf-8");
          const checksum = createHash("sha256").update(migrationSql).digest("hex");
          const migrationId = randomUUID();
          
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
          
          console.log(`✅ Migration record recreated as successful`);
        }
      } else {
        console.log(`✅ Migration already marked as successful`);
      }
    } else {
      console.log(`⚠️  Migration did not succeed, deleting failed record...`);
      // Just delete the failed record, let it retry
      await prisma.$executeRaw`
        DELETE FROM "_prisma_migrations"
        WHERE "migration_name" = ${migrationName}
        AND finished_at IS NULL
      `;
      console.log(`✅ Failed record deleted, migration will retry`);
    }
  } catch (error) {
    console.error(`❌ Error resolving migration: ${error}`);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error("❌ Failed to force resolve migration");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


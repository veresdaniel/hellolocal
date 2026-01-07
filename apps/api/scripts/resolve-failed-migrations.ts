#!/usr/bin/env tsx
/**
 * Script to resolve failed migrations in production database
 * This script marks failed migrations as rolled back and allows new migrations to proceed
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";
import { createHash, randomUUID } from "crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (!process.env.DATABASE_URL) {
    console.log("⚠️  DATABASE_URL not set, skipping failed migration resolution");
    return;
  }

  console.log("🔍 Checking for failed migrations...");

  // Check if _prisma_migrations table exists
  try {
    const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `;

    if (!tableExists[0]?.exists) {
      console.log("ℹ️  Migration table does not exist yet, nothing to resolve");
      return;
    }
  } catch (error) {
    console.log("⚠️  Could not check migration table (this is okay)");
    return;
  }

  // Find failed migrations (started_at is set but finished_at is null)
  let failedMigrations: Array<{
    id: string;
    migration_name: string;
    started_at: Date;
    finished_at: Date | null;
    rolled_back_at: Date | null;
  }> = [];

  try {
    failedMigrations = await prisma.$queryRaw<Array<{
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
  } catch (error) {
    console.log("⚠️  Could not query failed migrations (this is okay)");
    return;
  }

  if (failedMigrations.length === 0) {
    console.log("✅ No failed migrations found");
    return;
  }

  console.log(`⚠️  Found ${failedMigrations.length} failed migration(s):`);
  failedMigrations.forEach((m) => {
    console.log(`   - ${m.migration_name} (started: ${m.started_at})`);
  });

  // Mark failed migrations - check if they actually succeeded (partially)
  for (const migration of failedMigrations) {
    console.log(`🔄 Checking ${migration.migration_name}...`);
    
    // For the specific migration that's failing, check if it actually succeeded
    // The error was: enum label "event" already exists
    // This means the enum value was already added, so the migration partially succeeded
    if (migration.migration_name === "20260107155301_add_static_pages") {
      // Check if the enum value already exists
      try {
        const enumExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
          SELECT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'event' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SlugEntityType')
          );
        `;
        
        // Check if StaticPage table exists
        const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'StaticPage'
          );
        `;
        
        // If both exist, the migration actually succeeded, just mark it as finished
        if (enumExists[0]?.exists && tableExists[0]?.exists) {
          console.log(`✅ ${migration.migration_name} actually succeeded (enum and table exist)`);
          console.log(`🔄 Deleting failed record and recreating as successful...`);
          
          // Delete the failed record
          await prisma.$executeRaw`
            DELETE FROM "_prisma_migrations"
            WHERE id = ${migration.id}
          `;
          
          // Re-insert as successful (we need to read the migration file to get checksum)
          let apiDir = process.cwd();
          if (!existsSync(resolve(apiDir, "prisma"))) {
            const parentDir = resolve(apiDir, "..");
            if (existsSync(resolve(parentDir, "prisma"))) {
              apiDir = parentDir;
            }
          }
          
          const migrationPath = join(apiDir, "prisma/migrations", migration.migration_name, "migration.sql");
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
                ${migration.migration_name},
                ${migration.started_at.toISOString()}::timestamp,
                1
              )
            `;
            
            console.log(`✅ ${migration.migration_name} recreated as successful`);
          } else {
            // If we can't read the file, just mark as finished
            await prisma.$executeRaw`
              UPDATE "_prisma_migrations"
              SET 
                finished_at = CURRENT_TIMESTAMP,
                applied_steps_count = 1
              WHERE id = ${migration.id}
            `;
            console.log(`✅ ${migration.migration_name} marked as finished`);
          }
          continue;
        }
      } catch (checkError) {
        console.log(`⚠️  Could not check migration state: ${checkError}`);
      }
    }
    
    // For other migrations or if check failed, mark as rolled back
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
    // Don't throw error, just log it - this script should not break the deployment
    console.log("⚠️  Could not resolve failed migrations (this is okay)");
    console.log(e.message || String(e));
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


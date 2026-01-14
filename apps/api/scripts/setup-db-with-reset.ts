#!/usr/bin/env tsx
/**
 * Database setup script with automatic reset on failure
 * If migrations fail after baseline, this will completely reset the database
 * WARNING: This will delete ALL data if reset is needed!
 */

import "dotenv/config";
import { execSync } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function deleteFailedMigrations() {
  if (!process.env.DATABASE_URL) {
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    console.log("🗑️  Deleting failed migration records...");
    
    // Delete all failed migrations
    await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations"
      WHERE finished_at IS NULL
    `;
    
    console.log("✅ Failed migrations deleted/resolved");
  } catch (error) {
    console.log(`⚠️  Could not delete failed migrations: ${error}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function resetDatabase() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    console.log("🗑️  Resetting database (dropping all tables and enums)...");
    
    // Get all table names (excluding system tables)
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
    `;

    if (tables.length > 0) {
      console.log(`🗑️  Dropping ${tables.length} tables...`);
      
      // Drop all tables with CASCADE to handle foreign keys
      for (const table of tables) {
        try {
          await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS "${table.tablename}" CASCADE;`);
          console.log(`  ✓ Dropped table: ${table.tablename}`);
        } catch (error: any) {
          console.warn(`  ⚠️  Failed to drop table ${table.tablename}: ${error.message}`);
        }
      }
    }

    // Drop all enums
    console.log("🗑️  Dropping enums...");
    const enums = await prisma.$queryRaw<Array<{ typname: string }>>`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    `;

    for (const enumType of enums) {
      try {
        await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "${enumType.typname}" CASCADE;`);
        console.log(`  ✓ Dropped enum: ${enumType.typname}`);
      } catch (error: any) {
        console.warn(`  ⚠️  Failed to drop enum ${enumType.typname}: ${error.message}`);
      }
    }

    // Clear Prisma migrations table
    console.log("🗑️  Clearing Prisma migrations table...");
    try {
      await prisma.$executeRaw`TRUNCATE TABLE "_prisma_migrations" RESTART IDENTITY CASCADE;`;
      console.log("  ✓ Cleared migrations table");
    } catch (error: any) {
      // Table might not exist yet, that's okay
      console.log("  ℹ️  Migrations table doesn't exist yet (will be created)");
    }

    console.log("✅ Database reset complete");
  } catch (error: any) {
    console.error("❌ Error resetting database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  // Determine the API directory
  let apiDir = process.cwd();
  
  if (!existsSync(resolve(apiDir, "prisma"))) {
    const parentDir = resolve(apiDir, "..");
    if (existsSync(resolve(parentDir, "prisma"))) {
      apiDir = parentDir;
    }
  }
  
  console.log("🔧 Setting up database (with auto-reset on failure)...");
  console.log(`📁 Working directory: ${apiDir}`);
  
  if (!existsSync(resolve(apiDir, "prisma"))) {
    throw new Error(`Prisma directory not found. Expected at: ${resolve(apiDir, "prisma")}`);
  }

  // Delete all failed migrations first
  await deleteFailedMigrations();

  // Try to run migrations
  console.log("📦 Running migrations...");
  let migrationsSucceeded = false;
  
  try {
    execSync("prisma migrate deploy", {
      stdio: "inherit",
      cwd: apiDir,
    });
    console.log("✅ Migrations applied successfully");
    migrationsSucceeded = true;
  } catch (migrationError: any) {
    const errorMessage = migrationError.message || String(migrationError);
    console.log(`⚠️  Migration deploy failed: ${errorMessage.substring(0, 200)}`);
    
    // If still has failed migrations, delete them again and retry once
    if (errorMessage.includes("failed migrations") || errorMessage.includes("P3009")) {
      console.log("🔄 Cleaning up failed migrations and retrying...");
      await deleteFailedMigrations();
      
      try {
        execSync("prisma migrate deploy", {
          stdio: "inherit",
          cwd: apiDir,
        });
        console.log("✅ Migrations applied successfully after cleanup");
        migrationsSucceeded = true;
      } catch (retryError: any) {
        console.log(`⚠️  Migration deploy still failed after cleanup`);
      }
    }
    
    // If migrations still haven't succeeded, reset database completely
    if (!migrationsSucceeded) {
      console.error("🔄 Database appears to be in inconsistent state");
      console.error("🔄 Resetting database completely and starting fresh...");
      
      // Reset the database completely
      await resetDatabase();
      
      // Now try migrations again on clean database
      console.log("📦 Running migrations on clean database...");
      try {
        execSync("prisma migrate deploy", {
          stdio: "inherit",
          cwd: apiDir,
        });
        console.log("✅ Migrations applied successfully after reset");
        migrationsSucceeded = true;
      } catch (resetRetryError: any) {
        console.error("❌ Migrations still failed after reset");
        console.error("This indicates a problem with the migration files themselves");
        throw resetRetryError;
      }
    }
  }

  if (!migrationsSucceeded) {
    throw new Error("Failed to apply migrations after all recovery attempts");
  }

  // Seed database
  console.log("🌱 Seeding database...");
  try {
    execSync("prisma db seed", {
      stdio: "inherit",
      cwd: apiDir,
    });
    console.log("✅ Seed completed");
  } catch (seedError: any) {
    console.warn("⚠️  Seed failed (this might be okay if no seed script exists)");
    console.warn(seedError.message);
  }

  // Activate all sites (ensure they're enabled for production)
  console.log("🔧 Activating all sites...");
  try {
    execSync("tsx scripts/activate-all-sites.ts", {
      stdio: "inherit",
      cwd: apiDir,
    });
    console.log("✅ Sites activated");
  } catch (activateError: any) {
    console.warn("⚠️  Site activation failed (this might be okay if no sites exist)");
    console.warn(activateError.message);
  }

  // Ensure all sites have SiteKey entries for all languages
  console.log("🔧 Ensuring SiteKey entries for all sites...");
  try {
    execSync("tsx scripts/ensure-site-keys.ts", {
      stdio: "inherit",
      cwd: apiDir,
    });
    console.log("✅ SiteKeys ensured");
  } catch (siteKeyError: any) {
    console.warn("⚠️  SiteKey creation failed (this might be okay if no sites exist)");
    console.warn(siteKeyError.message);
  }

  console.log("✅ Database setup completed");
}

main().catch((e) => {
  console.error("❌ Database setup failed");
  console.error(e);
  process.exit(1);
});

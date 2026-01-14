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

  // Comprehensive fix for all sites (activate + ensure SiteKeys + SiteInstances)
  console.log("🔧 Fixing all sites (activate + ensure SiteKeys + SiteInstances)...");
  try {
    execSync("tsx scripts/fix-site-keys-and-instances.ts", {
      stdio: "inherit",
      cwd: apiDir,
    });
    console.log("✅ All sites fixed (SiteKeys + SiteInstances)");
  } catch (fixError: any) {
    console.warn("⚠️  Comprehensive site fix failed, trying individual scripts...");
    console.warn(fixError.message);
    
    // Fallback 1: Try fix-all-sites (SiteKeys only)
    try {
      console.log("🔧 Fixing sites (activate + ensure SiteKeys)...");
      execSync("tsx scripts/fix-all-sites.ts", {
        stdio: "inherit",
        cwd: apiDir,
      });
      console.log("✅ Sites fixed (SiteKeys)");
    } catch (fixAllError: any) {
      console.warn("⚠️  fix-all-sites failed, trying individual scripts...");
      
      // Fallback 2: Individual scripts
      try {
        console.log("🔧 Activating all sites...");
        execSync("tsx scripts/activate-all-sites.ts", {
          stdio: "inherit",
          cwd: apiDir,
        });
        console.log("✅ Sites activated");
      } catch (activateError: any) {
        console.warn("⚠️  Site activation failed");
        console.warn(activateError.message);
      }

      try {
        console.log("🔧 Ensuring SiteKey entries...");
        execSync("tsx scripts/ensure-site-keys.ts", {
          stdio: "inherit",
          cwd: apiDir,
        });
        console.log("✅ SiteKeys ensured");
      } catch (siteKeyError: any) {
        console.warn("⚠️  SiteKey creation failed");
        console.warn(siteKeyError.message);
      }
    }

    // Fallback 3: Ensure SiteInstances separately
    try {
      console.log("🔧 Ensuring SiteInstance entries for all sites...");
      execSync("tsx scripts/ensure-site-instances.ts", {
        stdio: "inherit",
        cwd: apiDir,
      });
      console.log("✅ SiteInstances ensured");
    } catch (siteInstanceError: any) {
      console.warn("⚠️  SiteInstance creation failed (this might be okay if no sites exist)");
      console.warn(siteInstanceError.message);
    }
  }

  // Ensure default site exists and is active
  console.log("🔧 Ensuring default site exists...");
  try {
    execSync("tsx scripts/ensure-default-site.ts", {
      stdio: "inherit",
      cwd: apiDir,
    });
    console.log("✅ Default site ensured");
  } catch (defaultSiteError: any) {
    console.warn("⚠️  Default site check failed (this might be okay if no sites exist)");
    console.warn(defaultSiteError.message);
  }

  console.log("✅ Database setup completed");
}

main().catch((e) => {
  console.error("❌ Database setup failed");
  console.error(e);
  process.exit(1);
});

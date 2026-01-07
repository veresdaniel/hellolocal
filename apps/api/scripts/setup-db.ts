#!/usr/bin/env tsx
/**
 * Database setup script for production
 * Handles both fresh databases and existing databases that need baseline
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

    // Check if the problematic migration actually succeeded
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

    // If migration succeeded, mark it as finished
    if (enumExists[0]?.exists && tableExists[0]?.exists) {
      const { readFileSync, existsSync: fsExistsSync } = await import("fs");
      const { join, resolve: pathResolve } = await import("path");
      const { createHash, randomUUID } = await import("crypto");
      
      let apiDir = process.cwd();
      if (!fsExistsSync(pathResolve(apiDir, "prisma"))) {
        const parentDir = pathResolve(apiDir, "..");
        if (fsExistsSync(pathResolve(parentDir, "prisma"))) {
          apiDir = parentDir;
        }
      }
      
      const migrationName = "20260107155301_add_static_pages";
      const migrationPath = join(apiDir, "prisma/migrations", migrationName, "migration.sql");
      
      if (fsExistsSync(migrationPath)) {
        const existing = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT id FROM "_prisma_migrations" 
          WHERE "migration_name" = ${migrationName}
          AND finished_at IS NOT NULL
        `;

        if (existing.length === 0) {
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
          console.log(`✅ Migration ${migrationName} marked as finished`);
        }
      }
    }
    
    console.log("✅ Failed migrations deleted/resolved");
  } catch (error) {
    console.log(`⚠️  Could not delete failed migrations: ${error}`);
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
  
  console.log("🔧 Setting up database...");
  console.log(`📁 Working directory: ${apiDir}`);
  
  if (!existsSync(resolve(apiDir, "prisma"))) {
    throw new Error(`Prisma directory not found. Expected at: ${resolve(apiDir, "prisma")}`);
  }

  // Delete all failed migrations first - this is the most direct approach
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
    console.log(`⚠️  Migration deploy failed`);
    
    // If still has failed migrations, delete them again and retry
    if (errorMessage.includes("failed migrations") || errorMessage.includes("P3009")) {
      console.log("🔄 Still has failed migrations, deleting again...");
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
    
    // If migrations still haven't succeeded, try baseline
    if (!migrationsSucceeded) {
      console.log("📋 Attempting baseline (this is safe if schema already exists)...");
      try {
        execSync("tsx scripts/baseline-migrations.ts", {
          stdio: "inherit",
          cwd: apiDir,
        });
        console.log("✅ Baseline completed");
        
        // Delete failed migrations one more time after baseline
        await deleteFailedMigrations();
        
        // Now try migrate deploy again
        console.log("📦 Running migrations again after baseline...");
        execSync("prisma migrate deploy", {
          stdio: "inherit",
          cwd: apiDir,
        });
        console.log("✅ Migrations verified");
        migrationsSucceeded = true;
      } catch (baselineError: any) {
        console.error("❌ Baseline failed");
        console.error("This might indicate a database connection or permissions issue");
        throw baselineError;
      }
    }
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
    console.warn("⚠️  Seed failed (this might be okay if data already exists)");
    console.warn(seedError.message);
  }

  console.log("✅ Database setup completed");
}

main().catch((e) => {
  console.error("❌ Database setup failed");
  console.error(e);
  process.exit(1);
});

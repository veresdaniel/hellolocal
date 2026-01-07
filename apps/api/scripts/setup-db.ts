#!/usr/bin/env tsx
/**
 * Database setup script for production
 * Handles both fresh databases and existing databases that need baseline
 */

import "dotenv/config";
import { execSync } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  // Determine the API directory
  // Try to find it relative to current working directory or script location
  let apiDir = process.cwd();
  
  // Check if we're in the api directory (has prisma folder)
  if (!existsSync(resolve(apiDir, "prisma"))) {
    // Try going up one level if we're in scripts/
    const parentDir = resolve(apiDir, "..");
    if (existsSync(resolve(parentDir, "prisma"))) {
      apiDir = parentDir;
    }
  }
  
  console.log("🔧 Setting up database...");
  console.log(`📁 Working directory: ${apiDir}`);
  
  // Verify prisma directory exists
  if (!existsSync(resolve(apiDir, "prisma"))) {
    throw new Error(`Prisma directory not found. Expected at: ${resolve(apiDir, "prisma")}`);
  }

  // First, try to run migrations (will fail if schema is not empty and no migration history)
  console.log("📦 Running migrations...");
  try {
    execSync("prisma migrate deploy", {
      stdio: "inherit",
      cwd: apiDir,
    });
    console.log("✅ Migrations applied successfully");
  } catch (migrationError: any) {
    // If migrate deploy fails, it's likely because:
    // 1. Schema is not empty but migration history is missing (needs baseline)
    // 2. Some other migration error
    
    // Try to capture error output for logging
    const errorCode = migrationError.status || migrationError.code;
    console.log(`⚠️  Migration deploy failed with code: ${errorCode}`);
    
    // Check if this is a baseline scenario by trying to run baseline
    console.log("📋 Attempting baseline (this is safe if schema already exists)...");
    try {
      execSync("tsx scripts/baseline-migrations.ts", {
        stdio: "inherit",
        cwd: apiDir,
      });
      console.log("✅ Baseline completed");
      
      // Now try migrate deploy again (should work or show "already applied")
      console.log("📦 Running migrations again after baseline...");
      execSync("prisma migrate deploy", {
        stdio: "inherit",
        cwd: apiDir,
      });
      console.log("✅ Migrations verified");
    } catch (baselineError: any) {
      // If baseline also fails, it might mean:
      // 1. Database connection issue
      // 2. Permissions issue
      // 3. Schema doesn't match expected state
      console.error("❌ Baseline failed");
      console.error("This might indicate a database connection or permissions issue");
      throw baselineError;
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


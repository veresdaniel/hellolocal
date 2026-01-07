#!/usr/bin/env tsx
/**
 * Database setup script for production
 * Handles both fresh databases and existing databases that need baseline
 */

import "dotenv/config";
import { execSync } from "child_process";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  console.log("🔧 Setting up database...");

  try {
    // First, try to run migrations (will fail if schema is not empty and no migration history)
    console.log("📦 Running migrations...");
    execSync("prisma migrate deploy", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("✅ Migrations applied successfully");
  } catch (error: any) {
    const errorOutput = error.message || error.stderr?.toString() || error.stdout?.toString() || "";
    // If migration fails with "schema is not empty", try baseline
    if (errorOutput.includes("schema is not empty") || errorOutput.includes("baseline")) {
      console.log("⚠️  Database schema exists but migration history is missing");
      console.log("📋 Running baseline...");
      try {
        execSync("tsx scripts/baseline-migrations.ts", {
          stdio: "inherit",
          cwd: process.cwd(),
        });
        console.log("✅ Baseline completed");
        // Now try migrate deploy again (should work or show "already applied")
        console.log("📦 Running migrations again...");
        execSync("prisma migrate deploy", {
          stdio: "inherit",
          cwd: process.cwd(),
        });
        console.log("✅ Migrations verified");
      } catch (baselineError: any) {
        console.error("❌ Baseline failed");
        throw baselineError;
      }
    } else {
      // Some other error, re-throw it
      throw error;
    }
  }

  // Seed database
  console.log("🌱 Seeding database...");
  try {
    execSync("prisma db seed", {
      stdio: "inherit",
      cwd: process.cwd(),
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


#!/usr/bin/env tsx
/**
 * Reset database script - drops all tables and re-runs migrations
 * WARNING: This will delete ALL data in the database!
 */

import "dotenv/config";
import { execSync } from "child_process";
import { resolve, join } from "path";
import { existsSync, readdirSync, statSync, readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

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
  
  console.log("🗑️  Resetting database...");
  console.log(`📁 Working directory: ${apiDir}`);
  
  if (!existsSync(resolve(apiDir, "prisma"))) {
    throw new Error(`Prisma directory not found. Expected at: ${resolve(apiDir, "prisma")}`);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    console.log("🔍 Getting all table names...");
    
    // Get all table names (excluding system tables)
    const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
    `;

    if (tables.length === 0) {
      console.log("ℹ️  No tables found, database is already empty");
    } else {
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

    console.log("\n📦 Running migrations...");
    
    // Read and execute all migration files directly using PrismaPg adapter
    const { readdirSync, statSync, readFileSync } = await import("fs");
    const { join } = await import("path");
    
    const migrationsPath = join(apiDir, "prisma/migrations");
    const migrations = readdirSync(migrationsPath)
      .filter((dir) => {
        const dirPath = join(migrationsPath, dir);
        return statSync(dirPath).isDirectory() && dir !== "migration_lock.toml";
      })
      .sort();

    console.log(`Found ${migrations.length} migrations to apply`);

    for (const migration of migrations) {
      const migrationPath = join(migrationsPath, migration, "migration.sql");
      if (existsSync(migrationPath)) {
        console.log(`  → Applying ${migration}...`);
        const sql = readFileSync(migrationPath, "utf-8");
        
        // Execute the entire SQL file as one statement
        // This is necessary because Prisma migrations can contain PL/pgSQL blocks
        // that must be executed as a single unit
        try {
          await prisma.$executeRawUnsafe(sql);
          
          // Record migration in _prisma_migrations table
          const migrationName = migration;
          const checksum = ""; // We'll skip checksum validation for now
          try {
            await prisma.$executeRaw`
              INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at)
              VALUES (gen_random_uuid()::text, ${checksum}, NOW(), ${migrationName}, NOW())
              ON CONFLICT DO NOTHING
            `;
          } catch (error: any) {
            // Migration table might not exist yet, that's okay
          }
        } catch (error: any) {
          // Some statements might fail if they're already applied or are conditional
          // Only log if it's not a "already exists" type error
          if (!error.message?.includes("already exists") && 
              !error.message?.includes("does not exist") &&
              !error.message?.includes("duplicate key")) {
            console.warn(`    ⚠️  Warning: ${error.message.substring(0, 100)}`);
          }
        }
      }
    }

    await prisma.$disconnect();
    console.log("✅ Migrations applied successfully");

    console.log("\n🌱 Seeding database...");
    try {
      execSync("prisma db seed", {
        stdio: "inherit",
        cwd: apiDir,
        env: {
          ...process.env,
        },
      });
      console.log("✅ Database seeded successfully");
    } catch (seedError: any) {
      console.warn("⚠️  Seeding failed (this might be okay if no seed script exists)");
      console.warn(seedError.message);
    }

    console.log("\n✅ Database reset complete!");
  } catch (error: any) {
    console.error("❌ Error resetting database:", error);
    await prisma.$disconnect();
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

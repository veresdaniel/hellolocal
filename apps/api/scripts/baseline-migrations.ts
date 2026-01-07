#!/usr/bin/env tsx
/**
 * Baseline script for existing production databases
 * Marks all existing migrations as applied without running them
 * Use this when the database schema already exists but migration history is missing
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { readdirSync, statSync, existsSync, readFileSync } from "fs";
import { join, resolve } from "path";
import { createHash, randomUUID } from "crypto";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  // Determine the API directory
  let apiDir = process.cwd();
  
  // Check if we're in the api directory (has prisma folder)
  if (!existsSync(resolve(apiDir, "prisma"))) {
    // Try going up one level if we're in scripts/
    const parentDir = resolve(apiDir, "..");
    if (existsSync(resolve(parentDir, "prisma"))) {
      apiDir = parentDir;
    }
  }

  const migrationsPath = join(apiDir, "prisma/migrations");
  
  if (!existsSync(migrationsPath)) {
    throw new Error(`Migrations directory not found at: ${migrationsPath}`);
  }
  
  const migrations = readdirSync(migrationsPath)
    .filter((dir) => {
      const dirPath = join(migrationsPath, dir);
      return statSync(dirPath).isDirectory() && dir !== "migration_lock.toml";
    })
    .sort();

  console.log(`Found ${migrations.length} migrations to baseline`);

  // Check if _prisma_migrations table exists
  const tableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = '_prisma_migrations'
    );
  `;

  if (!tableExists[0]?.exists) {
    console.log("Creating _prisma_migrations table...");
    await prisma.$executeRaw`
      CREATE TABLE "_prisma_migrations" (
        "id" VARCHAR(36) NOT NULL,
        "checksum" VARCHAR(64) NOT NULL,
        "finished_at" TIMESTAMP(3),
        "migration_name" VARCHAR(255) NOT NULL,
        "logs" TEXT,
        "rolled_back_at" TIMESTAMP(3),
        "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
        CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
      );
    `;
  }

  // Mark all migrations as applied
  for (const migration of migrations) {
    const migrationPath = join(migrationsPath, migration, "migration.sql");
    if (!existsSync(migrationPath)) {
      console.warn(`⚠️  Migration SQL file not found: ${migrationPath}`);
      continue;
    }

    const migrationSql = readFileSync(migrationPath, "utf-8");
    const checksum = createHash("sha256")
      .update(migrationSql)
      .digest("hex");

    // Check if migration already exists
    const existing = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "_prisma_migrations" 
      WHERE "migration_name" = ${migration}
    `;

    if (existing.length > 0) {
      console.log(`✓ Migration ${migration} already marked as applied`);
      continue;
    }

    // Insert migration record
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
        ${migration},
        CURRENT_TIMESTAMP,
        1
      )
    `;

    console.log(`✓ Baseline: ${migration}`);
  }

  console.log("✅ Baseline completed");
}

main()
  .catch((e) => {
    console.error("❌ Baseline failed");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


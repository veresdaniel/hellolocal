#!/usr/bin/env node
/**
 * Fix admin user script - ensures admin@example.com exists with correct password and site assignment
 */

import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  console.log("🔧 Fixing admin user...");

  // Get or find a site - try multiple approaches
  let site = null;
  const defaultSiteSlug = process.env.DEFAULT_SITE_SLUG ?? "etyek-budai";

  try {
    // First, try to find by slug (if slug column exists)
    site = await prisma.site.findFirst({
      where: { slug: defaultSiteSlug },
    });
    if (site) {
      const siteSlug = (site as any).slug || site.id;
      console.log(`✓ Found site by slug: ${siteSlug}`);
    }
  } catch (error: any) {
    // If slug column doesn't exist, try other methods
    console.log(`⚠️  Could not find site by slug, trying alternatives...`);
  }

  if (!site) {
    // Try to find any active site
    try {
      site = await prisma.site.findFirst({
        where: { isActive: true },
      });
      if (site) {
        console.log(`✓ Found active site: ${site.id}`);
      }
    } catch (error: any) {
      console.log(`⚠️  Could not find active site: ${error.message}`);
    }
  }

  if (!site) {
    // Try to find any site at all
    try {
      site = await prisma.site.findFirst({});
      if (site) {
        console.log(`✓ Found any site: ${site.id}`);
      }
    } catch (error: any) {
      console.error(`❌ Could not access Site table: ${error.message}`);
      throw new Error(
        `Site table not accessible. Please ensure migrations are run: pnpm -C apps/api db:setup`
      );
    }
  }

  if (!site) {
    throw new Error(
      `No site found in database. Please run migrations and seed: pnpm -C apps/api db:setup && pnpm -C apps/api db:seed`
    );
  }

  // Hash password
  const passwordHash = await bcrypt.hash("admin123", 10);

  // Find existing admin user
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ email: "admin@example.com" }, { username: "admin" }],
    },
    include: {
      sites: {
        select: { siteId: true },
      },
    },
  });

  if (existingAdmin) {
    console.log(`✓ Found existing admin user: ${existingAdmin.email}`);
    
    // Check if user already has this site
    const hasSite = existingAdmin.sites.some((s) => s.siteId === site.id);
    
    if (!hasSite) {
      // Create site relationship
      await prisma.userSite.create({
        data: {
          userId: existingAdmin.id,
          siteId: site.id,
          isPrimary: true,
        },
      });
      console.log(`✓ Added site relationship`);
    } else {
      // Update to make it primary
      await prisma.userSite.updateMany({
        where: {
          userId: existingAdmin.id,
          siteId: site.id,
        },
        data: {
          isPrimary: true,
        },
      });
      console.log(`✓ Updated site relationship to primary`);
    }
    
    // Update admin user
    const updatedUser = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash,
        isActive: true,
        role: UserRole.superadmin,
        firstName: "Super",
        lastName: "Admin",
        bio: "System super administrator",
      },
      include: {
        sites: {
          select: { siteId: true },
        },
      },
    });

    console.log(`✅ Admin user updated:`);
    console.log(`   Email: ${updatedUser.email}`);
    console.log(`   Username: ${updatedUser.username}`);
    console.log(`   Role: ${updatedUser.role}`);
    console.log(`   Is Active: ${updatedUser.isActive}`);
    console.log(`   Sites: ${updatedUser.sites.length}`);
    console.log(`   Password: admin123`);
  } else {
    // Create new admin user
    const newUser = await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@example.com",
        passwordHash,
        firstName: "Super",
        lastName: "Admin",
        bio: "System super administrator",
        role: UserRole.superadmin,
        isActive: true,
        sites: {
          create: {
            siteId: site.id,
            isPrimary: true,
          },
        },
      },
      include: {
        sites: {
          select: { siteId: true },
        },
      },
    });

    console.log(`✅ Admin user created:`);
    console.log(`   Email: ${newUser.email}`);
    console.log(`   Username: ${newUser.username}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Is Active: ${newUser.isActive}`);
    console.log(`   Sites: ${newUser.sites.length}`);
    console.log(`   Password: admin123`);
  }

  console.log("\n✅ Admin user fixed successfully!");
  console.log("You can now login with:");
  console.log("   Email: admin@example.com");
  console.log("   Password: admin123");
}

main()
  .catch((error) => {
    console.error("❌ Error fixing admin user:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

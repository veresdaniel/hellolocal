#!/usr/bin/env tsx
/**
 * Debug script to check site and SiteKey status
 * Usage: tsx scripts/debug-site.ts <site-slug>
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const siteSlug = process.argv[2];
  if (!siteSlug) {
    console.error("Usage: tsx scripts/debug-site.ts <site-slug>");
    process.exit(1);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });

  try {
    console.log(`🔍 Debugging site: ${siteSlug}\n`);

    // Check Site
    const site = await prisma.site.findUnique({
      where: { slug: siteSlug },
      include: {
        translations: true,
        siteKeys: {
          orderBy: { lang: 'asc' },
        },
        brand: {
          select: { id: true, name: true },
        },
      },
    });

    if (!site) {
      console.log(`❌ Site not found: ${siteSlug}`);
      return;
    }

    console.log(`✅ Site found:`);
    console.log(`   ID: ${site.id}`);
    console.log(`   Slug: ${site.slug}`);
    console.log(`   isActive: ${site.isActive}`);
    console.log(`   Brand: ${site.brand.name} (${site.brand.id})`);
    console.log(`   Created: ${site.createdAt}`);
    console.log(`   Updated: ${site.updatedAt}`);

    console.log(`\n📝 Translations (${site.translations.length}):`);
    for (const t of site.translations) {
      console.log(`   - ${t.lang}: ${t.name}`);
    }

    console.log(`\n🔑 SiteKeys (${site.siteKeys.length}):`);
    if (site.siteKeys.length === 0) {
      console.log(`   ❌ No SiteKey entries found!`);
      console.log(`   This is the problem - the site needs SiteKey entries for all languages.`);
    } else {
      for (const key of site.siteKeys) {
        console.log(`   - ${key.lang}: slug="${key.slug}", isActive=${key.isActive}, isPrimary=${key.isPrimary}`);
      }
    }

    // Check if all languages have SiteKeys
    const languages = ["hu", "en", "de"];
    const missingLanguages = languages.filter(
      (lang) => !site.siteKeys.some((key) => key.lang === lang && key.isActive)
    );

    if (missingLanguages.length > 0) {
      console.log(`\n⚠️  Missing SiteKeys for languages: ${missingLanguages.join(", ")}`);
      console.log(`   Run: pnpm db:ensure-site-keys to fix this`);
    } else {
      console.log(`\n✅ All languages have active SiteKey entries`);
    }

    // Check if site is accessible
    if (!site.isActive) {
      console.log(`\n⚠️  Site is not active!`);
      console.log(`   Run: pnpm db:activate-sites to activate all sites`);
    }

  } catch (error: any) {
    console.error("❌ Error:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error("❌ Script failed");
  console.error(e);
  process.exit(1);
});

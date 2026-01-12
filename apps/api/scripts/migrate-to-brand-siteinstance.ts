#!/usr/bin/env tsx
// Migration script: Migrate AppSetting data to Brand and SiteInstance tables
// Run with: pnpm migrate:to-brand

import "dotenv/config";
import { PrismaClient, Lang } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Make sure apps/api/.env exists and contains DATABASE_URL.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

interface AppSetting {
  key: string;
  value: string;
}

async function main() {
  console.log("Starting migration: AppSetting -> Brand and SiteInstance...");

  // Check if Brand and SiteInstance models are available
  if (!('brand' in prisma)) {
    throw new Error(
      "Prisma client does not include Brand model. Please run 'pnpm generate' first to regenerate the Prisma client."
    );
  }
  if (!('siteInstance' in prisma)) {
    throw new Error(
      "Prisma client does not include SiteInstance model. Please run 'pnpm generate' first to regenerate the Prisma client."
    );
  }

  console.log("✓ Prisma client includes Brand and SiteInstance models");

  // Get all tenants
  const tenants = await prisma.tenant.findMany({
    include: {
      translations: true,
    },
  });

  console.log(`Found ${tenants.length} tenants to migrate`);

  for (const tenant of tenants) {
    console.log(`\nProcessing tenant: ${tenant.slug} (${tenant.id})`);

    // Get all AppSettings for this tenant
    const settings = await prisma.appSetting.findMany({
      where: {
        key: {
          contains: tenant.id,
        },
      },
    });

    const settingsMap = new Map<string, string>();
    for (const setting of settings) {
      settingsMap.set(setting.key, setting.value);
    }

    // Extract values
    const faviconUrl = settingsMap.get(`faviconUrl_${tenant.id}`) || null;
    const defaultPlaceholderCardImage =
      settingsMap.get(`defaultPlaceholderCardImage_${tenant.id}`) || null;
    const defaultPlaceholderDetailHeroImage =
      settingsMap.get(`defaultPlaceholderDetailHeroImage_${tenant.id}`) || null;
    const defaultEventPlaceholderCardImage =
      settingsMap.get(`defaultEventPlaceholderCardImage_${tenant.id}`) || null;
    const brandBadgeIcon = settingsMap.get(`brandBadgeIcon_${tenant.id}`) || null;

    const mapDefaultTownId = settingsMap.get(`mapDefaultTownId_${tenant.id}`) || null;
    const mapDefaultLat = settingsMap.get(`mapDefaultLat_${tenant.id}`)
      ? parseFloat(settingsMap.get(`mapDefaultLat_${tenant.id}`)!)
      : null;
    const mapDefaultLng = settingsMap.get(`mapDefaultLng_${tenant.id}`)
      ? parseFloat(settingsMap.get(`mapDefaultLng_${tenant.id}`)!)
      : null;
    const mapDefaultZoom = settingsMap.get(`mapDefaultZoom_${tenant.id}`)
      ? parseFloat(settingsMap.get(`mapDefaultZoom_${tenant.id}`)!)
      : null;

    // Get tenant name for brand name
    const tenantName =
      tenant.translations.find((t) => t.lang === Lang.hu)?.name ||
      tenant.translations[0]?.name ||
      `Brand for ${tenant.slug}`;

    // Create or update Brand
    let brand;
    if (tenant.brandId) {
      // Update existing brand
      brand = await prisma.brand.update({
        where: { id: tenant.brandId },
        data: {
          name: tenantName,
          faviconUrl: faviconUrl && faviconUrl.trim() !== "" ? faviconUrl : null,
          placeholders: {
            defaultPlaceholderCardImage:
              defaultPlaceholderCardImage && defaultPlaceholderCardImage.trim() !== ""
                ? defaultPlaceholderCardImage
                : null,
            defaultPlaceholderDetailHeroImage:
              defaultPlaceholderDetailHeroImage && defaultPlaceholderDetailHeroImage.trim() !== ""
                ? defaultPlaceholderDetailHeroImage
                : null,
            defaultEventPlaceholderCardImage:
              defaultEventPlaceholderCardImage && defaultEventPlaceholderCardImage.trim() !== ""
                ? defaultEventPlaceholderCardImage
                : null,
            brandBadgeIcon: brandBadgeIcon && brandBadgeIcon.trim() !== "" ? brandBadgeIcon : null,
          },
          mapDefaults: {
            townId: mapDefaultTownId && mapDefaultTownId.trim() !== "" ? mapDefaultTownId : null,
            lat: mapDefaultLat,
            lng: mapDefaultLng,
            zoom: mapDefaultZoom,
          },
        },
      });
      console.log(`  Updated brand: ${brand.name} (${brand.id})`);
    } else {
      // Create new brand
      brand = await prisma.brand.create({
        data: {
          name: tenantName,
          faviconUrl: faviconUrl && faviconUrl.trim() !== "" ? faviconUrl : null,
          placeholders: {
            defaultPlaceholderCardImage:
              defaultPlaceholderCardImage && defaultPlaceholderCardImage.trim() !== ""
                ? defaultPlaceholderCardImage
                : null,
            defaultPlaceholderDetailHeroImage:
              defaultPlaceholderDetailHeroImage && defaultPlaceholderDetailHeroImage.trim() !== ""
                ? defaultPlaceholderDetailHeroImage
                : null,
            defaultEventPlaceholderCardImage:
              defaultEventPlaceholderCardImage && defaultEventPlaceholderCardImage.trim() !== ""
                ? defaultEventPlaceholderCardImage
                : null,
            brandBadgeIcon: brandBadgeIcon && brandBadgeIcon.trim() !== "" ? brandBadgeIcon : null,
          },
          mapDefaults: {
            townId: mapDefaultTownId && mapDefaultTownId.trim() !== "" ? mapDefaultTownId : null,
            lat: mapDefaultLat,
            lng: mapDefaultLng,
            zoom: mapDefaultZoom,
          },
        },
      });
      console.log(`  Created brand: ${brand.name} (${brand.id})`);

      // Update tenant with brandId
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { brandId: brand.id },
      });
      console.log(`  Updated tenant with brandId`);
    }

    // Create SiteInstance for each language
    const languages = [Lang.hu, Lang.en, Lang.de];
    let isFirst = true;

    for (const lang of languages) {
      // Check if translation exists for this language
      const translation = tenant.translations.find((t) => t.lang === lang);
      if (!translation) {
        console.log(`  Skipping ${lang} - no translation`);
        continue;
      }

      // Get language-specific settings
      const siteName = settingsMap.get(`siteName_${lang}_${tenant.id}`) || "HelloLocal";
      const siteDescription = settingsMap.get(`siteDescription_${lang}_${tenant.id}`) || "";
      const seoTitle = settingsMap.get(`seoTitle_${lang}_${tenant.id}`) || "";
      const seoDescription = settingsMap.get(`seoDescription_${lang}_${tenant.id}`) || "";
      const isCrawlableStr = settingsMap.get(`isCrawlable_${tenant.id}`);
      const isCrawlable =
        isCrawlableStr === null || isCrawlableStr === undefined
          ? true
          : isCrawlableStr === "true" || isCrawlableStr === "1";

      // Check if SiteInstance already exists
      const existing = await prisma.siteInstance.findUnique({
        where: {
          tenantId_lang: {
            tenantId: tenant.id,
            lang,
          },
        },
      });

      if (existing) {
        console.log(`  SiteInstance for ${lang} already exists, skipping`);
        continue;
      }

      // Create SiteInstance
      await prisma.siteInstance.create({
        data: {
          tenantId: tenant.id,
          lang,
          isDefault: isFirst,
          mapConfig: {
            townId: mapDefaultTownId && mapDefaultTownId.trim() !== "" ? mapDefaultTownId : null,
            lat: mapDefaultLat,
            lng: mapDefaultLng,
            zoom: mapDefaultZoom,
          },
          features: {
            isCrawlable,
            // Store language-specific site name and description in features for now
            // (These could be moved to a separate table later if needed)
            siteName,
            siteDescription,
            seoTitle,
            seoDescription,
          },
        },
      });
      console.log(`  Created SiteInstance for ${lang} (default: ${isFirst})`);
      isFirst = false;
    }
  }

  console.log("\n✅ Migration completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Migration failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

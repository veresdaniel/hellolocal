import "dotenv/config";
import { PrismaClient, UserRole } from "@prisma/client";
import { Lang } from "../src/common/language-code";
import { PrismaPg } from "@prisma/adapter-pg";
import { SlugEntityType } from "../src/slug/slug-entity-type";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is missing (apps/api/.env)`);
  return v;
}

const DEFAULT_SITE_SLUG = process.env.DEFAULT_SITE_SLUG ?? "etyek-budai";

// -------------------- helpers --------------------

async function upsertSiteKey(args: {
  siteId: string;
  lang: Lang;
  slug: string;
  isPrimary?: boolean;
}) {
  const { siteId, lang, slug, isPrimary = true } = args;

  // Check if SiteKey already exists
  const existing = await prisma.siteKey.findFirst({
    where: {
      siteId,
      lang,
      slug,
    },
  });

  if (existing) {
    return prisma.siteKey.update({
      where: { id: existing.id },
      data: { isPrimary, isActive: true },
      select: { id: true, lang: true, slug: true },
    });
  }

  return prisma.siteKey.create({
    data: { siteId, lang, slug, isPrimary, isActive: true },
    select: { id: true, lang: true, slug: true },
  });
}

async function upsertSlug(args: {
  siteId: string;
  lang: Lang;
  slug: string;
  entityType: SlugEntityType;
  entityId: string;
  isPrimary?: boolean;
}) {
  const { siteId, lang, slug, entityType, entityId, isPrimary = true } = args;
  return prisma.slug.upsert({
    where: { siteId_lang_slug: { siteId, lang, slug } },
    update: { entityType, entityId, isPrimary, isActive: true },
    create: { siteId, lang, slug, entityType, entityId, isPrimary, isActive: true },
    select: { id: true, lang: true, slug: true, entityType: true, entityId: true },
  });
}

async function ensureCategory(args: {
  siteId: string;
  // natural key for seed: HU name
  huName: string;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}) {
  const { siteId, huName, translations, isActive = true } = args;

  // Find existing by HU translation name
  let category = await prisma.category.findFirst({
    where: { siteId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        siteId,
        isActive,
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            description: t.description ?? null,
          })),
        },
      },
      select: { id: true },
    });
  } else {
    await prisma.category.update({ where: { id: category.id }, data: { isActive } });

    for (const t of translations) {
      await prisma.categoryTranslation.upsert({
        where: { categoryId_lang: { categoryId: category.id, lang: t.lang } },
        update: {
          name: t.name,
          description: t.description ?? null,
        },
        create: {
          categoryId: category.id,
          lang: t.lang,
          name: t.name,
          description: t.description ?? null,
        },
      });
    }
  }

  return category.id;
}

async function ensureTag(args: {
  siteId: string;
  // natural key for seed: HU name
  huName: string;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}) {
  const { siteId, huName, translations, isActive = true } = args;

  // Find existing by HU translation name
  let tag = await prisma.tag.findFirst({
    where: { siteId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!tag) {
    tag = await prisma.tag.create({
      data: {
        siteId,
        isActive,
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            description: t.description ?? null,
          })),
        },
      },
      select: { id: true },
    });
  } else {
    await prisma.tag.update({ where: { id: tag.id }, data: { isActive } });

    for (const t of translations) {
      await prisma.tagTranslation.upsert({
        where: { tagId_lang: { tagId: tag.id, lang: t.lang } },
        update: {
          name: t.name,
          description: t.description ?? null,
        },
        create: {
          tagId: tag.id,
          lang: t.lang,
          name: t.name,
          description: t.description ?? null,
        },
      });
    }
  }

  return tag.id;
}

async function ensurePriceBand(args: {
  siteId: string;
  // natural key for seed: HU name
  huName: string;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}) {
  const { siteId, huName, translations, isActive = true } = args;

  // Find existing by HU translation name
  let priceBand = await prisma.priceBand.findFirst({
    where: { siteId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!priceBand) {
    priceBand = await prisma.priceBand.create({
      data: {
        siteId,
        isActive,
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            description: t.description ?? null,
          })),
        },
      },
      select: { id: true },
    });
  } else {
    await prisma.priceBand.update({ where: { id: priceBand.id }, data: { isActive } });

    for (const t of translations) {
      await prisma.priceBandTranslation.upsert({
        where: { priceBandId_lang: { priceBandId: priceBand.id, lang: t.lang } },
        update: {
          name: t.name,
          description: t.description ?? null,
        },
        create: {
          priceBandId: priceBand.id,
          lang: t.lang,
          name: t.name,
          description: t.description ?? null,
        },
      });
    }
  }

  return priceBand.id;
}

async function ensureTown(args: {
  siteId: string;
  // natural key for seed: HU name
  huName: string;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
}) {
  const { siteId, huName, translations, isActive = true } = args;

  // Find existing by HU translation name
  let town = await prisma.town.findFirst({
    where: { siteId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!town) {
    town = await prisma.town.create({
      data: {
        siteId,
        isActive,
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            description: t.description ?? null,
            heroImage: t.heroImage ?? null,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            seoImage: t.seoImage ?? null,
            seoKeywords: t.seoKeywords ?? [],
          })),
        },
      },
      select: { id: true },
    });
  } else {
    // keep it idempotent: ensure base + translations exist
    await prisma.town.update({ where: { id: town.id }, data: { isActive } });

    for (const t of translations) {
      await prisma.townTranslation.upsert({
        where: { townId_lang: { townId: town.id, lang: t.lang } },
        update: {
          name: t.name,
          description: t.description ?? null,
          heroImage: t.heroImage ?? null,
          seoTitle: t.seoTitle ?? null,
          seoDescription: t.seoDescription ?? null,
          seoImage: t.seoImage ?? null,
          seoKeywords: t.seoKeywords ?? [],
        },
        create: {
          townId: town.id,
          lang: t.lang,
          name: t.name,
          description: t.description ?? null,
          heroImage: t.heroImage ?? null,
          seoTitle: t.seoTitle ?? null,
          seoDescription: t.seoDescription ?? null,
          seoImage: t.seoImage ?? null,
          seoKeywords: t.seoKeywords ?? [],
        },
      });
    }
  }

  return town.id;
}

async function ensurePlace(args: {
  siteId: string;
  townId?: string | null;
  // natural key for seed: HU name
  huName: string;

  categoryId: string;
  isActive?: boolean;

  heroImage?: string | null;
  tagIds?: string[]; // Array of tag IDs
  lat?: number | null;
  lng?: number | null;
  priceBandId?: string | null;

  ratingAvg?: number | null;
  ratingCount?: number | null;
  extras?: any;

  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;

    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;

    openingHours?: string | null;
    accessibility?: string | null;

    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
}) {
  const {
    siteId,
    townId = null,
    huName,
    categoryId,
    isActive = true,
    heroImage = null,
    gallery = [],
    tagIds = [],
    lat = null,
    lng = null,
    priceBandId = null,
    ratingAvg = null,
    ratingCount = null,
    extras = null,
    translations,
  } = args;

  // Find existing by HU translation name
  let place = await prisma.place.findFirst({
    where: { siteId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!place) {
    place = await prisma.place.create({
      data: {
        siteId,
        townId,
        categoryId,
        isActive,
        heroImage,
        lat,
        lng,
        priceBandId,
        ratingAvg,
        ratingCount,
        extras,
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            description: t.description ?? null,
            address: t.address ?? null,
            phone: t.phone ?? null,
            email: t.email ?? null,
            website: t.website ?? null,
            openingHours: t.openingHours ?? null,
            accessibility: t.accessibility ?? null,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            seoImage: t.seoImage ?? null,
            seoKeywords: t.seoKeywords ?? [],
          })),
        },
        tags: {
          create: tagIds.map((tagId) => ({
            tagId,
          })),
        },
      },
      select: { id: true },
    });
  } else {
    await prisma.place.update({
      where: { id: place.id },
      data: {
        townId,
        categoryId,
        isActive,
        heroImage,
        gallery,
        lat,
        lng,
        priceBandId,
        ratingAvg,
        ratingCount,
        extras,
      },
    });

    // Update tags: delete existing and create new ones
    await prisma.placeTag.deleteMany({
      where: { placeId: place.id },
    });
    if (tagIds.length > 0) {
      await prisma.placeTag.createMany({
        data: tagIds.map((tagId) => ({
          placeId: place.id,
          tagId,
        })),
      });
    }

    for (const t of translations) {
      await prisma.placeTranslation.upsert({
        where: { placeId_lang: { placeId: place.id, lang: t.lang } },
        update: {
          name: t.name,
          description: t.description ?? null,
          address: t.address ?? null,
          phone: t.phone ?? null,
          email: t.email ?? null,
          website: t.website ?? null,
          openingHours: t.openingHours ?? null,
          accessibility: t.accessibility ?? null,
          seoTitle: t.seoTitle ?? null,
          seoDescription: t.seoDescription ?? null,
          seoImage: t.seoImage ?? null,
          seoKeywords: t.seoKeywords ?? [],
        },
        create: {
          placeId: place.id,
          lang: t.lang,
          name: t.name,
          description: t.description ?? null,
          address: t.address ?? null,
          phone: t.phone ?? null,
          email: t.email ?? null,
          website: t.website ?? null,
          openingHours: t.openingHours ?? null,
          accessibility: t.accessibility ?? null,
          seoTitle: t.seoTitle ?? null,
          seoDescription: t.seoDescription ?? null,
          seoImage: t.seoImage ?? null,
          seoKeywords: t.seoKeywords ?? [],
        },
      });
    }
  }

  return place.id;
}

async function ensureLegalPage(args: {
  siteId: string;
  key: string; // imprint|terms|privacy
  isActive?: boolean;
  translations: Array<{
    lang: Lang;
    title: string;
    content?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
}) {
  const { siteId, key, isActive = true, translations } = args;

  const page = await prisma.legalPage.upsert({
    where: { siteId_key: { siteId, key } },
    update: { isActive },
    create: {
      siteId,
      key,
      isActive,
      translations: {
        create: translations.map((t) => ({
          lang: t.lang,
          title: t.title,
          content: t.content ?? null,
          seoTitle: t.seoTitle ?? null,
          seoDescription: t.seoDescription ?? null,
          seoImage: t.seoImage ?? null,
          seoKeywords: t.seoKeywords ?? [],
        })),
      },
    },
    select: { id: true },
  });

  // Ensure translations are up to date (idempotent)
  for (const t of translations) {
    await prisma.legalPageTranslation.upsert({
      where: { legalPageId_lang: { legalPageId: page.id, lang: t.lang } },
      update: {
        title: t.title,
        content: t.content ?? null,
        seoTitle: t.seoTitle ?? null,
        seoDescription: t.seoDescription ?? null,
        seoImage: t.seoImage ?? null,
        seoKeywords: t.seoKeywords ?? [],
      },
      create: {
        legalPageId: page.id,
        lang: t.lang,
        title: t.title,
        content: t.content ?? null,
        seoTitle: t.seoTitle ?? null,
        seoDescription: t.seoDescription ?? null,
        seoImage: t.seoImage ?? null,
        seoKeywords: t.seoKeywords ?? [],
      },
    });
  }

  return page.id;
}

// -------------------- seed --------------------

async function main() {
  mustEnv("DATABASE_URL");

  // 1) Brand (required for Site)
  let brand = await prisma.brand.findFirst({
    where: { name: "HelloLocal" },
  });

  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        name: "HelloLocal",
      },
    });
    console.log(`✓ Created brand: ${brand.name}`);
  } else {
    console.log(`✓ Found brand: ${brand.name}`);
  }

  // 2) Site (internal key)
  // First, check if Site table exists
  const siteTableExists = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'Site'
    );
  `;

  if (!siteTableExists[0]?.exists) {
    console.error(`❌ Site table does not exist in database.`);
    console.error(`   Please run: pnpm -C apps/api generate && pnpm -C apps/api migrate:deploy`);
    throw new Error(
      `Database schema is out of sync. Site table missing. Please run migrations and regenerate Prisma client.`
    );
  }

  let site = null;
  
  try {
    // Try to find site by slug
    site = await prisma.site.findFirst({
      where: { slug: DEFAULT_SITE_SLUG },
      include: {
        translations: true,
      },
    });
  } catch (error: any) {
    // If slug column doesn't exist or query fails, try to find any site
    console.log(`⚠️  Could not find site by slug: ${error.message}`);
    console.log(`   Trying to find any site...`);
    try {
      site = await prisma.site.findFirst({
        include: {
          translations: true,
        },
      });
    } catch (err: any) {
      console.error(`❌ Could not access Site table: ${err.message}`);
      console.error(`   This usually means the Prisma client is out of sync.`);
      console.error(`   Try running: pnpm -C apps/api generate`);
      throw new Error(
        `Prisma client is out of sync with database. Please run: pnpm -C apps/api generate`
      );
    }
  }

  if (!site) {
    // Create new site
    try {
      site = await prisma.site.create({
      data: {
        slug: DEFAULT_SITE_SLUG,
        brandId: brand.id,
        isActive: true,
        translations: {
          create: [
            {
              lang: "hu",
              name: "Etyek–Budai Borvidék",
              shortDescription: "<p>Rövid bemutató…</p>",
              description: "<p>Hosszabb leírás…</p>",
              seoTitle: "Etyek–Budai Borvidék",
              seoDescription: "Fedezd fel az Etyek–Budai borvidéket.",
              seoKeywords: ["etyek", "borvidék", "borászat"],
            },
            {
              lang: "en",
              name: "Etyek–Buda Wine Region",
              shortDescription: "<p>Short intro…</p>",
              description: "<p>Longer description…</p>",
              seoTitle: "Etyek–Buda Wine Region",
              seoDescription: "Discover the Etyek–Buda wine region.",
              seoKeywords: ["wine region", "etyek", "wineries"],
            },
            {
              lang: "de",
              name: "Weinregion Etyek–Buda",
              shortDescription: "<p>Kurzbeschreibung…</p>",
              description: "<p>Längere Beschreibung…</p>",
              seoTitle: "Weinregion Etyek–Buda",
              seoDescription: "Entdecke die Weinregion Etyek–Buda.",
              seoKeywords: ["Weinregion", "Etyek", "Weingüter"],
            },
          ],
        },
      },
      include: {
        translations: true,
      },
      include: {
        translations: true,
      },
    });
    const siteSlug = (site as any).slug || site.id;
    console.log(`✓ Created site: ${siteSlug}`);
    } catch (error: any) {
      console.error(`❌ Could not create site: ${error.message}`);
      throw new Error(
        `Failed to create site. Please ensure migrations are run: pnpm -C apps/api db:setup`
      );
    }
  } else {
    // Update existing site to ensure it's active
    try {
      site = await prisma.site.update({
        where: { id: site.id },
        data: { isActive: true },
        include: {
          translations: true,
        },
      });
      const siteSlug = (site as any).slug || site.id;
      console.log(`✓ Found site: ${siteSlug}`);
    } catch (error: any) {
      // If update fails, just use the existing site
      console.log(`⚠️  Could not update site, using existing: ${site.id}`);
    }
  }

  // 3) SiteKey (public key in URL): hu/en/de  (MEZŐ: slug)
  await upsertSiteKey({ siteId: site.id, lang: "hu", slug: "etyek-budai", isPrimary: true });
  await upsertSiteKey({ siteId: site.id, lang: "en", slug: "etyek-buda", isPrimary: true });
  await upsertSiteKey({ siteId: site.id, lang: "de", slug: "etyek-buda", isPrimary: true });

  // 4) Town: Etyek
  const townId = await ensureTown({
    siteId: site.id,
    huName: "Etyek",
    translations: [
      {
        lang: "hu",
        name: "Etyek",
        description: "<p>Etyek a pezsgők és fehérborok vidéke…</p>",
        seoTitle: "Etyek",
        seoDescription: "Etyeki település leírása.",
      },
      { lang: "en", name: "Etyek", description: "<p>Etyek is known for…</p>" },
      { lang: "de", name: "Etyek", description: "<p>Etyek ist bekannt für…</p>" },
    ],
  });

  // Town public slugs per lang
  await upsertSlug({ siteId: site.id, lang: "hu", slug: "etyek", entityType: SlugEntityType.TOWN, entityId: townId });
  await upsertSlug({ siteId: site.id, lang: "en", slug: "etyek", entityType: SlugEntityType.TOWN, entityId: townId });
  await upsertSlug({ siteId: site.id, lang: "de", slug: "etyek", entityType: SlugEntityType.TOWN, entityId: townId });

  // 5) Categories
  const categoryWineryId = await ensureCategory({
    siteId: site.id,
    huName: "Borászat",
    translations: [
      { lang: "hu", name: "Borászat", description: "<p>Borászatok és pincészetek.</p>" },
      { lang: "en", name: "Winery", description: "<p>Wineries and cellars.</p>" },
      { lang: "de", name: "Weingut", description: "<p>Weingüter und Weinkeller.</p>" },
    ],
  });

  const categoryAccommodationId = await ensureCategory({
    siteId: site.id,
    huName: "Szállás",
    translations: [
      { lang: "hu", name: "Szállás", description: "<p>Szálláshelyek.</p>" },
      { lang: "en", name: "Accommodation", description: "<p>Accommodations.</p>" },
      { lang: "de", name: "Unterkunft", description: "<p>Unterkünfte.</p>" },
    ],
  });

  const categoryHospitalityId = await ensureCategory({
    siteId: site.id,
    huName: "Vendéglátás",
    translations: [
      { lang: "hu", name: "Vendéglátás", description: "<p>Éttermek, kávézók, bárok.</p>" },
      { lang: "en", name: "Hospitality", description: "<p>Restaurants, cafes, bars.</p>" },
      { lang: "de", name: "Gastronomie", description: "<p>Restaurants, Cafés, Bars.</p>" },
    ],
  });

  const categoryCraftId = await ensureCategory({
    siteId: site.id,
    huName: "Kézműves",
    translations: [
      { lang: "hu", name: "Kézműves", description: "<p>Kézműves műhelyek és workshopok.</p>" },
      { lang: "en", name: "Craft", description: "<p>Craft workshops.</p>" },
      { lang: "de", name: "Handwerk", description: "<p>Handwerkswerkstätten.</p>" },
    ],
  });

  const categoryFoodProducerId = await ensureCategory({
    siteId: site.id,
    huName: "Élelmiszer termelő",
    translations: [
      { lang: "hu", name: "Élelmiszer termelő", description: "<p>Helyi élelmiszer termelők.</p>" },
      { lang: "en", name: "Food Producer", description: "<p>Local food producers.</p>" },
      { lang: "de", name: "Lebensmittelproduzent", description: "<p>Lokale Lebensmittelproduzenten.</p>" },
    ],
  });

  // 3.6) Tags
  const tagTastingId = await ensureTag({
    siteId: site.id,
    huName: "Kóstoló",
    translations: [
      { lang: "hu", name: "Kóstoló" },
      { lang: "en", name: "Tasting" },
      { lang: "de", name: "Verkostung" },
    ],
  });

  const tagTerraceId = await ensureTag({
    siteId: site.id,
    huName: "Terasz",
    translations: [
      { lang: "hu", name: "Terasz" },
      { lang: "en", name: "Terrace" },
      { lang: "de", name: "Terrasse" },
    ],
  });

  // 3.7) Price Bands
  const priceBandBudgetId = await ensurePriceBand({
    siteId: site.id,
    huName: "Költségvetési",
    translations: [
      { lang: "hu", name: "Költségvetési" },
      { lang: "en", name: "Budget" },
      { lang: "de", name: "Budget" },
    ],
  });

  const priceBandMidId = await ensurePriceBand({
    siteId: site.id,
    huName: "Középkategória",
    translations: [
      { lang: "hu", name: "Középkategória" },
      { lang: "en", name: "Mid-range" },
      { lang: "de", name: "Mittelklasse" },
    ],
  });

  const priceBandPremiumId = await ensurePriceBand({
    siteId: site.id,
    huName: "Prémium",
    translations: [
      { lang: "hu", name: "Prémium" },
      { lang: "en", name: "Premium" },
      { lang: "de", name: "Premium" },
    ],
  });

  const priceBandLuxuryId = await ensurePriceBand({
    siteId: site.id,
    huName: "Luxus",
    translations: [
      { lang: "hu", name: "Luxus" },
      { lang: "en", name: "Luxury" },
      { lang: "de", name: "Luxus" },
    ],
  });

  // 4) Place: Hernák Estate
  const placeId = await ensurePlace({
    siteId: site.id,
    townId,
    huName: "Hernák Estate",
    categoryId: categoryWineryId,
    heroImage: "https://picsum.photos/seed/hernak/1200/800",
    lat: 47.447,
    lng: 18.748,
    priceBandId: priceBandPremiumId,
    tagIds: [tagTastingId, tagTerraceId],
    ratingAvg: 4.6,
    ratingCount: 18,
    extras: {
      capacity: 40,
      foodAvailable: true,
      accommodationAvailable: false,
      services: ["szabad szavas extra szolgáltatás"],
    },
    translations: [
      {
        lang: "hu",
        name: "Hernák Estate",
        description: "<p><strong>Részletes leírás</strong>…</p>",
        address: "<p>Etyek, Magyarország</p>",
        website: "https://example.com",
        openingHours: "<p>P–V: 10:00–18:00</p>",
        seoTitle: "Hernák Estate – Etyek",
        seoDescription: "Hernák Estate borászat Etyeken.",
        seoKeywords: ["etyek", "hernák", "kóstoló"],
      },
      {
        lang: "en",
        name: "Hernák Estate",
        description: "<p><strong>Full description</strong>…</p>",
        address: "<p>Etyek, Hungary</p>",
        website: "https://example.com",
        openingHours: "<p>Fri–Sun: 10:00–18:00</p>",
      },
      {
        lang: "de",
        name: "Hernák Estate",
        description: "<p><strong>Volle Beschreibung</strong>…</p>",
        address: "<p>Etyek, Ungarn</p>",
      },
    ],
  });

  // Place public slugs per lang
  await upsertSlug({ siteId: site.id, lang: "hu", slug: "hernak-estate", entityType: SlugEntityType.PLACE, entityId: placeId });
  await upsertSlug({ siteId: site.id, lang: "en", slug: "hernak-estate", entityType: SlugEntityType.PLACE, entityId: placeId });
  await upsertSlug({ siteId: site.id, lang: "de", slug: "hernak-estate", entityType: SlugEntityType.PLACE, entityId: placeId });

  // 5) Legal pages
  const imprintId = await ensureLegalPage({
    siteId: site.id,
    key: "imprint",
    translations: [
      {
        lang: "hu",
        title: "Impresszum",
        content: "<h2>Impresszum</h2><p>Szolgáltató adatai...</p>",
        seoTitle: "Impresszum",
        seoDescription: "Impresszum információ.",
      },
      { lang: "en", title: "Imprint", content: "<h2>Imprint</h2><p>Provider information...</p>" },
      { lang: "de", title: "Impressum", content: "<h2>Impressum</h2><p>Anbieterinformationen...</p>" },
    ],
  });

  const termsId = await ensureLegalPage({
    siteId: site.id,
    key: "terms",
    translations: [
      {
        lang: "hu",
        title: "Általános Szerződési Feltételek",
        content: "<h2>ÁSZF</h2><p>Általános szerződési feltételek...</p>",
        seoTitle: "ÁSZF",
        seoDescription: "Általános szerződési feltételek.",
      },
      { lang: "en", title: "Terms and Conditions", content: "<h2>Terms</h2><p>Terms and conditions...</p>" },
      { lang: "de", title: "Allgemeine Geschäftsbedingungen", content: "<h2>AGB</h2><p>Allgemeine Geschäftsbedingungen...</p>" },
    ],
  });

  const privacyId = await ensureLegalPage({
    siteId: site.id,
    key: "privacy",
    translations: [
      {
        lang: "hu",
        title: "Adatvédelmi tájékoztató",
        content: "<h2>Adatkezelés</h2><p>...</p>",
        seoTitle: "Adatvédelem",
        seoDescription: "Adatvédelmi tájékoztató.",
      },
      { lang: "en", title: "Privacy Policy", content: "<h2>Privacy</h2><p>...</p>" },
      { lang: "de", title: "Datenschutzerklärung", content: "<h2>Datenschutz</h2><p>...</p>" },
    ],
  });

  // Legal public slugs per lang (page entity)
  await upsertSlug({ siteId: site.id, lang: "hu", slug: "impresszum", entityType: SlugEntityType.PAGE, entityId: imprintId });
  await upsertSlug({ siteId: site.id, lang: "en", slug: "imprint", entityType: SlugEntityType.PAGE, entityId: imprintId });
  await upsertSlug({ siteId: site.id, lang: "de", slug: "impressum", entityType: SlugEntityType.PAGE, entityId: imprintId });

  await upsertSlug({ siteId: site.id, lang: "hu", slug: "aszf", entityType: SlugEntityType.PAGE, entityId: termsId });
  await upsertSlug({ siteId: site.id, lang: "en", slug: "terms", entityType: SlugEntityType.PAGE, entityId: termsId });
  await upsertSlug({ siteId: site.id, lang: "de", slug: "agb", entityType: SlugEntityType.PAGE, entityId: termsId });

  await upsertSlug({ siteId: site.id, lang: "hu", slug: "adatvedelem", entityType: SlugEntityType.PAGE, entityId: privacyId });
  await upsertSlug({ siteId: site.id, lang: "en", slug: "privacy-policy", entityType: SlugEntityType.PAGE, entityId: privacyId });
  await upsertSlug({ siteId: site.id, lang: "de", slug: "datenschutz", entityType: SlugEntityType.PAGE, entityId: privacyId });

  // 6) Superadmin user
  const superadminPasswordHash = await bcrypt.hash("admin123", 10); // Change in production!
  
  // First, try to find existing admin user by email or username
  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "admin@example.com" },
        { username: "admin" },
      ],
    },
  });

  let superadminUser;
  if (existingAdmin) {
    // Check if user already has this site
    const existingUserSite = await prisma.userSite.findUnique({
      where: {
        userId_siteId: {
          userId: existingAdmin.id,
          siteId: site.id,
        },
      },
    });

    if (!existingUserSite) {
      // Create site relationship
      await prisma.userSite.create({
        data: {
          userId: existingAdmin.id,
          siteId: site.id,
          isPrimary: true,
        },
      });
    } else {
      // Update to make it primary
      await prisma.userSite.update({
        where: {
          userId_siteId: {
            userId: existingAdmin.id,
            siteId: site.id,
          },
        },
        data: {
          isPrimary: true,
        },
      });
    }

    // Update existing admin to superadmin
    superadminUser = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        passwordHash: superadminPasswordHash,
        isActive: true,
        role: UserRole.superadmin,
        firstName: "Super",
        lastName: "Admin",
        bio: "System super administrator",
      },
      select: { id: true, username: true, email: true, role: true },
    });
  } else {
    // Create new superadmin user
    superadminUser = await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@example.com",
        passwordHash: superadminPasswordHash,
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
      select: { id: true, username: true, email: true, role: true },
    });
  }

  // 10) App Settings - Default Language
  await prisma.appSetting.upsert({
    where: { key: "defaultLanguage" },
    update: { value: "hu", type: "string", description: "Default language for the application" },
    create: {
      key: "defaultLanguage",
      value: "hu",
      type: "string",
      description: "Default language for the application",
    },
  });

  console.log("✅ Seed completed");
  console.log(`👤 Superadmin user ${existingAdmin ? "updated" : "created"}: ${superadminUser.email} / admin123 (role: ${superadminUser.role})`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
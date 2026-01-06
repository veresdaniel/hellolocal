import "dotenv/config";
import { PrismaClient, Lang } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SlugEntityType } from "../src/slug/slug-entity-type";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is missing (apps/api/.env)`);
  return v;
}

const DEFAULT_TENANT_INTERNAL = process.env.DEFAULT_TENANT_SLUG ?? "etyek-budai";

// -------------------- helpers --------------------

async function upsertTenantKey(args: {
  tenantId: string;
  lang: Lang;
  slug: string;
  isPrimary?: boolean;
}) {
  const { tenantId, lang, slug, isPrimary = true } = args;

  return prisma.tenantKey.upsert({
    where: { lang_slug: { lang, slug } },
    update: { tenantId, isPrimary, isActive: true },
    create: { tenantId, lang, slug, isPrimary, isActive: true },
    select: { id: true, lang: true, slug: true },
  });
}

async function upsertSlug(args: {
  tenantId: string;
  lang: Lang;
  slug: string;
  entityType: SlugEntityType;
  entityId: string;
  isPrimary?: boolean;
}) {
  const { tenantId, lang, slug, entityType, entityId, isPrimary = true } = args;
  return prisma.slug.upsert({
    where: { tenantId_lang_slug: { tenantId, lang, slug } },
    update: { entityType, entityId, isPrimary, isActive: true },
    create: { tenantId, lang, slug, entityType, entityId, isPrimary, isActive: true },
    select: { id: true, lang: true, slug: true, entityType: true, entityId: true },
  });
}

async function ensureCategory(args: {
  tenantId: string;
  // natural key for seed: HU name
  huName: string;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}) {
  const { tenantId, huName, translations, isActive = true } = args;

  // Find existing by HU translation name
  let category = await prisma.category.findFirst({
    where: { tenantId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        tenantId,
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
  tenantId: string;
  // natural key for seed: HU name
  huName: string;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}) {
  const { tenantId, huName, translations, isActive = true } = args;

  // Find existing by HU translation name
  let tag = await prisma.tag.findFirst({
    where: { tenantId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!tag) {
    tag = await prisma.tag.create({
      data: {
        tenantId,
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
  tenantId: string;
  // natural key for seed: HU name
  huName: string;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
  }>;
  isActive?: boolean;
}) {
  const { tenantId, huName, translations, isActive = true } = args;

  // Find existing by HU translation name
  let priceBand = await prisma.priceBand.findFirst({
    where: { tenantId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!priceBand) {
    priceBand = await prisma.priceBand.create({
      data: {
        tenantId,
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
  tenantId: string;
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
  const { tenantId, huName, translations, isActive = true } = args;

  // Find existing by HU translation name
  let town = await prisma.town.findFirst({
    where: { tenantId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!town) {
    town = await prisma.town.create({
      data: {
        tenantId,
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
  tenantId: string;
  townId?: string | null;
  // natural key for seed: HU name
  huName: string;

  categoryId: string;
  isActive?: boolean;

  heroImage?: string | null;
  gallery?: string[];
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
    teaser?: string | null;
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
    tenantId,
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
    where: { tenantId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!place) {
    place = await prisma.place.create({
      data: {
        tenantId,
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
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            teaser: t.teaser ?? null,
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
          teaser: t.teaser ?? null,
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
          teaser: t.teaser ?? null,
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
  tenantId: string;
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
  const { tenantId, key, isActive = true, translations } = args;

  const page = await prisma.legalPage.upsert({
    where: { tenantId_key: { tenantId, key } },
    update: { isActive },
    create: {
      tenantId,
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

  // 1) Tenant (internal key)
  const tenant = await prisma.tenant.upsert({
    where: { slug: DEFAULT_TENANT_INTERNAL },
    update: { isActive: true },
    create: {
      slug: DEFAULT_TENANT_INTERNAL,
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
    select: { id: true, slug: true },
  });

  // 2) TenantKey (public key in URL): hu/en/de  (MEZŐ: slug)
  await upsertTenantKey({ tenantId: tenant.id, lang: "hu", slug: "etyek-budai", isPrimary: true });
  await upsertTenantKey({ tenantId: tenant.id, lang: "en", slug: "etyek-buda", isPrimary: true });
  await upsertTenantKey({ tenantId: tenant.id, lang: "de", slug: "etyek-buda", isPrimary: true });

  // 3) Town: Etyek
  const townId = await ensureTown({
    tenantId: tenant.id,
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
  await upsertSlug({ tenantId: tenant.id, lang: "hu", slug: "etyek", entityType: SlugEntityType.TOWN, entityId: townId });
  await upsertSlug({ tenantId: tenant.id, lang: "en", slug: "etyek", entityType: SlugEntityType.TOWN, entityId: townId });
  await upsertSlug({ tenantId: tenant.id, lang: "de", slug: "etyek", entityType: SlugEntityType.TOWN, entityId: townId });

  // 3.5) Categories
  const categoryWineryId = await ensureCategory({
    tenantId: tenant.id,
    huName: "Borászat",
    translations: [
      { lang: "hu", name: "Borászat", description: "<p>Borászatok és pincészetek.</p>" },
      { lang: "en", name: "Winery", description: "<p>Wineries and cellars.</p>" },
      { lang: "de", name: "Weingut", description: "<p>Weingüter und Weinkeller.</p>" },
    ],
  });

  const categoryAccommodationId = await ensureCategory({
    tenantId: tenant.id,
    huName: "Szállás",
    translations: [
      { lang: "hu", name: "Szállás", description: "<p>Szálláshelyek.</p>" },
      { lang: "en", name: "Accommodation", description: "<p>Accommodations.</p>" },
      { lang: "de", name: "Unterkunft", description: "<p>Unterkünfte.</p>" },
    ],
  });

  const categoryHospitalityId = await ensureCategory({
    tenantId: tenant.id,
    huName: "Vendéglátás",
    translations: [
      { lang: "hu", name: "Vendéglátás", description: "<p>Éttermek, kávézók, bárok.</p>" },
      { lang: "en", name: "Hospitality", description: "<p>Restaurants, cafes, bars.</p>" },
      { lang: "de", name: "Gastronomie", description: "<p>Restaurants, Cafés, Bars.</p>" },
    ],
  });

  const categoryCraftId = await ensureCategory({
    tenantId: tenant.id,
    huName: "Kézműves",
    translations: [
      { lang: "hu", name: "Kézműves", description: "<p>Kézműves műhelyek és workshopok.</p>" },
      { lang: "en", name: "Craft", description: "<p>Craft workshops.</p>" },
      { lang: "de", name: "Handwerk", description: "<p>Handwerkswerkstätten.</p>" },
    ],
  });

  const categoryFoodProducerId = await ensureCategory({
    tenantId: tenant.id,
    huName: "Élelmiszer termelő",
    translations: [
      { lang: "hu", name: "Élelmiszer termelő", description: "<p>Helyi élelmiszer termelők.</p>" },
      { lang: "en", name: "Food Producer", description: "<p>Local food producers.</p>" },
      { lang: "de", name: "Lebensmittelproduzent", description: "<p>Lokale Lebensmittelproduzenten.</p>" },
    ],
  });

  // 3.6) Tags
  const tagTastingId = await ensureTag({
    tenantId: tenant.id,
    huName: "Kóstoló",
    translations: [
      { lang: "hu", name: "Kóstoló" },
      { lang: "en", name: "Tasting" },
      { lang: "de", name: "Verkostung" },
    ],
  });

  const tagTerraceId = await ensureTag({
    tenantId: tenant.id,
    huName: "Terasz",
    translations: [
      { lang: "hu", name: "Terasz" },
      { lang: "en", name: "Terrace" },
      { lang: "de", name: "Terrasse" },
    ],
  });

  // 3.7) Price Bands
  const priceBandBudgetId = await ensurePriceBand({
    tenantId: tenant.id,
    huName: "Költségvetési",
    translations: [
      { lang: "hu", name: "Költségvetési" },
      { lang: "en", name: "Budget" },
      { lang: "de", name: "Budget" },
    ],
  });

  const priceBandMidId = await ensurePriceBand({
    tenantId: tenant.id,
    huName: "Középkategória",
    translations: [
      { lang: "hu", name: "Középkategória" },
      { lang: "en", name: "Mid-range" },
      { lang: "de", name: "Mittelklasse" },
    ],
  });

  const priceBandPremiumId = await ensurePriceBand({
    tenantId: tenant.id,
    huName: "Prémium",
    translations: [
      { lang: "hu", name: "Prémium" },
      { lang: "en", name: "Premium" },
      { lang: "de", name: "Premium" },
    ],
  });

  const priceBandLuxuryId = await ensurePriceBand({
    tenantId: tenant.id,
    huName: "Luxus",
    translations: [
      { lang: "hu", name: "Luxus" },
      { lang: "en", name: "Luxury" },
      { lang: "de", name: "Luxus" },
    ],
  });

  // 4) Place: Hernák Estate
  const placeId = await ensurePlace({
    tenantId: tenant.id,
    townId,
    huName: "Hernák Estate",
    categoryId: categoryWineryId,
    heroImage: "https://picsum.photos/seed/hernak/1200/800",
    gallery: [
      "https://picsum.photos/seed/hernak1/1200/800",
      "https://picsum.photos/seed/hernak2/1200/800",
    ],
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
        teaser: "<p>Modern borászat Etyeken, kóstolóval.</p>",
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
        teaser: "<p>Modern winery in Etyek with tastings.</p>",
        description: "<p><strong>Full description</strong>…</p>",
        address: "<p>Etyek, Hungary</p>",
        website: "https://example.com",
        openingHours: "<p>Fri–Sun: 10:00–18:00</p>",
      },
      {
        lang: "de",
        name: "Hernák Estate",
        teaser: "<p>Modernes Weingut in Etyek.</p>",
        description: "<p><strong>Volle Beschreibung</strong>…</p>",
        address: "<p>Etyek, Ungarn</p>",
      },
    ],
  });

  // Place public slugs per lang
  await upsertSlug({ tenantId: tenant.id, lang: "hu", slug: "hernak-estate", entityType: SlugEntityType.PLACE, entityId: placeId });
  await upsertSlug({ tenantId: tenant.id, lang: "en", slug: "hernak-estate", entityType: SlugEntityType.PLACE, entityId: placeId });
  await upsertSlug({ tenantId: tenant.id, lang: "de", slug: "hernak-estate", entityType: SlugEntityType.PLACE, entityId: placeId });

  // 5) Legal pages
  const imprintId = await ensureLegalPage({
    tenantId: tenant.id,
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
    tenantId: tenant.id,
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
    tenantId: tenant.id,
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
  await upsertSlug({ tenantId: tenant.id, lang: "hu", slug: "impresszum", entityType: SlugEntityType.PAGE, entityId: imprintId });
  await upsertSlug({ tenantId: tenant.id, lang: "en", slug: "imprint", entityType: SlugEntityType.PAGE, entityId: imprintId });
  await upsertSlug({ tenantId: tenant.id, lang: "de", slug: "impressum", entityType: SlugEntityType.PAGE, entityId: imprintId });

  await upsertSlug({ tenantId: tenant.id, lang: "hu", slug: "aszf", entityType: SlugEntityType.PAGE, entityId: termsId });
  await upsertSlug({ tenantId: tenant.id, lang: "en", slug: "terms", entityType: SlugEntityType.PAGE, entityId: termsId });
  await upsertSlug({ tenantId: tenant.id, lang: "de", slug: "agb", entityType: SlugEntityType.PAGE, entityId: termsId });

  await upsertSlug({ tenantId: tenant.id, lang: "hu", slug: "adatvedelem", entityType: SlugEntityType.PAGE, entityId: privacyId });
  await upsertSlug({ tenantId: tenant.id, lang: "en", slug: "privacy-policy", entityType: SlugEntityType.PAGE, entityId: privacyId });
  await upsertSlug({ tenantId: tenant.id, lang: "de", slug: "datenschutz", entityType: SlugEntityType.PAGE, entityId: privacyId });

  console.log("✅ Seed completed");
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
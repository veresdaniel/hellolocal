
import "dotenv/config";
import {
  ETYEK_EVENTS,
  ETYEK_PLACES,
  applyEtyekHours,
  applyEtyekSample,
  upcomingSaturday,
} from "./etyek-sample";
import { PrismaClient, Prisma, UserRole, SiteRole, PlaceRole, SlugEntityType, SubscriptionPlan, SubscriptionStatus, BillingPeriod, SitePlan, PlacePlan } from "@prisma/client";
import { Lang } from "../src/common/language-code";
import { PrismaPg } from "@prisma/adapter-pg";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} is missing (apps/api/.env)`);
  return v;
}

/** Deterministic PRNG (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function jitterLatLng(baseLat: number, baseLng: number, radiusKm: number, rand: () => number) {
  // Rough: 1 deg lat ~ 111km; 1 deg lng ~ 111km*cos(lat)
  const r = radiusKm * Math.sqrt(rand());
  const theta = rand() * Math.PI * 2;
  const dx = r * Math.cos(theta);
  const dy = r * Math.sin(theta);

  const dLat = dy / 111.0;
  const dLng = dx / (111.0 * Math.cos((baseLat * Math.PI) / 180));

  return { lat: baseLat + dLat, lng: baseLng + dLng };
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (ékezetek eltávolítása)
    .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, "") // Remove leading/trailing hyphens
    .slice(0, 80);
}

function picsum(seed: string, w = 1600, h = 1000) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${w}/${h}`;
}

// -------------------- helpers --------------------

async function upsertSiteKey(args: { siteId: string; lang: Lang; slug: string; isPrimary?: boolean }) {
  const { siteId, lang, slug, isPrimary = true } = args;

  const existing = await prisma.siteKey.findFirst({ where: { siteId, lang, slug }, select: { id: true } });
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

async function ensureBrand(name: string) {
  const existing = await prisma.brand.findFirst({ where: { name } });
  if (existing) return existing;

  return prisma.brand.create({ data: { name } });
}

async function ensureSite(args: {
  slug: string;
  brandId: string;
  isActive?: boolean;
  plan?: SitePlan;
  translations: Array<{
    lang: Lang;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
    heroImage?: string | null;
    landingHtml?: string | null;
    listIntroHtml?: string | null;
    listIntroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoKeywords?: string[];
  }>;
}) {
  const { slug, brandId, isActive = true, plan, translations } = args;

  const existing = await prisma.site.findFirst({ where: { slug }, select: { id: true } });

  if (!existing) {
    const created = await prisma.site.create({
      data: {
        slug,
        brandId,
        isActive,
        plan: plan ?? "basic",
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            shortDescription: t.shortDescription ?? null,
            description: t.description ?? null,
            heroImage: t.heroImage ?? null,
            landingHtml: t.landingHtml ?? null,
            listIntroHtml: t.listIntroHtml ?? null,
            listIntroImage: t.listIntroImage ?? null,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            seoKeywords: t.seoKeywords ?? [],
          })),
        },
      },
      select: { id: true, slug: true },
    });
    return created;
  }

  // update base + upsert translations
  await prisma.site.update({ where: { id: existing.id }, data: { isActive, ...(plan ? { plan } : {}) } });
  for (const t of translations) {
    await prisma.siteTranslation.upsert({
      where: { siteId_lang: { siteId: existing.id, lang: t.lang } },
      update: {
        name: t.name,
        shortDescription: t.shortDescription ?? null,
        description: t.description ?? null,
        heroImage: t.heroImage ?? null,
        landingHtml: t.landingHtml ?? null,
        listIntroHtml: t.listIntroHtml ?? null,
        listIntroImage: t.listIntroImage ?? null,
        seoTitle: t.seoTitle ?? null,
        seoDescription: t.seoDescription ?? null,
        seoKeywords: t.seoKeywords ?? [],
      },
      create: {
        siteId: existing.id,
        lang: t.lang,
        name: t.name,
        shortDescription: t.shortDescription ?? null,
        description: t.description ?? null,
        heroImage: t.heroImage ?? null,
        landingHtml: t.landingHtml ?? null,
        listIntroHtml: t.listIntroHtml ?? null,
        listIntroImage: t.listIntroImage ?? null,
        seoTitle: t.seoTitle ?? null,
        seoDescription: t.seoDescription ?? null,
        seoKeywords: t.seoKeywords ?? [],
      },
    });
  }

  return { id: existing.id, slug };
}

async function ensureTown(args: {
  siteId: string;
  huName: string;
  lat?: number | null;
  lng?: number | null;
  translations: Array<{
    lang: Lang;
    name: string;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
}) {
  const { siteId, huName, translations, isActive = true, lat = null, lng = null } = args;

  let town = await prisma.town.findFirst({
    where: { siteId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!town) {
    town = await prisma.town.create({
      data: {
        siteId,
        isActive,
        lat,
        lng,
        translations: {
          create: translations.map((t) => ({
            lang: t.lang,
            name: t.name,
            description: t.description ?? null,
            heroImage: t.heroImage ?? null,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            seoKeywords: t.seoKeywords ?? [],
          })),
        },
      },
      select: { id: true },
    });
  } else {
    await prisma.town.update({ where: { id: town.id }, data: { isActive, lat, lng } });
    for (const t of translations) {
      await prisma.townTranslation.upsert({
        where: { townId_lang: { townId: town.id, lang: t.lang } },
        update: {
          name: t.name,
          description: t.description ?? null,
          heroImage: t.heroImage ?? null,
          seoTitle: t.seoTitle ?? null,
          seoDescription: t.seoDescription ?? null,
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
          seoKeywords: t.seoKeywords ?? [],
        },
      });
    }
  }

  return town.id;
}

async function ensureCategory(args: {
  siteId: string;
  huName: string;
  color?: string | null;
  translations: Array<{ lang: Lang; name: string; description?: string | null }>;
  isActive?: boolean;
}) {
  const { siteId, huName, translations, isActive = true, color = null } = args;

  let category = await prisma.category.findFirst({
    where: { siteId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!category) {
    category = await prisma.category.create({
      data: {
        siteId,
        isActive,
        color,
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
    await prisma.category.update({ where: { id: category.id }, data: { isActive, color } });
    for (const t of translations) {
      await prisma.categoryTranslation.upsert({
        where: { categoryId_lang: { categoryId: category.id, lang: t.lang } },
        update: { name: t.name, description: t.description ?? null },
        create: { categoryId: category.id, lang: t.lang, name: t.name, description: t.description ?? null },
      });
    }
  }

  return category.id;
}

async function ensureTag(args: {
  siteId: string;
  huName: string;
  translations: Array<{ lang: Lang; name: string; description?: string | null }>;
  isActive?: boolean;
}) {
  const { siteId, huName, translations, isActive = true } = args;

  let tag = await prisma.tag.findFirst({
    where: { siteId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!tag) {
    tag = await prisma.tag.create({
      data: {
        siteId,
        isActive,
        translations: { create: translations.map((t) => ({ lang: t.lang, name: t.name, description: t.description ?? null })) },
      },
      select: { id: true },
    });
  } else {
    await prisma.tag.update({ where: { id: tag.id }, data: { isActive } });
    for (const t of translations) {
      await prisma.tagTranslation.upsert({
        where: { tagId_lang: { tagId: tag.id, lang: t.lang } },
        update: { name: t.name, description: t.description ?? null },
        create: { tagId: tag.id, lang: t.lang, name: t.name, description: t.description ?? null },
      });
    }
  }

  return tag.id;
}

async function ensurePriceBand(args: {
  siteId: string;
  huName: string;
  translations: Array<{ lang: Lang; name: string; description?: string | null }>;
  isActive?: boolean;
}) {
  const { siteId, huName, translations, isActive = true } = args;

  let priceBand = await prisma.priceBand.findFirst({
    where: { siteId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  if (!priceBand) {
    priceBand = await prisma.priceBand.create({
      data: {
        siteId,
        isActive,
        translations: { create: translations.map((t) => ({ lang: t.lang, name: t.name, description: t.description ?? null })) },
      },
      select: { id: true },
    });
  } else {
    await prisma.priceBand.update({ where: { id: priceBand.id }, data: { isActive } });
    for (const t of translations) {
      await prisma.priceBandTranslation.upsert({
        where: { priceBandId_lang: { priceBandId: priceBand.id, lang: t.lang } },
        update: { name: t.name, description: t.description ?? null },
        create: { priceBandId: priceBand.id, lang: t.lang, name: t.name, description: t.description ?? null },
      });
    }
  }

  return priceBand.id;
}

async function ensureUser(args: {
  username: string;
  email: string;
  password: string;
  role: UserRole;
  firstName: string;
  lastName: string;
}) {
  const passwordHash = await bcrypt.hash(args.password, 10);

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: args.email }, { username: args.username }] },
    select: { id: true },
  });

  if (!existing) {
    return prisma.user.create({
      data: {
        username: args.username,
        email: args.email,
        passwordHash,
        role: args.role,
        firstName: args.firstName,
        lastName: args.lastName,
        isActive: true,
      },
      select: { id: true, email: true, username: true, role: true },
    });
  }

  return prisma.user.update({
    where: { id: existing.id },
    data: {
      email: args.email, // Update email if changed
      passwordHash,
      role: args.role,
      firstName: args.firstName,
      lastName: args.lastName,
      isActive: true,
    },
    select: { id: true, email: true, username: true, role: true },
  });
}

async function ensureSiteMembership(siteId: string, userId: string, role: SiteRole) {
  return prisma.siteMembership.upsert({
    where: { siteId_userId: { siteId, userId } },
    update: { role },
    create: { siteId, userId, role },
    select: { id: true },
  });
}

async function ensurePlaceMembership(placeId: string, userId: string, role: PlaceRole) {
  return prisma.placeMembership.upsert({
    where: { placeId_userId: { placeId, userId } },
    update: { role },
    create: { placeId, userId, role },
    select: { id: true },
  });
}

async function ensurePlace(args: {
  siteId: string;
  townId?: string | null;
  huName: string;
  categoryId: string;

  isActive?: boolean;
  plan?: PlacePlan;
  heroImage?: string | null;
  lat?: number | null;
  lng?: number | null;
  priceBandId?: string | null;
  ratingAvg?: number | null;
  ratingCount?: number | null;
  extras?: any;

  tagIds?: string[];
  translations: Array<{
    lang: Lang;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    email?: string | null;
    website?: string | null;
    facebook?: string | null;
    whatsapp?: string | null;
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
    plan,
    heroImage = null,
    lat = null,
    lng = null,
    priceBandId = null,
    ratingAvg = null,
    ratingCount = null,
    extras = null,
    tagIds = [],
    translations,
  } = args;

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
        plan: plan ?? "free",
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
            shortDescription: t.shortDescription ?? null,
            description: t.description ?? null,
            address: t.address ?? null,
            phone: t.phone ?? null,
            email: t.email ?? null,
            website: t.website ?? null,
            facebook: t.facebook ?? null,
            whatsapp: t.whatsapp ?? null,
            openingHours: t.openingHours ?? null,
            accessibility: t.accessibility ?? null,
            seoTitle: t.seoTitle ?? null,
            seoDescription: t.seoDescription ?? null,
            seoImage: t.seoImage ?? null,
            seoKeywords: t.seoKeywords ?? [],
          })),
        },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
      select: { id: true },
    });
  } else {
    await prisma.place.update({
      where: { id: place.id },
      data: { townId, categoryId, isActive, heroImage, lat, lng, priceBandId, ratingAvg, ratingCount, extras, ...(plan ? { plan } : {}) },
    });

    await prisma.placeTag.deleteMany({ where: { placeId: place.id } });
    if (tagIds.length) {
      await prisma.placeTag.createMany({ data: tagIds.map((tagId) => ({ placeId: place!.id, tagId })) });
    }

    for (const t of translations) {
      await prisma.placeTranslation.upsert({
        where: { placeId_lang: { placeId: place.id, lang: t.lang } },
        update: {
          name: t.name,
          shortDescription: t.shortDescription ?? null,
          description: t.description ?? null,
          address: t.address ?? null,
          phone: t.phone ?? null,
          email: t.email ?? null,
          website: t.website ?? null,
          facebook: t.facebook ?? null,
          whatsapp: t.whatsapp ?? null,
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
          shortDescription: t.shortDescription ?? null,
          description: t.description ?? null,
          address: t.address ?? null,
          phone: t.phone ?? null,
          email: t.email ?? null,
          website: t.website ?? null,
          facebook: t.facebook ?? null,
          whatsapp: t.whatsapp ?? null,
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

async function ensureGalleryForPlace(args: {
  siteId: string;
  placeId: string;
  name: string;
  images: Array<{ src: string; thumbSrc?: string; alt?: string; caption?: string }>;
  layout?: "grid" | "masonry" | "carousel";
}) {
  const { siteId, placeId, name, images, layout = "grid" } = args;

  const existing = await prisma.gallery.findFirst({
    where: { siteId, placeId, name },
    select: { id: true },
  });

  const payload: Prisma.GalleryUncheckedCreateInput = {
    siteId,
    placeId,
    name,
    images: images.map((img, idx) => ({
      id: img.src.split("/seed/")[1]?.split("/")[0] ?? `img-${idx + 1}`,
      src: img.src,
      thumbSrc: img.thumbSrc ?? img.src,
      alt: img.alt ?? "",
      caption: img.caption ?? "",
    })) as any,
    layout,
    columns: { base: 2, md: 3, lg: 4 } as any,
    aspect: "auto",
    isActive: true,
  };

  if (!existing) {
    return prisma.gallery.create({ data: payload, select: { id: true } });
  }

  return prisma.gallery.update({ where: { id: existing.id }, data: payload, select: { id: true } });
}

async function ensurePriceList(args: {
  placeId: string;
  currency?: string;
  blocks: Array<{ title: string; items: Array<{ label: string; price: number | null; note?: string }> }>;
  note?: string | null;
  isEnabled?: boolean;
}) {
  const { placeId, currency = "HUF", blocks, note = null, isEnabled = true } = args;

  return prisma.placePriceList.upsert({
    where: { placeId },
    update: { currency, blocks: blocks as any, note, isActive: true, isEnabled },
    create: { placeId, currency, blocks: blocks as any, note, isActive: true, isEnabled },
    select: { id: true },
  });
}

async function log(siteId: string, userId: string, action: string, entityType?: string, entityId?: string, description?: string, metadata?: any) {
  return prisma.eventLog.create({
    data: {
      siteId,
      userId,
      action,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      description: description ?? null,
      metadata: metadata ?? null,
    },
  });
}

async function seedAnalytics(siteId: string, placeIds: string[], days: number, seed: number) {
  const rand = rng(seed);
  const today = new Date();
  // normalize to midnight UTC-like
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(start);
    day.setUTCDate(day.getUTCDate() - i);

    const baseViews = Math.floor(200 + rand() * 600);
    const uniq = Math.floor(baseViews * (0.55 + rand() * 0.25));

    
// Site-level daily analytics (placeId = null) cannot use compound unique in Prisma `where` with null.
// We do an idempotent find+update/create instead.
const siteDailyData = {
  day,
  siteId,
  placeId: null as any,
  pageViews: baseViews,
  placeViews: Math.floor(baseViews * (0.65 + rand() * 0.2)),
  uniqueVisitors: uniq,
  ctaPhone: Math.floor(rand() * 10),
  ctaEmail: Math.floor(rand() * 5),
  ctaWebsite: Math.floor(rand() * 25),
  ctaMaps: Math.floor(rand() * 35),
};

const existingSiteDaily = await prisma.analyticsDaily.findFirst({
  where: { day, siteId, placeId: null },
  select: { id: true },
});

if (existingSiteDaily) {
  await prisma.analyticsDaily.update({
    where: { id: existingSiteDaily.id },
    data: {
      pageViews: siteDailyData.pageViews,
      placeViews: siteDailyData.placeViews,
      uniqueVisitors: siteDailyData.uniqueVisitors,
      ctaPhone: siteDailyData.ctaPhone,
      ctaEmail: siteDailyData.ctaEmail,
      ctaWebsite: siteDailyData.ctaWebsite,
      ctaMaps: siteDailyData.ctaMaps,
    },
  });
} else {
  await prisma.analyticsDaily.create({
    data: {
      day: siteDailyData.day,
      siteId: siteDailyData.siteId,
      placeId: null,
      pageViews: siteDailyData.pageViews,
      placeViews: siteDailyData.placeViews,
      uniqueVisitors: siteDailyData.uniqueVisitors,
      ctaPhone: siteDailyData.ctaPhone,
      ctaEmail: siteDailyData.ctaEmail,
      ctaWebsite: siteDailyData.ctaWebsite,
      ctaMaps: siteDailyData.ctaMaps,
    },
  });
}
// some places
    for (const placeId of placeIds.slice(0, Math.min(placeIds.length, 25))) {
      const pv = Math.floor(10 + rand() * 120);
      await prisma.analyticsDaily.upsert({
        where: { day_siteId_placeId: { day, siteId, placeId } },
        update: {
          pageViews: pv,
          placeViews: pv,
          uniqueVisitors: Math.floor(pv * (0.6 + rand() * 0.25)),
          ctaPhone: Math.floor(rand() * 3),
          ctaEmail: Math.floor(rand() * 2),
          ctaWebsite: Math.floor(rand() * 5),
          ctaMaps: Math.floor(rand() * 6),
        },
        create: {
          day,
          siteId,
          placeId,
          pageViews: pv,
          placeViews: pv,
          uniqueVisitors: Math.floor(pv * (0.6 + rand() * 0.25)),
          ctaPhone: Math.floor(rand() * 3),
          ctaEmail: Math.floor(rand() * 2),
          ctaWebsite: Math.floor(rand() * 5),
          ctaMaps: Math.floor(rand() * 6),
        },
      });
    }
  }
}

async function ensureSubscriptionForSite(siteId: string, plan: SubscriptionPlan, seed: number) {
  const rand = rng(seed);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + Math.floor(15 + rand() * 180));
  return prisma.siteSubscription.upsert({
    where: { siteId },
    update: {
      plan,
      status: SubscriptionStatus.ACTIVE,
      validUntil,
      billingPeriod: rand() > 0.7 ? BillingPeriod.YEARLY : BillingPeriod.MONTHLY,
      priceCents: plan === "FREE" ? 0 : plan === "BASIC" ? 3990 : plan === "PRO" ? 8990 : 19990,
      currency: "HUF",
      statusChangedAt: new Date(),
      note: "Seeded subscription",
    },
    create: {
      siteId,
      plan,
      status: SubscriptionStatus.ACTIVE,
      validUntil,
      billingPeriod: rand() > 0.7 ? BillingPeriod.YEARLY : BillingPeriod.MONTHLY,
      priceCents: plan === "FREE" ? 0 : plan === "BASIC" ? 3990 : plan === "PRO" ? 8990 : 19990,
      currency: "HUF",
      statusChangedAt: new Date(),
      note: "Seeded subscription",
    },
  });
}

async function ensureSubscriptionForPlace(placeId: string, plan: SubscriptionPlan, seed: number) {
  const rand = rng(seed);
  const validUntil = new Date();
  validUntil.setDate(validUntil.getDate() + Math.floor(10 + rand() * 120));
  return prisma.placeSubscription.upsert({
    where: { placeId },
    update: {
      plan,
      status: SubscriptionStatus.ACTIVE,
      validUntil,
      billingPeriod: rand() > 0.75 ? BillingPeriod.YEARLY : BillingPeriod.MONTHLY,
      priceCents: plan === "FREE" ? 0 : plan === "BASIC" ? 1290 : plan === "PRO" ? 2990 : 6990,
      currency: "HUF",
      statusChangedAt: new Date(),
      note: "Seeded place subscription",
    },
    create: {
      placeId,
      plan,
      status: SubscriptionStatus.ACTIVE,
      validUntil,
      billingPeriod: rand() > 0.75 ? BillingPeriod.YEARLY : BillingPeriod.MONTHLY,
      priceCents: plan === "FREE" ? 0 : plan === "BASIC" ? 1290 : plan === "PRO" ? 2990 : 6990,
      currency: "HUF",
      statusChangedAt: new Date(),
      note: "Seeded place subscription",
    },
  });
}

// -------------------- seed content --------------------

type TownSeed = {
  name: string;
  center: { lat: number; lng: number };
};

type SiteSeed = {
  key: string;
  slug: string;
  langs: Lang[];
  nameByLang: Record<string, string>;
  center: { lat: number; lng: number };
  townName: string;
  townCenter: { lat: number; lng: number };
  /** Extra settlements under a multi-town régió (e.g. Etyek–Budai). */
  towns?: TownSeed[];
  placeCount: number;
};

const SITES: SiteSeed[] = [
  {
    key: "etyek",
    slug: "etyek-budai",
    langs: ["hu", "en", "de"],
    nameByLang: {
      hu: "Etyek–Budai Borvidék",
      en: "Etyek–Buda Wine Region",
      de: "Weinregion Etyek–Buda",
    },
    center: { lat: 47.4470, lng: 18.7480 },
    townName: "Etyek",
    townCenter: { lat: 47.4470, lng: 18.7480 },
    towns: [
      { name: "Etyek", center: { lat: 47.4470, lng: 18.7480 } },
      { name: "Budajenő", center: { lat: 47.5550, lng: 18.8040 } },
      { name: "Tök", center: { lat: 47.5480, lng: 18.7380 } },
    ],
    placeCount: 15,
  },
  {
    key: "balaton",
    slug: "balatonfelvidek",
    langs: ["hu", "en"],
    nameByLang: {
      hu: "Balaton-felvidék",
      en: "Balaton Highlands",
    },
    center: { lat: 46.95, lng: 17.85 },
    townName: "Balaton-felvidék",
    townCenter: { lat: 46.95, lng: 17.85 },
    placeCount: 35,
  },
  {
    key: "szeged",
    slug: "szeged",
    langs: ["hu"],
    nameByLang: {
      hu: "Szeged",
    },
    center: { lat: 46.2530, lng: 20.1414 },
    townName: "Szeged",
    townCenter: { lat: 46.2530, lng: 20.1414 },
    placeCount: 30,
  },
];

const CATEGORY_SETS = [
  { hu: "Borászat", en: "Winery", de: "Weingut", color: "#7c3aed" },
  { hu: "Vendéglátás", en: "Hospitality", de: "Gastronomie", color: "#0ea5e9" },
  { hu: "Szállás", en: "Accommodation", de: "Unterkunft", color: "#10b981" },
  { hu: "Látnivaló", en: "Attraction", de: "Sehenswürdigkeit", color: "#f59e0b" },
  { hu: "Szolgáltatás", en: "Service", de: "Dienstleistung", color: "#ef4444" },
  { hu: "Kézműves", en: "Craft", de: "Handwerk", color: "#a16207" },
  { hu: "Piac", en: "Market", de: "Markt", color: "#22c55e" },
  { hu: "Egészség", en: "Health", de: "Gesundheit", color: "#14b8a6" },
  { hu: "Kultúra", en: "Culture", de: "Kultur", color: "#6366f1" },
];

const TAG_SETS = [
  { hu: "Kóstoló", en: "Tasting", de: "Verkostung" },
  { hu: "Terasz", en: "Terrace", de: "Terrasse" },
  { hu: "Családbarát", en: "Family-friendly", de: "Familienfreundlich" },
  { hu: "Kutyabarát", en: "Dog-friendly", de: "Hundefreundlich" },
  { hu: "Parkolás", en: "Parking", de: "Parken" },
  { hu: "Kártyás fizetés", en: "Card payment", de: "Kartenzahlung" },
  { hu: "Akadálymentes", en: "Accessible", de: "Barrierefrei" },
];

const PRICE_BANDS = [
  { hu: "Megfizethető", en: "Affordable", de: "Günstig" },
  { hu: "Közepes", en: "Moderate", de: "Mittel" },
  { hu: "Prémium", en: "Premium", de: "Premium" },
  { hu: "Luxus", en: "Luxury", de: "Luxus" },
];

function placeTemplates(siteKey: string) {
  if (siteKey === "balaton") {
    return [
      ["Tihanyi Apátság", "Látnivaló"],
      ["Belső-tó Sétaút", "Látnivaló"],
      ["Levendula Ház", "Kultúra"],
      ["Balatonfüredi Tagore sétány", "Látnivaló"],
      ["Jókai Villa", "Kultúra"],
      ["Koloska-völgy", "Látnivaló"],
      ["Badacsonyi BorKert", "Borászat"],
      ["Szent György-hegy Kilátópont", "Látnivaló"],
      ["Tapolcai Tavasbarlang", "Látnivaló"],
      ["Káli-kő Tanösvény", "Látnivaló"],
      ["Kékkúti Ásványvíz Kóstoló", "Kézműves"],
      ["Balaton-felvidéki Sajtműhely", "Kézműves"],
      ["Panoráma Strand", "Látnivaló"],
      ["Szállás a Szőlőhegyen", "Szállás"],
      ["Vitorlás Klub", "Szolgáltatás"],
      ["Naplemente Bisztró", "Vendéglátás"],
      ["Kilátó Kávézó", "Vendéglátás"],
      ["Pincejárat", "Szolgáltatás"],
      ["Borút Információ", "Szolgáltatás"],
      ["Fűszerkert", "Kézműves"],
      ["Bazalt Hegy Túra", "Látnivaló"],
      ["Balaton Highland Hostel", "Szállás"],
      ["Borkóstoló Est", "Borászat"],
      ["Piknik Pont", "Vendéglátás"],
      ["Strand Büfé", "Vendéglátás"],
      ["Családi Apartman", "Szállás"],
      ["Kézműves Fagylaltozó", "Vendéglátás"],
      ["Kerékpárkölcsönző", "Szolgáltatás"],
      ["Helyi Termelői Piac", "Piac"],
      ["Panoráma Kilátó", "Látnivaló"],
      ["Szigligeti Vár", "Látnivaló"],
      ["Hegyi Zarándokút", "Látnivaló"],
      ["Vízparti Szauna", "Szolgáltatás"],
      ["Régiós Múzeum", "Kultúra"],
      ["Borkereskedés", "Borászat"],
    ];
  }
  // szeged
  return [
    ["Szegedi Dóm", "Kultúra"],
    ["Dóm tér", "Látnivaló"],
    ["Tisza-parti Sétány", "Látnivaló"],
    ["Szegedi Halászcsárda", "Vendéglátás"],
    ["Paprika Múzeum", "Kultúra"],
    ["Szegedi Nemzeti Színház", "Kultúra"],
    ["Reök-palota", "Kultúra"],
    ["Vadaspark", "Látnivaló"],
    ["Tudományegyetem", "Kultúra"],
    ["Klinikai Központ", "Egészség"],
    ["Retro Mozi", "Kultúra"],
    ["Tisza Fitness", "Szolgáltatás"],
    ["Napfény Coworking", "Szolgáltatás"],
    ["Szeged Barber", "Szolgáltatás"],
    ["Vegán Bistro", "Vendéglátás"],
    ["Paprika Street Food", "Vendéglátás"],
    ["Kávé & Könyv", "Vendéglátás"],
    ["Tisza Apartman", "Szállás"],
    ["Belvárosi Hotel", "Szállás"],
    ["Kézműves Sörfőzde", "Vendéglátás"],
    ["Szegedi Termelői Piac", "Piac"],
    ["Kerekes Kerékpárbolt", "Szolgáltatás"],
    ["Gyermekjátszóház", "Szolgáltatás"],
    ["Kreatív Műhely", "Kézműves"],
    ["Fűszerbolt", "Piac"],
    ["Nyelviskola", "Szolgáltatás"],
    ["Tisza Kajak Klub", "Szolgáltatás"],
    ["Szegedi Kézműves Csoki", "Kézműves"],
    ["Mangalica Deli", "Piac"],
    ["Éjszakai Jazz Bár", "Vendéglátás"],
  ];
}

function resolveCategoryKey(input: string) {
  // accept custom strings too
  const known = new Set(CATEGORY_SETS.map((c) => c.hu));
  if (known.has(input)) return input;
  // map some legacy
  if (input === "Élelmiszer termelő") return "Piac";
  return "Szolgáltatás";
}

function buildTranslations(langs: Lang[], baseName: string, baseDescHu: string) {
  const out: any[] = [];
  for (const lang of langs) {
    if (lang === "hu") {
      out.push({
        lang,
        name: baseName,
        shortDescription: `<p>${baseDescHu}</p>`,
        description: `<p><strong>${baseName}</strong> – ${baseDescHu} Részletek, nyitvatartás és friss információk a lapon.</p>`,
        address: `<p>${baseName}, ${lang === "hu" ? "Magyarország" : "Hungary"}</p>`,
        website: `https://example.com/${slugify(baseName)}`,
        openingHours: `<p>H–V: 10:00–18:00</p>`,
        seoTitle: `${baseName}`,
        seoDescription: `${baseName} – ${baseDescHu}`,
        seoKeywords: [slugify(baseName).replace(/-/g, " "), "helyi", "program"],
      });
    } else if (lang === "en") {
      out.push({
        lang,
        name: baseName,
        shortDescription: `<p>${baseDescHu.replace("helyi", "local")}</p>`,
        description: `<p><strong>${baseName}</strong> – A curated local spot. Details, opening hours, and tips.</p>`,
        address: `<p>${baseName}, Hungary</p>`,
        website: `https://example.com/${slugify(baseName)}`,
        openingHours: `<p>Mon–Sun: 10:00–18:00</p>`,
      });
    } else if (lang === "de") {
      out.push({
        lang,
        name: baseName,
        shortDescription: `<p>Ein lokaler Tipp in der Region.</p>`,
        description: `<p><strong>${baseName}</strong> – Informationen, Öffnungszeiten und Hinweise.</p>`,
        address: `<p>${baseName}, Ungarn</p>`,
      });
    }
  }
  return out;
}

function sample<T>(arr: T[], n: number, rand: () => number) {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    const idx = Math.floor(rand() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

async function clearAllData() {
  try {
    // First, count existing records to check if there's data to delete
    const counts = {
      events: await prisma.event.count({}),
      places: await prisma.place.count({}),
      sites: await prisma.site.count({}),
      users: await prisma.user.count({}),
      brands: await prisma.brand.count({}),
      slugs: await prisma.slug.count({}),
      siteKeys: await prisma.siteKey.count({}),
    };

    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    if (totalRecords === 0) {
      return;
    }

    // Use TRUNCATE CASCADE for faster and more reliable deletion
    // This will delete all data from all tables, respecting foreign key constraints
    const tables = [
      "AnalyticsDaily",
      "PlaceRating",
      "EventRating",
      "EventLog",
      "PushSubscription",
      "Gallery",
      "PlacePriceList",
      "PlaceOpeningHours",
      "PlaceTag",
      "EventTag",
      "EventCategory",
      "PlaceMembership",
      "SiteMembership",
      "UserSite",
      "PlaceSubscription",
      "SiteSubscription",
      "SubscriptionHistory",
      "SiteDomain",
      "SiteInstance",
      "Slug",
      "SiteKey",
      "EventTranslation",
      "Event",
      "PlaceTranslation",
      "Place",
      "TownTranslation",
      "Town",
      "CategoryTranslation",
      "Category",
      "TagTranslation",
      "Tag",
      "PriceBandTranslation",
      "PriceBand",
      "LegalPageTranslation",
      "LegalPage",
      "StaticPageTranslation",
      "StaticPage",
      "SiteTranslation",
      "Site",
      "User",
      "Brand",
      "AppSetting",
    ];

    // TRUNCATE CASCADE automatically handles foreign key constraints
    // No need to disable foreign key checks - CASCADE handles it
    let truncatedCount = 0;
    for (const table of tables) {
      try {
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        truncatedCount++;
      } catch (error: any) {
        // Table might not exist or might be empty, that's okay
        // Silently ignore table not found errors
      }
    }
  } catch (error: any) {
    throw error;
  }
}

async function main() {
  mustEnv("DATABASE_URL");

  // Clear all data before seeding
  await clearAllData();

  const brand = await ensureBrand("HelloLocal");

  // global superadmin
  const superadmin = await ensureUser({
    username: "admin",
    email: "super@example.com",
    password: "6DLzrjCBYutJcZyt7gwD",
    role: UserRole.superadmin,
    firstName: "Super",
    lastName: "Admin",
  });

  // App Settings
  await prisma.appSetting.upsert({
    where: { key: "defaultLanguage" },
    update: { value: "hu", type: "string", description: "Default language for the application" },
    create: { key: "defaultLanguage", value: "hu", type: "string", description: "Default language for the application" },
  });

  // Seed each site
  for (let sIdx = 0; sIdx < SITES.length; sIdx++) {
    const s = SITES[sIdx];
    const rand = rng(1000 + sIdx * 1337);

    // Determine site plan based on subscription
    const sitePlan: SitePlan = s.key === "szeged" ? "basic" : s.key === "balaton" ? "pro" : "business";

    const szegedListIntroHtml =
      "<p><strong>Szeged a napfény városa.</strong> A Tisza partján, a belváros tágas tereinek árnyékában és a paprikaillatú konyhákban mindig van mit felfedezni.</p><p>Böngéssz helyek és programok között — kávézók, múzeumok, teraszok és esti események egy helyen.</p>";

    const etyekLandingHtml =
      "<p><strong>Etyek–Budai borvidék.</strong> Pincék, manufaktúrák és falusi asztalok a budai hegyek nyugati oldalán.</p><p>Válassz települést, vagy nézd meg az egész régiót a térképen.</p>";

    const site = await ensureSite({
      slug: s.slug,
      brandId: brand.id,
      plan: sitePlan,
      translations: s.langs.map((lang) => ({
        lang,
        name: s.nameByLang[lang],
        shortDescription: `<p>${s.nameByLang[lang]} – seedelt demo tartalom.</p>`,
        description: `<p>Demo site a fejlesztéshez. Lokációk, események és analitika mintákkal.</p>`,
        heroImage: picsum(`${s.slug}-hero`, 1800, 900),
        ...(s.key === "szeged"
          ? {
              listIntroHtml: szegedListIntroHtml,
              listIntroImage: "/marketing/side-street.jpg",
            }
          : {}),
        ...(s.key === "etyek"
          ? {
              landingHtml:
                lang === "hu"
                  ? etyekLandingHtml
                  : `<p><strong>${s.nameByLang[lang]}.</strong> Cellars, workshops and village tables west of Buda.</p><p>Pick a settlement, or explore the whole region on the map.</p>`,
            }
          : {}),
        seoTitle: s.nameByLang[lang],
        seoDescription: `${s.nameByLang[lang]} – helyi felfedezés és programok.`,
        seoKeywords: [s.slug, "local", "places", "events"],
      })),
    });

    // ensure UserSite + SiteMembership links for superadmin
    await prisma.userSite.upsert({
      where: { userId_siteId: { userId: superadmin.id, siteId: site.id } },
      update: { isPrimary: sIdx === 0 },
      create: { userId: superadmin.id, siteId: site.id, isPrimary: sIdx === 0 },
    });
    await ensureSiteMembership(site.id, superadmin.id, "siteadmin");

    // owner + editor
    const owner = await ensureUser({
      username: `${s.key}_owner`,
      email: `${s.key}.owner@example.com`,
      password: "owner123",
      role: UserRole.admin,
      firstName: s.nameByLang.hu.split(" ")[0] ?? "Site",
      lastName: "Owner",
    });
    const editor = await ensureUser({
      username: `${s.key}_editor`,
      email: `${s.key}.editor@example.com`,
      password: "editor123",
      role: UserRole.editor,
      firstName: s.nameByLang.hu.split(" ")[0] ?? "Site",
      lastName: "Editor",
    });

    // connect users to site
    for (const u of [owner, editor]) {
      await prisma.userSite.upsert({
        where: { userId_siteId: { userId: u.id, siteId: site.id } },
        update: { isPrimary: false },
        create: { userId: u.id, siteId: site.id, isPrimary: false },
      });
    }
    await ensureSiteMembership(site.id, owner.id, "siteadmin");
    await ensureSiteMembership(site.id, editor.id, "editor");

    // Site keys (public) - create for ALL languages (hu, en, de) to ensure site is accessible via any language route
    const allLanguages: Lang[] = ["hu", "en", "de"];
    for (const lang of allLanguages) {
      await upsertSiteKey({ siteId: site.id, lang, slug: s.slug, isPrimary: true });
    }

    // Site instances - create for each translation language
    let isFirstInstance = true;
    for (const lang of s.langs) {
      await prisma.siteInstance.upsert({
        where: { siteId_lang: { siteId: site.id, lang } },
        update: { isDefault: isFirstInstance },
        create: {
          siteId: site.id,
          lang,
          isDefault: isFirstInstance,
          features: {
            isCrawlable: true,
            enableEvents: true,
            enableBlog: false,
            enableStaticPages: true,
          },
        },
      });
      isFirstInstance = false;
    }

    // Towns: multi-town régió (etyek) gets several settlements; Szeged-like sites stay single-town.
    const townSeeds: TownSeed[] = s.towns?.length
      ? s.towns
      : [{ name: s.townName, center: s.townCenter }];
    const townIdByName = new Map<string, string>();
    for (const townSeed of townSeeds) {
      const townId = await ensureTown({
        siteId: site.id,
        huName: townSeed.name,
        lat: townSeed.center.lat,
        lng: townSeed.center.lng,
        translations: s.langs.map((lang) => ({
          lang,
          name: townSeed.name,
          description:
            lang === "hu"
              ? `<p>${townSeed.name} – demó leírás, látnivalók és szolgáltatások.</p>`
              : `<p>${townSeed.name} – demo description.</p>`,
          heroImage: picsum(`${s.slug}-${slugify(townSeed.name)}-${lang}-town`, 1600, 900),
          seoTitle: townSeed.name,
          seoDescription: `${townSeed.name} – település oldal.`,
        })),
      });
      townIdByName.set(townSeed.name, townId);
      for (const lang of s.langs) {
        await upsertSlug({
          siteId: site.id,
          lang,
          slug: slugify(townSeed.name),
          entityType: "town",
          entityId: townId,
        });
      }
    }
    const defaultTownId = townIdByName.get(s.townName) || [...townIdByName.values()][0];

    const resolveTownIdForPlace = (addressHu?: string | null): string => {
      if (!addressHu || townIdByName.size <= 1) return defaultTownId;
      if (/Budajenő/i.test(addressHu)) return townIdByName.get("Budajenő") || defaultTownId;
      if (/\bTök\b/i.test(addressHu) || /Tökön/i.test(addressHu)) {
        return townIdByName.get("Tök") || defaultTownId;
      }
      return townIdByName.get("Etyek") || defaultTownId;
    };

    // categories / tags / pricebands
    const categories: Record<string, string> = {};
    for (const c of CATEGORY_SETS) {
      const huName = c.hu;
      const translations = s.langs.map((lang) => ({
        lang,
        name: (lang === "hu" ? c.hu : lang === "en" ? c.en : c.de) ?? c.hu,
        description: lang === "hu" ? `<p>${c.hu} kategória.</p>` : `<p>${(lang === "en" ? c.en : c.de) ?? c.hu} category.</p>`,
      }));
      categories[huName] = await ensureCategory({ siteId: site.id, huName, color: c.color, translations });
    }

    const tags: string[] = [];
    for (const t of TAG_SETS) {
      const huName = t.hu;
      const translations = s.langs.map((lang) => ({
        lang,
        name: (lang === "hu" ? t.hu : lang === "en" ? t.en : t.de) ?? t.hu,
      }));
      tags.push(await ensureTag({ siteId: site.id, huName, translations }));
    }

    const priceBands: string[] = [];
    for (const pb of PRICE_BANDS) {
      const huName = pb.hu;
      const translations = s.langs.map((lang) => ({
        lang,
        name: (lang === "hu" ? pb.hu : lang === "en" ? pb.en : pb.de) ?? pb.hu,
      }));
      priceBands.push(await ensurePriceBand({ siteId: site.id, huName, translations }));
    }

    // site subscription
    await ensureSubscriptionForSite(site.id, s.key === "szeged" ? "BASIC" : s.key === "balaton" ? "PRO" : "BUSINESS", 5000 + sIdx);

    // places
    const etyekPlaces = s.key === "etyek" ? ETYEK_PLACES : null;
    const templates = etyekPlaces
      ? etyekPlaces.map((place) => [place.hu.name, place.category] as [string, string])
      : placeTemplates(s.key);
    const placeIds: string[] = [];
    const placeIdByName = new Map<string, string>();

    for (let i = 0; i < templates.length; i++) {
      const [name, cat] = templates[i];
      const demo = etyekPlaces?.[i];
      const catKey = resolveCategoryKey(cat);
      const categoryId = categories[catKey] ?? categories["Szolgáltatás"];
      const bandId = priceBands[Math.floor(rand() * priceBands.length)];

      const pos = demo
        ? { lat: demo.lat, lng: demo.lng }
        : jitterLatLng(s.center.lat, s.center.lng, s.key === "balaton" ? 35 : 6, rand);

      const baseDescHu =
        s.key === "balaton"
          ? "balatoni kirándulóhely, panorámával és jó programokkal."
          : "szegedi ajánlott hely, hasznos információkkal és elérhetőségekkel.";

      // Determine place plan (randomly assign some places to basic/pro)
      const placePlan: PlacePlan = rand() > 0.7 ? (rand() > 0.5 ? "pro" : "basic") : "free";

      const placeTownId = resolveTownIdForPlace(demo?.hu?.address);
      const placeId = await ensurePlace({
        siteId: site.id,
        townId: placeTownId,
        huName: name,
        categoryId,
        isActive: true,
        plan: placePlan,
        heroImage: picsum(`${s.slug}-${slugify(name)}-hero`, 1600, 1000),
        lat: pos.lat,
        lng: pos.lng,
        priceBandId: bandId,
        ratingAvg: Math.round((3.6 + rand() * 1.4) * 10) / 10,
        ratingCount: Math.floor(5 + rand() * 120),
        tagIds: sample(tags, Math.floor(2 + rand() * 3), rand),
        translations: demo
          ? s.langs.map((lang) => {
              const copy = demo[lang];
              return {
                lang,
                name: copy.name,
                shortDescription: `<p>${copy.short}</p>`,
                description: copy.body,
                address: `<p>${copy.address}</p>`,
                phone: null,
                email: null,
                website: null,
                openingHours: `<p>${copy.hoursLabel}</p>`,
                seoTitle: copy.name,
                seoDescription: copy.short,
                seoKeywords: [copy.name, "Etyek", "Etyek-Buda"],
              };
            })
          : buildTranslations(s.langs, name, baseDescHu),
        extras: {
          capacity: Math.floor(10 + rand() * 140),
          foodAvailable: rand() > 0.5,
          accommodationAvailable: rand() > 0.75,
          services: sample(
            ["vezetett túra", "kóstoló", "workshop", "gyerek sarok", "csomagajánlat", "ajándékutalvány", "kiszállítás", "parkoló"],
            Math.floor(2 + rand() * 4),
            rand
          ),
        },
      });

      if (demo) await applyEtyekHours(prisma, placeId, demo.hours);
      placeIdByName.set(name, placeId);

      // slug per lang
      for (const lang of s.langs) {
        const slugName = demo ? demo[lang].name : name;
        await upsertSlug({ siteId: site.id, lang, slug: slugify(slugName), entityType: "place", entityId: placeId });
      }

      // owner membership for place
      await ensurePlaceMembership(placeId, owner.id, "owner");
      await ensurePlaceMembership(placeId, editor.id, "editor");

      // Create gallery (1 per place)
      const imgCount = s.key === "szeged" ? 4 : 6;
      const images = Array.from({ length: imgCount }).map((_, idx) => {
        const imgSeed = `${s.slug}-${slugify(name)}-${idx + 1}`;
        return {
          src: picsum(imgSeed, 1600, 1000),
          thumbSrc: picsum(imgSeed, 600, 400),
          alt: name,
          caption: idx === 0 ? `${name} – hangulatkép` : `${name} – kép ${idx + 1}`,
        };
      });
      await ensureGalleryForPlace({
        siteId: site.id,
        placeId,
        name: `${name} – galéria`,
        images,
        layout: rand() > 0.7 ? "carousel" : "grid",
      });

      // price list on some places
      if (!demo && rand() > 0.55) {
        await ensurePriceList({
          placeId,
          currency: "HUF",
          blocks: [
            {
              title: "Alap ajánlatok",
              items: [
                { label: "Belépő / kóstoló", price: Math.floor(1500 + rand() * 4000) },
                { label: "Családi csomag", price: Math.floor(6000 + rand() * 12000), note: "2 felnőtt + 1 gyerek" },
                { label: "Ajándékutalvány", price: Math.floor(5000 + rand() * 15000) },
              ],
            },
            {
              title: "Extra",
              items: [
                { label: "Privát vezetés", price: Math.floor(9000 + rand() * 22000) },
                { label: "Kóstoló tál", price: Math.floor(2500 + rand() * 6500) },
              ],
            },
          ],
          note: "<p>Az árak tájékoztató jellegűek (seedelt demo).</p>",
          isEnabled: true,
        });
      }

      // place subscription on some
      if (rand() > 0.7) {
        await ensureSubscriptionForPlace(placeId, rand() > 0.5 ? "PRO" : "BASIC", 8000 + i + sIdx * 100);
      }

      // event log
      await log(site.id, owner.id, "create", "place", placeId, `Place created: ${name}`, { seed: true });
      if (rand() > 0.6) {
        await log(site.id, editor.id, "update", "place", placeId, `Updated details for ${name}`, { fields: ["description", "heroImage"] });
      }

      placeIds.push(placeId);
    }

    // Seed some events (5-10 per site). Etyek uses the curated Saturday programme.
    const eventCount = s.key === "balaton" ? 12 : 8;
    if (s.key === "etyek") {
      for (let e = 0; e < ETYEK_EVENTS.length; e++) {
        const programme = ETYEK_EVENTS[e];
        const placeId = placeIdByName.get(programme.place) ?? null;
        const { start, end } = upcomingSaturday(programme.week, programme.hour, programme.duration);
        const existingEvent = await prisma.event.findFirst({
          where: {
            siteId: site.id,
            translations: { some: { lang: "hu", title: programme.hu.title } },
          },
          select: { id: true },
        });
        const eventId =
          existingEvent?.id ??
          (
            await prisma.event.create({
              data: {
                siteId: site.id,
                placeId,
                isActive: true,
                isPinned: Boolean(programme.pinned),
                isRainSafe: Boolean(programme.rainSafe),
                showOnMap: true,
                startDate: start,
                endDate: end,
                heroImage: picsum(`${s.slug}-event-${slugify(programme.hu.title)}`, 1600, 900),
                translations: {
                  create: s.langs.map((lang) => {
                    const copy = programme[lang];
                    return {
                      lang,
                      title: copy.title,
                      shortDescription: copy.short,
                      description: copy.body,
                      seoTitle: copy.title,
                      seoDescription: copy.short,
                      seoKeywords: [],
                    };
                  }),
                },
              },
              select: { id: true },
            })
          ).id;
        if (existingEvent) {
          await prisma.event.update({
            where: { id: eventId },
            data: {
              placeId,
              isActive: true,
              isPinned: Boolean(programme.pinned),
              isRainSafe: Boolean(programme.rainSafe),
              showOnMap: true,
              startDate: start,
              endDate: end,
            },
          });
          for (const lang of s.langs) {
            const copy = programme[lang];
            await prisma.eventTranslation.upsert({
              where: { eventId_lang: { eventId, lang } },
              update: {
                title: copy.title,
                shortDescription: copy.short,
                description: copy.body,
                seoTitle: copy.title,
                seoDescription: copy.short,
              },
              create: {
                eventId,
                lang,
                title: copy.title,
                shortDescription: copy.short,
                description: copy.body,
                seoTitle: copy.title,
                seoDescription: copy.short,
                seoKeywords: [],
              },
            });
          }
        }
        for (const lang of s.langs) {
          await upsertSlug({
            siteId: site.id,
            lang,
            slug: slugify(programme[lang].title),
            entityType: "event",
            entityId: eventId,
          });
        }
        if (!existingEvent) {
          await log(site.id, owner.id, "create", "event", eventId, `Event created: ${programme.hu.title}`, { placeId });
        }
      }
    }
    for (let e = 0; e < eventCount && s.key !== "etyek"; e++) {
      const placeId = placeIds[Math.floor(rand() * placeIds.length)];
      const startsInDays = Math.floor(-20 + rand() * 60);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + startsInDays);
      startDate.setHours(10 + Math.floor(rand() * 8), 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 3);

      const eventNameHu = s.key === "szeged" ? "Közösségi program" : "Kóstoló / túra";
      const eventTitle = `${eventNameHu}: ${e + 1}`;
      
      // Generate unique slug for this event
      const baseSlug = slugify(eventTitle);
      const eventSlugBase = `${baseSlug}-${e + 1}`;

      // Check if event with this title already exists for this site (to avoid duplicates on re-seed)
      // We check by title in Hungarian translation to avoid duplicates
      const existingEvent = await prisma.event.findFirst({
        where: {
          siteId: site.id,
          translations: {
            some: {
              lang: "hu",
              title: eventTitle,
            },
          },
        },
        select: { id: true },
      });

      let eventId: string;
      if (existingEvent) {
        // Event already exists, use existing ID
        eventId = existingEvent.id;
      } else {
        // Create new event
        const created = await prisma.event.create({
          data: {
            siteId: site.id,
            placeId,
            isActive: true,
            isPinned: rand() > 0.85,
            isRainSafe: rand() > 0.5,
            showOnMap: true,
            startDate,
            endDate,
            heroImage: picsum(`${s.slug}-event-${e + 1}`, 1600, 900),
            translations: {
              create: s.langs.map((lang) => ({
                lang,
                title: lang === "hu" ? eventTitle : lang === "en" ? `Event: ${e + 1}` : `Event: ${e + 1}`,
                shortDescription: lang === "hu" ? "Rövid programleírás (demo)." : "Short event description (demo).",
                description: lang === "hu" ? "<p>Demo esemény leírás, részletekkel.</p>" : "<p>Demo event details.</p>",
                seoTitle: lang === "hu" ? eventTitle : null,
                seoDescription: lang === "hu" ? "Demo esemény" : null,
                seoKeywords: [],
              })),
            },
          },
          select: { id: true },
        });
        eventId = created.id;
      }

      // Create/update slugs for event in all languages (ensure they point to the correct event)
      for (const lang of s.langs) {
        const eventSlug = `${baseSlug}-${e + 1}`;
        await upsertSlug({ siteId: site.id, lang, slug: eventSlug, entityType: "event", entityId: eventId });
      }

      if (!existingEvent) {
        await log(site.id, owner.id, "create", "event", eventId, `Event created: ${eventTitle}`, { placeId });
      }
    }

    if (s.key === "etyek") {
      await applyEtyekSample(prisma);
    }

    // analytics
    await seedAnalytics(site.id, placeIds, 45, 9000 + sIdx * 999);

  }

  console.log("✅ Seed completed");
  console.log("👤 Credentials:");
  console.log("- superadmin: super@example.com / 6DLzrjCBYutJcZyt7gwD");
  console.log("- etyek owner: etyek.owner@example.com / owner123");
  console.log("- etyek editor: etyek.editor@example.com / editor123");
  console.log("- balaton owner: balaton.owner@example.com / owner123");
  console.log("- balaton editor: balaton.editor@example.com / editor123");
  console.log("- szeged owner: szeged.owner@example.com / owner123");
  console.log("- szeged editor: szeged.editor@example.com / editor123");
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

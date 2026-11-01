#!/usr/bin/env tsx
/**
 * Safe upsert: real Etyek–Budai places + Wikimedia Commons images for site slug `etyek-budai`.
 *
 * Does NOT run prisma db seed / migrate reset / TRUNCATE.
 *
 * Local (default):
 *   cd apps/api && pnpm db:bootstrap:etyek-real
 *
 * Dry run:
 *   DRY_RUN=1 pnpm db:bootstrap:etyek-real
 *
 * Live / non-local DATABASE_URL (requires BOTH):
 *   REQUIRE_LIVE_CONFIRM=yes CONFIRM_SITE_SLUG=etyek-budai pnpm db:bootstrap:etyek-real
 *
 * Optional:
 *   SKIP_DEACTIVATE_SEED=1  — do not soft-deactivate known seed place names
 *   SITE_SLUG=etyek-budai   — override target site (still must match CONFIRM_SITE_SLUG on live)
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  ETYEK_REAL_PLACES,
  ETYEK_SEED_PLACE_NAMES_HU,
  type CommonsImage,
  type Hours,
  type PlaceCopy,
  type RealPlace,
} from "../prisma/etyek-real-places";

const TARGET_SITE_SLUG = process.env.SITE_SLUG?.trim() || "etyek-budai";
const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
const SKIP_DEACTIVATE = process.env.SKIP_DEACTIVATE_SEED === "1";
const LANGS = ["hu", "en", "de"] as const;

function slugify(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function isLocalDatabaseUrl(url: string): boolean {
  try {
    const u = new URL(url);
    const host = (u.hostname || "").toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "0.0.0.0";
  } catch {
    return /@localhost[:/]|@127\.0\.0\.1[:/]|@\[::1\][:/]/.test(url);
  }
}

function assertSafety(databaseUrl: string) {
  if (isLocalDatabaseUrl(databaseUrl)) {
    console.log("✓ DATABASE_URL looks local — live confirm not required");
    return;
  }
  const confirm = process.env.REQUIRE_LIVE_CONFIRM?.trim().toLowerCase();
  const confirmSlug = process.env.CONFIRM_SITE_SLUG?.trim();
  if (confirm !== "yes" || confirmSlug !== TARGET_SITE_SLUG) {
    throw new Error(
      [
        "Refusing to run against a non-local DATABASE_URL.",
        "This script upserts places on the target site and soft-deactivates seed demos.",
        "For live, set BOTH:",
        `  REQUIRE_LIVE_CONFIRM=yes`,
        `  CONFIRM_SITE_SLUG=${TARGET_SITE_SLUG}`,
        "Never use prisma db seed / db:reset / TRUNCATE on live for this job.",
      ].join("\n")
    );
  }
  console.log(`⚠ Non-local DATABASE_URL — confirmed with REQUIRE_LIVE_CONFIRM + CONFIRM_SITE_SLUG=${confirmSlug}`);
}

function creditCaption(image: CommonsImage): string {
  return `${image.credit} (${image.license}) · ${image.sourcePage}`;
}

function copyFor(place: RealPlace, lang: (typeof LANGS)[number]): PlaceCopy {
  return place[lang];
}

async function applyHours(prisma: PrismaClient, placeId: string, hours: Hours) {
  for (let day = 0; day < 7; day += 1) {
    const isClosed = hours.closed.includes(day);
    await prisma.placeOpeningHours.upsert({
      where: { placeId_dayOfWeek: { placeId, dayOfWeek: day } },
      update: {
        isClosed,
        openTime: isClosed ? null : hours.open,
        closeTime: isClosed ? null : hours.close,
      },
      create: {
        placeId,
        dayOfWeek: day,
        isClosed,
        openTime: isClosed ? null : hours.open,
        closeTime: isClosed ? null : hours.close,
      },
    });
  }
}

async function ensurePrimarySlug(
  prisma: PrismaClient,
  siteId: string,
  lang: string,
  placeId: string,
  slug: string
) {
  await prisma.slug.updateMany({
    where: { siteId, lang, entityType: "place", entityId: placeId, isPrimary: true, NOT: { slug } },
    data: { isPrimary: false },
  });
  await prisma.slug.upsert({
    where: { siteId_lang_slug: { siteId, lang, slug } },
    update: { entityType: "place", entityId: placeId, isPrimary: true, isActive: true },
    create: {
      siteId,
      lang,
      slug,
      entityType: "place",
      entityId: placeId,
      isPrimary: true,
      isActive: true,
    },
  });
}

async function resolveCategoryId(prisma: PrismaClient, siteId: string, categoryHu: string): Promise<string> {
  const row = await prisma.category.findFirst({
    where: {
      siteId,
      kind: "place",
      translations: { some: { lang: "hu", name: categoryHu } },
    },
    select: { id: true },
  });
  if (row) return row.id;

  const fallback = await prisma.category.findFirst({
    where: { siteId, kind: "place", isActive: true },
    orderBy: { order: "asc" },
    select: { id: true, translations: { where: { lang: "hu" }, select: { name: true } } },
  });
  if (!fallback) {
    throw new Error(`No place categories on site ${siteId}; cannot assign "${categoryHu}"`);
  }
  console.warn(
    `  ⚠ Category "${categoryHu}" missing — using "${fallback.translations[0]?.name || fallback.id}"`
  );
  return fallback.id;
}

async function resolveTownId(prisma: PrismaClient, siteId: string): Promise<string> {
  const etyek = await prisma.town.findFirst({
    where: {
      siteId,
      translations: { some: { lang: "hu", name: "Etyek" } },
    },
    select: { id: true },
  });
  if (etyek) return etyek.id;

  const any = await prisma.town.findFirst({ where: { siteId }, select: { id: true } });
  if (!any) throw new Error(`Site ${siteId} has no towns — create a town first`);
  console.warn("  ⚠ Town named Etyek not found — using first town on site");
  return any.id;
}

function withGalleryShortcode(html: string, galleryId: string): string {
  const tag = `[gallery id="${galleryId}"]`;
  if (html.includes(tag)) return html;
  // Drop any previous gallery shortcodes for this place description
  const cleaned = html.replace(/\[gallery\s+id="[^"]+"\]/g, "").trim();
  return `${cleaned}\n${tag}`;
}

async function upsertRealPlace(
  prisma: PrismaClient,
  args: {
    siteId: string;
    townId: string;
    categoryId: string;
    place: RealPlace;
  }
) {
  const { siteId, townId, categoryId, place } = args;
  const huName = place.hu.name;

  let existing = await prisma.place.findFirst({
    where: { siteId, translations: { some: { lang: "hu", name: huName } } },
    select: { id: true },
  });

  // Also match by stable extras.bootstrapKey if renamed
  if (!existing) {
    const byKey = await prisma.place.findFirst({
      where: {
        siteId,
        extras: { path: ["bootstrapKey"], equals: place.key },
      },
      select: { id: true },
    });
    existing = byKey;
  }

  const imageCredits = [place.hero, place.mapImage, ...place.gallery]
    .filter(Boolean)
    .map((img) => ({
      url: (img as CommonsImage).url,
      credit: (img as CommonsImage).credit,
      license: (img as CommonsImage).license,
      sourcePage: (img as CommonsImage).sourcePage,
    }));

  const extras = {
    bootstrapKey: place.key,
    bootstrapSource: "db:bootstrap:etyek-real",
    imageCredits,
  };

  const heroImage = place.hero.url;
  const mapImage = place.mapImage?.url ?? null;

  let placeId: string;
  if (!existing) {
    if (DRY_RUN) {
      console.log(`  [dry-run] would CREATE place "${huName}"`);
      return { placeId: "dry-run", created: true };
    }
    const created = await prisma.place.create({
      data: {
        siteId,
        townId,
        categoryId,
        isActive: true,
        plan: "basic",
        heroImage,
        mapImage,
        lat: place.lat,
        lng: place.lng,
        extras,
        translations: {
          create: LANGS.map((lang) => {
            const c = copyFor(place, lang);
            return {
              lang,
              name: c.name,
              shortDescription: `<p>${c.short}</p>`,
              description: c.body,
              address: c.address,
              phone: place.phone ?? null,
              email: place.email ?? null,
              website: place.website ?? null,
              openingHours: `<p>${c.hoursLabel}</p>`,
              seoTitle: c.name,
              seoDescription: c.short,
              seoImage: heroImage,
              seoKeywords: [c.name, "Etyek", "Etyek-Buda", "borvidék"],
            };
          }),
        },
      },
      select: { id: true },
    });
    placeId = created.id;
    console.log(`  ✓ created "${huName}" (${placeId})`);
  } else {
    placeId = existing.id;
    if (DRY_RUN) {
      console.log(`  [dry-run] would UPDATE place "${huName}" (${placeId})`);
      return { placeId, created: false };
    }
    await prisma.place.update({
      where: { id: placeId },
      data: {
        townId,
        categoryId,
        isActive: true,
        heroImage,
        mapImage,
        lat: place.lat,
        lng: place.lng,
        extras,
        plan: "basic",
      },
    });
    for (const lang of LANGS) {
      const c = copyFor(place, lang);
      await prisma.placeTranslation.upsert({
        where: { placeId_lang: { placeId, lang } },
        update: {
          name: c.name,
          shortDescription: `<p>${c.short}</p>`,
          description: c.body,
          address: c.address,
          phone: place.phone ?? null,
          email: place.email ?? null,
          website: place.website ?? null,
          openingHours: `<p>${c.hoursLabel}</p>`,
          seoTitle: c.name,
          seoDescription: c.short,
          seoImage: heroImage,
          seoKeywords: [c.name, "Etyek", "Etyek-Buda", "borvidék"],
        },
        create: {
          placeId,
          lang,
          name: c.name,
          shortDescription: `<p>${c.short}</p>`,
          description: c.body,
          address: c.address,
          phone: place.phone ?? null,
          email: place.email ?? null,
          website: place.website ?? null,
          openingHours: `<p>${c.hoursLabel}</p>`,
          seoTitle: c.name,
          seoDescription: c.short,
          seoImage: heroImage,
          seoKeywords: [c.name, "Etyek", "Etyek-Buda", "borvidék"],
        },
      });
    }
    console.log(`  ✓ updated "${huName}" (${placeId})`);
  }

  await applyHours(prisma, placeId, place.hours);

  for (const lang of LANGS) {
    await ensurePrimarySlug(prisma, siteId, lang, placeId, slugify(copyFor(place, lang).name));
  }

  const galleryName = `${place.hu.name} – galéria`;
  const galleryImages = place.gallery.map((g, idx) => ({
    id: `${place.key}-g${idx + 1}`,
    src: g.url,
    thumbSrc: g.thumbUrl || g.url,
    alt: g.alt,
    caption: creditCaption(g),
    width: undefined,
    height: undefined,
  }));

  let gallery = await prisma.gallery.findFirst({
    where: { siteId, placeId, name: galleryName },
    select: { id: true },
  });
  if (!gallery) {
    gallery = await prisma.gallery.findFirst({
      where: { siteId, placeId, name: { contains: place.hu.name } },
      select: { id: true },
    });
  }

  if (!gallery) {
    gallery = await prisma.gallery.create({
      data: {
        siteId,
        placeId,
        name: galleryName,
        images: galleryImages as any,
        layout: "grid",
        columns: { base: 2, md: 3, lg: 4 } as any,
        aspect: "auto",
        isActive: true,
      },
      select: { id: true },
    });
  } else {
    await prisma.gallery.update({
      where: { id: gallery.id },
      data: {
        name: galleryName,
        images: galleryImages as any,
        isActive: true,
      },
    });
  }

  // Embed gallery shortcode in HU/EN/DE descriptions (public PlaceDetail reads [gallery id="…"])
  for (const lang of LANGS) {
    const tr = await prisma.placeTranslation.findUnique({
      where: { placeId_lang: { placeId, lang } },
      select: { description: true },
    });
    const next = withGalleryShortcode(tr?.description || copyFor(place, lang).body, gallery.id);
    await prisma.placeTranslation.update({
      where: { placeId_lang: { placeId, lang } },
      data: { description: next },
    });
  }

  return { placeId, created: !existing };
}

async function softDeactivateSeedPlaces(prisma: PrismaClient, siteId: string) {
  if (SKIP_DEACTIVATE) {
    console.log("⏭ SKIP_DEACTIVATE_SEED=1 — leaving seed places as-is");
    return { deactivated: 0 };
  }

  const placeSelect = {
    id: true,
    heroImage: true,
    mapImage: true,
    isActive: true,
    translations: { where: { lang: "hu" as const }, select: { name: true } },
  };

  const places = await prisma.place.findMany({
    where: {
      siteId,
      translations: { some: { lang: "hu", name: { in: ETYEK_SEED_PLACE_NAMES_HU } } },
    },
    select: placeSelect,
  });

  // Also catch leftover picsum stock URLs
  const picsumExtras = await prisma.place.findMany({
    where: {
      siteId,
      OR: [{ heroImage: { contains: "picsum.photos" } }, { mapImage: { contains: "picsum.photos" } }],
    },
    select: placeSelect,
  });

  const byId = new Map<string, (typeof places)[number]>();
  for (const p of [...places, ...picsumExtras]) byId.set(p.id, p);

  // Do not deactivate the real places we just upserted
  const realNames = new Set(ETYEK_REAL_PLACES.map((p) => p.hu.name));
  const targets = [...byId.values()].filter((p) => !realNames.has(p.translations[0]?.name || ""));

  if (DRY_RUN) {
    console.log(`[dry-run] would soft-deactivate ${targets.length} seed/picsum place(s):`);
    for (const p of targets) console.log(`  - ${p.translations[0]?.name || p.id}`);
    return { deactivated: targets.length };
  }

  let deactivated = 0;
  for (const p of targets) {
    const clearPicsum =
      !!p.heroImage?.includes("picsum.photos") || !!p.mapImage?.includes("picsum.photos");
    if (!p.isActive && !clearPicsum) continue;

    await prisma.place.update({
      where: { id: p.id },
      data: {
        isActive: false,
        ...(clearPicsum ? { heroImage: null, mapImage: null } : {}),
      },
    });
    await prisma.gallery.updateMany({
      where: { placeId: p.id, siteId },
      data: { isActive: false },
    });
    await prisma.slug.updateMany({
      where: { siteId, entityType: "place", entityId: p.id },
      data: { isActive: false },
    });
    console.log(`  ✓ deactivated seed "${p.translations[0]?.name || p.id}"`);
    deactivated += 1;
  }
  return { deactivated };
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  assertSafety(databaseUrl);

  console.log(`Target site slug: ${TARGET_SITE_SLUG}`);
  console.log(`Places to upsert: ${ETYEK_REAL_PLACES.map((p) => p.hu.name).join(", ")}`);
  if (DRY_RUN) console.log("DRY_RUN=1 — no writes");

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    const site = await prisma.site.findFirst({
      where: { slug: TARGET_SITE_SLUG },
      select: { id: true, slug: true, isActive: true },
    });
    if (!site) {
      throw new Error(
        `Site slug "${TARGET_SITE_SLUG}" not found. Create/activate the site first (do not full-seed live).`
      );
    }
    console.log(`Site: ${site.slug} (${site.id}) active=${site.isActive}`);

    const townId = await resolveTownId(prisma, site.id);

    let upserted = 0;
    for (const place of ETYEK_REAL_PLACES) {
      const categoryId = await resolveCategoryId(prisma, site.id, place.categoryHu);
      await upsertRealPlace(prisma, { siteId: site.id, townId, categoryId, place });
      upserted += 1;
    }

    const { deactivated } = await softDeactivateSeedPlaces(prisma, site.id);

    console.log("");
    console.log("Done.");
    console.log(`  upserted: ${upserted}`);
    console.log(`  seed soft-deactivated: ${deactivated}`);
    console.log("");
    console.log("Residual manual steps:");
    console.log("  - Verify opening hours / phones with each venue before marketing.");
    console.log("  - Optionally replace Commons heroes with venue-supplied photos via admin (Cloudinary upload → paste URL into hero).");
    console.log("  - OG/social: place detail uses seoImage || heroImage (already set to Commons HTTPS URLs).");
    console.log("  - Do NOT run db:seed / db:reset on live.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

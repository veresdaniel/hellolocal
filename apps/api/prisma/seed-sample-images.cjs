/**
 * Fill missing hero / card / map (and related) image fields with stable
 * public marketing assets. Only writes when the column is null or blank —
 * never overwrites an existing URL.
 *
 * Usage (from apps/api):
 *   node prisma/seed-sample-images.cjs
 *   DATABASE_URL=... node prisma/seed-sample-images.cjs
 */
"use strict";

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const SAMPLES = [
  "/marketing/side-street.webp",
  "/marketing/craft-workshop.webp",
  "/marketing/local-service.webp",
  "/marketing/visitor-hiker.webp",
  "/marketing/map-szeged.webp",
];

const SHARE = "/marketing/hellolocal-share.jpg";

function blank(value) {
  return value == null || String(value).trim() === "";
}

function pick(key, offset = 0) {
  let hash = 0;
  const s = String(key || "x");
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return SAMPLES[(hash + offset) % SAMPLES.length];
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  const summary = {
    placeHero: 0,
    placeCard: 0,
    placeMap: 0,
    eventHero: 0,
    siteHero: 0,
    siteListIntro: 0,
    siteSeo: 0,
    townHero: 0,
    townSeo: 0,
    collectionHero: 0,
    collectionSeo: 0,
    collectionItemImage: 0,
  };

  try {
    const places = await prisma.place.findMany({
      select: { id: true, heroImage: true, cardImage: true, mapImage: true },
    });
    for (const place of places) {
      const data = {};
      if (blank(place.heroImage)) {
        data.heroImage = pick(place.id, 0);
        summary.placeHero += 1;
      }
      const hero = data.heroImage || place.heroImage;
      if (blank(place.cardImage)) {
        data.cardImage = blank(hero) ? pick(place.id, 1) : hero;
        summary.placeCard += 1;
      }
      const card = data.cardImage || place.cardImage;
      if (blank(place.mapImage)) {
        data.mapImage = blank(card) ? pick(place.id, 2) : card;
        summary.placeMap += 1;
      }
      if (Object.keys(data).length) {
        await prisma.place.update({ where: { id: place.id }, data });
      }
    }

    const events = await prisma.event.findMany({
      select: { id: true, heroImage: true },
    });
    for (const event of events) {
      if (!blank(event.heroImage)) continue;
      await prisma.event.update({
        where: { id: event.id },
        data: { heroImage: pick(event.id, 0) },
      });
      summary.eventHero += 1;
    }

    const siteRows = await prisma.siteTranslation.findMany({
      select: { id: true, heroImage: true, listIntroImage: true, seoImage: true },
    });
    for (const row of siteRows) {
      const data = {};
      if (blank(row.heroImage)) {
        data.heroImage = pick(row.id, 0);
        summary.siteHero += 1;
      }
      if (blank(row.listIntroImage)) {
        data.listIntroImage = data.heroImage || row.heroImage || pick(row.id, 1);
        summary.siteListIntro += 1;
      }
      if (blank(row.seoImage)) {
        data.seoImage = data.heroImage || row.heroImage || SHARE;
        summary.siteSeo += 1;
      }
      if (Object.keys(data).length) {
        await prisma.siteTranslation.update({ where: { id: row.id }, data });
      }
    }

    const townRows = await prisma.townTranslation.findMany({
      select: { id: true, heroImage: true, seoImage: true },
    });
    for (const row of townRows) {
      const data = {};
      if (blank(row.heroImage)) {
        data.heroImage = pick(row.id, 0);
        summary.townHero += 1;
      }
      if (blank(row.seoImage)) {
        data.seoImage = data.heroImage || row.heroImage || SHARE;
        summary.townSeo += 1;
      }
      if (Object.keys(data).length) {
        await prisma.townTranslation.update({ where: { id: row.id }, data });
      }
    }

    const collections = await prisma.collectionTranslation.findMany({
      select: { id: true, heroImage: true, seoImage: true },
    });
    for (const row of collections) {
      const data = {};
      if (blank(row.heroImage)) {
        data.heroImage = pick(row.id, 0);
        summary.collectionHero += 1;
      }
      if (blank(row.seoImage)) {
        data.seoImage = data.heroImage || row.heroImage || SHARE;
        summary.collectionSeo += 1;
      }
      if (Object.keys(data).length) {
        await prisma.collectionTranslation.update({ where: { id: row.id }, data });
      }
    }

    const items = await prisma.collectionItemTranslation.findMany({
      select: { id: true, imageOverride: true },
    });
    for (const row of items) {
      if (!blank(row.imageOverride)) continue;
      await prisma.collectionItemTranslation.update({
        where: { id: row.id },
        data: { imageOverride: pick(row.id, 0) },
      });
      summary.collectionItemImage += 1;
    }

    console.log("sample-images seed complete:", summary);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

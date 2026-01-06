"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
async function main() {
    const tenantSlug = process.env.DEFAULT_TENANT_SLUG ?? "etyek-budai";
    const tenant = await prisma.tenant.upsert({
        where: { slug: tenantSlug },
        update: {},
        create: {
            slug: tenantSlug,
            isActive: true,
            translations: {
                create: [
                    {
                        lang: "hu",
                        name: "Etyek–Budai Borvidék",
                        shortDescription: "<p>Rövid bemutató…</p>",
                        seoTitle: "Etyek–Budai Borvidék",
                        seoDescription: "Fedezd fel az Etyek–Budai borvidéket.",
                        seoKeywords: ["etyek", "borvidék", "borászat"],
                    },
                    {
                        lang: "en",
                        name: "Etyek–Buda Wine Region",
                        shortDescription: "<p>Short intro…</p>",
                        seoTitle: "Etyek–Buda Wine Region",
                        seoDescription: "Discover the Etyek–Buda wine region.",
                        seoKeywords: ["wine region", "etyek", "wineries"],
                    },
                    {
                        lang: "de",
                        name: "Weinregion Etyek–Buda",
                        shortDescription: "<p>Kurzbeschreibung…</p>",
                        seoTitle: "Weinregion Etyek–Buda",
                        seoDescription: "Entdecke die Weinregion Etyek–Buda.",
                        seoKeywords: ["Weinregion", "Etyek", "Weingüter"],
                    },
                ],
            },
        },
    });
    const town = await prisma.town.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug: "etyek" } },
        update: {},
        create: {
            tenantId: tenant.id,
            slug: "etyek",
            isActive: true,
            translations: {
                create: [
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
            },
        },
    });
    await prisma.place.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug: "hernak-estate" } },
        update: {},
        create: {
            tenantId: tenant.id,
            townId: town.id,
            slug: "hernak-estate",
            category: "winery",
            isActive: true,
            heroImage: "https://picsum.photos/seed/hernak/1200/800",
            gallery: [
                "https://picsum.photos/seed/hernak1/1200/800",
                "https://picsum.photos/seed/hernak2/1200/800",
            ],
            lat: 47.447,
            lng: 18.748,
            priceBand: "premium",
            tags: ["kóstoló", "terasz"],
            ratingAvg: 4.6,
            ratingCount: 18,
            extras: {
                capacity: 40,
                foodAvailable: true,
                accommodationAvailable: false,
                services: ["szabad szavas extra szolgáltatás"],
            },
            translations: {
                create: [
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
            },
        },
    });
    // Legal pages (privacy as an example)
    await prisma.legalPage.upsert({
        where: { tenantId_key: { tenantId: tenant.id, key: "privacy" } },
        update: {},
        create: {
            tenantId: tenant.id,
            key: "privacy",
            isActive: true,
            translations: {
                create: [
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
            },
        },
    });
    console.log("✅ Seed completed");
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
-- Product catalog for a site. Prices and images, no checkout.
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "placeId" TEXT,
    "price" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'HUF',
    "imageUrl" TEXT,
    "category" TEXT NOT NULL DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "ProductTranslation" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ProductTranslation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Product_siteId_isActive_sortOrder_idx" ON "Product"("siteId", "isActive", "sortOrder");
CREATE INDEX IF NOT EXISTS "Product_siteId_category_idx" ON "Product"("siteId", "category");
CREATE INDEX IF NOT EXISTS "Product_placeId_idx" ON "Product"("placeId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductTranslation_productId_lang_key" ON "ProductTranslation"("productId", "lang");
CREATE INDEX IF NOT EXISTS "ProductTranslation_productId_idx" ON "ProductTranslation"("productId");

ALTER TABLE "Product" ADD CONSTRAINT "Product_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductTranslation" ADD CONSTRAINT "ProductTranslation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

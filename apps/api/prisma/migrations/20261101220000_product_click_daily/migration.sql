-- Daily product click totals. NULLS NOT DISTINCT keeps a single row when placeId is null.
CREATE TABLE "ProductClickDaily" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "siteId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "placeId" TEXT,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductClickDaily_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductClickDaily_siteId_day_idx" ON "ProductClickDaily"("siteId", "day");
CREATE INDEX "ProductClickDaily_productId_day_idx" ON "ProductClickDaily"("productId", "day");
CREATE INDEX "ProductClickDaily_placeId_day_idx" ON "ProductClickDaily"("placeId", "day");

CREATE UNIQUE INDEX "ProductClickDaily_day_siteId_productId_placeId_key"
ON "ProductClickDaily"("day", "siteId", "productId", "placeId")
NULLS NOT DISTINCT;

ALTER TABLE "ProductClickDaily" ADD CONSTRAINT "ProductClickDaily_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductClickDaily" ADD CONSTRAINT "ProductClickDaily_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductClickDaily" ADD CONSTRAINT "ProductClickDaily_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Collection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CollectionTranslation" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "heroImage" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "CollectionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CollectionItem" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isHighlighted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CollectionItemTranslation" (
    "id" TEXT NOT NULL,
    "collectionItemId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "titleOverride" TEXT,
    "descriptionOverride" TEXT,
    "imageOverride" TEXT,

    CONSTRAINT "CollectionItemTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Collection_slug_key" ON "Collection"("slug");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Collection_domain_key" ON "Collection"("domain");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Collection_isActive_idx" ON "Collection"("isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Collection_order_idx" ON "Collection"("order");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CollectionTranslation_collectionId_lang_key" ON "CollectionTranslation"("collectionId", "lang");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollectionTranslation_lang_idx" ON "CollectionTranslation"("lang");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollectionItem_collectionId_order_idx" ON "CollectionItem"("collectionId", "order");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollectionItem_siteId_idx" ON "CollectionItem"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CollectionItemTranslation_collectionItemId_lang_key" ON "CollectionItemTranslation"("collectionItemId", "lang");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CollectionItemTranslation_lang_idx" ON "CollectionItemTranslation"("lang");

-- AddForeignKey
ALTER TABLE "CollectionTranslation" ADD CONSTRAINT "CollectionTranslation_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItemTranslation" ADD CONSTRAINT "CollectionItemTranslation_collectionItemId_fkey" FOREIGN KEY ("collectionItemId") REFERENCES "CollectionItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

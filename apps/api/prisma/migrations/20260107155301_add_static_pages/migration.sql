-- AlterEnum (idempotent: only add if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'event' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SlugEntityType')
    ) THEN
        ALTER TYPE "SlugEntityType" ADD VALUE 'event';
    END IF;
END $$;

-- AlterTable (idempotent: only add columns if they don't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = 'order'
    ) THEN
        ALTER TABLE "Category" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Category' AND column_name = 'parentId'
    ) THEN
        ALTER TABLE "Category" ADD COLUMN "parentId" TEXT;
    END IF;
END $$;

-- CreateTable (idempotent: only create if it doesn't exist)
CREATE TABLE IF NOT EXISTS "StaticPage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaticPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "StaticPageTranslation" (
    "id" TEXT NOT NULL,
    "staticPageId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "StaticPageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable (idempotent)
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'StaticPage_tenantId_idx'
    ) THEN
        CREATE INDEX "StaticPage_tenantId_idx" ON "StaticPage"("tenantId");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'StaticPage_category_idx'
    ) THEN
        CREATE INDEX "StaticPage_category_idx" ON "StaticPage"("category");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'StaticPageTranslation_lang_idx'
    ) THEN
        CREATE INDEX "StaticPageTranslation_lang_idx" ON "StaticPageTranslation"("lang");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'StaticPageTranslation_staticPageId_lang_key'
    ) THEN
        CREATE UNIQUE INDEX "StaticPageTranslation_staticPageId_lang_key" ON "StaticPageTranslation"("staticPageId", "lang");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'PushSubscription_endpoint_key'
    ) THEN
        CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'PushSubscription_tenantId_idx'
    ) THEN
        CREATE INDEX "PushSubscription_tenantId_idx" ON "PushSubscription"("tenantId");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'PushSubscription_isActive_idx'
    ) THEN
        CREATE INDEX "PushSubscription_isActive_idx" ON "PushSubscription"("isActive");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'Category_parentId_idx'
    ) THEN
        CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE indexname = 'Category_tenantId_parentId_order_idx'
    ) THEN
        CREATE INDEX "Category_tenantId_parentId_order_idx" ON "Category"("tenantId", "parentId", "order");
    END IF;
END $$;

-- AddForeignKey (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Category_parentId_fkey'
    ) THEN
        ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'StaticPage_tenantId_fkey'
    ) THEN
        ALTER TABLE "StaticPage" ADD CONSTRAINT "StaticPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'StaticPageTranslation_staticPageId_fkey'
    ) THEN
        ALTER TABLE "StaticPageTranslation" ADD CONSTRAINT "StaticPageTranslation_staticPageId_fkey" FOREIGN KEY ("staticPageId") REFERENCES "StaticPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PushSubscription_tenantId_fkey'
    ) THEN
        ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

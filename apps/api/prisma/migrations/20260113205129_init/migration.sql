-- CreateEnum
CREATE TYPE "Lang" AS ENUM ('hu', 'en', 'de');

-- CreateEnum
CREATE TYPE "SlugEntityType" AS ENUM ('place', 'placeType', 'town', 'page', 'region', 'event');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('superadmin', 'admin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "SiteRole" AS ENUM ('siteadmin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "PlaceRole" AS ENUM ('owner', 'manager', 'editor');

-- CreateEnum
CREATE TYPE "PlacePlan" AS ENUM ('free', 'basic', 'pro');

-- CreateEnum
CREATE TYPE "SitePlan" AS ENUM ('basic', 'pro', 'business');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'BASIC', 'PRO', 'BUSINESS');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'SUSPENDED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "theme" JSONB,
    "placeholders" JSONB,
    "mapDefaults" JSONB,
    "planOverrides" JSONB,
    "placePlanOverrides" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "primaryDomain" TEXT,
    "plan" "SitePlan" NOT NULL DEFAULT 'basic',
    "planStatus" TEXT DEFAULT 'active',
    "planValidUntil" TIMESTAMP(3),
    "planLimits" JSONB,
    "billingEmail" TEXT,
    "billingMeta" JSONB,
    "allowPublicRegistration" BOOLEAN NOT NULL DEFAULT true,
    "brandId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteTranslation" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "heroImage" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "SiteTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteKey" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "slug" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "redirectToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Slug" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "slug" TEXT NOT NULL,
    "entityType" "SlugEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "redirectToId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slug_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Town" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Town_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TownTranslation" (
    "id" TEXT NOT NULL,
    "townId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "heroImage" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "TownTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagTranslation" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "TagTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBand" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceBand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceBandTranslation" (
    "id" TEXT NOT NULL,
    "priceBandId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PriceBandTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "townId" TEXT,
    "ownerId" TEXT,
    "categoryId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "plan" "PlacePlan" NOT NULL DEFAULT 'free',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredUntil" TIMESTAMP(3),
    "galleryLimitOverride" INTEGER,
    "heroImage" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "priceBandId" TEXT,
    "ratingAvg" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "extras" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlacePriceList" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'HUF',
    "blocks" JSONB NOT NULL,
    "note" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "requireAuth" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlacePriceList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceOpeningHours" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "openTime" TEXT,
    "closeTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceOpeningHours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceTag" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceTranslation" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "facebook" TEXT,
    "whatsapp" TEXT,
    "openingHours" TEXT,
    "accessibility" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "PlaceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPage" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegalPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalPageTranslation" (
    "id" TEXT NOT NULL,
    "legalPageId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "content" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "LegalPageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticPage" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaticPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaticPageTranslation" (
    "id" TEXT NOT NULL,
    "staticPageId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "content" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "StaticPageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "bio" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'viewer',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "resetToken" TEXT,
    "resetTokenExpiresAt" TIMESTAMP(3),
    "refreshToken" TEXT,
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "totpSecret" TEXT,
    "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "activeSiteId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceRating" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRating" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteMembership" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "SiteRole" NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceMembership" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "PlaceRole" NOT NULL DEFAULT 'editor',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "placeId" TEXT,
    "categoryId" TEXT,
    "createdByUserId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isRainSafe" BOOLEAN NOT NULL DEFAULT false,
    "showOnMap" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "heroImage" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "ratingAvg" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTranslation" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "title" TEXT NOT NULL,
    "shortDescription" TEXT,
    "description" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoImage" TEXT,
    "seoKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "EventTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventTag" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "EventTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCategory" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventLog" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "description" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteDomain" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "defaultLang" "Lang" NOT NULL DEFAULT 'hu',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteInstance" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "lang" "Lang" NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "mapConfig" JSONB,
    "features" JSONB,
    "sitePlaceholders" JSONB,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSubscription" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "validUntil" TIMESTAMP(3),
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "priceCents" INTEGER,
    "currency" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlaceSubscription" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "validUntil" TIMESTAMP(3),
    "billingPeriod" "BillingPeriod" NOT NULL DEFAULT 'MONTHLY',
    "priceCents" INTEGER,
    "currency" TEXT,
    "statusChangedAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionHistory" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "changeType" TEXT NOT NULL,
    "oldPlan" "SubscriptionPlan",
    "newPlan" "SubscriptionPlan",
    "oldStatus" "SubscriptionStatus",
    "newStatus" "SubscriptionStatus",
    "oldValidUntil" TIMESTAMP(3),
    "newValidUntil" TIMESTAMP(3),
    "paymentDueDate" TIMESTAMP(3),
    "amountCents" INTEGER,
    "currency" TEXT,
    "note" TEXT,
    "changedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gallery" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "placeId" TEXT,
    "eventId" TEXT,
    "name" TEXT,
    "images" JSONB NOT NULL,
    "layout" TEXT DEFAULT 'grid',
    "columns" JSONB,
    "aspect" TEXT DEFAULT 'auto',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gallery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Site_slug_key" ON "Site"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Site_primaryDomain_key" ON "Site"("primaryDomain");

-- CreateIndex
CREATE INDEX "Site_brandId_idx" ON "Site"("brandId");

-- CreateIndex
CREATE INDEX "Site_plan_idx" ON "Site"("plan");

-- CreateIndex
CREATE INDEX "Site_planValidUntil_idx" ON "Site"("planValidUntil");

-- CreateIndex
CREATE INDEX "SiteTranslation_lang_idx" ON "SiteTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "SiteTranslation_siteId_lang_key" ON "SiteTranslation"("siteId", "lang");

-- CreateIndex
CREATE INDEX "SiteKey_lang_slug_idx" ON "SiteKey"("lang", "slug");

-- CreateIndex
CREATE INDEX "SiteKey_siteId_lang_idx" ON "SiteKey"("siteId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "SiteKey_siteId_lang_slug_key" ON "SiteKey"("siteId", "lang", "slug");

-- CreateIndex
CREATE INDEX "Slug_siteId_lang_slug_idx" ON "Slug"("siteId", "lang", "slug");

-- CreateIndex
CREATE INDEX "Slug_siteId_entityType_entityId_idx" ON "Slug"("siteId", "entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "Slug_siteId_lang_slug_key" ON "Slug"("siteId", "lang", "slug");

-- CreateIndex
CREATE INDEX "Town_siteId_idx" ON "Town"("siteId");

-- CreateIndex
CREATE INDEX "TownTranslation_lang_idx" ON "TownTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "TownTranslation_townId_lang_key" ON "TownTranslation"("townId", "lang");

-- CreateIndex
CREATE INDEX "Category_siteId_idx" ON "Category"("siteId");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_siteId_parentId_order_idx" ON "Category"("siteId", "parentId", "order");

-- CreateIndex
CREATE INDEX "CategoryTranslation_lang_idx" ON "CategoryTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_lang_key" ON "CategoryTranslation"("categoryId", "lang");

-- CreateIndex
CREATE INDEX "Tag_siteId_idx" ON "Tag"("siteId");

-- CreateIndex
CREATE INDEX "TagTranslation_lang_idx" ON "TagTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "TagTranslation_tagId_lang_key" ON "TagTranslation"("tagId", "lang");

-- CreateIndex
CREATE INDEX "PriceBand_siteId_idx" ON "PriceBand"("siteId");

-- CreateIndex
CREATE INDEX "PriceBandTranslation_lang_idx" ON "PriceBandTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "PriceBandTranslation_priceBandId_lang_key" ON "PriceBandTranslation"("priceBandId", "lang");

-- CreateIndex
CREATE INDEX "Place_siteId_categoryId_idx" ON "Place"("siteId", "categoryId");

-- CreateIndex
CREATE INDEX "Place_townId_idx" ON "Place"("townId");

-- CreateIndex
CREATE INDEX "Place_siteId_isFeatured_idx" ON "Place"("siteId", "isFeatured");

-- CreateIndex
CREATE INDEX "Place_featuredUntil_idx" ON "Place"("featuredUntil");

-- CreateIndex
CREATE INDEX "Place_plan_idx" ON "Place"("plan");

-- CreateIndex
CREATE UNIQUE INDEX "PlacePriceList_placeId_key" ON "PlacePriceList"("placeId");

-- CreateIndex
CREATE INDEX "PlacePriceList_placeId_idx" ON "PlacePriceList"("placeId");

-- CreateIndex
CREATE INDEX "PlacePriceList_isActive_idx" ON "PlacePriceList"("isActive");

-- CreateIndex
CREATE INDEX "PlacePriceList_isEnabled_idx" ON "PlacePriceList"("isEnabled");

-- CreateIndex
CREATE INDEX "PlaceOpeningHours_placeId_idx" ON "PlaceOpeningHours"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceOpeningHours_placeId_dayOfWeek_key" ON "PlaceOpeningHours"("placeId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "PlaceTag_placeId_idx" ON "PlaceTag"("placeId");

-- CreateIndex
CREATE INDEX "PlaceTag_tagId_idx" ON "PlaceTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceTag_placeId_tagId_key" ON "PlaceTag"("placeId", "tagId");

-- CreateIndex
CREATE INDEX "PlaceTranslation_lang_idx" ON "PlaceTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceTranslation_placeId_lang_key" ON "PlaceTranslation"("placeId", "lang");

-- CreateIndex
CREATE INDEX "LegalPage_siteId_idx" ON "LegalPage"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPage_siteId_key_key" ON "LegalPage"("siteId", "key");

-- CreateIndex
CREATE INDEX "LegalPageTranslation_lang_idx" ON "LegalPageTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "LegalPageTranslation_legalPageId_lang_key" ON "LegalPageTranslation"("legalPageId", "lang");

-- CreateIndex
CREATE INDEX "StaticPage_siteId_idx" ON "StaticPage"("siteId");

-- CreateIndex
CREATE INDEX "StaticPage_category_idx" ON "StaticPage"("category");

-- CreateIndex
CREATE INDEX "StaticPageTranslation_lang_idx" ON "StaticPageTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "StaticPageTranslation_staticPageId_lang_key" ON "StaticPageTranslation"("staticPageId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_username_idx" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE INDEX "PlaceRating_placeId_idx" ON "PlaceRating"("placeId");

-- CreateIndex
CREATE INDEX "PlaceRating_userId_idx" ON "PlaceRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceRating_placeId_userId_key" ON "PlaceRating"("placeId", "userId");

-- CreateIndex
CREATE INDEX "EventRating_eventId_idx" ON "EventRating"("eventId");

-- CreateIndex
CREATE INDEX "EventRating_userId_idx" ON "EventRating"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRating_eventId_userId_key" ON "EventRating"("eventId", "userId");

-- CreateIndex
CREATE INDEX "UserSite_userId_idx" ON "UserSite"("userId");

-- CreateIndex
CREATE INDEX "UserSite_siteId_idx" ON "UserSite"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSite_userId_siteId_key" ON "UserSite"("userId", "siteId");

-- CreateIndex
CREATE INDEX "SiteMembership_userId_idx" ON "SiteMembership"("userId");

-- CreateIndex
CREATE INDEX "SiteMembership_siteId_idx" ON "SiteMembership"("siteId");

-- CreateIndex
CREATE INDEX "SiteMembership_role_idx" ON "SiteMembership"("role");

-- CreateIndex
CREATE UNIQUE INDEX "SiteMembership_siteId_userId_key" ON "SiteMembership"("siteId", "userId");

-- CreateIndex
CREATE INDEX "PlaceMembership_userId_idx" ON "PlaceMembership"("userId");

-- CreateIndex
CREATE INDEX "PlaceMembership_placeId_idx" ON "PlaceMembership"("placeId");

-- CreateIndex
CREATE INDEX "PlaceMembership_role_idx" ON "PlaceMembership"("role");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceMembership_placeId_userId_key" ON "PlaceMembership"("placeId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppSetting_key_key" ON "AppSetting"("key");

-- CreateIndex
CREATE INDEX "AppSetting_key_idx" ON "AppSetting"("key");

-- CreateIndex
CREATE INDEX "Event_siteId_startDate_idx" ON "Event"("siteId", "startDate");

-- CreateIndex
CREATE INDEX "Event_placeId_idx" ON "Event"("placeId");

-- CreateIndex
CREATE INDEX "Event_categoryId_idx" ON "Event"("categoryId");

-- CreateIndex
CREATE INDEX "Event_createdByUserId_idx" ON "Event"("createdByUserId");

-- CreateIndex
CREATE INDEX "EventTranslation_lang_idx" ON "EventTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "EventTranslation_eventId_lang_key" ON "EventTranslation"("eventId", "lang");

-- CreateIndex
CREATE INDEX "EventTag_eventId_idx" ON "EventTag"("eventId");

-- CreateIndex
CREATE INDEX "EventTag_tagId_idx" ON "EventTag"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "EventTag_eventId_tagId_key" ON "EventTag"("eventId", "tagId");

-- CreateIndex
CREATE INDEX "EventCategory_eventId_idx" ON "EventCategory"("eventId");

-- CreateIndex
CREATE INDEX "EventCategory_categoryId_idx" ON "EventCategory"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "EventCategory_eventId_categoryId_key" ON "EventCategory"("eventId", "categoryId");

-- CreateIndex
CREATE INDEX "PushSubscription_siteId_idx" ON "PushSubscription"("siteId");

-- CreateIndex
CREATE INDEX "PushSubscription_isActive_idx" ON "PushSubscription"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_siteId_endpoint_key" ON "PushSubscription"("siteId", "endpoint");

-- CreateIndex
CREATE INDEX "EventLog_siteId_idx" ON "EventLog"("siteId");

-- CreateIndex
CREATE INDEX "EventLog_userId_idx" ON "EventLog"("userId");

-- CreateIndex
CREATE INDEX "EventLog_action_idx" ON "EventLog"("action");

-- CreateIndex
CREATE INDEX "EventLog_entityType_idx" ON "EventLog"("entityType");

-- CreateIndex
CREATE INDEX "EventLog_createdAt_idx" ON "EventLog"("createdAt");

-- CreateIndex
CREATE INDEX "EventLog_siteId_userId_idx" ON "EventLog"("siteId", "userId");

-- CreateIndex
CREATE INDEX "EventLog_siteId_createdAt_idx" ON "EventLog"("siteId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SiteDomain_domain_key" ON "SiteDomain"("domain");

-- CreateIndex
CREATE INDEX "SiteDomain_siteId_idx" ON "SiteDomain"("siteId");

-- CreateIndex
CREATE INDEX "SiteDomain_isActive_idx" ON "SiteDomain"("isActive");

-- CreateIndex
CREATE INDEX "SiteInstance_siteId_idx" ON "SiteInstance"("siteId");

-- CreateIndex
CREATE INDEX "SiteInstance_lang_idx" ON "SiteInstance"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "SiteInstance_siteId_lang_key" ON "SiteInstance"("siteId", "lang");

-- CreateIndex
CREATE UNIQUE INDEX "SiteSubscription_siteId_key" ON "SiteSubscription"("siteId");

-- CreateIndex
CREATE INDEX "SiteSubscription_plan_idx" ON "SiteSubscription"("plan");

-- CreateIndex
CREATE INDEX "SiteSubscription_status_idx" ON "SiteSubscription"("status");

-- CreateIndex
CREATE INDEX "SiteSubscription_validUntil_idx" ON "SiteSubscription"("validUntil");

-- CreateIndex
CREATE INDEX "SiteSubscription_statusChangedAt_idx" ON "SiteSubscription"("statusChangedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PlaceSubscription_placeId_key" ON "PlaceSubscription"("placeId");

-- CreateIndex
CREATE INDEX "PlaceSubscription_plan_idx" ON "PlaceSubscription"("plan");

-- CreateIndex
CREATE INDEX "PlaceSubscription_status_idx" ON "PlaceSubscription"("status");

-- CreateIndex
CREATE INDEX "PlaceSubscription_validUntil_idx" ON "PlaceSubscription"("validUntil");

-- CreateIndex
CREATE INDEX "PlaceSubscription_statusChangedAt_idx" ON "PlaceSubscription"("statusChangedAt");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_scope_subscriptionId_idx" ON "SubscriptionHistory"("scope", "subscriptionId");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_changeType_idx" ON "SubscriptionHistory"("changeType");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_createdAt_idx" ON "SubscriptionHistory"("createdAt");

-- CreateIndex
CREATE INDEX "SubscriptionHistory_paymentDueDate_idx" ON "SubscriptionHistory"("paymentDueDate");

-- CreateIndex
CREATE INDEX "Gallery_siteId_idx" ON "Gallery"("siteId");

-- CreateIndex
CREATE INDEX "Gallery_placeId_idx" ON "Gallery"("placeId");

-- CreateIndex
CREATE INDEX "Gallery_eventId_idx" ON "Gallery"("eventId");

-- CreateIndex
CREATE INDEX "Gallery_siteId_isActive_idx" ON "Gallery"("siteId", "isActive");

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteTranslation" ADD CONSTRAINT "SiteTranslation_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteKey" ADD CONSTRAINT "SiteKey_redirectToId_fkey" FOREIGN KEY ("redirectToId") REFERENCES "SiteKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteKey" ADD CONSTRAINT "SiteKey_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slug" ADD CONSTRAINT "Slug_redirectToId_fkey" FOREIGN KEY ("redirectToId") REFERENCES "Slug"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Slug" ADD CONSTRAINT "Slug_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Town" ADD CONSTRAINT "Town_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TownTranslation" ADD CONSTRAINT "TownTranslation_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagTranslation" ADD CONSTRAINT "TagTranslation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBand" ADD CONSTRAINT "PriceBand_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceBandTranslation" ADD CONSTRAINT "PriceBandTranslation_priceBandId_fkey" FOREIGN KEY ("priceBandId") REFERENCES "PriceBand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_townId_fkey" FOREIGN KEY ("townId") REFERENCES "Town"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_priceBandId_fkey" FOREIGN KEY ("priceBandId") REFERENCES "PriceBand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlacePriceList" ADD CONSTRAINT "PlacePriceList_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceOpeningHours" ADD CONSTRAINT "PlaceOpeningHours_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTag" ADD CONSTRAINT "PlaceTag_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTag" ADD CONSTRAINT "PlaceTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceTranslation" ADD CONSTRAINT "PlaceTranslation_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPage" ADD CONSTRAINT "LegalPage_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalPageTranslation" ADD CONSTRAINT "LegalPageTranslation_legalPageId_fkey" FOREIGN KEY ("legalPageId") REFERENCES "LegalPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticPage" ADD CONSTRAINT "StaticPage_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticPageTranslation" ADD CONSTRAINT "StaticPageTranslation_staticPageId_fkey" FOREIGN KEY ("staticPageId") REFERENCES "StaticPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_activeSiteId_fkey" FOREIGN KEY ("activeSiteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceRating" ADD CONSTRAINT "PlaceRating_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceRating" ADD CONSTRAINT "PlaceRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRating" ADD CONSTRAINT "EventRating_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRating" ADD CONSTRAINT "EventRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSite" ADD CONSTRAINT "UserSite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSite" ADD CONSTRAINT "UserSite_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMembership" ADD CONSTRAINT "SiteMembership_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteMembership" ADD CONSTRAINT "SiteMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceMembership" ADD CONSTRAINT "PlaceMembership_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceMembership" ADD CONSTRAINT "PlaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTranslation" ADD CONSTRAINT "EventTranslation_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTag" ADD CONSTRAINT "EventTag_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventTag" ADD CONSTRAINT "EventTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventCategory" ADD CONSTRAINT "EventCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventLog" ADD CONSTRAINT "EventLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteDomain" ADD CONSTRAINT "SiteDomain_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteInstance" ADD CONSTRAINT "SiteInstance_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteSubscription" ADD CONSTRAINT "SiteSubscription_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaceSubscription" ADD CONSTRAINT "PlaceSubscription_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gallery" ADD CONSTRAINT "Gallery_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

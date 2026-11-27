-- CreateTable
CREATE TABLE "PlatformGuide" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformGuideTranslation" (
    "id" TEXT NOT NULL,
    "guideId" TEXT NOT NULL,
    "lang" VARCHAR(8) NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "imageCaption" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,

    CONSTRAINT "PlatformGuideTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlatformGuide_slug_key" ON "PlatformGuide"("slug");

-- CreateIndex
CREATE INDEX "PlatformGuide_isPublished_sortOrder_idx" ON "PlatformGuide"("isPublished", "sortOrder");

-- CreateIndex
CREATE INDEX "PlatformGuideTranslation_lang_idx" ON "PlatformGuideTranslation"("lang");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformGuideTranslation_guideId_lang_key" ON "PlatformGuideTranslation"("guideId", "lang");

-- AddForeignKey
ALTER TABLE "PlatformGuideTranslation" ADD CONSTRAINT "PlatformGuideTranslation_guideId_fkey" FOREIGN KEY ("guideId") REFERENCES "PlatformGuide"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Align the landing title, H1 and opening paragraph with one phrase per language.
INSERT INTO "UiMessage" ("lang", "key", "value")
SELECT v.lang, v.key, v.value
FROM (
  VALUES
    ('hu', 'public.overview.title', 'Interaktív turisztikai térkép önkormányzatoknak'),
    ('hu', 'public.overview.lead', 'Interaktív turisztikai térkép önkormányzatoknak, turisztikai irodáknak és helyi vállalkozásoknak. A látogató a telefonján nyitja meg, szűr, és elindul. Ti egyetlen linken adjátok tovább — weboldalon, hírlevélben vagy a Tourinform pultján.'),
    ('hu', 'public.overview.seoTitle', 'HelloLocal | Interaktív turisztikai térkép önkormányzatoknak'),
    ('en', 'public.overview.title', 'Interactive tourism map for municipalities'),
    ('en', 'public.overview.lead', 'An interactive tourism map for municipalities, tourist offices and local businesses. Visitors open it on their phone, filter, and go. You pass on a single link — on the website, in the newsletter, or at the tourist desk.'),
    ('en', 'public.overview.seoTitle', 'HelloLocal | Interactive tourism map for municipalities'),
    ('de', 'public.overview.title', 'Interaktive Tourismuskarte für Gemeinden'),
    ('de', 'public.overview.lead', 'Eine interaktive Tourismuskarte für Gemeinden, Tourismusbüros und lokale Betriebe. Gäste öffnen sie am Handy, filtern und gehen los. Ihr gebt einen einzigen Link weiter — auf der Website, im Newsletter oder am Tourismus-Schalter.'),
    ('de', 'public.overview.seoTitle', 'HelloLocal | Interaktive Tourismuskarte für Gemeinden')
) AS v(lang, key, value)
WHERE EXISTS (SELECT 1 FROM "UiLanguage" l WHERE l.code = v.lang)
ON CONFLICT ("lang", "key") DO UPDATE SET "value" = EXCLUDED."value";

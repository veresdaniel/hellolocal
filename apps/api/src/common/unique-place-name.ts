import { BadRequestException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Names are unique per country, in every language, ignoring case, extra spaces,
 * and the difference between hyphen and dash. One record may use the same name
 * in several languages. A town with no region is unique among other unassigned towns.
 */
export async function assertTownNameAvailable(
  prisma: PrismaService,
  input: { name: string; siteId: string | null; townId?: string | null }
) {
  const name = input.name?.trim();
  if (!name) return;
  const countryId = input.siteId
    ? ((
        await prisma.site.findUnique({
          where: { id: input.siteId },
          select: { countryId: true },
        })
      )?.countryId ?? null)
    : null;
  const rows = await prisma.$queryRaw<Array<{ name: string }>>(Prisma.sql`
    SELECT tr.name
    FROM "TownTranslation" tr
    JOIN "Town" t ON t.id = tr."townId"
    LEFT JOIN "Site" s ON s.id = t."siteId"
    WHERE (${input.townId ?? null}::text IS NULL OR tr."townId" <> ${input.townId ?? null})
      AND public.normalized_place_name(tr.name) = public.normalized_place_name(${name})
      AND (
        (${countryId}::text IS NULL AND t."siteId" IS NULL)
        OR (${countryId}::text IS NOT NULL AND s."countryId" = ${countryId})
      )
    LIMIT 1
  `);
  if (rows.length > 0) {
    throw new BadRequestException(
      countryId
        ? `Már van ilyen nevű település ebben az országban: ${name}.`
        : `Már van ilyen nevű, régió nélküli település: ${name}.`
    );
  }
}

export async function assertRegionNameAvailable(
  prisma: PrismaService,
  input: { name: string; countryId: string; siteId?: string | null }
) {
  const name = input.name?.trim();
  if (!name) return;
  const rows = await prisma.$queryRaw<Array<{ name: string }>>(Prisma.sql`
    SELECT tr.name
    FROM "SiteTranslation" tr
    JOIN "Site" s ON s.id = tr."siteId"
    WHERE s."countryId" = ${input.countryId}
      AND (${input.siteId ?? null}::text IS NULL OR s.id <> ${input.siteId ?? null})
      AND public.normalized_place_name(tr.name) = public.normalized_place_name(${name})
    LIMIT 1
  `);
  if (rows.length > 0) {
    throw new BadRequestException(`Már van ilyen nevű régió ebben az országban: ${name}.`);
  }
}

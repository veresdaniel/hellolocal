import { PrismaService } from "../prisma/prisma.service";
import { normalizeDomainHost } from "./domain-host";

/**
 * True when `raw` is an admin-configured public hostname
 * (SiteDomain / Site.primaryDomain / Town|Place.customDomain / Collection.domain).
 * Used by Caddy on-demand TLS ask and CORS for custom-domain SPA origins.
 */
export async function isKnownPublicHostname(
  prisma: PrismaService,
  raw: string | null | undefined
): Promise<boolean> {
  const domain = normalizeDomainHost(raw);
  if (!domain) return false;

  const siteDomain = await prisma.siteDomain.findUnique({
    where: { domain },
    select: { isActive: true, site: { select: { isActive: true } } },
  });
  if (siteDomain?.isActive && siteDomain.site?.isActive) return true;

  const siteByPrimary = await prisma.site.findFirst({
    where: { primaryDomain: domain, isActive: true },
    select: { id: true },
  });
  if (siteByPrimary) return true;

  const town = await prisma.town.findUnique({
    where: { customDomain: domain },
    select: { isActive: true, site: { select: { isActive: true } } },
  });
  if (town?.isActive && town.site?.isActive) return true;

  const place = await prisma.place.findUnique({
    where: { customDomain: domain },
    select: { isActive: true, site: { select: { isActive: true } } },
  });
  if (place?.isActive && place.site?.isActive) return true;

  const countryDomain = await prisma.countryDomain.findUnique({
    where: { domain },
    select: { isActive: true, country: { select: { isActive: true } } },
  });
  if (countryDomain?.isActive && countryDomain.country?.isActive) return true;

  const countryByPrimary = await prisma.country.findFirst({
    where: { primaryDomain: domain, isActive: true },
    select: { id: true },
  });
  if (countryByPrimary) return true;

  const collection = await prisma.collection.findUnique({
    where: { domain },
    select: { isActive: true },
  });
  return Boolean(collection?.isActive);
}

import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeDomainHost } from "./domain-host";
import { isConfiguredPlatformHost, readPlatformPublicHosts } from "./platform-public-host";

export type HostnameOwner =
  | { kind: "site"; siteId: string }
  | { kind: "town"; townId: string }
  | { kind: "place"; placeId: string }
  | { kind: "collection"; collectionId: string }
  | { kind: "event"; eventId: string };

/**
 * Ensures a custom hostname is free for routing.
 * Site uses SiteDomain (+ Site.primaryDomain); Town/Place/Collection each have their own unique column.
 * Hostnames must be globally unique among non-null values so /api/domain/:host stays unambiguous.
 */
export async function assertHostnameAvailable(
  prisma: PrismaService,
  raw: string | null | undefined,
  owner: HostnameOwner
): Promise<string | null> {
  if (raw === null || raw === undefined || !String(raw).trim()) {
    return null;
  }
  const domain = normalizeDomainHost(raw);
  if (!domain) {
    throw new BadRequestException(`Érvénytelen domain: „${raw}”. Példa: pelda.hu`);
  }
  const platformHosts = await readPlatformPublicHosts(prisma);
  if (isConfiguredPlatformHost(domain, platformHosts)) {
    throw new BadRequestException(`A(z) ${domain} a platform nyilvános címe, régióhoz nem adható.`);
  }

  const siteDomain = await prisma.siteDomain.findUnique({
    where: { domain },
    select: { siteId: true },
  });
  if (siteDomain && !(owner.kind === "site" && siteDomain.siteId === owner.siteId)) {
    throw new BadRequestException(`A(z) ${domain} domain már használatban van.`);
  }

  const sitePrimary = await prisma.site.findFirst({
    where: { primaryDomain: domain },
    select: { id: true },
  });
  if (sitePrimary && !(owner.kind === "site" && sitePrimary.id === owner.siteId)) {
    throw new BadRequestException(`A(z) ${domain} domain már használatban van.`);
  }

  const town = await prisma.town.findUnique({
    where: { customDomain: domain },
    select: { id: true },
  });
  if (town && !(owner.kind === "town" && town.id === owner.townId)) {
    throw new BadRequestException(`A(z) ${domain} domain már használatban van.`);
  }

  const place = await prisma.place.findUnique({
    where: { customDomain: domain },
    select: { id: true },
  });
  if (place && !(owner.kind === "place" && place.id === owner.placeId)) {
    throw new BadRequestException(`A(z) ${domain} domain már használatban van.`);
  }

  const countryDomain = await prisma.countryDomain.findUnique({
    where: { domain },
    select: { id: true },
  });
  if (countryDomain) {
    throw new BadRequestException(`A(z) ${domain} domain már egy országhoz tartozik.`);
  }
  const countryPrimary = await prisma.country.findFirst({
    where: { primaryDomain: domain },
    select: { id: true },
  });
  if (countryPrimary) {
    throw new BadRequestException(`A(z) ${domain} domain már egy országhoz tartozik.`);
  }

  const collection = await prisma.collection.findUnique({
    where: { domain },
    select: { id: true },
  });
  if (collection && !(owner.kind === "collection" && collection.id === owner.collectionId)) {
    throw new BadRequestException(`A(z) ${domain} domain már használatban van.`);
  }

  const event = await prisma.event.findUnique({
    where: { customDomain: domain },
    select: { id: true },
  });
  if (event && !(owner.kind === "event" && event.id === owner.eventId)) {
    throw new BadRequestException(`A(z) ${domain} domain már használatban van.`);
  }

  return domain;
}

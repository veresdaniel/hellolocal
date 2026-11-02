import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PlaceRole, PlaceSignupStatus, UserRole } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { normalizeDomainHost } from "../common/domain-host";
import { assertRegionNameAvailable } from "../common/unique-place-name";
import { EntitlementsService } from "../entitlements/entitlements.service";

export type CountryDomainInput = {
  domain: string;
  defaultLang?: string;
  isPrimary?: boolean;
};

export type CountryWriteDto = {
  slug: string;
  code?: string;
  isActive?: boolean;
  translations: Array<{ lang: string; name: string }>;
  domains?: CountryDomainInput[];
};

@Injectable()
export class CountryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlementsService: EntitlementsService
  ) {}

  async listPublic(lang: string) {
    const rows = await this.prisma.country.findMany({
      where: { isActive: true },
      orderBy: { slug: "asc" },
      include: { translations: true },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: this.pickName(row.translations, lang),
    }));
  }

  async suggestTowns(countryId: string, q: string) {
    const query = q.trim();
    if (!query) return [];
    const towns = await this.prisma.town.findMany({
      where: {
        siteId: { not: null },
        site: { countryId },
        translations: { some: { name: { contains: query, mode: "insensitive" } } },
      },
      take: 10,
      include: {
        translations: { select: { lang: true, name: true } },
        site: { select: { id: true, slug: true, translations: { select: { lang: true, name: true } } } },
      },
    });
    return towns.map((town) => ({
      id: town.id,
      name: town.translations.find((row) => row.lang === "hu")?.name || town.translations[0]?.name || town.id,
      regionName:
        town.site?.translations.find((row) => row.lang === "hu")?.name || town.site?.slug || "",
    }));
  }

  async listAdmin() {
    const rows = await this.prisma.country.findMany({
      orderBy: { slug: "asc" },
      include: {
        translations: true,
        domains: { orderBy: { isPrimary: "desc" } },
        _count: { select: { sites: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      code: row.code,
      isActive: row.isActive,
      name: this.pickName(row.translations, "hu"),
      translations: row.translations,
      domains: row.domains,
      regionCount: row._count.sites,
    }));
  }

  async findOne(id: string) {
    const row = await this.prisma.country.findUnique({
      where: { id },
      include: {
        translations: true,
        domains: { orderBy: { isPrimary: "desc" } },
        sites: { select: { id: true, slug: true, translations: { select: { lang: true, name: true } } } },
      },
    });
    if (!row) throw new NotFoundException("Country not found");
    return row;
  }

  async create(dto: CountryWriteDto) {
    const slug = this.slugify(dto.slug);
    if (!slug) throw new BadRequestException("Slug is required");
    await this.assertDomainsFree(dto.domains || []);
    const domains = this.normalizeDomains(dto.domains || []);
    const code = this.isoCode(dto.code || slug);
    return this.prisma.country.create({
      data: {
        slug,
        code,
        isActive: dto.isActive ?? true,
        primaryDomain: domains.find((row) => row.isPrimary)?.domain ?? null,
        translations: {
          create: dto.translations.filter((row) => row.name.trim()).map((row) => ({
            lang: row.lang,
            name: row.name.trim(),
          })),
        },
        domains: { create: domains },
      },
      include: { translations: true, domains: true },
    });
  }

  async update(id: string, dto: CountryWriteDto) {
    await this.findOne(id);
    const slug = this.slugify(dto.slug);
    if (!slug) throw new BadRequestException("Slug is required");
    await this.assertDomainsFree(dto.domains || [], id);
    const domains = this.normalizeDomains(dto.domains || []);
    await this.prisma.countryDomain.deleteMany({ where: { countryId: id } });
    await this.prisma.countryTranslation.deleteMany({ where: { countryId: id } });
    const code = this.isoCode(dto.code || slug);
    return this.prisma.country.update({
      where: { id },
      data: {
        slug,
        code,
        isActive: dto.isActive ?? true,
        primaryDomain: domains.find((row) => row.isPrimary)?.domain ?? null,
        translations: {
          create: dto.translations.filter((row) => row.name.trim()).map((row) => ({
            lang: row.lang,
            name: row.name.trim(),
          })),
        },
        domains: { create: domains },
      },
      include: { translations: true, domains: true },
    });
  }

  async assignRegion(siteId: string, countryId: string, role: UserRole) {
    if (role !== UserRole.superadmin) {
      throw new ForbiddenException("Only a superadmin can assign a region to a country");
    }
    const country = await this.prisma.country.findUnique({ where: { id: countryId } });
    if (!country) throw new NotFoundException("Country not found");
    const site = await this.prisma.site.findUnique({
      where: { id: siteId },
      include: { translations: true },
    });
    if (!site) throw new NotFoundException("Region not found");
    for (const translation of site.translations) {
      await assertRegionNameAvailable(this.prisma, {
        name: translation.name,
        countryId,
        siteId,
      });
    }
    return this.prisma.site.update({ where: { id: siteId }, data: { countryId } });
  }

  /** Create the country from an ISO code if it is not stored yet, then attach the region. */
  async assignRegionByCode(siteId: string, code: string) {
    const iso = this.isoCode(code);
    const site = await this.prisma.site.findUnique({ where: { id: siteId } });
    if (!site) throw new NotFoundException("Region not found");
    let country = await this.prisma.country.findUnique({ where: { code: iso } });
    if (!country) {
      country = await this.prisma.country.create({
        data: { code: iso, slug: iso.toLowerCase(), isActive: true },
      });
    }
    return this.prisma.site.update({
      where: { id: siteId },
      data: { countryId: country.id },
      include: { country: { include: { domains: true } } },
    });
  }

  async saveDomains(countryId: string, domains: CountryDomainInput[]) {
    await this.findOne(countryId);
    await this.assertDomainsFree(domains, countryId);
    const rows = this.normalizeDomains(domains);
    const primary = rows.find((row) => row.isPrimary)?.domain ?? null;
    await this.prisma.$transaction(async (tx) => {
      await tx.countryDomain.deleteMany({ where: { countryId } });
      if (rows.length) {
        await tx.countryDomain.createMany({
          data: rows.map((row) => ({ ...row, countryId, isActive: true })),
        });
      }
      await tx.country.update({ where: { id: countryId }, data: { primaryDomain: primary } });
    });
    return this.findOne(countryId);
  }

  async addRegion(countryId: string, input: { name: string; slug: string }) {
    await this.findOne(countryId);
    const name = input.name?.trim();
    const slug = this.slugify(input.slug || name || "");
    if (!name || !slug) throw new BadRequestException("Region name and slug are required");
    await assertRegionNameAvailable(this.prisma, { name, countryId });
    const brand = await this.prisma.brand.findFirst({ orderBy: { createdAt: "asc" } });
    if (!brand) throw new BadRequestException("Create a brand before adding a region");
    const taken = await this.prisma.site.findUnique({ where: { slug } });
    if (taken) throw new BadRequestException("That region slug is already used");
    return this.prisma.site.create({
      data: {
        slug,
        brandId: brand.id,
        countryId,
        isActive: true,
        languages: ["hu", "en", "de"],
        translations: {
          create: ["hu", "en", "de"].map((lang) => ({ lang, name })),
        },
        siteKeys: {
          create: ["hu", "en", "de"].map((lang) => ({
            lang,
            slug,
            isPrimary: true,
            isActive: true,
          })),
        },
      },
    });
  }

  async listPending() {
    return this.prisma.placeSignup.findMany({
      where: { status: PlaceSignupStatus.pending },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        country: { include: { translations: true, sites: { select: { id: true, slug: true, translations: { select: { lang: true, name: true } } } } } },
      },
    });
  }

  async approve(signupId: string, input: { townId?: string; regionId?: string }) {
    const signup = await this.prisma.placeSignup.findUnique({
      where: { id: signupId },
      include: { user: true },
    });
    if (!signup || signup.status !== PlaceSignupStatus.pending) {
      throw new NotFoundException("Pending registration not found");
    }
    const regions = await this.prisma.site.findMany({
      where: { countryId: signup.countryId },
      select: { id: true },
    });
    let townId = input.townId || null;
    if (townId) {
      const town = await this.prisma.town.findUnique({
        where: { id: townId },
        select: { id: true, siteId: true, site: { select: { countryId: true } } },
      });
      if (!town?.siteId || town.site?.countryId !== signup.countryId) {
        throw new BadRequestException("That town is not in this country");
      }
    } else {
      const existing = await this.findTown(signup.countryId, signup.requestedTownName);
      if (existing) {
        townId = existing.id;
      } else {
        const regionId = input.regionId || (regions.length === 1 ? regions[0].id : "");
        if (!regionId || !regions.some((row) => row.id === regionId)) {
          throw new BadRequestException("Choose a region in this country for the new town");
        }
        const created = await this.prisma.town.create({
          data: {
            siteId: regionId,
            isActive: true,
            translations: {
              create: ["hu", "en", "de"].map((lang) => ({ lang, name: signup.requestedTownName })),
            },
          },
        });
        townId = created.id;
      }
    }
    const placeId = await this.attachPlace(signup.userId, townId, signup.user.firstName, signup.user.lastName);
    return this.prisma.placeSignup.update({
      where: { id: signup.id },
      data: { status: PlaceSignupStatus.attached, townId, placeId },
    });
  }

  /**
   * Free-plan registration. Never creates a country, region, or town.
   * An existing town is attached immediately. A missing town stays pending.
   */
  async registerFreePlace(input: {
    userId: string;
    firstName: string;
    lastName: string;
    countryId: string;
    townId?: string;
    townName: string;
  }) {
    const country = await this.prisma.country.findFirst({
      where: { id: input.countryId, isActive: true },
    });
    if (!country) throw new BadRequestException("Choose an existing country");
    const requested = input.townName.trim();
    if (!requested && !input.townId) throw new BadRequestException("Town is required");
    const town = input.townId
      ? await this.prisma.town.findFirst({
          where: { id: input.townId, site: { countryId: country.id }, siteId: { not: null } },
          select: { id: true },
        })
      : await this.findTown(country.id, requested);
    if (town) {
      const placeId = await this.attachPlace(input.userId, town.id, input.firstName, input.lastName);
      await this.prisma.placeSignup.create({
        data: {
          userId: input.userId,
          countryId: country.id,
          townId: town.id,
          requestedTownName: requested || input.firstName,
          status: PlaceSignupStatus.attached,
          placeId,
        },
      });
      return { status: "attached" as const, townId: town.id, placeId };
    }
    await this.prisma.placeSignup.create({
      data: {
        userId: input.userId,
        countryId: country.id,
        requestedTownName: requested,
        status: PlaceSignupStatus.pending,
      },
    });
    return { status: "pending" as const };
  }

  async listHosts() {
    const [regions, countries] = await Promise.all([
      this.prisma.siteDomain.findMany({
        include: { site: { select: { id: true, slug: true, translations: { select: { lang: true, name: true } } } } },
        orderBy: { domain: "asc" },
      }),
      this.prisma.countryDomain.findMany({
        include: { country: { select: { id: true, slug: true, translations: { select: { lang: true, name: true } } } } },
        orderBy: { domain: "asc" },
      }),
    ]);
    return [
      ...regions.map((row) => ({
        id: row.id,
        domain: row.domain,
        isPrimary: row.isPrimary,
        defaultLang: row.defaultLang,
        ownerType: "region" as const,
        ownerId: row.siteId,
        ownerName: this.pickName(row.site.translations, "hu") || row.site.slug,
      })),
      ...countries.map((row) => ({
        id: row.id,
        domain: row.domain,
        isPrimary: row.isPrimary,
        defaultLang: row.defaultLang,
        ownerType: "country" as const,
        ownerId: row.countryId,
        ownerName: this.pickName(row.country.translations, "hu") || row.country.slug,
      })),
    ];
  }

  async assignHost(input: {
    domain: string;
    ownerType: "country" | "region";
    ownerId: string;
    defaultLang?: string;
    isPrimary?: boolean;
  }) {
    const domain = normalizeDomainHost(input.domain);
    if (!domain) throw new BadRequestException("Invalid domain");
    await this.assertHostFreeOfOtherEntities(domain);
    if (input.ownerType === "region") {
      const site = await this.prisma.site.findUnique({ where: { id: input.ownerId } });
      if (!site) throw new NotFoundException("Region not found");
      await this.prisma.countryDomain.deleteMany({ where: { domain } });
      await this.prisma.country.updateMany({ where: { primaryDomain: domain }, data: { primaryDomain: null } });
      const row = await this.prisma.siteDomain.upsert({
        where: { domain },
        create: {
          siteId: site.id,
          domain,
          isPrimary: Boolean(input.isPrimary),
          isActive: true,
          defaultLang: input.defaultLang || "hu",
        },
        update: {
          siteId: site.id,
          isPrimary: Boolean(input.isPrimary),
          isActive: true,
          defaultLang: input.defaultLang || "hu",
        },
      });
      if (input.isPrimary) {
        await this.prisma.siteDomain.updateMany({
          where: { siteId: site.id, id: { not: row.id } },
          data: { isPrimary: false },
        });
        await this.prisma.site.update({ where: { id: site.id }, data: { primaryDomain: domain } });
      }
      return row;
    }
    const country = await this.prisma.country.findUnique({ where: { id: input.ownerId } });
    if (!country) throw new NotFoundException("Country not found");
    const previous = await this.prisma.siteDomain.findUnique({ where: { domain } });
    await this.prisma.siteDomain.deleteMany({ where: { domain } });
    if (previous) {
      const site = await this.prisma.site.findUnique({ where: { id: previous.siteId }, select: { primaryDomain: true } });
      if (site?.primaryDomain === domain) {
        await this.prisma.site.update({ where: { id: previous.siteId }, data: { primaryDomain: null } });
      }
    }
    const row = await this.prisma.countryDomain.upsert({
      where: { domain },
      create: {
        countryId: country.id,
        domain,
        isPrimary: Boolean(input.isPrimary),
        isActive: true,
        defaultLang: input.defaultLang || "hu",
      },
      update: {
        countryId: country.id,
        isPrimary: Boolean(input.isPrimary),
        isActive: true,
        defaultLang: input.defaultLang || "hu",
      },
    });
    if (input.isPrimary) {
      await this.prisma.countryDomain.updateMany({
        where: { countryId: country.id, id: { not: row.id } },
        data: { isPrimary: false },
      });
      await this.prisma.country.update({ where: { id: country.id }, data: { primaryDomain: domain } });
    }
    return row;
  }

  async deleteHost(ownerType: "country" | "region", id: string) {
    if (ownerType === "region") {
      const row = await this.prisma.siteDomain.findUnique({ where: { id } });
      if (!row) throw new NotFoundException("Domain not found");
      await this.prisma.siteDomain.delete({ where: { id } });
      const site = await this.prisma.site.findUnique({ where: { id: row.siteId }, select: { primaryDomain: true } });
      if (site?.primaryDomain === row.domain) {
        await this.prisma.site.update({ where: { id: row.siteId }, data: { primaryDomain: null } });
      }
      return { ok: true };
    }
    const row = await this.prisma.countryDomain.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Domain not found");
    await this.prisma.countryDomain.delete({ where: { id } });
    const country = await this.prisma.country.findUnique({ where: { id: row.countryId }, select: { primaryDomain: true } });
    if (country?.primaryDomain === row.domain) {
      await this.prisma.country.update({ where: { id: row.countryId }, data: { primaryDomain: null } });
    }
    return { ok: true };
  }

  async hasPending(userId: string) {
    const row = await this.prisma.placeSignup.findFirst({
      where: { userId, status: PlaceSignupStatus.pending },
      select: { id: true },
    });
    return Boolean(row);
  }

  private async findTown(countryId: string, name: string) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    return this.prisma.town.findFirst({
      where: {
        siteId: { not: null },
        site: { countryId },
        translations: { some: { name: { equals: trimmed, mode: "insensitive" } } },
      },
      select: { id: true },
    });
  }

  private async attachPlace(userId: string, townId: string, firstName: string, lastName: string) {
    const town = await this.prisma.town.findUnique({
      where: { id: townId },
      select: { id: true, siteId: true },
    });
    if (!town?.siteId) throw new BadRequestException("Town has no region");
    let category = await this.prisma.category.findFirst({
      where: { siteId: town.siteId },
      select: { id: true },
    });
    if (!category) {
      category = await this.prisma.category.create({
        data: {
          siteId: town.siteId,
          translations: { create: [{ lang: "hu", name: "Egyéb" }, { lang: "en", name: "Other" }, { lang: "de", name: "Sonstiges" }] },
        },
        select: { id: true },
      });
    }
    const placeName = `${firstName} ${lastName}`.trim() || "Hely";
    await this.entitlementsService.assertCustomerPlaceAllowance(userId);
    const place = await this.prisma.place.create({
      data: {
        siteId: town.siteId,
        townId: town.id,
        ownerId: userId,
        categoryId: category.id,
        plan: "free",
        isActive: false,
        translations: {
          create: ["hu", "en", "de"].map((lang) => ({ lang, name: placeName })),
        },
        memberships: {
          create: { userId, role: PlaceRole.owner },
        },
      },
    });
    return place.id;
  }

  private pickName(translations: Array<{ lang: string; name: string }>, lang: string) {
    return translations.find((row) => row.lang === lang)?.name || translations[0]?.name || "";
  }

  private isoCode(value: string) {
    const code = value.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) {
      throw new BadRequestException("Country must be an ISO 3166 alpha-2 code");
    }
    return code;
  }

  private slugify(value: string) {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private normalizeDomains(domains: CountryDomainInput[]) {
    const rows = domains
      .map((row) => ({
        domain: normalizeDomainHost(row.domain),
        defaultLang: row.defaultLang || "hu",
        isPrimary: Boolean(row.isPrimary),
      }))
      .filter((row): row is { domain: string; defaultLang: string; isPrimary: boolean } => Boolean(row.domain));
    if (!rows.length) return [];
    if (!rows.some((row) => row.isPrimary)) rows[0].isPrimary = true;
    let primarySeen = false;
    return rows.map((row) => {
      const isPrimary = row.isPrimary && !primarySeen;
      if (isPrimary) primarySeen = true;
      return { ...row, isPrimary };
    });
  }

  /** Town, place and collection hosts are not reassigned from the country/region domain editor. */
  private async assertHostFreeOfOtherEntities(domain: string) {
    const [town, place, collection] = await Promise.all([
      this.prisma.town.findUnique({ where: { customDomain: domain }, select: { id: true } }),
      this.prisma.place.findUnique({ where: { customDomain: domain }, select: { id: true } }),
      this.prisma.collection.findUnique({ where: { domain }, select: { id: true } }),
    ]);
    if (town || place || collection) {
      throw new BadRequestException(`A(z) ${domain} domain már használatban van.`);
    }
  }

  private async assertDomainsFree(domains: CountryDomainInput[], exceptCountryId?: string) {
    for (const row of domains) {
      const domain = normalizeDomainHost(row.domain);
      if (!domain) continue;
      const [siteDomain, countryDomain, sitePrimary] = await Promise.all([
        this.prisma.siteDomain.findUnique({ where: { domain } }),
        this.prisma.countryDomain.findUnique({ where: { domain } }),
        this.prisma.site.findFirst({ where: { primaryDomain: domain } }),
      ]);
      if (siteDomain || sitePrimary) {
        throw new BadRequestException(`Domain ${domain} already belongs to a region`);
      }
      if (countryDomain && countryDomain.countryId !== exceptCountryId) {
        throw new BadRequestException(`Domain ${domain} already belongs to a country`);
      }
    }
  }
}

/**
 * Compose client-side {@link Seo} for a place detail page:
 * admin seo* cascade → category keyword hints → LocalBusiness (+ optional BreadcrumbList) JSON-LD.
 */
import type { Seo } from "../types/seo";
import type { Place } from "../types/place";
import {
  generateBreadcrumbListSchema,
  generateLocalBusinessSchema,
  robotsDirective,
} from "./schemaOrg";
import { resolveSeoFields, stripHtml } from "./resolveSeoFields";

/**
 * @param base Optional SEO already loaded for the place (admin overrides / API seo block)
 * @param place Public place entity
 * @param ctx Canonical URL, optional town label, crawl flag, breadcrumbs
 * @returns Fully populated Seo for {@link useSeo}
 */
export function buildPlaceSeo(
  base: Seo | undefined,
  place: Place,
  ctx: {
    canonical: string;
    townName?: string;
    indexable?: boolean;
    breadcrumbs?: Array<{ name: string; url: string }>;
  }
) {
  const town = ctx.townName ? ` – ${ctx.townName}` : "";
  const resolved = resolveSeoFields(
    {
      seoTitle: base?.title,
      seoDescription: base?.description,
      seoImage: base?.image,
      name: place.name,
      description: place.description,
      heroImage: place.heroImage,
    },
    {
      title: `${place.name}${town}`,
      description: `Fedezd fel: ${place.name}${town}.`,
    }
  );
  const fallbackTitle = resolved.title.includes(place.name)
    ? resolved.title
    : `${resolved.title}${town}`;
  const fallbackDescription = resolved.description;
  const placeImage = resolved.image;

  const allKeywords = [...(base?.keywords ?? []), ...(place.seo?.keywords ?? [])];

  const seo: Seo = {
    title: fallbackTitle,
    description: fallbackDescription,
    image: placeImage,
    keywords: allKeywords,
    canonical: base?.canonical ?? ctx.canonical,
    robots: base?.robots ?? robotsDirective(ctx.indexable),
    og: {
      type: "article",
      title: base?.og?.title || fallbackTitle,
      description: base?.og?.description || fallbackDescription,
      image: base?.og?.image ?? placeImage,
    },
    twitter: {
      card: placeImage ? "summary_large_image" : "summary",
      title: base?.twitter?.title || fallbackTitle,
      description: base?.twitter?.description || fallbackDescription,
      image: base?.twitter?.image ?? placeImage,
    },
  };

  // Category hint keywords
  // Since categories are now dynamic entities with localized names,
  // we add keywords based on common category name patterns
  const extraKw: string[] = [];
  const categoryLower = place.category?.toLowerCase() ?? "";

  // Match common category names in different languages
  if (
    categoryLower.includes("bor") ||
    categoryLower.includes("winery") ||
    categoryLower.includes("weingut")
  ) {
    extraKw.push("borászat", "borkóstoló");
  }
  if (
    categoryLower.includes("szállás") ||
    categoryLower.includes("accommodation") ||
    categoryLower.includes("unterkunft")
  ) {
    extraKw.push("szállás", "foglalás");
  }
  if (
    categoryLower.includes("termelő") ||
    categoryLower.includes("producer") ||
    categoryLower.includes("produzent")
  ) {
    extraKw.push("helyi termék", "termelő");
  }
  if (
    categoryLower.includes("vendéglátás") ||
    categoryLower.includes("hospitality") ||
    categoryLower.includes("gastronomie")
  ) {
    extraKw.push("vendéglátás", "étterem", "kávézó");
  }
  if (
    categoryLower.includes("kézműves") ||
    categoryLower.includes("craft") ||
    categoryLower.includes("handwerk")
  ) {
    extraKw.push("kézműves", "workshop");
  }

  seo.keywords = uniq([...(seo.keywords ?? []), ...extraKw]);

  // Generate Schema.org LocalBusiness structured data
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const openingHoursSpec = place.openingHours
    ?.filter((oh) => !oh.isClosed && oh.openTime && oh.closeTime)
    .map((oh) => ({
      dayOfWeek:
        dayNames[oh.dayOfWeek] || `https://schema.org/${dayNames[oh.dayOfWeek] || "DayOfWeek"}`,
      opens: oh.openTime || undefined,
      closes: oh.closeTime || undefined,
    }));

  const sameAs: string[] = [];
  if (place.contact?.website) sameAs.push(place.contact.website);
  if (place.contact?.facebook) sameAs.push(place.contact.facebook);

  const localBusiness = generateLocalBusinessSchema({
    name: place.name,
    description: stripHtml(base?.description || place.description),
    image: placeImage,
    url: ctx.canonical,
    address: place.contact?.address ? stripHtml(place.contact.address) : undefined,
    telephone: place.contact?.phone,
    email: place.contact?.email,
    geo: place.location
      ? {
          latitude: place.location.lat,
          longitude: place.location.lng,
        }
      : undefined,
    openingHoursSpecification:
      openingHoursSpec && openingHoursSpec.length > 0 ? openingHoursSpec : undefined,
    priceRange: place.priceBand || undefined,
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  });

  if (ctx.breadcrumbs && ctx.breadcrumbs.length > 0) {
    seo.schemaOrg = {
      type: "Graph",
      data: [localBusiness, generateBreadcrumbListSchema({ items: ctx.breadcrumbs })],
    };
  } else {
    seo.schemaOrg = {
      type: "LocalBusiness",
      data: {
        name: place.name,
        description: stripHtml(base?.description || place.description),
        image: placeImage,
        url: ctx.canonical,
        address: place.contact?.address ? stripHtml(place.contact.address) : undefined,
        telephone: place.contact?.phone,
        email: place.contact?.email,
        geo: place.location
          ? {
              latitude: place.location.lat,
              longitude: place.location.lng,
            }
          : undefined,
        openingHoursSpecification:
          openingHoursSpec && openingHoursSpec.length > 0 ? openingHoursSpec : undefined,
        priceRange: place.priceBand || undefined,
        sameAs: sameAs.length > 0 ? sameAs : undefined,
      },
    };
  }

  return seo;
}

function uniq(arr: string[]) {
  const out: string[] = [];
  for (const s of arr.map((x) => x.trim()).filter(Boolean)) if (!out.includes(s)) out.push(s);
  return out;
}

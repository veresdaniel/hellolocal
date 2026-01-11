import type { Seo } from "../types/seo";
import type { Place } from "../types/place";
import { generateLocalBusinessSchema } from "./schemaOrg";

export function buildPlaceSeo(base: Seo | undefined, place: Place, ctx: { canonical: string; townName?: string }) {
  const town = ctx.townName ? ` – ${ctx.townName}` : "";
  const placeImage = base?.image || place.heroImage;
  
  // Helper to remove HTML tags and normalize whitespace
  const stripHtml = (html: string | null | undefined): string => {
    if (!html) return "";
    // Remove HTML tags
    const text = html.replace(/<[^>]*>/g, " ");
    // Normalize whitespace (multiple spaces/newlines to single space)
    return text.replace(/\s+/g, " ").trim();
  };

  // Helper to extract first 2 sentences from HTML/text
  const getFirstSentences = (html: string | undefined, count: number = 2): string => {
    if (!html) return "";
    // Remove HTML tags
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    // Split by sentence endings (. ! ?)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, count).join(" ").trim();
  };
  
  // Fallback title: seoTitle or name + town
  const fallbackTitle = base?.title || `${place.name}${town}`;
  
  // Fallback description: seoDescription (strip HTML) or first 2 sentences from description
  const fallbackDescription = 
    (base?.description ? stripHtml(base.description) : null) || 
    getFirstSentences(place.description, 2) || 
    `Fedezd fel: ${place.name}${town}.`;
  
  // Combine SEO keywords from base and place.seo
  const allKeywords = [...(base?.keywords ?? []), ...(place.seo?.keywords ?? [])];
  
  const seo: Seo = {
    title: fallbackTitle,
    description: fallbackDescription,
    image: placeImage,
    keywords: allKeywords,
    canonical: base?.canonical ?? ctx.canonical,
    og: { 
      type: "article",
      title: base?.og?.title || base?.title || fallbackTitle,
      description: base?.og?.description || base?.description || fallbackDescription,
      image: base?.og?.image ?? placeImage,
    },
    twitter: { 
      card: placeImage ? "summary_large_image" : "summary",
      title: base?.twitter?.title || base?.title || fallbackTitle,
      description: base?.twitter?.description || base?.description || fallbackDescription,
      image: base?.twitter?.image ?? placeImage,
    },
  };

  // Category hint keywords
  // Since categories are now dynamic entities with localized names,
  // we add keywords based on common category name patterns
  const extraKw: string[] = [];
  const categoryLower = place.category?.toLowerCase() ?? "";
  
  // Match common category names in different languages
  if (categoryLower.includes("bor") || categoryLower.includes("winery") || categoryLower.includes("weingut")) {
    extraKw.push("borászat", "borkóstoló");
  }
  if (categoryLower.includes("szállás") || categoryLower.includes("accommodation") || categoryLower.includes("unterkunft")) {
    extraKw.push("szállás", "foglalás");
  }
  if (categoryLower.includes("termelő") || categoryLower.includes("producer") || categoryLower.includes("produzent")) {
    extraKw.push("helyi termék", "termelő");
  }
  if (categoryLower.includes("vendéglátás") || categoryLower.includes("hospitality") || categoryLower.includes("gastronomie")) {
    extraKw.push("vendéglátás", "étterem", "kávézó");
  }
  if (categoryLower.includes("kézműves") || categoryLower.includes("craft") || categoryLower.includes("handwerk")) {
    extraKw.push("kézműves", "workshop");
  }

  seo.keywords = uniq([...(seo.keywords ?? []), ...extraKw]);

  // Generate Schema.org LocalBusiness structured data
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const openingHoursSpec = place.openingHours
    ?.filter((oh) => !oh.isClosed && oh.openTime && oh.closeTime)
    .map((oh) => ({
      dayOfWeek: dayNames[oh.dayOfWeek] || `https://schema.org/${dayNames[oh.dayOfWeek] || "DayOfWeek"}`,
      opens: oh.openTime || undefined,
      closes: oh.closeTime || undefined,
    }));

  const sameAs: string[] = [];
  if (place.contact?.website) sameAs.push(place.contact.website);
  if (place.contact?.facebook) sameAs.push(place.contact.facebook);

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
      openingHoursSpecification: openingHoursSpec && openingHoursSpec.length > 0 ? openingHoursSpec : undefined,
      priceRange: place.priceBand || undefined,
      sameAs: sameAs.length > 0 ? sameAs : undefined,
    },
  };

  return seo;
}

function uniq(arr: string[]) {
  const out: string[] = [];
  for (const s of arr.map(x => x.trim()).filter(Boolean)) if (!out.includes(s)) out.push(s);
  return out;
}

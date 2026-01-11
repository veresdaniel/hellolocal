import type { Seo } from "../types/seo";
import type { Place } from "../types/place";

export function buildPlaceSeo(base: Seo | undefined, place: Place, ctx: { canonical: string; townName?: string }) {
  const town = ctx.townName ? ` – ${ctx.townName}` : "";
  const placeImage = base?.image || place.heroImage;
  
  // Helper to extract first 2 sentences from HTML/text
  const getFirstSentences = (html: string | undefined, count: number = 2): string => {
    if (!html) return "";
    // Remove HTML tags
    const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    // Split by sentence endings (. ! ?)
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, count).join(" ").trim();
  };
  
  // Fallback title: name + town
  const fallbackTitle = `${place.name}${town}`;
  
  // Fallback description: first 2 sentences from description or teaser
  const fallbackDescription = 
    getFirstSentences(place.description, 2) || 
    getFirstSentences(place.teaser, 2) || 
    `Fedezd fel: ${place.name}${town}.`;
  
  const seo: Seo = {
    title: base?.title || fallbackTitle,
    description: base?.description || fallbackDescription,
    image: placeImage,
    keywords: base?.keywords ?? [],
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

  return seo;
}

function uniq(arr: string[]) {
  const out: string[] = [];
  for (const s of arr.map(x => x.trim()).filter(Boolean)) if (!out.includes(s)) out.push(s);
  return out;
}

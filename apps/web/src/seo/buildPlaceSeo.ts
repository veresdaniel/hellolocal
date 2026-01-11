import type { Seo } from "../types/seo";
import type { Place } from "../types/place";

export function buildPlaceSeo(base: Seo | undefined, place: Place, ctx: { canonical: string; townName?: string }) {
  const town = ctx.townName ? ` – ${ctx.townName}` : "";
  const placeImage = base?.image || place.heroImage;
  
  const seo: Seo = {
    title: base?.title ?? `${place.name}${town}`,
    description: base?.description ?? `Fedezd fel: ${place.name}${town}.`,
    image: placeImage,
    keywords: base?.keywords ?? [],
    canonical: base?.canonical ?? ctx.canonical,
    og: { 
      type: "article",
      title: base?.og?.title ?? base?.title ?? `${place.name}${town}`,
      description: base?.og?.description ?? base?.description ?? `Fedezd fel: ${place.name}${town}.`,
      image: base?.og?.image ?? placeImage,
    },
    twitter: { 
      card: placeImage ? "summary_large_image" : "summary",
      title: base?.twitter?.title ?? base?.title ?? `${place.name}${town}`,
      description: base?.twitter?.description ?? base?.description ?? `Fedezd fel: ${place.name}${town}.`,
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

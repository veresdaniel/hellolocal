import type { Seo } from "../types/seo";
import type { Place } from "../types/place";

export function buildPlaceSeo(base: Seo | undefined, place: Place, ctx: { canonical: string; townName?: string }) {
  const town = ctx.townName ? ` – ${ctx.townName}` : "";
  const seo: Seo = {
    title: base?.title ?? `${place.name}${town}`,
    description: base?.description ?? `Fedezd fel: ${place.name}${town}.`,
    image: base?.image,
    keywords: base?.keywords ?? [],
    canonical: base?.canonical ?? ctx.canonical,
    og: { ...base?.og, type: base?.og?.type ?? "article" },
    twitter: { ...base?.twitter },
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

  // OG/Twitter derived
  seo.og = {
    ...seo.og,
    title: seo.og?.title ?? seo.title,
    description: seo.og?.description ?? seo.description,
    image: seo.og?.image ?? seo.image,
  };
  seo.twitter = {
    card: seo.twitter?.card ?? (seo.image ? "summary_large_image" : "summary"),
    title: seo.twitter?.title ?? seo.title,
    description: seo.twitter?.description ?? seo.description,
    image: seo.twitter?.image ?? seo.image,
  };

  return seo;
}

function uniq(arr: string[]) {
  const out: string[] = [];
  for (const s of arr.map(x => x.trim()).filter(Boolean)) if (!out.includes(s)) out.push(s);
  return out;
}

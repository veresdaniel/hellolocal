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
  const extraKw: string[] = [];
  if (place.category === "winery") extraKw.push("borászat", "borkóstoló");
  if (place.category === "accommodation") extraKw.push("szállás", "foglalás");
  if (place.category === "food_producer") extraKw.push("helyi termék", "termelő");
  if (place.category === "hospitality") extraKw.push("vendéglátás", "étterem", "kávézó");
  if (place.category === "craft") extraKw.push("kézműves", "workshop");

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

import { apiDelete, apiGet, apiGetPublic, apiPost, apiPut } from "./client";

export type PlatformGuideSummary = {
  slug: string;
  title: string;
  imageUrl: string | null;
  imageCaption: string | null;
};

export type PlatformGuidePublic = PlatformGuideSummary & {
  lang: string;
  body: string;
  seoTitle: string;
  seoDescription: string;
  indexable: boolean;
  languages: string[];
  /** Per-language public URL slugs for hreflang / language switch. */
  slugsByLang?: Record<string, string>;
  canonicalSlug?: string;
};

export type PlatformGuideTranslation = {
  id?: string;
  lang: string;
  slug?: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  imageCaption: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
};

export type PlatformGuideAdmin = {
  id: string;
  slug: string;
  sortOrder: number;
  isPublished: boolean;
  translations: PlatformGuideTranslation[];
};

export function listPlatformGuides(lang: string) {
  return apiGetPublic<PlatformGuideSummary[]>(
    `/public/platform-guides?lang=${encodeURIComponent(lang)}`
  );
}

export function getPlatformGuide(slug: string, lang: string) {
  return apiGetPublic<PlatformGuidePublic>(
    `/public/platform-guides/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`
  );
}

export function listAdminPlatformGuides() {
  return apiGet<PlatformGuideAdmin[]>("/admin/platform-guides");
}

export function getAdminPlatformGuide(id: string) {
  return apiGet<PlatformGuideAdmin>(`/admin/platform-guides/${encodeURIComponent(id)}`);
}

export function createPlatformGuide(body: unknown) {
  return apiPost<PlatformGuideAdmin>("/admin/platform-guides", body);
}

export function updatePlatformGuide(id: string, body: unknown) {
  return apiPut<PlatformGuideAdmin>(`/admin/platform-guides/${encodeURIComponent(id)}`, body);
}

export function deletePlatformGuide(id: string) {
  return apiDelete<{ ok: boolean }>(`/admin/platform-guides/${encodeURIComponent(id)}`);
}

// src/api/static-pages.api.ts
import { apiGetPublic } from "./client";

export interface StaticPage {
  id: string;
  category: "blog" | "tudastar" | "infok";
  title: string;
  shortDescription?: string | null; // HTML - for list view cards
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function getStaticPages(
  lang: string,
  tenantKey: string,
  category?: string
): Promise<StaticPage[]> {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  const queryString = params.toString();
  return apiGetPublic<StaticPage[]>(
    `/public/${lang}/${tenantKey}/static-pages${queryString ? `?${queryString}` : ""}`
  );
}

export function getStaticPage(
  lang: string,
  id: string,
  tenantKey: string
): Promise<StaticPage & { seo: any }> {
  return apiGetPublic<StaticPage & { seo: any }>(`/public/${lang}/${tenantKey}/static-pages/${id}`);
}

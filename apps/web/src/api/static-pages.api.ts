// src/api/static-pages.api.ts
import { apiGetPublic } from "./client";

export interface StaticPage {
  id: string;
  category: "blog" | "tudastar" | "infok";
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export function getStaticPages(lang: string, tenantKey?: string, category?: string): Promise<StaticPage[]> {
  const params = new URLSearchParams();
  if (tenantKey) params.append("tenantKey", tenantKey);
  if (category) params.append("category", category);
  const queryString = params.toString();
  return apiGetPublic<StaticPage[]>(`/${lang}/static-pages${queryString ? `?${queryString}` : ""}`);
}

export function getStaticPage(lang: string, id: string, tenantKey?: string): Promise<StaticPage & { seo: any }> {
  const params = new URLSearchParams();
  if (tenantKey) params.append("tenantKey", tenantKey);
  const queryString = params.toString();
  return apiGetPublic<StaticPage & { seo: any }>(`/${lang}/static-pages/${id}${queryString ? `?${queryString}` : ""}`);
}


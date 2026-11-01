import { apiDelete, apiGet, apiGetPublic, apiPost, apiPut } from "./client";
import type { Lang } from "../app/config";

export type PublicProduct = {
  id: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  category: string;
  placeId: string;
  placeName: string | null;
  placeSlug: string | null;
  name: string;
  description: string;
};

export type ProductListResponse = {
  items: PublicProduct[];
  total: number;
  page: number;
  pageSize: number;
  categories: string[];
};

export type ProductTranslationInput = {
  lang: Lang;
  name: string;
  description?: string;
};

export type AdminProduct = {
  id: string;
  siteId: string;
  placeId: string;
  placeName: string | null;
  price: number;
  currency: string;
  imageUrl: string | null;
  category: string;
  isActive: boolean;
  sortOrder: number;
  clicks: number;
  translations: ProductTranslationInput[];
};

export type ProductWriteInput = {
  placeId: string;
  price: number;
  currency: string;
  imageUrl?: string | null;
  category: string;
  isActive: boolean;
  sortOrder: number;
  translations: ProductTranslationInput[];
};

export function getPublicProducts(
  lang: string,
  siteKey: string,
  query: { category?: string; placeId?: string; q?: string; page?: number; pageSize?: number }
) {
  const params = new URLSearchParams();
  if (query.category) params.set("category", query.category);
  if (query.placeId) params.set("placeId", query.placeId);
  if (query.q) params.set("q", query.q);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const suffix = params.toString() ? `?${params}` : "";
  return apiGetPublic<ProductListResponse>(`/public/${lang}/${siteKey}/products${suffix}`);
}

export function getAdminProducts(siteId: string, q?: string, placeId?: string) {
  const params = new URLSearchParams({ siteId });
  if (q) params.set("q", q);
  if (placeId) params.set("placeId", placeId);
  return apiGet<AdminProduct[]>(`/admin/products?${params}`);
}

export function createProduct(siteId: string, data: ProductWriteInput) {
  return apiPost<AdminProduct>(`/admin/products?siteId=${encodeURIComponent(siteId)}`, data);
}

export function updateProduct(siteId: string, id: string, data: ProductWriteInput) {
  return apiPut<AdminProduct>(`/admin/products/${id}?siteId=${encodeURIComponent(siteId)}`, data);
}

export function deleteProduct(siteId: string, id: string) {
  return apiDelete<{ ok: boolean }>(`/admin/products/${id}?siteId=${encodeURIComponent(siteId)}`);
}

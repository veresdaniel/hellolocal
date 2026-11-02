// src/api/admin.api.ts
import {
  CONTENT_DRAFT_DEFAULT_PROVIDER,
  UC_ADMIN_CLIENT_PATH,
  type ContentDraftProviderId,
} from "@hellolocal/shared";
import { apiGet, apiPost, apiPut, apiDelete } from "./client";
import type { UserRole, SiteRole, Lang} from "../types/enums";
import { ACCESS_TOKEN_KEY } from "../constants/authStorage";

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  bio?: string;
  role: "superadmin" | "admin" | "editor" | "viewer";
  isActive: boolean;
  isTwoFactorEnabled?: boolean;
  /** Opt-in floating AI Assistant dock; default false (superadmins seeded true). */
  aiAssistantEnabled?: boolean;
  sites: Array<{
    id: string;
    siteId: string;
    isPrimary: boolean;
    site: {
      id: string;
      slug: string;
      translations: Array<{
        lang: string;
        name: string;
      }>;
    };
  }>;
  townMemberships?: Array<{
    id: string;
    town: { id: string; translations: Array<{ lang: string; name: string }> };
  }>;
  placeMemberships?: Array<{
    id: string;
    place: { id: string; translations: Array<{ lang: string; name: string }> };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  bio?: string;
  isActive?: boolean;
  siteIds?: string[];
  aiAssistantEnabled?: boolean;
}

export interface UpdateUserRoleDto {
  role: "superadmin" | "admin" | "editor" | "viewer";
}

// Users
export function getUsers(siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiGet<User[]>(`/admin/users${params}`);
}

export function getCurrentUser() {
  return apiGet<User>("/admin/users/me");
}

export function getUser(id: string) {
  return apiGet<User>(`/admin/users/${id}`);
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  bio?: string;
  role?: "superadmin" | "admin" | "editor" | "viewer";
  isActive?: boolean;
  siteIds?: string[];
}

export function createUser(data: CreateUserDto) {
  return apiPost<User>("/admin/users", data);
}

export function updateUser(id: string, data: UpdateUserDto) {
  return apiPut<User>(`/admin/users/${id}`, data);
}

export function updateUserRole(id: string, data: UpdateUserRoleDto) {
  return apiPut<User>(`/admin/users/${id}/role`, data);
}

export function deleteUser(id: string) {
  return apiDelete<{ message: string }>(`/admin/users/${id}`);
}

export function disableTwoFactorForUser(id: string, password: string) {
  return apiPost<{ message: string }>(`/admin/users/${id}/two-factor/disable`, { password });
}

// Categories
export function getCategories(siteId?: string, page?: number, limit?: number) {
  const params = new URLSearchParams();
  if (siteId) params.append("siteId", siteId);
  if (page !== undefined) params.append("page", String(page));
  if (limit !== undefined) params.append("limit", String(limit));
  const queryString = params.toString();
  return apiGet<{
    categories: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/admin/categories${queryString ? `?${queryString}` : ""}`);
}

export function getCategory(id: string) {
  return apiGet<any>(`/admin/categories/${id}`);
}

export function createCategory(data: any) {
  return apiPost<any>("/admin/categories", data);
}

export function updateCategory(id: string, data: any, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiPut<any>(`/admin/categories/${id}${params}`, data);
}

export function deleteCategory(id: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiDelete<{ message: string }>(`/admin/categories/${id}${params}`);
}

export function reorderCategories(
  siteId: string,
  updates: Array<{ id: string; parentId: string | null; order: number }>
) {
  return apiPut<{ message: string }>("/admin/categories/reorder", { siteId, updates });
}

// Tags
export function getTags(siteId?: string, page?: number, limit?: number) {
  const params = new URLSearchParams();
  if (siteId) params.append("siteId", siteId);
  if (page !== undefined) params.append("page", String(page));
  if (limit !== undefined) params.append("limit", String(limit));
  const queryString = params.toString();
  return apiGet<
    | any[]
    | {
        tags: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }
  >(`/admin/tags${queryString ? `?${queryString}` : ""}`);
}

export function getTag(id: string) {
  return apiGet<any>(`/admin/tags/${id}`);
}

export function createTag(data: any) {
  return apiPost<any>("/admin/tags", data);
}

export function updateTag(id: string, data: any, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiPut<any>(`/admin/tags/${id}${params}`, data);
}

export function deleteTag(id: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiDelete<{ message: string }>(`/admin/tags/${id}${params}`);
}

// Price Bands
export function getPriceBands(siteId?: string, page?: number, limit?: number) {
  const params = new URLSearchParams();
  if (siteId) params.append("siteId", siteId);
  if (page !== undefined) params.append("page", String(page));
  if (limit !== undefined) params.append("limit", String(limit));
  const queryString = params.toString();
  return apiGet<
    | any[]
    | {
        priceBands: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }
  >(`/admin/price-bands${queryString ? `?${queryString}` : ""}`);
}

export function getPriceBand(id: string) {
  return apiGet<any>(`/admin/price-bands/${id}`);
}

export function createPriceBand(data: any) {
  return apiPost<any>("/admin/price-bands", data);
}

export function updatePriceBand(id: string, data: any, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiPut<any>(`/admin/price-bands/${id}${params}`, data);
}

export function deletePriceBand(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiDelete<{ message: string }>(`/admin/price-bands/${id}${params}`);
}

// Towns
export function getTowns(
  siteId?: string,
  page?: number,
  limit?: number,
  options?: { includeStandalone?: boolean; standaloneOnly?: boolean }
) {
  const params = new URLSearchParams();
  if (options?.standaloneOnly) {
    params.append("standaloneOnly", "true");
  } else if (siteId) {
    params.append("siteId", siteId);
  }
  if (options?.includeStandalone) params.append("includeStandalone", "true");
  if (page !== undefined) params.append("page", String(page));
  if (limit !== undefined) params.append("limit", String(limit));
  const queryString = params.toString();
  return apiGet<
    | any[]
    | {
        towns: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }
  >(`/admin/towns${queryString ? `?${queryString}` : ""}`);
}

export function getTown(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any>(`/admin/towns/${id}${params}`);
}

export function createTown(data: any) {
  return apiPost<any>("/admin/towns", data);
}

export function updateTown(id: string, data: any, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiPut<any>(`/admin/towns/${id}${params}`, data);
}

export function deleteTown(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiDelete<{ message: string }>(`/admin/towns/${id}${params}`);
}

// Places
export function getPlaces(siteId?: string, page?: number, limit?: number, townId?: string) {
  const params = new URLSearchParams();
  if (siteId) params.append("siteId", siteId);
  if (page !== undefined) params.append("page", String(page));
  if (limit !== undefined) params.append("limit", String(limit));
  if (townId) params.append("townId", townId);
  const queryString = params.toString();
  return apiGet<
    | any[]
    | {
        places: any[];
        pagination: { page: number; limit: number; total: number; totalPages: number };
      }
  >(`/admin/places${queryString ? `?${queryString}` : ""}`);
}

export function getPlace(id: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiGet<any>(`/admin/places/${id}${params}`);
}

export function createPlace(data: any) {
  return apiPost<any>("/admin/places", data);
}

export function updatePlace(id: string, data: any, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiPut<any>(`/admin/places/${id}${params}`, data);
}

export function deletePlace(id: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiDelete<{ message: string }>(`/admin/places/${id}${params}`);
}

// Place Price List
export interface PriceListBlock {
  title: string;
  items: Array<{
    label: string;
    price: number | null;
    note?: string;
  }>;
}

export interface PriceList {
  id: string;
  placeId: string;
  currency: string;
  blocks: PriceListBlock[];
  note: string | null;
  isActive: boolean;
  isEnabled: boolean;
  requireAuth: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdatePriceListDto {
  blocks: PriceListBlock[];
  currency?: string;
  note?: string | null;
  isActive?: boolean;
  isEnabled?: boolean;
  requireAuth?: boolean;
}

export function getPlacePriceList(placeId: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiGet<PriceList | null>(`/admin/places/${placeId}/pricelist${params}`);
}

export function updatePlacePriceList(placeId: string, data: UpdatePriceListDto, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiPut<PriceList>(`/admin/places/${placeId}/pricelist${params}`, data);
}

// Legal Pages
export function getLegalPages(siteId?: string, page?: number, limit?: number) {
  const params = new URLSearchParams();
  if (siteId) params.append("siteId", siteId);
  if (page !== undefined) params.append("page", String(page));
  if (limit !== undefined) params.append("limit", String(limit));
  const queryString = params.toString();
  return apiGet<{
    legalPages: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/admin/legal-pages${queryString ? `?${queryString}` : ""}`);
}

export function getLegalPage(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any>(`/admin/legal-pages/${id}${params}`);
}

export function getLegalPageByKey(key: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiGet<any>(`/admin/legal-pages/key/${key}${params}`);
}

export function createLegalPage(data: any) {
  return apiPost<any>("/admin/legal-pages", data);
}

export function updateLegalPage(id: string, data: any, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiPut<any>(`/admin/legal-pages/${id}${params}`, data);
}

export function deleteLegalPage(id: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiDelete<{ message: string }>(`/admin/legal-pages/${id}${params}`);
}

// Static Pages
export function getStaticPages(
  tenantId?: string,
  category?: string,
  page?: number,
  limit?: number
) {
  const params = new URLSearchParams();
  if (tenantId) params.append("tenantId", tenantId);
  if (category) params.append("category", category);
  if (page !== undefined) params.append("page", String(page));
  if (limit !== undefined) params.append("limit", String(limit));
  const queryString = params.toString();
  return apiGet<{
    staticPages: any[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/admin/static-pages${queryString ? `?${queryString}` : ""}`);
}

export function getStaticPage(id: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiGet<any>(`/admin/static-pages/${id}${params}`);
}

export function createStaticPage(data: any) {
  return apiPost<any>("/admin/static-pages", data);
}

export function updateStaticPage(id: string, data: any, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiPut<any>(`/admin/static-pages/${id}${params}`, data);
}

export function deleteStaticPage(id: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiDelete<{ message: string }>(`/admin/static-pages/${id}${params}`);
}

// App Settings
export interface AppSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettingDto {
  key: string;
  value: string;
  type?: string;
  description?: string | null;
}

export function getAppSettings() {
  return apiGet<AppSetting[]>("/admin/app-settings");
}

export function getAppSetting(key: string) {
  return apiGet<AppSetting>(`/admin/app-settings/${key}`);
}

export function createAppSetting(data: AppSettingDto) {
  return apiPost<AppSetting>("/admin/app-settings", data);
}

export function updateAppSetting(key: string, data: Omit<AppSettingDto, "key">) {
  return apiPut<AppSetting>(`/admin/app-settings/${key}`, data);
}

export function deleteAppSetting(key: string) {
  return apiDelete<{ message: string }>(`/admin/app-settings/${key}`);
}

export type ContentDraftProvider = ContentDraftProviderId;
export { CONTENT_DRAFT_DEFAULT_PROVIDER };

export type ContentDraftKind =
  | "site"
  | "place"
  | "town"
  | "event"
  | "category"
  | "tag"
  | "product"
  | "staticPage"
  | "legalPage"
  | "collection"
  | "gallery"
  | "priceBand"
  | "generic";

export type ContentDraftField =
  | "name"
  | "title"
  | "shortDescription"
  | "description"
  | "seoTitle"
  | "seoDescription"
  | "accessibility"
  | "content"
  | "caption"
  | "intro";

export interface ContentDraftStatus {
  enabled: boolean;
  allowed: boolean;
  provider?: ContentDraftProvider | null;
  defaultProvider?: ContentDraftProvider;
  keyConfigured?: boolean;
}

export interface ContentDraftRequest {
  kind: ContentDraftKind;
  field?: ContentDraftField;
  siteId?: string;
  placeId?: string;
  lang: string;
  name?: string;
  contextHints?: string;
  categoryId?: string;
  townId?: string;
  existingValue?: string;
  shortDescription?: string;
  description?: string;
}

export interface ContentDraftResult {
  shortDescription?: string;
  description?: string;
  text?: string;
  field?: ContentDraftField;
}

export function getContentDraftStatus(siteId?: string, placeId?: string) {
  const params = new URLSearchParams();
  if (siteId) params.set("siteId", siteId);
  if (placeId) params.set("placeId", placeId);
  const query = params.toString();
  return apiGet<ContentDraftStatus>(`/admin/content-draft/status${query ? `?${query}` : ""}`);
}

export function saveContentDraftSettings(data: {
  provider: ContentDraftProvider;
  apiKey?: string;
}) {
  return apiPut<ContentDraftStatus>("/admin/content-draft/settings", data);
}

export function requestContentDraft(data: ContentDraftRequest) {
  return apiPost<ContentDraftResult>("/admin/content-draft", data);
}

export type UnderConstructionCopyFields = {
  title: string;
  body: string;
  buttonLabel: string;
};

export type UnderConstructionCopyByLang = Record<"hu" | "en" | "de", UnderConstructionCopyFields>;

export type UnderConstructionAdminStatus = {
  enabled: boolean;
  accessToken: string | null;
  hasToken: boolean;
  tokenUpdatedAt: string | null;
  queryParam: string;
  cookieName: string;
  cookieMaxAgeSec: number;
  copy: UnderConstructionCopyByLang;
};

export type UnderConstructionSaveDto = {
  enabled: boolean;
  copy?: Partial<Record<"hu" | "en" | "de", Partial<UnderConstructionCopyFields>>>;
};

export function getUnderConstructionSettings() {
  return apiGet<UnderConstructionAdminStatus>(UC_ADMIN_CLIENT_PATH);
}

export function saveUnderConstructionSettings(data: UnderConstructionSaveDto) {
  return apiPut<UnderConstructionAdminStatus>(UC_ADMIN_CLIENT_PATH, data);
}

export function regenerateUnderConstructionToken() {
  return apiPost<UnderConstructionAdminStatus>(`${UC_ADMIN_CLIENT_PATH}/regenerate-token`, {});
}

export function invalidateUnderConstructionToken() {
  return apiPost<UnderConstructionAdminStatus>(`${UC_ADMIN_CLIENT_PATH}/invalidate-token`, {});
}

export function getDefaultLanguage() {
  return apiGet<{ defaultLanguage: Lang}>("/admin/app-settings/default-language");
}

export function setDefaultLanguage(language: Lang) {
  return apiPut<{ defaultLanguage: Lang}>("/admin/app-settings/default-language", {
    language,
  });
}

export function getGlobalCrawlability() {
  return apiGet<{ isCrawlable: boolean }>("/admin/app-settings/global-crawlability");
}

export function setGlobalCrawlability(isCrawlable: boolean) {
  return apiPut<{ isCrawlable: boolean }>("/admin/app-settings/global-crawlability", {
    isCrawlable,
  });
}

// Domains (admin UI). Prisma/API entity remains Brand; REST path stays /admin/brands.
export interface Brand {
  id: string;
  name: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  theme: any | null;
  placeholders: {
    defaultPlaceholderCardImage?: string | null;
    defaultPlaceholderDetailHeroImage?: string | null;
    defaultEventPlaceholderCardImage?: string | null;
    brandBadgeIcon?: string | null;
  } | null;
  mapDefaults: {
    townId?: string | null;
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  tenants?: Array<{
    id: string;
    slug: string;
    isActive: boolean;
  }>;
}

export interface CreateBrandDto {
  name: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  theme?: any;
  placeholders?: {
    defaultPlaceholderCardImage?: string | null;
    defaultPlaceholderDetailHeroImage?: string | null;
    defaultEventPlaceholderCardImage?: string | null;
    brandBadgeIcon?: string | null;
  } | null;
  mapDefaults?: {
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
    townId?: string | null;
  } | null;
}

export interface UpdateBrandDto {
  name?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  theme?: any;
  placeholders?: {
    defaultPlaceholderCardImage?: string | null;
    defaultPlaceholderDetailHeroImage?: string | null;
    defaultEventPlaceholderCardImage?: string | null;
    brandBadgeIcon?: string | null;
  } | null;
  mapDefaults?: {
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
    townId?: string | null;
  } | null;
}

// Site Instances (admin only)
export interface SiteInstance {
  id: string;
  siteId: string;
  lang: Lang;
  isDefault: boolean;
  mapConfig: {
    townId?: string | null;
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
  } | null;
  features: {
    isCrawlable?: boolean;
    enableEvents?: boolean;
    enableBlog?: boolean;
    enableStaticPages?: boolean;
    [key: string]: any;
  } | null;
  sitePlaceholders?: {
    card?: string | null;
    hero?: string | null;
    eventCard?: string | null;
    [key: string]: any;
  } | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  site?: {
    id: string;
    slug: string;
    isActive: boolean;
    brand?: {
      id: string;
      name: string;
    };
  };
}

export interface CreateSiteInstanceDto {
  siteId: string;
  lang: Lang;
  isDefault?: boolean;
  mapConfig?: {
    townId?: string | null;
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
  } | null;
  features?: {
    enableEvents?: boolean;
    enableBlog?: boolean;
    enableStaticPages?: boolean;
    [key: string]: any;
  } | null;
  sitePlaceholders?: {
    card?: string | null;
    hero?: string | null;
    eventCard?: string | null;
    [key: string]: any;
  } | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

export interface UpdateSiteInstanceDto {
  lang?: Lang;
  isDefault?: boolean;
  mapConfig?: {
    townId?: string | null;
    lat?: number | null;
    lng?: number | null;
    zoom?: number | null;
  } | null;
  features?: {
    enableEvents?: boolean;
    enableBlog?: boolean;
    enableStaticPages?: boolean;
    [key: string]: any;
  } | null;
  sitePlaceholders?: {
    card?: string | null;
    hero?: string | null;
    eventCard?: string | null;
    [key: string]: any;
  } | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

// Sites (admin only)
export interface Site {
  id: string;
  slug: string;
  isActive: boolean;
  isCrawlable?: boolean;
  primaryDomain?: string | null;
  brandId: string;
  brand?: Brand;
  plan?: "basic" | "pro" | "business" | "municipal";
  planStatus?: string | null;
  planValidUntil?: string | null;
  planLimits?: Record<string, any> | null;
  billingEmail?: string | null;
  allowPublicRegistration?: boolean; // If false, only site owner can create users and places (pro/business only)
  /** GA4 measurement ID (G-…). Null/empty disables site analytics. */
  gaMeasurementId?: string | null;
  /** Public theme colors override. Null = inherit Brand.theme. */
  theme?: Record<string, unknown> | null;
  languages?: string[];
  translations: Array<{
    id: string;
    lang: string;
    name: string;
    shortDescription: string | null;
    description: string | null;
    heroImage: string | null;
    landingHtml?: string | null;
    listIntroHtml?: string | null;
    listIntroImage?: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoImage: string | null;
    seoKeywords: string[];
  }>;
  countryId?: string;
  country?: {
    id: string;
    code: string;
    domains?: Array<{ id: string; domain: string; isPrimary: boolean }>;
  } | null;
  siteDomains?: Array<{
    id: string;
    domain: string;
    isActive: boolean;
    isPrimary: boolean;
    defaultLang: Lang;
    createdAt: string;
    updatedAt: string;
  }>;
  siteKeys?: Array<{
    id: string;
    siteId: string;
    lang: Lang;
    slug: string;
    isPrimary: boolean;
    isActive: boolean;
    redirectToId?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  siteInstances?: Array<SiteInstance>;
  usage?: {
    places: number;
    featured: number;
    events: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateSiteDto {
  slug: string;
  brandId: string; // Required: site must belong to a brand
  translations: Array<{
    lang: Lang;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  primaryDomain?: string | null;
  domains?: SiteDomainInput[];
}

export interface UpdateSiteDto {
  slug?: string;
  brandId?: string;
  translations?: Array<{
    lang: Lang;
    name: string;
    shortDescription?: string | null;
    description?: string | null;
    heroImage?: string | null;
    landingHtml?: string | null;
    listIntroHtml?: string | null;
    listIntroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  primaryDomain?: string | null;
  plan?: "basic" | "pro" | "business" | "municipal";
  planStatus?: string;
  planValidUntil?: string | Date | null;
  planLimits?: Record<string, any> | null;
  billingEmail?: string | null;
  allowPublicRegistration?: boolean; // If false, only site owner can create users and places (pro/business only)
  languages?: string[];
  domains?: SiteDomainInput[];
  /** GA4 measurement ID (G-…). Empty string or null disables site analytics. */
  gaMeasurementId?: string | null;
  /** Public theme colors. Null clears site override. */
  theme?: Record<string, unknown> | null;
}

export interface SiteDomainInput {
  domain: string;
  defaultLang?: string | null;
  isPrimary?: boolean;
}

export function getSites() {
  return apiGet<Site[]>("/admin/sites");
}

export function getSite(id: string) {
  return apiGet<Site>(`/admin/sites/${id}`);
}

export function createSite(data: CreateSiteDto) {
  return apiPost<Site>("/admin/sites", data);
}

export function updateSite(id: string, data: UpdateSiteDto) {
  return apiPut<Site>(`/admin/sites/${id}`, data);
}

export function deleteSite(id: string) {
  return apiDelete<{ message: string }>(`/admin/sites/${id}`);
}

// Domains — API still /admin/brands (Brand model)
export function getBrands() {
  return apiGet<Brand[]>("/admin/brands");
}

export function getBrand(id: string) {
  return apiGet<Brand>(`/admin/brands/${id}`);
}

export function createBrand(data: CreateBrandDto) {
  return apiPost<Brand>("/admin/brands", data);
}

export function updateBrand(id: string, data: UpdateBrandDto) {
  return apiPut<Brand>(`/admin/brands/${id}`, data);
}

export function deleteBrand(id: string) {
  return apiDelete<{ message: string }>(`/admin/brands/${id}`);
}

// Site Instances (admin only)
export function getSiteInstances(siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiGet<SiteInstance[]>(`/admin/site-instances${params}`);
}

export function getSiteInstance(id: string) {
  return apiGet<SiteInstance>(`/admin/site-instances/${id}`);
}

export function createSiteInstance(data: CreateSiteInstanceDto) {
  return apiPost<SiteInstance>("/admin/site-instances", data);
}

export function updateSiteInstance(id: string, data: UpdateSiteInstanceDto) {
  return apiPut<SiteInstance>(`/admin/site-instances/${id}`, data);
}

export function deleteSiteInstance(id: string) {
  return apiDelete<{ message: string }>(`/admin/site-instances/${id}`);
}

// Site Memberships (admin only)
export interface SiteMembership {
  id: string;
  siteId: string;
  userId: string;
  role: SiteRole;
  createdAt: string;
  site?: {
    id: string;
    slug: string;
    isActive: boolean;
  };
  user?: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateSiteMembershipDto {
  siteId: string;
  userId: string;
  role: SiteRole;
}

export interface UpdateSiteMembershipDto {
  role?: UserRole | SiteRole;
}

export function getSiteMemberships(siteId?: string, userId?: string) {
  const params = new URLSearchParams();
  if (siteId) params.append("siteId", siteId);
  if (userId) params.append("userId", userId);
  const queryString = params.toString();
  return apiGet<SiteMembership[]>(`/admin/site-memberships${queryString ? `?${queryString}` : ""}`);
}

export function getSiteMembership(id: string) {
  return apiGet<SiteMembership>(`/admin/site-memberships/${id}`);
}

export function createSiteMembership(data: CreateSiteMembershipDto) {
  return apiPost<SiteMembership>("/admin/site-memberships", data);
}

export function updateSiteMembership(id: string, data: UpdateSiteMembershipDto) {
  return apiPut<SiteMembership>(`/admin/site-memberships/${id}`, data);
}

export function deleteSiteMembership(id: string) {
  return apiDelete<{ message: string }>(`/admin/site-memberships/${id}`);
}

// Place Memberships (admin only)
export interface PlaceMembership {
  id: string;
  placeId: string;
  userId: string;
  role: "owner" | "manager" | "editor";
  createdAt: string;
  place?: {
    id: string;
    translations: Array<{
      lang: string;
      name: string;
    }>;
  };
  user?: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreatePlaceMembershipDto {
  placeId: string;
  userId: string;
  role: "owner" | "manager" | "editor";
}

export interface UpdatePlaceMembershipDto {
  role?: "owner" | "manager" | "editor";
}

export function invitePlaceMember(placeId: string, email: string, role: "owner" | "manager" | "editor") {
  return apiPost<{
    membership: PlaceMembership;
    created: boolean;
    emailed: boolean;
    reason: "sent" | "no_smtp";
  }>(`/admin/places/${placeId}/members`, { email, role });
}

export function getPlaceMemberships(placeId?: string, userId?: string) {
  const params = new URLSearchParams();
  if (placeId) params.append("placeId", placeId);
  if (userId) params.append("userId", userId);
  const queryString = params.toString();
  return apiGet<PlaceMembership[]>(
    `/admin/place-memberships${queryString ? `?${queryString}` : ""}`
  );
}

export type AccessKind = "region" | "town" | "place";

export type AccessScope = {
  unrestricted: boolean;
  siteIds: string[];
  regionEditorSiteIds: string[];
  regionAdminSiteIds: string[];
  townIds: string[];
  placeIds: string[];
  pendingSignup?: boolean;
};

export type AccessGrant = {
  id: string;
  kind: AccessKind;
  role: string;
  targetId: string;
  targetName: string;
  user: { id: string; email: string; firstName: string; lastName: string };
};

export function getAccessScope() {
  return apiGet<AccessScope>("/admin/access/scope");
}

export function getAccessGrants() {
  return apiGet<AccessGrant[]>("/admin/access/grants");
}

export function createAccessGrant(data: {
  userId: string;
  kind: AccessKind;
  targetId: string;
  role?: string;
}) {
  return apiPost("/admin/access/grants", data);
}

export function deleteAccessGrant(kind: AccessKind, id: string) {
  return apiDelete(`/admin/access/grants/${kind}/${id}`);
}

export function getTownMembers(townId: string) {
  return apiGet<
    Array<{
      id: string;
      role: string;
      user: { id: string; email: string; firstName: string; lastName: string };
    }>
  >(`/admin/towns/${townId}/members`);
}

export function getMyPlaces(siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiGet<any[]>(`/admin/place-memberships/my-places${params}`);
}

export function getPlaceMembership(id: string) {
  return apiGet<PlaceMembership>(`/admin/place-memberships/${id}`);
}

export function createPlaceMembership(data: CreatePlaceMembershipDto) {
  return apiPost<PlaceMembership>("/admin/place-memberships", data);
}

export function updatePlaceMembership(id: string, data: UpdatePlaceMembershipDto) {
  return apiPut<PlaceMembership>(`/admin/place-memberships/${id}`, data);
}

export function deletePlaceMembership(id: string) {
  return apiDelete<{ message: string }>(`/admin/place-memberships/${id}`);
}

// Two-Factor Authentication
export interface SetupTwoFactorResponse {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

export interface VerifyTwoFactorResponse {
  verified: boolean;
  message: string;
}

export interface TwoFactorStatusResponse {
  isEnabled: boolean;
}

export function setupTwoFactor() {
  return apiPost<SetupTwoFactorResponse>("/two-factor/setup", {});
}

export function verifyAndEnableTwoFactor(token: string) {
  return apiPost<VerifyTwoFactorResponse>("/two-factor/verify", { token });
}

export function disableTwoFactor(options?: {
  userId?: string;
  password?: string;
  token?: string;
}) {
  // Backend requires password and/or TOTP step-up; defaults target to the authenticated user.
  const body: { userId?: string; password?: string; token?: string } = {};
  if (options?.userId) body.userId = options.userId;
  if (options?.password) body.password = options.password;
  if (options?.token) body.token = options.token;
  return apiPost<{ message: string }>("/two-factor/disable", body);
}

export function getTwoFactorStatus() {
  return apiGet<TwoFactorStatusResponse>("/two-factor/status");
}

// App Settings - Map Settings
export interface MapSettings {
  townId: string | null;
  lat: number | null;
  lng: number | null;
  zoom: number | null;
}

export interface SetMapSettingsDto {
  tenantId: string;
  townId?: string | null;
  lat?: number | null;
  lng?: number | null;
  zoom?: number | null;
}

export function getMapSettings(siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiGet<MapSettings>(`/admin/platform-settings/map-settings${params}`);
}

export function setMapSettings(data: SetMapSettingsDto) {
  return apiPut<MapSettings>("/admin/platform-settings/map-settings", data);
}

export interface PlatformSettings {
  siteName: {
    hu: string;
    en: string;
    de: string;
  };
  siteDescription: {
    hu: string;
    en: string;
    de: string;
  };
  seoTitle: {
    hu: string;
    en: string;
    de: string;
  };
  seoDescription: {
    hu: string;
    en: string;
    de: string;
  };
  isCrawlable: boolean;
  defaultPlaceholderCardImage: string | null;
  defaultPlaceholderDetailHeroImage: string | null;
  defaultEventPlaceholderCardImage: string | null;
  brandBadgeIcon: string | null;
  faviconUrl: string | null;
}

export interface SetPlatformSettingsDto {
  siteName?: { hu?: string; en?: string; de?: string };
  siteDescription?: { hu?: string; en?: string; de?: string };
  seoTitle?: { hu?: string; en?: string; de?: string };
  seoDescription?: { hu?: string; en?: string; de?: string };
  isCrawlable?: boolean;
  defaultPlaceholderCardImage?: string | null;
  defaultPlaceholderDetailHeroImage?: string | null;
  defaultEventPlaceholderCardImage?: string | null;
  brandBadgeIcon?: string | null;
  faviconUrl?: string | null;
}

export function getPlatformSettings(siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiGet<PlatformSettings>(`/admin/platform-settings${params}`);
}

export function setPlatformSettings(data: SetPlatformSettingsDto & { siteId: string }) {
  return apiPut<PlatformSettings>("/admin/platform-settings", data);
}

// Feature Matrix (Plan Overrides)
export interface FeatureMatrix {
  planOverrides: {
    BASIC?: {
      limits?: {
        placesMax?: number;
        featuredPlacesMax?: number;
        galleryImagesPerPlaceMax?: number;
        eventsPerMonthMax?: number;
        siteMembersMax?: number;
        domainAliasesMax?: number;
        languagesMax?: number;
        galleriesMax?: number | "∞";
        imagesPerGalleryMax?: number;
        galleriesPerPlaceMax?: number | "∞";
        galleriesPerEventMax?: number | "∞";
      };
      features?: {
        eventsEnabled?: boolean;
        placeSeoEnabled?: boolean;
        extrasEnabled?: boolean;
        customDomainEnabled?: boolean;
        eventLogEnabled?: boolean;
        heroImage?: boolean;
        contacts?: boolean;
        siteSeo?: boolean;
        canonicalSupport?: boolean;
        multipleDomainAliases?: boolean;
        pushSubscription?: boolean | "optional add-on";
      };
    };
    PRO?: {
      limits?: {
        placesMax?: number;
        featuredPlacesMax?: number;
        galleryImagesPerPlaceMax?: number;
        eventsPerMonthMax?: number;
        siteMembersMax?: number;
        domainAliasesMax?: number;
        languagesMax?: number;
        galleriesMax?: number | "∞";
        imagesPerGalleryMax?: number;
        galleriesPerPlaceMax?: number | "∞";
        galleriesPerEventMax?: number | "∞";
      };
      features?: {
        eventsEnabled?: boolean;
        placeSeoEnabled?: boolean;
        extrasEnabled?: boolean;
        customDomainEnabled?: boolean;
        eventLogEnabled?: boolean;
        heroImage?: boolean;
        contacts?: boolean;
        siteSeo?: boolean;
        canonicalSupport?: boolean;
        multipleDomainAliases?: boolean;
        pushSubscription?: boolean | "optional add-on";
      };
    };
    BUSINESS?: {
      limits?: {
        placesMax?: number;
        featuredPlacesMax?: number;
        galleryImagesPerPlaceMax?: number;
        eventsPerMonthMax?: number;
        siteMembersMax?: number;
        domainAliasesMax?: number;
        languagesMax?: number;
        galleriesMax?: number | "∞";
        imagesPerGalleryMax?: number;
        galleriesPerPlaceMax?: number | "∞";
        galleriesPerEventMax?: number | "∞";
      };
      features?: {
        eventsEnabled?: boolean;
        placeSeoEnabled?: boolean;
        extrasEnabled?: boolean;
        customDomainEnabled?: boolean;
        eventLogEnabled?: boolean;
        heroImage?: boolean;
        contacts?: boolean;
        siteSeo?: boolean;
        canonicalSupport?: boolean;
        multipleDomainAliases?: boolean;
        pushSubscription?: boolean | "optional add-on";
      };
    };
    publicPlans?: {
      free?: { priceHuf?: number; places?: number; events?: number; languages?: number };
      basic?: { priceHuf?: number; places?: number; events?: number; languages?: number };
      premium?: { priceHuf?: number; places?: number; events?: number; languages?: number };
    };
  } | null;
  placePlanOverrides?: {
    free?: {
      images?: number;
      events?: number;
      featured?: boolean;
    };
    basic?: {
      images?: number;
      events?: number;
      featured?: boolean;
    };
    pro?: {
      images?: number;
      events?: number;
      featured?: boolean;
    };
  } | null;
}

export function getFeatureMatrix() {
  return apiGet<FeatureMatrix>("/admin/platform-settings/feature-matrix");
}

export function setFeatureMatrix(data: {
  planOverrides?: FeatureMatrix["planOverrides"];
  placePlanOverrides?: FeatureMatrix["placePlanOverrides"];
}) {
  return apiPut<FeatureMatrix>("/admin/platform-settings/feature-matrix", data);
}

// Events
export interface Event {
  id: string;
  siteId: string;
  placeId: string | null;
  categoryId: string | null; // Legacy: kept for backward compatibility
  isActive: boolean;
  isCrawlable?: boolean;
  isPinned: boolean;
  isRainSafe: boolean;
  showOnMap: boolean;
  startDate: string;
  endDate: string | null;
  heroImage: string | null;
  lat: number | null;
  lng: number | null;
  /** GA4 measurement ID (G-…). Null = inherit Place/Town/Site. */
  gaMeasurementId?: string | null;
  place?: {
    id: string;
    translations: Array<{ lang: string; name: string }>;
  } | null;
  category?: {
    id: string;
    translations: Array<{ lang: string; name: string }>;
  } | null;
  categories?: Array<{
    category: {
      id: string;
      translations: Array<{ lang: string; name: string }>;
    };
  }>;
  tags: Array<{
    tag: {
      id: string;
      translations: Array<{ lang: string; name: string }>;
    };
  }>;
  translations: Array<{
    lang: string;
    title: string;
    shortDescription: string | null;
    description: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoImage: string | null;
    seoKeywords: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventDto {
  siteId: string;
  placeId?: string | null;
  categoryId?: string | null; // Legacy: kept for backward compatibility
  categoryIds?: string[]; // New: multiple categories support
  tagIds?: string[];
  /** GA4 measurement ID (G-…). Empty/null inherits Place/Town/Site. */
  gaMeasurementId?: string | null;
  translations: Array<{
    lang: Lang;
    title: string;
    shortDescription?: string | null;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  isCrawlable?: boolean;
  isPinned?: boolean;
  isRainSafe?: boolean;
  showOnMap?: boolean;
  startDate: string;
  endDate?: string | null;
  heroImage?: string | null;
  gallery?: string[];
  lat?: number | null;
  lng?: number | null;
}

export interface UpdateEventDto {
  placeId?: string | null;
  categoryId?: string | null; // Legacy: kept for backward compatibility
  categoryIds?: string[]; // New: multiple categories support
  tagIds?: string[];
  /** GA4 measurement ID (G-…). Empty/null clears / inherits Place/Town/Site. */
  gaMeasurementId?: string | null;
  translations?: Array<{
    lang: Lang;
    title: string;
    shortDescription?: string | null;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  isCrawlable?: boolean;
  isPinned?: boolean;
  isRainSafe?: boolean;
  showOnMap?: boolean;
  startDate?: string;
  endDate?: string | null;
  heroImage?: string | null;
  gallery?: string[];
  lat?: number | null;
  lng?: number | null;
}

export function getEvents(
  siteId?: string,
  page?: number,
  limit?: number,
  placeId?: string,
  townId?: string
) {
  const params = new URLSearchParams();
  if (siteId) params.append("siteId", siteId);
  if (page !== undefined) params.append("page", String(page));
  if (limit !== undefined) params.append("limit", String(limit));
  if (placeId) params.append("placeId", placeId);
  else if (townId) params.append("townId", townId);
  const queryString = params.toString();
  return apiGet<{
    events: Event[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/admin/events${queryString ? `?${queryString}` : ""}`);
}

export function getEvent(id: string) {
  return apiGet<Event>(`/admin/events/${id}`);
}

export function createEvent(data: CreateEventDto) {
  return apiPost<Event>("/admin/events", data);
}

export function updateEvent(id: string, data: UpdateEventDto, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiPut<Event>(`/admin/events/${id}${params}`, data);
}

export function deleteEvent(id: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiDelete<{ message: string }>(`/admin/events/${id}${params}`);
}

// Event Logs
export interface EventLog {
  id: string;
  tenantId: string;
  siteId?: string; // Backward compatibility - may be present
  site?: { id: string; slug: string }; // Site relation if included
  userId: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  description?: string | null;
  metadata?: any;
  createdAt: string;
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  tenant: {
    id: string;
    slug: string;
  };
}

export interface EventLogFilterDto {
  siteId?: string;
  userId?: string;
  action?: string;
  entityType?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  scope?: "global";
}

export interface EventLogResponse {
  logs: EventLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface EventLogFilterOptions {
  actions: string[];
  entityTypes: string[];
}

export function getEventLogs(filters: EventLogFilterDto) {
  const params = new URLSearchParams();
  if (filters.siteId) params.append("siteId", filters.siteId);
  if (filters.userId) params.append("userId", filters.userId);
  if (filters.action) params.append("action", filters.action);
  if (filters.entityType) params.append("entityType", filters.entityType);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);
  if (filters.page) params.append("page", filters.page.toString());
  if (filters.limit) params.append("limit", filters.limit.toString());
  if (filters.scope) params.append("scope", filters.scope);

  // Add cache-busting timestamp to ensure fresh data
  // Always use current timestamp for maximum freshness
  params.append("_t", Date.now().toString());

  // Also add _refresh if present (for post-delete refresh)
  if ((filters as any)._refresh) {
    params.append("_refresh", (filters as any)._refresh.toString());
  }

  const queryString = params.toString();
  return apiGet<EventLogResponse>(`/admin/event-logs${queryString ? `?${queryString}` : ""}`);
}

export function getEventLogFilterOptions() {
  return apiGet<EventLogFilterOptions>("/admin/event-logs/filter-options");
}

export function exportEventLogs(filters: EventLogFilterDto): Promise<Blob> {
  const params = new URLSearchParams();
  if (filters.siteId) params.append("siteId", filters.siteId);
  if (filters.userId) params.append("userId", filters.userId);
  if (filters.action) params.append("action", filters.action);
  if (filters.entityType) params.append("entityType", filters.entityType);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);

  const queryString = params.toString();
  return fetch(
    `${import.meta.env.VITE_API_URL || ""}/api/admin/event-logs/export${queryString ? `?${queryString}` : ""}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}`,
      },
    }
  ).then((res) => {
    if (!res.ok) throw new Error("Export failed");
    return res.blob();
  });
}

export function deleteEventLogs(filters: EventLogFilterDto) {
  const params = new URLSearchParams();
  // Only include filters that are relevant for deletion (exclude page and limit)
  if (filters.siteId) params.append("siteId", filters.siteId);
  if (filters.userId) params.append("userId", filters.userId);
  if (filters.action) params.append("action", filters.action);
  if (filters.entityType) params.append("entityType", filters.entityType);
  if (filters.startDate) params.append("startDate", filters.startDate);
  if (filters.endDate) params.append("endDate", filters.endDate);
  // Explicitly exclude page and limit - we want to delete ALL matching records

  const queryString = params.toString();
  return apiDelete<{ message: string; count: number }>(
    `/admin/event-logs${queryString ? `?${queryString}` : ""}`
  );
}

// ==================== Billing ====================

export interface PlaceSubscription {
  id?: string; // Subscription ID (from PlaceSubscription table)
  placeId: string;
  plan: "free" | "basic" | "pro";
  isFeatured: boolean;
  featuredUntil: string | null;
  // Subscription details
  status?: "ACTIVE" | "CANCELLED" | "SUSPENDED" | "EXPIRED"; // Status from PlaceSubscription table
  validUntil: string | null;
  priceCents: number | null;
  currency: string | null;
  statusChangedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface PlaceEntitlements {
  placeId: string;
  plan: "free" | "basic" | "pro";
  limits: {
    images: number;
    events: number;
    featured: boolean;
  };
  currentUsage: {
    images: number;
    events: number;
    isFeatured: boolean;
    featuredUntil: string | null;
  };
  canUpgrade: boolean;
  canDowngrade: boolean;
}

export type LadderAction = "notify" | "apply-plan" | "suspend";
export type LadderPlan = "FREE" | "BASIC" | "PRO" | "BUSINESS" | "MUNICIPAL";

export type VisitorLadderConfig = {
  freeUntil: number;
  stepTwoFrom: number;
  stepThreeFrom: number;
  steps: [
    { action: LadderAction; plan: LadderPlan },
    { action: LadderAction; plan: LadderPlan },
    { action: LadderAction; plan: LadderPlan },
  ];
};

export type VisitorLadderSnapshot = {
  meter: number;
  meterSource: "uniqueVisitors" | "pageViews";
  windowDays: number;
  wouldStep: 0 | 1 | 2;
  appliedStep: number;
  manualOverride: boolean;
  ladderSuspended: boolean;
  subscriptionPlan: string;
  freeUntil: number;
  stepTwoFrom: number;
  stepThreeFrom: number;
};

export function getVisitorLadder() {
  return apiGet<VisitorLadderConfig>("/admin/visitor-ladder");
}

export function saveVisitorLadder(data: VisitorLadderConfig) {
  return apiPut<VisitorLadderConfig>("/admin/visitor-ladder", data);
}

export interface SiteSubscription {
  id?: string; // Subscription ID (from SiteSubscription table, may not be present if using billing service)
  siteId: string;
  plan: "basic" | "pro" | "business" | "municipal";
  planStatus: string | null;
  planValidUntil: string | null;
  planLimits: Record<string, any> | null;
  billingEmail: string | null;
  allowPublicRegistration: boolean; // If false, only site owner can create users and places (pro/business only)
  status?: "ACTIVE" | "CANCELLED" | "SUSPENDED" | "EXPIRED"; // Status from SiteSubscription table
  visitorLadderManual?: boolean;
  visitorLadder?: VisitorLadderSnapshot;
}

export interface SiteEntitlements {
  siteId: string;
  plan: "basic" | "pro" | "business" | "municipal";
  limits: {
    places: number;
    featuredSlots: number;
    events: number;
    imagesPerPlace: number;
    customDomain: boolean;
    multiAdmin: boolean;
    analytics: "none" | "basic" | "advanced";
    support: "community" | "email" | "sla";
  };
  currentUsage: {
    places: number;
    featuredPlaces: number;
    events: number;
  };
  canUpgrade: boolean;
  canDowngrade: boolean;
}

// Place subscription
export function getPlaceSubscription(placeId: string) {
  return apiGet<PlaceSubscription>(`/admin/billing/places/${placeId}/subscription`);
}

export function updatePlaceSubscription(
  placeId: string,
  data: Partial<Omit<PlaceSubscription, "placeId">>
) {
  return apiPut<PlaceSubscription>(`/admin/billing/places/${placeId}/subscription`, data);
}

export function getPlaceEntitlements(placeId: string) {
  return apiGet<PlaceEntitlements>(`/admin/billing/places/${placeId}/entitlements`);
}

export type FeatureGate =
  | { state: "enabled" }
  | { state: "locked"; reason: string; upgradeCta: "viewPlans" | "contactAdmin" }
  | {
      state: "limit_reached";
      reason: string;
      upgradeCta: "upgradePlan";
      alternativeCta?: "manageExisting";
    };

export type PlaceUpsellState = {
  featured: FeatureGate;
  gallery: FeatureGate;
  floorplans: FeatureGate;
};

export function getPlaceUpsellState(placeId: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiGet<PlaceUpsellState>(`/admin/places/${placeId}/upsell-state${params}`);
}

// Site subscription
export function getSiteSubscription(siteId: string) {
  return apiGet<SiteSubscription>(`/admin/billing/sites/${siteId}/subscription`);
}

export function updateSiteSubscription(
  siteId: string,
  data: Partial<Omit<SiteSubscription, "siteId">>
) {
  return apiPut<SiteSubscription>(`/admin/billing/sites/${siteId}/subscription`, data);
}

export function getSiteEntitlements(siteId: string) {
  return apiGet<SiteEntitlements>(`/admin/billing/sites/${siteId}/entitlements`);
}

// Subscriptions Dashboard (Superadmin)
export interface SubscriptionListItem {
  scope: "site" | "place";
  id: string;
  entityId: string;
  entityName: string;
  plan: "BASIC" | "PRO" | "BUSINESS";
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  validUntil: string | null;
  owner: {
    name: string;
    email: string;
    phone?: string | null;
  };
  adminUrl: string;
  publicUrl?: string;
  visitorMeter?: number;
  visitorMeterSource?: "uniqueVisitors" | "pageViews";
  visitorWouldStep?: 0 | 1 | 2;
  manualOverride?: boolean;
  ladderSuspended?: boolean;
}

export interface SubscriptionSummary {
  activeCount: number;
  expiringCount: number;
  newCount: number;
  churnCount: number;
  netChange: number;
  mrrCents?: number;
}

export interface TrendPoint {
  weekStart: string;
  active: number;
  new: number;
  churn: number;
}

export interface UpdateSubscriptionDto {
  plan?: "FREE" | "BASIC" | "PRO" | "BUSINESS";
  status?: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  validUntil?: string | null;
  billingPeriod?: "MONTHLY" | "YEARLY";
  priceCents?: number | null;
  currency?: string | null;
  note?: string | null;
  manualOverride?: boolean;
}

export function getSubscriptions(params?: {
  scope?: "site" | "place" | "all";
  status?: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  plan?: "FREE" | "BASIC" | "PRO" | "BUSINESS";
  q?: string;
  expiresWithinDays?: number;
  take?: number;
  skip?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.scope) queryParams.append("scope", params.scope);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.plan) queryParams.append("plan", params.plan);
  if (params?.q) queryParams.append("q", params.q);
  if (params?.expiresWithinDays !== undefined)
    queryParams.append("expiresWithinDays", String(params.expiresWithinDays));
  if (params?.take !== undefined) queryParams.append("take", String(params.take));
  if (params?.skip !== undefined) queryParams.append("skip", String(params.skip));
  const queryString = queryParams.toString();
  return apiGet<{ items: SubscriptionListItem[]; total: number }>(
    `/admin/subscriptions${queryString ? `?${queryString}` : ""}`
  );
}

export function getExpiringSubscriptions(params?: {
  scope?: "site" | "place" | "all";
  withinDays?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.scope) queryParams.append("scope", params.scope);
  if (params?.withinDays !== undefined) queryParams.append("withinDays", String(params.withinDays));
  const queryString = queryParams.toString();
  return apiGet<SubscriptionListItem[]>(
    `/admin/subscriptions/expiring${queryString ? `?${queryString}` : ""}`
  );
}

export function getSubscriptionSummary(params?: {
  scope?: "site" | "place" | "all";
  rangeDays?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.scope) queryParams.append("scope", params.scope);
  if (params?.rangeDays !== undefined) queryParams.append("rangeDays", String(params.rangeDays));
  const queryString = queryParams.toString();
  return apiGet<SubscriptionSummary>(
    `/admin/subscriptions/summary${queryString ? `?${queryString}` : ""}`
  );
}

export function getSubscriptionTrends(params?: {
  scope?: "site" | "place" | "all";
  weeks?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.scope) queryParams.append("scope", params.scope);
  if (params?.weeks !== undefined) queryParams.append("weeks", String(params.weeks));
  const queryString = queryParams.toString();
  return apiGet<{ points: TrendPoint[] }>(
    `/admin/subscriptions/trends${queryString ? `?${queryString}` : ""}`
  );
}

export function updateSubscription(
  scope: "site" | "place",
  id: string,
  data: UpdateSubscriptionDto
) {
  return apiPut<any>(`/admin/subscriptions/${scope}/${id}`, data);
}

export function extendSubscription(scope: "site" | "place", id: string) {
  return apiPost<any>(`/admin/subscriptions/${scope}/${id}/extend`, {});
}

export function cancelSubscription(
  scope: "site" | "place",
  subscriptionId: string,
  entityId: string
) {
  // Get language from localStorage or default to "hu"
  const lang = (() => {
    const stored = localStorage.getItem("i18nextLng");
    if (stored && ["hu", "en", "de"].includes(stored.split("-")[0])) {
      return stored.split("-")[0];
    }
    return "hu";
  })();

  if (scope === "site") {
    return apiPost<any>(`/api/${lang}/sites/${entityId}/subscription/${subscriptionId}/cancel`, {});
  } else {
    return apiPost<any>(
      `/api/${lang}/sites/places/${entityId}/subscription/${subscriptionId}/cancel`,
      {}
    );
  }
}

export function resumeSubscription(
  scope: "site" | "place",
  subscriptionId: string,
  entityId: string
) {
  // Get language from localStorage or default to "hu"
  const lang = (() => {
    const stored = localStorage.getItem("i18nextLng");
    if (stored && ["hu", "en", "de"].includes(stored.split("-")[0])) {
      return stored.split("-")[0];
    }
    return "hu";
  })();

  if (scope === "site") {
    return apiPost<any>(`/api/${lang}/sites/${entityId}/subscription/${subscriptionId}/resume`, {});
  } else {
    return apiPost<any>(
      `/api/${lang}/sites/places/${entityId}/subscription/${subscriptionId}/resume`,
      {}
    );
  }
}

export interface SubscriptionHistoryItem {
  id: string;
  scope: "site" | "place";
  subscriptionId: string;
  changeType: "PLAN_CHANGE" | "STATUS_CHANGE" | "PAYMENT" | "EXTENSION" | "CREATED" | "UPDATE";
  oldPlan?: "FREE" | "BASIC" | "PRO" | null;
  newPlan?: "FREE" | "BASIC" | "PRO" | null;
  oldStatus?: "ACTIVE" | "SUSPENDED" | "EXPIRED" | null;
  newStatus?: "ACTIVE" | "SUSPENDED" | "EXPIRED" | null;
  oldValidUntil?: string | null;
  newValidUntil?: string | null;
  paymentDueDate?: string | null;
  amountCents?: number | null;
  currency?: string | null;
  note?: string | null;
  changedBy?: string | null;
  createdAt: string;
}

export function getSubscriptionHistory(
  scope: "site" | "place",
  id: string,
  skip?: number,
  take?: number
) {
  const params = new URLSearchParams();
  if (skip !== undefined) params.append("skip", skip.toString());
  if (take !== undefined) params.append("take", take.toString());
  const query = params.toString();
  return apiGet<{ items: SubscriptionHistoryItem[]; total: number }>(
    `/admin/subscriptions/${scope}/${id}/history${query ? `?${query}` : ""}`
  );
}

// Galleries
export interface GalleryImage {
  id: string; // stable id (uuid/cuid)
  src: string; // CDN url
  thumbSrc?: string; // optional CDN thumbnail
  width?: number;
  height?: number;
  alt?: string;
  caption?: string; // képaláírás
}

export interface Gallery {
  id: string;
  siteId: string;
  placeId?: string | null;
  eventId?: string | null;
  name?: string | null;
  images: GalleryImage[];
  layout?: "grid" | "masonry" | "carousel";
  columns?: { base: number; md: number; lg: number };
  aspect?: "auto" | "square" | "4:3" | "16:9";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGalleryDto {
  siteId: string;
  placeId?: string | null;
  eventId?: string | null;
  name?: string | null;
  images: GalleryImage[];
  layout?: "grid" | "masonry" | "carousel";
  columns?: { base: number; md: number; lg: number };
  aspect?: "auto" | "square" | "4:3" | "16:9";
  isActive?: boolean;
}

export interface UpdateGalleryDto {
  placeId?: string | null;
  eventId?: string | null;
  name?: string | null;
  images?: GalleryImage[];
  layout?: "grid" | "masonry" | "carousel";
  columns?: { base: number; md: number; lg: number };
  aspect?: "auto" | "square" | "4:3" | "16:9";
  isActive?: boolean;
}

export function getGalleries(
  siteId?: string,
  placeId?: string,
  eventId?: string,
  page?: number,
  limit?: number
) {
  const params = new URLSearchParams();
  if (siteId) params.append("siteId", siteId);
  if (placeId) params.append("placeId", placeId);
  if (eventId) params.append("eventId", eventId);
  if (page !== undefined) params.append("page", String(page));
  if (limit !== undefined) params.append("limit", String(limit));
  const queryString = params.toString();
  return apiGet<{
    galleries: Gallery[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>(`/admin/galleries${queryString ? `?${queryString}` : ""}`);
}

export function getGallery(id: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiGet<Gallery>(`/admin/galleries/${id}${params}`);
}

export function createGallery(data: CreateGalleryDto) {
  return apiPost<Gallery>("/admin/galleries", data);
}

export function updateGallery(id: string, data: UpdateGalleryDto, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiPut<Gallery>(`/admin/galleries/${id}${params}`, data);
}

export function deleteGallery(id: string, siteId?: string) {
  const params = siteId ? `?siteId=${siteId}` : "";
  return apiDelete<{ success: boolean }>(`/admin/galleries/${id}${params}`);
}

// ==================== Site Status & Statistics ====================

export interface SiteStatusResponse {
  overview: {
    sites: {
      total: number;
      active: number;
      inactive: number;
    };
    places: {
      total: number;
      active: number;
      inactive: number;
    };
    events: {
      total: number;
      active: number;
      upcoming: number;
      inactive: number;
    };
    users: {
      total: number;
      active: number;
      inactive: number;
    };
    content: {
      categories: number;
      tags: number;
      towns: number;
      galleries: number;
    };
    subscriptions: {
      total: number;
      active: number;
      inactive: number;
    };
  };
  recentActivity: {
    places: number;
    events: number;
    users: number;
    eventLogs: number;
    period: string;
  };
  sitesByPlan: Array<{
    plan: string;
    count: number;
  }>;
}

export function getSiteStatus(siteId?: string) {
  const query = siteId ? `?siteId=${encodeURIComponent(siteId)}` : "";
  return apiGet<SiteStatusResponse>(`/admin/site-status${query}`);
}

// ==================== Cache Management ====================

export interface InvalidateCacheResponse {
  success: boolean;
  message: string;
  cacheType: string;
  timestamp: string;
}

export function invalidateCache(cacheType: string) {
  return apiPost<InvalidateCacheResponse>("/admin/cache/invalidate", {
    cacheType,
  });
}

// ==================== Collections ====================

export interface Collection {
  id: string;
  slug: string;
  domain?: string | null;
  isActive: boolean;
  isCrawlable: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
  translations: Array<{
    id: string;
    lang: Lang;
    title: string;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  items?: Array<{
    id: string;
    collectionId: string;
    siteId: string;
    order: number;
    isHighlighted: boolean;
    site: {
      id: string;
      slug: string;
      translations: Array<{
        lang: Lang;
        name: string;
        shortDescription?: string | null;
        heroImage?: string | null;
      }>;
    };
    translations: Array<{
      id: string;
      lang: Lang;
      titleOverride?: string | null;
      descriptionOverride?: string | null;
      imageOverride?: string | null;
    }>;
  }>;
  itemsCount?: number;
}

export interface CreateCollectionDto {
  slug: string;
  domain?: string | null;
  isActive?: boolean;
  isCrawlable?: boolean;
  order?: number;
  translations: Array<{
    lang: Lang;
    title: string;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
}

export interface UpdateCollectionDto {
  slug?: string;
  domain?: string | null;
  isActive?: boolean;
  isCrawlable?: boolean;
  order?: number;
  translations?: Array<{
    lang: Lang;
    title: string;
    description?: string | null;
    heroImage?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
}

export interface CreateCollectionItemDto {
  collectionId: string;
  siteId: string;
  order?: number;
  isHighlighted?: boolean;
  translations?: Array<{
    lang: Lang;
    titleOverride?: string | null;
    descriptionOverride?: string | null;
    imageOverride?: string | null;
  }>;
}

export interface UpdateCollectionItemDto {
  order?: number;
  isHighlighted?: boolean;
  translations?: Array<{
    lang: Lang;
    titleOverride?: string | null;
    descriptionOverride?: string | null;
    imageOverride?: string | null;
  }>;
}

export function getCollections() {
  return apiGet<Collection[]>("/admin/collections");
}

export function getCollection(id: string) {
  return apiGet<Collection>(`/admin/collections/${id}`);
}

export function createCollection(data: CreateCollectionDto) {
  return apiPost<Collection>("/admin/collections", data);
}

export function updateCollection(id: string, data: UpdateCollectionDto) {
  return apiPut<Collection>(`/admin/collections/${id}`, data);
}

export function deleteCollection(id: string) {
  return apiDelete<{ success: boolean }>(`/admin/collections/${id}`);
}

export function addCollectionItem(
  collectionId: string,
  data: Omit<CreateCollectionItemDto, "collectionId">
) {
  return apiPost<Collection["items"][0]>(`/admin/collections/${collectionId}/items`, data);
}

export function updateCollectionItem(itemId: string, data: UpdateCollectionItemDto) {
  return apiPut<Collection["items"][0]>(`/admin/collections/items/${itemId}`, data);
}

export function deleteCollectionItem(itemId: string) {
  return apiDelete<{ success: boolean }>(`/admin/collections/items/${itemId}`);
}

export function reorderCollectionItems(collectionId: string, itemIds: string[]) {
  return apiPut<Collection>(`/admin/collections/${collectionId}/items/reorder`, { itemIds });
}

export function updateCollectionItems(collectionId: string, items: Collection["items"]) {
  return apiPut<Collection>(`/admin/collections/${collectionId}/items`, { items });
}

// ==================== Feature Subscriptions ====================

export interface FloorplanEntitlement {
  entitled: boolean;
  activeScope: "place" | "site" | null;
  limit: number;
  used: number;
  status: "locked" | "active" | "limit_reached";
  subscriptionId?: string;
  currentPeriodEnd?: string;
}

export interface FeatureSubscription {
  id: string;
  siteId: string;
  scope: "place" | "site";
  placeId?: string | null;
  featureKey: "FLOORPLANS";
  planKey: string;
  billingPeriod: "MONTHLY" | "YEARLY";
  floorplanLimit?: number | null;
  status: "active" | "past_due" | "canceled";
  stripeSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeatureSubscriptionDto {
  siteId: string;
  scope: "place" | "site";
  placeId?: string;
  featureKey: "FLOORPLANS";
  planKey: string;
  billingPeriod: "MONTHLY" | "YEARLY";
  floorplanLimit?: number;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
}

export interface UpdateFeatureSubscriptionDto {
  planKey?: string;
  billingPeriod?: "MONTHLY" | "YEARLY";
  floorplanLimit?: number;
  status?: "active" | "past_due" | "canceled" | "suspended";
  scope?: "place" | "site";
  placeId?: string | null;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
}

export function getFloorplanEntitlement(placeId: string, siteId: string) {
  return apiGet<FloorplanEntitlement>(
    `/admin/places/${placeId}/floorplan-entitlement?siteId=${siteId}`
  );
}

export function createFeatureSubscription(data: CreateFeatureSubscriptionDto) {
  return apiPost<FeatureSubscription>("/admin/feature-subscriptions", data);
}

export function updateFeatureSubscription(id: string, data: UpdateFeatureSubscriptionDto) {
  return apiPut<FeatureSubscription>(`/admin/feature-subscriptions/${id}`, data);
}

export function cancelFeatureSubscription(id: string) {
  return apiPost<FeatureSubscription>(`/admin/feature-subscriptions/${id}/cancel`, {});
}

export function suspendFeatureSubscription(id: string) {
  return apiPost<FeatureSubscription>(`/admin/feature-subscriptions/${id}/suspend`, {});
}

export function resumeFeatureSubscription(id: string) {
  return apiPost<FeatureSubscription>(`/admin/feature-subscriptions/${id}/resume`, {});
}

export function getSiteFeatureSubscriptions(siteId: string) {
  return apiGet<FeatureSubscription[]>(`/admin/sites/${siteId}/feature-subscriptions`);
}

export function getPlaceFeatureSubscriptions(placeId: string) {
  return apiGet<FeatureSubscription[]>(`/admin/places/${placeId}/feature-subscriptions`);
}

export function deleteFeatureSubscription(id: string) {
  return apiDelete(`/admin/feature-subscriptions/${id}`);
}

export function getAllFeatureSubscriptions(params?: {
  scope?: "place" | "site" | "all";
  status?: "active" | "past_due" | "canceled" | "all";
  featureKey?: "FLOORPLANS" | "all";
  siteId?: string;
  placeId?: string;
  q?: string;
  take?: number;
  skip?: number;
}) {
  const queryParams = new URLSearchParams();
  if (params?.scope) queryParams.append("scope", params.scope);
  if (params?.status) queryParams.append("status", params.status);
  if (params?.featureKey) queryParams.append("featureKey", params.featureKey);
  if (params?.siteId) queryParams.append("siteId", params.siteId);
  if (params?.placeId) queryParams.append("placeId", params.placeId);
  if (params?.q) queryParams.append("q", params.q);
  if (params?.take) queryParams.append("take", params.take.toString());
  if (params?.skip) queryParams.append("skip", params.skip.toString());

  const query = queryParams.toString();
  return apiGet<{ items: FeatureSubscription[]; total: number }>(
    `/admin/feature-subscriptions${query ? `?${query}` : ""}`
  );
}

// ==================== Floorplans ====================

export interface FloorplanPin {
  id: string;
  floorplanId: string;
  x: number;
  y: number;
  label: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaceFloorplan {
  id: string;
  placeId: string;
  title: string;
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
  pins?: FloorplanPin[];
}

export interface CreateFloorplanDto {
  placeId: string;
  title?: string;
  imageUrl: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export interface UpdateFloorplanDto {
  title?: string;
  imageUrl?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}

export function getFloorplans(placeId: string) {
  return apiGet<PlaceFloorplan[]>(`/admin/places/${placeId}/floorplans`);
}

export function getFloorplan(id: string) {
  return apiGet<PlaceFloorplan>(`/admin/floorplans/${id}`);
}

export function createFloorplan(data: CreateFloorplanDto) {
  return apiPost<PlaceFloorplan>("/admin/floorplans", data);
}

export function updateFloorplan(id: string, data: UpdateFloorplanDto) {
  return apiPut<PlaceFloorplan>(`/admin/floorplans/${id}`, data);
}

export function deleteFloorplan(id: string) {
  return apiDelete(`/admin/floorplans/${id}`);
}

// ==================== Floorplan Pins ====================

export interface CreateFloorplanPinDto {
  floorplanId: string;
  x: number;
  y: number;
  label: string;
  sortOrder?: number;
}

export interface UpdateFloorplanPinDto {
  x?: number;
  y?: number;
  label?: string;
  sortOrder?: number;
}

export function getFloorplanPins(floorplanId: string) {
  return apiGet<FloorplanPin[]>(`/admin/floorplans/${floorplanId}/pins`);
}

export function getFloorplanPin(id: string) {
  return apiGet<FloorplanPin>(`/admin/floorplan-pins/${id}`);
}

export function createFloorplanPin(data: CreateFloorplanPinDto) {
  return apiPost<FloorplanPin>("/admin/floorplan-pins", data);
}

export function updateFloorplanPin(id: string, data: UpdateFloorplanPinDto) {
  return apiPut<FloorplanPin>(`/admin/floorplan-pins/${id}`, data);
}

export function deleteFloorplanPin(id: string) {
  return apiDelete(`/admin/floorplan-pins/${id}`);
}

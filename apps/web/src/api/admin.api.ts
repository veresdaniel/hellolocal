// src/api/admin.api.ts
import { apiGet, apiPost, apiPut, apiDelete } from "./client";

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
  tenants: Array<{
    id: string;
    tenantId: string;
    isPrimary: boolean;
    tenant: {
      id: string;
      slug: string;
      translations: Array<{
        lang: string;
        name: string;
      }>;
    };
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  bio?: string;
  isActive?: boolean;
  tenantIds?: string[];
}

export interface UpdateUserRoleDto {
  role: "superadmin" | "admin" | "editor" | "viewer";
}

// Users
export function getUsers(tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
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
  tenantIds?: string[];
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

export function disableTwoFactorForUser(id: string) {
  return apiPost<{ message: string }>(`/admin/users/${id}/two-factor/disable`, {});
}

// Categories
export function getCategories(tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any[]>(`/admin/categories${params}`);
}

export function getCategory(id: string) {
  return apiGet<any>(`/admin/categories/${id}`);
}

export function createCategory(data: any) {
  return apiPost<any>("/admin/categories", data);
}

export function updateCategory(id: string, data: any, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiPut<any>(`/admin/categories/${id}${params}`, data);
}

export function deleteCategory(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiDelete<{ message: string }>(`/admin/categories/${id}${params}`);
}

export function reorderCategories(tenantId: string, updates: Array<{ id: string; parentId: string | null; order: number }>) {
  return apiPut<{ message: string }>("/admin/categories/reorder", { tenantId, updates });
}

// Tags
export function getTags(tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any[]>(`/admin/tags${params}`);
}

export function getTag(id: string) {
  return apiGet<any>(`/admin/tags/${id}`);
}

export function createTag(data: any) {
  return apiPost<any>("/admin/tags", data);
}

export function updateTag(id: string, data: any, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiPut<any>(`/admin/tags/${id}${params}`, data);
}

export function deleteTag(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiDelete<{ message: string }>(`/admin/tags/${id}${params}`);
}

// Price Bands
export function getPriceBands(tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any[]>(`/admin/price-bands${params}`);
}

export function getPriceBand(id: string) {
  return apiGet<any>(`/admin/price-bands/${id}`);
}

export function createPriceBand(data: any) {
  return apiPost<any>("/admin/price-bands", data);
}

export function updatePriceBand(id: string, data: any, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiPut<any>(`/admin/price-bands/${id}${params}`, data);
}

export function deletePriceBand(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiDelete<{ message: string }>(`/admin/price-bands/${id}${params}`);
}

// Towns
export function getTowns(tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any[]>(`/admin/towns${params}`);
}

export function getTown(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any>(`/admin/towns/${id}${params}`);
}

export function createTown(data: any) {
  return apiPost<any>("/admin/towns", data);
}

export function updateTown(id: string, data: any, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiPut<any>(`/admin/towns/${id}${params}`, data);
}

export function deleteTown(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiDelete<{ message: string }>(`/admin/towns/${id}${params}`);
}

// Places
export function getPlaces(tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any[]>(`/admin/places${params}`);
}

export function getPlace(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any>(`/admin/places/${id}${params}`);
}

export function createPlace(data: any) {
  return apiPost<any>("/admin/places", data);
}

export function updatePlace(id: string, data: any, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiPut<any>(`/admin/places/${id}${params}`, data);
}

export function deletePlace(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiDelete<{ message: string }>(`/admin/places/${id}${params}`);
}

// Legal Pages
export function getLegalPages(tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any[]>(`/admin/legal-pages${params}`);
}

export function getLegalPage(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any>(`/admin/legal-pages/${id}${params}`);
}

export function getLegalPageByKey(key: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any>(`/admin/legal-pages/key/${key}${params}`);
}

export function createLegalPage(data: any) {
  return apiPost<any>("/admin/legal-pages", data);
}

export function updateLegalPage(id: string, data: any, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiPut<any>(`/admin/legal-pages/${id}${params}`, data);
}

export function deleteLegalPage(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiDelete<{ message: string }>(`/admin/legal-pages/${id}${params}`);
}

// Static Pages
export function getStaticPages(tenantId?: string, category?: string) {
  const params = new URLSearchParams();
  if (tenantId) params.append("tenantId", tenantId);
  if (category) params.append("category", category);
  const queryString = params.toString();
  return apiGet<any[]>(`/admin/static-pages${queryString ? `?${queryString}` : ""}`);
}

export function getStaticPage(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<any>(`/admin/static-pages/${id}${params}`);
}

export function createStaticPage(data: any) {
  return apiPost<any>("/admin/static-pages", data);
}

export function updateStaticPage(id: string, data: any, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiPut<any>(`/admin/static-pages/${id}${params}`, data);
}

export function deleteStaticPage(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
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

export function getDefaultLanguage() {
  return apiGet<{ defaultLanguage: "hu" | "en" | "de" }>("/admin/app-settings/default-language");
}

export function setDefaultLanguage(language: "hu" | "en" | "de") {
  return apiPut<{ defaultLanguage: "hu" | "en" | "de" }>("/admin/app-settings/default-language", { language });
}

// Tenants (admin only)
export interface Tenant {
  id: string;
  slug: string;
  isActive: boolean;
  primaryDomain?: string | null;
  translations: Array<{
    id: string;
    lang: string;
    name: string;
    shortDescription: string | null;
    description: string | null;
    heroImage: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
    seoImage: string | null;
    seoKeywords: string[];
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTenantDto {
  slug: string;
  translations: Array<{
    lang: "hu" | "en" | "de";
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
}

export interface UpdateTenantDto {
  slug?: string;
  translations?: Array<{
    lang: "hu" | "en" | "de";
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
}

export function getTenants() {
  return apiGet<Tenant[]>("/admin/tenants");
}

export function getTenant(id: string) {
  return apiGet<Tenant>(`/admin/tenants/${id}`);
}

export function createTenant(data: CreateTenantDto) {
  return apiPost<Tenant>("/admin/tenants", data);
}

export function updateTenant(id: string, data: UpdateTenantDto) {
  return apiPut<Tenant>(`/admin/tenants/${id}`, data);
}

export function deleteTenant(id: string) {
  return apiDelete<{ message: string }>(`/admin/tenants/${id}`);
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

export function disableTwoFactor(userId?: string) {
  // If userId is not provided, we need to get it from the current user
  // For now, we'll require it to be passed explicitly
  if (!userId) {
    // Try to get from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const user = JSON.parse(storedUser);
      userId = user.id;
    }
  }
  if (!userId) {
    throw new Error("User ID is required to disable 2FA");
  }
  return apiPost<{ message: string }>("/two-factor/disable", { userId });
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

export function getMapSettings(tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<MapSettings>(`/admin/app-settings/map-settings${params}`);
}

export function setMapSettings(data: SetMapSettingsDto) {
  return apiPut<MapSettings>("/admin/app-settings/map-settings", data);
}

export interface SiteSettings {
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
}

export interface SetSiteSettingsDto {
  siteName?: { hu?: string; en?: string; de?: string };
  siteDescription?: { hu?: string; en?: string; de?: string };
  seoTitle?: { hu?: string; en?: string; de?: string };
  seoDescription?: { hu?: string; en?: string; de?: string };
  isCrawlable?: boolean;
  defaultPlaceholderCardImage?: string | null;
  defaultPlaceholderDetailHeroImage?: string | null;
}

export function getSiteSettings(tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<SiteSettings>(`/admin/app-settings/site-settings${params}`);
}

export function setSiteSettings(data: SetSiteSettingsDto & { tenantId: string }) {
  return apiPut<SiteSettings>("/admin/app-settings/site-settings", data);
}

// Events
export interface Event {
  id: string;
  tenantId: string;
  placeId: string | null;
  categoryId: string | null; // Legacy: kept for backward compatibility
  isActive: boolean;
  isPinned: boolean;
  startDate: string;
  endDate: string | null;
  heroImage: string | null;
  gallery: string[];
  lat: number | null;
  lng: number | null;
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
  tenantId: string;
  placeId?: string | null;
  categoryId?: string | null; // Legacy: kept for backward compatibility
  categoryIds?: string[]; // New: multiple categories support
  tagIds?: string[];
  translations: Array<{
    lang: "hu" | "en" | "de";
    title: string;
    shortDescription?: string | null;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  isPinned?: boolean;
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
  translations?: Array<{
    lang: "hu" | "en" | "de";
    title: string;
    shortDescription?: string | null;
    description?: string | null;
    seoTitle?: string | null;
    seoDescription?: string | null;
    seoImage?: string | null;
    seoKeywords?: string[];
  }>;
  isActive?: boolean;
  isPinned?: boolean;
  startDate?: string;
  endDate?: string | null;
  heroImage?: string | null;
  gallery?: string[];
  lat?: number | null;
  lng?: number | null;
}

export function getEvents(tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiGet<Event[]>(`/admin/events${params}`);
}

export function getEvent(id: string) {
  return apiGet<Event>(`/admin/events/${id}`);
}

export function createEvent(data: CreateEventDto) {
  return apiPost<Event>("/admin/events", data);
}

export function updateEvent(id: string, data: UpdateEventDto, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiPut<Event>(`/admin/events/${id}${params}`, data);
}

export function deleteEvent(id: string, tenantId?: string) {
  const params = tenantId ? `?tenantId=${tenantId}` : "";
  return apiDelete<{ message: string }>(`/admin/events/${id}${params}`);
}


// src/api/auth.api.ts
import { apiPost, apiPostPublic } from "./client";
import type { UserRole } from "../types/enums";

export interface PublicFormShieldFields {
  companyWebsite?: string;
  formStartedAt?: number;
  recaptchaToken?: string;
}

export interface RegisterDto extends PublicFormShieldFields {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  bio?: string;
  siteId?: string;
}

export interface LoginDto extends PublicFormShieldFields {
  email: string;
  password: string;
  twoFactorToken?: string;
}

export interface ForgotPasswordDto extends PublicFormShieldFields {
  email: string;
}

export interface ResetPasswordDto extends PublicFormShieldFields {
  token: string;
  newPassword: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    siteIds: string[];
  };
}

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  siteIds: string[];
  activeSiteId?: string | null; // null = visitor, non-null = active user
  /** Opt-in floating AI Assistant dock; default false (superadmins seeded true). */
  aiAssistantEnabled?: boolean;
  // Backward compatibility: backend may still return tenantIds
  tenantIds?: string[];
}

export function register(data: RegisterDto) {
  return apiPostPublic<AuthResponse>("/auth/register", data);
}

export function login(data: LoginDto) {
  return apiPostPublic<AuthResponse>("/auth/login", data);
}

export function forgotPassword(data: ForgotPasswordDto) {
  return apiPostPublic<{ message: string; resetToken?: string }>("/auth/forgot-password", data);
}

export function resetPassword(data: ResetPasswordDto) {
  return apiPostPublic<{ message: string }>("/auth/reset-password", data);
}

export function refreshToken(data: RefreshTokenDto) {
  return apiPostPublic<{ accessToken: string; refreshToken: string }>("/auth/refresh", data);
}

export function logout() {
  return apiPost<{ message: string }>("/auth/logout", {});
}

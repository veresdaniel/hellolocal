/**
 * Auth context contract shared by provider and `useAuth` (avoids circular imports).
 */
// src/contexts/AuthContext.shared.ts
import { createContext } from "react";
import type { User } from "../api/auth.api";

/** Session API exposed to the tree: login/register/logout and current user. */
export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    email: string,
    password: string,
    twoFactorToken?: string,
    shield?: { companyWebsite?: string; formStartedAt?: number; recaptchaToken?: string }
  ) => Promise<void>;
  register: (data: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    bio?: string;
    audience?: "visitor";
    plan?: string;
    countryId?: string;
    townId?: string;
    townName?: string;
    deviceHash?: string;
    companyWebsite?: string;
    formStartedAt?: number;
    recaptchaToken?: string;
  }) => Promise<void>;
  /** @param isManualLogout - When true, skip “session expired” UX and clear tokens immediately */
  logout: (isManualLogout?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// src/contexts/AuthContext.shared.ts
import { createContext } from "react";
import type { User } from "../api/auth.api";

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
    companyWebsite?: string;
    formStartedAt?: number;
    recaptchaToken?: string;
  }) => Promise<void>;
  logout: (isManualLogout?: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

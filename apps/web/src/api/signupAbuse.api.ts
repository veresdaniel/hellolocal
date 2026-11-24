import { apiGet, apiGetPublic, apiPost } from "./client";

export type FreeTrialRequirements = {
  requireCard: boolean;
  stripeConfigured: boolean;
  publishableKey: string | null;
};

export type FreeTrialCardStatus = FreeTrialRequirements & {
  cardVerified: boolean;
};

export type SignupSignalRow = {
  id: string;
  userId: string | null;
  emailNormalized: string;
  ipHash: string | null;
  deviceHash: string | null;
  userAgent: string | null;
  stripeFingerprint: string | null;
  riskScore: number;
  flags: string[];
  note: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    username: string;
    createdAt: string;
    isActive: boolean;
    stripeCardFingerprint: string | null;
    ownedPlaces: Array<{ id: string; plan: string; isActive: boolean }>;
  } | null;
};

export function getFreeTrialRequirements() {
  return apiGetPublic<FreeTrialRequirements>("/public/free-trial/requirements");
}

export function getFreeTrialCardStatus() {
  return apiGet<FreeTrialCardStatus>("/auth/free-trial/card-status");
}

export function createFreeTrialSetupIntent() {
  return apiPost<{ alreadyVerified: boolean; clientSecret: string | null }>(
    "/auth/free-trial/setup-intent",
    {}
  );
}

export function confirmFreeTrialCard(setupIntentId: string) {
  return apiPost<{ ok: boolean; fingerprint: string; attached?: unknown }>(
    "/auth/free-trial/confirm-card",
    { setupIntentId }
  );
}

export function getSignupSignals(params?: { minScore?: number; limit?: number }) {
  const q = new URLSearchParams();
  if (params?.minScore != null) q.set("minScore", String(params.minScore));
  if (params?.limit != null) q.set("limit", String(params.limit));
  const qs = q.toString();
  return apiGet<SignupSignalRow[]>(`/admin/signup-signals${qs ? `?${qs}` : ""}`);
}

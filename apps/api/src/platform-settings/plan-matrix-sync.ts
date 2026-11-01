/**
 * Keep public marketing plan numbers aligned with FREE / BASIC / PRO matrix
 * limits. Municipal and BUSINESS are not synced.
 */

export type PublicPlanId = "free" | "basic" | "premium";

const PUBLIC_PLAN_IDS: PublicPlanId[] = ["free", "basic", "premium"];

const MATRIX_PLAN: Record<PublicPlanId, "FREE" | "BASIC" | "PRO"> = {
  free: "FREE",
  basic: "BASIC",
  premium: "PRO",
};

const MATRIX_LIMIT_KEY = {
  places: "placesMax",
  events: "eventsPerMonthMax",
  languages: "languagesMax",
} as const;

function finiteNumber(value: unknown): number | undefined {
  if (value === "" || value === null || value === undefined) return undefined;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.max(0, Math.round(n));
}

function cloneOverrides(planOverrides: unknown): Record<string, any> {
  if (!planOverrides || typeof planOverrides !== "object") return {};
  // structuredClone keeps Infinity; JSON.stringify would turn it into null.
  return structuredClone(planOverrides) as Record<string, any>;
}

/** Finite matrix limits → publicPlans (priceHuf untouched). */
export function syncPublicPlansFromMatrixLimits(planOverrides: unknown): Record<string, any> {
  const root = cloneOverrides(planOverrides);
  const publicPlans: Record<string, any> = {
    ...(root.publicPlans && typeof root.publicPlans === "object" ? root.publicPlans : {}),
  };

  for (const id of PUBLIC_PLAN_IDS) {
    const limits = root[MATRIX_PLAN[id]]?.limits;
    if (!limits || typeof limits !== "object") continue;
    const current = { ...(publicPlans[id] || {}) };
    let touched = false;
    for (const field of ["places", "events", "languages"] as const) {
      const value = finiteNumber(limits[MATRIX_LIMIT_KEY[field]]);
      if (value === undefined) continue;
      current[field] = value;
      touched = true;
    }
    if (touched) publicPlans[id] = current;
  }

  if (Object.keys(publicPlans).length) root.publicPlans = publicPlans;
  return root;
}

/** publicPlans numbers → FREE/BASIC/PRO.limits. */
export function syncMatrixLimitsFromPublicPlans(planOverrides: unknown): Record<string, any> {
  const root = cloneOverrides(planOverrides);
  const publicPlans = root.publicPlans;
  if (!publicPlans || typeof publicPlans !== "object") return root;

  for (const id of PUBLIC_PLAN_IDS) {
    const entry = publicPlans[id];
    if (!entry || typeof entry !== "object") continue;
    const matrixKey = MATRIX_PLAN[id];
    if (!root[matrixKey] || typeof root[matrixKey] !== "object") {
      root[matrixKey] = { limits: {}, features: {} };
    }
    if (!root[matrixKey].limits || typeof root[matrixKey].limits !== "object") {
      root[matrixKey].limits = {};
    }
    for (const field of ["places", "events", "languages"] as const) {
      const value = finiteNumber(entry[field]);
      if (value === undefined) continue;
      root[matrixKey].limits[MATRIX_LIMIT_KEY[field]] = value;
    }
  }

  return root;
}

/**
 * On feature-matrix save the matrix is authoritative: copy finite FREE/BASIC/PRO
 * limits into publicPlans. Callers that edit publicPlans first must run
 * syncMatrixLimitsFromPublicPlans so those numbers are already on the matrix.
 */
export function alignPlanMatrixAndPublicPlans(planOverrides: unknown): Record<string, any> | null {
  if (planOverrides === null) return null;
  if (planOverrides === undefined) return undefined as unknown as Record<string, any>;
  return syncPublicPlansFromMatrixLimits(planOverrides);
}

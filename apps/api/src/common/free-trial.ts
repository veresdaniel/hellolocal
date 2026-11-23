/** AppSetting: free-plan trial length before auto-suspend (days). */
export const FREE_TRIAL_DAYS_KEY = "platform.freeTrialDays";

/** Default: 1 calendar month ≈ 30 days. */
export const FREE_TRIAL_DAYS_DEFAULT = 30;

/** Clamp admin/public values to a sane range. */
export function parseFreeTrialDays(raw: string | number | null | undefined): number {
  const n = typeof raw === "number" ? raw : raw != null ? Number.parseInt(String(raw), 10) : NaN;
  if (!Number.isFinite(n) || n < 1) return FREE_TRIAL_DAYS_DEFAULT;
  return Math.min(Math.floor(n), 3650);
}

export function freeTrialValidUntil(from: Date, days: number): Date {
  const end = new Date(from.getTime());
  end.setUTCDate(end.getUTCDate() + parseFreeTrialDays(days));
  return end;
}

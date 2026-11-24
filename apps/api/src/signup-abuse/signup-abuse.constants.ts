/** AppSetting: JSON array or CSV of extra disposable email domains. */
export const DISPOSABLE_EMAIL_DOMAINS_KEY = "platform.disposableEmailDomains";

/** AppSetting: when "true", free-plan registration requires Stripe card SetupIntent. */
export const FREE_TRIAL_REQUIRE_CARD_KEY = "platform.freeTrialRequireCard";

/** Soft-score threshold for the admin “suspicious” list. */
export const SUSPICIOUS_SCORE_MIN = 40;

export const FLAG = {
  disposableEmail: "disposable_email",
  emailAliasCluster: "email_alias_cluster",
  multiFreePending: "multi_free_pending",
  sharedIp: "shared_ip",
  sharedDevice: "shared_device",
  sharedCard: "shared_card",
  cardRequired: "card_required",
} as const;

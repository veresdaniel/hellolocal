/** Shared content-draft provider ids (admin settings + API). */

export const CONTENT_DRAFT_PROVIDERS = ["gemini", "groq", "openrouter"] as const;
export type ContentDraftProviderId = (typeof CONTENT_DRAFT_PROVIDERS)[number];

/** Default free-tier provider (Gemini Developer API free tier). */
export const CONTENT_DRAFT_DEFAULT_PROVIDER: ContentDraftProviderId = "gemini";

export function isContentDraftProvider(value: unknown): value is ContentDraftProviderId {
  return (
    typeof value === "string" &&
    (CONTENT_DRAFT_PROVIDERS as readonly string[]).includes(value)
  );
}

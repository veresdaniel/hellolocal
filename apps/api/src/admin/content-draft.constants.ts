/** AppSetting keys for the optional text draft. The credential value is never returned to clients. */
export const CONTENT_DRAFT_PROVIDER_KEY = "contentDraft.provider";
export const CONTENT_DRAFT_API_KEY = "contentDraft.apiKey";

export const CONTENT_DRAFT_PROVIDERS = ["gemini", "groq", "openrouter"] as const;
export type ContentDraftProviderId = (typeof CONTENT_DRAFT_PROVIDERS)[number];

/** Default free-tier provider (Gemini Developer API free tier). */
export const CONTENT_DRAFT_DEFAULT_PROVIDER: ContentDraftProviderId = "gemini";

export const CONTENT_DRAFT_KINDS = [
  "site",
  "place",
  "town",
  "event",
  "category",
  "tag",
  "product",
  "staticPage",
  "legalPage",
  "collection",
  "gallery",
  "priceBand",
  "generic",
] as const;
export type ContentDraftKindId = (typeof CONTENT_DRAFT_KINDS)[number];

export const CONTENT_DRAFT_FIELDS = [
  "name",
  "title",
  "shortDescription",
  "description",
  "seoTitle",
  "seoDescription",
  "accessibility",
  "content",
  "caption",
  "intro",
] as const;
export type ContentDraftFieldId = (typeof CONTENT_DRAFT_FIELDS)[number];

/** Gemini 3.5 Flash-Lite: free-tier input and output on the Gemini Developer API. */
export const GEMINI_DRAFT_MODEL = "gemini-3.5-flash-lite";

/**
 * Groq free-tier chat model (OpenAI-compatible).
 * llama-3.1-8b-instant is a production model with the highest free RPD among Groq chat models.
 */
export const GROQ_DRAFT_MODEL = "llama-3.1-8b-instant";

/**
 * OpenRouter Free Models Router — routes only to $0 / :free catalog entries
 * (https://openrouter.ai/openrouter/free). Avoids hard-coding a rotating :free model id.
 */
export const OPENROUTER_DRAFT_MODEL = "openrouter/free";

export function isContentDraftProvider(value: unknown): value is ContentDraftProviderId {
  return (
    typeof value === "string" &&
    (CONTENT_DRAFT_PROVIDERS as readonly string[]).includes(value)
  );
}

export function isContentDraftKind(value: unknown): value is ContentDraftKindId {
  return typeof value === "string" && (CONTENT_DRAFT_KINDS as readonly string[]).includes(value);
}

export function isContentDraftField(value: unknown): value is ContentDraftFieldId {
  return typeof value === "string" && (CONTENT_DRAFT_FIELDS as readonly string[]).includes(value);
}

import {
  CONTENT_DRAFT_DEFAULT_PROVIDER,
  CONTENT_DRAFT_PROVIDERS,
  isContentDraftProvider,
  type ContentDraftProviderId,
} from "@hellolocal/shared";

export {
  CONTENT_DRAFT_DEFAULT_PROVIDER,
  CONTENT_DRAFT_PROVIDERS,
  isContentDraftProvider,
  type ContentDraftProviderId,
};

/** AppSetting keys for the optional text draft. The credential value is never returned to clients. */
export const CONTENT_DRAFT_PROVIDER_KEY = "contentDraft.provider";
export const CONTENT_DRAFT_API_KEY = "contentDraft.apiKey";

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
 * OpenRouter free-tier models for drafts.
 * Prefer concrete :free chat models that return `message.content`.
 * Avoid relying solely on `openrouter/free` — it often routes to reasoning
 * models that burn max_tokens on `reasoning` and leave `content` null.
 */
export const OPENROUTER_DRAFT_MODEL = "dots-studio/dots-3-note-preview:free";

/** Tried in order when a previous OpenRouter attempt returns empty/reasoning-only content. */
export const OPENROUTER_DRAFT_FALLBACK_MODELS = [
  OPENROUTER_DRAFT_MODEL,
  "nvidia/nemotron-3.5-super-vl:free",
  "nvidia/nemotron-3-ultra-550b-a55b:free",
] as const;

export function isContentDraftKind(value: unknown): value is ContentDraftKindId {
  return typeof value === "string" && (CONTENT_DRAFT_KINDS as readonly string[]).includes(value);
}

export function isContentDraftField(value: unknown): value is ContentDraftFieldId {
  return typeof value === "string" && (CONTENT_DRAFT_FIELDS as readonly string[]).includes(value);
}

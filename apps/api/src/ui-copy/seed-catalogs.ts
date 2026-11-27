/**
 * Flattened locale seed for shipped UI languages (hu/en/de), excluding admin.
 * Regenerated from apps/web/src/i18n/locales via:
 *   node apps/api/scripts/generate-ui-seed-catalogs.cjs
 */
import raw from "./seed-catalogs.json";

export type UiSeedCatalogs = Record<string, Record<string, string>>;

export const SHIPPED_UI_LANGS = ["hu", "en", "de"] as const;

/** Public + shared namespaces only — admin.json stays JSON-only for now. */
export function shippedUiSeedCatalogs(): UiSeedCatalogs {
  return raw as UiSeedCatalogs;
}

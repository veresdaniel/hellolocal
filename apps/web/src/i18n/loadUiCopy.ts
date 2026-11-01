import i18n from "./config";
import { getPublicUiCopy } from "../api/uiCopy.api";
import { isLang } from "../app/config";
import { unflattenMessages } from "./uiMessages";

const loaded = new Set<string>();

export function hasUiCopy(lang: string | null | undefined): boolean {
  if (!lang) return false;
  const code = lang.toLowerCase().split("-")[0];
  return loaded.has(code);
}

/** Drop the in-memory flag so the next applyUiCopy fetches fresh DB strings. */
export function invalidateUiCopy(lang?: string | null) {
  if (!lang) {
    loaded.clear();
    return;
  }
  loaded.delete(lang.toLowerCase().split("-")[0]);
}

export async function applyUiCopy(lang: string | null | undefined): Promise<void> {
  const code = (lang || "").toLowerCase().split("-")[0];
  if (!isLang(code) || loaded.has(code)) return;
  const payload = await getPublicUiCopy(code);
  if (!payload || !Object.keys(payload.messages || {}).length) return;
  const bundle = unflattenMessages(payload.messages);
  i18n.addResourceBundle(code, "translation", bundle, true, true);
  loaded.add(code);
  i18n.emit("loaded", { [code]: { translation: bundle } });
}

void applyUiCopy(i18n.language);
i18n.on("languageChanged", (lng) => {
  void applyUiCopy(lng);
});

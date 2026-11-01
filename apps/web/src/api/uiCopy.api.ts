import { apiDelete, apiGet, apiPost, apiPut } from "./client";

function apiBase(): string {
  const apiUrl = import.meta.env.VITE_API_URL;
  return apiUrl ? String(apiUrl).replace(/\/$/, "") : "";
}

export type UiCopyPayload = {
  languages: string[];
  messages: Record<string, string>;
};

export type UiCopyEntry = {
  key: string;
  value: string;
  reference: string;
};

export async function getPublicUiCopy(lang: string): Promise<UiCopyPayload | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 1500);
  try {
    const response = await fetch(`${apiBase()}/api/public/ui/${encodeURIComponent(lang)}`, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    return (await response.json()) as UiCopyPayload;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export function getUiLanguages() {
  return apiGet<{ languages: string[] }>("/admin/ui-copy/languages");
}

export function getPublicUiLanguages() {
  return fetch(`${apiBase()}/api/public/ui/languages`, { headers: { accept: "application/json" } }).then(
    async (response) => {
      if (!response.ok) return { languages: [] as string[] };
      return (await response.json()) as { languages: string[] };
    }
  );
}

export function addUiLanguage(code: string) {
  return apiPost<{ languages: string[] }>("/admin/ui-copy/languages", { code });
}

export function removeUiLanguage(code: string) {
  return apiDelete<{ languages: string[] }>(`/admin/ui-copy/languages/${encodeURIComponent(code)}`);
}

export function getUiMessages(lang: string) {
  return apiGet<{ languages: string[]; lang: string; entries: UiCopyEntry[] }>(
    `/admin/ui-copy/messages?lang=${encodeURIComponent(lang)}`
  );
}

export function saveUiMessages(lang: string, entries: Record<string, string>) {
  return apiPut<{ updated: number }>("/admin/ui-copy/messages", { lang, entries });
}

export function syncUiCatalogs(catalogs: Record<string, Record<string, string>>) {
  return apiPost<{ inserted: number }>("/admin/ui-copy/sync", { catalogs });
}

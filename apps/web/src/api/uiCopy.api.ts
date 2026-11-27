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

export type PathSegmentsPayload = {
  languages: string[];
  byLang: Record<string, Record<string, string>>;
  aliases: Record<string, { key: string; langs: string[] }>;
};

export function getPublicPathSegments() {
  return fetch(`${apiBase()}/api/public/ui/path-segments`, { headers: { accept: "application/json" } }).then(
    async (response) => {
      if (!response.ok) return null;
      return (await response.json()) as PathSegmentsPayload;
    }
  );
}

export function getAdminPathSegments() {
  return apiGet<PathSegmentsPayload>("/admin/ui-copy/path-segments");
}

export function saveAdminPathSegments(lang: string, entries: Record<string, string>) {
  return apiPut<PathSegmentsPayload>("/admin/ui-copy/path-segments", { lang, entries });
}

export type UiTranslateStatus = "queued" | "running" | "done" | "failed";

export type UiTranslateJob = {
  id: string;
  lang: string;
  status: UiTranslateStatus;
  total: number;
  done: number;
  error?: string;
};

export function addUiLanguage(code: string) {
  return apiPost<{ languages: string[]; translateJobId?: string }>("/admin/ui-copy/languages", { code });
}

export function startUiTranslate(lang: string) {
  return apiPost<UiTranslateJob>("/admin/ui-copy/translate", { lang });
}

export function getUiTranslateJob(jobId: string) {
  return apiGet<UiTranslateJob>(`/admin/ui-copy/translate/${encodeURIComponent(jobId)}`);
}

/** Poll a translate job until it is done or failed. Calls `onProgress` after every poll. */
export async function pollUiTranslateJob(
  jobId: string,
  onProgress?: (job: UiTranslateJob) => void,
  options: { intervalMs?: number; timeoutMs?: number; signal?: { cancelled: boolean } } = {}
): Promise<UiTranslateJob> {
  const intervalMs = options.intervalMs ?? 2000;
  const deadline = Date.now() + (options.timeoutMs ?? 30 * 60 * 1000);
  for (;;) {
    const job = await getUiTranslateJob(jobId);
    onProgress?.(job);
    if (job.status === "done" || job.status === "failed") return job;
    if (options.signal?.cancelled || Date.now() > deadline) return job;
    await new Promise((resolve) => window.setTimeout(resolve, intervalMs));
  }
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

export function syncUiCatalogs(
  catalogs: Record<string, Record<string, string>>,
  mode: "missing" | "replace" = "missing"
) {
  return apiPost<{ inserted: number; updated: number; mode: string }>("/admin/ui-copy/sync", {
    catalogs,
    mode,
  });
}

/**
 * Platform-host URL hygiene (AppSetting platform.publicHost):
 * - www → apex (www.hellolocal.hu → hellolocal.hu)
 * - bare `/` → host language root (`/hu` on hellolocal.hu, `/en` on hellolocal.eu)
 * - legacy overview segments → `/:lang`
 *
 * hello-local.io www is handled in the Caddyfile. Custom tenant domains are left alone
 * (the tenant may use www or bare `/` as their primary opener).
 */

const OVERVIEW_SEGMENTS = new Set(["attekintes", "overview", "ueberblick"]);
const LANGS = new Set(["hu", "en", "de"]);

/**
 * @typedef {{ host: string, lang: "hu" | "en" | "de" }} PlatformHostEntry
 */

/**
 * @param {string} host
 * @param {readonly PlatformHostEntry[]} entries
 * @returns {PlatformHostEntry | null}
 */
export function matchPlatformHostEntry(host, entries) {
  const clean = String(host || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "");
  if (!clean || !Array.isArray(entries)) return null;
  for (const entry of entries) {
    if (clean === entry.host || clean === `www.${entry.host}`) return entry;
  }
  return null;
}

/**
 * Absolute https redirect when the request host/path is not the single preferred form.
 * Combines www→apex and `/`→`/:lang` so crawlers get one hop when both apply.
 *
 * @param {string} host Request hostname (lowercase, no port).
 * @param {readonly PlatformHostEntry[]} entries Apex platform hosts with opener lang.
 * @param {string} originalUrl Path + query of the request.
 * @returns {string | null}
 */
export function platformHostCanonicalTarget(host, entries, originalUrl) {
  const entry = matchPlatformHostEntry(host, entries);
  if (!entry) return null;

  const raw = String(originalUrl || "/");
  const qIndex = raw.indexOf("?");
  const pathname = (qIndex === -1 ? raw : raw.slice(0, qIndex)).split("#")[0] || "/";
  const qs = qIndex === -1 ? "" : raw.slice(qIndex);
  const parts = pathname.split("/").filter(Boolean);

  /** @type {string | null} */
  let nextPath = null;
  if (parts.length === 0) {
    nextPath = `/${entry.lang}`;
  } else if (parts.length === 1 && OVERVIEW_SEGMENTS.has(parts[0])) {
    nextPath = `/${entry.lang}`;
  } else if (parts.length === 2 && LANGS.has(parts[0]) && OVERVIEW_SEGMENTS.has(parts[1])) {
    nextPath = `/${parts[0]}`;
  }

  const clean = String(host || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "");
  const hostNeedsApex = clean.startsWith("www.");
  if (!nextPath && !hostNeedsApex) return null;

  const pathOut = nextPath || (pathname.startsWith("/") ? pathname : `/${pathname}`);
  return `https://${entry.host}${pathOut}${qs}`;
}

/**
 * @deprecated Prefer {@link platformHostCanonicalTarget} with entries.
 * Kept for unit tests that only check www→apex.
 */
export function wwwToApexTarget(host, platformHosts, originalUrl) {
  const entries = (platformHosts || []).map((h) => ({
    host: String(h).replace(/^www\./, ""),
    lang: "hu",
  }));
  const clean = String(host || "")
    .toLowerCase()
    .split(":")[0]
    .replace(/\.$/, "");
  if (!clean.startsWith("www.")) return null;
  const target = platformHostCanonicalTarget(host, entries, originalUrl);
  // wwwToApex only promised host rewrite; if path was `/` the new helper also
  // rewrites to /:lang — acceptable for the combined redirect policy.
  return target;
}

/**
 * Cached loader for `/api/app-settings/platform-host` entries.
 * Fails open (empty list → no redirect) so an API hiccup never breaks the site.
 *
 * @param {string} apiUrl
 * @param {{ ttlMs?: number, timeoutMs?: number, fetchImpl?: typeof fetch }} [opts]
 * @returns {() => Promise<PlatformHostEntry[]>}
 */
export function createPlatformHostLoader(apiUrl, opts = {}) {
  const ttlMs = opts.ttlMs ?? 60_000;
  const timeoutMs = opts.timeoutMs ?? 800;
  const fetchImpl = opts.fetchImpl ?? fetch;
  /** @type {{ entries: PlatformHostEntry[], until: number }} */
  let cache = { entries: [], until: 0 };
  return async function loadPlatformHostEntries() {
    if (cache.until > Date.now()) return cache.entries;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${apiUrl}/api/app-settings/platform-host`, {
        signal: controller.signal,
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error(`status ${response.status}`);
      const data = await response.json();
      /** @type {PlatformHostEntry[]} */
      const entries = [];
      const seen = new Set();
      const rows = Array.isArray(data?.entries) ? data.entries : [];
      if (rows.length) {
        for (const row of rows) {
          const host = String(row?.host || "")
            .trim()
            .toLowerCase()
            .replace(/^www\./, "");
          const lang = row?.lang === "en" || row?.lang === "de" || row?.lang === "hu" ? row.lang : "hu";
          if (!host || seen.has(host)) continue;
          seen.add(host);
          entries.push({ host, lang });
        }
      } else if (Array.isArray(data?.hosts)) {
        for (const raw of data.hosts) {
          const host = String(raw || "")
            .trim()
            .toLowerCase()
            .replace(/^www\./, "");
          if (!host || seen.has(host)) continue;
          seen.add(host);
          entries.push({ host, lang: "hu" });
        }
      }
      cache = { entries, until: Date.now() + ttlMs };
      return entries;
    } catch {
      cache = { entries: cache.entries, until: Date.now() + 10_000 };
      return cache.entries;
    } finally {
      clearTimeout(timer);
    }
  };
}

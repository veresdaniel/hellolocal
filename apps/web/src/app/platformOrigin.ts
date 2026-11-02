/** Public platform origin used for cross-region links. Empty list keeps hello-local.io. */
const DEFAULT_ORIGIN = "https://hello-local.io";

export type PlatformHostEntry = { host: string; lang: string };

let hosts: string[] = [];
const hostLangs = new Map<string, string>();

function cleanHost(raw: string): string {
  return raw.trim().toLowerCase().replace(/^www\./, "");
}

export function getPlatformOrigin(): string {
  return hosts[0] ? `https://${hosts[0]}` : DEFAULT_ORIGIN;
}

export function setPlatformPublicHosts(next: readonly string[] | null | undefined): void {
  const seen = new Set<string>();
  hosts = [];
  for (const raw of next ?? []) {
    const clean = cleanHost(raw);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    hosts.push(clean);
  }
  for (const key of [...hostLangs.keys()]) {
    if (!seen.has(key)) hostLangs.delete(key);
  }
}

/** Hosts plus the language each one opens in. Replaces the previous list. */
export function setPlatformPublicHostEntries(next: readonly PlatformHostEntry[] | null | undefined): void {
  hosts = [];
  hostLangs.clear();
  const seen = new Set<string>();
  for (const row of next ?? []) {
    const clean = cleanHost(row.host);
    const lang = row.lang === "en" || row.lang === "de" || row.lang === "hu" ? row.lang : "";
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    hosts.push(clean);
    if (lang) hostLangs.set(clean, lang);
  }
}

/** Opening language for a configured platform host, including its www name. */
export function platformHostLanguage(hostname: string): string | null {
  const host = cleanHost(hostname.toLowerCase().split(":")[0].replace(/\.$/, ""));
  return hostLangs.get(host) ?? null;
}

/** @deprecated Single-host setter. Prefer setPlatformPublicHosts. */
export function setPlatformPublicHost(host: string | null | undefined): void {
  setPlatformPublicHosts(host ? [host] : []);
}

export function platformHostMatches(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0].replace(/\.$/, "");
  return hosts.some((name) => host === name || host === `www.${name}`);
}

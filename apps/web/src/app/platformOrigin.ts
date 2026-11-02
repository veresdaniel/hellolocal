/** Public platform origin used for cross-region links. Empty list keeps hello-local.io. */
const DEFAULT_ORIGIN = "https://hello-local.io";

let hosts: string[] = [];

export function getPlatformOrigin(): string {
  return hosts[0] ? `https://${hosts[0]}` : DEFAULT_ORIGIN;
}

export function setPlatformPublicHosts(next: readonly string[] | null | undefined): void {
  const seen = new Set<string>();
  hosts = [];
  for (const raw of next ?? []) {
    const clean = raw.trim().toLowerCase().replace(/^www\./, "");
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    hosts.push(clean);
  }
}

/** @deprecated Single-host setter. Prefer setPlatformPublicHosts. */
export function setPlatformPublicHost(host: string | null | undefined): void {
  setPlatformPublicHosts(host ? [host] : []);
}

export function platformHostMatches(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0].replace(/\.$/, "");
  return hosts.some((name) => host === name || host === `www.${name}`);
}

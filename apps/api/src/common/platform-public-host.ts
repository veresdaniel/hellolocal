import { PrismaService } from "../prisma/prisma.service";
import { normalizeDomainHost } from "./domain-host";

/** AppSetting key. One hostname per line, with an optional language. Empty keeps hello-local.io only. */
export const PLATFORM_PUBLIC_HOST_KEY = "platform.publicHost";

export type PlatformPublicHostEntry = { host: string; lang: "hu" | "en" | "de" };

const CACHE_MS = 30_000;
let cache: { entries: PlatformPublicHostEntry[]; exp: number } | null = null;

function asHostLang(raw: string | undefined): PlatformPublicHostEntry["lang"] | null {
  return raw === "hu" || raw === "en" || raw === "de" ? raw : null;
}

/** Hostname only, without scheme or a leading www. Null when empty or reserved. */
export function parsePlatformPublicHost(raw: string | null | undefined): string | null {
  const host = normalizeDomainHost(raw);
  if (!host) return null;
  return host.startsWith("www.") ? host.slice(4) : host;
}

/**
 * Several public platform hosts. One per line: `hellolocal.hu` or `hellolocal.hu hu`.
 * A line may still list several hosts separated by comma or space.
 * The second token is the opening language when it is hu, en, or de. Missing language is hu.
 * The first host is the default origin for links that leave a custom domain.
 */
export function parsePlatformPublicHosts(
  raw: string | null | undefined
): { hosts: PlatformPublicHostEntry[] } | { error: string } {
  const lines = (raw ?? "")
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const hosts: PlatformPublicHostEntry[] = [];
  const seen = new Set<string>();
  const push = (host: string, lang: PlatformPublicHostEntry["lang"]) => {
    if (seen.has(host)) return;
    seen.add(host);
    hosts.push({ host, lang });
  };
  for (const line of lines) {
    const parts = line.split(/[\s,;|]+/).filter(Boolean);
    if (parts.length === 2 && asHostLang(parts[1])) {
      const host = parsePlatformPublicHost(parts[0]);
      if (!host) return { error: parts[0] };
      push(host, asHostLang(parts[1])!);
      continue;
    }
    for (const part of parts) {
      const host = parsePlatformPublicHost(part);
      if (!host) return { error: part };
      push(host, "hu");
    }
  }
  return { hosts };
}

export function formatPlatformPublicHosts(hosts: readonly PlatformPublicHostEntry[]): string {
  return hosts.map((entry) => `${entry.host} ${entry.lang}`).join("\n");
}

export function clearPlatformPublicHostCache(): void {
  cache = null;
}

export function matchingPlatformHost(
  hostname: string,
  configured: readonly string[] | null | undefined
): string | null {
  if (!configured?.length) return null;
  const host = hostname.toLowerCase().split(":")[0].replace(/\.$/, "");
  for (const name of configured) {
    if (host === name || host === `www.${name}`) return name;
  }
  return null;
}

export function isConfiguredPlatformHost(
  hostname: string,
  configured: readonly string[] | string | null | undefined
): boolean {
  const list = typeof configured === "string" ? [configured] : configured;
  return matchingPlatformHost(hostname, list) !== null;
}

async function readPlatformPublicHostEntries(
  prisma: PrismaService
): Promise<PlatformPublicHostEntry[]> {
  if (cache && cache.exp > Date.now()) return cache.entries;
  const appSetting = (
    prisma as {
      appSetting?: {
        findUnique?: (args: unknown) => Promise<{ value?: string | null } | null>;
      };
    }
  ).appSetting;
  if (!appSetting?.findUnique) return [];
  const row = await appSetting.findUnique({
    where: { key: PLATFORM_PUBLIC_HOST_KEY },
  });
  const parsed = parsePlatformPublicHosts(row?.value);
  const entries = "error" in parsed ? [] : parsed.hosts;
  cache = { entries, exp: Date.now() + CACHE_MS };
  return entries;
}

export async function readPlatformPublicHosts(prisma: PrismaService): Promise<string[]> {
  const entries = await readPlatformPublicHostEntries(prisma);
  return entries.map((entry) => entry.host);
}

export { readPlatformPublicHostEntries };

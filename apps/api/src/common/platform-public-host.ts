import { PrismaService } from "../prisma/prisma.service";
import { normalizeDomainHost } from "./domain-host";

/** AppSetting key. One hostname per line. Empty keeps hello-local.io only. */
export const PLATFORM_PUBLIC_HOST_KEY = "platform.publicHost";

const CACHE_MS = 30_000;
let cache: { hosts: string[]; exp: number } | null = null;

/** Hostname only, without scheme or a leading www. Null when empty or reserved. */
export function parsePlatformPublicHost(raw: string | null | undefined): string | null {
  const host = normalizeDomainHost(raw);
  if (!host) return null;
  return host.startsWith("www.") ? host.slice(4) : host;
}

/**
 * Several public platform hosts. Separators: newline, comma, space.
 * The first host is the default origin for links that leave a custom domain.
 * Returns an error token when a line is not a usable hostname.
 */
export function parsePlatformPublicHosts(
  raw: string | null | undefined
): { hosts: string[] } | { error: string } {
  const parts = (raw ?? "")
    .split(/[\s,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const hosts: string[] = [];
  for (const part of parts) {
    const host = parsePlatformPublicHost(part);
    if (!host) return { error: part };
    if (!hosts.includes(host)) hosts.push(host);
  }
  return { hosts };
}

export function formatPlatformPublicHosts(hosts: readonly string[]): string {
  return hosts.join("\n");
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

export async function readPlatformPublicHosts(prisma: PrismaService): Promise<string[]> {
  if (cache && cache.exp > Date.now()) return cache.hosts;
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
  const hosts = "error" in parsed ? [] : parsed.hosts;
  cache = { hosts, exp: Date.now() + CACHE_MS };
  return hosts;
}

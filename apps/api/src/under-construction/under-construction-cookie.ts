import {
  buildUcSetCookieHeader as buildSharedUcSetCookieHeader,
  resolveUcCookieDomain as resolveSharedUcCookieDomain,
  UC_COOKIE_MAX_AGE_SEC,
} from "@hellolocal/shared";

function cookieEnv() {
  return {
    cookieDomain: process.env.COOKIE_DOMAIN,
    frontendUrl: process.env.FRONTEND_URL || process.env.CORS_ORIGIN?.split(",")[0],
    corsOrigin: process.env.CORS_ORIGIN,
    nodeEnv: process.env.NODE_ENV,
    cookieSecure: process.env.COOKIE_SECURE,
  };
}

export function resolveUcCookieDomain(): string | undefined {
  return resolveSharedUcCookieDomain(cookieEnv());
}

export function buildUcSetCookieHeader(
  token: string,
  maxAgeSec: number = UC_COOKIE_MAX_AGE_SEC,
  options?: { clear?: boolean }
): string {
  return buildSharedUcSetCookieHeader(token, maxAgeSec, {
    clear: options?.clear,
    env: cookieEnv(),
  });
}

// src/utils/tokenUtils.ts

/**
 * Decodes a JWT token and returns its payload
 */
export function decodeJWT(token: string): { exp?: number; iat?: number; sub?: string } | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

/**
 * Checks if a JWT token is expired
 */
export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return true;
  // Check if token expires in less than 1 minute (buffer)
  return decoded.exp * 1000 < Date.now() + 60000;
}

/**
 * Gets the expiration time of a token in milliseconds
 */
export function getTokenExpiration(token: string | null): number | null {
  if (!token) return null;
  const decoded = decodeJWT(token);
  if (!decoded || !decoded.exp) return null;
  return decoded.exp * 1000;
}


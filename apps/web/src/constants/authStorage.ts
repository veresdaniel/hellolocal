/** localStorage keys for JWT session — single source for client auth persistence. */

export const ACCESS_TOKEN_KEY = "accessToken";
export const REFRESH_TOKEN_KEY = "refreshToken";
export const USER_KEY = "user";

export function clearAuthStorage(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

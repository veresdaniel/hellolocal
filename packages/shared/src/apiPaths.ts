/** Cross-app REST paths (Nest `@Controller` / browser fetch / SSR). */

/** Auth */
export const API_AUTH_BASE = "/api/auth";
export const API_AUTH_GOOGLE = "/api/auth/google";
export const API_AUTH_GOOGLE_CALLBACK = "/api/auth/google/callback";
export const API_AUTH_LOGIN = "/api/auth/login";
export const API_AUTH_REFRESH = "/api/auth/refresh";

/** Two-factor */
export const API_TWO_FACTOR_BASE = "/api/two-factor";

/** Under-construction (also exported from underConstruction.ts) */
export {
  UC_ADMIN_API_PATH,
  UC_ADMIN_CLIENT_PATH,
  UC_PUBLIC_API_PATH,
} from "./underConstruction.js";

/**
 * Local demo entry used by `pnpm db:seed` and `pnpm db:reset`.
 * Refuses every host except localhost. Remote devel and the platform load
 * go through prisma/load-snapshot.cjs with SEED_PROFILE and SEED_CONFIRM.
 */
import "dotenv/config";
import "./load-snapshot.cjs";

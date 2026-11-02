/**
 * Local demo entry used by `pnpm db:seed` and `pnpm db:reset`.
 * Refuses every host except localhost. Remote devel and the platform load
 * go through prisma/load-snapshot.cjs with SEED_PROFILE and SEED_CONFIRM.
 * An empty database after migrate also receives the snapshot superadmin from
 * prisma/ensure-superadmin.cjs, without reloading the rest of the snapshot.
 */
import "dotenv/config";
import "./load-snapshot.cjs";

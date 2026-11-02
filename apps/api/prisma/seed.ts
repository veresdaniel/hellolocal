/**
 * Local demo entry used by `pnpm db:seed` and `pnpm db:reset`.
 * Refuses every host except localhost. Remote devel and the platform load
 * go through prisma/load-snapshot.cjs with SEED_PROFILE and SEED_CONFIRM.
 * An empty database after migrate receives the same demo region from
 * `SEED_ENSURE=1 node prisma/load-snapshot.cjs`. An existing region is kept.
 */
import "dotenv/config";
import "./load-snapshot.cjs";

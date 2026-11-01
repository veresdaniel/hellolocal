/**
 * Starts the staging API (3003) and staging Vite (5174) together.
 * User-facing alias: `pnpm local:staging` (same entrypoint).
 * Dev (`pnpm local:dev` / `pnpm dev:api` / `pnpm dev:web`) is unchanged.
 */
const { spawn, spawnSync } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const check = spawnSync(
  process.execPath,
  [path.join(root, "apps/api/scripts/start-staging.cjs"), "--check"],
  { cwd: root, stdio: "inherit" }
);

if (check.status !== 0) {
  process.exit(check.status ?? 1);
}

function start(script) {
  return spawn("pnpm", ["run", script], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
}

const api = start("staging:api");
const web = start("staging:web");
const children = [api, web];

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const child of children) {
    if (child.pid && !child.killed) {
      child.kill(signal);
    }
  }
}

function finish(code) {
  shutdown("SIGTERM");
  process.exit(code ?? 1);
}

process.on("SIGINT", () => finish(130));
process.on("SIGTERM", () => finish(143));

for (const child of children) {
  child.on("error", () => finish(1));
  child.on("exit", (code) => {
    if (!shuttingDown) {
      finish(code ?? 1);
    }
  });
}

/**
 * Local development stack: API (apps/api/.env → docker/dev DB) + Vite on 5173.
 * Side-by-side with staging (5174/3003) and live-browse (5175).
 */
const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");

console.log("");
console.log("local:dev — helyi docker/dev adatbázis (apps/api/.env)");
console.log("  Web: http://localhost:5173");
console.log("  API: http://localhost:3002");
console.log("  Ha üres a térkép/helyek: a local DB seedelve legyen (csak local!),");
console.log("  pl. pnpm -C apps/api db:seed  — seed TRUNCATE-ol, NE futtasd staging/live-on.");
console.log("");

function start(script) {
  return spawn("pnpm", ["run", script], {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
}

const api = start("dev:api");
const web = start("dev:web");
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

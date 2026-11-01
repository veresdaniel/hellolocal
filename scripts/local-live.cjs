/**
 * Local browse of LIVE / production data — READ-ONLY style.
 *
 * Starts Vite on 5175 and proxies /api → https://api.hello-local.io (CORS-safe).
 * Does NOT start a local API with production DATABASE_URL.
 * Does NOT migrate, seed, truncate, or run admin write tooling against live.
 */
const { spawn } = require("child_process");
const path = require("path");

const root = path.resolve(__dirname, "..");
const liveOrigin = "http://localhost:5175";
const liveApi = "https://api.hello-local.io";

console.error("");
console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
console.error("  local:live — ÉLES / PRODUCTION adat böngészése helyben");
console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
console.error("");
console.error("  Web:     " + liveOrigin);
console.error("  API:     same-origin /api → " + liveApi + " (Vite proxy)");
console.error("  Nincs helyi writable API, nincs production DATABASE_URL.");
console.error("  NE futtass migrate / seed / truncate / db:setup:reset /");
console.error("  db:fill-etyek parancsot production URL ellen.");
console.error("  Írások (admin mentés, upload) az éles API-t érinthetik —");
console.error("  csak olvasásra / böngészésre használd.");
console.error("");
console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
console.error("");

const env = {
  ...process.env,
  // Relative /api so the Vite proxy handles the live target (no browser CORS).
  VITE_API_URL: "",
};

const child = spawn(
  "pnpm",
  ["-C", "apps/web", "run", "live"],
  {
    cwd: root,
    env,
    stdio: "inherit",
  }
);

child.on("error", () => {
  console.error("Failed to start local:live Vite process.");
  process.exit(1);
});

const stop = (signal) => {
  if (child.pid && !child.killed) {
    child.kill(signal);
  }
};
process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

child.on("exit", (code) => {
  process.exit(code ?? 1);
});

/**
 * Starts the API against apps/api/.env.staging.
 * Does not read apps/api/.env. Dev (`start:dev`) does not use this script.
 *
 * Port, frontend origin, and CORS are fixed here so this process can run
 * beside the dev API (3002) and dev Vite (5173).
 */
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

const apiRoot = path.resolve(__dirname, "..");
const envFilePath = path.join(apiRoot, ".env.staging");
const stagingOrigin = "http://localhost:5174";
const stagingApiUrl = "http://localhost:3003";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function loadStagingEnv() {
  if (!fs.existsSync(envFilePath)) {
    fail(
      "Missing apps/api/.env.staging. Copy apps/api/env.staging.example to apps/api/.env.staging and set DATABASE_URL to the beta Postgres URL (compose project hellolocal-beta) when that database exists."
    );
  }

  let parsed;
  try {
    parsed = dotenv.parse(fs.readFileSync(envFilePath));
  } catch {
    fail("Could not read apps/api/.env.staging.");
  }

  for (const [key, value] of Object.entries(parsed)) {
    process.env[key] = value;
  }

  assertStagingDatabaseUrl(process.env.DATABASE_URL);
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === "replace-with-a-long-random-string" ||
    process.env.JWT_SECRET === "your-super-secret-jwt-key-change-this-in-production"
  ) {
    fail(
      "JWT_SECRET in apps/api/.env.staging is still a placeholder. Set a long random string in that file. Do not copy production secrets."
    );
  }

  process.env.ENV_FILE = envFilePath;
  process.env.PORT = "3003";
  process.env.NODE_ENV = "development";
  process.env.FRONTEND_URL = stagingOrigin;
  process.env.API_URL = stagingApiUrl;
  process.env.APP_BASE_URL = stagingOrigin;
  process.env.CORS_ORIGIN = corsOrigins(process.env.CORS_ORIGIN);

  const callback = process.env.GOOGLE_CALLBACK_URL || "";
  if (
    !callback ||
    callback.includes("localhost:3002") ||
    callback.includes("localhost:5173")
  ) {
    process.env.GOOGLE_CALLBACK_URL = `${stagingApiUrl}/api/auth/google/callback`;
  }
}

function corsOrigins(raw) {
  const origins = (raw || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .filter((origin) => origin !== "http://localhost:5173" && origin !== "http://localhost:3000");
  if (!origins.includes(stagingOrigin)) {
    origins.unshift(stagingOrigin);
  }
  return origins.join(",");
}

function assertStagingDatabaseUrl(databaseUrl) {
  const value = (databaseUrl || "").trim();
  if (!value) {
    fail(
      "DATABASE_URL is empty in apps/api/.env.staging. Set it to the beta Postgres URL when that database exists. Do not copy production data."
    );
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(value);
  } catch {
    fail("DATABASE_URL in apps/api/.env.staging is not a valid URL. Set it to the beta Postgres URL.");
  }

  if (parsedUrl.protocol !== "postgresql:" && parsedUrl.protocol !== "postgres:") {
    fail("DATABASE_URL in apps/api/.env.staging must be a postgres URL for the beta database.");
  }

  const blockedHosts = new Set(["api.hello-local.io", "hello-local.io", "www.hello-local.io"]);
  const placeholder =
    parsedUrl.hostname === "HOST" ||
    parsedUrl.username === "USER" ||
    parsedUrl.password === "PASSWORD";

  if (placeholder || blockedHosts.has(parsedUrl.hostname)) {
    fail(
      "DATABASE_URL in apps/api/.env.staging is still a placeholder or points at production (api.hello-local.io). Set it to the beta Postgres URL. Do not copy production data."
    );
  }
}

function startNest() {
  const nestBin = path.join(apiRoot, "node_modules", "@nestjs", "cli", "bin", "nest.js");
  const child = spawn(process.execPath, [nestBin, "start", "--watch"], {
    cwd: apiRoot,
    env: process.env,
    stdio: "inherit",
  });

  child.on("error", () => {
    fail("Failed to start the staging API process.");
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
}

loadStagingEnv();

if (process.argv.includes("--check")) {
  process.exit(0);
}

console.log("Staging API: http://localhost:3003 (env file apps/api/.env.staging)");
startNest();

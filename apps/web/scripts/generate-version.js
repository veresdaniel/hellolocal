// scripts/generate-version.js
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get version
const packageJsonPath = join(__dirname, "../package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
const version = packageJson.version || "0.1.0-beta";

// Generate build hash from current timestamp and random data
const buildHash = createHash("md5")
  .update(`${Date.now()}-${Math.random()}`)
  .digest("hex");

// Create version.json
const versionInfo = {
  version,
  buildHash,
  timestamp: Date.now(),
};

// Write to public directory
const publicDir = join(__dirname, "../public");
const versionJsonPath = join(publicDir, "version.json");
writeFileSync(versionJsonPath, JSON.stringify(versionInfo, null, 2), "utf-8");

console.log(`[Version Generator] Generated version.json: ${version} (${buildHash.substring(0, 7)})`);

/**
 * Point this repo at .githooks (local core.hooksPath only — not global).
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const hooksDir = path.join(root, ".githooks");
const preCommit = path.join(hooksDir, "pre-commit");

try {
  execSync("git rev-parse --is-inside-work-tree", { cwd: root, stdio: "ignore" });
} catch {
  process.exit(0);
}

if (!fs.existsSync(preCommit)) {
  console.warn("[install-git-hooks] missing .githooks/pre-commit");
  process.exit(0);
}

try {
  fs.chmodSync(preCommit, 0o755);
} catch {
  // Windows may ignore mode; hook can still run via bash.
}

try {
  execSync("git config core.hooksPath .githooks", { cwd: root, stdio: "ignore" });
  console.log("[install-git-hooks] core.hooksPath=.githooks");
} catch (err) {
  console.warn("[install-git-hooks] could not set core.hooksPath:", err.message || err);
}

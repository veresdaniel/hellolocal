/**
 * Bump apps/web (+ root) patch version on each commit, keeping any prerelease
 * suffix (e.g. 1.0.3-beta → 1.0.4-beta). Skip with SKIP_VERSION_BUMP=1.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function isGitRepo() {
  try {
    execSync("git rev-parse --is-inside-work-tree", { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function gitFileExists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function shouldSkip() {
  if (process.env.SKIP_VERSION_BUMP === "1") return "SKIP_VERSION_BUMP=1";
  if (!isGitRepo()) return "not a git repo";
  if (gitFileExists(path.join(".git", "MERGE_HEAD"))) return "merge in progress";
  if (gitFileExists(path.join(".git", "rebase-merge"))) return "rebase in progress";
  if (gitFileExists(path.join(".git", "rebase-apply"))) return "rebase in progress";
  if (process.env.GIT_REFLOG_ACTION && /rebase|cherry-pick|revert/i.test(process.env.GIT_REFLOG_ACTION)) {
    return process.env.GIT_REFLOG_ACTION;
  }
  return null;
}

function bumpPatch(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)(.*)$/);
  if (!match) return null;
  const major = match[1];
  const minor = match[2];
  const patch = Number(match[3]) + 1;
  const suffix = match[4] || "";
  if (!Number.isFinite(patch)) return null;
  return `${major}.${minor}.${patch}${suffix}`;
}

function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
}

function writeJson(rel, data) {
  fs.writeFileSync(path.join(root, rel), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function stage(rel) {
  execSync(`git add -- "${rel}"`, { cwd: root, stdio: "ignore" });
}

const skipReason = shouldSkip();
if (skipReason) {
  console.log(`[bump-version] skipped (${skipReason})`);
  process.exit(0);
}

const webRel = "apps/web/package.json";
const rootRel = "package.json";
const webPkg = readJson(webRel);
const next = bumpPatch(webPkg.version);
if (!next) {
  console.warn(`[bump-version] could not parse version: ${webPkg.version}`);
  process.exit(0);
}

if (webPkg.version === next) {
  process.exit(0);
}

const prev = webPkg.version;
webPkg.version = next;
writeJson(webRel, webPkg);
stage(webRel);

if (fs.existsSync(path.join(root, rootRel))) {
  const rootPkg = readJson(rootRel);
  rootPkg.version = next;
  writeJson(rootRel, rootPkg);
  stage(rootRel);
}

console.log(`[bump-version] ${prev} → ${next}`);

#!/usr/bin/env node
/**
 * Flatten apps/web locale JSON (non-admin) into apps/api/src/ui-copy/seed-catalogs.json
 * for API onModuleInit UiMessage seeding. Run after editing locales/{hu,en,de}/*.json.
 */
const fs = require("fs");
const path = require("path");

const LANGS = ["hu", "en", "de"];
const NAMESPACES = ["public", "common", "cookieConsent", "error", "offline", "validation", "underConstruction"];
const repoRoot = path.resolve(__dirname, "../..", "..");
const localesRoot = path.join(repoRoot, "apps/web/src/i18n/locales");
const outPath = path.join(repoRoot, "apps/api/src/ui-copy/seed-catalogs.json");

function flatten(source, prefix, out) {
  if (typeof source === "string") {
    if (prefix) out[prefix] = source;
    return;
  }
  if (!source || typeof source !== "object" || Array.isArray(source)) return;
  for (const [key, value] of Object.entries(source)) {
    flatten(value, prefix ? `${prefix}.${key}` : key, out);
  }
}

const catalogs = {};
let total = 0;
for (const lang of LANGS) {
  catalogs[lang] = {};
  for (const ns of NAMESPACES) {
    const file = path.join(localesRoot, lang, `${ns}.json`);
    if (!fs.existsSync(file)) {
      console.warn("missing", file);
      continue;
    }
    flatten(JSON.parse(fs.readFileSync(file, "utf8")), ns, catalogs[lang]);
  }
  total += Object.keys(catalogs[lang]).length;
}
fs.writeFileSync(outPath, JSON.stringify(catalogs));
console.log(`Wrote ${outPath} (${total} keys across ${LANGS.join(",")})`);

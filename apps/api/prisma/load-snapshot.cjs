/**
 * Load prisma/dev-seed/snapshot.json into the database named by DATABASE_URL.
 *
 * demo (default on localhost): superadmin, Hungary, Etyek–Budai, copy, translations.
 *   Allowed on 127.0.0.1 or a database named hellolocal_devel.
 * platform: superadmin, interface copy, translation keys, and the empty country shell.
 *   Allowed on the live database or a beta host. Never hellolocal_devel.
 *
 * Remote runs must set SEED_CONFIRM to the same value as SEED_PROFILE.
 * SEED_DATABASE swaps only the database name. SEED_ROLLBACK=1 undoes the load.
 */
const { randomBytes } = require("node:crypto");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { Client } = require("pg");

if (!process.env.DATABASE_URL) {
  require("dotenv").config();
}

const DATE_FIELDS = new Set([
  "createdAt",
  "updatedAt",
  "featuredUntil",
  "planValidUntil",
  "validUntil",
  "statusChangedAt",
  "belowFloorSince",
  "ladderEvaluatedAt",
  "startDate",
  "endDate",
  "resetTokenExpiresAt",
  "refreshTokenExpiresAt",
]);

const PLATFORM_SETTING_KEYS = new Set([
  "defaultLanguage",
  "underConstruction.copy",
  "underConstruction.enabled",
]);

const DEMO_LOAD = [
  ["Brand", "brand", true],
  ["Country", "country", true],
  ["CountryTranslation", "countryTranslations", false],
  ["CountryDomain", "countryDomains", false],
  ["User", "user", true],
  ["UiLanguage", "uiLanguages", false],
  ["UiMessage", "uiMessages", false],
  ["AppSetting", "appSettings", false],
  ["Site", "site", true],
  ["SiteTranslation", "siteTranslations", false],
  ["SiteKey", "siteKeys", false],
  ["SiteDomain", "siteDomains", false],
  ["SiteInstance", "siteInstances", false],
  ["SiteSubscription", "siteSubscription", true],
  ["Town", "towns", false],
  ["TownTranslation", "townTranslations", false],
  ["Category", "categories", false],
  ["CategoryTranslation", "categoryTranslations", false],
  ["Tag", "tags", false],
  ["TagTranslation", "tagTranslations", false],
  ["PriceBand", "priceBands", false],
  ["PriceBandTranslation", "priceBandTranslations", false],
  ["Place", "places", false],
  ["PlaceTranslation", "placeTranslations", false],
  ["PlaceOpeningHours", "openingHours", false],
  ["PlaceTag", "placeTags", false],
  ["PlacePriceList", "priceLists", false],
  ["Event", "events", false],
  ["EventTranslation", "eventTranslations", false],
  ["EventTag", "eventTags", false],
  ["EventCategory", "eventCategories", false],
  ["Gallery", "galleries", false],
  ["Slug", "slugs", false],
  ["LegalPage", "legalPages", false],
  ["LegalPageTranslation", "legalPageTranslations", false],
  ["StaticPage", "staticPages", false],
  ["StaticPageTranslation", "staticPageTranslations", false],
];

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

function targetUrl() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is missing");
  const url = new URL(raw);
  if (process.env.SEED_DATABASE) {
    url.pathname = `/${process.env.SEED_DATABASE}`;
  }
  return url;
}

function assertAllowed(profile, url) {
  const host = url.hostname;
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  const local = host === "127.0.0.1" || host === "localhost" || host === "::1";
  if (profile === "demo") {
    if (local || database === "hellolocal_devel") return database;
    throw new Error("Demo load is only allowed on localhost or hellolocal_devel.");
  }
  if (profile === "platform") {
    if (database === "hellolocal_devel") {
      throw new Error("Platform load must not target hellolocal_devel.");
    }
    const beta = host.includes("beta");
    const live = database === "hellolocal" && !local;
    const localOk = local && process.env.SEED_ALLOW_LOCAL === "1";
    if (live || beta || localOk) return database;
    throw new Error("Platform load is only allowed on the live database, beta, or an explicit local dry run.");
  }
  throw new Error("SEED_PROFILE must be demo or platform.");
}

function rowsOf(snapshot, key, single) {
  const value = snapshot[key];
  if (single) return value ? [value] : [];
  return Array.isArray(value) ? value : [];
}

function coerce(key, value, dataType) {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (DATE_FIELDS.has(key) && typeof value === "string") return new Date(value);
  if ((dataType === "json" || dataType === "jsonb") && typeof value !== "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "object" && !Array.isArray(value)) return JSON.stringify(value);
  return value;
}

async function columnMeta(client, table) {
  const result = await client.query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return new Map(result.rows.map((row) => [row.column_name, row.data_type]));
}

async function insertRows(client, table, rows) {
  if (!rows.length) return 0;
  const columns = await columnMeta(client, table);
  if (columns.size === 0) throw new Error(`Table ${table} does not exist`);
  let count = 0;
  for (const row of rows) {
    if (columns.has("id") && row.id == null) row.id = randomBytes(12).toString("hex");
    if (columns.has("createdAt") && row.createdAt == null) row.createdAt = new Date();
    if (columns.has("updatedAt") && row.updatedAt == null) row.updatedAt = new Date();
    const keys = Object.keys(row).filter((key) => columns.has(key));
    if (!keys.length) continue;
    const values = keys.map((key) => coerce(key, row[key], columns.get(key)));
    const sql = `INSERT INTO ${quoteIdent(table)} (${keys.map(quoteIdent).join(", ")}) VALUES (${keys
      .map((_, index) => `$${index + 1}`)
      .join(", ")})`;
    try {
      await client.query(sql, values);
    } catch (error) {
      const failure = new Error(`Load failed on ${table}`);
      failure.code = error.code;
      failure.constraint = error.constraint;
      failure.column = error.column;
      throw failure;
    }
    count += 1;
  }
  return count;
}

async function truncateApplicationData(client) {
  await client.query(`
    DO $$ DECLARE tables text;
    BEGIN
      SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
        INTO tables
      FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';
      IF tables IS NOT NULL THEN
        EXECUTE 'TRUNCATE TABLE ' || tables || ' RESTART IDENTITY CASCADE';
      END IF;
    END $$;
  `);
}

function quietUser(user) {
  return {
    ...user,
    activeSiteId: null,
    refreshToken: null,
    refreshTokenExpiresAt: null,
    resetToken: null,
    resetTokenExpiresAt: null,
  };
}

async function main() {
  const url = targetUrl();
  const local = ["127.0.0.1", "localhost", "::1"].includes(url.hostname);
  const profile = process.env.SEED_PROFILE || (local ? "demo" : "");
  if (!local && process.env.SEED_CONFIRM !== profile) {
    throw new Error("Remote load requires SEED_CONFIRM set to the same value as SEED_PROFILE.");
  }
  const database = assertAllowed(profile, url);
  const snapshot = JSON.parse(
    readFileSync(process.env.SNAPSHOT_PATH || join(__dirname, "dev-seed", "snapshot.json"), "utf8")
  );
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  const rollback = process.env.SEED_ROLLBACK === "1";
  try {
    await client.query("BEGIN");
    await truncateApplicationData(client);
    const user = quietUser(snapshot.user);
    if (profile === "platform") {
      const settings = (snapshot.appSettings || []).filter((row) => PLATFORM_SETTING_KEYS.has(row.key));
      await insertRows(client, "Brand", snapshot.brand ? [snapshot.brand] : []);
      await insertRows(client, "Country", snapshot.country ? [snapshot.country] : []);
      await insertRows(client, "CountryTranslation", snapshot.countryTranslations || []);
      await insertRows(client, "User", [user]);
      await insertRows(client, "UiLanguage", snapshot.uiLanguages || []);
      const messages = await insertRows(client, "UiMessage", snapshot.uiMessages || []);
      await insertRows(client, "AppSetting", settings);
      if (rollback) await client.query("ROLLBACK");
      else await client.query("COMMIT");
      console.log(
        `${rollback ? "Platform rolled back" : "Platform ready"}: ${user.email} · ${database} · ${messages} messages · ${settings.length} settings`
      );
      return;
    }

    let places = 0;
    let events = 0;
    for (const [table, key, single] of DEMO_LOAD) {
      const source = key === "user" ? [user] : rowsOf(snapshot, key, single);
      const count = await insertRows(client, table, source);
      if (table === "Place") places = count;
      if (table === "Event") events = count;
    }
    if (snapshot.site?.id) {
      await client.query(`UPDATE "User" SET "activeSiteId" = $1 WHERE id = $2`, [
        snapshot.site.id,
        user.id,
      ]);
    }
    if (rollback) await client.query("ROLLBACK");
    else await client.query("COMMIT");
    console.log(
      `${rollback ? "Demo rolled back" : "Demo ready"}: ${user.email} · ${snapshot.site?.slug || "no-region"} · ${database} · ${places} places · ${events} events`
    );
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* the failed statement already aborted the transaction */
    }
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  const detail = [error.message, error.code, error.constraint, error.column].filter(Boolean).join(" ");
  console.error(detail);
  process.exit(1);
});

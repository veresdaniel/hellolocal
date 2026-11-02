/**
 * Inserts the snapshot superadmin when the database has none.
 * Does not change an existing account or its password.
 * Used after `prisma migrate deploy` so an empty live database is not left without a login.
 */
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { Client } = require("pg");

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is missing");

  const snapshot = JSON.parse(
    readFileSync(join(__dirname, "dev-seed", "snapshot.json"), "utf8")
  );
  const user = snapshot.user;
  if (!user?.email || !user?.passwordHash || !user?.username || !user?.id) {
    throw new Error("Snapshot superadmin is incomplete");
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    const existing = await client.query(
      `SELECT id FROM "User" WHERE email = $1 OR role = 'superadmin'::"UserRole" LIMIT 1`,
      [user.email]
    );
    if (existing.rowCount) {
      console.log("Superadmin already present");
      return;
    }

    await client.query(
      `INSERT INTO "User"
        (id, username, email, "passwordHash", "firstName", "lastName", role, "isActive", "aiAssistantEnabled", "isTwoFactorEnabled", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7::"UserRole", true, $8, false, NOW(), NOW())`,
      [
        user.id,
        user.username,
        user.email,
        user.passwordHash,
        user.firstName,
        user.lastName,
        user.role,
        Boolean(user.aiAssistantEnabled),
      ]
    );
    console.log(`Superadmin ready: ${user.email}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

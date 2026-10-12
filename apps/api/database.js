const { Pool } = require("pg");
const { readFileSync } = require("node:fs");
const path = require("node:path");
function createPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error("DATABASE_URL is required");
  return new Pool({
    connectionString,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
  });
}
async function migrate(pool) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(482613)");
    for (const file of ["001_initial.sql", "002_followup.sql"]) {
      await client.query(
        readFileSync(path.join(__dirname, "../../database", file), "utf8"),
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
module.exports = { createPool, migrate };

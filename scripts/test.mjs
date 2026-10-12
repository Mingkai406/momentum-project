import { spawn } from "node:child_process";
import { rm } from "node:fs/promises";
import { startPostgres } from "./postgres.mjs";
const db = await startPostgres();
let code = 1;
try {
  const child = spawn(
    process.execPath,
    [
      "--test",
      "--test-concurrency=1",
      "tests/api/workflow.test.cjs",
      "tests/api/auth.test.cjs",
      "tests/api/followup.test.cjs",
    ],
    { env: { ...process.env, TEST_DATABASE_URL: db.url }, stdio: "inherit" },
  );
  code = await new Promise((resolve) => child.on("exit", resolve));
  if (code === 0) {
    const before = db.pg.getPgClient();
    await before.connect();
    const snapshot = (
      await before.query("SELECT id,title FROM goals ORDER BY id")
    ).rows;
    await before.end();
    await db.pg.stop();
    await db.pg.start();
    const after = db.pg.getPgClient();
    await after.connect();
    const restored = (
      await after.query("SELECT id,title FROM goals ORDER BY id")
    ).rows;
    await after.end();
    const { default: assert } = await import("node:assert/strict");
    assert.deepEqual(restored, snapshot);
    assert.ok(restored.length > 0);
    console.log("PASS: real PostgreSQL stop/start preserves saved goals");
  }
} finally {
  await db.pg.stop();
  await rm(db.root, { recursive: true, force: true });
}
process.exit(code || 0);

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { startPostgres } from "./postgres.mjs";
const db = await startPostgres({
  persistent: process.env.MOMENTUM_EPHEMERAL !== "true",
});
const apiPort = process.env.API_PORT || "3001";
const webPort = process.env.WEB_PORT || "3000";
const base = {
  ...process.env,
  NODE_ENV: "development",
  DATABASE_URL: db.url,
  AUTH_MODE: "demo",
  HOST: "127.0.0.1",
  DEMO_SECRET: randomBytes(32).toString("hex"),
  RUN_MIGRATIONS: "true",
  PORT: apiPort,
  WEB_ORIGIN: `http://127.0.0.1:${webPort}`,
};
const api = spawn(process.execPath, ["apps/api/server.js"], {
  env: base,
  stdio: "inherit",
});
const web = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "apps/web",
    "--hostname",
    "127.0.0.1",
    "--port",
    webPort,
  ],
  {
    env: { ...process.env, NEXT_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}` },
    stdio: "inherit",
  },
);
console.log(`Local fictional-account workspace: http://127.0.0.1:${webPort}`);
let stopping = false;
async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill("SIGTERM");
  web.kill("SIGTERM");
  await Promise.all(
    [api, web].map((child) =>
      child.exitCode !== null
        ? Promise.resolve()
        : new Promise((resolve) => child.once("exit", resolve)),
    ),
  );
  await db.pg.stop();
  if (process.env.MOMENTUM_EPHEMERAL === "true") {
    const { rm } = await import("node:fs/promises");
    await rm(db.root, { recursive: true, force: true });
  }
  process.exit(code);
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
api.on("exit", (code) => {
  if (!stopping) stop(code || 1);
});
web.on("exit", (code) => {
  if (!stopping) stop(code || 1);
});

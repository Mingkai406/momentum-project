import EmbeddedPostgres from "embedded-postgres";
import { mkdtemp, mkdir, access, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";
import net from "node:net";
export async function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}
export async function startPostgres({ persistent = false } = {}) {
  const root = persistent
    ? join(process.cwd(), ".local")
    : await mkdtemp(join(tmpdir(), "momentum-pg-"));
  await mkdir(root, { recursive: true });
  const credentialFile = join(root, "db-password");
  let password;
  try {
    password = await readFile(credentialFile, "utf8");
  } catch {
    password = randomBytes(24).toString("hex");
    await writeFile(credentialFile, password, { mode: 0o600 });
  }
  const port = await freePort();
  const databaseDir = join(root, "postgres");
  const logs = [];
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "momentum",
    password,
    port,
    persistent: true,
    authMethod: "scram-sha-256",
    postgresFlags: ["-h", "127.0.0.1", "-k", root],
    onLog: (message) => logs.push(String(message)),
    onError: (message) => logs.push(String(message)),
  });
  try {
    let initialized = true;
    try {
      await access(join(databaseDir, "PG_VERSION"));
    } catch {
      initialized = false;
    }
    if (!initialized) await pg.initialise();
    await pg.start();
  } catch (error) {
    console.error(logs.slice(-15).join("\n"));
    throw error;
  }
  return {
    pg,
    root,
    url: `postgresql://momentum:${password}@127.0.0.1:${port}/postgres`,
  };
}

// Test-only deterministic HTTP provider. Never imported by the application server.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
const token = randomBytes(32).toString("hex");
const server = createServer(async (req, res) => {
  if (req.headers.authorization !== `Bearer ${token}`) {
    res.writeHead(401).end();
    return;
  }
  let data = "";
  for await (const chunk of req) data += chunk;
  const { context } = JSON.parse(data);
  const ref = context.records.find((r) => r.kind === "goal").id;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      summary: [
        {
          text: "A goal is available for review (test fixture).",
          sources: [ref],
        },
      ],
      followups: [
        {
          text: "Discuss the next practical step (test fixture).",
          sources: [ref],
        },
      ],
      draft:
        "What is one small action you would like to take next? (test fixture)",
      usage: {
        input_tokens: null,
        output_tokens: null,
        model_calls: 0,
        tool_calls: 0,
        estimated_cost_usd: null,
        model: "browser-test-fixture",
      },
    }),
  );
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const dev = spawn(process.execPath, ["scripts/dev.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    FOLLOWUP_AGENT_URL: `http://127.0.0.1:${server.address().port}`,
    FOLLOWUP_AGENT_TOKEN: token,
  },
});
let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  dev.kill(signal);
  server.close();
}
process.on("SIGTERM", () => stop());
process.on("SIGINT", () => stop("SIGINT"));
dev.on("exit", (code) => {
  server.close();
  process.exit(code || 0);
});

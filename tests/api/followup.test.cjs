const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { createApp } = require("../../apps/api/app");
const { createAuth } = require("../../apps/api/auth");
const { createPool, migrate } = require("../../apps/api/database");
const { createFollowupProvider } = require("../../apps/api/followup-provider");
let pool,
  auth,
  app,
  goal,
  rel,
  providerCalls = 0,
  mode = "ok",
  unblock,
  release;
const logs = [];
const tokens = {};
const good = (context) => ({
  summary: [{ text: "Work is in progress.", sources: [context.records[0].id] }],
  followups: [],
  draft: "What would help you take the next step?",
  usage: {
    input_tokens: 20,
    output_tokens: 10,
    model_calls: 2,
    tool_calls: 3,
    model: "test-double",
    estimated_cost_usd: null,
  },
});
const fakeProvider = async ({ context }) => {
  providerCalls++;
  if (mode === "wait") {
    unblock();
    await new Promise((r) => {
      release = r;
    });
  }
  if (mode === "failure") throw new Error("secret provider error");
  if (mode === "invalid")
    return {
      ...good(context),
      summary: [{ text: "Invented", sources: ["goal:999999"] }],
    };
  if (mode === "hang") return new Promise(() => {});
  return good(context);
};
function freshApp(options = {}) {
  return createApp({
    pool,
    auth,
    followupProvider: fakeProvider,
    followupLogger: (row) => logs.push(row),
    ...options,
  });
}
const call = (account, method, path, body, instance = app) => {
  let r = request(instance)[method]("/api" + path);
  if (account) r = r.set("Authorization", `Bearer ${tokens[account]}`);
  return body === undefined ? r : r.send(body);
};
async function setup() {
  goal = (
    await call("student", "post", "/goals", {
      title: "Private student goal",
      description: "Do not log this private description",
    })
  ).body;
  rel = (
    await call("mentor", "post", "/relationships", {
      email: "student@example.test",
    })
  ).body;
  await call("student", "post", `/relationships/${rel.id}/accept`, {}).expect(
    200,
  );
  mode = "ok";
  app = freshApp();
}
const draft = async () =>
  (
    await call(
      "mentor",
      "post",
      `/goals/${goal.id}/followup/drafts`,
      {},
    ).expect(201)
  ).body;
const confirm = (d, body = d.draft, actor = "mentor") =>
  call(actor, "post", `/goals/${goal.id}/followup/drafts/${d.id}/confirm`, {
    body,
    confirmed: true,
  });
before(async () => {
  const bootstrap = createPool(process.env.TEST_DATABASE_URL);
  await bootstrap.query("CREATE SCHEMA followup_test");
  await bootstrap.end();
  const url = new URL(process.env.TEST_DATABASE_URL);
  url.searchParams.set("options", "-csearch_path=followup_test");
  pool = createPool(url.toString());
  await migrate(pool);
  await migrate(pool);
  auth = createAuth({
    AUTH_MODE: "demo",
    NODE_ENV: "test",
    DEMO_SECRET: "test-secret-at-least-thirty-two-characters",
  });
  app = freshApp();
  for (const a of ["student", "mentor", "otherMentor", "other"]) {
    tokens[a] = auth.issue(a);
    await call(a, "get", "/me");
  }
});
after(() => pool.end());
test("assistant requires signed-in accepted mentor; caller cannot supply context or identity", async () => {
  await setup();
  const url = `/goals/${goal.id}/followup/drafts`;
  const beforeCalls = providerCalls;
  await call(null, "post", url, {}).expect(401);
  await call("student", "post", url, {}).expect(403);
  await call("otherMentor", "post", url, {}).expect(404);
  await call("mentor", "post", url, { context: "forged" }).expect(400);
  assert.equal(providerCalls, beforeCalls);
  const d = await draft();
  assert.ok(!JSON.stringify(d.sources).includes("student@example.test"));
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int AS n FROM feedback WHERE goal_id=$1",
        [goal.id],
      )
    ).rows[0].n,
    0,
  );
  await call("otherMentor", "get", `${url}/${d.id}`).expect(404);
});
test("explicit confirmation required; edited text saved once under concurrent retries; restart recovery", async () => {
  await setup();
  const d = await draft();
  const url = `/goals/${goal.id}/followup/drafts/${d.id}/confirm`;
  await call("mentor", "post", url, { body: d.draft }).expect(400);
  await call("mentor", "post", url, { body: d.draft, confirmed: false }).expect(
    400,
  );
  const edit = "Reviewed: let's choose one small step for this week.";
  const results = await Promise.all(
    Array.from({ length: 6 }, () => confirm(d, edit)),
  );
  assert.ok(
    results.every((r) => [200, 201].includes(r.status)),
    JSON.stringify(results.map((r) => r.body)),
  );
  assert.equal(new Set(results.map((r) => r.body.id)).size, 1);
  await confirm(d, "Different text").expect(409);
  app = freshApp();
  const restored = (
    await call(
      "mentor",
      "get",
      `/goals/${goal.id}/followup/drafts/${d.id}`,
    ).expect(200)
  ).body;
  assert.equal(restored.confirmed_body, edit);
  assert.ok(restored.feedback_id);
  await confirm(d, edit).expect(200);
});
test("accepted second mentor cannot read or confirm another mentor's draft", async () => {
  await setup();
  const d = await draft();
  const r = (
    await call("otherMentor", "post", "/relationships", {
      email: "student@example.test",
    })
  ).body;
  await call("student", "post", `/relationships/${r.id}/accept`, {}).expect(
    200,
  );
  await call(
    "otherMentor",
    "get",
    `/goals/${goal.id}/followup/drafts/${d.id}`,
  ).expect(404);
  await confirm(d, d.draft, "otherMentor").expect(404);
});
test("stale drafts cannot overwrite new check-ins, plans, steps or feedback", async () => {
  await setup();
  for (const mutate of [
    () =>
      call("student", "put", `/goals/${goal.id}/grow`, {
        goal: "g",
        reality: "r",
        options: "o",
        will: "w",
      }),
    () =>
      call("student", "put", `/goals/${goal.id}/checkpoints`, {
        month: "2026-10",
        notes: "New progress",
      }),
    () =>
      call("student", "post", `/goals/${goal.id}/steps`, {
        description: "Next action",
      }),
  ]) {
    const d = await draft();
    await mutate();
    await confirm(d).expect(409);
  }
  const d = await draft();
  await call("mentor", "post", `/goals/${goal.id}/feedback`, {
    body: "Manual feedback",
    requestId: require("node:crypto").randomUUID(),
  }).expect(201);
  await confirm(d).expect(409);
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int AS n FROM feedback WHERE goal_id=$1",
        [goal.id],
      )
    ).rows[0].n,
    1,
  );
});
test("revoked mentor cannot retrieve, confirm or replay an existing draft", async () => {
  await setup();
  const d = await draft();
  await confirm(d).expect(201);
  await call("student", "delete", `/relationships/${rel.id}`).expect(204);
  await call(
    "mentor",
    "get",
    `/goals/${goal.id}/followup/drafts/${d.id}`,
  ).expect(404);
  await confirm(d).expect(404);
});
test("in-flight generation is rejected if relationship is revoked or context changes", async () => {
  for (const revoke of [true, false]) {
    await setup();
    mode = "wait";
    const entered = new Promise((r) => {
      unblock = r;
    });
    const running = call(
      "mentor",
      "post",
      `/goals/${goal.id}/followup/drafts`,
      {},
    ).then((r) => r);
    await entered;
    if (revoke)
      await call("student", "delete", `/relationships/${rel.id}`).expect(204);
    else
      await call("student", "post", `/goals/${goal.id}/steps`, {
        description: "Changed during model call",
      }).expect(201);
    release();
    assert.equal((await running).status, revoke ? 404 : 409);
  }
});
test("confirmation waits for an in-flight student write and sees its new revision", async () => {
  await setup();
  const d = await draft();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      "INSERT INTO steps(goal_id,description) VALUES($1,'Uncommitted change')",
      [goal.id],
    );
    const result = confirm(d).then((r) => r);
    await new Promise((r) => setTimeout(r, 40));
    await client.query("COMMIT");
    assert.equal((await result).status, 409);
  } finally {
    client.release();
  }
});
test("expired draft is rejected, but API and manual feedback stay usable on model failure", async () => {
  await setup();
  const d = await draft();
  await pool.query(
    "UPDATE followup_drafts SET expires_at=now()-interval '1 hour' WHERE id=$1",
    [d.id],
  );
  await confirm(d).expect(409);
  for (const m of ["invalid", "failure"]) {
    mode = m;
    await call(
      "mentor",
      "post",
      `/goals/${goal.id}/followup/drafts`,
      {},
    ).expect(502);
  }
  mode = "hang";
  app = freshApp({ followupTimeoutMs: 15 });
  await call("mentor", "post", `/goals/${goal.id}/followup/drafts`, {}).expect(
    504,
  );
  await call("mentor", "post", `/goals/${goal.id}/feedback`, {
    body: "Still works",
    requestId: require("node:crypto").randomUUID(),
  }).expect(201);
});
test("configuration fails closed and structured logs do not contain student text", async () => {
  await setup();
  const disabled = freshApp({ followupProvider: null });
  assert.equal(
    (
      await call(
        "mentor",
        "get",
        `/goals/${goal.id}/followup/config`,
        undefined,
        disabled,
      )
    ).body.enabled,
    false,
  );
  await call(
    "mentor",
    "post",
    `/goals/${goal.id}/followup/drafts`,
    {},
    disabled,
  ).expect(503);
  assert.equal(createFollowupProvider({}), null);
  assert.throws(() =>
    createFollowupProvider({
      FOLLOWUP_AGENT_URL: "http://example.com",
      FOLLOWUP_AGENT_TOKEN: "x".repeat(40),
    }),
  );
  assert.throws(() =>
    createFollowupProvider({ FOLLOWUP_AGENT_URL: "https://example.com" }),
  );
  const serialized = JSON.stringify(logs);
  for (const secret of [
    "Private student",
    "private description",
    "secret provider",
    "Reviewed:",
    "Bearer",
  ])
    assert.ok(!serialized.includes(secret));
  assert.ok(logs.some((r) => r.event === "followup.confirmed"));
  assert.ok(logs.every((r) => /^[a-f0-9]{32}$/.test(r.trace_id)));
});

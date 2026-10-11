const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { randomUUID } = require("node:crypto");
const { createApp } = require("../../apps/api/app");
const { createAuth } = require("../../apps/api/auth");
const { createPool, migrate } = require("../../apps/api/database");
let pool, auth, app, goal, otherGoal, relationship, step;
const tokens = {};
const call = (account, method, path, body) => {
  let r = request(app)[method]("/api" + path);
  if (account) r = r.set("Authorization", `Bearer ${tokens[account]}`);
  return body === undefined ? r : r.send(body);
};
before(async () => {
  pool = createPool(process.env.TEST_DATABASE_URL);
  await migrate(pool);
  await migrate(pool);
  auth = createAuth({
    AUTH_MODE: "demo",
    NODE_ENV: "test",
    DEMO_SECRET: "test-secret-at-least-thirty-two-characters",
  });
  app = createApp({ pool, auth });
  for (const account of ["student", "mentor", "other", "otherMentor"]) {
    tokens[account] = auth.issue(account);
    await call(account, "get", "/me").expect(200);
  }
});
after(() => pool.end());
test("all business endpoints require authentication; forged credentials rejected", async () => {
  await call(null, "get", "/goals").expect(401);
  await call(null, "post", "/goals", { title: "Hidden" }).expect(401);
  await request(app)
    .get("/api/me")
    .set("Authorization", "Bearer forged")
    .expect(401);
  await request(app).get("/health").expect(200);
});
test("server owns identities and roles; legacy insecure endpoints are gone", async () => {
  await call("student", "post", "/goals", {
    title: "x",
    owner_id: "demo-other",
  }).expect(400);
  await call("student", "post", "/relationships", {
    email: "other@example.test",
  }).expect(403);
  await call("student", "post", "/users/role", { role: "mentor" }).expect(404);
  await call("mentor", "post", "/goals", { title: "x" }).expect(403);
  await call("student", "post", "/goals", { title: "  " }).expect(400);
  goal = (
    await call("student", "post", "/goals", {
      title: "Prepare for interviews",
      description: "Practice with feedback",
    }).expect(201)
  ).body;
  otherGoal = (
    await call("other", "post", "/goals", { title: "Private goal" }).expect(201)
  ).body;
  assert.equal(goal.owner_id, "demo-student");
});
test("strangers and mentors cannot read a goal before acceptance", async () => {
  for (const actor of ["other", "mentor", "otherMentor"])
    await call(actor, "get", `/goals/${goal.id}`).expect(404);
  const list = (await call("other", "get", "/goals").expect(200)).body;
  assert.equal(list.length, 1);
  assert.equal(list[0].id, otherGoal.id);
  relationship = (
    await call("mentor", "post", "/relationships", {
      email: "STUDENT@example.test",
    }).expect(201)
  ).body;
  await call("mentor", "get", `/goals/${goal.id}`).expect(404);
  await call(
    "other",
    "post",
    `/relationships/${relationship.id}/accept`,
    {},
  ).expect(404);
  await call(
    "mentor",
    "post",
    `/relationships/${relationship.id}/accept`,
    {},
  ).expect(403);
});
test("invitation and acceptance retries do not create duplicate relationships", async () => {
  const duplicates = await Promise.all(
    Array.from({ length: 4 }, () =>
      call("mentor", "post", "/relationships", {
        email: "student@example.test",
      }).expect(201),
    ),
  );
  assert.ok(duplicates.every((r) => r.body.id === relationship.id));
  await call(
    "student",
    "post",
    `/relationships/${relationship.id}/accept`,
    {},
  ).expect(200);
  await call(
    "student",
    "post",
    `/relationships/${relationship.id}/accept`,
    {},
  ).expect(200);
  await call("mentor", "get", `/goals/${goal.id}`).expect(200);
  assert.equal((await call("mentor", "get", "/goals")).body.length, 1);
  await call("otherMentor", "get", `/goals/${goal.id}`).expect(404);
});
test("student writes GROW, steps and monthly notes; mentor is read-only", async () => {
  const grow = {
    goal: "Get ready",
    reality: "Beginning",
    options: "Pair practice",
    will: "Two sessions",
  };
  await call("student", "put", `/goals/${goal.id}/grow`, grow).expect(200);
  step = (
    await call("student", "post", `/goals/${goal.id}/steps`, {
      description: "Practice an API question",
    }).expect(201)
  ).body;
  await call("student", "patch", `/goals/${goal.id}/steps/${step.id}`, {
    completed: true,
  }).expect(200);
  await call("student", "put", `/goals/${goal.id}/checkpoints`, {
    month: "2026-10",
    notes: "First practice complete",
  }).expect(200);
  await call("student", "put", `/goals/${goal.id}/checkpoints`, {
    month: "2026-10",
    notes: "Two sessions complete",
  }).expect(200);
  for (const actor of ["mentor", "other", "otherMentor"]) {
    await call(actor, "put", `/goals/${goal.id}/grow`, grow).expect(404);
    await call(actor, "post", `/goals/${goal.id}/steps`, {
      description: "overwrite",
    }).expect(404);
    await call(actor, "patch", `/goals/${goal.id}/steps/${step.id}`, {
      completed: false,
    }).expect(404);
    await call(actor, "put", `/goals/${goal.id}/checkpoints`, {
      month: "2026-10",
      notes: "overwrite",
    }).expect(404);
  }
  await call("other", "patch", `/goals/${otherGoal.id}/steps/${step.id}`, {
    completed: false,
  }).expect(404);
  const details = (await call("mentor", "get", `/goals/${goal.id}`).expect(200))
    .body;
  assert.equal(details.grow.will, grow.will);
  assert.equal(details.steps[0].completed, true);
  assert.equal(details.checkpoints.length, 1);
  assert.equal(details.checkpoints[0].notes, "Two sessions complete");
});
test("validation rejects bad IDs, boolean coercion and invalid months without changing data", async () => {
  await call("student", "get", "/goals/not-an-id").expect(400);
  await call("student", "get", "/goals/9999999999999999999999").expect(400);
  await call("student", "patch", `/goals/${goal.id}/steps/${step.id}`, {
    completed: "false",
  }).expect(400);
  await call("student", "put", `/goals/${goal.id}/checkpoints`, {
    month: "2026-99",
    notes: "bad",
  }).expect(400);
  await call("student", "put", `/goals/${goal.id}/grow`, {
    goal: "partial",
  }).expect(400);
});
test("only accepted mentor can post feedback; concurrent retries insert once", async () => {
  const data = {
    body: "Try explaining your tradeoffs out loud.",
    requestId: randomUUID(),
  };
  await call("student", "post", `/goals/${goal.id}/feedback`, data).expect(403);
  await call("otherMentor", "post", `/goals/${goal.id}/feedback`, data).expect(
    404,
  );
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      call("mentor", "post", `/goals/${goal.id}/feedback`, data),
    ),
  );
  assert.ok(results.every((r) => [200, 201].includes(r.status)));
  assert.equal(new Set(results.map((r) => r.body.id)).size, 1);
  await call("mentor", "post", `/goals/${goal.id}/feedback`, {
    ...data,
    body: "Changed payload",
  }).expect(409);
  await call("mentor", "post", `/goals/${goal.id}/feedback`, {
    ...data,
    mentor_id: "forged",
  }).expect(400);
  assert.equal(
    (await call("student", "get", `/goals/${goal.id}`)).body.feedback.length,
    1,
  );
});
test("data survives a fresh API instance and database connection pool", async () => {
  await pool.end();
  pool = createPool(process.env.TEST_DATABASE_URL);
  app = createApp({ pool, auth });
  await migrate(pool);
  const details = (
    await call("student", "get", `/goals/${goal.id}`).expect(200)
  ).body;
  assert.equal(details.steps[0].completed, true);
  assert.equal(details.feedback.length, 1);
  assert.equal(details.grow.goal, "Get ready");
});
test("revocation removes mentor read/write access immediately; student retains feedback", async () => {
  await call("other", "delete", `/relationships/${relationship.id}`).expect(
    404,
  );
  await call("student", "delete", `/relationships/${relationship.id}`).expect(
    204,
  );
  await call("mentor", "get", `/goals/${goal.id}`).expect(404);
  await call("mentor", "post", `/goals/${goal.id}/feedback`, {
    body: "after revoke",
    requestId: randomUUID(),
  }).expect(404);
  assert.equal((await call("mentor", "get", "/goals")).body.length, 0);
  assert.equal(
    (await call("student", "get", `/goals/${goal.id}`)).body.feedback.length,
    1,
  );
});

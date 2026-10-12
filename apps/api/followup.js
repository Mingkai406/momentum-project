const { randomUUID, randomBytes } = require("node:crypto");
const { z } = require("zod");
const { rateLimit } = require("express-rate-limit");
const { validateResult } = require("./followup-provider");
const fail = (status, message) => Object.assign(new Error(message), { status });
const numberId = z.coerce.number().int().positive().max(2147483647);
async function transaction(pool, fn, isolation = "") {
  const client = await pool.connect();
  try {
    await client.query(`BEGIN ${isolation}`);
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
async function access(db, mentorId, goalId, lock = false) {
  // Order is always goal, then relationship, then draft.
  const { rows } = await db.query(
    `SELECT * FROM goals WHERE id=$1 ${lock ? "FOR UPDATE" : ""}`,
    [goalId],
  );
  if (!rows.length) throw fail(404, "Goal not found");
  const rel = await db.query(
    `SELECT id FROM relationships WHERE mentor_id=$1 AND student_id=$2 AND status='accepted' ${lock ? "FOR SHARE" : ""}`,
    [mentorId, rows[0].owner_id],
  );
  if (!rel.rows.length) throw fail(404, "Goal not found");
  return rows[0];
}
async function snapshot(pool, mentorId, goalId) {
  return transaction(
    pool,
    async (db) => {
      const goal = await access(db, mentorId, goalId);
      const grow = await db.query(
        "SELECT goal,reality,options,will FROM grow WHERE goal_id=$1",
        [goalId],
      );
      const steps = await db.query(
        "SELECT id,description,completed FROM steps WHERE goal_id=$1 ORDER BY id LIMIT 101",
        [goalId],
      );
      const checkpoints = await db.query(
        "SELECT id,month,notes FROM checkpoints WHERE goal_id=$1 ORDER BY month DESC LIMIT 25",
        [goalId],
      );
      const feedback = await db.query(
        "SELECT id,body FROM feedback WHERE goal_id=$1 ORDER BY id DESC LIMIT 21",
        [goalId],
      );
      const records = [
        {
          id: `goal:${goalId}`,
          kind: "goal",
          text: `${goal.title}\n${goal.description}`,
        },
      ];
      for (const [key, value] of Object.entries(grow.rows[0] || {}))
        if (value)
          records.push({ id: `grow:${key}`, kind: "plan", text: value });
      for (const row of steps.rows.slice(0, 100))
        records.push({
          id: `step:${row.id}`,
          kind: "step",
          text: row.description,
          completed: row.completed,
        });
      for (const row of checkpoints.rows.slice(0, 24))
        records.push({
          id: `checkin:${row.id}`,
          kind: "checkin",
          text: `${row.month}: ${row.notes}`,
        });
      for (const row of feedback.rows.slice(0, 20))
        records.push({
          id: `feedback:${row.id}`,
          kind: "feedback",
          text: row.body,
        });
      if (Buffer.byteLength(JSON.stringify(records)) > 80000)
        throw fail(
          422,
          "This goal has too much context for the assistant. Please write feedback manually.",
        );
      return {
        revision: goal.revision,
        context: {
          records,
          stats: {
            total_steps: steps.rows.slice(0, 100).length,
            completed_steps: steps.rows.slice(0, 100).filter((s) => s.completed)
              .length,
          },
          truncated:
            steps.rows.length > 100 ||
            checkpoints.rows.length > 24 ||
            feedback.rows.length > 20,
        },
      };
    },
    "ISOLATION LEVEL REPEATABLE READ",
  );
}
function registerFollowup(
  app,
  {
    pool,
    provider,
    logger = (row) => console.info(JSON.stringify(row)),
    timeoutMs = 45000,
  },
) {
  const active = new Set();
  const limit = rateLimit({
    windowMs: 60_000,
    limit: 6,
    keyGenerator: (req) => req.user.id,
  });
  const mentor = (req, res, next) => {
    if (req.user.role !== "mentor") throw fail(403, "Mentor access required");
    next();
  };
  const log = (event, traceId, extra = {}) =>
    logger({ event, trace_id: traceId, ...extra });
  const path = "/api/goals/:id/followup";
  app.get(`${path}/config`, mentor, async (req, res) => {
    await access(pool, req.user.id, numberId.parse(req.params.id));
    res.json({ enabled: Boolean(provider) });
  });
  app.post(`${path}/drafts`, mentor, limit, async (req, res) => {
    z.object({}).strict().parse(req.body);
    const goalId = numberId.parse(req.params.id);
    const data = await snapshot(pool, req.user.id, goalId);
    if (!provider)
      throw fail(
        503,
        "Follow-up assistant is not configured. You can still write feedback below.",
      );
    if (active.has(req.user.id) || active.size >= 8)
      throw fail(429, "Assistant is busy. Please retry shortly.");
    const traceId = randomBytes(16).toString("hex");
    res.set("X-Trace-Id", traceId);
    active.add(req.user.id);
    const controller = new AbortController();
    const started = Date.now();
    let timer;
    log("followup.started", traceId);
    try {
      const raw = await Promise.race([
        provider({ context: data.context, traceId, signal: controller.signal }),
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(
              fail(
                504,
                "Assistant timed out. Please retry or write feedback manually.",
              ),
            );
          }, timeoutMs);
        }),
      ]);
      let result;
      try {
        result = validateResult(raw, data.context);
      } catch {
        throw fail(
          502,
          "Assistant returned an invalid draft. Please retry or write feedback manually.",
        );
      }
      const draft = await transaction(pool, async (db) => {
        const goal = await access(db, req.user.id, goalId, true);
        if (goal.revision !== data.revision)
          throw fail(
            409,
            "Goal changed while preparing the draft. Generate a new draft.",
          );
        const { rows } = await db.query(
          `INSERT INTO followup_drafts(id,goal_id,mentor_id,source_revision,result,trace_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,expires_at`,
          [
            randomUUID(),
            goalId,
            req.user.id,
            data.revision,
            {
              ...result,
              sources: data.context.records,
              truncated: data.context.truncated,
            },
            traceId,
          ],
        );
        return rows[0];
      });
      log("followup.ready", traceId, {
        duration_ms: Date.now() - started,
        ...result.usage,
      });
      res.status(201).json({
        ...draft,
        ...result,
        sources: data.context.records,
        truncated: data.context.truncated,
        trace_id: traceId,
      });
    } catch (error) {
      log("followup.failed", traceId, {
        duration_ms: Date.now() - started,
        status: error.status || 502,
      });
      if (!error.status)
        throw fail(
          502,
          "Assistant unavailable. Please retry or write feedback manually.",
        );
      throw error;
    } finally {
      clearTimeout(timer);
      controller.abort();
      active.delete(req.user.id);
    }
  });
  app.get(`${path}/drafts/:draftId`, mentor, async (req, res) => {
    const goalId = numberId.parse(req.params.id);
    await access(pool, req.user.id, goalId);
    const { rows } = await pool.query(
      "SELECT * FROM followup_drafts WHERE id=$1 AND goal_id=$2 AND mentor_id=$3",
      [z.uuid().parse(req.params.draftId), goalId, req.user.id],
    );
    if (!rows.length) throw fail(404, "Draft not found");
    const d = rows[0];
    res.json({
      ...d.result,
      id: d.id,
      trace_id: d.trace_id,
      expires_at: d.expires_at,
      feedback_id: d.feedback_id,
      confirmed_body: d.confirmed_body,
    });
  });
  app.post(`${path}/drafts/:draftId/confirm`, mentor, async (req, res) => {
    const goalId = numberId.parse(req.params.id);
    const draftId = z.uuid().parse(req.params.draftId);
    const data = z
      .object({
        body: z.string().trim().min(1).max(4000),
        confirmed: z.literal(true),
      })
      .strict()
      .parse(req.body);
    const output = await transaction(pool, async (db) => {
      const goal = await access(db, req.user.id, goalId, true);
      const { rows } = await db.query(
        "SELECT * FROM followup_drafts WHERE id=$1 AND goal_id=$2 AND mentor_id=$3 FOR UPDATE",
        [draftId, goalId, req.user.id],
      );
      if (!rows.length) throw fail(404, "Draft not found");
      const draft = rows[0];
      if (draft.feedback_id) {
        if (draft.confirmed_body !== data.body)
          throw fail(409, "This draft was already shared with different text.");
        return {
          feedback: (
            await db.query("SELECT * FROM feedback WHERE id=$1", [
              draft.feedback_id,
            ])
          ).rows[0],
          traceId: draft.trace_id,
          replay: true,
        };
      }
      if (new Date(draft.expires_at) <= new Date())
        throw fail(409, "Draft expired. Generate a new draft.");
      if (goal.revision !== draft.source_revision)
        throw fail(
          409,
          "Goal changed since this draft. Review the latest records and generate a new draft.",
        );
      // A server-generated request ID cannot be selected by the model or caller.
      const feedback = (
        await db.query(
          "INSERT INTO feedback(goal_id,mentor_id,body,request_id) VALUES($1,$2,$3,$4) RETURNING *",
          [goalId, req.user.id, data.body, randomUUID()],
        )
      ).rows[0];
      await db.query(
        "UPDATE followup_drafts SET feedback_id=$1,confirmed_body=$2,confirmed_at=now() WHERE id=$3",
        [feedback.id, data.body, draftId],
      );
      return { feedback, traceId: draft.trace_id, replay: false };
    });
    log("followup.confirmed", output.traceId, { replay: output.replay });
    res.status(output.replay ? 200 : 201).json(output.feedback);
  });
}
module.exports = { registerFollowup };

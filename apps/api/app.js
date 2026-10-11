const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { z } = require("zod");
const { randomUUID } = require("node:crypto");
const text = (max) => z.string().trim().min(1).max(max);
const id = z.coerce.number().int().positive().max(2147483647);
const email = z
  .email()
  .max(254)
  .transform((s) => s.toLowerCase());
const fail = (status, message) => Object.assign(new Error(message), { status });
function createApp({ pool, auth, origin = "http://localhost:3000" }) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Authorization", "Content-Type"],
    }),
  );
  app.use(express.json({ limit: "32kb" }));
  app.use((req, res, next) => {
    res.set("Cache-Control", "no-store");
    res.set("X-Request-Id", randomUUID());
    next();
  });
  app.get("/health", async (req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok" });
    } catch {
      res.status(503).json({ error: "Database unavailable" });
    }
  });
  app.get("/api/config", (req, res) => res.json({ authMode: auth.mode }));
  const authLimit = rateLimit({ windowMs: 60_000, limit: 60 });
  app.post("/api/demo/login", authLimit, (req, res) => {
    if (auth.mode !== "demo") throw fail(404, "Not found");
    const { account } = z
      .object({
        account: z.enum(["student", "mentor", "other", "otherMentor"]),
      })
      .strict()
      .parse(req.body);
    res.json({ token: auth.issue(account) });
  });
  app.use("/api", async (req, res, next) => {
    const token = req.headers.authorization?.match(/^Bearer (\S+)$/)?.[1];
    if (!token) throw fail(401, "Sign in required");
    let identity;
    try {
      identity = await auth.verify(token);
    } catch {
      throw fail(401, "Invalid or expired session");
    }
    // Identity and role come exclusively from verified credentials, never request fields.
    const { rows } = await pool.query(
      `INSERT INTO users(id,email,role) VALUES($1,$2,$3)
      ON CONFLICT(id) DO UPDATE SET email=EXCLUDED.email,role=EXCLUDED.role RETURNING *`,
      [identity.sub, identity.email.toLowerCase(), identity.role],
    );
    req.user = rows[0];
    next();
  });
  const mutations = rateLimit({
    windowMs: 60_000,
    limit: 120,
    skip: (req) => req.method === "GET",
  });
  app.use("/api", mutations);
  function role(req, expected) {
    if (req.user.role !== expected)
      throw fail(403, `${expected} access required`);
  }
  async function goalAccess(req, goalId, write = false) {
    const { rows } = await pool.query(
      `SELECT g.* FROM goals g WHERE g.id=$1 AND
      (g.owner_id=$2 OR ($3::boolean AND EXISTS(SELECT 1 FROM relationships r
       WHERE r.mentor_id=$2 AND r.student_id=g.owner_id AND r.status='accepted')))`,
      [id.parse(goalId), req.user.id, !write && req.user.role === "mentor"],
    );
    if (!rows.length) throw fail(404, "Goal not found");
    if (write) role(req, "student");
    return rows[0];
  }
  app.get("/api/me", (req, res) => res.json(req.user));
  app.get("/api/relationships", async (req, res) => {
    const { rows } = await pool.query(
      `SELECT r.*,u.email AS mentor_email FROM relationships r JOIN users u ON u.id=r.mentor_id
      WHERE r.mentor_id=$1 OR r.student_email=$2 ORDER BY r.id DESC`,
      [req.user.id, req.user.email],
    );
    res.json(rows);
  });
  app.post("/api/relationships", async (req, res) => {
    role(req, "mentor");
    const data = z.object({ email }).strict().parse(req.body);
    if (data.email === req.user.email)
      throw fail(400, "Cannot invite yourself");
    const { rows } = await pool.query(
      `INSERT INTO relationships(mentor_id,student_email) VALUES($1,$2)
      ON CONFLICT(mentor_id,student_email) DO UPDATE SET student_email=EXCLUDED.student_email RETURNING *`,
      [req.user.id, data.email],
    );
    res.status(201).json(rows[0]);
  });
  app.post("/api/relationships/:id/accept", async (req, res) => {
    role(req, "student");
    const { rows } = await pool.query(
      `UPDATE relationships SET student_id=$1,status='accepted'
      WHERE id=$2 AND student_email=$3 RETURNING *`,
      [req.user.id, id.parse(req.params.id), req.user.email],
    );
    if (!rows.length) throw fail(404, "Invitation not found");
    res.json(rows[0]);
  });
  app.delete("/api/relationships/:id", async (req, res) => {
    const result = await pool.query(
      `DELETE FROM relationships WHERE id=$1 AND (mentor_id=$2 OR student_email=$3) RETURNING id`,
      [id.parse(req.params.id), req.user.id, req.user.email],
    );
    if (!result.rowCount) throw fail(404, "Relationship not found");
    res.status(204).end();
  });
  app.get("/api/goals", async (req, res) => {
    const { rows } = await pool.query(
      `SELECT g.*,u.email AS owner_email,
      (SELECT count(*)::integer FROM steps WHERE goal_id=g.id) AS total_steps,
      (SELECT count(*)::integer FROM steps WHERE goal_id=g.id AND completed) AS completed_steps
      FROM goals g JOIN users u ON u.id=g.owner_id WHERE g.owner_id=$1 OR
      ($2::boolean AND EXISTS(SELECT 1 FROM relationships r WHERE r.mentor_id=$1 AND r.student_id=g.owner_id AND r.status='accepted'))
      ORDER BY g.id DESC LIMIT 200`,
      [req.user.id, req.user.role === "mentor"],
    );
    res.json(rows);
  });
  app.post("/api/goals", async (req, res) => {
    role(req, "student");
    const data = z
      .object({
        title: text(180),
        description: z.string().trim().max(4000).default(""),
      })
      .strict()
      .parse(req.body);
    const { rows } = await pool.query(
      "INSERT INTO goals(owner_id,title,description) VALUES($1,$2,$3) RETURNING *",
      [req.user.id, data.title, data.description],
    );
    res.status(201).json(rows[0]);
  });
  app.get("/api/goals/:id", async (req, res) => {
    const goal = await goalAccess(req, req.params.id);
    const [grow, steps, checkpoints, feedback] = await Promise.all([
      pool.query("SELECT * FROM grow WHERE goal_id=$1", [goal.id]),
      pool.query("SELECT * FROM steps WHERE goal_id=$1 ORDER BY id", [goal.id]),
      pool.query(
        "SELECT * FROM checkpoints WHERE goal_id=$1 ORDER BY month DESC",
        [goal.id],
      ),
      pool.query(
        "SELECT f.*,u.email AS mentor_email FROM feedback f JOIN users u ON u.id=f.mentor_id WHERE goal_id=$1 ORDER BY f.id DESC",
        [goal.id],
      ),
    ]);
    res.json({
      ...goal,
      grow: grow.rows[0] || { goal: "", reality: "", options: "", will: "" },
      steps: steps.rows,
      checkpoints: checkpoints.rows,
      feedback: feedback.rows,
    });
  });
  app.put("/api/goals/:id/grow", async (req, res) => {
    const goal = await goalAccess(req, req.params.id, true);
    const field = z.string().trim().max(4000);
    const data = z
      .object({ goal: field, reality: field, options: field, will: field })
      .strict()
      .parse(req.body);
    const { rows } = await pool.query(
      `INSERT INTO grow(goal_id,goal,reality,options,will) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(goal_id) DO UPDATE SET goal=EXCLUDED.goal,reality=EXCLUDED.reality,options=EXCLUDED.options,will=EXCLUDED.will RETURNING *`,
      [goal.id, data.goal, data.reality, data.options, data.will],
    );
    res.json(rows[0]);
  });
  app.post("/api/goals/:id/steps", async (req, res) => {
    const goal = await goalAccess(req, req.params.id, true);
    const data = z
      .object({ description: text(500) })
      .strict()
      .parse(req.body);
    const { rows } = await pool.query(
      "INSERT INTO steps(goal_id,description) VALUES($1,$2) RETURNING *",
      [goal.id, data.description],
    );
    res.status(201).json(rows[0]);
  });
  app.patch("/api/goals/:id/steps/:stepId", async (req, res) => {
    const goal = await goalAccess(req, req.params.id, true);
    const data = z.object({ completed: z.boolean() }).strict().parse(req.body);
    const { rows } = await pool.query(
      "UPDATE steps SET completed=$1 WHERE id=$2 AND goal_id=$3 RETURNING *",
      [data.completed, id.parse(req.params.stepId), goal.id],
    );
    if (!rows.length) throw fail(404, "Step not found");
    res.json(rows[0]);
  });
  app.put("/api/goals/:id/checkpoints", async (req, res) => {
    const goal = await goalAccess(req, req.params.id, true);
    const data = z
      .object({
        month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
        notes: text(4000),
      })
      .strict()
      .parse(req.body);
    const { rows } = await pool.query(
      `INSERT INTO checkpoints(goal_id,month,notes) VALUES($1,$2,$3)
      ON CONFLICT(goal_id,month) DO UPDATE SET notes=EXCLUDED.notes,updated_at=now() RETURNING *`,
      [goal.id, data.month, data.notes],
    );
    res.json(rows[0]);
  });
  app.post("/api/goals/:id/feedback", async (req, res) => {
    role(req, "mentor");
    const goal = await goalAccess(req, req.params.id);
    const data = z
      .object({ body: text(4000), requestId: z.uuid() })
      .strict()
      .parse(req.body);
    // Recheck authorization in the write itself; never accept a caller-supplied mentor ID.
    const { rows } = await pool.query(
      `INSERT INTO feedback(goal_id,mentor_id,body,request_id)
      SELECT $1,$2,$3,$4 WHERE EXISTS(SELECT 1 FROM relationships r WHERE r.mentor_id=$2 AND r.student_id=$5 AND r.status='accepted')
      ON CONFLICT(mentor_id,request_id) DO NOTHING RETURNING *`,
      [goal.id, req.user.id, data.body, data.requestId, goal.owner_id],
    );
    if (rows.length) return res.status(201).json(rows[0]);
    const previous = await pool.query(
      "SELECT * FROM feedback WHERE mentor_id=$1 AND request_id=$2",
      [req.user.id, data.requestId],
    );
    if (!previous.rows.length) throw fail(404, "Goal not found");
    if (
      previous.rows[0].goal_id !== goal.id ||
      previous.rows[0].body !== data.body
    )
      throw fail(409, "Request ID already used for different feedback");
    res.json(previous.rows[0]);
  });
  app.use((req, res) => res.status(404).json({ error: "Not found" }));
  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError)
      return res.status(400).json({
        error: "Invalid input",
        fields: err.issues.map((i) => i.path.join(".")),
      });
    if (err.type === "entity.too.large")
      return res.status(413).json({ error: "Request too large" });
    if (err.type === "entity.parse.failed")
      return res.status(400).json({ error: "Invalid JSON" });
    if (err.code === "23505")
      return res
        .status(409)
        .json({ error: "Account or record already exists" });
    const status = err.status || 500;
    if (status === 500)
      console.error(
        "Request failed",
        res.get("X-Request-Id"),
        err.code || err.name,
      );
    res.status(status).json({
      error:
        status === 500 ? "Something went wrong. Please retry." : err.message,
    });
  });
  return app;
}
module.exports = { createApp };

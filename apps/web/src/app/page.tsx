"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, json, User, Goal, Relationship } from "@/lib/api";
import { Shell, Notice } from "@/components/Shell";
export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [relations, setRelations] = useState<Relationship[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  async function load() {
    const [u, g, r] = await Promise.all([
      api<User>("/me"),
      api<Goal[]>("/goals"),
      api<Relationship[]>("/relationships"),
    ]);
    setUser(u);
    setGoals(g);
    setRelations(r);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function act(action: () => Promise<unknown>, success: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
      await load();
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const mentor = user?.role === "mentor";
  return (
    <Shell user={user}>
      <div className="eyebrow">
        {mentor ? "MENTOR WORKSPACE" : "YOUR WORKSPACE"}
      </div>
      <h1>{mentor ? "Progress, together." : "What’s your next step?"}</h1>
      <p className="intro">
        {mentor
          ? "A place to listen, guide and keep the next step in view."
          : "Give your goals a little structure. Make room for progress."}
      </p>
      <Notice error={error} message={message} />
      {!user ? (
        <p>Loading your workspace…</p>
      ) : (
        <div className="workspace">
          <section>
            <div className="section-head">
              <h2>{mentor ? "Student goals" : "Your goals"}</h2>
              <span className="count">{goals.length}</span>
            </div>
            {!goals.length && (
              <div className="empty">
                {mentor
                  ? "Goals appear here after a student accepts your invitation."
                  : "Start with one goal. You can break it into smaller steps as you go."}
              </div>
            )}
            <div className="goal-list">
              {goals.map((g) => (
                <Link key={g.id} className="goal-card" href={`/goals/${g.id}`}>
                  <div className="eyebrow">
                    {mentor ? g.owner_email : "PERSONAL GOAL"}
                  </div>
                  <h3>
                    {g.title}
                    <span aria-hidden>↗</span>
                  </h3>
                  <p>
                    {g.description || "Add a plan and take the first step."}
                  </p>
                  <div className="progress">
                    <span
                      style={{
                        width: `${g.total_steps ? (100 * g.completed_steps) / g.total_steps : 0}%`,
                      }}
                    />
                  </div>
                  <small>
                    {g.completed_steps} of {g.total_steps} steps complete
                  </small>
                </Link>
              ))}
            </div>
            {!mentor && (
              <section className="panel">
                <h2>A new goal</h2>
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      await api("/goals", json("POST", { title, description }));
                      setTitle("");
                      setDescription("");
                    }, "Goal created.");
                  }}
                >
                  <label>
                    Goal title
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={180}
                      required
                      placeholder="What would you like to work toward?"
                    />
                  </label>
                  <label>
                    Why it matters
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={4000}
                    />
                  </label>
                  <button disabled={busy}>Create goal</button>
                </form>
              </section>
            )}
          </section>
          <aside>
            <section className="panel">
              <div className="eyebrow">YOUR CIRCLE</div>
              <h2>{mentor ? "Students" : "Mentors"}</h2>
              <p>
                {mentor
                  ? "Invite a student by email. Their goals stay private until they accept."
                  : "Choose who can view your goals and share feedback. You can remove access at any time."}
              </p>
              {mentor && (
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      await api("/relationships", json("POST", { email }));
                      setEmail("");
                    }, "Invitation added. The student can accept it in their workspace.");
                  }}
                >
                  <label>
                    Student email
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={254}
                    />
                  </label>
                  <button disabled={busy}>Invite student</button>
                </form>
              )}
              <ul className="people">
                {relations.map((r) => (
                  <li key={r.id}>
                    <strong>{mentor ? r.student_email : r.mentor_email}</strong>
                    <span className="badge">{r.status}</span>
                    <div className="actions">
                      {!mentor && r.status === "pending" && (
                        <button
                          disabled={busy}
                          onClick={() =>
                            act(
                              () =>
                                api(
                                  `/relationships/${r.id}/accept`,
                                  json("POST", {}),
                                ),
                              "Invitation accepted.",
                            )
                          }
                        >
                          Accept invitation
                        </button>
                      )}
                      <button
                        className="quiet"
                        disabled={busy}
                        onClick={() => {
                          if (
                            window.confirm(
                              "Remove this connection? The mentor will no longer be able to view these goals.",
                            )
                          )
                            act(
                              () =>
                                api(`/relationships/${r.id}`, {
                                  method: "DELETE",
                                }),
                              "Connection removed.",
                            );
                        }}
                      >
                        {r.status === "pending" ? "Dismiss" : "Remove access"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
            <p className="side-note">
              You own your progress.
              <br />
              Mentors can read and respond; only students can change their
              plans.
            </p>
          </aside>
        </div>
      )}
    </Shell>
  );
}

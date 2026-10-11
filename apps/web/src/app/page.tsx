"use client";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, json, User, Goal, Relationship, Overview } from "@/lib/api";
import { Shell, Notice } from "@/components/Shell";
import { Icon } from "@/components/Icons";
import { Modal } from "@/components/Modal";
const date = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
function Dashboard() {
  const search = useSearchParams();
  const requested = search.get("view") || "overview";
  const view = ["overview", "goals", "people", "activity"].includes(requested)
    ? requested
    : "overview";
  const [user, setUser] = useState<User | null>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [relations, setRelations] = useState<Relationship[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  async function load() {
    const [u, g, r, o] = await Promise.all([
      api<User>("/me"),
      api<Goal[]>("/goals"),
      api<Relationship[]>("/relationships"),
      api<Overview>("/overview"),
    ]);
    setUser(u);
    setGoals(g);
    setRelations(r);
    setOverview(o);
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
  const completed = (g: Goal) =>
    g.total_steps > 0 && g.completed_steps === g.total_steps;
  const filtered = goals.filter(
    (g) =>
      (g.title + " " + g.description + " " + g.owner_email)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (filter === "all" ||
        (filter === "complete" ? completed(g) : !completed(g))),
  );
  const headings = {
    overview: mentor ? "Your mentoring overview" : "Your overview",
    goals: mentor ? "Student goals" : "My goals",
    people: mentor ? "Your students" : "Your mentors",
    activity: "Recent updates",
  };
  const subtitles = {
    overview: mentor
      ? "See where your students are making progress and where you can help."
      : "Your goals, next steps and conversations in one place.",
    goals: "Keep a clear view of what you’re working toward.",
    people: mentor
      ? "Invite students and follow their progress after they accept."
      : "Connect with a mentor. You decide who can see your progress.",
    activity: "The latest check-ins and feedback across your goals.",
  };
  const goalList = (
    <section className="surface">
      <div className="section-head">
        <h2>{mentor ? "Student goals" : "Your goals"}</h2>
        {view === "overview" && (
          <Link href="/?view=goals" className="text-link">
            View all <Icon name="arrow" size={14} />
          </Link>
        )}
      </div>
      {view === "goals" && (
        <div className="list-toolbar">
          <label className="search">
            <Icon name="search" />
            <input
              aria-label="Search goals"
              placeholder="Search goals…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Filter goals"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">All goals</option>
            <option value="progress">In progress</option>
            <option value="complete">Completed</option>
          </select>
        </div>
      )}
      <div className="goal-list">
        {(view === "overview" ? filtered.slice(0, 5) : filtered).map((g, i) => (
          <Link className="goal-row" key={g.id} href={`/goal/?id=${g.id}`}>
            <span className={`goal-symbol tone-${i % 3}`}>
              <Icon name={completed(g) ? "check" : "target"} size={21} />
            </span>
            <div className="goal-copy">
              <h3>{g.title}</h3>
              <p>
                {mentor ? g.owner_email : g.description || "No description yet"}
              </p>
            </div>
            <div className="goal-progress">
              <span className={`status ${completed(g) ? "done" : ""}`}>
                {completed(g) ? "Completed" : "In progress"}
              </span>
              <div className="progress">
                <span
                  style={{
                    width: `${g.total_steps ? (100 * g.completed_steps) / g.total_steps : 0}%`,
                  }}
                />
              </div>
              <small>
                {g.completed_steps}/{g.total_steps} steps
              </small>
            </div>
            <Icon name="chevron" size={16} />
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty">
          <Icon name="target" size={28} />
          <h3>
            {query
              ? "No matching goals"
              : mentor
                ? "No shared goals yet"
                : "Start with a goal"}
          </h3>
          <p>
            {mentor
              ? "A student’s goals appear after they accept your invitation."
              : "Choose something you want to work toward, then break it into steps."}
          </p>
          {!mentor && !query && (
            <button onClick={() => setModal(true)}>
              Create your first goal
            </button>
          )}
        </div>
      )}
    </section>
  );
  const updates = (
    <div className="update-list">
      {[
        ...(overview?.feedback || []).map((f) => ({
          key: `f${f.id}`,
          goalId: f.goal_id,
          title: f.title,
          body: f.body,
          label: "Mentor feedback",
          time: f.created_at,
          icon: "message" as const,
        })),
        ...(overview?.checkpoints || []).map((c) => ({
          key: `c${c.id}`,
          goalId: c.goal_id,
          title: c.title,
          body: c.notes,
          label: "Monthly check-in",
          time: c.updated_at,
          icon: "activity" as const,
        })),
      ]
        .sort((a, b) => b.time.localeCompare(a.time))
        .slice(0, view === "activity" ? 12 : 4)
        .map((item) => (
          <Link
            className="update-item"
            href={`/goal/?id=${item.goalId}`}
            key={item.key}
          >
            <span className="update-icon">
              <Icon name={item.icon} size={16} />
            </span>
            <div>
              <div className="meta-line">
                <span>{item.label}</span>
                <time>{date(item.time)}</time>
              </div>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </div>
          </Link>
        ))}
      {!overview?.feedback.length && !overview?.checkpoints.length && (
        <div className="empty compact">
          <Icon name="message" size={24} />
          <p>Your check-ins and mentor feedback will appear here.</p>
        </div>
      )}
    </div>
  );
  return (
    <Shell user={user} active={view}>
      <div className="page-heading">
        <div>
          <h1>{headings[view as keyof typeof headings]}</h1>
          <p>{subtitles[view as keyof typeof subtitles]}</p>
        </div>
        {!mentor && user && (
          <button onClick={() => setModal(true)}>
            <Icon name="plus" />
            New goal
          </button>
        )}
      </div>
      <Notice error={error} message={message} />
      {!user ? (
        <div className="loading">Loading workspace…</div>
      ) : (
        <>
          {view === "overview" && (
            <>
              <div className="stats">
                <div>
                  <span>Goals</span>
                  <strong>{overview?.stats.goals || 0}</strong>
                  <small>In your workspace</small>
                </div>
                <div>
                  <span>Steps completed</span>
                  <strong>
                    {overview?.stats.completed_steps || 0}
                    <em> / {overview?.stats.steps || 0}</em>
                  </strong>
                  <small>Progress you can build on</small>
                </div>
                <div>
                  <span>
                    {mentor ? "Connected students" : "Connected mentors"}
                  </span>
                  <strong>
                    {relations.filter((r) => r.status === "accepted").length}
                  </strong>
                  <small>
                    {relations.filter((r) => r.status === "pending").length}{" "}
                    pending invitations
                  </small>
                </div>
                <div>
                  <span>Feedback</span>
                  <strong>{overview?.stats.feedback || 0}</strong>
                  <small>Conversations on your goals</small>
                </div>
              </div>
              <div className="dashboard-grid">
                <div>
                  {goalList}
                  <section className="surface next-steps">
                    <div className="section-head">
                      <h2>Next steps</h2>
                      <span className="muted">Open actions</span>
                    </div>
                    {overview?.nextSteps.length ? (
                      <ul>
                        {overview.nextSteps.map((s) => (
                          <li key={s.id}>
                            <span className="open-check" />
                            <Link href={`/goal/?id=${s.goal_id}`}>
                              <strong>{s.description}</strong>
                              <small>{s.title}</small>
                            </Link>
                            <Icon name="chevron" size={15} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="padded muted">
                        No open steps. Add one inside a goal when you’re ready.
                      </p>
                    )}
                  </section>
                </div>
                <aside>
                  <section className="surface">
                    <div className="section-head">
                      <h2>Latest updates</h2>
                      <Link href="/?view=activity" className="text-link">
                        View all
                      </Link>
                    </div>
                    {updates}
                  </section>
                  <section className="help-note">
                    <Icon name="people" size={20} />
                    <h3>
                      {mentor
                        ? "Feedback starts a conversation"
                        : "Progress works better together"}
                    </h3>
                    <p>
                      {mentor
                        ? "Ask a question, highlight a specific improvement, or suggest a manageable next step."
                        : "Accept a mentor’s invitation to share your goals and get another perspective."}
                    </p>
                    <Link href="/?view=people" className="text-link">
                      {mentor ? "Manage students" : "Manage mentors"}{" "}
                      <Icon name="arrow" size={14} />
                    </Link>
                  </section>
                </aside>
              </div>
            </>
          )}
          {view === "goals" && goalList}
          {view === "activity" && (
            <section className="surface activity-surface">{updates}</section>
          )}
          {view === "people" && (
            <div className="people-layout">
              <section className="surface">
                <div className="section-head">
                  <h2>
                    {mentor ? "Student connections" : "Mentor connections"}
                  </h2>
                  <span className="count">{relations.length}</span>
                </div>
                {!relations.length && (
                  <div className="empty">
                    <Icon name="people" size={28} />
                    <h3>No connections yet</h3>
                    <p>
                      {mentor
                        ? "Invite a student using their sign-in email."
                        : "When a mentor invites your email, you’ll see the invitation here."}
                    </p>
                  </div>
                )}
                <ul className="people-list">
                  {relations.map((r) => (
                    <li key={r.id}>
                      <span className="avatar">
                        {(mentor
                          ? r.student_email
                          : r.mentor_email)[0].toUpperCase()}
                      </span>
                      <div className="person-info">
                        <strong>
                          {mentor ? r.student_email : r.mentor_email}
                        </strong>
                        <small>
                          {r.status === "accepted"
                            ? mentor
                              ? `${goals.filter((g) => g.owner_email === r.student_email).length} shared goals`
                              : "Can view your goals and leave feedback"
                            : "Waiting for student acceptance"}
                        </small>
                      </div>
                      <span
                        className={`status ${r.status === "accepted" ? "done" : ""}`}
                      >
                        {r.status === "accepted" ? "Connected" : "Pending"}
                      </span>
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
              <aside className="surface invite-panel">
                <Icon name="people" size={24} />
                <h2>{mentor ? "Invite a student" : "You control access"}</h2>
                <p>
                  {mentor
                    ? "Use the email they sign in with. Your invitation appears in their workspace."
                    : "Only mentors you accept can view your goals. Your plans can only be changed by you."}
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
                        placeholder="student@example.com"
                      />
                    </label>
                    <button disabled={busy}>
                      Invite student <Icon name="arrow" size={15} />
                    </button>
                    <small>
                      No email is sent. Invitations are shown in the app.
                    </small>
                  </form>
                )}
              </aside>
            </div>
          )}
        </>
      )}
      <Modal open={modal} onClose={() => setModal(false)} title="Create a goal">
        <p className="muted">
          Define the outcome. You can add a plan and steps next.
        </p>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            act(async () => {
              await api("/goals", json("POST", { title, description }));
              setTitle("");
              setDescription("");
              setModal(false);
            }, "Goal created.");
          }}
        >
          <label>
            Goal title
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={180}
              required
              placeholder="What do you want to work toward?"
            />
          </label>
          <label>
            Why it matters
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={4000}
              placeholder="A little context for you and your mentor."
            />
          </label>
          <div className="modal-actions">
            <button
              type="button"
              className="quiet"
              onClick={() => setModal(false)}
            >
              Cancel
            </button>
            <button disabled={busy}>Create goal</button>
          </div>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
        </form>
      </Modal>
    </Shell>
  );
}
export default function Page() {
  return (
    <Suspense fallback={<p className="loading">Loading workspace…</p>}>
      <Dashboard />
    </Suspense>
  );
}

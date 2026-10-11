"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useRef } from "react";
import { api, json, User, Detail, Grow } from "@/lib/api";
import { Shell, Notice } from "@/components/Shell";
import { Icon } from "@/components/Icons";
const labels = {
  goal: "Goal — what do you want?",
  reality: "Reality — where are you now?",
  options: "Options — what could you try?",
  will: "Will — what will you do next?",
};
function GoalPage() {
  const id = useSearchParams().get("id") || "";
  const [user, setUser] = useState<User | null>(null);
  const [goal, setGoal] = useState<Detail | null>(null);
  const [tab, setTab] = useState("steps");
  const [grow, setGrow] = useState<Grow>({
    goal: "",
    reality: "",
    options: "",
    will: "",
  });
  const [step, setStep] = useState("");
  const [notes, setNotes] = useState("");
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [feedback, setFeedback] = useState("");
  const [editCheckin, setEditCheckin] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const feedbackKey = useRef<{ body: string; id: string } | null>(null);
  async function load(updateDraft = false) {
    const [u, g] = await Promise.all([
      api<User>("/me"),
      api<Detail>(`/goals/${id}`),
    ]);
    setUser(u);
    setGoal(g);
    if (updateDraft)
      setGrow({
        goal: g.grow.goal,
        reality: g.grow.reality,
        options: g.grow.options,
        will: g.grow.will,
      });
  }
  useEffect(() => {
    setGoal(null);
    setError("");
    load(true).catch((e) => setError(e.message));
  }, [id]);
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
  const owner = goal?.owner_id === user?.id && user?.role === "student";
  const done = goal?.steps.filter((s) => s.completed).length || 0;
  const percent = goal?.steps.length
    ? Math.round((done * 100) / goal.steps.length)
    : 0;
  function toggle(stepId: number, completed: boolean) {
    if (!goal) return;
    const previous = goal;
    setGoal({
      ...goal,
      steps: goal.steps.map((s) => (s.id === stepId ? { ...s, completed } : s)),
    });
    act(async () => {
      try {
        return await api(
          `/goals/${id}/steps/${stepId}`,
          json("PATCH", { completed }),
        );
      } catch (error) {
        setGoal(previous);
        throw error;
      }
    }, "Step updated.");
  }
  return (
    <Shell user={user} active="goals">
      <Link className="back" href="/?view=goals">
        ← All goals
      </Link>
      <Notice error={error} message={message} />
      {!goal ? (
        <div className="empty">
          <h2>{error ? "Goal unavailable" : "Loading goal…"}</h2>
          <p>{error ? "This goal is not available to your account." : ""}</p>
        </div>
      ) : (
        <>
          <div className="goal-heading">
            <div>
              <span className={`status ${percent === 100 ? "done" : ""}`}>
                {percent === 100 ? "Completed" : "In progress"}
              </span>
              <h1>{goal.title}</h1>
              <p>
                {goal.description ||
                  "A place to define your plan and keep track of progress."}
              </p>
              <div className="goal-owner">
                <span className="avatar small">
                  {goal.owner_email?.[0].toUpperCase() || "S"}
                </span>
                {goal.owner_email || user?.email}
                {!owner && (
                  <span className="read-only">
                    Mentor view · plan is read-only
                  </span>
                )}
              </div>
            </div>
            <div className="completion-meter">
              <strong>
                {percent}
                <span>%</span>
              </strong>
              <small>
                {done} of {goal.steps.length} steps complete
              </small>
              <div className="progress">
                <span style={{ width: `${percent}%` }} />
              </div>
            </div>
          </div>
          <div className="detail-grid">
            <section className="surface detail-main">
              <div className="tabs" role="tablist" aria-label="Goal sections">
                {[
                  ["steps", "Action steps"],
                  ["plan", "GROW plan"],
                  ["checkins", "Check-ins"],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    role="tab"
                    tabIndex={tab === key ? 0 : -1}
                    onKeyDown={(e) => {
                      const keys = ["steps", "plan", "checkins"];
                      const current = keys.indexOf(key);
                      const next =
                        e.key === "ArrowRight"
                          ? (current + 1) % 3
                          : e.key === "ArrowLeft"
                            ? (current + 2) % 3
                            : e.key === "Home"
                              ? 0
                              : e.key === "End"
                                ? 2
                                : -1;
                      if (next >= 0) {
                        e.preventDefault();
                        setTab(keys[next]);
                        document.getElementById(`tab-${keys[next]}`)?.focus();
                      }
                    }}
                    aria-selected={tab === key}
                    aria-controls={`panel-${key}`}
                    id={`tab-${key}`}
                    className={tab === key ? "active" : ""}
                    onClick={() => setTab(key)}
                  >
                    {label}
                    {key === "steps" && <span>{goal.steps.length}</span>}
                    {key === "checkins" && (
                      <span>{goal.checkpoints.length}</span>
                    )}
                  </button>
                ))}
              </div>
              <div
                role="tabpanel"
                id={`panel-${tab}`}
                aria-labelledby={`tab-${tab}`}
                className="tab-content"
              >
                {tab === "steps" && (
                  <>
                    <div className="section-intro">
                      <h2>A step at a time</h2>
                      <p>
                        {owner
                          ? "Turn your goal into specific actions you can finish."
                          : "Follow the student’s plan. Use feedback to suggest a next step."}
                      </p>
                    </div>
                    {!goal.steps.length && (
                      <div className="empty compact">
                        <Icon name="check" size={28} />
                        <p>No action steps yet.</p>
                      </div>
                    )}
                    <ul className="steps">
                      {goal.steps.map((s) => (
                        <li
                          key={s.id}
                          className={s.completed ? "completed" : ""}
                        >
                          <label>
                            <input
                              type="checkbox"
                              checked={s.completed}
                              disabled={!owner || busy}
                              onChange={(e) => toggle(s.id, e.target.checked)}
                            />
                            <span>{s.description}</span>
                          </label>
                          <span className="step-status">
                            {s.completed ? "Done" : "To do"}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {owner && (
                      <form
                        className="inline-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          act(async () => {
                            await api(
                              `/goals/${id}/steps`,
                              json("POST", { description: step }),
                            );
                            setStep("");
                          }, "Step added.");
                        }}
                      >
                        <label>
                          Next action
                          <input
                            value={step}
                            onChange={(e) => setStep(e.target.value)}
                            required
                            maxLength={500}
                            placeholder="Add a small, concrete next step"
                          />
                        </label>
                        <button disabled={busy}>
                          <Icon name="plus" size={16} />
                          Add step
                        </button>
                      </form>
                    )}
                  </>
                )}
                {tab === "plan" && (
                  <>
                    <div className="section-intro">
                      <h2>Give your goal a plan</h2>
                      <p>
                        Define where you want to go, what’s true now and what
                        you’ll try next.
                      </p>
                    </div>
                    {owner ? (
                      <form
                        className="stack grow-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          act(
                            () => api(`/goals/${id}/grow`, json("PUT", grow)),
                            "Plan saved.",
                          );
                        }}
                      >
                        {(["goal", "reality", "options", "will"] as const).map(
                          (k, i) => (
                            <label key={k}>
                              <span className="grow-label">
                                <span>{"GROW"[i]}</span>
                                {labels[k]}
                              </span>
                              <textarea
                                value={grow[k]}
                                disabled={busy}
                                onChange={(e) =>
                                  setGrow({ ...grow, [k]: e.target.value })
                                }
                                maxLength={4000}
                              />
                            </label>
                          ),
                        )}
                        <button disabled={busy}>Save plan</button>
                      </form>
                    ) : (
                      <div className="grow-reading">
                        {(["goal", "reality", "options", "will"] as const).map(
                          (k, i) => (
                            <article key={k}>
                              <span className="grow-letter">{"GROW"[i]}</span>
                              <div>
                                <h3>{labels[k]}</h3>
                                <p>{grow[k] || "Not added yet."}</p>
                              </div>
                            </article>
                          ),
                        )}
                      </div>
                    )}
                  </>
                )}
                {tab === "checkins" && (
                  <>
                    <div className="section-intro row">
                      <div>
                        <h2>Monthly check-ins</h2>
                        <p>
                          Keep a record of what changed and what you learned.
                        </p>
                      </div>
                      {owner && (
                        <button
                          className="quiet"
                          onClick={() => setEditCheckin(!editCheckin)}
                        >
                          <Icon name="plus" size={15} />
                          Write check-in
                        </button>
                      )}
                    </div>
                    {owner && editCheckin && (
                      <form
                        className="stack checkin-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          act(async () => {
                            await api(
                              `/goals/${id}/checkpoints`,
                              json("PUT", { month, notes }),
                            );
                            setNotes("");
                            setEditCheckin(false);
                          }, "Check-in saved.");
                        }}
                      >
                        <label>
                          Month
                          <input
                            type="month"
                            value={month}
                            onChange={(e) => setMonth(e.target.value)}
                            required
                          />
                        </label>
                        <label>
                          Progress notes
                          <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            required
                            maxLength={4000}
                            placeholder="What moved forward? What got in the way?"
                          />
                        </label>
                        <div className="row">
                          <small>
                            One note per month. Saving again updates it.
                          </small>
                          <button disabled={busy}>Save check-in</button>
                        </div>
                      </form>
                    )}
                    {!goal.checkpoints.length && !editCheckin && (
                      <div className="empty">
                        <Icon name="activity" size={26} />
                        <h3>Your progress, over time</h3>
                        <p>Monthly notes will appear here as you add them.</p>
                      </div>
                    )}
                    <div className="checkin-timeline">
                      {goal.checkpoints.map((c) => (
                        <article key={c.id}>
                          <span className="timeline-dot" />
                          <div className="section-head">
                            <h3>
                              {new Date(
                                c.month + "-02T12:00:00",
                              ).toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric",
                              })}
                            </h3>
                            {owner && (
                              <button
                                className="text-button"
                                onClick={() => {
                                  setMonth(c.month);
                                  setNotes(c.notes);
                                  setEditCheckin(true);
                                }}
                              >
                                Edit check-in
                              </button>
                            )}
                          </div>
                          <p>{c.notes}</p>
                        </article>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </section>
            <aside className="surface feedback-panel">
              <div className="section-head">
                <h2>
                  <Icon name="message" size={18} />
                  Feedback
                </h2>
                <span className="count">{goal.feedback.length}</span>
              </div>
              <div className="feedback-list">
                {goal.feedback.map((f) => (
                  <article key={f.id}>
                    <div className="feedback-author">
                      <span className="avatar small">
                        {f.mentor_email[0].toUpperCase()}
                      </span>
                      <div>
                        <strong>{f.mentor_email}</strong>
                        <time>
                          {new Date(f.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </time>
                      </div>
                    </div>
                    <p>{f.body}</p>
                  </article>
                ))}
                {!goal.feedback.length && (
                  <div className="empty compact">
                    <Icon name="message" size={26} />
                    <p>
                      {owner
                        ? "Feedback from your mentor will appear here."
                        : "Start the conversation with a specific observation or suggestion."}
                    </p>
                  </div>
                )}
              </div>
              {!owner && user?.role === "mentor" && (
                <form
                  className="stack feedback-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(async () => {
                      if (
                        !feedbackKey.current ||
                        feedbackKey.current.body !== feedback
                      )
                        feedbackKey.current = {
                          body: feedback,
                          id: crypto.randomUUID(),
                        };
                      await api(
                        `/goals/${id}/feedback`,
                        json("POST", {
                          body: feedback,
                          requestId: feedbackKey.current.id,
                        }),
                      );
                      feedbackKey.current = null;
                      setFeedback("");
                    }, "Feedback shared.");
                  }}
                >
                  <label>
                    Your feedback
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      required
                      maxLength={4000}
                      placeholder="What should they keep doing or try next?"
                    />
                  </label>
                  <button disabled={busy}>
                    Share feedback <Icon name="arrow" size={15} />
                  </button>
                </form>
              )}
              <div className="permission-note">
                <Icon name="people" size={15} />
                <span>
                  {owner
                    ? "Only accepted mentors can read this goal."
                    : "You can leave feedback. Only the student can edit their plan."}
                </span>
              </div>
            </aside>
          </div>
        </>
      )}
    </Shell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<p className="loading">Loading goal…</p>}>
      <GoalPage />
    </Suspense>
  );
}

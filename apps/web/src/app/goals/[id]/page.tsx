"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { api, json, User, Detail, Grow } from "@/lib/api";
import { Shell, Notice } from "@/components/Shell";
export default function GoalPage() {
  const { id } = useParams<{ id: string }>();
  const [user, setUser] = useState<User | null>(null);
  const [goal, setGoal] = useState<Detail | null>(null);
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
    load(true).catch((e) => setError(e.message));
  }, [id]); // The route ID identifies the requested goal.
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
  return (
    <Shell user={user}>
      <Link className="back" href="/">
        ← All goals
      </Link>
      <Notice error={error} message={message} />
      {!goal ? (
        <p>
          {error
            ? "This goal is not available to your account."
            : "Loading goal…"}
        </p>
      ) : (
        <>
          <div className="eyebrow">{owner ? "YOUR GOAL" : "MENTOR VIEW"}</div>
          <h1>{goal.title}</h1>
          <p className="intro">{goal.description}</p>
          <div className="workspace">
            <div>
              <section className="panel">
                <h2>The plan</h2>
                <p>Use GROW to turn an intention into a practical next step.</p>
                <form
                  className="stack"
                  onSubmit={(e) => {
                    e.preventDefault();
                    act(
                      () => api(`/goals/${id}/grow`, json("PUT", grow)),
                      "Plan saved.",
                    );
                  }}
                >
                  {(["goal", "reality", "options", "will"] as const).map(
                    (k) => (
                      <label key={k}>
                        {
                          {
                            goal: "Goal — what do you want?",
                            reality: "Reality — where are you now?",
                            options: "Options — what could you try?",
                            will: "Will — what will you do next?",
                          }[k]
                        }
                        <textarea
                          disabled={!owner || busy}
                          value={grow[k]}
                          onChange={(e) =>
                            setGrow({ ...grow, [k]: e.target.value })
                          }
                          maxLength={4000}
                        />
                      </label>
                    ),
                  )}
                  {owner && <button disabled={busy}>Save plan</button>}
                </form>
              </section>
              <section className="panel">
                <h2>Action steps</h2>
                {!goal.steps.length && (
                  <p>No steps yet. Start with something small.</p>
                )}
                <ul className="steps">
                  {goal.steps.map((s) => (
                    <li key={s.id}>
                      <label>
                        <input
                          type="checkbox"
                          checked={s.completed}
                          disabled={!owner || busy}
                          onChange={(e) => {
                            const completed = e.target.checked;
                            setGoal({
                              ...goal,
                              steps: goal.steps.map((item) =>
                                item.id === s.id
                                  ? { ...item, completed }
                                  : item,
                              ),
                            });
                            act(async () => {
                              try {
                                return await api(
                                  `/goals/${id}/steps/${s.id}`,
                                  json("PATCH", { completed }),
                                );
                              } catch (error) {
                                setGoal((previous) =>
                                  previous
                                    ? {
                                        ...previous,
                                        steps: previous.steps.map((item) =>
                                          item.id === s.id
                                            ? {
                                                ...item,
                                                completed: s.completed,
                                              }
                                            : item,
                                        ),
                                      }
                                    : previous,
                                );
                                throw error;
                              }
                            }, "Step updated.");
                          }}
                        />
                        <span>{s.description}</span>
                      </label>
                    </li>
                  ))}
                </ul>
                {owner && (
                  <form
                    className="stack"
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
                        required
                        maxLength={500}
                        value={step}
                        onChange={(e) => setStep(e.target.value)}
                      />
                    </label>
                    <button disabled={busy}>Add step</button>
                  </form>
                )}
              </section>
              <section className="panel">
                <h2>Monthly check-ins</h2>
                {owner && (
                  <form
                    className="stack"
                    onSubmit={(e) => {
                      e.preventDefault();
                      act(async () => {
                        await api(
                          `/goals/${id}/checkpoints`,
                          json("PUT", { month, notes }),
                        );
                        setNotes("");
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
                      />
                    </label>
                    <button disabled={busy}>Save check-in</button>
                    <small>
                      Saving the same month updates that month’s note.
                    </small>
                  </form>
                )}
                {goal.checkpoints.map((c) => (
                  <article className="note" key={c.id}>
                    <strong>{c.month}</strong>
                    <p>{c.notes}</p>
                    {owner && (
                      <button
                        className="quiet"
                        onClick={() => {
                          setMonth(c.month);
                          setNotes(c.notes);
                        }}
                      >
                        Edit check-in
                      </button>
                    )}
                  </article>
                ))}
              </section>
            </div>
            <aside>
              <section className="panel">
                <div className="eyebrow">THE CONVERSATION</div>
                <h2>Mentor feedback</h2>
                {!goal.feedback.length && (
                  <p>
                    No feedback yet. A fresh perspective can help you find your
                    next step.
                  </p>
                )}
                {!owner && user?.role === "mentor" && (
                  <form
                    className="stack"
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
                        maxLength={4000}
                        required
                      />
                    </label>
                    <button disabled={busy}>Share feedback</button>
                  </form>
                )}
                {goal.feedback.map((f) => (
                  <article className="note" key={f.id}>
                    <strong>{f.mentor_email}</strong>
                    <small>{new Date(f.created_at).toLocaleDateString()}</small>
                    <p>{f.body}</p>
                  </article>
                ))}
              </section>
            </aside>
          </div>
        </>
      )}
    </Shell>
  );
}

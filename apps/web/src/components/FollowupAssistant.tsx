"use client";
import { useEffect, useState } from "react";
import { api, json } from "@/lib/api";
type Evidence = { text: string; sources: string[] };
type Draft = {
  id: string;
  summary: Evidence[];
  followups: Evidence[];
  draft: string;
  sources: { id: string; kind: string; text: string; completed?: boolean }[];
  trace_id: string;
  truncated: boolean;
  feedback_id?: number;
  confirmed_body?: string;
};
export function FollowupAssistant({
  goalId,
  onSaved,
}: {
  goalId: number;
  onSaved: () => Promise<void>;
}) {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const preview = process.env.NEXT_PUBLIC_PLAYGROUND === "true";
  const base = `/goals/${goalId}/followup`;
  useEffect(() => {
    let current = true;
    api<{ enabled: boolean }>(`${base}/config`)
      .then((v) => {
        if (current) setEnabled(v.enabled);
      })
      .catch(() => {
        if (current) setEnabled(false);
      });
    return () => {
      current = false;
    };
  }, [base]);
  async function generate() {
    setBusy(true);
    setError("");
    setMessage("");
    setReviewed(false);
    try {
      const d = await api<Draft>(`${base}/drafts`, json("POST", {}));
      setDraft(d);
      setBody(d.draft);
      setMessage(
        `${preview ? "Example draft" : "Draft"} ready. Check the sources and edit before sharing.`,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function confirm() {
    if (!draft || !reviewed) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api(
        `${base}/drafts/${draft.id}/confirm`,
        json("POST", { body, confirmed: true }),
      );
      setDraft(null);
      setBody("");
      setReviewed(false);
      setMessage(
        preview
          ? "Feedback saved in this demo. Switch to the student view to read it."
          : "Feedback shared with the student.",
      );
      await onSaved();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      className="followup-assistant"
      aria-label="Mentor follow-up assistant"
    >
      <h3>Follow-up assistant</h3>
      <p>
        Review progress and prepare feedback from this goal’s records. Nothing
        is shared until you confirm.
      </p>
      {preview && (
        <p className="assistant-note">
          <strong>Interactive example · No AI model is called.</strong>
          <br />A template uses this goal’s records. Your edits and feedback
          stay in this browser.
        </p>
      )}
      {enabled === false ? (
        <p className="assistant-note">
          The assistant is not connected. You can still write feedback below.
        </p>
      ) : (
        <button
          type="button"
          className="quiet"
          disabled={!enabled || busy}
          onClick={generate}
        >
          {busy
            ? "Working…"
            : draft
              ? preview
                ? "Prepare a new example"
                : "Generate a new draft"
              : preview
                ? "Prepare example follow-up"
                : "Prepare follow-up"}
        </button>
      )}
      {error && (
        <p role="alert" className="assistant-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" aria-live="polite">
          {message}
        </p>
      )}
      {draft && (
        <>
          {draft.truncated && (
            <p className="assistant-note">
              This draft uses a limited selection of recent records. Review the
              complete goal before sharing.
            </p>
          )}
          <h4>Progress</h4>
          <ul>
            {draft.summary.map((item, i) => (
              <li key={i}>
                {item.text}
                <small>Sources: {item.sources.join(", ")}</small>
              </li>
            ))}
          </ul>
          {!!draft.followups.length && (
            <>
              <h4>Suggested follow-ups</h4>
              <ul>
                {draft.followups.map((item, i) => (
                  <li key={i}>
                    {item.text}
                    <small>Sources: {item.sources.join(", ")}</small>
                  </li>
                ))}
              </ul>
            </>
          )}
          <details>
            <summary>Review source records</summary>
            {draft.sources.map((source) => (
              <article key={source.id}>
                <strong>
                  {source.id}
                  {source.completed !== undefined
                    ? source.completed
                      ? " · Complete"
                      : " · Not complete"
                    : ""}
                </strong>
                <p>{source.text}</p>
              </article>
            ))}
          </details>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              confirm();
            }}
          >
            <label>
              Review feedback draft
              <textarea
                value={body}
                disabled={busy}
                onChange={(e) => {
                  setBody(e.target.value);
                  setReviewed(false);
                }}
                required
                maxLength={4000}
              />
            </label>
            <label className="assistant-confirm">
              <input
                type="checkbox"
                checked={reviewed}
                disabled={busy}
                onChange={(e) => setReviewed(e.target.checked)}
              />
              I checked the sources and am ready to share this feedback.
            </label>
            <button disabled={busy || !reviewed || !body.trim()}>
              Confirm and share feedback
            </button>
            <button
              type="button"
              className="quiet"
              disabled={busy}
              onClick={() => {
                setDraft(null);
                setBody("");
                setReviewed(false);
              }}
            >
              Discard draft
            </button>
          </form>
          <small className="assistant-trace">
            {preview ? "Example reference" : "Support reference"}:{" "}
            {draft.trace_id}
          </small>
        </>
      )}
    </section>
  );
}

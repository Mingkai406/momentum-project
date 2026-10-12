"use client";
import { useEffect, useState } from "react";
import { api, json } from "@/lib/api";
import { signIn, signUp, confirm } from "@/lib/auth";
import Link from "next/link";
import { Icon, Mark } from "@/components/Icons";
import { Notice } from "@/components/Shell";
export default function Login() {
  const [mode, setMode] = useState("");
  const [stage, setStage] = useState("login");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  useEffect(() => {
    api<{ authMode: string }>("/config", {}, true)
      .then((c) => setMode(c.authMode))
      .catch((e) => setError(e.message));
  }, []);
  async function demo(account: string) {
    setBusy(true);
    setError("");
    try {
      const r = await api<{ token: string }>(
        "/demo/login",
        json("POST", { account }),
        true,
      );
      sessionStorage.setItem("momentum-demo", r.token);
      const followupExample =
        process.env.NEXT_PUBLIC_PLAYGROUND === "true" &&
        account === "mentor" &&
        new URLSearchParams(window.location.search).get("example") ===
          "followup";
      window.location.assign(
        `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/${followupExample ? "goal/?id=1" : ""}`,
      );
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (stage === "register") {
        await signUp(email, password);
        setStage("confirm");
        setMessage("Check your email for a verification code.");
      } else if (stage === "confirm") {
        await confirm(email, code);
        setStage("login");
        setMessage("Email verified. You can sign in now.");
      } else {
        await signIn(email, password);
        window.location.assign(`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="login-header">
        <Link href="/welcome" className="brand">
          <Mark />
          Momentum
        </Link>
        <a
          href="https://github.com/Mingkai406/momentum-project"
          className="source-link"
        >
          View source ↗
        </a>
      </header>
      <main className="login-layout">
        <div className="login-intro">
          <h1>
            A clearer view
            <br />
            of your next step.
          </h1>
          <p>
            Keep your goals, progress notes and mentor conversations in one
            workspace.
          </p>
          <ul className="login-details">
            <li>
              <Icon name="target" />
              Turn goals into practical steps
            </li>
            <li>
              <Icon name="activity" />
              See your progress over time
            </li>
            <li>
              <Icon name="message" />
              Get feedback in context
            </li>
          </ul>
        </div>
        <section className="login-card">
          <h2>
            {mode === "demo" || mode === "preview"
              ? "Explore the workspace"
              : stage === "register"
                ? "Create an account"
                : stage === "confirm"
                  ? "Verify your email"
                  : "Sign in"}
          </h2>
          <Notice error={error} message={message} />
          {mode === "demo" || mode === "preview" ? (
            <>
              <p>
                Choose a perspective. Each role shows a different side of the
                same mentoring workflow.
              </p>
              <div className="demo-options">
                {[
                  [
                    "student",
                    "Continue as student",
                    "Plan goals, track steps and read feedback.",
                    "target",
                  ],
                  [
                    "mentor",
                    "Continue as mentor",
                    "Review progress, try the follow-up assistant and share feedback.",
                    "people",
                  ],
                  [
                    "other",
                    "Continue as another student",
                    "Explore a separate student workspace.",
                    "grid",
                  ],
                ].map(([key, label, description, icon]) => (
                  <button
                    className="demo-option"
                    disabled={busy}
                    key={key}
                    onClick={() => demo(key)}
                  >
                    <Icon
                      name={icon as "target" | "people" | "grid"}
                      size={21}
                    />
                    <div>
                      <strong>{label}</strong>
                      <small>{description}</small>
                    </div>
                    <Icon name="chevron" size={15} />
                  </button>
                ))}
              </div>
              <p className="demo-caption">
                {mode === "preview"
                  ? "Public demo with fictional data. Changes stay in this browser. No account or personal information is needed."
                  : "Local development workspace with fictional accounts."}
              </p>
            </>
          ) : mode === "cognito" ? (
            <form onSubmit={submit} className="stack">
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              {stage === "confirm" ? (
                <label>
                  Verification code
                  <input
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </label>
              ) : (
                <label>
                  Password
                  <input
                    type="password"
                    autoComplete={
                      stage === "register" ? "new-password" : "current-password"
                    }
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </label>
              )}
              <button disabled={busy}>
                {busy
                  ? "Please wait…"
                  : stage === "register"
                    ? "Create account"
                    : stage === "confirm"
                      ? "Verify email"
                      : "Sign in"}
              </button>
              <button
                type="button"
                className="quiet"
                onClick={() =>
                  setStage(stage === "login" ? "register" : "login")
                }
              >
                {stage === "login"
                  ? "New here? Create an account"
                  : "Back to sign in"}
              </button>
              {stage === "login" && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setStage("confirm")}
                >
                  Already have a verification code?
                </button>
              )}
            </form>
          ) : (
            <p>Connecting to the workspace…</p>
          )}
        </section>
      </main>
    </>
  );
}

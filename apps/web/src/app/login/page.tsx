"use client";
import { useEffect, useState } from "react";
import { api, json } from "@/lib/api";
import { signIn, signUp, confirm } from "@/lib/auth";
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
      window.location.assign("/");
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
        window.location.assign("/");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="login">
      <div className="eyebrow">MOMENTUM / A SHARED PLACE TO GROW</div>
      <h1>
        Small steps.
        <br />
        Shared progress.
      </h1>
      <p className="intro">
        Turn a goal into a plan. Keep track of what changes.
        <br />
        Bring your mentor into the conversation.
      </p>
      <section className="panel login-panel">
        <h2>
          {mode === "demo"
            ? "Try the workspace"
            : stage === "register"
              ? "Create an account"
              : stage === "confirm"
                ? "Verify your email"
                : "Welcome back"}
        </h2>
        <Notice error={error} message={message} />
        {mode === "demo" ? (
          <>
            <p>
              This local workspace uses fictional accounts. Choose a perspective
              to explore the same workflow.
            </p>
            <div className="stack">
              {[
                ["student", "Continue as student"],
                ["mentor", "Continue as mentor"],
                ["other", "Continue as another student"],
              ].map(([key, label]) => (
                <button disabled={busy} key={key} onClick={() => demo(key)}>
                  {label}
                </button>
              ))}
            </div>
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
              onClick={() => setStage(stage === "login" ? "register" : "login")}
            >
              {stage === "login"
                ? "New here? Create an account"
                : "Back to sign in"}
            </button>
            {stage === "login" && (
              <button
                type="button"
                className="quiet"
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
  );
}

"use client";
import Link from "next/link";
import { useState } from "react";
import { signOut } from "@/lib/auth";
import type { User } from "@/lib/api";
import { Icon, Mark, IconName } from "./Icons";
export function Shell({
  user,
  children,
  active = "overview",
}: {
  user: User | null;
  children: React.ReactNode;
  active?: string;
}) {
  const [open, setOpen] = useState(false);
  const nav: { id: string; label: string; icon: IconName }[] = [
    { id: "overview", label: "Overview", icon: "grid" },
    {
      id: "goals",
      label: user?.role === "mentor" ? "Student goals" : "My goals",
      icon: "target",
    },
    {
      id: "people",
      label: user?.role === "mentor" ? "Students" : "Mentors",
      icon: "people",
    },
    { id: "activity", label: "Updates", icon: "activity" },
  ];
  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <Link href="/" className="brand">
          <Mark />
          Momentum
        </Link>
        <div className="workspace-label">
          <span className="workspace-avatar">
            {user?.role === "mentor" ? "M" : "S"}
          </span>
          <div>
            <strong>
              {user?.role === "mentor"
                ? "Mentor workspace"
                : "Student workspace"}
            </strong>
            <small>Personal workspace</small>
          </div>
        </div>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <Link
              key={n.id}
              className={active === n.id ? "nav-link selected" : "nav-link"}
              href={n.id === "overview" ? "/" : `/?view=${n.id}`}
              onClick={() => setOpen(false)}
              aria-current={active === n.id ? "page" : undefined}
            >
              <Icon name={n.icon} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/welcome" className="nav-link">
            <Icon name="book" />
            About Momentum
          </Link>
          <div className="profile">
            <span className="avatar">
              {user?.email?.[0].toUpperCase() || "·"}
            </span>
            <div>
              <strong>{user?.email || "Loading…"}</strong>
              <small>{user?.role === "mentor" ? "Mentor" : "Student"}</small>
            </div>
            <button
              className="icon-button"
              aria-label="Sign out"
              title="Sign out"
              onClick={signOut}
            >
              <Icon name="logout" />
            </button>
          </div>
        </div>
      </aside>
      <div className="app-main">
        {process.env.NEXT_PUBLIC_PLAYGROUND === "true" && (
          <div className="demo-banner">
            Demo workspace · Fictional data saved only in this browser.
            <button
              className="quiet"
              onClick={async () => {
                if (
                  window.confirm("Reset the demo and restore the sample data?")
                ) {
                  const { resetPreview } = await import("@/lib/preview-api");
                  resetPreview();
                  window.location.assign(
                    `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/login/`,
                  );
                }
              }}
            >
              Reset demo
            </button>
          </div>
        )}
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Toggle navigation"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Icon name="menu" />
          </button>
          <span className="breadcrumb">
            Workspace <span>/</span>{" "}
            {nav.find((n) => n.id === active)?.label || "Goal details"}
          </span>
          <a
            className="source-link"
            href="https://github.com/Mingkai406/momentum-project"
            target="_blank"
            rel="noreferrer"
          >
            View source <span>↗</span>
          </a>
        </header>
        <main className="content">{children}</main>
        <footer className="app-footer">
          Momentum <span>Goals · Progress · Feedback</span>
        </footer>
      </div>
    </div>
  );
}
export function Notice({
  error,
  message,
}: {
  error: string;
  message?: string;
}) {
  return (
    <>
      {error && (
        <p className="notice error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          <Icon name="check" />
          {message}
        </p>
      )}
    </>
  );
}

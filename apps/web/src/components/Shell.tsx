"use client";
import Link from "next/link";
import { signOut } from "@/lib/auth";
import type { User } from "@/lib/api";
export function Shell({
  user,
  children,
}: {
  user: User | null;
  children: React.ReactNode;
}) {
  return (
    <>
      <header>
        <Link className="brand" href="/">
          m<span> / </span>momentum
        </Link>
        <div className="account">
          <span>{user?.email}</span>
          <button className="quiet" onClick={signOut}>
            Sign out
          </button>
        </div>
      </header>
      <main>{children}</main>
      <footer>One next step. A little more momentum.</footer>
    </>
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
          {message}
        </p>
      )}
    </>
  );
}

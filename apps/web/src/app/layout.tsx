import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Momentum — Make progress together",
  description:
    "A shared place for student goals, progress notes and mentor feedback.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

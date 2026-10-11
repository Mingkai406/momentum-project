import type { Metadata } from "next";
import "./globals.css";
import Providers from './providers';

export const metadata: Metadata = {
  title: "Momentum - Task Management Platform",
  description: "Full-stack task manager with real-time scheduling and concurrent processing",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}

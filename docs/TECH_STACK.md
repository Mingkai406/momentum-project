# Technology

- Next.js 15, React 19 and TypeScript for the browser application.
- Express 5, Zod input validation and `aws-jwt-verify` for the API.
- PostgreSQL 18 in local development/tests, with ordinary SQL for persistence.
- npm workspaces and one lockfile for dependency management.
- Node test runner, Supertest and Playwright for verification.
- GitHub Actions runs type checks, API/auth tests, production build and browser tests.

No Go worker, queue, AI service or distributed scheduler is part of the current runtime. The local PostgreSQL distribution is supplied by `embedded-postgres`; production uses an independently managed database. The API container recipe has a root-level build context and excludes local data/secrets.

# Entry points

- `npm run dev`: local PostgreSQL, API, frontend, fictional accounts.
- `apps/web/src/app/page.tsx`: student/mentor workspace.
- `apps/web/src/app/goals/[id]/page.tsx`: GROW, steps, check-ins and feedback.
- `apps/web/src/app/login/page.tsx`: local demo or Cognito login.
- `apps/api/app.js`: validated authenticated routes and permissions.
- `apps/api/auth.js`: Cognito / loopback-only demo identity verification.
- `apps/api/database.js`: connection pool and transactional schema application.
- `database/001_initial.sql`: fresh v3 schema.
- `tests/api`: real-database authorization and signed-token tests.
- `tests/e2e`: browser workflow with three independent sessions.

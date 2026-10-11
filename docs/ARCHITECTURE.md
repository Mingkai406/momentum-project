# Architecture

## Decision — 2026-10-11

Keep the existing Next.js / Express / PostgreSQL separation, managed as npm workspaces in one repository. Import the frontend and backend, preserve the original repositories, and omit the disconnected Go scheduler. This is the consolidation option selected by the owner on 2026-10-11. Authorized scope: repository integration, core workflow, permissions, tests and GitHub push. The subsequent UI and deployment request adds a free GitHub Pages playground. Resume changes and paid AWS resources are excluded.

An alternative was to move every endpoint into Next.js server routes. That would remove one runtime, but replace the existing Express boundary without a product need. Revisit only if maintaining two deployable apps becomes a meaningful burden. The monorepo does not require both apps to be hosted together.

## Current boundaries

Browser → Next.js pages → authenticated Express API → PostgreSQL.

Cognito is the hosted identity provider. Its ID token must match the configured user pool and public client, have a valid signature and expiry, and contain a verified email. Members of the administrator-managed `mentors` group are mentors; other users are students. Users cannot set their own role through an API.

Local startup uses short-lived, signed tokens for fictional accounts. Both services bind to loopback. The API refuses demo auth in production or with a public bind address. No local secret is committed.

The Express app is created separately from its HTTP listener so tests exercise the same routing and middleware as the running application. Query values are parameterized; input objects reject unknown fields. Mutation rate limits apply per client IP; reverse-proxy trust is disabled by default.

## Access rules

| Action                                | Student / owner    | Accepted mentor | Other account |
| ------------------------------------- | ------------------ | --------------- | ------------- |
| Read goal, steps, check-ins, feedback | Yes                | Yes             | No            |
| Change GROW, steps, check-ins         | Yes                | No              | No            |
| Leave mentor feedback                 | No                 | Yes             | No            |
| Accept invitation                     | Invited email only | No              | No            |
| Remove relationship                   | Invited student    | Inviting mentor | No            |

An invitation alone grants no read access. Acceptance binds the verified email to the student's immutable identity. Deleting a relationship prevents subsequent reads and feedback submissions. It does not delete feedback already provided; the student retains it. Revocation cannot erase data a mentor previously saw or copied.

## Data and failure behavior

- Users, goals, plans, steps, monthly notes, relationships and feedback are persisted in PostgreSQL.
- GROW and month-specific check-ins use unique keys and atomic upserts. Retrying a save replaces the same record.
- Invitations are unique per mentor and student email. Retrying does not create extra connections.
- Feedback carries a UUID request ID, unique per mentor. Same ID and content returns the original record; different content returns 409. The browser keeps the ID after a failed request so retry does not create a second entry.
- Goal/step creation is not automatically retried; UI controls disable while a request is pending. It is not advertised as exactly-once creation.
- Health checks query the database and return 503 when unavailable. Unexpected errors return a generic response with a request ID; tokens, goal content and database details are not logged.
- Requests have a 32 KB body limit, field limits and database statement/connection timeouts. Goal lists currently cap at 200; pagination is a future extension.

## Compatibility and rollback

The old deployment is stopped and the owner explicitly allowed discarding its data. This revision uses a new v3 schema and replaces legacy API routes; no compatibility with an old running frontend or database is promised. Do not point it at the old database.

Original source commits are listed in PROVENANCE.md. The import commits retain the original snapshots in Git history. Roll back code by reverting the integration commit or checking out the pre-integration revision. Stop the new services before rollback; retain the new database separately. There is no destructive down migration and no production database was touched.

## Verification targets and limits

Access isolation, acceptance, revocation, concurrent feedback deduplication, migration reapplication, persisted state across API reconnection and the student/mentor browser journey are exercised by tests. Timing/traffic/SLO targets are UNKNOWN: no load-test or uptime claims are made. Live Cognito configuration, hosted TLS, backups, recovery and external email delivery remain deployment work. See VERIFICATION.md for executed checks.

## Public playground — 2026-10-11

The owner selected a free public demo. `NEXT_PUBLIC_PLAYGROUND=true` builds the same pages as a Next.js static export for GitHub Pages. `preview-api.ts` replaces network requests with fictional records in localStorage; the selected role is tab-local sessionStorage. This is an interactive product demonstration, not a security boundary or multi-user backend. It never sends visitor-entered goal text to the Express API. Refresh preserves local edits; reset restores fixtures. Separate browsers have separate data.

The full application remains the default build and uses the real API. Goal detail uses `/goal/?id=...` so created goals work in both hosting modes without pre-generating an HTML file for each ID. The live playground has no AWS connection or paid compute.

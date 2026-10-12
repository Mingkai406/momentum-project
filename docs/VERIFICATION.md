# Verification — 2026-10-12 mentor follow-up agent

Local environment: macOS/arm64, Node 20.19.4, Python 3.12, Google ADK 1.39.1, disposable PostgreSQL 18 and Playwright Chromium.

| Check                                          | Result                                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| API/auth and permission tests                  | 22 passed; includes 9 follow-up integration tests                                      |
| ADK/Python service tests                       | 11 passed, including real ADK Runner with a scripted model and HTTP service boundaries |
| Full-app browser workflow                      | 1 passed; existing student/mentor workflow preserved                                   |
| Assistant browser workflow                     | 1 passed; source review, editing, confirmation, stale draft and revoked access         |
| Public-demo browser tests                      | 2 passed; local data, editing, reset, responsive/keyboard behavior                     |
| TypeScript / production build / static export  | Passed                                                                                 |
| PostgreSQL restart persistence                 | Passed                                                                                 |
| Formatting and diff whitespace                 | Passed                                                                                 |
| npm production dependency audit                | 0 reported vulnerabilities at check time                                               |
| Real Vertex request / model-quality evaluation | Not run: personal GCP project/ADC unavailable; deferred by owner                       |

The assistant tests check identity-derived access, rejection of caller-supplied context, isolation between mentors, no feedback before approval, six concurrent retries producing one feedback record, persistence across application instances, expiration, updates and revocation during generation, and a student update racing with confirmation. Provider errors, invalid references and timeouts leave manual feedback available. Python checks cover tool permissions and budgets, source validation, service authentication, bounded input and metadata-only trace propagation. A 20-case fictional evaluation set is validated structurally; no real-model quality result is claimed.

The mobile review screenshot was inspected after correcting assistant padding; source records, editor, review checkbox and confirmation controls fit at 390 px with no horizontal overflow. Browser screenshots and traces are local test artifacts under `test-results/`. Browser model responses explicitly identify themselves as fixtures.

Commands: `npm run check`, `npm run test:agent:browser`, `PYTHONPATH=services/followup .venv-agent/bin/python -m pytest tests/agent -q`, `npm run build:preview`, `npm run test:preview`, `npm run format:check`, `npm audit --omit=dev --audit-level=high`, `git diff --check`. CI runs the API, ADK and browser suites without cloud credentials. Python tests emit one upstream Starlette/httpx deprecation warning; no test fails.

This work adds the optional service and its integration, not a live AI deployment. Real model behavior, collector delivery, container execution, cloud authentication and distributed load remain unverified. The earlier approximately 40 mentees are historical use, not adoption of this assistant. No resume files were changed.

[Setup and boundaries](FOLLOWUP_AGENT.md)

---

## Previous verification — 2026-10-11 interface and public demo revision

Local environment: macOS/arm64, Node 20.19.4, real disposable PostgreSQL 18 and Playwright Chromium. The full application and browser-only demo are checked separately.

| Check                                   | Result                                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| TypeScript and production Next.js build | Passed                                                                             |
| API/auth tests                          | 13 passed, 0 failed                                                                |
| Database stop/start                     | Saved goals preserved                                                              |
| Full-app browser workflow               | Passed with student, mentor and unrelated-student sessions                         |
| Static export                           | Passed with `/momentum-project` base path                                          |
| Public-demo browser tests               | 2 passed: editing/role switching/isolation/reset, and responsive/keyboard behavior |
| Responsive widths                       | 1440, 768 and 390 px; no horizontal overflow                                       |
| Production dependency audit             | 0 known vulnerabilities at check time                                              |
| Primary text/button/sidebar contrast    | 9 explicitly selected foreground/background pairs pass AA                          |

The full-app journey creates a goal and GROW plan, completes a step, saves a monthly note, sends and accepts an invitation, shares mentor feedback, rejects an unrelated student, and revokes access. Editing another section preserves an unsaved plan draft. API tests verify that the new overview exposes only authorized goals and loses mentor visibility immediately after revocation.

Other API coverage includes missing/forged credentials, roles derived from identity, cross-account writes, input validation, invitation retries, concurrent feedback deduplication and migration reapplication. Eight concurrent copies of a feedback request produce one record. Cognito tests use real RSA signatures and a local JWKS, not a live AWS user pool.

Public-demo tests create records, complete a step, save a GROW plan and check-in, refresh, switch to the mentor perspective, post feedback and reset. A separate browser gets its own fixtures. Responsive checks cover overview, goal and welcome pages; keyboard checks cover dialog focus/Escape and arrow navigation between tabs. No browser runtime errors were observed in these journeys.

Commands: `npm run check`, `npm run build:preview`, `npm run test:preview`, `npm run format:check`, `git diff --check`. [The CI workflow](../.github/workflows/ci.yml) verifies the full app; [the Pages workflow](../.github/workflows/pages.yml) tests the static export before publishing. The older `verification/local-check.log` and `manifest.json` record the previous consolidation revision and are retained as historical evidence. New captures are under `verification/v4/`.

## Boundaries

The public site is a static browser-local demo. It does not demonstrate shared online PostgreSQL state or real-account sign-in. The full backend remains available locally; no paid AWS resources were created. Live Cognito configuration, container execution, backups, load testing and email delivery are not covered by these checks. Earlier use by approximately 40 mentees is historical owner-reported use, not measured adoption of this rebuild.

The original separate repositories remain intact. No resume was changed.

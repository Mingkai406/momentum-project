# Verification — 2026-10-11

The consolidated application was checked locally on macOS/arm64 with Node 20.19.4 and the embedded PostgreSQL 18 distribution. These results concern this code revision, not the stopped historical deployment.

| Check                        | Result                                |
| ---------------------------- | ------------------------------------- |
| TypeScript type checking     | Passed                                |
| API and authentication tests | 12 passed, 0 failed                   |
| Real PostgreSQL stop/start   | Saved goals preserved                 |
| Next.js production build     | Passed                                |
| Chromium end-to-end workflow | Passed                                |
| Mobile viewport              | 390 px wide, no horizontal overflow   |
| Source formatting            | Passed                                |
| npm dependency audit         | 0 known vulnerabilities at check time |
| Git diff whitespace check    | Passed                                |

The browser journey creates a goal and GROW plan, completes a step, saves a monthly note, sends and accepts an invitation, shares mentor feedback, reads it as the student, rejects an unrelated student, and revokes mentor access. It also checks that editing a different part of the page does not erase an unsaved plan draft.

API tests cover missing/forged credentials, server-owned identities and roles, cross-account reads and writes, invitation acceptance/retries, read-only mentor permissions, invalid input, concurrent feedback retries, reapplication of the schema, and retained records across a fresh API/pool. Eight concurrent copies of the same feedback request produce one feedback record. Separate auth tests exercise RSA-signed Cognito-shaped tokens against an in-memory JWKS and reject wrong issuer, client, token type, expired tokens and unverified email.

Commands: `npm run check`, `npm run format:check`, `npm audit --json`, `git diff --check`. Raw final check output is in [local-check.log](verification/local-check.log), dependency results in [dependency-audit.json](verification/dependency-audit.json), and evidence hashes in [manifest.json](verification/manifest.json).

## Not exercised

- A live Cognito user pool or hosted deployment. No AWS resources were changed.
- Container execution: Docker CLI was installed but its daemon was unavailable locally. The API Dockerfile is a deployment recipe, not a tested image claim.
- Load, high availability, disaster recovery, email delivery or historical user analytics.
- Migration from the old database: the owner chose a fresh deployment and no preservation of old online data.

The original frontend, backend and Go repositories remain unchanged. The resume was not edited.

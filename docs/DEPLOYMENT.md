# Deployment

The local workflow runs without cloud resources. This task does not create an AWS user pool, database, public endpoint or paid resources.

## Hosted configuration

1. Provision a **new** PostgreSQL database. The schema in `database/001_initial.sql` is for v3, not an in-place upgrade of legacy data. Use TLS and a dedicated application credential appropriate to your hosting provider.
2. Configure a Cognito user pool with verified email and a public app client (no client secret), supporting the SRP sign-in flow. Create the `mentors` group and assign mentors administratively. Students cannot choose their role. The included forms support sign-up, verification and sign-in; account recovery / MFA enrollment need the provider's recovery flow or additional UI before making them mandatory.
3. Fill the environment variables in `.env.example`. The API and browser must use the same user pool and client. For hosted use, `AUTH_MODE=cognito`, `NODE_ENV=production` and an explicit HTTPS `WEB_ORIGIN` are required operational settings. Never expose demo mode.
4. With `DATABASE_URL` set in your shell/secret manager, run `node scripts/migrate.cjs` against the new database. Keep `RUN_MIGRATIONS=false` for normal application startup. The migration runner applies the schema inside a transaction under an advisory lock; a failure rolls back that attempt.
5. Build the web app with its `NEXT_PUBLIC_*` settings set: `npm ci && npm run build`. Run `npm run start -w @momentum/web -- --port 3000`, or configure your Next.js hosting provider with the repository root as the build context and `apps/web` as the app.
6. Run the API with `node apps/api/server.js`. An optional API container can be built from the **repository root**: `docker build -f apps/api/Dockerfile -t momentum-api .`.
7. Put both services behind HTTPS. Keep PostgreSQL private. `/health` checks connectivity; use external monitoring and configure backups/restore rehearsals before inviting real users.

Do not copy API-only credentials into `NEXT_PUBLIC_*` variables. Public Cognito client/pool identifiers are configuration, not client secrets. The code does not disable certificate verification. The API does not trust forwarded IP headers by default; configure a specific trusted proxy only after reviewing the actual deployment path, so IP-based rate limits remain meaningful.

## Local data

`npm run dev` persists its own PostgreSQL cluster under `.local/`. It generates its local database password and demo signing secret without using AWS credentials. To start over, stop the process and remove only this repository's `.local/` directory. That directory is ignored by Git. The E2E and API tests use their own temporary clusters and remove them afterward.

Local ports default to 3000 (web) and 3001 (API). Override `WEB_PORT` and `API_PORT` if occupied. PostgreSQL uses an available loopback port automatically. Local startup currently targets macOS/Linux and an unprivileged user, not root containers.

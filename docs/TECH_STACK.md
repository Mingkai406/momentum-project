# Momentum Current Tech Stack (Code-Verified)

Snapshot date: 2026-03-31

## momentum-frontend

- Language/runtime: TypeScript, React 19, Next.js 15 (`src/`, `package.json`)
- Frameworks/libraries:
  - `next`, `react`, `react-dom`
  - `tailwindcss` v4 + `@tailwindcss/postcss`
  - `aws-amplify`, `amazon-cognito-identity-js`, `@aws-amplify/ui-react`
- Data/auth:
  - No direct DB access in frontend
  - Auth handled client-side with Amazon Cognito (`src/lib/auth.ts`, `src/lib/amplifyConfig.ts`)
  - App data fetched from backend REST API (`src/lib/api.ts`)
- Build/run commands (from `package.json`):
  - `npm run dev`
  - `npm run build`
  - `npm run start`
- Environment/config clues:
  - Backend base URL: `NEXT_PUBLIC_API_URL`, fallback to `http://localhost:3001` in `src/lib/api.ts`
  - One code path does **not** use fallback (`src/app/mentor/dashboard/page.tsx` direct `process.env.NEXT_PUBLIC_API_URL` fetch)
- CI/CD clues:
  - No `.github/workflows` found
- Deployment clues:
  - Standard Next.js README includes Vercel deployment guidance
  - No Dockerfile in this repo
- Notes:
  - Cognito config appears in two places with different pool/client IDs (`src/lib/auth.ts` vs `src/lib/amplifyConfig.ts`)

## momentum-backend

- Language/runtime: JavaScript on Node.js (`server.js`, `routes/*.js`)
- Frameworks/libraries:
  - `express` 5
  - `pg` (PostgreSQL driver)
  - `dotenv`, `cors`, `helmet`, `morgan`
- Data/auth:
  - PostgreSQL via `DATABASE_URL` (`config/database.js`)
  - Single SQL migration file defines schema (`migrations/001_create_gsm_tables.sql`)
  - No JWT/session verification middleware present; APIs trust `user_id` from request body/path
- Build/run commands:
  - `node server.js` (main server)
  - `node run-migration.js` (schema setup)
  - `bash test-api.sh` (local API smoke test)
  - `bash test-production.sh` (production API smoke test)
  - `npm test` currently exits with placeholder error
- Environment/config clues:
  - `PORT` default `3001`
  - `DATABASE_URL` required for DB connectivity
- CI/CD clues:
  - No `.github/workflows` found
- Deployment clues:
  - Dockerfile present (`node:18-alpine`, exposes `3001`, includes healthcheck)
  - `test-production.sh` targets Render URL: `https://momentum-backend-m4u6.onrender.com`

## momentum-go-service

- Language/runtime: Go 1.21 (`go.mod`, `main.go`)
- Frameworks/libraries:
  - Go standard library only (`net/http`, `sync`, `encoding/json`, etc.)
- Data/auth:
  - In-memory task store (`Scheduler.tasks`)
  - No external DB driver, no auth layer
- Build/run commands:
  - `go run main.go`
  - `go build ./...` currently fails due `undefined: rootHandler` in `main.go`
- Environment/config clues:
  - `PORT` default `8080`
  - `NODE_ID` optional (defaults to `node-1`)
- CI/CD clues:
  - No `.github/workflows` found
- Deployment clues:
  - Multi-stage Dockerfile present, exposes `8080`

## momentum-project

- Role: project-level documentation/coordination repo (currently `README.md` only plus generated docs)
- Language/runtime: Markdown docs only
- Frameworks/dependencies: none in repo
- DB/auth: none
- Build/run commands: none defined
- CI/CD clues:
  - No `.github/workflows` found
- Deployment clues:
  - README references Vercel/Render deployment and GitHub Actions, but no workflow files are present in this workspace snapshot

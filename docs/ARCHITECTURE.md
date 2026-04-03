# Momentum Current Architecture (Code-Verified)

Snapshot date: 2026-03-31

## 1) Service Boundaries and Responsibilities

- `momentum-frontend` (Next.js client app)
  - Handles UI routes (`/login`, `/student/dashboard`, `/mentor/dashboard`)
  - Performs Cognito sign-up/sign-in/email confirmation on client
  - Calls backend REST APIs for roles, goals, profile, mentor features

- `momentum-backend` (Express API)
  - Exposes REST endpoints under `/api/users`, `/api/goals`, `/api/mentor`
  - Owns PostgreSQL persistence for users/roles/goals/GROW/steps/checkpoints/mentoring
  - Returns profile aggregates (counts for goals/steps/mentor activity)

- `momentum-go-service` (Go HTTP scheduler)
  - Exposes `/health`, `/schedule`, `/status`, `/distribute`
  - Maintains in-memory task list and node metadata (`NODE_ID`)
  - No DB integration in current code

- `momentum-project`
  - Documentation/meta repository (no runtime service)

## 2) Frontend -> Backend Integration

### Base URL

- Primary API wrapper uses:
  - `const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'`
  - File: `momentum-frontend/src/lib/api.ts`

- One direct fetch path bypasses fallback:
  - `fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/search-by-email`, ...)`
  - File: `momentum-frontend/src/app/mentor/dashboard/page.tsx`

### Routes Called by Frontend

- User APIs
  - `POST /api/users/role`
  - `GET /api/users/:userId/role`
  - `GET /api/users/:userId/profile`
  - `POST /api/users/search-by-email` (used directly in mentor dashboard)

- Goal APIs
  - `GET /api/goals/user/:userId`
  - `POST /api/goals`
  - `GET /api/goals/:goalId/grow`
  - `POST /api/goals/:goalId/grow`
  - `GET /api/goals/:goalId/steps`
  - `POST /api/goals/:goalId/steps`
  - `PATCH /api/goals/steps/:stepId`

- Mentor APIs
  - `GET /api/mentor/:mentorId/mentees`
  - `GET /api/mentor/mentee/:menteeId/goals`
  - `GET /api/mentor/goal/:goalId/details`
  - `POST /api/mentor/feedback`
  - `POST /api/mentor/relationship`

### Auth Flow (Current)

- Frontend uses Cognito directly (`amazon-cognito-identity-js`): sign-up, confirm code, sign-in.
- After sign-in, frontend decodes Cognito ID token payload to obtain `sub` (user ID).
- Frontend then calls backend user-role endpoints with `user_id` and `email`.
- Backend currently does not validate Cognito JWTs on incoming API requests; no auth middleware found.

## 3) Backend <-> Go Service Integration (Current Reality)

- No active HTTP calls from `momentum-backend` to `momentum-go-service` were found.
- No queue/worker/scheduled-job integration found in backend code.
- No shared datastore path found:
  - Backend uses PostgreSQL (`pg`)
  - Go service uses in-memory slices only
- Legacy clue: `momentum-backend/server.js.backup` contains an old `/api/schedule` stub, but this file is not used by current `server.js`.

## 4) Data Model Overview

Defined in: `momentum-backend/migrations/001_create_gsm_tables.sql`

- `user_roles`
  - Maps Cognito `user_id` + `email` to role (`student`/`mentor`)
  - Used by `routes/users.js`, `routes/mentor.js`

- `mentor_mentee`
  - Relationship table between mentor and mentee user IDs
  - Used by `routes/mentor.js`, mentor stats in `routes/users.js`

- `goals`
  - User goals (`goal_number`, title/description/category)
  - Used by `routes/goals.js`, `routes/mentor.js`, profile aggregates in `routes/users.js`

- `grow_analysis`
  - Goal-level GROW text fields
  - Used by `routes/goals.js`, `routes/mentor.js`

- `action_steps`
  - Ordered steps per goal + completion state
  - Used by `routes/goals.js`, `routes/mentor.js`, profile aggregates in `routes/users.js`

- `monthly_checkpoints`
  - Month-level checkpoints/progress notes per goal
  - Used by `routes/goals.js`, `routes/mentor.js`

- `mentor_feedback`
  - Mentor comments attached to goals
  - Used by `routes/mentor.js`, mentor stats in `routes/users.js`

## 5) System Diagram (Text)

```text
[Browser]
   |
   v
[Next.js Frontend (momentum-frontend)]
   |  REST calls to /api/*
   v
[Express Backend (momentum-backend)]
   |  SQL via pg
   v
[PostgreSQL]

[Go Service (momentum-go-service)]
   - Standalone HTTP service (/health, /schedule, /status, /distribute)
   - In-memory task state
   - No active integration path to backend/frontend in current code
```

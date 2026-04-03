# Momentum Entrypoints and Core Request Flows

Snapshot date: 2026-03-31

## 1) Files to Read First

### momentum-frontend

- `momentum-frontend/src/app/layout.tsx`
  - App Router root layout and provider mounting
- `momentum-frontend/src/app/page.tsx`
  - Initial redirect logic (`/login` vs dashboard)
- `momentum-frontend/src/app/login/page.tsx`
  - Main auth/onboarding flow (sign up, confirm, sign in, role routing)
- `momentum-frontend/src/lib/auth.ts`
  - Cognito user pool wrappers (`signUp`, `confirmSignUp`, `signIn`, `getCurrentUser`)
- `momentum-frontend/src/lib/api.ts`
  - All shared backend API client methods and base URL behavior
- `momentum-frontend/src/app/student/dashboard/page.tsx`
  - Core student workflow: profile/goals load and goal creation
- `momentum-frontend/src/app/mentor/dashboard/page.tsx`
  - Core mentor workflow: mentee search, relationship creation, mentee goal view

### momentum-backend

- `momentum-backend/server.js`
  - Express app setup, middleware, route mounting, API docs endpoint
- `momentum-backend/config/database.js`
  - PostgreSQL connection pool (`DATABASE_URL`)
- `momentum-backend/routes/users.js`
  - User role upsert, role lookup, profile aggregates, search-by-email
- `momentum-backend/routes/goals.js`
  - Goal/GROW/steps/checkpoints CRUD APIs
- `momentum-backend/routes/mentor.js`
  - Mentor-mentee relationships, mentee goal views, mentor feedback
- `momentum-backend/migrations/001_create_gsm_tables.sql`
  - Canonical DB schema
- `momentum-backend/run-migration.js`
  - Migration execution script

### momentum-go-service

- `momentum-go-service/main.go`
  - Entire service behavior: handlers, scheduler state, env config
- `momentum-go-service/go.mod`
  - Go module/runtime version
- `momentum-go-service/Dockerfile`
  - Container build/run strategy

### momentum-project

- `momentum-project/README.md`
  - Project-level narrative/deployment references
- `momentum-project/docs/` (generated)
  - Current-state technical inventory and architecture docs

## 2) Request Flow Walkthroughs

### Flow A: Sign-Up -> Confirm -> Role Setup -> Role-Based Dashboard

1. User submits sign-up in `momentum-frontend/src/app/login/page.tsx` (`handleSubmit`).
2. Frontend calls Cognito `signUp(email, password)` via `momentum-frontend/src/lib/auth.ts`.
3. User enters confirmation code; frontend calls `confirmSignUp(email, code)` and then `signIn(email, password)`.
4. Frontend decodes Cognito ID token payload, extracts `sub` as `cognitoUserId`.
5. Frontend calls backend `POST /api/users/role` via `userAPI.setRole` (`momentum-frontend/src/lib/api.ts`).
6. Backend upserts into `user_roles` (`momentum-backend/routes/users.js`).
7. Frontend routes to `/student/dashboard` or `/mentor/dashboard` based on selected/stored role.

### Flow B: Student Dashboard Load + Create Goal

1. `momentum-frontend/src/app/student/dashboard/page.tsx` calls `getCurrentUser()` and Cognito `getSession()`.
2. Frontend extracts user ID from token payload and email from user attributes.
3. Frontend concurrently requests:
   - `GET /api/users/:userId/profile`
   - `GET /api/goals/user/:userId`
4. Backend:
   - `routes/users.js` computes profile stats from `goals` + `action_steps` (+ mentor stats when role is mentor)
   - `routes/goals.js` returns ordered goals list
5. User creates a new goal in dashboard modal; frontend posts `POST /api/goals`.
6. Backend inserts into `goals` table and returns created row.
7. Frontend appends returned goal to local state and re-renders goal list.

## 3) Current-State Gaps Relevant to Entrypoints

- Frontend links to detail pages (`/student/goals/:id`, `/mentor/goals/:id`) from dashboard files, but those route files are not present in current `src/app` tree.
- `momentum-go-service/main.go` references `rootHandler` but no definition exists in the file; `go build` currently fails.

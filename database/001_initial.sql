-- Fresh v3 database only. Legacy databases require a separately reviewed migration.
CREATE TABLE IF NOT EXISTS users (
 id text PRIMARY KEY, email text NOT NULL, role text NOT NULL CHECK(role IN ('student','mentor')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(lower(email));
CREATE TABLE IF NOT EXISTS relationships (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 mentor_id text NOT NULL REFERENCES users(id), student_email text NOT NULL,
 student_id text REFERENCES users(id), status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(mentor_id,student_email), CHECK(mentor_id IS DISTINCT FROM student_id)
);
CREATE TABLE IF NOT EXISTS goals (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 owner_id text NOT NULL REFERENCES users(id), title text NOT NULL CHECK(length(title) BETWEEN 1 AND 180),
 description text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS goals_owner ON goals(owner_id);
CREATE INDEX IF NOT EXISTS relationships_student ON relationships(student_id);
CREATE TABLE IF NOT EXISTS grow (
 goal_id integer PRIMARY KEY REFERENCES goals(id) ON DELETE CASCADE,
 goal text NOT NULL DEFAULT '', reality text NOT NULL DEFAULT '', options text NOT NULL DEFAULT '', will text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS steps (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, goal_id integer NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
 description text NOT NULL CHECK(length(description) BETWEEN 1 AND 500), completed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS checkpoints (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, goal_id integer NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
 month text NOT NULL CHECK(month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'), notes text NOT NULL CHECK(length(notes) BETWEEN 1 AND 4000),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(goal_id,month)
);
CREATE TABLE IF NOT EXISTS feedback (
 id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY, goal_id integer NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
 mentor_id text NOT NULL REFERENCES users(id), body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000),
 request_id uuid NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(mentor_id,request_id)
);

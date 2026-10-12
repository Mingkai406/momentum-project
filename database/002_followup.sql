-- Additive, rerunnable migration. Existing goals and feedback are retained.
ALTER TABLE goals ADD COLUMN IF NOT EXISTS revision bigint NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS followup_drafts (
 id uuid PRIMARY KEY,
 goal_id integer NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
 mentor_id text NOT NULL REFERENCES users(id),
 source_revision bigint NOT NULL,
 result jsonb NOT NULL,
 trace_id text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now() + interval '24 hours',
 feedback_id integer REFERENCES feedback(id),
 confirmed_body text,
 confirmed_at timestamptz
);
CREATE INDEX IF NOT EXISTS followup_drafts_owner ON followup_drafts(mentor_id, goal_id);
-- Updating the parent serializes context writes against draft confirmation.
CREATE OR REPLACE FUNCTION bump_goal_revision() RETURNS trigger AS $$
BEGIN
 UPDATE goals SET revision=revision+1 WHERE id=COALESCE(NEW.goal_id, OLD.goal_id);
 RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS grow_revision ON grow;
CREATE TRIGGER grow_revision BEFORE INSERT OR UPDATE OR DELETE ON grow FOR EACH ROW EXECUTE FUNCTION bump_goal_revision();
DROP TRIGGER IF EXISTS steps_revision ON steps;
CREATE TRIGGER steps_revision BEFORE INSERT OR UPDATE OR DELETE ON steps FOR EACH ROW EXECUTE FUNCTION bump_goal_revision();
DROP TRIGGER IF EXISTS checkpoints_revision ON checkpoints;
CREATE TRIGGER checkpoints_revision BEFORE INSERT OR UPDATE OR DELETE ON checkpoints FOR EACH ROW EXECUTE FUNCTION bump_goal_revision();
DROP TRIGGER IF EXISTS feedback_revision ON feedback;
CREATE TRIGGER feedback_revision BEFORE INSERT OR UPDATE OR DELETE ON feedback FOR EACH ROW EXECUTE FUNCTION bump_goal_revision();

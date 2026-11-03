CREATE TABLE IF NOT EXISTS courses (
 id uuid PRIMARY KEY, title text NOT NULL, category text NOT NULL, description text NOT NULL,
 goals text NOT NULL, status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused','completed')),
 config jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS lessons (
 id uuid PRIMARY KEY, course_id uuid NOT NULL REFERENCES courses(id), number integer NOT NULL CHECK(number>0),
 stage text NOT NULL, title text NOT NULL, content text NOT NULL, quiz jsonb NOT NULL, revision integer NOT NULL DEFAULT 1,
 published_at timestamptz, completed_at timestamptz, next_release_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(course_id,number)
);
CREATE TABLE IF NOT EXISTS submissions (
 id uuid PRIMARY KEY, lesson_id uuid NOT NULL REFERENCES lessons(id), operation_id uuid NOT NULL UNIQUE,
 lesson_revision integer NOT NULL, quiz_snapshot jsonb NOT NULL, answers jsonb NOT NULL,
 submitted_at timestamptz NOT NULL DEFAULT now(), reviewed_at timestamptz,
 review jsonb, score numeric, passed boolean, UNIQUE(lesson_id,id)
);
CREATE INDEX IF NOT EXISTS submissions_pending ON submissions(submitted_at) WHERE reviewed_at IS NULL;
CREATE TABLE IF NOT EXISTS questions (
 id uuid PRIMARY KEY, lesson_id uuid NOT NULL REFERENCES lessons(id), parent_id uuid REFERENCES questions(id),
 operation_id uuid NOT NULL UNIQUE, question text NOT NULL, answer text,
 created_at timestamptz NOT NULL DEFAULT now(), answered_at timestamptz
);
CREATE TABLE IF NOT EXISTS study_events (
 id uuid PRIMARY KEY, operation_id uuid NOT NULL UNIQUE, action text NOT NULL, subject_id uuid,
 details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS platform_migrations (
 version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO platform_migrations(version) VALUES('002-platform') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS lesson_versions (
 lesson_id uuid NOT NULL REFERENCES lessons(id), revision integer NOT NULL,
 snapshot jsonb NOT NULL, saved_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(lesson_id,revision)
);

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS config_snapshot jsonb;

-- Historical records preserve date-only evidence without invented submission/completion timestamps.
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS history jsonb;

-- Recoverable course deletion; all learning records remain intact.
ALTER TABLE courses ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE TABLE IF NOT EXISTS course_requests (
 id uuid PRIMARY KEY,course_id uuid NOT NULL UNIQUE REFERENCES courses(id),requirements jsonb NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','ready')),
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE course_requests ADD COLUMN IF NOT EXISTS automation jsonb NOT NULL DEFAULT '{}';

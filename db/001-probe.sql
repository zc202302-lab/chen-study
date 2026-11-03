CREATE TABLE IF NOT EXISTS work_probe (
 id text PRIMARY KEY, title text NOT NULL, lesson integer NOT NULL,
 status text NOT NULL CHECK(status IN ('pending','completed')),
 version integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS probe_runs (
 operation_id uuid PRIMARY KEY, course_id text NOT NULL REFERENCES work_probe(id),
 previous_status text NOT NULL, new_status text NOT NULL, record_version integer NOT NULL,
 outcome text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO work_probe(id,title,lesson,status) VALUES('work-test-001','Work通信验证课程（虚构数据）',1,'pending') ON CONFLICT DO NOTHING;

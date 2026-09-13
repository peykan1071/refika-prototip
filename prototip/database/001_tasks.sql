-- PostgreSQL migration candidate. NOT connected to the browser demo.
-- Apply using a migration owner only. Application login must be NOSUPERUSER
-- NOBYPASSRLS and must not own these tables. No access policies are granted
-- until server-side identity verification and institutional scopes are wired.
BEGIN;
CREATE SCHEMA refika;
REVOKE ALL ON SCHEMA refika FROM PUBLIC;

CREATE TABLE refika.workspaces (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(trim(name)) > 0),
  region_code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE refika.memberships (
  workspace_id uuid NOT NULL REFERENCES refika.workspaces(id),
  user_id uuid NOT NULL, -- trusted identity provider subject mapping
  role text NOT NULL CHECK (role IN ('coordinator','staff','mentor','reader')),
  active boolean NOT NULL DEFAULT true,
  PRIMARY KEY (workspace_id,user_id)
);
CREATE TABLE refika.tasks (
  id uuid PRIMARY KEY,
  workspace_id uuid NOT NULL REFERENCES refika.workspaces(id),
  kind text NOT NULL CHECK (kind IN ('visit','training','mentoring','project_support','validation')),
  title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 4000),
  purpose text NOT NULL CHECK (length(trim(purpose)) BETWEEN 1 AND 4000),
  school_label text NOT NULL CHECK (length(trim(school_label)) BETWEEN 1 AND 4000),
  district text NOT NULL DEFAULT '',
  scheduled_date date NOT NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','completed')),
  next_step text NOT NULL DEFAULT '',
  result text NOT NULL DEFAULT '',
  evidence_note text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  UNIQUE (workspace_id,id),
  FOREIGN KEY (workspace_id,created_by) REFERENCES refika.memberships(workspace_id,user_id),
  CHECK (updated_at >= created_at),
  CHECK ((status='planned' AND completed_at IS NULL) OR
         (status='completed' AND completed_at IS NOT NULL AND completed_at >= created_at AND length(trim(result)) > 0))
);
CREATE TABLE refika.task_assignments (
  workspace_id uuid NOT NULL,
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  PRIMARY KEY (workspace_id,task_id,user_id),
  FOREIGN KEY (workspace_id,task_id) REFERENCES refika.tasks(workspace_id,id),
  FOREIGN KEY (workspace_id,user_id) REFERENCES refika.memberships(workspace_id,user_id)
);
CREATE INDEX tasks_workspace_date ON refika.tasks(workspace_id,scheduled_date);
ALTER TABLE refika.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE refika.workspaces FORCE ROW LEVEL SECURITY;
ALTER TABLE refika.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE refika.memberships FORCE ROW LEVEL SECURITY;
ALTER TABLE refika.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE refika.tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE refika.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refika.task_assignments FORCE ROW LEVEL SECURITY;
REVOKE ALL ON ALL TABLES IN SCHEMA refika FROM PUBLIC;
COMMIT;

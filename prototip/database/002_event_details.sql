-- PostgreSQL migration candidate. Apply only after 001_tasks.sql.
BEGIN;
CREATE TABLE refika.event_details (
  workspace_id uuid NOT NULL,
  task_id uuid NOT NULL,
  event_kind text NOT NULL CHECK (event_kind IN ('Çalıştay','Eğitim','Webinar','Toplantı')),
  delivery_mode text NOT NULL CHECK (delivery_mode IN ('Yüz yüze','Çevrim içi','Hibrit')),
  audience text NOT NULL CHECK (length(trim(audience)) BETWEEN 1 AND 4000),
  venue text NOT NULL DEFAULT '',
  planned_participants integer NOT NULL CHECK (planned_participants BETWEEN 1 AND 100000),
  actual_participants integer CHECK (actual_participants BETWEEN 0 AND 100000),
  PRIMARY KEY (workspace_id, task_id),
  FOREIGN KEY (workspace_id, task_id) REFERENCES refika.tasks(workspace_id, id)
);
ALTER TABLE refika.event_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE refika.event_details FORCE ROW LEVEL SECURITY;
REVOKE ALL ON refika.event_details FROM PUBLIC;
COMMIT;

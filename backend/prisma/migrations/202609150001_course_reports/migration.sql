CREATE TABLE "course_reports" (
  "report_id" UUID NOT NULL,
  "course_id" UUID NOT NULL,
  "reporter_id" UUID NOT NULL,
  "reason" VARCHAR(2000) NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_at" TIMESTAMPTZ,
  "reviewed_by_id" UUID,
  CONSTRAINT "course_reports_pkey" PRIMARY KEY ("report_id"),
  CONSTRAINT "course_reports_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("course_id"),
  CONSTRAINT "course_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "users"("user_id"),
  CONSTRAINT "course_reports_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("user_id")
);
CREATE UNIQUE INDEX "course_reports_course_id_reporter_id_key" ON "course_reports"("course_id", "reporter_id");
CREATE INDEX "course_reports_reviewed_at_created_at_idx" ON "course_reports"("reviewed_at", "created_at");

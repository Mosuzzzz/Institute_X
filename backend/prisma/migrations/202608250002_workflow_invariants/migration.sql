-- Prevent concurrent requests from creating multiple pending permission states.
CREATE UNIQUE INDEX "teacher_permission_requests_one_pending_per_teacher"
ON "teacher_permission_requests" ("teacher_id")
WHERE status = 'PENDING';

-- A Course can have only one revision being authored or reviewed at a time.
CREATE UNIQUE INDEX "course_versions_one_active_revision_per_course"
ON "course_versions" ("course_id")
WHERE status IN ('DRAFT', 'SUBMITTED', 'REJECTED');

-- Student-facing reads must resolve to exactly one currently published Version.
CREATE UNIQUE INDEX "course_versions_one_published_per_course"
ON "course_versions" ("course_id")
WHERE status = 'PUBLISHED';

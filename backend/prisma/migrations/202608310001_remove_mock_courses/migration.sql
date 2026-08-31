-- Remove the ten fixed-ID development Courses that were previously seeded.
-- User-created Courses use random UUIDs and are not affected.

DELETE FROM "public"."quiz_attempts"
WHERE "quiz_id" IN (
  SELECT quiz."quiz_id"
  FROM "public"."quizzes" AS quiz
  JOIN "public"."course_versions" AS version
    ON version."version_id" = quiz."version_id"
  WHERE version."course_id"::text LIKE '30000000-0000-4000-8000-%'
);

DELETE FROM "public"."course_enrollments"
WHERE "course_id"::text LIKE '30000000-0000-4000-8000-%';

DELETE FROM "public"."course_access_events"
WHERE "course_id"::text LIKE '30000000-0000-4000-8000-%';

DELETE FROM "public"."course_version_reviews"
WHERE "version_id" IN (
  SELECT "version_id"
  FROM "public"."course_versions"
  WHERE "course_id"::text LIKE '30000000-0000-4000-8000-%'
);

DELETE FROM "public"."course_versions"
WHERE "course_id"::text LIKE '30000000-0000-4000-8000-%';

DELETE FROM "public"."courses"
WHERE "course_id"::text LIKE '30000000-0000-4000-8000-%';

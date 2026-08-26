-- Replace the legacy Computer Science eligibility with the vocational BTECH ICT Major.
-- Copy Course eligibility first so deployments with existing CS Courses retain access safely.
INSERT INTO "public"."course_allowed_majors" ("course_id", "major_id")
SELECT allowed."course_id", replacement_major."major_id"
FROM "public"."course_allowed_majors" AS allowed
JOIN "public"."majors" AS legacy_major
  ON allowed."major_id" = legacy_major."major_id"
JOIN "public"."majors" AS replacement_major
  ON replacement_major."major_code" = 'BTECH-ICT'
WHERE legacy_major."major_code" = 'CS'
ON CONFLICT ("course_id", "major_id") DO NOTHING;

DELETE FROM "public"."course_allowed_majors" AS allowed
USING "public"."majors" AS legacy_major
WHERE legacy_major."major_code" = 'CS'
  AND allowed."major_id" = legacy_major."major_id";

UPDATE "public"."users" AS student
SET "major_id" = replacement_major."major_id"
FROM "public"."majors" AS legacy_major,
     "public"."majors" AS replacement_major
WHERE legacy_major."major_code" = 'CS'
  AND replacement_major."major_code" = 'BTECH-ICT'
  AND student."major_id" = legacy_major."major_id";

DELETE FROM "public"."majors"
WHERE "major_code" = 'CS';

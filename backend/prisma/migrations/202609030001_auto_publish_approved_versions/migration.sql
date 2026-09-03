-- Reconcile Versions left in the former manual-publication state.
-- Keep only the newest APPROVED Version per Course as the publication candidate.
WITH "ranked_approved" AS (
  SELECT
    "version_id",
    ROW_NUMBER() OVER (
      PARTITION BY "course_id"
      ORDER BY "version_number" DESC, "created_at" DESC
    ) AS "approval_rank"
  FROM "public"."course_versions"
  WHERE "status" = 'APPROVED'
)
UPDATE "public"."course_versions" AS "version"
SET "status" = 'SUPERSEDED'
FROM "ranked_approved"
WHERE "version"."version_id" = "ranked_approved"."version_id"
  AND "ranked_approved"."approval_rank" > 1;

-- Clear the one-published-Version constraint before promoting the approved revision.
UPDATE "public"."course_versions" AS "published"
SET "status" = 'SUPERSEDED'
WHERE "published"."status" = 'PUBLISHED'
  AND EXISTS (
    SELECT 1
    FROM "public"."course_versions" AS "approved"
    WHERE "approved"."course_id" = "published"."course_id"
      AND "approved"."status" = 'APPROVED'
  );

UPDATE "public"."course_versions"
SET "status" = 'PUBLISHED',
  "published_at" = COALESCE("published_at", CURRENT_TIMESTAMP),
  "updated_at" = CURRENT_TIMESTAMP
WHERE "status" = 'APPROVED';

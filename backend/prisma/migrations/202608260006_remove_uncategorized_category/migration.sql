-- Remove any legacy fallback links first so this remains safe in every environment.
DELETE FROM "public"."course_categories"
WHERE "category_id" IN (
  SELECT "category_id"
  FROM "public"."categories"
  WHERE "slug" = 'uncategorized'
);

DELETE FROM "public"."categories"
WHERE "slug" = 'uncategorized';

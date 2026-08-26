-- Seed the first Thai Course discovery categories.
INSERT INTO "public"."categories" (
  "category_id",
  "slug",
  "name",
  "created_at",
  "updated_at"
)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'mathematics', 'คณิตศาสตร์', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000002', 'japanese', 'ภาษาญี่ปุ่น', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000003', 'technology', 'เทคโนโลยี', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

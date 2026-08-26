-- Expand Course discovery categories for general and vocational learning areas.
INSERT INTO "public"."categories" (
  "category_id",
  "slug",
  "name",
  "created_at",
  "updated_at"
)
VALUES
  ('10000000-0000-4000-8000-000000000004', 'science', 'วิทยาศาสตร์', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000005', 'english', 'ภาษาอังกฤษ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000006', 'chinese', 'ภาษาจีน', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000007', 'korean', 'ภาษาเกาหลี', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000008', 'thai-language', 'ภาษาไทย', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000009', 'business-accounting', 'ธุรกิจและการบัญชี', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000010', 'design-arts', 'การออกแบบและศิลปะ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000011', 'industry-engineering', 'อุตสาหกรรมและวิศวกรรม', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000012', 'agriculture', 'เกษตรกรรม', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000013', 'tourism-hospitality', 'การท่องเที่ยวและการบริการ', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000014', 'health-physical-education', 'สุขภาพและพลศึกษา', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('10000000-0000-4000-8000-000000000015', 'personal-development', 'การพัฒนาตนเอง', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

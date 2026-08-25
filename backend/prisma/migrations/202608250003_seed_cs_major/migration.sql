-- Seed the Major returned by the local Mock SSO fixture.
-- The conflict clause makes this safe when CS already exists in an Institute dataset.
INSERT INTO "public"."majors" ("major_id", "major_code", "major_name")
VALUES ('00000000-0000-4000-8000-000000000001', 'CS', 'Computer Science')
ON CONFLICT ("major_code") DO NOTHING;

-- Store the institutional login name separately from the display name.
-- Existing identities use their stable SSO subject as the initial username.
ALTER TABLE "public"."users" ADD COLUMN "username" VARCHAR(255);

UPDATE "public"."users"
SET "username" = "sso_subject"
WHERE "username" IS NULL;

ALTER TABLE "public"."users" ALTER COLUMN "username" SET NOT NULL;

CREATE UNIQUE INDEX "users_username_key" ON "public"."users"("username");

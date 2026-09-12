CREATE TABLE "public"."email_otps" (
  "otp_id" UUID NOT NULL,
  "email" VARCHAR(320) NOT NULL,
  "otp_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "requested_by" CHAR(64),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "email_otps_pkey" PRIMARY KEY ("otp_id")
);

CREATE TABLE "public"."role_change_audits" (
  "audit_id" UUID NOT NULL,
  "actor_id" UUID NOT NULL,
  "target_user_id" UUID NOT NULL,
  "old_roles" "public"."UserRole"[] NOT NULL,
  "new_roles" "public"."UserRole"[] NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_change_audits_pkey" PRIMARY KEY ("audit_id")
);

ALTER TABLE "public"."users" ADD COLUMN "email_verified_at" TIMESTAMPTZ;
-- Legacy users must verify their institutional mailbox before retaining access.
DELETE FROM "public"."auth_sessions";
ALTER TABLE "public"."users" DROP COLUMN "username";
ALTER TABLE "public"."users" DROP COLUMN "password_hash";

CREATE INDEX "email_otps_email_created_at_idx" ON "public"."email_otps"("email", "created_at");
CREATE INDEX "email_otps_expires_at_idx" ON "public"."email_otps"("expires_at");
CREATE INDEX "role_change_audits_actor_id_created_at_idx" ON "public"."role_change_audits"("actor_id", "created_at");
CREATE INDEX "role_change_audits_target_user_id_created_at_idx" ON "public"."role_change_audits"("target_user_id", "created_at");

ALTER TABLE "public"."role_change_audits"
  ADD CONSTRAINT "role_change_audits_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "role_change_audits_target_user_id_fkey" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

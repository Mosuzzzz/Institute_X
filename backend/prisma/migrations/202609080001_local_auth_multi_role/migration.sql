-- Replace the SSO-owned, single-role account with local credentials and role assignments.
ALTER TYPE "UserRole" RENAME VALUE 'OWNER' TO 'EXECUTIVE';

ALTER TABLE "users" ADD COLUMN "password_hash" VARCHAR(512) NOT NULL DEFAULT 'disabled$no-local-password';

CREATE TABLE "user_roles" (
  "user_id" UUID NOT NULL,
  "role" "UserRole" NOT NULL,
  "assigned_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id", "role"),
  CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE
);

INSERT INTO "user_roles" ("user_id", "role")
SELECT "user_id", "role" FROM "users";

CREATE INDEX "user_roles_role_idx" ON "user_roles"("role");

CREATE TABLE "auth_sessions" (
  "session_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "token_hash" CHAR(64) NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("session_id"),
  CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "auth_sessions_token_hash_key" ON "auth_sessions"("token_hash");
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");

-- Existing SSO accounts have no recoverable password. Keep them inactive until an
-- administrator resets a credential; newly-created accounts always receive a hash.
UPDATE "users" SET "password_hash" = 'disabled$legacy-sso-account', "account_status" = 'INACTIVE';
ALTER TABLE "users" DROP COLUMN "role";
ALTER TABLE "users" DROP COLUMN "sso_subject";
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP DEFAULT;

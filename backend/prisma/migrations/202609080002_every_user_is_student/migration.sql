-- STUDENT is the baseline role for every account. Additional roles grant access
-- to extra workspaces without replacing the user's learner access.
INSERT INTO "user_roles" ("user_id", "role")
SELECT "user_id", 'STUDENT'::"UserRole"
FROM "users"
ON CONFLICT ("user_id", "role") DO NOTHING;

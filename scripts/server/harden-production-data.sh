#!/usr/bin/env bash
set -Eeuo pipefail

[[ ${EUID} -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
ENV_FILE=/etc/institute-x/production.env
[[ -r ${ENV_FILE} ]] || { echo "Missing ${ENV_FILE}." >&2; exit 1; }
set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

app_user=institute_x_app
migrate_user=institute_x_migrate
app_password=$(openssl rand -hex 24)
migrate_password=$(openssl rand -hex 24)
s3_user=institute-x-app
s3_password=$(openssl rand -hex 24)

psql_admin=(docker exec -i institute_x-postgres-1 psql --username "${POSTGRES_USER:-institute_x}" --dbname "${POSTGRES_DB:-institute_x}" -v ON_ERROR_STOP=1)
"${psql_admin[@]}" <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${app_user}') THEN
    CREATE ROLE ${app_user} LOGIN PASSWORD '${app_password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  ELSE
    ALTER ROLE ${app_user} WITH LOGIN PASSWORD '${app_password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${migrate_user}') THEN
    CREATE ROLE ${migrate_user} LOGIN PASSWORD '${migrate_password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  ELSE
    ALTER ROLE ${migrate_user} WITH LOGIN PASSWORD '${migrate_password}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END \$\$;
ALTER DATABASE ${POSTGRES_DB:-institute_x} OWNER TO ${migrate_user};
ALTER SCHEMA public OWNER TO ${migrate_user};
GRANT CONNECT ON DATABASE ${POSTGRES_DB:-institute_x} TO ${app_user};
GRANT USAGE ON SCHEMA public TO ${app_user};
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${app_user};
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO ${app_user};
ALTER DEFAULT PRIVILEGES FOR ROLE ${migrate_user} IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${app_user};
ALTER DEFAULT PRIVILEGES FOR ROLE ${migrate_user} IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO ${app_user};
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
SQL

# Existing objects must belong to the migration role so future Prisma migrations
# can alter them without granting superuser privileges.
"${psql_admin[@]}" --tuples-only --no-align --command \
  "SELECT format('ALTER %s %I.%I OWNER TO ${migrate_user};', CASE c.relkind WHEN 'S' THEN 'SEQUENCE' ELSE 'TABLE' END, n.nspname, c.relname) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','S','v','m');" \
  | "${psql_admin[@]}"
"${psql_admin[@]}" --tuples-only --no-align --command \
  "SELECT format('ALTER TYPE %I.%I OWNER TO ${migrate_user};', n.nspname, t.typname) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype IN ('e','d') AND NOT EXISTS (SELECT 1 FROM pg_class c WHERE c.reltype=t.oid);" \
  | "${psql_admin[@]}"

docker run --rm --network institute_x_internal \
  -e MINIO_ROOT_USER -e MINIO_ROOT_PASSWORD \
  -e S3_APP_USER="${s3_user}" -e S3_APP_PASSWORD="${s3_password}" \
  --entrypoint /bin/sh \
  quay.io/minio/mc@sha256:a7fe349ef4bd8521fb8497f55c6042871b2ae640607cf99d9bede5e9bdf11727 \
  -ec 'mc alias set local http://minio:9000 "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"; mc admin user add local "$S3_APP_USER" "$S3_APP_PASSWORD"; mc admin policy attach local readwrite --user "$S3_APP_USER"'

update_env() {
  local key=$1 value=$2 temporary
  temporary=$(mktemp /etc/institute-x/production.env.XXXXXX)
  awk -v key="${key}" -v value="${value}" '
    BEGIN { found=0 }
    $0 ~ "^" key "=" { print key "=" value; found=1; next }
    { print }
    END { if (!found) print key "=" value }
  ' "${ENV_FILE}" >"${temporary}"
  chown root:deploy "${temporary}"
  chmod 0640 "${temporary}"
  mv "${temporary}" "${ENV_FILE}"
}

update_env DATABASE_APP_USER "${app_user}"
update_env DATABASE_APP_PASSWORD "${app_password}"
update_env DATABASE_MIGRATE_USER "${migrate_user}"
update_env DATABASE_MIGRATE_PASSWORD "${migrate_password}"
update_env S3_ACCESS_KEY_ID "${s3_user}"
update_env S3_SECRET_ACCESS_KEY "${s3_password}"

echo "Application database and object-storage credentials were hardened."
/usr/local/sbin/institute-x-start
echo "The running application now uses the reduced-privilege credentials."

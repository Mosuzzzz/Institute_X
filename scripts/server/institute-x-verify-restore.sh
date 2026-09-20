#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE=/etc/institute-x/production.env
BACKUP=${1:-}
[[ ${EUID} -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
[[ -f ${BACKUP}/postgres.dump && -f ${BACKUP}/minio.tar.gz ]] || {
  echo "Usage: $0 /srv/institute-x/backups/<timestamp>" >&2
  exit 1
}
set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

test_db=institute_x_restore_test
cleanup() {
  docker exec institute_x-postgres-1 dropdb --if-exists --force \
    --username "${POSTGRES_USER:-institute_x}" "${test_db}" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup
docker exec institute_x-postgres-1 createdb --username "${POSTGRES_USER:-institute_x}" "${test_db}"
docker exec -i institute_x-postgres-1 pg_restore --exit-on-error --no-owner --no-privileges \
  --username "${POSTGRES_USER:-institute_x}" --dbname "${test_db}" <"${BACKUP}/postgres.dump"
docker exec institute_x-postgres-1 psql --username "${POSTGRES_USER:-institute_x}" \
  --dbname "${test_db}" --tuples-only --command 'SELECT COUNT(*) FROM _prisma_migrations;' >/dev/null
gzip -t "${BACKUP}/minio.tar.gz"
(cd "${BACKUP}" && sha256sum --check SHA256SUMS)
echo "Restore verification passed for ${BACKUP}."

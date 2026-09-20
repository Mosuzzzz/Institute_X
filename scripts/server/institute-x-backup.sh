#!/usr/bin/env bash
set -Eeuo pipefail

umask 077
ENV_FILE=/etc/institute-x/production.env
BACKUP_ROOT=/srv/institute-x/backups
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}

[[ ${EUID} -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
[[ -r ${ENV_FILE} ]] || { echo "Missing ${ENV_FILE}." >&2; exit 1; }
set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
destination=${BACKUP_ROOT}/${timestamp}
mkdir -p "${destination}"

docker exec institute_x-postgres-1 pg_dump \
  --username "${POSTGRES_USER:-institute_x}" \
  --dbname "${POSTGRES_DB:-institute_x}" \
  --format custom --no-owner --no-privileges >"${destination}/postgres.dump"
[[ -s ${destination}/postgres.dump ]] || {
  echo "PostgreSQL backup is empty: ${destination}/postgres.dump" >&2
  exit 1
}
# docker exec only forwards redirected stdin when interactive input is enabled.
docker exec -i institute_x-postgres-1 pg_restore --list <"${destination}/postgres.dump" >/dev/null
docker exec institute_x-minio-1 tar -C /data -cf - . | gzip -9 >"${destination}/minio.tar.gz"
gzip -t "${destination}/minio.tar.gz"
sha256sum "${destination}/postgres.dump" "${destination}/minio.tar.gz" >"${destination}/SHA256SUMS"

find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf -- {} +

if [[ -n ${RESTIC_REPOSITORY:-} ]]; then
  command -v restic >/dev/null || { echo "RESTIC_REPOSITORY is set but restic is unavailable." >&2; exit 1; }
  restic backup "${destination}"
  restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
fi

echo "Backup completed: ${destination}"

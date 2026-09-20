#!/usr/bin/env bash
set -Eeuo pipefail

umask 077
ENV_FILE=/etc/institute-x/production.env
BACKUP_ROOT=/srv/institute-x/backups
RETENTION_DAYS=${BACKUP_RETENTION_DAYS:-14}
BACKUP_HELPER_IMAGE=alpine/openssl@sha256:80b347d7b4d58e28aae515cf808ba3ce1c4a2a69a323b2cb2cb2d6d278729684

current_step=initialization
notify_heartbeat() {
  local suffix=${1:-}
  [[ -n ${BETTERSTACK_BACKUP_HEARTBEAT_URL:-} ]] || return 0
  curl --fail --silent --show-error --max-time 10 --retry 2 \
    --output /dev/null "${BETTERSTACK_BACKUP_HEARTBEAT_URL}${suffix}" || true
}
report_failure() {
  local status=$?
  echo "Backup failed during ${current_step} (exit ${status})." >&2
  notify_heartbeat /fail
  exit "${status}"
}
trap report_failure ERR

[[ ${EUID} -eq 0 ]] || { echo "Run as root." >&2; exit 1; }
[[ -r ${ENV_FILE} ]] || { echo "Missing ${ENV_FILE}." >&2; exit 1; }
set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
destination=${BACKUP_ROOT}/${timestamp}
mkdir -p "${destination}"

current_step='PostgreSQL dump'
docker exec institute_x-postgres-1 pg_dump \
  --username "${POSTGRES_USER:-institute_x}" \
  --dbname "${POSTGRES_DB:-institute_x}" \
  --format custom --no-owner --no-privileges >"${destination}/postgres.dump"
[[ -s ${destination}/postgres.dump ]] || {
  echo "PostgreSQL backup is empty: ${destination}/postgres.dump" >&2
  exit 1
}
# docker exec only forwards redirected stdin when interactive input is enabled.
current_step='PostgreSQL archive validation'
docker exec -i institute_x-postgres-1 pg_restore --list <"${destination}/postgres.dump" >/dev/null
current_step='MinIO data archive'
# The MinIO server image intentionally contains very few utilities. Use the
# already-pinned Alpine helper image to read its volume instead of assuming
# that the server container provides tar.
docker run --rm --volumes-from institute_x-minio-1 --entrypoint tar \
  "${BACKUP_HELPER_IMAGE}" -C /data -cf - . | gzip -9 >"${destination}/minio.tar.gz"
current_step='MinIO archive validation'
gzip -t "${destination}/minio.tar.gz"
current_step='backup checksums'
sha256sum "${destination}/postgres.dump" "${destination}/minio.tar.gz" >"${destination}/SHA256SUMS"

find "${BACKUP_ROOT}" -mindepth 1 -maxdepth 1 -type d -mtime "+${RETENTION_DAYS}" -exec rm -rf -- {} +

if [[ -n ${RESTIC_REPOSITORY:-} ]]; then
  current_step='off-site restic upload'
  command -v restic >/dev/null || { echo "RESTIC_REPOSITORY is set but restic is unavailable." >&2; exit 1; }
  restic backup "${destination}"
  restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune
fi

trap - ERR
notify_heartbeat
echo "Backup completed: ${destination}"

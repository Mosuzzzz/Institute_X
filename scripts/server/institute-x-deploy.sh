#!/usr/bin/env bash
set -Eeuo pipefail

umask 027

if [[ ${EUID} -ne 0 ]]; then
  echo "This deployment command must run as root." >&2
  exit 1
fi

SHA=${1:-}
SOURCE=${2:-}
[[ ${SHA} =~ ^[0-9a-f]{40}$ ]] || { echo "Expected a full 40-character commit SHA." >&2; exit 1; }
[[ -n ${SOURCE} ]] || { echo "Expected the GitHub Actions workspace path." >&2; exit 1; }
SOURCE=$(realpath -e "${SOURCE}")
[[ ${SOURCE} == /home/deploy/actions-runner/_work/Institute_X/Institute_X ]] || {
  echo "Unexpected deployment source path: ${SOURCE}" >&2
  exit 1
}
[[ $(stat -c '%U' "${SOURCE}") == deploy ]] || { echo "Deployment source must be owned by deploy." >&2; exit 1; }

# A previous root-run deployment may have refreshed the Git index. Repair only
# that metadata file, then keep every Git operation under the runner account so
# Actions can clean and reuse its workspace safely.
if [[ -e ${SOURCE}/.git/index ]]; then
  chown deploy:deploy "${SOURCE}/.git/index"
fi
git_as_deploy() {
  runuser -u deploy -- git -C "${SOURCE}" "$@"
}

APP_ROOT=/srv/institute-x
RELEASES=${APP_ROOT}/releases
CURRENT=${APP_ROOT}/current
BACKUPS=${APP_ROOT}/backups
ENV_FILE=/etc/institute-x/production.env
COMPOSE_PROJECT_NAME=institute_x
LOCK_FILE=/run/lock/institute-x-deploy.lock
export IMAGE_TAG=${SHA}

exec 9>"${LOCK_FILE}"
flock -n 9 || { echo "Another Institute X deployment is running." >&2; exit 1; }

[[ -r ${ENV_FILE} ]] || { echo "Missing ${ENV_FILE}" >&2; exit 1; }
mkdir -p "${RELEASES}" "${BACKUPS}"

SOURCE_SHA=$(git_as_deploy rev-parse HEAD)
[[ ${SOURCE_SHA} == "${SHA}" ]] || { echo "Workspace SHA does not match requested SHA." >&2; exit 1; }
[[ -z $(git_as_deploy status --porcelain) ]] || {
  echo "Refusing to deploy a dirty GitHub Actions workspace." >&2
  exit 1
}

RELEASE=${RELEASES}/${SHA}
if [[ ! -d ${RELEASE} ]]; then
  mkdir "${RELEASE}"
  git_as_deploy archive "${SHA}" | tar -x -C "${RELEASE}"
fi

COMPOSE=(docker compose -p "${COMPOSE_PROJECT_NAME}" --env-file "${ENV_FILE}" -f "${RELEASE}/docker-compose.yml")
PREVIOUS=
PREVIOUS_SHA=
if [[ -L ${CURRENT} ]]; then
  PREVIOUS=$(readlink -f "${CURRENT}")
  PREVIOUS_SHA=$(basename "${PREVIOUS}")
fi

# Preserve the currently running images under the previous release SHA while
# transitioning from the old unversioned deployment scheme.
if [[ -n ${PREVIOUS_SHA} ]]; then
  for service in backend frontend; do
    target="institute-x-${service}:${PREVIOUS_SHA}"
    if ! docker image inspect "${target}" >/dev/null 2>&1; then
      container="institute_x-${service}-1"
      current_image=$(docker inspect --format '{{.Image}}' "${container}" 2>/dev/null || true)
      [[ -z ${current_image} ]] || docker tag "${current_image}" "${target}"
    fi
  done
fi

set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
backup=${BACKUPS}/postgres-${timestamp}-${SHA}.sql.gz
if docker ps --format '{{.Names}}' | grep -qx 'institute_x-postgres-1'; then
  docker exec institute_x-postgres-1 pg_dump \
    --username "${POSTGRES_USER:-institute_x}" \
    --dbname "${POSTGRES_DB:-institute_x}" \
    --format plain --no-owner --no-privileges | gzip -9 >"${backup}"
  gzip -t "${backup}"
else
  echo "No running production database; skipping pre-deploy dump for initial deployment."
fi

rollback() {
  local status=$?
  trap - ERR
  if [[ -n ${PREVIOUS} && -d ${PREVIOUS} && ${PREVIOUS_SHA} =~ ^[0-9a-f]{40}$ ]]; then
    echo "Deployment failed; restoring ${PREVIOUS}." >&2
    ln -sfn "${PREVIOUS}" "${APP_ROOT}/current.rollback"
    mv -Tf "${APP_ROOT}/current.rollback" "${CURRENT}"
    IMAGE_TAG=${PREVIOUS_SHA} docker compose -p "${COMPOSE_PROJECT_NAME}" \
      --env-file "${ENV_FILE}" -f "${PREVIOUS}/docker-compose.yml" \
      up -d --remove-orphans || true
  fi
  exit "${status}"
}
trap rollback ERR

"${COMPOSE[@]}" build backend frontend migrate
"${COMPOSE[@]}" up -d postgres redis minio mailpit
"${COMPOSE[@]}" run --rm migrate

ln -sfn "${RELEASE}" "${APP_ROOT}/current.next"
mv -Tf "${APP_ROOT}/current.next" "${CURRENT}"

"${COMPOSE[@]}" up -d --remove-orphans

healthy=false
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3001/ >/dev/null; then
    healthy=true
    break
  fi
  sleep 2
done
[[ ${healthy} == true ]] || { echo "Frontend health check failed." >&2; false; }

backend_health=$(docker inspect --format '{{.State.Health.Status}}' institute_x-backend-1)
[[ ${backend_health} == healthy ]] || { echo "Backend is ${backend_health}." >&2; false; }
docker exec institute_x-backend-1 node -e \
  "fetch('http://127.0.0.1:3000/api/ready').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

trap - ERR
find "${BACKUPS}" -maxdepth 1 -type f -name 'postgres-*.sql.gz' -mtime +14 -delete
echo "Successfully deployed ${SHA}. Database backup: ${backup}"

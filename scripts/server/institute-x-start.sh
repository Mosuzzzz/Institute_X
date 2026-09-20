#!/usr/bin/env bash
set -euo pipefail

APP_ROOT=/srv/institute-x
CURRENT=${APP_ROOT}/current
ENV_FILE=/etc/institute-x/production.env

release=$(readlink -f "${CURRENT}")
[[ ${release} == "${APP_ROOT}/releases/"* ]] || {
  echo "No valid Institute X release is selected." >&2
  exit 1
}
IMAGE_TAG=$(basename "${release}")
[[ ${IMAGE_TAG} =~ ^[0-9a-f]{40}$ ]] || {
  echo "The selected release does not have a commit SHA name." >&2
  exit 1
}
export IMAGE_TAG

exec docker compose -p institute_x --env-file "${ENV_FILE}" \
  -f "${release}/docker-compose.yml" up -d --remove-orphans

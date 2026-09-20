#!/usr/bin/env bash
set -Eeuo pipefail

ENV_FILE=/etc/institute-x/production.env
[[ -r ${ENV_FILE} ]] || { echo "Missing ${ENV_FILE}." >&2; exit 1; }
set -a
# shellcheck disable=SC1090
. "${ENV_FILE}"
set +a

heartbeat=${BETTERSTACK_SERVER_HEARTBEAT_URL:-}
threshold=${MONITOR_DISK_THRESHOLD_PERCENT:-85}
[[ ${threshold} =~ ^[0-9]+$ && ${threshold} -ge 1 && ${threshold} -le 99 ]] || {
  echo "MONITOR_DISK_THRESHOLD_PERCENT must be between 1 and 99." >&2
  exit 1
}

notify() {
  local suffix=${1:-}
  [[ -n ${heartbeat} ]] || return 0
  curl --fail --silent --show-error --max-time 10 --retry 2 \
    --output /dev/null "${heartbeat}${suffix}" || true
}

fail() {
  echo "Monitoring check failed: $1" >&2
  notify /fail
  exit 1
}

health=$(curl --fail --silent --show-error --max-time 10 \
  --header 'Host: x.mosuzzzz.online' http://127.0.0.1/health) || \
  fail 'application readiness endpoint is unavailable'
[[ ${health} == '{"status":"ok"}' ]] || fail "unexpected health response: ${health}"

disk_used=$(df -P /srv/institute-x | awk 'NR == 2 { gsub(/%/, "", $5); print $5 }')
[[ ${disk_used} =~ ^[0-9]+$ ]] || fail 'could not read disk usage'
(( disk_used < threshold )) || fail "disk usage is ${disk_used}% (threshold ${threshold}%)"

notify
echo "Monitoring checks passed: application ready, disk ${disk_used}% used."

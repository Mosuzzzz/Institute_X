#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

PROJECT_DIR=${PROJECT_DIR:-/home/mosu/user/Project/Institute_X}

id deploy >/dev/null 2>&1 || { echo "The deploy account does not exist." >&2; exit 1; }
command -v docker >/dev/null
command -v git >/dev/null
command -v flock >/dev/null
command -v gzip >/dev/null
command -v curl >/dev/null
command -v runuser >/dev/null

if ! docker compose version >/dev/null 2>&1; then
  PROJECT_OWNER=$(stat -c '%U' "${PROJECT_DIR}")
  PROJECT_HOME=$(getent passwd "${PROJECT_OWNER}" | cut -d: -f6)
  COMPOSE_SOURCE=${PROJECT_HOME}/.docker/cli-plugins/docker-compose
  COMPOSE_SHA256=33b208d7e76639db742fae84b966cc01dacae58ca3fc4dabbc907045aefdf0c4

  [[ -x ${COMPOSE_SOURCE} ]] || {
    echo "Docker Compose is unavailable to root and was not found at ${COMPOSE_SOURCE}." >&2
    exit 1
  }
  echo "${COMPOSE_SHA256}  ${COMPOSE_SOURCE}" | sha256sum --check --status || {
    echo "Refusing to install an unexpected Docker Compose binary." >&2
    exit 1
  }
  install -D -m 0755 -o root -g root \
    "${COMPOSE_SOURCE}" /usr/local/lib/docker/cli-plugins/docker-compose
fi
docker compose version

install -d -m 0750 -o root -g deploy /srv/institute-x
install -d -m 0750 -o root -g deploy /srv/institute-x/releases /srv/institute-x/backups
install -m 0755 -o root -g root "${PROJECT_DIR}/scripts/server/institute-x-deploy.sh" /usr/local/sbin/institute-x-deploy

RUNNER_INDEX=/home/deploy/actions-runner/_work/Institute_X/Institute_X/.git/index
if [[ -e ${RUNNER_INDEX} ]]; then
  chown deploy:deploy "${RUNNER_INDEX}"
fi

cat >/etc/sudoers.d/institute-x-deploy <<'EOF'
# Arguments are validated again by institute-x-deploy itself. Keeping arguments
# out of this sudoers command is also compatible with sudo builds that reject
# wildcard patterns in command arguments.
deploy ALL=(root) NOPASSWD: /usr/local/sbin/institute-x-deploy
EOF
chmod 0440 /etc/sudoers.d/institute-x-deploy
visudo -cf /etc/sudoers.d/institute-x-deploy

echo "CI/CD host support installed."
echo "Next: register a GitHub Actions runner as user deploy with label institute-x."

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

install -d -m 0750 -o root -g deploy /srv/institute-x
install -d -m 0750 -o root -g deploy /srv/institute-x/releases /srv/institute-x/backups
install -m 0755 -o root -g root "${PROJECT_DIR}/scripts/server/institute-x-deploy.sh" /usr/local/sbin/institute-x-deploy

cat >/etc/sudoers.d/institute-x-deploy <<'EOF'
deploy ALL=(root) NOPASSWD: /usr/local/sbin/institute-x-deploy [0-9a-f]* /home/deploy/actions-runner/_work/Institute_X/Institute_X
EOF
chmod 0440 /etc/sudoers.d/institute-x-deploy
visudo -cf /etc/sudoers.d/institute-x-deploy

echo "CI/CD host support installed."
echo "Next: register a GitHub Actions runner as user deploy with label institute-x."

#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script as root: sudo $0" >&2
  exit 1
fi

PROJECT_DIR=${PROJECT_DIR:-/home/mosu/user/Project/Institute_X}
SOURCE_USER=${SOURCE_USER:-mosu}
AUTHORIZED_KEYS="/home/${SOURCE_USER}/.ssh/authorized_keys"
ENV_SOURCE="${PROJECT_DIR}/.env"

for required in "${AUTHORIZED_KEYS}" "${ENV_SOURCE}" "${PROJECT_DIR}/infrastructure/nginx/institute-x.conf"; do
  if [[ ! -s ${required} ]]; then
    echo "Required file is missing or empty: ${required}" >&2
    exit 1
  fi
done

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y nginx apache2-utils fail2ban unattended-upgrades certbot python3-certbot-nginx

if ! id admin >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash admin
fi
usermod --append --groups sudo admin

if ! id deploy >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash deploy
fi

install_keys() {
  local account=$1
  local account_home
  account_home=$(getent passwd "${account}" | cut -d: -f6)
  install -d -m 0700 -o "${account}" -g "${account}" "${account_home}/.ssh"
  install -m 0600 -o "${account}" -g "${account}" "${AUTHORIZED_KEYS}" "${account_home}/.ssh/authorized_keys"
}

install_keys admin
install_keys deploy

install -d -m 0750 -o root -g deploy /etc/institute-x
install -m 0640 -o root -g deploy "${ENV_SOURCE}" /etc/institute-x/production.env

install -m 0644 "${PROJECT_DIR}/infrastructure/nginx/institute-x.conf" /etc/nginx/sites-available/institute-x.conf
ln -sfn /etc/nginx/sites-available/institute-x.conf /etc/nginx/sites-enabled/institute-x.conf

MAILPIT_PASSWORD_FILE=/root/institute-x-mailpit-password.txt
if [[ ! -s ${MAILPIT_PASSWORD_FILE} ]]; then
  umask 077
  openssl rand -base64 24 >"${MAILPIT_PASSWORD_FILE}"
fi
htpasswd -bBc /etc/nginx/.htpasswd-institute-x demo "$(<"${MAILPIT_PASSWORD_FILE}")"
chown root:www-data /etc/nginx/.htpasswd-institute-x
chmod 0640 /etc/nginx/.htpasswd-institute-x

install -m 0644 "${PROJECT_DIR}/infrastructure/systemd/institute-x.service" /etc/systemd/system/institute-x.service
install -m 0644 "${PROJECT_DIR}/infrastructure/fail2ban/institute-x.local" /etc/fail2ban/jail.d/institute-x.local

nginx -t
systemctl daemon-reload
systemctl enable --now nginx fail2ban unattended-upgrades
systemctl reload nginx
systemctl enable institute-x.service

echo
echo "Bootstrap complete. SSH password/root login have NOT been disabled."
echo "Test both accounts from a NEW terminal before final hardening:"
echo "  ssh admin@<server-ip>"
echo "  ssh deploy@<server-ip>"
echo "Mailpit username: demo"
echo "Mailpit password is stored root-only at: ${MAILPIT_PASSWORD_FILE}"
echo "DNS and certificates are not changed by this script."

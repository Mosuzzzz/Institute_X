#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run this script as root: sudo $0 --confirmed-key-login" >&2
  exit 1
fi

if [[ ${1:-} != --confirmed-key-login ]]; then
  echo "Refusing to continue without --confirmed-key-login." >&2
  echo "First verify admin and deploy key login from separate SSH sessions." >&2
  exit 1
fi

for account in admin deploy; do
  account_home=$(getent passwd "${account}" | cut -d: -f6)
  if [[ -z ${account_home} || ! -s ${account_home}/.ssh/authorized_keys ]]; then
    echo "Missing authorized_keys for ${account}; refusing to harden SSH." >&2
    exit 1
  fi
done

install -d -m 0755 /etc/ssh/sshd_config.d
backup="/etc/ssh/sshd_config.d/99-institute-x-hardening.conf.backup.$(date +%Y%m%d%H%M%S)"
if [[ -f /etc/ssh/sshd_config.d/99-institute-x-hardening.conf ]]; then
  cp -a /etc/ssh/sshd_config.d/99-institute-x-hardening.conf "${backup}"
fi

cat >/etc/ssh/sshd_config.d/99-institute-x-hardening.conf <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
X11Forwarding no
MaxAuthTries 3
LoginGraceTime 30
AllowUsers admin deploy mosu
EOF

sshd -t
systemctl reload ssh

echo "SSH hardening applied. Keep the current session open and retest key login now."

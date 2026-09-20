#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then
  echo "Run as root: sudo $0" >&2
  exit 1
fi

id deploy >/dev/null 2>&1 || { echo "The deploy account does not exist." >&2; exit 1; }

RUNNER_VERSION=2.337.0
RUNNER_SHA256=70920811a4f8ad4328818682bca5c6469c1c942fab52448868071d0063816613
RUNNER_URL="https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
RUNNER_DIR=/home/deploy/actions-runner

if [[ -e ${RUNNER_DIR}/.runner ]]; then
  echo "Using the runner already configured at ${RUNNER_DIR}."
else
  ARCHIVE=$(mktemp /tmp/actions-runner.XXXXXX.tar.gz)
  trap 'rm -f "${ARCHIVE}"' EXIT

  curl --fail --location --proto '=https' --tlsv1.2 "${RUNNER_URL}" --output "${ARCHIVE}"
  echo "${RUNNER_SHA256}  ${ARCHIVE}" | sha256sum --check --status

  install -d -m 0750 -o deploy -g deploy "${RUNNER_DIR}"
  tar -xzf "${ARCHIVE}" -C "${RUNNER_DIR}"
  chown -R deploy:deploy "${RUNNER_DIR}"

  read -rsp "Paste the one-time GitHub runner registration token: " RUNNER_TOKEN
  echo
  [[ -n ${RUNNER_TOKEN} ]] || { echo "Runner token is required." >&2; exit 1; }

  sudo -u deploy "${RUNNER_DIR}/config.sh" \
    --url https://github.com/Mosuzzzz/Institute_X \
    --token "${RUNNER_TOKEN}" \
    --name institute-x-server \
    --labels institute-x \
    --work _work \
    --unattended \
    --replace
  unset RUNNER_TOKEN
fi

(
  cd "${RUNNER_DIR}"
  ./svc.sh install deploy
  ./svc.sh start
  ./svc.sh status
)

echo "GitHub Actions runner installed and started."

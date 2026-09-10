#!/bin/sh
set -eu

if [ ! -f ../.env ]; then
  echo "../.env is required for local infrastructure credentials" >&2
  exit 1
fi

set -a
. ../.env
set +a

export REDIS_URL="rediss://127.0.0.1:${REDIS_PORT:-6379}"
export NODE_EXTRA_CA_CERTS="$(pwd)/.redis-ca.crt"

if [ ! -s "$NODE_EXTRA_CA_CERTS" ]; then
  echo "Run: docker compose cp redis:/public/ca.crt backend/.redis-ca.crt" >&2
  exit 1
fi

exec ./node_modules/.bin/nest start --watch

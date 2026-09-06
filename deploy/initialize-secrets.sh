#!/bin/sh
set -eu
cd /opt/dpsoft
umask 077
if [ -e .env.production ]; then
  echo 'Existing production configuration preserved.'
  exit 0
fi
# No provider credentials or local development data are copied.
set -C
{
  printf 'PUBLIC_ORIGIN=https://dpsoft.space\nHTTP_BIND=127.0.0.1\nHTTP_PORT=8080\n'
  for name in POSTGRES_PASSWORD REDIS_PASSWORD SESSION_SECRET CREDENTIAL_ENCRYPTION_KEY; do
    printf '%s=%s\n' "$name" "$(openssl rand -hex 32)"
  done
  printf 'OPENAI_API_KEY=\nSTRIPE_SECRET_KEY=\nSTRIPE_PRICE_ID=\nPAYPAL_CLIENT_ID=\nPAYPAL_CLIENT_SECRET=\nPAYPAL_ENVIRONMENT=sandbox\nPAYSTACK_SECRET_KEY=\nPLATFORM_ADMIN_USER_IDS=\n'
} > .env.production
echo 'Production configuration created with private file permissions; providers remain unconfigured.'

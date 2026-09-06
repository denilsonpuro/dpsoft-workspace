# Production deployment

The repository ships a tested production container stack:

- `Dockerfile.api`: non-root Fastify API runtime;
- `Dockerfile.web`: non-root Next.js runtime;
- `compose.production.yml`: PostgreSQL, authenticated Redis, migration gate, API, web and Nginx gateway;
- `deploy/nginx.conf`: same-origin `/api` routing and `/healthz` readiness;
- `.env.production.example`: required deployment inputs without secrets.

## Prerequisites

1. A Linux host or managed container platform with Docker Compose v2.
2. A DNS record pointing the production hostname to the ingress host.
3. TLS termination in the load balancer, reverse proxy or hosting platform.
4. Random production values stored in a secret manager, not in Git.
5. A new OpenAI API key that has never been pasted into chat, source code or logs.
6. Automated encrypted backups for the PostgreSQL volume.

## Configure

Copy `.env.production.example` to a deployment-only `.env.production`. Replace every example value. `PUBLIC_ORIGIN` must be the exact HTTPS origin users open, without a trailing slash.

Generate independent secrets of at least 32 random bytes for `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `SESSION_SECRET` and `CREDENTIAL_ENCRYPTION_KEY`.

Changing `CREDENTIAL_ENCRYPTION_KEY` after connectors have been created makes their credentials unreadable. Treat rotation as a data migration.

## Deploy

```bash
docker compose --env-file .env.production -f compose.production.yml build
docker compose --env-file .env.production -f compose.production.yml up -d
docker compose --env-file .env.production -f compose.production.yml ps
curl --fail https://YOUR_DOMAIN/healthz
```

The `migrate` service must exit successfully before the API starts. PostgreSQL and Redis are not published to the host. Only the gateway port is published.

## Operational checks

Before accepting users, verify:

- `/healthz` returns HTTP 200;
- the browser can register, log in and log out over HTTPS;
- cookies contain `Secure`, `HttpOnly` and `SameSite=Strict`;
- connector credentials never appear in API responses or logs;
- database connector accounts have only the required `SELECT` grants;
- backup restoration has been tested, not merely configured;
- log aggregation and alerting cover API 5xx responses and connector failures;
- the public ingress applies request limits and TLS renewal monitoring.

## Smoke-test evidence

The stack was built and started locally as an isolated production-profile project. The migration completed, PostgreSQL, Redis and API health checks became healthy, and both the gateway application route and `/healthz` returned HTTP 200. This proves the container package and dependency ordering; it does not prove a public domain, certificate, external backup service or a specific cloud environment.

# VPS deployment — 2026-09-06

- SSH authenticated using the dedicated local deployment key (no password in project).
- Source uploaded to `/opt/dpsoft` on `169.58.251.127`.
- Compose project: `dpsoft`; configuration: `/opt/dpsoft/.env.production`, mode 600.
- New database and Redis volumes are separate from existing host services.
- Images built on the VPS; database migrations applied without demo seeding.
- Gateway bound only to `127.0.0.1:8080`; Apache now proxies the HTTPS domain to the application. HTTP redirects to HTTPS except ACME validation paths.
- Provider credentials and platform administrator IDs remain blank. Billing enforcement stays enabled.
- User confirmed the VPS snapshot before public cutover. Apache passed its configuration test and received a graceful reload.
- Previous vhost saved on VPS at `/opt/dpsoft/deploy/apache-before-public-20260906.conf`.
- Replacement OpenAI credentials and merchant configuration remain pending; deployment does not mean payment or AI flows are production-verified.

## Operations (on VPS)

```sh
cd /opt/dpsoft
docker compose --env-file .env.production -f compose.production.yml -p dpsoft ps
curl --fail http://127.0.0.1:8080/healthz
```

Do not print the production environment file or paste secrets into chat. Do not run `down -v`: this deletes the application data volumes.

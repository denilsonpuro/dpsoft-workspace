# dpsoft.space — deployment handoff

Target provided by the owner: `169.58.251.127`, public origin `https://dpsoft.space`.

## Verified 2026-09-05

- DNS A record resolves to the supplied server IP.
- Domain HTTPS returns HTTP 200 with a valid certificate and Apache headers.
- Current content is the aaPanel default site-created page, not the application.
- Direct HTTPS to the IP fails certificate hostname validation. Use the domain; do not bypass the warning.
- Local SSH known_hosts contains this IP, but this computer has no private keys in `~/.ssh`, no SSH config and no identities in the SSH agent. No authenticated server session was established or changed.

## Architecture prepared locally

Keep existing aaPanel/Apache and TLS. Run application containers behind the existing HTTPS vhost using `deploy/apache-dpsoft.conf.fragment`. Gateway binds to loopback port 8080; do not publish database, Redis, API or Next.js ports. Proxy trust is two hops for Apache → Nginx → API; revisit if topology differs. The fragment is not a replacement vhost and must be merged after inspecting the existing configuration.

## Before deployment

1. Supply SSH username, port and an authorized authentication method through a secure channel. Do not paste passwords or private keys in chat.
2. Inspect operating system, free disk/RAM, installed Docker, aaPanel vhosts, used ports and service health. Back up the existing site configuration. Do not install a second Apache or change firewall rules without checking current SSH access.
3. Use a new release directory and copy source without `.env`, `node_modules`, `.next`, local data or secret files.
4. Create production-only secrets on the server using `.env.production.example` as the list of required fields. Never copy the exposed OpenAI key. Preserve an existing encryption key if importing connector records.
5. Configure the commerce administrator with the exact verified user UUID in `PLATFORM_ADMIN_USER_IDS`. An organization owner is not automatically a platform administrator.
6. Configure merchant accounts, settlement currencies and approved prices. Empty credentials disable online checkout. Access passes via PayPal/Paystack/offline are not automatic recurring subscriptions.
7. Build/start Compose, verify migrations and local `/healthz`, then validate Apache configuration before reloading. Keep the existing site configuration for rollback.
8. Validate the domain routes `/`, `/workspace`, `/api/v1/commerce` and `/healthz`, cookies, receipt-size limits and brand assets. Test isolated tenants, failed payments, refunds, receipt approval and backup restoration before inviting paying customers.

Deployment has not been executed. Missing SSH authentication is the immediate blocker; remaining security, recovery and commerce launch checks are documented in `docs/billing.md` and `docs/commerce.md`.

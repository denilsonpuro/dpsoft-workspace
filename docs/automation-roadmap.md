# DPsoft execution platform

## Scope agreed on 2026-09-06

macOS is the first desktop target. The current local connector is not a signed desktop application and does not control customer applications. Do not advertise universal software compatibility.

## Launch pricing proposal

Essential USD 29/month, Business USD 79/month, Scale USD 199/month. These are proposed prices, not validated margins. Tier-specific quotas, inference budgets and deliverables must be enforced before enabling sales. Do not promise unlimited AI, messaging or desktop execution.

Benchmarks reviewed: https://n8n.io/pricing/ (execution-based tiers) and https://zapier.com/pricing (task-based tiers). Prices are DPsoft proposals, not conversions or reproductions of competitor plans.

Each tier has a separate server-configured Stripe Price ID. The provider remains authoritative for the actual checkout price. Existing legacy `STRIPE_PRICE_ID` maps only to Essential. PayPal, Paystack and offline passes do not yet carry tier-specific entitlements.

## Production gates for task execution

1. Durable jobs: tenant and actor identity, validated immutable input, idempotency key, explicit tool allowlist, approval bound to the exact payload, bounded retries, cancellation and audit history.
2. Email: verified sender domain, configured transactional provider, exact recipient approval, attachment limits, delivery events and suppression handling. A provider accepting a message is not proof of delivery.
3. WhatsApp: customer-owned business account, recipient consent, approved templates where required, scoped tokens and delivery webhooks. No consumer-session scraping.
4. MCP: authenticated per-tenant connections, tool discovery reviewed by an administrator, explicit tool permissions, SSRF controls and credential isolation. MCP does not make arbitrary applications compatible.
5. macOS: signed and notarized app, explicit pairing, Keychain secrets, outbound-only transport, per-tool local approvals, visible stop control, signed updates. Accessibility and Screen Recording permissions must be granted by the customer; never bypass them.
6. Mobile: authenticated approvals, status and reports first. Mobile operating-system sandboxing prevents arbitrary control of other apps.

## Current limits

No production email/WhatsApp delivery, unattended desktop automation, universal MCP connector, native installers, or complete subscription quota enforcement has been verified. The public product must state these limits until each workflow is implemented and tested.

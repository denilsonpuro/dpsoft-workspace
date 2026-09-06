# Subscription integration — implementation and launch gates

The public website lives at `/`; authenticated workspace access lives at `/workspace`. Existing root hash bookmarks should be updated to `/workspace#agents`, etc.

## Implemented

- Stripe SDK integration; recurring price comes from `STRIPE_PRICE_ID`, never the browser.
- Persisted organization-to-Stripe-customer binding in `BillingAccount`.
- Organization owner authorization for checkout and billing portal.
- Customer and checkout idempotency keys; reuse an open checkout session.
- Customer portal for payment details, invoices and subscription changes (must be enabled by the operator in Stripe).
- Live subscription lookup before protected operations: connector creation, agent creation, chat and direct reports. No entitlement is granted by the checkout return URL.
- Only an active subscription containing the configured price grants access. Trialing, past due, unpaid, canceled and incomplete states do not.
- Missing configuration returns unavailable rather than simulating a payment.
- Local development is ungated by default. Set `BILLING_REQUIRED=true` to test gating. The production compose explicitly requires billing.

## Configure securely

Set `STRIPE_SECRET_KEY` and `STRIPE_PRICE_ID` in the deployment secret environment. Never paste secret keys into a chat. Start with a Stripe test account/key and a fixed recurring licensed price, then validate before live activation. Public and private billing screens visibly label test-mode prices.

Confirm that the legal business and settlement country are supported by the provider before adopting Stripe commercially. No account was created and no payment was taken during implementation.

The selected price must represent the actual sold feature set. Usage quotas and tier-specific limits are not implemented: do not advertise them. This implementation currently supports one configured recurring price, not a multi-tier catalog or a usage-billing system.

## Lifecycle design and remaining work

Entitlements are fetched directly from Stripe rather than trusted from a local cache. This avoids stale webhook ordering in the current design but adds provider latency and availability dependence to paid operations. Provider errors fail closed. No webhook endpoint or automated receipt/dunning workflow was added in this iteration. These need durable event ingestion, deduplication, retries and reconciliation before scaling.

No external checkout has been exercised because operator credentials are absent. Unit tests validate the entitlement predicate, not the provider integration. Required prelaunch tests: checkout success/cancel, delayed confirmation, duplicate requests, invoice failure, cancellation at period end, cancellation immediately, re-subscribe, another tenant, non-owner, provider timeout and portal return. Also test supported currency formats and confirm tax treatment and policies with the business owner.

## Reference

- [Stripe subscriptions with Checkout](https://docs.stripe.com/payments/checkout/build-subscriptions)
- [Customer portal integration](https://docs.stripe.com/customer-management/integrate-customer-portal)
- [Subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)

## Other public-launch blockers

Email verification and password recovery, published company/contact and legal policies, production TLS, restore-tested backups, monitoring, independent security review (including connector DNS/IP egress restrictions), usage/cost controls and load tests remain required. This change is not a claim of 100% production readiness.

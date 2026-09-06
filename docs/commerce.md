# Commerce and locale configuration

Admin UI: `/workspace#admin`. Access requires an authenticated user UUID explicitly listed in `PLATFORM_ADMIN_USER_IDS`; no account is elevated by email or by creating an organization. Credentials remain deployment environment secrets, not editable/returned through the browser. Administrators can edit enabled currencies, default language/currency, access-pass price/duration, gateway switches and bank instructions. Writes use optimistic version checking.

Only five interface languages are available: English, Portuguese, French, Spanish and German. Browser language preferences suggest language and region currency; explicit manual choices persist locally. This is not IP geolocation and cannot establish physical residence. Unknown regions fall back to configured currency. Changing currency never silently changes the amount charged.

Reference conversions use the server-side [Frankfurter rates API](https://frankfurter.dev/) and show date, approximate converted value and actual billing currency. Rates older than seven days or unsupported pairs fail visibly. Provider settlement support is independent from display currencies. No invented exchange rates or automatic tax determinations.

## Four payment methods

- Stripe: existing recurring subscription checkout and billing portal, one server-configured Stripe price.
- PayPal: Orders API create/capture/verify for a fixed access period. No automatic renewal in this version.
- Paystack: initialize/verify transaction for a fixed access period. No automatic renewal in this version.
- Offline transfer: immutable amount snapshot → encrypted receipt upload → UNDER_REVIEW → administrative APPROVED/REJECTED decision. Upload alone grants nothing. Admin must attest that the bank actually received funds. Approval and audit are committed together and cannot be replayed to extend access.

Online verification checks provider-owned reference, successful state, amount and currency. Paid access periods are rechecked with the provider when gated operations execute. Gateway credentials and real provider flows were not tested against merchant accounts. Refund/chargeback behavior, provider availability and recurring renewal need further integration tests and event reconciliation before live sales.

Receipts: PDF/PNG/JPEG, maximum 4 MB, base64 transport with 6 MB server/proxy limits, signature checks, encrypted database storage, duplicate hash rejection and admin-only attachment download. Signature checks are not antivirus scanning or content safety guarantees. Add scanning, retention jobs, quotas and encrypted offsite backup before accepting public uploads at scale.

Admin configuration and payment tables are introduced by additive migrations. No real prices, bank details, payment credentials or administrator identity were invented. Configure those before enabling a payment method. Supported currencies vary by provider and merchant account; test the actual settlement combination.

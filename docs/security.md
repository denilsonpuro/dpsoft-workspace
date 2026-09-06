# Security model

The foundation implements deny-by-default tenant, permission, connector, and tool checks. Tool input and connector output are schema-validated. Approval-gated tools cannot execute from an unapproved call. Request logs redact common authorization and secret fields.

Credentials must be envelope-encrypted with a managed key in production; the schema stores ciphertext only. API keys must be stored as hashes, and plaintext may be returned only once at creation. External connector data is untrusted content and must never be merged into system instructions.

## Not yet verified or implemented

MFA, SSO, production secret management, tamper-evident audit retention, connector mTLS/device enrollment, and penetration testing remain later milestones. No compliance or certification claim is made.

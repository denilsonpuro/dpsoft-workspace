# Local connector: first executable action

This is a Node.js CLI, not a native or notarized macOS installer. It supports explicit pairing and heartbeat with a compatible DPsoft API, but does not run unattended or control other apps. Node.js 22+ is required.

Implemented tool: `save_text_report`. It writes a real UTF-8 text file into an existing directory selected by the local operator. Only `.txt` filenames are allowed. Existing files and symlinks are rejected. Approval is tied to the SHA-256 of the exact validated JSON action.

Build with `npm run build -w @dpsoft/connector`. Prepare a JSON file containing `tool`, `filename` and `content`, then:

```sh
node apps/connector/dist/main.js review < action.json
node apps/connector/dist/main.js execute /absolute/approved/directory DIGEST_FROM_REVIEW < action.json
```

Inspect the complete report in the review output before approving. The digest is local confirmation, not remote job authorization. The report action remains local-only and is not exposed by pairing.

Tests exercise actual temporary files, modified-payload denial, overwrite denial, traversal and symlink rejection. There is no email/WhatsApp sender or computer-control capability in this CLI.

## Pairing preview

Requires database migration `20260906080000_local_devices` and the updated API. In the workspace's Connectors section, the organization owner can generate a device code and revoke devices. Codes expire in ten minutes and may be claimed only once. Tokens expire in thirty days; their hashes, not plaintext values, are stored on the server. Removing the owner's role or active membership prevents further heartbeat access.

Create a private directory (permissions 700) owned by the current user. Run:

```sh
node apps/connector/dist/main.js pair https://YOUR_UPDATED_DPSOFT_HOST /absolute/private/directory
```

Supply `{"code":"YOUR_ONE_TIME_CODE"}` through standard input, then EOF (Ctrl-D on macOS). Do not put the code in shell arguments, commit it, or paste it into chat. On successful pairing, the CLI writes `device.json` with permissions 600 and prints only the device identity and expiry. Existing credentials are never overwritten.

```sh
node apps/connector/dist/main.js status /absolute/private/directory
```

This is a one-time authenticated heartbeat, not a background agent. HTTPS is mandatory and redirects are rejected. Only heartbeat capability is returned; device tokens cannot log into the user workspace or invoke report tools. Lost responses or local write failures may require revoking the old device and pairing again.

Credentials currently use a protected local file, **not macOS Keychain**. Keychain integration, notarization, signed updates and remote-job approval remain release gates for a native production agent.

## Validation

`RUN_DEVICE_INTEGRATION=1` opts into the PostgreSQL integration test. It creates uniquely named temporary fixtures and removes those fixtures afterward. Do not point this test at a customer database. Covered: concurrent single-use claiming, tenant isolation, hashed storage, owner-role removal, expiry, revocation and audit events.

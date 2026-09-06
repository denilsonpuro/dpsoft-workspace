# Local connector: first executable action

This is a Node.js CLI, not a native or notarized macOS installer. It is not yet paired with the cloud, does not run unattended and cannot control other apps. Node.js 22+ is required.

Implemented tool: `save_text_report`. It writes a real UTF-8 text file into an existing directory selected by the local operator. Only `.txt` filenames are allowed. Existing files and symlinks are rejected. Approval is tied to the SHA-256 of the exact validated JSON action.

Build with `npm run build -w @dpsoft/connector`. Prepare a JSON file containing `tool`, `filename` and `content`, then:

```sh
node apps/connector/dist/main.js review < action.json
node apps/connector/dist/main.js execute /absolute/approved/directory DIGEST_FROM_REVIEW < action.json
```

Inspect the complete report in the review output before approving. The digest is local confirmation, not cloud authentication; pairing and cryptographic authorization are still required before remote jobs can be accepted.

Tests exercise actual temporary files, modified-payload denial, overwrite denial, traversal and symlink rejection. There is no email/WhatsApp sender or computer-control capability in this CLI.

# Development

Requirements: Node.js 22+, npm 11+, Docker with Compose.

Use `.env.example` as a key manifest. Development values are not production-safe. Run `npm install`, start PostgreSQL and Redis, generate Prisma, and then run the API and web workspaces. The web server defaults to port 3000 and checks the API through `API_INTERNAL_URL` or `http://localhost:4000`.

Verification commands: `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`.

## Current scope

The vertical path is implemented. Full live verification requires two PostgreSQL databases (the platform database and a customer/demo source) plus a valid OpenAI API key. The overview intentionally shows zero and unavailable states instead of mock business data. Broader connector catalogs, MFA, workflows, and enterprise SSO remain later phases.

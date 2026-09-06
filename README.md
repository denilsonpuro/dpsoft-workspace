# DPsoft AI Integration Platform

Enterprise integration infrastructure that gives AI controlled, auditable access to existing software.

## Current milestone

Vertical PostgreSQL MVP: account and organization creation, encrypted PostgreSQL connection, live schema discovery, explicit revenue-column authorization, controlled tool generation, Finance Agent creation, OpenAI Responses tool calling, source-backed answer persistence, and audit logging.

## Local development

1. Copy `.env.example` to `.env` and replace every placeholder secret.
2. Start PostgreSQL and Redis with `docker compose up -d postgres redis`.
3. Install dependencies with `npm install`.
4. Generate the Prisma client and migrate: `npm run db:generate -w @dpsoft/database && npm run db:migrate -w @dpsoft/database`.
5. Seed the explicit PostgreSQL demo source: `npm run db:seed-demo -w @dpsoft/database`.
6. Set `OPENAI_API_KEY` and start the API: `npm run dev -w @dpsoft/api`.
7. In another terminal start the web app: `npm run dev -w @dpsoft/web`.

The connected PostgreSQL account must be read-only and have an invoice-like table with numeric amount and date columns. The onboarding UI discovers these columns; it never sends credentials to the AI provider.

For the local demo, use `postgresql://dpsoft_demo_reader:dpsoft_demo_only@localhost:5432/dpsoft` and select `dpsoft_demo.invoices`, `total_amount`, and `issued_at`. These credentials are development-only and the role has SELECT access only. The seed is clearly identified as demo data; production paths never synthesize records.

See [`docs/development.md`](docs/development.md) for details and the documented limitations before deploying.

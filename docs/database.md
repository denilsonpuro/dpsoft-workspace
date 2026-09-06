# Database

Prisma defines the initial normalized PostgreSQL schema in `packages/database/prisma/schema.prisma`. Tenant-owned records carry `organizationId` and indexes start with that key. Migrations must be generated and reviewed against a real development PostgreSQL instance before deployment.

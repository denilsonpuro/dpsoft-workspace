import { database } from "./index.js";

await database.$executeRawUnsafe(`CREATE SCHEMA IF NOT EXISTS dpsoft_demo`);
await database.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS dpsoft_demo.invoices (id UUID PRIMARY KEY, customer_name TEXT NOT NULL, total_amount NUMERIC(14,2) NOT NULL CHECK (total_amount >= 0), issued_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL)`);
await database.$executeRawUnsafe(`TRUNCATE TABLE dpsoft_demo.invoices`);
await database.$executeRawUnsafe(`INSERT INTO dpsoft_demo.invoices (id, customer_name, total_amount, issued_at, status) VALUES
  ('00000000-0000-4000-8000-000000000001','Kalahari Supplies',125000.00,'2026-09-01T08:00:00Z','PAID'),
  ('00000000-0000-4000-8000-000000000002','Delta Engineering',84000.00,'2026-09-02T10:00:00Z','PAID'),
  ('00000000-0000-4000-8000-000000000003','North Star Retail',273500.00,'2026-09-02T14:30:00Z','ISSUED')`);
await database.$executeRawUnsafe(`DO $block$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dpsoft_demo_reader') THEN CREATE ROLE dpsoft_demo_reader LOGIN PASSWORD 'dpsoft_demo_only'; END IF; END $block$`);
await database.$executeRawUnsafe(`GRANT CONNECT ON DATABASE dpsoft TO dpsoft_demo_reader`);
await database.$executeRawUnsafe(`GRANT USAGE ON SCHEMA dpsoft_demo TO dpsoft_demo_reader`);
await database.$executeRawUnsafe(`GRANT SELECT ON ALL TABLES IN SCHEMA dpsoft_demo TO dpsoft_demo_reader`);
process.stdout.write("Seeded 3 auditable demo invoices in dpsoft_demo.invoices (BWP 482,500.00).\n");
await database.$disconnect();

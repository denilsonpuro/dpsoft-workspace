import { Client } from "pg";
import { z } from "zod";

export const postgresCredentialSchema = z.object({ connectionString: z.string().min(12), ssl: z.boolean().default(false) });
export type PostgresCredential = z.infer<typeof postgresCredentialSchema>;

export function validateConnectorTarget(connectionString: string, allowPrivateHosts: boolean): void {
  const target = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(target.protocol)) throw new Error("Only PostgreSQL connection strings are allowed.");
  const host = target.hostname.toLowerCase();
  const privateHost = host === "localhost" || host.endsWith(".local") || !host.includes(".") || /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || host === "::1";
  if (privateHost && !allowPrivateHosts) throw Object.assign(new Error("Private network database targets require the DPsoft Local Connector."), { statusCode: 400, code: "PRIVATE_TARGET_DENIED" });
}

async function withClient<T>(credential: PostgresCredential, operation: (client: Client) => Promise<T>): Promise<T> {
  const client = new Client({ connectionString: credential.connectionString, ssl: credential.ssl ? { rejectUnauthorized: true } : undefined, connectionTimeoutMillis: 5000, query_timeout: 10_000, statement_timeout: 10_000 });
  await client.connect();
  try { await client.query("SET default_transaction_read_only = on"); await client.query("SET TIME ZONE 'UTC'"); return await operation(client); }
  finally { await client.end(); }
}

export async function testPostgres(credential: PostgresCredential) {
  const started = Date.now();
  return withClient(credential, async (client) => { const result = await client.query<{ database: string; user_name: string }>("SELECT current_database() AS database, current_user AS user_name"); return { ...result.rows[0], latencyMs: Date.now() - started }; });
}

export async function discoverPostgres(credential: PostgresCredential) {
  return withClient(credential, async (client) => {
    const result = await client.query<{ schema_name: string; table_name: string; column_name: string; data_type: string }>(`SELECT table_schema AS schema_name, table_name, column_name, data_type FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema') ORDER BY table_schema, table_name, ordinal_position LIMIT 2000`);
    return result.rows;
  });
}

export async function monthlyRevenue(credential: PostgresCredential, selection: { invoicesTable: string; amountColumn: string; dateColumn: string; currency?: string | undefined }, month: string) {
  const identifier = (value: string) => { if (!/^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(value)) throw new Error("Unsafe database identifier."); return value.split(".").map((part) => `"${part}"`).join("."); };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new Error("Invalid month.");
  const start = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(start.valueOf())) throw new Error("Invalid month.");
  const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return withClient(credential, async (client) => {
    await client.query("BEGIN READ ONLY");
    try {
      const query = `SELECT COALESCE(SUM(${identifier(selection.amountColumn)})::numeric, 0)::text AS amount, COUNT(*)::int AS records FROM ${identifier(selection.invoicesTable)} WHERE ${identifier(selection.dateColumn)} >= $1 AND ${identifier(selection.dateColumn)} < $2`;
      const result = await client.query<{ amount: string; records: number }>(query, [start, end]);
      await client.query("COMMIT");
      return { amount: result.rows[0]?.amount ?? "0", records: result.rows[0]?.records ?? 0, currency: selection.currency ?? "UNSPECIFIED", month };
    } catch (error) { await client.query("ROLLBACK"); throw error; }
  });
}

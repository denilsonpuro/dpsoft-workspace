import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).optional(),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  SESSION_SECRET: z.string().min(32).default("development-session-secret-change-me-now"),
  CREDENTIAL_ENCRYPTION_KEY: z.string().min(32).default("development-encryption-key-change-me"),
  COOKIE_SECURE: z.string().default("false").transform((value) => value === "true"),
  ALLOW_PRIVATE_CONNECTOR_HOSTS: z.string().default("false").transform((value) => value === "true"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-5.6-luna"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),
  STRIPE_PRICE_ESSENTIAL: z.string().optional(),
  STRIPE_PRICE_BUSINESS: z.string().optional(),
  STRIPE_PRICE_SCALE: z.string().optional(),
  PAYPAL_CLIENT_ID: z.string().optional(),
  PAYPAL_CLIENT_SECRET: z.string().optional(),
  PAYPAL_ENVIRONMENT: z.enum(["sandbox", "live"]).optional(),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PLATFORM_ADMIN_USER_IDS: z.string().optional(),
  BILLING_REQUIRED: z.enum(["true", "false"]).optional()
});

export type AppConfig = z.infer<typeof schema>;
export function readConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = schema.parse(source);
  if (config.NODE_ENV === "production" && (!source.SESSION_SECRET || !source.CREDENTIAL_ENCRYPTION_KEY)) {
    throw new Error("Production secrets must be explicitly configured.");
  }
  return config;
}
